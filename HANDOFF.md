# HANDOFF.md — Mythreach Web

> **You are a fresh Claude Code session.** This file is everything you need to
> pick up the project exactly where it stands. Read it, run the checkpoint
> commands, and you're oriented. (`WEB_PIVOT_PLAN.md` is the original v0 build
> brief — background reading only; the README covers the concept.)

## What this is, and where it stands

Mythreach Web is an idle/incremental RPG ("idle when you're away, an RPG when
you're here"). **v1 — "The Sundered Reaches" — is complete**: a five-zone
single-player campaign with 7 abilities (mana/GCD/spell-queue/crits/interrupts),
25 enemies with mechanics (enrage, interruptible hardcasts, venom DoTs), 5
bosses, XP/levels 1–15, generated loot in 4 rarities across 5 slots, 6 talents,
15 achievements, auto-battle, localStorage saves, offline fast-forward (up to
8 h of real simulation), synthesized sound, and five dashboard views
(Combat / Character / Talents / Atlas / Chronicle).

**v1.1 (M7–M9) rebuilt how combat *feels*.** The combat page used to be two
info panels — a number appeared and the card jiggled 1px. It is now a stage:
spells gather in your hand, fly card-to-card, and detonate; DoTs visibly burn
the card they're on; crits hurl the card and wash the room with light. The
whole effects layer is **data-driven** — a new ability's look and sound is one
row in `src/ui/fx/spells.ts` and nothing else. See "Combat FX" below; that is
the part of this codebase most likely to be worked on next, and the part with
the most non-obvious invariants.

### Current branch state

Work landed on branch **`combat-fx`** (pushed to origin), *not* on `master`.
Three commits: M7 (the FX layer), M8 (effects-as-data refactor + WoW-style
numbers), M9 (bloom, per-school sound, crit flash, float lanes). Merge to
master when the owner is happy with it.

v0 (one golem, three abilities) was milestones M0–M5; v1 replaced its rules
wholesale — the v0 "frozen rules" are obsolete. Balance is pinned by
`tests/balance.test.ts` instead: an auto-played campaign must clear in
0.6–3 h with <20 deaths, first boss inside 15 min with ≤2 deaths.

## Environment (read this first — it's non-obvious)

- **Node is NOT on the default PATH.** It's a local tarball install (v24.18.0
  LTS). Every shell command needs:

  ```sh
  export PATH="$HOME/.local/node/node-v24.18.0-linux-x64/bin:$PATH"
  ```

  Check with `which node` first. Do **not** try `curl | bash` installers or
  editing `~/.zshrc` yourself — the permission classifier blocks both.
- **Playwright chromium is already installed** (`~/.cache/ms-playwright`).
  If a fresh machine: `npx playwright install chromium`.
- Platform: Ubuntu, zsh, no sudo assumed.

## The contract (keep these green at all times)

```sh
npm test        # 86 Vitest cases — rules, content envelope, campaign balance
npm run check   # svelte-check + tsc, strict, 0 errors 0 warnings
```

Hard rules beyond the scripts:

1. **Engine purity.** `src/engine/` must never import DOM, Svelte, or
   `window`. Verify: `grep -rnE "document|window|svelte" src/engine/` → empty.
2. **Integer ticks.** 20 ticks/s (50 ms); every duration is an exact tick
   count. Milliseconds exist only in `src/ui/loop.ts` and save timestamps.
3. **Events are the only one-shot channel.** UI effects (floats, log, shake,
   sfx) derive from `CombatEvent`s, never from snapshot diffs.
4. **Content-independent tests.** Rule tests inject custom content packs
   (`tests/helpers.ts` → `testContent()`); only `balance.test.ts` and a few
   smoke tests touch live content numbers.

## Core rules quick-reference (tests pin the details)

- GCD 24 ticks, triggered by every ability except off-GCD Counterspell.
  Presses during cast/GCD **queue** (replacing any queued spell); the queue
  fires the tick both clear, drops if the target dies.
