# PLAN — Mythreach: Regions, Endless Combat, Materials & Save Management

## 1. Goal

Replace the expedition/trail system with **three free-choice difficulty regions**
(low / medium / hard) that spawn **endless** combat, add an **inert crafting-material**
drop category, **relayout the combat screen** around enemy formations (deleting the
combat log), and add a **Character Settings** screen that shows the current save and
can delete it / start a new character — fixing the reset bug where the save silently
re-writes itself on reload.

## 2. Design notes

### Decisions already made — do not re-litigate

- **Endless combat, no trail.** A region is a hunting ground, not a trail. There is
  **no route, no travel between nodes, no boss gate, no fog of war, no shrine/cache/rest
  nodes, no blessings.** Pick a region and mobs spawn forever; clear a pack and the next
  one arrives after a short breather.
- **Three regions, all selectable from the start.** No unlock gating. Regions are built
  by **merging the existing five zones' encounter tables** into three tiers — no enemy
  stats change, no new mobs are authored:
  - `verdant` (**low**, Lv 1–6) = `hollowroot` + `duskmire` encounter tables merged.
  - `emberwild` (**medium**, Lv 7–12) = `stormcrag` + `ashen-wastes` merged.
  - `riftedge` (**hard**, Lv 13–15) = `sundered-spire`.
- **Elites stay, bosses go.** Regions spawn the normal weighted table plus the occasional
  elite (from the merged `eliteEncounters`). The former zone bosses are **not** spawned in
  regions. `finalBossId` / `bossDefeated` / `gameCompleted` / expedition records are removed
  from the loop; the boss enemy defs may stay in `enemies.ts` (harmless, unused).
- **Materials are a separate inert collection**, NOT gear. They do not go through the
  `Item`/equip/slot machinery. The player holds `materials: Record<string, number>`
  (materialId → count). They drop alongside gear, stack, are sellable for gold, and do
  nothing else yet. This is the seam future crafting/quests will read.
- **World boss (Colossus) and companion stay** exactly as they are, but the assault is now
  entered from the Regions screen and, on any end, returns you to the **current region**
  (not "camp" — camp no longer exists).
- **Phases collapse to `'combat' | 'assault'`.** `'camp' | 'travel' | 'node'` are deleted.
  The sim starts in `'combat'` in the first region with a spawn already scheduled.
- **Save bumps to version 3.** `serialize` writes `regionId` + `materials` and drops the
  expedition-only records. `deserialize` accepts v1/v2/v3: for old saves, map the old
  `zoneId` to the region that contains it (default to `verdant`), default `materials` to
  `{}`, and ignore the dead expedition fields. Unknown versions still throw.
- **RNG stays a required constructor option.** No `Math.random` inside the engine. The
  purity test (`tests/purity.test.ts`) must keep passing.
- **The combat log is deleted, not hidden.** `CombatLog.svelte` usage, the `log`/`append`
  state on `Game`, and every `append(...)` call go away. Toasts, banners, the level-up
  banner, and the victory modal stay.

### Files involved

**Engine (pure, unit-tested):**
- `src/engine/types.ts` — add material types, `RegionDef`, `RegionProgress`,
  `MaterialStackView`; remove expedition/zone snapshot types; retune `CombatSnapshot`,
  `ProgressSnapshot`, `SaveData`, `ContentPack`.
- `src/engine/content/materials.ts` — **new**: material catalog.
- `src/engine/content/regions.ts` — **new**: the three regions + `DEFAULT_CONTENT`.
- `src/engine/content/zones.ts` — keep the `ZONES` raw data + `solo/pair/vanguard` helpers;
  remove its `DEFAULT_CONTENT` export (moves to `regions.ts`).
- `src/engine/expedition.ts` — **delete**.
- `src/engine/content/blessings.ts` — **delete** (unused after this).
- `src/engine/sim.ts` — rip out expedition, add endless spawn loop, region selection,
  material drops, save v3.
- `src/engine/events.ts` — drop expedition events, add `regionEntered` + `materialDropped`.
- `src/engine/index.ts` — export the new content + types, drop deleted ones.

**UI (verified by `npm run check` + source-contract tests + manual `/verify`):**
- `src/ui/game.svelte.ts` — delete log/append; rename `travel`→`enterRegion`; delete
  `embark/advance/retreat/chooseBlessing`; add `newCharacter`/`deleteSave`; fix the reset bug.
