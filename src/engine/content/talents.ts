import type { AbilityId, ClassMod, School, TalentId } from '../types'

/** What a talent rank does, as data. deriveStats folds these into the stat
 *  block; nothing else ever needs to know a talent exists. */
export type TalentEffect =
  | { kind: 'castTicks'; ability: AbilityId; ticksPerRank: number; floorTicks?: number }
  | { kind: 'school'; school: School; pctPerRank: number }
  | { kind: 'crit'; pctPerRank: number }
  | { kind: 'maxHp'; pctPerRank: number }
  | { kind: 'regen'; pctPerRank: number }
  | { kind: 'healing'; pctPerRank: number }
  | { kind: 'gcd'; ticksPerRank: number; floorTicks: number }
  | { kind: 'gold'; pctPerRank: number }
  | { kind: 'mod'; mod: ClassMod; perRank: number }

export interface TalentDef {
  id: TalentId
  name: string
  maxRanks: number
  /** Effect magnitude per rank, for UI copy. */
  perRank: string
  description: string
  effects: readonly TalentEffect[]
}

export const TALENTS: Record<TalentId, TalentDef> = {
  // ───────────── arcanist ─────────────
  impFireball: {
    id: 'impFireball',
    name: 'Improved Fireball',
    maxRanks: 5,
    perRank: '−0.1 s cast',
    description: 'Shave the hesitation off your Fireball. 0.1 s faster cast per rank.',
    effects: [{ kind: 'castTicks', ability: 'fireball', ticksPerRank: 2 }],
  },
  searingFlames: {
    id: 'searingFlames',
    name: 'Searing Flames',
    maxRanks: 5,
    perRank: '+8% fire damage',
    description: 'Your fire spells burn 8% hotter per rank.',
    effects: [{ kind: 'school', school: 'fire', pctPerRank: 8 }],
  },
  criticalMass: {
    id: 'criticalMass',
    name: 'Critical Mass',
    maxRanks: 5,
    perRank: '+2% crit',
    description: 'Everything you cast is 2% more likely to crit per rank.',
    effects: [{ kind: 'crit', pctPerRank: 2 }],
  },
  fortitude: {
    id: 'fortitude',
    name: 'Fortitude',
    maxRanks: 5,
    perRank: '+6% max health',
    description: 'Thicker blood. 6% more maximum health per rank.',
    effects: [{ kind: 'maxHp', pctPerRank: 6 }],
  },
  meditation: {
    id: 'meditation',
    name: 'Meditation',
    maxRanks: 5,
    perRank: '+12% mana regen',
    description: 'The stars pour back faster. 12% more mana regeneration per rank.',
    effects: [{ kind: 'regen', pctPerRank: 12 }],
  },
  swiftRenewal: {
    id: 'swiftRenewal',
    name: 'Swift Renewal',
    maxRanks: 5,
    perRank: '−0.2 s cast, +8% healing',
    description: 'Renew casts 0.2 s faster and heals 8% more per rank.',
    effects: [
      { kind: 'castTicks', ability: 'renew', ticksPerRank: 4, floorTicks: 12 },
      { kind: 'healing', pctPerRank: 8 },
    ],
  },

  // ───────────── gravewright ─────────────
  inkOfTheFallen: {
    id: 'inkOfTheFallen',
    name: 'Ink of the Fallen',
    maxRanks: 2,
    perRank: '+1 ledger page',
    description: 'A thicker book. Hold one more ledger page per rank.',
    effects: [{ kind: 'mod', mod: 'ledgerCap', perRank: 1 }],
  },
  deeperCuts: {
    id: 'deeperCuts',
    name: 'Deeper Cuts',
    maxRanks: 5,
    perRank: '+8% shadow damage',
    description: 'The ink bites 8% deeper per rank.',
    effects: [{ kind: 'school', school: 'shadow', pctPerRank: 8 }],
  },
  swiftQuill: {
    id: 'swiftQuill',
    name: 'Swift Quill',
    maxRanks: 5,
    perRank: '−0.1 s cast',
    description: 'Gravebolt writes itself 0.1 s faster per rank.',
    effects: [{ kind: 'castTicks', ability: 'gravebolt', ticksPerRank: 2 }],
  },
  boundEchoes: {
    id: 'boundEchoes',
    name: 'Bound Echoes',
    maxRanks: 5,
    perRank: '+15% echo damage',
    description: 'What you exhume hits 15% harder per rank. The dead appreciate direction.',
    effects: [{ kind: 'mod', mod: 'echoDmgPct', perRank: 15 }],
  },
  gravePact: {
    id: 'gravePact',
    name: 'Grave Pact',
    maxRanks: 5,
    perRank: '+10% Last Rites healing',
    description: 'Each spent page repays 10% more life per rank.',
    effects: [{ kind: 'mod', mod: 'lastRitesHealPct', perRank: 10 }],
  },
  oldBones: {
    id: 'oldBones',
    name: 'Old Bones',
    maxRanks: 5,
    perRank: '+6% max health',
    description: 'You have buried worse than this. 6% more maximum health per rank.',
    effects: [{ kind: 'maxHp', pctPerRank: 6 }],
  },

  // ───────────── hourwarden ─────────────
  borrowedTime: {
    id: 'borrowedTime',
    name: 'Borrowed Time',
    maxRanks: 5,
    perRank: '+8% temporal damage',
    description: 'Better interest on every stolen second: 8% more temporal damage per rank.',
    effects: [{ kind: 'school', school: 'temporal', pctPerRank: 8 }],
  },
  finePrint: {
    id: 'finePrint',
    name: 'Fine Print',
    maxRanks: 5,
    perRank: '−8% Reckoning damage',
    description: 'You read the contract. The Reckoning collects 8% less per rank.',
    effects: [{ kind: 'mod', mod: 'reckoningReliefPct', perRank: 8 }],
  },
  quickHands: {
    id: 'quickHands',
    name: 'Quick Hands',
    maxRanks: 5,
    perRank: '+2% crit',
    description: 'Fast fingers find soft seams. +2% crit per rank.',
    effects: [{ kind: 'crit', pctPerRank: 2 }],
  },
  compoundInterest: {
    id: 'compoundInterest',
    name: 'Compound Interest',
    maxRanks: 5,
    perRank: '+10% debt converted',
    description: 'Hourglass Shatter converts 10% more of your debt into damage per rank.',
    effects: [{ kind: 'mod', mod: 'shatterBonusPct', perRank: 10 }],
  },
  patientDebt: {
    id: 'patientDebt',
    name: 'Patient Debt',
    maxRanks: 5,
    perRank: '+12% mana regen',
    description: 'The sand flows back 12% faster per rank.',
    effects: [{ kind: 'regen', pctPerRank: 12 }],
  },
  longCon: {
    id: 'longCon',
    name: 'The Long Con',
    maxRanks: 5,
    perRank: '+6% max health',
    description: 'Outlive the deadline. 6% more maximum health per rank.',
    effects: [{ kind: 'maxHp', pctPerRank: 6 }],
  },

  // ───────────── cartomancer ─────────────
  loadedDice: {
    id: 'loadedDice',
    name: 'Loaded Dice',
    maxRanks: 5,
    perRank: '+8% fortune damage',
    description: 'The house always wins, and you are the house: 8% more fortune damage per rank.',
    effects: [{ kind: 'school', school: 'fortune', pctPerRank: 8 }],
  },
  sleightOfHand: {
    id: 'sleightOfHand',
    name: 'Sleight of Hand',
    maxRanks: 5,
    perRank: '−0.1 s cast',
    description: 'Cardflick leaves the wrist 0.1 s faster per rank.',
    effects: [{ kind: 'castTicks', ability: 'cardflick', ticksPerRank: 2 }],
  },
  extraAce: {
    id: 'extraAce',
    name: 'Extra Ace',
    maxRanks: 2,
    perRank: '+1 card drawn',
    description: 'Every fresh hand holds one more card per rank. Nobody checks your sleeves.',
    effects: [{ kind: 'mod', mod: 'extraDraw', perRank: 1 }],
  },
  crookedHouse: {
    id: 'crookedHouse',
    name: 'Crooked House',
    maxRanks: 5,
    perRank: '+1 s House Rules',
    description: 'House Rules stays in effect 1 s longer per rank.',
    effects: [{ kind: 'mod', mod: 'houseRulesTicks', perRank: 20 }],
  },
  luckyPenny: {
    id: 'luckyPenny',
    name: 'Lucky Penny',
    maxRanks: 5,
    perRank: '+6% gold',
    description: 'Coins remember you fondly: 6% more gold per rank.',
    effects: [{ kind: 'gold', pctPerRank: 6 }],
  },
  toughCrowd: {
    id: 'toughCrowd',
    name: 'Tough Crowd',
    maxRanks: 5,
    perRank: '+6% max health',
    description: 'You have played rooms that threw knives. 6% more maximum health per rank.',
    effects: [{ kind: 'maxHp', pctPerRank: 6 }],
  },

  // ───────────── thornspeaker ─────────────
  patientGreen: {
    id: 'patientGreen',
    name: 'Patient Green',
    maxRanks: 5,
    perRank: '+8% nature damage',
    description: 'The wilds lean in: 8% more nature damage per rank.',
    effects: [{ kind: 'school', school: 'nature', pctPerRank: 8 }],
  },
  deepRoots: {
    id: 'deepRoots',
    name: 'Deep Roots',
    maxRanks: 3,
    perRank: '+1 briar tick',
    description: 'Sow Briar grows one tick longer per rank — and the last ticks are the fat ones.',
    effects: [{ kind: 'mod', mod: 'briarTicks', perRank: 1 }],
  },
  sapSurge: {
    id: 'sapSurge',
    name: 'Sap Surge',
    maxRanks: 5,
    perRank: '+15% Sapdraw healing',
    description: 'Sapdraw drinks 15% deeper per rank.',
    effects: [{ kind: 'mod', mod: 'sapHealPct', perRank: 15 }],
  },
  fullBloom: {
    id: 'fullBloom',
    name: 'Full Bloom',
    maxRanks: 5,
    perRank: '+10% Cataract damage',
    description: 'Verdant Cataract blooms 10% harder per rank.',
    effects: [{ kind: 'mod', mod: 'cataractPct', perRank: 10 }],
  },
  rootedCalm: {
    id: 'rootedCalm',
    name: 'Rooted Calm',
    maxRanks: 5,
    perRank: '+12% mana regen',
    description: 'Still water under old trees: 12% more mana regeneration per rank.',
    effects: [{ kind: 'regen', pctPerRank: 12 }],
  },
  thickBark: {
    id: 'thickBark',
    name: 'Thick Bark',
    maxRanks: 5,
    perRank: '+6% max health',
    description: 'The forest agrees with you. 6% more maximum health per rank.',
    effects: [{ kind: 'maxHp', pctPerRank: 6 }],
  },

  // ───────────── riftblade ─────────────
  honedEdge: {
    id: 'honedEdge',
    name: 'Honed Edge',
    maxRanks: 5,
    perRank: '+8% rift damage',
    description: 'The seam-knife keeps its temper: 8% more rift damage per rank.',
    effects: [{ kind: 'school', school: 'rift', pctPerRank: 8 }],
  },
  fleetFooted: {
    id: 'fleetFooted',
    name: 'Fleet-Footed',
    maxRanks: 4,
    perRank: '−0.05 s global cooldown',
    description: 'You fight between the beats. The global cooldown shrinks 0.05 s per rank.',
    effects: [{ kind: 'gcd', ticksPerRank: 1, floorTicks: 20 }],
  },
  mirrorTraining: {
    id: 'mirrorTraining',
    name: 'Mirror Training',
    maxRanks: 5,
    perRank: '+15% afterimage damage',
    description: 'Your afterimage hits 15% harder per rank. It practices when you sleep.',
    effects: [{ kind: 'mod', mod: 'afterimageDmgPct', perRank: 15 }],
  },
  duelistsEye: {
    id: 'duelistsEye',
    name: 'Duelist’s Eye',
    maxRanks: 5,
    perRank: '+2% crit',
    description: 'You see the opening before it opens. +2% crit per rank.',
    effects: [{ kind: 'crit', pctPerRank: 2 }],
  },
  widenedSeam: {
    id: 'widenedSeam',
    name: 'Widened Seam',
    maxRanks: 2,
    perRank: '+1 max rift charge',
    description: 'The seam holds one more charge per rank — and Phase Edge spends them all.',
    effects: [{ kind: 'mod', mod: 'chargeCap', perRank: 1 }],
  },
  scarTissue: {
    id: 'scarTissue',
    name: 'Scar Tissue',
    maxRanks: 5,
    perRank: '+6% max health',
    description: 'Every duel you walked away from, kept. 6% more maximum health per rank.',
    effects: [{ kind: 'maxHp', pctPerRank: 6 }],
  },
}

export const TALENT_IDS: readonly TalentId[] = Object.keys(TALENTS) as TalentId[]
