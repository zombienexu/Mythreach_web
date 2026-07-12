# WEB_PIVOT_PLAN.md — Mythreach Web: the TypeScript rebuild

> **You are a fresh Claude session. This document is your complete brief.** It was
> written 2026-07-12 by the session that built the Godot v0 prototype (this repo,
> pushed to github.com/zombienexu/Mythreach). The user has decided to pivot the
> prototype to **TypeScript/HTML/CSS** — the genre's native stack — while keeping
> the functional scope identical. You are building it end-to-end, yourself, in a
> **new sibling directory**. You do not need to read the Godot code; everything
> behavioral is specified below. The Godot repo stays untouched as a reference.

## Mission

Rebuild the Mythreach combat prototype as a web app, and make it *sing*. Two goals,
in priority order:

1. **Behavior parity** with the frozen spec below — same abilities, numbers, and
   encounter loop, proven by a ported unit-test contract.
2. **Show what the web buys us.** The Godot build approximated a dashboard;
   the web *is* dashboards. The user explicitly wants to "get a feel for everything
   this pivot has to offer": typography, layered light and glass, buttery
   choreographed motion, instant load. Presentation quality is a first-class
   requirement, not polish at the end.

**Scope is frozen at v0.** No new mechanics, no save system, no sound, no extra
abilities. All creative budget goes into presentation and code quality.

### Design identity — important

The Godot build imitated Melvor Idle's flat Bootstrap-admin look. **Do not rebuild
that.** Mythreach Web gets its own visual language — *similar in function*
(sidebar, cards, bars, log, action bar), *distinct in design*. The art direction
below ("Arcane Observatory") is the brief; you have creative latitude *within* its
tokens and principles, and none over the game rules.

---

## Phase 0 — Environment (nothing is installed; do this first)

The machine (Ubuntu 26.04, zsh, git + curl available) has **no Node, npm, bun, or
nvm**. Bootstrap without sudo:

```sh
curl -o- https://raw.githubusercontent.com/nvm-sh/nvm/v0.40.3/install.sh | bash
export NVM_DIR="$HOME/.nvm" && . "$NVM_DIR/nvm.sh"   # or open a fresh shell
nvm install --lts        # Node 24.x LTS at time of writing; any current LTS is fine
node --version && npm --version                       # checkpoint
```

If the nvm install script version 404s, check https://github.com/nvm-sh/nvm for the
current tag. Remember: `nvm` is a shell function — `. "$NVM_DIR/nvm.sh"` in each
non-login shell, or rely on what the installer appended to `~/.zshrc`.

Workspace: create **`~/work/mythreach-web`** (sibling of the Godot repo at
`~/work/prototype_game` — do not nest). `git init` immediately; commit at each
milestone. The user will create a GitHub remote later — don't push anywhere.

## Stack (decided — don't relitigate, but do check current versions)

| Layer | Choice | Why |
|---|---|---|
| Build | **Vite** (latest) | Instant dev server, trivial static build |
| Language | **TypeScript, `strict: true`** | Non-negotiable; the engine is typed data |
| UI | **Svelte 5 (runes)** | Tiny bundles, reactivity that fits a 60fps-polled sim, no VDOM overhead |
| Styling | **Vanilla modern CSS** — custom properties, nesting, `oklch()`, `color-mix()`, container queries | The identity is bespoke; no Tailwind/Bootstrap genericism, zero CSS deps |
| Tests | **Vitest** | The contract runner; milliseconds per run |
| Screenshots | **Playwright** (chromium only, dev-dep) | Automated visual verification, mirrors the Godot repo's `tools/screenshot.gd` |
| Fonts | **@fontsource-variable/fraunces** + **@fontsource-variable/inter** | Self-hosted (no CDN), display + UI pairing |
| Package manager | npm | Already there once Node is |

Scaffold with `npm create vite@latest . -- --template svelte-ts` then prune the
demo. No other runtime dependencies — if you feel you need a library for state,
animation, or particles, you don't; the point of this build is showing the
platform can do it natively.

`package.json` scripts to end up with:
`dev`, `build`, `preview`, `test` (vitest run), `test:watch`, `check`
(svelte-check + tsc), `shots` (Playwright screenshot script).
**`npm run test` and `npm run check` green is THE contract**, same philosophy as
`./scripts/test.sh` in the Godot repo.

---

## Functional spec (FROZEN — port exactly)

### Combatants
- **Hero** — 100 max HP.
- **Cave Golem** — 80 max HP; melee swing every **2.2 s** for **5–9** damage
  (uniform integer roll, inclusive).

