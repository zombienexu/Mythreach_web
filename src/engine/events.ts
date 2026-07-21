import type { AbilityId, BuffId, CardId, EnemyRank, Item, Side, SmolderBand } from './types'

export type DamageSource =
  | AbilityId
  | 'enemySwing'
  | 'enemyCast'
  | 'venom'
  | 'companion'
  /** The staff's basic attack landing. */
  | 'strike'
  /** The Arcanist's lingering Smolder ticking (not any one ability). */
  | 'smolder'
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
  // ── the Arcanist's fire: Openings, Smolder, Heat ──
  /** Heat changed. `band` is the current tier; `crossedUp` marks the moment it
   *  climbs into Empowered (5) or Overheat (10) — worth a flash and a sound. */
  | { kind: 'heatChanged'; heat: number; band: 'cold' | 'empowered' | 'overheat'; crossedUp: boolean }
  /** Smolder laid on a foe (Fireball, Kindle, Wildfire, a spread). `stacks` is
   *  the new total; `spread` marks a Wildfire jump rather than a direct apply. */
  | { kind: 'smolderApplied'; iid: number; stacks: number; spread: boolean }
  /** Smolder cashed in: `stacks` consumed, at the fiercest `band`. */
  | { kind: 'smolderDetonated'; iid: number; stacks: number; band: SmolderBand }
  /** A foe came Exposed — from a read Focus (`viaFocus`) or from Flashpoint. */
  | { kind: 'openingCreated'; iid: number; viaFocus: boolean }
  /** Focus resolved. `read` answered a foe's tell (deflect + Expose); `sharpen`
   *  read your own wind-up (the landing strike hits harder); `whiff` found
   *  nothing and eats the short lockout. `success` = not a whiff. */
  | { kind: 'focusUsed'; success: boolean; mode: 'read' | 'sharpen' | 'whiff'; iid: number | null }
  /** The staff's basic attack landed (`sharpened` = a banked Focus paid out). */
  | { kind: 'strikeLanded'; iid: number; sharpened: boolean }
  /** A tell just opened on a foe — the moment to consider Focus. */
  | { kind: 'tellOpened'; iid: number }
