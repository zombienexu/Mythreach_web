import type { ContentPack, RegionDef, RegionTier, ZoneDef } from '../types'
import { ENEMIES } from './enemies'
import { MATERIALS } from './materials'
import { QUESTS } from './quests'
import { ZONES } from './zones'

/** Five regions, one per source zone. A region is the zone's identity — name,
 *  epithet, hue, encounter tables — recast as an un-gated hunting ground with
 *  a difficulty band and its own two materials. */
function zone(id: string): ZoneDef {
  const z = ZONES.find((z) => z.id === id)
  if (!z) throw new Error(`missing source zone: ${id}`)
  return z
}

function region(
  id: string,
  tier: RegionTier,
  minLevel: number,
  maxLevel: number,
  materials: [string, string],
): RegionDef {
  const z = zone(id)
  return {
    id,
    name: z.name,
    epithet: z.epithet,
    tier,
    minLevel,
    maxLevel,
    hue: z.hue,
    encounters: z.encounters,
    eliteEncounters: z.eliteEncounters,
    materials,
    intro: z.intro,
  }
}

export const REGIONS: readonly RegionDef[] = [
  region('hollowroot', 'low', 1, 3, ['mossroot-fiber', 'hollow-bone']),
  region('duskmire', 'low', 4, 6, ['bog-amber', 'wisp-residue']),
  region('stormcrag', 'medium', 7, 9, ['storm-quartz', 'drake-scale']),
  region('ashen-wastes', 'medium', 10, 12, ['cinder-ash', 'obsidian-glass']),
  region('sundered-spire', 'hard', 13, 15, ['void-shard', 'rift-essence']),
]

export const DEFAULT_CONTENT: ContentPack = {
  regions: REGIONS,
  enemies: ENEMIES,
  materials: MATERIALS,
  quests: QUESTS,
}
