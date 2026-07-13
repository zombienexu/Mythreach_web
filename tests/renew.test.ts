import { describe, expect, it } from 'vitest'
import { advance, eventsOf, makeEngine } from './helpers'

describe('Renew', () => {
  it('heals 18-26 after 36 ticks', () => {
    // pin enemy damage to 9: swings at 44/88/132 leave the hero at 73
    const e = makeEngine({ enemyDamageMin: 9, enemyDamageMax: 9 })
    advance(e, 132)
    expect(e.snapshot().player.hp).toBe(73)

    expect(e.useAbility('renew')).toBe(true)
    const before = advance(e, 35)
    expect(eventsOf(before, 'heal')).toEqual([])

    const at36 = advance(e, 1)
    const heals = eventsOf(at36, 'heal')
    expect(heals).toHaveLength(1)
    expect(heals[0]!.amount).toBeGreaterThanOrEqual(18)
    expect(heals[0]!.amount).toBeLessThanOrEqual(26)
    expect(heals[0]!.source).toBe('renew')
    expect(e.snapshot().player.hp).toBe(73 + heals[0]!.amount)
  })

  it('clamps overheal at max HP and emits only the actual amount', () => {
    // pin enemy damage to 5: one swing at 44 leaves the hero at 95
    const e = makeEngine({ enemyDamageMin: 5, enemyDamageMax: 5 })
    advance(e, 50)
    expect(e.snapshot().player.hp).toBe(95)

    e.useAbility('renew')
    const events = advance(e, 36)
    const heals = eventsOf(events, 'heal')
    expect(heals).toHaveLength(1)
    expect(heals[0]!.amount).toBe(5)
    expect(e.snapshot().player.hp).toBe(100)
  })

  it('starts its 100-tick cooldown at resolve, not at cast start', () => {
    const e = makeEngine({ enemyDamageMin: 5, enemyDamageMax: 5 })
    advance(e, 50)
    e.useAbility('renew')
    advance(e, 36) // resolve
    expect(e.canUse('renew')).toBe(false)
    advance(e, 99)
    expect(e.canUse('renew')).toBe(false)
    advance(e, 1)
    expect(e.canUse('renew')).toBe(true)
  })
})
