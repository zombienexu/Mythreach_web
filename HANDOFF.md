# HANDOFF.md — Mythreach Web

> **You are a fresh Claude Code session.** This file is everything you need to
> pick up the project exactly where it stands. Read it, run the checkpoint
> commands, and you're oriented. (`WEB_PIVOT_PLAN.md` is the original build
> brief this repo was built from — background reading only; this file
> supersedes it as the entry point.)

## What this is, and where it stands

Mythreach Web is the **v0 combat prototype** of an idle/incremental RPG
("idle when you're away, an RPG when you're here" — see README for the full
concept). One encounter (Hero vs. Cave Golem), three abilities (Fireball /
Ignite / Renew), kill→gold→respawn loop, in a bespoke "Arcane Observatory"
glass-and-void visual identity.

**Status: v0 is complete and frozen.** All six planned milestones (M0–M5) are
built, verified, and committed; the repo is pushed to
`github.com/zombienexu/Mythreach_web` (branch `master`). There is no
in-flight work and no known bug. Whatever you do next is *new* scope the user
asks for — do not invent features unprompted, and do not touch the frozen v0
rules without an explicit request.

## Environment (read this first — it's non-obvious)

- **Node is NOT on the default PATH.** It's a local tarball install (v24.18.0
  LTS). Every shell command needs:

  ```sh
  export PATH="$HOME/.local/node/node-v24.18.0-linux-x64/bin:$PATH"
  ```

  The user was asked to add this to `~/.zshrc`; check with `which node`
  before assuming. Do **not** try `curl | bash` installers or editing
  `~/.zshrc` yourself — the permission classifier blocks both (learned the
  hard way). Official tarballs from nodejs.org download fine.
- **Playwright chromium is already installed** (`~/.cache/ms-playwright`).
  If a fresh machine: `npx playwright install chromium`.
- Platform: Ubuntu, zsh, no sudo assumed.

## The contract (keep these green at all times)

```sh
npm test        # 42 Vitest cases — the behavioral spec, written before the engine
npm run check   # svelte-check + tsc, strict, 0 errors 0 warnings
```

Two hard rules beyond the scripts:

1. **Engine purity.** `src/engine/` must never import DOM, Svelte, or
   `window`. Verify: `grep -rnE "document|window|svelte" src/engine/` → empty.
2. **Integer ticks.** The engine runs at 20 ticks/s (50 ms); every duration
   is an exact tick count. Milliseconds exist only in `src/ui/loop.ts`.
   Never accumulate floats in game logic.

## Frozen v0 rules (the tests pin all of this)

- Hero 100 HP. Cave Golem 80 HP, swings every 44 ticks for 5–9 (uniform int).
- Fireball: 50-tick cast, 16–24 damage. Ignite: instant, 160-tick CD, DoT
  4 dmg × 6 ticks at 20-tick intervals. Renew: 36-tick cast, 100-tick CD,
  heals 18–26 clamped.
- One cast at a time, no queueing/GCD. Offensive abilities need a living
  enemy to *start*; if the enemy dies mid-cast the cast completes but
  **fizzles**. Cooldowns start at *resolve*.
- Kill: +1 kill, +10 gold, DoTs cleared, respawn at +60 ticks. Player death:
  cast cancelled, DoTs cleared, enemy idles, revive at +60 ticks with a fresh
  full-HP enemy. Damage event precedes death event on a killing blow.

## Architecture map

