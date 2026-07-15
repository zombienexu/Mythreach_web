# PLAN — Mythreach: Discrete Fights with Loot, and Quests

## 1. Goal

Replace endless auto-spawning combat with **discrete, player-started fights** that end on a
**loot screen** (collect per corpse, or `R` to loot all), and add a **Quests tab** where
travelers ask you to kill mobs or collect materials in a specific region for XP / gold /
gear. To feed the quests, the three merged regions **un-merge back into five** (one per
source zone) with new materials and a few new mobs.

## 2. Design notes

### Decisions already made — do not re-litigate

**Fight loop.** The phase machine becomes `'idle' | 'combat' | 'looting' | 'assault'`:

- A fresh sim (and every deserialized sim) starts in **`idle`** with an empty field. Nothing
  spawns on its own. `startFight()` (player intent; requires `idle` + alive) rolls
  elite-vs-normal (12% elite, as today), picks a weighted encounter, and spawns it
  **immediately** — no countdown. `pendingSpawn`, `spawnIn`, `scheduleSpawn`,
  `spawnPending`, and the `NODE_SPAWN_TICKS` constant are **deleted**; the snapshot field
  `spawnIn` is deleted too.
- **XP is paid instantly at each kill** (mid-fight level-ups stay). **Gold, the item roll,
  and the material roll move into a `LootBundle`** stored on the corpse. Bundles are rolled
  at death time (RNG order: gold, then item, then material — keep it deterministic).
- When the last living mob dies: push `encounterCleared`, phase → **`looting`**, corpses
  stay on the field holding their bundles. The 25% clear-heal stays; the player's venom DoT
  is cleared (you won the fight — nothing keeps gnawing you on the loot screen); an
  offensive queued ability is cleared (as today).
- `collectLoot(iid)` (only in `looting`) pays that corpse's bundle; `collectAllLoot()` pays
  every remaining bundle. When the last bundle is paid: field empties, target nulls,
  phase → `idle`. No new event for the idle transition — the UI reads phase.
- **Loot is never destroyed.** Every field-clearing transition auto-collects all pending
  bundles first: player death, `enterRegion`, `assaultWorldBoss`. The loot screen is
  pacing, not risk. (Uncollected loot IS lost on page reload — in-combat state has never
  been persisted; acceptable.)
- Player death: auto-collect, field clears, phase → `idle`; respawn timer as today; after
  revive you stay in `idle` and click to fight again.
- `enterRegion` is now allowed in `idle`/`looting`/`combat` (refused only mid-`assault`),
  auto-collects, and lands you in `idle` in the new region. `hireCompanion` likewise:
  allowed whenever `phase !== 'assault'`.
- **Assault is unchanged in spirit**: `assaultWorldBoss()` allowed whenever
  `phase !== 'assault'` and alive; auto-collects first. Assault kills keep paying
  **instantly** (no loot screen for the Colossus); assault end (kill/death/retreat) →
  phase `idle`.
- The idle/looting breather keeps the between-pack regen heal: the 8%-per-interval heal now
  applies when `phase === 'idle' || phase === 'looting'` (was: combat + empty field).
- **Auto-battle keeps working end-to-end** (the balance test depends on it). New constant
  `AUTO_REST_TICKS = 20` in `types.ts`. Sim keeps `private restIn = 0`; set
  `restIn = AUTO_REST_TICKS` on every transition **into** `idle`; decrement in `tick()`
  while idle. `autoAct()` gains, at the top (after the `!p.alive` return):
  - `looting` → `collectAllLoot()`, return.
  - `idle` → run the renew heal check (hp ≤ 60 → renew, as in the existing heal lines);
    then if `restIn === 0 && p.cast === null` → `startFight()`; return.
  This reproduces the old ~1 s breather so the balance envelope holds.
- Companion: change its idle gate from `this.enemies.length === 0` to
  `this.living.length === 0` (corpses on the loot screen must not be "targets"; timer
  resets while looting/idle).

**LootBundle shape** (material names are resolved at roll time — `EnemyUnit` has no content
access):

```ts
export interface LootBundle {
  gold: number
  items: Item[] // 0 or 1 today
  materials: Array<{ id: string; name: string; count: number }>
}
```

`EnemyUnit` gains `loot: LootBundle | null = null`; `EnemySnapshot` gains
`loot: LootBundle | null` (copy it in `snapshot()`). Epic tracking
(`lifetime.epicsFound`, the `epic-find` achievement) moves to **collect time**: extract a
`private receiveItem(item: Item): void` from `grantLoot` that does the epic tracking, the
inventory-cap/auto-sell logic, and the `lootDropped` push; `grantLoot` = generate + receive;
paying a bundle = `addGold(gold, 'kill')` + `receiveItem` each item + add materials (push
`materialDropped` per stack, tick collect-quest progress).

