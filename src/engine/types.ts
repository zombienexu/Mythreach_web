export type AbilityId = 'fireball' | 'ignite' | 'renew'
export type Side = 'player' | 'enemy'
export type SourceId = AbilityId | 'enemySwing'

/** The engine runs at 20 ticks per second; one tick is 50 ms. */
export const TICKS_PER_SECOND = 20
export const MS_PER_TICK = 1000 / TICKS_PER_SECOND

export interface EncounterConfig {
  playerMaxHp: number
  enemyMaxHp: number
  enemySwingTicks: number
  enemyDamageMin: number
  enemyDamageMax: number
  respawnTicks: number
  goldPerKill: number
}

export const DEFAULT_CONFIG: EncounterConfig = {
  playerMaxHp: 100,
  enemyMaxHp: 80,
  enemySwingTicks: 44, // 2.2 s
  enemyDamageMin: 5,
  enemyDamageMax: 9,
  respawnTicks: 60, // 3 s
  goldPerKill: 10,
}

export interface CombatantSnapshot {
  hp: number
  maxHp: number
  alive: boolean
  /** Ticks until respawn; 0 while alive. */
  respawnIn: number
}

export interface CastSnapshot {
  abilityId: AbilityId
  /** 0 at cast start, 1 at resolution. */
  progress: number
  remainingTicks: number
}

export interface DotSnapshot {
  abilityId: AbilityId
  remainingTicks: number
}

export interface CombatSnapshot {
  tick: number
  player: CombatantSnapshot
  enemy: CombatantSnapshot
  cast: CastSnapshot | null
  /** Remaining cooldown ticks per ability; 0 = ready. */
  cooldowns: Record<AbilityId, number>
  /** 0 right after a swing, 1 as the next one lands. */
  swingProgress: number
  dot: DotSnapshot | null
  kills: number
  gold: number
}
