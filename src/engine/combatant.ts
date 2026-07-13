/** HP pool with the frozen death/heal rules: overkill clamps at 0, the dead
 *  take no damage and cannot be healed, heals clamp at max and report only
 *  the amount actually restored. */
export class Combatant {
  hp: number

  constructor(readonly maxHp: number) {
    this.hp = maxHp
  }

  get alive(): boolean {
    return this.hp > 0
  }

  /** Returns the damage actually dealt (0 for the dead or non-positive amounts). */
  damage(amount: number): number {
    if (!this.alive || amount <= 0) return 0
    const dealt = Math.min(this.hp, amount)
    this.hp -= dealt
    return dealt
  }

  /** Returns the HP actually restored (0 for the dead or non-positive amounts). */
  heal(amount: number): number {
    if (!this.alive || amount <= 0) return 0
    const healed = Math.min(this.maxHp - this.hp, amount)
    this.hp += healed
    return healed
  }

  reset(): void {
    this.hp = this.maxHp
  }
}
