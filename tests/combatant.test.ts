import { describe, expect, it } from 'vitest'
import { Combatant } from '../src/engine/combatant'

describe('Combatant', () => {
  it('starts at full HP and reports damage actually dealt', () => {
    const c = new Combatant(100)
    expect(c.hp).toBe(100)
    expect(c.damage(30)).toBe(30)
    expect(c.hp).toBe(70)
  })

  it('clamps overkill at zero and reports only the HP removed', () => {
    const c = new Combatant(50)
    expect(c.damage(80)).toBe(50)
    expect(c.hp).toBe(0)
    expect(c.alive).toBe(false)
  })

  it('deals no damage to the dead and ignores non-positive amounts', () => {
    const c = new Combatant(50)
    c.damage(50)
    expect(c.damage(10)).toBe(0)
    const c2 = new Combatant(50)
    expect(c2.damage(0)).toBe(0)
    expect(c2.damage(-5)).toBe(0)
    expect(c2.hp).toBe(50)
  })

  it('heals clamp at max and report only the amount restored', () => {
    const c = new Combatant(100)
    c.damage(10)
    expect(c.heal(25)).toBe(10)
    expect(c.hp).toBe(100)
  })

  it('cannot heal the dead', () => {
    const c = new Combatant(50)
    c.damage(50)
    expect(c.heal(20)).toBe(0)
    expect(c.alive).toBe(false)
  })

  it('reset restores full HP', () => {
    const c = new Combatant(80)
    c.damage(80)
    c.reset()
    expect(c.hp).toBe(80)
    expect(c.alive).toBe(true)
  })

  it('setMaxHp grows the pool without granting HP, and clamps down', () => {
    const c = new Combatant(100)
    c.damage(40)
    c.setMaxHp(150)
    expect(c.maxHp).toBe(150)
    expect(c.hp).toBe(60)
    c.setMaxHp(50)
    expect(c.hp).toBe(50)
  })
})
