import { describe, expect, it } from 'vitest'
import { mulberry32 } from '../src/engine/rng'
import { GameSim } from '../src/engine/sim'
import {
  AGGRO_RADIUS,
  MAX_CLUSTER_MOBS,
  clusterRosterOf,
  clusterSpec,
  rollBoard,
  selectMob,
  type FieldState,
} from '../src/ui/slice/field'

function freshSim(seed = 1): GameSim {
  return new GameSim({ rng: mulberry32(seed) })
}

const NO_TARGETS = new Set<string>()

/** Hand-place a screen's sightings so the pull is exact. */
function at(state: FieldState, spots: Array<[number, number]>): FieldState {
  return {
    ...state,
    offers: state.offers.map((o, i) => ({ ...o, x: spots[i]![0], y: spots[i]![1] })),
  }
}

/** The arena seat the marked mob lands in — the one piece of arithmetic the
 *  "attack to open the fight" path depends on (see Game.engageMarkedMob). */
function seatOf(state: FieldState): number {
  const roster = clusterRosterOf(state, state.selectedId!)
  return Math.min(state.selectedIndex, roster.length - 1)
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

describe('the marked mob keeps its seat in the spawned pack', () => {
  /** A screen whose first sighting holds more than one body. */
  function packBoard(): FieldState {
    for (let seed = 1; seed <= 200; seed++) {
      const s = rollBoard('duskmire', mulberry32(seed), 6, NO_TARGETS)
      if (s.offers[0]!.roster.length > 1) return s
    }
    throw new Error('no multi-mob sighting found')
  }

  it('marking the nth body of a lone group targets the nth spawned enemy', () => {
    // stand every sighting apart, so the engaged group spawns alone
    const board = packBoard()
    const s0 = at(
      board,
      board.offers.map((_, i) => [0.1 + i * 0.16, i % 2 === 0 ? 0.15 : 0.85] as [number, number]),
    )
    const lead = s0.offers[0]!
    for (let k = 0; k < lead.roster.length; k++) {
      const s = selectMob(s0, lead.id, k)
      const sim = freshSim(11)
      expect(sim.startFight(clusterSpec(s, lead.id))).toBe(true)
      const foes = sim.combatSnapshot().enemies
      expect(foes).toHaveLength(lead.roster.length)
      const seat = seatOf(s)
      expect(seat).toBe(k)
      expect(sim.combatSnapshot().enemies[seat]!.defId).toBe(lead.roster[k])
    }
  })

  it('a dragged-in neighbour lands *behind* the engaged group, so the seat holds', () => {
    const board = packBoard()
    const s0 = at(board, [
      [0.3, 0.5],
      [0.3 + AGGRO_RADIUS * 0.6, 0.5],
      [0.9, 0.15],
      [0.9, 0.85],
      [0.6, 0.15],
      [0.6, 0.85],
    ])
    const [a, b] = s0.offers
    const k = a!.roster.length - 1
    const s = selectMob(s0, a!.id, k)
    const sim = freshSim(12)
    expect(sim.startFight(clusterSpec(s, a!.id))).toBe(true)
    const foes = sim.combatSnapshot().enemies
    // the neighbour really did come along…
    expect(foes.length).toBeGreaterThan(a!.roster.length)
    expect(foes.length).toBe(Math.min(a!.roster.length + b!.roster.length, MAX_CLUSTER_MOBS))
    // …and the marked body still sits at its own roster index
    expect(seatOf(s)).toBe(k)
    expect(foes[seatOf(s)]!.defId).toBe(a!.roster[k])
  })

  it('a cluster cut at MAX_CLUSTER_MOBS clamps the seat onto a body that spawned', () => {
    // shove a whole wide screen into one spot so the merge overflows the cap
    let s0 = rollBoard('duskmire', mulberry32(1), 6, NO_TARGETS)
    for (let seed = 1; seed <= 80 && s0.offers.flatMap((o) => o.roster).length <= MAX_CLUSTER_MOBS; seed++) {
      s0 = rollBoard('duskmire', mulberry32(seed), 6, NO_TARGETS)
    }
    const packed = at(
      s0,
      s0.offers.map(() => [0.5, 0.5] as [number, number]),
    )
    // mark a body in the *last* group — everything ahead of it fills the cap
    const tail = packed.offers[packed.offers.length - 1]!
    const s = selectMob(packed, tail.id, tail.roster.length - 1)
    const sim = freshSim(13)
    expect(sim.startFight(clusterSpec(s, tail.id))).toBe(true)
    const foes = sim.combatSnapshot().enemies
    expect(foes).toHaveLength(MAX_CLUSTER_MOBS)
    const seat = seatOf(s)
    expect(seat).toBeGreaterThanOrEqual(0)
    expect(seat).toBeLessThan(foes.length)
    // the engaged group leads the merge, so its own body is still where it was
    expect(foes[seat]!.defId).toBe(tail.roster[seat])
  })
})
