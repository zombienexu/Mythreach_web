<script lang="ts">
  /** THE FIELD — the exploration screen, played on the ground itself.
   *
   *  Every sighting the front turned up stands somewhere on this screen: a lone
   *  mob is one figure, a warband is its whole formation bundled together.
   *  Nothing is lined up in a row of four cards any more; you are looking at a
   *  clearing, scattered right to left, and choosing where to walk.
   *
   *  It is **target-first**, the way an overworld is: you Tab (or click) from
   *  body to body, each wearing its own small card — name and level — and the
   *  fight opens when you *attack*, not when you press a commit key. Nothing
   *  draws the aggro geometry any more: proximity is a thing the field teaches
   *  you by dragging the neighbours in, not a ring you read off the screen.
   *
   *  Space walks on: the whole screen turns over for a fresh scatter. */
  import { ENEMIES } from '../../engine'
  import { RARITIES, type FieldState, type Offer } from '../slice/field'
  import EnemyPortrait from './portraits/EnemyPortrait.svelte'

  let {
    field,
    intro,
    onmark,
    onnext,
  }: {
    field: FieldState
    intro?: string
    onmark: (offerId: number, index: number) => void
    onnext: () => void
  } = $props()

  const threatBand = (t: number): string =>
    t < 0.35 ? 'low' : t < 0.6 ? 'moderate' : t < 0.82 ? 'high' : 'lethal'
  const threatHue = (t: number): number => Math.round(200 - t * 175)

  const hasRare = $derived(field.offers.some((o) => o.rarity === 'rare' || o.rarity === 'apex'))

  /** The group the reticle is standing in — everything the old group plate used
   *  to carry, now read out once in the footer. */
  const markedOffer = $derived(field.offers.find((o) => o.id === field.selectedId) ?? null)

  // Where each mob stands inside its group's bundle. Templates are authored
  // back-most first, so a 'back'-row mob claims the deeper (higher, smaller)
  // slot — and the formation varies per sighting, so a warband never lines up
  // the same way twice.
  type FigPos = { x: number; y: number; s: number }
  const TEMPLATES: Record<number, FigPos[][]> = {
    1: [[{ x: 0, y: 0, s: 1 }]],
    2: [
      [{ x: -22, y: 2, s: 0.96 }, { x: 22, y: 2, s: 0.96 }], // abreast
      [{ x: 17, y: -8, s: 0.84 }, { x: -16, y: 9, s: 1 }], // echelon
      [{ x: 11, y: -9, s: 0.82 }, { x: -9, y: 10, s: 1 }], // stagger
    ],
    3: [
      [{ x: -25, y: -7, s: 0.82 }, { x: 25, y: -7, s: 0.82 }, { x: 0, y: 11, s: 1 }], // wedge
      [{ x: 0, y: -13, s: 0.8 }, { x: -24, y: 10, s: 1 }, { x: 24, y: 10, s: 1 }], // vanguard
      [{ x: 18, y: -10, s: 0.85 }, { x: -21, y: 4, s: 0.94 }, { x: 4, y: 13, s: 1 }], // cluster
      [{ x: 26, y: -12, s: 0.82 }, { x: 0, y: 0, s: 0.92 }, { x: -26, y: 12, s: 1 }], // echelon
    ],
  }

  function layout(o: Offer): FigPos[] {
    const n = Math.min(o.roster.length, 3)
    const set = TEMPLATES[n] ?? TEMPLATES[1]!
    const tpl = set[o.formation % set.length]!
    const order = o.roster
      .map((_, i) => i)
      .sort((a, b) => (o.rows[a] === 'back' ? 0 : 1) - (o.rows[b] === 'back' ? 0 : 1))
    const pos: FigPos[] = new Array(o.roster.length)
    order.forEach((mobIdx, k) => {
      pos[mobIdx] = tpl[k] ?? tpl[tpl.length - 1]!
    })
    return pos
  }

  /** Depth: a sighting further down the screen is nearer, so it stands bigger
   *  and in front. Cheap parallax, no perspective transforms. */
  const depth = (o: Offer): number => 0.78 + o.y * 0.34

  /** Every body wears its own card now, and bodies stand 20–25px apart inside a
   *  bundle — so at one height the cards read as a single smear. Same rule the
   *  group plates used to use (one rung down per card already crowding this
   *  patch of ground), but run *once over every card on the screen* in the
   *  pixels the player actually sees: within a bundle and between two sightings
   *  huddled inside each other's watch, a card is a card. Back-most first, so a
   *  back-row body keeps the higher card. The figures never move — only the
   *  card steps down out of the way, on its own leader line. */
  const CARD_STEP = 26
  /** How much room one card claims — a shade wider and taller than it draws. */
  const CARD_W = 124
  const CARD_H = 26
  /** A freak huddle must not walk a card off the bottom of the ground. */
  const MAX_RUNGS = 6
  /** the ground's real size, so the stagger reasons in screen pixels */
  let groundW = $state(1000)
  let groundH = $state(420)

  const cardDrop = $derived.by(() => {
    type Slot = { key: string; x: number; y: number; s: number; rung: number }
    const slots: Slot[] = []
    for (const o of field.offers) {
      const s = depth(o)
      const fig = layout(o)
      o.roster.forEach((_, k) => {
        const p = fig[k]
        if (!p) return
        slots.push({
          key: `${o.id}:${k}`,
          x: o.x * groundW + p.x * s,
          // the card hangs off the bottom of the body it belongs to
          y: o.y * groundH + (p.y + 26 * p.s) * s,
          s,
          rung: 0,
        })
      })
    }
    // back-most card first, then step each one down until it has this patch of
    // ground to itself — measured against where the cards already *landed*, not
    // where their bodies stand, or a dropped card lands on the next one.
    slots.sort((a, b) => a.y - b.y)
    const drop = new Map<string, number>()
    const taken: Array<{ x: number; y: number }> = []
    for (const slot of slots) {
      let y = slot.y
      while (
        slot.rung < MAX_RUNGS &&
        taken.some((t) => Math.abs(t.x - slot.x) < CARD_W && Math.abs(t.y - y) < CARD_H)
      ) {
        slot.rung++
        y = slot.y + slot.rung * CARD_STEP
      }
      taken.push({ x: slot.x, y })
      // the sighting is scaled by depth, so undo it: a rung is CARD_STEP real
      // pixels whether the body stands on the horizon or right in front of you.
      drop.set(slot.key, (slot.rung * CARD_STEP) / slot.s)
    }
    return drop
  })