- Mana spends at cast *resolve*; fizzles (target died mid-cast) refund.
  Cooldowns always start at resolve. Regen every 20 ticks, spirit-scaled;
  +7% max HP/s heal while no enemy is on the field.
- Crits ×7/4. Combustion: +25% fire / +20% crit for 240 ticks. Barrier
  absorbs before HP (damage events carry `absorbed`). Ignite snapshots
  power/combustion at apply.
- Enemy hardcast: first cast at cooldown/2 after spawn, swings pause while
  casting, interrupt restarts the full cooldown. Enrage: once, at hpPct,
  swingMult/dmgMult. Venom: applies a Dot to the player on a timer.
- Kill → xp/gold/drop rolls → possible level-ups (full restore, unlock
  spells at 2/4/6/8/11) → boss-ready at 10 zone kills → boss kill unlocks
  the next zone; final boss sets `completed`. Player death (100-tick
  respawn) despawns the enemy; bosses must be re-challenged.
- Saves: `mythreach-save-v1` in localStorage, written every 5 s + on
  hide/unload. Offline: elapsed > 60 s → `fastForward(min(elapsed, 8h))`
  with auto-battle forced on; never challenges bosses.

## Architecture map

```
src/engine/            pure TS simulation
  types.ts             ids, constants (GCD_TICKS…), snapshots, SaveData
  events.ts            CombatEvent union — the UI's only one-shot channel
  abilities.ts         7 abilities + effects as data
  content/             enemies.ts zones.ts items.ts talents.ts achievements.ts
  progression.ts       xp curve, deriveStats(level, talents, gear), talent points
  playerUnit.ts        hero combat-side state (cast/queue/gcd/cds/buffs/venom)
  enemyUnit.ts         one spawned enemy (swing/cast/enrage/venom timers, ignite)
  sim.ts               GameSim — THE game: tick order, kill flow, zones/bosses,
                       auto-battle rotation, serialize/deserialize, fastForward
  combatant.ts dot.ts rng.ts   small units (HP pool, DoT instance, mulberry32+helpers)

src/ui/
  loop.ts              rAF accumulator (unchanged from v0)
  game.svelte.ts       Game store: boot/load/offline, event fan-out, autosave,
                       floats/log/impacts, banner/toast/victory, keys 1-7 + A.
                       Also implements FxHost — the director calls back in here.
  sfx.ts               synthesized WebAudio: layered voices (tone + filtered
                       noise), boss drone, low-HP heartbeat. Still zero assets.
  format.ts            ticksToSeconds/cooldownLabel/Clock/Duration, stat labels
  fx/                  the combat effects layer (see "Combat FX" below)
    stage.ts           Pixi canvas over the arena; pooled additive particles,
                       projectiles, shockwaves, bolts, standing emitters;
                       procedural textures; timeScale (hit-stop), intensity
    director.ts        CombatEvent → choreography. handle()=one-shots,
                       sync()=standing state. Owns projectile-delayed impacts.
    shake.ts           screen-shake impulse, exponential decay, rAF
    palette.ts         spell tones as hex — mirrors the --tone-* CSS tokens
  styles/tokens.css    design tokens incl. spell tones + the motion timing scale
  components/          PlayerCard EnemyCard FloatLayer ActionBar AbilityButton
                       Bar CombatLog Sidebar TopBar ItemTile Modal OfflineModal
                       VictoryModal LevelUpBanner Toast Background
                       ArenaFx (mounts the stage, measures anchors)
                       Vignette (threat / low-HP / combustion screen grade)
                       BossIntro (GSAP challenge cinematic)
                       portraits/HeroPortrait portraits/EnemyPortrait(parametric)
                       icons/AbilityIcon (7 glyphs)
  views/               CombatView CharacterView TalentsView AtlasView ChronicleView

tests/                 helpers.ts (testContent/makeSim/advance…) + 11 spec files
tools/shots.mjs        npm run shots — README screenshots (fresh fight, boss, bags)
```

