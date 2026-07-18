<script lang="ts">
  import { onMount } from 'svelte'
  import type { Game } from '../game.svelte'
  import Filigree from '../components/Filigree.svelte'
  import { CLASS_BY_ID, ORIGIN_BY_ID, SIGN_BY_ID, type ClassId } from '../content/identity'
  import type { Atmosphere } from '../hearth/atmosphere'

  /** The Hearth — the sanctum at the top of the tower. Not a room: an open
   *  platform under the region's night. The dashboard's own surfaces —
   *  glass, hairlines, engraved strokes — float here in real perspective,
   *  leaning as the pointer moves, while a WebGL layer supplies only what
   *  this game has always been made of: stars, embers, dust, light. Your
   *  birth-sign hangs deep in the sky with true parallax. Nothing here
   *  costs or pays out — yet. */
  let { game }: { game: Game } = $props()

  const name = $derived(game.profile?.name ?? 'Wanderer')
  const cls = $derived(game.profile ? CLASS_BY_ID[game.profile.classId as ClassId] : undefined)
  const classHue = $derived(cls?.hue ?? 260)
  const origin = $derived(game.profile ? ORIGIN_BY_ID[game.profile.originId] : undefined)
  const sign = $derived(game.profile ? SIGN_BY_ID[game.profile.signId] : undefined)
  const region = $derived(game.progress.regions.find((r) => r.current))
  const regionHue = $derived(region?.hue ?? 260)

  /* ---- Room state (session-local for now; the wider game will decide
     what, if anything, deserves to persist) ------------------------- */
  let warmth = $state(2) // 1 embers · 2 warm · 3 blazing
  let candleLit = $state(true)
  let kettleOn = $state(false)
  let catPurring = $state(false)
  let pulledBook = $state(-1)
  let openTitle = $state('')
  let line = $state('')
  let lineN = $state(0)
  /** pointer lean, -1..1 — drives the CSS space and the WebGL camera */
  let px = $state(0)
  let py = $state(0)

  let decayTimer: ReturnType<typeof setTimeout> | null = null
  let catTimer: ReturnType<typeof setTimeout> | null = null

  /* ---- The atmosphere -------------------------------------------------- */
  let canvasEl: HTMLCanvasElement | undefined = $state()
  let sky: Atmosphere | null = $state.raw(null)

  onMount(() => {
    line = `Welcome home, ${name}. The fire kept your seat.`
    let cancelled = false
    let cleanup: (() => void) | null = null

    /* three.js rides in its own chunk — the rest of the game never pays
       for the night sky */
    void setUp().then((c) => {
      if (cancelled) c?.()
      else cleanup = c
    })

    async function setUp(): Promise<(() => void) | null> {
      const { createAtmosphere, resolveCssColor } = await import('../hearth/atmosphere')
      if (cancelled || !canvasEl) return null

      const reducedMotion =
        window.matchMedia('(prefers-reduced-motion: reduce)').matches ||
        document.documentElement.dataset.motion === 'reduced'

      const a = createAtmosphere(canvasEl, {
        gilt: resolveCssColor('oklch(0.78 0.1 85)', 0xd8b96a),
        sign: sign ? { stars: sign.stars, lines: sign.lines } : null,
        ember: { x: 0.22, y: 0.7 },
        reducedMotion,
      })
      sky = a
      return () => {
        sky?.dispose()
        sky = null
      }
    }

    return () => {
      cancelled = true
      cleanup?.()
      if (decayTimer) clearTimeout(decayTimer)
      if (catTimer) clearTimeout(catTimer)
    }
  })

  $effect(() => {
    sky?.setWarmth(warmth)
  })

  function onStageMove(e: PointerEvent): void {
    const el = e.currentTarget as HTMLElement
    const r = el.getBoundingClientRect()
    px = ((e.clientX - r.left) / r.width) * 2 - 1
    py = ((e.clientY - r.top) / r.height) * 2 - 1
    sky?.setPointer(px, py)
  }

  function onStageLeave(): void {
    px = 0
    py = 0
    sky?.setPointer(0, 0)
  }

  function pick<T>(arr: readonly T[]): T {
    return arr[Math.floor(Math.random() * arr.length)] as T
  }

  function say(text: string): void {
    line = text
    lineN += 1
  }

  /* ---- The fire ---------------------------------------------------- */
  const STOKE_LINES = [
    'You feed the fire another log. It says thank you in sparks.',
    'The fire stands up straighter.',
    'The flames take the log the way the cat takes dinner: immediately.',
  ]

  function stoke(): void {
    if (warmth < 3) warmth += 1
    say(warmth === 3 ? 'The hearth is blazing. The whole sanctum leans toward it.' : pick(STOKE_LINES))
    if (decayTimer) clearTimeout(decayTimer)
    // an untended fire settles back down, one step at a time
    const settle = () => {
      if (warmth > 1) {
        warmth -= 1
        decayTimer = setTimeout(settle, 45_000)
      }
    }
    decayTimer = setTimeout(settle, 45_000)
  }

  const WARMTH_LABEL = ['', 'embers', 'warm', 'blazing']

  /* ---- The cat ------------------------------------------------------ */
  const CAT_LINES = [
    'The cat permits it.',
    'The cat opens one eye, files a report, and closes it again.',
    'A purr starts up like a small, satisfied engine.',
    'The cat relocates two inches closer to the fire. Diplomacy.',
  ]

  function petCat(): void {
    catPurring = true
    say(pick(CAT_LINES))
    if (catTimer) clearTimeout(catTimer)
    catTimer = setTimeout(() => {
      catPurring = false
    }, 2600)
  }

  /* ---- The shelf ----------------------------------------------------
     Spines are dealt once per visit — a real shelf is never tidy twice. */
  const LIBRARY = [
    ['A Field Guide to Things That Bite', 'Chapter one: everything.'],
    ['The Care and Feeding of Ledgers', 'The margins are full of your own handwriting.'],
    ['One Hundred Soups of the Reach', 'The bookmark has sat at soup fourteen for a year.'],
    ['Knots', 'A practical book. The practical ones are the ones that save you.'],
    ['Songs for the Walk Home', 'Someone has underlined all the quiet ones.'],
    ['The Atlas, Abridged', 'Abridged, and it still barely fits the shelf.'],
  ] as const

  const SPINES = Array.from({ length: 10 }, (_, i) => ({
    i,
    w: 8 + Math.random() * 7,
    h: 28 + Math.random() * 11,
    lean: Math.random() < 0.18 ? 7 : 0,
  }))
  const SPINE_X = (i: number) => SPINES.slice(0, i).reduce((x, sp) => x + sp.w + 4.5, 8)

  function pullBook(): void {
    let idx = Math.floor(Math.random() * SPINES.length)
    if (idx === pulledBook) idx = (idx + 1) % SPINES.length
    pulledBook = idx
    const [title, blurb] = pick<readonly [string, string]>(LIBRARY)
    openTitle = title
    say(`You pull down “${title}.” ${blurb}`)
  }

  /* ---- Everything else ---------------------------------------------- */
  function toggleCandle(): void {
    candleLit = !candleLit
    say(candleLit ? 'One small light, relit.' : 'You pinch the candle out. The hearth disapproves.')
  }

  function toggleKettle(): void {
    kettleOn = !kettleOn
    say(kettleOn ? 'You put the kettle on. The most reliable spell you know.' : 'Tea, poured. The kettle retires with honor.')
  }

  function readJournal(): void {
    const l = game.progress.lifetime
    say(
      `The journal's latest page: level ${game.progress.level}, ${l.kills} creatures written off, ${game.progress.gold} gold under the floorboard.`,
    )
  }

  function admireTrophy(): void {
    const bosses = game.progress.lifetime.bossKills
    say(
      bosses > 0
        ? `The skull on the mantle belonged to something that thought it would outlive you. So did the other ${bosses === 1 ? 'boss' : `${bosses} bosses`}.`
        : 'A space on the mantle, kept clear. It is waiting for a skull worth the dusting.',
    )
  }

  function admireBanner(): void {
    say(cls ? `The banner remembers what you are: ${cls.epithet}.` : 'An old banner in the observatory’s colors. It was here before you.')
  }

  function lookOutside(): void {
    sky?.pulseSign()
    say(
      region
        ? `Outside, ${region.name} keeps its weather. Up here, the weather is yours.`
        : 'Outside, the reach keeps its weather. Up here, the weather is yours.',
    )
  }

  function tryDoor(): void {
    say('Not tonight. The reach will still be there in the morning.')
  }
