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
import { startLoop, type LoopHandle } from './loop'
import { Sfx } from './sfx'

export type View = 'combat' | 'character' | 'talents' | 'atlas' | 'chronicle'

export interface FloatText {
  id: number
  side: Side
  kind: 'damage' | 'crit' | 'heal' | 'absorb'
  amount: number
  /** horizontal jitter, % of the card width */
  x: number
}

const SAVE_KEY = 'mythreach-save-v1'
const LOG_CAP = 100
const FLOAT_LIFETIME_MS = 950
const SAVE_EVERY_MS = 5000

const KEY_TO_ABILITY: ReadonlyMap<string, AbilityId> = new Map(
  ABILITY_IDS.map((id) => [ABILITIES[id].key, id]),
)

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
 *  shows is either a snapshot or an effect spawned from those events. */
export class Game {
  private readonly booted = boot()
  readonly sim = this.booted.sim

  combat: CombatSnapshot = $state(this.sim.combatSnapshot())
  progress: ProgressSnapshot = $state(this.sim.progressSnapshot())
  usable: Record<AbilityId, boolean> = $state({
    fireball: false,
    ignite: false,
    renew: false,
    pyroblast: false,
    counterspell: false,
    barrier: false,
    combustion: false,
  })
  view: View = $state('combat')
  log: LogEntry[] = $state([])
  floats: FloatText[] = $state([])
  /** bump counters driving hit-shake / heal-bloom choreography */
  impacts: Record<Side, number> = $state({ player: 0, enemy: 0 })
  bloom = $state(0)
  pressed = new SvelteSet<string>()
  /** Last enemy seen — keeps the "Slain" card on screen between spawns. */
  lastEnemy: EnemySnapshot | null = $state(null)
  offline: OfflineSummary | null = $state(this.booted.offline)
  banner: { level: number; unlocked: AbilityId[] } | null = $state(null)
  toast: { id: number; title: string; body: string } | null = $state(null)
  victory = $state(false)
  muted = $state(this.sim.muted)
  auto = $state(this.sim.autoBattle)

  private readonly sfx = new Sfx()
  private nextId = 1
  private loop: LoopHandle | null = null
  private saveTimer: ReturnType<typeof setInterval> | null = null
  private bannerTimer: ReturnType<typeof setTimeout> | null = null
  private toastTimer: ReturnType<typeof setTimeout> | null = null
  private progressDirty = false

  start(): void {
    this.sfx.muted = this.muted
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
    this.saveNow()
  }

  // ─────────────── player intents ───────────────

  use(id: AbilityId): void {
    if (this.sim.useAbility(id)) this.publish()
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
    this.sfx.muted = this.muted
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
      this.sfx.play('boss')
      this.view = 'combat'
      this.publishAll()
    }
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
      this.sfx.play('kill')
    }
    for (const event of events) this.onEvent(event)
  }

  private publish(): void {
    this.combat = this.sim.combatSnapshot()
    if (this.combat.enemy) this.lastEnemy = this.combat.enemy
    for (const id of ABILITY_IDS) this.usable[id] = this.sim.canUse(id)
    if (this.progressDirty) {
      this.progressDirty = false
      this.progress = this.sim.progressSnapshot()
    }
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
        this.sfx.play('cast')
        break
      case 'castFizzled':
        this.append(`${ABILITIES[event.abilityId].name} fizzles into the dark.`, 'info')
        break
      case 'abilityQueued':
        break // the button glow tells the story
      case 'damage': {
        if (event.target === 'enemy') {
          this.spawnFloat('enemy', event.crit ? 'crit' : 'damage', event.amount)
          this.impacts.enemy++
          const name = this.combat.enemy?.name ?? this.lastEnemy?.name ?? 'the enemy'
          const verb = event.source === 'ignite' ? 'burns' : event.source === 'pyroblast' ? 'crushes' : 'slams'
          const spell = event.source === 'ignite' ? 'Ignite' : ABILITIES[event.source as AbilityId]?.name ?? 'Your spell'
          this.append(
            `${spell} ${verb} ${name} for ${event.amount}${event.crit ? ' — critical!' : '.'}`,
            event.source === 'ignite' ? 'arcana' : 'player',
          )
          this.sfx.play(event.crit ? 'crit' : 'hit')
        } else {
          if (event.amount > 0) {
            this.spawnFloat('player', 'damage', event.amount)
            this.impacts.player++
          } else if (event.absorbed > 0) {
            this.spawnFloat('player', 'absorb', event.absorbed)
          }
          const who = this.combat.enemy?.name ?? 'The enemy'
          const hit =
            event.source === 'enemySwing'
              ? `${who} hits you`
              : event.source === 'venom'
                ? `${event.label ?? 'Venom'} sears you`
                : `${event.label ?? 'A spell'} strikes you`
          const soak = event.absorbed > 0 ? ` (${event.absorbed} absorbed)` : ''
          this.append(`${hit} for ${event.amount}${soak}.`, 'enemy')
          if (event.amount > 0) this.sfx.play('hit')
        }
        break
      }
      case 'heal':
        this.spawnFloat('player', 'heal', event.amount)
        this.bloom++
        this.append(`Renew restores ${event.amount} health${event.crit ? ' — critical!' : '.'}`, 'heal')
        this.sfx.play('heal')
        break
      case 'dotApplied':
        if (event.target === 'enemy') {
          this.append(`Ignite sears ${this.combat.enemy?.name ?? 'the enemy'}.`, 'arcana')
        } else {
          this.append(`${event.name} seeps into your veins.`, 'enemy')
          this.sfx.play('warn')
        }
        break
      case 'buffApplied':
        if (event.id === 'barrier') {
          this.append(`A barrier of starlight surrounds you (${event.amount ?? 0}).`, 'player')
          this.sfx.play('cast')
        } else {
          this.append('Combustion! Your fire runs wild.', 'player')
          this.sfx.play('epic')
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
        this.sfx.play('interrupt')
        break
      case 'enemyCastStarted':
        this.append(`${this.combat.enemy?.name ?? 'The enemy'} begins casting ${event.name}!`, 'enemy')
        this.sfx.play('warn')
        break
      case 'enemyEnraged':
        this.append(`${event.name} flies into a frenzy!`, 'enemy')
        this.impacts.enemy++
        this.sfx.play('boss')
        break
      case 'enemySpawned':
        this.lastEnemy = null
        this.append(event.intro, event.rank === 'boss' ? 'boss' : 'info')
        if (event.rank === 'boss') this.sfx.play('boss')
        break
      case 'enemyDied':
        this.progressDirty = true
        break // folded into the kill line in step()
      case 'playerDied':
        this.progressDirty = true
        this.append('You fall. The observatory dims…', 'enemy')
        this.sfx.play('death')
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
        this.sfx.play(event.item.rarity === 'epic' ? 'epic' : 'loot')
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
        this.sfx.play('level')
        break
      }
      case 'bossReady':
        this.progressDirty = true
        this.append('The way to the boss lies open. Challenge it from the zone banner.', 'boss')
        this.sfx.play('warn')
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
        this.sfx.play('loot')
        break
      }
      case 'gameCompleted':
        this.progressDirty = true
        this.victory = true
        this.sfx.play('level')
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

  private spawnFloat(side: Side, kind: FloatText['kind'], amount: number): void {
    const id = this.nextId++
    this.floats.push({ id, side, kind, amount, x: 30 + Math.random() * 30 })
    setTimeout(() => {
      const i = this.floats.findIndex((f) => f.id === id)
      if (i !== -1) this.floats.splice(i, 1)
    }, FLOAT_LIFETIME_MS)
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
    this.sfx.unlock()
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
