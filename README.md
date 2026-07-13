# Mythreach

**Idle when you're away. An RPG when you're here.**

Mythreach is an idle/incremental RPG with the clean dashboard presentation of
the genre's best — and, unlike nearly every idle game, a combat system you
actually *play*: an MMO-style action bar with cast times, cooldowns, a DoT to
keep rolling, and healing decisions under pressure.

This repository is the **v0 web prototype**: one encounter, three abilities,
and a bespoke interface, built to prove two things — that the hands-on combat
*feels* worth playing, and that the web is the right home for a game whose
world is a dashboard.

![Combat mid-fight](docs/shot-1.png)

## The concept

You run a hero's whole life from a command dashboard — skills ticking,
resources accruing, numbers climbing. But when a fight matters, you take the
controls yourself and outplay the encounter. The player is both an *operator*
(efficient, organized, always progressing) and a *raider* (executing a
rotation, clutching a heal at 10% HP).

Design pillars:

1. **The dashboard is the world.** No 3D, no animation budget. Cards, bars,
   floating numbers, and a log carry all feedback — an aesthetic commitment
   that keeps information density high and runs on anything.
2. **Hands-on combat is the differentiator.** The idle audience wants moments
   of mastery. Active play (rotations, cooldown usage, heal timing) should
   meaningfully beat passive play without being mandatory.
3. **Never punish absence.** Everything progresses or auto-resolves at a
   baseline; active play is a multiplier, not a gate. Death costs seconds.
4. **Numbers you can feel.** Every point of damage is visible — splash, bar,
   log line — and progression beats come frequently and legibly.

The wedge, in one sentence: **the idle game where combat is real.**

## The prototype

Fight the Cave Golem, forever. Abilities by key or click:

| Key | Ability | Type | Numbers |
|-----|----------|------|---------|
| `1` | Fireball | 2.5 s cast | 16–24 damage |
| `2` | Ignite | Instant, 8 s cooldown | DoT: 4 damage/s for 6 s (24 total) |
| `3` | Renew | 1.8 s cast, 5 s cooldown | Heals 18–26, clamped at max |

One cast at a time — no queueing, no global cooldown. The golem swings every
2.2 s for 5–9. Offensive casts need a living target to start; if the target
dies mid-cast, the cast completes but *fizzles*. Kills pay 10 gold; both
sides respawn 3 s after death (yours resets the encounter). Cooldowns start
when an ability resolves, not when you press the button.

### Run it

```sh
npm install
npm run dev
```

| Script | What it does |
|--------|--------------|
| `npm run dev` | dev server with HMR |
| `npm run build` / `preview` | production build / serve it |
| `npm test` | the engine contract — 42 Vitest cases |
| `npm run check` | svelte-check + tsc, strict mode |
| `npm run shots` | build + headless Playwright screenshots into `docs/` (first run: `npx playwright install chromium`) |

## Architecture

Two layers with a hard boundary, plus a test suite that acts as the spec:

```
src/engine/   pure TypeScript simulation — no DOM, no Svelte, no window
src/ui/       Svelte 5 (runes) presentation over the engine
tests/        the behavioral contract, written before the engine was
```

### The engine: a fixed-timestep integer simulation

The engine runs at **20 ticks per second**; every duration in the game is an
exact tick count (fireball cast 50, golem swing 44, DoT interval 20, respawn
60). There are no floats and no wall-clock time inside the simulation, which
makes every rule exactly testable: *"damage lands on tick 44 and not on 43"*
is an assertion, not a hope.

```ts
const engine = new CombatEngine(config, rng)
engine.useAbility('fireball')   // instant resolve or cast start; false if refused
engine.tick()                   // advance exactly one tick → CombatEvent[]
engine.snapshot()               // HP, cast/swing progress, cooldowns, DoT, kills, gold
```

Three ideas do the load-bearing work:

