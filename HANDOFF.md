# HANDOFF.md — Mythreach Web

> **You are a fresh Claude Code session.** This file is everything you need to
> pick up the project exactly where it stands. Read it, run the checkpoint
> commands, and you're oriented. (`WEB_PIVOT_PLAN.md` is the original v0 build
> brief and `PLAN.md` holds past build plans — background reading only; the
> README covers the concept.)

## What this is, and where it stands

Mythreach Web is an **active-only** dashboard RPG (no away-from-game
progression — absence is respected, not simulated). The game today, after five
shipped builds on `master`:

- **The front door**: the app opens on a **title screen** — three save slots,
  settings (sound / screen shake / reduced motion), and a
  **character-creation ceremony** (name forge, class, origin, birth sign).
  Six classes are designed in `src/ui/content/identity.ts`; only the
  **Arcanist** is playable — the other five are sealed framework, browsable
  with full lore/mechanic/ability previews. Identity and slots are UI-owned
  localStorage (`src/ui/profile.ts`); the engine never reads them.
- **Combat**: discrete, player-started fights (phases
  `idle | combat | looting | assault`) against packs of 1–3 mobs with
  front/back rows. Kills pay XP instantly; gold/items/materials bank in
  per-corpse `LootBundle`s — collect per card or `R` for all.
- **The world**: 5 free-choice regions (level bands 1–3 … 13–15, never gated),
  35 enemies with mechanics (enrage / interruptible hardcasts / venom DoTs),
  10 inert crafting materials by region tier, 15 one-shot traveler quests
  (max 3 active), 17 achievements, 6 talents, generated loot in 4 rarities ×
  5 slots, levels 1–15, the persistent Rift Colossus world boss, and a
  hireling companion.
- **Presentation**: the data-driven combat-FX layer (see below) and the
  "Observatory Lens" art pass — the whole app relights in the current
  region's hue (background nebula/weather moods, portrait idle theatre,
  filigree/rule ornament language, the summoning-sigil Start button).

**The combat-FX layer is data-driven** — a new ability's look and sound is one
row in `src/ui/fx/spells.ts` and nothing else. See "Combat FX" below; it has
the most non-obvious invariants in the codebase.

### Current branch state

**`master` is the truth**; there is no live feature branch. History runs
v0 (M0–M5) → v1 "Sundered Reaches" (M6, five boss-gated zones) → the Wayfarer
expedition build → **the Regions build that deleted expeditions** (endless
combat, free travel) → **Fights & Quests** (discrete fights, looting, quests,
save v4) → the Observatory Lens art pass → **the Front Door** (title screen,
slots, creation). Expeditions, offline fast-forward, boss-gated zones, and the
combat log are all *deleted* — if you see them referenced anywhere, that text
is stale. `src/engine/content/zones.ts` survives only as raw data the regions
are built from.

## Environment (read this first — it's non-obvious)

- **Node is NOT on the default PATH.** It's a local install (v22.17.0). Every
  shell command needs:

  ```sh
  export PATH="$HOME/.local/node/bin:$PATH"
  ```

  Check with `which node` first. Do **not** try `curl | bash` installers or
  editing `~/.zshrc` yourself — the permission classifier blocks both.
- **Playwright chromium is already installed** (`~/.cache/ms-playwright`).
  If a fresh machine: `npx playwright install chromium`.
- Platform: Ubuntu, zsh, no sudo assumed.

## The contract (keep these green at all times)

```sh
npm test        # 175 Vitest cases — rules, content envelope, balance, slots, identity
npm run check   # svelte-check + tsc, strict, 0 errors 0 warnings
```

Hard rules beyond the scripts:

1. **Engine purity.** `src/engine/` must never import DOM, Svelte, or
   `window`; rng is a *required* ctor option. `tests/purity.test.ts` enforces
   it by reading every engine source.
2. **Integer ticks.** 20 ticks/s (50 ms); every duration is an exact tick
   count. Milliseconds exist only in `src/ui/loop.ts` and profile timestamps.
3. **Events are the only one-shot channel.** UI effects (floats, shake, sfx)
   derive from `CombatEvent`s, never from snapshot diffs.
4. **Content-independent tests.** Rule tests inject custom content packs
   (`tests/helpers.ts` → `testContent()`); only `balance.test.ts` and a few
   smoke tests touch live content numbers.
