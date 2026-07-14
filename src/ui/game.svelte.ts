import { SvelteSet } from 'svelte/reactivity'
import {
  ABILITIES,
  ABILITY_IDS,
  ACHIEVEMENT_BY_ID,
  GameSim,
  OFFLINE_MIN_MS,
  sellValue,
  type AbilityId,
  type CombatEvent,
  type CombatSnapshot,
  type EnemySnapshot,
  type Item,
  type OfflineSummary,
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
}

/** A card taking a blow. `power` and `crit` decide how hard it recoils. */
export interface Impact {
  n: number
  power: number
  crit: boolean
}

const SAVE_KEY = 'mythreach-save-v1'
const LOG_CAP = 100
const FLOAT_LIFETIME_MS = 950
/** how far apart stacked damage numbers sit, and how close counts as a clash */
const LANE_HEIGHT = 34
const LANE_WIDTH = 68
const SAVE_EVERY_MS = 5000

const KEY_TO_ABILITY: ReadonlyMap<string, AbilityId> = new Map(
  ABILITY_IDS.map((id) => [ABILITIES[id].key, id]),
)

/** One slot per ability, seeded with `v`. */
function byAbility<T>(v: T): Record<AbilityId, T> {
  return Object.fromEntries(ABILITY_IDS.map((id) => [id, v])) as Record<AbilityId, T>
}

function boot(): { sim: GameSim; offline: OfflineSummary | null } {
  try {
    const raw = localStorage.getItem(SAVE_KEY)
    if (raw) {
      const data = JSON.parse(raw) as SaveData
      const sim = GameSim.deserialize(data)
      const elapsed = Date.now() - data.savedAt
      if (elapsed > OFFLINE_MIN_MS) {
        const summary = sim.fastForward(GameSim.offlineTicks(elapsed))
        if (summary.kills > 0) return { sim, offline: summary }
      }
      return { sim, offline: null }
    }
  } catch {
    // corrupted or incompatible save — start fresh
  }
  return { sim: new GameSim(), offline: null }
}

/** Reactive bridge between the pure sim and the Svelte UI.
 *  Sim events are drained exactly once, inside step(); everything the UI
 *  shows is either a snapshot or an effect spawned from those events.
 *
 *  Game is also the FxDirector's host: the director decides *when* a number,
 *  a card recoil or a sound happens (a fireball's lands when the bolt does),
 *  and calls back in here to actually make it happen. */
export class Game implements FxHost {
  private readonly booted = boot()
  readonly sim = this.booted.sim

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
  bloom = $state(0)
  /** a crit landed: bump counter + how hard, for the screen-wide flash */
  critFlash: { n: number; power: number; side: Side } = $state({ n: 0, power: 1, side: 'enemy' })
  pressed = new SvelteSet<string>()
  /** Last enemy seen — keeps the "Slain" card on screen between spawns. */
  lastEnemy: EnemySnapshot | null = $state(null)
  offline: OfflineSummary | null = $state(this.booted.offline)
  banner: { level: number; unlocked: AbilityId[] } | null = $state(null)
  toast: { id: number; title: string; body: string } | null = $state(null)
  /** the boss's name, while the challenge cinematic is on screen */
  bossIntro: string | null = $state(null)
  victory = $state(false)
  muted = $state(this.sim.muted)
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
    if (this.offline) {
      this.append(`While you were away, your echo kept fighting.`, 'info')
    }
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
    for (let guard = 0; guard < 6; guard++) {
      const clash = this.floats.some(
        (o) => o.side === f.side && Math.abs(o.y - y) < LANE_HEIGHT && Math.abs(o.x - x) < LANE_WIDTH,
      )
      if (!clash) break
      y -= LANE_HEIGHT
    }

    this.floats.push({ id, side: f.side, kind: f.kind, amount: f.amount, tone: f.tone, scale: f.scale, x, y })
    setTimeout(() => {
      const i = this.floats.findIndex((f2) => f2.id === id)
      if (i !== -1) this.floats.splice(i, 1)
    }, FLOAT_LIFETIME_MS)
  }

  bump(side: Side, power: number, crit: boolean): void {
    const cur = this.impacts[side]
    this.impacts[side] = { n: cur.n + 1, power, crit }
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
    this.sim.muted = this.muted
    this.audio.muted = this.muted
  }

  travel(zoneId: string): void {
    if (this.sim.travelTo(zoneId)) {
      this.lastEnemy = null
      this.view = 'combat'
      this.publishAll()
    }
  }

  challengeBoss(): void {
    if (this.sim.challengeBoss()) {
      this.lastEnemy = null
      const zone = this.progress.zones.find((z) => z.current)
      this.append(`You call the challenge. ${zone?.bossName ?? 'The boss'} answers.`, 'boss')
      this.audio.play('boss')
      // The name lands before the body does — the fight is announced.
      this.bossIntro = zone?.bossName ?? 'The Boss'
      this.view = 'combat'
      this.publishAll()
    }
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

  dismissOffline(): void {
    this.offline = null
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
    for (const event of events) {
      this.onEvent(event)
      this.fx.handle(event)
    }
  }

  private publish(): void {
    this.combat = this.sim.combatSnapshot()
    if (this.combat.enemy) this.lastEnemy = this.combat.enemy
    for (const id of ABILITY_IDS) this.usable[id] = this.sim.canUse(id)
    if (this.progressDirty) {
      this.progressDirty = false
      this.progress = this.sim.progressSnapshot()
    }

    // Standing effects follow the snapshot — a burn that expires quietly still
    // has to stop burning, and no event says so.
    this.fx.sync(this.combat)
    const p = this.combat.player
    this.audio.drone(this.combat.enemy?.rank === 'boss')
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
          const name = this.combat.enemy?.name ?? this.lastEnemy?.name ?? 'the enemy'
          const verb = event.source === 'ignite' ? 'burns' : event.source === 'pyroblast' ? 'crushes' : 'slams'
          const spell = event.source === 'ignite' ? 'Ignite' : ABILITIES[event.source as AbilityId]?.name ?? 'Your spell'
          this.append(
            `${spell} ${verb} ${name} for ${event.amount}${event.crit ? ' — critical!' : '.'}`,
            event.source === 'ignite' ? 'arcana' : 'player',
          )
        } else {
          const who = this.combat.enemy?.name ?? 'The enemy'
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
          this.append(`Ignite sears ${this.combat.enemy?.name ?? 'the enemy'}.`, 'arcana')
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
        this.append(`${this.combat.enemy?.name ?? 'The enemy'} begins casting ${event.name}!`, 'enemy')
        break
      case 'enemyEnraged':
        this.append(`${event.name} flies into a frenzy!`, 'enemy')
        this.bump('enemy', 1.6, false)
        break
      case 'enemySpawned':
        this.lastEnemy = null
        this.append(event.intro, event.rank === 'boss' ? 'boss' : 'info')
        break
      case 'enemyDied':
        this.progressDirty = true
        break // folded into the kill line in step()
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
      case 'bossReady':
        this.progressDirty = true
        this.append('The way to the boss lies open. Challenge it from the zone banner.', 'boss')
        this.audio.play('warn')
        break
      case 'bossDefeated': {
        this.progressDirty = true
        const next = this.progress.zones.find((z) => z.id === event.nextZoneId)
        if (next) this.append(`New land unlocked: ${next.name}. Travel there from the Atlas.`, 'boss')
        break
      }
      case 'zoneEntered': {
        this.progressDirty = true
        this.lastEnemy = null
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
    if (e.key === 'a') {
      this.toggleAuto()
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
