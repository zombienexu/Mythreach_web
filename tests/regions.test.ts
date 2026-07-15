import { describe, expect, it } from 'vitest'
import { ENEMIES } from '../src/engine/content/enemies'
import { MATERIALS } from '../src/engine/content/materials'
import { QUESTS } from '../src/engine/content/quests'
import { REGIONS } from '../src/engine/content/regions'

describe('region content', () => {
  it('there are five regions in difficulty order', () => {
    expect(REGIONS).toHaveLength(5)
    expect(REGIONS.map((r) => r.id)).toEqual([
      'hollowroot',
      'duskmire',
      'stormcrag',
      'ashen-wastes',
      'sundered-spire',
    ])
    expect(REGIONS.map((r) => r.tier)).toEqual(['low', 'low', 'medium', 'medium', 'hard'])
  })

  it('each region has a non-empty encounter table', () => {
    for (const r of REGIONS) expect(r.encounters.length).toBeGreaterThanOrEqual(3)
  })

  it('every encounter references a known enemy', () => {
    for (const r of REGIONS) {
      for (const enc of [...r.encounters, ...r.eliteEncounters]) {
        for (const slot of enc.slots) {
          expect(ENEMIES[slot.enemyId], `${r.id}: ${slot.enemyId}`).toBeDefined()
        }
      }
    }
  })

  it('every region material id exists and matches the region tier', () => {
    for (const r of REGIONS) {
      expect(r.materials).toHaveLength(2)
      for (const id of r.materials) {
        const m = MATERIALS[id]
        expect(m, `${r.id}: ${id}`).toBeDefined()
        expect(m!.tier).toBe(r.tier)
      }
    }
  })

  it('no material belongs to two regions', () => {
    const all = REGIONS.flatMap((r) => r.materials)
    expect(new Set(all).size).toBe(all.length)
  })

  it('level bands are ascending, contiguous, and cover 1–15', () => {
    for (let i = 0; i < REGIONS.length; i++) {
      const r = REGIONS[i]!
      expect(r.minLevel).toBeLessThanOrEqual(r.maxLevel)
      if (i > 0) expect(r.minLevel).toBe(REGIONS[i - 1]!.maxLevel + 1)
    }
    expect(REGIONS[0]!.minLevel).toBe(1)
    expect(REGIONS[REGIONS.length - 1]!.maxLevel).toBe(15)
  })
})

describe('quest catalog', () => {
  it('has unique ids and three quests per region', () => {
    expect(new Set(QUESTS.map((q) => q.id)).size).toBe(QUESTS.length)
    for (const r of REGIONS) {
      expect(QUESTS.filter((q) => q.regionId === r.id), r.id).toHaveLength(3)
    }
  })

  it('every quest references a real region and target', () => {
    for (const q of QUESTS) {
      const region = REGIONS.find((r) => r.id === q.regionId)
      expect(region, q.id).toBeDefined()
      if (q.objective.kind === 'kill') {
        if (q.objective.enemyId !== null) {
          expect(ENEMIES[q.objective.enemyId], q.id).toBeDefined()
        }
      } else {
        // Collect quests must ask for a material that drops in their region.
        expect(MATERIALS[q.objective.materialId], q.id).toBeDefined()
        expect(region!.materials, q.id).toContain(q.objective.materialId)
      }
      expect(q.objective.count).toBeGreaterThan(0)
      expect(q.reward.xp).toBeGreaterThan(0)
      expect(q.reward.gold).toBeGreaterThan(0)
      expect(q.text.length).toBeGreaterThan(0)
    }
  })

  it('kill-specific quests hunt mobs that spawn in their region', () => {
    for (const q of QUESTS) {
      if (q.objective.kind !== 'kill' || q.objective.enemyId === null) continue
      const region = REGIONS.find((r) => r.id === q.regionId)!
      const roster = new Set(
        [...region.encounters, ...region.eliteEncounters].flatMap((e) =>
          e.slots.map((s) => s.enemyId),
        ),
      )
      expect(roster.has(q.objective.enemyId), `${q.id}: ${q.objective.enemyId}`).toBe(true)
    }
  })
})
