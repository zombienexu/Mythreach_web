# Mythreach — Game Design Document

> **Status:** captures the game as it exists in the working tree on 2026-07-18 — including
> the uncommitted "Orrery" combat UI redesign, which is the current combat presentation.
> This document is written to stand alone: it assumes no access to the repository. Every
> number in it was read from the code, not from older docs (where the two disagreed, the
> code won; the discrepancies are called out in §21). "Current state" and "future/dreams"
> are kept strictly separate.

Mythreach is a **single-player, browser-only, active-play dashboard RPG** built in
TypeScript and Svelte 5 on a pure, deterministic simulation engine. One sentence: **the
dashboard RPG where combat is real and your time is your own.**

---

## 1. High concept

You run a hero's whole life from an "arcane observatory" command dashboard — but when a
fight happens, you take the controls yourself and outplay the encounter with an MMO-style
kit: cast times, cooldowns, a global cooldown with spell queueing, interrupts, resource
mechanics, and healing decisions under pressure. The player is both an *operator*
(efficient, organized, always progressing) and a *raider* (executing a rotation, clutching
a heal at 10% HP).

The game is **active-only**. There is no offline progression, no fast-forward, no passive
accrual of any kind. Close the tab and nothing happens; the world simply waits. This is a
deliberate, hard-won inversion of the game's original idle-game framing (see §3 and §4).

The current build is a complete game: a title screen with three save slots and a
character-creation ceremony; **six fully playable classes** ("callings"), each with its own
kit, resource mechanic, talents, and auto-battle brain; five free-choice hunting regions;
35 enemies fought as discrete pack encounters; XP and levels 1–15; generated loot in four
rarities; crafting materials (inert, foundation only); fifteen traveler quests; a
persistent world boss; achievements; a data-driven combat-FX layer; a synthesized
soundtrack of zero audio assets; a home-base "Hearth" view; and local saves.

## 2. Design pillars

1. **The dashboard is the world.** No 3D environments, no sprites, no art pipeline.
   Glass panes, arcs, engraved line art and floating numbers carry the entire fight — an
   aesthetic commitment that keeps information density high, keeps development focused on
   systems, and runs anywhere. (The owner's notes call this "the strongest design
   decision — not the combat.")
2. **But the arena is a stage, not a spreadsheet.** Spells are *thrown* across the field.
   They gather in your hand, cross the gap, and detonate; fire clings to what it burns.
   Austere by design, violent on purpose.
3. **Hands-on combat is the differentiator.** Active play (rotations, cooldown usage,
   interrupt timing, target swaps) meaningfully beats passive play without being
   mandatory: auto-battle runs a sensible per-class priority, but it doesn't burst bosses
   like you do.
4. **Respect absence — don't simulate it.** No away-from-game catch-up. The render loop
   *discards* a backgrounded tab's time gap rather than replaying it. Auto-battle is an
   active-session assist (tab open, you present), and you heal quickly between fights so
   there's nothing to wait for.
5. **Numbers you can feel.** A damage number's *size is its value* (absolute damage, not
   share of target HP — see §22). A burn tick is a small violet 11; a Pyroblast crit is an
   enormous stroked number that overshoots, snaps back, and hangs in the air while the
   figure it hit is still reeling.
6. **Master encounters, not rotations.** The long-term skill target is enemy design:
   interesting decisions should come from enemy mechanics, unpredictable situations,
   choosing the right ability for the encounter, and adapting rather than repeating a
   solved rotation.

## 3. Design philosophy, goals, and dreams

The owner's design-philosophy notes (`Mythreach_Thoughts.md`) are the north star. Their
key positions, all of which shaped the current build:

- **Original identity:** "Idle when you're away. An RPG when you're here" — "What if
  Melvor Idle had genuinely engaging MMO-style combat?" The *combat* half of that identity
  survived intact; the *idle* half was deliberately killed during development (§4). The
  current framing is "an RPG you actually play — and your absence is simply respected."
- **The dashboard-as-world bet:** embracing information-dense UI as the aesthetic avoids
  years of environment art, animation systems, and pathfinding, and naturally supports
  web / desktop / eventually mobile.
- **The retention thesis:** long-term retention will depend on *enemy* design, not player
  abilities. The player shouldn't master a rotation — they should master increasingly
  interesting encounters.
- **Active play earns unique rewards:** rare loot, achievements, bosses, and special
  resources should come from active participation, not just bigger numbers.
- **Engine purity as an article of faith:** "Keep the game engine completely pure. It
  should know nothing about browsers, Svelte, rendering, animations, sounds, networking…
  If every rule of the game can be executed from a command-line program without rendering
  anything, the architecture is healthy." This is enforced by tests (§20).
- **The multiplayer dream (explicitly *not* built, but scaffolded):** not a traditional
  MMO. The vision evolves gradually — accounts, leaderboards, friends, chat, guilds,
  marketplace — and then two signature ideas:
  - **Asynchronous shared world bosses:** a guild boss with enormous health; every player
    contributes whenever they have time; the next player continues where you left off.
    The single-player **Rift Colossus** (§13) is the local scaffold of exactly this: a
    persistent HP pool the save carries, "the one field a server would someday own."
  - **Hiring offline characters:** when a player logs off, others can recruit their hero
    (gear/talents/build driving an AI-controlled performance); you return to find your
    hero earned gold and helped people. The single-player **companion** (§14) and the
    **records** structure are the local scaffolds.
  - Further out: guild progression (research, mines, castles, cooperative projects) and
    persistent world events (a weekly dragon attack the whole player base answers).
- **Final aspiration:** "a persistent online systems game where optimization, progression,
  social interaction, and meaningful combat all reinforce each other" — carving a niche
  that is neither another MMO nor another idle game.

## 4. Design history — the arc that explains the game

The game's shape is the result of several sharp reversals. These are settled decisions;
they should be presented as history, not as open options.

1. **Godot prototype → web pivot (2026-07-12).** A Godot v0 prototype (one golem, three
   abilities) was rebuilt in TypeScript/Svelte 5 ("the genre's native stack"), with
   behavior parity proven by a ported test contract and presentation quality as a
   first-class requirement. The stack was frozen: Vite, TS strict, Svelte 5 runes, vanilla
   modern CSS (oklch, color-mix, no Tailwind/Bootstrap), Vitest, Playwright.
2. **v1 "The Sundered Reaches" (2026-07-13).** Expanded on request into a full
   WoW-flavored single-player game: 5 boss-gated zones, 25 enemies, 7 abilities with
   mana/GCD/queue/crits/interrupts, XP 1–15, loot/talents/achievements, auto-battle,
   localStorage saves — and **8-hour offline fast-forward** (later killed).
3. **The Wayfarer build (planned 2026-07-14).** The owner decided to **delete all
   idle/offline mechanics** (fast-forward, offline modal, `savedAt`) — absence must not
   progress the game — and replace endless spawning with **expeditions**: a generated
   9-node trail per zone (battle/elite/cache/shrine/rest → boss) with travel phases and
   fog-of-war. Also added the multiplayer scaffolds (world boss, records, companion) and
   enforced engine purity via a test.
4. **The Regions build (2026-07-14) — expeditions deleted.** The owner reversed the
   expedition direction days after building it. Trails, nodes, shrines and blessings were
   removed; combat became **endless fights in free-choice difficulty regions**, no gates
   anywhere. The combat log was also removed (replaced by front/back formation ranks). The
   trail system's lesson stuck: *structure* between fights was friction, not content.
5. **Fights & Quests (2026-07-15).** Endless auto-spawning was replaced by **discrete,
   player-started fights** ending in a loot screen (per-corpse `LootBundle`s), the three
   merged regions un-merged back into five, and a quest board arrived. This is the loop
   the game still runs on.
6. **"The Long Hunt" (2026-07-16) — designed, built in-session, and lost.** A full
   redesign answering the owner's philosophy notes directly: (1) **the Wager** — every
   loot screen offered Bank (`R`) vs. Let-it-ride (`F`), the pile riding on the field
   while enemies gained +12% HP / +10% damage per stake and loot got richer (rarity
   floors at stakes 2/4/6, gold ×(1+0.25·stake)); death or flight burned the pile;
   (2) three new enemy-mechanic kinds — **mend** (interruptible pack-heal), **deathburst**,
   **summon**; (3) **bounties** — the five dead zone bosses reborn as region hunts
   (8-kill trail → solo boss fight); (4) **eight glyphs** — bounty trophies that each
   rewrote one ability. The session reported it shipped (191 tests green), but the files
   **never landed on disk** — the next session found the working tree at the prior
   state, and the systems were never rebuilt. **None of this exists in the current game.**
   Only fossils remain: five `boss-*` achievements and one `expeditions-10` achievement
   sit in the catalog with no way to earn them (§15). The ideas remain the strongest
   candidates for the next systems build (§23).
