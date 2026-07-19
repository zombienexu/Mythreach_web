# Mythreach: The Recovered Arts — Game Design Document

> **Codename:** *Threshold* — the ground-up narrative + systems redesign of Mythreach.
> **Status:** design draft, 2026-07-18. This document describes the *target* game. It
> assumes the current build (`docs/GDD.md`) as its starting material and calls out
> exactly what is reused, what is reframed, and what is net-new. "Current" = what exists
> in the tree today; "Target" = what this document proposes.
>
> **Reading order:** §1–§4 are the pitch and the loops. §5–§11 are the new systems.
> §12–§17 cover the ladders and endgame. §18–§22 are direction, architecture, build plan,
> and risks. If you read only three sections, read §1, §4, and §19.

---

## 1. The reframe, in one page

Mythreach today is a single-player dashboard RPG: you run a hero from a command console,
and when a fight matters you take the controls and outplay it. Six magic "callings," five
regions, a pure deterministic engine, a data-driven FX layer. That game is *good* and its
bones are load-bearing. The redesign does not throw any of it away — it **wraps it in a
fiction and a meta-loop that give every existing system a reason to exist**, and adds the
long tail the current build is missing.

**The premise.** You live in a hyper-advanced far-future civilization that has just made a
discovery: magic was *real*, once — an actual, exploitable force that existed in the deep
past and was lost when the worlds that held it fell out of reach. The **Institute** (your
home organization) has built the **Threshold**: time-displacement technology that can
project a researcher's consciousness into the distant magical past. You are **one
fieldworker among thousands**, each assigned to a different lost world and a different
magic system. Your job is not to conquer the past. It is to **learn a magic system deeply
enough to bring it home** — to reconstruct it as recoverable technology in your own time.

**Why this fixes the current game's biggest gap.** The current build proves the *feel* but
has no spine — no reason the player is doing any of it, and a thin endgame. The reframe
supplies:

- **A goal that is legible in one sentence** at three scales: master *this* system (a
  world), recover *this* system for home (the Codex), recover *all* the arts (the grand
  project).
- **A diegetic justification for the entire aesthetic.** You are not standing in the past.
  You are observing your **Persona** through an uplink, on instrumentation. The dashboard
  *is* your field console. The austere glass-and-numbers presentation stops being a budget
  decision and becomes the literal fiction. (This is the single most valuable idea in this
  document — see §18.)
- **A diegetic justification for "active-only."** Your Persona runs on a live uplink. When
  you close the tab, the uplink drops and the Persona goes into **stasis** — the past does
  not advance while you are gone. Nothing is simulated in your absence because, in fiction,
  nothing *happens* in your absence. The current `loop.ts` "discard the gap" behavior is
  now canon, not a compromise.
- **A structural home for content forever.** Every new world is a new magic system, a new
  social entry, a new bestiary, a new endgame — all expressed as data in the pattern the
  engine already uses.

**What the player actually does.** Choose a magic system to research. The Threshold drops
your Persona into that world **inside a life** — a conscript in an ancient war-mage legion,
a villager apprenticed to a priest, an initiate in a criminal cabal. You earn the locals'
**trust** by running their errands and fighting their battles; trust unlocks **teaching**,
which unlocks the magic; using and observing the magic fills a **Codex**; completed Codex
research is transmitted **home**, advancing the grand project. You may pursue one system to
its deep endgame, or spread across many. One account, one present-day **Researcher**, many
worlds, a separate leveled character in each.

**One-sentence wedge:** *A future scientist recovers lost magic by living ordinary lives in
ancient magical worlds — the dashboard RPG where the dashboard is your window into the
past, and mastering one art can be a whole game.*

---

## 2. The fiction

### 2.1 Home — the Late World and the Institute

The present is a civilization so far up the technology curve that scarcity is mostly
solved and the frontier is *understanding*, not building. Somewhere in the archives, a
recovered fragment — a shard of a language, a physically impossible artifact, an
inexplicable energy signature — proved that **magic once worked**, under rules physics no
longer permits, in worlds now sealed behind deep time.

The **Institute** (working name; alt: the *Directorate of Recovered Arts*) is the body that
studies this. It cannot send bodies into the past — mass can't cross the Threshold — but it
can project **consciousness** into a constructed local identity: a **Persona**, grown from
the target world's own patterns so it belongs there. You wear a life that fits the era. The
locals see a person; you see a console.

You are a **Fieldworker** (the present-day *you*; also called a **Researcher** or
**Delegate**). You are not special. You are one entry in an enormous roster, and the
Institute measures you against the others. This is deliberate: it frames leaderboards and
"grand project" contribution as canon rather than bolt-on.

### 2.2 The Threshold and the uplink

The **Threshold** projects you; the **uplink** keeps you connected. Through it you perceive
your Persona's situation as **telemetry** — health, resources, the shapes and intents of
things around them, the flow of a fight — rendered on your console. You act by sending
**intents** down the uplink; the Persona executes. Latency, bandwidth, and the alien
physics of magic are the in-fiction reasons the world reaches you as glass panes, arcs,
and floating figures rather than as a body's-eye view.

- **Uplink up = you are present.** The Persona lives; the world advances only while you
  watch. (Active-only, §18.)
- **Uplink down = stasis.** Close the tab, and the Persona is suspended between one instant
  and the next. No offline progress, ever — because in fiction, no time passes.
- **Bandwidth is a resource** you barely have. This is the seed of the **Devices** system
  (§10): the tiny sliver of future tech you can push through the uplink.