5. **UI-source contract tests** (`tests/ui-hygiene.test.ts`) read view sources
   via Vite `?raw` imports and forbid tokens: no 'CombatLog'/'chronicle' in
   CombatView, no 'locked'/'unlocked'/'>Travel<' in AtlasView — mind class
   names when styling those files.

## Core rules quick-reference (tests pin the details)

- GCD 24 ticks, triggered by every ability except off-GCD Counterspell.
  Presses during cast/GCD **queue** (replacing any queued spell); the queue
  fires the tick both clear, drops if the target dies.
- Mana spends at cast *resolve*; fizzles (target died mid-cast) refund.
  Cooldowns always start at resolve. Regen every 20 ticks, spirit-scaled;
  fast out-of-combat recovery while the field is clear.
- Crits ×7/4. Combustion: +25% fire / +20% crit for 240 ticks. Barrier
  absorbs before HP (damage events carry `absorbed`). Ignite snapshots
  power/combustion at apply.
- Enemy hardcast: first cast at cooldown/2 after spawn, swings pause while
  casting, interrupt restarts the full cooldown. Enrage: once, at hpPct,
  swingMult/dmgMult. Venom: applies a Dot to the player on a timer.
- **Fight flow**: `startFight()` (idle→combat) rolls a weighted encounter from
  the current region; kill → XP immediately, spoils into the corpse's
  `LootBundle`; last corpse → `looting` phase; `collectLoot(iid)` /
  `collectAllLoot()`; any field-clearing transition (new fight, travel,
  assault) **auto-banks** unclaimed loot — spoils are never destroyed. Player
  death (100-tick respawn) ends the fight.
- Quests: accept up to 3; kill objectives count in the quest's region,
  collect objectives track material pickups; complete → turn in for
  XP/gold/(gear). World boss: persistent HP pool, assault phase, damage
  banked across attempts.
- Saves: engine save per slot, written every 5 s + on hide/unload + on
  exit-to-title. **v4** current; v1–v3 accepted (dead fields ignored,
  zoneId→regionId migrated). Live fight state is never persisted.
- UI storage keys: slot saves `mythreach-save-v1` (slot 1, legacy) /
  `mythreach-save-s2-v1` / `-s3-`; identity profiles
  `mythreach-profile-sN-v1`; settings `mythreach-settings-v1`
  (`{muted, shake, motion}`). `SaveStore` (`ui/persistence.ts`) has a
  wipe-guard so a beforeunload save can't resurrect a wiped save — in-game
  erase goes through it; the title screen erases *cold* slots directly.

## Architecture map

```
src/engine/            pure TS simulation
  types.ts             ids, constants (GCD_TICKS…), snapshots, SaveData (v4)
  events.ts            CombatEvent union — the UI's only one-shot channel
  abilities.ts         7 abilities + effects as data
  content/             enemies regions zones(raw legacy) items materials quests
                       talents achievements companions worldboss
  progression.ts       xp curve, deriveStats(level, talents, gear), talent points
  playerUnit.ts        hero combat-side state (cast/queue/gcd/cds/buffs/venom)
  enemyUnit.ts         one spawned mob (swing/cast/enrage timers, ignite, loot)
  sim.ts               GameSim — THE game: tick order, fights/looting, regions,
                       quests, world boss, auto-battle, serialize/deserialize
  combatant.ts dot.ts rng.ts   small units (HP pool, DoT instance, mulberry32)

src/ui/
  profile.ts           save slots, identity profiles, settings (all UI-owned)
  persistence.ts       SaveStore: read/write/wipe with the wipe-guard
  loop.ts              rAF accumulator
  game.svelte.ts       Game store (one per slot): boots the sim from its slot's
                       store, drains events, autosaves, floats/impacts, keys.
                       Also implements FxHost — the director calls back in here.
  content/identity.ts  classes/origins/signs + the name forge (UI content —
                       the engine never reads it)
  sfx.ts format.ts     synth WebAudio; tick/label formatting
  fx/                  the combat effects layer (see "Combat FX" below)
    spells.ts          THE FILE YOU EDIT. One row per damage source.
    recipe.ts          the effect language: the Step union + playRecipe().
    stage.ts           Pixi canvas: pooled particles, projectiles, bolts, bloom
    director.ts        CombatEvent → choreography; handle()=one-shots, sync()=standing
    shake.ts palette.ts
  styles/tokens.css    design tokens incl. spell tones + the motion timing scale
  App.svelte           screen machine: title → create → game
  GameShell.svelte     the in-game layout (sidebar/topbar/views); owns
                       game.start()/stop() in onMount, gates attachShake on the
                       shake setting
  title/               TitleScreen CharacterCreation TitleSigil ClassEmblem SignMark
  components/          PlayerCard EnemyCard FloatLayer ActionBar AbilityButton
                       Bar Sidebar TopBar ItemTile Modal LevelUpBanner Toast
                       Background Filigree ArenaFx Vignette CritFlash BossIntro
                       portraits/ icons/
  views/               CombatView CharacterView TalentsView AtlasView QuestsView
                       ChronicleView SettingsView

tests/                 helpers.ts (testContent/makeSim/advance…) + 22 spec files
tools/shots.mjs        npm run shots — README screenshots (passes through the
                       title screen; injects save+profile blobs for mid-game)
docs/EXTENDING.md      the cookbook: abilities, effects, enemies, mechanics,
                       encounters, regions, talents, achievements, sounds, classes
```

