import { describe, expect, it } from 'vitest'
import { mulberry32, pickOne, pickWeighted, rollInt, rollPct } from '../src/engine/rng'

describe('mulberry32', () => {
  it('is deterministic for a given seed', () => {
    const a = mulberry32(42)
    const b = mulberry32(42)
    for (let i = 0; i < 100; i++) expect(a()).toBe(b())
  })

  it('produces values in [0, 1)', () => {
    const rng = mulberry32(7)
    for (let i = 0; i < 1000; i++) {
      const v = rng()
      expect(v).toBeGreaterThanOrEqual(0)
      expect(v).toBeLessThan(1)
    }
  })
})

describe('rollInt', () => {
  it('stays inclusive on both ends and hits both bounds', () => {
    const rng = mulberry32(3)
    const seen = new Set<number>()
    for (let i = 0; i < 2000; i++) {
      const v = rollInt(rng, 5, 9)
      expect(v).toBeGreaterThanOrEqual(5)
      expect(v).toBeLessThanOrEqual(9)
      seen.add(v)
    }
    expect(seen).toEqual(new Set([5, 6, 7, 8, 9]))
  })
})

describe('rollPct', () => {
  it('never fires at 0 and always fires at 100', () => {
    const rng = mulberry32(9)
    for (let i = 0; i < 200; i++) {
      expect(rollPct(rng, 0)).toBe(false)
      expect(rollPct(rng, 100)).toBe(true)
    }
  })

  it('fires roughly at the requested rate', () => {
    const rng = mulberry32(11)
    let hits = 0
    for (let i = 0; i < 10_000; i++) if (rollPct(rng, 25)) hits++
    expect(hits).toBeGreaterThan(2200)
    expect(hits).toBeLessThan(2800)
  })
})

describe('pickWeighted / pickOne', () => {
  it('only returns listed values and respects heavy weights', () => {
    const rng = mulberry32(5)
    const counts = { a: 0, b: 0 }
    for (let i = 0; i < 1000; i++) {
      const v = pickWeighted(rng, [
        { value: 'a' as const, weight: 90 },
        { value: 'b' as const, weight: 10 },
      ])
      counts[v]++
    }
    expect(counts.a + counts.b).toBe(1000)
    expect(counts.a).toBeGreaterThan(counts.b)
  })

  it('pickOne covers the whole array', () => {
    const rng = mulberry32(13)
    const seen = new Set<string>()
    for (let i = 0; i < 500; i++) seen.add(pickOne(rng, ['x', 'y', 'z']))
    expect(seen).toEqual(new Set(['x', 'y', 'z']))
  })
})