### 2.3 The Personas — living lives to learn

You do not arrive as a hero. The Threshold inserts you into a **station in life** chosen by
the world you picked — an **entry frame** (§7). You learn magic the way that life would:

- A **Conscript** learns war-magic on the line, from a caster-sergeant, by surviving
  battles.
- A **Supplicant** learns temple-magic from a village priest, slowly, through ritual and
  the community's trust.
- An **Initiate** learns forbidden magic in a criminal cabal, fast and dangerous, with
  **heat** to manage.

Your Persona has a name, a face, a place, and people who expect things of you. Mastery is
earned as a member of that world, not imposed on it. This is the emotional core: **you are
a stranger learning to belong, in order to learn to leave.**

### 2.4 The tension the whole game runs on

You are here to *take something home*. The people teaching you do not know that. Trust you
earn honestly is trust you will, eventually, spend. The design does not force this into
melodrama, but it is always available: late-world quest lines, faction reactions, and
optional "consequence" content can lean into the ethics of extraction. (Kept as an
*optional narrative dimension*, not a mandatory guilt mechanic — see §21 open questions.)

---

## 3. Design pillars

The current game's five pillars survive intact (dashboard-as-world, arena-as-stage,
hands-on combat, respect absence, numbers-you-can-feel). The redesign adds four:

6. **The dashboard is diegetic.** The console is the uplink. We never apologize for the
   art direction again; we *escalate* it. Every panel is instrumentation. (§18)
7. **Three goals, always legible.** At every moment the player can answer "what am I
   working toward?" at three scales — *this fight/session*, *this world's mastery*, *the
   grand recovery*. No layer is dead air.
8. **Belonging is a system, not a cutscene.** Trust/Standing is earned through play and
   *gates the magic itself*. You don't buy spells; the world decides to teach you. (§8)
9. **One art can be a whole game.** A single magic system must have enough vertical
   endgame — mastery research, faction ascension, repeatable raids, prestige — that a
   player who never leaves their first world still has years of goals. Breadth (all
   systems) and depth (one system) are *both* first-class. (§14, §15)

Two carried-over design *values* from the owner's notes (`Mythreach_Thoughts.md`) are
promoted to constraints:

- **Master encounters, not rotations.** Long-term skill lives in *enemy design*. Every
  world ships mechanics, not just stat-bumps. (§12)
- **Keep the engine pure.** Non-negotiable. It is what makes all of this testable, and it
  is what keeps the multiplayer door open. (§19)

---

## 4. The core loops

Four nested loops. Each inner loop feeds the one outside it.

```
┌─ ACCOUNT LOOP (the grand project) ──────────────────────────────────────────┐
│  Pick / unlock a magic system → run an Expedition → transmit findings home   │
│  → advance the Institute's Recovery → unlock new & "unknown" systems.        │
│                                                                              │
│   ┌─ WORLD LOOP (one Expedition / one Persona) ───────────────────────────┐  │
│   │  Earn Trust (quests, battles) → be taught new magic → grow the Persona │  │
│   │  (level, gear, talents) → raise Research access → complete Codex       │  │
│   │  chapters → reach the world's endgame (ascension / raids / prestige).  │  │
│   │                                                                        │  │
│   │   ┌─ SESSION LOOP ──────────────────────────────────────────────────┐ │  │
│   │   │  Bring uplink up → take Directives + Charges → hunt / fight /    │ │  │
│   │   │  turn in → bank Trust, XP, loot, Insight → set next objective.   │ │  │
│   │   │                                                                  │ │  │
│   │   │   ┌─ MOMENT LOOP (combat) ───────────────────────────────────┐  │ │  │
│   │   │   │  Read the pack → target → cast/queue/interrupt/heal →     │  │ │  │
│   │   │   │  the arena stages it → numbers you can feel → loot.       │  │ │  │
│   │   │   └──────────────────────────────────────────────────────────┘  │ │  │
│   │   └──────────────────────────────────────────────────────────────────┘ │  │
│   └────────────────────────────────────────────────────────────────────────┘  │
└──────────────────────────────────────────────────────────────────────────────┘
```

- **Moment loop** = the current combat system. Reused wholesale.
- **Session loop** = a play session: the current start-fight/quest/loot cycle, now feeding
  Trust and Insight in addition to XP/gold.
- **World loop** = *new*. Trust → teaching → Research → Codex → world endgame.
- **Account loop** = *new*. The meta over all worlds: findings → grand project → unlocks.

The design health check: **every reward from an inner loop must be spendable in the loop
outside it.** Gold buys within the world; Insight buys within the Codex; findings buy at
home. If a currency has nowhere to go, cut it (§17).

---

## 5. Account and data model

This is the one structural change to the save architecture, and it is small.

### 5.1 The hierarchy

```
Account
└─ Researcher            (present-day self: one per account)
   ├─ home meta-state    (Recovery progress, Devices, Cells, grand-project quests)
   ├─ Codex library      (per-system research, cross-world)
   └─ Expeditions[]      (one per World the player has opened)
      └─ Persona         (a fully leveled character — ≈ today's per-slot save)
         ├─ level / XP / gold / gear / talents / abilities   (current engine save)
         ├─ world-local: faction Standing, world quests, world endgame state
         └─ Research access (Grace) for this world
```