</script>

<section class="field" aria-label="The field — sightings scattered across the ground">
  <header class="field-head">
    <span class="readout">the field · sightings scattered — mark your quarry and swing, or walk on</span>
    {#if intro}<span class="field-intro">{intro}</span>{/if}
    {#if hasRare}
      <span class="rare-flag" role="status">⚡ a rare sighting stands the field</span>
    {/if}
  </header>

  {#key field.rerolls}
    <div
      class="ground"
      role="group"
      aria-label="Sightings — Tab to mark a foe, Q opens the fight"
      bind:clientWidth={groundW}
      bind:clientHeight={groundH}
    >
      {#each field.offers as o, i (o.id)}
        {@const fig = layout(o)}
        {@const rar = RARITIES[o.rarity]}
        <div
          class="sighting rarity-{o.rarity}"
          class:marked={o.id === field.selectedId}
          style:left="{o.x * 100}%"
          style:top="{o.y * 100}%"
          style:z-index={Math.round(o.y * 100) + (o.id === field.selectedId ? 200 : 0)}
          style:--s={depth(o)}
          style:--rh={rar.hue}
          style:--i={i}
        >
          {#each o.roster as id, k (k)}
            {@const m = ENEMIES[id]}
            {@const p = fig[k]}
            {#if m && p}
              {@const mark = o.id === field.selectedId && k === field.selectedIndex}
              <button
                class="mob"
                class:marked={mark}
                class:lead={id === o.headline && o.size > 1}
                style:left="calc(50% + {p.x}px)"
                style:top="calc(52% + {p.y}px)"
                style:--f={p.s}
                style:z-index={Math.round(p.y) + 40 + (mark ? 60 : 0)}
                onfocus={() => onmark(o.id, k)}
                onclick={() => onmark(o.id, k)}
                aria-label="{m.name}, level {m.level} — {o.title}, {rar.name}"
                aria-pressed={mark}
              >
                <span class="fig">
                  <EnemyPortrait family={m.portrait.family} hue={m.portrait.hue} name={m.name} />
                </span>
                <span class="card" style:--drop="{cardDrop.get(`${o.id}:${k}`) ?? 0}px">
                  {#if o.hasQuestTarget}<span class="orders" title="A target from your Orders">★</span>{/if}
                  <span class="name">{m.name}</span>
                  <span class="lv mono">Lv {m.level}</span>
                </span>
              </button>
            {/if}
          {/each}
        </div>
      {/each}
    </div>
  {/key}

  <footer class="field-foot">
    {#if markedOffer}
      {@const rar = RARITIES[markedOffer.rarity]}
      <span class="group-read" style:--rh={rar.hue} role="status">
        <span class="badge">{rar.name}</span>
        <span class="title">{markedOffer.title}</span>
        <span class="sep">·</span>
        <span>{markedOffer.size} {markedOffer.size === 1 ? 'foe' : 'foes'}</span>
        <span class="sep">·</span>
        <span class="threat" style:--th={threatHue(markedOffer.threat)}>{threatBand(markedOffer.threat)}</span>
        <span class="sep">·</span>
        <span class="xp mono">{markedOffer.xp} xp</span>
      </span>
    {/if}
    <span class="hint">
      <kbd>Tab</kbd> mark · <kbd>Q</kbd> or a working opens the fight ·
      <button class="walk" onclick={onnext}><kbd>Space</kbd> walk on</button>
    </span>
  </footer>
</section>

<style>
  .field {
    position: relative;
    display: flex;
    flex-direction: column;
    gap: 8px;
    width: 100%;
    height: 100%;
    min-height: 340px;
  }
  .field-head {
    display: flex;
    align-items: baseline;
    gap: 12px;
    justify-content: center;
    text-align: center;
    flex-wrap: wrap;
    flex: none;
  }
  .field-intro {
    font-size: 12px;
    font-style: italic;
    color: var(--text-dim);
  }
  .rare-flag {
    font-family: var(--font-mono);
    font-size: 10px;
    letter-spacing: 0.08em;
    text-transform: uppercase;
    color: oklch(0.82 0.16 275);
    animation: rare-pulse 1.8s ease-in-out infinite;
  }
  @keyframes rare-pulse {
    50% {
      opacity: 0.5;
    }
  }

  /* the ground: everything below is placed in normalized field coordinates */
  .ground {
    position: relative;
    flex: 1;
    min-height: 260px;
    margin: 6px clamp(40px, 6vw, 96px) 34px;
  }

  /* ---- one sighting, standing where it stands ------------------------ */
  .sighting {
    position: absolute;
    translate: -50% -50%;
    z-index: 2;
    width: 132px;
    height: 84px;
    scale: var(--s, 1);
    animation: sighting-in 460ms var(--ease-out-expo) both;
    animation-delay: calc(var(--i) * 60ms);
  }
  @keyframes sighting-in {
    from {
      opacity: 0;
      translate: -50% -34%;
      filter: brightness(1.7);
    }
  }

  /* ---- one mob: a body, and the card it wears ------------------------ */
  .mob {
    position: absolute;
    translate: -50% -50%;
    width: calc(52px * var(--f, 1));
    height: calc(52px * var(--f, 1));
    padding: 0;
    border: 0;
    background: none;
    color: inherit;
    cursor: pointer;
    /* the card hangs below the body — the button box is the figure alone, so
       the figures stand exactly where the formation put them */
    overflow: visible;
    transition:
      filter 200ms ease,
      opacity 200ms ease,
      scale 200ms var(--ease-spring);
  }
  .mob:hover,
  .mob:focus-visible {
    outline: none;
    scale: 1.08;
  }
  .fig {
    position: absolute;
    inset: 0;
    filter: drop-shadow(0 4px 6px oklch(0.05 0.02 280 / 0.7));
  }
  .mob.lead .fig {
    filter: drop-shadow(0 0 10px oklch(0.75 0.14 var(--rh) / 0.5));
  }
  .fig :global(canvas) {
    width: 100%;
    height: 100%;
  }

  /* the mob's own card, worn under its feet and stepped clear of any card
     already crowding this patch of ground */
  .card {
    position: absolute;
    top: 100%;
    left: 50%;
    translate: -50% 0;
    /* clear of the body's own glow, then down its leader line */
    margin-top: calc(8px + var(--drop, 0px));
    display: flex;
    align-items: baseline;
    gap: 4px;
    white-space: nowrap;
    padding: 2px 7px 3px;
    border-radius: 7px;
    border: 1px solid oklch(0.7 0.1 var(--rh) / 0.3);
    background: linear-gradient(180deg, oklch(0.13 0.03 250 / 0.86), oklch(0.09 0.03 250 / 0.92));
    backdrop-filter: blur(6px);
    opacity: 0.78;
    transition:
      border-color 180ms ease,
      opacity 180ms ease,
      box-shadow 180ms ease;
  }
  .card::before {
    content: '';
    position: absolute;
    left: 50%;
    bottom: 100%;
    width: 1px;
    height: calc(8px + var(--drop, 0px));
    background: linear-gradient(180deg, transparent, oklch(0.7 0.06 250 / 0.35));
    pointer-events: none;
  }
  .mob:hover .card,
  .mob:focus-visible .card {
    opacity: 1;
  }
  .mob.marked .card {
    opacity: 1;
    border-color: oklch(0.84 0.12 var(--rh) / 0.95);
    box-shadow:
      0 0 0 1px oklch(0.84 0.12 var(--rh) / 0.45),
      0 8px 26px -14px oklch(0.6 0.14 var(--rh) / 0.9);
  }
  .name {
    font-family: var(--font-display);
    font-size: 9.5px;
    color: var(--text);
  }
  .mob.marked .name {
    color: oklch(0.94 0.05 var(--rh));
  }
  .lv {
    font-size: 8.5px;
    color: var(--text-dim);
  }
  .orders {
    font-size: 8.5px;
    color: oklch(0.82 0.14 85);
    text-shadow: 0 0 8px oklch(0.82 0.14 85 / 0.6);
  }

  /* ---- the footer: what you have marked, and the way out ------------- */
  .field-foot {
    flex: none;
    display: flex;
    align-items: center;
    justify-content: center;
    gap: 16px;
    flex-wrap: wrap;
    font-size: 11px;
    color: var(--text-dim);
  }
  .group-read {
    display: inline-flex;
    align-items: baseline;
    gap: 6px;
  }
  .badge {
    font-family: var(--font-mono);
    font-size: 8px;
    letter-spacing: 0.1em;
    text-transform: uppercase;
    color: oklch(0.85 0.14 var(--rh));
  }
  .title {
    font-family: var(--font-display);
    font-size: 12px;
    color: var(--text);
  }
  .sep {
    opacity: 0.45;
  }
  .threat {
    color: oklch(0.78 0.14 var(--th));
    text-transform: capitalize;
  }
  .xp {
    color: var(--signal);
  }
  .hint {
    display: inline-flex;
    align-items: center;
    gap: 6px;
    opacity: 0.9;
  }
  kbd {
    font-family: var(--font-mono);
    font-size: 9.5px;
    padding: 1px 6px;
    border-radius: 5px;
    border: 1px solid oklch(0.72 0.19 45 / 0.35);
    background: oklch(0.72 0.19 45 / 0.08);
  }
  .walk {
    display: inline-flex;
    align-items: center;
    gap: 5px;
    border: 0;
    background: none;
    color: inherit;
    font-size: inherit;
    cursor: pointer;
    padding: 0;
  }
  .walk:hover {
    color: var(--text);
  }

  @media (max-width: 1000px) {
    .ground {
      margin-inline: 12px;
    }
    .sighting {
      width: 108px;
      height: 72px;
    }
  }
  @media (prefers-reduced-motion: reduce) {
    .sighting,
    .rare-flag {
      animation: none;
    }
  }
</style>
