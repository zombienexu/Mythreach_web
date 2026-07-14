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

1. **The dashboard is the world.** No 3D, no sprites, no art pipeline. Two
   cards, bars, floating numbers and a log carry the entire fight — an
   aesthetic commitment that keeps information density high and runs anywhere.
2. **But the cards are a stage, not a spreadsheet.** Spells are *thrown* from
   one card to the other. They gather in your hand, cross the gap, and
   detonate. Fire clings to what it burns. The presentation is austere by
   design and violent on purpose.
3. **Hands-on combat is the differentiator.** The idle audience wants moments
   of mastery. Active play (rotations, cooldown usage, interrupt timing)
   meaningfully beats passive play without being mandatory — the auto-battle
   echo runs a sensible priority, but it doesn't burst bosses like you do.
4. **Never punish absence.** Your echo keeps fighting while you're away
   (capped at 8 hours); death costs seconds; the observatory heals you
   between pulls.
5. **Numbers you can feel.** A damage number's *size is its value*. A burn tick
   is a small violet 11; a Pyroblast crit is an enormous stroked 240 that
   overshoots, snaps back and hangs in the air while the card it hit is still
   reeling. You never have to read a number to know how hard it landed.

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
| `npm test` | the engine contract — 88 Vitest cases incl. a campaign balance envelope |
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

`src/ui/loop.ts` is a `requestAnimationFrame` accumulator stepping the sim once
per elapsed 50 ms. `src/ui/game.svelte.ts` is the bridge: a runes-based `Game`
store that owns the sim, publishes snapshots, writes the log, autosaves to
`localStorage` every five seconds, and computes offline progress on boot. It
hands every event to the FX director (below), which decides *when* each number,
recoil and sound actually happens — a fireball's damage is dealt on the tick the
sim says so, but it isn't *shown* until the bolt lands.

Five views hang off a sidebar: **Combat** (zone banner with boss challenge,
player and enemy cards, log, action bar), **Character** (stats, paper-doll,
bags with stat-delta compare), **Talents**, **Atlas** (travel and boss
status), and **Chronicle** (lifetime stats, achievements). The sim never
pauses while you shop.

### The combat FX: effects as data

The fight is staged on a PixiJS canvas laid across both cards. The interesting
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
**GSAP** for exactly one thing (the boss-challenge cinematic). Both are
dynamically imported — the fight is playable before Pixi arrives, GSAP loads
only when you challenge a boss, and a reduced-motion player downloads neither.

### The tests: the contract

`tests/` holds 88 cases across eleven files: the unit rules (combatant, DoT,
RNG), every ability's exact timing (GCD, queueing, fizzle refunds,
cooldown-at-resolve), enemy mechanics on custom content packs, progression
math pinned to formulas, item generation budgets, the boss/zone/campaign
flow, save round-trips, offline summaries — and a **balance envelope** that
auto-plays the whole campaign with a smart-player heuristic and asserts the
arc (first boss inside 15 minutes with ≤2 deaths; full clear in 0.6–3 hours
with <20 deaths). Balance changes that break the feel break the build.

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
