import { ABILITY_IDS } from './abilities'
import { Combatant } from './combatant'
import type { Dot } from './dot'
import type { AbilityId, BuffSnapshot, DerivedStats, PlayerSnapshot } from './types'

/** Derived from ABILITY_IDS, never hand-listed: a new ability must not be able
 *  to ship with a missing cooldown slot. */
function zeroCooldowns(): Record<AbilityId, number> {
  return Object.fromEntries(ABILITY_IDS.map((id) => [id, 0])) as Record<AbilityId, number>
}

/** The hero's combat-side state. Progression (level/gear/talents) lives in the sim;
 *  this is only what resets or ticks during a fight. */
export class PlayerUnit {
  readonly combatant: Combatant
  mana: number
  cast: { id: AbilityId; elapsed: number; total: number } | null = null
  queued: AbilityId | null = null
  gcd = 0
  cooldowns: Record<AbilityId, number> = zeroCooldowns()
  /** Barrier absorb; expires on time or when consumed. */
  shield: { amount: number; remaining: number } | null = null
  /** Remaining combustion ticks (0 = inactive). */
  combustion = 0
  /** Enemy venom on the hero. */
  venom: Dot | null = null
  regenElapsed = 0
  respawnIn = 0

  constructor(stats: DerivedStats) {
    this.combatant = new Combatant(stats.maxHp)
    this.mana = stats.maxMana
  }

  get alive(): boolean {
    return this.combatant.alive
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
    this.shield = null
    this.combustion = 0
    this.venom = null
  }

  snapshot(stats: DerivedStats): PlayerSnapshot {
    const buffs: BuffSnapshot[] = []
    if (this.shield) buffs.push({ id: 'barrier', remainingTicks: this.shield.remaining, amount: this.shield.amount })
    if (this.combustion > 0) buffs.push({ id: 'combustion', remainingTicks: this.combustion })
    return {
      hp: this.combatant.hp,
      maxHp: this.combatant.maxHp,
      mana: this.mana,
      maxMana: stats.maxMana,
      shield: this.shield?.amount ?? 0,
      alive: this.alive,
      respawnIn: this.alive ? 0 : this.respawnIn,
      buffs,
      dot:
        this.venom && this.venom.active
          ? { name: this.venom.name, remainingTicks: this.venom.remainingTicks }
          : null,
    }
  }
}
