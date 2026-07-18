<script lang="ts">
  import type { View } from '../game.svelte'
  import Bar from './Bar.svelte'

  let {
    view,
    level,
    xp,
    xpToNext,
    talentPoints = 0,
    questsReady = 0,
    onnavigate,
  }: {
    view: View
    level: number
    xp: number
    xpToNext: number
    talentPoints?: number
    /** quests whose objective is met, waiting to be turned in */
    questsReady?: number
    onnavigate?: (view: View) => void
  } = $props()

  /* Each view signs itself with a single engraved stroke — one path, one glyph. */
  const NAV: Array<{ id: View; label: string; glyph: string }> = [
    { id: 'combat', label: 'Combat', glyph: 'M3 13 L13 3 M10.4 3 H13 V5.6 M3 3 L13 13 M3 10.4 V13 H5.6' },
    { id: 'character', label: 'Character', glyph: 'M8 2 C5.4 2 4.1 4.6 4.4 7 C4.7 8.9 6.1 10.2 8 10.2 C9.9 10.2 11.3 8.9 11.6 7 C11.9 4.6 10.6 2 8 2 Z M3 14 C4 11.4 5.9 10.2 8 10.2 C10.1 10.2 12 11.4 13 14' },
    { id: 'talents', label: 'Talents', glyph: 'M8 1.8 L9.6 6.4 L14.2 8 L9.6 9.6 L8 14.2 L6.4 9.6 L1.8 8 L6.4 6.4 Z' },
    { id: 'regions', label: 'Regions', glyph: 'M8 1.5 A6.5 6.5 0 1 0 8 14.5 A6.5 6.5 0 1 0 8 1.5 M10.6 5.4 L9 9 L5.4 10.6 L7 7 Z' },
    { id: 'quests', label: 'Quests', glyph: 'M5 2.5 H12.5 V10.8 C12.5 12.3 11.5 13.5 9.9 13.5 H4.6 C3.3 13.5 2.5 12.6 2.5 11.5 V10.8 H9 M6.8 5.6 H10.2 M6.8 8.1 H10.2' },
    { id: 'hearth', label: 'Hearth', glyph: 'M2.6 7.8 L8 2.8 L13.4 7.8 M4.2 6.6 V13.4 H11.8 V6.6 M6.6 13.4 V11.6 C6.6 10.5 7.2 9.9 8 9.9 C8.8 9.9 9.4 10.5 9.4 11.6 V13.4' },
    { id: 'chronicle', label: 'Chronicle', glyph: 'M8 3.2 C6.6 2.2 4.6 2 2.6 2.4 V12.8 C4.6 12.4 6.6 12.6 8 13.6 C9.4 12.6 11.4 12.4 13.4 12.8 V2.4 C11.4 2 9.4 2.2 8 3.2 V13' },
    { id: 'settings', label: 'Settings', glyph: 'M8 1.5 A6.5 6.5 0 1 0 8 14.5 A6.5 6.5 0 1 0 8 1.5 M8 4.6 A3.4 3.4 0 1 0 8 11.4 A3.4 3.4 0 1 0 8 4.6 M8 1.5 V4.6 M8 11.4 V14.5 M1.5 8 H4.6 M11.4 8 H14.5' },
  ]
</script>

