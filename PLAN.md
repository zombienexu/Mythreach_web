# PLAN — Mythreach: The Wayfarer Build

## 1. Goal

Remove every offline/idle mechanic, replace never-ending combat with **expeditions**
(a generated trail through each zone you actively walk, node by node, to the boss),
scaffold single-player versions of the future multiplayer features (world boss,
records, hireling companion), lock in engine purity with an enforced contract test,
and re-theme the dashboard from "modern futuristic glass" to **"The Wayfarer's
Atlas"** — candlelit ink-and-gilt cartography.

## 2. Design notes

### Decisions already made — do not re-litigate

- **Auto-battle stays.** It is an active-session assist (tab open, player present)
  and the harness the balance suite drives. Only *away-from-game* progression is
  removed. Under auto-battle the sim also auto-embarks / auto-advances (spec below)
  so headless campaign playthroughs still work.
- **Offline progress is deleted, not disabled**: `fastForward`, `offlineTicks`,
  `OFFLINE_CAP_TICKS`, `OFFLINE_MIN_MS`, `OfflineSummary`, `SaveData.savedAt`,
  `OfflineModal.svelte`, and the offline branch of `boot()` all go away.
- **The kill-counter boss gate is deleted** (`zoneKills`, `BOSS_KILLS_REQUIRED`,
  `bossReady`, `challengeBoss()`). The boss is the final node of every expedition.
- **Expedition state is not persisted** (same rule as mid-combat state today):
  reload → you are at camp.
- **Save version bumps to 2** once, in T2, and later tasks extend the v2 shape.
  `deserialize` accepts v1 saves (ignore `savedAt`, `muted`, `zoneKills`; default
  the new fields). Unknown versions still throw.
- **`muted` moves out of the engine** into a UI-owned localStorage key.
- **RNG becomes a required constructor option** — no `Math.random` default inside
  the engine. The UI passes `Math.random`; tests pass `mulberry32`.
- **Spell tone tokens and the FX layer are untouched by the theme** — spell hues
  are spell identity and work under any chrome.

### The expedition (replaces endless spawning)