### Abilities (action bar, keys 1/2/3, also clickable)
| # | Ability | Type | Cast | Cooldown | Effect |
|---|---|---|---|---|---|
| 1 | **Fireball** | Cast | 2.5 s | — | 16–24 damage on cast completion |
| 2 | **Ignite** | Instant | — | 8 s | DoT: 4 damage every 1 s, 6 ticks (24 total); reapplying refreshes |
| 3 | **Renew** | Cast | 1.8 s | 5 s | Heals the Hero 18–26 (clamped at max HP) |

### Rules
- One cast at a time; **no** ability usable while casting. No GCD, no queueing.
- Offensive abilities (Fireball, Ignite) require a living enemy to start.
- If the enemy dies mid-cast, the cast completes but **fizzles** (no damage, no
  retarget). Cooldowns start when an ability *resolves* (cast end / instant use).
- Enemy dies → +1 kill, **+10 gold**, DoTs cleared, respawns at full HP after **3 s**.
- Hero dies → cast cancelled, DoTs cleared, enemy stops attacking, Hero revives at
  full HP after **3 s**, and the enemy resets to full HP (fresh encounter).
- Death overkill clamps HP at 0; a dead combatant takes no damage and cannot be
  healed; heals emit only the *actual* amount restored.
- On a killing blow, the damage event precedes the death event.

---

## Engine architecture (the part that must be excellent)

`src/engine/` is **pure TypeScript** — no DOM, no Svelte imports, no `window`.
This mirrors (and improves on) the Godot repo's `src/core`/`src/ui` boundary,
which is what made this pivot cheap. Keep it portable; it will outlive the UI.

**Fixed integer ticks, not float deltas** — the improvement the Godot build
deferred. **20 ticks/second (50 ms)**; all spec durations are exact tick counts:

| Duration | Ticks | | Duration | Ticks |
|---|---|---|---|---|
| Enemy swing 2.2 s | 44 | | DoT interval 1 s | 20 |
| Fireball cast 2.5 s | 50 | | Ignite CD 8 s | 160 |
| Renew cast 1.8 s | 36 | | Renew CD 5 s | 100 |
| Respawn 3 s | 60 | | DoT duration 6 s | 120 |

Shape (sketch — refine freely, keep the ideas):

```ts
// events.ts — discriminated union; the UI's only source of one-shot happenings
export type CombatEvent =
  | { kind: 'castStarted' | 'castFinished' | 'castFizzled'; abilityId: AbilityId }
  | { kind: 'damage'; target: Side; amount: number; source: SourceId }
  | { kind: 'heal'; target: Side; amount: number; source: AbilityId }
  | { kind: 'dotApplied'; abilityId: AbilityId }
  | { kind: 'enemyDied' } | { kind: 'enemyRespawned' }
  | { kind: 'playerDied' } | { kind: 'playerRespawned' };

// engine.ts
export class CombatEngine {
  constructor(config: EncounterConfig, rng: Rng)  // seeded mulberry32; Math.random default in game
  tick(): CombatEvent[]                            // advance exactly one tick
  useAbility(id: AbilityId): boolean               // instant resolve or cast start
  canUse(id: AbilityId): boolean
  snapshot(): Readonly<CombatSnapshot>             // hp, castProgress, cooldowns, swingProgress,
}                                                  // dot remaining, kills, gold, respawn timers
```

- Content is **data**: `abilities.ts` exports the three ability definitions as
  plain typed objects (`kind: 'damage' | 'dot' | 'heal'`); the engine interprets.
- Returning events from `tick()`/`useAbility()` (rather than callbacks/EventEmitter)
  keeps the engine synchronous, allocation-light, and trivially testable.