- **One Researcher per account.** The present-day meta-self. Owns everything cross-world.
- **N Expeditions**, one per World, created when the player first opens that world.
- **Each Expedition holds one Persona** whose progression is *exactly* the current
  single-character save, generalized. A Persona in the Ember Legion knows nothing about a
  Persona in the Cartomantic underground; they level independently.

The current **3 save slots** are replaced by an **unbounded expedition roster**. Slots were
"three parallel unrelated characters." Expeditions are "the several worlds *one* Researcher
is working." Same underlying per-character save, richer framing, no artificial cap.

### 5.2 Save format and migration

- Introduce an account-level envelope: `AccountSave { version, researcher, expeditions:
  Record<WorldId, ExpeditionSave> }`. Each `ExpeditionSave` is today's engine save (v5)
  plus the new world-local fields (Standing, Research access, world-endgame state).
- **Migration is clean.** A pre-Threshold v5 save becomes the **first Expedition** of a
  freshly-minted default Researcher (the Ember/Arcanist world). The existing v1→v5 migration
  chain runs inside the Expedition unchanged. This is exactly the pattern already used when
  the title screen was added (slot 1 kept the original key) — generalize it one level up.
- The engine save still knows nothing about identity/profile/UI; the account envelope is
  written by a new **meta persistence** layer parallel to today's `profile.ts`.

### 5.3 Engine-side: `GameSim` per Expedition, a thin `MetaSim` above

- Keep `GameSim` **exactly as it is**: pure, deterministic, one Persona's whole life, 20
  tps, injected RNG, events-out. It does not learn about worlds or the account.
- Add a small pure **`MetaSim`** (account layer) that owns: the Codex, home meta-state,
  Devices/Cells, the grand project, and the *decision* of which `GameSim` is live. It
  consumes a filtered stream of the live `GameSim`'s events (e.g. `AbilityResolved`,
  `EnemyKilled`, `QuestTurnedIn`) to advance **Research observation** (§9) — meta reacts to
  combat, but combat never reaches up into meta. Same "events out, not callbacks in" law,
  one level higher.