- `src/ui/persistence.ts` — **new**: testable `SaveStore` (holds the wipe guard).
- `src/ui/views/CombatView.svelte` — remove CombatLog + trail/camp/shrine/travel UI; new
  formation layout.
- `src/ui/views/AtlasView.svelte` → region picker.
- `src/ui/views/CharacterView.svelte` — add a materials panel.
- `src/ui/views/SettingsView.svelte` — **new**: save management.
- `src/ui/views/ChronicleView.svelte` — remove the reset block (moves to Settings).
- `src/ui/components/Sidebar.svelte`, `src/App.svelte` — add `settings` view + nav; rename
  `atlas` label to `Regions`.
- `src/ui/components/TrailRibbon.svelte` — **delete**. `EnemyCard.svelte` — formation tweaks.

**Tests:** `tests/expedition.test.ts` + `tests/zones.test.ts` deleted;
`tests/encounters.test.ts` rewritten for endless spawning; `tests/save.test.ts` extended for
v3 + back-compat; new `tests/materials.test.ts`, `tests/regions.test.ts`,
`tests/persistence.test.ts`, `tests/ui-hygiene.test.ts`. All other existing tests stay green
(update only where they reference deleted symbols).

### Helper reference (already in repo)

- `tests/helpers.ts` — has `mulberry32` and a seeded-sim harness. Reuse it; do not add new
  ambient randomness.
- `pickWeighted(rng, [{value, weight}])`, `rollInt(rng, a, b)`, `rollPct(rng, pct)`,
  `pickOne(rng, arr)` in `src/engine/rng.ts`.

---

## 3. Tasks

> Do the tasks in order. After **each** task, run the test command; a task is done only when
> its tests pass and nothing previously green went red. Keep changes minimal and match
> existing patterns.

### T1 — Material catalog + types (engine, pure)

**Change:**
1. In `types.ts` add:
   ```ts
   export type MaterialTier = 'low' | 'medium' | 'hard'
   export interface MaterialDef {
     id: string
     name: string
     tier: MaterialTier
     /** Gold each stack unit sells for. */
     value: number
     flavor: string
   }
   /** A material line in the player's bags. */
   export interface MaterialStackView {
     id: string
     name: string
     tier: MaterialTier
     count: number
     value: number
   }
   ```
2. New file `src/engine/content/materials.ts` with a `DEFS: MaterialDef[]` of six materials —
   two per tier: `mossroot-fiber`(low,3), `hollow-bone`(low,4), `storm-quartz`(medium,9),
   `cinder-ash`(medium,8), `void-shard`(hard,18), `rift-essence`(hard,22), each with a short
   flavor line. Export `MATERIALS: Record<string, MaterialDef>` (id-keyed) and
   `MATERIAL_IDS: readonly string[]`.
3. Export `MATERIALS`, `MATERIAL_IDS`, and the new types from `src/engine/index.ts`.

**Acceptance — `tests/materials.test.ts`:**
- `test('every material has a unique id')` — `MATERIAL_IDS.length === new Set(MATERIAL_IDS).size`.
- `test('materials are well-formed')` — for each def: non-empty `name`, `value > 0`,
  `tier` ∈ `{low,medium,hard}`, non-empty `flavor`.
- `test('every tier has at least one material')` — the set of tiers over all defs equals
  `{low, medium, hard}`.

### T2 — Region content model (engine, pure)

**Change:**
1. In `types.ts`:
   - Add `export type RegionTier = 'low' | 'medium' | 'hard'`.
   - Add `RegionDef` `{ id, name, epithet, tier: RegionTier, minLevel, maxLevel, hue,
     encounters: EncounterDef[], eliteEncounters: EncounterDef[], materials: string[], intro }`.
   - Change `ContentPack` to `{ regions: readonly RegionDef[]; enemies: Record<string, EnemyDef>;
     materials: Record<string, MaterialDef> }` (remove `zones`, `finalBossId`).
   - Replace `ZoneProgress` with `RegionProgress`
     `{ id, name, epithet, tier: RegionTier, minLevel, maxLevel, hue, current, enemyNames }`.
   - **Delete** `NodeKind`, `ExpeditionNodeView`, `ExpeditionSnapshot`. Delete the now-unused
     constants `ROUTE_STEPS`, `TRAVEL_TICKS`, `AUTO_BREATHER_TICKS`, `BOSS_APPROACH_TICKS`.
     **Keep** `NODE_SPAWN_TICKS` (reused as the spawn breather), `PLAYER_RESPAWN_TICKS`,
     `REGEN_INTERVAL_TICKS`, `GCD_TICKS`, `INVENTORY_CAP`, `LEVEL_CAP`, `RESPEC_COST`,
     `TICKS_PER_SECOND`, `MS_PER_TICK`.
