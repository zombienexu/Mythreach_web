import { describe, expect, it } from 'vitest'
import { STRIKE_SWING_TICKS } from '../src/engine/abilities'
import { GameSim } from '../src/engine/sim'
import { mulberry32 } from '../src/engine/rng'
import { advance, advanceToSpawn, eventsOf, makeSim, testContent } from './helpers'

/** A punching bag that never swings back, so strike cadence reads clean. */
const bag = () => testContent({ hp: 100_000, swingTicks: 10_000 })

/** Every strike blow in a run of events. */
const blows = (ev: ReturnType<typeof advance>) =>
  eventsOf(ev, 'damage').filter((e) => e.source === 'strike')

describe('the strike — the staff\'s basic attack', () => {
  it('a fresh hero is issued a Grey Wood Staff', () => {
    const sim = new GameSim({ rng: mulberry32(1) })
    const staff = sim.progressSnapshot().equipped.staff
    expect(staff).toBeDefined()
    expect(staff!.name).toBe('Grey Wood Staff')
    expect(staff!.ilvl).toBe(1)
    expect(staff!.rarity).toBe('common')
    // A training issue: real stats, deliberately under the drop tables, so the
    // first staff that actually drops is a felt upgrade.
    expect(staff!.stats).toEqual({ power: 2, stamina: 2 })
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

describe('the staff is wood', () => {
  it('a staff blow feeds no fire, even landed inside an open Stoke', () => {
    const sim = makeSim({ content: bag() })
    advanceToSpawn(sim)
    sim.strike()
    advance(sim, STRIKE_SWING_TICKS - 2)
    expect(sim.stoke()).toBe(true)
    // The blow lands inside the flue — and the flue does not care about wood.
    expect(blows(advance(sim, 3))).toHaveLength(1)
    expect(sim.combatSnapshot().player.heat).toBe(0)
  })
})
