import { describe, expect, it } from 'vitest'
import { generateItem, rollRarity, sellValue, statBudget } from '../src/engine/content/items'
import { mulberry32 } from '../src/engine/rng'
import type { Item, StatId } from '../src/engine/types'
import { INVENTORY_CAP } from '../src/engine/types'
import { advance, eventsOf, makeSim, testContent } from './helpers'

const STAT_COST: Record<StatId, number> = { power: 1, stamina: 1, spirit: 1, crit: 2 }

function spent(item: Item): number {
  return Object.entries(item.stats).reduce((s, [stat, v]) => s + v * STAT_COST[stat as StatId], 0)
}

describe('generateItem', () => {
  it('is deterministic for a seed', () => {
    const a = generateItem(mulberry32(7), 1, 5)
    const b = generateItem(mulberry32(7), 1, 5)
    expect(a).toEqual(b)
  })

  it('spends the stat budget (within one point of overshoot)', () => {
    const rng = mulberry32(11)
    for (let i = 0; i < 200; i++) {
      const item = generateItem(rng, i, 1 + (i % 15))
      const budget = statBudget(item.ilvl, item.rarity)
      expect(spent(item)).toBeGreaterThanOrEqual(budget)
      expect(spent(item)).toBeLessThanOrEqual(budget + 1)
    }
  })

  it('staves always carry power', () => {
    const rng = mulberry32(3)
    for (let i = 0; i < 50; i++) {
      const item = generateItem(rng, i, 8, { slot: 'staff' })
      expect(item.stats.power ?? 0).toBeGreaterThanOrEqual(1)
    }
  })

  it('respects a rarity floor', () => {
    const rng = mulberry32(5)
    for (let i = 0; i < 200; i++) {
      const rarity = rollRarity(rng, 'rare')
      expect(['rare', 'epic']).toContain(rarity)
    }
  })

  it('epics carry a bigger budget than commons at the same ilvl', () => {
    expect(statBudget(10, 'epic')).toBeGreaterThan(statBudget(10, 'common'))
    expect(sellValue({ uid: 1, name: '', slot: 'ring', ilvl: 10, rarity: 'epic', stats: {} })).toBeGreaterThan(
      sellValue({ uid: 2, name: '', slot: 'ring', ilvl: 10, rarity: 'common', stats: {} }),
    )
  })
})

describe('equip and sell', () => {
  const staff: Item = {
    uid: 50,
    name: 'Staff of Tests',
    slot: 'staff',
    ilvl: 5,
    rarity: 'rare',
    stats: { power: 8, stamina: 4 },
  }
  const betterStaff: Item = { ...staff, uid: 51, name: 'Better Staff', stats: { power: 12 } }

  it('equipping applies stats immediately and swaps the old piece back to the bags', () => {
    const sim = makeSim({ level: 3, save: { inventory: [staff, betterStaff], nextUid: 100 } })
    const base = sim.progressSnapshot().stats
    expect(sim.equipItem(50)).toBe(true)
    let snap = sim.progressSnapshot()
    expect(snap.stats.power).toBe(base.power + 8)
    expect(snap.stats.maxHp).toBe(base.maxHp + 20) // 4 stamina × 5
    expect(snap.equipped.staff?.uid).toBe(50)
    expect(snap.inventory.map((i) => i.uid)).toEqual([51])
    expect(sim.equipItem(51)).toBe(true)
    snap = sim.progressSnapshot()
    expect(snap.equipped.staff?.uid).toBe(51)
    expect(snap.inventory.map((i) => i.uid)).toEqual([50])
  })

  it('selling removes the item and pays its value', () => {
    const sim = makeSim({ level: 3, save: { inventory: [staff], nextUid: 100 } })
    const value = sellValue(staff)
    expect(sim.sellItem(50)).toBe(true)
    const snap = sim.progressSnapshot()
    expect(snap.gold).toBe(value)
    expect(snap.inventory).toHaveLength(0)
    expect(sim.sellItem(50)).toBe(false)
  })

  it('drops auto-sell when the bags are full', () => {
    const bagFiller: Item[] = Array.from({ length: INVENTORY_CAP }, (_, i) => ({
      uid: 200 + i,
      name: `Filler ${i}`,
      slot: 'ring',
      ilvl: 1,
      rarity: 'common',
      stats: { power: 1 },
    }))
    const sim = makeSim({
      save: { inventory: bagFiller, nextUid: 500 },
      content: testContent({ hp: 1, dropPct: 100 }),
    })
    sim.autoBattle = true
    const events = advance(sim, 200)
    const drops = eventsOf(events, 'lootDropped')
    expect(drops.length).toBeGreaterThanOrEqual(1)
    expect(drops[0]!.autoSold).toBe(true)
    expect(sim.progressSnapshot().inventory).toHaveLength(INVENTORY_CAP)
    expect(sim.progressSnapshot().gold).toBeGreaterThan(0)
  })

  it('kills can drop loot into the bags', () => {
    const sim = makeSim({ content: testContent({ hp: 1, dropPct: 100 }) })
    sim.autoBattle = true
    const events = advance(sim, 200)
    const drops = eventsOf(events, 'lootDropped')
    expect(drops.length).toBeGreaterThanOrEqual(1)
    expect(drops[0]!.autoSold).toBe(false)
    expect(sim.progressSnapshot().inventory.length).toBeGreaterThanOrEqual(1)
    expect(drops[0]!.item.ilvl).toBe(1) // dummy is level 1
  })
})
