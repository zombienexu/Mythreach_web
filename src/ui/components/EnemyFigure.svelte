<script lang="ts">
  import type { EnemySnapshot } from '../../engine'
  import { ticksToSeconds } from '../format'
  import type { Impact } from '../game.svelte'
  import EnemyPortrait from './portraits/EnemyPortrait.svelte'

  let {
    enemy,
    lootable = false,
    targeted = false,
    dormant = false,
    stance = 'front',
    impact,
    ontarget,
    oncollect,
  }: {
    enemy: EnemySnapshot
    /** true on the loot screen — a corpse with spoils offers them up */
    lootable?: boolean
    targeted?: boolean
    /** the pack hasn't been provoked yet: stands greyed, watching, until the
     *  player's first strike pulls aggro */
    dormant?: boolean
    /** how big the figure stands: alone, in the line, or a step behind it */
    stance?: 'solo' | 'front' | 'back'
    impact: Impact
    ontarget?: () => void
    oncollect?: () => void
  } = $props()

  const dead = $derived(!enemy.alive)
  const casting = $derived(enemy.alive && enemy.cast != null)
  const hpArc = $derived(enemy.maxHp > 0 && !dead ? (enemy.hp / enemy.maxHp) * 100 : 0)

  let el: HTMLElement | undefined = $state()

  function pulse(cls: string) {
    if (!el) return
    el.classList.remove(cls)
    void el.offsetWidth
    el.classList.add(cls)
  }

  $effect(() => {
    if (impact.n === 0 || !el) return
    el.style.setProperty('--power', String(impact.power))
    pulse(impact.crit ? 'crit-hit' : 'hit')
  })

  // Arriving out of the dark. Guarded by the last iid: the snapshot object is
  // rebuilt every tick, and re-arming each tick would hold the figure at frame
  // zero — invisible — forever.
  let lastIid: number | null = null
  $effect(() => {
    if (enemy.iid !== lastIid) {
      lastIid = enemy.iid
      pulse('reborn')
    }
  })

  function select(): void {
    if (!dead) ontarget?.()
  }
</script>

<div
  class="figure {stance}"
  class:dead
  class:dormant={dormant && !dead}
  class:targeted={targeted && !dead}
  class:enraged={!dead && enemy.enraged}
  class:elite={enemy.rank === 'elite'}
  class:boss={enemy.rank === 'boss'}
  class:casting
  class:telegraph={!dead && enemy.combatState === 'telegraph'}
  class:exposed={!dead && enemy.combatState === 'exposed'}
  data-fx-card="enemy"
  data-iid={enemy.iid}
  bind:this={el}
  style:--eh={enemy.portrait.hue}
  onclick={() => {
    select()
    // A pointer click must not leave a focus ring that reads as a second
    // reticle; Tab (remapped to target-cycling) is the keyboard path.
    el?.blur()
  }}
  onkeydown={(e) => {
    if (e.key === 'Enter' || e.key === ' ') {
      e.preventDefault()
      select()
    }
  }}
  role="button"
  tabindex={dead ? -1 : 0}
  aria-pressed={targeted && !dead}
  aria-label="Target {enemy.name}"
