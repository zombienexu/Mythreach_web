# Mythreach Web

TypeScript/Svelte rebuild of the Mythreach combat prototype (v0). Pure-TS combat
engine under `src/engine/`, Svelte 5 UI on top. See `WEB_PIVOT_PLAN.md` for the
full brief.

## Run

```sh
npm install
npm run dev
```

## Scripts

- `npm run dev` — dev server
- `npm run build` / `npm run preview` — production build / serve it
- `npm test` — Vitest contract suite
- `npm run check` — svelte-check + tsc
- `npm run shots` — Playwright screenshots (M5)
