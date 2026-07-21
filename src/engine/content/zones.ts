import type { EncounterDef, ZoneDef } from '../types'

/** Encounter templates. An encounter is just slots with mobs plugged in —
 *  adding a new one to a zone is a single line built from these. */

/** One mob, alone. The classic. */
const solo = (enemyId: string, weight: number): EncounterDef => ({
  weight,
  slots: [{ enemyId }],
})

/** Two mobs side by side. */
const pair = (a: string, b: string, weight: number): EncounterDef => ({
  weight,
  slots: [{ enemyId: a }, { enemyId: b }],
})

/** Two screening mobs up front, something meaner behind them. The back-row
 *  mob is drawn centre; the front pair falls to auto-retargeting first. */
const vanguard = (front: [string, string], back: string, weight: number): EncounterDef => ({
  weight,
  slots: [{ enemyId: front[0] }, { enemyId: back, row: 'back' }, { enemyId: front[1] }],
})

export const ZONES: readonly ZoneDef[] = [
  {
    id: 'hollowroot',
    name: 'Hollowroot Cavern',
    epithet: 'where the roots drink the dark',
    minLevel: 1,
    hue: 260,
    encounters: [
      solo('cave-golem', 26),
      solo('mossback-boar', 22),
      solo('gloomfang-spider', 16),
      pair('gravel-skitterling', 'mossback-boar', 14),
      vanguard(['gravel-skitterling', 'gravel-skitterling'], 'cave-golem', 14),
      solo('rockmaw-bruiser', 8),
      solo('root-creeper', 14),
      pair('root-creeper', 'gravel-skitterling', 10),
    ],
    eliteEncounters: [solo('rockmaw-bruiser', 1)],
    travelLines: [
      'The tunnel narrows; the dark breathes back.',
      'Rootlight drips from the ceiling like slow rain.',
      'Something skitters ahead, counting your footsteps.',
      'The path descends. It always descends.',
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
    encounters: [
      solo('duskwolf', 22),
      solo('bog-lurker', 19),
      solo('witchlight-wisp', 15),
      pair('mire-whelp', 'duskwolf', 14),
      // The wisp hides behind its whelps: switch to it or eat the Witchbolt.
      vanguard(['mire-whelp', 'mire-whelp'], 'witchlight-wisp', 12),
      vanguard(['mire-whelp', 'mire-whelp'], 'mirefiend-brute', 9),
      solo('fen-shade', 14),
      pair('fen-shade', 'mire-whelp', 10),
    ],
    eliteEncounters: [solo('mirefiend-brute', 1)],
    travelLines: [
      'Mist unspools between the trunks.',
      'The trees lean in to read over your shoulder.',
      'Wet ground swallows every footfall whole.',
      'A witchlight bobs ahead — do not follow it.',
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
    encounters: [
      solo('harpy-skyrender', 22),
      solo('stone-colossus', 18),
      solo('frostmane-drake', 15),
      pair('harpy-fledgling', 'harpy-skyrender', 14),
      vanguard(['harpy-fledgling', 'harpy-fledgling'], 'frostmane-drake', 12),
      vanguard(['harpy-fledgling', 'harpy-fledgling'], 'crag-behemoth', 9),
      solo('cliff-stalker', 14),
      pair('cliff-stalker', 'harpy-fledgling', 10),
    ],
    eliteEncounters: [solo('crag-behemoth', 1)],
    travelLines: [
      'The wind files its knives on the ridgeline.',
      'Thunder rolls through stone older than thunder.',
      'The path clings to the cliff like a guilty secret.',
      'Snow hisses across the trail, erasing you behind.',
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
    encounters: [
      solo('cinderhound', 22),
      solo('ash-revenant', 18),
      solo('obsidian-behemoth', 15),
      pair('ember-imp', 'cinderhound', 14),
      vanguard(['ember-imp', 'ember-imp'], 'ash-revenant', 12),
      vanguard(['ember-imp', 'ember-imp'], 'pyroclast-titan', 9),
      solo('magma-crawler', 14),
      pair('magma-crawler', 'ember-imp', 10),
    ],
    eliteEncounters: [solo('pyroclast-titan', 1)],
    travelLines: [
      'Cinders drift upward, as if the sky were the fire.',
      'The ground remembers being lava, and it misses it.',
      'Heat-shimmer bends the horizon into a lie.',
      'Your footprints fill with embers behind you.',
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
    encounters: [
      solo('void-acolyte', 20),
      solo('bone-sentinel', 18),
      solo('riftspawn-horror', 15),
      pair('void-mite', 'bone-sentinel', 14),
      // The acolyte chants behind its mites — the Spire teaches interrupts.
      vanguard(['void-mite', 'void-mite'], 'void-acolyte', 12),
      vanguard(['void-mite', 'void-mite'], 'herald-of-malgrath', 9),
      solo('null-watcher', 14),
      pair('null-watcher', 'void-mite', 10),
    ],
    eliteEncounters: [solo('herald-of-malgrath', 1)],
    travelLines: [
      "Reality frays at the trail's edge. Mind the seams.",
      'The Spire hums a note only your bones can hear.',
      'Gravity forgets its manners here.',
      'The stars overhead are in the wrong constellations.',
    ],
    bossId: 'malgrath',
    intro: 'Reality frays here. Mind the edges.',
  },
  {
    id: 'emberwall',
    name: 'Emberwall Breach',
    epithet: 'where the wall still burns',
    minLevel: 16,
    hue: 25,
    encounters: [
      solo('emberwall-legionary', 22),
      solo('siege-colossus', 18),
      solo('molten-sapper', 15),
      pair('breach-cinderling', 'emberwall-legionary', 14),
      vanguard(['breach-cinderling', 'breach-cinderling'], 'pyre-chaplain', 12),
      vanguard(['breach-cinderling', 'breach-cinderling'], 'wallbreaker-ajmol', 9),
      solo('pyre-chaplain', 12),
      pair('siege-colossus', 'breach-cinderling', 10),
    ],
    eliteEncounters: [solo('wallbreaker-ajmol', 1)],
    travelLines: [
      'The breach glows at the edges, still cooling.',
      'Ash falls like a grey snow that never lands.',
      'Somewhere ahead, a chaplain is already praying fire.',
    ],
    bossId: 'ember-warlord',
    intro: 'The breach is molten at the edges. Go through before it cools into a door.',
  },
  {
    id: 'stormharrow',
    name: 'Stormharrow Line',
    epithet: 'the line the sea keeps trying to take',
    minLevel: 19,
    hue: 205,
    encounters: [
      solo('drowned-reaver', 22),
      solo('harrowcliff-warden', 18),
      solo('tempest-drake', 15),
      pair('harrow-wisp', 'drowned-reaver', 14),
      vanguard(['harrow-wisp', 'harrow-wisp'], 'stormcaller-adept', 12),
      vanguard(['harrow-wisp', 'harrow-wisp'], 'tideturner-vael', 9),
      solo('stormcaller-adept', 12),
      pair('harrowcliff-warden', 'harrow-wisp', 10),
    ],
    eliteEncounters: [solo('tideturner-vael', 1)],
    travelLines: [
      'The wind arrives sideways and full of salt.',
      'Lightning walks the cliff, picking its footing.',
      'The surf below sounds like something counting.',
    ],
    bossId: 'tempest-sovereign',
    intro: 'The lightning picks its targets. Do not stand where it points.',
  },
  {
    id: 'gravecall',
    name: 'Gravecall Barrows',
    epithet: 'where the dead are drafted',
    minLevel: 22,
    hue: 285,
    encounters: [
      solo('gravecall-thrall', 22),
      solo('barrow-colossus', 18),
      solo('plaguebound-carrier', 15),
      pair('barrow-mote', 'gravecall-thrall', 14),
      vanguard(['barrow-mote', 'barrow-mote'], 'bone-choirmaster', 12),
      vanguard(['barrow-mote', 'barrow-mote'], 'gravecaller-mourne', 9),
      solo('bone-choirmaster', 12),
      pair('barrow-colossus', 'barrow-mote', 10),
    ],
    eliteEncounters: [solo('gravecaller-mourne', 1)],
    travelLines: [
      'The barrows breathe out a cold that clings.',
      'Grave-markers lean toward you as you pass.',
      'A choir tunes up somewhere under the hill.',
    ],
    bossId: 'barrow-king',
    intro: 'The barrows are enlisting. Discharge them.',
  },
]