**Regions: 3 → 5.** Un-merge to one region per source zone. Region **ids equal the zone
ids** (`hollowroot`, `duskmire`, `stormcrag`, `ashen-wastes`, `sundered-spire`); name,
epithet, hue, and intro are taken from the `ZoneDef`. Tiers and bands:

| id | tier | band | materials |
|---|---|---|---|
| `hollowroot` | low | 1–3 | `mossroot-fiber`, `hollow-bone` |
| `duskmire` | low | 4–6 | `bog-amber` (new), `wisp-residue` (new) |
| `stormcrag` | medium | 7–9 | `storm-quartz`, `drake-scale` (new) |
| `ashen-wastes` | medium | 10–12 | `cinder-ash`, `obsidian-glass` (new) |
| `sundered-spire` | hard | 13–15 | `void-shard`, `rift-essence` |

Bosses stay unspawned (as today); each region uses its zone's `encounters` /
`eliteEncounters` tables plus the new lines below. The `merge()` helper in `regions.ts`
goes away. `RegionTier`/`MaterialTier` stay `'low' | 'medium' | 'hard'` — two regions may
share a tier.

**New enemies are stat-clones.** Five new normal mobs, one per region, each copying the
combat/reward numbers of a named sibling **exactly** (zero balance drift in expectation) with
a new identity. New encounter lines get modest weights. Defined in T3.

**Save migration.** v3 `regionId` values map via
`LEGACY_REGION = { verdant: 'hollowroot', emberwild: 'stormcrag', riftedge: 'sundered-spire' }`.
v1/v2 `zoneId` values are now themselves region ids, so the old `ZONE_TO_REGION` table is
deleted; resolution order in `deserialize`:
`raw.regionId ?? raw.zoneId` → if the content pack has that region, use it → else
`LEGACY_REGION[...]` → else `regions[0]`.

**Quests.** One-shot (non-repeatable) quests from named travelers, all visible from the
start on a Quests tab. The player **accepts** (max **3 active**, `MAX_ACTIVE_QUESTS = 3`),
progress ticks, then **turns in** for the reward. States:
`available → active → complete (objective met, claimable) → done`.

```ts
export type QuestObjective =
  | { kind: 'kill'; enemyId: string | null; count: number } // null = any foe
  | { kind: 'collect'; materialId: string; count: number }
export interface QuestReward {
  xp: number
  gold: number
  gear: { ilvl: number; minRarity: Rarity } | null
}
export interface QuestDef {
  id: string
  name: string
  giver: string
  text: string // the traveler's ask, 1–2 sentences
  regionId: string
  objective: QuestObjective
  reward: QuestReward
}
```

Progress rules (exact, no judgment calls):
- **kill with `enemyId` set**: every kill of that def counts, only while
  `phase === 'combat'` (assault kills never count).
- **kill with `enemyId: null`**: every kill counts while `phase === 'combat'` **and**
  `this.region.id === quest.regionId`.
- **collect**: ticks when the material is **collected from a bundle** (not at drop),
  matching `materialId`, `+= count` of the stack. No region check (materials are
  region-bound anyway). Quest-reward gear / world-boss loot never tick collect quests.
- Progress is capped at `count`. Crossing the threshold pushes `questCompleted` exactly
  once. `turnInQuest(id)` requires progress ≥ count; pays `addXp`, `addGold(…, 'quest')`,
  and `grantLoot(gear.ilvl, gear.minRarity)` if gear is non-null; pushes `questTurnedIn`;
  moves the id to completed. `abandonQuest(id)` drops an active quest (progress lost, back
  to available; no event).

Sim state: `private questProgress: Record<string, number> = {}` (active) and
`private completedQuests = new Set<string>()`. `goldGained`'s `source` union gains
`'quest'`.

**Save v4**: `version: 4`, add `activeQuests: Record<string, number>` and
`completedQuests: string[]`. `deserialize` accepts 1–4; missing quest fields default to
empty; ids not present in `content.quests` are silently dropped (both maps).

**Events added**: `questAccepted { id, name }`, `questCompleted { id, name }`,
`questTurnedIn { id, name }`. No new events for the fight loop — `encounterCleared`,
`goldGained`, `lootDropped`, `materialDropped` fire at their (new) times and already drive
the UI.

