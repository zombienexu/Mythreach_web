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

/** Difficulty band of a region and the tier of material it yields. */
export type RegionTier = 'low' | 'medium' | 'hard'
export type MaterialTier = RegionTier

/** The engine runs at 20 ticks per second; one tick is 50 ms. */
export const TICKS_PER_SECOND = 20
export const MS_PER_TICK = 1000 / TICKS_PER_SECOND

/** Global cooldown triggered by (almost) every ability. 1.2 s — snappier than the classic 1.5. */
export const GCD_TICKS = 24
export const PLAYER_RESPAWN_TICKS = 100
export const REGEN_INTERVAL_TICKS = 20
export const LEVEL_CAP = 15
export const INVENTORY_CAP = 24
export const RESPEC_COST = 50

/** Breather between one pack falling and the next arriving (1 s at 20 tps). */
export const NODE_SPAWN_TICKS = 20

export interface Item {
  uid: number
  name: string
  slot: ItemSlot
  ilvl: number
  rarity: Rarity
  stats: Partial<Record<StatId, number>>
}

/** An inert crafting material. Does nothing yet; drops, stacks, and sells. */
export interface MaterialDef {
  id: string
  name: string
  tier: MaterialTier
  /** Gold each stack unit sells for. */
  value: number
  flavor: string
}

/** A material line in the player's bags, for the Character screen. */
export interface MaterialStackView {
  id: string
  name: string
  tier: MaterialTier
  count: number
  /** Gold the whole stack sells for. */
  value: number
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

/** Where a mob stands in the pack. Purely presentational + targeting order:
 *  front-row mobs are retargeted first when your target dies. */
export type EncounterRow = 'front' | 'back'

export interface EncounterSlot {
  enemyId: string
  /** Defaults to 'front'. */
  row?: EncounterRow
}

/** A pack of 1–3 mobs that spawn and fight together. The encounter is the
 *  template; the slots are the mobs you plug into it. */
export interface EncounterDef {
  slots: EncounterSlot[]
  weight: number
}

/** Raw zone data — kept as the source the three regions are built from. Its
 *  `bossId`/`travelLines` fields are now unused legacy data. */
export interface ZoneDef {
  id: string
  name: string
  epithet: string
  minLevel: number
  hue: number
  encounters: EncounterDef[]
  eliteEncounters: EncounterDef[]
  travelLines: string[]
  bossId: string
  intro: string
}

/** A free-choice hunting ground. Pick one and its mobs spawn endlessly. */
export interface RegionDef {
  id: string
  name: string
  epithet: string
  tier: RegionTier
  /** Recommended level band (display only — regions are never gated). */
  minLevel: number
  maxLevel: number
  /** Accent hue for the region's ambience (oklch hue angle). */
  hue: number
  /** Weighted table of encounters (packs of 1–3 mobs). */
  encounters: EncounterDef[]
  /** Weighted table for the occasional elite spawn. */
  eliteEncounters: EncounterDef[]
  /** Material ids that can drop here. */
  materials: string[]
  intro: string
}

export interface ContentPack {
  /** The three difficulty regions, low → hard. All selectable from the start. */
  regions: readonly RegionDef[]
  enemies: Record<string, EnemyDef>
  materials: Record<string, MaterialDef>
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
  /** Instance id — unique per spawned mob, never reused. Targeting and FX key on it. */
  iid: number
  defId: string
  name: string
  level: number
  rank: EnemyRank
  row: EncounterRow
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
  /** Fighting in a region, or assaulting the world boss. */
  phase: 'combat' | 'assault'
  player: PlayerSnapshot
  /** The current pack, dead mobs included until it's cleared; empty between spawns. */
  enemies: EnemySnapshot[]
  /** iid of the targeted enemy, or null when the field is empty. */
  target: number | null
  /** Ticks until the next pack arrives (0 once on the field). */
  spawnIn: number
  cast: CastSnapshot | null
  queued: AbilityId | null
  cooldowns: Record<AbilityId, number>
  gcdRemaining: number
  autoBattle: boolean
  /** The hired companion's live swing state, or null when none is hired. */
  companion: { name: string; swingProgress: number } | null
}

export interface RegionProgress {
  id: string
  name: string
  epithet: string
  tier: RegionTier
  minLevel: number
  maxLevel: number
  hue: number
  current: boolean
  enemyNames: string[]
}

/** Leaderboard scaffold — local now, server-owned someday. */
export interface Records {
  worldBossFells: number
  bestAssaultDamage: number
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
  regionId: string
  regions: RegionProgress[]
  /** Inert crafting materials in the bags, sorted low → hard then by name. */
  materials: MaterialStackView[]
  achievements: string[]
  lifetime: LifetimeStats
  records: Records
  /** The persistent world-boss pool, for the Regions panel. */
  worldBoss: { name: string; hp: number; maxHp: number; fells: number }
  /** The hired companion, or null. */
  companion: { id: string; name: string } | null
}

export interface SaveData {
  version: 3
  level: number
  xp: number
  gold: number
  talents: Partial<Record<TalentId, number>>
  equipped: Partial<Record<ItemSlot, Item>>
  inventory: Item[]
  nextUid: number
  regionId: string
  /** Inert crafting materials: materialId → count. */
  materials: Record<string, number>
  achievements: string[]
  lifetime: LifetimeStats
  records: Records
  /** Persistent world-boss HP pool (the seam a server would someday own). */
  worldBossHp: number
  /** Hired companion id, or null. */
  companionId: string | null
  autoBattle: boolean
}
