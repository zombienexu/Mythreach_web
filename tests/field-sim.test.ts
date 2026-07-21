import { describe, expect, it } from 'vitest'
import { mulberry32 } from '../src/engine/rng'
import { GameSim } from '../src/engine/sim'

function freshSim(seed = 1): GameSim {
  return new GameSim({ rng: mulberry32(seed) })
}

describe('startFight(spec) — the field-board seam', () => {
  it('spawns a chosen normal encounter by index', () => {
    const sim = freshSim()
    // hollowroot encounters[0] = solo('cave-golem')
    expect(sim.startFight({ table: 'normal', index: 0 })).toBe(true)
    const foes = sim.combatSnapshot().enemies
    expect(foes).toHaveLength(1)
    expect(foes[0]!.name).toBe('Cave Golem')
  })

  it('spawns from the elite table when asked', () => {
    const sim = freshSim(2)
    // hollowroot eliteEncounters[0] = solo('rockmaw-bruiser') [elite]
    expect(sim.startFight({ table: 'elite', index: 0 })).toBe(true)
    expect(sim.combatSnapshot().enemies.some((e) => e.rank === 'elite')).toBe(true)
  })

  it('spawns an explicit roster (an apex world-boss solo)', () => {
    const sim = freshSim(3)
    expect(sim.startFight({ enemyIds: ['grubthar'] })).toBe(true)
    const foes = sim.combatSnapshot().enemies
    expect(foes).toHaveLength(1)
    expect(foes[0]!.rank).toBe('boss')
    expect(foes[0]!.name).toBe('Grubthar, the Cave King')
  })

  it('an explicit roster spawns exactly the ids given, in order', () => {
    const sim = freshSim(6)
    expect(sim.startFight({ enemyIds: ['cave-golem', 'mossback-boar'] })).toBe(true)
    const foes = sim.combatSnapshot().enemies
    expect(foes.map((e) => e.name)).toEqual(['Cave Golem', 'Mossback Boar'])
  })

  it('an out-of-range index falls back to a random roll rather than wedging', () => {
    const sim = freshSim(4)
    expect(sim.startFight({ table: 'normal', index: 999 })).toBe(true)
    expect(sim.combatSnapshot().enemies.length).toBeGreaterThanOrEqual(1)
  })

  it('a bare call still rolls a random encounter (unchanged behaviour)', () => {
    const sim = freshSim(5)
    expect(sim.startFight()).toBe(true)
    expect(sim.combatSnapshot().enemies.length).toBeGreaterThanOrEqual(1)
  })
})
