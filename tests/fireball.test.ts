import { describe, expect, it } from 'vitest'
import { advance, eventsOf, makeEngine } from './helpers'

describe('Fireball', () => {
  it('deals no damage before tick 50, then 16-24 on cast completion', () => {
    const e = makeEngine()
    expect(e.useAbility('fireball')).toBe(true)
    const before = advance(e, 49)
    expect(eventsOf(before, 'damage').filter((d) => d.target === 'enemy')).toEqual([])

    const at50 = advance(e, 1)
    const hits = eventsOf(at50, 'damage').filter((d) => d.target === 'enemy')
    expect(hits).toHaveLength(1)
    expect(hits[0]!.amount).toBeGreaterThanOrEqual(16)
    expect(hits[0]!.amount).toBeLessThanOrEqual(24)
    expect(hits[0]!.source).toBe('fireball')
  })

  it('fires castStarted and castFinished exactly once', () => {
    const e = makeEngine()
    e.useAbility('fireball')
    const events = advance(e, 80)
    expect(eventsOf(events, 'castStarted')).toEqual([{ kind: 'castStarted', abilityId: 'fireball' }])
    expect(eventsOf(events, 'castFinished')).toEqual([{ kind: 'castFinished', abilityId: 'fireball' }])
  })

  it('locks out all three abilities while casting', () => {
    const e = makeEngine()
    e.useAbility('fireball')
    advance(e, 10)
    expect(e.canUse('fireball')).toBe(false)
    expect(e.canUse('ignite')).toBe(false)
    expect(e.canUse('renew')).toBe(false)
    expect(e.useAbility('ignite')).toBe(false)
    // cast completes, lock releases
    advance(e, 40)
    expect(e.canUse('fireball')).toBe(true)
  })

  it('reports castProgress from 0 to 1', () => {
    const e = makeEngine()
    e.useAbility('fireball')
    expect(e.snapshot().cast?.progress).toBe(0)
    advance(e, 25)
    expect(e.snapshot().cast?.progress).toBeCloseTo(0.5)
    advance(e, 24)
    expect(e.snapshot().cast?.progress).toBeCloseTo(49 / 50)
    advance(e, 1)
    expect(e.snapshot().cast).toBeNull()
  })

  it('requires a living enemy to start', () => {
    // enemy with 10 HP dies to one fireball
    const e = makeEngine({ enemyMaxHp: 10 })
    e.useAbility('fireball')
    advance(e, 50)
    expect(e.snapshot().enemy.alive).toBe(false)
    expect(e.canUse('fireball')).toBe(false)
    expect(e.useAbility('fireball')).toBe(false)
  })
})
