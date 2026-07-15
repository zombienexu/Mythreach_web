import type { ContentPack, EncounterDef, RegionDef } from '../types'
import { ENEMIES } from './enemies'
import { MATERIALS } from './materials'
import { ZONES } from './zones'

/** The three regions are built by merging the five source zones' encounter
 *  tables into difficulty tiers. No enemy stats change — a region is just a
 *  bigger, un-gated hunting ground. */
function zone(id: string) {
  const z = ZONES.find((z) => z.id === id)
  if (!z) throw new Error(`missing source zone: ${id}`)
  return z
}

function merge(...ids: string[]): { encounters: EncounterDef[]; eliteEncounters: EncounterDef[] } {
  const encounters: EncounterDef[] = []
  const eliteEncounters: EncounterDef[] = []
  for (const id of ids) {
    const z = zone(id)
    encounters.push(...z.encounters)
    eliteEncounters.push(...z.eliteEncounters)
  }
  return { encounters, eliteEncounters }
}

const low = merge('hollowroot', 'duskmire')
const mid = merge('stormcrag', 'ashen-wastes')
const hard = merge('sundered-spire')

export const REGIONS: readonly RegionDef[] = [
  {
    id: 'verdant',
    name: 'The Verdant Reach',
    epithet: 'young woods, old hungers',
    tier: 'low',
    minLevel: 1,
    maxLevel: 6,
    hue: 150,
    encounters: low.encounters,
    eliteEncounters: low.eliteEncounters,
    materials: ['mossroot-fiber', 'hollow-bone'],
    intro: 'Green light and small teeth. A good place to begin.',
  },
  {
    id: 'emberwild',
    name: 'The Emberwild',
    epithet: 'stone that remembers fire',
    tier: 'medium',
    minLevel: 7,
    maxLevel: 12,
    hue: 40,
    encounters: mid.encounters,
    eliteEncounters: mid.eliteEncounters,
    materials: ['storm-quartz', 'cinder-ash'],
    intro: 'Ash on the wind and thunder in the rock.',
  },
  {
    id: 'riftedge',
    name: 'The Riftedge Wastes',
    epithet: 'where the world comes apart',
    tier: 'hard',
    minLevel: 13,
    maxLevel: 15,
    hue: 305,
    encounters: hard.encounters,
    eliteEncounters: hard.eliteEncounters,
    materials: ['void-shard', 'rift-essence'],
    intro: 'Reality frays. Mind the edges.',
  },
]

export const DEFAULT_CONTENT: ContentPack = {
  regions: REGIONS,
  enemies: ENEMIES,
  materials: MATERIALS,
}
