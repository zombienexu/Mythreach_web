/** The six callings. The engine owns the ids; the UI owns the poetry. */
export type ClassId =
  | 'arcanist'
  | 'gravewright'
  | 'hourwarden'
  | 'cartomancer'
  | 'thornspeaker'
  | 'riftblade'

/** Who this hero is, mechanically: calling + origin + birth sign. Chosen at
 *  character creation, echoed into every derived stat. */
export interface HeroIdentity {
  classId: ClassId
  originId: string
  signId: string
}

export const DEFAULT_IDENTITY: HeroIdentity = {
  classId: 'arcanist',
  originId: '',
  signId: '',
}

export type AbilityId =
  // ── arcanist ──
  | 'fireball'
  | 'ignite'
  | 'renew'
  | 'pyroblast'
  | 'counterspell'
  | 'barrier'
  | 'combustion'
  // ── gravewright ──
  | 'gravebolt'
  | 'gravechill'
  | 'lastRites'
  | 'exhume'
  | 'requiem'
  | 'boneward'
  | 'finalChapter'
  // ── hourwarden ──
  | 'secondhandStrike'
  | 'rewindWound'
  | 'splitSecond'
  | 'stasis'
  | 'borrowedBlade'
  | 'hourglassShatter'
  // ── cartomancer ──
  | 'cardflick'
  | 'dealFate'
  | 'cutTheDeck'
  | 'houseRules'
  | 'foldTheWorld'
  | 'fiftyThirdCard'
  // ── thornspeaker ──
  | 'thornlash'
  | 'sowBriar'
  | 'sapdraw'
  | 'brambleWard'
  | 'wildswell'
  | 'verdantCataract'
  // ── riftblade ──
  | 'throughCut'
  | 'seamstep'
  | 'phaseEdge'
  | 'afterimage'
  | 'riftTear'
  | 'doorwayDuel'

export type Side = 'player' | 'enemy'

/** Each calling casts in its own school; a school owns a damage-bonus lane
 *  (talents, buffs) and a visual identity. */
export type School =
  | 'fire'
  | 'arcane'
  | 'holy'
  | 'shadow'
  | 'temporal'
  | 'fortune'
  | 'nature'
  | 'rift'

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
  // ── arcanist ──
  | 'impFireball'
  | 'searingFlames'
  | 'criticalMass'
  | 'fortitude'
  | 'meditation'
  | 'swiftRenewal'
  // ── gravewright ──
  | 'inkOfTheFallen'
  | 'deeperCuts'
  | 'swiftQuill'
  | 'boundEchoes'
  | 'gravePact'
  | 'oldBones'
  // ── hourwarden ──
  | 'borrowedTime'
  | 'finePrint'
  | 'quickHands'
  | 'compoundInterest'
  | 'patientDebt'
  | 'longCon'
  // ── cartomancer ──
  | 'loadedDice'
  | 'sleightOfHand'
  | 'extraAce'
  | 'crookedHouse'
  | 'luckyPenny'
  | 'toughCrowd'
  // ── thornspeaker ──
  | 'patientGreen'
  | 'deepRoots'
  | 'sapSurge'
  | 'fullBloom'
  | 'rootedCalm'
  | 'thickBark'
  // ── riftblade ──
  | 'honedEdge'
  | 'fleetFooted'
  | 'mirrorTraining'
  | 'duelistsEye'
  | 'widenedSeam'
  | 'scarTissue'

export type BuffId =
  | 'barrier'
  | 'combustion'
  | 'splitSecond'
  | 'houseRules'
  | 'wildswell'
  | 'seamstep'
  | 'doorway'

/** The Cartomancer's living deck. */
export type CardId = 'tower' | 'comet' | 'knives' | 'hearts' | 'moon' | 'coins'

/** Class-specific talent dials, read by the sim where the mechanic lives. */
export type ClassMod =
  | 'ledgerCap'
  | 'echoDmgPct'
  | 'lastRitesHealPct'
  | 'reckoningReliefPct'
  | 'shatterBonusPct'
  | 'extraDraw'
  | 'houseRulesTicks'
  | 'briarTicks'
  | 'sapHealPct'
  | 'cataractPct'
  | 'afterimageDmgPct'
  | 'chargeCap'

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

/** How long auto-battle catches its breath in idle before starting the next
 *  fight (1 s at 20 tps). Manual play ignores it — click when ready. */
export const AUTO_REST_TICKS = 20

// ── class mechanic constants ──
/** Ledger pages the Gravewright can hold before talents. */
export const LEDGER_CAP_BASE = 3
/** How often the Hourwarden's debt comes due, in combat ticks. */
export const RECKONING_INTERVAL_TICKS = 320 // 16 s
/** Share of the debt the Reckoning collects, percent. */
export const RECKONING_RATE_PCT = 80
/** Cards in a fresh Cartomancer hand before talents. */
export const HAND_SIZE_BASE = 3
/** Rift charges the Riftblade can bank before talents. */
export const RIFT_CHARGE_CAP_BASE = 5

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

/** What a traveler asks of you. `enemyId: null` means any foe, counted only
 *  while hunting the quest's region. */
export type QuestObjective =
  | { kind: 'kill'; enemyId: string | null; count: number }
  | { kind: 'collect'; materialId: string; count: number }

export interface QuestReward {
  xp: number
  gold: number
  /** A rolled item on turn-in, or null for coin-and-wisdom-only quests. */
  gear: { ilvl: number; minRarity: Rarity } | null
}

export interface QuestDef {
  id: string
  name: string
  /** The traveler offering it. */
  giver: string
  /** The ask, in the giver's voice. */
  text: string
  regionId: string
  objective: QuestObjective
  reward: QuestReward
}

