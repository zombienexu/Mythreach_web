import { describe, expect, it } from 'vitest'
import { mulberry32, rollInt } from '../src/engine/rng'

describe('mulberry32', () => {
  it('is deterministic for a given seed', () => {
    const a = mulberry32(42)
    const b = mulberry32(42)
    for (let i = 0; i < 100; i++) expect(a()).toBe(b())
  })

  it('yields floats in [0, 1)', () => {
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
    const rng = mulberry32(1)
    const seen = new Set<number>()
    for (let i = 0; i < 2000; i++) {
      const v = rollInt(rng, 5, 9)
      expect(v).toBeGreaterThanOrEqual(5)
      expect(v).toBeLessThanOrEqual(9)
      seen.add(v)
    }
    expect(seen).toEqual(new Set([5, 6, 7, 8, 9]))
  })

  it('collapses to a constant when min === max', () => {
    const rng = mulberry32(3)
    for (let i = 0; i < 50; i++) expect(rollInt(rng, 8, 8)).toBe(8)
  })
})