A zone is no longer a farm field; it is a **trail**. From **camp** (the
Wayfarer's Rest) you `embark()`. The engine generates a **route** of
`ROUTE_STEPS = 8` nodes plus a final **boss** node (index 8), using the injected
RNG. You **travel** between nodes (`TRAVEL_TICKS = 90`, i.e. 4.5 s), resolve each
node, and press on. Fog of war: a node's kind is hidden (`'unknown'`) until travel
toward it begins; the boss node is always visible. Completing the boss node
completes the expedition (and first time per zone, unlocks the next zone exactly
as `bossDefeated` does today). You may `retreat()` at any point during an
expedition, keeping all loot/XP/gold earned. Death ends the expedition.

**Node kinds** (tagged union, data-interpreted like enemy mechanics):

| kind | weight | on arrival |
|---|---|---|
| `battle` | 46 | spawn an encounter from the zone's existing `encounters` table, `spawnIn = 20` |
| `elite` | 14 | spawn from the zone's new `eliteEncounters` table, `spawnIn = 20`; on clear, one **guaranteed** loot drop, `minRarity: 'uncommon'` |
| `cache` | 14 | resolves instantly: gold = `rollInt(rng, 12, 24) * zoneOrdinal` (1-based zone index); 35% chance of an item at `ilvl = zone.minLevel + 1`, `minRarity: 'uncommon'` |
| `shrine` | 12 | offers 2 distinct blessings not already held (fewer if <2 remain; 0 → node resolves silently) |
| `rest` | 14 | resolves instantly: restore `floor(60%)` of max HP and max mana (capped) |
| `boss` | — | always index 8; `spawnIn = BOSS_APPROACH_TICKS`; spawns the zone boss |

Route generation rules (deterministic given rng): node 0 is always `battle`;
`rest` never directly follows `rest`; `elite` cannot appear at index 0 or 1.
Implement by re-rolling the weighted pick until legal (bounded loop is fine —
legality is always satisfiable because `battle` is always legal).

**Blessings** — expedition-scoped buffs, cleared when the expedition ends
(any outcome). New content file `src/engine/content/blessings.ts`:

| id | name | effect |
|---|---|---|
| `emberheart` | Emberheart | `fireMultPct += 15` |
| `stoneskin` | Stoneskin | `maxHp += 20%` (round), and heal the added amount when gained |
| `springstep` | Springstep | travel time halved (`TRAVEL_TICKS / 2`, integer) |
| `manatide` | Manatide | `regenPerInterval = round(regenPerInterval * 1.5)` |
| `keeneye` | Keen Eye | `critPct += 8` |

Stat blessings apply as a post-derive modifier pass in `refreshStats` (sim holds
`blessings: Set<BlessingId>`); `springstep` is read when travel starts.

**Phases**: sim gains `phase: 'camp' | 'travel' | 'node'`.

- `camp`: no enemies ever; the existing 7%-per-regen-interval heal applies **only
  here** (remove the "heal whenever no enemies" behavior — travel has no heal).
- `travel`: countdown `travelRemaining`; on 0, emit `nodeArrived` and run the
  node's arrival behavior.
- `node`: combat (battle/elite/boss) or resolved-and-waiting. `advance()` is
  legal only when the node is resolved and it isn't the last node.

**API** (all return `boolean` like existing intents): `embark()` (camp only,
player alive), `advance()`, `retreat()` (any time during an expedition; despawn
enemies via the existing `despawnForTransition`), `chooseBlessing(id)` (only
while a shrine offer is pending). `travelTo(zoneId)` is legal **only at camp**.

**Auto-battle behavior** (needed for balance suite + it's the product's echo):
when `autoBattle` is on — at camp, embark after `AUTO_BREATHER_TICKS = 30`; at a
resolved node, advance after the same delay; a pending shrine offer picks the
first choice immediately. Auto never assaults the world boss.

**New events** (extend the `CombatEvent` union):

```
{ kind: 'expeditionStarted'; zoneId: string; nodes: number }
{ kind: 'travelStarted'; toIndex: number; flavor: string }
{ kind: 'nodeArrived'; index: number; nodeKind: NodeKind }
{ kind: 'nodeResolved'; index: number }
{ kind: 'cacheOpened'; gold: number; item: Item | null }
{ kind: 'shrineOffered'; choices: BlessingId[] }
{ kind: 'blessingGained'; id: BlessingId }
{ kind: 'rested'; hpRestored: number; manaRestored: number }
{ kind: 'expeditionEnded'; outcome: 'completed' | 'retreat' | 'death' }
```

`bossReady` event is deleted. `encounterCleared`, `bossDefeated`, `zoneEntered`,
`gameCompleted` stay. `travelStarted.flavor` is picked by rng from the zone's new
`travelLines`. Reuse `goldGained` / `lootDropped` events from inside cache/elite
resolution (they come "for free" from `addGold` / `dropLoot`).

**Snapshot**: `CombatSnapshot` gains `phase` and
`expedition: ExpeditionSnapshot | null` (null at camp):

```ts
interface ExpeditionNodeView {
  kind: NodeKind | 'unknown'          // masked until revealed; boss never masked
  state: 'done' | 'current' | 'ahead'
}
interface ExpeditionSnapshot {
  index: number                        // current/target node index
  total: number                        // ROUTE_STEPS + 1
  traveling: boolean
  travelRemaining: number
  travelTotal: number
  nodeResolved: boolean
  nodes: ExpeditionNodeView[]
  pendingShrine: BlessingId[] | null
  blessings: BlessingId[]
}
```

`ZoneProgress` loses `kills` and `bossReady`.

### Zone content additions (`ZoneDef` gains two fields)

`eliteEncounters: EncounterDef[]` — one entry per zone, weight 1, reusing the
existing heavy mob: hollowroot → `solo('rockmaw-bruiser', 1)`; duskmire →
`solo('mirefiend-brute', 1)`; stormcrag → `solo('crag-behemoth', 1)`;
ashen-wastes → `solo('pyroclast-titan', 1)`; sundered-spire →
`solo('herald-of-malgrath', 1)`.

`travelLines: string[]` — use these exact lines (4 per zone):

- hollowroot: "The tunnel narrows; the dark breathes back.", "Rootlight drips
  from the ceiling like slow rain.", "Something skitters ahead, counting your
  footsteps.", "The path descends. It always descends."
- duskmire: "Mist unspools between the trunks.", "The trees lean in to read
  over your shoulder.", "Wet ground swallows every footfall whole.", "A
  witchlight bobs ahead — do not follow it."
- stormcrag: "The wind files its knives on the ridgeline.", "Thunder rolls
  through stone older than thunder.", "The path clings to the cliff like a
  guilty secret.", "Snow hisses across the trail, erasing you behind."
- ashen-wastes: "Cinders drift upward, as if the sky were the fire.", "The
  ground remembers being lava, and it misses it.", "Heat-shimmer bends the
  horizon into a lie.", "Your footprints fill with embers behind you."
- sundered-spire: "Reality frays at the trail's edge. Mind the seams.", "The
  Spire hums a note only your bones can hear.", "Gravity forgets its manners
  here.", "The stars overhead are in the wrong constellations."

### World boss — "The Rift Colossus" (async world-boss scaffold, local)

Persistent HP pool in the save; the seam where a server would someday own the
pool is one field. New `WorldBossDef` in `src/engine/content/worldboss.ts`:
id `rift-colossus`, name "The Rift Colossus", intro "A wound in the sky takes a
shape, and the shape notices you.", level 15, `hp: 40_000`, swingTicks 30,
dmg 8–14, portrait `{ family: 'titan', hue: 305 }`, mechanics: one hardcast
(name "Riftquake", castTicks 60, cooldownTicks 240, dmg 20–28).

`assaultWorldBoss()` — camp only. Spawns the colossus as the sole enemy (an
`EnemyUnit` built from the def, `rank: 'boss'`) with **current pooled HP**;
`phase` stays a new value `'assault'` (extend the phase union). The fight ends
on: colossus death, player death, or `retreat()`. On end, write surviving HP
back to the pool and emit
`{ kind: 'worldBossAssaultEnded'; damageDealt: number; remaining: number }`.
On death of the colossus emit `{ kind: 'worldBossFelled' }`, grant 500 gold +
one epic item (`generateItem` with `minRarity: 'epic'`, ilvl 16), unlock
achievement `worldboss-felled`, increment `records.worldBossFells`, and reset
the pool to full. `progressSnapshot` gains
`worldBoss: { name: string; hp: number; maxHp: number; fells: number }`.

### Records (leaderboard scaffold, local)

New persisted `records` object (engine-owned, in save v2):

```ts
interface Records {
  expeditionsCompleted: number
  worldBossFells: number
  bestAssaultDamage: number
  fastestBossKills: Record<string, number>   // zoneId → ticks from boss spawn to kill
}
```

Track boss-fight start on the tick the boss spawns; on kill, record
`min(existing, elapsed)`. Expose on `ProgressSnapshot.records`. Two new
achievements in `content/achievements.ts`: `worldboss-felled` ("Riftbreaker" —
"Fell the Rift Colossus") and `expeditions-10` ("Wayfarer" — "Complete 10
expeditions").

### Companion — "hiring heroes" scaffold (single-player hireling)

New `src/engine/content/companions.ts`: one `CompanionDef`:
`{ id: 'wren', name: 'Wren the Emberblade', epithet: 'a sellsword with a debt to the dark', cost: 150, swingTicks: 26, baseDmg: 3, dmgPerLevel: 1 }`.
`hireCompanion()` — camp only, costs `cost` gold, persists `companionId` in the
save, emits `{ kind: 'companionHired'; id: string; name: string }`. While hired,
during any combat (battle/elite/boss/assault) the companion swings at the
**player's current target** on its own timer for
`rollInt(rng, d - 2, d + 2)` where `d = baseDmg + dmgPerLevel * playerLevel`
(min 1), never crits, takes no damage (scaffold — HP comes later). Damage flows
through the normal `damage` event with new `DamageSource` member `'companion'`.
`CombatSnapshot` gains `companion: { name: string; swingProgress: number } | null`;
`ProgressSnapshot` gains `companion: { id: string; name: string } | null`.

### Theme — "The Wayfarer's Atlas"

Direction: keep the night-sky dashboard, but the material shifts from *glass HUD*
to *enchanted cartography* — smoked vellum panes with gilt hairlines, wax-seal
action buttons, illuminated nav initials, a constellation star-chart with
fireflies instead of neon blobs. Not medieval cosplay: Inter stays for body and
numbers; Fraunces spreads to buttons, nav, and labels.

Exact token changes in `src/ui/styles/tokens.css` (values are final — do not
invent others):

```css
--void: oklch(0.13 0.03 290);
--void-deep: oklch(0.09 0.035 305);
--glass: oklch(0.5 0.05 75 / 0.07);
--glass-edge: oklch(0.78 0.08 82 / 0.25);
--glass-fallback: oklch(0.18 0.03 75 / 0.94);
--text: oklch(0.93 0.02 85);
--text-dim: oklch(0.67 0.03 80);
--gilt: oklch(0.78 0.1 85);            /* NEW: chrome ornament; never a reward */
--seal: oklch(0.5 0.15 30);            /* NEW: wax-seal primary actions */
--radius: 10px;
--radius-sm: 6px;
```

All other tokens (trio, vitals, rarities, spell tones, motion) unchanged.

- `base.css`: `.glass::before` edge gradient re-tinted with gilt
  (`oklch(0.85 0.08 85 / 0.3)` → `var(--glass-edge)` → `oklch(0.7 0.07 82 / 0.06)`);
  add `.glass::after` — a full-bleed grain overlay (tileable SVG `feTurbulence`
  data-URI like the existing `.stars` one, `opacity: 0.04`,
  `border-radius: inherit`, `pointer-events: none`). Add a shared `.seal`
  button class: `--seal` gradient fill, 1px `--gilt` border,
  `font-family: var(--font-display)`, `letter-spacing: 0.08em`,
  `text-transform: uppercase`, `font-size: 12px`, `border-radius: 8px`; hover
  lifts 1px with a warm glow; `:disabled` at 0.35 opacity. `:focus-visible`
  outline color → `var(--gilt)`.
- `Background.svelte`: keep the void gradient and `.stars` noise. Re-tint the
  three blobs: bottom glow becomes candle-gold (`oklch(0.75 0.1 80 / 0.07)`),
  keep one violet, drop the teal one. Add a `constellations` layer: an inline
  SVG data-URI (~480×480 tile) of 2–3 small star-figures — dots joined by thin
  lines — stroked `#d8b96a` at `opacity: 0.05`. Add six `.firefly` dots (3px,
  `--gilt`, `border-radius: 50%`, staggered slow float-and-flicker keyframes,
  positioned in the lower half). All new animation disabled under
  `prefers-reduced-motion` (the existing global kill-switch already covers it,
  but no `will-change` extravagance).
- `Sidebar.svelte`: nav labels move to `var(--font-display)`; each label's
  `::first-letter` is `font-size: 1.3em; color: var(--gilt)` (illuminated
  initial); active item's indicator uses `--gilt` instead of teal.
- Buttons: `Embark` / `Press on` / `Turn back` / `Assault` / boss-related CTAs
  use `.seal`.

### Engine purity — enforcement

`tests/purity.test.ts` reads every `src/engine/**/*.ts` file (Node `fs` +
`path`, recursive) and asserts:

1. No match for
   `/\b(window|document|localStorage|sessionStorage|navigator|requestAnimationFrame|setTimeout|setInterval|performance|fetch|console)\b/`
   and no `Date.now` / `new Date` / `Math.random`.
2. No import specifier containing `svelte`, `../ui`, or ending in `.svelte`,
   and no `import` from `pixi` or `gsap`.

This forces T1's changes (rng required, `savedAt` removal) to actually land.

### Files involved (orientation)

Engine: `sim.ts` (major), `types.ts`, `events.ts`, `index.ts`, new
`expedition.ts`, `content/zones.ts`, new `content/blessings.ts`,
`content/worldboss.ts`, `content/companions.ts`, `content/achievements.ts`.
UI: `game.svelte.ts`, `loop.ts`, `views/CombatView.svelte`, `views/AtlasView.svelte`,
`views/ChronicleView.svelte`, new `components/TrailRibbon.svelte`, delete
`components/OfflineModal.svelte`, `components/Sidebar.svelte`, `components/Background.svelte`,
`styles/tokens.css`, `styles/base.css`, `fx/director.ts` (one fallback guard).
Tests: all of `tests/` compiles against the new API; new `purity.test.ts`,
`expedition.test.ts`, `worldboss.test.ts`, `companion.test.ts`; `save.test.ts`,
`zones.test.ts`, `balance.test.ts`, `helpers.ts` rewritten in place.

## 3. Tasks

Work in order. After every task: run the test command (§4) and keep it green —
except where a task's note says a later task restores green (T2/T3 pair only).

### T1 — Engine purity: required RNG, no wall clock

- `src/engine/sim.ts`: make `rng` required (`SimOptions.rng: Rng`); delete the
  `Math.random` fallback. `serialize()` stops writing `savedAt` (full removal of
  the field happens in T2 with the version bump — for this task just delete the
  `Date.now()` call and the property together; T2 owns the version number).
  Temporarily keep `version: 1` writing until T2 if needed to stay green.
- `src/ui/game.svelte.ts`: `new GameSim({ rng: Math.random })` in `boot()`.
- New `tests/purity.test.ts` as specified in §2 (two `it` cases: "engine sources
  are free of ambient globals", "engine sources import nothing from the UI world").
- Acceptance: `purity.test.ts` both cases pass; whole suite green.

### T2 — Delete offline progression (engine)

- `src/engine/sim.ts`: delete `fastForward`, `offlineTicks`. Delete
  `OFFLINE_CAP_TICKS`, `OFFLINE_MIN_MS`, `OfflineSummary` from `types.ts` and
  `index.ts`. `SaveData` → `version: 2`, no `savedAt`, no `muted`.
  `deserialize` accepts `version === 1 || version === 2` (v1: ignore extra
  fields), throws otherwise. `muted` property removed from `GameSim`.
- `tests/save.test.ts`: delete the whole `offline progress` describe block; add
  `it('accepts a version-1 save and ignores its dead fields')` (build a v1-shaped
  object with `savedAt`, `muted`, `zoneKills` present; deserialize; expect level/
  gold round-trip and no throw) and keep the version-99 rejection test.
- `tests/helpers.ts`: `blankSave` → v2 shape (keep a `v1Save()` helper for the
  migration test).
- Acceptance: `save.test.ts` green with the new cases; `grep -r "fastForward\|OFFLINE" src/` finds nothing.

### T3 — Delete offline progression (UI) + clamp the loop

- `src/ui/game.svelte.ts`: `boot()` loses the elapsed/fastForward branch and the
  `offline` field; delete `dismissOffline`, the `offline` state, and the "While
  you were away" log line. `muted` now reads/writes localStorage key
  `mythreach-settings-v1` (JSON `{ muted: boolean }`) — engine untouched.
- Delete `src/ui/components/OfflineModal.svelte` and its usage in `App.svelte`.
- `src/ui/loop.ts`: `MAX_FRAME_MS = 250` (a hidden tab resumes with at most 5
  ticks of catch-up; comment updated to say absence must not progress the game).
- Acceptance: `npm run check` green; `grep -ri "offline" src/` returns nothing.

### T4 — Expedition types, constants, events

- `src/engine/types.ts`: `NodeKind = 'battle' | 'elite' | 'cache' | 'shrine' | 'rest' | 'boss'`;
  `BlessingId`; `ExpeditionNodeView`, `ExpeditionSnapshot`, `Records` (§2);
  constants `ROUTE_STEPS = 8`, `TRAVEL_TICKS = 90`, `AUTO_BREATHER_TICKS = 30`,
  `NODE_SPAWN_TICKS = 20`; delete `BOSS_KILLS_REQUIRED`, `SPAWN_GAP_TICKS`.
  `ZoneDef` gains `eliteEncounters: EncounterDef[]`, `travelLines: string[]`.
  `ZoneProgress` loses `kills`/`bossReady`. `CombatSnapshot` gains
  `phase: 'camp' | 'travel' | 'node' | 'assault'` and `expedition`.
  `SaveData` v2 gains `records: Records`, `worldBossHp: number`,
  `companionId: string | null`; loses `zoneKills`.
- `src/engine/events.ts`: add the nine expedition events, plus
  `worldBossAssaultEnded`, `worldBossFelled`, `companionHired`; delete
  `bossReady`; add `'companion'` to `DamageSource`.
- `src/engine/content/blessings.ts`: `BLESSINGS` record + `BLESSING_IDS`, per §2
  (`{ id, name, description }` + the effect encoded as data:
  `{ stat: 'fireMultPct' | 'critPct', add: number } | { kind: 'maxHpPct', pct: 20 } | { kind: 'regenMult', mult: 1.5 } | { kind: 'travelMult', mult: 0.5 }` —
  any encoding is fine as long as `sim.ts` interprets data, not per-blessing code
  branches).
- `src/engine/content/zones.ts`: add `eliteEncounters` + `travelLines` to all
  five zones with the exact data in §2. Update `tests/helpers.ts` `testContent`
  zones with `eliteEncounters: [{ slots: [{ enemyId: 'dummy' }], weight: 1 }]`
  and `travelLines: ['the road stretches on']` (both zones).
- Acceptance: `npm run check` compiles the engine (UI/tests may be red until T5–T7;
  land T4–T7 as one green unit if intermediate compiles are impractical).

### T5 — Route generation

- New `src/engine/expedition.ts`: `generateRoute(rng: Rng, zone: ZoneDef): NodeKind[]`
  returning `ROUTE_STEPS + 1` kinds obeying §2 rules (index 0 `battle`, last
  `boss`, no `rest` after `rest`, no `elite` before index 2), weights
  battle 46 / elite 14 / cache 14 / shrine 12 / rest 14 via `pickWeighted`.
- New `tests/expedition.test.ts`, describe `generateRoute`:
  - `it('always starts with a battle and ends with the boss')` — 200 seeded
    routes; `route[0] === 'battle'`, `route.at(-1) === 'boss'`, length 9.
  - `it('never places rest after rest nor an early elite')` — same 200 routes;
    no `rest,rest` adjacency; no `elite` at index 0 or 1.
  - `it('is deterministic for a given rng seed')` — same seed twice → deep-equal.

### T6 — Expedition state machine in the sim

The big one. `src/engine/sim.ts`:

- Replace the endless-spawn fields (`spawnIn` repurposed as the arrival
  countdown, `spawnKind` deleted) with `phase`, `route: NodeKind[] | null`,
  `nodeIndex`, `nodeResolvedFlag`, `travelRemaining/travelTotal`,
  `revealedThrough: number`, `pendingShrine: BlessingId[] | null`,
  `blessings: Set<BlessingId>`, `autoBreather` counter.
- Constructor starts at `phase: 'camp'` (no auto first spawn).
- `embark/advance/retreat/chooseBlessing` per §2. `onEncounterCleared` →
  emit `encounterCleared` + `nodeResolved` (plus elite's guaranteed drop);
  no respawn scheduling. Boss kill → also `expeditionEnded {completed}`,
  `records.expeditionsCompleted++`, achievement check `expeditions-10`,
  blessings cleared, phase `camp`. `onPlayerDied` → if mid-expedition,
  `expeditionEnded {death}` and clear route/blessings; respawn is at camp.
- Camp heal: the 7%/interval heal runs only in `phase === 'camp'`.
- Auto-battle auto-embark / auto-advance / auto-first-blessing per §2.
- `travelTo` camp-only. Boss intro flow: `nodeArrived {kind:'boss'}` then
  `BOSS_APPROACH_TICKS` countdown then spawn (reuse existing boss spawn path).
- Blessing modifiers applied in `refreshStats` (post-derive), springstep at
  `travelStarted`.
- Snapshot per §2 (`phase`, `expedition`, masked node kinds).
- Tests, in `tests/expedition.test.ts` (use `makeSim` + updated helpers):
  - `it('boots at camp with no enemies and embark generates a 9-node route')` —
    snapshot: `phase 'camp'`, `expedition null`; after `embark()`:
    `expedition.total === 9`, `traveling === true`, `expeditionStarted` +
    `travelStarted` events emitted.
  - `it('travel takes TRAVEL_TICKS and arrives at a battle that spawns in NODE_SPAWN_TICKS')` —
    advance exactly `TRAVEL_TICKS`; expect `nodeArrived {index 0, battle}`;
    advance `NODE_SPAWN_TICKS`; enemies on field.
  - `it('clearing the pack resolves the node and advance() starts the next travel')` —
    kill the dummy (autoBattle or direct casts); expect `nodeResolved`; `advance()`
    true; `travelStarted {toIndex: 1}` with a flavor from `travelLines`.
  - `it('advance() is refused mid-combat and at camp')`.
  - `it('cache pays gold, rest restores, shrine offers and chooseBlessing applies')` —
    build a rigged route by seeding: instead of seed-hunting, expose a
    test-only `content` route via... **do not** add test backdoors; instead
    iterate seeds 1..50 in the test to find a route containing each kind
    (helper `routeOf(seed)` calling `generateRoute` directly), then drive the
    sim with that seed. Assert `cacheOpened.gold > 0`; after rest at low HP,
    hp increased; after `chooseBlessing('emberheart')`,
    `expedition.blessings` contains it and a fireball hits harder than the
    unblessed baseline (compare two sims, same seed, one blessed).
  - `it('retreat returns to camp keeping loot and clears blessings')`.
  - `it('death ends the expedition and respawns at camp')`.
  - `it('boss node completes the expedition, unlocks the next zone, and returns to camp')` —
    drive with autoBattle on test content until `expeditionEnded {completed}`;
    expect `bossDefeated` emitted once, `records.expeditionsCompleted === 1`,
    phase camp.
  - `it('node kinds ahead are masked as unknown except the boss')`.
  - `it('under autoBattle a full route runs hands-free')` — autoBattle on;
    advance ≤ 20_000 ticks; expect ≥1 `expeditionEnded {completed}`.

### T7 — Rewrite the affected suites + helpers

- `tests/helpers.ts`: `advanceToSpawn` now: if at camp, `sim.embark()`; then
  tick (bound 400) until enemies are on field. `makeSim` unchanged otherwise.
- `tests/zones.test.ts`: replace kill-counter/`challengeBoss` flow tests with
  expedition-based zone flow (zone 2 locked until zone 1 expedition completed;
  `travelTo` refused mid-expedition; refused for locked zones).
- `tests/encounters.test.ts`, `tests/enemies.test.ts`, `tests/abilities.test.ts`,
  `tests/spells.test.ts`: mechanical adaptation — anywhere a test waited for an
  auto-respawn between packs, it now embarks/advances; timing assertions about
  casts/GCD/dots are unchanged.
- `tests/balance.test.ts`: `playCampaign` drops `challengeBoss`/`bossReady`
  logic (auto-battle handles embark/advance); zone-hop when `bossDefeated`.
  New envelope: `done === true`, `hours > 0.5 && hours < 3`, `deaths < 25`;
  first boss `< 15` minutes with `≤ 2` deaths. **If the envelope fails**, tune
  only `TRAVEL_TICKS` (within 60–120) and/or elite weight (10–16); do not touch
  enemy stats or XP.
- Acceptance: full suite green.

### T8 — World boss (engine)

- `src/engine/content/worldboss.ts` per §2; sim: `worldBossHp` persisted state,
  `assaultWorldBoss()`, `'assault'` phase behavior, pool write-back, fell reward,
  `records.worldBossFells` / `bestAssaultDamage`, achievement `worldboss-felled`
  (also add both new achievements to `content/achievements.ts` here).
  `retreat()` also ends an assault. `progressSnapshot().worldBoss` per §2.
- New `tests/worldboss.test.ts`:
  - `it('assault spawns the colossus at its pooled hp and retreat banks the damage')` —
    assault, land a fireball, retreat; expect `worldBossAssaultEnded.damageDealt > 0`
    and `progressSnapshot().worldBoss.hp === maxHp - damageDealt`; a second
    assault spawns at the reduced HP.
  - `it('death during an assault also banks the damage')`.
  - `it('felling it pays 500 gold, an epic, the achievement, and resets the pool')` —
    cheat the pool low via a save with `worldBossHp: 10`, fell it, assert all
    four plus `records.worldBossFells === 1`.
  - `it('assault is refused mid-expedition')`.

### T9 — Records (engine + Chronicle)

- Sim: `fastestBossKills` tracking (boss spawn tick → kill tick, per zone,
  min-wins), already-added counters wired; `ProgressSnapshot.records`.
- `ChronicleView.svelte`: a "Records" panel listing expeditions completed,
  world-boss fells, best assault damage, and per-zone fastest boss kill
  (`ticksToClock`), rendered only for zones with an entry.
- Test (in `expedition.test.ts`): `it('records the fastest boss kill per zone and keeps the minimum')` —
  complete the test-zone boss twice with different kill speeds (slow: wait
  before casting), assert the smaller value is kept.

### T10 — Companion (engine)

- `content/companions.ts` + `hireCompanion()` + swing loop + snapshots + save
  field per §2.
- New `tests/companion.test.ts`:
  - `it('hiring costs gold, persists, and survives a save round-trip')`.
  - `it('the companion swings at the player target on its own clock')` —
    hire, embark to a battle node, advance `swingTicks`; expect a `damage`
    event with `source: 'companion'` and amount within `d±2` bounds.
  - `it('the companion is idle at camp and during travel')` — no companion
    damage events outside combat.
  - `it('companion damage can finish a kill and rewards flow normally')`.

### T11 — Expedition UI: the trail

- New `src/ui/components/TrailRibbon.svelte`: horizontal ribbon of node sigils —
  glyph map `battle ⚔ / elite ☠ / cache ✦ / shrine ❖ / rest △ / boss ♛ / unknown ?` —
  states styled: `done` dimmed with a strike-dot, `current` glowing (`--gilt`),
  `ahead` faint. A position marker (small gilt diamond) sits under the current
  node and, while traveling, slides from node *i* to *i+1* via a CSS
  `left`-percentage transition driven by `travelRemaining / travelTotal`.
  Props: `expedition: ExpeditionSnapshot`.
- `CombatView.svelte`: zone banner's kill-pips/Challenge block replaced by the
  ribbon (when on expedition) or an "at rest" note (camp). The `foes` area by
  phase: camp → "The Wayfarer's Rest" card (`.seal` **Embark** button, plus
  companion-hire button when unhired and world-boss **Assault** button);
  travel → travel card: the flavor line (italic, display font) + a thin
  progress bar; shrine pending → a choice card with one `.seal` button per
  blessing (name + description); node resolved → "**Press on**" (`.seal`) +
  "Turn back" (quiet text button). Boss intro (`BossIntro`) now triggers from
  the `nodeArrived {kind:'boss'}` event.
- `game.svelte.ts`: intents `embark/advance/retreat/chooseBlessing/assault/hire`;
  log lines for every new event (travel flavor logs as `'info'` italic; cache →
  `'gold'`; blessing → `'arcana'`; rested → `'heal'`; expeditionEnded completed →
  `'boss'` "The trail is walked. The Rest welcomes you back."); sfx reuse only
  existing names: nodeArrived elite/boss → `'warn'`/`'boss'`, cacheOpened →
  `'loot'`, blessingGained → `'loot'`, expedition completed → `'level'`.
  Keyboard: `Space` = embark (camp) / advance (resolved node), preventDefault.
- Acceptance: `npm run check` green; suite green.

### T12 — Atlas + world boss UI

- `AtlasView.svelte`: zone cards lose kill counts/boss-ready; show
  `bossDefeated` state and "Travel" (disabled mid-expedition with hint
  "Return to camp first"). New "The Rift Colossus" panel: persistent HP bar
  (uses existing `Bar`), fells count, lore line, `.seal` **Assault** button
  (camp only).
- `fx/director.ts`: guard the spell-registry lookup so a `damage` event whose
  source has no spells-table entry (i.e. `'companion'`) degrades to the plain
  float + card bump path instead of throwing.
- Acceptance: `npm run check` green.

### T13 — Theme tokens + panel material

- `tokens.css` exact values from §2; `base.css` edge/grain/`.seal`/focus
  changes from §2.
- Acceptance: `npm run check` green (CSS-only task otherwise).

### T14 — Theme: background + sidebar + button sweep

- `Background.svelte` (constellations, candle-gold blob, fireflies) and
  `Sidebar.svelte` (display font, illuminated initials, gilt indicator) per §2;
  apply `.seal` to the CTAs listed in §2.
- Acceptance: `npm run check` green; `npm run shots` (if Playwright is
  installed) regenerates `docs/shot-*.png` — otherwise skip and say so.

### T15 — Docs

- `README.md`: tagline and pillar 4 rewritten (the game is now *active-only*:
  "your absence is respected by the world simply waiting for you"); "Idle layer"
  section replaced by an "Expeditions" section; offline claims removed; world
  boss/records/companion get a "scaffolds of the multiplayer future" paragraph;
  architecture section updated (rng required, save v2). Update the test-count
  sentence to whatever `npm test` reports.
- `docs/EXTENDING.md`: three new cookbook entries — "Add a node kind", "Add a
  blessing", "Add a companion" (pattern: content object + one union member +
  the sim's interpreter switch + a test).
- Acceptance: `grep -i "offline\|idle when" README.md` finds no stale claims
  (the tagline must change).

## 4. Test command

```sh
export PATH="$HOME/.local/node/bin:$PATH"   # Node lives in ~/.local/node
npm test && npm run check
```

Both must be green at the end of every task (T4–T7 may land as one unit).

## 5. Review checklist

- [ ] `tests/purity.test.ts` exists and would actually catch a `Date.now` in the engine (try one mentally).
- [ ] `grep -ri "offline\|fastForward\|savedAt" src/` — zero hits.
- [ ] Save v1 → v2 migration test present; v2 shape has records/worldBossHp/companionId and no zoneKills/savedAt/muted.
- [ ] Expedition: route rules pinned by tests; fog-of-war masking asserted; retreat/death/completion all covered; auto-battle full-route test present.
- [ ] Balance envelope passes and any tuning stayed inside the permitted knobs (TRAVEL_TICKS 60–120, elite weight 10–16).
- [ ] World-boss pool write-back on retreat *and* death; pool resets on fell.
- [ ] Companion damage uses the event pipeline (no direct UI coupling); FX director has the unknown-source guard.
- [ ] Theme: only the §2 tokens changed; spell tones untouched; reduced-motion still kills fireflies/constellation drift; `.seal` used on all primary CTAs.
- [ ] README no longer promises idle/offline anything.
