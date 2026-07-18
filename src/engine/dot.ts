/** A single damage-over-time instance. One instance per application;
 *  refreshing means replacing the instance. A Thornspeaker briar grows:
 *  every landed tick raises the next by `growthPerHit`. */
export class Dot {
  private sinceLast = 0
  private hitsLeft: number
  private currentDamage: number

  constructor(
    readonly name: string,
    tickDamage: number,
    readonly intervalTicks: number,
    tickCount: number,
    private readonly growthPerHit = 0,
  ) {
    this.hitsLeft = tickCount
    this.currentDamage = tickDamage
  }

  get active(): boolean {
    return this.hitsLeft > 0
  }

  /** What the next landed tick will deal. */
  get tickDamage(): number {
    return this.currentDamage
  }

  /** Total ticks until the DoT expires (0 when spent). */
  get remainingTicks(): number {
    if (this.hitsLeft <= 0) return 0
    return (this.hitsLeft - 1) * this.intervalTicks + (this.intervalTicks - this.sinceLast)
  }

  /** Everything this DoT still owes if left to run — what a Verdant Cataract
   *  collects all at once. */
  get remainingDamage(): number {
    if (this.hitsLeft <= 0) return 0
    let total = 0
    for (let i = 0; i < this.hitsLeft; i++) total += this.currentDamage + i * this.growthPerHit
    return total
  }

  /** Advance one tick; returns the damage due this tick (usually 0). */
  tick(): number {
    if (this.hitsLeft <= 0) return 0
    this.sinceLast++
    if (this.sinceLast < this.intervalTicks) return 0
    this.sinceLast = 0
    this.hitsLeft--
    const due = this.currentDamage
    this.currentDamage += this.growthPerHit
    return due
  }

  /** Spend the whole DoT at once (Cataract). Returns what it still owed. */
  consume(): number {
    const owed = this.remainingDamage
    this.hitsLeft = 0
    return owed
  }
}
