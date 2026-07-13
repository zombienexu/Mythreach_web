/** A single damage-over-time instance. One instance per application;
 *  refreshing means replacing the instance. */
export class Dot {
  private sinceLast = 0
  private hitsLeft: number

  constructor(
    readonly name: string,
    readonly tickDamage: number,
    readonly intervalTicks: number,
    tickCount: number,
  ) {
    this.hitsLeft = tickCount
  }

  get active(): boolean {
    return this.hitsLeft > 0
  }

  /** Total ticks until the DoT expires (0 when spent). */
  get remainingTicks(): number {
    if (this.hitsLeft <= 0) return 0
    return (this.hitsLeft - 1) * this.intervalTicks + (this.intervalTicks - this.sinceLast)
  }

  /** Advance one tick; returns the damage due this tick (usually 0). */
  tick(): number {
    if (this.hitsLeft <= 0) return 0
    this.sinceLast++
    if (this.sinceLast < this.intervalTicks) return 0
    this.sinceLast = 0
    this.hitsLeft--
    return this.tickDamage
  }
}
