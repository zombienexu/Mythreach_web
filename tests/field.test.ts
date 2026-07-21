import { describe, expect, it } from 'vitest'
import { ENEMIES } from '../src/engine/content/enemies'
import { REGIONS } from '../src/engine/content/regions'
import { ZONES } from '../src/engine/content/zones'
import { mulberry32 } from '../src/engine/rng'
import type { QuestView } from '../src/engine/types'
import {
  activeQuestTargets,
  AGGRO_RADIUS,
  clusterOf,
  clusterSpec,
  MAX_CLUSTER_MOBS,
  offerSpec,
  rerollBoard,
  rollBoard,
  selectOffer,
  type FieldState,
  type Offer,
} from '../src/ui/slice/field'

const NO_TARGETS = new Set<string>()

const gap = (a: Offer, b: Offer): number => Math.hypot(a.x - b.x, a.y - b.y)

/** Hand-place a screen's sightings so the aggro rules can be tested exactly. */
function at(state: FieldState, spots: Array<[number, number]>): FieldState {
  return {
    ...state,
    offers: state.offers.map((o, i) => ({ ...o, x: spots[i]![0], y: spots[i]![1] })),
  }
}

/** Every offer must spawn something real: a valid table index, or an explicit
 *  roster of known enemies. */
function specValid(state: FieldState, o: Offer): boolean {
  const region = REGIONS.find((r) => r.id === state.regionId)!
  if (o.spec.enemyIds) return o.spec.enemyIds.length > 0 && o.spec.enemyIds.every((id) => !!ENEMIES[id])
  const arr = o.spec.table === 'elite' ? region.eliteEncounters : region.encounters
  return o.spec.index !== undefined && o.spec.index >= 0 && o.spec.index < arr.length
}

describe('field board — sightings', () => {
  it('rolls 4–6 valid sightings with the first marked', () => {
    const s = rollBoard('hollowroot', mulberry32(1), 3, NO_TARGETS)
    expect(s.offers.length).toBeGreaterThanOrEqual(4)
    expect(s.offers.length).toBeLessThanOrEqual(6)
    expect(s.selectedId).toBe(s.offers[0]!.id)
    expect(s.offers.every((o) => specValid(s, o))).toBe(true)
  })

  it('computes group stats from the roster (xp = sum, level = max)', () => {
    const s = rollBoard('duskmire', mulberry32(2), 5, NO_TARGETS)
    for (const o of s.offers) {
      const defs = o.roster.map((id) => ENEMIES[id]!)
      expect(o.xp).toBe(defs.reduce((a, d) => a + d.xp, 0))
      expect(o.level).toBe(Math.max(...defs.map((d) => d.level)))
      expect(o.size).toBe(o.roster.length)
    }
  })

  it('every sighting carries per-mob rows and a stable formation', () => {
    const s = rollBoard('duskmire', mulberry32(21), 5, NO_TARGETS)
    for (const o of s.offers) {
      expect(o.rows).toHaveLength(o.roster.length)
      expect(Number.isInteger(o.formation)).toBe(true)
      expect(o.formation).toBeGreaterThanOrEqual(0)
      expect(o.formation).toBeLessThanOrEqual(3)
    }
  })

  it('an apex sighting is the front’s boss, spawned as an explicit solo roster', () => {
    // scan seeds until an apex surfaces, then check it is the zone boss
    const boss = ZONES.find((z) => z.id === 'sundered-spire')!.bossId
    let apex: Offer | undefined
    for (let seed = 1; seed <= 400 && !apex; seed++) {
      const s = rollBoard('sundered-spire', mulberry32(seed), 15, NO_TARGETS)
      apex = s.offers.find((o) => o.rarity === 'apex')
    }
    expect(apex).toBeDefined()
    expect(apex!.spec.enemyIds).toEqual([boss])
    expect(apex!.roster).toEqual([boss])
    expect(ENEMIES[boss]!.rank).toBe('boss')
  })

  it('rarity is weighted: common is far more frequent than apex, all tiers appear', () => {
    const tally: Record<string, number> = { common: 0, uncommon: 0, rare: 0, apex: 0 }
    for (let seed = 1; seed <= 300; seed++) {
      for (const o of rollBoard('stormcrag', mulberry32(seed), 8, NO_TARGETS).offers) tally[o.rarity]!++
    }
    expect(tally.common).toBeGreaterThan(tally.rare!)
    expect(tally.rare).toBeGreaterThan(tally.apex!)
    for (const k of ['common', 'uncommon', 'rare', 'apex']) expect(tally[k]).toBeGreaterThan(0)
  })

  it('a rotation rerolls the board, advances ids, and counts up', () => {
    let s = rollBoard('hollowroot', mulberry32(9), 3, NO_TARGETS)
    const firstIds = s.offers.map((o) => o.id)
    s = rerollBoard(s, mulberry32(10), 3, NO_TARGETS)
    expect(s.rerolls).toBe(1)
    expect(s.offers.length).toBeGreaterThanOrEqual(4)
    // fresh ids — none reused from the previous board
    expect(s.offers.every((o) => !firstIds.includes(o.id))).toBe(true)
    expect(s.offers.every((o) => specValid(s, o))).toBe(true)
  })

  it('marks a sighting that holds an active hunt Order’s quarry', () => {
    const quests = [{ id: 'q-ember-sappers', state: 'active' }] as unknown as QuestView[]
    const targets = activeQuestTargets(quests)
    expect(targets.has('molten-sapper')).toBe(true)
    let marked = false
    for (let seed = 1; seed <= 60 && !marked; seed++) {
      const s = rollBoard('emberwall', mulberry32(seed), 18, targets)
      marked = s.offers.some((o) => o.hasQuestTarget && o.roster.includes('molten-sapper'))
    }
    expect(marked).toBe(true)
  })

  it('quest targets ignore "any foe" and non-active Orders', () => {
    const quests = [
      { id: 'q-hollow-cull', state: 'active' }, // enemyId null
      { id: 'q-ember-sappers', state: 'available' },
    ] as unknown as QuestView[]
    expect(activeQuestTargets(quests).size).toBe(0)
  })

  it('selectOffer marks a real offer and ignores unknown ids', () => {
    const s = rollBoard('hollowroot', mulberry32(4), 3, NO_TARGETS)
    const id = s.offers[s.offers.length - 1]!.id
    expect(selectOffer(s, id).selectedId).toBe(id)
    expect(selectOffer(s, -1).selectedId).toBe(s.selectedId)
    expect(offerSpec(s.offers[0]!)).toBe(s.offers[0]!.spec)
  })
})

