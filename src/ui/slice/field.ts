/** THE FIELD BOARD — the exploration layer. Venturing a front turns up 3–4
 *  *sightings*: detected mob groups, each with its stats laid bare — rarity,
 *  the pack, its level, the XP and coin it will pay. You pick one to engage;
 *  when it falls, the whole board **rotates** to a fresh roll. Most sightings
 *  are common rabble, but each front hides rare champions and a rare **apex**
 *  world-boss — so every rotation carries the thrill of what might surface.
 *
 *  Grinders chase the fattest XP; questers wait for the rotation that turns up
 *  their quarry; boss-hunters watch for the apex. This module is pure: state in,
 *  state out, driven by an injected `Rng`. The Game holds a `FieldState` and
 *  re-derives it here, then spawns the chosen sighting through
 *  `sim.startFight(spec)`. It reads engine content (encounter tables, the
 *  bestiary, the boss per zone, the quest board) but never the sim. */
import {
  ENEMIES,
  QUEST_BY_ID,
  REGIONS,
  ZONES,
  pickOne,
  pickWeighted,
  rollInt,
  type EncounterDef,
  type EnemyDef,
  type FightSpec,
  type QuestView,
  type RegionDef,
  type Rng,
} from '../../engine'

export type Rarity = 'common' | 'uncommon' | 'rare' | 'apex'

export interface RarityInfo {
  id: Rarity
  name: string
  /** oklch hue for the tier's accent colour. */
  hue: number
  /** roll weight — how often this tier surfaces. */
  weight: number
}

export const RARITIES: Record<Rarity, RarityInfo> = {
  common: { id: 'common', name: 'Common', hue: 210, weight: 52 },
  uncommon: { id: 'uncommon', name: 'Uncommon', hue: 150, weight: 30 },
  rare: { id: 'rare', name: 'Rare', hue: 275, weight: 15 },
  apex: { id: 'apex', name: 'Apex', hue: 25, weight: 3 },
}

const RARITY_ORDER: Rarity[] = ['common', 'uncommon', 'rare', 'apex']

/** One sighting on the board — a group you can size up and choose to engage. */
export interface Offer {
  id: number
  rarity: Rarity
  /** how the sim spawns it (a table index, or an explicit apex roster). */
  spec: FightSpec
  /** enemy defIds in the group (display + quest matching). */
  roster: string[]
  /** per-mob rank in the group — 'back' mobs sit deeper in the formation. */
  rows: string[]
  /** which formation the group stands in — chosen at roll time so it's stable
   *  per sighting but varies across sightings (never a fixed line). */
  formation: number
  /** the headline (highest-level) enemy defId — the card's face. */
  headline: string
  size: number
  level: number
  /** 0..1 danger estimate relative to the hero's level. */
  threat: number
  xp: number
  goldMin: number
  goldMax: number
  hasQuestTarget: boolean
  title: string
}

export interface FieldState {
  regionId: string
  offers: Offer[]
  selectedId: number | null
  nextId: number
  /** total rotations this deployment — animation key / telemetry. */
  rerolls: number
}

function regionOf(regionId: string): RegionDef {
  return REGIONS.find((r) => r.id === regionId) ?? REGIONS[0]!
}

/** The apex world-boss that stalks a front (from the source zone). */
function bossIdOf(regionId: string): string {
  const zone = ZONES.find((z) => z.id === regionId)
  return zone?.bossId ?? 'grubthar'
}

function rosterOf(enc: EncounterDef): string[] {
  return enc.slots.map((s) => s.enemyId)
}

function defsOf(roster: string[]): EnemyDef[] {
  return roster.map((id) => ENEMIES[id]).filter((d): d is EnemyDef => !!d)
}

function clamp01(n: number): number {
  return n < 0 ? 0 : n > 1 ? 1 : n
}

/** The named kill-targets of every active Order — the set a sighting is marked
 *  against. "Any foe" quests carry no named target and never mark a card. */
export function activeQuestTargets(quests: readonly QuestView[]): Set<string> {
  const out = new Set<string>()
  for (const q of quests) {
    if (q.state !== 'active') continue
    const def = QUEST_BY_ID[q.id]
    if (def && def.objective.kind === 'kill' && def.objective.enemyId) out.add(def.objective.enemyId)
  }
  return out
}

function titleFor(rarity: Rarity, roster: string[], headline: EnemyDef): string {
  if (rarity === 'apex') return `Apex · ${headline.name}`
  if (rarity === 'rare') return `Champion · ${headline.name}`
  if (roster.length === 1) return `Lone ${headline.name}`
  if (roster.length === 2) return `Pair · ${headline.name}`
  return `Warband · ${roster.length}`
}

/** Compose the roster + spawn spec for a sighting of the given rarity. */
function rowsOf(enc: EncounterDef): string[] {
  return enc.slots.map((s) => s.row ?? 'front')
}

