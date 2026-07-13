import { ABILITIES, ABILITY_IDS } from './abilities'
import { TALENT_IDS, TALENTS } from './content/talents'
import type { AbilityId, DerivedStats, Item, ItemSlot, StatId, TalentId } from './types'
import { LEVEL_CAP } from './types'

/** XP required to go from `level` to `level + 1`. */
export function xpToNext(level: number): number {
  if (level >= LEVEL_CAP) return 0
  return 60 + 40 * level + 20 * level * level
}

/** Abilities that become available at exactly this level. */
export function abilitiesUnlockedAt(level: number): AbilityId[] {
  return ABILITY_IDS.filter((id) => ABILITIES[id].unlockLevel === level)
}

export function unlockedAbilities(level: number): AbilityId[] {
  return ABILITY_IDS.filter((id) => ABILITIES[id].unlockLevel <= level)
}

export function gearTotals(equipped: Partial<Record<ItemSlot, Item>>): Record<StatId, number> {
  const total: Record<StatId, number> = { power: 0, stamina: 0, spirit: 0, crit: 0 }
  for (const item of Object.values(equipped)) {
    if (!item) continue
    for (const [stat, value] of Object.entries(item.stats)) {
      total[stat as StatId] += value
    }
  }
  return total
}

/** Pure derivation: level + talents + gear → the numbers combat runs on. */
export function deriveStats(
  level: number,
  talents: Partial<Record<TalentId, number>>,
  equipped: Partial<Record<ItemSlot, Item>>,
): DerivedStats {
  const gear = gearTotals(equipped)
  const rank = (id: TalentId) => Math.min(talents[id] ?? 0, TALENTS[id].maxRanks)

  const power = 3 * (level - 1) + gear.power
  const stamina = gear.stamina
  const spirit = gear.spirit
  const critPct = 5 + gear.crit + 2 * rank('criticalMass')

  const maxHp = Math.round(((80 + 20 * level + 5 * stamina) * (100 + 6 * rank('fortitude'))) / 100)
  const maxMana = 80 + 20 * level
  const regenPerInterval = Math.floor(
    (Math.floor((8 + level + spirit) / 2) * (100 + 12 * rank('meditation'))) / 100,
  )

  return {
    power,
    stamina,
    spirit,
    critPct,
    maxHp,
    maxMana,
    regenPerInterval,
    fireballCastTicks: ABILITIES.fireball.castTicks - 2 * rank('impFireball'),
    renewCastTicks: Math.max(12, ABILITIES.renew.castTicks - 4 * rank('swiftRenewal')),
    fireMultPct: 100 + 8 * rank('searingFlames'),
    healMultPct: 100 + 2 * spirit + 8 * rank('swiftRenewal'),
  }
}

/** Total talent points earned by a given level (one per level starting at 2). */
export function talentPointsEarned(level: number): number {
  return Math.max(0, level - 1)
}

export function talentPointsSpent(talents: Partial<Record<TalentId, number>>): number {
  return TALENT_IDS.reduce((sum, id) => sum + (talents[id] ?? 0), 0)
}