2. New file `src/engine/content/regions.ts` that:
   - imports `ZONES` from `./zones`, `ENEMIES` from `./enemies`, `MATERIALS` from `./materials`.
   - merges zone encounter/elite tables per the tier mapping above via a small `merge(...ids)`
     helper (throws on a missing zone id).
   - exports `REGIONS: readonly RegionDef[]` = `[verdant, emberwild, riftedge]` with the
     level bands `1–6 / 7–12 / 13–15`, hues `150 / 40 / 305`, the material lists
     `[mossroot-fiber, hollow-bone] / [storm-quartz, cinder-ash] / [void-shard, rift-essence]`,
     and a one-line `intro` each.
   - exports `DEFAULT_CONTENT: ContentPack = { regions: REGIONS, enemies: ENEMIES, materials: MATERIALS }`.
3. In `src/engine/content/zones.ts`: keep the `ZONES` array + helpers; remove the old
   `DEFAULT_CONTENT` export. `ZoneDef` may keep its `bossId`/`travelLines`/`minLevel` fields
   (now unused raw data).
4. Update `src/engine/index.ts`: export `REGIONS`, `DEFAULT_CONTENT` (from `regions.ts`),
   `RegionDef`, `RegionTier`, `RegionProgress`, `MaterialStackView`. Remove exports of deleted
   symbols (grep `generateRoute`, `ExpeditionSnapshot`, `NodeKind`, `ZoneProgress`, `BlessingId`,
   `BLESSINGS`, `BLESSING_IDS`).

**Acceptance — `tests/regions.test.ts`** (delete `tests/zones.test.ts`):
- `test('there are exactly three regions, one per tier')` — `REGIONS.length === 3` and tiers
  are `['low','medium','hard']` in order.
- `test('each region has a non-empty encounter table')` — every region `.encounters.length >= 3`.
- `test('every encounter references a known enemy')` — for every region, every slot's
  `enemyId` (in both `encounters` and `eliteEncounters`) is a key of `ENEMIES`.
- `test('every region material id exists and matches tier')` — each id in `region.materials`
  is a key of `MATERIALS` and `MATERIALS[id].tier === region.tier`.
- `test('level bands are ascending and non-overlapping')` — regions give `1–6, 7–12, 13–15`.

### T3 — Sim: endless combat, region selection, no expedition (engine)

Sub-steps (do them together — the file will not compile between them):

**3a. State/phase.** In `sim.ts`:
- `private phase: 'combat' | 'assault' = 'combat'`.
- Delete fields: `route`, `nodeIndex`, `nodeResolvedFlag`, `revealedThrough`,
  `travelRemaining`, `travelTotal`, `pendingShrine`, `blessings`, `autoBreather`,
  `bossFightStart`, `bossesDefeated`, `completed`. Replace `zone: ZoneDef` with
  `region: RegionDef`.
- `pendingSpawn` type becomes `'battle' | 'elite' | null` (drop `'boss'`).
- `Records`: drop `expeditionsCompleted` + `fastestBossKills` (interface + init). Keep
  `worldBossFells`, `bestAssaultDamage`. `LifetimeStats.bossKills` stays but now only
  increments on world-boss fells.
- Add `private materials: Record<string, number> = {}`.

**3b. Constructor + endless spawn loop.**
- Constructor: `this.region = this.content.regions[0]` (guard: throw if none), then call
  `this.scheduleSpawn()`.
- New `private scheduleSpawn(): void` — sets `this.pendingSpawn` to `'elite'` with ~1-in-8 odds
  when `region.eliteEncounters.length > 0`, else `'battle'`; sets `this.spawnIn = NODE_SPAWN_TICKS`.
