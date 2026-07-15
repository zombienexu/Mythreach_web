import type { AbilityId, BuffId, EnemyRank, Item, Side } from './types'

export type DamageSource = AbilityId | 'enemySwing' | 'enemyCast' | 'venom' | 'companion'

/** Discriminated union of one-shot happenings; the UI's only event source. */
export type CombatEvent =
  | { kind: 'castStarted'; abilityId: AbilityId }
  | { kind: 'castFinished'; abilityId: AbilityId }
  | { kind: 'castFizzled'; abilityId: AbilityId }
  | { kind: 'abilityQueued'; abilityId: AbilityId }
  | {
      kind: 'damage'
      target: Side
      /** The enemy involved: the one hit (target 'enemy') or the attacker (target 'player'). */
      iid?: number
      amount: number
      /** Damage soaked by the barrier before HP was touched. */
      absorbed: number
      crit: boolean
      source: DamageSource
      /** Display name for enemy casts / venoms (e.g. "Witchbolt"). */
      label?: string
    }
  | { kind: 'heal'; target: Side; amount: number; crit: boolean; source: AbilityId }
  | { kind: 'dotApplied'; target: Side; iid?: number; name: string; abilityId?: AbilityId }
  | { kind: 'buffApplied'; id: BuffId; amount?: number }
  | { kind: 'buffExpired'; id: BuffId }
  | { kind: 'shieldBroken' }
  | { kind: 'interrupted'; iid: number; name: string }
  | { kind: 'enemyCastStarted'; iid: number; name: string }
  | { kind: 'enemyEnraged'; iid: number; name: string }
  | { kind: 'enemySpawned'; iid: number; defId: string; name: string; rank: EnemyRank; intro: string }
  | { kind: 'enemyDied'; iid: number; defId: string; name: string; rank: EnemyRank }
  /** The whole pack is down. Fires after the last enemyDied of the encounter. */
  | { kind: 'encounterCleared' }
  | { kind: 'playerDied' }
  | { kind: 'playerRespawned' }
  | { kind: 'xpGained'; amount: number }
  | { kind: 'goldGained'; amount: number; source: 'kill' | 'sale' }
  | { kind: 'lootDropped'; item: Item; autoSold: boolean; goldValue: number }
  | { kind: 'levelUp'; level: number; unlocked: AbilityId[] }
  | { kind: 'achievementUnlocked'; id: string; name: string }
  // ── regions & materials ──
  | { kind: 'regionEntered'; regionId: string; name: string }
  | { kind: 'materialDropped'; id: string; count: number }
  // ── world boss (async scaffold, local) ──
  | { kind: 'worldBossAssaultEnded'; damageDealt: number; remaining: number }
  | { kind: 'worldBossFelled' }
  // ── companion ──
  | { kind: 'companionHired'; id: string; name: string }
