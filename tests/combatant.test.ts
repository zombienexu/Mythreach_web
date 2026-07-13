import { describe, expect, it } from 'vitest'
import { Combatant } from '../src/engine/combatant'

describe('Combatant', () => {
  it('damage reduces HP and returns the amount dealt', () => {
    const c = new Combatant(100)
    expect(c.damage(30)).toBe(30)
    expect(c.hp).toBe(70)
    expect(c.alive).toBe(true)
  })

  it('overkill clamps HP at 0 and kills', () => {
    const c = new Combatant(100)
    expect(c.damage(250)).toBe(100)
    expect(c.hp).toBe(0)
    expect(c.alive).toBe(false)
  })

  it('ignores damage to the dead', () => {
    const c = new Combatant(100)
    c.damage(100)
    expect(c.damage(10)).toBe(0)
    expect(c.hp).toBe(0)
  })

  it('ignores heals on the dead', () => {
    const c = new Combatant(100)
    c.damage(100)
    expect(c.heal(50)).toBe(0)
    expect(c.hp).toBe(0)
    expect(c.alive).toBe(false)
  })

  it('heal clamps at max HP and returns the actual amount restored', () => {
    const c = new Combatant(100)
    c.damage(30)
    expect(c.heal(50)).toBe(30)
    expect(c.hp).toBe(100)
  })

  it('ignores zero and negative amounts', () => {
    const c = new Combatant(100)
    expect(c.damage(0)).toBe(0)
    expect(c.damage(-5)).toBe(0)
    expect(c.hp).toBe(100)
    c.damage(20)
    expect(c.heal(0)).toBe(0)
    expect(c.heal(-3)).toBe(0)
    expect(c.hp).toBe(80)
  })
})
