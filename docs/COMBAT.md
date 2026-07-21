# Mythreach — Combat System Guide

> The War-Weaver should not feel like a character executing a memorized rotation.
> Combat should feel like a **duel**: watch the enemy, watch *yourself*, build
> pressure, choose the perfect moment to unleash it.

This document explains the combat system: the **universal** layer every calling
shares (the Strike, Openings & Focus) and the **War-Weaver (Arcanist)** built on
top of it (Smolder, Heat, and its six-spell kit).

All timings are given in seconds and in **ticks** — the engine runs at **20 ticks
per second** (1 tick = 50 ms). The global cooldown (GCD) is **24 ticks / 1.2 s**.

---

## 1. Design philosophy

The War-Weaver is a **pressure-builder**. It does not overwhelm with constant
spam — it creates *inevitable* destruction. Every fight follows the same
emotional arc:

```
Swing the staff  →  Read the moment  →  Ignite  →  Feed the flames
                                                        ↓
                    Detonate   ←   Wait for the right moment
```

The depth comes from four simple systems **interacting**, not from a longer
button sequence:

| System | Lives on | One-line role |
|---|---|---|
| **The Strike** | you | The staff's basic attack on **Q** — swung when *you* call it, even spell-less. |
| **Openings** | both sides | A timing read on **any swing about to land** — theirs *or yours* — answered with **Focus**. |
| **Smolder** | the enemy | Lingering fire you stack and let *age*, then consume. |
| **Heat** | you | Riding momentum: every point burns hotter, unfed it bleeds away. |

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
  issued a **Wooden Training Staff** (ilvl 1, stat-less — it exists to be swung).
- **Casting holds the swing.** A hardcast in flight parks the wind-up where it
  is; it resumes the moment your hands are free. The GCD does *not* stop it.
- **Dormant packs** simply stand there: your Q (or any cast) is the free first
  blow, and when it *lands* the field wakes (aggro).

**Constants:** `STRIKE_SWING_TICKS=36`, `STRIKE_BASE=2`, `STRIKE_SPREAD=4`
(in `src/engine/abilities.ts`). Entry point: `GameSim.strike()` — refused when
dead, out of a fight, without a target, mid-cast, or already swinging.
Resolution: `GameSim.resolveStrike()`.

---

## 3. The universal layer — Openings & Focus

Every enemy cycles through **combat states** you can read on its figure:

| State | What it means | Shown as |
|---|---|---|
| `guarded` | Neutral. Nothing to exploit. | (no special marker) |
| `telegraph` | **Winding up** — a tell is open. | *"WINDING UP — FOCUS"*, totem pulses orange |
| `exposed` | An **Opening** is live. | *"Exposed"*, foe glows gold |
| `recovering` | Just committed a swing; briefly safe. | (no special marker) |

And **you have a tell too**: the last **40%** of your own staff wind-up is the
**Sharpen stretch** (the strike bar brightens through it).

### Focus — the universal timing read (Space / the heart of the wheel)

One non-damaging action, three outcomes, priority top-down:

1. **The read** — a foe is telegraphing (last 40% of its wind-up, or any
   hardcast): you **deflect the incoming blow** (its swing resets; a hardcast is
   *interrupted*) and the foe is **Exposed for 3 s**. This is the defensive
   timing: Focus *right before their attack lands*.
2. **The Sharpen** — no enemy tell, but your own swing is deep in its wind-up:
   the landing blow is **Sharpened, +50%**. This is the offensive timing: Focus
   *right before your own attack lands*.
3. **The whiff** — nothing readable: a short **1.5 s** lockout so it can't be
   mashed.

A successful read or Sharpen costs the full **2.5 s** Focus cooldown.

### What an Opening is worth

While a foe is **Exposed**: it takes **+30% damage** from everything you do,
Fireball into it lays an extra Smolder and banks an extra Heat, Kindle lays 2.

> **The staff-only loop (the training camp):** **Q** to swing → Space late in
> *your* wind-up to Sharpen → Space on *their* wind-up to deflect and Expose.
> Two keys, zero spells, and you are already playing a timing duel from both
> sides. (The Sharpen needs a swing actually in flight: Focus with an idle staff
> and no enemy tell is a whiff.)

