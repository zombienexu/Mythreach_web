import { ABILITIES, abilityIdsFor } from './abilities'
import { ORIGIN_BY_ID, SIGN_BY_ID } from './content/identity'
import { TALENT_IDS, TALENTS } from './content/talents'
import type {
  AbilityId,
  ClassId,
  ClassMod,
  DerivedStats,
  HeroIdentity,
  Item,
  ItemSlot,
  School,
  StatId,
  TalentId,
} from './types'
import { GCD_TICKS, LEVEL_CAP } from './types'

/** XP required to go from `level` to `level + 1`. */
export function xpToNext(level: number): number {
  if (level >= LEVEL_CAP) return 0
  return 60 + 40 * level + 20 * level * level
}

/** Abilities of one calling that become available at exactly this level. */
export function abilitiesUnlockedAt(classId: ClassId, level: number): AbilityId[] {
  return abilityIdsFor(classId).filter((id) => ABILITIES[id].unlockLevel === level)
}

export function unlockedAbilities(classId: ClassId, level: number): AbilityId[] {
  return abilityIdsFor(classId).filter((id) => ABILITIES[id].unlockLevel <= level)
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

/** Pure derivation: identity + level + talents + gear → the numbers combat
 *  runs on. Talent effects are data (see talents.ts); origins and signs fold
 *  in here too, so the sim reads one stat block and never asks who you are. */
export function deriveStats(
  identity: HeroIdentity,
  level: number,
  talents: Partial<Record<TalentId, number>>,
  equipped: Partial<Record<ItemSlot, Item>>,
): DerivedStats {
  const gear = gearTotals(equipped)
  const origin = ORIGIN_BY_ID[identity.originId]
  const sign = SIGN_BY_ID[identity.signId]

  // ── talent folding ──
  let critBonus = 0
  let hpPct = 0
  let regenPct = 0
  let healingPct = 0
  let goldPct = 0
  let gcdTicks = GCD_TICKS
  const castTickCut: Partial<Record<AbilityId, number>> = {}
  const schoolBonusPct: Partial<Record<School, number>> = {}
  const mods: Partial<Record<ClassMod, number>> = {}

  for (const id of TALENT_IDS) {
    const def = TALENTS[id]
    const rank = Math.min(talents[id] ?? 0, def.maxRanks)
    if (rank <= 0) continue
    for (const fx of def.effects) {
      switch (fx.kind) {
        case 'castTicks': {
          const base = ABILITIES[fx.ability].castTicks
          const floor = fx.floorTicks ?? 0
          const cut = Math.min(fx.ticksPerRank * rank, Math.max(0, base - floor))
          castTickCut[fx.ability] = (castTickCut[fx.ability] ?? 0) + cut
          break
        }
        case 'school':
          schoolBonusPct[fx.school] = (schoolBonusPct[fx.school] ?? 0) + fx.pctPerRank * rank
          break
        case 'crit':
          critBonus += fx.pctPerRank * rank
          break
        case 'maxHp':
          hpPct += fx.pctPerRank * rank
          break
        case 'regen':
          regenPct += fx.pctPerRank * rank
          break
        case 'healing':
          healingPct += fx.pctPerRank * rank
          break
        case 'gcd':
          gcdTicks = Math.max(fx.floorTicks, gcdTicks - fx.ticksPerRank * rank)
          break
        case 'gold':
          goldPct += fx.pctPerRank * rank
          break
        case 'mod':
          mods[fx.mod] = (mods[fx.mod] ?? 0) + fx.perRank * rank
          break
      }
    }
  }

  // ── identity folding ──
  hpPct += origin?.effects.hpPct ?? 0
  regenPct += origin?.effects.regenPct ?? 0
  goldPct += origin?.effects.goldPct ?? 0
  critBonus += sign?.effects.critPct ?? 0

  const power = 3 * (level - 1) + gear.power
  const stamina = gear.stamina
  const spirit = gear.spirit
  const critPct = 5 + gear.crit + critBonus

  const maxHp = Math.round(((80 + 20 * level + 5 * stamina) * (100 + hpPct)) / 100)
  const maxMana = 80 + 20 * level
  const regenPerInterval = Math.floor(
    (Math.floor((8 + level + spirit) / 2) * (100 + regenPct)) / 100,
  )

  return {
    power,
    stamina,
    spirit,
    critPct,
    maxHp,
    maxMana,
    regenPerInterval,
    gcdTicks,
    castTickCut,
    schoolBonusPct,
    healMultPct: 100 + 2 * spirit + healingPct,
    xpMultPct: 100 + (origin?.effects.xpPct ?? 0),
    goldMultPct: 100 + goldPct,
    dropBonusPct: sign?.effects.dropPct ?? 0,
    materialBonusPct: sign?.effects.materialPct ?? 0,
    respawnCutPct: sign?.effects.respawnCutPct ?? 0,
    cheatDeath: sign?.effects.cheatDeath ?? false,
    mods,
  }
}

/** The cast time of an ability under a stat block (0 stays 0 — instants). */
export function castTicksFor(stats: DerivedStats, id: AbilityId): number {
  const base = ABILITIES[id].castTicks
  if (base <= 0) return 0
  return Math.max(1, base - (stats.castTickCut[id] ?? 0))
}

/** Total talent points earned by a given level (one per level starting at 2). */
export function talentPointsEarned(level: number): number {
  return Math.max(0, level - 1)
}

export function talentPointsSpent(talents: Partial<Record<TalentId, number>>): number {
  return TALENT_IDS.reduce((sum, id) => sum + (talents[id] ?? 0), 0)
}
