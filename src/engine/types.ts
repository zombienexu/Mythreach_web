export type AbilityId =
  | 'fireball'
  | 'ignite'
  | 'renew'
  | 'pyroblast'
  | 'counterspell'
  | 'barrier'
  | 'combustion'
export type Side = 'player' | 'enemy'
export type School = 'fire' | 'arcane' | 'holy'
export type StatId = 'power' | 'stamina' | 'spirit' | 'crit'
export type ItemSlot = 'staff' | 'hood' | 'robe' | 'ring' | 'trinket'
export type Rarity = 'common' | 'uncommon' | 'rare' | 'epic'
export type EnemyRank = 'normal' | 'elite' | 'boss'
export type PortraitFamily =
  | 'golem'
  | 'beast'
  | 'spider'
  | 'wisp'
  | 'drake'
  | 'revenant'
  | 'titan'
  | 'void'
export type TalentId =
  | 'impFireball'
  | 'searingFlames'
  | 'criticalMass'
  | 'fortitude'
  | 'meditation'
  | 'swiftRenewal'
export type BuffId = 'barrier' | 'combustion'

/** The engine runs at 20 ticks per second; one tick is 50 ms. */
export const TICKS_PER_SECOND = 20
export const MS_PER_TICK = 1000 / TICKS_PER_SECOND

/** Global cooldown triggered by (almost) every ability. 1.2 s — snappier than the classic 1.5. */
export const GCD_TICKS = 24
export const PLAYER_RESPAWN_TICKS = 100
export const SPAWN_GAP_TICKS = 50
export const BOSS_APPROACH_TICKS = 70
export const REGEN_INTERVAL_TICKS = 20
export const LEVEL_CAP = 15
export const BOSS_KILLS_REQUIRED = 10
export const INVENTORY_CAP = 24
export const RESPEC_COST = 50
/** Offline progress simulates at most 8 hours of real ticks. */
export const OFFLINE_CAP_TICKS = 8 * 60 * 60 * TICKS_PER_SECOND
export const OFFLINE_MIN_MS = 60_000

export interface Item {
  uid: number
  name: string
  slot: ItemSlot
  ilvl: number
  rarity: Rarity
  stats: Partial<Record<StatId, number>>
}

export interface EnemyMechanicEnrage {
  kind: 'enrage'
  /** Enrages the first time HP falls to this percentage or below. */
  hpPct: number
  /** Multiplier on swing interval (< 1 = faster). */
  swingMult: number
  dmgMult: number
}

export interface EnemyMechanicHardcast {
  kind: 'hardcast'
  name: string
  castTicks: number
  cooldownTicks: number
  dmgMin: number
  dmgMax: number
}

export interface EnemyMechanicVenom {
  kind: 'venom'
  name: string
  everyTicks: number
  tickDamage: number
  intervalTicks: number
  tickCount: number
}

export type EnemyMechanic = EnemyMechanicEnrage | EnemyMechanicHardcast | EnemyMechanicVenom

export interface EnemyDef {
  id: string
  name: string
  /** Short spawn flavor line for the combat log. */
  intro: string
  level: number
  rank: EnemyRank
  hp: number
  swingTicks: number
  dmgMin: number
  dmgMax: number
  xp: number
  goldMin: number
  goldMax: number
  /** Chance in percent (0–100) to drop an item on death. */
  dropPct: number
  portrait: { family: PortraitFamily; hue: number }
  mechanics: EnemyMechanic[]
}

export interface ZoneDef {
  id: string
  name: string
  epithet: string
  /** Recommended level — display only; unlocks are gated by the previous boss. */
  minLevel: number
  /** Accent hue for the zone's ambience (oklch hue angle). */
  hue: number
  /** Weighted spawn table of normal/elite enemy ids. */
  spawns: Array<{ enemyId: string; weight: number }>
  bossId: string
  intro: string
}

