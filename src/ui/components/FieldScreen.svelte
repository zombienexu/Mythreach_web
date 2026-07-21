<script lang="ts">
  /** THE FIELD — the exploration screen, played on the ground itself.
   *
   *  Every sighting the front turned up stands somewhere on this screen: a lone
   *  mob is one figure, a warband is its whole formation bundled together, and
   *  each of them wears its own plate — name, level, threat, what it pays.
   *  Nothing is lined up in a row of four cards any more; you are looking at a
   *  clearing, scattered right to left, and choosing where to walk.
   *
   *  The one rule that makes the choice interesting: **proximity**. Groups
   *  standing inside each other's watch (the aggro ring) come as a set — pull
   *  one and every one of them turns. Hovering or marking a sighting draws that
   *  ring and wires it to whoever else it would drag in, so the price is always
   *  visible before it is paid.
   *
   *  Space walks on: the whole screen turns over for a fresh scatter. */
  import { ENEMIES } from '../../engine'
  import { AGGRO_RADIUS, RARITIES, clusterOf, type FieldState, type Offer } from '../slice/field'
  import EnemyPortrait from './portraits/EnemyPortrait.svelte'

  let {
    field,
    intro,
    onselect,
    onengage,
    onnext,
  }: {
    field: FieldState
    intro?: string
    onselect: (id: number) => void
    onengage: (id: number) => void
    onnext: () => void
  } = $props()

  /** The sighting the ring is drawn around: whatever the pointer is over, and
   *  the marked one otherwise. */
  let hovered: number | null = $state(null)
  const focusId = $derived(hovered ?? field.selectedId)

  /** Everything that would join a fight with the focused sighting. */
  const cluster = $derived(focusId === null ? [] : clusterOf(field, focusId))
  const clusterIds = $derived(new Set(cluster.map((o) => o.id)))
  /** More than one group in the ring: this is a pull, not a fight. */
  const pulls = $derived(cluster.length > 1)
  const focused = $derived(cluster[0] ?? null)

  const threatBand = (t: number): string =>
    t < 0.35 ? 'low' : t < 0.6 ? 'moderate' : t < 0.82 ? 'high' : 'lethal'
  const threatHue = (t: number): number => Math.round(200 - t * 175)

  const hasRare = $derived(field.offers.some((o) => o.rarity === 'rare' || o.rarity === 'apex'))

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

  /** Two groups standing inside each other's watch is the *point* of the
   *  field — but their name-plates would then land on top of each other and
   *  read as mush. The figures stay exactly where the model put them (the ring
   *  and the wires are geometry, and must not lie); only the plate steps down
   *  out of the way, one rung per group already crowding this spot. */
  const PLATE_STEP = 44
  const CROWD_X = 0.17
  const CROWD_Y = 0.13
  const plateDrop = $derived.by(() => {
    const drop = new Map<number, number>()
    field.offers.forEach((o, i) => {
      let rung = 0
      for (let j = 0; j < i; j++) {
        const other = field.offers[j]!
        if (Math.abs(other.x - o.x) < CROWD_X && Math.abs(other.y - o.y) < CROWD_Y) {
          rung = Math.max(rung, (drop.get(other.id) ?? 0) / PLATE_STEP + 1)
        }
      }
      drop.set(o.id, rung * PLATE_STEP)
    })
    return drop
  })
</script>

