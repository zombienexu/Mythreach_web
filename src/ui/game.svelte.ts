import { SvelteSet } from 'svelte/reactivity'
import {
  ABILITIES,
  ABILITY_IDS,
  ACHIEVEMENT_BY_ID,
  BLESSINGS,
  GameSim,
  sellValue,
  type AbilityId,
  type BlessingId,
  type CombatEvent,
  type CombatSnapshot,
  type EnemySnapshot,
  type Item,
  type ProgressSnapshot,
  type SaveData,
  type Side,
  type TalentId,
} from '../engine'
import type { LogEntry } from './components/CombatLog.svelte'
import { ticksToClock } from './format'
import { FxDirector, type FxHost } from './fx/director'
import type { Spot } from './fx/stage'
import { startLoop, type LoopHandle } from './loop'
import { Sfx, type SfxName } from './sfx'

export type View = 'combat' | 'character' | 'talents' | 'atlas' | 'chronicle'

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

const SAVE_KEY = 'mythreach-save-v1'
/** UI-owned settings, kept out of the engine save entirely. */
const SETTINGS_KEY = 'mythreach-settings-v1'
const LOG_CAP = 100
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

function boot(): GameSim {
  try {
    const raw = localStorage.getItem(SAVE_KEY)
    if (raw) {
      const data = JSON.parse(raw) as SaveData
      return GameSim.deserialize(data, { rng: Math.random })
    }
  } catch {
    // corrupted or incompatible save — start fresh
  }
  return new GameSim({ rng: Math.random })
}

/** Mute lives in the UI now — the engine owns no settings. */
function loadMuted(): boolean {
  try {
    const raw = localStorage.getItem(SETTINGS_KEY)
    if (raw) return (JSON.parse(raw) as { muted?: boolean }).muted === true
  } catch {
    // unreadable settings — default to unmuted
  }
  return false
}

function saveMuted(muted: boolean): void {
  try {
    localStorage.setItem(SETTINGS_KEY, JSON.stringify({ muted }))
  } catch {
    // storage unavailable — the toggle still holds for this session
  }
}

/** Reactive bridge between the pure sim and the Svelte UI.
 *  Sim events are drained exactly once, inside step(); everything the UI
 *  shows is either a snapshot or an effect spawned from those events.
 *
 *  Game is also the FxDirector's host: the director decides *when* a number,
 *  a card recoil or a sound happens (a fireball's lands when the bolt does),
 *  and calls back in here to actually make it happen. */
export class Game implements FxHost {
  readonly sim = boot()

  combat: CombatSnapshot = $state(this.sim.combatSnapshot())
  progress: ProgressSnapshot = $state(this.sim.progressSnapshot())
  /** Both derived from ABILITY_IDS, never hand-listed — adding an ability must
   *  not require remembering to add a slot here. */
  usable: Record<AbilityId, boolean> = $state(byAbility(false))
  /** bump counters: a press the sim refused, per ability */
  denied: Record<AbilityId, number> = $state(byAbility(0))
  view: View = $state('combat')
  log: LogEntry[] = $state([])
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
  /** Last pack seen — keeps the fallen cards on screen between spawns. */
  lastEnemies: EnemySnapshot[] = $state([])
  banner: { level: number; unlocked: AbilityId[] } | null = $state(null)
  toast: { id: number; title: string; body: string } | null = $state(null)
  /** the boss's name, while the challenge cinematic is on screen */
  bossIntro: string | null = $state(null)
  victory = $state(false)
  /** The most recent travel flavor line, shown on the travel card. */
  lastFlavor = $state('')
  muted = $state(loadMuted())
  auto = $state(this.sim.autoBattle)

  readonly fx = new FxDirector()

  private readonly audio = new Sfx()
  private nextId = 1
  private loop: LoopHandle | null = null
  private saveTimer: ReturnType<typeof setInterval> | null = null
  private bannerTimer: ReturnType<typeof setTimeout> | null = null
  private toastTimer: ReturnType<typeof setTimeout> | null = null
  private progressDirty = false

