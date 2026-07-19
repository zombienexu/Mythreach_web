# Mythreach — Combat System Guide

> The Fire Mage should not feel like a character executing a memorized rotation.
> Combat should feel like a **duel**: watch the enemy, build pressure, choose the
> perfect moment to unleash it.

This document explains the redesigned combat system: the **universal** layer that
every calling shares (Openings & Focus) and the **Fire Mage (Arcanist)** built on
top of it (Smolder, Heat, and its six-spell kit).

All timings are given in seconds and in **ticks** — the engine runs at **20 ticks
per second** (1 tick = 50 ms). The global cooldown (GCD) is **24 ticks / 1.2 s**.

---

## 1. Design philosophy

The Fire Mage is a **pressure-builder**. It does not overwhelm with constant
spam — it creates *inevitable* destruction. Every fight follows the same
emotional arc:

```
Create opportunity  →  Ignite  →  Feed the flames  →  Build pressure
                                          ↓
        Detonate   ←   Wait for the right moment
```

The depth comes from three simple systems **interacting**, not from a longer
button sequence:

| System | Lives on | One-line role |
|---|---|---|
| **Openings** | the enemy | Read the foe; a tell you answer with **Focus** to expose them. |
| **Smolder** | the enemy | Lingering fire you stack and let *age*, then consume. |
| **Heat** | you | Accumulated fire that *evolves* your Fireball as it climbs. |

Approachable at level 1 with a single spell; deep at level 10 through how the
systems feed each other.

---

## 2. The universal layer — Openings & Focus

Every enemy in the game — for every class — cycles through **combat states** you
can read on its figure:

| State | What it means | Shown as |
|---|---|---|
| `guarded` | Neutral. Nothing to exploit. | (no special marker) |
| `telegraph` | **Winding up** — a tell is open. | *"WINDING UP — FOCUS"* under the foe, totem pulses orange |
| `exposed` | An **Opening** is live. | *"Exposed"*, foe glows gold, pool brightens |
| `recovering` | Just committed a swing; briefly safe. | (no special marker) |

### The tell

A foe becomes **readable** (`telegraph`) in the last **40%** of its swing wind-up
(`swingProgress ≥ 0.6`) **or** any time it is hard-casting a spell. This is the
only moment Focus bites.

### Focus — the universal action

Every character has one non-damaging combat action bound to the **heart of the
ability wheel** and the **Spacebar**: **Focus**.

- **Read (success):** press Focus while a foe is telegraphing → you **deflect the
  incoming blow** (reset its swing; a hard-cast is *interrupted*), and the foe
  becomes **Exposed for 3 s** (60 ticks). Focus then goes on a **2.5 s** cooldown.