Data flow: `loop` ticks sim → `Game` drains events once per tick → snapshots
publish per frame (combat) / on-dirty (progress) → views render. Player
intents (`use/travel/challengeBoss/equip/sell/spendTalent/respec`) call sim
methods directly and force-publish.

## Design identity — "Arcane Observatory" (don't drift)

Everything from v0 still applies: tokens in `tokens.css` are the single
source of truth; ether=player/casts, arcana=magic/XP, ember=rewards ONLY;
life/wound vitals; glass panels; gradient bars with trailing loss layer;
ether→arcana cast bar; conic cooldown wipes (fainter for GCD); spring-pop
floats (crits bigger, absorbs shield-blue); one-shot `pulse()` classes for
shake/bloom; Fraunces display / Inter UI, tabular nums everywhere; reserved
space over reflow (cast slot, buff chips row); full reduced-motion support.
New in v1: rarity color tokens (only ever mean rarity), parametric enemy
portraits (8 families, hue-tinted, eyes flare on enrage), zone hue accents,
enemy hardcast bar reads as *danger* (orange) vs the player's ether cast.

## Combat FX — "the arena is a place" (v1.1)

The combat page used to be two info panels: a number appeared and the card
jiggled. It is now a **stage**: a Pixi canvas over both cards, spells that fly
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

### Adding an ability

1. Define it in the engine (`abilities.ts`, `ABILITY_EFFECTS`, `ABILITY_IDS`).
2. Add a `--tone-<id>` CSS token in `tokens.css` and a `TONE`/`TONE_DEEP` entry
   in `fx/palette.ts`.
3. Add one row to `SPELL_FX` in `fx/spells.ts`: `charge`, `release`,
   `projectile` (omit ⇒ instant), `impact`, `crit`, `aura`, `sfx`.

That's it. No director, stage, recipe or component changes. Reuse the shared
phrases (`DETONATE`, `DEBRIS`, `CRIT_FLOURISH`) — because tints are symbolic
(`'tone'`, `'deep'`, `'hot'`, `'mix'`), the same phrase comes out orange for
Fireball and violet for Ignite.

### Adding a *kind* of effect

Only if no combination of existing Steps will do: add a primitive to `stage.ts`,
then a `Step` variant to `recipe.ts` that drives it. Everything downstream gets
it for free.

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
  one `hold(...)` line in `sync`.
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
- App level: throwaway Playwright drivers **inside the repo** (vite JS API,
  `port: 0`, `page.addInitScript` to inject a `mythreach-save-v1` blob for
  mid/late-game states, screenshot to scratchpad, view the PNG). Delete the
  driver when done. `tools/shots.mjs` is the committed example of all of this.
- **Looking at the FX is the only way to verify the FX**, and it caught every
  real bug in this work. Tricks that paid off:
  - *Force the state you want.* Crits are rare — inject gear with `crit: 400`
    and every hit crits. Want a hardcast? Challenge a boss and
    `page.getByText('interrupt!').waitFor()`.
  - *Step, don't guess.* Press the key, then screenshot every ~85 ms for a few
    seconds and read the strip. Effects live 200–800 ms; a single timed
    screenshot will miss them, and the combat log outlives the flash, so
    "the log says crit" is **not** evidence you captured one.
  - *Probe the DOM, not the pixels, for structural bugs.* `document.querySelector
    ('.fx-host').contains(canvas)` is how the dead-canvas bug was found and
    proven fixed — the page still *looked* animated because the DOM bars and
    numbers kept moving.
  - *Always run a `reducedMotion: 'reduce'` context too* and assert
    `canvas count === 0`.