- `spawnPending()`: drop the `'boss'` case and the `bossFightStart` line. `battle` draws from
  `region.encounters`; `elite` from `region.eliteEncounters` (fall back to `region.encounters`
  if empty). Everything else (building `EnemyUnit`s, `autoTarget`, `enemySpawned` events) stays.
- `onEncounterCleared()`: remove all node logic. Push `encounterCleared`, clear the queued
  offensive ability + `enemies`/`targetIid` (as today), then call `scheduleSpawn()`.
- `tick()`: delete the `phase === 'travel'` branch. Keep the countdown:
  `else if (this.pendingSpawn !== null && this.enemies.length === 0) { this.spawnIn--; if (this.spawnIn <= 0) this.spawnPending() }`.
  Delete the `if (this.phase === 'camp') { heal 7% }` block in the regen section entirely.
- `onPlayerDied()`: keep clearing the field; replace the `endExpedition('death')` call with
  `this.scheduleSpawn()` (combat resumes after `revivePlayer`). Keep the assault branch.

**3c. Intents.**
- Delete: `embark`, `advance`, `chooseBlessing`, `gainBlessing`, `startTravel`,
  `arriveAtNode`, `resolveArrival`, `openCache`, `takeRest`, `offerShrine`, `endExpedition`,
  `resolveCurrentNode`, `isLastNode`, `autoExpedition`, `applyBlessings`. Remove the
  `generateRoute` import and the `BLESSINGS`/`BLESSING_IDS` imports.
- `autoThenDrain()` calls only `autoAct()` (drop `autoExpedition()`).
- Replace `travelTo(zoneId)` with `enterRegion(regionId)`:
  ```ts
  enterRegion(regionId: string): boolean {
    if (this.phase !== 'combat') return false
    const region = this.content.regions.find((r) => r.id === regionId)
    if (!region || region.id === this.region.id) return false
    this.region = region
    this.enemies = []
    this.targetIid = null
    this.pendingSpawn = null
    this.player.queued = null
    this.scheduleSpawn()
    this.push({ kind: 'regionEntered', regionId: region.id, name: region.name })
    return true
  }
  ```
- `retreat()` keeps ONLY the assault branch:
  `if (this.phase === 'assault') return this.endAssault('retreat'); return false`.
- `assaultWorldBoss()`: precondition `if (this.phase !== 'combat' || !this.player.alive) return false`.
- `endAssault(...)`: set `this.phase = 'combat'` and call `this.scheduleSpawn()` instead of
  returning to camp. `refreshStats(false)` if it did so before.
- `refreshStats` no longer needs `applyBlessings`; call `deriveStats(...)` directly.

**3d. Material drops.** In `onEnemyKilled`, after the gear `dropLoot` roll, call
`this.rollMaterial(def)`:
```ts
private rollMaterial(_def: EnemyDef): void {
  if (!rollPct(this.rng, 35)) return
  const ids = this.region.materials
  if (ids.length === 0) return
  const id = pickOne(this.rng, ids)
  const count = rollInt(this.rng, 1, 3)
  this.materials[id] = (this.materials[id] ?? 0) + count
  this.push({ kind: 'materialDropped', id, count })
}
```
Add:
```ts
sellMaterial(id: string): boolean {
  const have = this.materials[id] ?? 0
  const def = this.content.materials[id]
  if (have <= 0 || !def) return false
  delete this.materials[id]
  this.addGold(have * def.value, 'sale')
  return true
}
```

**3e. Snapshots.**
- `CombatSnapshot`: `phase: 'combat' | 'assault'`; **remove** the `expedition` field. Keep
  `tick, player, enemies, target, spawnIn, cast, queued, cooldowns, gcdRemaining, autoBattle,
  companion`.
- `combatSnapshot()`: drop the `expedition` block.
- `ProgressSnapshot`: replace `zones: ZoneProgress[]` → `regions: RegionProgress[]`,
  `zoneId` → `regionId`; add `materials: MaterialStackView[]`; **remove** `completed`.
