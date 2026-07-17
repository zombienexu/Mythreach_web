import { SvelteSet } from 'svelte/reactivity'
import {
  ABILITIES,
  ABILITY_IDS,
  ACHIEVEMENT_BY_ID,
  GameSim,
  type AbilityId,
  type CombatEvent,
  type CombatSnapshot,
  type Item,
  type ProgressSnapshot,
  type SaveData,
  type Side,
  type TalentId,
} from '../engine'
import { FxDirector, type FxHost } from './fx/director'
import type { Spot } from './fx/stage'
import { startLoop, type LoopHandle } from './loop'
import { SaveStore } from './persistence'
import {
  loadSettings,
  profileKeyFor,
  readProfile,
  saveKeyFor,
  saveSettings,
  touchProfile,
  type SlotId,
  type SlotProfile,
} from './profile'
import { Sfx, type SfxName } from './sfx'

export type View = 'combat' | 'character' | 'talents' | 'regions' | 'quests' | 'chronicle' | 'settings'

export interface FloatText {
  id: number
  side: Side
  kind: 'damage' | 'crit' | 'heal' | 'absorb'
  amount: number
  /** position in arena-stage px — where the spell actually landed */
  x: number
  y: number
  /** CSS colour of the spell that caused it */
  tone: string
  /** how big to draw it: derived from the damage as a share of the target's
   *  max HP, so the number *is* the readout. A chip is small, a crit is huge. */
  scale: number
  /** spawn time — only *fresh* floats claim a stacking lane */
  born: number
}

/** A card taking a blow. `power` and `crit` decide how hard it recoils. */
export interface Impact {
  n: number
  power: number
  crit: boolean
}

const FLOAT_LIFETIME_MS = 950
/** how far apart stacked damage numbers sit, and how close counts as a clash */
const LANE_HEIGHT = 34
const LANE_WIDTH = 68
/** A float older than this has visibly risen and faded — it no longer claims
 *  a lane. Without the cutoff, a pack of three attackers stacks new numbers
 *  four lanes up into the middle of the screen, orphaned from their card. */
const LANE_FRESH_MS = 450
const SAVE_EVERY_MS = 5000

const KEY_TO_ABILITY: ReadonlyMap<string, AbilityId> = new Map(
  ABILITY_IDS.map((id) => [ABILITIES[id].key, id]),
)

/** One slot per ability, seeded with `v`. */
function byAbility<T>(v: T): Record<AbilityId, T> {
  return Object.fromEntries(ABILITY_IDS.map((id) => [id, v])) as Record<AbilityId, T>
}

function boot(store: SaveStore): GameSim {
  try {
    const raw = store.load()
    if (raw) {
      const data = JSON.parse(raw) as SaveData
      return GameSim.deserialize(data, { rng: Math.random })
    }
  } catch {
    // corrupted or incompatible save — start fresh
  }
  return new GameSim({ rng: Math.random })
}

/** Reactive bridge between the pure sim and the Svelte UI.
 *  Sim events are drained exactly once, inside step(); everything the UI
 *  shows is either a snapshot or an effect spawned from those events.
 *
 *  Game is also the FxDirector's host: the director decides *when* a number,
 *  a card recoil or a sound happens (a fireball's lands when the bolt does),
 *  and calls back in here to actually make it happen. */
export class Game implements FxHost {
  /** Which save slot this run lives in — decides the storage keys. */
  readonly slot: SlotId
  /** Identity written at character creation; null for saves that predate it. */
  readonly profile: SlotProfile | null
  readonly sim: GameSim

  combat: CombatSnapshot
  progress: ProgressSnapshot
  /** Both derived from ABILITY_IDS, never hand-listed — adding an ability must
   *  not require remembering to add a slot here. */
  usable: Record<AbilityId, boolean> = $state(byAbility(false))
  /** bump counters: a press the sim refused, per ability */
  denied: Record<AbilityId, number> = $state(byAbility(0))
  view: View = $state('combat')
  floats: FloatText[] = $state([])
  /** bump counters driving hit-recoil / heal-bloom choreography */
  impacts: Record<Side, Impact> = $state({
    player: { n: 0, power: 1, crit: false },
    enemy: { n: 0, power: 1, crit: false },
  })
  /** per-enemy-card recoil counters, keyed by iid — a pack recoils per card */
  enemyImpacts: Record<number, Impact> = $state({})
  bloom = $state(0)
  /** a crit landed: bump counter + how hard, for the screen-wide flash */
  critFlash: { n: number; power: number; side: Side } = $state({ n: 0, power: 1, side: 'enemy' })
  pressed = new SvelteSet<string>()
  banner: { level: number; unlocked: AbilityId[] } | null = $state(null)
  toast: { id: number; title: string; body: string } | null = $state(null)
  /** the boss's name, while the challenge cinematic is on screen */
  bossIntro: string | null = $state(null)
  muted: boolean
  auto: boolean

