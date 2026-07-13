# Mythreach

**Idle when you're away. An RPG when you're here.**

Mythreach is an idle/incremental RPG with the clean dashboard presentation of
the genre's best — and, unlike nearly every idle game, a combat system you
actually *play*: an MMO-style action bar with cast times, cooldowns, a global
cooldown with spell queueing, interrupts, and healing decisions under pressure.

This repository is **v1 — "The Sundered Reaches"**: a complete single-player
campaign. Five zones, twenty-five enemies, five bosses, seven abilities, mana,
crits, XP and levels, loot with rarities, talents, achievements, auto-battle,
save games, and offline progress — the deterministic engine literally
simulates the hours you were gone.

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
   of mastery. Active play (rotations, cooldown usage, interrupt timing)
   meaningfully beats passive play without being mandatory — the auto-battle
   echo runs a sensible priority, but it doesn't burst bosses like you do.
3. **Never punish absence.** Your echo keeps fighting while you're away
   (capped at 8 hours); death costs seconds; the observatory heals you
   between pulls.
4. **Numbers you can feel.** Every point of damage is visible — splash, bar,
   log line — and progression beats come frequently and legibly.

The wedge, in one sentence: **the idle game where combat is real.**

## The game

An Arcanist of the Observatory pushes out through five zones toward Malgrath
the Worldrender. Kill ten creatures in a zone to earn a boss challenge; kill
the boss to unlock the next zone. On full auto the campaign arc runs about an
hour; played actively (and with better gear luck) it's faster — and the world
stays open for farming after the crown.

**The spellbook** (keys `1`–`7`, unlocked by level):

| Key | Ability | Type | What it does |
|-----|---------|------|--------------|
| `1` | Fireball | 2.2 s cast | 16–24 fire damage, the filler |
| `2` | Ignite | Instant, 8 s CD | burn: 5/s for 6 s, refreshable |
| `3` | Renew (Lv 2) | 1.8 s cast, 5 s CD | heals 20–28, scales with spirit |
| `4` | Pyroblast (Lv 4) | 3.5 s cast, 12 s CD | 48–64 fire damage |
| `5` | Counterspell (Lv 6) | Instant, off-GCD, 15 s CD | interrupts an enemy hardcast — only usable while they're casting |
| `6` | Arcane Barrier (Lv 8) | Instant, 20 s CD | absorb shield, 25 + 5/level |
| `7` | Combustion (Lv 11) | Instant, 30 s CD | 12 s: +25% fire damage, +20% crit |

Combat runs on a 1.2 s global cooldown with a forgiving spell queue: press
anything during a cast or GCD and it fires the moment it legally can. Mana
regenerates on a spirit-scaled clock and is the throttle on your burst. Spells
crit for 175%. Cooldowns start when an ability *resolves*; casts whose target
died mid-flight fizzle and refund their mana.

**Enemies fight back with mechanics**: elites and bosses *enrage* below 30%
HP (faster, harder swings), casters wind up interruptible *hardcasts*, and
venomous creatures stack damage-over-time on you. Bosses combine mechanics
and always drop rare-or-better loot.

**Progression**: XP → levels 1–15 (new spells, talent points, full restore),
gold, and generated items in four rarities across five slots — power, stamina,
spirit, and crit budgets that scale with item level. Six talents with five
ranks each shape your build; respec costs 50 gold. Fifteen achievements track
your deeds.

**Idle layer**: toggle auto-battle (`A`) and your echo runs the rotation —
including interrupts and defensive cooldowns. Close the tab and the game
saves; come back and the engine fast-forwards up to 8 hours of real combat,
then shows you the haul.

### Run it

```sh
npm install
npm run dev
```

| Script | What it does |
|--------|--------------|
| `npm run dev` | dev server with HMR |
| `npm run build` / `preview` | production build / serve it |
| `npm test` | the engine contract — 86 Vitest cases incl. a campaign balance envelope |
| `npm run check` | svelte-check + tsc, strict mode |
| `npm run shots` | build + headless Playwright screenshots into `docs/` (first run: `npx playwright install chromium`) |

## Architecture

Two layers with a hard boundary, plus a test suite that acts as the spec:

```
src/engine/   pure TypeScript simulation — no DOM, no Svelte, no window
src/ui/       Svelte 5 (runes) presentation over the engine
tests/        the behavioral contract
```

### The engine: a fixed-timestep integer simulation

The engine runs at **20 ticks per second**; every duration in the game is an
exact tick count (fireball cast 44, GCD 24, burn interval 20, respawn 100).
There are no floats and no wall-clock time inside the simulation, which makes
every rule exactly testable: *"damage lands on tick 44 and not on 43"* is an
assertion, not a hope.