**Constants:** `OPENING_TICKS=60`, `OPENING_DMG_PCT=30`, `FOCUS_CD_TICKS=50`,
`FOCUS_WHIFF_CD_TICKS=30`, `TELL_FROM_PROGRESS=0.6`, `STRIKE_TELL_FROM=0.6`,
`STRIKE_SHARPEN_PCT=50`. Focus is `GameSim.focus()` — deliberately **not** an
ability id, so it never competes for a wheel seat or a hotkey.

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

- **Every point of Heat burns your fire +3% hotter** — a visible, immediate ramp.
- Banked by offensive fire: **+1** per Fireball, **+2** per Detonate, **+1** per
  Kindle (**+1 extra** when Fireball is loosed into an Opening).
- **Unfed Heat bleeds away:** −1 every 3 s your hands are idle. A cast in flight
  counts as feeding it (the decay clock parks while you're casting).
- **The Boil (10):** your next Fireball is a **Blaze** — it pierces the whole
  pack at full damage and Smolders everything — *and then the fire slips your
  grip*: **Heat crashes to 0** and the climb begins again.
- Resets between fights. Never persists. Never mastered.

### Heat evolves the Fireball

| Heat | Band | Fireball becomes |
|---|---|---|
| 0–4 | **Riding** | Single target, +3%/point. |
| 5–9 | **Empowered** | **Splashes** up to 2 other foes for 40% + a lick of Smolder each. |
| 10 | **The Boil** | The **Blaze**: pierces the whole pack, Smolders them all — then crashes to 0. |

**Constants:** `HEAT_MAX=10`, `HEAT_EMPOWERED_AT=5`, `HEAT_OVERHEAT_AT=10`,
`HEAT_FIRE_PCT_PER_POINT=3`, `HEAT_DECAY_TICKS=60`, `HEAT_PER_FIREBALL=1`,
`HEAT_PER_DETONATE=2`, `HEAT_PER_KINDLE=1`, `HEAT_OPENING_BONUS=1`,
`FIREBALL_SPLASH_PCT=40`.

---

## 6. The kit — spell by spell

Six seats on the wheel (hotkeys 1–6), plus universal Focus on the heart / Space
and the staff swinging underneath it all. Everything is fire school. Damage
scales with **power** (`3 × (level−1) + gear`), school bonuses, Heat, and crit
(**×1.75**).

### 1 · Fireball — *taught at Blooded (the First Weaving)*
`14 mana · 2.2 s cast · no cooldown`

Your workhorse. Deals a base fire hit (**16–24** + power + Heat), lays
**1 Smolder**, banks **1 Heat**. Its behaviour evolves with Heat (see §5). Cast
into an Opening: **+1 Smolder, +1 Heat**, and the hit gets the Exposed **+30%**.

### 2 · Detonate — *taught at Hardened*
`12 mana · instant · 3 s cooldown` — *requires ≥1 Smolder on the target*

Sets off **every** Smolder stack at once. Damage = the sum of each stack's band
value (Fresh 6 / Heated 11 / Volatile 18), then power/Heat/crit-scaled. Banks
**2 Heat**. The first major decision of the class: cash a Fresh field now for
tempo, or wait for Volatile and hit like a landslide.

### 3 · Kindle — *taught at Trusted*
`10 mana · instant · 5 s cooldown`

Instantly lays **1 Smolder** — **2** if the target is Exposed. Banks **1 Heat**.
The fast way to build pressure without a cast (and to keep Heat fed between casts).

### 4 · Wildfire — *taught at Sworn of the Ember*
`20 mana · instant · 15 s cooldown`

Two things at once:
- **Active:** seeds **2 Smolder** on **every** living foe.
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
| ♦ | **Focus** | issued at the gate | — | instant | 2.5 s | — | an Opening / a Sharpen |
| 1 | Fireball | Blooded (45) | 14 | 2.2 s | — | — | 1 Smolder, 1 Heat |
| 2 | Detonate | Hardened (140) | 12 | instant | 3 s | all Smolder | 2 Heat |
| 3 | Kindle | Trusted (300) | 10 | instant | 5 s | — | 1–2 Smolder, 1 Heat |
| 4 | Wildfire | Sworn (520) | 20 | instant | 15 s | — | 2 Smolder (all foes) + spread |
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
scales with level. A recruit is taught **nothing**: the staff and Focus are the
whole level-1 kit, and the training camp (see `docs/GDD.md` §3) teaches them
before the first spell is ever granted.

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

**The Kindle Yard (no spells).** You swing the staff with **Q** and play the
timing. Space late in your own wind-up → Sharpened blow. Space on their wind-up
→ deflect + Expose. The whole game in miniature, with two buttons.

**Blooded (Fireball).** Watch the foe. Focus its tell → Fireball into the
Opening (extra Smolder, extra Heat, +30%). The staff keeps swinging between
casts. Heat starts mattering: every point is +3%, and stopping bleeds it.

**Mid game (+ Detonate, Kindle).** Build a Smolder field, let it **age to
Volatile**, **Detonate** at the peak. Ride Heat into **Empowered** so Fireball
splashes. Spend a talent point on **Lingering Flame** if you want the field to
gnaw while it ripens.

**Full kit.** Open with **Wildfire**, ride Heat to **the Boil** and spend the
Blaze through the whole line, **Flashpoint** to manufacture an Opening when the
enemy won't give one — then decide: **Detonate** now for tempo (Wildfire spreads
it), or hold and dump everything into **Inferno**.

