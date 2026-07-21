<script lang="ts">
  import { ENEMIES } from '../../engine'
  import EnemyPortrait from './portraits/EnemyPortrait.svelte'
  import { RARITIES, type Offer } from '../slice/field'

  let {
    offers,
    selectedId,
    rerolls,
    intro,
    onselect,
    onengage,
  }: {
    offers: Offer[]
    selectedId: number | null
    rerolls: number
    intro?: string
    onselect: (id: number) => void
    onengage: (id: number) => void
  } = $props()

  const threatBand = (t: number): string =>
    t < 0.35 ? 'low' : t < 0.6 ? 'moderate' : t < 0.82 ? 'high' : 'lethal'
  const threatHue = (t: number): number => Math.round(200 - t * 175)

  const hasRare = $derived(offers.some((o) => o.rarity === 'rare' || o.rarity === 'apex'))

  // Where each mob stands on a card. Templates are authored back-most first, so
  // a 'back'-row mob claims the deeper (higher, smaller) slot — and the chosen
  // formation varies per sighting, so a group never lines up the same way twice.
  type FigPos = { x: number; y: number; s: number }
  const TEMPLATES: Record<number, FigPos[][]> = {
    1: [[{ x: 0, y: 0, s: 1 }]],
    2: [
      [{ x: -27, y: 3, s: 0.96 }, { x: 27, y: 3, s: 0.96 }], // abreast
      [{ x: 21, y: -9, s: 0.84 }, { x: -20, y: 11, s: 1 }], // echelon
      [{ x: 13, y: -11, s: 0.82 }, { x: -11, y: 12, s: 1 }], // stagger
    ],
    3: [
      [{ x: -31, y: -8, s: 0.82 }, { x: 31, y: -8, s: 0.82 }, { x: 0, y: 14, s: 1 }], // wedge
      [{ x: 0, y: -16, s: 0.8 }, { x: -30, y: 12, s: 1 }, { x: 30, y: 12, s: 1 }], // vanguard
      [{ x: 22, y: -12, s: 0.85 }, { x: -26, y: 5, s: 0.94 }, { x: 5, y: 16, s: 1 }], // cluster
      [{ x: 32, y: -15, s: 0.82 }, { x: 0, y: 0, s: 0.92 }, { x: -32, y: 15, s: 1 }], // echelon
    ],
  }

  function layout(o: Offer): FigPos[] {
    const n = Math.min(o.roster.length, 3)
    const set = TEMPLATES[n] ?? TEMPLATES[1]!
    const tpl = set[o.formation % set.length]!
    // back-row mobs take the back-most (earlier) template slots
    const order = o.roster
      .map((_, i) => i)
      .sort((a, b) => (o.rows[a] === 'back' ? 0 : 1) - (o.rows[b] === 'back' ? 0 : 1))
    const pos: FigPos[] = new Array(o.roster.length)
    order.forEach((mobIdx, k) => {
      pos[mobIdx] = tpl[k] ?? tpl[tpl.length - 1]!
    })
    return pos
  }
</script>

