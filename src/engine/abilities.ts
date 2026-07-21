import { CLASS_KITS } from './content/classes'
import type { AbilityId, BuffId, CardId, ClassId, School, SmolderBand } from './types'

export type AbilityEffect =
  | { kind: 'damage'; min: number; max: number }
  /** Hits every living enemy on the field. */
  | { kind: 'aoe'; min: number; max: number }
  | {
      kind: 'dot'
      tickDamage: number
      intervalTicks: number
      tickCount: number
      /** Each landed tick grows the next by this much (Thornspeaker briar). */
      growth?: number
      /** While the dot runs, the victim swings this % slower (Gravechill). */
      chillPct?: number
    }
  | { kind: 'heal'; min: number; max: number }
  | { kind: 'interrupt' }
  | {
      kind: 'shield'
      base: number
      perLevel: number
      durationTicks: number
      /** While the shield holds, melee attackers take base + perLevel×level back. */
      thornsBase?: number
      thornsPerLevel?: number
    }
  | { kind: 'buff'; buff: BuffId; durationTicks: number }
  /** Class mechanics the sim resolves by ability id. */
  | { kind: 'special' }

export interface AbilityDef {
  id: AbilityId
  name: string
  key: string
  /** Which calling owns it. Only that class can see or press it. */
  classId: ClassId
  unlockLevel: number
  manaCost: number
  /** 0 = instant. Talent cast cuts are read from DerivedStats.castTickCut. */
  castTicks: number
  cooldownTicks: number
  /** Offensive abilities need a living enemy to start. */
  offensive: boolean
  /** Off-GCD abilities ignore and don't trigger the global cooldown. */
  offGcd: boolean
  school: School
  /** Sand borrowed from your future self (Hourwarden only). */
  debt?: number
  /** Rift charges banked on use (Riftblade only). */
  chargeGain?: number
  description: string
}

