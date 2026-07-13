import { pickOne, rollInt, type Rng } from '../rng'
import type { Item, ItemSlot, Rarity, StatId } from '../types'

export const ITEM_SLOTS: readonly ItemSlot[] = ['staff', 'hood', 'robe', 'ring', 'trinket']
export const RARITIES: readonly Rarity[] = ['common', 'uncommon', 'rare', 'epic']

/** Stat-budget multiplier per rarity, percent. */
export const RARITY_MULT_PCT: Record<Rarity, number> = {
  common: 100,
  uncommon: 140,
  rare: 190,
  epic: 250,
}

/** Drop weights out of 100 when an item drops without a rarity floor. */
const RARITY_WEIGHTS: Array<{ rarity: Rarity; weight: number }> = [
  { rarity: 'common', weight: 55 },
  { rarity: 'uncommon', weight: 30 },
  { rarity: 'rare', weight: 12 },
  { rarity: 'epic', weight: 3 },
]

/** Crit is twice as budget-expensive as the flat stats. */
const STAT_COST: Record<StatId, number> = { power: 1, stamina: 1, spirit: 1, crit: 2 }

const SLOT_NOUN: Record<ItemSlot, string> = {
  staff: 'Staff',
  hood: 'Hood',
  robe: 'Robe',
  ring: 'Ring',
  trinket: 'Talisman',
}

const PREFIX: Record<Rarity, string[]> = {
  common: ['Worn', 'Plain', 'Cracked', 'Dusty', 'Sturdy'],
  uncommon: ['Polished', 'Keen', 'Etched', 'Gleaming', 'Tempered'],
  rare: ['Runed', 'Moonlit', 'Stormbound', 'Emberforged', 'Whispering'],
  epic: ['Starforged', 'Voidtouched', 'Sunfallen', 'Worldsplinter', 'Dreambound'],
}

const SUFFIX: Record<StatId, string[]> = {
  power: ['of the Magus', 'of Ruin', 'of the Comet', 'of Burning Thought'],
  stamina: ['of the Colossus', 'of Deep Roots', 'of the Bulwark', 'of Stone Blood'],
  spirit: ['of the Zephyr', 'of Still Water', 'of the Dawnwell', 'of Quiet Stars'],
  crit: ['of the Phoenix', 'of Sudden Fury', 'of the Lightning', 'of Sharp Fates'],
}

export function rollRarity(rng: Rng, minRarity: Rarity = 'common'): Rarity {
  const floor = RARITIES.indexOf(minRarity)
  const pool = RARITY_WEIGHTS.slice(floor)
  const total = pool.reduce((s, e) => s + e.weight, 0)
  let roll = rollInt(rng, 1, total)
  for (const entry of pool) {
    roll -= entry.weight
    if (roll <= 0) return entry.rarity
  }
  return minRarity
}

function statCount(rarity: Rarity): number {
  return rarity === 'common' ? 1 : rarity === 'epic' ? 3 : 2
}

/** Total stat points an item of this ilvl/rarity distributes (crit counts double). */
export function statBudget(ilvl: number, rarity: Rarity): number {
  return Math.max(1, Math.round(((4 + 2.2 * ilvl) * RARITY_MULT_PCT[rarity]) / 100))
}

export function sellValue(item: Item): number {
  return Math.max(1, Math.round(((2 + item.ilvl) * RARITY_MULT_PCT[item.rarity]) / 100))
}

export function generateItem(
  rng: Rng,
  uid: number,
  ilvl: number,
  opts: { minRarity?: Rarity; slot?: ItemSlot } = {},
): Item {
  const rarity = rollRarity(rng, opts.minRarity)
  const slot = opts.slot ?? pickOne(rng, ITEM_SLOTS)

  // Pick which stats appear. Staves always carry power.
  const pool: StatId[] = ['power', 'stamina', 'spirit', 'crit']
  const picked: StatId[] = []
  if (slot === 'staff') {
    picked.push('power')
    pool.splice(pool.indexOf('power'), 1)
  }
  while (picked.length < statCount(rarity) && pool.length > 0) {
    const stat = pickOne(rng, pool)
    picked.push(stat)
    pool.splice(pool.indexOf(stat), 1)
  }

  // Split the budget: every picked stat gets at least 1 point's worth,
  // the remainder lands in random picked stats.
  const budget = statBudget(ilvl, rarity)
  const stats: Partial<Record<StatId, number>> = {}
  let spent = 0
  for (const s of picked) {
    stats[s] = 1
    spent += STAT_COST[s]
  }
  while (spent < budget) {
    const s = pickOne(rng, picked)
    if (spent + STAT_COST[s] > budget && picked.some((p) => spent + STAT_COST[p] <= budget)) continue
    stats[s] = (stats[s] ?? 0) + 1
    spent += STAT_COST[s]
  }

  // Name from the dominant stat (by budget cost).
  let dominant: StatId = picked[0] ?? 'power'
  for (const s of picked) {
    if ((stats[s] ?? 0) * STAT_COST[s] > (stats[dominant] ?? 0) * STAT_COST[dominant]) dominant = s
  }
  const name = `${pickOne(rng, PREFIX[rarity])} ${SLOT_NOUN[slot]} ${pickOne(rng, SUFFIX[dominant])}`

  return { uid, name, slot, ilvl, rarity, stats }
}
