<script lang="ts">
  import { ABILITIES, type AbilityId } from '../../engine'

  let { level, unlocked }: { level: number; unlocked: AbilityId[] } = $props()
</script>

<div class="banner" role="status">
  <span class="word">Level {level}</span>
  {#if unlocked.length > 0}
    <span class="unlock">New spell: {unlocked.map((id) => ABILITIES[id].name).join(', ')}</span>
  {/if}
  <span class="rays" aria-hidden="true"></span>
</div>

<style>
  .banner {
    position: fixed;
    top: 18%;
    left: 50%;
    z-index: 30;
    transform: translateX(-50%);
    display: flex;
    flex-direction: column;
    align-items: center;
    gap: 4px;
    padding: 18px 44px;
    border-radius: var(--radius);
    pointer-events: none;
    animation: banner-arc 3.6s ease both;
  }

  .word {
    font-family: var(--font-display);
    font-size: 40px;
    font-weight: 660;
    letter-spacing: 0.06em;
    background: linear-gradient(115deg, var(--text) 25%, var(--xp) 75%);
    -webkit-background-clip: text;
    background-clip: text;
    color: transparent;
    text-shadow: none;
    filter: drop-shadow(0 0 26px oklch(0.72 0.15 300 / 0.55));
  }

  .unlock {
    font-size: 14px;
    color: var(--ether);
    letter-spacing: 0.04em;
  }

  .rays {
    position: absolute;
    inset: -30px;
    z-index: -1;
    background: radial-gradient(ellipse, oklch(0.72 0.15 300 / 0.22) 0%, transparent 65%);
  }

  @keyframes banner-arc {
    0% {
      opacity: 0;
      transform: translateX(-50%) translateY(12px) scale(0.9);
    }
    12% {
      opacity: 1;
      transform: translateX(-50%) translateY(0) scale(1.04);
    }
    20% {
      transform: translateX(-50%) scale(1);
    }
    82% {
      opacity: 1;
    }
    100% {
      opacity: 0;
      transform: translateX(-50%) translateY(-10px);
    }
  }

  @media (prefers-reduced-motion: reduce) {
    .banner {
      animation: none;
    }
  }
</style>