export const ABILITIES: Record<AbilityId, AbilityDef> = {
  // ───────────────────────── arcanist ─────────────────────────
  // Build the fire (Smolder), feed the fire (Heat), read the foe (Openings),
  // choose the perfect moment to unleash it.
  fireball: {
    id: 'fireball',
    name: 'Fireball',
    key: '1',
    classId: 'arcanist',
    unlockLevel: 1,
    manaCost: 14,
    castTicks: 44, // 2.2 s
    cooldownTicks: 0,
    offensive: true,
    offGcd: false,
    school: 'fire',
    description:
      'Hurl a bolt of living flame — Fire damage, a stack of Smolder, and one Heat. As Heat climbs it splashes, spreads, and finally pierces the whole line. Loosed into an Opening it runs hotter.',
  },
  detonate: {
    id: 'detonate',
    name: 'Detonate',
    key: '2',
    classId: 'arcanist',
    unlockLevel: 3,
    manaCost: 12,
    castTicks: 0,
    cooldownTicks: 60, // 3 s
    offensive: true,
    offGcd: false,
    school: 'fire',
    description:
      'Set off every Smolder on the target at once. Older embers hit far harder — a field of Volatile stacks is a bomb. Builds Heat.',
  },
  kindle: {
    id: 'kindle',
    name: 'Kindle',
    key: '3',
    classId: 'arcanist',
    unlockLevel: 5,
    manaCost: 10,
    castTicks: 0,
    cooldownTicks: 100, // 5 s
    offensive: true,
    offGcd: false,
    school: 'fire',
    description:
      'Instantly lay one Smolder — two if the target is Exposed. The fast way to build pressure without a cast.',
  },
  wildfire: {
    id: 'wildfire',
    name: 'Wildfire',
    key: '4',
    classId: 'arcanist',
    unlockLevel: 7,
    manaCost: 20,
    castTicks: 0,
    cooldownTicks: 300, // 15 s
    offensive: true,
    offGcd: false,
    school: 'fire',
    description:
      'Seed Smolder across the whole pack — and while learned, consuming Smolder spreads living fire to nearby foes.',
  },
  flashpoint: {
    id: 'flashpoint',
    name: 'Flashpoint',
    key: '5',
    classId: 'arcanist',
    unlockLevel: 9,
    manaCost: 14,
    castTicks: 0,
    cooldownTicks: 400, // 20 s
    offensive: true,
    offGcd: false,
    school: 'fire',
    description:
      'Spend all your Heat to tear a guaranteed Opening — the more Heat, the longer they stay Exposed. Make your own moment.',
  },
  inferno: {
    id: 'inferno',
    name: 'Inferno',
    key: '6',
    classId: 'arcanist',
    unlockLevel: 11,
    manaCost: 26,
    castTicks: 0,
    cooldownTicks: 500, // 25 s
    offensive: true,
    offGcd: false,
    school: 'fire',
    description:
      'Spend every Smolder and all your Heat in one apocalyptic bloom across the field. Damage scales with everything you built.',
  },

  // ───────────────────────── gravewright ─────────────────────────
  gravebolt: {
    id: 'gravebolt',
    name: 'Gravebolt',
    key: '1',
    classId: 'gravewright',
    unlockLevel: 1,
    manaCost: 14,
    castTicks: 40, // 2.0 s
    cooldownTicks: 0,
    offensive: true,
    offGcd: false,
    school: 'shadow',
    description: 'A fistful of cold ink, thrown hard. The workhorse of the ledger.',
  },
  gravechill: {
    id: 'gravechill',
    name: 'Gravechill',
    key: '2',
    classId: 'gravewright',
    unlockLevel: 1,
    manaCost: 12,
    castTicks: 0,
    cooldownTicks: 160, // 8 s
    offensive: true,
    offGcd: false,
    school: 'shadow',
    description: 'A cold that files paperwork in the marrow: damage over 7 seconds, and the victim swings 15% slower while it lasts.',
  },
  lastRites: {
    id: 'lastRites',
    name: 'Last Rites',
    key: '3',
    classId: 'gravewright',
    unlockLevel: 2,
    manaCost: 10,
    castTicks: 0,
    cooldownTicks: 100, // 5 s
    offensive: false,
    offGcd: false,
    school: 'shadow',
    description: 'Tear out a ledger page and spend it on yourself: instant healing. Costs 1 page.',
  },
  exhume: {
    id: 'exhume',
    name: 'Exhume',
    key: '4',
    classId: 'gravewright',
    unlockLevel: 4,
    manaCost: 18,
    castTicks: 0,
    cooldownTicks: 240, // 12 s
    offensive: true,
    offGcd: false,
    school: 'shadow',
    description: 'The last thing you buried stands back up and fights for 12 seconds. Costs 1 page.',
  },
  requiem: {
    id: 'requiem',
    name: 'Requiem',
    key: '5',
    classId: 'gravewright',
    unlockLevel: 6,
    manaCost: 24,
    castTicks: 30, // 1.5 s
    cooldownTicks: 200, // 10 s
    offensive: true,
    offGcd: false,
    school: 'shadow',
    description: 'Read the book of the fallen aloud. Every enemy on the field takes shadow damage.',
  },
  boneward: {
    id: 'boneward',
    name: 'Boneward',
    key: '6',
    classId: 'gravewright',
    unlockLevel: 8,
    manaCost: 22,
    castTicks: 0,
    cooldownTicks: 400, // 20 s
    offensive: false,
    offGcd: false,
    school: 'shadow',
    description: 'A lattice of borrowed bone that absorbs damage before it reaches you.',
  },
  finalChapter: {
    id: 'finalChapter',
    name: 'Final Chapter',
    key: '7',
    classId: 'gravewright',
    unlockLevel: 11,
    manaCost: 20,
    castTicks: 0,
    cooldownTicks: 600, // 30 s
    offensive: true,
    offGcd: false,
    school: 'shadow',
    description: 'Slam the ledger shut on someone. Consumes every page: heavy shadow damage per page spent.',
  },

  // ───────────────────────── hourwarden ─────────────────────────
  secondhandStrike: {
    id: 'secondhandStrike',
    name: 'Secondhand Strike',
    key: '1',
    classId: 'hourwarden',
    unlockLevel: 1,
    manaCost: 12,
    castTicks: 0,
    cooldownTicks: 0,
    offensive: true,
    offGcd: false,
    school: 'temporal',
    debt: 8,
    description: 'A blow borrowed from a second that hasn’t happened yet. Instant. +8 sand debt.',
  },
  rewindWound: {
    id: 'rewindWound',
    name: 'Rewind Wound',
    key: '2',
    classId: 'hourwarden',
    unlockLevel: 2,
    manaCost: 14,
    castTicks: 0,
    cooldownTicks: 160, // 8 s
    offensive: false,
    offGcd: false,
    school: 'temporal',
    debt: 10,
    description: 'The last blow that landed on you politely un-lands: heal 70% of it. +10 sand debt.',
  },
  splitSecond: {
    id: 'splitSecond',
    name: 'Split Second',
    key: '3',
    classId: 'hourwarden',
    unlockLevel: 4,
    manaCost: 16,
    castTicks: 0,
    cooldownTicks: 300, // 15 s
    offensive: false,
    offGcd: false,
    school: 'temporal',
    debt: 12,
    description: 'For 6 seconds you act in both halves of every moment: Secondhand Strike lands twice. +12 sand debt.',
  },
  stasis: {
    id: 'stasis',
    name: 'Stasis',
    key: '4',
    classId: 'hourwarden',
    unlockLevel: 6,
    manaCost: 10,
    castTicks: 0,
    cooldownTicks: 300, // 15 s
    offensive: true,
    offGcd: true,
    school: 'temporal',
    debt: 8,
    description: 'Lift your target out of time for 3 seconds: no swings, no spells — a cast in flight simply stops. Off the global cooldown. +8 sand debt.',
  },
  borrowedBlade: {
    id: 'borrowedBlade',
    name: 'Borrowed Blade',
    key: '5',
    classId: 'hourwarden',
    unlockLevel: 8,
    manaCost: 24,
    castTicks: 0,
    cooldownTicks: 240, // 12 s
    offensive: true,
    offGcd: false,
    school: 'temporal',
    debt: 20,
    description: 'Take next Tuesday’s killing blow and spend it today. Heavy instant damage. +20 sand debt.',
  },
  hourglassShatter: {
    id: 'hourglassShatter',
    name: 'Hourglass Shatter',
    key: '6',
    classId: 'hourwarden',
    unlockLevel: 11,
    manaCost: 20,
    castTicks: 0,
    cooldownTicks: 600, // 30 s
    offensive: true,
    offGcd: false,
    school: 'temporal',
    description: 'Break the glass over their head: damage plus every grain of your current debt, and the debt is theirs now — yours resets to zero.',
  },

  // ───────────────────────── cartomancer ─────────────────────────
  cardflick: {
    id: 'cardflick',
    name: 'Cardflick',
    key: '1',
    classId: 'cartomancer',
    unlockLevel: 1,
    manaCost: 13,
    castTicks: 36, // 1.8 s
    cooldownTicks: 0,
    offensive: true,
    offGcd: false,
    school: 'fortune',
    description: 'One card, thrown edge-first. It always lands face up and it always hurts.',
  },
  dealFate: {
    id: 'dealFate',
    name: 'Deal Fate',
    key: '2',
    classId: 'cartomancer',
    unlockLevel: 1,
    manaCost: 14,
    castTicks: 0,
    cooldownTicks: 120, // 6 s
    offensive: true,
    offGcd: false,
    school: 'fortune',
    description: 'Play the top card of your hand — damage, healing, gold, a shield: the deck decides. An empty hand draws three fresh cards instead.',
  },
  cutTheDeck: {
    id: 'cutTheDeck',
    name: 'Cut the Deck',
    key: '3',
    classId: 'cartomancer',
    unlockLevel: 2,
    manaCost: 8,
    castTicks: 0,
    cooldownTicks: 200, // 10 s
    offensive: false,
    offGcd: false,
    school: 'fortune',
    description: 'Don’t like the hand? Throw it away and draw a fresh one. The deck respects nerve.',
  },
  houseRules: {
    id: 'houseRules',
    name: 'House Rules',
    key: '4',
    classId: 'cartomancer',
    unlockLevel: 6,
    manaCost: 16,
    castTicks: 0,
    cooldownTicks: 500, // 25 s
    offensive: false,
    offGcd: false,
    school: 'fortune',
    description: 'For 8 seconds the odds work for you and hate it: every damage and heal rolls its maximum, and crit rises 10%.',
  },
  foldTheWorld: {
    id: 'foldTheWorld',
    name: 'Fold the World',
    key: '5',
    classId: 'cartomancer',
    unlockLevel: 8,
    manaCost: 22,
    castTicks: 0,
    cooldownTicks: 400, // 20 s
    offensive: true,
    offGcd: false,
    school: 'fortune',
    description: 'Discard your whole hand. Reality discards something too: every enemy takes damage per card folded.',
  },
  fiftyThirdCard: {
    id: 'fiftyThirdCard',
    name: 'The Fifty-Third Card',
    key: '6',
    classId: 'cartomancer',
    unlockLevel: 11,
    manaCost: 26,
    castTicks: 50, // 2.5 s
    cooldownTicks: 600, // 30 s
    offensive: true,
    offGcd: false,
    school: 'fortune',
    description: 'Draw the card that edits the world. Catastrophic damage, a full mend, a windfall — it is never, ever a two.',
  },

  // ───────────────────────── thornspeaker ─────────────────────────
  thornlash: {
    id: 'thornlash',
    name: 'Thornlash',
    key: '1',
    classId: 'thornspeaker',
    unlockLevel: 1,
    manaCost: 13,
    castTicks: 36, // 1.8 s
    cooldownTicks: 0,
    offensive: true,
    offGcd: false,
    school: 'nature',
    description: 'A whip of green briar out of empty air. The garden says hello.',
  },
  sowBriar: {
    id: 'sowBriar',
    name: 'Sow Briar',
    key: '2',
    classId: 'thornspeaker',
    unlockLevel: 1,
    manaCost: 14,
    castTicks: 0,
    cooldownTicks: 100, // 5 s
    offensive: true,
    offGcd: false,
    school: 'nature',
    description: 'Plant a seed in the target. Every tick grows the next: a scratch today, a hedge of knives by the end. Replanting starts the garden over.',
  },
  sapdraw: {
    id: 'sapdraw',
    name: 'Sapdraw',
    key: '3',
    classId: 'thornspeaker',
    unlockLevel: 2,
    manaCost: 16,
    castTicks: 40, // 2.0 s
    cooldownTicks: 160, // 8 s
    offensive: true,
    offGcd: false,
    school: 'nature',
    description: 'Their vigor, rerouted: damage the target and drink every point of it back as healing.',
  },
  brambleWard: {
    id: 'brambleWard',
    name: 'Bramble Ward',
    key: '4',
    classId: 'thornspeaker',
    unlockLevel: 6,
    manaCost: 22,
    castTicks: 0,
    cooldownTicks: 400, // 20 s
    offensive: false,
    offGcd: false,
    school: 'nature',
    description: 'A hedge grown shut around you: absorbs damage, and everything that swings at it comes away bleeding.',
  },
  wildswell: {
    id: 'wildswell',
    name: 'Wildswell',
    key: '5',
    classId: 'thornspeaker',
    unlockLevel: 8,
    manaCost: 18,
    castTicks: 0,
    cooldownTicks: 600, // 30 s
    offensive: false,
    offGcd: false,
    school: 'nature',
    description: 'Ten seconds of forced spring: everything you have planted ticks twice as fast.',
  },
  verdantCataract: {
    id: 'verdantCataract',
    name: 'Verdant Cataract',
    key: '6',
    classId: 'thornspeaker',
    unlockLevel: 11,
    manaCost: 24,
    castTicks: 30, // 1.5 s
    cooldownTicks: 300, // 15 s
    offensive: true,
    offGcd: false,
    school: 'nature',
    description: 'The whole garden blooms at once: your briar on the target detonates for 150% of everything it still owed.',
  },

  // ───────────────────────── riftblade ─────────────────────────
  throughCut: {
    id: 'throughCut',
    name: 'Through-Cut',
    key: '1',
    classId: 'riftblade',
    unlockLevel: 1,
    manaCost: 10,
    castTicks: 0,
    cooldownTicks: 0,
    offensive: true,
    offGcd: false,
    school: 'rift',
    chargeGain: 1,
    description: 'The blade arrives before you do. Instant, and it banks a rift charge.',
  },
  seamstep: {
    id: 'seamstep',
    name: 'Seamstep',
    key: '2',
    classId: 'riftblade',
    unlockLevel: 2,
    manaCost: 12,
    castTicks: 0,
    cooldownTicks: 200, // 10 s
    offensive: false,
    offGcd: false,
    school: 'rift',
    chargeGain: 1,
    description: 'Step through the seam. For 4 seconds the next blow aimed at you hits the space you were standing in. Banks a rift charge.',
  },
  phaseEdge: {
    id: 'phaseEdge',
    name: 'Phase Edge',
    key: '3',
    classId: 'riftblade',
    unlockLevel: 4,
    manaCost: 16,
    castTicks: 0,
    cooldownTicks: 160, // 8 s
    offensive: true,
    offGcd: false,
    school: 'rift',
    description: 'Spend every banked charge on one edge from elsewhere: heavy damage per charge. Needs at least 2.',
  },
  afterimage: {
    id: 'afterimage',
    name: 'Afterimage',
    key: '4',
    classId: 'riftblade',
    unlockLevel: 6,
    manaCost: 20,
    castTicks: 0,
    cooldownTicks: 400, // 20 s
    offensive: true,
    offGcd: false,
    school: 'rift',
    description: 'Leave a you-shaped argument behind for 10 seconds. It also has a sword.',
  },
  riftTear: {
    id: 'riftTear',
    name: 'Rift Tear',
    key: '5',
    classId: 'riftblade',
    unlockLevel: 8,
    manaCost: 22,
    castTicks: 30, // 1.5 s
    cooldownTicks: 240, // 12 s
    offensive: true,
    offGcd: false,
    school: 'rift',
    description: 'Open the seam wide enough to cut through it: heavy damage to your target, and the tear grazes every other enemy for half.',
  },
  doorwayDuel: {
    id: 'doorwayDuel',
    name: 'Doorway Duel',
    key: '6',
    classId: 'riftblade',
    unlockLevel: 11,
    manaCost: 24,
    castTicks: 0,
    cooldownTicks: 600, // 30 s
    offensive: true,
    offGcd: false,
    school: 'rift',
    description: 'Drag your target into the elsewhere for 8 seconds: its packmates are locked outside, and it takes 25% more from you. Only you are invited back.',
  },
}

