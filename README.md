# Mythreach

**An RPG you actually play — and your absence is simply respected.**

Mythreach is a dashboard RPG with the clean presentation of the incremental
genre's best — and a combat system you actually *play*: an MMO-style action bar
with cast times, cooldowns, a global cooldown with spell queueing, interrupts,
and healing decisions under pressure. It is **active-only**: no away-from-game
progression, no passive accrual. When you step away, the world simply waits for
you.

This repository is **v1 — "The Wayfarer's Atlas"**: a complete single-player
campaign. Five zones walked as **expeditions**, twenty-five enemies, five
bosses, seven abilities, mana, crits, XP and levels, loot with rarities,
talents, achievements, auto-battle, and save games — all driven by one
deterministic, pure engine.

![Combat mid-fight](docs/shot-1.png)

## The concept

You run a hero's whole life from a command dashboard — skills ticking,
resources accruing, numbers climbing. But when a fight matters, you take the
controls yourself and outplay the encounter. The player is both an *operator*
(efficient, organized, always progressing) and a *raider* (executing a
rotation, clutching a heal at 10% HP).

Design pillars:

1. **The dashboard is the world.** No 3D, no sprites, no art pipeline. Two
   cards, bars, floating numbers and a log carry the entire fight — an
   aesthetic commitment that keeps information density high and runs anywhere.
2. **But the cards are a stage, not a spreadsheet.** Spells are *thrown* from
   one card to the other. They gather in your hand, cross the gap, and
   detonate. Fire clings to what it burns. The presentation is austere by
   design and violent on purpose.
3. **Hands-on combat is the differentiator.** The dashboard audience wants
   moments of mastery. Active play (rotations, cooldown usage, interrupt timing)
   meaningfully beats passive play without being mandatory — the auto-battle
   echo runs a sensible priority, but it doesn't burst bosses like you do.
4. **Respect absence — don't simulate it.** The game is active-only: no
   away-from-game catch-up and no passive accrual. Close the tab and nothing
   happens; your absence is respected by the world simply waiting for you.
   Auto-battle is an active-session assist (tab open, you present), and camp
   heals you between expeditions.
5. **Numbers you can feel.** A damage number's *size is its value*. A burn tick
   is a small violet 11; a Pyroblast crit is an enormous stroked 240 that
   overshoots, snaps back and hangs in the air while the card it hit is still
   reeling. You never have to read a number to know how hard it landed.

The wedge, in one sentence: **the dashboard RPG where combat is real and your
time is your own.**

## The game

An Arcanist of the Observatory pushes out through five zones toward Malgrath
the Worldrender. Each zone is not a farm field but a **trail**: from camp — the
Wayfarer's Rest — you **embark** on an expedition, a generated route of eight
nodes plus a final boss that you walk node by node. Fights come as *encounters*
— a lone brute, a pair, or a vanguard of two screening minions with something
meaner chanting behind them. Click a card (or Tab) to switch targets;
Counterspell only reads your target's lips, so the wisp hiding behind its whelps
is your problem to solve. Complete the boss node to finish the expedition and,
the first time, unlock the next zone. You may **turn back** at any point,
keeping everything earned. On full auto the campaign arc runs a couple of hours;
played actively (and with better gear luck) it's faster.

**The spellbook** (keys `1`–`7`, unlocked by level):

| Key | Ability | Type | What it does |
|-----|---------|------|--------------|
| `1` | Fireball | 2.2 s cast | 16–24 fire damage, the filler |
| `2` | Ignite | Instant, 8 s CD | burn: 5/s for 6 s, refreshable |
| `3` | Renew (Lv 2) | 1.8 s cast, 5 s CD | heals 20–28, scales with spirit |
| `4` | Pyroblast (Lv 4) | 3.5 s cast, 12 s CD | 48–64 fire damage |
| `5` | Counterspell (Lv 6) | Instant, off-GCD, 15 s CD | interrupts your target's hardcast — switch to the caster first |
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

**Expeditions**: from camp you `embark` (Space) on a generated route of eight
nodes plus a boss. You **travel** between nodes (fog of war hides each kind
until you walk toward it), resolve what you find, and press on. Node kinds are
data-interpreted like enemy mechanics: **battle** and **elite** packs; **cache**
(gold and sometimes an item); **shrine** (pick one of two expedition-scoped
**blessings**); **rest** (restore health and mana); and the final **boss**. Die
and the expedition ends; turn back and you keep the loot. Toggle auto-battle
(`A`) and your echo walks the whole route hands-free — embarking, advancing,
fighting, and taking the first blessing offered.

**Scaffolds of the multiplayer future**: three systems ship as single-player
scaffolds for features a server will someday own. **The Rift Colossus** is a
world boss with a persistent HP pool that survives across assaults (the one
field a server would own), banking your damage each time and paying out when
felled. **Records** track expeditions completed, world-boss fells, best assault
damage, and per-zone fastest boss kills. And you can **hire a companion** — a
sellsword who fights at your side on their own timer. Each is deliberately one
field and one interpreter away from going networked.

