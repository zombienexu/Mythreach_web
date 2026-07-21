import type { MaterialDef } from '../types'

/** Inert crafting materials. They drop alongside gear, stack in the bags, and
 *  sell for gold — but do nothing else yet. This catalog is the seam future
 *  crafting and quests will read from. */
const DEFS: MaterialDef[] = [
  { id: 'mossroot-fiber', name: 'Mossroot Fiber', tier: 'low', value: 3, flavor: 'Damp, stringy, faintly luminous.' },
  { id: 'hollow-bone', name: 'Hollow Bone', tier: 'low', value: 4, flavor: 'Light as a reed, cold to the touch.' },
  { id: 'bog-amber', name: 'Bog Amber', tier: 'low', value: 4, flavor: 'Old sap, older grief, pressed to a shine.' },
  { id: 'wisp-residue', name: 'Wisplight Residue', tier: 'low', value: 3, flavor: 'It glows faintest exactly when you look at it.' },
  { id: 'storm-quartz', name: 'Storm Quartz', tier: 'medium', value: 9, flavor: 'It hums when thunder is near.' },
  { id: 'drake-scale', name: 'Drakescale Chip', tier: 'medium', value: 9, flavor: 'Still cold. It will always be cold.' },
  { id: 'cinder-ash', name: 'Cinder Ash', tier: 'medium', value: 8, flavor: 'Still warm. It refuses to go out.' },
  { id: 'obsidian-glass', name: 'Obsidian Glass', tier: 'medium', value: 10, flavor: 'It reflects a slightly different room.' },
  { id: 'void-shard', name: 'Void Shard', tier: 'hard', value: 18, flavor: 'A splinter of a place that should not be.' },
  { id: 'rift-essence', name: 'Rift Essence', tier: 'hard', value: 22, flavor: 'Bottled wrongness, gently sloshing.' },
  { id: 'slag-glass', name: 'Slag Glass', tier: 'hard', value: 20, flavor: 'Fortress stone, melted and refrozen mid-scream.' },
  { id: 'ember-rivet', name: 'Ember Rivet', tier: 'hard', value: 24, flavor: 'Still warm from the wall it failed to hold.' },
  { id: 'stormglass-core', name: 'Stormglass Core', tier: 'hard', value: 26, flavor: 'A knot of lightning that forgot to strike.' },
  { id: 'drowned-brine', name: 'Drowned Brine', tier: 'hard', value: 22, flavor: 'Sea-water that remembers everyone it took.' },
  { id: 'barrow-dust', name: 'Barrow Dust', tier: 'hard', value: 28, flavor: 'Powdered grave-goods. It hums a name you almost know.' },
  { id: 'gravecall-sigil', name: 'Gravecall Sigil', tier: 'hard', value: 30, flavor: 'The draft-order the dead cannot refuse.' },
]

export const MATERIALS: Record<string, MaterialDef> = Object.fromEntries(DEFS.map((m) => [m.id, m]))
export const MATERIAL_IDS: readonly string[] = DEFS.map((m) => m.id)