export const ABILITY_EFFECTS: Record<AbilityId, AbilityEffect> = {
  // arcanist — Fireball's damage roll is the source of truth for its base hit;
  // everything else it does (Smolder, Heat, evolution) is custom-resolved.
  fireball: { kind: 'damage', min: 16, max: 24 },
  detonate: { kind: 'special' },
  kindle: { kind: 'special' },
  wildfire: { kind: 'special' },
  flashpoint: { kind: 'special' },
  inferno: { kind: 'special' },
  // gravewright
  gravebolt: { kind: 'damage', min: 15, max: 22 },
  gravechill: { kind: 'dot', tickDamage: 4, intervalTicks: 20, tickCount: 7, chillPct: 15 },
  lastRites: { kind: 'special' },
  exhume: { kind: 'special' },
  requiem: { kind: 'aoe', min: 16, max: 24 },
  boneward: { kind: 'shield', base: 22, perLevel: 5, durationTicks: 600 },
  finalChapter: { kind: 'special' },
  // hourwarden
  secondhandStrike: { kind: 'damage', min: 12, max: 17 },
  rewindWound: { kind: 'special' },
  splitSecond: { kind: 'buff', buff: 'splitSecond', durationTicks: 120 },
  stasis: { kind: 'special' },
  borrowedBlade: { kind: 'damage', min: 34, max: 46 },
  hourglassShatter: { kind: 'special' },
  // cartomancer
  cardflick: { kind: 'damage', min: 15, max: 21 },
  dealFate: { kind: 'special' },
  cutTheDeck: { kind: 'special' },
  houseRules: { kind: 'buff', buff: 'houseRules', durationTicks: 160 },
  foldTheWorld: { kind: 'special' },
  fiftyThirdCard: { kind: 'special' },
  // thornspeaker
  thornlash: { kind: 'damage', min: 14, max: 20 },
  sowBriar: { kind: 'dot', tickDamage: 3, intervalTicks: 20, tickCount: 10, growth: 1 },
  sapdraw: { kind: 'special' },
  brambleWard: { kind: 'shield', base: 18, perLevel: 5, durationTicks: 600, thornsBase: 6, thornsPerLevel: 1 },
  wildswell: { kind: 'buff', buff: 'wildswell', durationTicks: 200 },
  verdantCataract: { kind: 'special' },
  // riftblade
  throughCut: { kind: 'damage', min: 11, max: 16 },
  seamstep: { kind: 'buff', buff: 'seamstep', durationTicks: 80 },
  phaseEdge: { kind: 'special' },
  afterimage: { kind: 'special' },
  riftTear: { kind: 'special' },
  doorwayDuel: { kind: 'special' },
}

