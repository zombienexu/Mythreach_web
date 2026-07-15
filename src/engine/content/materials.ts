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
]

export const MATERIALS: Record<string, MaterialDef> = Object.fromEntries(DEFS.map((m) => [m.id, m]))
export const MATERIAL_IDS: readonly string[] = DEFS.map((m) => m.id)