export interface ContentPack {
  /** Zone order is progression order; zone n+1 unlocks when zone n's boss dies. */
  zones: readonly ZoneDef[]
  enemies: Record<string, EnemyDef>
  /** Defeating this enemy completes the campaign. */
  finalBossId: string
}

/** Everything the combat math needs, derived from level + talents + gear. */
export interface DerivedStats {
  power: number
  stamina: number
  spirit: number
  critPct: number
  maxHp: number
  maxMana: number
  /** Mana restored every REGEN_INTERVAL_TICKS. */
  regenPerInterval: number
  fireballCastTicks: number
  renewCastTicks: number
  /** Fire-school damage multiplier, percent (100 = unmodified). */
  fireMultPct: number
  /** Healing multiplier, percent. */
  healMultPct: number
}

export interface CastSnapshot {
  abilityId: AbilityId
  /** 0 at cast start, 1 at resolution. */
  progress: number
  remainingTicks: number
  totalTicks: number
}

export interface DotSnapshot {
  name: string
  remainingTicks: number
}

export interface BuffSnapshot {
  id: BuffId
  remainingTicks: number
  /** Absorb remaining, for barrier. */
  amount?: number
}

export interface PlayerSnapshot {
  hp: number
  maxHp: number
  mana: number
  maxMana: number
  shield: number
  alive: boolean
  respawnIn: number
  buffs: BuffSnapshot[]
  dot: DotSnapshot | null
}

export interface EnemyCastSnapshot {
  name: string
  progress: number
  remainingTicks: number
}

export interface EnemySnapshot {
  defId: string
  name: string
  level: number
  rank: EnemyRank
  portrait: { family: PortraitFamily; hue: number }
  hp: number
  maxHp: number
  alive: boolean
  swingProgress: number
  cast: EnemyCastSnapshot | null
  enraged: boolean
  dot: DotSnapshot | null
}

export interface CombatSnapshot {
  tick: number
  player: PlayerSnapshot
  /** null between spawns. */
  enemy: EnemySnapshot | null
  spawnIn: number
  spawnKind: 'normal' | 'boss'
  cast: CastSnapshot | null
  queued: AbilityId | null
  cooldowns: Record<AbilityId, number>
  gcdRemaining: number
  autoBattle: boolean
}

export interface ZoneProgress {
  id: string
  name: string
  epithet: string
  minLevel: number
  hue: number
  unlocked: boolean
  current: boolean
  kills: number
  bossReady: boolean
  bossDefeated: boolean
  bossName: string
  enemyNames: string[]
}

export interface LifetimeStats {
  kills: number
  deaths: number
  goldEarned: number
  interrupts: number
  epicsFound: number
  bossKills: number
}

export interface ProgressSnapshot {
  level: number
  xp: number
  xpToNext: number
  gold: number
  stats: DerivedStats
  unlockedAbilities: AbilityId[]
  talentPoints: number
  talentRanks: Record<TalentId, number>
  inventory: Item[]
  equipped: Partial<Record<ItemSlot, Item>>
  zoneId: string
  zones: ZoneProgress[]
  achievements: string[]
  lifetime: LifetimeStats
  completed: boolean
}

export interface SaveData {
  version: 1
  savedAt: number
  level: number
  xp: number
  gold: number
  talents: Partial<Record<TalentId, number>>
  equipped: Partial<Record<ItemSlot, Item>>
  inventory: Item[]
  nextUid: number
  zoneId: string
  zoneKills: Record<string, number>
  bossesDefeated: string[]
  achievements: string[]
  lifetime: LifetimeStats
  autoBattle: boolean
  muted: boolean
  completed: boolean
}

export interface OfflineSummary {
  ticks: number
  kills: number
  deaths: number
  xpGained: number
  goldGained: number
  levelFrom: number
  levelTo: number
  /** Items still in the bags afterwards (best first, capped for display). */
  itemsKept: Item[]
  itemsSold: number
}
