# PLAN — The Kindle Yard: a true fresh start

## 1. What the player asked for (verbatim requirements, restated)

1. Hone the feeling of a **fresh WoW character**. The current opening is clunky.
2. Stick to the **weaver** (the slice's War-Weaver / engine `arcanist`) and fully
   revamp the opening and the starting levels.
3. On arriving from the future, the character starts in a **recruitment camp**.
4. They have **learned no magic** — learning magic is part of the Codex fiction.
5. They start with a **wooden training staff**.
6. Every starting character has a **basic attack** (League-of-Legends style) —
   the staff swings when you have no spells, and the basic attack needs a
   presence on the Arena screen.
7. You immediately talk to your **commander**, who orders you to **duel three
   fellow trainees** — the tutorial for fighting as a weaver.
8. The weaver's special is **Focus (Space)**: time it right before **your own
   attack lands** for bonus damage; time it right before **an enemy attack
   lands** to mitigate.
9. After the three duels you learn your **first spell**. **Fireball must feel
   amazing** — a big moment.
10. Then extensive **Heat training** — with the lesson that the fire is never
    truly mastered. More trainee duels, now with Fireball, learning Heat.
11. **Heat rework**: the burning tick (Smolder's passive burn) is good but too
    strong at level 1 — move it into the weaver's skill tree; design a new
    level-1 Heat mechanic that feels fun and powerful without being OP.
12. Finally, the classic first quest: **kill 6 boars**, which pushes you out
    into the world and into the game we already have.
13. Regenerate the documentation for the game's future state, plan the software
    work, implement end-to-end, and delete all dead code.

## 2. The game loop (as designed)

### The opening arc — "The Kindle Yard"

```
Title → Name → Opening lore → Projection Station → Arrival at the Kindle Yard
   │
   ▼
THE PROVING  — no magic. A wooden staff, an auto-swinging basic attack,
   │           and Sergeant Vale's voice. Duel three fellow trainees,
   │           one at a time, in the sparring circle:
   │             · Duel 1 teaches the swing (watch your own wind-up arc).
   │             · Duel 2 teaches offensive Focus (Space in your last 40% of
   │               wind-up → the landing blow is Sharpened, +50%).
   │             · Duel 3 teaches defensive Focus (Space on the foe's tell →
   │               deflect the blow, crack them Exposed).
   ▼
THE FIRST WEAVING — the proving crosses the Blooded standing threshold.
   │           Full-screen ceremony: the Legion teaches Fireball.
   │           This is the big moment — ember FX, held frame, one spell.
   ▼
THE TEMPERING — two more duels, Fireball now in hand, learning Heat:
   │             · every fire spell feeds Heat; every point of Heat makes your
   │               fire +3% hotter — and Heat bleeds away if you stop feeding it.
   │             · at 10 Heat the next Fireball is a Blaze that pierces the
   │               line — and then the fire slips your grip: Heat crashes to 0.
   │               ("You will never master it. You will only ride it." — Vale)
   │             · duel 4's opponent hardcasts (interrupt-read practice);
   │               duel 5's enrages at low health (pressure practice).
   ▼
GRADUATION — Vale hands the classic first order: q-hollow-boars,
   │           "kill 6 Mossback Boars" in Hollowroot Cavern.
   │           The Map and the field board unlock.
   ▼
THE GAME WE HAVE — field board sightings, standing → Grace teaching
              (Detonate lands right around the boar turn-in), Codex,
              quests, fronts, the works.
```

### The moment-to-moment combat loop (new pieces bolded)

- **Your staff auto-swings** at your target on a 1.8 s timer whenever you're in
  combat and not hardcasting (casting holds the swing). Damage scales with
  level, power, and the equipped staff's ilvl. Swings can crit.
- **Focus is a timing read on any swing about to land — yours or theirs.**
  Enemy tell open → the read (deflect + Expose) wins. Otherwise, if your own
  swing is ≥ 60% wound up → Sharpen (next landing blow +50%). Otherwise a
  whiff and a short lockout.
- Spells layer on top exactly as today (Smolder pressure, Detonate payoff,
  Openings, the wheel).

### Heat, reworked (level-1 fair, never mastered)

| Aspect | Before | After |
|---|---|---|
| Smolder burn tick | Free passive DoT from level 1 | **Talent**: `Lingering Flame` (3 ranks) — rank 1 restores today's burn, ranks 2–3 grow it |
| Heat payoff | Bands only changed Fireball's shape | **+3% fire damage per Heat point** (visible ramp) plus the band shapes |
| Heat at 10 | Sat at overheat indefinitely | Overheat Fireball still pierces the pack — then **Heat crashes to 0** |
| Heat upkeep | Only reset between fights | **Decays 1 per 3 s unfed** — momentum you ride, not a bar you fill |

Smolder itself stays at level 1 as inert *pressure* — fuel you build and cash
with Detonate — it just no longer deals free damage while you wait.

### Grace tiers (retiered — magic is earned, not given)

| # | Rank | Standing | Teaches |
|---|---|---|---|
| 0 | Recruit | 0 | **nothing** — a staff, a bunk, and a name |
| 1 | Blooded | 45 | Fireball *(the proving crosses this)* |
| 2 | Hardened | 140 | Detonate *(the boar order lands you here)* |
| 3 | Trusted | 300 | Kindle |
| 4 | Sworn of the Ember | 520 | Wildfire |
| 5 | Ember-Lord | 780 | Flashpoint |
| 6 | Pyre-Sovereign | 1080 | Inferno |

Deep end-game fronts (Emberwall / Stormharrow / Gravecall) move to tier 6.
Standing math for the opening: 3 proving duels (3×4) + proving bonus (45) = 57
→ Blooded. Tempering (2×4) + graduation bonus (20) = 85. Six boars (24) +
turn-in (45) = 154 → Hardened, so **Detonate arrives as the reward arc of the
boar quest**.

## 3. Software plan

### Engine (`src/engine/`)

- **`types.ts`** — `PlayerSnapshot.strike` (progress / sharpen state / range),
  Heat decay + strike constants re-exported where the UI reads them; new
  `ClassMod 'smolderBurn'`; `FightSpec.sparring`.
- **`abilities.ts`** — constants: `STRIKE_SWING_TICKS`, `STRIKE_TELL_FROM`,
  `STRIKE_SHARPEN_PCT`, `HEAT_FIRE_PCT_PER_POINT`, `HEAT_DECAY_TICKS`;
  `SMOLDER_BURN` becomes the talent's per-rank table.
- **`playerUnit.ts`** — `strikeElapsed`, `sharpenReady`; cleared with combat state.
- **`sim.ts`** —
  - auto-strike in `tick()` (holds during casts; lands via `damageEnemyUnit`,
    so dormant packs wake on the first landing blow, Openings and Doorway
    multipliers apply, crits roll);
  - `focus()` gains the offensive read (enemy tell still wins);
  - Heat: `+3%/point` folded into `rollSpell('fire')`, idle decay, overheat
    crash after the piercing Fireball;
  - Smolder burn tick gated on the `smolderBurn` mod (rank 0 = no burn);
  - `startFight({sparring})`: no loot bundles, no loot phase (clean field on
    clear), sparring kills never advance kill-quests;
  - fresh sims start with a **Wooden Training Staff** equipped (stat-less,
    ilvl 1 — it only feeds the strike formula).
- **`events.ts`** — `DamageSource 'strike'`; `focusUsed` gains
  `mode: 'read' | 'sharpen' | 'whiff'`.
- **`content/talents.ts`** — new arcanist talent `lingeringFlame` (3 ranks,
  `mod: smolderBurn`); kit list updated.
- **`content/enemies.ts`** — five sparring partners (levels 1–2, no loot):
  Trainee Pell / Okka / Varn (proving), Sparhand Derrin (hardcast feint),
  Sparhand Mavet (enrage).
- **`content/quests.ts`** — `q-hollow-boars` ("Six Boars for the Cookfires",
  kill `mossback-boar` ×6, giver Sergeant Vale) — Hollowroot's fourth quest
  and the new `FIRST_ORDER`.

### Slice / meta (`src/ui/slice/`)

- **`camp.ts` (new)** — the pure Kindle Yard script: ordered steps
  (duel/ceremony/order) with Vale's coaching lines; helpers for current step,
  proving/graduation boundaries, bonus standing amounts.
- **`expedition.svelte.ts`** — persisted `camp` step counter + migration
  (a pre-camp save that was already briefed = already graduated, standing
  floored to 45 so nobody un-learns Fireball); `advanceCamp()` pays the
  proving/graduation bonuses through the one standing funnel.
- **`content.ts`** — Grace retier (7 tiers), fronts re-gated, camp constants,
  arrival copy rewritten to the recruitment-camp fiction; `FIRST_ORDER`
  becomes the boar quest (granted at graduation, no longer at first boot).
- **`game.svelte.ts`** — `engageCampDuel()`, camp advancement on cleared
  duels, field board / Map gated until graduation.

### UI

- **`CampBoard.svelte` (new)** — replaces the field board in the Arena until
  graduation: the sparring circle, the current opponent, Vale's line, one
  button. Duel progress pips.
- **`ArenaView.svelte`** — camp header + CampBoard swap; strike readout
  (swing bar with the sharpen window marked, gold when Sharpened is armed).
- **`PlayerHud.svelte`** — the deck portrait grows a staff swing arc.
- **`UplinkShell.svelte`** — the Fireball teach renders as the **First
  Weaving** ceremony (bigger, ember-lit) instead of the standard rite; Map nav
  locked pre-graduation; briefing card speaks the proving.
- **`Arrival.svelte` / `App.svelte`** — arrival copy is the camp muster; the
  first-order grant moves out of boot and into graduation.

### Tests (the contract)

- **new `tests/strike.test.ts`** — swing cadence, staff/level scaling, holds
  during casts, dormant-pack opener wakes the field, crit path, no strike
  while dead/idle.
- **new `tests/focus-timing.test.ts`** — sharpen inside the window, +50% on
  the landing blow, enemy tell outranks sharpen, whiff lockout unchanged.
- **new `tests/camp.test.ts`** — the camp script (order, bonuses, standing
  arithmetic → Fireball exactly at the ceremony, Detonate after boars),
  sparring seam (no loot phase, no kill-quest credit), expedition migration.
- **updated** — `heat.test.ts` (burn is talent-gated; decay; overheat crash;
  +3%/point), `classes.test.ts` (7-talent arcanist kit), `regions/quests`
  (four Hollowroot quests), `warfront.test.ts` (tier-6 gate),
  `ui-hygiene.test.ts`, `balance.test.ts` (talent order gains
  `lingeringFlame`; envelope re-checked), `save.test.ts` (starter staff).
- **`tools/slice-smoke.mjs`** — drives arrival → Kindle Yard → first duel →
  observes strike damage; a seeded graduated save verifies the field board
  still works.

### Order of work

1. Engine: strike + starter staff → 2. Focus timing → 3. Heat rework +
talent → 4. Content (trainees, boar quest, Grace retier) → 5. Slice camp
module + expedition → 6. UI → 7. Docs → 8. Dead-code sweep →
9. `npm test && npm run check && npm run smoke` all green.

### Dead code to remove

`src/ui/slice/Institute.svelte`, `src/ui/components/AbilityWheel.svelte`,
`src/ui/components/HeroHud.svelte` (zero importers), stale planning docs
(`WEB_PIVOT_PLAN.md`, `HANDOFF.md`, `docs/GDD-THRESHOLD.md` — superseded by
the regenerated `docs/GDD.md`), plus anything orphaned by the rework.
