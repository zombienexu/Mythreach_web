<script lang="ts">
  import type { CombatSnapshot } from '../../engine'

  let { combat }: { combat: CombatSnapshot } = $props()

  /** The enemy is winding up a hardcast. The room closes in as it fills —
   *  and snaps back the instant you counter it. This is the tension. */
  const threat = $derived(combat.enemy?.cast?.progress ?? 0)

  const hpFrac = $derived(combat.player.maxHp > 0 ? combat.player.hp / combat.player.maxHp : 1)
  const danger = $derived(combat.player.alive && hpFrac < 0.35 ? (0.35 - hpFrac) / 0.35 : 0)

  const lit = $derived(combat.player.buffs.some((b) => b.id === 'combustion'))
  const enraged = $derived(combat.enemy?.enraged ?? false)
</script>

<div
  class="vignette"
  class:lit
  class:enraged
  class:bleeding={danger > 0}
  style:--threat={threat}
  style:--danger={danger}
  aria-hidden="true"
>
  <div class="layer threat"></div>
  <div class="layer danger"></div>
  <div class="layer warm"></div>
</div>

<style>
  .vignette {
    position: fixed;
    inset: 0;
    z-index: 5;
    pointer-events: none;
  }

  .layer {
    position: absolute;
    inset: 0;
  }

  /* Hardcast incoming: orange pressure creeping in from the edges. */
  .threat {
    opacity: calc(var(--threat) * 0.9);
    background: radial-gradient(115% 85% at 50% 50%, transparent 42%, oklch(0.6 0.19 45 / 0.5) 100%);
    transition: opacity 90ms linear;
  }

  /* Low health: the world starts to bleed, and it breathes. */
  .danger {
    opacity: var(--danger);
    background: radial-gradient(115% 85% at 50% 50%, transparent 38%, oklch(0.5 0.2 25 / 0.62) 100%);
  }

  .bleeding .danger {
    animation: heartbeat 1.15s ease-in-out infinite;
  }

  @keyframes heartbeat {
    0%,
    100% {
      opacity: calc(var(--danger) * 0.55);
    }
    18% {
      opacity: var(--danger);
    }
    36% {
      opacity: calc(var(--danger) * 0.6);
    }
    52% {
      opacity: calc(var(--danger) * 0.92);
    }
  }

  /* Combustion: the whole observatory takes on the colour of your fire. */
  .warm {
    opacity: 0;
    background:
      radial-gradient(120% 90% at 50% 60%, oklch(0.75 0.16 60 / 0.16) 0%, transparent 55%),
      radial-gradient(115% 85% at 50% 50%, transparent 45%, oklch(0.65 0.17 55 / 0.34) 100%);
    transition: opacity var(--dur-slow) var(--ease-out-expo);
  }

  .lit .warm {
    opacity: 1;
  }

  /* An enraged foe leaves a permanent stain on the air. */
  .enraged .threat {
    opacity: calc(0.22 + var(--threat) * 0.75);
  }

  @media (prefers-reduced-motion: reduce) {
    .bleeding .danger {
      animation: none;
      opacity: calc(var(--danger) * 0.7);
    }
  }
</style>
