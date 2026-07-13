<script lang="ts">
  let { kills, gold }: { kills: number; gold: number } = $props()
</script>

<header class="top">
  <h1>Combat</h1>
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
      <span class="num">{kills}</span>
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
      <span class="num">{gold}</span>
      <span class="label">gold</span>
    </div>
  </div>
</header>

<style>
  .top {
    display: flex;
    align-items: baseline;
    justify-content: space-between;
    gap: 20px;
  }

  h1 {
    font-size: 34px;
    font-weight: 590;
  }

  .stats {
    display: flex;
    gap: 10px;
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
</style>
