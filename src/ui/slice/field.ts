/** THE FIELD — the exploration layer. Venturing a front turns up 4–6
 *  *sightings*: detected mob groups **scattered across the ground in front of
 *  you**, each with its stats laid bare — rarity, the pack, its level, the XP
 *  and coin it will pay. You walk up to one and engage it; when the ground is
 *  clear, the whole field **rotates** to a fresh screen. Most sightings are
 *  common rabble, but each front hides rare champions and a rare **apex**
 *  world-boss — so every rotation carries the thrill of what might surface.
 *
 *  The scatter is the tactic. Groups mostly stand well apart, but a roll will
 *  occasionally set two of them shoulder to shoulder, and pulling one inside
 *  `AGGRO_RADIUS` of the other brings *both* down on you (see `clusterOf`).
 *  Aggro is direct-radius only, never transitive — you must be able to read the
 *  danger off the screen with your eyes, not simulate a chain reaction.
 *
 *  Grinders chase the fattest XP; questers wait for the rotation that turns up
 *  their quarry; boss-hunters watch for the apex. This module is pure: state in,
 *  state out, driven by an injected `Rng`. The Game holds a `FieldState` and
 *  re-derives it here, then spawns the engaged cluster through
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

/** How close two sightings must stand before engaging one drags the other into
 *  the same fight. Normalized field units — the field is 0..1 on both axes —
 *  tuned for the 4–6 groups a screen turns up: tight enough that a group is
 *  normally its own fight, wide enough that a huddled pair reads unmistakably
 *  as "those two come together" at a glance. */
export const AGGRO_RADIUS = 0.19

/** The spacing the scatter aims for between sightings — comfortably outside
 *  `AGGRO_RADIUS`, so an *accidental* double-pull is rare and an intended one
 *  is legible. */
export const MIN_SEPARATION = 0.3

/** Roughly one screen in three deliberately huddles one pair inside
 *  `AGGRO_RADIUS`. Without it the field is all safe singles and the aggro rule
 *  never bites; with it, every screen is worth reading before you commit. */
const CLOSE_PAIR_CHANCE = 1 / 3

/** Bounded rejection sampling: after this many misses we settle for the
 *  roomiest spot we saw, so placement always terminates. */
const PLACE_TRIES = 64

/** Angle attempts when huddling a pair, so the newcomer lands beside the anchor
 *  without shouldering a *third* group. */
const HUDDLE_TRIES = 8

/** A huddled pair still stands as two groups, never one blob. */
const MIN_HUDDLE_GAP = 0.07

/** The most mobs one engagement may spawn. A freak cluster should be a hard
 *  fight, not a wall of bodies — the merged roster is cut here. */
export const MAX_CLUSTER_MOBS = 8

/** Playable ground, normalized. x runs left→right; y runs back→front (0 is the
 *  far horizon, 1 is right in front of the hero), so the UI can map y straight
 *  onto depth: scale, overlap order and haze. Margins keep figures off the
 *  screen edges. */
const FIELD_X: readonly [number, number] = [0.06, 0.94]
const FIELD_Y: readonly [number, number] = [0.12, 0.88]

interface Spot {
  x: number
  y: number
}

function distance(a: Spot, b: Spot): number {
  return Math.hypot(a.x - b.x, a.y - b.y)
}

function lerp(range: readonly [number, number], t: number): number {
  return range[0] + t * (range[1] - range[0])
}

function clampTo(n: number, range: readonly [number, number]): number {
  return n < range[0] ? range[0] : n > range[1] ? range[1] : n
}

/** How much room a candidate spot has. `gap` is the raw nearest-neighbour
 *  distance (what acceptance tests); `score` halves the distance to an apex, so
 *  when we fall back to "best we saw" we never shoulder a warband onto the
 *  world-boss. */
function roomAt(spot: Spot, placed: readonly Offer[]): { gap: number; score: number } {
  let gap = Infinity
  let score = Infinity
  for (const p of placed) {
    const d = distance(spot, p)
    if (d < gap) gap = d
    const weighted = p.rarity === 'apex' ? d * 0.5 : d
    if (weighted < score) score = weighted
  }
  return { gap, score }
}

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
  /** where the group stands on the field, normalized 0..1 (x: left→right,
   *  y: back→front). Assigned at roll time so it is stable per sighting. */
  x: number
  y: number
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
    // filled in by `scatter` once the whole screen is known — placement is a
    // property of the screen, not of any one sighting.
    x: 0,
    y: 0,
  }
}

/** How many sightings a rotation turns up — four to six scattered groups. */
function offerCount(rng: Rng): number {
  return rollInt(rng, 4, 6)
}

