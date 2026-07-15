import { describe, expect, it } from 'vitest'
import { ENEMIES } from '../src/engine/content/enemies'
import { MATERIALS } from '../src/engine/content/materials'
import { REGIONS } from '../src/engine/content/regions'

describe('region content', () => {
  it('there are exactly three regions, one per tier', () => {
    expect(REGIONS).toHaveLength(3)
    expect(REGIONS.map((r) => r.tier)).toEqual(['low', 'medium', 'hard'])
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
      expect(r.materials.length).toBeGreaterThan(0)
      for (const id of r.materials) {
        const m = MATERIALS[id]
        expect(m, `${r.id}: ${id}`).toBeDefined()
        expect(m!.tier).toBe(r.tier)
      }
    }
  })

  it('level bands are ascending and non-overlapping', () => {
    for (let i = 0; i < REGIONS.length; i++) {
      const r = REGIONS[i]!
      expect(r.minLevel).toBeLessThanOrEqual(r.maxLevel)
      if (i > 0) expect(r.minLevel).toBe(REGIONS[i - 1]!.maxLevel + 1)
    }
    expect(REGIONS[0]!.minLevel).toBe(1)
  })
})