### Run it

```sh
npm install
npm run dev
```

| Script | What it does |
|--------|--------------|
| `npm run dev` | dev server with HMR |
| `npm run build` / `preview` | production build / serve it |
| `npm test` | the engine contract — 122 Vitest cases incl. an engine-purity guard and a campaign balance envelope |
| `npm run check` | svelte-check + tsc, strict mode |
| `npm run shots` | build + headless Playwright screenshots into `docs/` (first run: `npx playwright install chromium`) |

## Architecture

Three layers with hard boundaries, plus a test suite that acts as the spec:

```
src/engine/   pure TypeScript simulation — no DOM, no Svelte, no window
src/ui/       Svelte 5 (runes) presentation over the engine
src/ui/fx/    the combat effects layer — declarative, data-driven
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
const sim = new GameSim({ rng })   // rng is required — the engine owns no wall clock
sim.embark()                 // set out from camp on a generated expedition
sim.useAbility('fireball')   // start, queue, or refuse
sim.tick()                   // advance exactly one tick → CombatEvent[]
sim.combatSnapshot()         // phase, expedition, HP/mana/shield, casts, cooldowns, enemy state
sim.progressSnapshot()       // level, gold, gear, talents, zones, records, achievements
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
- **Injected RNG, required.** The engine takes its randomness as a constructor
  option — seeded mulberry32 in tests, the platform PRNG in the game — and has
  no `Math.random` default and no wall clock of its own. Loot, crits, enemy
  rolls, and route generation all flow through it, which is why the balance
  suite can Monte-Carlo the entire campaign headlessly. A `purity.test.ts` reads
  every engine source and fails the build on any ambient global, `Date.now`, or
  reach into the UI world. Saves are **v2** (v1 saves still load, their dead
  fields ignored); expedition state is never persisted — reload and you are at
  camp.
- **Active-only, by construction.** There is no away-from-game path.
  `src/ui/loop.ts` discards a backgrounded tab's gap rather than replaying it, so
  absence never progresses the game.

### The UI: a 60 fps view of a 20 Hz truth

`src/ui/loop.ts` is a `requestAnimationFrame` accumulator stepping the sim once
per elapsed 50 ms. `src/ui/game.svelte.ts` is the bridge: a runes-based `Game`
store that owns the sim, publishes snapshots, writes the log, and autosaves to
`localStorage` every five seconds. It
hands every event to the FX director (below), which decides *when* each number,
recoil and sound actually happens — a fireball's damage is dealt on the tick the
sim says so, but it isn't *shown* until the bolt lands.

Five views hang off a sidebar: **Combat** (zone banner with the expedition trail
ribbon, the enemy pack up top, your card above the action bar, the log between),
**Character** (stats, paper-doll, bags with stat-delta compare), **Talents**,
**Atlas** (travel between zones and the Rift Colossus panel), and **Chronicle**
(lifetime stats, records, achievements). The sim never pauses while you shop.

### The combat FX: effects as data

The fight is staged on a PixiJS canvas laid across the whole battlefield. The interesting
part isn't the particles — it's that **no code anywhere describes what a spell
looks like**. Effects are declarative:

```ts
// src/ui/fx/spells.ts — the only file with opinions about a specific spell
fireball: {
  tone: TONE.fireball, deep: TONE_DEEP.fireball, css: 'var(--tone-fireball)',
  charge:     { rate: 0.022, radius: 62, tighten: 0.55 },   // motes spiral into your hand
  projectile: { flight: 0.14, size: 20, arc: -18, /* … */ },// it crosses the arena
  impact:     [ ...DETONATE(78, 250), DEBRIS(32, 760, 19),
                { fx: 'rays', tint: 'hot', count: 6, reach: 150, width: 10 },
                { fx: 'shake', amp: 6 } ],
  crit:       CRIT_FLOURISH,
  sfx:        { release: 'cast', impact: 'hit', crit: 'crit' },
},
```

Adding an ability is ~24 lines in that table plus a colour token — the director,
the stage, the recipe engine and every component are untouched.
**[`docs/EXTENDING.md`](docs/EXTENDING.md) is the cookbook** for that and for
every other kind of content: new abilities, new effect primitives, enemies, enemy
mechanics, zones, talents, achievements, sounds. Four strata:

| | |
|---|---|
| `spells.ts` | **data.** One row per damage source: charge, release, projectile, impact, crit, aura, sounds. |
| `recipe.ts` | the effect language — a `Step` union and `playRecipe()`. Knows nothing about spells. |
| `director.ts` | timing, weight, standing state. Knows nothing about what a spell *looks* like. |
| `stage.ts` | Pixi primitives: pooled additive particles, projectiles, shockwaves, bolts, emitters. |

Three ideas do most of the work:

- **Tints are symbolic.** A recipe says `'tone'`, never `0xff7a2f`. So shared
  phrases (`DETONATE`, `CRIT_FLOURISH`) resolve against whichever spell is
  playing them and come out orange for Fireball, violet for Ignite.
- **Projectiles travel, and their consequences wait for them.** When the sim
  resolves a Fireball, the bolt is launched and the number, the card recoil,
  the shake and the sound are all *withheld* until it lands — which is also
  when the health bar's trailing loss layer begins to drain. Cause and effect
  line up, because they were made to.
- **One weight drives everything.** A single factor derived from the damage
  scales particle size, shockwave reach, screen shake and the size of the
  number *together*, so they can never disagree. It measures absolute damage,
  not a share of the target's health — a Pyroblast is a Pyroblast whether it
  hits a wolf or a boss.

Crits get their own grammar: the card is hurled rather than nudged, flashes
white to the bone, the room washes with light, time stops for 80 ms, and a star
of rays tears out of the impact. Combustion raises a global particle
`intensity`, so the buff is something you can *see* in every spell you cast
while it's up. Bright soft things render into a blurred additive bloom layer
while sparks stay crisp on top — that contrast is what stops 2D particles from
looking like 2D particles.

Sound is synthesized WebAudio with no assets: impacts are layered from a body
(a low sine thumping down), a crack (a filtered noise burst) and a sizzle. A
claw doesn't sound like a fireball, and `play(name, gain)` means a heavy hit is
a *loud* hit. A drone hangs under boss fights; a heartbeat starts when you're
nearly dead.

Everything above is gated behind `prefers-reduced-motion`, which is a hard
off-switch: no canvas is created, no shake, and Pixi's chunk is never even
downloaded — while every number, colour and sound survives.

### The design system: "Arcane Observatory"

Luminous glass panes floating over a living void — deep, translucent, lit from
within. The chrome is vanilla modern CSS: `oklch()` design tokens
(`src/ui/styles/tokens.css` is the single source of truth), `color-mix()`
interaction tints, conic-gradient cooldown wipes (a fainter one for the GCD),
backdrop-filter glass with gradient 1 px edges, and a drifting-blob background.
Type is variable Fraunces (display) and Inter (UI), self-hosted and preloaded;
every number renders in tabular figures.

**Every spell owns a hue**, and wears it everywhere it appears — its icon, its
cast bar, its particles, its damage numbers. Charging a Fireball *looks* like
fire gathering; charging a Barrier looks like ice. Around that, the accent trio
— teal *ether* for the player, violet *arcana* for magic and XP, gold *ember*
strictly for rewards — keeps colour meaningful, joined by four rarity hues that
only ever mean rarity. Enemy portraits are one parametric duotone line-art
component: eight creature families, tinted per creature, eyes that flare red on
enrage.

Motion follows one timing scale — fast (130 ms) for buttons, medium (240 ms)
for panels, slow (480 ms) for navigation, epic (1100 ms) for level-ups and boss
challenges. Nothing invents its own duration.

Runtime dependencies are deliberately few: **PixiJS** for the effects canvas and
**GSAP** for exactly one thing (the boss-intro cinematic). Both are dynamically
imported — the fight is playable before Pixi arrives, GSAP loads only when a
boss node announces itself, and a reduced-motion player downloads neither.

### The tests: the contract

`tests/` holds 122 cases across sixteen files: an **engine-purity guard** that
fails the build on any ambient global or wall-clock in the engine, the unit
rules (combatant, DoT, RNG), every ability's exact timing (GCD, queueing, fizzle
refunds, cooldown-at-resolve), enemy mechanics on custom content packs,
progression math pinned to formulas, item generation budgets, the full
**expedition** state machine (route rules, fog of war, retreat/death/completion,
hands-free auto-battle), the world boss, companion, and save round-trips
(including v1→v2 migration) — and a **balance envelope** that auto-plays the
whole campaign with a smart-player heuristic and asserts the arc (first boss
inside 15 minutes with ≤2 deaths; full clear in 0.5–3 hours with <25 deaths).
Balance changes that break the feel break the build.

`npm test` and `npm run check` green is the bar for every change. The entry
chunk ships at ~59 KB gzipped; Pixi and GSAP load asynchronously behind it.

## Where this goes next

v1 proves the full loop, and the FX layer is now data, so new spells are cheap.
Candidate directions: non-combat skills that feed combat (the original
dashboard-of-skills vision), prestige/rebirth systems, more zone mechanics
(dispellable buffs, positioning-as-a-resource), gear enchanting as a gold sink,
and cloud saves. See `HANDOFF.md` for the working state of the codebase and a
recipe for adding an ability.

## More shots

![Pyroblast detonating on the Bramble Widow](docs/shot-2.png)
![Character and bags](docs/shot-3.png)
