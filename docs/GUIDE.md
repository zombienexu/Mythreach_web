# The Wayfarer's Guide to the Six Callings

*A player's handbook for Mythreach. Everything in here is live in the game;
numbers are the real numbers. For the design reasoning behind these choices,
see `CLASSES.md`.*

---

## How combat works, whoever you are

- **Fights are yours to start.** The field scatters 4–6 sightings across the
  ground — mark one with `Tab` (or hover it), engage with `Enter` or a click,
  and the pack spawns. Anything standing **inside the aggro ring** of what you
  pull comes with it, so read the ring before you commit. Nothing worth
  fighting? `Space` walks on and turns the whole screen over. When the last foe
  falls, their corpses hold gold, materials and items — loot per card, or sweep
  the field with `R`. Clear it and the field rotates. (There is no auto-battle;
  absence is respected, not simulated.)
- **Your weapon is yours to swing.** The staff is the basic attack on **`Q`**:
  one blow per press, a 1.8 s wind-up (`2 + level + ⌊staff ilvl/2⌋` damage, +4
  spread, power- and crit-scaled). Nothing swings on its own. Casting holds the
  wind-up; against a dormant pack your first Q is the free opening blow.
- **Focus (`Space`) is the timing read.** On a foe's wind-up: deflect the blow
  and crack them **Exposed** (+30% taken, 3 s). Late in **your own** wind-up:
  **Sharpen** the landing strike (+50%). Nothing open: a 1.5 s whiff lockout.
- **The global cooldown is 1.2 s.** Most abilities trigger it. Pressing a
  button mid-cast or mid-GCD *queues* it — it fires the instant you're free.
- **Casts resolve at the end.** Mana is spent when the spell lands, and a cast
  whose target dies mid-flight retargets the next enemy; it only fizzles (and
  refunds) when the field is empty.
- **Crits hit for 175%.** Base crit is 5%, raised by gear, talents, signs and
  class buffs.
- **Power is +1% damage per point.** It comes from levels (+3 per level) and
  gear.
- **Mana returns every second**; spirit and talents speed it up. Between
  fights you also knit back ~8% health per second, and clearing a pack
  instantly mends 25%.
- **Death costs 5 seconds** (less under the Serpent) and ends the fight — but
  anything already slain still pays out.
- **Targeting:** click a card or press `Tab`. Front-row enemies are retargeted
  first when your target dies.