describe('the scattered field — placement', () => {
  it('stands every sighting on the ground, inside the playable margins', () => {
    for (let seed = 1; seed <= 40; seed++) {
      for (const o of rollBoard('duskmire', mulberry32(seed), 6, NO_TARGETS).offers) {
        expect(o.x).toBeGreaterThanOrEqual(0.06)
        expect(o.x).toBeLessThanOrEqual(0.94)
        expect(o.y).toBeGreaterThanOrEqual(0.12)
        expect(o.y).toBeLessThanOrEqual(0.88)
      }
    }
  })

  it('placement is deterministic per seed and moves with the seed', () => {
    const a = rollBoard('hollowroot', mulberry32(77), 4, NO_TARGETS)
    const b = rollBoard('hollowroot', mulberry32(77), 4, NO_TARGETS)
    expect(b.offers.map((o) => [o.x, o.y])).toEqual(a.offers.map((o) => [o.x, o.y]))
    const c = rollBoard('hollowroot', mulberry32(78), 4, NO_TARGETS)
    expect(c.offers.map((o) => [o.x, o.y])).not.toEqual(a.offers.map((o) => [o.x, o.y]))
  })

  it('scatters groups well apart, but huddles a pair on a decent minority of screens', () => {
    let pairs = 0
    let closePairs = 0
    let screens = 0
    let huddled = 0
    for (let seed = 1; seed <= 250; seed++) {
      for (const region of ['hollowroot', 'duskmire', 'stormcrag']) {
        const s = rollBoard(region, mulberry32(seed), 10, NO_TARGETS)
        screens++
        let close = false
        for (let i = 0; i < s.offers.length; i++) {
          for (let j = i + 1; j < s.offers.length; j++) {
            pairs++
            if (gap(s.offers[i]!, s.offers[j]!) <= AGGRO_RADIUS) {
              closePairs++
              close = true
            }
          }
        }
        if (close) huddled++
      }
    }
    // the overwhelming majority of pairs are their own fight…
    expect(closePairs / pairs).toBeLessThan(0.1)
    // …yet a decent minority of screens hands you a double-pull to think about
    expect(huddled / screens).toBeGreaterThan(0.15)
    expect(huddled / screens).toBeLessThan(0.65)
  })

  it('never huddles the apex — a world-boss keeps its ground', () => {
    let apexScreens = 0
    for (let seed = 1; seed <= 300; seed++) {
      const s = rollBoard('sundered-spire', mulberry32(seed), 15, NO_TARGETS)
      const apex = s.offers.find((o) => o.rarity === 'apex')
      if (!apex) continue
      apexScreens++
      expect(clusterOf(s, apex.id)).toHaveLength(1)
    }
    expect(apexScreens).toBeGreaterThan(0)
  })
})