  readonly fx = new FxDirector()

  /** Owns read/write/wipe of this slot's save; the wipe guard lives here. */
  private readonly store: SaveStore
  private readonly audio = new Sfx()
  private nextId = 1
  private loop: LoopHandle | null = null
  private saveTimer: ReturnType<typeof setInterval> | null = null
  private bannerTimer: ReturnType<typeof setTimeout> | null = null
  private toastTimer: ReturnType<typeof setTimeout> | null = null
  private progressDirty = false

  constructor(slot: SlotId = 1) {
    this.slot = slot
    this.store = new SaveStore(localStorage, saveKeyFor(slot))
    this.profile = readProfile(localStorage, slot)
    this.sim = boot(this.store)
    this.combat = $state(this.sim.combatSnapshot())
    this.progress = $state(this.sim.progressSnapshot())
    this.muted = $state(loadSettings(localStorage).muted)
    this.auto = $state(this.sim.autoBattle)
  }

  start(): void {
    this.audio.muted = this.muted
    this.fx.bind(this)
    touchProfile(localStorage, this.slot)

    this.loop = startLoop(
      () => this.step(),
      (ran) => {
        if (ran > 0) this.publish()
      },
    )
    window.addEventListener('keydown', this.onKeyDown)
    window.addEventListener('keyup', this.onKeyUp)
    window.addEventListener('pointerdown', this.unlockAudio)
    window.addEventListener('keydown', this.unlockAudio)
    document.addEventListener('visibilitychange', this.onVisibility)
    window.addEventListener('beforeunload', this.saveNow)
    this.saveTimer = setInterval(this.saveNow, SAVE_EVERY_MS)
  }

  stop(): void {
    this.loop?.stop()
    if (this.saveTimer) clearInterval(this.saveTimer)
    window.removeEventListener('keydown', this.onKeyDown)
    window.removeEventListener('keyup', this.onKeyUp)
    window.removeEventListener('pointerdown', this.unlockAudio)
    window.removeEventListener('keydown', this.unlockAudio)
    document.removeEventListener('visibilitychange', this.onVisibility)
    window.removeEventListener('beforeunload', this.saveNow)
    this.fx.destroy()
    this.audio.dispose()
    this.saveNow()
  }

  // ─────────────── FxHost — the director calls back in here ───────────────

  float(f: { side: Side; kind: FloatText['kind']; amount: number; tone: string; scale: number; at: Spot }): void {
    const id = this.nextId++
    // Lifted clear of the portrait it belongs to, with a little scatter so a
    // flurry of ticks reads as several numbers rather than one blur.
    const x = f.at.x + (Math.random() * 44 - 22)
    let y = f.at.y - 34 + (Math.random() * 18 - 9)

    // A DoT tick and a Pyroblast landing on the same frame would otherwise
    // overlap into an unreadable smear ("122" over "11" reads as "1122").
    // Stack them into lanes instead, newest highest — the way every game
    // client does it.
    const now = Date.now()
    for (let guard = 0; guard < 6; guard++) {
      const clash = this.floats.some(
        (o) =>
          now - o.born < LANE_FRESH_MS &&
          o.side === f.side &&
          Math.abs(o.y - y) < LANE_HEIGHT &&
          Math.abs(o.x - x) < LANE_WIDTH,
      )
      if (!clash) break
      y -= LANE_HEIGHT
    }

    this.floats.push({ id, side: f.side, kind: f.kind, amount: f.amount, tone: f.tone, scale: f.scale, x, y, born: now })
    setTimeout(() => {
      const i = this.floats.findIndex((f2) => f2.id === id)
      if (i !== -1) this.floats.splice(i, 1)
    }, FLOAT_LIFETIME_MS)
  }

  bump(side: Side, power: number, crit: boolean, iid?: number): void {
    if (side === 'enemy' && iid !== undefined) {
      const cur = this.enemyImpacts[iid] ?? { n: 0, power: 1, crit: false }
      this.enemyImpacts[iid] = { n: cur.n + 1, power, crit }
    } else {
      const cur = this.impacts[side]
      this.impacts[side] = { n: cur.n + 1, power, crit }
    }
    // A crit is felt past the card it landed on — the room flashes.
    if (crit) this.critFlash = { n: this.critFlash.n + 1, power, side }
  }

