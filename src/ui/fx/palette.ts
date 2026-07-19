import type { AbilityId } from '../../engine'

/** Spell tones as Pixi hex — the runtime mirror of the --tone-* CSS tokens.
 *  A spell looks the same everywhere it appears: icon, cast bar, particles. */
export const TONE: Record<AbilityId, number> = {
  // arcanist — the fire, warm to white-hot
  fireball: 0xff7a2f,
  detonate: 0xff5a2a,
  kindle: 0xffb347,
  wildfire: 0xffa040,
  flashpoint: 0xffd27a,
  inferno: 0xff4520,
  // gravewright
  gravebolt: 0x77d99a,
  gravechill: 0x7fd4e0,
  lastRites: 0xa8e69a,
  exhume: 0x66c288,
  requiem: 0x5fd9a0,
  boneward: 0xd9dfc2,
  finalChapter: 0x4fe08a,
  // hourwarden
  secondhandStrike: 0x7fb0ff,
  rewindWound: 0x9fd0e8,
  splitSecond: 0xa8b8ff,
  stasis: 0x8fd8f0,
  borrowedBlade: 0x6f9fe8,
  hourglassShatter: 0xc0d0ff,
  // cartomancer
  cardflick: 0xe8cc7a,
  dealFate: 0xffd54f,
  cutTheDeck: 0xd9c9a0,
  houseRules: 0xffe08a,
  foldTheWorld: 0xe8b45f,
  fiftyThirdCard: 0xfff0b0,
  // thornspeaker
  thornlash: 0x8ada6a,
  sowBriar: 0x6ac25f,
  sapdraw: 0x9fe07a,
  brambleWard: 0xa8c98a,
  wildswell: 0x7fe89a,
  verdantCataract: 0x5fe07f,
  // riftblade
  throughCut: 0xd98aff,
  seamstep: 0xb89aff,
  phaseEdge: 0xe07adf,
  afterimage: 0xc0a8f0,
  riftTear: 0xef6fbf,
  doorwayDuel: 0xcf8ae8,
}

/** Secondary tone — the cooler/darker partner each spell fades toward. */
export const TONE_DEEP: Record<AbilityId, number> = {
  // arcanist — the fire, warm to white-hot
  fireball: 0xd93a1a,
  detonate: 0xc42a10,
  kindle: 0xe0691a,
  wildfire: 0xd9531a,
  flashpoint: 0xff8a2a,
  inferno: 0xb01808,
  // gravewright
  gravebolt: 0x2f8f5a,
  gravechill: 0x3a8fa8,
  lastRites: 0x5fa84f,
  exhume: 0x2f7a4f,
  requiem: 0x2f8f6a,
  boneward: 0x8f9a7a,
  finalChapter: 0x1f8f4f,
  // hourwarden
  secondhandStrike: 0x3a6fd9,
  rewindWound: 0x5f9ab8,
  splitSecond: 0x5f6fd9,
  stasis: 0x4fa8c8,
  borrowedBlade: 0x2f5fb8,
  hourglassShatter: 0x7a8fd9,
  // cartomancer
  cardflick: 0xb8923a,
  dealFate: 0xd9a02f,
  cutTheDeck: 0xa8946a,
  houseRules: 0xd9b04f,
  foldTheWorld: 0xb87a2f,
  fiftyThirdCard: 0xd9c07a,
  // thornspeaker
  thornlash: 0x4f9a3a,
  sowBriar: 0x3a7a2f,
  sapdraw: 0x5fa84f,
  brambleWard: 0x6a8f5a,
  wildswell: 0x3aa85f,
  verdantCataract: 0x2fa84f,
  // riftblade
  throughCut: 0x9a3fd9,
  seamstep: 0x7a5fd9,
  phaseEdge: 0xb83aa8,
  afterimage: 0x8f6fd9,
  riftTear: 0xc82f8f,
  doorwayDuel: 0x9a4fd9,
}

export const HOT = 0xfff2dc // white-hot core, the brightest thing on screen
export const WOUND = 0xff5a4a // enemy damage
export const VENOM = 0x9fe05a
export const SMOKE = 0x2a1a2e