- **New workings are learned when you choose.** Earning Standing *offers* a
  spell; it never interrupts a fight to hand one over. A badge appears on the
  **Talents** rail and it waits there until you learn it. (The one exception is
  **Fireball**, pressed into your hands at the camp's First Weaving ceremony.)

You earn **one talent point per level from level 2** (14 by the cap of 15).
Each calling has six talents — the Arcanist carries a seventh; both the points
and the Grace ladder live on the **Talents** screen. A respec costs 50 gold.

---

## Arcanist — *The War-Weaver*

**Role:** Pyromancer · **Mechanic: Smolder & Heat** — build lingering fire on
the foe, ride your own rising momentum, and choose the moment to spend both.
Taught by the Ember Legion one Grace tier at a time; a fresh conscript starts
with the staff and Focus alone, and earns Fireball in the Kindle Yard.

| Key | Ability | Taught at | What it does |
|---|---|---|---|
| 1 | **Fireball** | Blooded (45) | 16–24 fire, 2.2 s cast, 14 mana. Lays 1 Smolder, banks 1 Heat. Splashes the pack at 5 Heat; at 10 the **Blaze** pierces the whole line, then Heat crashes to 0. |
| 2 | **Detonate** | Hardened (140) | Instant, 3 s cooldown. Sets off every Smolder on the target — Fresh 6 / Heated 11 / Volatile 18 per stack. Banks 2 Heat. |
| 3 | **Kindle** | Trusted (300) | Instant, 5 s cooldown. 1 Smolder (2 if Exposed), 1 Heat. |
| 4 | **Wildfire** | Sworn (520) | Instant, 15 s cooldown. Seeds 2 Smolder on every foe; while learned, consuming Smolder spreads fire to the rest of the pack. |
| 5 | **Flashpoint** | Ember-Lord (780) | Instant, 20 s cooldown. Spend all Heat: a guaranteed Opening, `max(3 s, Heat × 0.4 s)`. |
| 6 | **Inferno** | Pyre-Sovereign (1080) | Instant, 25 s cooldown. Spend all Heat and every Smolder on the field in one bloom. |

**Heat** is +3% fire damage per point, bleeds 1 per idle 3 s (casting counts as
feeding it), and always crashes to cold after the Blaze. **Smolder** is inert
fuel until the **Lingering Flame** talent lights its per-second burn.

**Talents:** Improved Fireball (−0.1 s cast/rank), Quickened Flame (−0.1 s
cast/rank), Searing Flames (+8% fire/rank), **Lingering Flame** (Smolder burns
each second, ×rank, 3 ranks), Critical Mass (+2% crit/rank), Fortitude (+6%
health/rank), Meditation (+12% regen/rank).

**How it plays:** the staff fills the gaps between casts, one `Q` at a time.
Focus the foe's tell
(deflect + Expose) or your own late wind-up (Sharpen). Fireball into Openings,
stack Smolder, let it ripen to Volatile, Detonate at the peak — and keep the
Heat fed, because the moment you stop weaving it starts leaving. Full detail:
`COMBAT.md`.

---

## Gravewright — *Sexton of the Unquiet Field*

**Role:** Summoner · **Mechanic: The Ledger of the Dead** — every kill writes
a **page** into your ledger (cap 3, up to 5 with talents). Pages are the only
class resource that **persists between fights and across saves**. The ledger
also remembers the *last* foe you killed — that's who Exhume raises.

| Key | Ability | Lv | What it does |
|---|---|---|---|
| 1 | **Gravebolt** | 1 | 15–22 shadow, 2.0 s cast, 14 mana. |
| 2 | **Gravechill** | 1 | 4 per second for 7 s, and the victim swings **15% slower** while chilled. Instant, 8 s cooldown. |
| 3 | **Last Rites** | 2 | Spend 1 page: instant heal 24–32. 5 s cooldown. |
| 4 | **Exhume** | 4 | Spend 1 page: the last thing you buried stands up and fights beside you for 12 s, swinging every 1.6 s at 80% of its own attack. 12 s cooldown. |
| 5 | **Requiem** | 6 | 16–24 shadow to **every** enemy. 1.5 s cast, 10 s cooldown. |
| 6 | **Boneward** | 8 | Absorbs 22 + 5×level. 20 s cooldown. |
| 7 | **Final Chapter** | 11 | Consume **all** pages: 26–36 shadow **per page**. Instant, 30 s cooldown. |

**Talents:** Ink of the Fallen (+1 page cap/rank, max 2), Deeper Cuts (+8%
shadow/rank), Swift Quill (Gravebolt −0.1 s/rank), Bound Echoes (+15% echo
damage/rank), Grave Pact (+10% Last Rites healing/rank), Old Bones (+6%
health/rank).

**How it plays:** Every page is a decision — a heal, a pet, or a stockpile.
What you exhume matters: an echo of an elite hits like an elite, so bury
something good before a hard fight. A full ledger slammed shut with Final
Chapter (78–108 base at 3 pages, 130–180 at 5) is your nuke. Note that a
fresh Gravewright's ledger is empty: Last Rites and Exhume wake up after
first blood.

---

## Hourwarden — *Keeper of the Borrowed Second*

**Role:** Tempomancer · **Mechanic: Sand Debt** — **nothing you do has a cast
time.** Every ability is instant, and every one adds debt (cap 100). Every
**16 seconds of combat, the Reckoning** collects **80% of your current debt
as damage to you**, then wipes the slate. End the fight before the bell and
the borrowing was *free*.

| Key | Ability | Lv | What it does |
|---|---|---|---|
| 1 | **Secondhand Strike** | 1 | 12–17 temporal. Instant, no cooldown. **+8 debt.** |
| 2 | **Rewind Wound** | 2 | Heal **70% of the last blow that hit you**. 8 s cooldown. **+10 debt.** Worthless before you're hit; spectacular after a boss nuke. |
| 3 | **Split Second** | 4 | For 6 s, Secondhand Strike lands **twice**. 15 s cooldown. **+12 debt.** |
| 4 | **Stasis** | 6 | Freeze the target outside time for 3 s — no swings, and a cast in flight simply stops (counts as an interrupt). **Off the GCD.** 15 s cooldown. **+8 debt.** |
| 5 | **Borrowed Blade** | 8 | 34–46 temporal, instantly. 12 s cooldown. **+20 debt.** |
| 6 | **Hourglass Shatter** | 11 | 18–26 temporal **plus your entire current debt as damage**, and your debt resets to zero. 30 s cooldown. |

**Talents:** Borrowed Time (+8% temporal/rank), Fine Print (Reckoning
−8%/rank), Quick Hands (+2% crit/rank), Compound Interest (Shatter converts
+10% more debt/rank), Patient Debt (+12% regen/rank), The Long Con (+6%
health/rank).

**How it plays:** Short fights: spend freely — the kill forgives everything.
Long fights: watch the reckoning countdown under your bar. The masterstroke
is Shatter *just before the bell* — the punishment becomes the payoff (with
Compound Interest maxed, 100 debt Shatters for 150 on top of the base hit).
Rewind Wound is your only heal, and it's reactive: eat the big hit, then
un-eat 70% of it.

---

## Cartomancer — *Dealer of the Fifty-Third Card*

**Role:** Gambler · **Mechanic: The Living Deck** — every fight deals you a
**hand of 3 cards** (5 with talents), visible under your bar so you always
know your next three fates. Poker, not a slot machine.

**The cards** (weighted draw):

| Card | Effect |
|---|---|
| The Tower | 30–42 fortune damage |
| The Comet | 12–16 to every enemy |
| Six of Knives | 6 per second for 5 s |
| Ace of Hearts | Heal 22–30 |
| The Moon | Shield: absorbs 18 + 4×level |
| Nine of Coins | 12–24 gold, on the spot |

| Key | Ability | Lv | What it does |
|---|---|---|---|
| 1 | **Cardflick** | 1 | 15–21 fortune, 1.8 s cast. The filler. |
| 2 | **Deal Fate** | 1 | Play the **top card** of your hand. Instant, 6 s cooldown. An empty hand draws three fresh cards instead. |
| 3 | **Cut the Deck** | 2 | Hate the hand? Discard it and draw a fresh one. 10 s cooldown. |
| 4 | **House Rules** | 6 | For 8 s, **every damage and heal rolls its maximum**, and crit +10%. 25 s cooldown. |
| 5 | **Fold the World** | 8 | Discard your whole hand: 11–15 damage **per card folded** to **every** enemy. 20 s cooldown. |
| 6 | **The Fifty-Third Card** | 11 | 2.5 s cast, 30 s cooldown. Draws one of: **The Unmaking** (45%: 60–80 damage), **The World, Redrawn** (20%: full heal, poison cleansed), **The Mint** (15%: 40–80 gold), **The Mirror** (20%: shield 30 + 6×level and a fresh hand). It is never a two. |

**Talents:** Loaded Dice (+8% fortune/rank), Sleight of Hand (Cardflick
−0.1 s/rank), Extra Ace (+1 card per hand/rank, max 2), Crooked House (House
Rules +1 s/rank), Lucky Penny (+6% gold/rank), Tough Crowd (+6% health/rank).

**How it plays:** Read your hand at the pull. Hearts and Moon queued up? Play
aggressive. Three damage cards against a pack? That's a Fold. House Rules
before a Tower or the Fifty-Third turns "probably" into "certainly." And yes
— the deck pays out actual gold; a Lucky Penny courier build makes real money.

---

## Thornspeaker — *Voice of the Patient Green*

**Role:** Cultivator · **Mechanic: The Rootbound Garden** — everything you
plant **keeps growing**. Sow Briar's ticks each hit harder than the last:
3, 4, 5 … 12. The class is an investment portfolio; long fights are the
growing season.

| Key | Ability | Lv | What it does |
|---|---|---|---|
| 1 | **Thornlash** | 1 | 14–20 nature, 1.8 s cast. |
| 2 | **Sow Briar** | 1 | Plants a growing burn: starts at 3/second and gains +1 every tick, 10 ticks (75 total if left alone — more than any nuke). Instant, 5 s cooldown. **Replanting starts the garden over** — protect your investment. |
| 3 | **Sapdraw** | 2 | 14–20 nature, and you **heal for every point of damage dealt**. 2 s cast, 8 s cooldown. |
| 4 | **Bramble Ward** | 6 | Absorbs 18 + 5×level — and every blow it catches bites the attacker for 6 + level. The only shield in the game that hits back. 20 s cooldown. |
| 5 | **Wildswell** | 8 | 10 s of forced spring: your briar ticks **twice as fast** (same total, half the time). 30 s cooldown. |
| 6 | **Verdant Cataract** | 11 | The bloom: consume your briar for **150% of everything it still owed**, instantly. 1.5 s cast, 15 s cooldown. Needs a briar on the target. |

**Talents:** Patient Green (+8% nature/rank), Deep Roots (Briar +1 tick/rank,
max 3 — and the late ticks are the fat ones), Sap Surge (Sapdraw heals
+15%/rank), Full Bloom (Cataract +10%/rank), Rooted Calm (+12% regen/rank),
Thick Bark (+6% health/rank).

**How it plays:** Briar first, always. Then the standing question: let it
ride, accelerate it (Wildswell), or cash out (Cataract)? Harvesting a
fully-grown briar is enormous; harvesting a fresh one is a waste of a
cooldown. Sapdraw and the thorned ward make you the tankiest caster in the
reach — nothing outlasts a person the forest agrees with.

---

## Riftblade — *Edge of the Elsewhere*

**Role:** Spellblade · **Mechanic: Blink Tempo** — fast strikes bank **rift
charges** (cap 5, up to 7 with talents); Phase Edge spends **all of them at
once**. Build, spend, repeat. Position is a weapon; cast bars are for other
people (mostly).

| Key | Ability | Lv | What it does |
|---|---|---|---|
| 1 | **Through-Cut** | 1 | 11–16 rift. Instant, no cooldown. **+1 charge.** |
| 2 | **Seamstep** | 2 | Step through the seam: for 4 s, **the next blow aimed at you hits the space you were standing in** — fully evaded. **+1 charge.** 10 s cooldown. Time it against the enemy's swing bar. |
| 3 | **Phase Edge** | 4 | Spend **every** charge: 13–17 rift **per charge**. Needs at least 2. Instant, 8 s cooldown. |
| 4 | **Afterimage** | 6 | Leave a you-shaped argument behind for 10 s. It swings every 1.4 s on its own clock. It also has a sword. 20 s cooldown. |
| 5 | **Rift Tear** | 8 | 26–36 rift to your target; the tear grazes **every other enemy for half**. 1.5 s cast, 12 s cooldown. |
| 6 | **Doorway Duel** | 11 | Drag your target into the elsewhere for 8 s: its packmates are **frozen outside**, and it takes **+25% from everything you do**. Kill it early and the door opens. 30 s cooldown. |

**Talents:** Honed Edge (+8% rift/rank), Fleet-Footed (**global cooldown**
−0.05 s/rank, max 4 — the only GCD reduction in the game, 1.2 s → 1.0 s),
Mirror Training (Afterimage +15%/rank), Duelist's Eye (+2% crit/rank),
Widened Seam (+1 max charge/rank, max 2), Scar Tissue (+6% health/rank).

**How it plays:** Through-Cut is your heartbeat; Phase Edge at 4–5 charges is
your punch (a 7-charge Widened-Seam Edge hits 91–119 before power). Seamstep
is a *skill dodge* — watch the swing bar, step just before it fills. Against
a pack with something nasty in it, Doorway Duel turns a 3v1 into a duel you
chose.

---

## Origins — where you were before the atlas knew your name

A steady leaning for the whole run. Never a cage.

| Origin | Boon |
|---|---|
| **Lamplit Scholar** | +10% experience |
| **Ashmarch Survivor** | +8% maximum health |
| **Guild Courier** | +12% gold (kills and quests — not fencing your own gear) |
| **Hedge-Witch's Ward** | +15% mana regeneration |

## Birth signs — the constellation overhead

Signs don't lean; they *intervene*.

| Sign | Omen | What the stars do |
|---|---|---|
| **The Lantern** | Lost things find you. | +6% item drop chance, +10% material finds |
| **The Serpent** | Endings coil into beginnings. | You respawn 40% sooner |
| **The Tower** | You bend before you break. | **Once per fight, a killing blow leaves you at 1 HP** |
| **The Moth** | Drawn to what burns. | +3% critical strike chance |

**Pairings worth trying:** a Tower Hourwarden can borrow deeper into the
Reckoning than anyone sane; a Lantern Gravewright fills its bags while it
fills its ledger; a Moth Cartomancer under House Rules crits constantly; a
Serpent Riftblade treats death as a short walk. Every combination works —
they just tell different stories.

---

## Quick reference — who should play what

| You are the kind of player who… | Play |
|---|---|
| wants the classic: cast bars, rotations, a big red button | **Arcanist** |
| hoards potions and names their pets | **Gravewright** |
| pays the credit card the night it's due, loves a deadline | **Hourwarden** |
| takes the 20% chance every time and tells the story for weeks | **Cartomancer** |
| picks the DoT class in every game and loves numbers that grow | **Thornspeaker** |
| rolls melee in a caster's world; every button should feel like a knife | **Riftblade** |