/** Stand the screen's sightings on the ground.
 *
 *  Apexes are placed first with full separation: the world-boss must never be
 *  the thing you *accidentally* pulled while clearing rabble. The rest are
 *  rejection-sampled against `MIN_SEPARATION` with a bounded retry count (worst
 *  case: the roomiest of `PLACE_TRIES` candidates), then — about a third of the
 *  time — one ordinary pair is deliberately shoved together inside
 *  `AGGRO_RADIUS` so the screen has a decision in it. */
function scatter(offers: Offer[], rng: Rng): void {
  const order = offers
    .map((_, i) => i)
    .sort((a, b) => Number(offers[b]!.rarity === 'apex') - Number(offers[a]!.rarity === 'apex'))
  const placed: Offer[] = []
  for (const i of order) {
    const offer = offers[i]!
    let best: Spot = { x: lerp(FIELD_X, 0.5), y: lerp(FIELD_Y, 0.5) }
    let bestScore = -Infinity
    for (let t = 0; t < PLACE_TRIES; t++) {
      const spot: Spot = { x: lerp(FIELD_X, rng()), y: lerp(FIELD_Y, rng()) }
      const { gap, score } = roomAt(spot, placed)
      if (gap >= MIN_SEPARATION) {
        best = spot
        break
      }
      if (score > bestScore) {
        bestScore = score
        best = spot
      }
    }
    offer.x = best.x
    offer.y = best.y
    placed.push(offer)
  }
  // Always burn the roll so the stream stays aligned across screens.
  if (rng() < CLOSE_PAIR_CHANCE) huddlePair(offers, rng)
}

/** Slide one ordinary sighting onto another's shoulder — inside the pull radius
 *  but never on top of it. Apexes are excluded on both ends: a lone world-boss
 *  plus a warband is not a fight, it is a mugging. */
function huddlePair(offers: Offer[], rng: Rng): void {
  const loose = offers.filter((o) => o.rarity !== 'apex')
  if (loose.length < 2) return
  const anchor = pickOne(rng, loose)
  const mover = pickOne(
    rng,
    loose.filter((o) => o !== anchor),
  )
  const bystanders = offers.filter((o) => o !== anchor && o !== mover)
  const radius = AGGRO_RADIUS * (0.45 + rng() * 0.4)
  let best: Spot = { x: mover.x, y: mover.y }
  let bestScore = -Infinity
  for (let t = 0; t < HUDDLE_TRIES; t++) {
    const angle = rng() * Math.PI * 2
    // clamping into the field only ever pulls the spot *closer* to the anchor
    // (projection onto a box the anchor already sits in), so it stays in radius.
    const spot: Spot = {
      x: clampTo(anchor.x + Math.cos(angle) * radius, FIELD_X),
      y: clampTo(anchor.y + Math.sin(angle) * radius, FIELD_Y),
    }
    if (distance(spot, anchor) < MIN_HUDDLE_GAP) continue
    const { gap } = roomAt(spot, bystanders)
    if (gap >= MIN_SEPARATION) {
      best = spot
      break
    }
    if (gap > bestScore) {
      bestScore = gap
      best = spot
    }
  }
  mover.x = best.x
  mover.y = best.y
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
  scatter(offers, rng)
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

/** Rotate the field: the **next screen** — a whole new roll of scattered
 *  sightings (fresh ids so the UI can animate the turnover). */
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

/** The sim seam that spawns a sighting exactly — the group alone, ignoring who
 *  else is standing nearby. Use `clusterSpec` for an actual engagement. */
export function offerSpec(offer: Offer): FightSpec {
  return offer.spec
}

/** Every sighting that would join a fight with `id` — the engaged group first,
 *  then anything standing inside `AGGRO_RADIUS` of it, in board order.
 *
 *  Direct radius only: a neighbour's neighbour does **not** chain in. The player
 *  has to be able to reason about the pull by looking at the field, and a
 *  transitive rule turns one careless step into a screen-wide avalanche. */
export function clusterOf(state: FieldState, id: number): Offer[] {
  const lead = state.offers.find((o) => o.id === id)
  if (!lead) return []
  return [lead, ...state.offers.filter((o) => o.id !== id && distance(o, lead) <= AGGRO_RADIUS)]
}

/** The merged enemy roster for engaging `id`: the whole cluster's mobs, engaged
 *  group first, cut at `MAX_CLUSTER_MOBS`. */
export function clusterRosterOf(state: FieldState, id: number): string[] {
  const roster: string[] = []
  for (const offer of clusterOf(state, id)) roster.push(...offer.roster)
  return roster.slice(0, MAX_CLUSTER_MOBS)
}

/** The spawn for engaging `id` — always an explicit roster, so the sim brings
 *  the whole cluster in as one pack rather than the engaged group alone.
 *  An unknown id yields an empty roster (nothing to fight). */
export function clusterSpec(state: FieldState, id: number): FightSpec {
  return { enemyIds: clusterRosterOf(state, id) }
}