<section class="field" aria-label="The field — sightings scattered across the ground">
  <header class="field-head">
    <span class="readout">the field · sightings scattered — mark one and take it, or walk on</span>
    {#if intro}<span class="field-intro">{intro}</span>{/if}
    {#if hasRare}
      <span class="rare-flag" role="status">⚡ a rare sighting stands the field</span>
    {/if}
  </header>

  {#key field.rerolls}
    <div class="ground" role="group" aria-label="Sightings — Tab to mark, Enter or click to engage">
      <!-- the aggro geometry, drawn in the same normalized space the field
           model reasons in: the ring around the focused sighting, and a wire to
           everyone it would drag in with it. -->
      <svg class="wires" viewBox="0 0 100 100" preserveAspectRatio="none" aria-hidden="true">
        {#if focused}
          <ellipse
            class="ring"
            class:danger={pulls}
            cx={focused.x * 100}
            cy={focused.y * 100}
            rx={AGGRO_RADIUS * 100}
            ry={AGGRO_RADIUS * 100}
          />
          {#each cluster.slice(1) as o (o.id)}
            <line class="wire" x1={focused.x * 100} y1={focused.y * 100} x2={o.x * 100} y2={o.y * 100} />
          {/each}
        {/if}
      </svg>

      {#each field.offers as o, i (o.id)}
        {@const fig = layout(o)}
        {@const rar = RARITIES[o.rarity]}
        {@const inRing = clusterIds.has(o.id)}
        {@const dragged = inRing && o.id !== focusId}
        <button
          class="sighting rarity-{o.rarity}"
          class:marked={o.id === field.selectedId}
          class:dragged
          class:quiet={focusId !== null && !inRing}
          style:left="{o.x * 100}%"
          style:top="{o.y * 100}%"
          style:z-index={Math.round(o.y * 100) + (inRing ? 200 : 0)}
          style:--s={depth(o)}
          style:--rh={rar.hue}
          style:--i={i}
          onpointerenter={() => (hovered = o.id)}
          onpointerleave={() => (hovered = null)}
          onfocus={() => (hovered = o.id)}
          onblur={() => (hovered = null)}
          onclick={() => onengage(o.id)}
          oncontextmenu={(e) => {
            e.preventDefault()
            onselect(o.id)
          }}
          aria-label="{o.title}, {rar.name}, level {o.level}, {o.size} {o.size === 1 ? 'foe' : 'foes'}, {o.xp} xp{dragged ? ' — would be pulled in' : ''}"
        >
          <span class="bundle">
            {#each o.roster as id, k (k)}
              {@const m = ENEMIES[id]}
              {@const p = fig[k]}
              {#if m && p}
                <span
                  class="fig"
                  class:lead={id === o.headline && o.size > 1}
                  style:left="calc(50% + {p.x}px)"
                  style:top="calc(52% + {p.y}px)"
                  style:--f={p.s}
                  style:z-index={Math.round(p.y) + 40}
                >
                  <EnemyPortrait family={m.portrait.family} hue={m.portrait.hue} name={m.name} />
                </span>
              {/if}
            {/each}
          </span>

          <span class="plate" style:--drop="{plateDrop.get(o.id) ?? 0}px">
            <span class="plate-top">
              <span class="badge">{rar.name}</span>
              {#if o.hasQuestTarget}<span class="orders" title="Holds a target from your Orders">★</span>{/if}
            </span>
            <span class="title">{o.title}</span>
            <span class="line">
              <span class="lv mono">Lv {o.level}</span>
              <span class="sep">·</span>
              <span class="threat" style:--th={threatHue(o.threat)}>{threatBand(o.threat)}</span>
              <span class="sep">·</span>
              <span class="xp mono">{o.xp} xp</span>
            </span>
            {#if dragged}<span class="drag-word">joins the fight</span>{/if}
          </span>
        </button>
      {/each}
    </div>
  {/key}

  <footer class="field-foot">
    {#if pulls}
      <span class="warn" role="status">
        ⚠ {cluster.length} groups stand inside one watch — pull one and they all come
      </span>
    {:else}
      <span class="calm">clear ground — this one comes alone</span>
    {/if}
    <span class="hint">
      <kbd>Tab</kbd> mark · <kbd>Enter</kbd> or click to engage ·
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

  .wires {
    position: absolute;
    inset: 0;
    width: 100%;
    height: 100%;
    overflow: visible;
    pointer-events: none;
    z-index: 1;
  }
  .ring {
    fill: oklch(0.7 0.09 205 / 0.035);
    stroke: oklch(0.8 0.1 205 / 0.28);
    stroke-width: 0.3;
    stroke-dasharray: 1.6 1.4;
    vector-effect: non-scaling-stroke;
    animation: ring-in 320ms var(--ease-out-expo);
  }
  .ring.danger {
    fill: oklch(0.7 0.18 35 / 0.07);
    stroke: oklch(0.78 0.19 38 / 0.75);
    animation:
      ring-in 320ms var(--ease-out-expo),
      ring-warn 1.6s ease-in-out infinite 320ms;
  }
  @keyframes ring-in {
    from {
      opacity: 0;
    }
  }
  @keyframes ring-warn {
    50% {
      stroke-opacity: 0.35;
    }
  }
  .wire {
    stroke: oklch(0.78 0.19 38 / 0.55);
    stroke-width: 1;
    stroke-dasharray: 2 2;
    vector-effect: non-scaling-stroke;
  }

  /* ---- one sighting, standing where it stands ------------------------ */
  .sighting {
    position: absolute;
    translate: -50% -50%;
    z-index: 2;
    display: flex;
    flex-direction: column;
    align-items: center;
    gap: 2px;
    padding: 0;
    border: 0;
    background: none;
    color: inherit;
    cursor: pointer;
    scale: var(--s, 1);
    transition:
      filter 220ms ease,
      opacity 220ms ease,
      scale 220ms var(--ease-spring);
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
  .sighting:hover,
  .sighting:focus-visible {
    outline: none;
    scale: calc(var(--s, 1) * 1.06);
  }
  /* everything outside the ring recedes, so the price of this pull reads */
  .sighting.quiet {
    filter: saturate(0.5) brightness(0.72);
    opacity: 0.72;
  }
  .sighting.dragged .plate {
    border-color: oklch(0.78 0.19 38 / 0.7);
    box-shadow: 0 0 18px -6px oklch(0.75 0.19 38 / 0.8);
  }

  .bundle {
    position: relative;
    display: block;
    width: 132px;
    height: 84px;
  }
  .fig {
    position: absolute;
    translate: -50% -50%;
    width: calc(52px * var(--f, 1));
    height: calc(52px * var(--f, 1));
    filter: drop-shadow(0 4px 6px oklch(0.05 0.02 280 / 0.7));
  }
  .fig.lead {
    filter: drop-shadow(0 0 10px oklch(0.75 0.14 var(--rh) / 0.5));
  }
  .fig :global(canvas) {
    width: 100%;
    height: 100%;
  }

  /* the group's card, worn under its feet */
  .plate {
    position: relative;
    /* stepped clear of any plate already crowding this patch of ground */
    margin-top: var(--drop, 0px);
    display: flex;
    flex-direction: column;
    align-items: center;
    gap: 1px;
    padding: 5px 11px 6px;
    border-radius: 10px;
    border: 1px solid oklch(0.7 0.1 var(--rh) / 0.34);
    background:
      radial-gradient(120% 90% at 50% 0%, oklch(0.6 0.12 var(--rh) / 0.1), transparent 70%),
      linear-gradient(180deg, oklch(0.13 0.03 250 / 0.82), oklch(0.09 0.03 250 / 0.9));
    backdrop-filter: blur(6px);
    transition:
      border-color 200ms ease,
      box-shadow 200ms ease;
  }
  .sighting.marked .plate {
    border-color: oklch(0.84 0.12 var(--rh) / 0.95);
    box-shadow:
      0 0 0 1px oklch(0.84 0.12 var(--rh) / 0.45),
      0 8px 26px -14px oklch(0.6 0.14 var(--rh) / 0.9);
  }
  .sighting.rarity-apex .plate {
    border-color: oklch(0.72 0.19 25 / 0.75);
    box-shadow: 0 0 26px -8px oklch(0.74 0.2 30 / 0.9);
  }

  .plate::before {
    content: '';
    position: absolute;
    left: 50%;
    bottom: 100%;
    width: 1px;
    height: var(--drop, 0px);
    background: linear-gradient(180deg, transparent, oklch(0.7 0.06 250 / 0.4));
    pointer-events: none;
  }

  .plate-top {
    display: flex;
    align-items: center;
    gap: 5px;
  }
  .badge {
    font-family: var(--font-mono);
    font-size: 7.5px;
    letter-spacing: 0.1em;
    text-transform: uppercase;
    color: oklch(0.85 0.14 var(--rh));
  }
  .orders {
    font-size: 9px;
    color: oklch(0.82 0.14 85);
    text-shadow: 0 0 8px oklch(0.82 0.14 85 / 0.6);
  }
  .title {
    font-family: var(--font-display);
    font-size: 12.5px;
    color: var(--text);
    white-space: nowrap;
  }
  .line {
    display: flex;
    align-items: baseline;
    gap: 5px;
    font-size: 10px;
    color: var(--text-dim);
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
  .drag-word {
    font-family: var(--font-mono);
    font-size: 8px;
    letter-spacing: 0.1em;
    text-transform: uppercase;
    color: oklch(0.82 0.18 38);
  }

  /* ---- the footer: the price, and the way out ------------------------ */
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
  .warn {
    color: oklch(0.82 0.18 38);
    font-weight: 600;
  }
  .calm {
    opacity: 0.7;
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
    .bundle {
      width: 108px;
      height: 72px;
    }
  }
  @media (prefers-reduced-motion: reduce) {
    .sighting,
    .ring,
    .ring.danger,
    .rare-flag {
      animation: none;
    }
  }
</style>
