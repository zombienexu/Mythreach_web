import type { AbilityId, Side, SourceId } from './types'

/** Discriminated union of one-shot happenings; the UI's only event source. */
export type CombatEvent =
  | { kind: 'castStarted'; abilityId: AbilityId }
  | { kind: 'castFinished'; abilityId: AbilityId }
  | { kind: 'castFizzled'; abilityId: AbilityId }
  | { kind: 'damage'; target: Side; amount: number; source: SourceId }
  | { kind: 'heal'; target: Side; amount: number; source: AbilityId }
  | { kind: 'dotApplied'; abilityId: AbilityId }
  | { kind: 'enemyDied' }
  | { kind: 'enemyRespawned' }
  | { kind: 'playerDied' }
  | { kind: 'playerRespawned' }