>
  <!-- the figure stands in a pool of its own light, not on a card -->
  <span class="pool" aria-hidden="true"></span>

  <div class="totem" data-fx-anchor="enemy">
    <svg class="rings" viewBox="0 0 120 120" aria-hidden="true">
      <circle class="ring-track" cx="60" cy="60" r="55" pathLength="100" />
      <circle
        class="ring-hp"
        cx="60"
        cy="60"
        r="55"
        pathLength="100"
        style:stroke-dasharray="{hpArc} 100"
        role="img"
        aria-label="{enemy.name} health {dead ? 0 : enemy.hp} of {enemy.maxHp}"
      />
      {#if !dead}
        {#if casting && enemy.cast}
          <circle
            class="ring-cast"
            cx="60"
            cy="60"
            r="49"
            pathLength="100"
            style:stroke-dasharray="{enemy.cast.progress * 100} 100"
          />
        {:else}
          <circle
            class="ring-swing"
            cx="60"
            cy="60"
            r="49"
            pathLength="100"
            style:stroke-dasharray="{enemy.swingProgress * 100} 100"
          />
        {/if}
      {/if}
    </svg>

    {#if enemy.rank === 'elite'}
      <span class="rank-ring elite-ring" aria-hidden="true"></span>
    {:else if enemy.rank === 'boss'}
      <span class="rank-ring boss-ring" aria-hidden="true"></span>
    {/if}

    {#if targeted && !dead}
      <span class="reticle" aria-hidden="true"></span>
      <span class="reticle-tip" aria-hidden="true"></span>
    {/if}

    <div class="art">
      <EnemyPortrait family={enemy.portrait.family} hue={enemy.portrait.hue} name={enemy.name} enraged={!dead && enemy.enraged} alive={!dead} />
    </div>

    {#if !dead && enemy.smolder}
      <span class="smolder {enemy.smolder.band}" title="Smolder ×{enemy.smolder.stacks} ({enemy.smolder.band})" aria-label="Smolder {enemy.smolder.stacks} of 5, {enemy.smolder.band}">
        {#each Array(5) as _, i (i)}
          <span class="ember" class:lit={i < enemy.smolder.stacks}></span>
        {/each}
      </span>
    {/if}
  </div>

  <div class="plate">
    <h3 class="name">{enemy.name}</h3>
    <div class="meta">
      {#if enemy.rank === 'elite'}<span class="rank elite-word">Elite</span><span class="sep">·</span>{/if}
      {#if enemy.rank === 'boss'}<span class="rank boss-word">Boss</span><span class="sep">·</span>{/if}
      <span class="num">Lv {enemy.level}</span>
      <span class="sep">·</span>
      <span class="hp num">{dead ? 0 : enemy.hp}</span><span class="hp-max num">/{enemy.maxHp}</span>
    </div>

    <!-- the state banner: the one thing to know right now, in bold -->
    <div class="state-line">
      {#if casting && enemy.cast}
        <span class="state-tag cast">
          <span class="pip"></span>casting {enemy.cast.name}<span class="num timer">{ticksToSeconds(enemy.cast.remainingTicks)}s</span>
        </span>
      {:else if !dead && enemy.combatState === 'exposed'}
        <span class="state-tag exposed"><span class="pip"></span>Exposed — strike now</span>
      {:else if !dead && enemy.combatState === 'telegraph'}
        <span class="state-tag tell"><span class="pip"></span>Winding up</span>
      {:else if !dead && enemy.enraged}
        <span class="state-tag enrage"><span class="pip"></span>Enraged</span>
      {/if}
    </div>

    <!-- every affliction on this foe, read at a glance -->
    {#if !dead}
      <div class="debuffs">
        {#if enemy.smolder}
          <span class="deb smolder-chip {enemy.smolder.band}" title="Smolder ×{enemy.smolder.stacks} — {enemy.smolder.band}">
            <span class="deb-glyph">✦</span>Smolder<span class="deb-x num">×{enemy.smolder.stacks}</span>
          </span>
        {/if}
        {#if enemy.dot}
          <span class="deb dot-chip" title="{enemy.dot.name}">
            <span class="deb-glyph">☙</span>{enemy.dot.name}<span class="deb-x num">{ticksToSeconds(enemy.dot.remainingTicks)}s</span>
          </span>
        {/if}
        {#if enemy.frozenTicks > 0}
          <span class="deb frozen-chip" title="Held outside time">
            <span class="deb-glyph">❄</span>Frozen<span class="deb-x num">{ticksToSeconds(enemy.frozenTicks)}s</span>
          </span>
        {/if}
      </div>
    {/if}
  </div>

  {#if dead}
    {#if lootable && enemy.loot}
      <div class="spoils-drift">
        <ul class="spoils">
          <li class="spoil gold num">+{enemy.loot.gold} gold</li>
          {#each enemy.loot.items as item (item.uid)}
            <li class="spoil drop {item.rarity}">{item.name}</li>
          {/each}
          {#each enemy.loot.materials as m (m.id)}
            <li class="spoil mat">{m.name} <span class="num">×{m.count}</span></li>
          {/each}
        </ul>
        <button
          class="collect"
          onclick={(e) => {
            e.stopPropagation()
            oncollect?.()
          }}
        >
          Collect
        </button>
      </div>
    {:else}
      <span class="slain-word" aria-hidden="true">Slain</span>
    {/if}
  {/if}
</div>

<style>
  .figure {
    position: relative;
    display: flex;
    flex-direction: column;
    align-items: center;
    gap: 2px;
    cursor: pointer;
    text-align: center;
    -webkit-tap-highlight-color: transparent;
    transition:
      filter 400ms ease,
      opacity 400ms ease;
  }

  .figure:focus {
    outline: none;
  }

  /* stances: alone it looms, in a pack it stands in line, behind it recedes */
  .figure.solo {
    --fig: 176px;
  }

  .figure.front {
    --fig: 140px;
  }

  .figure.back {
    --fig: 106px;
    opacity: 0.82;
    filter: saturate(0.85) brightness(0.9);
  }

  /* dormant: the pack hasn't roused. It stands leached of colour and light —
     asleep to the threat — so the live, aggroed field reads by contrast. The
     one figure the player has marked keeps more of its colour. */
  .figure.dormant {
    filter: saturate(0.16) brightness(0.6);
    opacity: 0.62;
  }
  .figure.dormant.targeted {
    filter: saturate(0.65) brightness(0.86);
    opacity: 0.95;
  }

  .figure.dead {
    cursor: default;
  }

  /* ---- ground pool: the only "surface" an enemy owns ----------------- */

  .pool {
    position: absolute;
    bottom: calc(var(--fig) * -0.02);
    left: 50%;
    translate: -50% 0;
    width: calc(var(--fig) * 1.15);
    height: calc(var(--fig) * 0.26);
    border-radius: 50%;
    pointer-events: none;
    background: radial-gradient(
      ellipse 50% 50% at 50% 50%,
      oklch(0.6 0.1 var(--eh) / 0.16) 0%,
      oklch(0.5 0.08 var(--eh) / 0.06) 55%,
      transparent 75%
    );
    transition: opacity 400ms ease;
  }

  .figure.enraged .pool {
    background: radial-gradient(
      ellipse 50% 50% at 50% 50%,
      oklch(0.6 0.17 25 / 0.2) 0%,
      oklch(0.55 0.14 25 / 0.07) 55%,
      transparent 75%
    );
  }

  .figure.dead .pool {
    opacity: 0.25;
  }

  /* ---- the totem: rings and the creature inside them ----------------- */

  .totem {
    position: relative;
    width: var(--fig);
    height: var(--fig);
  }

  .rings {
    position: absolute;
    inset: 0;
    width: 100%;
    height: 100%;
    transform: rotate(-90deg);
    overflow: visible;
  }

  .ring-track {
    fill: none;
    stroke: oklch(0.85 0.03 260 / 0.1);
    stroke-width: 1.5;
  }

  .ring-hp {
    fill: none;
    stroke: var(--life);
    stroke-width: 2.75;
    stroke-linecap: round;
    filter: drop-shadow(0 0 5px oklch(0.78 0.15 160 / 0.5));
    transition: stroke-dasharray 220ms ease;
  }

  .ring-swing {
    fill: none;
    stroke: oklch(0.68 0.17 25 / 0.5);
    stroke-width: 1.75;
    stroke-linecap: round;
  }

  .ring-cast {
    fill: none;
    stroke: oklch(0.78 0.14 65);
    stroke-width: 3;
    stroke-linecap: round;
    filter: drop-shadow(0 0 8px oklch(0.75 0.17 55 / 0.8));
  }

  .art {
    position: absolute;
    inset: 14%;
    filter: drop-shadow(0 10px 18px oklch(0.05 0.02 280 / 0.7));
  }

  /* rank worn as a second orbit, outside the vitals */
  .rank-ring {
    position: absolute;
    inset: -5.5%;
    border-radius: 50%;
    pointer-events: none;
  }

  .elite-ring {
    border: 1.5px dashed oklch(0.72 0.15 300 / 0.55);
    box-shadow: 0 0 16px -4px oklch(0.72 0.15 300 / 0.4);
    animation: orbit-turn 14s linear infinite;
  }

  .boss-ring {
    border: 1.5px solid oklch(0.8 0.13 80 / 0.6);
    box-shadow:
      0 0 18px -3px oklch(0.8 0.13 80 / 0.45),
      inset 0 0 12px -2px oklch(0.8 0.13 80 / 0.35);
  }

  .boss-ring::after {
    content: '';
    position: absolute;
    inset: 4px;
    border-radius: inherit;
    border: 1px dotted oklch(0.8 0.13 80 / 0.5);
    animation: orbit-turn 22s linear infinite reverse;
  }

  .figure.dead .rank-ring {
    opacity: 0.2;
    animation: none;
  }

  @keyframes orbit-turn {
    to {
      rotate: 360deg;
    }
  }

  /* the reticle: the one figure your spells answer to */
  .reticle {
    position: absolute;
    inset: -10.5%;
    border-radius: 50%;
    border: 1.5px dashed oklch(0.8 0.11 195 / 0.75);
    box-shadow: 0 0 22px -6px oklch(0.8 0.11 195 / 0.6);
    pointer-events: none;
    animation:
      reticle-in 240ms var(--ease-spring),
      orbit-turn 11s linear infinite;
  }

  @keyframes reticle-in {
    from {
      scale: 1.18;
      opacity: 0;
    }
  }

  .reticle-tip {
    position: absolute;
    top: -15%;
    left: 50%;
    translate: -50% 0;
    width: 0;
    height: 0;
    border-left: 7px solid transparent;
    border-right: 7px solid transparent;
    border-top: 9px solid oklch(0.8 0.11 195 / 0.95);
    filter: drop-shadow(0 0 6px oklch(0.8 0.11 195 / 0.8));
    pointer-events: none;
    animation: tip-drop 240ms var(--ease-spring);
  }

  @keyframes tip-drop {
    from {
      translate: -50% -7px;
      opacity: 0;
    }
  }

  /* a hardcast is a threat with a timer on it — the whole orbit burns */
  .figure.casting .totem {
    animation: cast-warn 620ms ease-in-out infinite alternate;
  }

  @keyframes cast-warn {
    from {
      filter: drop-shadow(0 0 6px oklch(0.75 0.17 55 / 0.25));
    }
    to {
      filter: drop-shadow(0 0 18px oklch(0.75 0.17 55 / 0.6));
    }
  }

  /* ---- Smolder: a row of embers, hotter as they age ------------------- */
  .smolder {
    position: absolute;
    top: -4%;
    left: 50%;
    translate: -50% 0;
    display: inline-flex;
    gap: 4px;
    padding: 3px 6px;
    border-radius: 99px;
    background: oklch(0.13 0.03 40 / 0.6);
    pointer-events: none;
  }
  .smolder .ember {
    width: 7px;
    height: 7px;
    border-radius: 50%;
    border: 1px solid oklch(0.6 0.12 40 / 0.4);
    background: oklch(0.3 0.04 40 / 0.5);
    transition:
      background 200ms ease,
      box-shadow 200ms ease;
  }
  .smolder .ember.lit {
    background: radial-gradient(circle at 40% 35%, oklch(0.85 0.14 60), oklch(0.65 0.19 40) 70%);
    border-color: oklch(0.8 0.16 55);
    box-shadow: 0 0 7px oklch(0.72 0.19 45 / 0.7);
  }
  /* the fiercer the band, the hotter the lit embers read */
  .smolder.heated .ember.lit {
    box-shadow: 0 0 9px oklch(0.74 0.2 40 / 0.85);
  }
  .smolder.volatile .ember.lit {
    background: radial-gradient(circle at 40% 35%, oklch(0.95 0.08 90), oklch(0.7 0.22 35) 70%);
    box-shadow: 0 0 12px oklch(0.78 0.22 40 / 0.95);
    animation: ember-flare 800ms ease-in-out infinite alternate;
  }
  @keyframes ember-flare {
    to {
      box-shadow: 0 0 16px oklch(0.8 0.22 45 / 1);
    }
  }

  /* ---- reading the foe: the tell and the Opening --------------------- */
  .figure.telegraph .totem {
    animation: tell-warn 460ms ease-in-out infinite alternate;
  }
  @keyframes tell-warn {
    from {
      filter: drop-shadow(0 0 3px oklch(0.8 0.18 30 / 0.3));
    }
    to {
      filter: drop-shadow(0 0 16px oklch(0.82 0.2 30 / 0.75));
    }
  }
  .figure.exposed .art {
    filter: drop-shadow(0 0 18px oklch(0.85 0.16 60 / 0.85)) brightness(1.15);
  }
  .figure.exposed .pool {
    background: radial-gradient(
      ellipse 50% 50% at 50% 50%,
      oklch(0.82 0.18 55 / 0.28) 0%,
      oklch(0.7 0.15 45 / 0.1) 55%,
      transparent 75%
    );
  }
  /* ---- the plate: name written on the dark, no box ------------------- */

  .plate {
    display: flex;
    flex-direction: column;
    align-items: center;
    gap: 1px;
    max-width: calc(var(--fig) * 1.4);
  }

  .name {
    font-size: calc(13px + var(--fig) * 0.02);
    font-weight: 580;
    color: oklch(0.88 0.04 25);
    white-space: nowrap;
    overflow: hidden;
    text-overflow: ellipsis;
    max-width: 100%;
    text-shadow: 0 1px 10px oklch(0.05 0.02 280 / 0.9);
  }

  .meta {
    display: flex;
    align-items: baseline;
    gap: 5px;
    font-size: 11px;
    color: var(--text-dim);
  }

  .sep {
    opacity: 0.5;
  }

  .rank {
    font-size: 9.5px;
    font-weight: 680;
    letter-spacing: 0.14em;
    text-transform: uppercase;
  }

  .elite-word {
    color: var(--arcana);
  }

  .boss-word {
    color: var(--ember);
  }

  .hp {
    font-weight: 640;
    color: var(--life);
  }

  .hp-max {
    opacity: 0.7;
  }

  /* ---- state banner: the one thing to know, as a bold pill ----------- */
  .state-line {
    min-height: 20px;
    display: flex;
    align-items: center;
    justify-content: center;
    margin-top: 1px;
  }
  .state-tag {
    display: inline-flex;
    align-items: center;
    gap: 5px;
    padding: 2px 9px;
    border-radius: 99px;
    font-size: 10px;
    font-weight: 680;
    letter-spacing: 0.04em;
    border: 1px solid currentColor;
    background: oklch(0.12 0.03 40 / 0.55);
    box-shadow: 0 0 16px -6px currentColor;
    white-space: nowrap;
  }
  .state-tag .pip {
    width: 6px;
    height: 6px;
    border-radius: 50%;
    background: currentColor;
    box-shadow: 0 0 6px currentColor;
  }
  .state-tag .timer {
    font-weight: 660;
    opacity: 0.85;
  }
  .state-tag.cast {
    color: oklch(0.82 0.16 60);
  }
  .state-tag.cast .pip {
    animation: state-blink 620ms ease-in-out infinite;
  }
  .state-tag.exposed {
    color: oklch(0.86 0.17 62);
    text-transform: uppercase;
    letter-spacing: 0.1em;
    text-shadow: 0 0 12px oklch(0.8 0.19 50 / 0.6);
    background: oklch(0.2 0.08 55 / 0.4);
  }
  .state-tag.tell {
    color: oklch(0.82 0.18 32);
    text-transform: uppercase;
  }
  .state-tag.tell .pip {
    animation: state-blink 460ms ease-in-out infinite;
  }
  .state-tag.enrage {
    color: var(--wound);
    text-transform: uppercase;
    letter-spacing: 0.12em;
  }
  @keyframes state-blink {
    50% {
      opacity: 0.25;
    }
  }

  /* ---- debuff strip: every affliction, labelled -------------------- */
  .debuffs {
    display: flex;
    flex-wrap: wrap;
    align-items: center;
    justify-content: center;
    gap: 4px;
    min-height: 18px;
    margin-top: 2px;
    max-width: calc(var(--fig) * 1.6);
  }
  .deb {
    display: inline-flex;
    align-items: center;
    gap: 4px;
    padding: 1px 7px;
    border-radius: 6px;
    font-size: 9.5px;
    font-weight: 620;
    letter-spacing: 0.02em;
    border: 1px solid oklch(0.85 0.03 260 / 0.16);
    background: oklch(0.1 0.025 300 / 0.6);
    color: var(--text-dim);
  }
  .deb-glyph {
    font-size: 10px;
    line-height: 1;
  }
  .deb-x {
    font-weight: 680;
    color: var(--text);
  }
  .smolder-chip {
    color: oklch(0.82 0.15 55);
    border-color: oklch(0.72 0.19 45 / 0.4);
    background: oklch(0.16 0.05 40 / 0.6);
  }
  .smolder-chip.volatile {
    color: oklch(0.88 0.16 62);
    border-color: oklch(0.8 0.2 48 / 0.7);
    box-shadow: 0 0 12px -4px oklch(0.78 0.2 45 / 0.8);
  }
  .dot-chip {
    color: oklch(0.8 0.13 135);
    border-color: oklch(0.75 0.13 140 / 0.4);
    background: oklch(0.14 0.04 140 / 0.5);
  }
  .frozen-chip {
    color: oklch(0.83 0.09 210);
    border-color: oklch(0.78 0.1 210 / 0.45);
    background: oklch(0.14 0.03 220 / 0.55);
  }

  /* ---- death and spoils ---------------------------------------------- */

  .dead {
    filter: saturate(0.12) brightness(0.62);
  }

  .dead .totem {
    animation: sink 500ms ease-out both;
  }

  @keyframes sink {
    from {
      translate: 0 0;
    }
    to {
      translate: 0 6px;
    }
  }

  /* a corpse holds still — the idle life belongs to the living */
  .dead .art {
    opacity: 0.55;
  }

  .dead .art :global(svg),
  .dead .art :global(svg *) {
    animation: none;
  }

  .slain-word {
    position: absolute;
    top: 38%;
    left: 50%;
    translate: -50% -50%;
    font-family: var(--font-display);
    font-size: 16px;
    font-style: italic;
    letter-spacing: 0.1em;
    color: var(--text-dim);
    text-shadow: 0 1px 12px oklch(0.05 0.02 280);
    animation: slain-in 320ms ease-out;
    pointer-events: none;
  }

  /* the fight is won: what it carried rises off the corpse as light */
  .spoils-drift {
    position: absolute;
    inset: 0 auto auto 50%;
    translate: -50% 6%;
    width: max-content;
    max-width: calc(var(--fig) * 1.6);
    display: flex;
    flex-direction: column;
    align-items: center;
    gap: 7px;
    z-index: 2;
    animation: spoils-rise 420ms var(--ease-out-expo);
  }

  @keyframes spoils-rise {
    from {
      opacity: 0;
      translate: -50% 14%;
    }
  }

  @keyframes slain-in {
    from {
      opacity: 0;
    }
  }

  .spoils {
    list-style: none;
    margin: 0;
    padding: 0;
    display: grid;
    gap: 3px;
    text-align: center;
  }

  .spoil {
    display: flex;
    align-items: center;
    justify-content: center;
    gap: 7px;
    font-size: 12px;
    font-weight: 600;
    text-shadow: 0 1px 8px oklch(0.05 0.02 280 / 0.95);
  }

  .spoil::before {
    content: '';
    width: 6px;
    height: 6px;
    flex: none;
    background: currentColor;
    box-shadow: 0 0 6px color-mix(in oklch, currentColor 70%, transparent);
  }

  .spoil.gold::before {
    transform: rotate(45deg);
  }

  .spoil.drop::before {
    clip-path: polygon(50% 0, 62% 38%, 100% 50%, 62% 62%, 50% 100%, 38% 62%, 0 50%, 38% 38%);
    width: 8px;
    height: 8px;
  }

  .spoil.mat::before {
    border-radius: 50%;
  }

  .spoil.gold {
    color: var(--gilt);
  }

  .spoil.mat {
    color: var(--ether);
  }

  .spoil.drop {
    color: var(--rarity-common);
  }

  .spoil.drop.uncommon {
    color: var(--rarity-uncommon);
  }

  .spoil.drop.rare {
    color: var(--rarity-rare);
  }

  .spoil.drop.epic {
    color: var(--rarity-epic);
    text-shadow: 0 0 12px color-mix(in oklch, var(--rarity-epic) 60%, transparent);
  }

  .collect {
    padding: 4px 20px;
    border-radius: 99px;
    font-size: 11.5px;
    font-weight: 660;
    letter-spacing: 0.04em;
    cursor: pointer;
    color: var(--gilt);
    border: 1px solid oklch(0.78 0.1 85 / 0.5);
    background: oklch(0.13 0.03 290 / 0.6);
    transition: box-shadow var(--dur-fast) ease;
  }

  .collect:hover {
    box-shadow: 0 0 16px -4px oklch(0.78 0.1 85 / 0.6);
  }

  /* ---- one-shot choreography ------------------------------------------ */

  .figure {
    --power: 1;
    --knock: calc(9px * var(--power));
  }

  :global(.figure.hit) {
    animation: recoil-up 300ms var(--ease-punch);
  }

  :global(.figure.crit-hit) {
    animation: crit-up 560ms var(--ease-punch);
  }

  @keyframes recoil-up {
    0% {
      transform: translate3d(0, 0, 0) scale(1);
      filter: brightness(1.9);
    }
    16% {
      transform: translate3d(2px, calc(var(--knock) * -1), 0) scale(1.02);
      filter: brightness(1.5);
    }
    44% {
      transform: translate3d(-1px, 4px, 0) scale(0.992);
      filter: brightness(1.05);
    }
    72% {
      transform: translate3d(1px, -1px, 0) scale(1);
    }
    100% {
      transform: translate3d(0, 0, 0) scale(1);
      filter: brightness(1);
    }
  }

  @keyframes crit-up {
    0% {
      transform: translate3d(0, 0, 0) scale(1);
      filter: brightness(3.4) saturate(0.2) contrast(1.3) drop-shadow(0 0 34px oklch(0.85 0.16 70 / 0.95));
    }
    10% {
      transform: translate3d(4px, calc(var(--knock) * -2.2), 0) scale(1.05) rotate(1.4deg);
      filter: brightness(2.1) saturate(0.6);
    }
    30% {
      transform: translate3d(-2px, calc(var(--knock) * 0.65), 0) scale(0.975) rotate(-0.7deg);
      filter: brightness(1.25) drop-shadow(0 0 18px oklch(0.8 0.15 60 / 0.6));
    }
    52% {
      transform: translate3d(1px, calc(var(--knock) * -0.4), 0) scale(1.008) rotate(0.3deg);
    }
    76% {
      transform: translate3d(-1px, 0, 0) scale(1);
    }
    100% {
      transform: translate3d(0, 0, 0) scale(1);
    }
  }

  :global(.figure.reborn) {
    animation: figure-arrive 520ms var(--ease-out-expo);
  }

  @keyframes figure-arrive {
    0% {
      opacity: 0;
      transform: scale(1.06);
      filter: brightness(2.4) saturate(0.3);
    }
    100% {
      opacity: 1;
      transform: scale(1);
      filter: brightness(1) saturate(1);
    }
  }

  @media (prefers-reduced-motion: reduce) {
    .state-tag.cast .pip,
    .state-tag.tell .pip,
    .smolder.volatile .ember.lit,
    .figure.telegraph .totem,
    .figure.casting .totem,
    .rank-ring,
    .boss-ring::after,
    .reticle,
    .reticle-tip,
    :global(.figure.hit),
    :global(.figure.crit-hit),
    :global(.figure.reborn) {
      animation: none;
    }
  }
</style>