- Perf/size: `npm run build`. The hard byte budget is **retired** (owner's call,
  2026-07-13) — richer effects are worth the bytes. The entry chunk is ~57 KB
  gzip; Pixi (~129 KB) and GSAP (~27 KB) stay *dynamically imported* anyway,
  because that is about **time to first fight**, not about size: the game is
  playable before Pixi lands, GSAP only loads on a boss challenge, and a
  reduced-motion player downloads neither. Keep new heavy deps async for the
  same reason.

## Known quirks & gotchas

- Svelte 5: track previous values inside `$effect` (see `wasAlive` /
  `lastDefId` patterns in the cards) to avoid `state_referenced_locally`.
- One-shot CSS animations are re-armed by `classList.remove` → force reflow →
  `add` (the `pulse()` helper). Don't convert to reactive classes.
- `Game` store: field initializers may reference earlier fields (`boot()`
  runs first); don't move sim creation into the constructor body — `$state`
  initializers need it.
- The enemy card renders `lastEnemy` (a kept snapshot) while `combat.enemy`
  is null so the "Slain" veil + respawn countdown work; clear `lastEnemy` on
  travel/challenge/spawn.
- The kill line in the log is folded from three events (enemyDied + xpGained
  + goldGained) inside `Game.step()` — don't log those individually.
- Enemy timers count the spawn tick: first swing lands at `swingTicks − 1`
  after spawn, first hardcast at `cooldown/2 − 1`. Tests encode this.
- `.gold` is both a TopBar chip class and a log-entry tone — scope selectors
  (`.stat.gold`) in drivers.
- **`FxStage.mount()` is not a one-shot.** `CombatView` (and so `ArenaFx`) is
  destroyed and rebuilt every time the player visits another tab, so mount is
  called again with a *new* host element. It must re-parent the canvas into it
  (`adopt`). An early `if (this.app) return` leaves the canvas in the old,
  destroyed div and effects silently die forever — and the DOM bars/log/floats
  keep animating, so it looks like the game is fine. `ArenaFx` pauses the stage
  on unmount; `ready` is false while paused, so nothing spawns unrendered.
- "WebGL context was lost" in the console at boot is **benign**: it is Pixi's
  `isWebGLSupported` probe deliberately calling `loseContext()` on a throwaway
  context. Don't chase it. (Real losses are handled in `stage.ts`.)
- Vitest runs only `tests/**/*.test.ts`; tools/ scripts are plain node.
- Commits follow "Mx: summary" milestone prefixes (v1 shipped as M6).

## Where the game goes next (when the user asks)

The owner likes the card-based combat framing and wants it pushed further, not
replaced. Both the content pack *and* the FX layer are now data, so new
zones, enemies and spells are cheap.

Candidates, in rough order of leverage:

- **New abilities.** The cheapest big win now. Engine ability + one `SPELL_FX`
  row. A frost school (slows, shatter crits) or a shadow drain would give the
  registry a second colour family to prove itself against.
- **Non-combat skills that feed combat** — the original dashboard-of-skills
  vision.
- **Prestige/rebirth**, gear enchanting as a gold sink.
- **More enemy mechanics**: dispellable enemy buffs, stacking debuffs,
  add-summoning. Mechanics are a tagged union in the engine; the FX for a new
  one is a `hold(...)` line in `director.sync` plus a recipe.
- Cloud saves.

Ideas considered and *not* done, with reasons:

- **Real audio samples.** Rejected in favour of upgrading the synth — zero
  asset bytes, no licensing surface, and layered noise+tone impacts got
  genuinely punchy. Revisit only if the owner wants a composed soundtrack.
- **Sizing damage numbers by share of target HP.** Tried, reverted: it draws a
  *timid* number on a boss, because bosses have more health. Absolute damage
  is correct. Don't re-derive this.
- **Bigger crit flashes.** Tried, reverted. Light is additive; scaling it up
  produces a white disc with the fight hidden behind it. The *number* is where
  a crit shouts. `weigh()` keeps particle scale deliberately tamer than text
  scale, and that comment is load-bearing.
