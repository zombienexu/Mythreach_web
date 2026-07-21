# Mythreach

**An RPG you actually play — and your absence is simply respected.**

Mythreach is a dashboard action-RPG wrapped in a science-fiction frame: you are
a far-future **Fieldworker** whose consciousness is projected into a lost
magical past to *recover* a dead art by living it. Combat is real — an
MMO-style kit with cast times, cooldowns, spell queueing, interrupts, an
auto-swinging weapon, and one universal timing read (**Focus**) that rewards
watching both your foe's wind-up and your own. It is **active-only**: no
away-from-game progression, no passive accrual. When you step away, the world
simply waits for you.

The current build is a complete single-player slice: a title screen with three
save slots, a five-beat onboarding (naming → lore → the Projection Station →
arrival), **the Kindle Yard** — a WoW-style recruitment-camp opening where you
duel fellow trainees with a wooden staff before the Legion teaches you your
first spell — then eight war-fronts (levels 1–24), a field board of rolled
sightings with rare champions and apex world-bosses, quests, talents, loot,
materials, a Standing → Grace teaching ladder, a research Codex, and local
saves — all driven by one deterministic, pure engine.

![The title screen](docs/shot-title.png)

## The concept

You run a hero's whole life from a command dashboard — skills ticking,
resources accruing, numbers climbing. But when a fight matters, you take the
controls yourself and outplay the encounter. The player is both an *operator*
(efficient, organized, always progressing) and a *raider* (executing a
rotation, clutching a heal at 10% HP).

Design pillars:

1. **The dashboard is the world.** No 3D, no sprites, no art pipeline. Cards,
   bars and floating numbers carry the entire fight — an aesthetic commitment
   that keeps information density high and runs anywhere.
2. **But the cards are a stage, not a spreadsheet.** Spells are *thrown* from
   one card to the other. They gather in your hand, cross the gap, and
   detonate. Fire clings to what it burns. The presentation is austere by
   design and violent on purpose.
3. **Hands-on combat is the differentiator.** The dashboard audience wants
   moments of mastery. Rotations, cooldown usage, and above all *timing* — the
   Focus read on any swing about to land, theirs or yours — are the skill
   expression. There is no auto-battle; the staff swings itself, but every
   decision is the player's.
4. **Respect absence — don't simulate it.** The game is active-only: no
   away-from-game catch-up and no passive accrual. Close the tab and nothing
   happens; your absence is respected by the world simply waiting for you.
   Auto-battle is an active-session assist (tab open, you present), and you
   heal quickly between fights.
5. **Numbers you can feel.** A damage number's *size is its value*. A burn tick
   is a small violet 11; a Pyroblast crit is an enormous stroked 240 that
   overshoots, snaps back and hangs in the air while the card it hit is still
   reeling. You never have to read a number to know how hard it landed.

The wedge, in one sentence: **the dashboard RPG where combat is real and your
time is your own.**

## The game

The app opens on the title screen: three save slots and a settings panel. A
fresh slot runs the onboarding — name your conscript, watch the Institute's
briefing, choose the one open world at the **Projection Station**, and arrive
at **the Kindle Yard**, the Ember Legion's recruitment camp.

**The camp is the tutorial, diegetically.** You start with a Wooden Training
Staff and no magic at all. Your staff **auto-attacks** (League-style basic
attacks with a visible wind-up bar); **Focus (Space)** is the one universal
action — pressed on a foe's tell it deflects the blow and cracks them Exposed,
pressed late in *your own* wind-up it Sharpens the landing strike. Three
staff-only duels against fellow trainees teach exactly that. Winning them earns
the **First Weaving** — a full-screen ceremony where the Legion teaches
**Fireball** — then two more duels teach **Heat** (momentum: +3% fire per
point, bleeding away unfed, crashing to cold after the overheat Blaze — never
mastered, only ridden). Graduation hands you the oldest first quest in the
genre: **kill six boars**, and the world opens.