Data flow: `loop` ticks sim → `Game` drains events once per tick → snapshots
publish per frame (combat) / on-dirty (progress) → views render. Player
intents (`use/startFight/loot/target/enterRegion/equip/sell/spendTalent/
accept/turnIn…`) call sim methods directly and force-publish.

**Screen flow:** `App.svelte` holds `screen: 'title' | 'create' | 'game'` and
creates `new Game(slot)` on entry; `GameShell` unmount stops the loop and
saves. **`App.exitToTitle()` must call `game.flush()` *before* switching
screens** — the title screen reads the slots the moment it mounts, which can
happen before GameShell's unmount save lands (this was a real bug, found via
Playwright).

## Design identity — "Arcane Observatory" (don't drift)

Tokens in `tokens.css` are the single source of truth; ether=player/casts,
arcana=magic/XP, ember=rewards ONLY; life/wound vitals; glass panels; gradient
bars with trailing loss layer; ether→arcana cast bar; conic cooldown wipes
(fainter for GCD); spring-pop floats (crits bigger, absorbs shield-blue);
one-shot `pulse()` classes for shake/bloom; Fraunces display / Inter UI,
tabular nums everywhere; reserved space over reflow; full reduced-motion
support (OS *and* the in-game setting via `:root[data-motion='reduced']` in
`base.css`). Rarity tokens only ever mean rarity; parametric enemy portraits
(8 families, hue-tinted, idle animations per family, eyes flare on enrage);
region hue relights the whole app (`--rh`, Background nebula + weather moods
derived from hue bands — keep moods a pure function of hue). Ornament
language: `Filigree.svelte` corners and the `.rule` engraved hairline. Class
hues live on `ClassDef.hue` and theme emblems/creation/slot cards the same
way regions theme the sky.

## Combat FX — "the arena is a place"

The combat page is a **stage**: a Pixi canvas over the cards, spells that fly
card-to-card, and effects that cling to the cards themselves.

### The four layers (do not collapse them)

```
spells.ts    DATA. What each spell looks and sounds like. One row per source.
recipe.ts    The effect language: a Step union + playRecipe(). No spell knowledge.
director.ts  Timing, weight, standing state. No idea what any spell looks like.
stage.ts     Pixi primitives: particles, projectiles, rings, bolts, emitters.
```

The rule: **`spells.ts` is the only file with opinions about a specific spell.**
If you find yourself adding `if (id === 'fireball')` anywhere else, stop.

### Adding things → **`docs/EXTENDING.md`**

That is the cookbook: abilities, ability-effect kinds, new visual `Step`
primitives, enemies, encounters, enemy mechanics, regions, talents,
achievements, sounds, identity content. Each recipe is a complete, verified
file list with the traps marked. **Read it before adding anything, and update
it when you change what a recipe touches** — it is the file that stops this
codebase from needing archaeology.

The short version for an ability: engine (`types.ts` union → `abilities.ts` ×3 →
`autoAct()` rotation), then look (`tokens.css` tone → `palette.ts` → one row in
`spells.ts` → an icon glyph). No director, stage, recipe or component changes.
Reuse the shared phrases (`DETONATE`, `DEBRIS`, `CRIT_FLOURISH`) — because tints
are symbolic (`'tone'`, `'deep'`, `'hot'`, `'mix'`), the same phrase comes out
orange for Fireball and violet for Ignite.