/** Combustion's payload, shared by engine and UI copy. */
export const COMBUSTION_FIRE_BONUS_PCT = 25
export const COMBUSTION_CRIT_BONUS = 20

// ═════════════════════ The Arcanist's fire (redesign) ═════════════════════
// Three interlocking systems: Openings (read the foe), Smolder (build pressure
// on the foe), Heat (build power in yourself). Numbers are shared by the sim,
// the UI gauges and the FX so nothing drifts.

// ── The Strike: the staff's basic attack. Every conscript swings before they
//    weave. Auto-swings at the target on its own clock; casting holds it. ──
export const STRIKE_SWING_TICKS = 36 // 1.8 s
/** Base strike damage: 2 + level + floor(staff ilvl / 2), a 4-point spread. */
export const STRIKE_BASE = 2
export const STRIKE_SPREAD = 4

// ── Heat: accumulated fire in the caster, 0–10. Momentum, not a bar: every
//    point burns hotter, unfed Heat bleeds away, and a full boil spends
//    itself. You never master the fire — you ride it. ──
export const HEAT_MAX = 10
/** 5–9 Heat: Fireball splashes and spreads a little burn. */
export const HEAT_EMPOWERED_AT = 5
/** 10 Heat: Fireball pierces the whole pack and lays burning ground. */
export const HEAT_OVERHEAT_AT = 10
/** Every working that lands on a foe banks a point of Heat — two when it lands
 *  inside an open Stoke. Nothing else feeds the fire: the staff is wood. */
