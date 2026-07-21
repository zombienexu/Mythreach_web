import { describe, expect, it } from 'vitest'
import { STRIKE_SWING_TICKS } from '../src/engine/abilities'
import { GameSim } from '../src/engine/sim'
import { mulberry32 } from '../src/engine/rng'
import { advance, advanceToSpawn, eventsOf, makeSim, targetOf, testContent } from './helpers'

/** A punching bag that never swings back, so strike cadence reads clean. */
const bag = () => testContent({ hp: 100_000, swingTicks: 10_000 })

describe('the strike — the staff\'s basic attack', () => {
  it('a fresh hero is issued a Wooden Training Staff', () => {
    const sim = new GameSim({ rng: mulberry32(1) })
    const staff = sim.progressSnapshot().equipped.staff
    expect(staff).toBeDefined()
    expect(staff!.name).toBe('Wooden Training Staff')
    expect(staff!.ilvl).toBe(1)
    // Stat-less by design: it feeds the strike formula, not the stat block.
    expect(Object.keys(staff!.stats)).toHaveLength(0)
  })

  it('auto-swings at the target on its own clock', () => {
    const sim = makeSim({ content: bag() })
    advanceToSpawn(sim)
    const ev = advance(sim, STRIKE_SWING_TICKS * 2 + 2)
    const hits = eventsOf(ev, 'damage').filter((e) => e.source === 'strike')
    expect(hits.length).toBe(2)
    expect(eventsOf(ev, 'strikeLanded')).toHaveLength(2)
  })

  it('never swings in idle, and stops when the pack is down', () => {
    const sim = makeSim({ content: bag() })
    // Idle: no target, no strikes.
    const idle = advance(sim, STRIKE_SWING_TICKS * 2)
    expect(eventsOf(idle, 'damage').some((e) => e.source === 'strike')).toBe(false)
    expect(sim.combatSnapshot().player.strike).toBeNull()
  })

  it('casting holds the wind-up; it resumes after the cast resolves', () => {
    const sim = makeSim({ content: bag() })
    advanceToSpawn(sim)
    advance(sim, 10)
    sim.useAbility('fireball') // 44-tick cast — the staff waits
    const during = advance(sim, 44)
    expect(eventsOf(during, 'damage').some((e) => e.source === 'strike')).toBe(false)
    // The held wind-up completes shortly after the hands are free again.
    const after = advance(sim, STRIKE_SWING_TICKS)
    expect(eventsOf(after, 'damage').some((e) => e.source === 'strike')).toBe(true)
  })

  it('scales with level, power, and the staff in hand', () => {
    const strikeOf = (sim: GameSim): number => {
      advanceToSpawn(sim)
      const ev = advance(sim, STRIKE_SWING_TICKS + 2)
      return eventsOf(ev, 'damage').find((e) => e.source === 'strike')?.amount ?? 0
    }
    // Fresh (staffed) level 1 vs a bare-handed but leveled save: both land,
    // and the leveled hero hits harder despite the empty hands.
    const lowRolls = strikeOf(new GameSim({ rng: mulberry32(7), content: bag() }))
    const high = strikeOf(makeSim({ level: 15, seed: 7, content: bag() }))
    expect(lowRolls).toBeGreaterThan(0)
    expect(high).toBeGreaterThan(lowRolls)
  })

  it('holds poised against a dormant pack until the field is provoked', () => {
    const sim = makeSim({ content: bag() })
    advanceToSpawn(sim, { engage: false })
    const held = advance(sim, STRIKE_SWING_TICKS * 3)
    expect(eventsOf(held, 'damage').some((e) => e.source === 'strike')).toBe(false)
    // Poised at the top of the wind-up, ready to be loosed.
    expect(sim.combatSnapshot().player.strike?.progress ?? 0).toBeGreaterThan(0.9)
    sim.provoke()
    const loosed = advance(sim, 3)
    expect(eventsOf(loosed, 'damage').some((e) => e.source === 'strike')).toBe(true)
  })

  it('the loosed first strike wakes the field (pulls aggro)', () => {
    const sim = makeSim({ content: bag() })
    advanceToSpawn(sim, { engage: true })
    advance(sim, STRIKE_SWING_TICKS + 2)
    expect(sim.combatSnapshot().engaged).toBe(true)
  })
})

describe('focus timing — the read on your own swing', () => {
  it('Focus deep in your own wind-up Sharpens the landing blow (+50%)', () => {
    const landing = (sharpen: boolean): number => {
      const sim = makeSim({ seed: 11, content: bag() })
      advanceToSpawn(sim)
      advance(sim, Math.ceil(STRIKE_SWING_TICKS * 0.7)) // inside the Sharpen stretch
      if (sharpen) expect(sim.focus()).toBe(true)
      const ev = advance(sim, STRIKE_SWING_TICKS)
      return eventsOf(ev, 'damage').find((e) => e.source === 'strike')?.amount ?? 0
    }
    // Same seed, same rolls — the only difference is the Sharpen.
    expect(landing(true)).toBeGreaterThan(landing(false))
    const sim = makeSim({ seed: 11, content: bag() })
    advanceToSpawn(sim)
    advance(sim, Math.ceil(STRIKE_SWING_TICKS * 0.7))
    sim.focus()
    const ev = advance(sim, 1)
    const used = eventsOf(ev, 'focusUsed')[0]
    expect(used?.mode).toBe('sharpen')
    expect(sim.combatSnapshot().player.strike?.sharpenReady).toBe(true)
  })

  it('a banked Sharpen is spent by the landing strike', () => {
    const sim = makeSim({ content: bag() })
    advanceToSpawn(sim)
    advance(sim, Math.ceil(STRIKE_SWING_TICKS * 0.7))
    sim.focus()
    const ev = advance(sim, STRIKE_SWING_TICKS)
    expect(eventsOf(ev, 'strikeLanded').some((e) => e.sharpened)).toBe(true)
    expect(sim.combatSnapshot().player.strike?.sharpenReady).toBe(false)
  })

  it('early in the wind-up there is nothing to read — a whiff', () => {
    const sim = makeSim({ content: bag() })
    advanceToSpawn(sim)
    advance(sim, 4) // barely wound
    sim.focus()
    const used = eventsOf(advance(sim, 1), 'focusUsed')[0]
    expect(used?.mode).toBe('whiff')
    expect(used?.success).toBe(false)
  })

  it('a foe\'s open tell outranks your own swing', () => {
    // A fast swinger: its tell and your Sharpen stretch overlap — the read wins.
    const sim = makeSim({ content: testContent({ hp: 100_000, swingTicks: 40, dmgMin: 0, dmgMax: 0 }) })
    advanceToSpawn(sim)
    advance(sim, 30) // foe past 60% of its wind-up AND you past 60% of yours
    sim.focus()
    const used = eventsOf(advance(sim, 1), 'focusUsed')[0]
    expect(used?.mode).toBe('read')
    expect(targetOf(sim)?.combatState).toBe('exposed')
  })
})
