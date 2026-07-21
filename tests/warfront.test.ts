import { describe, expect, it } from 'vitest'
import { ENEMIES } from '../src/engine/content/enemies'
import { QUESTS } from '../src/engine/content/quests'
import { REGIONS } from '../src/engine/content/regions'
import { FRONTS } from '../src/ui/slice/content'

const NEW = ['emberwall', 'stormharrow', 'gravecall'] as const

describe('war-weaver end-game fronts', () => {
  it('adds three new hard regions with contiguous end-game bands', () => {
    const byId = Object.fromEntries(REGIONS.map((r) => [r.id, r]))
    for (const id of NEW) expect(byId[id]).toBeDefined()
    expect(byId['emberwall']!.minLevel).toBe(16)
    expect(byId['gravecall']!.maxLevel).toBe(24)
    for (const id of NEW) expect(byId[id]!.tier).toBe('hard')
  })

  it('each new region has a distinct hue (a distinctive feel)', () => {
    const hues = NEW.map((id) => REGIONS.find((r) => r.id === id)!.hue)
    expect(new Set(hues).size).toBe(3)
  })

  it('each new region fields at least three fresh enemies that exist', () => {
    for (const id of NEW) {
      const region = REGIONS.find((r) => r.id === id)!
      const roster = new Set(
        [...region.encounters, ...region.eliteEncounters].flatMap((e) => e.slots.map((s) => s.enemyId)),
      )
      expect(roster.size).toBeGreaterThanOrEqual(3)
      for (const eid of roster) expect(ENEMIES[eid], `${id}:${eid}`).toBeDefined()
    }
  })

  it('each new region offers exactly three quests', () => {
    for (const id of NEW) expect(QUESTS.filter((q) => q.regionId === id)).toHaveLength(3)
  })

  it('the new fronts are gated behind the top Grace tier and travel is wired', () => {
    for (const id of NEW) {
      const front = FRONTS.find((f) => f.regionId === id)
      expect(front, id).toBeDefined()
      expect(front!.tierIndex).toBe(6) // Pyre-Sovereign, the top of the ladder
    }
    expect(FRONTS).toHaveLength(8)
  })
})
