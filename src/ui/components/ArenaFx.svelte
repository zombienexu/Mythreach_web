<script lang="ts">
  import { onMount, tick } from 'svelte'
  import type { Game } from '../game.svelte'
  import type { Anchors, Region, Spot } from '../fx/stage'

  let { game }: { game: Game } = $props()

  let host: HTMLDivElement | undefined = $state()

  const centre = (r: Region): Spot => ({ x: r.x + r.w / 2, y: r.y + r.h / 2 })

  /** Spells fly between the portraits, so the stage has to know where every
   *  portrait actually is — per enemy card, in canvas space, after every reflow.
   *
   *  The host is now a full-viewport overlay: the pack musters upper-right and
   *  the conscript's portrait lives in the global bottom-left corner (outside
   *  the arena), so the diagonal a spell travels spans the whole screen. Enemy
   *  anchors are still scoped to the arena; the player anchor is looked up
   *  document-wide because the portrait HUD lives in the shell, not the view. */
  function measure(): void {
    const arena = host?.parentElement
    if (!host || !arena) return
    const base = host.getBoundingClientRect()
    if (base.width === 0) return

    const toRegion = (el: Element): Region => {
      const r = el.getBoundingClientRect()
      return { x: r.left - base.left, y: r.top - base.top, w: r.width, h: r.height }
    }
    const boxIn = (root: ParentNode, sel: string): Region | null => {
      const el = root.querySelector(sel)
      return el ? toRegion(el) : null
    }

    const playerCard = boxIn(document, '[data-fx-card="player"]')
    const foesRow = boxIn(arena, '[data-fx-row="enemies"]')
    if (!playerCard || !foesRow) return

    // Each enemy card gets its own anchor, keyed by iid, aimed at its portrait.
    const enemies: Anchors['enemies'] = {}
    for (const el of arena.querySelectorAll('[data-fx-card="enemy"]')) {
      const iid = Number((el as HTMLElement).dataset.iid)
      if (!Number.isFinite(iid)) continue
      const card = toRegion(el)
      const portrait = el.querySelector('[data-fx-anchor="enemy"]')
      enemies[iid] = { spot: portrait ? centre(toRegion(portrait)) : centre(card), card }
    }

    const playerSpot = boxIn(document, '[data-fx-anchor="player"]')
    const anchors: Anchors = {
      player: playerSpot ? centre(playerSpot) : centre(playerCard),
      // The fallback: mid-row, where a card is about to be, or just was.
      enemy: centre(foesRow),
      playerCard,
      enemyCard: foesRow,
      enemies,
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

  // Enemy cards come and go with the pack; re-aim when the roster changes.
  // The snapshot is rebuilt every tick, so the effect refires every tick —
  // the key guard is what keeps measure() (a getBoundingClientRect sweep of
  // every card) off the per-tick path. Size changes are the observer's job.
  let measuredKey = ''
  $effect(() => {
    const key = `${game.combat.phase}|${game.combat.enemies.map((e) => e.iid).join(',')}`
    if (key === measuredKey) return
    measuredKey = key
    void tick().then(measure)
  })
</script>

<div class="fx-host" bind:this={host} aria-hidden="true"></div>

<style>
  /* A full-viewport overlay so a spell can travel the whole diagonal from the
     corner portrait to the pack in the upper-right, and a detonation can wash
     across the screen unclipped. Never eats a click. Sits above the battlefield
     but below the portrait HUD (z 30) and the console chrome/ceremonies. */
  .fx-host {
    position: fixed;
    inset: 0;
    pointer-events: none;
    z-index: 4;
    overflow: hidden;
  }
</style>
