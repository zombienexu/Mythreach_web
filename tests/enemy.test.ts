import { describe, expect, it } from 'vitest'
import { advance, eventsOf, makeEngine } from './helpers'

describe('Cave Golem', () => {
  it('lands its first swing on tick 44 for 5-9 damage', () => {
    const e = makeEngine()
    const before = advance(e, 43)
    expect(eventsOf(before, 'damage').filter((d) => d.target === 'player')).toEqual([])

    const at44 = advance(e, 1)
    const hits = eventsOf(at44, 'damage').filter((d) => d.target === 'player')
    expect(hits).toHaveLength(1)
    expect(hits[0]!.amount).toBeGreaterThanOrEqual(5)
    expect(hits[0]!.amount).toBeLessThanOrEqual(9)
    expect(hits[0]!.source).toBe('enemySwing')
  })

  it('deals exact damage when min and max are pinned', () => {
    const e = makeEngine({ enemyDamageMin: 7, enemyDamageMax: 7 })
    const events = advance(e, 88) // two swings
    const hits = eventsOf(events, 'damage').filter((d) => d.target === 'player')
    expect(hits.map((h) => h.amount)).toEqual([7, 7])
    expect(e.snapshot().player.hp).toBe(86)
  })

  it('fills swing progress from 0 to 1 and resets after the swing', () => {
    const e = makeEngine()
    expect(e.snapshot().swingProgress).toBe(0)
    advance(e, 22)
    expect(e.snapshot().swingProgress).toBeCloseTo(0.5)
    advance(e, 21)
    expect(e.snapshot().swingProgress).toBeCloseTo(43 / 44)
    advance(e, 1)
    expect(e.snapshot().swingProgress).toBe(0)
  })

  it('never swings while dead', () => {
    const e = makeEngine({ enemyMaxHp: 10 })
    e.useAbility('fireball')
    advance(e, 50) // kill at tick 50 (one swing already landed at 44)
    expect(e.snapshot().enemy.alive).toBe(false)
    const whileDead = advance(e, 59) // ticks 51..109, respawn lands on 110
    expect(eventsOf(whileDead, 'damage').filter((d) => d.target === 'player')).toEqual([])

    // after respawn the swing timer is fresh: next hit 44 ticks later, on tick 154
    const after = advance(e, 45) // ticks 110..154
    expect(eventsOf(after, 'enemyRespawned')).toHaveLength(1)
    expect(eventsOf(after, 'damage').filter((d) => d.target === 'player')).toHaveLength(1)
  })
})
