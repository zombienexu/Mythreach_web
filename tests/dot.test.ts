import { describe, expect, it } from 'vitest'
import { Dot } from '../src/engine/dot'

const DEF = { tickDamage: 4, intervalTicks: 20, tickCount: 6 }

function run(dot: Dot, ticks: number): number[] {
  const hits: number[] = []
  for (let i = 1; i <= ticks; i++) {
    const d = dot.tick()
    if (d > 0) hits.push(i)
  }
  return hits
}

describe('Dot', () => {
  it('deals 4 damage at each of 6 one-second boundaries, 24 total', () => {
    const dot = new Dot(DEF)
    dot.apply()
    let total = 0
    const hits: number[] = []
    for (let i = 1; i <= 200; i++) {
      const d = dot.tick()
      if (d > 0) {
        expect(d).toBe(4)
        total += d
        hits.push(i)
      }
    }
    expect(hits).toEqual([20, 40, 60, 80, 100, 120])
    expect(total).toBe(24)
  })

  it('expires after the sixth tick and clears', () => {
    const dot = new Dot(DEF)
    dot.apply()
    run(dot, 120)
    expect(dot.active).toBe(false)
    expect(dot.remainingTicks).toBe(0)
  })

  it('reapplying refreshes the full duration', () => {
    const dot = new Dot(DEF)
    dot.apply()
    run(dot, 30) // one damage tick fired (at 20), 10 ticks into the next interval
    dot.apply() // refresh
    expect(dot.remainingTicks).toBe(120)
    const hits = run(dot, 200)
    // relative to the refresh: boundaries at every 20 ticks, 6 of them
    expect(hits).toEqual([20, 40, 60, 80, 100, 120])
    expect(dot.active).toBe(false)
  })

  it('reports remaining ticks counting down from 120', () => {
    const dot = new Dot(DEF)
    dot.apply()
    expect(dot.remainingTicks).toBe(120)
    dot.tick()
    expect(dot.remainingTicks).toBe(119)
  })

  it('clear() removes the DoT immediately', () => {
    const dot = new Dot(DEF)
    dot.apply()
    run(dot, 25)
    dot.clear()
    expect(dot.active).toBe(false)
    expect(run(dot, 100)).toEqual([])
  })
})