Two registration sites the compiler *cannot* guard, and both have bitten:
`ABILITY_IDS` (a plain array — a test now covers it) and the `{:else}` fallback
in `AbilityIcon.svelte` (a new ability with no branch silently renders
Combustion's sun).

### Rules that matter

- **Every spell has a tone**, mirrored between CSS and hex. A spell looks the
  same everywhere it appears: icon, cast bar, particles, damage number.
  Charging Fireball looks like fire.
- **Projectiles travel, and their consequences wait for them.** `director.damage()`
  launches the bolt and withholds the float, the card recoil, the shake and the
  sound until it *lands*. That arrival also lines up with the health bar's
  trailing loss layer. Never fire an impact effect straight off the `damage`
  event for a projectile spell.
- **One weight drives everything.** `director.weigh()` turns the damage into a
  single factor that scales particle size, shockwave reach, screen shake and
  the size of the number — so they can never disagree. It measures **absolute
  damage**, not a share of the target's health: a Pyroblast is a Pyroblast
  whether it hits a wolf or a boss, and sizing by share would draw a timid
  little number on the boss.
- Particles scale *tamer* than the text. Light is additive — doubling it reads
  as a white disc with the fight hidden behind it, not as "twice as big". The
  number is where a crit gets to shout.
- **Two channels, mirroring the engine's own split.** `handle(event)` for
  one-shots; `sync(snapshot)` for standing state (auras, charges). Persistent
  effects *must* be reconciled from the snapshot — an Ignite that expires
  quietly emits no event and would otherwise burn forever. Adding an aura is
  one `hold(...)` line in `sync`. Enemy standing state keys on the mob's `iid`.
- Gather emitters read cast progress from **fields**, not from a captured
  snapshot: a snapshot closed over at emitter-creation time is frozen at 0%.
- **Sound is not a motion effect.** `cue()` runs even under reduced motion; only
  visuals are gated. `sfx.play(name, gain)` — a heavy hit is a loud hit.
- **Reduced motion is a hard off-switch.** `FxDirector.reduced` is decided in
  the field initializer, *not* in `start()` — children mount before their
  parent's `onMount`, so `ArenaFx` asks for the stage first. Get this wrong and
  reduced-motion users spin up a WebGL context and download Pixi for nothing.
- Combustion sets `stage.intensity`, which multiplies particle counts: the buff
  is something you can *see* in every fire spell you cast while it's up.
- **Three render layers, and the routing matters.** `bloom` is blurred and
  composited additively — soft things (flashes, halos, shock rings, dissolve
  motes) go there so they *bleed light*. Crisp things (sparks, rays, debris,
  shards, bolts) go in `core` on top, where the blur can't smear them into
  mush. Smoke goes in `back`. Put a spark in `bloom` and you erase it; put a
  flash in `core` and it stops glowing. The contrast between the layers is the
  whole effect.
- `bloom.filterArea` is pinned to the canvas rect (and re-pinned on resize).
  Don't remove it — with hundreds of moving particles, Pixi recomputing the
  layer's bounds every frame costs more than the blur does.
- **Damage numbers stack into lanes** (`Game.float`). A DoT tick and a
  Pyroblast landing on the same frame would otherwise overlap into an
  unreadable smear — "122" over "11" literally read as "1122". Newest goes
  highest.

Dependencies: **pixi.js** (the canvas) and **gsap** (the boss-intro timeline,
and nothing else). Both dynamically imported — Pixi from `stage.mount()`, GSAP
from `BossIntro`.

Fonts are self-hosted in `public/fonts/` and preloaded from `index.html` —
keep them out of Vite's hashed pipeline.

## Verification workflow that works

- `npm test` for rules; add exact-tick boundary cases for any new rule.
- Balance: tweak content → run `tests/balance.test.ts`; for tuning detail,
  write a temporary diag test that plays campaigns and writes a report file
  (see git history for the pattern), then delete it.
- App level: throwaway Playwright drivers **inside the repo or importing the
  repo's node_modules by absolute path** (vite JS API, `port: 0`,
  `page.addInitScript` to inject `mythreach-save-v1` + `mythreach-profile-s1-v1`
  blobs for mid/late-game states, screenshot, view the PNG). Delete the driver
  when done. `tools/shots.mjs` is the committed example — note it now clicks
  *through the title screen* ("Enter the Reach" / "Begin a new legend" /
  "Begin the long hunt") before it can reach "Start fight".
