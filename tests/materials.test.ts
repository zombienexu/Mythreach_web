import { describe, expect, it } from 'vitest'
import { MATERIALS, MATERIAL_IDS } from '../src/engine/content/materials'

describe('material catalog', () => {
  it('every material has a unique id', () => {
    expect(MATERIAL_IDS.length).toBe(new Set(MATERIAL_IDS).size)
  })

  it('materials are well-formed', () => {
    for (const id of MATERIAL_IDS) {
      const m = MATERIALS[id]!
      expect(m.name.length).toBeGreaterThan(0)
      expect(m.value).toBeGreaterThan(0)
      expect(['low', 'medium', 'hard']).toContain(m.tier)
      expect(m.flavor.length).toBeGreaterThan(0)
    }
  })

  it('every tier has at least one material', () => {
    const tiers = new Set(MATERIAL_IDS.map((id) => MATERIALS[id]!.tier))
    expect(tiers).toEqual(new Set(['low', 'medium', 'hard']))
  })
})
