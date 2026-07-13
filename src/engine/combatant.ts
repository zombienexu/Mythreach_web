/** HP pool with the frozen death/heal rules: overkill clamps at 0, the dead
 *  take no damage and cannot be healed, heals clamp at max and report only
 *  the amount actually restored. */
export class Combatant {
  hp: number

  constructor(private _maxHp: number) {
    this.hp = _maxHp
  }

  get maxHp(): number {
    return this._maxHp
  }

  /** Level-ups and gear swaps resize the pool; current HP clamps down but never rises. */
  setMaxHp(maxHp: number): void {
    this._maxHp = Math.max(1, maxHp)
    this.hp = Math.min(this.hp, this._maxHp)
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
