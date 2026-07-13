import type { AbilityId, BuffId, EnemyRank, Item, Side } from './types'

export type DamageSource = AbilityId | 'enemySwing' | 'enemyCast' | 'venom'

/** Discriminated union of one-shot happenings; the UI's only event source. */
export type CombatEvent =
  | { kind: 'castStarted'; abilityId: AbilityId }
  | { kind: 'castFinished'; abilityId: AbilityId }
  | { kind: 'castFizzled'; abilityId: AbilityId }
  | { kind: 'abilityQueued'; abilityId: AbilityId }
  | {
      kind: 'damage'
      target: Side
      amount: number
      /** Damage soaked by the barrier before HP was touched. */
      absorbed: number
      crit: boolean
      source: DamageSource
      /** Display name for enemy casts / venoms (e.g. "Witchbolt"). */
      label?: string
    }
  | { kind: 'heal'; target: Side; amount: number; crit: boolean; source: AbilityId }
  | { kind: 'dotApplied'; target: Side; name: string; abilityId?: AbilityId }
  | { kind: 'buffApplied'; id: BuffId; amount?: number }
  | { kind: 'buffExpired'; id: BuffId }
  | { kind: 'shieldBroken' }
  | { kind: 'interrupted'; name: string }
  | { kind: 'enemyCastStarted'; name: string }
  | { kind: 'enemyEnraged'; name: string }
  | { kind: 'enemySpawned'; defId: string; name: string; rank: EnemyRank; intro: string }
  | { kind: 'enemyDied'; defId: string; name: string; rank: EnemyRank }
  | { kind: 'playerDied' }
  | { kind: 'playerRespawned' }
  | { kind: 'xpGained'; amount: number }
  | { kind: 'goldGained'; amount: number; source: 'kill' | 'sale' }
  | { kind: 'lootDropped'; item: Item; autoSold: boolean; goldValue: number }
  | { kind: 'levelUp'; level: number; unlocked: AbilityId[] }
  | { kind: 'bossReady'; zoneId: string }
  | { kind: 'bossDefeated'; zoneId: string; nextZoneId: string | null }
  | { kind: 'zoneEntered'; zoneId: string; name: string }
  | { kind: 'achievementUnlocked'; id: string; name: string }
  | { kind: 'gameCompleted' }
