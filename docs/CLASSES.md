# The Six Callings — design notes

Every class is built around a *player*, not a spreadsheet. The question each
kit answers is "what does this person grin at?" — and every mechanic, number
and talent hangs off that answer. This file is the why; `docs/EXTENDING.md`
is the how; `tests/classes.test.ts` is the proof.

Shared spine (all classes): 20 ticks/s, GCD 1.2 s, mana + regen, level cap
15, one talent point per level from 2, gear with power/stamina/spirit/crit.
Each kit gets 6–7 abilities (a level-1 opener through a level-11 capstone)
and six talents (the Arcanist carries a seventh — Lingering Flame). Every
hero also carries the Strike (their weapon's basic attack, swung on **Q**) and
one **calling** on the heart of the wheel (**Space**), unique to the class —
the Arcanist's is Stoke. Every class must pass the same balance smoke test: a fresh
level-1 hero on the test-only auto-driver survives and progresses in the
starting region.

---

## Arcanist — the pressure-builder

*For the player who wants to read a fight and choose a moment — and for whom
fire should feel like something alive that they are barely holding.*

The War-Weaver of the slice. Three interlocking systems: **Stoke** (the calling
on Space — half a second of open flue, timed onto a *landing* working),
**Smolder** (aging fuel on the foe — inert until the Lingering Flame talent,
then a burn), and **Heat** (riding momentum: +5% fire per point, +1 per landing
working and +2 when stoked, bleeds unfed, and the overheat Blaze always spends
itself back to cold). The class thesis is spoken by its drill
sergeant: nobody masters the Weave — you ride it. Full detail in
`docs/COMBAT.md`.

## Gravewright — the collector

*For the player who hoards potions in every RPG and names their pets.*

**The Ledger of the Dead.** Every kill writes a page (cap 3, talentable to
5). Pages **persist across fights and saves** — the only class resource that
does — because the fantasy is a *collection*, and collections don't reset.

The loop is a spending decision: pages are a heal (Last Rites), a pet
(Exhume — the echo is literally the last thing you killed, at 80% of its
own attack), or a stockpile for Final Chapter (26–36 shadow per page, all
pages at once). Exhuming an elite you just barely beat, to fight the next
elite, is the class's signature grin. Gravechill's 15% swing-slow gives it a
defensive identity beyond the pet; Requiem covers packs; Boneward is the
barrier analog.

**Deliberate quirk:** a fresh Gravewright has an empty ledger — Last Rites
and Exhume are dead buttons until first blood. The class teaches itself.

## Hourwarden — the deadline gambler

*For the player who pays their credit card the night it's due and thinks
cast bars are for other people.*

**Sand Debt.** Nothing in the kit has a cast time — every ability is
instant, and every one adds debt (capped at 100). Every 16 seconds of
combat, the Reckoning collects: 80% of current debt as damage to *you*, then
the slate clears. End the fight before the bell and the borrowing was
**free** — that's the whole game. The kit is a set of levers around that
deadline:

- Secondhand Strike: cheap spam, +8 debt each.
- Split Second: 6 s where the Strike lands twice — debt accelerant.
- Rewind Wound: heal 70% of the last blow you took (a *reactive* heal —
  worthless before you're hit, spectacular after a boss nuke).
- Stasis: 3 s freeze, works on casts mid-flight, off-GCD — the class's
  interrupt, but also usable as pure tempo.
- Borrowed Blade: pyroblast damage, instantly, for +20 debt.
- Hourglass Shatter (capstone): base damage **plus your entire debt**, debt
  to zero. Timing it just before the bell converts the punishment into the
  payoff. That timing window is the skill ceiling.

## Cartomancer — the variance lover

*For the player who takes the 20% chance every time and tells the story for
weeks when it hits.*

**The Living Deck.** Each fight deals a hand of 3 (5 talented). Deal Fate
plays the top card: the Tower (big damage), the Comet (AoE), Six of Knives
(DoT), Ace of Hearts (heal), the Moon (shield), Nine of Coins (gold — yes,
the deck pays out actual money). Crucially, the hand is *visible*: you know
your next three fates, so it's poker, not a slot machine. Control valves
keep the variance fun instead of tyrannical:

- Cut the Deck: hate the hand? Redraw it. (Nerve, rewarded.)
- House Rules: 8 s where **every roll is its maximum** and +10% crit — the
  anti-variance button, on a 25 s cooldown.
- Fold the World: dump the whole hand as AoE damage per card — bad hands
  are ammunition.
- The Fifty-Third Card (capstone): a weighted jackpot — 45% catastrophic
  damage, 20% full heal, 15% windfall, 20% shield + fresh hand. Never a two.

## Thornspeaker — the patient gardener

*For the player who picks the DoT class in every MMO and feels genuine
affection for a number that grows.*

**The Rootbound Garden.** Sow Briar's ticks grow by +1 each time they land:
3, 4, 5 … 12 over ten ticks. Left alone it out-damages everything else in
the kit — the game is protecting your investment. Wildswell doubles tick
*pace* (the whole garden lands in half the time); Verdant Cataract harvests
early: consume the briar for 150% of everything it still owed — the choice
between letting it ride and cashing out is the class's Hourglass-Shatter
moment. Sapdraw heals for 100% of damage dealt; Bramble Ward is the only
shield in the game that hits back. Long elite/boss fights are the growing
season the whole kit points at.

## Riftblade — the tempo duelist

*For the player who rolls melee in a caster's world and wants every button
to feel like a knife.*

**Blink Tempo.** Through-Cut is instant, cheap, no cooldown, and banks a
rift charge (cap 5, talentable to 7); Phase Edge spends **all** of them at
13–17 each. The build-spend rhythm is fast and legible. Around it:

- Seamstep: 4 s where the next enemy blow hits the space you were standing
  in — a *skill dodge* you time against the enemy's swing bar. Also banks a
  charge, because stepping is fighting.
- Afterimage: a mirror that swings on its own clock — the tempo never stops.
- Rift Tear: the AoE, shaped as a main hit + half-damage graze.
- Doorway Duel (capstone): 8 s, one enemy — its packmates are frozen
  outside, and it takes +25% from you. Turns a 3-pull into a duel; kill the
  duelist early and the door opens. It's the most "design as fiction"
  ability in the game: front row, back row — suggestions.
- Fleet-Footed (talent): the only GCD reduction in the game (1.2 s → 1.0 s).
  Tempo *is* the class fantasy, so the class gets to buy tempo.

---

## Origins and signs — leanings and interventions

The creation-screen promises came due: both halves are mechanical now.

**Origins lean** — steady percentages that shape a whole run and never make
a fight decision for you: Lamplit Scholar +10% XP, Ashmarch Survivor +8% max
HP, Guild Courier +12% gold, Hedge-Witch's Ward +15% mana regen.

**Signs intervene** — moments, not curves: the Lantern (+6% item drops,
+10% materials), the Serpent (respawn 40% sooner), the Tower (once per
fight, a killing blow leaves you at 1 HP — the whole table gasps), the Moth
(+3% crit, the greedy pick).

Any class × origin × sign combination is viable; the combos just *flavor
differently* — a Tower Hourwarden borrows deeper into the Reckoning, a
Lantern Gravewright fills its bags while it fills its ledger, a Moth
Cartomancer under House Rules is a crit machine. That's the point: 6 × 4 × 4
= 96 characters that all feel like a decision.

## Balance reference points

- Arcanist Fireball (16–24 @ 2.2 s cast) is the DPS yardstick; every class's
  filler lands within ~10% of it after cast/GCD accounting.
- Capstones (level 11, 30 s cooldown) are each worth roughly 3–4 filler
  casts when their condition is met — full ledger, high debt, grown briar,
  full charges, a duel-worthy target.
- The per-class rotations of the test-only auto-driver in `sim.ts` are the
  executable statement of each kit's intended priority; the balance smoke
  test runs all six for 20 simulated minutes at level 1.
