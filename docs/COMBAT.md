# Mythreach — Combat System Guide

> The War-Weaver should not feel like a character executing a memorized rotation.
> Combat should feel like a **duel**: watch the enemy, watch *yourself*, build
> pressure, choose the perfect moment to unleash it.

This document explains the combat system: the **universal** layer every calling
shares (the Strike, and the reading of enemy tells) and the **War-Weaver
(Arcanist)** built on top of it (Stoke, Smolder, Heat, and its six-spell kit).

The heart of the wheel (**Space**) is a **class ability**, not a universal one:
each calling gets its own. The War-Weaver's is **Stoke**.

All timings are given in seconds and in **ticks** — the engine runs at **20 ticks
per second** (1 tick = 50 ms). The global cooldown (GCD) is **24 ticks / 1.2 s**.

---

## 1. Design philosophy

The War-Weaver is a **pressure-builder**. It does not overwhelm with constant
spam — it creates *inevitable* destruction. Every fight follows the same
emotional arc:

```
Swing the staff  →  Loose the fire  →  Stoke it as it lands  →  Feed the flames
                                                                     ↓
                     Detonate   ←   Wait for the right moment
```

The depth comes from four simple systems **interacting**, not from a longer
button sequence:

| System | Lives on | One-line role |
|---|---|---|
| **The Strike** | you | The staff's basic attack on **Q** — swung when *you* call it, even spell-less. |
| **Stoke** | you | The calling on **Space**: half a second of open flue, timed onto a *landing* working. |
| **Smolder** | the enemy | Lingering fire you stack and let *age*, then consume. |
| **Heat** | you | Riding momentum: every point burns hotter, unfed it bleeds away. |
| **Openings** | the enemy | A foe cracked wide (Flashpoint): +30% from everything you do. |

Approachable at level 1 with a wooden staff and no spells at all; deep at level
10 through how the systems feed each other.

---

## 2. The universal layer — the Strike

Every hero swings their weapon. The staff is the **basic attack, bound to Q** —
nothing swings on its own clock. You call each blow, and the wind-up that
follows is a commitment you then have to time.

- **Cadence:** one swing per **1.8 s** (36 ticks) once called, shown as a wind-up
  bar in the combat helm (and it can **crit** ×1.75). Pressing Q again mid-swing
  is refused — the blow in flight is the blow you get.
- **The seat:** the staff wears the first tile on the bar (key **Q**), left of
  the taught workings, and the bar reads *"Q ▸ strike"* while it waits.