- **Only one `GameSim` ticks at a time** (the world you're in). This preserves active-only
  and keeps CPU flat regardless of roster size — the other expeditions are inert save data,
  not running simulations.

---

## 6. Worlds and magic systems

A **World** bundles four things: a **magic system** (the kit + resource + fantasy), an
**entry frame** (how you're inserted, §7), a **setting** (bestiary, regions, factions,
tone), and an **endgame**. The current six callings become the launch roster of magic
systems — they are *already* six distinct, fully-implemented fantasies with their own
resources, talents, and auto-brains. That is a year of the hardest work already done.

### 6.1 Mapping the six callings to launch worlds

The kit stays as-built; the world is the new wrapper. Suggested framings (tune freely):

| Calling (kit, today) | Magic system (fiction) | Entry frame | Setting sketch |
|---|---|---|---|
| **Arcanist** — The Weave | **War-Weaving**: battlefield evocation taught in a legion | **Conscript** | The **Ember Legion**, an ancient army that fields battle-mages. Learn on the line. *(The natural onboarding world — combat-forward, matches the tutorial the current build already is.)* |
| **Thornspeaker** — Growth | **The Green Rite**: druidic life-magic of a farming folk | **Supplicant** | A **temple-village** in a vast wood; the priest teaches the patient. Slow, communal, ritual. |
| **Gravewright** — Ledger of the Dead | **Necrologue**: forbidden death-accounting | **Initiate** | A **grave-cult / smuggler underground** in a necropolis-city. Illicit, transactional. |
| **Cartomancer** — the Hand | **Fatecasting**: reading and bending fortune | **Initiate** (alt) | A **thieves' oracle house** — fortune-tellers who are also a crime family. Variance as a way of life. |
| **Riftblade** — Rift charges | **Riftcraft**: spatial dueling magic | **Duelist / retainer** | A **warrior-caste** of honor-duelists; learn by challenge. |
| **Hourwarden** — Sand Debt | **Horology**: time-debt magic | **Locked (unknown)** | Held back as an unlock — see §6.3. Time-magic *resonating with your own Threshold tech* is the narrative payoff of the grand project. |

The point is not these exact assignments — it's that **each existing kit already is a
magic system**, and the redesign only adds a frame, a bestiary skin, factions, and an
endgame around it.

### 6.2 The starting choice

At account creation the player picks their **first system** from a small set of **known**
worlds (2–4 at launch). This choice determines the entry frame and thus the first hours'
texture. This replaces today's "choose a calling" step — same decision, now also choosing a
*world and a life*, which is a much stronger hook.

### 6.3 Unknown systems — the unlock spine

Some systems are **rumored but unrecovered**. They appear on the Institute's board as
**redacted dossiers**: a silhouette, a scrap of intel, a locked requirement. You unlock
them by advancing the grand project (§15) — e.g., "Recover 2 systems to Codex tier III to
triangulate the location of the Horologists' world." This does three jobs:

- Gives the **breadth** playstyle a laddered goal (not just "here are ten worlds, go").
- Lets us **withhold the thematically loud systems** (Horology/time-magic; a hypothetical
  "true magic" capstone) as earned reveals.
- Seeds **live-ops**: new worlds ship as newly "recovered" systems, which is *canon* for a
  content drop rather than a jarring addition.

---

## 7. Entry frames — how you learn

The **entry frame** is a World property that shapes the first ~third of that world and the
*channel* through which magic is taught. It is the redesign's answer to "the same combat
loop must feel different across worlds." Frames are **content-as-data**: a teacher, an
early quest chain, a trust source, and a small frame-specific mechanic.

| Frame | You begin as | Teacher | How magic is taught | Frame mechanic |
|---|---|---|---|---|
| **Conscript** | A raw recruit in an army | Caster-sergeant | Battlefield drills; new spells unlock by *surviving named engagements* | **Deployment**: quests are assignments; failing a battle costs Standing with the unit |
| **Supplicant** | A villager / apprentice | Village priest | Ritual and study; spells unlock via *rites* that require materials + trust | **Devotion**: a slow, safe trust track; gated on community goodwill, not kills |
| **Initiate** | A recruit in a criminal cabal | A cabal fixer | Illicit lessons bought with jobs and silence | **Heat**: risky work pays more Insight but raises Heat; too much Heat triggers crackdowns (elite hunter encounters) |
| **Retainer / Duelist** | A sworn sword | A master | Learn by formal challenge; spells unlock by *winning duels* | **Honor**: a reputation economy; dishonorable wins close teaching doors |

Design rules for frames:

- A frame changes **onboarding and trust-source**, not the deep combat. The kit is the
  kit. This keeps content cost bounded — we skin the *entry*, not the whole game.
- The frame's mechanic (Deployment/Devotion/Heat/Honor) is a **light overlay** on the
  existing quest + reputation systems, expressible as a tagged union the engine interprets
  (exactly how enemy mechanics work today).
- Every frame converges, by mid-world, on the same core: hunt, fight, trust, research. The
  frame is the *voice* of the first act.

---

## 8. Trust & Standing — belonging as a gate

**Standing** replaces "spells unlock purely by level." In the current build, level-ups hand
you the next spell. In the target, **the world teaches you** — and it only teaches those it
trusts.

- **Standing** is a per-**faction** reputation (a world has 1–4 factions: e.g. the Legion,
  the officer corps, the camp-followers). Earned by Local Charges (§11), battles, and
  frame activities. This is a light generalization of the existing quest-reward system.
- **Grace / Research Access** is a **world-level** meter derived from your Standing and
  story beats. It represents "how much of the art they'll let you see." Grace tiers unlock:
  - **Teaching**: the next abilities/talents in the kit (replacing pure level-gating).
    Level still governs *power* (stats, spell ranks); Grace governs *access*.
  - **Areas / factions / vendors**: deeper regions, better teachers, restricted markets.
  - **Codex permissions**: some research objectives are only *observable* once you're
    trusted enough to be shown the real magic (§9).
- **Betrayal / extraction beats** (optional, §2.4): certain grand-project actions *spend*
  Standing — you take something the faction guarded, and they know. This is where the
  fiction's central tension becomes a mechanic. Kept optional and lever-tunable.

Why this matters: it turns reputation from a side-track into **the main gate on power**,
which is what makes the "learn to belong in order to learn to leave" fantasy real. It also
gives the Supplicant/temple frame a reason to exist (a non-combat trust path).

---

## 9. Research & the Codex — the extraction meta-layer

This is the redesign's new spine and its endgame engine. It answers *why you fight*.

### 9.1 The Codex

Each magic system has a **Codex** — the Institute's growing dossier on that art. It is a
tree of **research chapters**; completing chapters transmits **findings** home (§15) and
grants **Insight** (the system-local meta-currency, §17). The Codex lives on the
**Researcher** (cross-world), so progress persists even if you rotate worlds.

### 9.2 Research objectives = "observe the magic doing things"

Chapters are completed by **observation objectives** the `MetaSim` evaluates from the live
combat event stream — *diegetically, you are recording data on how the magic behaves.*
Examples (per system):

- "Record **20** Ignite ticks on a burning target" (Arcanist).
- "Witness a **Final Chapter** resolve with a Ledger of 8+" (Gravewright).
- "Survive a **Reckoning** at negative Sand Debt" (Hourwarden).
- Cross-cutting: "Defeat an **enraged elite** using only interrupts to prevent its
  hardcast" — rewards *encounter* mastery, the pillar from §3.

Because the engine already emits a rich `CombatEvent[]` union (~25 kinds), **most
objectives are pure predicates over events** — cheap to author as data, and testable with
the existing seeded-RNG harness. This reuses the deepest strength of the codebase.

### 9.3 Tiers and the two playstyles

The Codex is banded into tiers so it serves *both* audiences:

- **Tiers I–III (Recovery):** learn the system's fundamentals. Completing tier III =
  "system recovered to a transmittable degree," which is the **breadth** milestone that
  advances the grand project and helps unlock new worlds. A player spreading wide grinds
  each world to ~tier III and moves on.
- **Tiers IV+ (Mastery):** deep, repeatable, endgame research — high-difficulty
  observations, "perfect execution" objectives, raid-only data, prestige-gated chapters.
  This is the **depth** content that lets a one-system player keep going effectively
  forever. Mastery findings feed *bonus* grand-project progress, so depth is never a
  dead-end relative to breadth.

### 9.4 Why this is the right meta

- It makes **combat mastery the source of meta-progress** (per the owner's stated concern
  that active play must matter): you can't fully research an art by auto-battling trash;
  the interesting objectives demand execution.
- It is **fiction and mechanic at once** — you are literally a researcher recording magic.
- It is **content-cheap to extend**: a new chapter is a predicate + a reward, no new engine
  code.

---

## 10. Future tech — Devices, Cells, and the uplink

You have "a mix of future technology, minimally available." This is the **shared toolkit
every Persona carries regardless of magic system**, and it is the mechanical expression of
"you're not from here." It also closes several design loops at once.

- **Devices** are a small set of gadgets pushed through the uplink. They are *utility*, not
  a second spellbook — deliberately few and powerful, so they never overshadow the local
  art you're here to learn. Candidates:
  - **Chronometer** — precise cooldown/cast telemetry; a talent-able micro-rewind (a
    single short "undo" of the last GCD). *Also the in-fiction reason the UI shows exact
    timers.*
  - **Field Analyzer** — scan an enemy to reveal its mechanics/next cast, and mark it as a
    **research target** (turns a fight into a Codex observation). *The in-fiction reason you
    can read enemy intents at all.*
  - **Anchor Beacon** — emergency recall: bail out of a losing fight at a Cell cost
    (an escape valve; ties to the Initiate frame's Heat).
  - **Field Automation Module** — *this is auto-battle,* reframed: a future-tech assist that
    runs a sensible priority but can't burst like you. Now canon, not a concession.
  - **Ration Synth** — the out-of-combat quick-heal; explains fast between-fight recovery.
- **Cells** are the scarce power source for Devices — resupplied *from home*, tying the
  world loop back to the account loop. Running low on Cells is a reason to transmit
  findings (which earns a resupply) — a gentle pull back to the meta.
- **The uplink** frames active-only (§2.2) and gives us a clean home for future networked
  features (a "relay" that lets other Researchers' offline Personas assist — see §19.4).

Devices are **cross-world** (they live on the Researcher), so investing in your tech is a
*breadth* incentive: better gear-for-your-tech benefits every Expedition. This balances the
depth incentive of a single world's gear/talents.

---

## 11. Quests — two givers, one board

The lore specifies two quest sources; the current quest engine already supports multiple
givers with distinct voices, so this is mostly reflavoring plus one new giver.

- **Directorate Directives** (home/meta): objectives from the Institute. Cross-world,
  research-shaped, meta-rewarding. "Establish tier-II Standing with the Legion." "Recover a
  physical sample of war-ash." "Transmit the Necrologue's tier-III findings." Reward:
  **findings / Cells / Devices / grand-project progress.** These are the account loop's
  quests.
- **Local Charges** (world): the existing traveler quests, now voiced per faction and tied
  to **Standing**. "Clear the wolves off the north road." "Carry this to the shrine."
  Reward: **Standing / gold / gear / Insight.** These are the world loop's quests.

Both feed the trust/research spine. The board UI shows them in two rails (Home / Here) so
the player always sees both scales of goal (pillar §3.7).

---

## 12. Combat — carried forward, deepened by world

Combat is the current system, unchanged in its fundamentals and reused wholesale: 20-tps
integer sim, MMO-style bar, GCD + queue, casts/cooldowns/interrupts/heals, discrete pack
encounters, looting phase, the six kits with their resources and auto-brains, and the
data-driven FX layer. The **"Orrery" combat UI** (the current uncommitted redesign) is the
presentation.

What the redesign *adds* to combat is **per-world depth**, per pillars §3 and the owner's
"master encounters, not rotations" value:

- **Per-world bestiaries and mechanics.** Each world ships enemy families with mechanics
  that interact with *that world's* kit and frame. Necrologue enemies that punish a large
  Ledger; Green-Rite enemies that spread rot faster than your briar grows; Legion drills
  that demand interrupt discipline. Enemy mechanics are already a tagged union the engine
  interprets — new mechanics are data.
- **Research-target enemies.** The Field Analyzer marks specific foes as Codex objectives,
  so some fights are *studies*: "let this caster complete its channel once, survive it, and
  record it" — a deliberate inversion of "interrupt everything" that teaches the mechanic.
- **Frame-flavored encounters.** Deployment battles (Conscript), crackdown ambushes
  (Initiate Heat), formal duels (Retainer). Same engine, different *situations*.

No change to the combat *contract* — the balance envelope and per-ability timing tests all
still apply per Expedition.

---

## 13. The four progression ladders

The redesign has four progression ladders. Keeping them distinct (and each with a clear
sink) is what prevents the "everything is one number" flatness.

| Ladder | Scope | Earned by | Spent on | Reuses today |
|---|---|---|---|---|
| **Persona power** | one world | XP, gold, loot | levels, gear, talents, spell ranks | ✅ entire current progression system |
| **Standing / Grace** | one world | quests, battles, frame acts | teaching (access to kit), areas, vendors, Codex permissions | ⟳ generalizes quest rewards + world boss records |
| **Codex / Insight** | one system (cross-world) | research observations in combat | Codex chapters, Insight upgrades, mastery unlocks | ✳ new; built on the event stream |
| **Recovery / Devices** | account | findings, Directives | grand-project tiers, Devices, Cells capacity, unlocking worlds | ✳ new; the home meta |

The health rule from §4 applies: **Persona power** is spent *inside* a world; **Standing**
gates that world's content; **Codex** feeds the account; **Recovery** unlocks more worlds.
Nothing loops back on itself, and no currency is orphaned.

---

## 14. Endgame A — one art, to the end (the depth path)

This is the playstyle the owner explicitly wants viable: **never leave your first world and
still have years of goals.** The world loop is built to keep paying out after the "story"
ends. A mature world offers:

1. **Mastery Codex (tiers IV+)** — §9.3. The renewable, execution-gated research spine.
   Always another objective demanding cleaner play.
2. **Faction Ascension** — a post-max Standing track: become a war-mage officer, the
   temple's high celebrant, the cabal's spellbroker. Ascension ranks grant world-unique
   cosmetics, vendors, and *reputation-gated* content (raids, elite Charges).
3. **Repeatable raids / world bosses** — the current **Rift Colossus** generalizes to a
   **per-world raid boss** with a persistent HP pool, now framed as a recurring threat the
   faction fields you against. Best-damage records (already in the build) become the world's
   ladder. This is also where the async-multiplayer idea slots in later (§19.4).
4. **Prestige — "Deepen the Study"** — a *voluntary* reset of the Persona (keep Codex,
   Devices, and a prestige currency; reset level/gear) that unlocks a harder difficulty
   band, exclusive Mastery chapters, and modifiers (roguelite-flavored runs within the
   world). This is the "numbers keep climbing" pressure valve for players who like it,
   *without* passive/idle accrual.
5. **Gear depth** — the crafting materials that are currently inert become a **crafting +
   enchanting** economy (a gold/Insight sink), fed by the existing per-tier material drops.
   This is the most shovel-ready endgame addition (materials already drop and stack).

A depth player's grand-project contribution comes from **Mastery findings** (§9.3), so they
still advance the account meta and the leaderboards without ever opening a second world.

---

## 15. Endgame B — all the arts (the breadth path & the grand project)

The account loop for the completionist and the meta-narrative climax.

- **The Recovery** is the Institute's master track: a visible, tiered project bar fed by
  **findings** from every world's Codex. Each system recovered to tier III is a major
  Recovery milestone; Mastery findings add bonus progress.
- **Recovery milestones unlock the unknown systems** (§6.3): redacted dossiers become
  playable worlds as you triangulate them. This is the breadth player's ladder — not "here
  are all the worlds," but "earn the next world."
- **Cross-system synthesis (capstone).** The narrative endgame: once enough systems are
  recovered, the Institute attempts to **reconstruct magic in the present**. The
  thematically loud reveal — **Horology (time-magic) resonates with the Threshold itself**
  — pays off here: recovering time-magic is what lets the Institute stop merely *observing*
  the past and start *bringing it home*. A capstone sequence (design TBD: a present-day
  "first casting" event, possibly a raid where recovered magic meets future tech) closes
  the grand project.
- **Prestige of the whole account** (long-term live-ops): "publish and begin again" — a
  New-Game+ for Researchers who complete the Recovery, with account-wide modifiers and
  seasonal boards. Out of scope for v-next; noted so the architecture doesn't foreclose it.

Breadth and depth **share the same fuel** (findings), so the two playstyles are never in
tension — they are two routes up the same mountain, and a player can mix them freely.

---

## 16. The two hubs — home and world

- **The Institute (home hub)** — the present-day meta-screen. Repurpose the existing
  **Hearth/"Sanctum"** view: it becomes your **lab / uplink chamber**. Here you: review
  the Codex library, watch the Recovery bar, take Directorate Directives, manage Devices
  and Cells, browse the world board (known + redacted), and **choose which Expedition to
  bring the uplink up on.** This is the account loop's home and the game's true main menu.
  The existing "floating glass plaques + WebGL starfield" Sanctum aesthetic is *perfect*
  for a future-tech observation chamber — keep it, reskin the plaques as instruments.
- **The world hub (per Expedition)** — the town/camp/den you return to between hunts: local
  vendors, teachers (Grace-gated), the Local Charges board, the faction standing panels,
  crafting. This is the world loop's home. Largely the current game's non-combat views,
  scoped to one Expedition.

Navigation: **the Institute is the frame; entering an Expedition is "bringing the uplink
up."** Leaving a world drops you back to the Institute (uplink down → that Persona
stasis-suspends; another can go live). This makes the meta/world boundary a *place*, not a
menu.

---

## 17. Economy & currencies

Keep the count small; every currency has exactly one home (§4 health rule):

| Currency | Scope | Source | Sink |
|---|---|---|---|
| **Gold** | per world | drops, Charges | world vendors, crafting, respec |
| **Materials** | per world tier | drops | crafting + enchanting (§14.5) |
| **Insight** | per system (Researcher) | Codex chapters, research targets | Codex/mastery upgrades within that system |
| **Findings** | account | completed Codex chapters (auto) | the Recovery / grand project (§15) |
| **Cells** | account | home resupply (transmitting findings, Directives) | powering Devices (§10) |

Deliberately **no premium/idle currency** and **no offline accrual** — active-only is a
pillar. If monetization is ever needed, it should be cosmetic (uplink console skins, Persona
appearances) and season passes over the grand project — never power, never time-skip.

---

## 18. Art & UX direction — lean all the way into diegesis

**Keep the dashboard. Escalate it.** The owner's own notes call "the dashboard is the
world" the strongest decision in the project; the fiction now *demands* it. Direction:

- **Every panel is instrumentation.** Health bars are vital-sign readouts; the ability bar
  is your intent-queue; the enemy formation is a threat-plot; damage numbers are
  telemetry spikes. Small diegetic chrome (scanlines, a faint uplink-latency shimmer, a
  "signal strength" motif) sells "you are watching, not standing there" without adding an
  art pipeline. Reduced-motion strips all of it, as today.
- **Per-world identity through the existing token system.** Each world relights the console
  in its own palette and weather (the current region-hue system already does this) — the
  Necrologue's necropolis reads cold and violet; the Green Rite reads loam and gold. A
  world is recognizable at a glance from the console's mood. Zero new art tech; new
  `tokens` values only.
- **The Institute as a future-tech reskin of the Sanctum.** The existing WebGL
  starfield/plaque scene becomes the uplink chamber. Diegetic split confirmed: **present =
  clean, cold, instrument-lit; past = warm, hued, alive** — the two hubs *feel* like two
  eras because the console's palette says so.
- **The combat FX layer is untouched.** Effects-as-data (`fx/spells.ts`) already scales to
  new spells at ~24 lines each. New worlds' signature spells are new rows.

The redesign adds **no new rendering technology and no art pipeline.** It adds fiction,
tokens, and copy. That is the whole point and it is why this scope is achievable.

---

## 19. Architecture assessment — is the current stack the right template?

**Short answer: yes, emphatically, and it is the redesign's biggest asset.** The current
architecture is not just adequate for this vision — several of its decisions are what make
the vision cheap to build. Specifics, including where I'd push back.

### 19.1 Keep, without reservation

- **The pure, deterministic, event-emitting engine.** This is the crown jewel. It is what
  lets the entire Research meta (§9) be built as *predicates over the existing event
  stream* rather than new gameplay code, and what lets a balance suite headlessly Monte-
  Carlo every world. The `purity.test.ts` guard should extend to `MetaSim`. **Do not
  compromise this for any feature.** (Matches the owner's one strong architectural
  conviction.)
- **Content-as-data.** Worlds, frames, factions, Codex chapters, Devices, enemy mechanics,
  and Directives are *all* expressible in the existing "typed objects + tagged unions the
  engine interprets" pattern. The redesign is, to a first approximation, **a lot more
  content and one thin meta-layer** — not an engine rewrite.
- **Events-out, not callbacks-in.** Applied recursively: `MetaSim` consumes a filtered
  `GameSim` event stream; combat never reaches up. Same law, one level higher (§5.3).
- **The three-layer boundary + tests-as-contract.** Extends naturally; each new system
  ships with its predicate tests. The executor workflow (PLAN.md, tests as acceptance) is
  well-suited to authoring content packs against a stable engine.
- **Svelte 5 + Pixi + the FX-as-data layer.** No reason to change. The presentation
  investment (Orrery, Sanctum, tokens, FX) is directly reusable and on-theme.

### 19.2 The one real structural change

- **Introduce the account/meta layer (`MetaSim` + account save envelope).** This is the
  only architecturally significant new thing, and it is small and additive (§5). `GameSim`
  is untouched. The 3-slot save generalizes to an N-expedition roster via the same trick
  already used for slot 1.

### 19.3 Watch-outs (where I'd push back on myself)

- **Content volume is the real risk, not tech.** Six *fully-realized worlds* (bestiary +
  frame + factions + Codex + endgame each) is a large content bill. **Do not build breadth
  before the meta-loop is proven fun.** Build **one world end-to-end** as a vertical slice
  (§20), validate that trust→teaching→research→findings→home is compelling, *then*
  templatize. The kits already exist; it's the *wrapper* content that must be proven once.
- **Don't let four ladders become soup.** The §4/§13 discipline (one sink per currency) is
  load-bearing. Resist adding a fifth currency.
- **The Research meta must reward *mastery*, not grind.** If Codex objectives collapse into
  "do X 500 times," we've rebuilt an idle game with extra steps. Objectives should demand
  *execution and situations* (interrupt this, survive that, land this at the right moment),
  per pillars §3.6. This is the single most important tuning target in the whole design.
- **Scope the ethics/betrayal dimension carefully.** It is powerful (§2.4, §8) but easy to
  overreach into mandatory guilt. Ship it as *optional narrative content* first; measure
  whether players want more.

### 19.4 The multiplayer door (keep it open, don't walk through it yet)

The owner's `Mythreach_Thoughts.md` multiplayer vision (async world bosses, hiring offline
Personas, guild projects) is *unusually well-matched* to this redesign, because the fiction
already has the hooks: **the uplink relay** is a natural home for "another Researcher's
stasis'd Persona assists your fight," and **the grand project** is a natural home for
guild-scale shared Recovery. The pure engine + deterministic replay makes async/server-
authoritative play tractable later. **Recommendation:** design v-next single-player, but (a)
keep the account/`MetaSim` boundary clean enough that a server can own it, and (b) keep the
world boss's persistent-pool pattern, since it's the seed of async co-op. Do not build any
of it yet.

---

## 20. Build plan — vertical slice first

The executor-friendly path. Each milestone is testable and reuses the maximum existing
code. **Milestones M1–M4 must not touch `GameSim`'s combat rules.**

- **M0 — Account & meta scaffolding.** `AccountSave` envelope, `MetaSim` skeleton, migrate
  the existing v5 save into "Expedition 1." Institute hub = reskinned Sanctum with an
  Expedition picker. *Acceptance:* existing game boots unchanged as one Expedition; new
  save round-trips; purity guard covers `MetaSim`.
- **M1 — One world, wrapped.** Take the Arcanist kit → the **Ember Legion / Conscript**
  world: reflavor regions/enemies/quests, add the Legion faction, wire **Standing → Grace →
  teaching** (spells unlock by Grace, not raw level). *Acceptance:* a new Persona learns the
  kit through trust; balance envelope still green.
- **M2 — The Codex loop.** Codex chapters as event predicates; the Field Analyzer Device
  (research targets); Insight currency; findings → a stub Recovery bar. *Acceptance:*
  playing combat completes research; findings transmit home; predicate tests per chapter.
- **M3 — Devices, Cells, and the two-giver board.** Ration Synth + Automation Module (=
  reframed auto-battle) + Anchor Beacon; Cells resupply on transmit; Directives vs Charges
  board. *Acceptance:* the world↔home pull loop closes (low Cells → transmit → resupply).
- **M4 — One world's endgame.** Faction Ascension, the world raid boss (generalize Rift
  Colossus), Mastery Codex tier IV, crafting/enchanting over existing materials.
  *Acceptance:* a maxed Persona has renewable goals without a second world.
