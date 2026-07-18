# Extending Mythreach

A cookbook. Each recipe below is a complete list of the files you touch, in the
order you touch them, with the traps called out.

The one thing to internalise before you start:

> **The engine decides what happens. The FX layer decides what it looks like.
> They meet at `CombatEvent`, and nowhere else.**

`src/engine/` is a pure integer simulation — 20 ticks per second, seeded RNG, no
DOM, no `window`, no Svelte. It emits events. `src/ui/fx/` reads those events and
turns them into light, force and sound. You can add a spell that *works* without
touching a pixel, and restyle every spell in the game without touching the
simulation. Keep it that way.

---

## Contents

- [The four strata](#the-four-strata)
- [Add an ability](#add-an-ability)
- [Add a new kind of ability effect](#add-a-new-kind-of-ability-effect)
- [Add a visual effect (a new `Step`)](#add-a-visual-effect-a-new-step)
- [Restyle a spell without touching code](#restyle-a-spell-without-touching-code)
- [Add an enemy](#add-an-enemy)
- [Add an encounter](#add-an-encounter)
- [Add an enemy mechanic](#add-an-enemy-mechanic)
- [Add a region](#add-a-region)
- [Add a companion](#add-a-companion)
- [Add a talent](#add-a-talent)
- [Add an achievement](#add-an-achievement)
- [Add a sound](#add-a-sound)
- [Add a class, origin, or birth sign](#add-a-class-origin-or-birth-sign)
- [Invariants — the rules that bite](#invariants--the-rules-that-bite)

---

## The four strata

| Layer | File | Knows about |
|---|---|---|
| **Stage** | `src/ui/fx/stage.ts` | Pixi. Particles, rings, bolts, projectiles, hit-stop. Knows nothing about spells. |
| **Recipe** | `src/ui/fx/recipe.ts` | The `Step` DSL. Turns a list of data into stage calls. Knows nothing about spells. |
| **Spells** | `src/ui/fx/spells.ts` | **The file you edit.** One row per spell: what it looks and sounds like. |
| **Director** | `src/ui/fx/director.ts` | Timing, weight, standing state. Knows nothing about what any spell looks like. |

The direction of ignorance matters. `spells.ts` is the only file that names a
spell *and* names a colour. Everything below it is generic; everything above it
is generic. That is why adding a spell is a data edit.

---

## Add an ability

Worked example: **Frostbolt** — a 1.5 s cast that throws a shard of ice, deals
damage, and is on a short cooldown.

### 1. The engine (`src/engine/`)

**`types.ts`** — add the id to the union:

```ts
export type AbilityId =
  | 'fireball'
  | 'ignite'
  // ...
  | 'frostbolt'
```

The moment you do this the build goes red in about five places. **That is the
design.** Every one of those errors is a registration site that would otherwise
have been a silent bug. Follow them.

**`abilities.ts`** — three edits:

```ts
export const ABILITIES: Record<AbilityId, AbilityDef> = {
  // ...
  frostbolt: {
    id: 'frostbolt',
    name: 'Frostbolt',
    key: '8',              // must be unique WITHIN its class — a test enforces this
    classId: 'arcanist',   // which calling owns it; only that class sees it
    unlockLevel: 5,
    manaCost: 18,
    castTicks: 30,         // 1.5 s. Ticks, always. 20 ticks = 1 second.
    cooldownTicks: 80,     // 4 s
    offensive: true,       // needs a living enemy to start
    offGcd: false,
    school: 'arcane',
    description: 'A shard of the space between stars. It does not melt.',
  },
}

export const ABILITY_EFFECTS: Record<AbilityId, AbilityEffect> = {
  // ...
  frostbolt: { kind: 'damage', min: 22, max: 30 },
}
```

**`content/classes.ts`** — add the id to its class's `abilities` list, in
action-bar order. `ABILITY_IDS` is *derived* from the kits, so an ability that
exists in `ABILITIES` but sits in no kit never reaches an action bar — and
`tests/abilities.test.ts` (`kit registration`) asserts every kit entry is
owned by that class, hotkeys are unique per class, and every class has a
level-1 button. Forget the kit and `npm test` fails. Good.

**`sim.ts`** — the auto-battle rotation. Each calling has its own priority
list (`autoArcanist()`, `autoGravewright()`, … near the bottom of the file),
read top to bottom; the first ability that `canUse()` wins:

```ts
if (!t.unit.bane?.active && this.canUse('ignite')) return void this.useAbility('ignite')
if (this.canUse('pyroblast')) return void this.useAbility('pyroblast')
if (this.canUse('frostbolt')) return void this.useAbility('frostbolt')   // ← above fireball
if (this.canUse('fireball')) return void this.useAbility('fireball')
```

Forgetting this is not a bug, it is a decision: the ability simply never gets
used by the idle loop. Manual play still works.

Cast-time talents no longer need engine surgery: give the talent a
`castTicks` effect (see [Add a talent](#add-a-talent)) and
`castTicksFor(stats, id)` in `progression.ts` applies it.

**At this point the ability is fully playable.** It casts, it costs mana, it
rolls damage, it crits, it goes on cooldown. It just looks like nothing. Now
give it a face.

### 2. The look (`src/ui/`)

**`styles/tokens.css`** — the spell's hue. Every surface that speaks for the
spell (icon, cast bar, floating number, particles) pulls from this one token:

```css
--tone-frostbolt: oklch(0.82 0.13 220);
```

**`fx/palette.ts`** — the same colour as hex, plus a darker partner. Both records
are exhaustive `Record<AbilityId, number>`, so **the build fails if you skip this**:

```ts
export const TONE: Record<AbilityId, number> = {
  // ...
  frostbolt: 0x74d0ff,
}
export const TONE_DEEP: Record<AbilityId, number> = {
  // ...
  frostbolt: 0x2a6ea8,
}
```

**`fx/spells.ts`** — the row. `SPELL_FX` is also exhaustive, so again: the build
fails until you write it.

```ts
frostbolt: {
  tone: TONE.frostbolt,
  deep: TONE_DEEP.frostbolt,
  css: 'var(--tone-frostbolt)',

  // What gathering looks like while you cast.
  charge: { rate: 0.05, radius: 46, tighten: 0.75 },

  // Leaving your hand.
  release: [
    { fx: 'flash', at: 'source', tint: 'tone', size: 26, life: 0.14, alpha: 0.8 },
    { fx: 'burst', at: 'source', count: 8, speed: [70, 220], size: [3, 7],
      tint: 'mix', spread: 'away', drag: 3 },
  ],

  // Crossing the arena. Omit this key entirely for an instant spell.
  projectile: {
    flight: 0.3, size: 20, haloSize: 46, arc: -18, trailRate: 0.016,
    trail: { fx: 'burst', count: 1, speed: [10, 60], size: [3, 8],
             life: [0.2, 0.45], tint: 'mix', tex: 'shard', drag: 2 },
  },

  // Landing. `scale` (the weight of the hit) is applied for you — tune these
  // numbers for an ORDINARY hit and let magnitude do the rest.
  impact: [
    ...DETONATE(34, 120),
    { fx: 'burst', count: 16, speed: [140, 460], size: [4, 11],
      tint: 'mix', tex: 'shard', gravity: 300, drag: 2, stretch: 2 },
    { fx: 'shake', amp: 3 },
  ],

  // Landing HARD. Played on top of impact, not instead of it.
  crit: [...CRIT_FLOURISH],

  sfx: { release: 'cast', impact: 'hit-arcane', crit: 'crit' },
},
```

Note what you did *not* write: no colours (`'tone'`, `'deep'`, `'hot'`, `'mix'`
resolve against this row), no magnitude handling, no "if crit then bigger", no
timing — the impact fires when the bolt *arrives*, and the director arranges that.

**`components/icons/AbilityIcon.svelte`** — the glyph. 24×24, 2px strokes, round
caps, matching the portrait line-art language.

> ⚠️ **Trap:** the `{#if}` chain ends in a bare `{:else}` that draws Doorway
> Duel's arch. A new ability with no branch of its own silently renders as a
> doorway. Add your `{:else if id === 'frostbolt'}` branch *before* the final
> `{:else}`.

### 3. Verify

```bash
npm test && npm run check
```

The full touch list, and which sites the compiler guards:

| File | What | Guarded? |
|---|---|---|
| `engine/types.ts` | `AbilityId` union | — (this is the trigger) |
| `engine/abilities.ts` | `ABILITIES` row | ✅ exhaustive record |
| `engine/abilities.ts` | `ABILITY_EFFECTS` row | ✅ exhaustive record |
| `engine/content/classes.ts` | the class kit's `abilities` list | ⚠️ **test only** |
| `engine/sim.ts` | the class's `auto…()` rotation | ❌ (a choice, not a bug) |
| `ui/styles/tokens.css` | `--tone-<id>` | ❌ (falls back to inherit) |
| `ui/fx/palette.ts` | `TONE`, `TONE_DEEP` | ✅ exhaustive records |
| `ui/fx/spells.ts` | `SPELL_FX` row | ✅ exhaustive record |
| `ui/components/icons/AbilityIcon.svelte` | glyph | ⚠️ **silently renders a doorway** |

Cooldown, usable and denied slots used to be hand-listed too. They are now
derived from `ABILITY_IDS` (`zeroCooldowns()` in `playerUnit.ts`, `byAbility()`
in `game.svelte.ts`) and are no longer touch points. If you find yourself adding
a fourth hand-written list keyed by ability, derive it instead.

---

## Add a new kind of ability effect

The existing kinds are `damage`, `dot`, `heal`, `interrupt`, `shield`, `buff`.
Say you want `drain` — damage the enemy and heal yourself for a share of it.

**`engine/abilities.ts`** — a new arm on the tagged union:

```ts
export type AbilityEffect =
  // ...
  | { kind: 'drain'; min: number; max: number; leechPct: number }
```

**`engine/sim.ts`** — `applyEffect()` (~line 367) is an exhaustive `switch` on
`effect.kind`. Adding the arm above makes it non-exhaustive and the build goes
red. Add the case:

```ts
case 'drain': {
  const { amount, crit } = this.rollSpell(effect.min, effect.max, def.school)
  this.damageEnemy(amount, crit, id)
  const healed = p.combatant.heal(Math.round((amount * effect.leechPct) / 100))
  if (healed > 0) this.push({ kind: 'heal', target: 'player', amount: healed, crit: false, source: id })
  break
}
```

Note it emits *two* events. The FX layer needs no changes at all: it already
knows how to draw damage on the enemy and a heal float on you, and it will use
your spell's row for both. **Reuse existing events before you invent new ones.**

If you genuinely need a new event, add it to the union in `engine/events.ts` and
handle it in `FxDirector.handle()`. Everything else in the UI is a snapshot read
and needs nothing.

---

## Add a visual effect (a new `Step`)

Two files, in this order.

**1. `fx/stage.ts` — the primitive.** A method that spawns sprites and hands
them to the ticker. Existing ones: `burst`, `ring`, `flash`, `rays`, `implode`,
`dissolve`, `bolt`, `projectile`, `smokePuff`, `emit`/`stopEmitter`, `hitStop`.

The only thing you must get right is **which layer you draw on**, because that
is what makes the bloom pass work:

| Layer | Blend | Use for |
|---|---|---|
| `back` | normal | smoke, anything that should occlude |
| `bloom` | additive, **blurred** | soft light: flashes, rings, dissolves, projectile halos |
| `core` | additive, crisp | sparks, shards, bolts, projectile heads |

Light that should *bleed* goes in `bloom`. Anything with an edge you want to keep
goes in `core`. Putting sparks in `bloom` turns them into mush; putting a flash in
`core` makes it look like a sticker.

Textures come from `take(name, layer, tint)` with `TexName` = `'glow' | 'spark' |
'ring' | 'shard' | 'smoke'`. To add a texture, draw it into a canvas in the `this.tex = { … }`
block (~line 323) and widen `TexName`.

**2. `fx/recipe.ts` — the `Step`.** Add an arm to the `Step` union and a `case`
to `playRecipe()`:

```ts
| { fx: 'frostNova'; radius: number; shards: number; life?: number; tint?: Tint; at?: At }
```

```ts
case 'frostNova':
  c.stage.frostNova(at.x, at.y, {
    tint: tint(step.tint, c) as number,
    radius: reach(step.radius) * s,
    shards: n(step.shards),
    life: step.life ?? 0.4,
  })
  break
```

Use the two helpers when you wire the case up, and your effect will scale like
every other one:

- `n(v)` for **counts** — grows gently (`0.6 + 0.4 × scale`).
- `reach(v)` for **distances** — grows gently (`0.7 + 0.3 × scale`).
- bare `× s` for **sizes** — takes the full multiplier.

That asymmetry is load-bearing. Counts and reach scaled at full whack turn a crit
into white soup; size is what actually reads as "that hit hard".

Now any spell can use `{ fx: 'frostNova', radius: 140, shards: 12 }` in any of its
recipes. You are done — no director changes, no per-spell code.

---

## Restyle a spell without touching code

Open `fx/spells.ts`, find the row, change the numbers. That is the whole
procedure. Nothing else in the codebase names a spell and a colour in the same
breath, so nothing else can disagree with you.

Useful shared phrases live at the top of the file and compose:

- `DETONATE(size, ring)` — the standard hot-core-plus-shockwave
- `DEBRIS(count, speed, size)` — a gravity-bound spray of chunks
- `CRIT_FLOURISH` — rays, double ring, hit-stop, shake

Spread `...DETONATE(40, 150)` into a recipe and add your own steps around it.

---

## Add an enemy

Pure content. One file: `engine/content/enemies.ts`.

```ts
{
  id: 'frost-revenant',
  name: 'Frost Revenant',
  intro: 'A Frost Revenant rises from the ice, trailing its own breath.',
  level: 9,
  rank: 'normal',          // 'normal' | 'elite' | 'boss'
  hp: 260,
  swingTicks: 40,          // 2 s between swings
  dmgMin: 12,
  dmgMax: 19,
  xp: 120,
  goldMin: 14,
  goldMax: 26,
  dropPct: 18,
  portrait: { family: 'revenant', hue: 220 },   // see PortraitFamily in types.ts
  mechanics: [],
}
```

Then slot the id into one of the region's encounters (see below). No FX work:
enemies share `enemySwing` / `enemyCast` rows in `SPELL_FX`.

Balance is a contract, not a vibe — `tests/balance.test.ts` asserts the HP and
damage curves stay inside an envelope. If your numbers are wild, that test tells
you.

---

## Add an encounter

An encounter is a pack of 1–3 mobs that spawn and fight together. **The
encounter is the template; the slots are the mobs you plug in.** Pure content,
one file: `engine/content/zones.ts` — the raw data the regions are recast from
(`regions.ts` reuses each zone's encounter tables verbatim) — using the helpers
at the top:

```ts
solo('cave-golem', 26),                                        // one mob
pair('gravel-skitterling', 'mossback-boar', 14),               // two, side by side
vanguard(['mire-whelp', 'mire-whelp'], 'witchlight-wisp', 12), // two front, one back
```

Add the line to a zone's `encounters` array and you are done. Everything else
follows from data the engine already has:

- **Weights** are relative within the region, exactly like the old spawn table.
- **Rows.** `vanguard` marks its third mob `row: 'back'`: it renders raised
  centre, and auto-retargeting prefers front-row mobs, so the screen falls
  before the thing it screens. Rows change nothing else — any mob can be hit
  at any time by clicking its card or Tab-cycling.
- **Every mob pays XP at the moment it dies** and banks its gold/items/
  materials in its own corpse's `LootBundle` for the looting phase. Budget
  accordingly: a pack's summed XP should land near a solo mob of the same
  weight, or the region levels twice as fast.
- **Targeting is where the fun lives.** A caster in the back row forces a
  target swap to interrupt (Counterspell reads *your target's* cast, nobody
  else's). A weak flanker forces a focus-fire decision. If a new encounter
  creates no decision, it's just a bigger health bar — cut it.

Balance intuition for a 3-pack: two minions plus a back mob should together
swing for roughly what one solo normal does. The zone minions
(`gravel-skitterling`, `mire-whelp`, …) are tuned for exactly this; if you add
a new minion, start near half the HP and 45% of the damage of the zone's
cheapest normal. Then let `tests/balance.test.ts` referee, as always.

Engine limits worth knowing: an `EncounterDef` is just `{ slots, weight }`, a
slot is `{ enemyId, row? }`, and nothing caps the pack size except the UI —
three cards is what the row is designed to hold.

---

## Add an enemy mechanic

Mechanics are a tagged union: `EnemyMechanicEnrage | EnemyMechanicHardcast |
EnemyMechanicVenom` (`engine/types.ts`, ~line 60). To add a fourth — say
`shield`, where the enemy periodically absorbs your damage:

**`engine/types.ts`:**

```ts
export interface EnemyMechanicShield {
  kind: 'shield'
  everyTicks: number
  amount: number
}
export type EnemyMechanic = EnemyMechanicEnrage | EnemyMechanicHardcast | EnemyMechanicVenom | EnemyMechanicShield
```

**`engine/enemyUnit.ts` + `sim.ts`:** tick it, and push an event when it fires.

**`fx/spells.ts`:** add a `FxSource` for it (the union is `AbilityId |
'enemySwing' | 'enemyCast' | 'venom'` — widen it) and give it a row.

**`fx/director.ts`:** this is the *only* director change you should ever need,
and only if the mechanic is a **standing state** rather than a one-shot. Standing
states are reconciled against the snapshot in `sync()`, because a state that
expires quietly emits no event and would otherwise linger forever. Enemy states
are per-mob now — key on the iid, inside the existing `for (const e of c.enemies)`
loop, and add your prefix to the stale-key sweep regex above it:

```ts
this.hold(`enemyShield-${e.iid}`, e.shield != null && e.alive, () =>
  this.aura(SPELL_FX.enemyShield, SPELL_FX.enemyShield.aura!, 'enemy', e.iid))
```

`hold(key, on, start)` starts the emitter when `on` goes true, stops it when it
goes false, and does nothing while it stays the same. One line.

> ⚠️ Gather/aura emitters must read **live fields**, not a captured snapshot. An
> emitter closure that captures `c` freezes at the value it had when the emitter
> started — which is how the enemy hardcast gather once stayed permanently at 0%
> tightness. Read `this.charge` / `this.enemyCharge`, which the director keeps
> current.

---

## Add a region

Two files. A region's identity (name, epithet, hue, encounter tables) lives in
the **raw zone data**; the region layer recasts it as an un-gated hunting
ground with a difficulty band and materials.

**`engine/content/zones.ts`** — the raw entry:

```ts
{
  id: 'frostmere',
  name: 'Frostmere Hollow',
  epithet: 'the lake that never finished freezing',
  minLevel: 13,
  hue: 220,                 // drives the banner, the sky, arena light, pips
  encounters: [
    solo('frost-revenant', 30),
    solo('rime-stalker', 25),
    pair('icicle-sprite', 'frost-revenant', 15),
    vanguard(['icicle-sprite', 'icicle-sprite'], 'hoarfrost-elemental', 12),
  ],
  eliteEncounters: [solo('hoarfrost-elemental', 1)],  // occasional elite spawns
  travelLines: [],          // legacy field — unused since expeditions were cut
  bossId: '',               // legacy field — unused since boss gates were cut
  intro: 'The ice remembers every step you have not yet taken.',
}
```

**`engine/content/regions.ts`** — one `region(...)` line wiring it into
`REGIONS` with its tier, level band, and two material ids:

```ts
region('frostmere', 'hard', 13, 15, ['glacier-core', 'hoarfrost-sliver']),
```

`weight` is relative, not a percentage — they need not sum to 100. `hue` is an
OKLCH hue angle and it propagates automatically: the region banner, the night
sky's nebula and weather mood (`Background.svelte` derives the weather from hue
bands), and the arena light. Add the two materials to `materials.ts`, and
consider giving the region traveler quests in `quests.ts` — every existing
region has three.

---

## Add a companion

The single hireling scaffold. Content object + a swing loop that already exists.

**`engine/content/companions.ts`** — a `COMPANIONS` row:

```ts
brand: {
  id: 'brand',
  name: 'Brand the Warden',
  epithet: 'a shield that outlived its oath',
  cost: 300,
  swingTicks: 34,
  baseDmg: 5,
  dmgPerLevel: 1,
}
```

`hireCompanion(id)` (pays `cost`, persists `companionId`) and the
per-tick swing (`companionSwing_`, which swings at your current target through
the normal `damage` event with `source: 'companion'`) are already generic over
the table — a new companion needs no new sim code. The FX director degrades an
unknown `damage` source to a plain float, so the blade reads as a hit without a
spell recipe.

Note: companion damage flows through the same pipeline as spells, so kills,
loot, and XP all fall out for free. Pin it in `tests/companion.test.ts`.

---

## Add a talent

Talents are **data**: a row in `TALENTS` with a list of typed effects, and
`deriveStats()` folds them into the stat block without knowing any talent by
name. Most talents never touch another file.

**`engine/types.ts`** — the `TalentId` union.

**`engine/content/talents.ts`** — the `TALENTS` row: name, `maxRanks`,
`perRank` for UI copy, description, and `effects`:

```ts
impFrostbolt: {
  id: 'impFrostbolt',
  name: 'Improved Frostbolt',
  maxRanks: 5,
  perRank: '−0.1 s cast',
  description: 'Frostbolt leaves the hand 0.1 s sooner per rank.',
  effects: [{ kind: 'castTicks', ability: 'frostbolt', ticksPerRank: 2 }],
},
```

The effect kinds: `castTicks` (per-ability cast cut), `school` (+% damage to
one school), `crit`, `maxHp`, `regen`, `healing`, `gold`, `gcd` (the
Riftblade's tempo lane), and `mod` — a named class dial (`ClassMod` in
`types.ts`) that the sim reads where the mechanic lives (`ledgerCap`,
`reckoningReliefPct`, `briarTicks`, …). Add a new `ClassMod` key when a
talent needs to turn a knob no generic effect covers.

**`engine/content/classes.ts`** — add the id to its class's `talents` list
(each kit shows exactly six; `tests/classes.test.ts` pins that). A talent in
no kit can never be learned: `spendTalent()` checks kit membership.

---

## Add an achievement

**`engine/content/achievements.ts`** — one row: `{ id, name, description }`.

**`engine/sim.ts`** — call `this.checkAchievement('your-id', condition)` wherever
the condition can become true. It is idempotent; call it as often as you like.
Lifetime counters (`kills`, `deaths`, `interrupts`, `goldEarned`) already exist on
`this.lifetime` — add a field there if you need a new one, and remember it must be
persisted in the save.

The five `boss-<enemyId>` achievements are relics of the boss-gated zones and
currently have no call site — if you bring the old bosses back (a bounty or
challenge system), reuse those ids.

---

## Add a sound

`src/ui/sfx.ts`. There are no audio assets — every sound is synthesised from two
voice types, layered:

```ts
// a tone: a pitch sweep with an envelope
{ kind: 'tone', type: 'triangle', freq: [440, 90], dur: 0.3, gain: 0.5 }
// noise: filtered white noise — cracks, sizzles, impacts
{ kind: 'noise', cut: [3000, 400], filter: 'bandpass', q: 1.4, dur: 0.25, gain: 0.4, delay: 0.02 }
```

Add the name to the `SfxName` union and a row to `VOICES` (~line 59), then
reference it from a spell's `sfx` block. `delay` staggers voices within one sound
— that is how you get a *thud* then a *crack* from one event.

Rules of thumb that made the existing set work: a hit is noise first and tone
second; pitch that *falls* reads as impact, pitch that *rises* reads as a
charge; two detuned voices always sound better than one loud one.

> **Sound is not a motion effect.** It plays even under `prefers-reduced-motion`.
> Someone who turned off animation did not ask for silence.

---

## Add a class, origin, or birth sign

Identity is split down the engine/UI seam. The **engine** owns everything
that acts: the class kit (`engine/content/classes.ts`), origin leanings and
sign boons (`engine/content/identity.ts`), the mechanic's state and rules
(`sim.ts`). The **UI** owns everything that speaks: epithets, lore, hues,
signature-ability blurbs, and the constellation art
(`src/ui/content/identity.ts`). The two halves share ids and are joined at
character creation; `tests/identity.test.ts` asserts every UI preview names a
real kit ability.

**A class** is real work — it is a whole way of playing. The tour:

1. `engine/types.ts` — the `ClassId` union, the new ability/talent ids, a
   `ClassResourceSnapshot` variant if the mechanic has a resource, and any
   new `ClassMod` dials.
2. `engine/content/classes.ts` — the kit: ability ids in bar order, six
   talent ids, the resource kind, the mechanic's name.
3. `engine/abilities.ts` + `engine/content/talents.ts` — the registries
   ([Add an ability](#add-an-ability), [Add a talent](#add-a-talent)).
   Bespoke mechanics are `{ kind: 'special' }` effects resolved in
   `sim.ts`'s `applySpecial()`; per-fight state lives on `PlayerUnit`
   and resets in `resetFightState()`.
4. `sim.ts` — an `auto<Class>()` rotation, a `resourceSnapshot()` branch,
   and `canUse()` gates for resource costs (no page, no rite).
5. The look: `ClassEmblem.svelte` sigil branch (48×48 line art — the chain
   ends in the Riftblade's split sword, so a missing branch renders as a
   Riftblade), `HeroPortrait.svelte` hue + focus charm, icons, tones,
   `SPELL_FX` rows, and the class's row in the UI `FLAVOR` table.
6. Tests: a `describe` block in `tests/classes.test.ts` for the signature
   mechanic, plus the auto-generated "every calling can play the real game"
   balance smoke test picks the class up from `CLASS_IDS` for free.

**An origin:** one row in `engine/content/identity.ts` — name, flavor
`line`, a `boon` sentence, and `effects` (`xpPct`, `hpPct`, `goldPct`,
`regenPct`). `deriveStats()` folds it in; nothing else needs to know.

**A birth sign:** one engine row — name, `omen`, `boon`, and `effects`
(`dropPct`, `materialPct`, `respawnCutPct`, `critPct`, `cheatDeath`) — plus
its constellation in the UI's `SIGN_ART` table: `stars` (coordinates in a
0–100 box) and `lines` (pairs of star indices). `SignMark.svelte` renders any
well-formed sign; the test verifies every line joins real stars. Signs that
*act* mid-fight (the Tower's cheat-death) hook `damagePlayer()` /
`onPlayerDied()` in `sim.ts`.

Where identity is stored: per-slot profiles under `mythreach-profile-sN-v1`
(`src/ui/profile.ts`), written at creation, erased with the slot — and since
save v5, sealed into the engine save itself (`classId`/`originId`/`signId`).
The save's copy wins on load; the profile covers pre-v5 saves, which present
as the default Arcanist.

---

## Invariants — the rules that bite

**Engine purity.** `src/engine/` imports nothing from the DOM, Svelte, or
`window`. It is deterministic given a seed. This is what makes 175 tests
possible. `tests/purity.test.ts` reads every engine source and enforces it —
including that `rng` stays a *required* constructor option.

**Ticks, not milliseconds.** The sim runs at 20 ticks/second. Every duration in
`engine/` is an integer tick count. `50` is 2.5 seconds. Convert at the UI edge
(`ui/format.ts`), never inside the engine.

**Events are the only one-shot channel.** Anything that happens *once* (a hit, a
death, a level-up) is a `CombatEvent`. Anything that is *ongoing* (a burn burning,
a shield held) is read from the snapshot. Get this backwards and you either miss
effects or leak emitters that never stop.

**Tints are symbolic.** Write `'tone'`, never `0xff7a2f`. It is what lets one
shared recipe come out orange for Fireball and violet for Ignite.

**One weight drives everything.** The director turns a damage number into a
single `scale`, and that one value multiplies particle size, shockwave reach,
shake, and the size of the floating number. Do not add a second magnitude knob.

**Reduced motion is a hard off-switch.** `FxDirector.reduced` is decided in the
*field initializer*, not in `Game.start()` — Svelte children mount before the
parent's `onMount`, so anything later is too late and a WebGL context gets created
anyway. When it is on, no canvas is created and the Pixi chunk is never even
downloaded.

**Damage numbers are sized by absolute damage, not by share of the target's
health.** This was tried the other way and it is wrong: sizing by share draws a
*timid* number on a boss, because bosses have more health — exactly backwards.
`BIG_HIT = 180` in `director.ts`. Do not re-derive this.

**Snapshots are rebuilt every tick — guard one-shot choreography.** A Svelte
`$effect` that reads a snapshot object re-runs 20×/second, and re-arming a CSS
animation every run holds it at frame zero forever (the enemy card was once
invisible for exactly this reason). Track the last id you reacted to
(`EnemyCard`'s `lastIid`) and pulse only on change.

**Enemy events carry an `iid`.** With packs on the field, "the enemy" is not a
place. Any event that touches a specific mob (`damage`, `dotApplied`,
`enemySpawned`, `enemyDied`, `enemyCastStarted`, `enemyEnraged`, `interrupted`)
names it by instance id, and the director resolves that to a per-card anchor —
falling back to the row centre when the card hasn't been measured yet. A new
enemy event without an iid will land its effects mid-row; that's the tell.

**Crits get a bigger number, not a bigger flash.** Additive light does not read
as "twice as big" when you double it — it reads as *gone*. The particle multiplier
in `weigh()` is deliberately tamer than the text multiplier. That asymmetry is the
fix for a bug, not an oversight.

---

## The contract

```bash
npm test        # 175 cases. Green, always.
npm run check   # 0 errors, 0 warnings. Both, always.
npm run build   # Pixi and GSAP stay lazy chunks — time to first fight
```

If you add a mechanic, add a test for it. `tests/helpers.ts` gives you
`makeSim()`, `advance()`, `advanceToSpawn()` and `eventsOf()` — a deterministic
sim you can drive tick by tick and assert on the event stream. That is the whole
reason the engine is pure.
