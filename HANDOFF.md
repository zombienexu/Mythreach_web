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
jiggled. It is now a **stage**. Rules that matter:

- **Every spell has a tone** (`--tone-fireball` … `--tone-combustion`, mirrored
  as hex in `fx/palette.ts`). A spell looks the same everywhere it appears:
  icon, cast bar, particles, damage number. Charging Fireball looks like fire.
- **Projectiles travel, and their consequences wait for them.** `director.damage()`
  launches a bolt and withholds the float, the card recoil, the shake and the
  sound until it lands (~140 ms fireball, ~280 ms pyroblast). That arrival also
  lines up with the health bar's trailing loss layer. Never fire an impact
  effect straight off the `damage` event for a projectile spell.
- **Two channels, mirroring the engine's own split.** `handle(event)` for
  one-shots; `sync(snapshot)` for standing state (ignite aura, combustion,
  enrage, enemy hardcast). Persistent effects must be reconciled from the
  snapshot — an Ignite that expires quietly emits no event, and would otherwise
  burn forever.
- **Sound is not a motion effect.** `cue()` runs even under reduced motion.
  Only visuals are gated.
- **Reduced motion is a hard off-switch.** `FxDirector.reduced` is decided in
  the field initializer, *not* in `start()` — children mount before their
  parent's `onMount`, so `ArenaFx` asks for the stage first. Get this wrong and
  reduced-motion users spin up a WebGL context and download Pixi for nothing.
- Combustion sets `stage.intensity`, which multiplies particle counts: the buff
  is something you can *see* in every fire spell you cast while it's up.
- Crits get hit-stop (`stage.hitStop`), a second shockwave, and a white flash.

Dependencies (v1.1): **pixi.js** (the particle/projectile canvas) and **gsap**
(the boss-intro timeline only). Both are dynamically imported — Pixi from
`stage.mount()`, GSAP from `BossIntro`. Keep it that way: it holds the entry
chunk near 56 KB and means a reduced-motion player downloads neither.

Fonts are self-hosted in `public/fonts/` and preloaded from `index.html` —
keep them out of Vite's hashed pipeline.

## Verification workflow that works

- `npm test` for rules; add exact-tick boundary cases for any new rule.
- Balance: tweak content → run `tests/balance.test.ts`; for tuning detail,
  write a temporary diag test that plays campaigns and writes a report file
  (see git history for the pattern), then delete it.
- App level: throwaway Playwright drivers **inside the repo** (vite JS API,
  `port: 0`, `page.addInitScript` to inject a `mythreach-save-v1` blob for
  mid/late-game states, screenshot to scratchpad, view the PNG).
  `tools/shots.mjs` is the committed example of all of this.
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

Candidates, in rough order of leverage: non-combat skills that feed combat
(the original dashboard-of-skills vision), prestige/rebirth, gear enchanting
as a gold sink, more mechanics (dispellable enemy buffs, stacking debuffs),
cloud saves, richer audio. The content pack + mechanics-union design means
new zones/enemies are pure data; the balance suite tells you if they fit the
curve.