describe('the scattered field — aggro pulls', () => {
  const board = (): FieldState => rollBoard('hollowroot', mulberry32(5), 4, NO_TARGETS)

  it('pulls in neighbours inside the aggro radius, engaged group first', () => {
    // C sits just off B, B just off A — a chain that must NOT propagate
    const s = at(board(), [
      [0.1, 0.5],
      [0.1 + AGGRO_RADIUS * 0.8, 0.5],
      [0.1 + AGGRO_RADIUS * 1.6, 0.5],
      [0.9, 0.85],
      [0.9, 0.15],
      [0.5, 0.5],
    ])
    const [a, b, c] = s.offers
    const cluster = clusterOf(s, b!.id)
    expect(cluster[0]).toBe(b)
    expect(cluster.map((o) => o.id)).toEqual([b!.id, a!.id, c!.id])
    // A pulls B (in radius) but not C (a neighbour's neighbour is not pulled)
    expect(clusterOf(s, a!.id).map((o) => o.id)).toEqual([a!.id, b!.id])
    // and the far groups stand alone
    expect(clusterOf(s, s.offers[3]!.id).map((o) => o.id)).toEqual([s.offers[3]!.id])
  })

  it('returns nothing for an unknown sighting', () => {
    const s = board()
    expect(clusterOf(s, -1)).toEqual([])
    expect(clusterSpec(s, -1).enemyIds).toEqual([])
  })

  it('merges the cluster’s rosters, in cluster order, as real enemies', () => {
    const s = at(board(), [
      [0.2, 0.5],
      [0.2 + AGGRO_RADIUS * 0.5, 0.55],
      [0.85, 0.2],
      [0.85, 0.8],
      [0.5, 0.2],
      [0.5, 0.8],
    ])
    const [a, b] = s.offers
    const ids = clusterSpec(s, a!.id).enemyIds!
    expect(ids).toEqual([...a!.roster, ...b!.roster].slice(0, MAX_CLUSTER_MOBS))
    expect(ids.every((id) => !!ENEMIES[id])).toBe(true)
    // engaging the other end of the pair leads with *its* roster
    expect(clusterSpec(s, b!.id).enemyIds![0]).toBe(b!.roster[0])
  })

  it('caps a freak cluster so it is a fight and not a wall', () => {
    // shove the whole screen into one spot — on a screen that really is a wall
    let s0 = board()
    for (let seed = 1; seed <= 60 && s0.offers.flatMap((o) => o.roster).length <= MAX_CLUSTER_MOBS; seed++) {
      s0 = rollBoard('duskmire', mulberry32(seed), 6, NO_TARGETS)
    }
    const s = at(
      s0,
      s0.offers.map(() => [0.5, 0.5] as [number, number]),
    )
    const ids = clusterSpec(s, s.offers[0]!.id).enemyIds!
    const whole = s.offers.flatMap((o) => o.roster)
    expect(whole.length).toBeGreaterThan(MAX_CLUSTER_MOBS)
    expect(ids).toHaveLength(MAX_CLUSTER_MOBS)
    expect(ids).toEqual(whole.slice(0, MAX_CLUSTER_MOBS))
  })

  it('an engaged apex still spawns as the front’s boss', () => {
    const boss = ZONES.find((z) => z.id === 'sundered-spire')!.bossId
    let found = false
    for (let seed = 1; seed <= 400 && !found; seed++) {
      const s = rollBoard('sundered-spire', mulberry32(seed), 15, NO_TARGETS)
      const apex = s.offers.find((o) => o.rarity === 'apex')
      if (!apex) continue
      found = true
      expect(clusterSpec(s, apex.id).enemyIds).toEqual([boss])
    }
    expect(found).toBe(true)
  })
})