- **M5 — Second world = the template test.** Add the **Green Rite / Supplicant** world
  (different frame mechanic: Devotion, non-combat trust). This is the real test of whether
  worlds are cheap. *Acceptance:* the second world reuses the frame/faction/Codex systems
  as data with no new engine work.
- **M6+ — Breadth & unknowns.** Remaining known systems; the redacted-dossier unlock spine;
  the grand-project capstone; (later) social/async per §19.4.

**Ship M0–M4 as the first playable of the redesign — one deep world with the full meta-loop
— before building any second world.** That is the cheapest way to learn whether the whole
premise is fun.

---

## 21. Open questions & risks

1. **Terminology.** Placeholder names throughout (Institute, Threshold, Fieldworker,
   Persona, Expedition, Codex, Grace, Insight, Findings, Cells, Recovery). Lock a glossary
   early (§22) — the fiction leans on these terms being crisp.
2. **How much does the frame diverge?** Risk that frames feel like reskins. Mitigation: one
   *genuinely different* frame mechanic each (Heat, Devotion), and non-combat trust for at
   least one frame so it isn't all killing.
3. **The betrayal/extraction theme — how far?** Optional narrative (§2.4/§8) or a real
   systemic choice with faction consequences? Recommend: optional first, measure demand.
4. **Grace vs level for teaching.** Decoupling *access* (Grace) from *power* (level) is
   elegant but needs tuning so neither becomes a hard wall that blocks the other. Prototype
   in M1.
