import type { AbilityId, School } from './types'

export type AbilityEffect =
  | { kind: 'damage'; min: number; max: number }
  | { kind: 'dot'; tickDamage: number; intervalTicks: number; tickCount: number }
  | { kind: 'heal'; min: number; max: number }
  | { kind: 'interrupt' }
  | { kind: 'shield'; base: number; perLevel: number; durationTicks: number }
  | { kind: 'buff'; buff: 'combustion'; durationTicks: number }

export interface AbilityDef {
  id: AbilityId
  name: string
  key: string
  unlockLevel: number
  manaCost: number
  /** 0 = instant. Fireball/Renew cast times are modified by talents — read DerivedStats. */
  castTicks: number
  cooldownTicks: number
  /** Offensive abilities need a living enemy to start. */
  offensive: boolean
  /** Off-GCD abilities ignore and don't trigger the global cooldown. */
  offGcd: boolean
  school: School
  description: string
}

export const ABILITIES: Record<AbilityId, AbilityDef> = {
  fireball: {
    id: 'fireball',
    name: 'Fireball',
    key: '1',
    unlockLevel: 1,
    manaCost: 14,
    castTicks: 44, // 2.2 s
    cooldownTicks: 0,
    offensive: true,
    offGcd: false,
    school: 'fire',
    description: 'Hurl a bolt of living flame. Your bread and butter.',
  },
  ignite: {
    id: 'ignite',
    name: 'Ignite',
    key: '2',
    unlockLevel: 1,
    manaCost: 12,
    castTicks: 0,
    cooldownTicks: 160, // 8 s
    offensive: true,
    offGcd: false,
    school: 'fire',
    description: 'Set the target alight, burning over 6 seconds. Reapplying refreshes the burn.',
  },
  renew: {
    id: 'renew',
    name: 'Renew',
    key: '3',
    unlockLevel: 2,
    manaCost: 16,
    castTicks: 36, // 1.8 s
    cooldownTicks: 100, // 5 s
    offensive: false,
    offGcd: false,
    school: 'holy',
    description: 'Weave starlight back into your body, restoring health.',
  },
  pyroblast: {
    id: 'pyroblast',
    name: 'Pyroblast',
    key: '4',
    unlockLevel: 4,
    manaCost: 30,
    castTicks: 70, // 3.5 s
    cooldownTicks: 240, // 12 s
    offensive: true,
    offGcd: false,
    school: 'fire',
    description: 'A slow, colossal comet of fire. Worth the wait.',
  },
  counterspell: {
    id: 'counterspell',
    name: 'Counterspell',
    key: '5',
    unlockLevel: 6,
    manaCost: 8,
    castTicks: 0,
    cooldownTicks: 300, // 15 s
    offensive: true,
    offGcd: true,
    school: 'arcane',
    description: 'Shatter an enemy spell mid-cast. Only usable while your target is casting — switch to the caster; off the global cooldown.',
  },
  barrier: {
    id: 'barrier',
    name: 'Arcane Barrier',
    key: '6',
    unlockLevel: 8,
    manaCost: 24,
    castTicks: 0,
    cooldownTicks: 400, // 20 s
    offensive: false,
    offGcd: false,
    school: 'arcane',
    description: 'A shell of hardened starlight that absorbs damage before it reaches you.',
  },
  combustion: {
    id: 'combustion',
    name: 'Combustion',
    key: '7',
    unlockLevel: 11,
    manaCost: 10,
    castTicks: 0,
    cooldownTicks: 600, // 30 s
    offensive: false,
    offGcd: false,
    school: 'fire',
    description: 'For 12 seconds your fire spells burn 25% hotter and are 20% more likely to crit.',
  },
}

export const ABILITY_EFFECTS: Record<AbilityId, AbilityEffect> = {
  fireball: { kind: 'damage', min: 16, max: 24 },
  ignite: { kind: 'dot', tickDamage: 5, intervalTicks: 20, tickCount: 6 },
  renew: { kind: 'heal', min: 20, max: 28 },
  pyroblast: { kind: 'damage', min: 48, max: 64 },
  counterspell: { kind: 'interrupt' },
  barrier: { kind: 'shield', base: 25, perLevel: 5, durationTicks: 600 },
  combustion: { kind: 'buff', buff: 'combustion', durationTicks: 240 },
}

/** Combustion's payload, shared by engine and UI copy. */
export const COMBUSTION_FIRE_BONUS_PCT = 25
export const COMBUSTION_CRIT_BONUS = 20

export const ABILITY_IDS: readonly AbilityId[] = [
  'fireball',
  'ignite',
  'renew',
  'pyroblast',
  'counterspell',
  'barrier',
  'combustion',
]
