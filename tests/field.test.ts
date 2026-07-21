import { describe, expect, it } from 'vitest'
import { ENEMIES } from '../src/engine/content/enemies'
import { REGIONS } from '../src/engine/content/regions'
import { ZONES } from '../src/engine/content/zones'
import { mulberry32 } from '../src/engine/rng'
import type { QuestView } from '../src/engine/types'
import {
  activeQuestTargets,
  offerSpec,
  rerollBoard,
  rollBoard,
  selectOffer,
  type FieldState,
  type Offer,
} from '../src/ui/slice/field'

const NO_TARGETS = new Set<string>()

/** Every offer must spawn something real: a valid table index, or an explicit
 *  roster of known enemies. */
function specValid(state: FieldState, o: Offer): boolean {
  const region = REGIONS.find((r) => r.id === state.regionId)!
  if (o.spec.enemyIds) return o.spec.enemyIds.length > 0 && o.spec.enemyIds.every((id) => !!ENEMIES[id])
  const arr = o.spec.table === 'elite' ? region.eliteEncounters : region.encounters
  return o.spec.index !== undefined && o.spec.index >= 0 && o.spec.index < arr.length
}

describe('field board — sightings', () => {
  it('rolls 3–4 valid sightings with the first marked', () => {
    const s = rollBoard('hollowroot', mulberry32(1), 3, NO_TARGETS)
    expect(s.offers.length).toBeGreaterThanOrEqual(3)
    expect(s.offers.length).toBeLessThanOrEqual(4)
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
    expect(s.offers.length).toBeGreaterThanOrEqual(3)
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
