import type { ContentPack, ZoneDef } from '../types'
import { ENEMIES } from './enemies'

export const ZONES: readonly ZoneDef[] = [
  {
    id: 'hollowroot',
    name: 'Hollowroot Cavern',
    epithet: 'where the roots drink the dark',
    minLevel: 1,
    hue: 260,
    spawns: [
      { enemyId: 'cave-golem', weight: 40 },
      { enemyId: 'mossback-boar', weight: 30 },
      { enemyId: 'gloomfang-spider', weight: 22 },
      { enemyId: 'rockmaw-bruiser', weight: 8 },
    ],
    bossId: 'grubthar',
    intro: 'Torchlight ends here. Everything below is teeth.',
  },
  {
    id: 'duskmire',
    name: 'Duskmire Weald',
    epithet: 'the forest that forgot the sun',
    minLevel: 4,
    hue: 150,
    spawns: [
      { enemyId: 'duskwolf', weight: 34 },
      { enemyId: 'bog-lurker', weight: 30 },
      { enemyId: 'witchlight-wisp', weight: 26 },
      { enemyId: 'mirefiend-brute', weight: 10 },
    ],
    bossId: 'bramble-widow',
    intro: 'The trees lean in to listen. Do not tell them anything.',
  },
  {
    id: 'stormcrag',
    name: 'Stormcrag Peaks',
    epithet: 'where the sky keeps its knives',
    minLevel: 7,
    hue: 230,
    spawns: [
      { enemyId: 'harpy-skyrender', weight: 34 },
      { enemyId: 'stone-colossus', weight: 28 },
      { enemyId: 'frostmane-drake', weight: 28 },
      { enemyId: 'crag-behemoth', weight: 10 },
    ],
    bossId: 'kraghorn',
    intro: 'Thunder without rain. The mountain is counting your steps.',
  },
  {
    id: 'ashen-wastes',
    name: 'The Ashen Wastes',
    epithet: 'a fire that refused to die',
    minLevel: 10,
    hue: 40,
    spawns: [
      { enemyId: 'cinderhound', weight: 34 },
      { enemyId: 'ash-revenant', weight: 28 },
      { enemyId: 'obsidian-behemoth', weight: 28 },
      { enemyId: 'pyroclast-titan', weight: 10 },
    ],
    bossId: 'ashmaw',
    intro: 'The ground remembers being lava, and it misses it.',
  },
  {
    id: 'sundered-spire',
    name: 'The Sundered Spire',
    epithet: 'the wound in the world',
    minLevel: 13,
    hue: 305,
    spawns: [
      { enemyId: 'void-acolyte', weight: 32 },
      { enemyId: 'bone-sentinel', weight: 29 },
      { enemyId: 'riftspawn-horror', weight: 29 },
      { enemyId: 'herald-of-malgrath', weight: 10 },
    ],
    bossId: 'malgrath',
    intro: 'Reality frays here. Mind the edges.',
  },
]

export const DEFAULT_CONTENT: ContentPack = {
  zones: ZONES,
  enemies: ENEMIES,
  finalBossId: 'malgrath',
}
