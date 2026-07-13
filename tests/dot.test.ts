import { describe, expect, it } from 'vitest'
import { Dot } from '../src/engine/dot'

describe('Dot', () => {
  it('is active on creation and deals damage on exact interval boundaries', () => {
    const dot = new Dot('Burn', 4, 20, 6)
    expect(dot.active).toBe(true)
    let total = 0
    const hits: number[] = []
    for (let t = 1; t <= 140; t++) {
      const due = dot.tick()
      if (due > 0) {
        hits.push(t)
        total += due
      }
    }
    expect(hits).toEqual([20, 40, 60, 80, 100, 120])
    expect(total).toBe(24)
    expect(dot.active).toBe(false)
  })

  it('reports remaining ticks that count down to zero', () => {
    const dot = new Dot('Burn', 4, 20, 6)
    expect(dot.remainingTicks).toBe(120)
    dot.tick()
    expect(dot.remainingTicks).toBe(119)
    for (let i = 0; i < 119; i++) dot.tick()
    expect(dot.remainingTicks).toBe(0)
  })

  it('deals no damage once spent', () => {
    const dot = new Dot('Burn', 4, 20, 1)
    for (let i = 0; i < 19; i++) expect(dot.tick()).toBe(0)
    expect(dot.tick()).toBe(4)
    for (let i = 0; i < 40; i++) expect(dot.tick()).toBe(0)
  })

  it('uses the tick damage it was constructed with', () => {
    const dot = new Dot('Venom', 7, 10, 3)
    let total = 0
    for (let i = 0; i < 30; i++) total += dot.tick()
    expect(total).toBe(21)
  })
})
