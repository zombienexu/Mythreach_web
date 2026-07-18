import { Combatant } from './combatant'
import { Dot } from './dot'
import type {
  EncounterRow,
  EnemyDef,
  EnemyMechanicEnrage,
  EnemyMechanicHardcast,
  EnemyMechanicVenom,
  EnemySnapshot,
  LootBundle,
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
  /** The player's affliction on this enemy (Ignite, Gravechill, Briar…). */
  bane: Dot | null = null
  /** What the FX layer should paint the bane with — the ability that set it. */
  baneSource: string | null = null
  /** While the bane chills, swings land this % slower (Gravechill). */
  chillPct = 0
  /** Ticks left outside time (Stasis, Doorway Duel). Frozen mobs do nothing. */
  frozen = 0
  /** Spoils banked at death, cleared when the player loots the corpse. */
  loot: LootBundle | null = null

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
    let base = this.def.swingTicks
    const mech = this.enrageMech
    if (this.enraged && mech) base = Math.max(10, Math.round(base * mech.swingMult))
    // A chilled thing swings through syrup, enraged or not.
    if (this.chillPct > 0 && this.bane?.active) {
      base = Math.round((base * (100 + this.chillPct)) / 100)
    }
    return base
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
      frozenTicks: this.frozen,
      loot: this.loot,
      dot:
        this.bane && this.bane.active
          ? {
              name: this.bane.name,
              remainingTicks: this.bane.remainingTicks,
              ...(this.baneSource !== null ? { source: this.baneSource } : {}),
            }
          : null,
    }
  }
}
