<script lang="ts">
  import type { View } from '../game.svelte'
  import Bar from './Bar.svelte'

  let {
    view,
    level,
    xp,
    xpToNext,
    talentPoints = 0,
    onnavigate,
  }: {
    view: View
    level: number
    xp: number
    xpToNext: number
    talentPoints?: number
    onnavigate?: (view: View) => void
  } = $props()

  const NAV: Array<{ id: View; label: string }> = [
    { id: 'combat', label: 'Combat' },
    { id: 'character', label: 'Character' },
    { id: 'talents', label: 'Talents' },
    { id: 'atlas', label: 'Atlas' },
    { id: 'chronicle', label: 'Chronicle' },
  ]
</script>

<aside class="rail">
  <div class="brand">
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
            <span class="nav-label">{item.label}</span>
            {#if item.id === 'talents' && talentPoints > 0}
              <span class="badge num" title="{talentPoints} unspent talent points">{talentPoints}</span>
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
    font-size: 14.5px;
    color: var(--text-dim);
    cursor: pointer;
    transition: color var(--dur-fast) ease, background var(--dur-fast) ease;
  }

  .nav-btn:hover {
    color: var(--text);
    background: oklch(0.8 0.02 260 / 0.05);
  }

  .active .nav-btn {
    color: var(--text);
    background: linear-gradient(90deg, oklch(0.8 0.11 195 / 0.1), transparent 70%);
  }

  /* Edge glow, not a colored stripe. */
  .active::before {
    content: '';
    position: absolute;
    left: -2px;
    top: 18%;
    bottom: 18%;
    width: 4px;
    border-radius: 4px;
    background: var(--ether);
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