- **Damage:** `2 + level + ⌊staff ilvl / 2⌋` to that +4, scaled by **power**.
  Bare hands still swing; a staff just swings harder. Every fresh conscript is
  issued a **Grey Wood Staff** (ilvl 1, +2 power / +2 stamina — a training issue,
  deliberately under the drop tables, taken off the yard's rack at the gate).
- **Casting holds the swing.** A hardcast in flight parks the wind-up where it
  is; it resumes the moment your hands are free. The GCD does *not* stop it.
- **Dormant packs** simply stand there: your Q (or any cast) is the free first
  blow, and when it *lands* the field wakes (aggro).

**Constants:** `STRIKE_SWING_TICKS=36`, `STRIKE_BASE=2`, `STRIKE_SPREAD=4`
(in `src/engine/abilities.ts`). Entry point: `GameSim.strike()` — refused when
dead, out of a fight, without a target, mid-cast, or already swinging.
Resolution: `GameSim.resolveStrike()`.

---

## 3. Reading the field — tells & Openings

Every enemy cycles through **combat states** you can read on its figure:

| State | What it means | Shown as |
|---|---|---|
| `guarded` | Neutral. Nothing to exploit. | (no special marker) |
| `telegraph` | **Winding up** — the blow is committed and coming. | *"WINDING UP"*, totem pulses orange |
| `exposed` | An **Opening** is live. | *"Exposed"*, foe glows gold |
| `recovering` | Just committed a swing; briefly safe. | (no special marker) |

A tell is **information, not a prompt**: it tells you a blow has already been
decided (last 40% of a wind-up, or any hardcast). Learning to read the rhythm of
a bout is what the training camp's proving is for — and it is what makes the
War-Weaver's own timing window playable later.

### What an Opening is worth

While a foe is **Exposed** it takes **+30% damage** from everything you do, and
Kindle lays **2** Smolder instead of 1. Openings are forced by **Flashpoint**
(§6), not read out of the air.

**Constants:** `OPENING_TICKS=60`, `OPENING_DMG_PCT=30`, `TELL_FROM_PROGRESS=0.6`.

---

## 3b. The calling — Stoke (Space / the heart of the wheel)

The heart of the wheel is **class-specific**. The War-Weaver's is **Stoke**, and
it is pure timing:

- Press **Space**: the flue is open for **0.5 s** (10 ticks).
- Any working of yours that **lands** inside that half second banks **2 Heat**
  instead of **1**.
- **3 s cooldown** (60 ticks). Nothing else: no damage, no defence.

The word that matters is *lands*. Fireball has a **2.2 s** cast and the flue
shuts in half a second, so you open it **for where the fire will be**, not where
your hand is. Instants (Kindle, Detonate) are the easy case — press, press —
and the cooldown is what stops that from being free.

> **Where the difficulty lives:** not in the press, but in the *lead*. A player
> who never times it still builds Heat at the base rate; a player who does
> reaches Empowered and the Boil roughly twice as fast.

**Constants:** `STOKE_WINDOW_TICKS=10`, `STOKE_CD_TICKS=60`,
`HEAT_PER_LANDING=1`, `HEAT_PER_STOKED_LANDING=2`. Stoke is `GameSim.stoke()` —
deliberately **not** an ability id, so it never competes for a wheel seat or a
hotkey. It is refused outright for every calling but the Arcanist — and, for the
Arcanist, until **Fireball** has actually been taught: through the Kindle Yard's
three proving duels there is no fire in the flue, so the seat renders sealed.

---

## 4. The War-Weaver — Smolder

**Smolder** is the Arcanist's setup mechanic: lingering fire attached to a foe,
shown as a row of embers above its figure.

- **Max 5 stacks** per foe; **each stack ages on its own clock**.
- A lone stack **falls off after 11 s** if untended.
- Stacks are **consumed** by Detonate and Inferno — that is their purpose.
- **Untrained, Smolder deals no damage on its own.** It is *pressure*: fuel you
  bank and cash in. The free burn tick was deliberately moved out of the level-1
  kit — it made the opening levels play themselves.
- The **Lingering Flame** talent (3 ranks) lights the burn: with it, every stack
  burns each second — fiercer as it ages, and again per rank.

### Aging bands

| Band | Age | Burn / stack / s *(per Lingering Flame rank)* | Detonate value / stack | Feel |
|---|---|---|---|---|
| **Fresh** | 0–2 s | 1 | 6 | Just laid. Weakest. |
| **Heated** | 2–5 s | 2 | 11 | Settling in. |
| **Volatile** | 5 s+ | 3 | 18 | **Ripe.** Flares visibly. Detonate *now.* |

*(Values scale with your spell power before landing.)*

The central decision is unchanged: **detonate now, or let it ripen?** A field of
five Fresh stacks is a moderate hit; the same field gone Volatile is a bomb —
but stacks expire at 11 s, so the Volatile window (5 s → 11 s) is wide but finite.

**Constants:** `SMOLDER_MAX=5`, `SMOLDER_DURATION_TICKS=220`,
`SMOLDER_HEATED_AT=40`, `SMOLDER_VOLATILE_AT=100`, `SMOLDER_TICK_TICKS=20`,
`SMOLDER_BURN` (per rank), `DETONATE_PER_STACK`; the burn gate is the
`smolderBurn` class mod from the `lingeringFlame` talent.

---

## 5. The War-Weaver — Heat

**Heat** is riding momentum (0–10). *"Nobody masters the Weave. You chase the
boil your whole life."* — it is designed so you can never sit on a full bar.

- **Every point of Heat burns your fire +5% hotter** — a visible, immediate ramp.
- Banked by **any working of yours that lands on a foe**: **+1**, or **+2** when
  it lands inside an open **Stoke** (§3b). One rule, every spell. The staff is
  wood — it feeds nothing.
- **Unfed Heat bleeds away:** −1 every 3 s your hands are idle. A cast in flight
  counts as feeding it (the decay clock parks while you're casting).
- **The Boil (10):** your next Fireball is a **Blaze** — it pierces the whole
  pack at full damage and Smolders everything — *and then the fire slips your
  grip*: **Heat crashes to 0** and the climb begins again.
- Resets between fights. Never persists. Never mastered.

### Heat evolves the Fireball

| Heat | Band | Fireball becomes |
|---|---|---|
| 0–4 | **Riding** | Single target, +5%/point. |
| 5–9 | **Empowered** | **Splashes** up to 2 other foes for 40% + a lick of Smolder each. |
| 10 | **The Boil** | The **Blaze**: pierces the whole pack, Smolders them all — then crashes to 0. |

**Constants:** `HEAT_MAX=10`, `HEAT_EMPOWERED_AT=5`, `HEAT_OVERHEAT_AT=10`,
`HEAT_FIRE_PCT_PER_POINT=5`, `HEAT_DECAY_TICKS=60`, `HEAT_PER_LANDING=1`,
`HEAT_PER_STOKED_LANDING=2`, `FIREBALL_SPLASH_PCT=40`.

---

## 6. The kit — spell by spell

Six seats on the wheel (hotkeys 1–6), plus the calling (**Stoke**) on the heart
/ Space and the staff swinging underneath it all. Everything is fire school. Damage
scales with **power** (`3 × (level−1) + gear`), school bonuses, Heat, and crit
(**×1.75**).

### 1 · Fireball — *taught at Blooded (the First Weaving)*
`14 mana · 2.2 s cast · no cooldown`

Your workhorse. Deals a base fire hit (**16–24** + power + Heat), lays
**1 Smolder**, banks **1 Heat** on landing (**2** inside a Stoke). Its behaviour
evolves with Heat (see §5). Cast into an Opening: **+1 Smolder**, and the hit
gets the Exposed **+30%**.

### 2 · Detonate — *taught at Hardened*
`12 mana · instant · 3 s cooldown` — *requires ≥1 Smolder on the target*

Sets off **every** Smolder stack at once. Damage = the sum of each stack's band
value (Fresh 6 / Heated 11 / Volatile 18), then power/Heat/crit-scaled. Banks
**1 Heat** on landing (**2** inside a Stoke); an empty Detonate lands on nobody
and banks nothing. The first major decision of the class: cash a Fresh field now for
tempo, or wait for Volatile and hit like a landslide.

### 3 · Kindle — *taught at Trusted*
`10 mana · instant · 5 s cooldown`

Instantly lays **1 Smolder** — **2** if the target is Exposed. Banks **1 Heat**
(**2** inside a Stoke). The fast way to build pressure without a cast — and,
being instant, the easiest thing in the kit to drop into an open flue.

### 4 · Wildfire — *taught at Sworn of the Ember*
`20 mana · instant · 15 s cooldown`

Two things at once:
- **Active:** seeds **2 Smolder** on **every** living foe, and banks **1 Heat**
  (**2** inside a Stoke).
- **Passive (while learned):** whenever you **consume** Smolder, living fire
  **leaps to the rest of the pack** — each other foe takes **45%** of the
  detonation as splash and catches **1 Smolder** (2 if the field was Volatile).

### 5 · Flashpoint — *taught at Ember-Lord*
`14 mana · instant · 20 s cooldown` — *requires ≥1 Heat*

**Manufacture your own moment.** Spends **all** your Heat to force a guaranteed
Opening — Exposed for `max(3 s, Heat × 0.4 s)`.

### 6 · Inferno — *taught at Pyre-Sovereign (capstone)*
`26 mana · instant · 25 s cooldown` — *requires Heat or Smolder to spend*

The apocalypse. Spends **all** your Heat **and** every Smolder across the field
in one bloom. Per-foe damage = `Heat × 4 + (age-weighted Smolder) × 9`
(Volatile ×2, Heated ×1.5, Fresh ×1), then power/crit scaled.

### Quick reference

| # | Spell | Grace | Mana | Cast | CD | Consumes | Builds |
|---|---|---|---|---|---|---|---|
| Q | **The Strike** | issued at the gate | — | 1.8 s wind-up | — | — | (basic attack) |
| ♦ | **Stoke** | the calling itself | — | instant | 3 s | — | 0.5 s of double Heat |
| 1 | Fireball | Blooded (45) | 14 | 2.2 s | — | — | 1 Smolder, 1–2 Heat |
| 2 | Detonate | Hardened (140) | 12 | instant | 3 s | all Smolder | 1–2 Heat |
| 3 | Kindle | Trusted (300) | 10 | instant | 5 s | — | 1–2 Smolder, 1–2 Heat |
| 4 | Wildfire | Sworn (520) | 20 | instant | 15 s | — | 2 Smolder (all foes) + spread, 1–2 Heat |
| 5 | Flashpoint | Ember-Lord (780) | 14 | instant | 20 s | all Heat | guaranteed Opening |
| 6 | Inferno | Pyre-Sovereign (1080) | 26 | instant | 25 s | all Heat + all Smolder | massive AoE |

---

## 7. Talents

Points come one per level from 2. The Arcanist tree
(`src/engine/content/talents.ts`) — seven talents:

| Talent | Max | Per rank |
|---|---|---|
| Improved Fireball | 5 | −0.1 s Fireball cast |
| Quickened Flame | 5 | −0.1 s Fireball cast |
| Searing Flames | 5 | +8% fire damage |
| **Lingering Flame** | 3 | Smolder burns each second, ×rank |
| Critical Mass | 5 | +2% crit |
| Fortitude | 5 | +6% max health |
| Meditation | 5 | +12% mana regen |

**Lingering Flame is the old free burn, relocated.** At rank 1 it restores
exactly the pre-rework burn; ranks 2–3 grow it — a real build choice instead of
a level-1 freebie.

---

## 8. How the kit unlocks — Grace, and the Kindle Yard

Access is **Grace** (the Legion's trust — Standing), not raw level; power still
scales with level. A recruit is taught **nothing**: the staff is the whole
level-1 kit, and the training camp (see `docs/GDD.md` §3) drills the swing and
the reading of tells before the first spell is ever granted — the Stoke is
taught in the Tempering, once there is fire to time.

| Tier | Standing | Teaches |
|---|---|---|
| Recruit | 0 | — (a staff, a bunk, and a name) |
| Blooded | 45 | Fireball *(the proving crosses this — the First Weaving, the one working ever auto-taught)* |
| Hardened | 140 | Detonate *(the boar order lands you here)* |
| Trusted | 300 | Kindle |
| Sworn of the Ember | 520 | Wildfire |
| Ember-Lord | 780 | Flashpoint |
| Pyre-Sovereign | 1080 | Inferno |

*(The raw `unlockLevel`s — 1/3/5/7/9/11 — govern the level-up banner and the
legacy level gate; the capstone lands at 11, an invariant the tests enforce.)*

### Offered, then learned

Crossing a tier **offers** the working; it does not press it into your hands.
Only **Fireball** is auto-learned, at the camp's ceremony. Everything after it
raises a badge on the **Talents** rail and waits there until you choose to learn
it — nobody has to take up a new spell mid-swing. `Expedition` persists the
`learned` list; `pendingLearns = taughtFor(standing) − learned`, and
`Game.learn(id)` re-arms the sim's gate.

---

## 9. Playing it — the loop at each stage

**The Kindle Yard (no spells).** You swing the staff with **Q**, learn that a
cast holds the wind-up, and learn to read a foe's committed blow. One button and
a pair of eyes — the timing habit the Stoke will need.

**Blooded (Fireball).** The fire arrives, and with it the calling: loose a
Fireball, then **Stoke** so the flue is open when it *lands* — two Heat instead
of one. The staff keeps swinging between casts. Heat starts mattering: every
point is +5%, and stopping bleeds it.

**Mid game (+ Detonate, Kindle).** Build a Smolder field, let it **age to
Volatile**, **Detonate** at the peak. Ride Heat into **Empowered** so Fireball
splashes. Spend a talent point on **Lingering Flame** if you want the field to
gnaw while it ripens.

**Full kit.** Open with **Wildfire**, ride Heat to **the Boil** and spend the
Blaze through the whole line, **Flashpoint** to manufacture an Opening when you
want one — then decide: **Detonate** now for tempo (Wildfire spreads it), or hold
and dump everything into **Inferno**. The Stoke runs underneath all of it, three
seconds apart, asking the same question every time: *what lands next, and when?*

You are always balancing five questions: **What lands next, and can I open the
flue for it? (Stoke) · When do they strike? (their tell) · How much pressure is
banked? (Smolder) · Is it ripe? (age) · Am I riding or bleeding? (Heat)**

---

## 10. Cheat sheet

```
Q       Staff       1.8 s wind-up, swung on your call; casts hold it
SPACE   Stoke       0.5 s of open flue — a working that LANDS inside it
                    banks 2 Heat instead of 1. 3 s cooldown.
1  Fireball     cast; lay Smolder, build Heat; splashes at 5, Blazes at 10
2  Detonate     blow the field — older stacks hit far harder
3  Kindle       instant Smolder (2 if Exposed)
4  Wildfire     seed the pack + fire spreads on every consume
5  Flashpoint   spend all Heat → guaranteed Opening
6  Inferno      spend everything → apocalypse

Openings :  Flashpoint cracks a foe → +30% dmg while Exposed
Tells    :  "WINDING UP" = the blow is already committed
Smolder  :  Fresh → Heated (2s) → Volatile (5s) → falls off (11s); max 5
            inert until Lingering Flame is talented — fuel, not a faucet
Heat     :  +5%/point · +1 per landing working (2 stoked) · −1 per idle 3 s
            at 10 the Blaze fires, then crash
```

---

## 11. Where it lives (for maintainers)

| Concern | File |
|---|---|
| Constants (all tunables) | `src/engine/abilities.ts` |
| Ability defs & effects | `src/engine/abilities.ts` |
| Kit & talents | `src/engine/content/classes.ts`, `content/talents.ts` |
| Strike / Smolder / Heat / Stoke / Openings resolution | `src/engine/sim.ts` |
| Per-enemy Smolder & combat state | `src/engine/enemyUnit.ts` |
| Strike & Stoke state | `src/engine/playerUnit.ts` (snapshot via `StrikeSnapshot` / `PlayerSnapshot`) |
| Events | `src/engine/events.ts` (`strikeLanded`, `heatChanged`, `smolderApplied`, `smolderDetonated`, `openingCreated`, `stoked`, `tellOpened`) |
| Heat gauge widget | `src/ui/slice/WeaveHeat.svelte` |
| Strike bar (the wind-up) | `src/ui/slice/views/ArenaView.svelte` |
| Smolder pips + tell/Exposed visuals | `src/ui/components/EnemyFigure.svelte` |
| Q wiring (the strike) | `src/ui/game.svelte.ts` (`strike`, `onKeyDown`) |
| Space wiring (Stoke / walk on / the circle) | `src/ui/game.svelte.ts` (`hubAction`) |
| FX recipes (incl. the strike's thwack) | `src/ui/fx/spells.ts`, `palette.ts`, `director.ts` |
| Tests | `tests/strike.test.ts`, `tests/spells.test.ts`, `tests/heat.test.ts` |

Tuning is data: nearly every feel decision is a constant at the top of
`abilities.ts`. Change the number, run `npm test`.
