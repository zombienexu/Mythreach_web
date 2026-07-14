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

/** A stop on an expedition trail. `boss` is always the last node; the rest are
 *  drawn from a weighted table and interpreted as data (like enemy mechanics). */
export type NodeKind = 'battle' | 'elite' | 'cache' | 'shrine' | 'rest' | 'boss'

/** Expedition-scoped blessings, cleared when the expedition ends. */
export type BlessingId = 'emberheart' | 'stoneskin' | 'springstep' | 'manatide' | 'keeneye'

/** The engine runs at 20 ticks per second; one tick is 50 ms. */
export const TICKS_PER_SECOND = 20
export const MS_PER_TICK = 1000 / TICKS_PER_SECOND

/** Global cooldown triggered by (almost) every ability. 1.2 s — snappier than the classic 1.5. */
export const GCD_TICKS = 24
export const PLAYER_RESPAWN_TICKS = 100
export const BOSS_APPROACH_TICKS = 70
export const REGEN_INTERVAL_TICKS = 20
export const LEVEL_CAP = 15
export const INVENTORY_CAP = 24
export const RESPEC_COST = 50

/** An expedition is a trail of `ROUTE_STEPS` nodes plus a final boss node. */
export const ROUTE_STEPS = 8
/** Ticks spent travelling between two nodes (4.5 s at 20 tps). */
export const TRAVEL_TICKS = 90
/** Auto-battle pause at camp / a resolved node before it embarks / advances. */
export const AUTO_BREATHER_TICKS = 30
/** Delay between arriving at a combat node and the encounter appearing. */
export const NODE_SPAWN_TICKS = 20

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

export interface ZoneDef {
  id: string
  name: string
  epithet: string
  /** Recommended level — display only; unlocks are gated by the previous boss. */
  minLevel: number
  /** Accent hue for the zone's ambience (oklch hue angle). */
  hue: number
  /** Weighted table of encounters (packs of 1–3 mobs). */
  encounters: EncounterDef[]
  /** Weighted table for `elite` nodes — a tougher spawn than the normal table. */
  eliteEncounters: EncounterDef[]
  /** Flavor lines shown while travelling between nodes; one is picked per hop. */
  travelLines: string[]
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

/** One node on the trail ribbon. `kind` is masked to 'unknown' until revealed
 *  (the boss is never masked). */
export interface ExpeditionNodeView {
  kind: NodeKind | 'unknown'
  state: 'done' | 'current' | 'ahead'
}

export interface ExpeditionSnapshot {
  /** Current/target node index. */
  index: number
  /** ROUTE_STEPS + 1. */
  total: number
  traveling: boolean
  travelRemaining: number
  travelTotal: number
  nodeResolved: boolean
  nodes: ExpeditionNodeView[]
  pendingShrine: BlessingId[] | null
  blessings: BlessingId[]
}

export interface CombatSnapshot {
  tick: number
  /** Where the hero is: at camp, walking the trail, resolving a node, or
   *  assaulting the world boss. */
  phase: 'camp' | 'travel' | 'node' | 'assault'
  player: PlayerSnapshot
  /** The current pack, dead mobs included until it's cleared; empty between spawns. */
  enemies: EnemySnapshot[]
  /** iid of the targeted enemy, or null when the field is empty. */
  target: number | null
  /** Ticks until the current node's encounter arrives (0 once on the field). */
  spawnIn: number
  /** The live expedition, or null at camp / during a world-boss assault. */
  expedition: ExpeditionSnapshot | null
  cast: CastSnapshot | null
  queued: AbilityId | null
  cooldowns: Record<AbilityId, number>
  gcdRemaining: number
  autoBattle: boolean
  /** The hired companion's live swing state, or null when none is hired. */
  companion: { name: string; swingProgress: number } | null
}

export interface ZoneProgress {
  id: string
  name: string
  epithet: string
  minLevel: number
  hue: number
  unlocked: boolean
  current: boolean
  bossDefeated: boolean
  bossName: string
  enemyNames: string[]
}

/** Leaderboard scaffold — local now, server-owned someday. */
export interface Records {
  expeditionsCompleted: number
  worldBossFells: number
  bestAssaultDamage: number
  /** zoneId → fewest ticks from boss spawn to boss kill. */
  fastestBossKills: Record<string, number>
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
  records: Records
  /** The persistent world-boss pool, for the Atlas panel. */
  worldBoss: { name: string; hp: number; maxHp: number; fells: number }
  /** The hired companion, or null. */
  companion: { id: string; name: string } | null
  completed: boolean
}

export interface SaveData {
  version: 2
  level: number
  xp: number
  gold: number
  talents: Partial<Record<TalentId, number>>
  equipped: Partial<Record<ItemSlot, Item>>
  inventory: Item[]
  nextUid: number
  zoneId: string
  bossesDefeated: string[]
  achievements: string[]
  lifetime: LifetimeStats
  records: Records
  /** Persistent world-boss HP pool (the seam a server would someday own). */
  worldBossHp: number
  /** Hired companion id, or null. */
  companionId: string | null
  autoBattle: boolean
  completed: boolean
}