</script>

<div class="stack" style:--ch={classHue} style:--rh={regionHue} style:--warmth={warmth}>
  <!-- the sanctum's light: warmth washes the board, the lost candle lets dusk in -->
  <div class="roomlight" aria-hidden="true"></div>
  <div class="dusk" class:on={!candleLit} aria-hidden="true"></div>

  <header class="head">
    <div>
      <h2>{name}'s Sanctum</h2>
      <span class="sub">{cls ? cls.epithet.toLowerCase() : 'the top of the observatory tower'}</span>
    </div>
    <div class="chips" aria-hidden="true">
      <span class="chip">hearth · {WARMTH_LABEL[warmth]}</span>
      <span class="chip">candle · {candleLit ? 'lit' : 'out'}</span>
      <span class="chip">kettle · {kettleOn ? 'singing' : 'idle'}</span>
      <span class="chip">cat · {catPurring ? 'purring' : 'asleep'}</span>
    </div>
  </header>

  <!-- ── The sanctum: one open platform under the night ─────────────── -->
  <section
    class="glass sanctum"
    aria-label="Your sanctum: floating stations under the night sky"
    onpointermove={onStageMove}
    onpointerleave={onStageLeave}
  >
    <Filigree />
    <!-- the night: region ink (CSS) + stars, sign, embers, dust (WebGL) -->
    <div class="nebula" aria-hidden="true"></div>
    <canvas class="atmo" bind:this={canvasEl} aria-hidden="true"></canvas>

    <!-- the observatory floor, engraved, lying in perspective -->
    <div class="floor-wrap" aria-hidden="true" style:--px={px} style:--py={py}>
      <svg class="floor-rose" viewBox="0 0 400 400">
        <circle cx="200" cy="200" r="192" fill="none" />
        <circle cx="200" cy="200" r="150" fill="none" class="dashed spin" />
        <circle cx="200" cy="200" r="98" fill="none" opacity="0.6" />
        <path d="M200 26 V80 M200 320 V374 M26 200 H80 M320 200 H374" opacity="0.55" />
        <path d="M200 162 L209 191 L238 200 L209 209 L200 238 L191 209 L162 200 L191 191 Z" class="rose-star" />
        {#each Array.from({ length: 24 }, (_, i) => i) as i (i)}
          <line
            x1={200 + 186 * Math.cos((i * Math.PI) / 12)}
            y1={200 + 186 * Math.sin((i * Math.PI) / 12)}
            x2={200 + 178 * Math.cos((i * Math.PI) / 12)}
            y2={200 + 178 * Math.sin((i * Math.PI) / 12)}
            opacity="0.5"
          />
        {/each}
      </svg>
    </div>

    <!-- the space: everything in here floats at depth and leans with you -->
    <div class="space" style:--px={px} style:--py={py}>
      <!-- the hearth: a fire of pure light on its own small ring -->
      <div class="fire-anchor" aria-hidden="true">
        <div class="firelight">
          <span class="tongue a"></span>
          <span class="tongue b"></span>
          <span class="tongue c"></span>
        </div>
        <svg class="fire-ring" viewBox="0 0 120 34">
          <ellipse cx="60" cy="17" rx="54" ry="13" fill="none" />
          <ellipse cx="60" cy="17" rx="36" ry="8.5" fill="none" class="dashed" opacity="0.6" />
        </svg>
      </div>

      <!-- The Hearth station -->
      <div class="plaque pos-hearth glasslet">
        <span class="plaque-title">The Hearth</span>
        <button class="art-btn" aria-label="Stoke the fire" onclick={stoke}>
          <svg viewBox="0 0 24 24" class="stroke"><path d="M12 20 q-5 -1.5 -5 -6.5 q0 -3.5 3 -6 q-0.5 3 1.5 4 q-0.5 -4.5 3.5 -8 q0.5 4 2.5 6 q2 2 2 4.5 q0 4.5 -5 6" /></svg>
          <span>stoke</span>
        </button>
        <div class="gauge" role="img" aria-label="Warmth: {WARMTH_LABEL[warmth]}">
          {#each [1, 2, 3] as w (w)}
            <span class="coal" class:hot={warmth >= w}></span>
          {/each}
          <span class="gauge-label">{WARMTH_LABEL[warmth]}</span>
        </div>
        <div class="row">
          <button
            class="mini"
            class:on={kettleOn}
            aria-label={kettleOn ? 'Take the kettle off' : 'Put the kettle on'}
            title="Kettle"
            onclick={toggleKettle}
          >
            <svg viewBox="0 0 24 24" class="stroke">
              <path d="M7 14 q0 -5 5 -5 q5 0 5 5 q0 4 -5 4 q-5 0 -5 -4 Z M8.5 10.5 q3.5 -4 7 0 M17 13 q2.5 -0.5 3 -2.5" />
              {#if kettleOn}
                <path class="wisp" style:--wd="0s" d="M10.5 7 q-1.5 -2 0 -3.5" />
                <path class="wisp" style:--wd="0.9s" d="M13.5 7 q1.5 -2 0 -3.5" />
              {/if}
            </svg>
          </button>
          <button class="mini" aria-label="The trophy on the mantle" title="The trophy" onclick={admireTrophy}>
            <svg viewBox="0 0 24 24" class="stroke">
              <path d="M12 3.5 q-6.5 0 -6.5 6 q0 3.6 3 5 l0 3 h7 l0 -3 q3 -1.4 3 -5 q0 -6 -6.5 -6 Z M10 17.5 v2 M14 17.5 v2" />
              <circle cx="9.4" cy="10" r="1.1" />
              <circle cx="14.6" cy="10" r="1.1" />
            </svg>
            <span class="num">{game.progress.lifetime.bossKills}</span>
          </button>
        </div>
      </div>

      <!-- The cat, close to the fire -->
      <button class="plaque pos-cat glasslet as-btn" class:purring={catPurring} aria-label="Pet the cat" onclick={petCat}>
        <span class="plaque-title">The Cat</span>
        <svg class="cat-svg" viewBox="0 0 120 62" aria-hidden="true">
          <g class="cat-line stroke">
            <path d="M26 48 Q14 40 20 26 Q28 10 52 8 Q70 6 80 13 L84 5 L89 11 L95 7 L97 14 Q101 22 95 29 Q88 38 76 41 Q58 48 40 49 Q31 49 26 48 Z" />
            <path d="M30 47 q-12 2 -14 -8 q-1 -7 7 -9" />
            <path class="fine" d="M84 22 q3 2.5 6 0 M92 27 l7 1 M91 30 l7 3" />
          </g>
          {#if catPurring}
            <g class="purr stroke" aria-hidden="true">
              <path style:--pd="0s" d="M102 26 q5 -6 0 -12" />
              <path style:--pd="0.4s" d="M108 29 q7 -9 0 -18" />
              <path style:--pd="0.8s" d="M114 32 q9 -12 0 -24" />
            </g>
          {/if}
          <path class="stroke" d="M16 54 H104" opacity="0.4" />
        </svg>
        <span class="plaque-note">{catPurring ? 'purring, audibly' : 'asleep by the fire'}</span>
      </button>

      <!-- The Archive, hanging back and to the right -->
      <button class="plaque pos-archive glasslet as-btn" aria-label="Borrow a book from the shelf" onclick={pullBook}>
        <span class="plaque-title">The Archive</span>
        <svg class="shelf-svg" viewBox="0 0 160 52" aria-hidden="true">
          {#each SPINES as s (s.i)}
            <rect
              class="spine stroke"
              class:pulled={pulledBook === s.i}
              x={SPINE_X(s.i)}
              y={46 - s.h}
              width={s.w}
              height={s.h}
              rx="1.5"
              transform={s.lean ? `rotate(${s.lean} ${SPINE_X(s.i) + s.w / 2} 46)` : undefined}
            />
          {/each}
          <path class="stroke" d="M4 48 H156" />
        </svg>
        <span class="plaque-note">{openTitle ? `open: “${openTitle}”` : 'nothing borrowed — yet'}</span>
      </button>

      <!-- The Ledger, front right, with its candle -->
      <div class="plaque pos-ledger glasslet">
        <span class="plaque-title">The Ledger</span>
        <div class="row wide">
          <button class="ledger" aria-label="Read the journal" onclick={readJournal}>
            <span class="ledger-line"><span>level</span><span class="dots"></span><span class="num">{game.progress.level}</span></span>
            <span class="ledger-line"><span>written off</span><span class="dots"></span><span class="num">{game.progress.lifetime.kills}</span></span>
            <span class="ledger-line"><span>gold</span><span class="dots"></span><span class="num">{game.progress.gold}</span></span>
          </button>
          <button
            class="candle"
            class:lit={candleLit}
            aria-label={candleLit ? 'Snuff the candle' : 'Light the candle'}
            onclick={toggleCandle}
          >
            <span class="candle-halo" aria-hidden="true"></span>
            <svg viewBox="0 0 24 34" aria-hidden="true" class="stroke">
              <path d="M9 16 h6 v14 h-6 Z M7 30 h10" />
              {#if candleLit}
                <path class="candle-flame" d="M12 13.5 q-3 -4.5 0 -8.5 q3 4 0 8.5 Z" />
              {:else}
                <path class="candle-wisp" d="M12 12 q-2 -3.5 0.8 -6 q-2.4 -2.6 -0.4 -5" />
              {/if}
            </svg>
          </button>
        </div>
      </div>

      <!-- the banner, hung high in the space -->
      <button class="banner-float as-btn" aria-label="Your class banner" onclick={admireBanner}>
        <svg viewBox="0 0 26 40" aria-hidden="true">
          <path class="banner-rod" d="M2 3 H24" />
          <path class="pennant" d="M4 4 h18 v24 l-9 8 l-9 -8 Z" />
          <path class="pennant-star" d="M13 13 l2 5 l5 2 l-5 2 l-2 5 l-2 -5 l-5 -2 l5 -2 Z" />
        </svg>
        <span>{cls ? cls.name : 'the observatory'}</span>
      </button>

      <!-- the sky itself is a station -->
      <button class="sky-btn as-btn" aria-label="Look out the window" onclick={lookOutside}>
        <svg viewBox="0 0 24 24" class="stroke" aria-hidden="true">
          <path d="M16 3 a9.5 9.5 0 1 0 0 18 a7.5 7.5 0 0 1 0 -18 Z" />
        </svg>
        <span>the sky</span>
      </button>
    </div>

    <span class="stage-note" aria-hidden="true">
      {region ? `over ${region.name.toLowerCase()}` : 'over the reach'}{sign ? ` · under ${sign.name.toLowerCase()}` : ''}
    </span>
  </section>

  <!-- ── The Door ──────────────────────────────────────────────────── -->
  <section class="glass pane door" aria-label="The door">
    <button class="door-glyph" aria-label="The door out" onclick={tryDoor}>
      <svg viewBox="0 0 36 48" aria-hidden="true">
        <path d="M6 46 V18 Q6 6 18 6 Q30 6 30 18 V46" />
        <path d="M11 46 V19 Q11 10.5 18 10.5 Q25 10.5 25 19 V46" opacity="0.6" />
        <circle cx="22.5" cy="29" r="1.4" />
      </svg>
    </button>
    <div class="door-text">
      <span class="door-title">The stair</span>
      <span class="door-sub">{origin ? origin.line : 'The stairs wind down toward the reach.'}</span>
    </div>
    <button class="btn-out" onclick={() => game.setView('combat')}>Step into the Reach</button>
  </section>

  {#key lineN}
    <p class="caption">{line}</p>
  {/key}
</div>

<style>
  .stack {
    display: flex;
    flex-direction: column;
    gap: 16px;
    position: relative;
  }

  /* ---- Sanctum light --------------------------------------------------- */
  .roomlight {
    position: absolute;
    inset: -20px;
    pointer-events: none;
    z-index: 4;
    background: radial-gradient(55% 60% at 24% 48%, oklch(0.72 0.13 60 / 0.09) 0%, transparent 70%);
    opacity: calc(var(--warmth) * 0.33);
    transition: opacity var(--dur-slow) ease;
  }

  .dusk {
    position: absolute;
    inset: -20px;
    pointer-events: none;
    z-index: 4;
    background: oklch(0.08 0.03 300);
    opacity: 0;
    transition: opacity var(--dur-slow) ease;
  }

  .dusk.on {
    opacity: calc(0.26 - var(--warmth) * 0.06);
  }

  /* ---- Header ----------------------------------------------------------- */
  .head {
    display: flex;
    justify-content: space-between;
    align-items: flex-end;
    gap: 16px;
    flex-wrap: wrap;
  }

  h2 {
    font-size: 21px;
  }

  .sub {
    font-size: 11.5px;
    letter-spacing: 0.16em;
    text-transform: uppercase;
    color: var(--text-dim);
  }

  .chips {
    display: flex;
    gap: 6px;
    flex-wrap: wrap;
  }

  .chip {
    font-size: 10.5px;
    letter-spacing: 0.08em;
    text-transform: uppercase;
    color: var(--text-dim);
    padding: 4px 10px;
    border-radius: 99px;
    border: 1px solid oklch(0.85 0.03 260 / 0.12);
    background: oklch(0.8 0.02 260 / 0.04);
  }

  /* ---- The sanctum ------------------------------------------------------- */
  .sanctum {
    position: relative;
    height: clamp(430px, 58vh, 540px);
    border-radius: var(--radius);
    overflow: hidden;
    /* the deep field: everything inside floats in this perspective */
    perspective: 1100px;
    perspective-origin: 50% 42%;
  }

  /* region ink behind everything — same night the whole app sits under */
  .nebula {
    position: absolute;
    inset: 0;
    background:
      radial-gradient(70% 55% at 72% 8%, oklch(0.32 0.08 var(--rh) / 0.4) 0%, transparent 70%),
      radial-gradient(60% 50% at 14% 90%, oklch(0.4 0.09 60 / calc(var(--warmth) * 0.09)) 0%, transparent 70%),
      linear-gradient(180deg, oklch(0.12 0.035 305) 0%, oklch(0.17 0.05 var(--rh)) 100%);
  }

  .atmo {
    position: absolute;
    inset: 0;
    width: 100%;
    height: 100%;
    display: block;
  }

  /* ---- The floor rose: engraved brass, lying down ------------------------ */
  .floor-wrap {
    position: absolute;
    left: 50%;
    bottom: -34%;
    width: min(150%, 900px);
    aspect-ratio: 1;
    transform: translateX(-50%) rotateX(74deg) rotateZ(calc(var(--px) * 1.2deg));
    transform-origin: 50% 50%;
    pointer-events: none;
    opacity: 0.5;
  }

  .floor-rose {
    width: 100%;
    height: 100%;
  }

  .floor-rose circle,
  .floor-rose path,
  .floor-rose line {
    stroke: oklch(0.75 0.07 82 / 0.55);
    stroke-width: 1.2;
    fill: none;
  }

  .floor-rose .rose-star {
    fill: none;
    stroke: oklch(0.78 0.09 85 / 0.55);
  }

  .dashed {
    stroke-dasharray: 5 8;
  }

  .spin {
    animation: rose-turn 140s linear infinite;
    transform-origin: 50% 50%;
  }

  @keyframes rose-turn {
    to {
      rotate: 360deg;
    }
  }

  /* ---- The space: floating stations -------------------------------------- */
  .space {
    position: absolute;
    inset: 0;
    transform-style: preserve-3d;
    transform: rotateY(calc(var(--px) * 2.4deg)) rotateX(calc(var(--py) * -1.6deg));
    transition: transform 0.4s var(--ease-out-expo);
  }

  /* one shared engraved-stroke voice for every glyph in the sanctum */
  .stroke,
  .stroke path {
    fill: none;
    stroke: oklch(0.75 0.06 82 / 0.6);
    stroke-width: 1.4;
    stroke-linecap: round;
    stroke-linejoin: round;
  }

  .stroke .fine {
    stroke-width: 1;
    stroke: oklch(0.75 0.06 82 / 0.4);
  }

  .stroke circle {
    fill: oklch(0.75 0.06 82 / 0.6);
    stroke: none;
  }

  /* ---- The fire ----------------------------------------------------------- */
  .fire-anchor {
    position: absolute;
    left: 17%;
    bottom: 26%;
    width: 120px;
    transform: translateZ(40px);
    pointer-events: none;
  }

  .firelight {
    position: relative;
    height: 120px;
    opacity: calc(0.5 + var(--warmth) * 0.17);
    transition: opacity var(--dur-slow) ease;
  }

  .tongue {
    position: absolute;
    bottom: 0;
    left: 50%;
    border-radius: 50% 50% 42% 42%;
    filter: blur(7px);
    transform-origin: 50% 100%;
    will-change: transform, opacity;
  }

  .tongue.a {
    width: 56px;
    height: calc(44px + var(--warmth) * 16px);
    margin-left: -28px;
    background: radial-gradient(50% 70% at 50% 85%, oklch(0.62 0.17 40 / 0.8), transparent 75%);
    animation: tongue-breathe 1.9s ease-in-out infinite alternate;
  }

  .tongue.b {
    width: 38px;
    height: calc(34px + var(--warmth) * 13px);
    margin-left: -19px;
    background: radial-gradient(50% 70% at 50% 85%, oklch(0.74 0.16 60 / 0.85), transparent 72%);
    animation: tongue-breathe 1.4s ease-in-out -0.6s infinite alternate;
  }

  .tongue.c {
    width: 20px;
    height: calc(22px + var(--warmth) * 10px);
    margin-left: -10px;
    background: radial-gradient(50% 70% at 50% 88%, oklch(0.87 0.12 85 / 0.9), transparent 70%);
    animation: tongue-breathe 1.1s ease-in-out -1s infinite alternate;
  }

  @keyframes tongue-breathe {
    from {
      transform: scaleY(0.9) scaleX(1.05) translateX(-2%);
    }
    to {
      transform: scaleY(1.1) scaleX(0.95) translateX(2%);
    }
  }

  .fire-ring {
    display: block;
    width: 100%;
    margin-top: -12px;
  }

  .fire-ring ellipse {
    stroke: oklch(0.78 0.09 85 / 0.55);
    stroke-width: 1.2;
  }

  /* ---- Plaques: the dashboard's glass, floating --------------------------- */
  .glasslet {
    background: oklch(0.5 0.05 75 / 0.08);
    border: 1px solid oklch(0.78 0.08 82 / 0.28);
    border-radius: var(--radius-sm);
    backdrop-filter: blur(10px);
    box-shadow: 0 18px 34px -18px oklch(0.05 0.03 300 / 0.9);
  }

  .plaque {
    position: absolute;
    display: flex;
    flex-direction: column;
    gap: 8px;
    padding: 12px 14px;
    transition: transform 0.35s var(--ease-out-expo), box-shadow 0.35s ease;
  }

  .plaque:hover,
  .plaque:focus-within,
  .as-btn.plaque:focus-visible {
    box-shadow: 0 26px 44px -18px oklch(0.05 0.03 300 / 0.95), 0 0 24px -8px oklch(0.78 0.1 85 / 0.35);
  }

  .as-btn {
    cursor: pointer;
    color: inherit;
    text-align: left;
    font: inherit;
  }

  .as-btn:focus-visible {
    outline: 1px solid oklch(0.78 0.1 85 / 0.55);
    outline-offset: 3px;
  }

  .plaque-title {
    font-size: 10.5px;
    letter-spacing: 0.2em;
    text-transform: uppercase;
    color: var(--text-dim);
    font-weight: 560;
  }

  .plaque-note {
    font-size: 11px;
    font-style: italic;
    font-family: var(--font-display);
    color: var(--text-dim);
  }

  /* positions in the space — nearer things carry more Z */
  .pos-hearth {
    left: 5%;
    bottom: 12%;
    width: 178px;
    transform: translateZ(70px) rotateY(4deg);
  }

  .pos-hearth:hover,
  .pos-hearth:focus-within {
    transform: translateZ(96px) rotateY(4deg);
  }

  .pos-cat {
    left: 33%;
    bottom: 7%;
    width: 168px;
    transform: translateZ(95px) rotateY(-2deg);
  }

  .pos-cat:hover,
  .pos-cat:focus-visible {
    transform: translateZ(120px) rotateY(-2deg);
  }

  .pos-archive {
    right: 6%;
    top: 13%;
    width: 200px;
    transform: translateZ(10px) rotateY(-6deg);
  }

  .pos-archive:hover,
  .pos-archive:focus-visible {
    transform: translateZ(36px) rotateY(-6deg);
  }

  .pos-ledger {
    right: 4%;
    bottom: 10%;
    width: 232px;
    transform: translateZ(60px) rotateY(-5deg);
  }

  .pos-ledger:hover,
  .pos-ledger:focus-within {
    transform: translateZ(84px) rotateY(-5deg);
  }

  /* ---- Hearth plaque bits -------------------------------------------------- */
  .art-btn {
    display: inline-flex;
    align-items: center;
    gap: 8px;
    align-self: flex-start;
    padding: 6px 12px;
    border-radius: 99px;
    border: 1px solid oklch(0.85 0.03 260 / 0.18);
    background: oklch(0.8 0.02 260 / 0.06);
    color: var(--text);
    font-size: 12px;
    letter-spacing: 0.06em;
    cursor: pointer;
    transition: border-color var(--dur-fast) ease, box-shadow var(--dur-fast) ease;
  }

  .art-btn:hover,
  .art-btn:focus-visible {
    border-color: oklch(0.78 0.1 85 / 0.45);
    box-shadow: 0 0 14px -4px oklch(0.78 0.1 85 / 0.5);
  }

  .art-btn svg {
    width: 15px;
    height: 15px;
  }

  .gauge {
    display: flex;
    align-items: center;
    gap: 7px;
  }

  .coal {
    width: 8px;
    height: 8px;
    rotate: 45deg;
    border: 1px solid oklch(0.75 0.06 82 / 0.5);
    border-radius: 2px;
    transition: background var(--dur) ease, box-shadow var(--dur) ease;
  }

  .coal.hot {
    background: oklch(0.74 0.15 55);
    border-color: oklch(0.8 0.13 65 / 0.8);
    box-shadow: 0 0 8px oklch(0.74 0.16 50 / 0.6);
  }

  .gauge-label {
    margin-left: 4px;
    font-size: 10px;
    letter-spacing: 0.14em;
    text-transform: uppercase;
    color: var(--text-dim);
  }

  .row {
    display: flex;
    gap: 8px;
    align-items: stretch;
  }

  .row.wide {
    align-items: stretch;
  }

  .mini {
    display: inline-flex;
    align-items: center;
    gap: 5px;
    padding: 5px 9px;
    border-radius: 99px;
    border: 1px solid oklch(0.85 0.03 260 / 0.16);
    background: oklch(0.8 0.02 260 / 0.05);
    color: var(--text-dim);
    font-size: 10.5px;
    cursor: pointer;
    transition: color var(--dur-fast) ease, border-color var(--dur-fast) ease, box-shadow var(--dur-fast) ease;
  }

  .mini:hover,
  .mini:focus-visible {
    color: var(--text);
    border-color: oklch(0.78 0.1 85 / 0.4);
  }

  .mini.on {
    color: var(--text);
    border-color: oklch(0.78 0.1 85 / 0.45);
    box-shadow: 0 0 12px -4px oklch(0.78 0.1 85 / 0.5);
  }

  .mini svg {
    width: 15px;
    height: 15px;
    overflow: visible;
  }

  .wisp {
    opacity: 0;
    animation: wisp-rise 2.4s ease-out var(--wd) infinite;
  }

  @keyframes wisp-rise {
    0% {
      transform: translateY(2px);
      opacity: 0;
    }
    25% {
      opacity: 0.7;
    }
    100% {
      transform: translateY(-4px);
      opacity: 0;
    }
  }

  /* ---- Cat / Archive art ---------------------------------------------------- */
  .cat-svg {
    width: 100%;
    height: auto;
  }

  .cat-line {
    transform-box: fill-box;
    transform-origin: center bottom;
    animation: cat-breathe 3.8s ease-in-out infinite alternate;
  }

  .purring .cat-line {
    animation-duration: 1.2s;
  }

  @keyframes cat-breathe {
    to {
      transform: scaleY(1.03);
    }
  }

  .purr path {
    stroke: oklch(0.78 0.1 85 / 0.6) !important;
    stroke-width: 1.2;
    opacity: 0;
    animation: purr-fade 1.3s ease-out var(--pd) infinite;
  }

  @keyframes purr-fade {
    0% {
      opacity: 0;
    }
    30% {
      opacity: 0.8;
    }
    100% {
      opacity: 0;
    }
  }

  .shelf-svg {
    width: 100%;
    height: auto;
  }

  .spine {
    transition: transform var(--dur) var(--ease-spring), stroke var(--dur) ease;
    transform-box: fill-box;
    transform-origin: center bottom;
  }

  .spine.pulled {
    transform: translateY(-5px);
    stroke: oklch(0.82 0.11 85 / 0.95) !important;
    filter: drop-shadow(0 0 4px oklch(0.78 0.1 85 / 0.5));
  }

  /* ---- Ledger & candle ------------------------------------------------------- */
  .ledger {
    flex: 1;
    display: flex;
    flex-direction: column;
    justify-content: center;
    gap: 6px;
    border: 0;
    background: none;
    padding: 2px 2px;
    cursor: pointer;
    border-radius: var(--radius-sm);
    text-align: left;
    transition: filter var(--dur-fast) ease;
  }

  .ledger:hover,
  .ledger:focus-visible {
    filter: brightness(1.25);
  }

  .ledger:focus-visible {
    outline: 1px solid oklch(0.78 0.1 85 / 0.5);
    outline-offset: 3px;
  }

  .ledger-line {
    display: flex;
    align-items: baseline;
    gap: 7px;
    font-size: 10.5px;
    letter-spacing: 0.08em;
    text-transform: uppercase;
    color: var(--text-dim);
  }

  .ledger-line .num {
    font-family: var(--font-display);
    font-size: 14px;
    font-weight: 620;
    color: var(--text);
  }

  .dots {
    flex: 1;
    border-bottom: 1px dotted oklch(0.7 0.05 82 / 0.35);
    transform: translateY(-3px);
  }

  .candle {
    position: relative;
    width: 46px;
    border: 0;
    background: none;
    padding: 0;
    cursor: pointer;
    border-radius: var(--radius-sm);
    display: grid;
    place-items: center;
  }

  .candle svg {
    width: 26px;
    height: auto;
    position: relative;
  }

  .candle-flame {
    stroke: oklch(0.85 0.13 80) !important;
    animation: candle-sway 2.3s ease-in-out infinite alternate;
    transform-origin: center bottom;
    transform-box: fill-box;
  }

  @keyframes candle-sway {
    from {
      transform: scaleY(0.92) rotate(-3deg);
    }
    to {
      transform: scaleY(1.1) rotate(3deg);
    }
  }

  .candle-wisp {
    stroke: oklch(0.7 0.02 240 / 0.45) !important;
  }

  .candle-halo {
    position: absolute;
    width: 60px;
    height: 60px;
    left: 50%;
    top: 50%;
    transform: translate(-50%, -58%);
    border-radius: 50%;
    background: radial-gradient(closest-side, oklch(0.85 0.1 85 / 0.22) 0%, transparent 100%);
    opacity: 0;
    transition: opacity var(--dur-slow) ease;
    pointer-events: none;
  }

  .candle.lit .candle-halo {
    opacity: 1;
  }

  .candle:hover,
  .candle:focus-visible {
    filter: brightness(1.25);
  }

  .candle:focus-visible {
    outline: 1px solid oklch(0.78 0.1 85 / 0.5);
    outline-offset: 2px;
  }

  /* ---- Banner & sky ----------------------------------------------------------- */
  .banner-float {
    position: absolute;
    left: 40%;
    top: 8%;
    display: flex;
    flex-direction: column;
    align-items: center;
    gap: 4px;
    border: 0;
    background: none;
    padding: 6px;
    border-radius: var(--radius-sm);
    color: var(--text-dim);
    font-size: 10px;
    letter-spacing: 0.14em;
    text-transform: uppercase;
    transform: translateZ(25px);
    transition: transform 0.35s var(--ease-out-expo), color var(--dur-fast) ease;
    transform-origin: 50% 0;
    animation: banner-drift 7s ease-in-out infinite alternate;
  }

  @keyframes banner-drift {
    from {
      rotate: -1.2deg;
    }
    to {
      rotate: 1.4deg;
    }
  }

  .banner-float:hover,
  .banner-float:focus-visible {
    color: var(--text);
    transform: translateZ(48px);
  }

  .banner-float:focus-visible {
    outline: 1px solid oklch(0.78 0.1 85 / 0.5);
    outline-offset: 2px;
  }

  .banner-float svg {
    width: 30px;
    height: auto;
  }

  .banner-rod {
    stroke: oklch(0.78 0.1 85 / 0.7);
    stroke-width: 1.6;
    stroke-linecap: round;
    fill: none;
  }

  .pennant {
    fill: oklch(0.42 0.11 var(--ch) / 0.5);
    stroke: oklch(0.7 0.1 var(--ch) / 0.85);
    stroke-width: 1.2;
  }

  .pennant-star {
    fill: oklch(0.85 0.09 var(--ch) / 0.95);
  }

  .sky-btn {
    position: absolute;
    right: 9%;
    top: 42%;
    display: inline-flex;
    align-items: center;
    gap: 6px;
    padding: 6px 12px;
    border-radius: 99px;
    border: 1px solid oklch(0.85 0.03 260 / 0.16);
    background: oklch(0.1 0.03 300 / 0.35);
    backdrop-filter: blur(6px);
    color: var(--text-dim);
    font-size: 10.5px;
    letter-spacing: 0.14em;
    text-transform: uppercase;
    transform: translateZ(0px);
    transition: color var(--dur-fast) ease, border-color var(--dur-fast) ease;
  }

  .sky-btn:hover,
  .sky-btn:focus-visible {
    color: var(--text);
    border-color: oklch(0.78 0.1 85 / 0.4);
  }

  .sky-btn svg {
    width: 13px;
    height: 13px;
  }

  .stage-note {
    position: absolute;
    right: 16px;
    bottom: 10px;
    font-size: 10.5px;
    font-style: italic;
    font-family: var(--font-display);
    color: var(--text-dim);
    pointer-events: none;
    z-index: 2;
  }

  /* ---- Door -------------------------------------------------------------------- */
  .pane {
    position: relative;
    padding: 14px 18px;
  }

  .pane.door {
    display: flex;
    flex-direction: row;
    align-items: center;
    gap: 16px;
  }

  .door-glyph {
    border: 0;
    background: none;
    padding: 2px;
    cursor: pointer;
    border-radius: var(--radius-sm);
    transition: filter var(--dur-fast) ease;
  }

  .door-glyph:hover,
  .door-glyph:focus-visible {
    filter: brightness(1.3);
  }

  .door-glyph:focus-visible {
    outline: 1px solid oklch(0.78 0.1 85 / 0.5);
    outline-offset: 2px;
  }

  .door-glyph svg {
    width: 30px;
    height: auto;
    display: block;
  }

  .door-glyph path {
    fill: none;
    stroke: oklch(0.75 0.06 82 / 0.55);
    stroke-width: 1.5;
    stroke-linecap: round;
  }

  .door-glyph circle {
    fill: var(--gilt);
  }

  .door-text {
    display: flex;
    flex-direction: column;
    gap: 2px;
    flex: 1;
    min-width: 180px;
  }

  .door-title {
    font-family: var(--font-display);
    font-size: 15px;
    font-weight: 620;
  }

  .door-sub {
    font-size: 12px;
    font-style: italic;
    font-family: var(--font-display);
    color: var(--text-dim);
  }

  .btn-out {
    padding: 8px 18px;
    border-radius: 99px;
    font-size: 12.5px;
    font-weight: 640;
    letter-spacing: 0.03em;
    cursor: pointer;
    color: var(--text);
    border: 1px solid oklch(0.6 0.13 30 / 0.55);
    background: linear-gradient(180deg, oklch(0.5 0.15 30 / 0.28), oklch(0.5 0.15 30 / 0.12));
    transition: box-shadow var(--dur-fast) ease, border-color var(--dur-fast) ease;
  }

  .btn-out:hover,
  .btn-out:focus-visible {
    border-color: oklch(0.65 0.15 30 / 0.8);
    box-shadow: 0 0 18px -4px oklch(0.6 0.16 30 / 0.55);
  }

  /* ---- Caption ------------------------------------------------------------------ */
  .caption {
    margin: 0;
    min-height: 1.5em;
    font-family: var(--font-display);
    font-style: italic;
    font-size: 14.5px;
    color: var(--text-dim);
    text-align: center;
    animation: caption-in var(--dur-slow) var(--ease-out-expo);
  }

  @keyframes caption-in {
    from {
      opacity: 0;
      transform: translateY(5px);
    }
  }

  @media (max-width: 1000px) {
    .sanctum {
      height: clamp(500px, 72vh, 640px);
    }

    .pos-archive {
      top: 9%;
      right: 4%;
    }

    .banner-float {
      left: 8%;
      top: 8%;
    }

    .sky-btn {
      top: 34%;
    }
  }

  @media (prefers-reduced-motion: reduce) {
    .tongue,
    .cat-line,
    .purr path,
    .candle-flame,
    .banner-float,
    .spin,
    .wisp,
    .caption {
      animation: none;
    }

    .space,
    .plaque,
    .banner-float {
      transition: none;
    }

    .wisp,
    .purr path {
      opacity: 0.5;
    }
  }
</style>
