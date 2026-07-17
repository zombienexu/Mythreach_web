<script lang="ts">
  let {
    title,
    zoneName,
    zoneHue,
    kills,
    gold,
    auto,
    muted,
    ontoggleauto,
    ontogglemute,
  }: {
    title: string
    zoneName: string
    zoneHue: number
    kills: number
    gold: number
    auto: boolean
    muted: boolean
    ontoggleauto?: () => void
    ontogglemute?: () => void
  } = $props()
</script>

<header class="top">
  <div class="heading">
    <h1>{title}</h1>
    <span class="zone" style:--zh={zoneHue}>
      <span class="zone-dot"></span>
      {zoneName}
    </span>
  </div>
  <div class="stats">
    <div class="stat kills" title="Kills">
      <svg viewBox="0 0 16 16" aria-hidden="true">
        <path
          d="M8 1.8c-3 0-5.2 2.2-5.2 5 0 1.7.8 3 2 3.8v2.2h6.4v-2.2c1.2-.8 2-2.1 2-3.8 0-2.8-2.2-5-5.2-5Z"
          fill="none"
          stroke="currentColor"
          stroke-width="1.4"
        />
        <circle cx="5.9" cy="7.2" r="1.1" fill="currentColor" />
        <circle cx="10.1" cy="7.2" r="1.1" fill="currentColor" />
      </svg>
      {#key kills}
        <span class="num pop">{kills}</span>
      {/key}
      <span class="label">kills</span>
    </div>
    <div class="stat gold" title="Gold">
      <svg viewBox="0 0 16 16" aria-hidden="true">
        <path
          d="M8 1.6 13.8 8 8 14.4 2.2 8Z"
          fill="none"
          stroke="currentColor"
          stroke-width="1.4"
          stroke-linejoin="round"
        />
        <path d="M8 4.6 10.8 8 8 11.4 5.2 8Z" fill="currentColor" opacity="0.55" />
      </svg>
      {#key gold}
        <span class="num pop">{gold}</span>
      {/key}
      <span class="label">gold</span>
    </div>
    <button
      class="stat toggle"
      class:on={auto}
      onclick={() => ontoggleauto?.()}
      title="Auto-battle: your echo fights for you (A)"
      aria-pressed={auto}
    >
      <svg viewBox="0 0 16 16" aria-hidden="true">
        <path d="M3 8 a5 5 0 0 1 8.5 -3.5 L13 6" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" />
        <path d="M13 8 a5 5 0 0 1 -8.5 3.5 L3 10" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" />
        <path d="M13 3 v3 h-3 M3 13 v-3 h3" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round" />
      </svg>
      <span class="label">auto</span>
    </button>
    <button
      class="stat toggle"
      class:on={!muted}
      onclick={() => ontogglemute?.()}
      title={muted ? 'Unmute sound' : 'Mute sound'}
      aria-pressed={!muted}
    >
      <svg viewBox="0 0 16 16" aria-hidden="true">
        <path d="M3 6 v4 h2.6 L9 13 V3 L5.6 6 Z" fill="currentColor" opacity="0.8" />
        {#if muted}
          <path d="M11 6 l3.5 4 M14.5 6 L11 10" stroke="currentColor" stroke-width="1.4" stroke-linecap="round" />
        {:else}
          <path d="M11 5.5 a3.4 3.4 0 0 1 0 5 M12.6 4 a5.6 5.6 0 0 1 0 8" fill="none" stroke="currentColor" stroke-width="1.4" stroke-linecap="round" />
        {/if}
      </svg>
      <span class="label">{muted ? 'muted' : 'sound'}</span>
    </button>
  </div>
</header>

<style>
  .top {
    position: relative;
    display: flex;
    align-items: baseline;
    justify-content: space-between;
    gap: 20px;
    padding-bottom: 12px;
  }

  /* The page is ruled off from the work below it, the way a ledger opens. */
  .top::after {
    content: '';
    position: absolute;
    inset: auto 0 0;
    height: 1px;
    background: linear-gradient(
      90deg,
      oklch(0.78 0.1 85 / 0.4),
      oklch(0.78 0.08 82 / 0.12) 45%,
      transparent 85%
    );
  }

  .heading {
    display: flex;
    align-items: baseline;
    gap: 14px;
    min-width: 0;
  }

  h1 {
    font-size: 34px;
    font-weight: 590;
  }

  .zone {
    display: inline-flex;
    align-items: center;
    gap: 7px;
    font-size: 12.5px;
    letter-spacing: 0.1em;
    text-transform: uppercase;
    color: var(--text-dim);
    white-space: nowrap;
  }

  .zone-dot {
    width: 8px;
    height: 8px;
    border-radius: 50%;
    background: oklch(0.72 0.13 calc(var(--zh) * 1));
    box-shadow: 0 0 10px oklch(0.72 0.13 calc(var(--zh) * 1) / 0.7);
  }

  .stats {
    display: flex;
    gap: 10px;
    flex: none;
  }

  .stat {
    display: flex;
    align-items: center;
    gap: 7px;
    padding: 6px 14px;
    border-radius: 99px;
    border: 1px solid oklch(0.85 0.03 260 / 0.1);
    background: oklch(0.8 0.02 260 / 0.04);
    font-size: 14px;
  }

  .stat svg {
    width: 15px;
    height: 15px;
  }

  .num {
    font-weight: 620;
    font-size: 15px;
  }

  .pop {
    display: inline-block;
    animation: stat-pop 340ms var(--ease-spring);
  }

  @keyframes stat-pop {
    from {
      transform: scale(1.35);
    }
    to {
      transform: scale(1);
    }
  }

  @media (prefers-reduced-motion: reduce) {
    .pop {
      animation: none;
    }
  }

  .label {
    font-size: 11px;
    letter-spacing: 0.12em;
    text-transform: uppercase;
    opacity: 0.65;
  }

  .kills {
    color: var(--text-dim);
  }

  .gold {
    color: var(--ember);
    border-color: oklch(0.8 0.13 80 / 0.28);
    background: oklch(0.8 0.13 80 / 0.06);
  }

  .toggle {
    cursor: pointer;
    color: var(--text-dim);
    transition:
      color var(--dur-fast) ease,
      border-color var(--dur-fast) ease,
      box-shadow var(--dur-fast) ease;
  }

  .toggle.on {
    color: var(--ether);
    border-color: oklch(0.8 0.11 195 / 0.4);
    box-shadow: 0 0 14px -4px oklch(0.8 0.11 195 / 0.5);
  }

  @media (max-width: 1000px) {
    h1 {
      font-size: 28px;
    }
    .zone {
      display: none;
    }
  }
</style>