export const HEAT_PER_LANDING = 1
export const HEAT_PER_STOKED_LANDING = 2
/** Every point of Heat burns your fire this much hotter, percent. */
export const HEAT_FIRE_PCT_PER_POINT = 5
/** Unfed Heat bleeds: −1 point after this long without gaining any (3 s). */
export const HEAT_DECAY_TICKS = 60
/** Empowered Fireball's splash onto other foes, as a share of the main hit. */
export const FIREBALL_SPLASH_PCT = 40

// ── Smolder: lingering fire on a foe, max 5 stacks, each aging on its own.
//    Older = fiercer. Consumed by Detonate / Inferno. ──
export const SMOLDER_MAX = 5
/** A lone stack falls off after this long untended (11 s) — long enough to
 *  actually build a field of five, with a wide berth to detonate it ripe. */
export const SMOLDER_DURATION_TICKS = 220
/** Age thresholds: < 2 s Fresh, 2–5 s Heated, ≥ 5 s Volatile. */
export const SMOLDER_HEATED_AT = 40
export const SMOLDER_VOLATILE_AT = 100
/** The lingering burn ticks this often (1 s). */
export const SMOLDER_TICK_TICKS = 20
/** Per-stack lingering burn each tick, by band, *per Lingering Flame rank*
 *  (before power scaling). Untalented Smolder is inert pressure — fuel for
 *  Detonate — and deals nothing on its own. */
