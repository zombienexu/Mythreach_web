# PLAN — Opening rework, the Q-strike, learn-at-leisure, and the scattered field

Five changes, executed together. Tests are the contract.

## 1. Every new character runs the Kindle Yard (camp)

- A fresh slot must *always* start at camp step 0 with zero Standing and nothing
  taught — no inheritance from a previous character in that slot.
- `eraseSlot` already wipes save + profile + expedition; lock it with tests, and
  make `Expedition` refuse to treat a *fresh* (never-saved) slot as graduated.

## 2. The staff is not on auto-cast — it is bound to **Q**

- Engine: remove the auto-swing from `tick()`. The swing only advances while the
  player has *started* one via the new `GameSim.strike()`.
- `strike()` is refused when: dead, not in combat/assault, no target, mid-cast,
  or already swinging. A landing strike pulls aggro exactly as before.
- Focus (Space) still Sharpens deep in your own wind-up — but only while a swing
  is actually in flight.
- `StrikeSnapshot` gains `swinging` and `ready` so the UI can show "Q ▸ strike".
- The action bar gets a staff tile (key `Q`) left of the spells; `q` is bound in
  `game.svelte.ts`.

## 3. The camp script: 3 duels → Heat lecture → Fireball → 3 duels

- `CAMP_DUELS` becomes **six**: a three-bout proving (staff only), then a
  three-bout tempering with fire in hand. A third sparhand joins the bestiary.
- On the proving's completion Sergeant Vale delivers the **Heat lecture** first;
  the First Weaving (Fireball) ceremony follows it, then the tempering.
- Standing arithmetic stays exact: the proving crosses Blooded (45) and the whole
  camp still lands short of Hardened (140).

## 4. Fireball is the only auto-learned working — the rest are learned in **Talents**

- Grace tiers now *offer* a working rather than granting it. The Expedition
  persists a `learned` list; `pending = taughtFor(standing) − learned`.
- Fireball auto-learns (the camp ceremony). Everything after it raises a
  notification badge on a new **Talents** destination, where the player learns it
  on their own time — never mid-battle.
- Migration: saves without `learned` keep everything their Standing had taught.

## 5. The arena field: scattered sightings, proximity pulls, Space to move on

- `field.ts` places every sighting at a normalized `(x, y)` on the field, mostly
  well spaced, occasionally close. 4–6 sightings per screen.
- A sighting within `AGGRO_RADIUS` of the one you engage **joins the fight**:
  the cluster's rosters merge into one `FightSpec`.
- UI: `FieldScreen.svelte` replaces the four-card `FieldBoard` — each group is a
  bundled card in its formation, each mob its own portrait, scattered across the
  arena. Click or Tab to pick, Enter/click to engage, **Space rolls the next
  screen** of sightings.

## Ownership (parallel execution)

| Stream | Files |
|---|---|
| A · engine strike | `src/engine/{sim,abilities,types,playerUnit}.ts`, `tests/strike.test.ts` |
| B · camp + teaching model | `src/ui/slice/{camp,content}.ts`, `expedition.svelte.ts`, `src/engine/content/enemies.ts`, `tests/camp.test.ts` |
| C · field model | `src/ui/slice/field.ts`, `tests/field.test.ts` |
| D · UI integration (lead) | `game.svelte.ts`, `ArenaView`, `UplinkShell`, `ActionBar`, `CampBoard`, `FieldScreen`, `TalentsView`, `DossierView`, docs |

## Done when

`npm test`, `npm run check` (0/0) and `npm run smoke` are green, docs are
updated, and the change is committed and pushed.