- `progressSnapshot()`: build `regions` from `content.regions` (`current = r.id === this.region.id`,
  `enemyNames` = distinct enemy names over the region's encounter slots), and `materials`
  from `this.materials` mapped through `content.materials`, sorted by tier
  (`low<medium<hard`) then name.

**3f. Save v3.**
- `SaveData`: `version: 3`; `zoneId` → `regionId`; remove `bossesDefeated`, `completed`;
  add `materials: Record<string, number>`.
- `serialize()`: write `version: 3`, `regionId: this.region.id`, `materials: { ...this.materials }`.
- `deserialize()`:
  - accept `version` 1/2/3, else throw.
  - `sim.materials = { ...((data as { materials?: Record<string, number> }).materials ?? {}) }`.
  - Resolve region: try `data.regionId`; if absent/unknown, map a legacy `zoneId` with
    `{ hollowroot:'verdant', duskmire:'verdant', stormcrag:'emberwild', 'ashen-wastes':'emberwild',
    'sundered-spire':'riftedge' }`; default `regions[0]`.
  - Ignore legacy `bossesDefeated`, `completed`, and old expedition records.
  - `sim.refreshStats(true)`, then `sim.scheduleSpawn()` so a resumed save is already fighting.

**3g. Events.** In `events.ts`:
- Remove: `expeditionStarted`, `travelStarted`, `nodeArrived`, `nodeResolved`, `cacheOpened`,
  `shrineOffered`, `blessingGained`, `rested`, `expeditionEnded`, `bossDefeated`,
  `gameCompleted`, `zoneEntered`.
- Add: `{ kind: 'regionEntered'; regionId: string; name: string }` and
  `{ kind: 'materialDropped'; id: string; count: number }`.
- Keep all combat/loot/progression/worldBoss/companion/achievement events.

**Acceptance — rewrite `tests/encounters.test.ts`; extend `tests/save.test.ts`; delete
`tests/expedition.test.ts`.** Use the seeded harness from `tests/helpers.ts`.

`tests/encounters.test.ts`:
- `test('combat starts with a spawn scheduled')` — fresh sim; after `NODE_SPAWN_TICKS + 1`
  ticks, `combatSnapshot().enemies.length >= 1` and `phase === 'combat'`.
- `test('clearing a pack schedules the next (endless)')` — record the current pack's iids,
  force-kill the whole pack (helper that damages each living enemy to 0, or drive abilities),
  then tick; within `NODE_SPAWN_TICKS + 2` ticks a pack with **new** iids appears. Assert this
  twice in a row.
- `test('enterRegion switches the mob table')` — `enterRegion('riftedge')` → next spawned
  pack's defIds are all members of riftedge's tables and none are verdant-only mobs. Unknown
  id and current-region id both return `false`.
- `test('enterRegion is refused during an assault')` — `assaultWorldBoss()` then
  `enterRegion('riftedge')` returns `false`.
- `test('player death respawns and combat continues')` — force player death; after
  `PLAYER_RESPAWN_TICKS + NODE_SPAWN_TICKS + 2` ticks the player is alive, a pack is present,
  `phase === 'combat'`.
- `test('materials drop, accumulate, and belong to the region')` — seeded rng; kill mobs in a
  loop (cap ~200 kills) until `progressSnapshot().materials` is non-empty; assert some stack
  `count >= 1` and every stack id is in the current region's material list.
- `test('sellMaterial converts a stack to gold and clears it')` — seed a stack via kills;
  `gold` before, `sellMaterial(id)` → gold += `count*value`, stack gone; selling a
  non-existent id returns `false`.

`tests/save.test.ts` additions:
- `test('v3 round-trips region and materials')` — `enterRegion('emberwild')`, accrue a
  material stack, `serialize()` → `deserialize()` restores `regionId === 'emberwild'` and the
  `materials` map, resumed sim `phase === 'combat'`.
- `test('a v2 save maps its zone to a region')` — craft a `version: 2` blob with
  `zoneId: 'stormcrag'` and the other v2 fields; `deserialize` → `progressSnapshot().regionId
  === 'emberwild'`, `materials` empty, no throw.
- `test('an unknown save version throws')` — `version: 99` throws.

### T4 — Combat screen relayout (UI) + delete the log

**Change:**
1. `game.svelte.ts`:
   - Remove `log`, `append`, the `LogEntry` import, and **every** `this.append(...)` call.
   - In `onEvent`: delete cases for removed events; add `regionEntered` (optional toast) and
     `materialDropped` (`this.progressDirty = true`; soft `this.audio.play('loot')`). Delete
     `embark/advance/retreat/chooseBlessing` methods, `lastFlavor`, and the region-boss
     `bossIntro` path (world-boss `bossIntro` in `assault()` stays). Remove the Space-bar
     embark/advance keybind logic.
   - Rename `travel(zoneId)` → `enterRegion(regionId)` → `this.sim.enterRegion(...)`.
   - Add `sellMaterial(id)` → `this.sim.sellMaterial(id)` then `publishAll()`.
   - Use the new `SaveStore` (T7) for boot/save/wipe.
2. `CombatView.svelte`:
   - Remove the `<div class="chronicle"><CombatLog /></div>` block + import; remove the
     camp/rest/shrine/travel/resolved branches and the `TrailRibbon`. Keep the banner (region
     name + tier badge) and the `lull` between-pack countdown (`game.combat.spawnIn`).
   - **Formation:** `const back = shown.filter(e => e.row === 'back')`,
     `const front = shown.filter(e => e.row !== 'back')`. Render `back` in an upper row (smaller,
     slightly dimmed) and `front` in a lower row, both centered. Solo pack → one large centered
     card. Keep `compact={shown.length > 1}`. The container wrapping the cards keeps
     `data-fx-row="enemies"` (FX targeting reads it).
   - Let the formation area grow into the space the log freed (`flex: 1`).

**Acceptance:** `npm run check` clean, plus `tests/ui-hygiene.test.ts` (reads source with
`readFileSync`, strips spaces before matching tokens):
- `test('the combat log is gone')` — `CombatView.svelte` contains neither `CombatLog` nor
  `chronicle`; `game.svelte.ts` contains no `append(` method def and no `log:` state field.
- `test('the combat view lays out formation rows')` — `CombatView.svelte` (space-stripped)
  contains `row==='back'` and a `front` grouping token.
- `test('expedition UI is removed from combat')` — `CombatView.svelte` contains none of
  `TrailRibbon`, `embark`, `shrine`, `Blessing`.

### T5 — Regions picker screen (UI)

**Change:** `AtlasView.svelte` renders `game.progress.regions` as three cards (tier badge,
`Lv min–max`, mob roster, hue accent, **Enter** button → `game.enterRegion(r.id)`, disabled
when `r.current` or `game.combat.phase === 'assault'`, with a title hint). Keep the Colossus
assault panel. Rename the `atlas` view id to `regions` consistently across the `View` type
(`game.svelte.ts`), `Sidebar` NAV (label "Regions"), `App.svelte` route + `TITLES`; update the
`App.svelte` derived `zone` → `region = game.progress.regions.find(r => r.current)` feeding
`TopBar`. Remove the `zone.unlocked/locked/Travel` UI.

**Acceptance:** `npm run check` clean, plus `tests/ui-hygiene.test.ts`:
- `test('regions screen wired to enterRegion')` — the regions view source contains
  `enterRegion` and iterates `progress.regions`; contains none of `unlocked`, `locked`,
  `>Travel<`.

### T6 — Character materials panel (UI)

**Change:** `CharacterView.svelte` — add a "Materials" panel (below Bags) listing
`game.progress.materials`: name, tier-tinted, `×count`, and a **Sell** button →
`game.sellMaterial(id)` showing the stack value. Empty state:
"No materials yet — the wilds are stingy." (`game.sellMaterial` added in T4.)

**Acceptance:** `npm run check` clean, plus `tests/ui-hygiene.test.ts`:
- `test('character screen shows materials')` — `CharacterView.svelte` contains `progress.materials`
  and `sellMaterial`.

### T7 — Character Settings screen + fix the reset re-save bug (UI)

**Change:**
1. New `src/ui/persistence.ts` (pure, testable):
   ```ts
   export interface Storagelike {
     getItem(k: string): string | null
     setItem(k: string, v: string): void
     removeItem(k: string): void
   }
   export class SaveStore {
     private wiped = false
     constructor(private readonly storage: Storagelike, private readonly key: string) {}
     load(): string | null { return this.storage.getItem(this.key) }
     save(serialized: string): void { if (this.wiped) return; this.storage.setItem(this.key, serialized) }
     wipe(): void { this.wiped = true; this.storage.removeItem(this.key) }
   }
   ```
2. `game.svelte.ts` uses a `SaveStore` (`new SaveStore(localStorage, SAVE_KEY)`) for `boot`
   (`store.load()`), `saveNow` (`store.save(JSON.stringify(this.sim.serialize()))` — the guard
   now lives in the store), and a wipe path:
   ```ts
   private wipeAndReload(): void {
     if (this.saveTimer) clearInterval(this.saveTimer)
     window.removeEventListener('beforeunload', this.saveNow)
     this.store.wipe()
     location.reload()
   }
   newCharacter(): void { this.wipeAndReload() }
   deleteSave(): void { this.wipeAndReload() }
   ```
   Remove the old `resetSave()` (or have it delegate to `wipeAndReload`). `saveNow` and
   `stop()`'s trailing save both go through `store.save`, so a wiped store cannot resurrect the
   save on reload/unload — **this is the bug fix.**
3. New `src/ui/views/SettingsView.svelte`: shows the current save (level, gold, current region
   name, kills, epics found from `game.progress`) and two confirm-gated destructive actions —
   **Start a new character** (`game.newCharacter()`) and **Delete save** (`game.deleteSave()`).
4. Add the `settings` view: `View` union member, `Sidebar` NAV entry ("Settings"), `App.svelte`
   route + `TITLES`. Remove the `danger`/reset `<section>` from `ChronicleView.svelte`.

**Acceptance — `tests/persistence.test.ts`** (fake `Storagelike` backed by a `Map`):
- `test('save writes through to storage')` — after `store.save('x')`, `load()` returns `'x'`.
- `test('wipe removes the save')` — save then `wipe()` → `load()` is `null`.
- `test('a wiped store refuses further saves')` — `wipe()` then `save('y')` → `load()` stays
  `null`. **(This is the exact regression the reset bug was — the reload-time save must not
  resurrect a wiped save.)**
- `npm run check` clean; `SettingsView` mounts (verified via `/verify`).

### T8 — Cleanup pass

**Change:** delete `src/engine/expedition.ts`, `src/engine/content/blessings.ts`,
`src/ui/components/TrailRibbon.svelte`, `tests/expedition.test.ts`, `tests/zones.test.ts`.
Grep the tree for dead references and remove/adjust: `ExpeditionSnapshot`, `NodeKind`,
`blessing`, `Blessing`, `bossDefeated`, `zoneId`, `ZoneProgress`, `generateRoute`, `travelTo`,
`finalBossId`, `expeditionsCompleted`, `fastestBossKills`, `BLESSINGS`. `BossIntro.svelte`
stays (world boss uses it).

**Acceptance:** `npm test` and `npm run check` both clean; no unused-import or type errors.

---

## 4. Test command

```
npm test && npm run check
```
Node lives in `~/.local/node` (not on PATH). If `npm` is not resolvable, use
`~/.local/node/bin/npm test && ~/.local/node/bin/npm run check`. Every task must leave
`npm test` green before moving on; `npm run check` must be clean by the end of T8.

Optional visual check: `npm run shots` regenerates `docs/shot-*.png`.

## 5. Review checklist (for the planner reviewing the diff)

- **Purity intact:** `tests/purity.test.ts` green; no `Math.random`/`Date.now` in `src/engine`.
- **No dead-air stall:** after every clear, every respawn, every region switch, and every
  assault-end, a spawn is scheduled — no path leaves `pendingSpawn === null` with an empty
  field forever.
- **Save back-compat:** a real v2 blob loads without throwing and lands in the mapped region
  with `materials === {}`.
- **Reset bug actually fixed:** `SaveStore.wipe()` blocks the beforeunload/stop save from
  resurrecting the save (unit-tested), and `wipeAndReload` detaches the listener + timer.
- **Log fully gone:** no `append`, no `CombatLog`, no `log` state; the UI still reads well from
  floats + toasts + banners.
- **Formation reads well:** solo = one big card; packs split front/back rows; FX still land
  (the `data-fx-row="enemies"` container still wraps the cards).
- **Materials inert but real:** they drop, stack, persist, and sell — touching none of the
  gear/equip code paths.
- **No orphans:** `expedition.ts`, `blessings.ts`, `TrailRibbon.svelte`, `zones.test.ts`,
  `expedition.test.ts` removed; grep for deleted symbols is empty.
- **Scope discipline:** enemy stats, ability math, FX/spell tones, talents, world boss, and
  companion behavior are unchanged except for phase/entry-point plumbing.
