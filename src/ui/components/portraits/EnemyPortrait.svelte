<script lang="ts">
  import { onMount } from 'svelte'
  import type { PortraitFamily } from '../../../engine'
  import { EmberField, enemySpec, prefersReducedMotion } from '../../fx/ember'

  let {
    family,
    hue,
    name,
    enraged = false,
    alive = true,
  }: {
    family: PortraitFamily
    hue: number
    name: string
    enraged?: boolean
    /** a corpse burns down to a dim static ember */
    alive?: boolean
  } = $props()

  let canvas: HTMLCanvasElement
  let field: EmberField | null = null

  onMount(() => {
    field = new EmberField(canvas, enemySpec(family, hue), prefersReducedMotion())
    field.set({ enraged, alive })
    return () => field?.destroy()
  })

  // Enrage runs hotter/redder; death cools the fire.
  $effect(() => {
    field?.set({ enraged, alive })
  })
</script>

<!-- The family silhouette, rendered as living fire; the same masses the old
     line-art drew, so each foe stays instantly recognisable. -->
<canvas bind:this={canvas} class="foe-fire" aria-label="{name} portrait"></canvas>

<style>
  .foe-fire {
    display: block;
    width: 100%;
    height: 100%;
  }
</style>
