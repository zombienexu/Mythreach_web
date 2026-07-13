import { describe, expect, it } from 'vitest'
import { advance, advanceTimeline, eventsOf, makeEngine } from './helpers'

describe('Ignite', () => {
  it('is instant with zero upfront damage', () => {
    const e = makeEngine()
    expect(e.useAbility('ignite')).toBe(true)
    expect(e.snapshot().cast).toBeNull()
    const events = advance(e, 19)
    expect(eventsOf(events, 'castStarted')).toEqual([])
    expect(eventsOf(events, 'damage').filter((d) => d.target === 'enemy')).toEqual([])
  })

  it('emits dotApplied on use', () => {
    const e = makeEngine()
    e.useAbility('ignite')
    const events = advance(e, 1)
    expect(eventsOf(events, 'dotApplied')).toEqual([{ kind: 'dotApplied', abilityId: 'ignite' }])
  })

  it('deals exactly 4 damage at each of 6 one-second boundaries (24 total)', () => {
    const e = makeEngine()
    e.useAbility('ignite')
    const timeline = advanceTimeline(e, 200)
    const dotHits = timeline
      .map(({ tick, events }) => ({
        tick,
        hits: eventsOf(events, 'damage').filter((d) => d.source === 'ignite'),
      }))
      .filter(({ hits }) => hits.length > 0)
    expect(dotHits.map((h) => h.tick)).toEqual([20, 40, 60, 80, 100, 120])
    for (const { hits } of dotHits) {
      expect(hits).toHaveLength(1)
      expect(hits[0]!.amount).toBe(4)
    }
    expect(e.snapshot().enemy.hp).toBe(80 - 24)
  })

  it('expires and clears from the snapshot', () => {
    const e = makeEngine()
    e.useAbility('ignite')
    advance(e, 119)
    expect(e.snapshot().dot).not.toBeNull()
    advance(e, 1)
    expect(e.snapshot().dot).toBeNull()
  })

  it('is unusable during its 160-tick cooldown, usable at tick 161', () => {
    const e = makeEngine()
    e.useAbility('ignite')
    advance(e, 159)
    expect(e.canUse('ignite')).toBe(false)
    advance(e, 1)
    expect(e.canUse('ignite')).toBe(true)
    expect(e.useAbility('ignite')).toBe(true)
  })
})