You are always balancing six questions: **When do they strike? (their tell) ·
When do I? (my wind-up) · How much pressure is banked? (Smolder) · Is it ripe?
(age) · Am I riding or bleeding? (Heat) · Spend or save? (the boil)**

---

## 10. Cheat sheet

```
(auto)  Staff       swings every 1.8 s; casts hold it; crits happen
SPACE   Focus       their tell → deflect + Expose (+30%)
                    your late wind-up → Sharpen the landing blow (+50%)
                    nothing open → whiff (1.5 s lockout)
1  Fireball     cast; lay Smolder, build Heat; splashes at 5, Blazes at 10
2  Detonate     blow the field — older stacks hit far harder
3  Kindle       instant Smolder (2 if Exposed)
4  Wildfire     seed the pack + fire spreads on every consume
5  Flashpoint   spend all Heat → guaranteed Opening
6  Inferno      spend everything → apocalypse

Openings :  read the "WINDING UP — FOCUS" tell → +30% dmg while Exposed
Smolder  :  Fresh → Heated (2s) → Volatile (5s) → falls off (11s); max 5
            inert until Lingering Flame is talented — fuel, not a faucet
Heat     :  +3%/point · −1 per idle 3 s · at 10 the Blaze fires, then crash
```

---

## 11. Where it lives (for maintainers)

| Concern | File |
|---|---|
| Constants (all tunables) | `src/engine/abilities.ts` |
| Ability defs & effects | `src/engine/abilities.ts` |
| Kit & talents | `src/engine/content/classes.ts`, `content/talents.ts` |
| Strike / Smolder / Heat / Openings / Focus resolution | `src/engine/sim.ts` |
| Per-enemy Smolder & combat state | `src/engine/enemyUnit.ts` |
| Strike & Sharpen state | `src/engine/playerUnit.ts` (snapshot via `StrikeSnapshot`) |
| Events | `src/engine/events.ts` (`strikeLanded`, `heatChanged`, `smolderApplied`, `smolderDetonated`, `openingCreated`, `focusUsed`, `tellOpened`) |
| Heat gauge widget | `src/ui/slice/WeaveHeat.svelte` |
| Strike bar (wind-up + Sharpen stretch) | `src/ui/slice/views/ArenaView.svelte` |
| Smolder pips + tell/Exposed visuals | `src/ui/components/EnemyFigure.svelte` |
| Q wiring (the strike) | `src/ui/game.svelte.ts` (`strike`, `onKeyDown`) |
| Space wiring (Focus / walk on / the circle) | `src/ui/game.svelte.ts` (`hubAction`) |
| FX recipes (incl. the strike's thwack) | `src/ui/fx/spells.ts`, `palette.ts`, `director.ts` |
| Tests | `tests/strike.test.ts`, `tests/spells.test.ts`, `tests/heat.test.ts` |

Tuning is data: nearly every feel decision is a constant at the top of
`abilities.ts`. Change the number, run `npm test`.