- **Events out, not callbacks in.** `tick()` returns a `CombatEvent[]` — a
  discriminated union (`damage`, `heal`, `castStarted/Finished/Fizzled`,
  `dotApplied`, deaths, respawns). The engine stays synchronous,
  allocation-light, and trivially testable; the UI drains each tick's events
  exactly once and derives *all* one-shot effects (floating numbers, log
  lines, shakes) from them, never from state diffs.
- **Content is data.** `abilities.ts` exports the three abilities as plain
  typed objects (`effect: damage | dot | heal`); the engine interprets them.
  Adding an ability is adding data, not logic.
- **Injected RNG.** A four-line seeded mulberry32 in tests (pin exact rolls
  or collapse ranges via config, e.g. `enemyDamageMin = enemyDamageMax`),
  `Math.random` in the shipped game.

Small focused units compose the rules: `Combatant` (HP pool: overkill clamps
to 0, the dead can't be damaged or healed, heals report only what was
actually restored), `Dot` (interval timer with refresh-on-reapply), and
`CombatEngine` orchestrating cast resolution, fizzles, cooldowns-at-resolve,
swing timers, and death/respawn — with the guaranteed ordering that a killing
damage event precedes its death event.

### The UI: a 60 fps view of a 20 Hz truth

`src/ui/loop.ts` is a `requestAnimationFrame` accumulator: it steps the
engine once per elapsed 50 ms and clamps catch-up to ~2 s per frame, so a
backgrounded tab fast-forwards briefly on return instead of spiralling —
a quiet demo of the idle premise.

`src/ui/game.svelte.ts` is the bridge: a runes-based `Game` store that owns
the engine, publishes a fresh `snapshot()` on frames where a tick ran, and
fans events into UI state — the color-coded auto-scrolling log, floating
damage/heal numbers, and bump-counters that drive hit-shake and heal-bloom
choreography. Keyboard (1/2/3) and clicks both funnel into `engine.useAbility`;
the engine itself is the only authority on what's allowed.

CSS transitions smooth the 20 Hz steps into continuous motion (bar fills
animate ~120 ms; HP bars carry a brighter "loss" layer that drains late,
fighting-game style).

### The design system: "Arcane Observatory"

Luminous glass panes floating over a living void — deep, translucent, lit
from within. Implemented in vanilla modern CSS with **zero runtime
dependencies**: design tokens as custom properties in `oklch()`
(`src/ui/styles/tokens.css` is the single source of truth), `color-mix()`
for interaction tints, conic-gradient cooldown wipes, backdrop-filter glass
with gradient 1 px edges (and an opaque fallback), and a drifting-blob
background animated with transforms only. Type is variable Fraunces (display)
and Inter (UI), self-hosted and preloaded; every number renders in tabular
figures so nothing jitters. The accent trio — teal *ether* for the player and
casts, violet *arcana* for magic and DoTs, gold *ember* reserved exclusively
for currency — keeps color meaningful. Full `prefers-reduced-motion` support
strips drift, sheen, and springs while keeping every state change instant.

Portraits and ability icons are hand-drawn inline SVG in one consistent
duotone line-art style with soft glows.

### The tests: the contract

`tests/` holds 42 cases across nine files — combatant rules, DoT mechanics,
each ability's exact timing and boundaries, enemy swing behavior, the
encounter loop (kill/gold/respawn, fizzle ordering), and player death. They
were written before the engine and are the project's definition of correct;
`npm test` and `npm run check` green is the bar for every change. The build
ships at ~23 KB of gzipped JS.

## Where this goes next

v0 validates the feel thesis. The path to a marketable game is content
breadth and retention: a vertical slice (GCD + queueing, enemy mechanics,
6–8 abilities, XP/gear/zones, idle auto-resolve with save and offline
progress — which the deterministic engine can literally simulate — and
sound), then interlocking non-combat skills, then a web demo → Steam →
mobile release with a premium model. See `HANDOFF.md` for the working state
of the codebase.

## More shots

![Fireball lands](docs/shot-2.png)
![Renew mid-cast](docs/shot-3.png)