export type QuestState = 'available' | 'active' | 'complete' | 'done'

/** One quest as the UI sees it: def + live state, no content lookups needed. */
export interface QuestView {
  id: string
  name: string
  giver: string
  text: string
  regionId: string
  regionName: string
  regionHue: number
  state: QuestState
  objective: { kind: 'kill' | 'collect'; targetName: string; count: number; progress: number }
  reward: QuestReward
}

/** How many quests can be underway at once. */
export const MAX_ACTIVE_QUESTS = 3

export interface ContentPack {
  /** The five difficulty regions, low → hard. All selectable from the start. */
  regions: readonly RegionDef[]
  enemies: Record<string, EnemyDef>
  materials: Record<string, MaterialDef>
  /** One-shot traveler quests. */
  quests: readonly QuestDef[]
}

/** Everything the combat math needs, derived from identity + level + talents
 *  + gear. Class-agnostic lanes (school bonuses, cast cuts, class dials) so a
 *  new calling never grows a new field here. */
export interface DerivedStats {
  power: number
  stamina: number
  spirit: number
  critPct: number
  maxHp: number
  maxMana: number
  /** Mana restored every REGEN_INTERVAL_TICKS. */
  regenPerInterval: number
  /** Global cooldown, after talents (Riftblade tempo). */
  gcdTicks: number
  /** Per-ability cast-time reduction from talents, in ticks. */
  castTickCut: Partial<Record<AbilityId, number>>
  /** Bonus damage per school, percent (0 = unmodified). */
  schoolBonusPct: Partial<Record<School, number>>
  /** Healing multiplier, percent (100 = unmodified). */
  healMultPct: number
  /** Identity leanings: XP and gold multipliers, percent (100 = unmodified). */
  xpMultPct: number
  goldMultPct: number
  /** Sign leanings: additive drop-chance bonuses, percent points. */
  dropBonusPct: number
  materialBonusPct: number
  /** Respawn-time reduction, percent (0 = the full wait). */
  respawnCutPct: number
  /** The Tower overhead: once per fight, a killing blow leaves you at 1 HP. */
  cheatDeath: boolean
  /** Class-specific talent dials. */
  mods: Partial<Record<ClassMod, number>>
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
  /** What put it there — the FX layer picks the aura's colours by source. */
  source?: string
}

export interface BuffSnapshot {
  id: BuffId
  remainingTicks: number
  /** Absorb remaining, for barrier-type shields. */
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

/** The class resource, as the UI sees it. Null for callings that run on
 *  rotation alone (the Arcanist's Weave). */
export type ClassResourceSnapshot =
  | { kind: 'ledger'; pages: number; cap: number; buried: string | null }
  | { kind: 'debt'; debt: number; reckoningIn: number }
  | { kind: 'hand'; cards: CardId[] }
  | { kind: 'growth'; perTick: number; remainingTicks: number }
  | { kind: 'charge'; charge: number; cap: number }

/** The spoils banked on a corpse, waiting to be looted. Material names are
 *  resolved at roll time so the view needs no content lookup. */
export interface LootBundle {
  gold: number
  /** 0 or 1 today. */
  items: Item[]
  materials: Array<{ id: string; name: string; count: number }>
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
  /** Ticks left outside time (Stasis, Doorway Duel). 0 = acting normally. */
  frozenTicks: number
  dot: DotSnapshot | null
  /** Unlooted spoils on a corpse; null while alive or once collected. */
  loot: LootBundle | null
}

export interface CombatSnapshot {
  tick: number
  /** idle: waiting for the player to start a fight. combat: a pack is live.
   *  looting: the pack is down, corpses hold their spoils. assault: world boss. */
  phase: 'idle' | 'combat' | 'looting' | 'assault'
  player: PlayerSnapshot
  /** The current pack (corpses included while looting); empty in idle. */
  enemies: EnemySnapshot[]
  /** iid of the targeted enemy, or null when nothing is targetable. */
  target: number | null
  cast: CastSnapshot | null
  queued: AbilityId | null
  cooldowns: Record<AbilityId, number>
  gcdRemaining: number
  autoBattle: boolean
  /** The class mechanic's live state, or null for resource-less callings. */
  resource: ClassResourceSnapshot | null
  /** A raised echo / afterimage fighting beside you, or null. */
  echo: { name: string; swingProgress: number; remainingTicks: number } | null
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
  intro: string
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
  classId: ClassId
  originId: string
  signId: string
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
  /** Every quest in the catalog with its live state, in catalog order. */
  quests: QuestView[]
  achievements: string[]
  lifetime: LifetimeStats
  records: Records
  /** The persistent world-boss pool, for the Regions panel. */
  worldBoss: { name: string; hp: number; maxHp: number; fells: number }
  /** The hired companion, or null. */
  companion: { id: string; name: string } | null
}

export interface SaveData {
  version: 5
  level: number
  xp: number
  gold: number
  /** Identity, sealed into the save at creation. */
  classId: ClassId
  originId: string
  signId: string
  talents: Partial<Record<TalentId, number>>
  equipped: Partial<Record<ItemSlot, Item>>
  inventory: Item[]
  nextUid: number
  regionId: string
  /** Inert crafting materials: materialId → count. */
  materials: Record<string, number>
  /** Accepted quests: questId → progress toward the objective count. */
  activeQuests: Record<string, number>
  /** Turned-in quest ids. */
  completedQuests: string[]
  achievements: string[]
  lifetime: LifetimeStats
  records: Records
  /** Persistent world-boss HP pool (the seam a server would someday own). */
  worldBossHp: number
  /** Hired companion id, or null. */
  companionId: string | null
  /** The Gravewright's banked pages — the one class resource that persists. */
  ledgerPages: number
  autoBattle: boolean
}