Beyond the gate the loop is: the **field board** rolls 3–4 sightings per
rotation (common packs, rare champions, an occasional **apex** world-boss) —
pick your fight, clear it, loot the corpses, the board rotates. Kills and
quest turn-ins earn **Standing**; Standing crosses **Grace tiers** where the
Legion teaches the next spell (Detonate → Kindle → Wildfire → Flashpoint →
Inferno); the **Codex** fills by *witnessing the magic behave* (crits,
detonations, interrupts, enraged kills) and transmits home as the Recovery
percentage. Eight fronts ladder from Hollowroot Cavern (Lv 1–3) to the
Gravecall Barrows (Lv 22–24), the deep three gated behind the Legion's fullest
trust. Quests, gear with rarities, materials, seven data-driven talents, a
persistent world boss, and a hireling companion round out the world.

The engine still carries **six full callings** (Arcanist, Gravewright,
Hourwarden, Cartomancer, Thornspeaker, Riftblade) — the slice ships the
Arcanist as the Ember Legion's War-Weaving; the other worlds on the Projection
Station are the roadmap. Design docs: `docs/GDD.md` (the game),
`docs/COMBAT.md` (the combat system), `docs/GUIDE.md` (the player handbook),
`docs/CLASSES.md` (calling design), `docs/EXTENDING.md` (the content cookbook).

### Run it

```sh
npm install
npm run dev
```

| Script | What it does |
|--------|--------------|
| `npm run dev` | dev server with HMR |
| `npm run build` / `preview` | production build / serve it |
| `npm test` | the contract — ~270 Vitest cases incl. an engine-purity guard and a progression balance envelope |
| `npm run check` | svelte-check + tsc, strict mode |
| `npm run smoke` | build + headless Playwright drive of the real opening, camp and combat (first run: `npx playwright install chromium`) |

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

`GameSim` is the whole game — combat **and** progression — behind a few moves:

```ts
const sim = new GameSim({ rng })   // rng is required — the engine owns no wall clock
sim.startFight()             // raise the next pack in the current region
sim.useAbility('fireball')   // start, queue, or refuse
sim.tick()                   // advance exactly one tick → CombatEvent[]
sim.collectLoot(iid)         // claim one corpse's spoils (or collectAllLoot())
sim.combatSnapshot()         // phase, HP/mana/shield, casts, cooldowns, pack state
sim.progressSnapshot()       // level, gold, gear, talents, regions, quests, records
```

Everything else follows from a few load-bearing ideas:

- **Events out, not callbacks in.** `tick()` returns a `CombatEvent[]`
  discriminated union (~25 kinds: damage with crit/absorb detail, casts,
  interrupts, enrages, loot, level-ups, quest flow, achievements). The UI
  drains each tick's events exactly once and derives *all* one-shot effects
  (floats, shakes, sounds, toasts) from them — never from state diffs.
- **Content is data.** The bestiary, regions, encounter tables, item affixes,
  materials, quests, talents, and achievements are plain typed objects in
  `src/engine/content/`. Enemy *mechanics* (enrage / hardcast / venom) are a
  tagged union the engine interprets — a new monster is data, not logic. Tests
  inject tiny custom content packs to pin rules independently of live balance
  numbers.
- **Injected RNG, required.** The engine takes its randomness as a constructor
  option — seeded mulberry32 in tests, the platform PRNG in the game — and has
  no `Math.random` default and no wall clock of its own. Loot, crits, enemy
  rolls, and encounter picks all flow through it, which is why the balance
  suite can Monte-Carlo the entire arc headlessly. A `purity.test.ts` reads
  every engine source and fails the build on any ambient global, `Date.now`, or
  reach into the UI world. Saves are **v5** (v1–v4 saves still load, their dead
  fields ignored); live fight state is never persisted — reload and the field
  is clear.
- **Active-only, by construction.** There is no away-from-game path.
  `src/ui/loop.ts` discards a backgrounded tab's gap rather than replaying it, so
  absence never progresses the game.

### The UI: a 60 fps view of a 20 Hz truth

The app opens on a **title screen** (`src/App.svelte` is a small screen
machine: title → naming → opening lore → world select → arrival → game).
Three **save slots** live in
`src/ui/profile.ts` — slot 1 keeps the original save key, so pre-title-screen
characters surface on it unmigrated — alongside per-slot identity profiles
(name, class, origin, birth sign) and shared settings (sound, screen shake,
reduced motion, the latter stamping `data-motion` on the document for CSS).
The engine save never learns any of this exists.