export const SMOLDER_BURN: Record<SmolderBand, number> = { fresh: 1, heated: 2, volatile: 3 }
/** Per-stack Detonate payoff, by band (before power/crit scaling). */
export const DETONATE_PER_STACK: Record<SmolderBand, number> = { fresh: 6, heated: 11, volatile: 18 }
/** Wildfire: on a consume, other foes catch this many stacks + a splash of the
 *  detonation, scaled by how much was consumed. */
export const WILDFIRE_SPREAD_PCT = 45
/** Wildfire (active): Smolder seeded on every living foe. */
export const WILDFIRE_SEED_STACKS = 2

// ── Stoke: the Arcanist's calling, worn on the heart of the wheel (Space).
//    A half-second of open flue — any working that *lands* inside it banks
//    double Heat. Pure timing: pressed early it shuts before the fire arrives,
//    pressed late it never opens in time. ──
/** How long the flue stays open (0.5 s) and how long before it can open again (3 s). */
export const STOKE_WINDOW_TICKS = 10
export const STOKE_CD_TICKS = 60

// ── Openings: a foe cracked wide, today only by Flashpoint. ──
/** How long a foe stays Exposed once an Opening is forced (3 s). */
export const OPENING_TICKS = 60
/** Bonus damage a foe takes from you while Exposed. */
export const OPENING_DMG_PCT = 30
/** The tell: a foe telegraphs in the last stretch of a wind-up, or any time it
 *  is hardcasting — the readout that says a blow is committed and coming. */
