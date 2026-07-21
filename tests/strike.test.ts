import { describe, expect, it } from 'vitest'
import { STRIKE_SWING_TICKS } from '../src/engine/abilities'
import { GameSim } from '../src/engine/sim'
import { mulberry32 } from '../src/engine/rng'
import { advance, advanceToSpawn, eventsOf, makeSim, targetOf, testContent } from './helpers'

/** A punching bag that never swings back, so strike cadence reads clean. */
const bag = () => testContent({ hp: 100_000, swingTicks: 10_000 })

/** Every strike blow in a run of events. */
const blows = (ev: ReturnType<typeof advance>) =>
  eventsOf(ev, 'damage').filter((e) => e.source === 'strike')

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

  it('never swings on its own, however long you stand there', () => {
    const sim = makeSim({ content: bag() })
    advanceToSpawn(sim)
    const ev = advance(sim, STRIKE_SWING_TICKS * 5)
    expect(blows(ev)).toHaveLength(0)
    // The bar still reads, idle, prompting the Q that would loose it.
    const strike = sim.combatSnapshot().player.strike
    expect(strike).not.toBeNull()
    expect(strike!.swinging).toBe(false)
    expect(strike!.ready).toBe(true)
    expect(strike!.progress).toBe(0)
  })

  it('one press lands exactly one blow, a swing-length later', () => {
    const sim = makeSim({ content: bag() })
    advanceToSpawn(sim)
    expect(sim.strike()).toBe(true)
    expect(sim.combatSnapshot().player.strike?.swinging).toBe(true)
    // Mid wind-up: nothing has landed yet.
    expect(blows(advance(sim, STRIKE_SWING_TICKS - 1))).toHaveLength(0)
    expect(sim.combatSnapshot().player.strike?.progress ?? 0).toBeGreaterThan(0.9)
    const landing = advance(sim, 1)
    expect(blows(landing)).toHaveLength(1)
    expect(eventsOf(landing, 'strikeLanded')).toHaveLength(1)
    // And it does not swing again on its own.
    expect(blows(advance(sim, STRIKE_SWING_TICKS * 3))).toHaveLength(0)
    expect(sim.combatSnapshot().player.strike?.swinging).toBe(false)
  })

  it('is refused in idle, with the field cleared, and mid-swing', () => {
    // Idle: nothing to swing at, and no strike bar at all.
    const sim = makeSim({ content: bag() })
    expect(sim.strike()).toBe(false)
    expect(sim.combatSnapshot().player.strike).toBeNull()

    // Mid-swing: the blow already in flight owns the hands.
    advanceToSpawn(sim)
    expect(sim.strike()).toBe(true)
    advance(sim, 5)
    expect(sim.strike()).toBe(false)
    expect(sim.combatSnapshot().player.strike?.ready).toBe(false)
    // The refused press did not restart the wind-up, and only one blow lands.
    expect(blows(advance(sim, STRIKE_SWING_TICKS))).toHaveLength(1)

    // Nothing living left to hit: the swing has no home.
    const cleared = makeSim({ content: testContent({ hp: 1, swingTicks: 10_000 }) })
    advanceToSpawn(cleared)
    expect(cleared.strike()).toBe(true)
    expect(eventsOf(advance(cleared, STRIKE_SWING_TICKS), 'enemyDied')).toHaveLength(1)
    expect(cleared.strike()).toBe(false)
    expect(cleared.combatSnapshot().player.strike).toBeNull()
  })

  it('casting holds the wind-up; it completes once the hands are free', () => {
    const sim = makeSim({ content: bag() })
    advanceToSpawn(sim)
    expect(sim.strike()).toBe(true)
    advance(sim, 10)
    sim.useAbility('fireball') // 44-tick cast — the staff waits
    const during = advance(sim, 30)
    expect(blows(during)).toHaveLength(0)
    // Frozen exactly where the cast caught it.
    expect(sim.combatSnapshot().player.strike?.progress).toBeCloseTo(10 / STRIKE_SWING_TICKS, 5)
    // The held wind-up finishes shortly after the cast resolves.
    const after = advance(sim, 20 + STRIKE_SWING_TICKS)
    expect(blows(after)).toHaveLength(1)
  })

  it('scales with level, power, and the staff in hand', () => {
    const strikeOf = (sim: GameSim): number => {
      advanceToSpawn(sim)
      expect(sim.strike()).toBe(true)
      const ev = advance(sim, STRIKE_SWING_TICKS)
      return blows(ev)[0]?.amount ?? 0
    }
    // Fresh (staffed) level 1 vs a bare-handed but leveled save: both land,
    // and the leveled hero hits harder despite the empty hands.
    const lowRolls = strikeOf(new GameSim({ rng: mulberry32(7), content: bag() }))
    const high = strikeOf(makeSim({ level: 15, seed: 7, content: bag() }))
    expect(lowRolls).toBeGreaterThan(0)
    expect(high).toBeGreaterThan(lowRolls)
  })

  it('the landing blow wakes a dormant pack (pulls aggro)', () => {
    const sim = makeSim({ content: bag() })
    advanceToSpawn(sim, { engage: false })
    expect(sim.combatSnapshot().engaged).toBe(false)
    expect(sim.strike()).toBe(true)
    // The wind-up itself provokes nobody — the blow does.
    advance(sim, STRIKE_SWING_TICKS - 1)
    expect(sim.combatSnapshot().engaged).toBe(false)
    expect(blows(advance(sim, 1))).toHaveLength(1)
    expect(sim.combatSnapshot().engaged).toBe(true)
  })
})