`src/ui/loop.ts` is a `requestAnimationFrame` accumulator stepping the sim once
per elapsed 50 ms. `src/ui/game.svelte.ts` is the bridge: a runes-based `Game`
store that owns the sim for one slot, publishes snapshots, and autosaves to
`localStorage` every five seconds. It hands every event to the FX director
(below), which decides *when* each number, recoil and sound actually happens —
a fireball's damage is dealt on the tick the sim says so, but it isn't *shown*
until the bolt lands.

Four destinations hang off the uplink rail: **Arena** (the camp's sparring
circle pre-graduation, then the field board and the fight itself), **Map**
(the warfront atlas — locked until graduation), **Dossier** (standing,
loadout, orders), and **Codex** (research chapters and the Recovery). The sim
never pauses while you shop.

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
mechanics, regions, talents, achievements, sounds, classes. Four strata:

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
downloaded — while every number, colour and sound survives. The title-screen
**Reduced motion** setting applies the same stillness by choice, on any system.

### The design system: "Arcane Observatory"

Luminous glass panes floating over a living void — deep, translucent, lit from
within. The chrome is vanilla modern CSS: `oklch()` design tokens
(`src/ui/styles/tokens.css` is the single source of truth), `color-mix()`
interaction tints, conic-gradient cooldown wipes (a fainter one for the GCD),
backdrop-filter glass with gradient 1 px edges, and a living night sky that
relights in the current region's hue — nebula, aurora, and hue-derived weather
(embers rise, spores wander, storms streak, void motes fall upward). Type is
variable Fraunces (display) and Inter (UI), self-hosted and preloaded; every
number renders in tabular figures.

**Every spell owns a hue**, and wears it everywhere it appears — its icon, its
cast bar, its particles, its damage numbers. Charging a Fireball *looks* like
fire gathering; charging a Barrier looks like ice. Around that, the accent trio
— teal *ether* for the player, violet *arcana* for magic and XP, gold *ember*
strictly for rewards — keeps colour meaningful, joined by four rarity hues that
only ever mean rarity. Enemy portraits are one parametric duotone line-art
component: eight creature families, tinted per creature, eyes that flare red on
enrage. The title screen carries the same language to its logical extreme: a
gilt astrolabe sigil that inscribes itself on arrival, and a wordmark whose
letters each carry a slice of one long gold gradient.

Motion follows one timing scale — fast (130 ms) for buttons, medium (240 ms)
for panels, slow (480 ms) for navigation, epic (1100 ms) for level-ups and boss
challenges. Nothing invents its own duration.

Runtime dependencies are deliberately few: **PixiJS** for the effects canvas and
**GSAP** for exactly one thing (the boss-intro cinematic). Both are dynamically
imported — the fight is playable before Pixi arrives, GSAP loads only when a
boss announces itself, and a reduced-motion player downloads neither.

### The tests: the contract

`tests/` holds ~270 cases across twenty-nine files (incl. `strike.test.ts` — the auto-swinging weapon and the Focus Sharpen — and `camp.test.ts` — the Kindle Yard script and the sparring seam): an **engine-purity guard**
that fails the build on any ambient global or wall-clock in the engine, the
unit rules (combatant, DoT, RNG), every ability's exact timing (GCD, queueing,
fizzle refunds, cooldown-at-resolve), enemy mechanics and encounters on custom
content packs, progression math pinned to formulas, item generation budgets,
the fight/looting state machine, regions, quests, materials, the world boss,
companion, save round-trips (including v1→v5 migration), save-slot and
settings persistence, the identity content (classes, origins, signs, the name
forge), every class's signature mechanic (`tests/classes.test.ts`) — and a
**balance envelope** that auto-plays the whole arc with a smart-player
heuristic and asserts the feel (level cap inside 0.5–3 hours with few deaths),
plus a per-class smoke test that runs all six callings through 20 simulated
minutes at level 1. Balance changes that break the feel break the build.

`npm test` and `npm run check` green is the bar for every change.

## Where this goes next

The loop is proven and the content pack, the FX layer, the talents and the
class kits are all data, so new spells, enemies, regions and even worlds are
cheap. The roadmap lives in `docs/GDD.md` §8: camp polish first, then the
second world (a new calling, camp, Grace ladder and Codex), then crafting over
the material economy and a genuinely shared world boss.

## More shots

![Combat mid-fight](docs/shot-1.png)
![Pyroblast detonating](docs/shot-2.png)
![Character and bags](docs/shot-3.png)
![The quest board](docs/shot-4.png)