  sfx(name: SfxName, gain = 1): void {
    this.audio.play(name, gain)
  }

  // ─────────────── player intents ───────────────

  use(id: AbilityId): void {
    if (this.sim.useAbility(id)) {
      this.publish()
    } else {
      // The sim said no — out of mana, on cooldown, nothing to hit. The button
      // should refuse visibly rather than swallow the press in silence.
      this.denied[id]++
      this.audio.play('denied')
    }
  }

  /** Begin the next fight. */
  startFight(): void {
    if (this.sim.startFight()) this.publish()
  }

  /** Collect one corpse's spoils. */
  loot(iid: number): void {
    if (this.sim.collectLoot(iid)) {
      this.audio.play('loot')
      this.publishAll()
    }
  }

  /** R: sweep the whole loot screen at once. */
  lootAll(): void {
    if (this.sim.collectAllLoot()) {
      this.audio.play('loot')
      this.publishAll()
    }
  }

  /** Click a card: point your spells at that mob. */
  target(iid: number): void {
    if (this.sim.setTarget(iid)) {
      this.audio.play('target')
      this.publish()
    }
  }

  /** Tab: slide the reticle to the next living mob. */
  cycleTarget(): void {
    if (this.sim.cycleTarget()) {
      this.audio.play('target')
      this.publish()
    }
  }

  setView(view: View): void {
    this.view = view
  }

  toggleAuto(): void {
    this.sim.autoBattle = !this.sim.autoBattle
    this.auto = this.sim.autoBattle
    this.publish()
  }

  toggleMute(): void {
    this.muted = !this.muted
    this.audio.muted = this.muted
    saveSettings(localStorage, { ...loadSettings(localStorage), muted: this.muted })
  }

  enterRegion(regionId: string): void {
    if (this.sim.enterRegion(regionId)) {
      this.view = 'combat'
      this.publishAll()
    }
  }

  retreat(): void {
    if (this.sim.retreat()) {
      this.publishAll()
    }
  }

  assault(): void {
    if (this.sim.assaultWorldBoss()) {
      this.audio.play('boss')
      this.bossIntro = 'The Rift Colossus'
      this.view = 'combat'
      this.publishAll()
    }
  }

  hire(): void {
    if (this.sim.hireCompanion()) this.publishAll()
  }

  dismissBossIntro(): void {
    this.bossIntro = null
  }

  equip(item: Item): void {
    if (this.sim.equipItem(item.uid)) {
      this.audio.play('target')
      this.publishAll()
    }
  }

  sell(item: Item): void {
    if (this.sim.sellItem(item.uid)) {
      this.audio.play('loot')
      this.publishAll()
    }
  }

  sellMaterial(id: string): void {
    if (this.sim.sellMaterial(id)) {
      this.audio.play('loot')
      this.publishAll()
    }
  }

  spendTalent(id: TalentId): void {
    if (this.sim.spendTalent(id)) this.publishAll()
  }

  acceptQuest(id: string): void {
    if (this.sim.acceptQuest(id)) this.publishAll()
  }

  abandonQuest(id: string): void {
    if (this.sim.abandonQuest(id)) this.publishAll()
  }

  turnInQuest(id: string): void {
    if (this.sim.turnInQuest(id)) {
      this.audio.play('level')
      this.publishAll()
    }
  }

  respec(): void {
    if (this.sim.respec()) this.publishAll()
  }

  /** Wipe the save and reload back to the title screen. Detaches the save
   *  timer and unload handler first so nothing re-writes the erased save. */
  private wipeAndReload(): void {
    if (this.saveTimer) clearInterval(this.saveTimer)
    window.removeEventListener('beforeunload', this.saveNow)
    this.store.wipe()
    localStorage.removeItem(profileKeyFor(this.slot))
    location.reload()
  }

  /** Write the save right now — called before handing control back to the
   *  title screen, which reads slots the moment it mounts. */
  flush(): void {
    this.saveNow()
  }

  newCharacter(): void {
    this.wipeAndReload()
  }

  deleteSave(): void {
    this.wipeAndReload()
  }

  // ─────────────── internals ───────────────

  private step(): void {
    const events = this.sim.tick()
    if (events.length === 0) return
    if (events.some((e) => e.kind === 'enemyDied')) this.audio.play('kill')
    for (const event of events) {
      this.onEvent(event)
      this.fx.handle(event)
    }
  }

