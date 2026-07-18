import type { AbilityId, BuffId, CardId, EnemyRank, Item, Side } from './types'

export type DamageSource =
  | AbilityId
  | 'enemySwing'
  | 'enemyCast'
  | 'venom'
  | 'companion'
  /** A raised ally's blade (Exhume, Afterimage). */
  | 'echo'
  /** The Hourwarden's debt coming due. */
  | 'reckoning'
  /** The Bramble Ward biting back. */
  | 'thorns'

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
  | { kind: 'goldGained'; amount: number; source: 'kill' | 'sale' | 'quest' }
  | { kind: 'lootDropped'; item: Item; autoSold: boolean; goldValue: number }
  | { kind: 'levelUp'; level: number; unlocked: AbilityId[] }
  | { kind: 'achievementUnlocked'; id: string; name: string }
  // ── regions & materials ──
  | { kind: 'regionEntered'; regionId: string; name: string }
  | { kind: 'materialDropped'; id: string; count: number }
  // ── quests ──
  | { kind: 'questAccepted'; id: string; name: string }
  /** The objective is met — the reward waits on the quest board. */
  | { kind: 'questCompleted'; id: string; name: string }
  | { kind: 'questTurnedIn'; id: string; name: string }
  // ── world boss (async scaffold, local) ──
  | { kind: 'worldBossAssaultEnded'; damageDealt: number; remaining: number }
  | { kind: 'worldBossFelled' }
  // ── companion ──
  | { kind: 'companionHired'; id: string; name: string }
  // ── class mechanics ──
  /** Deal Fate (or the Fifty-Third) flipped a card. */
  | { kind: 'cardPlayed'; card: CardId | 'fiftyThird'; label: string }
  /** An echo or afterimage stood up. */
  | { kind: 'echoRaised'; name: string }
  /** The Hourwarden's Reckoning collected. */
  | { kind: 'reckoning'; amount: number }
  /** A mob was locked out of time (Stasis, Doorway Duel). */
  | { kind: 'enemyFrozen'; iid: number; name: string }
  /** The birth sign stepped in: a killing blow left you at 1 HP. */
  | { kind: 'signIntervened' }