- **Looking at the FX is the only way to verify the FX.** Tricks that paid off:
  - *Force the state you want.* Crits are rare — inject gear with `crit: 400`
    and every hit crits.
  - *Step, don't guess.* Press the key, then screenshot every ~85 ms for a few
    seconds and read the strip. Effects live 200–800 ms; a single timed
    screenshot will miss them.
  - *Probe the DOM, not the pixels, for structural bugs.* The dead-canvas bug
    was found via `document.querySelector('.fx-host').contains(canvas)` — the
    page still *looked* animated because the DOM bars kept moving.
  - *Always run a `reducedMotion: 'reduce'` context too* and assert
    `canvas count === 0`.
- Perf/size: `npm run build`. The hard byte budget is **retired** (owner's call,
  2026-07-13) — richer effects are worth the bytes. Pixi (~129 KB) and GSAP
  (~27 KB) stay *dynamically imported* anyway, because that is about **time to
  first fight**, not size. Keep new heavy deps async for the same reason.

## Known quirks & gotchas

- Svelte 5: track previous values inside `$effect` (see the card components)
  to avoid `state_referenced_locally`.
- One-shot CSS animations are re-armed by `classList.remove` → force reflow →
  `add` (the `pulse()` helper). Don't convert to reactive classes.
- `Game` store: the sim and its dependent `$state` fields are created **in the
  constructor** (`this.combat = $state(...)` — the Svelte-5-supported
  constructor-assignment form), because the sim needs the slot argument.
  Fields that don't depend on the sim keep plain field initializers. Don't
  move sim-dependent state back to field initializers — they run before the
  constructor body assigns `this.sim`.
- Wordmark gradient: `background-clip: text` on a *parent* fails through
  animated child spans in Chromium — each title letter carries its own
  offset slice of the gradient instead (`--bp` in `TitleScreen.svelte`).
- Enemy timers count the spawn tick: first swing lands at `swingTicks − 1`
  after spawn, first hardcast at `cooldown/2 − 1`. Tests encode this.
- **`FxStage.mount()` is not a one-shot.** `CombatView` (and so `ArenaFx`) is
  destroyed and rebuilt every time the player visits another tab, so mount is
  called again with a *new* host element. It must re-parent the canvas
  (`adopt`). An early `if (this.app) return` leaves the canvas in the old,
  destroyed div and effects silently die forever — and the DOM keeps
  animating, so it looks fine. `ArenaFx` pauses the stage on unmount.
- "WebGL context was lost" in the console at boot is **benign**: it is Pixi's
  `isWebGLSupported` probe deliberately calling `loseContext()` on a throwaway
  context. Don't chase it. (Real losses are handled in `stage.ts`.)
- Vitest runs only `tests/**/*.test.ts`; tools/ scripts are plain node.
- Older commits follow "Mx: summary" milestone prefixes (v1 shipped as M6);
  later builds use plain descriptive messages.

## Where the game goes next (when the user asks)

The owner likes the card-based combat framing and wants it pushed further, not
replaced. The content pack, the FX layer, *and now character identity* are all
data, so new content is cheap.

Candidates, in rough order of leverage:

- **Make a sealed class playable.** The creation screen already sells five
  (Gravewright / Hourwarden / Cartomancer / Thornspeaker / Riftblade), each
  with a designed signature mechanic. Flipping one `playable: true` is the
  promise the title screen makes — the engine work is a new ability school +
  the mechanic.
- **Origins and signs start to matter** — small stat leans in `deriveStats()`
  read from the profile at Game construction (identity would finally cross
  into the sim as *parameters*, still never as engine imports).
- **New abilities.** Engine ability + one `SPELL_FX` row.
- **Crafting** over the material bags; gear enchanting as a gold sink.
- **More enemy mechanics**: dispellable buffs, stacking debuffs, add-summons.
- Cloud saves (the world-boss HP pool and records are the designated seams).

Ideas considered and *not* done, with reasons:

- **Real audio samples.** Rejected in favour of upgrading the synth — zero
  asset bytes, no licensing surface. Revisit only if the owner wants a
  composed soundtrack.
- **Sizing damage numbers by share of target HP.** Tried, reverted: it draws a
  *timid* number on a boss, because bosses have more health. Absolute damage
  is correct. Don't re-derive this.
- **Bigger crit flashes.** Tried, reverted. Light is additive; scaling it up
  produces a white disc with the fight hidden behind it. The *number* is where
  a crit shouts. `weigh()` keeps particle scale deliberately tamer than text
  scale, and that comment is load-bearing.
