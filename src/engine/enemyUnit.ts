import { Combatant } from './combatant'
import { Dot } from './dot'
import type {
  EncounterRow,
  EnemyDef,
  EnemyMechanicEnrage,
  EnemyMechanicHardcast,
  EnemyMechanicVenom,
  EnemySnapshot,
} from './types'

/** One spawned enemy: HP, swing timer, and its mechanic state.
 *  Pure state + timers; the sim decides what the numbers do. */
export class EnemyUnit {
  readonly combatant: Combatant
  swingElapsed = 0
  enraged = false
  /** Active hardcast; while non-null the enemy does not swing. */
  cast: { mech: EnemyMechanicHardcast; elapsed: number } | null = null
  /** Ticks until the next hardcast attempt (idle while casting). */
  castCooldown = 0
  /** Ticks until the next venom application. */
  venomTimer = 0
  /** The player's burn on this enemy. */
  ignite: Dot | null = null

  constructor(
    readonly def: EnemyDef,
    /** Instance id, unique per spawn — how targeting and FX tell twins apart. */
    readonly iid: number,
    readonly row: EncounterRow = 'front',
  ) {
    this.combatant = new Combatant(def.hp)
    const hc = this.hardcastMech
    if (hc) this.castCooldown = Math.floor(hc.cooldownTicks / 2)
    const v = this.venomMech
    if (v) this.venomTimer = Math.floor(v.everyTicks / 2)
  }

  get enrageMech(): EnemyMechanicEnrage | undefined {
    return this.def.mechanics.find((m): m is EnemyMechanicEnrage => m.kind === 'enrage')
  }

  get hardcastMech(): EnemyMechanicHardcast | undefined {
    return this.def.mechanics.find((m): m is EnemyMechanicHardcast => m.kind === 'hardcast')
  }

  get venomMech(): EnemyMechanicVenom | undefined {
    return this.def.mechanics.find((m): m is EnemyMechanicVenom => m.kind === 'venom')
  }

  get swingTicks(): number {
    const base = this.def.swingTicks
    const mech = this.enrageMech
    return this.enraged && mech ? Math.max(10, Math.round(base * mech.swingMult)) : base
  }

  get dmgRange(): [number, number] {
    const mech = this.enrageMech
    if (this.enraged && mech) {
      return [Math.round(this.def.dmgMin * mech.dmgMult), Math.round(this.def.dmgMax * mech.dmgMult)]
    }
    return [this.def.dmgMin, this.def.dmgMax]
  }

  /** True when this HP change crossed the enrage threshold for the first time. */
  checkEnrage(): boolean {
    const mech = this.enrageMech
    if (!mech || this.enraged || !this.combatant.alive) return false
    if (this.combatant.hp * 100 <= this.combatant.maxHp * mech.hpPct) {
      this.enraged = true
      return true
    }
    return false
  }

  snapshot(): EnemySnapshot {
    return {
      iid: this.iid,
      defId: this.def.id,
      name: this.def.name,
      level: this.def.level,
      rank: this.def.rank,
      row: this.row,
      portrait: this.def.portrait,
      hp: this.combatant.hp,
      maxHp: this.combatant.maxHp,
      alive: this.combatant.alive,
      swingProgress: this.cast === null ? this.swingElapsed / this.swingTicks : 0,
      cast: this.cast
        ? {
            name: this.cast.mech.name,
            progress: this.cast.elapsed / this.cast.mech.castTicks,
            remainingTicks: this.cast.mech.castTicks - this.cast.elapsed,
          }
        : null,
      enraged: this.enraged,
      dot:
        this.ignite && this.ignite.active
          ? { name: this.ignite.name, remainingTicks: this.ignite.remainingTicks }
          : null,
    }
  }
}
