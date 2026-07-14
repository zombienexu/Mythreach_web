import type { AbilityId } from '../../engine'

/** Spell tones as Pixi hex — the runtime mirror of the --tone-* CSS tokens.
 *  A spell looks the same everywhere it appears: icon, cast bar, particles. */
export const TONE: Record<AbilityId, number> = {
  fireball: 0xff7a2f,
  ignite: 0xb374ff,
  renew: 0x4fe0a8,
  pyroblast: 0xff9440,
  counterspell: 0x5fe3f0,
  barrier: 0xa9c8ff,
  combustion: 0xffc44d,
}

/** Secondary tone — the cooler/darker partner each spell fades toward. */
export const TONE_DEEP: Record<AbilityId, number> = {
  fireball: 0xd93a1a,
  ignite: 0x7a3fd9,
  renew: 0x2f9c78,
  pyroblast: 0xc93a10,
  counterspell: 0x2f8fd9,
  barrier: 0x5f8fd9,
  combustion: 0xe0691a,
}

export const HOT = 0xfff2dc // white-hot core, the brightest thing on screen
export const WOUND = 0xff5a4a // enemy damage
export const VENOM = 0x9fe05a
export const SMOKE = 0x2a1a2e
