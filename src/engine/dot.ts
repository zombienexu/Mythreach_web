export interface DotDef {
  tickDamage: number
  intervalTicks: number
  tickCount: number
}

/** A single damage-over-time instance. Reapplying refreshes the full duration. */
export class Dot {
  private sinceLast = 0
  private hitsLeft = 0

  constructor(private readonly def: DotDef) {}

  get active(): boolean {
    return this.hitsLeft > 0
  }

  /** Total ticks until the DoT expires (0 when inactive). */
  get remainingTicks(): number {
    if (this.hitsLeft <= 0) return 0
    return (this.hitsLeft - 1) * this.def.intervalTicks + (this.def.intervalTicks - this.sinceLast)
  }

  apply(): void {
    this.sinceLast = 0
    this.hitsLeft = this.def.tickCount
  }

  clear(): void {
    this.sinceLast = 0
    this.hitsLeft = 0
  }

  /** Advance one tick; returns the damage due this tick (usually 0). */
  tick(): number {
    if (this.hitsLeft <= 0) return 0
    this.sinceLast++
    if (this.sinceLast < this.def.intervalTicks) return 0
    this.sinceLast = 0
    this.hitsLeft--
    return this.def.tickDamage
  }
}
