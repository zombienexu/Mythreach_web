<script lang="ts">
  import { onMount, tick } from 'svelte'
  import type { Game } from '../game.svelte'
  import type { Anchors, Region, Spot } from '../fx/stage'

  let { game }: { game: Game } = $props()

  let host: HTMLDivElement | undefined = $state()

  const centre = (r: Region): Spot => ({ x: r.x + r.w / 2, y: r.y + r.h / 2 })

  /** Spells fly between the portraits, so the stage has to know where the
   *  portraits actually are — in canvas space, after every reflow. */
  function measure(): void {
    const arena = host?.parentElement
    if (!host || !arena) return
    const base = host.getBoundingClientRect()
    if (base.width === 0) return

    const box = (sel: string): Region | null => {
      const el = arena.querySelector(sel)
      if (!el) return null
      const r = el.getBoundingClientRect()
      return { x: r.left - base.left, y: r.top - base.top, w: r.width, h: r.height }
    }

    const playerCard = box('[data-fx-card="player"]')
    const enemyCard = box('[data-fx-card="enemy"]')
    if (!playerCard || !enemyCard) return

    // A slain or unspawned enemy has no portrait — aim at the card instead.
    const playerSpot = box('[data-fx-anchor="player"]')
    const enemySpot = box('[data-fx-anchor="enemy"]')

    const anchors: Anchors = {
      player: playerSpot ? centre(playerSpot) : centre(playerCard),
      enemy: enemySpot ? centre(enemySpot) : centre(enemyCard),
      playerCard,
      enemyCard,
    }
    game.fx.setAnchors(anchors)
  }

  onMount(() => {
    if (!host) return
    // Not a one-shot: this component is destroyed and rebuilt every time the
    // player visits another tab and comes back. The stage adopts the new host.
    void game.fx.mountStage(host).then(measure)

    const ro = new ResizeObserver(() => {
      game.fx.stage.resize()
      measure()
    })
    ro.observe(host)

    return () => {
      ro.disconnect()
      // Off screen: stop rendering and stop spawning, rather than piling up
      // particles nobody can see.
      game.fx.stage.pause()
    }
  })

  // The enemy portrait comes and goes with the enemy; re-aim when it does.
  $effect(() => {
    void game.combat.enemy?.defId
    void game.combat.spawnIn
    void tick().then(measure)
  })
</script>

<div class="fx-host" bind:this={host} aria-hidden="true"></div>

<style>
  /* Sits over both cards: a detonation should wash across the card art, not
     be clipped by it. Never eats a click. */
  .fx-host {
    position: absolute;
    inset: -40px;
    pointer-events: none;
    z-index: 3;
    overflow: hidden;
    border-radius: var(--radius);
  }
</style>