function pickEncounter(
  region: RegionDef,
  rarity: Rarity,
  rng: Rng,
  targets: Set<string>,
): { spec: FightSpec; roster: string[]; rows: string[] } {
  if (rarity === 'apex') {
    const boss = bossIdOf(region.id)
    return { spec: { enemyIds: [boss] }, roster: [boss], rows: ['front'] }
  }
  if (rarity === 'rare') {
    const index = rollInt(rng, 0, region.eliteEncounters.length - 1)
    const enc = region.eliteEncounters[index]!
    return { spec: { table: 'elite', index }, roster: rosterOf(enc), rows: rowsOf(enc) }
  }

  // common / uncommon: ordinary packs with no elite in them. uncommon leans big.
  const noElite = (e: EncounterDef): boolean =>
    e.slots.every((s) => (ENEMIES[s.enemyId]?.rank ?? 'normal') !== 'elite')
  const indexed = region.encounters.map((e, i) => ({ e, i })).filter(({ e }) => noElite(e))
  const wantBig = rarity === 'uncommon'
  let pool = indexed.filter(({ e }) => (wantBig ? e.slots.length >= 2 : e.slots.length <= 2))
  if (pool.length === 0) pool = indexed
  if (pool.length === 0) pool = region.encounters.map((e, i) => ({ e, i }))

  // Quest bias: sometimes surface a pack that holds one of your marked quarry.
  if (targets.size > 0 && rng() < 0.3) {
    const marked = pool.filter(({ e }) => rosterOf(e).some((id) => targets.has(id)))
    if (marked.length > 0) pool = marked
  }

  const chosen = pickOne(rng, pool)
  return { spec: { table: 'normal', index: chosen.i }, roster: rosterOf(chosen.e), rows: rowsOf(chosen.e) }
}

function makeOffer(
  regionId: string,
  rarity: Rarity,
  rng: Rng,
  playerLevel: number,
  targets: Set<string>,
  id: number,
): Offer {
  const region = regionOf(regionId)
  const { spec, roster, rows } = pickEncounter(region, rarity, rng, targets)
  const formation = rollInt(rng, 0, 3)
  const defs = defsOf(roster)
  const size = roster.length
  const level = Math.max(...defs.map((d) => d.level))
  const xp = defs.reduce((s, d) => s + d.xp, 0)
  const goldMin = defs.reduce((s, d) => s + d.goldMin, 0)
  const goldMax = defs.reduce((s, d) => s + d.goldMax, 0)
  const headline = defs.reduce((a, b) => (b.level >= a.level ? b : a), defs[0]!)
  const rankBump = headline.rank === 'boss' ? 0.35 : headline.rank === 'elite' ? 0.15 : 0
  const threat = clamp01((level - playerLevel) / 12 + 0.42 + rankBump + (size - 1) * 0.04)
  const hasQuestTarget = roster.some((id2) => targets.has(id2))
  return {
    id,
    rarity,
    spec,
    roster,
    rows,
    formation,
    headline: headline.id,
    size,
    level,
    threat,
    xp,
    goldMin,
    goldMax,
    hasQuestTarget,
    title: titleFor(rarity, roster, headline),
  }
}

/** How many sightings a rotation turns up — three or four. */
function offerCount(rng: Rng): number {
  return rng() < 0.5 ? 4 : 3
}

function rollRarity(rng: Rng): Rarity {
  return pickWeighted(
    rng,
    RARITY_ORDER.map((id) => ({ value: id, weight: RARITIES[id].weight })),
  )
}

function buildOffers(
  regionId: string,
  rng: Rng,
  playerLevel: number,
  targets: Set<string>,
  startId: number,
): { offers: Offer[]; nextId: number } {
  const count = offerCount(rng)
  const offers: Offer[] = []
  let nextId = startId
  // A board reads as variety: a champion (rare) or the apex is a *highlight*,
  // capped at one apiece, and no two ordinary packs share the same headline.
  let rares = 0
  let apexes = 0
  const usedHeadlines = new Set<string>()
  for (let i = 0; i < count; i++) {
    let rarity = rollRarity(rng)
    if (rarity === 'apex' && apexes >= 1) rarity = rares < 1 ? 'rare' : 'uncommon'
    if (rarity === 'rare' && rares >= 1) rarity = 'uncommon'

    let offer = makeOffer(regionId, rarity, rng, playerLevel, targets, nextId)
    // For ordinary packs, retry a few times to avoid a duplicate headline mob.
    if (rarity === 'common' || rarity === 'uncommon') {
      for (let tries = 0; tries < 4 && usedHeadlines.has(offer.headline); tries++) {
        offer = makeOffer(regionId, rarity, rng, playerLevel, targets, nextId)
      }
    }

    if (rarity === 'rare') rares++
    if (rarity === 'apex') apexes++
    usedHeadlines.add(offer.headline)
    offers.push(offer)
    nextId++
  }
  return { offers, nextId }
}

/** Open a fresh board on a front. */
export function rollBoard(
  regionId: string,
  rng: Rng,
  playerLevel: number,
  targets: Set<string>,
): FieldState {
  const { offers, nextId } = buildOffers(regionId, rng, playerLevel, targets, 1)
  return { regionId, offers, selectedId: offers[0]?.id ?? null, nextId, rerolls: 0 }
}

/** Rotate the board: a whole new roll of sightings (fresh ids so the UI can
 *  animate the turnover). */
export function rerollBoard(
  state: FieldState,
  rng: Rng,
  playerLevel: number,
  targets: Set<string>,
): FieldState {
  const { offers, nextId } = buildOffers(state.regionId, rng, playerLevel, targets, state.nextId)
  return {
    regionId: state.regionId,
    offers,
    selectedId: offers[0]?.id ?? null,
    nextId,
    rerolls: state.rerolls + 1,
  }
}

/** Mark a sighting to engage. */
export function selectOffer(state: FieldState, id: number): FieldState {
  if (!state.offers.some((o) => o.id === id)) return state
  return { ...state, selectedId: id }
}

/** The sim seam that spawns a sighting exactly. */
export function offerSpec(offer: Offer): FightSpec {
  return offer.spec
}
