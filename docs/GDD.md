# Mythreach: The Recovered Arts — Game Design Document

> **Status:** canonical, regenerated 2026-07-20 after the Kindle Yard opening
> rework. This document describes the game as built *and* the shape it is
> growing toward. It supersedes the old `GDD.md` and the `GDD-THRESHOLD.md`
> design draft (both of whose surviving ideas are folded in here).
> Companion docs: `COMBAT.md` (the combat system in depth), `GUIDE.md` (the
> player handbook), `CLASSES.md` (calling design), `EXTENDING.md` (the
> content/FX cookbook).

---

## 1. Premise

You live in a hyper-advanced far-future civilization that has discovered that
**magic was real** — an exploitable force of the deep past, lost when the worlds
that held it fell out of reach. The **Institute** has built the **Threshold**:
technology that projects a researcher's *consciousness* into a life the past
will accept. You are one **Fieldworker** among thousands, each seated in a
different lost world, each assigned one lost art.

Your world is **the Ember Legion** — an army that fields war-mages on an open
line. Your art is **War-Weaving**, battlefield fire. Your job is not conquest;
it is *recovery*: live the life, earn the Legion's trust, be taught the way its
own conscripts are taught, and transmit what you witness home as the **Codex**.

The frame is cold instrumentation (the uplink console) wrapped around a warm,
living past — and the fiction gives every system a diegetic reason to exist:

| Mechanic | In-fiction meaning |
|---|---|
| Standing → Grace tiers | The Legion's trust; trust is how magic is taught |
| Ability unlocks | *Teachings* — granted at ceremonies, not level-ups |
| The Codex | Your research: observe the art behaving, fill the chapters |
| Findings → Recovery % | Chapters transmitted home; the art coming back |
| Fronts on the Map | Deployments the Legion trusts you with |
| Death | The projection rethreads — the era's life goes on |

## 2. The player fantasy

**A fresh WoW character, honestly earned.** The game opens the way the great
MMOs did: you are nobody, in a camp, with a wooden stick — and every power you
ever gain is *felt*, because you remember not having it. From there it becomes
a dashboard action-RPG: real-time tick-simulated combat you actively pilot,
reading tells, timing one universal action, building and spending pressure.

No idle progression. Absence is respected, not simulated.

---

## 3. The opening arc — the Kindle Yard

The most important thirty minutes of the game. Flow:

```
Title → Name the conscript → Opening lore (the Institute briefs you)
      → Projection Station (choose the one open world)
      → Arrival: THE KINDLE YARD — the Ember Legion's recruitment camp
```

**Arrival.** Sergeant Vale — caster-sergeant, drill instructor — meets the new
conscript at the gate. You hold a **Wooden Training Staff**. You know **no
magic**: Grace tier 0 (*Recruit*) teaches nothing. The Map is locked; the
sparring circle is the whole world.

**The Proving — three staff-only duels** against fellow trainees (Pell, Okka,
Varn), one per bout, each teaching one mechanic:

1. **The swing** — your staff auto-attacks (1.8 s cadence); watch your wind-up.
2. **The Sharpen** — Focus (Space) in the last stretch of *your own* wind-up
   turns the landing blow (+50%).
3. **The read** — Focus on *the foe's* wind-up deflects the blow and cracks
   them Exposed (+30% taken, 3 s).

**The First Weaving.** Winning the proving crosses the *Blooded* Standing
threshold (3 kills × 4 + a 45-point proving commendation = 57 ≥ 45). A
full-screen ceremony — deliberately grander than every later rite — teaches
**Fireball**. This is the big moment, and everything before it exists to make
this one spell feel enormous.

**The Tempering — two duels with fire in hand**, teaching Heat:

4. **The chant** (Sparhand Derrin, a hardcaster) — Heat is +3% fire damage per
   point and bleeds away unfed; a chant is the longest tell there is.
5. **The boil** (Sparhand Mavet, enrages) — at 10 Heat the next Fireball is a
   Blaze that pierces the line, *then Heat crashes to 0*. Vale's lesson, and
   the class thesis: **nobody masters the Weave; you ride it.**

**Graduation.** Vale hands the classic first order — *Six Boars for the
Cookfires* (kill 6 Mossback Boars in Hollowroot Cavern) — the Map and the field
board unlock, and the game proper begins. The boar quest's rewards + turn-in
standing land the player at *Hardened* right after: **Detonate arrives as the
arc's payoff**, keeping the teaching cadence rolling into the open world.