export const TELL_FROM_PROGRESS = 0.6
/** Flashpoint: Exposed ticks granted per Heat spent (min OPENING_TICKS). */
export const FLASHPOINT_TICKS_PER_HEAT = 8
/** Inferno: AoE damage per Heat spent and per (age-weighted) Smolder consumed. */
export const INFERNO_PER_HEAT = 4
export const INFERNO_PER_SMOLDER = 9

/** House Rules' crit rider (its max-roll half lives in the sim's roll path). */
export const HOUSE_RULES_CRIT_BONUS = 10
/** Doorway Duel: how much more your target takes while locked in with you. */
export const DOORWAY_DAMAGE_BONUS_PCT = 25
/** Stasis / Doorway freeze durations, in ticks. */
export const STASIS_FREEZE_TICKS = 60
export const DOORWAY_FREEZE_TICKS = 160
/** Rewind Wound: share of the last blow restored, percent. */
export const REWIND_HEAL_PCT = 70
/** Exhume / Afterimage echo timings. */
export const ECHO_DURATION_TICKS = 240
export const ECHO_SWING_TICKS = 32
export const AFTERIMAGE_DURATION_TICKS = 200
export const AFTERIMAGE_SWING_TICKS = 28
/** Final Chapter: damage per consumed page. */
export const FINAL_CHAPTER_MIN_PER_PAGE = 26
export const FINAL_CHAPTER_MAX_PER_PAGE = 36
/** Phase Edge: damage per consumed charge (and the charges it needs). */
export const PHASE_EDGE_MIN_PER_CHARGE = 13
export const PHASE_EDGE_MAX_PER_CHARGE = 17
export const PHASE_EDGE_MIN_CHARGES = 2
/** Fold the World: AoE damage per folded card. */
export const FOLD_MIN_PER_CARD = 11
export const FOLD_MAX_PER_CARD = 15
/** Verdant Cataract: share of the briar's remaining damage paid at once. */
export const CATARACT_PCT = 150
/** Rift Tear: the graze on everyone else, as a share of the main hit. */
export const RIFT_TEAR_SPLASH_PCT = 50

/** The Living Deck: what each card does when Deal Fate plays it. */
export interface CardDef {
  id: CardId
  name: string
  /** Weight in the draw. */
  weight: number
  effect:
    | { kind: 'damage'; min: number; max: number }
    | { kind: 'aoe'; min: number; max: number }
    | { kind: 'dot'; tickDamage: number; intervalTicks: number; tickCount: number }
    | { kind: 'heal'; min: number; max: number }
    | { kind: 'shield'; base: number; perLevel: number; durationTicks: number }
    | { kind: 'gold'; min: number; max: number }
}

export const CARDS: Record<CardId, CardDef> = {
  tower: { id: 'tower', name: 'The Tower', weight: 22, effect: { kind: 'damage', min: 30, max: 42 } },
  comet: { id: 'comet', name: 'The Comet', weight: 14, effect: { kind: 'aoe', min: 12, max: 16 } },
  knives: { id: 'knives', name: 'Six of Knives', weight: 16, effect: { kind: 'dot', tickDamage: 6, intervalTicks: 20, tickCount: 5 } },
  hearts: { id: 'hearts', name: 'Ace of Hearts', weight: 18, effect: { kind: 'heal', min: 22, max: 30 } },
  moon: { id: 'moon', name: 'The Moon', weight: 14, effect: { kind: 'shield', base: 18, perLevel: 4, durationTicks: 400 } },
  coins: { id: 'coins', name: 'Nine of Coins', weight: 16, effect: { kind: 'gold', min: 12, max: 24 } },
}

export const CARD_IDS: readonly CardId[] = ['tower', 'comet', 'knives', 'hearts', 'moon', 'coins']

/** Every ability in the game, kit order, arcanist first. Derived from the
 *  class kits so a kit entry with no ABILITIES row (or vice versa) is caught
 *  by the registration tests. */
export const ABILITY_IDS: readonly AbilityId[] = Object.values(CLASS_KITS).flatMap(
  (kit) => kit.abilities,
)

/** The action bar and hotkeys for one calling. */
export function abilityIdsFor(classId: ClassId): readonly AbilityId[] {
  return CLASS_KITS[classId].abilities
}