<aside class="rail">
  <div class="brand">
    <!-- the observatory's own instrument: an astrolabe, slowly keeping time -->
    <svg class="emblem" viewBox="0 0 40 40" aria-hidden="true">
      <g class="emblem-ring">
        <circle cx="20" cy="20" r="17" fill="none" stroke="currentColor" stroke-width="1.1" stroke-dasharray="3.5 5.2" />
      </g>
      <circle cx="20" cy="20" r="11.5" fill="none" stroke="currentColor" stroke-width="0.9" opacity="0.6" />
      <path d="M20 5.5 V12 M20 28 V34.5 M5.5 20 H12 M28 20 H34.5" stroke="currentColor" stroke-width="0.9" opacity="0.55" />
      <path d="M20 12.8 L21.8 18.2 L27.2 20 L21.8 21.8 L20 27.2 L18.2 21.8 L12.8 20 L18.2 18.2 Z" fill="currentColor" opacity="0.9" />
    </svg>
    <span class="brand-name">Mythreach</span>
    <span class="brand-sub">arcane observatory</span>
  </div>

  <nav aria-label="Views">
    <ul>
      {#each NAV as item (item.id)}
        <li class:active={view === item.id}>
          <button
            class="nav-btn"
            aria-current={view === item.id ? 'page' : undefined}
            onclick={() => onnavigate?.(item.id)}
          >
            <span class="nav-main">
              <svg class="nav-glyph" viewBox="0 0 16 16" aria-hidden="true">
                <path
                  d={item.glyph}
                  fill="none"
                  stroke="currentColor"
                  stroke-width="1.2"
                  stroke-linecap="round"
                  stroke-linejoin="round"
                />
              </svg>
              <span class="nav-label">{item.label}</span>
            </span>
            {#if item.id === 'talents' && talentPoints > 0}
              <span class="badge num" title="{talentPoints} unspent talent points">{talentPoints}</span>
            {/if}
            {#if item.id === 'quests' && questsReady > 0}
              <span class="badge num" title="{questsReady} quests ready to turn in">{questsReady}</span>
            {/if}
          </button>
        </li>
      {/each}
    </ul>
  </nav>

  <div class="foot">
    <div class="lvl-row">
      <span class="lvl-label">Level</span>
      <span class="lvl num">{level}</span>
    </div>
    {#if xpToNext > 0}
      <Bar value={xp} max={xpToNext} kind="xp" height={7} label="Experience" />
      <span class="xp-text num">{xp} / {xpToNext} xp</span>
    {:else}
      <Bar value={1} max={1} kind="xp" height={7} label="Experience" />
      <span class="xp-text">level cap</span>
    {/if}
  </div>
</aside>

<style>
  .rail {
    display: flex;
    flex-direction: column;
    gap: 30px;
    padding: 26px 18px;
    border-right: 1px solid oklch(0.85 0.03 260 / 0.07);
    background: linear-gradient(180deg, oklch(0.8 0.02 260 / 0.03), transparent 40%);
    min-height: 100dvh;
    position: sticky;
    top: 0;
  }

  .brand {
    display: flex;
    flex-direction: column;
    padding-inline: 10px;
  }

  .emblem {
    width: 34px;
    height: 34px;
    margin-bottom: 8px;
    color: var(--gilt);
    filter: drop-shadow(0 0 8px oklch(0.78 0.1 85 / 0.35));
  }

  .emblem-ring {
    animation: emblem-turn 90s linear infinite;
    transform-origin: 50% 50%;
  }

  @keyframes emblem-turn {
    to {
      rotate: 360deg;
    }
  }

  @media (prefers-reduced-motion: reduce) {
    .emblem-ring {
      animation: none;
    }
  }

  .brand-name {
    font-family: var(--font-display);
    font-size: 24px;
    font-weight: 620;
    letter-spacing: 0.045em;
    text-transform: uppercase;
    background: linear-gradient(115deg, var(--text) 40%, var(--ether) 100%);
    -webkit-background-clip: text;
    background-clip: text;
    color: transparent;
  }

  .brand-sub {
    font-size: 11px;
    letter-spacing: 0.28em;
    text-transform: uppercase;
    color: var(--text-dim);
    opacity: 0.75;
    margin-top: 2px;
  }

  ul {
    list-style: none;
    margin: 0;
    padding: 0;
    display: flex;
    flex-direction: column;
    gap: 2px;
  }

  li {
    position: relative;
    border-radius: var(--radius-sm);
  }

  .nav-btn {
    width: 100%;
    display: flex;
    align-items: center;
    justify-content: space-between;
    padding: 10px 12px;
    border: 0;
    background: none;
    border-radius: var(--radius-sm);
    font-family: var(--font-display);
    font-size: 15px;
    letter-spacing: 0.02em;
    color: var(--text-dim);
    cursor: pointer;
    transition: color var(--dur-fast) ease, background var(--dur-fast) ease;
  }

  .nav-main {
    display: inline-flex;
    align-items: center;
    gap: 10px;
    min-width: 0;
  }

  .nav-glyph {
    width: 15px;
    height: 15px;
    flex: none;
    opacity: 0.55;
    transition: opacity var(--dur-fast) ease, color var(--dur-fast) ease;
  }

  .nav-btn:hover .nav-glyph {
    opacity: 0.85;
  }

  .active .nav-glyph {
    opacity: 1;
    color: var(--gilt);
    filter: drop-shadow(0 0 5px oklch(0.78 0.1 85 / 0.55));
  }

  /* Illuminated initial, the way a scribe would open a line. */
  .nav-label::first-letter {
    font-size: 1.3em;
    color: var(--gilt);
  }

  .nav-btn:hover {
    color: var(--text);
    background: oklch(0.8 0.02 260 / 0.05);
  }

  .active .nav-btn {
    color: var(--text);
    background: linear-gradient(90deg, oklch(0.78 0.1 85 / 0.12), transparent 70%);
  }

  /* Edge glow in gilt, not a colored stripe. */
  .active::before {
    content: '';
    position: absolute;
    left: -2px;
    top: 18%;
    bottom: 18%;
    width: 4px;
    border-radius: 4px;
    background: var(--gilt);
    filter: blur(3.5px);
    opacity: 0.9;
  }

  .active .nav-label {
    font-weight: 560;
  }

  .badge {
    min-width: 18px;
    height: 18px;
    display: grid;
    place-items: center;
    border-radius: 99px;
    font-size: 11px;
    font-weight: 680;
    color: var(--void-deep);
    background: var(--xp);
    box-shadow: 0 0 10px oklch(0.72 0.15 300 / 0.5);
  }

  .foot {
    margin-top: auto;
    display: grid;
    gap: 5px;
    padding-inline: 10px;
  }

  .lvl-row {
    display: flex;
    justify-content: space-between;
    align-items: baseline;
  }

  .lvl-label {
    font-size: 10.5px;
    letter-spacing: 0.18em;
    text-transform: uppercase;
    color: var(--text-dim);
  }

  .lvl {
    font-family: var(--font-display);
    font-size: 22px;
    font-weight: 640;
    color: var(--xp);
  }

  .xp-text {
    font-size: 10.5px;
    color: var(--text-dim);
    opacity: 0.8;
  }

  @media (max-width: 1000px) {
    .rail {
      padding: 20px 12px;
    }
  }
</style>