  private publish(): void {
    this.combat = this.sim.combatSnapshot()
    if (this.combat.enemies.length > 0) {
      // A fresh pack retires the recoil counters of the one before it.
      for (const key of Object.keys(this.enemyImpacts)) {
        if (!this.combat.enemies.some((e) => e.iid === Number(key))) delete this.enemyImpacts[Number(key)]
      }
    }
    for (const id of ABILITY_IDS) this.usable[id] = this.sim.canUse(id)
    if (this.progressDirty) {
      this.progressDirty = false
      this.progress = this.sim.progressSnapshot()
    }

    // Standing effects follow the snapshot — a burn that expires quietly still
    // has to stop burning, and no event says so.
    this.fx.sync(this.combat)
    const p = this.combat.player
    this.audio.drone(this.combat.enemies.some((e) => e.rank === 'boss' && e.alive))
    this.audio.heartbeat(p.alive && p.maxHp > 0 && p.hp / p.maxHp < 0.35)
  }

  private publishAll(): void {
    this.progressDirty = true
    this.publish()
  }

  private onEvent(event: CombatEvent): void {
    // The floats, recoils, shakes and spell sounds are all the FxDirector's job
    // (fx.handle, called alongside this). Here we only keep reactive UI state:
    // banners, toasts, the heal bloom, and marking progression dirty.
    switch (event.kind) {
      case 'heal':
        this.bloom++
        break
      case 'enemyEnraged':
        this.bump('enemy', 1.6, false, event.iid)
        break
      case 'enemyDied':
      case 'playerDied':
      case 'xpGained':
      case 'goldGained':
      case 'companionHired':
        this.progressDirty = true
        break
      case 'materialDropped':
        this.progressDirty = true
        this.audio.play('loot')
        break
      case 'regionEntered':
        this.progressDirty = true
        break
      case 'lootDropped':
        this.progressDirty = true
        this.audio.play(event.item.rarity === 'epic' ? 'epic' : 'loot')
        break
      case 'levelUp':
        this.progressDirty = true
        this.showBanner(event.level, event.unlocked)
        this.audio.play('level')
        break
      case 'worldBossAssaultEnded':
        this.progressDirty = true
        break
      case 'worldBossFelled':
        this.progressDirty = true
        this.audio.play('level')
        break
      case 'questAccepted':
        this.progressDirty = true
        break
      case 'questCompleted':
        this.progressDirty = true
        this.showToast(event.name, 'Objective complete — see the Quests tab.')
        this.audio.play('loot')
        break
      case 'questTurnedIn':
        this.progressDirty = true
        this.showToast(event.name, 'Quest turned in. The traveler pays up.')
        break
      case 'achievementUnlocked': {
        this.progressDirty = true
        const def = ACHIEVEMENT_BY_ID[event.id]
        this.showToast(event.name, def?.description ?? '')
        this.audio.play('loot')
        break
      }
    }
  }

  private showBanner(level: number, unlocked: AbilityId[]): void {
    this.banner = { level, unlocked }
    if (this.bannerTimer) clearTimeout(this.bannerTimer)
    this.bannerTimer = setTimeout(() => (this.banner = null), 3600)
  }

  private showToast(title: string, body: string): void {
    this.toast = { id: this.nextId++, title, body }
    if (this.toastTimer) clearTimeout(this.toastTimer)
    this.toastTimer = setTimeout(() => (this.toast = null), 4200)
  }

  private saveNow = (): void => {
    try {
      this.store.save(JSON.stringify(this.sim.serialize()))
    } catch {
      // storage full or unavailable — the run continues unsaved
    }
  }

  private onVisibility = (): void => {
    if (document.visibilityState === 'hidden') this.saveNow()
  }

  private unlockAudio = (): void => {
    this.audio.unlock()
  }

  private onKeyDown = (e: KeyboardEvent): void => {
    if (e.repeat || e.ctrlKey || e.metaKey || e.altKey) return
    // Tab is target-switching, the way every MMO hand learned it.
    if (e.key === 'Tab') {
      e.preventDefault()
      this.cycleTarget()
      return
    }
    if (e.key === 'a') {
      this.toggleAuto()
      return
    }
    // R sweeps the loot screen, the way every loot-window hand learned it.
    if (e.key === 'r') {
      this.lootAll()
      return
    }
    const id = KEY_TO_ABILITY.get(e.key)
    if (!id) return
    this.pressed.add(e.key)
    this.use(id)
  }

  private onKeyUp = (e: KeyboardEvent): void => {
    this.pressed.delete(e.key)
  }
}