- Seeded RNG (mulberry32 is 4 lines — write it, don't import it) so tests can pin
  exact rolls when needed; otherwise assert design ranges.

**Game loop** (`src/ui/loop.ts`): `requestAnimationFrame` + accumulator; run
`tick()` for each elapsed 50 ms; **clamp catch-up to ~2 s per frame** (tab was
backgrounded → fast-forward a little, don't spiral — this quietly demos the idle
nature). Render from `snapshot()` every frame; drain events into UI effects.

## Test contract (port these; write them FIRST, watch them fail, then implement)

Mirror the Godot suite's 32 cases (suite names in parentheses). Minimum set:

- **Combatant:** damage reduces HP; overkill clamps to 0 and kills; damage/heal on
  the dead is ignored; heal clamps at max; zero/negative amounts ignored.
- **Fireball:** no damage before tick 50, then 16–24 total; `castStarted`/
  `castFinished` fire once; casting locks out all three abilities; `castProgress`
  goes 0→1.
- **Ignite:** instant, zero upfront damage; exactly 4 damage at each of 6 one-second
  boundaries (24 total); DoT expires and clears; unusable during its 160-tick CD,
  usable at 161; reapply refreshes (test the DoT unit directly).
- **Renew:** heals 18–26 after 36 ticks; overheal clamps; CD starts at resolve.
- **Enemy:** first swing lands on tick 44 for 5–9 (pin min=max in config for exact
  asserts); swing progress fills 0→1; a dead enemy never swings.
- **Encounter:** kill → `enemyDied`, kills=1, gold=10, DoTs cleared → full-HP
  respawn on tick +60. Offensive abilities fail vs dead enemy, Renew still works.
  Fireball started before an external kill fizzles (event order: damage before
  `enemyDied`).
- **Player death:** cast cancelled, enemy stops, revive at +60 ticks with fresh
  full-HP enemy; dead player can't use abilities.

Helper: `advance(engine, ticks)` collecting all events. No timers, no async, no DOM.

---

## Visual identity — "Arcane Observatory"

**Concept:** you are reading the world through an enchanted instrument panel —
luminous glass panes floating over a living void. Where Melvor is *flat, opaque,
Bootstrap*, Mythreach Web is *deep, translucent, and lit from within*.

### Tokens (`src/ui/styles/tokens.css` — the single source of truth)

```css
:root {
  /* The void (page) — near-black indigo, never pure black */
  --void: oklch(0.13 0.03 275);            /* ≈ #0a0d1c */
  --void-deep: oklch(0.10 0.025 280);
  /* Glass panels */
  --glass: oklch(0.80 0.02 260 / 0.05);    /* panel fill */
  --glass-edge: oklch(0.85 0.03 260 / 0.16);
  --glass-blur: 14px;
  /* Ink */
  --text: oklch(0.94 0.01 260);  --text-dim: oklch(0.68 0.02 260);
  /* The trio (never all at full strength in one component) */
  --ether: oklch(0.80 0.11 195);     /* teal — primary accent, player, casts */
  --arcana: oklch(0.72 0.15 300);    /* violet — magic, DoT, secondary accent */
  --ember: oklch(0.80 0.13 80);      /* gold — currency & rewards ONLY */
  /* Vitals */
  --life: oklch(0.78 0.15 160);      /* HP */
  --wound: oklch(0.68 0.17 25);      /* damage, enemy swing */
  --radius: 14px; --radius-sm: 8px;
  --ease-spring: cubic-bezier(0.34, 1.56, 0.64, 1);
  --dur-fast: 140ms; --dur: 260ms;
}
```

### The principles

1. **A living background.** 2–3 huge, heavily-blurred radial gradient blobs
   (ether/arcana at ~8% alpha) drifting on 60–90 s CSS animations behind
   everything, plus a whisper of star-noise (tiny inline-SVG turbulence or layered
   radial dots). Subliminal, not a screensaver. GPU-cheap: `transform` only.
2. **Glass, edge-lit.** Panels: `--glass` fill, `backdrop-filter: blur(var(--glass-blur))`,
   1px border that is a *gradient* (brighter top edge — light from above), soft
   deep shadow. Test with `backdrop-filter` off; it must still look intentional.
3. **Typography carries the fantasy.** Fraunces (variable serif) for the brand,
   card titles, and page heading — this alone kills the Bootstrap look. Inter for
   everything else. All numbers get `font-variant-numeric: tabular-nums` — bars
   and counters must not jitter.
4. **Bars are light, not paint.** HP/cast/swing bars are rounded-full tracks with a
   *gradient* fill, subtle inner glow at the leading edge, and a slow sheen sweep.
   The cast bar's fill runs ether→arcana — make it the signature element of the
   whole design. Bar value changes animate (~120 ms), damage flashes a brighter
   "loss" segment before draining (fighting-game style).
5. **Choreographed feedback.** Damage numbers spring-pop (scale 0.6→1 with
   `--ease-spring`) then drift and fade; card hit = 1px shake + edge flash in
   `--wound`; heal = soft `--life` bloom; cooldowns = `conic-gradient` radial wipe
   (the web does natively what Godot needed a shader for); enemy death =
   desaturate + collapse; respawn = fade-up. Keys 1/2/3 visibly depress buttons.
6. **Restraint is the quality bar.** Motion 140–400 ms, nothing loops loudly,
   `--ember` appears only where gold appears. Full
   `@media (prefers-reduced-motion: reduce)` support: kill drift/sheen/springs,
   keep instant state changes. Contrast ≥ 4.5:1 for text.

### Layout (functionally Melvor, visually not)

1280-wide desktop target, fluid down to ~900 px. Left rail (~230 px): brand
"MYTHREACH" in Fraunces, nav — Combat active (edge-glow indicator, not a colored
stripe), then Woodcutting/Fishing/Mining/Smithing/Shop/Bank dimmed with a
"soon" affordance. Top strip: page title + kills (dim) + gold (`--ember`).
Main: Hero and Cave Golem cards side by side (portrait, HP readout + bar, enemy
swing bar, DoT chip with live countdown, respawn countdown state), combat log
panel (color-coded, auto-scroll, newest-line fade-in), and bottom-center the cast
bar above three 64 px ability buttons with keybind tags and cooldown wipes.
Portraits: redraw as inline SVG components in a *consistent new style* — pick one
(duotone line-art with a glow, or faceted low-poly flats) and apply it to hero,
golem, and the three ability icons alike. Don't copy the Godot SVGs.

---

## Milestones (commit after each; keep tests green from M1 on)

- **M0 — Bootstrap.** Phase 0 env, scaffold, prune demo, strict tsconfig, Vitest
  wired, one smoke test, README stub. ✓ `npm run dev|build|test|check` all work.
- **M1 — Engine + contract.** Port the full test list above; implement
  `src/engine/` until green. ✓ all tests pass; no DOM imports anywhere in
  `src/engine` (grep for it).
- **M2 — Design system + static shell.** tokens.css, fonts, background, glass
  panels, layout with mocked data, portraits/icons. ✓ screenshot review: it must
  already look striking with zero interactivity.
- **M3 — Wire it.** Loop + store bridge, keybinds/clicks, bars, cast bar, cooldown
  wipes, damage numbers, log, death/respawn states. ✓ full loop playable.
- **M4 — Juice + a11y pass.** Feedback choreography (principle 5), reduced-motion,
  focus/keyboard audit, tab-background catch-up clamp. ✓ `npm run shots` output
  reviewed; gzipped JS < 80 KB (`npm run build` report).
- **M5 — Verify + document.** Playwright `shots` script (boot preview server,
  simulate keys 2→1→3 on the same timeline as the Godot `tools/screenshot.gd`:
  press at 0.4 s/0.6 s/4.0 s, capture at ~1.7 s/3.4 s/5.0 s), README (run/play/
  architecture), final screenshots committed to `docs/`. ✓ definition of done.

**Definition of done:** tests + check green; the game plays the full
kill/death/respawn loop bug-free at 60 fps; visual identity is clearly *not*
Melvor/Bootstrap; reduced-motion works; three committed screenshots; README lets
a stranger run it in two commands; every milestone committed.

## Pitfalls (learned the hard way — don't relearn)

- **Engine purity** is the whole ballgame. If a `document` or Svelte import sneaks
  into `src/engine/`, stop and fix the design.
- Integer ticks everywhere in the engine; milliseconds exist only in the rAF loop.
  Never accumulate floats in game logic.
- Test timing at boundaries: "damage at tick 44, none at 43" — exact ticks are
  the point of the tick refactor.
- Cast bar / conditional UI must not reflow the action bar — reserve space, fade
  opacity (the Godot build hit this; same fix works).
- Drain engine events exactly once per frame; don't also derive one-shot effects
  from snapshot diffs or you'll double-fire splashes.
- Self-host fonts (@fontsource); no CDN links, no FOUT flash of Times New Roman —
  `font-display: swap` + preload the two variable font files.
- `backdrop-filter` needs a non-transparent fallback; check both.
- Playwright: `npx playwright install chromium` first run; headless screenshots
  need `--force-color-profile` consistency only if colors look off.

## Context you may want later

- Godot reference implementation: `~/work/prototype_game` (also
  github.com/zombienexu/Mythreach) — `PLAN.md` (spec source), `HANDOFF.md`
  (workflow/gotchas), `docs/GAME_CONCEPT.md` (the vision this prototype serves:
  "idle when you're away, an RPG when you're here"; premium model; web demo →
  Steam → mobile). The web pivot exists because the web build *is* the demo.
- The user's global workflow (planner/executor with a local model) is described in
  `~/.claude/CLAUDE.md`; like the Godot v0, **this build is Claude-direct,
  end-to-end** — the user asked for it explicitly. Tests-as-contract still applies.
- Ask the user only for: GitHub remote when they want to push, and any taste calls
  where you genuinely can't decide within the "Arcane Observatory" brief.
