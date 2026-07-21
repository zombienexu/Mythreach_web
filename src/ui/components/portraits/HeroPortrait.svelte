<script lang="ts">
  import { onMount } from 'svelte'
  import type { ClassId } from '../../../engine'
  import { EmberField, heroSpec, prefersReducedMotion } from '../../fx/ember'

  let { classId = 'arcanist', heat = 0 }: { classId?: ClassId; heat?: number } = $props()

  /** Each calling's flame hue. The War-Weaver burns warm ember-gold; the others
   *  carry their own colour of fire. */
  const HUES: Record<ClassId, number> = {
    arcanist: 42,
    gravewright: 135,
    hourwarden: 240,
    cartomancer: 80,
    thornspeaker: 150,
    riftblade: 305,
  }

  // Heat is 0–10; the ember field's master dial is 0–1.
  const intensity = $derived(Math.max(0, Math.min(1, heat / 10)))

  let canvas: HTMLCanvasElement
  let field: EmberField | null = null

  onMount(() => {
    field = new EmberField(canvas, heroSpec(HUES[classId]), prefersReducedMotion())
    field.set({ intensity })
    return () => field?.destroy()
  })

  // The hero visibly boils as Heat climbs.
  $effect(() => {
    field?.set({ intensity })
  })
</script>

<!-- A hooded War-Weaver rendered as a standing column of fire; the eyes and a
     chest ember flare as Heat rises. -->
<canvas bind:this={canvas} class="hero-fire" aria-label="War-Weaver, wreathed in fire"></canvas>

<style>
  .hero-fire {
    display: block;
    width: 100%;
    height: 100%;
  }
</style>