5. **Does one-world endgame *really* hold for years without idle accrual?** The honest
   risk. Mastery Codex + Ascension + raids + prestige is the bet; M4 must validate the
   depth player has "one more objective" reliably. If not, breadth becomes de-facto
   mandatory — acceptable, but know it.
6. **Present-day gameplay depth.** Is the Institute purely a meta-menu, or does the present
   eventually get its own light gameplay (the capstone "first casting," §15)? Kept minimal
   for v-next.
7. **Monetization / live-ops** (if ever): cosmetic + seasonal grand-project only; never
   power or time-skip (§17). Flag now so the economy isn't designed into a corner.

---

## 22. Appendix

### 22.1 Glossary (lock these early)

| Term | Meaning |
|---|---|
| **The Institute** | Your home organization; the meta-hub. (alt: Directorate of Recovered Arts) |
| **The Threshold** | Consciousness-projection time tech; how you reach the past. |
| **Uplink** | Your live connection to a Persona; up = present, down = stasis. |
| **Fieldworker / Researcher** | The present-day you; one per account. |
| **Persona** | A leveled character in one past world; ≈ today's per-slot save. |
| **Expedition** | One World the Researcher is working; holds one Persona. |
| **World** | A magic system + entry frame + setting + endgame. |
| **Entry frame** | How you're inserted & taught (Conscript / Supplicant / Initiate / Retainer). |
| **Standing** | Per-faction reputation. |
| **Grace / Research Access** | World-level trust; gates *teaching* and Codex permissions. |
| **Codex** | Per-system research tree; completing it = recovering the art. |
| **Insight** | System-local meta-currency from research. |
| **Findings** | Account currency: completed research transmitted home. |
| **Devices / Cells** | Cross-world future-tech gadgets and their scarce power source. |
| **The Recovery** | The account-level grand project fed by findings. |