describe('focus timing — the read on your own swing', () => {
  it('Focus deep in your own wind-up Sharpens the landing blow (+50%)', () => {
    const landing = (sharpen: boolean): number => {
      const sim = makeSim({ seed: 11, content: bag() })
      advanceToSpawn(sim)
      sim.strike()
      advance(sim, Math.ceil(STRIKE_SWING_TICKS * 0.7)) // inside the Sharpen stretch
      if (sharpen) expect(sim.focus()).toBe(true)
      const ev = advance(sim, STRIKE_SWING_TICKS)
      return blows(ev)[0]?.amount ?? 0
    }
    // Same seed, same rolls — the only difference is the Sharpen.
    expect(landing(true)).toBeGreaterThan(landing(false))
    const sim = makeSim({ seed: 11, content: bag() })
    advanceToSpawn(sim)
    sim.strike()
    advance(sim, Math.ceil(STRIKE_SWING_TICKS * 0.7))
    sim.focus()
    const used = eventsOf(advance(sim, 1), 'focusUsed')[0]
    expect(used?.mode).toBe('sharpen')
    expect(sim.combatSnapshot().player.strike?.sharpenReady).toBe(true)
  })

  it('a banked Sharpen is spent by the landing strike', () => {
    const sim = makeSim({ content: bag() })
    advanceToSpawn(sim)
    sim.strike()
    advance(sim, Math.ceil(STRIKE_SWING_TICKS * 0.7))
    sim.focus()
    const ev = advance(sim, STRIKE_SWING_TICKS)
    expect(eventsOf(ev, 'strikeLanded').some((e) => e.sharpened)).toBe(true)
    expect(sim.combatSnapshot().player.strike?.sharpenReady).toBe(false)
  })

  it('with no swing in flight there is nothing of yours to read — a whiff', () => {
    const sim = makeSim({ content: bag() })
    advanceToSpawn(sim)
    advance(sim, STRIKE_SWING_TICKS * 2) // all the time in the world, no swing
    sim.focus()
    const used = eventsOf(advance(sim, 1), 'focusUsed')[0]
    expect(used?.mode).toBe('whiff')
    expect(used?.success).toBe(false)
  })

  it('early in the wind-up there is nothing to read — a whiff', () => {
    const sim = makeSim({ content: bag() })
    advanceToSpawn(sim)
    sim.strike()
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
    sim.strike()
    advance(sim, 30) // foe past 60% of its wind-up AND you past 60% of yours
    sim.focus()
    const used = eventsOf(advance(sim, 1), 'focusUsed')[0]
    expect(used?.mode).toBe('read')
    expect(targetOf(sim)?.combatState).toBe('exposed')
    // Your own wind-up is untouched by the read — no Sharpen was banked.
    expect(sim.combatSnapshot().player.strike?.sharpenReady).toBe(false)
  })
})