- **Whiff:** press Focus with no tell open → nothing happens and you eat a shorter
  **1.5 s** lockout (so it can't be mashed).

Focus prefers your current target if *it* is telegraphing; otherwise it reads
whichever foe is winding up (so it works on a back-row caster mid-chant).

### What an Opening is worth

While a foe is **Exposed**:

- It takes **+30% damage** from *everything* you do to it.
- **Fireball** cast into it lays an **extra Smolder** (2 instead of 1) and banks
  an **extra Heat** (+2 instead of +1).
- **Kindle** lays **2** Smolder instead of 1.

> **The core level-1 loop:** watch the foe → Focus its tell → Fireball into the
> Opening. Even with one offensive spell you are making decisions and reacting to
> the enemy.

**Constants:** `OPENING_TICKS=60`, `OPENING_DMG_PCT=30`, `FOCUS_CD_TICKS=50`,
`FOCUS_WHIFF_CD_TICKS=30`, `TELL_FROM_PROGRESS=0.6` (in `src/engine/abilities.ts`).
Focus itself is `GameSim.focus()` (`src/engine/sim.ts`) — deliberately **not** an
ability id, so it never competes for a wheel seat or a hotkey.

---

## 3. The Fire Mage — Smolder

**Smolder** is the Arcanist's setup mechanic: lingering fire attached to a foe,
shown as a row of embers above its figure.

- **Max 5 stacks** per foe.
- **Each stack ages on its own clock** and grows fiercer as it matures.
- A lone stack **falls off after 11 s** if untended.
- Every **1 s**, all stacks together deal a small **lingering burn** (damage
  source `smolder`).
- Stacks are **consumed** by Detonate and Inferno.

### Aging bands

| Band | Age | Lingering burn / stack / s | Detonate value / stack | Feel |
|---|---|---|---|---|
| **Fresh** | 0–2 s (0–40t) | 1 | 6 | Just laid. Weakest. |
| **Heated** | 2–5 s (40–100t) | 2 | 11 | Settling in. |
| **Volatile** | 5 s+ (100t→) | 3 | 18 | **Ripe.** Flares visibly. Detonate *now.* |

*(Values scale with your spell power before landing.)*

This creates the central decision: **detonate now, or let it ripen?** A field of
five Fresh stacks is a moderate hit; the same field left to go Volatile is a
bomb — but stacks **expire at 11 s**, so waiting too long loses them. The Volatile
window (5 s → 11 s) is a wide-but-finite 6-second sweet spot.

Because Fireball has a 2.2 s cast, Fireball alone tops out around 3–4 concurrent
stacks (older ones age off as you cast). **Kindle** (instant) and **Wildfire**
(seeds the pack) are how you actually reach 5.

**Constants:** `SMOLDER_MAX=5`, `SMOLDER_DURATION_TICKS=220`,
`SMOLDER_HEATED_AT=40`, `SMOLDER_VOLATILE_AT=100`, `SMOLDER_TICK_TICKS=20`,
`SMOLDER_BURN`, `DETONATE_PER_STACK`.

---

## 4. The Fire Mage — Heat

**Heat** is accumulated fire *in you* (0–10). It is **not** a mana replacement and
does **not** add flat damage. Instead it **changes what Fireball does** as it
climbs — a far more interesting reward than a percentage.

- Banked by offensive fire: **+1** per Fireball, **+2** per Detonate, **+1** per
  Kindle (**+1 extra** when Fireball is loosed into an Opening).
- **Resets to 0 between fights** — every fight rebuilds the spark-to-blaze arc.
- Caps at **10** and never overflows.
- Spent all at once by **Flashpoint** and **Inferno**.

### Heat evolves the Fireball

| Heat | Band | Fireball becomes |
|---|---|---|
| 0–4 | **Building** | Single target. Your bread and butter. |
| 5–9 | **Empowered** | **Splashes** up to 2 other foes for 40% + a lick of Smolder each. |
| 10 | **Overheat** | **Pierces the whole pack** at full damage, Smolders them all — burning ground. |

The gauge beside the wheel reads the band live (*"Building Heat" / "Empowered:
Fireball splashes the pack" / "Overheat: Fireball pierces the line"*) and climbing
into a hotter band gives a flash and a sound (`heatChanged` event, `crossedUp`).

**Constants:** `HEAT_MAX=10`, `HEAT_EMPOWERED_AT=5`, `HEAT_OVERHEAT_AT=10`,
`HEAT_PER_FIREBALL=1`, `HEAT_PER_DETONATE=2`, `HEAT_PER_KINDLE=1`,
`HEAT_OPENING_BONUS=1`, `FIREBALL_SPLASH_PCT=40`.

---

## 5. The kit — spell by spell

Six seats on the wheel (hotkeys 1–6), plus universal Focus on the heart / Space.
Everything is fire school. Damage scales with **power** (`3 × (level−1) + gear`),
school bonuses, and crit (**×1.75**).

### 1 · Fireball — *unlocks L1*
`14 mana · 2.2 s cast · no cooldown`

Your workhorse. Deals a base fire hit (**16–24** + power), lays **1 Smolder**, and
banks **1 Heat**. Its behaviour evolves with Heat (see §4). Cast into an Opening:
**+1 Smolder, +1 Heat**, and the hit itself gets the Exposed **+30%**.

### 2 · Detonate — *unlocks L3*
`12 mana · instant · 3 s cooldown` — *requires ≥1 Smolder on the target*

Sets off **every** Smolder stack at once. Damage = the sum of each stack's band
value (Fresh 6 / Heated 11 / Volatile 18), then power- and crit-scaled. Banks
**2 Heat**. The first major decision of the class: cash a small Fresh field now for
tempo, or wait for Volatile and hit like a landslide.

### 3 · Kindle — *unlocks L5*
`10 mana · instant · 5 s cooldown`

Instantly lays **1 Smolder** — **2** if the target is Exposed. Banks **1 Heat**.
The fast way to build pressure without a cast, and the tool that lets you actually
reach 5 stacks. Kindling into an Opening is a strong tempo play.

### 4 · Wildfire — *unlocks L7*
`20 mana · instant · 15 s cooldown`

Two things at once:
- **Active:** seeds **2 Smolder** on **every** living foe — an instant field-wide setup.
- **Passive (while learned):** whenever you **consume** Smolder (Detonate/Inferno),
  living fire **leaps to the rest of the pack** — each other foe takes **45%** of
  the detonation as splash and catches **1 Smolder** (2 if the consumed field was
  Volatile).

This is where the Fire Mage graduates from single-target to **battlefield control**
and target prioritisation.

### 5 · Flashpoint — *unlocks L9*
`14 mana · instant · 20 s cooldown` — *requires ≥1 Heat*

**Manufacture your own moment.** Spends **all** your Heat to force a **guaranteed
Opening** on the target — Exposed for `max(3 s, Heat × 0.4 s)`, so a full 10 Heat
buys a **4 s** Opening. Agency: stop waiting for enemy mistakes and make one.

### 6 · Inferno — *unlocks L11 (capstone)*
`26 mana · instant · 25 s cooldown` — *requires Heat or Smolder to spend*

The apocalypse. Spends **all** your Heat **and** every Smolder across the field in
one bloom. Per-foe damage = `Heat × 4 + (age-weighted Smolder) × 9`, where Smolder
is weighted by band (Volatile ×2, Heated ×1.5, Fresh ×1), then power/crit scaled.
The greed-vs-safety payoff: *do I Detonate now, or keep building toward Inferno?*

### Quick reference

| # | Spell | Unlock | Mana | Cast | CD | Consumes | Builds |
|---|---|---|---|---|---|---|---|
| 1 | Fireball | L1 | 14 | 2.2 s | — | — | 1 Smolder, 1 Heat |
| 2 | Detonate | L3 | 12 | instant | 3 s | all Smolder | 2 Heat |
| 3 | Kindle | L5 | 10 | instant | 5 s | — | 1–2 Smolder, 1 Heat |
| 4 | Wildfire | L7 | 20 | instant | 15 s | — | 2 Smolder (all foes) + spread |
| 5 | Flashpoint | L9 | 14 | instant | 20 s | all Heat | guaranteed Opening |
| 6 | Inferno | L11 | 26 | instant | 25 s | all Heat + all Smolder | massive AoE |
| ♦ | **Focus** | L1 | — | instant | 2.5 s | — | an Opening (Space / heart) |

---

## 6. Talents

Nine points by level 10 (one per level from 2). The Arcanist tree
(`src/engine/content/talents.ts`):

| Talent | Max | Per rank |
|---|---|---|
| Improved Fireball | 5 | −0.1 s Fireball cast |
| Quickened Flame | 5 | −0.1 s Fireball cast |
| Searing Flames | 5 | +8% fire damage |
| Critical Mass | 5 | +2% crit |
| Fortitude | 5 | +6% max health |
| Meditation | 5 | +12% mana regen |

The bundled level-10 save pours its 9 points into **Improved Fireball 3 /
Searing Flames 3 / Critical Mass 3** for a snappy, hard-hitting, crit-happy feel.

---

## 7. How the kit unlocks

In the slice, access is **Grace** (the Legion's trust — `Standing`), not raw
level; power still scales with level. Grace tiers
(`src/ui/slice/content.ts`) teach the kit in order:

| Tier | Standing | Teaches |
|---|---|---|
| Recruit | 0 | Fireball |
| Blooded | 45 | Detonate |
| Hardened | 140 | Kindle |
| Trusted | 300 | Wildfire |
| Sworn of the Ember | 520 | Flashpoint |
| Ember-Lord | 780 | Inferno |

*(The raw `unlockLevel`s — 1/3/5/7/9/11 — govern the level-up banner and the
legacy level gate; the capstone lands at 11, an invariant the tests enforce.)*

---

## 8. Playing it — the loop at each stage

**Level 1 (Fireball + Focus).** Watch the foe. When it winds up, **Space** to
Focus its tell → **Fireball** into the Opening (extra Smolder, extra Heat, +30%).
Repeat. Already a reactive duel.

**Mid game (+ Detonate, Kindle).** Build a Smolder field — Fireball lays it,
Kindle stacks it fast, Focus-Openings make Kindle lay two. Let it **age to
Volatile**, then **Detonate** at the peak. Watch your Heat climb Fireball into its
**Empowered** splash.

**Level 10 (full kit).** Open with **Wildfire** to seed the whole pack, ride
**Heat** to **Overheat** so Fireball pierces the line, **Flashpoint** to
manufacture an Opening when the enemy won't give one — then decide: **Detonate**
now for tempo (and let Wildfire spread the fire), or hold and dump everything into
**Inferno** for a field-clearing bloom.

Every action feeds another system. You are always balancing five questions:
**When can I strike? (Openings) · How much pressure have I built? (Smolder) · Is
it ripe? (age) · Should I spend or save? (Heat) · Can I spread it further?
(enemy count)**

---

## 9. Cheat sheet

```
SPACE / heart   Focus  — deflect a tell, Expose the foe (2.5 s CD)
1  Fireball     cast; lay Smolder, build Heat; evolves at 5 / 10 Heat
2  Detonate     blow the field — older stacks hit far harder
3  Kindle       instant Smolder (2 if Exposed)
4  Wildfire     seed the pack + fire spreads on every consume
5  Flashpoint   spend all Heat → guaranteed Opening
6  Inferno      spend everything → apocalypse

Openings :  read the "WINDING UP — FOCUS" tell → +30% dmg while Exposed
Smolder  :  Fresh → Heated (2s) → Volatile (5s) → falls off (11s); max 5
Heat     :  0–4 single · 5–9 splash · 10 pierce+ground; resets per fight
```

---

## 10. Where it lives (for maintainers)

| Concern | File |
|---|---|
| Constants (all tunables) | `src/engine/abilities.ts` |
| Ability defs & effects | `src/engine/abilities.ts` |
| Kit & talents | `src/engine/content/classes.ts`, `content/talents.ts` |
| Smolder / Heat / Openings / Focus resolution | `src/engine/sim.ts` |
| Per-enemy Smolder & combat state | `src/engine/enemyUnit.ts` |
| Events | `src/engine/events.ts` (`heatChanged`, `smolderApplied`, `smolderDetonated`, `openingCreated`, `focusUsed`, `tellOpened`) |
| Heat gauge widget | `src/ui/slice/WeaveHeat.svelte` |
| Smolder pips + tell/Exposed visuals | `src/ui/components/EnemyFigure.svelte` |
| Space → Focus wiring | `src/ui/game.svelte.ts` (`hubAction` / `focus`) |
| FX recipes | `src/ui/fx/spells.ts`, `palette.ts`, `director.ts` |
| Tests | `tests/spells.test.ts`, `tests/heat.test.ts` |

Tuning is data: nearly every feel decision is a constant at the top of
`abilities.ts` (durations, band thresholds, per-stack values, Heat gains, Opening
damage). Change the number, run `npm test`.
