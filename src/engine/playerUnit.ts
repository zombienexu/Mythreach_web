import { ABILITY_IDS } from './abilities'
import { Combatant } from './combatant'
import type { Dot } from './dot'
import type {
  AbilityId,
  BuffId,
  BuffSnapshot,
  CardId,
  DerivedStats,
  PlayerSnapshot,
  StrikeSnapshot,
} from './types'

/** Derived from ABILITY_IDS, never hand-listed: a new ability must not be able
 *  to ship with a missing cooldown slot. */
function zeroCooldowns(): Record<AbilityId, number> {
  return Object.fromEntries(ABILITY_IDS.map((id) => [id, 0])) as Record<AbilityId, number>
}

/** A raised ally: the Gravewright's exhumed echo or the Riftblade's
 *  afterimage. Swings on its own clock, takes no damage, expires on time. */
export interface Echo {
  name: string
  dmgMin: number
  dmgMax: number
  swingTicks: number
  swingElapsed: number
  remaining: number
}

/** Timed buffs beyond the two classics — one map, so a new buff is a key,
 *  not a field. */
export type TimedBuffId = Exclude<BuffId, 'barrier' | 'combustion'>

/** The hero's combat-side state. Progression (level/gear/talents) lives in the sim;
 *  this is only what resets or ticks during a fight. */
export class PlayerUnit {
  readonly combatant: Combatant
  mana: number
  cast: { id: AbilityId; elapsed: number; total: number } | null = null
  queued: AbilityId | null = null
  gcd = 0
  cooldowns: Record<AbilityId, number> = zeroCooldowns()
  /** Absorb shield; expires on time or when consumed. `thorns` bites back. */
  shield: { amount: number; remaining: number; thorns: number } | null = null
  /** Remaining combustion ticks (0 = inactive). */
  combustion = 0
  /** The rest of the timed buffs, id → remaining ticks. */
  buffs = new Map<TimedBuffId, number>()
  /** Enemy venom on the hero. */
  venom: Dot | null = null
  regenElapsed = 0
  respawnIn = 0

  // ── the staff's basic attack ──
  /** Ticks into the current wind-up. Advances only with a live target and no
   *  cast in flight; the landing blow resets it. */
  strikeElapsed = 0
  /** A Focus read banked into your own wind-up: the next landing blow is
   *  Sharpened. Consumed when the strike lands. */
  sharpenReady = false

  // ── class mechanic state ──
  /** Arcanist Heat: accumulated fire, 0–10. Momentum — every point burns
   *  hotter, unfed Heat bleeds away. Combat-transient (never persisted). */
  heat = 0
  /** Ticks since Heat was last fed — drives the unfed-Heat decay. */
  heatIdle = 0
  /** Focus (universal read-the-foe action): remaining cooldown ticks. */
  focusCd = 0
  /** Gravewright: banked ledger pages (the one resource that persists). */
  pages = 0
  /** Gravewright: the last foe written in, ready to be exhumed. */
  buried: { name: string; dmgMin: number; dmgMax: number } | null = null
  /** Gravewright / Riftblade: the raised ally, if any. */
  echo: Echo | null = null
  /** Hourwarden: sand debt and the ticks until it comes due. */
  debt = 0
  reckoningIn = 0
  /** Hourwarden: the last blow that landed, for Rewind Wound. */
  lastHitTaken = 0
  /** Cartomancer: the hand fate dealt. */
  hand: CardId[] = []
  /** Riftblade: banked rift charges. */
  charges = 0
  /** Riftblade: Doorway Duel's chosen opponent, while the door holds. */
  doorwayTarget: number | null = null
  /** The Tower's grace, spent once per fight. */
  cheatedDeath = false

  constructor(stats: DerivedStats) {
    this.combatant = new Combatant(stats.maxHp)
    this.mana = stats.maxMana
  }

  get alive(): boolean {
    return this.combatant.alive
  }

  buffTicks(id: TimedBuffId): number {
    return this.buffs.get(id) ?? 0
  }

  hasBuff(id: TimedBuffId): boolean {
    return this.buffTicks(id) > 0
  }

  /** Re-derive pools after level-up / gear / talent changes. */
  applyStats(stats: DerivedStats, fullRestore: boolean): void {
    this.combatant.setMaxHp(stats.maxHp)
    if (fullRestore) {
      this.combatant.reset()
      this.mana = stats.maxMana
    } else {
      this.mana = Math.min(this.mana, stats.maxMana)
    }
  }

  clearCombatState(): void {
    this.cast = null
    this.queued = null
    this.gcd = 0
    this.strikeElapsed = 0
    this.sharpenReady = false
    this.heat = 0
    this.heatIdle = 0
    this.focusCd = 0
    this.shield = null
    this.combustion = 0
    this.buffs.clear()
    this.venom = null
    this.echo = null
    this.debt = 0
    this.reckoningIn = 0
    this.lastHitTaken = 0
    this.doorwayTarget = null
    this.charges = 0
  }

  snapshot(stats: DerivedStats, strike: StrikeSnapshot | null): PlayerSnapshot {
    const buffs: BuffSnapshot[] = []
    if (this.shield) buffs.push({ id: 'barrier', remainingTicks: this.shield.remaining, amount: this.shield.amount })
    if (this.combustion > 0) buffs.push({ id: 'combustion', remainingTicks: this.combustion })
    for (const [id, remaining] of this.buffs) {
      if (remaining > 0) buffs.push({ id, remainingTicks: remaining })
    }
    return {
      hp: this.combatant.hp,
      maxHp: this.combatant.maxHp,
      mana: this.mana,
      maxMana: stats.maxMana,
      shield: this.shield?.amount ?? 0,
      alive: this.alive,
      respawnIn: this.alive ? 0 : this.respawnIn,
      heat: this.heat,
      focusCd: this.focusCd,
      focusReady: this.focusCd === 0 && this.alive,
      strike,
      buffs,
      dot:
        this.venom && this.venom.active
          ? { name: this.venom.name, remainingTicks: this.venom.remainingTicks, source: 'venom' }
          : null,
    }
  }
}