The camp is pure meta-script (`src/ui/slice/camp.ts` + the Expedition): duels
run through the engine's `startFight({enemyIds, sparring})` seam — sparring
pays XP and Standing but banks no loot, advances no kill-quests, and clears the
field without a loot screen. Camp progress persists per-slot; pre-camp saves
migrate as graduates with Fireball intact.

---

## 4. The core loop (post-graduation)

```
        ┌──────────────────────────────────────────────────────┐
        ▼                                                      │
  THE FIELD BOARD — 3–4 sightings, stats laid bare             │
        │  pick your fight (rarity: common/uncommon/rare/apex) │
        ▼                                                      │
  COMBAT — strike + Focus timing + the fire kit                │
        │  clear → loot the corpses → the board rotates ───────┘
        ▼
  Standing (kills, turn-ins, rare clears) → Grace tiers → new teachings
  Codex chapters fill from *observed events* → transmit → Recovery %
  Quests (Orders) per front · materials · gear · talents · gold
```

- **The field board** is the exploration layer: every rotation might surface a
  champion or the front's **apex** world-boss. Grinders chase XP, questers wait
  for their quarry, boss-hunters watch for the apex.
- **Fronts** (8 regions, Lv 1–24) open by Grace tier on the **Map** — the
  Legion deploys you as it trusts you. The three deep war-fronts (Emberwall
  Breach, Stormharrow Line, Gravecall Barrows) open at the top tier.
- **The Codex** advances only by *witnessing the magic behave* (crits,
  detonations, interrupts, enraged kills, pack clears) — research, not chores.
  Full recovery of the art is the slice's long goal.

## 5. Combat, in one paragraph

Pure deterministic engine at 20 ticks/s: packs of 1–3 free-standing enemy
figures with swing-arc rings, dormant until aggro. The **Strike** auto-swings
your staff; **Focus (Space)** is one universal timing read on any swing about
to land — theirs (deflect + Expose) or yours (Sharpen). The War-Weaver builds
**Smolder** (aging fuel; inert until the *Lingering Flame* talent lights it),
rides **Heat** (+3%/point, bleeds unfed, crashes after the Blaze), and chooses
its moment. Full detail: `COMBAT.md`.

## 6. Systems inventory (all live)

- **Six callings** in the engine (arcanist / gravewright / hourwarden /
  cartomancer / thornspeaker / riftblade), each with a distinct resource
  mechanic; the slice ships the arcanist as War-Weaving (see §8 roadmap).
- **Identity**: mechanical origins + birth signs folded into derived stats.
- **Progression**: XP to level 15, one talent point per level, data-driven
  talents (the arcanist carries seven, including Lingering Flame).
- **Gear**: five slots, rarity-rolled drops, the staff feeding the strike.
- **Quests**: per-region Orders (3 each; Hollowroot carries a 4th — the boar
  order), kill/collect objectives, gear rewards.
- **Materials**: per-region, stack, sell — crafting's future seam.
- **World boss scaffold**: a persistent-HP colossus (the future server seam).
- **Companion scaffold**: one hireling.
- **FX-as-data**: every spell's look is a recipe (`fx/spells.ts`); procedural
  ember-canvas portraits; WebGL particle stage.

## 7. Architecture (the laws)

1. **The engine is pure.** Synchronous, integer-tick, seeded-RNG simulation.
   No wall clock, no ambient globals (a test enforces it). Events out, never
   callbacks in.
2. **The meta layer owns pacing.** Standing/Grace/Codex/camp live UI-side
   (`src/ui/slice/`); the engine only learns *which abilities are taught*
   through one gate (`sim.setTaught`).
3. **Content is data.** Enemies, zones, quests, talents, cards, FX recipes —
   adding content should never mean new engine code.
4. **Tests are the contract.** ~270 vitest specs including a balance envelope
   (an auto-driven smart player must cap in 0.5–6 h with < 40 deaths), plus a
   Playwright smoke that plays the real opening end-to-end.

## 8. Roadmap (the planned future)

- **Near:** camp polish (per-duel FX beats, Vale bark variety), a first-staff
  upgrade moment from the boar quest reward, sound pass on Sharpen/read.
- **Mid:** the second world — the Projection Station already lists them: the
  Ossuary Reach (Necrologue / gravewright), the Loamward Wood (the Green Rite /
  thornspeaker), each a new camp, Grace ladder, and Codex.
- **Far:** crafting on the material economy; the world boss becomes truly
  shared (server-owned HP pool); Fieldworker meta-progression across worlds
  (the Institute's Recovery as the account-level spine).

---

*Superseded and removed: the original `GDD.md` (pre-Threshold),
`GDD-THRESHOLD.md` (design draft — built), `HANDOFF.md`, `WEB_PIVOT_PLAN.md`
(historical build briefs).*