**Snapshots**: `CombatSnapshot.phase` widens to the four-phase union and loses `spawnIn`.
`ProgressSnapshot` gains `quests: QuestView[]` (catalog order):

```ts
export type QuestState = 'available' | 'active' | 'complete' | 'done'
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
```
`targetName` = enemy name, material name, or `'any foe'` for kill-any. `progress` is 0 for
available, capped for done.

**UI.** Combat view: in `idle`, the field shows a card with the region's `intro` line and a
**"Start fight"** button (disabled while dead); in `looting`, each dead card grows a loot
panel (gold line, item names tinted by rarity, material stacks) with a **Collect** button,
plus a footer **"Loot all — R"** button; pressing **`r`** loots all (wired in
`game.svelte.ts` `onKeyDown`, alongside `a`; `r` is not an ability key). The
`lastEnemies` corpse-echo hack in `Game` is deleted — corpses are now real sim state.
New **Quests** tab (`View` union + Sidebar NAV between Regions and Chronicle + App TITLES);
Sidebar shows a badge with the count of turn-in-ready quests (same pattern as the talent
badge). Toasts: `questCompleted` → toast "«name» — objective complete" + `loot` sfx;
`questTurnedIn` → toast + `level` sfx; all three quest events mark progress dirty.
`Game.loot`/`lootAll` play the `loot` sfx on success (a gold-only collect is otherwise
silent).

### Files involved

**Engine:** `types.ts` (phase union, LootBundle, quest types, save v4, constants),
`events.ts` (quest events, `'quest'` gold source), `enemyUnit.ts` (loot field + snapshot),
`sim.ts` (state machine, bundles, quests, migration), `content/materials.ts` (4 new),
`content/enemies.ts` (5 new), `content/zones.ts` (new encounter lines),
`content/regions.ts` (rewrite: 5 regions, no merge), `content/quests.ts` (**new**: catalog),
`index.ts` (export new types/consts/content, drop deleted ones).

**UI:** `game.svelte.ts`, `views/CombatView.svelte`, `components/EnemyCard.svelte`,
`views/QuestsView.svelte` (**new**), `components/Sidebar.svelte`, `App.svelte`.

**Tests:** new `tests/looting.test.ts`, `tests/quests.test.ts`; `tests/helpers.ts` reworked;
`tests/encounters.test.ts`, `tests/regions.test.ts`, `tests/save.test.ts`,
`tests/worldboss.test.ts`, `tests/companion.test.ts` updated. `tests/balance.test.ts` is the
**envelope — do not retune it**; if it goes red, stop and flag (see T6).

### Helper reference (already in repo)

`pickWeighted / rollInt / rollPct / pickOne` in `src/engine/rng.ts`; seeded harness +
`makeSim/testContent/blankSave/advance/eventsOf` in `tests/helpers.ts`; `generateItem(rng,
uid, ilvl, { minRarity })` in `content/items.ts`; docs/EXTENDING.md is the content cookbook
("Add an enemy", "Add an encounter").

---

## 3. Tasks

> Do the tasks in order. After **each** task run the test command; a task is done only when
> its tests pass and nothing previously green went red. Keep changes minimal, match existing
> patterns, and flag anything underspecified instead of guessing.

### T1 — Engine: discrete fights + loot bundles