7. **The Observatory Lens art pass (2026-07-16).** Whole-app thesis: *"the observatory
   turns its lens"* — everything relights in the current region's hue (§17).
8. **The Front Door (2026-07-16).** Title screen, three save slots, settings, and the
   character-creation ceremony. Six classes were *designed* here; only the Arcanist was
   playable, the rest "sealed framework" with full lore previews.
9. **The Six Callings (2026-07-17).** All six classes made fully playable — kits,
   resource mechanics, talents-as-data, mechanical origins and birth signs, save v5,
   per-class auto-battle, per-class balance smoke tests.
10. **The Hearth (2026-07-17) — five iterations to an art-direction law.** A home-base
    tab that took five full redesigns to land, producing the game's now-permanent art
    rule (§17): v1 was a literal illustrated SVG room — rejected as "too cartoonish";
    v2 a bento of engraved glass panes — liked; v3 a full three.js room diorama —
    rejected ("the dashboard is 3d, not a 3d view of the room"); v4 low-poly instruments
    in panes — rejected ("no low poly artwork… the aesthetic of the dashboard should not
    change"); **v5 "the Sanctum" (kept)**: an open platform at the tower top rendered as
    CSS-3D floating glass plaques over a WebGL layer that draws *only points and lines*
    (§19).
11. **The Orrery (2026-07-18, current working tree).** Combat de-carded entirely: the
    action bar and enemy/player cards replaced by a rotating astrolabe ability wheel with
    a contextual heart, free-standing enemy figures, and a hero HUD orb (§18).

**Decisions tried and deliberately reverted (do not re-derive):**

- **Idle/offline progression: deleted.** Absence must not progress the game. This is
  structural (the frame loop clamps catch-up to 250 ms ≈ 5 ticks), not a toggle.
- **Expeditions/trails: built, then replaced** by endless discrete fights in free-choice
  regions.
- **Boss-gated zones: removed.** Regions are never gated; level bands are advisory.
- **Sizing damage numbers by share of target max HP: tried, reverted.** It draws a
  *timid* number on a boss, because bosses have more health — exactly backwards. Absolute
  damage is correct (`BIG_HIT = 180` is the cap reference).
- **Scaling crit light further up: tried, reverted.** Light is additive; doubling it
  reads as a white disc hiding the fight, not "twice as big." The *number* is where a
  crit shouts; the particle multiplier is deliberately tamer than the text multiplier.
- **Real audio samples: rejected** in favour of upgrading the synth — zero asset bytes,
  no licensing surface. Revisit only for a composed soundtrack.
- **The hard byte budget: retired** (owner's call, 2026-07-13) — richer effects are
  worth the bytes; but heavy deps (Pixi, GSAP, three) stay *dynamically imported*
  because that's about **time to first fight**, not size.
- **Cartoon/filled illustration and representational 3D geometry: permanently
  off-brand** (the Hearth arc's verdict — §17).

## 5. The core loop and session flow

**The macro loop:** lull → fight → loot → (spend/organize) → repeat, in whichever region
you choose, punctuated by quests, talent spends, gear upgrades, world-boss assaults, and
region hops. There is deliberately *no* structure between fights — no travel time, no
countdown, no gate. The click is the countdown.

A session, concretely:

1. **Title screen** → pick a save slot (or create a character) → the game opens on the
   **Combat** view in your last region, field empty, phase `idle`.
2. **The lull.** Only the region's intro line hangs in the air ("Torchlight ends here.
   Everything below is teeth."). The heart of the ability wheel is a summoning sigil:
   press **Space** or click **Start fight**.
3. **The fight** (phase `combat`). A pack of 1–3 enemies spawns instantly — a lone brute,
   a pair, or a vanguard of minions screening a caster in the back row. You play your
   kit; enemies swing, hardcast, enrage, poison. Kills pay XP *instantly* (mid-fight
   level-ups happen and fully restore you).
4. **The loot screen** (phase `looting`). When the last enemy falls, corpses stay on the
   field holding their spoils (gold / maybe an item / maybe materials). Collect per
   corpse, or sweep everything with **R** / Space. Clearing a pack also instantly mends
   25% of your health, and idle/looting regeneration (~8% max HP per second) tops you up,
   so there is no downtime to wait through.
5. **Repeat**, or: visit the Character screen (equip/sell — the sim never pauses while
   you shop), spend talent points, accept/turn in quests, travel to another region
   (pending loot auto-banks on the way out; loot is *never* destroyed by a transition),
   assault the world boss, or idle at the Hearth.
6. **Auto-battle** (toggle **A**) plays this whole loop: sweeps the loot screen, takes a
   1-second breather (`AUTO_REST_TICKS = 20`), starts the next fight, heals between
   fights when below 60% HP, and runs the class rotation — including off-GCD interrupts.
7. **Death** costs a 5-second respawn (100 ticks; reduced by the Serpent sign, floor 1 s)
   and ends the fight — but anything already slain still pays out (loot auto-banks).

Pacing target (enforced by the balance test suite, §9): a "smart player" auto-run reaches
the level cap in **0.5–6 hours** (observed ≈1 hour) with fewer than 40 deaths, and level
5 arrives inside 20 minutes with at most a handful of deaths.

## 6. The combat system in full

### 6.1 Time: an integer-tick simulation

The engine runs at **20 ticks per second** (one tick = 50 ms). Every duration in the game
is an exact integer tick count — there are no floats and no wall-clock time inside the
simulation, which makes every rule exactly testable ("damage lands on tick 44 and not on
43" is an assertion). Milliseconds exist only at the UI edge (the rAF loop and profile
timestamps). Key constants:

| Constant | Value | Meaning |
|---|---|---|
| `TICKS_PER_SECOND` | 20 | one tick = 50 ms |
| `GCD_TICKS` | 24 (1.2 s) | global cooldown — deliberately snappier than the classic 1.5 s |
| `PLAYER_RESPAWN_TICKS` | 100 (5 s) | death timer (sign-reducible, floor 20 ticks) |
| `REGEN_INTERVAL_TICKS` | 20 (1 s) | mana regen / out-of-combat heal clock |
| `AUTO_REST_TICKS` | 20 (1 s) | auto-battle's breather between fights |
| `LEVEL_CAP` | 15 | |
| `INVENTORY_CAP` | 24 | overflow items auto-sell |
| `RESPEC_COST` | 50 gold | |
| `MAX_ACTIVE_QUESTS` | 3 | |

### 6.2 The global cooldown, casting, and the queue

- Every ability triggers the **1.2 s GCD** except off-GCD abilities (Arcanist's
  Counterspell, Hourwarden's Stasis), which ignore *and* don't trigger it, and fire
  immediately even mid-cast.
- One cast at a time. Pressing an ability during a cast or GCD **queues** it (replacing
  any previously queued ability); the queue fires on the exact tick both the cast and GCD
  clear, and silently drops if it stops being valid (its target died and nothing remains,
  or you died).
- **Mana is spent at cast *resolve***, not cast start; instants spend immediately.
- **Cooldowns always start at resolve** — including fizzles.
- A cast whose target died mid-flight **retargets** the auto-picked next enemy; it only
  **fizzles** (no effect, mana refunded because it was never spent) when the whole field
  is empty. Field-clearing transitions (travel, assault) fizzle an in-flight offensive
  cast and clear an offensive queued ability.
- Talent cast-time cuts are data (`castTickCut` per ability in the derived stats);
  reduced casts floor at 1 tick.
- The Riftblade's Fleet-Footed talent is **the only GCD reduction in the game**
  (24 → floor 20 ticks, i.e. 1.2 s → 1.0 s), a deliberate monopoly: tempo *is* that
  class's fantasy, so only that class gets to buy tempo.

### 6.3 Damage, crits, healing, shields

- **Spell roll:** uniform integer in `[min, max]`, then ×(100 + power)% — power is +1%
  damage per point — then ×(100 + school bonus)% from talents/buffs (each calling casts
  in its own school: fire/arcane/holy for Arcanist pieces, shadow, temporal, fortune,
  nature, rift).
- **Crits multiply by 7/4 (175%).** Base crit chance is 5%, plus gear, talents (+2%/rank
  lanes), the Moth sign (+3%), Combustion (+20% for fire while active), and House Rules
  (+10% while active). Heals can crit too (same 175%).
- **DoTs never crit** and **snapshot** power (and fire's Combustion bonus) at apply time;
  their ticks land on a fixed interval (typically every 20 ticks). One DoT slot per
  enemy (`bane`) and one venom slot on the player — reapplying replaces the instance.
- **Heal roll:** uniform ×`healMultPct` (= 100 + 2×spirit + healing talents)%.
- **Shields** absorb before HP; damage events carry the `absorbed` amount separately (the
  UI shows shield-blue absorb floats). Shields expire on time (usually 600 ticks = 30 s)
  or when consumed ("shield broken" event). The Thornspeaker's Bramble Ward additionally
  bites melee/cast attackers for thorns damage each time it absorbs.
- **Buffs** are timed ticks on the player: Combustion (+25% fire, +20% fire crit, 240
  ticks), Split Second, House Rules, Wildswell, Seamstep, Doorway. House Rules
  additionally makes **every damage and heal roll its maximum** while active.

### 6.4 Mana and recovery

- Max mana = 80 + 20×level. Regen ticks every second:
  `floor((8 + level + spirit) / 2)` mana, ×(100 + regen talents/origin)%.
- **Between fights** (phase `idle` or `looting`) the same clock also heals ~8% of max HP
  per second — "you catch your breath; there is no such mercy mid-fight."
- Clearing a pack instantly heals 25% of max HP.
- Level-ups fully restore HP and mana.

### 6.5 Enemies: swings, hardcasts, interrupts, enrage, venom, freeze

Enemy *mechanics* are a tagged union the engine interprets — a new monster is data, not
logic. Three kinds exist today:

- **Swing (baseline, all enemies).** A melee hit every `swingTicks` for `dmgMin–dmgMax`.
  Enemy timers count the spawn tick, so the first swing lands one tick earlier than
  naive (at `swingTicks − 1` after spawn) — a tested boundary.
- **Hardcast** (`castTicks`, `cooldownTicks`, damage range, a name like "Witchbolt").
  The enemy winds up a visible, interruptible cast; **swings pause while casting**. The
  first cast begins at roughly half the cooldown after spawn. Interrupting (Counterspell,
  Stasis) cancels the cast and restarts the **full** cooldown. Interrupts are the game's
  signature skill moment: Counterspell only reads *your target's* lips, so a caster
  hiding behind its whelps forces a target swap.
- **Enrage** (`hpPct`, `swingMult`, `dmgMult`). Once, the first time HP falls to the
  threshold: swings speed up (interval ×swingMult, floor 10 ticks) and hit harder
  (×dmgMult). Elite/boss standard is 30% HP → ×0.65 speed / ×1.4 damage. The portrait's
  eyes flare red.
- **Venom** (`everyTicks`, tick damage/interval/count). Periodically applies a DoT to the
  player (first application at half the timer). Player venom is cleared when you win the
  fight — nothing keeps gnawing you on the loot screen.
- **Frozen** (player-inflicted state, not an enemy mechanic): Stasis and Doorway Duel
  lift mobs out of time — no swings, no spells, a cast in flight simply holds. The
  player's DoTs still burn frozen mobs.
- Gravechill's rider: while its DoT runs, the victim swings 15% slower (stacks
  conceptually with enrage: an enraged, chilled thing swings through syrup).

### 6.6 Packs, rows, and targeting

- An **encounter** is a template of 1–3 slots with mobs plugged in: `solo(x)`,
  `pair(a, b)`, or `vanguard([front, front], back)`. Encounter tables are weighted per
  region; each `startFight()` also rolls a **12% chance** to use the region's elite
  table instead.
- **Rows are presentation + targeting order only**: the back-row mob renders raised
  centre; auto-retargeting prefers front-row mobs, so the screen falls before the thing
  it screens. Any mob can be hit at any time — click its figure or **Tab**-cycle.
  Design intent (from the content cookbook): "Targeting is where the fun lives… If a new
  encounter creates no decision, it's just a bigger health bar — cut it."
- When your target dies with packmates still up, targeting auto-advances (front row
  first). `setTarget(iid)` on click; `cycleTarget()` on Tab (wraps).
- Pack budgeting rule: a pack's summed XP should land near a solo mob of the same
  weight; two minions plus a back mob should together swing for roughly what one solo
  normal does (minions ≈ half the HP, 45% of the damage of the zone's cheapest normal).

### 6.7 Death and respawn

Player death: lifetime deaths increment, all combat state clears, respawn timer starts
(100 ticks, minus the Serpent sign's 40% cut, floor 20 ticks). The fight is lost — the
field clears — but everything already slain auto-banks its loot first. During an assault,
death banks your world-boss damage instead (§13). Respawn restores full HP/mana; you
return to `idle`, ready to click again.

### 6.8 Auto-battle

`autoBattle` is a sim-level flag (persisted in the save; toggled with **A**). Each tick,
after the world acts, the auto-player:

1. If dead, waits. If looting, sweeps all loot. If idle: heals up when below 60% HP
   (Renew / Last Rites / Rewind Wound, whichever the class owns), then starts the next
   fight once the 1 s breather elapses.
2. In combat, off-GCD reactions fire even mid-cast: if any mob is hardcasting, it targets
   the caster and Counterspells / Stasises it.
3. **Focus fire:** with multiple living mobs (and no Doorway duel in progress) it
   retargets the weakest by current HP.
4. Then runs its class rotation (priority list, first usable wins — each list is the
   executable statement of the kit's intended priority; see §7 per class).

Design stance: auto-battle exists so the operator fantasy works and so the balance suite
can Monte-Carlo the whole game, but it is deliberately not optimal — it doesn't burst
bosses like a human, and forgetting to add a new ability to a rotation is "a decision,
not a bug" (the ability simply never gets auto-used).

### 6.9 Allies on the field

Two kinds of friendly actors can fight beside you, both swinging at *your current
target* on their own clocks, both untargetable and indestructible:

- **The echo** (class mechanic): the Gravewright's Exhume raises the last thing you
  killed (80% of its own damage, swing every 32 ticks, 12 s); the Riftblade's Afterimage
  is a mirror (6 + 2×level ±2 damage, swing every 28 ticks, 10 s). One echo slot —
  raising a new one replaces the old.
- **The companion** (hireling scaffold, §14): swings every 26 ticks for
  3 + 1×level (±2), never crits, works in every combat including assaults, idles the
  moment there's nothing to hit.

Their damage flows through the normal damage pipeline, so kills, loot, XP, and quest
progress all fall out for free.

## 7. The six callings (classes)

Every hero swears one of six **callings** at creation. A calling is a fixed **kit** of
abilities (unlocking across levels 1–11), a fixed **talent tree** (six talents), and a
**resource mechanic** that gives the class its texture. The class is sealed into the save;
there is no re-classing. Each kit is built for a different *kind* of player, and the
auto-battle "brain" for each is the executable statement of that kit's intended priority.

Kits share a spine so they stay comparable: a free, spammable primary (no cooldown); a
short-cooldown secondary (usually a DoT or utility); a self-heal by level 2; a level-4
"payoff"; a level-6 tool that is usually an interrupt or crowd tool; a level-8 defensive
(shield or evade); and a level-11 capstone on a long cooldown. Hotkeys **1..n** map onto
the kit in this order, and the Orrery wheel seats them the same way.

Damage/heal ranges below are the raw `[min,max]` rolls before power/school scaling; "cast"
is the base cast time (talent cuts reduce it, floor 1 tick); "cd" is the cooldown.

### 7.1 Arcanist — "The Weave" (resourceless)

The classicist. No resource mechanic at all — the Arcanist runs on a clean rotation and
rewards good hands: keep Ignite ticking, land Pyroblast on cooldown, weave Fireballs
between, and answer enemy casts with Counterspell. It is the reference class the whole
game was balanced against, and the only one every design pass keeps fully tuned.

| # | Ability | Lvl | Mana | Cast | CD | School | Effect |
|---|---|---|---|---|---|---|---|
| 1 | Fireball | 1 | 14 | 2.2 s | — | fire | 16–24 damage. The workhorse. |
| 2 | Ignite | 1 | 12 | instant | 8 s | fire | DoT: 5 dmg every 1 s ×6 (30 over 6 s); refresh on reapply. |
| 3 | Renew | 2 | 16 | 1.8 s | 5 s | holy | Heal 20–28 (can crit). |
| 4 | Pyroblast | 4 | 30 | 3.5 s | 12 s | fire | 48–64 damage. The payoff. |
| 5 | Counterspell | 6 | 8 | instant | 15 s | arcane | **Off-GCD** interrupt — only while your *target* is casting. |
| 6 | Arcane Barrier | 8 | 24 | instant | 20 s | arcane | Shield 25 + 5×level, 30 s. |
| 7 | Combustion | 11 | 10 | instant | 30 s | fire | Buff 12 s: +25% fire damage, +20% fire crit. |

*Auto-rotation priority:* Renew < 60% HP → Counterspell a casting target → Combustion
(when the target is tough or above 60% HP) → Ignite (if not already burning) → Pyroblast
→ Fireball.

### 7.2 Gravewright — "The Ledger of the Dead" (ledger)

The collector. Every enemy you kill writes a **page** to your ledger (cap 3, +1 per rank
of Ink of the Fallen, max 5), and the last thing you killed is **buried** — remembered by
name and swing profile. Pages are a currency you spend: Last Rites tears one out to heal,
Exhume spends one to raise the buried corpse as a fighting echo, and Final Chapter slams
the book shut, spending *every* page at once for damage. The fantasy is momentum across
fights — you enter each pack already holding the last one's dead.

| # | Ability | Lvl | Mana | Cast | CD | School | Effect |
|---|---|---|---|---|---|---|---|
| 1 | Gravebolt | 1 | 14 | 2.0 s | — | shadow | 15–22 damage. |
| 2 | Gravechill | 1 | 12 | instant | 8 s | shadow | DoT 4×7 (28 over 7 s) **and** target swings 15% slower while it runs. |
| 3 | Last Rites | 2 | 10 | instant | 5 s | shadow | Spend 1 page → heal 24–32. |
| 4 | Exhume | 4 | 18 | instant | 12 s | shadow | Spend 1 page → raise the buried corpse (its own swing, every 1.6 s) for 12 s. |
| 5 | Requiem | 6 | 24 | 1.5 s | 10 s | shadow | AoE 16–24 to every enemy. |
| 6 | Boneward | 8 | 22 | instant | 20 s | shadow | Shield 22 + 5×level, 30 s. |
| 7 | Final Chapter | 11 | 20 | instant | 30 s | shadow | Consume all pages → 26–36 damage **per page** spent. |

The **echo** (see §6.9) inherits the buried mob's damage, so burying a hard-hitting elite
and exhuming it is a real spike. Bound Echoes (+15%/rank) is the payoff talent.

### 7.3 Hourwarden — "Sand Debt" (debt)

The deadline gambler. Every ability is an **instant** (there are no cast times in the kit
at all), but the good ones are *borrowed*: each adds **sand debt** (a 0–100 meter). Every
**16 seconds** in combat the **Reckoning** comes due and collects **80% of your current
debt as damage to yourself**, then resets the meter. Surviving to the bell with low debt
means the borrowing was nearly free; overspending before it means the Reckoning can gut
you. Hourglass Shatter is the escape valve — it dumps your whole debt onto an enemy as
bonus damage and zeroes your meter. Fight-end forgives all debt (it is a combat debt).

| # | Ability | Lvl | Mana | Cast | CD | School | Debt | Effect |
|---|---|---|---|---|---|---|---|---|
| 1 | Secondhand Strike | 1 | 12 | instant | — | temporal | +8 | 12–17 damage (twice under Split Second). |
| 2 | Rewind Wound | 2 | 14 | instant | 8 s | temporal | +10 | Heal 70% of the last blow that hit you. |
| 3 | Split Second | 4 | 16 | instant | 15 s | temporal | +12 | Buff 6 s: Secondhand Strike lands twice. |
| 4 | Stasis | 6 | 10 | instant | 15 s | temporal | +8 | **Off-GCD**: freeze target 3 s + interrupt its cast. |
| 5 | Borrowed Blade | 8 | 24 | instant | 12 s | temporal | +20 | 34–46 damage. |
| 6 | Hourglass Shatter | 11 | 20 | instant | 30 s | temporal | — | 18–26 damage **plus your entire debt** as damage; debt resets to 0. |

Reckoning damage is banked *before* effects resolve, so a killing blow still forgives the
debt. Fine Print reduces Reckoning collection (−8%/rank); Compound Interest boosts Shatter
conversion (+10%/rank).

### 7.4 Cartomancer — "The Living Deck" (hand)

The variance lover. Each fight you are dealt a **hand** of 3 cards (+1 per rank of Extra
Ace, max 5) from a weighted deck. **Deal Fate** plays the top card — which might be raw
damage, an AoE, a DoT, a heal, a shield, or a windfall of gold — and redraws a fresh hand
of three when your hand is empty. Cut the Deck throws a bad hand away for a new one; Fold
the World discards the whole hand at once for AoE scaling with cards folded; House Rules
makes **every roll its maximum** for 8 s; and the capstone, the Fifty-Third Card, draws a
card that is not in any deck — catastrophic damage, a full mend, or a jackpot, "never a
two." High ceiling, high floor-anxiety.

**The deck** (Deal Fate draws from these weights):

| Card | Weight | Effect |
|---|---|---|
| The Tower | 22 | 30–42 damage |
| Ace of Hearts | 18 | Heal 22–30 |
| Six of Knives | 16 | DoT 6×5 (30 over 5 s) |
| Nine of Coins | 16 | 12–24 gold |
| The Comet | 14 | AoE 12–16 to all |
| The Moon | 14 | Shield 18 + 4×level, 20 s |

| # | Ability | Lvl | Mana | Cast | CD | School | Effect |
|---|---|---|---|---|---|---|---|
| 1 | Cardflick | 1 | 13 | 1.8 s | — | fortune | 15–21 damage. |
| 2 | Deal Fate | 1 | 14 | instant | 6 s | fortune | Play the top card (or draw 3 if the hand is empty). |
| 3 | Cut the Deck | 2 | 8 | instant | 10 s | fortune | Discard the hand, draw a fresh one. |
| 4 | House Rules | 6 | 16 | instant | 25 s | fortune | Buff 8 s: every damage/heal rolls max, +10% crit. |
| 5 | Fold the World | 8 | 22 | instant | 20 s | fortune | Discard hand → 11–15 damage **per card** to all enemies. |
| 6 | The Fifty-Third Card | 11 | 26 | 2.5 s | 30 s | fortune | The card that edits the world (jackpot table). |

### 7.5 Thornspeaker — "Rootbound Garden" (growth)

The patient gardener. The signature is **Sow Briar**, a DoT that *grows every tick* (each
landed tick adds +1 to the next), so a briar left to mature turns "a scratch today into a
hedge of knives by the end." The class's power scales with fight *length* — long fights
are the growing season. Wildswell force-blooms everything you've planted (all DoTs tick
twice as fast for 10 s); Verdant Cataract detonates the briar for **150%** of everything it
still owed. Sapdraw is a damage-and-drain that heals for what it deals. The garden rewards
setup and punishes impatience.

| # | Ability | Lvl | Mana | Cast | CD | School | Effect |
|---|---|---|---|---|---|---|---|
| 1 | Thornlash | 1 | 13 | 1.8 s | — | nature | 14–20 damage. |
| 2 | Sow Briar | 1 | 14 | instant | 5 s | nature | Growing DoT: base 3/tick ×10, +1 growth per tick; replant restarts it. |
| 3 | Sapdraw | 2 | 16 | 2.0 s | 8 s | nature | 14–20 damage, healing you for the full amount dealt. |
| 4 | Bramble Ward | 6 | 22 | instant | 20 s | nature | Shield 18 + 5×level, 30 s; attackers take 6 + 1×level thorns. |
| 5 | Wildswell | 8 | 18 | instant | 30 s | nature | Buff 10 s: all your DoTs tick twice as fast. |
| 6 | Verdant Cataract | 11 | 24 | 1.5 s | 15 s | nature | Detonate the target's briar for 150% of its remaining owed damage. |

Deep Roots (+1 briar tick/rank, max 3) and Full Bloom (+10% Cataract/rank) deepen the
payoff; Sap Surge (+15% Sapdraw healing/rank) makes it a sustain class.

### 7.6 Riftblade — "Blink Tempo" (charge)

The tempo duelist. Fast instant strikes bank **rift charges** (Through-Cut and Seamstep
each +1; cap 5, +1 per rank of Widened Seam, max 7); **Phase Edge** then spends *every*
banked charge on one blow (13–17 damage per charge, needs at least 2). It is the only
class that can buy **tempo**: Fleet-Footed is the game's sole GCD reduction (24 → 20 ticks,
1.2 s → 1.0 s), a deliberate monopoly because tempo *is* this class's fantasy. Seamstep is
a 4-second evade (the next blow aimed at you misses); Afterimage leaves a second sword-arm
fighting beside you; Doorway Duel drags your target into the elsewhere — its packmates
frozen out for 8 s while it takes +25% from you.

| # | Ability | Lvl | Mana | Cast | CD | School | Charge | Effect |
|---|---|---|---|---|---|---|---|---|
| 1 | Through-Cut | 1 | 10 | instant | — | rift | +1 | 11–16 damage. |
| 2 | Seamstep | 2 | 12 | instant | 10 s | rift | +1 | Evade: next blow aimed at you misses (4 s). |
| 3 | Phase Edge | 4 | 16 | instant | 8 s | rift | spends all | 13–17 damage **per charge** (needs ≥2). |
| 4 | Afterimage | 6 | 20 | instant | 20 s | rift | — | Raise a mirror echo (swings ~1.4 s) for 10 s. |
| 5 | Rift Tear | 8 | 22 | 1.5 s | 12 s | rift | — | 26–36 to target + 50% splash to every other enemy. |
| 6 | Doorway Duel | 11 | 24 | instant | 30 s | rift | — | Freeze packmates 8 s; target takes +25% from you. |

## 8. Talents and respec

Talents are the horizontal growth layer. You earn **one talent point per level starting at
level 2** (so 14 points at the cap), and each of a class's six talents holds 2–5 ranks.
The whole system is **data**: a talent is a list of typed `TalentEffect`s
(`castTicks`, `school`, `crit`, `maxHp`, `regen`, `healing`, `gcd`, `gold`, or `mod` for a
class-specific dial), and `deriveStats()` folds every ranked effect into the single stat
block combat reads. Nothing in the sim ever asks "does the player have talent X?" — it
reads the derived number. Adding a talent is a content edit, not an engine change.

Talent shapes recur across classes so they stay legible and comparable:

- A **school-damage** lane (+8%/rank, 5 ranks) — every class has one for its school.
- A **crit** lane (+2%/rank, 5 ranks) on the classes that want to crit.
- A **max-HP** lane (+6%/rank, 5 ranks) — every class's survivability pick.
- A **mana-regen** lane (+12%/rank, 5 ranks) on the sustained casters.
- A **cast-time** lane (−0.1 s/rank on the primary) on the classes with cast times.
- Class-**signature** dials via `mod`: Ink of the Fallen (+1 ledger page), Bound Echoes
  (+15% echo), Extra Ace (+1 card), Crooked House (+1 s House Rules), Deep Roots (+1 briar
  tick), Widened Seam (+1 charge), Fine Print (−8% Reckoning), Compound Interest (+10%
  Shatter), Fleet-Footed (−0.05 s GCD, the tempo monopoly), and so on.

Every talent is refundable: **Respec** wipes all spent points for **50 gold**, returning
you to a blank tree. There is no per-point cost and no talent that gates another — the tree
is flat, so experimentation is cheap and encouraged.

## 9. Progression, leveling, and the balance envelope

- **XP curve:** the cost to go from level `L` to `L+1` is `60 + 40·L + 20·L²`. That is a
  gentle quadratic — 120 XP for level 2, rising to 4,560 for level 15. **Level cap is 15.**
- **XP is instant and mid-fight:** a kill pays its XP the moment it dies, so level-ups
  happen during combat and **fully restore HP and mana** on the spot (a clutch mid-pack
  level-up can save a fight).
- **Ability unlocks** are level-gated per kit: roughly levels 1, 1, 2, 4, 6, 8, 11. Not-yet
  -unlocked abilities are simply absent from the wheel (§18) — never shown as locked.
- **Core stats** derive as: **power** = 3·(level−1) + gear power (each point = +1% spell
  damage); **stamina/spirit/crit** come only from gear; **crit%** = 5 + gear crit + talent/
  sign bonuses. **Max HP** = round((80 + 20·level + 5·stamina)·(1 + hp%)); **max mana** =
  80 + 20·level. So leveling alone raises power, HP, and mana; gear supplies stamina,
  spirit, and crit; talents and identity supply the percentages.
- **Talent points:** 1 per level from level 2 (14 total at cap).

**The balance envelope** is a hard test contract, not a guideline. `balance.test.ts`
Monte-Carlos a full auto-battle run of the default (Arcanist) hero and asserts:

- Reaching the level cap takes **more than 0.5 h and less than 6 h** (observed ≈ 1 h).
- **Fewer than 40 deaths** across the whole climb to cap.
- **Level 5 arrives inside 20 minutes**, with **≤ 5 deaths** to that point.

Additionally, `classes.test.ts` runs a 20-minute level-1 auto-battle *smoke test for every
class* and asserts each reaches **≥ level 3**, gets **≥ 15 kills**, and dies **≤ 12 times** —
a guarantee that all six callings are viable from a cold start, not just the Arcanist. The
suite is seed-sensitive: because the sim is deterministic, reordering RNG calls changes the
stream and breaks these envelopes, which is exactly how the tests catch accidental
behavior drift.

## 10. Origins and birth signs

At creation, beyond name and calling, you choose one **origin** (where you came from — a
steady, run-long percentage lean) and one **birth sign** (a constellation — a moment that
intervenes). Both are purely mechanical and fold into the stat block via `deriveStats`.
"Origins lean; signs intervene. Neither is ever a cage: every build works under every sky."

**Origins** (one steady percentage each):

| Origin | Effect |
|---|---|
| Lamplit Scholar | +10% experience |
| Ashmarch Survivor | +8% maximum health |
| Guild Courier | +12% gold |
| Hedge-Witch's Ward | +15% mana regeneration |

**Birth signs** (a moment, not a stat):

| Sign | Effect |
|---|---|
| The Lantern | +6% item drops, +10% material finds |
| The Serpent | Return from death 40% sooner (respawn 5 s → 3 s, floor 1 s) |
| The Tower | Once per fight, a killing blow leaves you at 1 HP instead |
| The Moth | +3% critical strike chance |

The Tower's cheat-death is the most dramatic — it silently converts one lethal blow per
fight into a 1-HP survival and fires a "The Tower holds" toast. These choices are stored in
the save's sealed identity (and mirrored in the slot profile for pre-v5 saves).

## 11. The regions and the bestiary

The world is **five regions**, all selectable from the start — there are no gates, and
level bands are **advisory**, not enforced. Each region is a hue, an epithet, an intro
line, a weighted encounter table, an elite table, a boss (defined but currently
unreachable — see §21), and two signature crafting materials. Choosing a region is the
game's difficulty dial.

| Region | Tier | Band | Hue | Epithet | Materials |
|---|---|---|---|---|---|
| Hollowroot Cavern | low | 1–3 | 260 (indigo) | where the roots drink the dark | Mossroot Fiber, Hollow Bone |
| Duskmire Weald | low | 4–6 | 150 (green) | the forest that forgot the sun | Bog Amber, Wisplight Residue |
| Stormcrag Peaks | medium | 7–9 | 230 (storm-blue) | where the sky keeps its knives | Storm Quartz, Drakescale Chip |
| The Ashen Wastes | medium | 10–12 | 40 (ember) | a fire that refused to die | Cinder Ash, Obsidian Glass |
| The Sundered Spire | hard | 13–15 | 305 (violet) | the wound in the world | Void Shard, Rift Essence |

**Encounters.** Each `startFight()` rolls the region's weighted table; independently, a
**12% chance** swaps in the region's *elite* table instead (a single tougher mob). An
encounter is a template of 1–3 slots: `solo`, `pair`, or `vanguard` (two screening mobs up
front, a meaner one in the raised back row). Rows are presentation-and-targeting only — the
back mob draws centre, auto-retargeting eats the front screen first, but anything is
clickable/Tab-able at any time. The recurring design lesson (from the cookbook) is that a
vanguard is only worth adding if it creates a *decision* — e.g. a caster hiding behind
whelps that forces a target swap to interrupt it.

**The bestiary** — 35 creatures across seven visual families (golem, beast, spider, wisp,
drake, revenant, titan, void — each with its own idle animation and line-art portrait):

- **Hollowroot (1–3):** Gravel Skitterling (minion), Cave Golem, Mossback Boar, Root
  Creeper, Gloomfang Spider; **elite** Rockmaw Bruiser.
- **Duskmire (4–6):** Mire Whelp (minion), Duskwolf, Bog Lurker, Witchlight Wisp (hardcaster
  — "Witchbolt"), Fen Shade; **elite** Mirefiend Brute.
- **Stormcrag (7–9):** Harpy Fledgling (minion), Harpy Skyrender, Stone Colossus, Frostmane
  Drake, Cliff Stalker; **elite** Crag Behemoth.
- **Ashen Wastes (10–12):** Ember Imp (minion), Cinderhound, Ash Revenant, Obsidian
  Behemoth, Magma Crawler; **elite** Pyroclast Titan.
- **Sundered Spire (13–15):** Void Mite (minion), Void Acolyte (hardcaster), Bone Sentinel,
  Riftspawn Horror, Null Watcher; **elite** Herald of Malgrath.

Enemy behavior is a tagged union of **mechanics** the engine interprets (a new monster is
data, not code): every mob **swings**; some **hardcast** (interruptible, swings pause);
elites/bosses **enrage** at a HP threshold (standard: 30% HP → swings ×0.65 faster, hits
×1.4); some apply **venom** (a DoT on the player, cleared on victory). Minions are budgeted
to roughly half a normal's HP and 45% of its damage, so a two-minion-plus-back-mob vanguard
totals about one solo normal.

Five named **bosses** (Grubthar the Cave King, the Bramble Widow, Kraghorn Thane of Storms,
Pyrelord Ashmaw, Malgrath the Worldrender) and one extra elite (Malgrath's Herald) exist in
the content and are the intended region capstones — but **no code path currently spawns the
five bosses** (the boss-hunt/bounty system that would summon them was designed in the lost
"Long Hunt" build and never landed; see §4, §21). The Herald *is* reachable (it sits in the
Spire's elite table and as a vanguard back-row), so its quest is completable; the five
bosses and their achievements are not.

## 12. Loot, itemization, gold, and materials

**Item slots (5):** Staff, Hood, Robe, Ring, Talisman (trinket). **Stats (4):** Power,
Stamina, Spirit, Crit (crit is twice as budget-expensive as the flat stats). **Rarities
(4)** with a stat-budget multiplier and stat count each:

| Rarity | Budget mult | Stats rolled | Drop weight (unfloored) |
|---|---|---|---|
| Common | 100% | 1 | 55 |
| Uncommon | 140% | 2 | 30 |
| Rare | 190% | 2 | 12 |
| Epic | 250% | 3 | 3 |

An item's **stat budget** = round((4 + 2.2·ilvl)·rarityMult%); a staff always carries
Power; the remaining budget scatters across the rolled stats, and the item is procedurally
named from its rarity prefix, slot noun, and dominant-stat suffix (e.g. "Starforged Staff
of the Comet"). **Sell value** = round((2 + ilvl)·rarityMult%). Rarity is rolled from the
weights above, but a drop can carry a **rarity floor** (quests and future systems can
guarantee "uncommon or better"), which slices off the low end of the table.

**Where loot comes from:** each corpse banks a `LootBundle` (gold + at most one item +
materials), collected on the loot screen per-corpse or swept with **R**/Space. The Lantern
sign raises drop and material chances. The **inventory cap is 24**; overflow auto-sells.
Equipping is instant and never pauses the sim (you can re-gear mid-run from the Character
screen). Item level scales with the region's band, so deeper regions drop better gear —
the incentive to climb.

**Gold** is earned from kills and quests (scaled by the Guild Courier origin, Lucky Penny
talent, and gold cards), and spent on **respec (50g)** and **hiring the companion (150g)**.
It is deliberately a thin economy today — a sink foundation more than a system.

**Materials** are **inert**: ten crafting materials (two per region, low/medium/hard tiers,
worth 3–22 gold) drop alongside gear, stack in a separate bag, are sold for gold, and are
consumed by nothing yet. They exist as "the seam future crafting and quests will read
from" — collect-quest objectives already consume them, but there is no crafting bench.

## 13. The world boss — the Rift Colossus

The single-player scaffold of the multiplayer "asynchronous shared boss" dream. The **Rift
Colossus** is a boss-rank titan (level 15, hue 305) with a **persistent 40,000-HP pool**
carried in the save — "the one field a server would someday own." You **assault** it from
the world-boss interface; it spawns at its *current* pooled HP as the sole enemy and
hardcasts **Riftquake** (60-tick wind-up, 20–28 damage, every 12 s) between 8–14 swings.

The assault ends on its death, your death, or **retreat**. On any ending, the damage you
dealt this session is **banked** into the pool (the boss stays wounded for your next
attempt) and your `records.bestAssaultDamage` updates; felling it resets the pool to 40k
and fires the "Riftbreaker" achievement. Because your progress persists across sessions and
the boss "continues where you left off," this is exactly the shape of the intended shared
world boss — minus the other players. It pays no XP or gold directly; the reward is the
record and the achievement.

## 14. The companion (hireling)

The single-player scaffold of the "hire offline characters" dream. For **150 gold** you can
hire **Wren the Emberblade** ("a sellsword with a debt to the dark"), who then fights beside
you in every combat — including world-boss assaults — swinging at your current target every
1.3 s for `3 + 1×level` (±2) damage. She never crits, takes no damage (HP "comes later"),
and idles the instant there's nothing to hit. Her damage flows through the normal pipeline,
so her kills feed your XP, loot, and quests. She is a flat, always-on damage add today; the
dream is that she'd one day be *another player's* logged-off hero, their build driving her
performance.

## 15. Quests and achievements

**Quests** are a board of **15 one-shot traveler asks, three per region**, accepted from the
Quests tab (max **3 active** at once). Each is a `kill` or `collect` objective scoped to its
region, paying XP + gold and often a floored gear reward. Kill objectives with a null enemy
id count *any* foe in the region; specific-enemy objectives target elites; collect
objectives tick up as you loot the named material. A representative slice:

| Quest | Region | Objective | Reward |
|---|---|---|---|
| Dye for the Guild | Hollowroot | collect 8 Mossroot Fiber | 80 xp, 40 g |
| Cull the Cavern | Hollowroot | kill 12 (any) | 100 xp, 30 g, uncommon+ ilvl 3 |
| The Toll-Taker | Hollowroot | kill 2 Rockmaw Bruiser | 140 xp, 60 g, rare+ ilvl 4 |
| Lanterns for the Lost | Duskmire | collect 8 Wisplight Residue | 220 xp, 80 g, rare+ ilvl 6 |
| The Mountain's Fist | Stormcrag | kill 2 Crag Behemoth | 360 xp, 150 g, rare+ ilvl 10 |
| A Lens for the Observatory | Ashen Wastes | collect 6 Obsidian Glass | 520 xp, 180 g, rare+ ilvl 12 |
| Fragments of the Wound | Sundered Spire | collect 8 Void Shard | 700 xp, 240 g, **epic+** ilvl 15 |
| Kill the Messenger | Sundered Spire | kill 2 Herald of Malgrath | 800 xp, 300 g, epic+ ilvl 15 |

Rewards scale hard by region, so quests are a meaningful climb incentive — the Spire's board
pays roughly 8× the Hollowroot board. A completed objective fires a toast; turning in pays
out. Quests can be abandoned to free a slot.

**Achievements** are 17 permanent badges (toast on unlock). Reachable ones: First Blood,
Centurion (100 kills), Extinction Event (500 kills), the level milestones (5/10/15),
Dragon Hoard (1,000 career gold), It Glows Purple (find an epic), Silence! (10 interrupts),
Frequent Flyer (10 deaths), and Riftbreaker (fell the Colossus). **Unreachable fossils**
(kept in the catalog but with no earning path in the current build): the five `boss-*`
achievements (the zone bosses don't spawn — §11, §21) and **Wayfarer** ("Complete 10
expeditions" — the expedition system was deleted, §4). These fossils are the clearest
in-code evidence of the game's reversals.

## 16. Saves, slots, and persistence

- **Three save slots**, chosen from the title screen; slot 1 keeps the legacy
  `mythreach-save-v1` key so the very first players' saves still surface. Each slot has its
  own save blob and an identity **profile** (`mythreach-profile-sN-v1`: name, class, origin,
  sign, timestamps) read by the title screen to render the slot cards.
- **Save format is v5** and the deserializer **migrates v1–v4 forward** (e.g. old
  `zoneId` → region id, merged-region ids re-split, identity pulled from the profile for
  pre-v5 saves). Corrupt or unreadable saves fail *soft* — the game starts fresh rather than
  crashing.
- **What persists:** level, XP, gold, class/origin/sign identity, talents, equipped gear
  and inventory, materials, current region, world-boss pooled HP, companion, quests
  (active/completed), achievements, lifetime tallies, records, auto-battle flag, and the
  Gravewright's ledger pages. **What deliberately doesn't:** any in-flight combat state (a
  reload drops you to `idle` with the field clear) — there is no mid-fight save-scumming.
- **Write cadence:** every 5 s, on tab-hide (`visibilitychange`), and on `beforeunload`. A
  **wipe guard** in the save store prevents the unload-time write from resurrecting a save
  the player just deleted (a real bug that was found and fixed). Settings
  (`mythreach-settings-v1`: muted / screen-shake / reduced-motion) are global, not per-slot.
- **No server, no cloud, no account.** Everything is `localStorage`. Absence changes
  nothing (§2, §4).

## 17. Presentation: the visual and audio language

**The token system.** One design-token file (`tokens.css`) defines the entire palette in
**oklch** with `color-mix` compositing — no Tailwind, no CSS framework. The world is
"candlelit indigo-to-violet night, never pure black"; panes are "smoked vellum with gilt
hairlines." A disciplined trio of accents (ether/teal for the player and casts, arcana/
violet for magic and DoTs, ember/gold for currency and rewards *only*) is "never all at
full strength in one component." Every ability owns a **tone** (its school's hue), and
every surface that speaks for that ability — icon, cast ring, floating number, particles —
uses it, so colour is information.

**"The observatory turns its lens."** The whole app relights in the **current region's
hue**: the background nebula, horizon, and aurora crossfade on travel, and hue *bands* pick
a weather mood (embers rising, verdant spores, storm streaks with far-lightning, cavern
dust, void motes falling *upward*). Mood is a pure function of hue, so a new region is a
data row, not new art.

**Motion language.** One timing scale, four tiers, and nothing invents its own duration:
`--dur-fast` 130 ms (micro-feedback), `--dur` 240 ms (panels), `--dur-slow` 480 ms
(navigation), `--dur-epic` 1100 ms (level-ups, boss kills). Three named easings (spring/
punch/expo) carry all the character. Everything respects `prefers-reduced-motion` *and* an
in-game "Reduced motion" setting (which stamps `data-motion` on the root and stills the
sky).

**Floating numbers are a language, not a readout.** A damage number's **size is its value**
(absolute damage as a share of a `BIG_HIT ≈ 180` reference — *not* share of target HP; see
§22): a burn tick is a small violet 11, a Pyroblast crit is an enormous stroked number that
overshoots, snaps back, and hangs. A **crit is a different event**, not a bigger number:
white-hot, stroked in its tone, struck in off-axis. Numbers stack into lanes so a DoT tick
and a spell landing on the same frame don't smear into one unreadable blur, and only *fresh*
floats claim a lane.

**Sound is synthesized, zero audio bytes.** The entire soundtrack is a Web-Audio synth
(`sfx.ts`) — no samples, no licensing surface. It plays discrete cues (cast, impact, crit,
loot, epic-find, level, interrupt, target, deny, barrier, boss) and two *state* layers: a
low **drone** while a boss is alive and a **heartbeat** while you're below 35% HP. Audio is
unlocked on first input (browser autoplay policy) and muteable. Rejecting real samples in
favour of "upgrading the synth" is a settled decision (§4).

## 18. The Orrery — the combat UI (current working tree)

The current combat presentation, uncommitted on disk (2026-07-18). It **removes every
card from combat**: the action bar, enemy cards, and player card are gone, replaced by
three pieces over a hue-lit arena.

**The ability wheel** is a rotating astrolabe at bottom-centre with **10 seats**. Your kit
fills seats 0..n−1 in hotkey order; the remaining seats are faint engraved studs. Pressing
a hotkey **1..n** (or clicking a seat) swings that seat up under a fixed gilt **needle** at
12 o'clock along the shortest arc (620 ms), the seat faces counter-rotating to stay
upright; a beginning cast also claims the apex, so on auto-battle the wheel turns on its own
like an orrery. Cooldown wipes, queue throb, ready-flash, and the denied head-shake all
live on the seats. **A not-yet-unlocked ability renders exactly like an empty stud** — the
wheel never shows a padlock, so leveling *reveals* a seat rather than un-greying it (a
deliberate reversal of the old locked-button pattern).

**The heart** of the wheel is contextual and absorbs several old UI blocks: in a **lull**
it is the summoning sigil ("Fight" / Start fight); in **combat** it is the *cast focus* —
the in-flight spell's icon with its tone-coloured progress ring and the GCD arc (the old
separate cast bar is gone); on the **loot** screen it turns gilt ("Loot all"); when
**dead** it is a respawn countdown. **Space presses the heart** whatever it currently is.
The combat-mode heart is explicitly the **reserved seat for a future melee strike** — it
does nothing mid-fight today because that would need a real sim ability, deliberately not
faked in the UI.

**Enemies are free-standing figures**, not cards: a line-art portrait over a hue-tinted
ground-light **pool**, its HP an SVG **arc orbit**, its swing wind-up an inner dim-red arc,
a hardcast a burning orange arc plus an "interrupt!" whisper; rank shows as extra orbiting
rings, the target reticle as a rotating dashed ring with a chevron; spoils **drift up** off
a corpse. Each figure gets a stable per-creature bob and a slow personal sway, so a pack
reads as creatures loosely standing, not tiles in a row. The player is a **HUD orb** beside
the wheel — portrait with HP/mana arc rings, barrier shell, buff chips. The region is a
free-floating chapter heading. The old card components remain on disk as rollback
insurance but are unused by combat.

**FX pipeline.** Combat effects are **data**: `fx/spells.ts` is the only file with an
opinion about a specific spell (one row: charge / release / projectile / impact / crit /
aura / sound). A `FxDirector` (hosted by `Game`) decides *when* each number, recoil, and
sound happens from the sim's event stream; a Pixi.js `FxStage` renders particles on one
canvas (sprite-pooled, clamped `dt`, paused when off-screen). Adding a spell's whole
choreography is ~24 lines of data plus a colour token — no director, stage, or component
changes. (Two effect tunings were tried and reverted — §22.)

**Keyboard map (the whole hand):** `1..n` fire the kit's abilities; **Tab** cycles the
target (MMO muscle memory); **Space** presses the wheel's heart (summon / sweep / — one day
— strike); **R** sweeps all loot; **A** toggles auto-battle. Everything is also mouse-
reachable, and all interactive elements keep stable accessible names (which the Playwright
drives depend on).

## 19. The Hearth — the home base

A session-local **home-base** tab, the product of five full redesigns that produced the
game's permanent art law (§4, §22). The kept version, **"the Sanctum,"** is an open
platform at the top of the observatory tower: floating **glass plaques** (the hearth and its
warmth gauge, a one-line cat, archive spines, a ledger and candle, a class pennant, "the
sky" chip) arranged in a CSS-3D `perspective` space that leans ±2–3° with the pointer, over
a WebGL layer (lazy-loaded raw three.js) that draws **only points and lines** — a
two-depth starfield, your **birth-sign constellation hung at real z-depth**, an ember column
climbing from the hearth whose density tracks the "warmth" you stoke, and gilt dust motes.
An engraved compass-rose floor lies at `rotateX(74°)` with a slow-spinning dashed ring.

Everything here is **session-local by design** — stoking the hearth raises a warmth level
that washes the room in light and decays over ~45 s/step, but none of it touches the engine
or the save. The one real hook is the door: "Step into the Reach" returns you to Combat. The
Hearth is a mood room and a scaffold for future home-base systems (crafting, trophies), not
a mechanical system yet. Its hard-won lesson is the art rule: **glass + gilt hairline +
engraved stroke + light are the only allowed materials, in any dimension; depth and
parallax are welcome, solid/representational 3D geometry and cartoon illustration are
permanently off-brand.**

## 20. Architecture, engine purity, and testing

**The golden rule (frontend vs. backend).** `src/engine/` is a **pure, deterministic
simulation** — no DOM, no Svelte, no browser globals, no wall-clock time, no randomness
except an **injected `rng`** (a required constructor option). It could run headless from a
command-line program and produce identical results. `src/ui/` is everything the browser
needs, and the two meet at exactly one seam:

- The UI sends **intents** (`useAbility`, `startFight`, `setTarget`, `collectLoot`,
  `enterRegion`, `assaultWorldBoss`, …) — never reaching into sim internals.
- The sim exposes **snapshots** (`combatSnapshot()`, `progressSnapshot()`) — immutable
  plain data the UI renders — and a **once-per-tick event stream** drained exactly once in
  `Game.step()`.
- Visuals and sound are driven **only** from those events, through the `FxDirector`. The sim
  never knows the UI exists.

`Game` (`game.svelte.ts`) is the reactive bridge and the FX host: it runs the tick loop,
publishes snapshots to Svelte state, spawns floating numbers and recoils, and plays sound —
but it holds no game rules. Rendering budget is CSS/SVG for structure plus **one Pixi FX
canvas** and an **optional lazy three.js points/lines layer** (Hearth only). Heavy deps
(Pixi, GSAP, three) are **dynamically imported** — a concern about *time to first fight*,
not bundle size (which is explicitly not a constraint).

**The tick loop** runs at 20 Hz via `requestAnimationFrame` + a fixed-step accumulator. A
backgrounded tab's elapsed time is **clamped to 250 ms (≈5 ticks)** and the remainder
*discarded* — this clamp is the structural guarantee that "absence doesn't progress the
game." If a tick ever throws, the loop deliberately dies loudly (no next frame scheduled)
rather than masking a bug.

**Testing is the contract.** 215 Vitest tests across 23 files cover: `purity.test.ts`
(asserts the engine imports nothing from the DOM/Svelte), the balance and per-class
envelopes (§9), rule tests using injected content packs, save/migration round-trips, loot
and encounter distributions, and **UI-source hygiene** tests (via Vite `?raw` imports, since
the app tsconfig has no node types) that forbid stale tokens leaking into views.
`npm run check` (svelte-check + tsc) must stay at **0 errors, 0 warnings**. Two Playwright
drives back the unit tests: `verify:classes` (creation → Gravewright fight; a seeded
Hourwarden save → debt/Reckoning) and `shots` (README screenshots) — both depend on stable
accessible names, so combat aria-labels are effectively frozen.

## 21. Where the code and the older docs disagree

Read from the code, these are the points where the current game diverges from what older
docs (HANDOFF, PLAN, the memory index) imply. **The code is authoritative.**

- **The five zone bosses are unreachable.** `enemies.ts` fully defines Grubthar, the Bramble
  Widow, Kraghorn, Ashmaw, and Malgrath (and `zones.ts` names a `bossId` per region), but no
  sim path spawns them — `startFight()` only rolls the normal/elite encounter tables. The
  boss-hunt/bounty system that would summon them belonged to the "Long Hunt" build that was
  reported shipped but never landed on disk (§4). Their five `boss-*` achievements are
  therefore unearnable.
- **"Complete 10 expeditions" (Wayfarer) can never fire** — expeditions were deleted in the
  Regions build; the achievement is a fossil.
- **No Wager / let-it-ride.** Some history refers to a Bank-vs-ride staking system; it is
  not in the code (also a lost "Long Hunt" system). Loot is always simply banked.
- **The "Orrery" combat UI is uncommitted.** Docs that describe combat as card-based
  (action bar, enemy cards, player card) describe the last *committed* state; the working
  tree replaces all of it (§18). The card components still exist on disk but are unused.
- **Malgrath is level 16, one past the cap** — intentional (a boss is meant to out-level
  you), but worth noting against the "1–15" framing.
- **`hp`/level bands are advisory.** Nothing prevents a level-1 hero from entering the
  Sundered Spire; the "band" is a label, not a gate.

## 22. Reverted decisions and anti-goals

These were tried (or seriously considered) and deliberately rejected. They are settled;
re-deriving them wastes effort.

- **Idle / offline progression — deleted.** The game's founding idle half was removed
  outright. Absence must not progress the game; the frame loop enforces it structurally.
- **Expeditions / node-trails — built, then replaced** by endless free-choice regions.
  Structure *between* fights read as friction, not content.
- **Boss-gated zones — removed.** Regions are never gated.
- **Sizing damage numbers by share of target max HP — reverted.** Because a boss has more
  HP, the same hit would draw a *timid* number on the boss — exactly backwards. **Absolute**
  damage (against a fixed `BIG_HIT ≈ 180` reference) is correct; the number is where a hit
  shouts.
- **Scaling crit particle-light further up — reverted.** Light is additive; doubling it
  reads as a white disc that hides the fight, not "twice as big." The crit shouts through
  the *number*; the particle multiplier is deliberately tamer than the text multiplier.
- **Real audio samples — rejected** in favour of upgrading the synth (zero asset bytes, no
  licensing). Revisit only for a composed soundtrack.
- **The hard byte budget — retired** (richer effects earn their bytes), but heavy deps stay
  lazy-loaded because the real metric is time-to-first-fight.
- **Cartoon / filled illustration and representational 3D geometry — permanently
  off-brand** (the five-iteration Hearth verdict). 3D means depth and light, never solid
  meshes.

## 23. Open questions and future directions

Ordered roughly by how strongly the history points at them.

1. **Rebuild the lost "Long Hunt" systems.** The strongest candidates for the next systems
   pass, because they were designed to answer the philosophy notes directly and only lost to
   an on-disk accident: **bounties** (make the five zone bosses reachable as region hunts,
   reviving their achievements), **glyphs** (bounty trophies that each rewrite one ability —
   the first *build-defining* rewards), and possibly **the Wager** (active-risk staking on
   the loot screen). Making the bosses spawn is also the single highest-value bug fix, since
   the content and achievements already exist.
2. **Wire up crafting.** Materials, the material bag, and collect-quests already exist as an
   inert foundation; a crafting bench (likely at the Hearth) would give gold and materials a
   purpose and turn the Hearth from a mood room into a system.
3. **Deepen enemy mechanics.** The retention thesis says the long game is *encounter*
   design, not player abilities. Today's mechanic kinds (swing, hardcast, enrage, venom,
   freeze) are a base; mend/deathburst/summon were designed (Long Hunt) and could return.
   "If a new encounter creates no decision, it's just a bigger health bar."
4. **The melee strike for the wheel's heart.** The Orrery reserves the combat-mode heart for
   a universal melee attack; it needs a real sim ability (damage, timing, resource
   interaction) before the UI hook means anything.
5. **The multiplayer horizon (long-term, explicitly not built).** Accounts and cloud saves;
   then the two signature ideas the single-player scaffolds already model — **asynchronous
   shared world bosses** (the Rift Colossus's persistent pool, but shared) and **hiring
   logged-off heroes** (the companion, but backed by a real player's build) — and further
   out, guilds, marketplaces, and persistent world events.
6. **Economy depth.** Gold is currently a thin sink (respec, one hireling). A real
   money loop (crafting costs, more hirelings, home-base upgrades) would make the Courier
   origin and Lucky Penny talent matter.
7. **Content breadth within the frame.** More regions, more encounter *decisions*, more
   birth signs/origins — all cheap in this data-driven engine, all bounded by the balance
   envelope the test suite enforces.

---

*End of document. Every number herein was read from the source in the working tree on
2026-07-18; where the code and older docs disagreed, the code was taken as authoritative
(§21).*