```
src/engine/          pure TS simulation (portable, will outlive the UI)
  types.ts           AbilityId/Side/EncounterConfig/CombatSnapshot, DEFAULT_CONFIG, tick constants
  events.ts          CombatEvent discriminated union — the UI's only one-shot channel
  abilities.ts       the three abilities as plain typed data; engine interprets
  combatant.ts       HP pool w/ clamp rules      dot.ts  DoT instance w/ refresh
  rng.ts             mulberry32 + rollInt (seeded in tests, Math.random in game)
  engine.ts          CombatEngine: tick() → CombatEvent[], useAbility(), canUse(), snapshot()
  index.ts           barrel

src/ui/
  loop.ts            rAF + accumulator; steps engine per 50 ms; catch-up clamped to 2 s/frame
  game.svelte.ts     Game store (runes class): drains events ONCE per tick into
                     log entries, float numbers, impact/bloom counters; keydown 1/2/3
  format.ts          ticksToSeconds
  styles/tokens.css  the design tokens — single source of truth, don't fork values
  styles/base.css    @font-face (public/fonts), reset, .glass panel, reduced-motion kill-switch
  components/        Background, Sidebar, TopBar, Bar, CombatantCard, CombatLog,
                     ActionBar, AbilityButton, icons/AbilityIcon, portraits/*

tests/               the contract; helpers.ts has makeEngine(overrides, seed) + advance()
tools/shots.mjs      npm run shots — builds, boots preview, plays keys 2→1→3, writes docs/shot-{1,2,3}.png
```

Data flow: `loop` ticks engine → `Game.onEvent()` fans events into UI state →
components render from `game.snap` (fresh `snapshot()` published only on
frames where ≥1 tick ran). **Never derive one-shot effects from snapshot
diffs** — that double-fires; events are the only trigger for
splashes/log/shake.

## Design identity — "Arcane Observatory" (don't drift)

Luminous glass panes over a living void; deep, translucent, lit from within.
Everything is tokened in `tokens.css`: `--ether` (teal: player/casts),
`--arcana` (violet: DoT/magic), `--ember` (gold — **currency ONLY**),
`--life`/`--wound` vitals, glass + edge vars. Principles that shipped and
must survive edits: gradient-fill bars with a trailing bright "loss" layer;
ether→arcana cast bar (the signature element); conic-gradient cooldown wipes;
spring-pop damage floats; hit-shake/heal-bloom via one-shot `pulse()` classes
in `CombatantCard`; Fraunces for display type, Inter elsewhere, tabular nums
on every number; full `prefers-reduced-motion` support; conditional UI
reserves space and fades opacity (cast slot) — **never reflow the action bar**.

Fonts are self-hosted in `public/fonts/` and preloaded from `index.html` —
keep them out of Vite's hashed pipeline or the preload links break.

## Verification workflow that worked well

- Unit level: `npm test` (add exact-tick boundary cases for any new rule —
  "damage at tick 44, none at 43").
- App level: short throwaway Playwright drivers (boot vite dev server via JS
  API with `port: 0`, `page.keyboard.press`, read `.log li .text` /
  `.hp` / `.stat.gold .num`, screenshot to the scratchpad, view the PNG).
  `tools/shots.mjs` is the committed template for this pattern. Note: scripts
  must live inside the repo or `import 'playwright'` won't resolve.
- Perf/size: `npm run build` prints gzip sizes — JS budget is **< 80 KB**
  (currently ~23 KB).

## Known quirks & gotchas

- Svelte 5: reading a `$state` prop during component init trips the
  `state_referenced_locally` warning — track previous values inside
  `$effect` (see the `wasAlive` pattern in `CombatantCard.svelte`).
- One-shot CSS animations are re-armed by `classList.remove` → force reflow
  (`void el.offsetWidth`) → `add` (the `pulse()` helper). Don't convert to
  reactive classes; they won't restart on repeat hits.
- `.gold` is both a TopBar chip class and a log-entry tone class — scope
  selectors (`.stat.gold`) in tests/drivers.
- Vitest runs only `tests/**/*.test.ts` (see `vite.config.ts`).
- Commit messages so far follow "Mx: summary" — keep milestone-style
  prefixes if the user starts new scoped work.

## Where the game goes next (when the user asks)

The concept roadmap (see README "Where this goes next") calls v0 → vertical
slice: GCD + spell queueing, enemy mechanics, 6–8 abilities/loadouts, XP and
gear, zones, idle auto-resolve, **save/offline progress** (the deterministic
tick engine can replay elapsed time — design for it), sound. The engine's
data-driven `abilities.ts` and config-driven encounter setup were shaped so
content scales without touching the core `tick()` logic. Balance work should
use the headless engine in Monte-Carlo sims.
