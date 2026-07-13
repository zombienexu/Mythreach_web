<script lang="ts">
  const soon = ['Woodcutting', 'Fishing', 'Mining', 'Smithing', 'Shop', 'Bank']
</script>

<aside class="rail">
  <div class="brand">
    <span class="brand-name">Mythreach</span>
    <span class="brand-sub">arcane observatory</span>
  </div>

  <nav aria-label="Skills">
    <ul>
      <li class="active" aria-current="page">
        <span class="nav-label">Combat</span>
      </li>
      {#each soon as name (name)}
        <li class="soon-item">
          <span class="nav-label">{name}</span>
          <span class="soon">soon</span>
        </li>
      {/each}
    </ul>
  </nav>
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
    display: flex;
    align-items: center;
    justify-content: space-between;
    padding: 10px 12px;
    border-radius: var(--radius-sm);
    font-size: 14.5px;
  }

  .active {
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

  .soon-item {
    color: var(--text-dim);
    opacity: 0.55;
  }

  .soon {
    font-size: 9.5px;
    letter-spacing: 0.14em;
    text-transform: uppercase;
    border: 1px solid oklch(0.68 0.02 260 / 0.35);
    border-radius: 99px;
    padding: 1px 7px;
    opacity: 0.8;
  }

  @media (max-width: 1000px) {
    .rail {
      padding: 20px 12px;
    }
  }
</style>