<section class="field" aria-label="The field — sightings">
  <header class="field-head">
    <span class="readout">the field · sightings detected — size them up, choose your fight</span>
    {#if intro}<span class="field-intro">{intro}</span>{/if}
    {#if hasRare}
      <span class="rare-flag" role="status">⚡ a rare sighting stands the field</span>
    {/if}
  </header>

  {#key rerolls}
    <div class="cards">
      {#each offers as o, i (o.id)}
        {@const fig = layout(o)}
        {@const rar = RARITIES[o.rarity]}
        <div
          class="card rarity-{o.rarity}"
          class:sel={o.id === selectedId}
          style:--rh={rar.hue}
          style:--i={i}
        >
          <button
            class="pick"
            aria-pressed={o.id === selectedId}
            aria-label="{o.title}, {rar.name}, level {o.level}, {o.xp} xp"
            onclick={() => onselect(o.id)}
          >
            <span class="badge">{rar.name}</span>
            {#if o.hasQuestTarget}<span class="orders" title="Holds a target from your Orders">★ Orders</span>{/if}

            <span class="face">
              {#each o.roster as id, k (k)}
                {@const m = ENEMIES[id]}
                {@const p = fig[k]}
                {#if m && p}
                  <span
                    class="fig"
                    class:lead={id === o.headline && o.size > 1}
                    style:left="calc(50% + {p.x}px)"
                    style:top="calc(52% + {p.y}px)"
                    style:--s={p.s}
                    style:z-index={Math.round(p.y) + 40}
                  >
                    <EnemyPortrait family={m.portrait.family} hue={m.portrait.hue} name={m.name} />
                  </span>
                {/if}
              {/each}
            </span>

            <span class="title">{o.title}</span>

            <div class="stats">
              <div class="stat">
                <span class="k">lvl</span>
                <span class="v mono">{o.level}</span>
              </div>
              <div class="stat threat">
                <span class="k">threat</span>
                <span class="threat-meter"
                  ><span class="threat-fill" style:width="{Math.round(o.threat * 100)}%"></span></span
                >
                <span class="v" style:--th={threatHue(o.threat)}>{threatBand(o.threat)}</span>
              </div>
            </div>

            <div class="rewards">
              <span class="xp"><span class="num">{o.xp}</span> xp</span>
              <span class="gold ember mono">{o.goldMin}–{o.goldMax}g</span>
            </div>
          </button>

          <button class="engage" onclick={() => onengage(o.id)}>Engage ▸</button>
        </div>
      {/each}
    </div>
  {/key}

  <p class="hint">
    click a sighting to mark it · <kbd>Space</kbd> or <kbd>Enter</kbd> to engage · clear it and the field rotates
  </p>
</section>

<style>
  .field {
    display: flex;
    flex-direction: column;
    gap: 14px;
    width: 100%;
    max-width: 940px;
    margin-inline: auto;
    padding-top: 6px;
  }
  .field-head {
    display: flex;
    align-items: baseline;
    gap: 12px;
    justify-content: center;
    text-align: center;
    flex-wrap: wrap;
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

  .cards {
    display: flex;
    gap: 12px;
    justify-content: center;
    flex-wrap: wrap;
  }

  .card {
    position: relative;
    width: 208px;
    display: flex;
    flex-direction: column;
    border-radius: 14px;
    border: 1px solid oklch(0.7 0.1 var(--rh) / 0.32);
    background:
      radial-gradient(120% 60% at 50% 0%, oklch(0.6 0.12 var(--rh) / 0.08), transparent 70%),
      linear-gradient(180deg, oklch(0.13 0.03 250 / 0.6), oklch(0.1 0.03 250 / 0.75));
    box-shadow: 0 0 0 1px oklch(0.7 0.1 var(--rh) / 0.06);
    overflow: hidden;
    animation: card-in 420ms var(--ease-out-expo) both;
    animation-delay: calc(var(--i) * 70ms);
  }
  @keyframes card-in {
    from {
      opacity: 0;
      transform: translateY(14px) scale(0.96);
      filter: brightness(1.6);
    }
  }
  .card.sel {
    border-color: oklch(0.82 0.12 var(--rh) / 0.9);
    box-shadow:
      0 0 0 1px oklch(0.82 0.12 var(--rh) / 0.5),
      0 10px 30px -14px oklch(0.6 0.14 var(--rh) / 0.8);
  }
  /* the rarer the sighting, the more it announces itself */
  .card.rarity-rare {
    box-shadow: 0 0 22px -8px oklch(0.7 0.16 275 / 0.7);
  }
  .card.rarity-apex {
    border-color: oklch(0.72 0.19 25 / 0.7);
    box-shadow: 0 0 30px -6px oklch(0.72 0.2 30 / 0.85);
    animation:
      card-in 420ms var(--ease-out-expo) both,
      apex-breathe 2.6s ease-in-out infinite 500ms;
  }
  @keyframes apex-breathe {
    50% {
      box-shadow: 0 0 40px -2px oklch(0.75 0.21 34 / 0.95);
    }
  }

  .pick {
    display: flex;
    flex-direction: column;
    align-items: center;
    gap: 8px;
    padding: 14px 12px 12px;
    border: 0;
    background: none;
    cursor: pointer;
    color: inherit;
  }
  .badge {
    position: absolute;
    top: 9px;
    left: 9px;
    font-family: var(--font-mono);
    font-size: 8px;
    letter-spacing: 0.1em;
    text-transform: uppercase;
    color: oklch(0.85 0.14 var(--rh));
    border: 1px solid oklch(0.7 0.12 var(--rh) / 0.4);
    background: oklch(0.6 0.12 var(--rh) / 0.12);
    border-radius: 5px;
    padding: 2px 6px;
  }
  .orders {
    position: absolute;
    top: 9px;
    right: 9px;
    font-family: var(--font-mono);
    font-size: 8px;
    letter-spacing: 0.06em;
    text-transform: uppercase;
    color: oklch(0.82 0.14 85);
    text-shadow: 0 0 8px oklch(0.82 0.14 85 / 0.5);
  }

  /* the group stands in its formation — every mob shown, arranged by the
     sighting's chosen shape (never a fixed line). */
  .face {
    position: relative;
    width: 100%;
    height: 98px;
    margin-top: 2px;
  }
  .fig {
    position: absolute;
    translate: -50% -50%;
    width: calc(56px * var(--s, 1));
    height: calc(56px * var(--s, 1));
    filter: drop-shadow(0 3px 5px oklch(0.05 0.02 280 / 0.6));
  }
  .fig.lead {
    filter: drop-shadow(0 0 9px oklch(0.75 0.14 var(--rh) / 0.45));
  }
  .fig :global(canvas) {
    width: 100%;
    height: 100%;
  }

  .title {
    font-family: var(--font-display);
    font-size: 14px;
    color: var(--text);
    text-align: center;
    line-height: 1.2;
    min-height: 2.4em;
    display: flex;
    align-items: center;
  }

  .stats {
    width: 100%;
    display: flex;
    flex-direction: column;
    gap: 5px;
  }
  .stat {
    display: flex;
    align-items: center;
    gap: 7px;
    font-size: 11.5px;
  }
  .k {
    font-family: var(--font-mono);
    font-size: 8px;
    letter-spacing: 0.08em;
    text-transform: uppercase;
    color: var(--signal-dim);
    width: 40px;
    flex: none;
  }
  .stat .v {
    color: var(--text);
    text-transform: capitalize;
  }
  .threat .v[style] {
    color: oklch(0.78 0.14 var(--th));
  }
  .threat-meter {
    flex: 1;
    height: 4px;
    border-radius: 99px;
    background: oklch(0.85 0.03 260 / 0.12);
    overflow: hidden;
  }
  .threat-fill {
    display: block;
    height: 100%;
    border-radius: inherit;
    background: linear-gradient(90deg, oklch(0.72 0.14 205), oklch(0.72 0.18 30));
  }

  .rewards {
    width: 100%;
    display: flex;
    align-items: baseline;
    justify-content: space-between;
    padding-top: 6px;
    margin-top: 2px;
    border-top: 1px solid oklch(0.7 0.06 250 / 0.12);
  }
  .xp {
    font-size: 11px;
    color: var(--signal-dim);
  }
  .xp .num {
    font-family: var(--font-mono);
    font-size: 16px;
    color: var(--signal);
  }
  .gold {
    font-size: 11px;
  }

  .engage {
    margin: 0 12px 12px;
    padding: 8px;
    border-radius: var(--radius-sm);
    border: 1px solid var(--ember-war);
    background: linear-gradient(180deg, oklch(0.72 0.19 45 / 0.16), oklch(0.6 0.16 40 / 0.08));
    color: var(--ember-glow);
    font-family: var(--font-display);
    font-size: 13px;
    cursor: pointer;
    transition:
      filter var(--dur-fast),
      transform var(--dur-fast);
  }
  .card.sel .engage {
    box-shadow: 0 0 16px -4px oklch(0.72 0.19 45 / 0.7);
  }
  .engage:hover {
    filter: brightness(1.15);
    transform: translateY(-1px);
  }

  .hint {
    text-align: center;
    font-size: 11px;
    color: var(--text-dim);
    opacity: 0.8;
  }
  .hint kbd {
    font-family: var(--font-mono);
    font-size: 9.5px;
    padding: 1px 6px;
    border-radius: 5px;
    border: 1px solid oklch(0.72 0.19 45 / 0.35);
    background: oklch(0.72 0.19 45 / 0.08);
  }

  @media (prefers-reduced-motion: reduce) {
    .card,
    .card.rarity-apex,
    .rare-flag {
      animation: none;
    }
  }
</style>
