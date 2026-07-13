import type { AbilityId } from './types'

export type AbilityEffect =
  | { kind: 'damage'; min: number; max: number }
  | { kind: 'dot'; tickDamage: number; intervalTicks: number; tickCount: number }
  | { kind: 'heal'; min: number; max: number }

export interface AbilityDef {
  id: AbilityId
  name: string
  key: string
  /** 0 = instant. */
  castTicks: number
  cooldownTicks: number
  /** Offensive abilities need a living enemy to start. */
  offensive: boolean
  effect: AbilityEffect
}

export const ABILITIES: Record<AbilityId, AbilityDef> = {
  fireball: {
    id: 'fireball',
    name: 'Fireball',
    key: '1',
    castTicks: 50, // 2.5 s
    cooldownTicks: 0,
    offensive: true,
    effect: { kind: 'damage', min: 16, max: 24 },
  },
  ignite: {
    id: 'ignite',
    name: 'Ignite',
    key: '2',
    castTicks: 0,
    cooldownTicks: 160, // 8 s
    offensive: true,
    effect: { kind: 'dot', tickDamage: 4, intervalTicks: 20, tickCount: 6 },
  },
  renew: {
    id: 'renew',
    name: 'Renew',
    key: '3',
    castTicks: 36, // 1.8 s
    cooldownTicks: 100, // 5 s
    offensive: false,
    effect: { kind: 'heal', min: 18, max: 26 },
  },
}

export const ABILITY_IDS: readonly AbilityId[] = ['fireball', 'ignite', 'renew']