Sub-steps (one commit; the file won't compile between them):

**1a. `types.ts`** — phase union `'idle' | 'combat' | 'looting' | 'assault'` on
`CombatSnapshot.phase`; delete `spawnIn` from `CombatSnapshot`; delete `NODE_SPAWN_TICKS`;
add `export const AUTO_REST_TICKS = 20`; add `LootBundle` (shape above); add
`loot: LootBundle | null` to `EnemySnapshot`.

**1b. `enemyUnit.ts`** — add `loot: LootBundle | null = null`; include
`loot: this.loot` in `snapshot()`.

**1c. `sim.ts`** — per the design notes:
- `private phase: 'idle' | 'combat' | 'looting' | 'assault' = 'idle'`; add
  `private restIn = 0`; delete `spawnIn`/`pendingSpawn`/`scheduleSpawn`/`spawnPending`.
  Constructor no longer schedules anything.
- `startFight(): boolean` — `phase === 'idle' && player.alive` or return false; roll
  `rollPct(rng, 12)` for elite (guarded on a non-empty elite table, as the old
  `scheduleSpawn` did); pick + spawn the pack (reuse the old `spawnPending` body), phase →
  `'combat'`, return true.
- `onEnemyKilled`: keep the assault early-path but make it **fully instant** (gold roll +
  `addXp` + `dropLoot` + old-style instant material roll, then `onWorldBossFelled`). For
  region kills: `addXp(def.xp)` + achievements as today, then roll the bundle onto
  `e.loot` (gold, then `dropPct` item via `generateItem(rng, this.nextUid++, def.level,
  { minRarity: 'common' })`, then the 35% material roll producing `{id, name, count}`).
  When `living.length === 0` → `onEncounterCleared` sets phase `'looting'` (keep the
  event, the 25% heal, queued-clear; add `p.venom = null`); else retarget as today.
- `private receiveItem(item: Item): void` extracted from `grantLoot` (epic tracking +
  cap/auto-sell + `lootDropped` push); `grantLoot` calls it.
- `collectLoot(iid): boolean` / `collectAllLoot(): boolean` and a private
  `payBundle(e)` + `settleField()` (auto-collect-all; used by death/region/assault
  transitions). Last bundle paid → `enemies = []`, `targetIid = null`, phase `'idle'`,
  `restIn = AUTO_REST_TICKS`.
- `onPlayerDied` (non-assault): `settleField()` then clear + phase `'idle'`.
- `enterRegion` / `assaultWorldBoss` / `hireCompanion` preconditions and auto-collect per
  design notes; `endAssault` and `onWorldBossFelled` end in phase `'idle'` (no respawn
  scheduling).
- Regen breather heal condition → `this.phase === 'idle' || this.phase === 'looting'`;
  tick down `restIn` while idle; `companionSwing_` gate → `this.living.length === 0`.
- `autoAct()` additions per design notes.
- `deserialize`: no spawn scheduling (lands in `idle`).

**1d. `index.ts`** — export `LootBundle`, `AUTO_REST_TICKS`; remove `NODE_SPAWN_TICKS`.

**1e. `tests/helpers.ts`** —
- `advanceToSpawn(sim)`: first, if phase is `'looting'` call `sim.collectAllLoot()`; if
  phase is `'idle'` call `sim.startFight()`; then tick (up to 400) until enemies are on the
  field, returning all events. Same name and return type — most tests keep passing.
- New `huntUntil(sim, stop: () => boolean, budget = 8000)`: loop — `advanceToSpawn`, then
  fireball-and-tick until `encounterCleared` (reuse the fight pattern from
  `encounters.test.ts`), then `collectAllLoot()` — until `stop()` or budget ticks; throws
  on budget exhaustion.

**1f. Existing-test updates** (only these):
- `encounters.test.ts`: drop the `NODE_SPAWN_TICKS` import. Rewrite the "endless combat"
  describe → "discrete fights": (1) a new sim idles — phase `'idle'`, 50 ticks spawn
  nothing, `startFight()` returns true then false while fighting; (2) clear a pack →
  phase `'looting'`, `collectAllLoot()` → `'idle'`, `startFight()` again gives fresh iids;
  (3) `enterRegion` tests unchanged except: after entering, call `advanceToSpawn` (helper
  starts the fight); (4) death test: after respawn expect phase `'idle'`, alive, empty
  field, and a successful `startFight()`. "Clearing the pack pays each mob and empties the
  field" → xp assertion (30) stays at clear; add `sim.collectAllLoot()` before asserting
  the empty field, and assert gold arrived only after collecting. Materials tests → use
  `huntUntil(sim, () => sim.progressSnapshot().materials.length > 0)`.
- `worldboss.test.ts`: post-retreat/post-fell phase expectations `'combat'` → `'idle'`.
- `companion.test.ts`: the between-pack idle test — after the pack dies (phase
  `'looting'`), advance 10 ticks and assert the companion lands no hits; fix the stale
  `NODE_SPAWN_TICKS` comment.
- `save.test.ts`: phase-after-load expectations `'combat'` → `'idle'`.

**Acceptance — new `tests/looting.test.ts`** (use `makeSim`/`testContent`; dummy hp 1 or 10
and level 15 for quick kills, `dropPct` per test):
- `'a kill pays xp immediately but banks gold on the corpse'` — kill one dummy
  (goldMin=goldMax so the amount is exact): `xpGained` fired; player gold unchanged;
  snapshot corpse `.loot.gold` equals the enemy's gold; no `goldGained` event yet.
- `'clearing the pack enters looting and keeps the corpses'` — phase `'looting'`,
  `encounterCleared` fired, `enemies.length` intact, all `.alive === false`.
- `'collectLoot pays one corpse; the last collect returns to idle'` — 3-mob pack (reuse the
  VANGUARD pattern): collect one iid → gold rises by exactly that bundle, its `.loot` is
  null, phase still `'looting'`; collect the rest → phase `'idle'`, field empty, target
  null. `collectLoot` on an unknown iid or while `'idle'` returns false.
- `'collectAllLoot pays everything at once'` — gold rises by the pack total, phase `'idle'`.
- `'items ride the bundle and respect the inventory cap'` — `dropPct: 100`: bundle has 1
  item; collect → `lootDropped` with `autoSold: false` and item in inventory. Then a run
  with a pre-filled 24-item inventory (via `blankSave`) → `autoSold: true`, gold credited.
- `'materials ride the bundle'` — `huntUntil` a bundle-collect yields materials; they
  appear in `progressSnapshot().materials` only after collecting.
- `'loot is never destroyed: enterRegion banks it'` — clear a pack, don't collect,
  `enterRegion('r2')` → gold rose by the bundle total, phase `'idle'`.
- `'loot is never destroyed: death banks the fallen'` — 2-mob pack, kill one, let the other
  kill the player (dmg 9999) → dead mob's gold banked on death.
- `'assault auto-collects and ends in idle'` — from `'looting'`, `assaultWorldBoss()`
  succeeds and banks pending gold; `retreat()` → phase `'idle'`.
- `'auto-battle plays the whole loop alone'` — `autoBattle = true`, advance ~600 ticks from
  a fresh idle sim: at least one `enemySpawned`, one `encounterCleared`, and gold > 0
  without any manual intent.
- `'deserialize lands in idle'` — round-trip a sim; phase `'idle'`, `startFight()` works.

### T2 — UI: start / loot / collect flow

**Change:**
1. `game.svelte.ts`: add intents `startFight()`, `loot(iid)`, `lootAll()` — each calls the
   sim method and on `true` plays `loot` sfx (not for `startFight`) and `publishAll()`.
   `onKeyDown`: add `if (e.key === 'r') { this.lootAll(); return }` next to the `'a'`
   handler. Delete `lastEnemies` (state, its `publish()` maintenance, the `enemySpawned` /
   `regionEntered` resets, and the `enterRegion`/`retreat`/`assault` clears).
2. `CombatView.svelte`: `shown` → `game.combat.enemies` directly. Field content by phase:
   - `idle`: reuse the lull-card styling — region `intro` in italic (needs `intro` added to
     `RegionProgress` + `regionProgress()`; add it) and a `Start fight` button
     (`disabled={!game.combat.player.alive}`; while dead, label it `Fallen…`). Remove the
     `spawnIn` countdown UI.
   - `looting`: corpse cards as today plus a footer bar under the field:
     `<button>Loot all — R</button>` → `game.lootAll()`.
   - `combat`/`assault`: unchanged.
3. `EnemyCard.svelte`: new optional props `loot: LootBundle | null = null` and
   `oncollect: (() => void) | undefined`. When the enemy is dead and `loot` is non-null,
   render a compact loot panel inside the card: `+N gold` line, one line per item (name
   tinted by rarity — reuse the rarity color treatment from `ItemTile.svelte`), one line
   per material (`Name ×count`), and a `Collect` button calling `oncollect`. Pass
   `loot={enemy.loot}` / `oncollect={() => game.loot(enemy.iid)}` from CombatView.

**Acceptance:** `npm test` stays green (including `ui-hygiene` — update it only if it
references `lastEnemies`/`spawnIn`) and `npm run check` is clean. Behavior checklist for
review: idle → button → fight → loot panels → per-card collect and `R` both work → idle
button returns; assault flow unchanged; no `spawnIn`/`lastEnemies` references remain
(`grep -rn 'spawnIn\|lastEnemies' src` is empty).

### T3 — Content: five regions, four materials, five stat-clone mobs

**Change:**
1. `content/materials.ts` — append:
   ```ts
   { id: 'bog-amber',      name: 'Bog Amber',          tier: 'low',    value: 4,  flavor: 'Old sap, older grief, pressed to a shine.' },
   { id: 'wisp-residue',   name: 'Wisplight Residue',  tier: 'low',    value: 3,  flavor: 'It glows faintest exactly when you look at it.' },
   { id: 'drake-scale',    name: 'Drakescale Chip',    tier: 'medium', value: 9,  flavor: 'Still cold. It will always be cold.' },
   { id: 'obsidian-glass', name: 'Obsidian Glass',     tier: 'medium', value: 10, flavor: 'It reflects a slightly different room.' },
   ```
2. `content/enemies.ts` — five new **normal** mobs; copy the sibling's `level, hp,
   swingTicks, dmgMin, dmgMax, xp, goldMin, goldMax, dropPct` **exactly**, `mechanics: []`:

   | id | name | clone of | portrait | intro |
   |---|---|---|---|---|
   | `root-creeper` | Root Creeper | `mossback-boar` | `{ family: 'spider', hue: 120 }` | 'A Root Creeper unknots itself from the wall.' |
   | `fen-shade` | Fen Shade | `bog-lurker` | `{ family: 'revenant', hue: 190 }` | 'A Fen Shade gathers itself out of the mist.' |
   | `cliff-stalker` | Cliff Stalker | `harpy-skyrender` | `{ family: 'beast', hue: 260 }` | 'A Cliff Stalker pours down the rock face.' |
   | `magma-crawler` | Magma Crawler | `cinderhound` | `{ family: 'spider', hue: 30 }` | 'A Magma Crawler drags a wake of embers.' |
   | `null-watcher` | Null Watcher | `bone-sentinel` | `{ family: 'void', hue: 290 }` | 'A Null Watcher opens an eye that is not there.' |
3. `content/zones.ts` — append to each zone's `encounters` (weights as given):
   hollowroot `solo('root-creeper', 14)` + `pair('root-creeper', 'gravel-skitterling', 10)`;
   duskmire `solo('fen-shade', 14)` + `pair('fen-shade', 'mire-whelp', 10)`;
   stormcrag `solo('cliff-stalker', 14)` + `pair('cliff-stalker', 'harpy-fledgling', 10)`;
   ashen-wastes `solo('magma-crawler', 14)` + `pair('magma-crawler', 'ember-imp', 10)`;
   sundered-spire `solo('null-watcher', 14)` + `pair('null-watcher', 'void-mite', 10)`.
4. `content/regions.ts` — rewrite: delete `merge`; build the five regions per the table in
   the design notes, taking `name`/`epithet`/`hue`/`intro` and both encounter tables
   straight from the matching `ZoneDef` (keep the `zone(id)` lookup-throw helper).
   `DEFAULT_CONTENT` unchanged in shape.
5. `sim.ts` — replace `ZONE_TO_REGION` with `LEGACY_REGION` and the resolution order from
   the design notes.

**Acceptance — `tests/regions.test.ts` (updated):**
- `'there are five regions in difficulty order'` — length 5; tiers
  `['low','low','medium','medium','hard']`; ids in the table's order.
- `'level bands are ascending, contiguous, and cover 1–15'` — keep the existing
  `minLevel === prev.maxLevel + 1` loop; first `minLevel === 1`; last `maxLevel === 15`.
- `'every encounter references a known enemy'`, `'each region has a non-empty encounter
  table'` — keep as-is (loops).
- `'every region material id exists and matches the region tier'` — keep; **add**: each
  region has exactly 2 materials and no material id appears in two regions.
- **`tests/save.test.ts` additions**: a v3 blob with `regionId: 'verdant'` loads into
  `hollowroot` (build it via `sim.serialize()` on default content, overwrite `regionId`,
  or hand-roll); a v1 blob with `zoneId: 'stormcrag'` loads into `stormcrag`; an unknown
  `regionId` falls back to `regions[0]`. (These run against `DEFAULT_CONTENT`, not
  `testContent`.)

### T4 — Engine: quest system + catalog

**Change:**
1. `types.ts` — add `QuestObjective`, `QuestReward`, `QuestDef`, `QuestState`, `QuestView`
   (shapes in design notes), `export const MAX_ACTIVE_QUESTS = 3`; `ContentPack` gains
   `quests: readonly QuestDef[]`; `ProgressSnapshot` gains `quests: QuestView[]`;
   `SaveData` → `version: 4` + `activeQuests: Record<string, number>` +
   `completedQuests: string[]`.
2. `events.ts` — the three quest events; `goldGained` source union gains `'quest'`.
3. **New `content/quests.ts`** — `export const QUESTS: readonly QuestDef[]` with exactly
   these 15 (kill objectives: `enemyId: null` means any-foe-in-region):

   | id | name | giver | region | objective | reward |
   |---|---|---|---|---|---|
   | `q-hollow-fiber` | Dye for the Guild | Maro the Tinct-Seller | hollowroot | collect 8 `mossroot-fiber` | 80 xp, 40 g |
   | `q-hollow-cull` | Cull the Cavern | Warden Selk | hollowroot | kill any × 12 | 100 xp, 30 g, gear {3, uncommon} |
   | `q-hollow-bruiser` | The Toll-Taker | Pilgrim Osset | hollowroot | kill `rockmaw-bruiser` × 2 | 140 xp, 60 g, gear {4, rare} |
   | `q-dusk-amber` | Amber for the Apothecary | Apothecary Vell | duskmire | collect 6 `bog-amber` | 160 xp, 70 g |
   | `q-dusk-wolves` | Teeth in the Fog | Carter Brann | duskmire | kill `duskwolf` × 8 | 200 xp, 60 g, gear {6, uncommon} |
   | `q-dusk-wisps` | Lanterns for the Lost | Pilgrim Osset | duskmire | collect 8 `wisp-residue` | 220 xp, 80 g, gear {6, rare} |
   | `q-storm-quartz` | A Storm in a Stone | Runesmith Bekka | stormcrag | collect 8 `storm-quartz` | 320 xp, 110 g, gear {9, rare} |
   | `q-storm-harpies` | Clip Their Wings | Roostkeeper Dane | stormcrag | kill `harpy-skyrender` × 8 | 300 xp, 100 g |
   | `q-storm-behemoth` | The Mountain's Fist | Warden Selk | stormcrag | kill `crag-behemoth` × 2 | 360 xp, 150 g, gear {10, rare} |
   | `q-ash-cinders` | Coals That Won't Die | Forgemistress Ida | ashen-wastes | collect 10 `cinder-ash` | 420 xp, 150 g |
   | `q-ash-hounds` | Hounds of the Grey Wind | Carter Brann | ashen-wastes | kill `cinderhound` × 8 | 460 xp, 140 g, gear {12, uncommon} |
   | `q-ash-glass` | A Lens for the Observatory | The Cartographer Royal | ashen-wastes | collect 6 `obsidian-glass` | 520 xp, 180 g, gear {12, rare} |
   | `q-spire-shards` | Fragments of the Wound | The Cartographer Royal | sundered-spire | collect 8 `void-shard` | 700 xp, 240 g, gear {15, epic} |
   | `q-spire-chant` | Silence the Chanting | Exorcist Piel | sundered-spire | kill `void-acolyte` × 6 | 650 xp, 220 g |
   | `q-spire-herald` | Kill the Messenger | Exorcist Piel | sundered-spire | kill `herald-of-malgrath` × 2 | 800 xp, 300 g, gear {15, epic} |

   Write a one-to-two-sentence in-voice `text` for each (e.g. `q-hollow-fiber`: "My reds
   have gone grey without mossroot. Bring me armfuls and I will owe you a colour." — same
   register for the rest; this is flavor prose, any faithful line passes).
4. `content/regions.ts` — `DEFAULT_CONTENT` gains `quests: QUESTS`.
5. `sim.ts` — quest state, `acceptQuest` / `turnInQuest` / `abandonQuest`, the two progress
   hooks (kill in `onEnemyKilled` non-assault path; collect in `payBundle`), `questViews()`
   into `progressSnapshot`, serialize v4, deserialize v1–v4 with unknown-id filtering.
6. `index.ts` exports; `tests/helpers.ts`: `testContent` gains optional
   `extra.quests?: QuestDef[]` (default `[]`) wired into the pack; `blankSave` → version 4
   + empty quest fields.

**Acceptance — new `tests/quests.test.ts`** (test quests defined in-file and passed via
`extra.quests`; suggested: `tq-any` kill-any×3 in r1, `tq-dummy` kill `dummy`×2,
`tq-collect` collect 2 `test-scrap` gear {5, rare}, plus `tq-p4`/`tq-p5` fillers for the cap
test):
- `'accepting: caps at three, refuses dupes, unknowns, and done quests'`.
- `'kill-any counts only in its region'` — accept `tq-any`, clear packs in r1 via
  `huntUntil` until progress ≥ 1; then `enterRegion('r2')`, kill there, progress
  unchanged.
- `'kill-specific counts per matching def and caps at count'` — `questCompleted` fires
  exactly once; progress stays at `count` after extra kills.
- `'collect ticks on bundle collection, not on drop'` — accept `tq-collect`; fight until a
  corpse bundle holds `test-scrap` (seeded hunt); before `collectAllLoot` progress is 0;
  after, it advanced by the stack count.
- `'turn-in pays xp, gold, and gear, exactly once'` — force-complete via kills; gold +xp
  deltas match the reward; `lootDropped` item rarity ≥ rare (minRarity respected — check
  `RARITIES.indexOf`); `questTurnedIn` fired; state `done`; second `turnInQuest` false;
  re-accept false.
- `'turn-in refuses an incomplete quest'`.
- `'abandon returns the quest to available and zeroes progress'`.
- `'quests survive the save round-trip'` — active progress + completed set identical after
  serialize/deserialize; `version === 4`; a save containing an unknown quest id loads with
  that id dropped.
- `'v3 saves load with no quests'` — a v3-shaped blob (no quest fields) deserializes; all
  catalog quests `available`.
- **`tests/save.test.ts`**: update the reserialize-version assertion 3 → 4.

### T5 — UI: Quests tab

**Change:**
1. `game.svelte.ts` — `View` union + `'quests'`; intents `acceptQuest(id)` /
   `turnInQuest(id)` / `abandonQuest(id)` (sim call + `publishAll()`; turn-in success plays
   `level` sfx); `onEvent` cases for the three quest events (toasts per design notes;
   all three mark progress dirty).
2. **New `views/QuestsView.svelte`** — quests from `game.progress.quests`, grouped by
   region in region order (group header: region name, tinted with `--zh: regionHue`, same
   treatment as AtlasView headers). Each quest card (glass style, match AtlasView):
   name, giver line ("— Giver name"), the `text` in italic, objective line
   (`Slay 8 × Duskwolf` / `Collect 8 × Storm Quartz` / `Slay 12 foes here`), a `Bar` with
   `value=progress max=count` when active/complete, reward line
   (`420 xp · 150 gold · rare gear` — omit gear when null), and the action:
   `available` → "Accept" button (disabled with title when 3 already active);
   `active` → progress text + small "Abandon" text-button;
   `complete` → highlighted "Turn in" button;
   `done` → a dim "Done" label, card at reduced opacity.
3. `Sidebar.svelte` — NAV entry `{ id: 'quests', label: 'Quests' }` after `regions`; new
   optional prop `questsReady = 0`; render the same badge as talents on the quests row when
   > 0. `App.svelte` — pass
   `questsReady={game.progress.quests.filter((q) => q.state === 'complete').length}`,
   add `quests: 'Quests'` to TITLES and the view branch.

**Acceptance:** `npm test` green, `npm run check` clean. Review checklist: accept →
progress bar ticks live during hunts → toast on completion → badge appears → turn in pays
and toasts → card goes dim; cap enforcement visible; abandon works.

### T6 — Full verification (no new code)

Run `npm test && npm run check`, then run the balance suite explicitly and **paste its
console line** (`endless: done=… maxLevel=… in …h, kills=…, deaths=…`) into the handoff
note. If `balance.test.ts` fails or the printed hours/deaths moved sharply, **do not retune
enemies, xp, or the envelope** — report the numbers and stop; that is a planner decision.
`grep -rn 'NODE_SPAWN_TICKS\|spawnIn\|lastEnemies\|ZONE_TO_REGION' src tests` must return
nothing.

---

## 4. Test command

```
npm test && npm run check
```

Node lives in `~/.local/node` (not on PATH). If `npm` is not resolvable, use
`~/.local/node/bin/npm test && ~/.local/node/bin/npm run check`. Every task must leave
`npm test` green before moving on; `npm run check` must be clean by the end of T2, T5, T6.

Optional visual check: `npm run shots` regenerates `docs/shot-*.png`.

## 5. Review checklist (for the planner reviewing the diff)

- **Purity intact:** `tests/purity.test.ts` green; no `Math.random`/`Date.now` in
  `src/engine`; quest/loot rolls all go through the injected rng, in a deterministic order.
- **Loot is never destroyed:** every path that clears the field (`death`, `enterRegion`,
  `assaultWorldBoss`) settles bundles first; no path leaves phase `'looting'` with zero
  bundles or `'combat'` with zero living enemies.
- **Auto-battle self-sufficient:** with `autoBattle` on, idle→fight→loot→idle cycles with
  no player intent (the balance test proves it — check its console line got pasted).
- **Instant-vs-banked split is exact:** XP at death; gold/items/materials at collect;
  assault and quest rewards fully instant; epic achievement fires at receive time.
- **Save discipline:** v4 only adds fields; v1/v2/v3 blobs load (region legacy mapping,
  empty quest state); unknown versions still throw; unknown quest/region ids degrade
  gracefully.
- **Quest hooks are narrow:** kill progress only in phase `'combat'` (never assault),
  kill-any gated on region id, collect gated on bundle collection — no double-count from
  quest-reward gear.
- **Stat-clone discipline:** the five new mobs' numbers match their siblings exactly
  (diff the defs); encounter weight additions only, no reweighting of existing lines.
- **UI stayed data-driven:** no hand-listed ability/quest ids; Quests tab renders purely
  from `QuestView[]`; no engine imports of Svelte or UI files.
- **Balance envelope:** unchanged assertions, and the run's numbers are in the handoff.
