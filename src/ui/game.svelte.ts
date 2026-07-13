import { SvelteSet } from 'svelte/reactivity'
import {
  ABILITIES,
  ABILITY_IDS,
  CombatEngine,
  DEFAULT_CONFIG,
  type AbilityId,
  type CombatEvent,
  type CombatSnapshot,
  type Side,
} from '../engine'
import type { LogEntry } from './components/CombatLog.svelte'
import { startLoop, type LoopHandle } from './loop'

export interface FloatText {
  id: number
  side: Side
  kind: 'damage' | 'heal'
  amount: number
  /** horizontal jitter, % of the card width */
  x: number
}

const LOG_CAP = 80
const FLOAT_LIFETIME_MS = 950

const KEY_TO_ABILITY: ReadonlyMap<string, AbilityId> = new Map(
  ABILITY_IDS.map((id) => [ABILITIES[id].key, id]),
)

/** Reactive bridge between the pure engine and the Svelte UI.
 *  Engine events are drained exactly once, inside step(); everything the UI
 *  shows is either this snapshot or an effect spawned from those events. */
export class Game {
  private readonly engine = new CombatEngine(DEFAULT_CONFIG)
  private ticks = 0
  private nextId = 1
  private loop: LoopHandle | null = null

  snap: CombatSnapshot = $state(this.engine.snapshot())
  usable: Record<AbilityId, boolean> = $state({ fireball: true, ignite: true, renew: true })
  log: LogEntry[] = $state([])
  floats: FloatText[] = $state([])
  /** bump counters driving hit-shake / heal-bloom choreography */
  impacts: Record<Side, number> = $state({ player: 0, enemy: 0 })
  bloom = $state(0)
  pressed = new SvelteSet<string>()

  start(): void {
    this.append('A Cave Golem lumbers out of the dark.', 'info')
    this.loop = startLoop(
      () => this.step(),
      (ran) => {
        if (ran > 0) this.publish()
      },
    )
    window.addEventListener('keydown', this.onKeyDown)
    window.addEventListener('keyup', this.onKeyUp)
  }

  stop(): void {
    this.loop?.stop()
    window.removeEventListener('keydown', this.onKeyDown)
    window.removeEventListener('keyup', this.onKeyUp)
  }

  use(id: AbilityId): void {
    if (this.engine.useAbility(id)) this.publish()
  }

  private step(): void {
    this.ticks++
    for (const event of this.engine.tick()) this.onEvent(event)
  }

  private publish(): void {
    this.snap = this.engine.snapshot()
    for (const id of ABILITY_IDS) this.usable[id] = this.engine.canUse(id)
  }

  private onEvent(event: CombatEvent): void {
    switch (event.kind) {
      case 'castStarted':
        this.append(`You begin casting ${ABILITIES[event.abilityId].name}.`, 'info')
        break
      case 'castFinished':
        break // the damage/heal event that follows tells the story
      case 'castFizzled':
        this.append(`${ABILITIES[event.abilityId].name} fizzles into the dark.`, 'info')
        break
      case 'damage':
        this.spawnFloat(event.target, 'damage', event.amount)
        this.impacts[event.target]++
        if (event.source === 'enemySwing') {
          this.append(`Cave Golem hits you for ${event.amount}.`, 'enemy')
        } else if (event.source === 'ignite') {
          this.append(`Ignite burns the Cave Golem for ${event.amount}.`, 'arcana')
        } else {
          this.append(`Fireball slams the Cave Golem for ${event.amount}.`, 'player')
        }
        break
      case 'heal':
        this.spawnFloat(event.target, 'heal', event.amount)
        this.bloom++
        this.append(`Renew restores ${event.amount} health.`, 'heal')
        break
      case 'dotApplied':
        this.append('Ignite sears the Cave Golem.', 'arcana')
        break
      case 'enemyDied':
        this.append(`Cave Golem is slain. +${DEFAULT_CONFIG.goldPerKill} gold.`, 'gold')
        break
      case 'enemyRespawned':
        this.append('A Cave Golem lumbers out of the dark.', 'info')
        break
      case 'playerDied':
        this.append('You fall. The observatory dims…', 'enemy')
        break
      case 'playerRespawned':
        this.append('You awaken restored — a fresh Cave Golem awaits.', 'info')
        break
    }
  }

  private spawnFloat(side: Side, kind: 'damage' | 'heal', amount: number): void {
    const id = this.nextId++
    this.floats.push({ id, side, kind, amount, x: 30 + Math.random() * 30 })
    setTimeout(() => {
      const i = this.floats.findIndex((f) => f.id === id)
      if (i !== -1) this.floats.splice(i, 1)
    }, FLOAT_LIFETIME_MS)
  }

  private append(text: string, tone: LogEntry['tone']): void {
    this.log.push({ id: this.nextId++, time: `${(this.ticks / 20).toFixed(1)}s`, text, tone })
    if (this.log.length > LOG_CAP) this.log.splice(0, this.log.length - LOG_CAP)
  }

  private onKeyDown = (e: KeyboardEvent): void => {
    if (e.repeat || e.ctrlKey || e.metaKey || e.altKey) return
    const id = KEY_TO_ABILITY.get(e.key)
    if (!id) return
    this.pressed.add(e.key)
    this.use(id)
  }

  private onKeyUp = (e: KeyboardEvent): void => {
    this.pressed.delete(e.key)
  }
}
