# Mythreach Web

A TypeScript/Svelte rebuild of the Mythreach combat prototype — "idle when
you're away, an RPG when you're here." One encounter, three abilities, and an
"Arcane Observatory" interface: luminous glass panes floating over a living
void.

![Combat mid-fight](docs/shot-1.png)

## Run it

```sh
npm install
npm run dev
```

## Play

Fight the Cave Golem. Abilities by key or click:

| Key | Ability | What it does |
|-----|----------|--------------|
| `1` | Fireball | 2.5 s cast, 16–24 damage |
| `2` | Ignite | Instant DoT: 4 damage/s for 6 s; 8 s cooldown |
| `3` | Renew | 1.8 s cast, heals 18–26; 5 s cooldown |

One cast at a time. The golem swings every 2.2 s for 5–9. Kills pay 10 gold;
both sides respawn 3 s after death.

## Scripts

- `npm run dev` — dev server
- `npm run build` / `npm run preview` — production build / serve it
- `npm test` — the engine contract (Vitest, 42 tests)
- `npm run check` — svelte-check + tsc, strict
- `npm run shots` — build + headless Playwright screenshots into `docs/`
  (first run: `npx playwright install chromium`)

## Architecture

```
src/engine/   pure TypeScript simulation — no DOM, no Svelte, no window
src/ui/       Svelte 5 (runes) presentation over the engine
tests/        the behavioral contract, written before the engine
```

The engine is a fixed-timestep integer simulation: **20 ticks per second**,
every duration an exact tick count (fireball 50, golem swing 44, respawn 60).
`CombatEngine.tick()` advances one tick and returns a `CombatEvent[]` — a
discriminated union that is the UI's only source of one-shot happenings
(damage numbers, log lines, deaths). `snapshot()` exposes renderable state
(HP, cast/swing progress, cooldowns). RNG is injected (seeded mulberry32 in
tests, `Math.random` in game), so every rule in the spec is pinned by an
exact-tick test.

The UI runs a `requestAnimationFrame` accumulator loop (`src/ui/loop.ts`)
that steps the engine per elapsed 50 ms — catch-up clamped to ~2 s per frame,
so a backgrounded tab fast-forwards briefly instead of spiralling — and a
reactive `Game` store (`src/ui/game.svelte.ts`) that drains events exactly
once per tick into log entries and effect choreography. Styling is vanilla
modern CSS (custom properties, `oklch()`, `color-mix()`, conic-gradient
cooldown wipes) with zero runtime dependencies; fonts are self-hosted
variable Fraunces + Inter. Full `prefers-reduced-motion` support.

More shots: [docs/shot-2.png](docs/shot-2.png), [docs/shot-3.png](docs/shot-3.png).
