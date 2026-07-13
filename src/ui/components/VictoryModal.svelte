<script lang="ts">
  import type { LifetimeStats } from '../../engine'
  import Modal from './Modal.svelte'

  let {
    lifetime,
    onclose,
  }: {
    lifetime: LifetimeStats
    onclose?: () => void
  } = $props()
</script>

<Modal label="The world is mended" {onclose}>
  <div class="crown" aria-hidden="true">✦</div>
  <h2>Malgrath is unmade</h2>
  <p class="body-text">
    The Sundered Spire falls silent. Starlight pours back into the wound in the world, and for the
    first time in an age, the observatory's instruments read <em>calm</em>.
  </p>
  <p class="body-text dim">
    You are the Worldmender. The reaches remain yours to wander — bosses can be challenged again,
    and the dark will keep making more monsters. It always does.
  </p>

  <div class="tally">
    <div class="tally-row"><span>Creatures slain</span><span class="num">{lifetime.kills}</span></div>
    <div class="tally-row"><span>Bosses felled</span><span class="num">{lifetime.bossKills}</span></div>
    <div class="tally-row"><span>Deaths along the way</span><span class="num">{lifetime.deaths}</span></div>
    <div class="tally-row"><span>Gold amassed</span><span class="num">{lifetime.goldEarned}</span></div>
  </div>

  <button class="cta" onclick={() => onclose?.()}>Keep wandering</button>
</Modal>

<style>
  .crown {
    text-align: center;
    font-size: 34px;
    color: var(--ember);
    text-shadow: 0 0 24px oklch(0.8 0.13 80 / 0.8);
    animation: crown-glow 2s ease-in-out infinite alternate;
  }

  @keyframes crown-glow {
    from {
      text-shadow: 0 0 14px oklch(0.8 0.13 80 / 0.5);
    }
    to {
      text-shadow: 0 0 30px oklch(0.8 0.13 80 / 0.95);
    }
  }

  h2 {
    text-align: center;
    font-size: 26px;
    margin: 8px 0 14px;
    background: linear-gradient(115deg, var(--text) 30%, var(--ember) 100%);
    -webkit-background-clip: text;
    background-clip: text;
    color: transparent;
  }

  .body-text {
    margin: 0 0 10px;
    font-size: 14px;
    line-height: 1.6;
    text-align: center;
  }

  .body-text.dim {
    color: var(--text-dim);
    font-size: 13px;
  }

  .tally {
    margin-top: 18px;
    display: grid;
    gap: 6px;
    padding: 14px 18px;
    border-radius: var(--radius-sm);
    border: 1px solid oklch(0.8 0.13 80 / 0.25);
    background: oklch(0.8 0.13 80 / 0.04);
  }

  .tally-row {
    display: flex;
    justify-content: space-between;
    font-size: 13.5px;
  }

  .tally-row span:first-child {
    color: var(--text-dim);
  }

  .tally-row .num {
    font-weight: 660;
    color: var(--ember);
  }

  .cta {
    margin-top: 22px;
    width: 100%;
    padding: 12px;
    border-radius: var(--radius);
    font-size: 15px;
    font-weight: 640;
    cursor: pointer;
    color: var(--void-deep);
    border: 0;
    background: linear-gradient(115deg, var(--ember), oklch(0.75 0.15 55));
    box-shadow: 0 0 26px -6px oklch(0.8 0.13 80 / 0.6);
    transition: transform var(--dur-fast) var(--ease-spring);
  }

  .cta:hover {
    transform: translateY(-1px);
  }

  @media (prefers-reduced-motion: reduce) {
    .crown {
      animation: none;
    }
  }
</style>