  start(): void {
    this.audio.muted = this.muted
    this.fx.bind(this)
    const zone = this.progress.zones.find((z) => z.current)
    if (zone) this.append(`${zone.name} — ${zone.epithet}.`, 'info')

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
    this.append(this.auto ? 'Your echo takes over the fight.' : 'You take back control.', 'info')
    this.publish()
  }

  toggleMute(): void {
    this.muted = !this.muted
    this.audio.muted = this.muted
    saveMuted(this.muted)
  }

  travel(zoneId: string): void {
    if (this.sim.travelTo(zoneId)) {
      this.lastEnemies = []
      this.view = 'combat'
      this.publishAll()
    }
  }

  embark(): void {
    if (this.sim.embark()) {
      this.lastEnemies = []
      this.view = 'combat'
      this.publishAll()
    }
  }

  advance(): void {
    if (this.sim.advance()) {
      this.lastEnemies = []
      this.publish()
    }
  }

  retreat(): void {
    if (this.sim.retreat()) {
      this.lastEnemies = []
      this.publishAll()
    }
  }

  chooseBlessing(id: BlessingId): void {
    if (this.sim.chooseBlessing(id)) this.publishAll()
  }

  assault(): void {
    if (this.sim.assaultWorldBoss()) {
      this.lastEnemies = []
      const name = 'The Rift Colossus'
      this.append(`You throw yourself at ${name}.`, 'boss')
      this.audio.play('boss')
      this.bossIntro = name
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
      this.append(`Equipped ${item.name}.`, `loot-${item.rarity}`)
      this.publishAll()
    }
  }

  sell(item: Item): void {
    const value = sellValue(item)
    if (this.sim.sellItem(item.uid)) {
      this.append(`Sold ${item.name} for ${value} gold.`, 'gold')
      this.publishAll()
    }
  }

  spendTalent(id: TalentId): void {
    if (this.sim.spendTalent(id)) this.publishAll()
  }

  respec(): void {
    if (this.sim.respec()) {
      this.append('Your talents drift back into potential.', 'arcana')
      this.publishAll()
    }
  }

  dismissVictory(): void {
    this.victory = false
  }

  resetSave(): void {
    try {
      localStorage.removeItem(SAVE_KEY)
    } finally {
      location.reload()
    }
  }

  // ─────────────── internals ───────────────

  private step(): void {
    const events = this.sim.tick()
    if (events.length === 0) return
    // A kill and its rewards land on the same tick — fold them into one line.
    const died = events.find((e) => e.kind === 'enemyDied')
    if (died && died.kind === 'enemyDied') {
      const xp = events.find((e) => e.kind === 'xpGained')
      const gold = events.find((e) => e.kind === 'goldGained' && e.source === 'kill')
      const bits = [
        xp?.kind === 'xpGained' ? `+${xp.amount} XP` : null,
        gold?.kind === 'goldGained' ? `+${gold.amount} gold` : null,
      ].filter(Boolean)
      this.append(`${died.name} is slain. ${bits.join(', ')}.`, died.rank === 'boss' ? 'boss' : 'gold')
      this.audio.play('kill')
    }
    // A pack arrives as one breath, not three separate introductions.
    const spawns = events.filter((e) => e.kind === 'enemySpawned')
    if (spawns.length > 1) {
      const names = spawns.map((s) => s.name)
      const line = `${names.slice(0, -1).join(', ')} and ${names[names.length - 1]} come at you together.`
      this.append(line, 'enemy')
    } else if (spawns[0]) {
      this.append(spawns[0].intro, spawns[0].rank === 'boss' ? 'boss' : 'info')
    }
    for (const event of events) {
      this.onEvent(event)
      this.fx.handle(event)
    }
  }

  /** Name an enemy by iid — from the live pack, or the one just cleared. */
  private enemyName(iid?: number): string | null {
    if (iid === undefined) return null
    return (
      this.combat.enemies.find((e) => e.iid === iid)?.name ??
      this.lastEnemies.find((e) => e.iid === iid)?.name ??
      null
    )
  }