`GameSim` is the whole game — combat **and** progression — behind four moves:

```ts
const sim = new GameSim({ rng })
sim.useAbility('fireball')   // start, queue, or refuse
sim.tick()                   // advance exactly one tick → CombatEvent[]
sim.combatSnapshot()         // HP/mana/shield, casts, cooldowns, GCD, enemy state
sim.progressSnapshot()       // level, gold, gear, talents, zones, achievements
```

Everything else follows from a few load-bearing ideas:

- **Events out, not callbacks in.** `tick()` returns a `CombatEvent[]`
  discriminated union (~25 kinds: damage with crit/absorb detail, casts,
  interrupts, enrages, loot, level-ups, boss flow, achievements). The UI
  drains each tick's events exactly once and derives *all* one-shot effects
  (floats, log lines, shakes, sounds, toasts) from them — never from state
  diffs.
- **Content is data.** The bestiary, zones, item affixes, talents, and
  achievements are plain typed objects in `src/engine/content/`. Enemy
  *mechanics* (enrage / hardcast / venom) are a tagged union the engine
  interprets — a new monster is data, not logic. Tests inject tiny custom
  content packs to pin rules independently of live balance numbers.
- **Injected RNG.** Seeded mulberry32 in tests, `Math.random` in the game.
  Loot generation, crits, and enemy rolls all flow through it — which is why
  the balance suite can Monte-Carlo the entire campaign headlessly.
- **Offline = the same simulation.** `fastForward(ticks)` runs the real
  engine with auto-battle on and summarizes what happened. There is no
  second "estimate" code path to drift out of sync.

### The UI: a 60 fps view of a 20 Hz truth

`src/ui/loop.ts` is a `requestAnimationFrame` accumulator stepping the sim
once per elapsed 50 ms. `src/ui/game.svelte.ts` is the bridge: a runes-based
`Game` store that owns the sim, publishes snapshots, fans events into the log
/ floats / choreography counters / synthesized WebAudio cues, autosaves to
`localStorage` every five seconds, and computes offline progress on boot.

Five views hang off a sidebar: **Combat** (zone banner with boss challenge,
player and enemy cards, log, action bar), **Character** (stats, paper-doll,
bags with stat-delta compare), **Talents**, **Atlas** (travel and boss
status), and **Chronicle** (lifetime stats, achievements). The sim never
pauses while you shop.

### The design system: "Arcane Observatory"

Luminous glass panes floating over a living void — deep, translucent, lit
from within. Vanilla modern CSS with **zero runtime dependencies**: `oklch()`
design tokens (`src/ui/styles/tokens.css` is the single source of truth),
`color-mix()` interaction tints, conic-gradient cooldown wipes (a fainter one
for the GCD), backdrop-filter glass with gradient 1 px edges, and a
drifting-blob background. Type is variable Fraunces (display) and Inter (UI),
self-hosted and preloaded; every number renders in tabular figures. The
accent trio — teal *ether* for the player, violet *arcana* for magic and XP,
gold *ember* strictly for rewards — keeps color meaningful, joined by four
rarity hues that only ever mean rarity. Enemy portraits are one parametric
duotone line-art component: eight creature families, tinted per creature,
eyes that flare red on enrage. Sound is synthesized WebAudio (no assets),
mutable, and off until your first gesture. Full `prefers-reduced-motion`
support throughout.

### The tests: the contract

`tests/` holds 86 cases across eleven files: the unit rules (combatant, DoT,
RNG), every ability's exact timing (GCD, queueing, fizzle refunds,
cooldown-at-resolve), enemy mechanics on custom content packs, progression
math pinned to formulas, item generation budgets, the boss/zone/campaign
flow, save round-trips, offline summaries — and a **balance envelope** that
auto-plays the whole campaign with a smart-player heuristic and asserts the
arc (first boss inside 15 minutes with ≤2 deaths; full clear in 0.6–3 hours
with <20 deaths). Balance changes that break the feel break the build.

`npm test` and `npm run check` green is the bar for every change. The build
ships at ~45 KB of gzipped JS.

## Where this goes next

v1 proves the full loop. Candidate directions: non-combat skills that feed
combat (the original dashboard-of-skills vision), prestige/rebirth systems,
more zone mechanics (dispellable buffs, positioning-as-a-resource), gear
enchanting as a gold sink, cloud saves, and sound design beyond synth blips.
See `HANDOFF.md` for the working state of the codebase.

## More shots

![Boss fight — Pyroblast into the Bramble Widow](docs/shot-2.png)
![Character and bags](docs/shot-3.png)