### 22.2 Old → new mapping (nothing is wasted)

| Current build | Becomes |
|---|---|
| The six callings (kits, resources, talents, auto-brains) | The six launch **magic systems** — reused as-is |
| Character creation (calling/origin/sign) | **System + world + entry-frame** selection |
| 3 save slots | **N Expeditions** under one Researcher |
| Per-slot engine save (v5) | Per-**Expedition** save inside the account envelope |
| Regions | Regions **within** a world |
| Traveler quests (multi-giver) | **Local Charges** (+ new **Directorate Directives**) |
| Level-gated spell unlocks | **Grace-gated teaching** (level still governs power) |
| Rift Colossus world boss (persistent pool) | Per-world **raid boss** + seed of async co-op |
| Inert crafting materials | **Crafting + enchanting** endgame sink |
| Hearth / Sanctum home view | **The Institute** (present-day meta-hub) |
| Auto-battle | **Field Automation Module** (a Device) |
| Enemy exact-timer readouts / intents | **Chronometer / Field Analyzer** telemetry (diegetic) |
| Dashboard aesthetic | **The uplink console** — now canon (§18) |
| `loop.ts` discards backgrounded time | **Uplink-down stasis** — now canon (§2.2) |
| `GameSim` (pure, per character) | **`GameSim` per Expedition**, unchanged |
| — | **`MetaSim`** (new, thin, pure) — the account layer |

---

*End of draft. The cheapest way to de-risk this whole document is §20's M0–M4: one world,
wrapped, with the full trust→research→findings→home loop, before a second world exists.*