  private publish(): void {
    this.combat = this.sim.combatSnapshot()
    if (this.combat.enemies.length > 0) {
      this.lastEnemies = this.combat.enemies
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
    switch (event.kind) {
      case 'castStarted':
        this.append(`You begin casting ${ABILITIES[event.abilityId].name}.`, 'info')
        break
      case 'castFinished':
        break // the release is the director's — sound lands with the bolt
      case 'castFizzled':
        this.append(`${ABILITIES[event.abilityId].name} fizzles into the dark.`, 'info')
        break
      case 'abilityQueued':
        break // the button glow tells the story
      case 'damage': {
        // The log is a chronicle and writes now; the float, the recoil, the
        // shake and the sound are the director's, and may be in flight.
        if (event.target === 'enemy') {
          const name = this.enemyName(event.iid) ?? 'the enemy'
          const verb = event.source === 'ignite' ? 'burns' : event.source === 'pyroblast' ? 'crushes' : 'slams'
          const spell = event.source === 'ignite' ? 'Ignite' : ABILITIES[event.source as AbilityId]?.name ?? 'Your spell'
          this.append(
            `${spell} ${verb} ${name} for ${event.amount}${event.crit ? ' — critical!' : '.'}`,
            event.source === 'ignite' ? 'arcana' : 'player',
          )
        } else {
          const who = this.enemyName(event.iid) ?? 'The enemy'
          const hit =
            event.source === 'enemySwing'
              ? `${who} hits you`
              : event.source === 'venom'
                ? `${event.label ?? 'Venom'} sears you`
                : `${event.label ?? 'A spell'} strikes you`
          const soak = event.absorbed > 0 ? ` (${event.absorbed} absorbed)` : ''
          this.append(`${hit} for ${event.amount}${soak}.`, 'enemy')
        }
        break
      }
      case 'heal':
        this.bloom++
        this.append(`Renew restores ${event.amount} health${event.crit ? ' — critical!' : '.'}`, 'heal')
        break
      case 'dotApplied':
        if (event.target === 'enemy') {
          this.append(`Ignite sears ${this.enemyName(event.iid) ?? 'the enemy'}.`, 'arcana')
        } else {
          this.append(`${event.name} seeps into your veins.`, 'enemy')
        }
        break
      case 'buffApplied':
        if (event.id === 'barrier') {
          this.append(`A barrier of starlight surrounds you (${event.amount ?? 0}).`, 'player')
        } else {
          this.append('Combustion! Your fire runs wild.', 'player')
        }
        break
      case 'buffExpired':
        this.append(event.id === 'barrier' ? 'The barrier fades.' : 'Combustion gutters out.', 'info')
        break
      case 'shieldBroken':
        this.append('Your barrier shatters.', 'info')
        break
      case 'interrupted':
        this.append(`Counterspell! ${event.name} dies on their lips.`, 'player')
        break
      case 'enemyCastStarted':
        this.append(`${this.enemyName(event.iid) ?? 'The enemy'} begins casting ${event.name}!`, 'enemy')
        break
      case 'enemyEnraged':
        this.append(`${event.name} flies into a frenzy!`, 'enemy')
        this.bump('enemy', 1.6, false, event.iid)
        break
      case 'enemySpawned':
        this.lastEnemies = []
        break // narrated (solo intro or pack line) in step()
      case 'enemyDied':
        this.progressDirty = true
        break // folded into the kill line in step()
      case 'encounterCleared':
        if (this.combat.enemies.length > 1) this.append('The pack is broken.', 'gold')
        break
      case 'playerDied':
        this.progressDirty = true
        this.append('You fall. The observatory dims…', 'enemy')
        break
      case 'playerRespawned':
        this.append('You awaken restored. The hunt resumes.', 'info')
        break
      case 'xpGained':
      case 'goldGained':
        this.progressDirty = true
        break // folded into the kill line / action lines
      case 'lootDropped': {
        this.progressDirty = true
        if (event.autoSold) {
          this.append(`Bags full — ${event.item.name} sold for ${event.goldValue} gold.`, 'gold')
        } else {
          this.append(`You loot ${event.item.name}.`, `loot-${event.item.rarity}`)
        }
        this.audio.play(event.item.rarity === 'epic' ? 'epic' : 'loot')
        break
      }
      case 'levelUp': {
        this.progressDirty = true
        this.showBanner(event.level, event.unlocked)
        const unlocks = event.unlocked.map((id) => ABILITIES[id].name).join(', ')
        this.append(
          `You reach level ${event.level}!${unlocks ? ` New spell: ${unlocks}.` : ''}`,
          'boss',
        )
        this.audio.play('level')
        break
      }
      case 'bossDefeated': {
        this.progressDirty = true
        const next = this.progress.zones.find((z) => z.id === event.nextZoneId)
        if (next) this.append(`New land unlocked: ${next.name}. Travel there from the Atlas.`, 'boss')
        break
      }
      case 'expeditionStarted':
        this.progressDirty = true
        this.append('You set out from the Rest.', 'info')
        break
      case 'travelStarted':
        this.lastFlavor = event.flavor
        this.append(event.flavor, 'info')
        break
      case 'nodeArrived':
        if (event.nodeKind === 'elite') this.audio.play('warn')
        if (event.nodeKind === 'boss') {
          this.audio.play('boss')
          const zone = this.progress.zones.find((z) => z.current)
          this.bossIntro = zone?.bossName ?? 'The Boss'
        }
        break
      case 'nodeResolved':
        break
      case 'cacheOpened':
        this.append(
          event.item
            ? `A cache yields ${event.gold} gold and ${event.item.name}.`
            : `A cache yields ${event.gold} gold.`,
          'gold',
        )
        this.audio.play('loot')
        break
      case 'shrineOffered':
        this.append('A shrine offers its blessing.', 'arcana')
        break
      case 'blessingGained': {
        this.progressDirty = true
        const bless = BLESSINGS[event.id]
        this.append(`Blessing gained: ${bless.name}. ${bless.description}`, 'arcana')
        this.audio.play('loot')
        break
      }
      case 'rested':
        this.append(`You rest. +${event.hpRestored} health, +${event.manaRestored} mana.`, 'heal')
        break
      case 'expeditionEnded':
        this.progressDirty = true
        if (event.outcome === 'completed') {
          this.append('The trail is walked. The Rest welcomes you back.', 'boss')
          this.audio.play('level')
        } else if (event.outcome === 'retreat') {
          this.append('You turn back for camp.', 'info')
        }
        break
      case 'worldBossAssaultEnded':
        this.progressDirty = true
        this.append(
          event.remaining > 0
            ? `You break off. ${event.damageDealt} damage banked against the Colossus.`
            : 'The Rift Colossus is felled!',
          'boss',
        )
        break
      case 'worldBossFelled':
        this.progressDirty = true
        this.audio.play('level')
        break
      case 'companionHired':
        this.progressDirty = true
        this.append(`${event.name} joins you.`, 'gold')
        break
      case 'zoneEntered': {
        this.progressDirty = true
        this.lastEnemies = []
        const zone = this.sim.progressSnapshot().zones.find((z) => z.id === event.zoneId)
        this.append(`You travel to ${event.name}${zone ? ` — ${zone.epithet}` : ''}.`, 'info')
        break
      }
      case 'achievementUnlocked': {
        this.progressDirty = true
        const def = ACHIEVEMENT_BY_ID[event.id]
        this.showToast(event.name, def?.description ?? '')
        this.append(`Achievement: ${event.name}`, 'gold')
        this.audio.play('loot')
        break
      }
      case 'gameCompleted':
        this.progressDirty = true
        this.victory = true
        this.audio.play('level')
        break
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

  private append(text: string, tone: LogEntry['tone']): void {
    this.log.push({ id: this.nextId++, time: ticksToClock(this.combat.tick), text, tone })
    if (this.log.length > LOG_CAP) this.log.splice(0, this.log.length - LOG_CAP)
  }

  private saveNow = (): void => {
    try {
      localStorage.setItem(SAVE_KEY, JSON.stringify(this.sim.serialize()))
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
    // Space walks the trail: embark from camp, press on from a resolved node.
    if (e.key === ' ') {
      e.preventDefault()
      const exp = this.combat.expedition
      if (this.combat.phase === 'camp') this.embark()
      else if (exp && exp.nodeResolved && !exp.traveling) this.advance()
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
