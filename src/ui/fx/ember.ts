/** Procedural ember art — the living-fire language shared by the hero and every
 *  foe on the field.
 *
 *  Why canvas-2D and not WebGL: a pack can put six-plus figures on screen at
 *  once, and browsers cap WebGL contexts at roughly 8–16. One 2D context per
 *  figure has no such ceiling, composites additively for free, and rides the
 *  same per-figure CSS transforms the arena already drives (drift, recoil,
 *  dormant dimming). The technique is a classic one that performs: additive
 *  sprite particles. A handful of soft ember sprites are baked once at module
 *  load; every particle is a single `drawImage` under `globalCompositeOperation
 *  = 'lighter'`. No per-particle gradients, no shaders, no allocations per frame.
 *
 *  The shape reads because the fire is *masked to a silhouette* — the same
 *  path data the old line-art used, reused here as a `Path2D`. Embers rise
 *  from the base of the shape, filling it; a few escape the crown as sparks;
 *  the rim is stroked as a flame edge; eyes/cores flare. A single `intensity`
 *  (0–1) drives spawn rate, speed, heat (colour), glow and spark count — for
 *  the War-Weaver that dial is Heat/10, so the hero visibly boils as Heat climbs.
 */

// ─────────────────────────── baked ember sprites ───────────────────────────

/** A soft radial ember, baked once per temperature and reused every frame. */
function bakeSprite(l: number, c: number, h: number): HTMLCanvasElement {
  const S = 64
  const cv = document.createElement('canvas')
  cv.width = cv.height = S
  const x = cv.getContext('2d')!
  const g = x.createRadialGradient(S / 2, S / 2, 0, S / 2, S / 2, S / 2)
  g.addColorStop(0, `oklch(${l} ${c} ${h})`)
  g.addColorStop(0.35, `oklch(${l * 0.94} ${c} ${h} / 0.7)`)
  g.addColorStop(0.7, `oklch(${l * 0.8} ${c} ${h} / 0.22)`)
  g.addColorStop(1, `oklch(${l * 0.7} ${c} ${h} / 0)`)
  x.fillStyle = g
  x.fillRect(0, 0, S, S)
  return cv
}

/** A temperature ramp, hot core → cooling ash, for a given flame hue. The core
 *  runs near-white (all fire is white-hot at its heart, whatever the hue); the
 *  tail carries the hue. */
function bakeRamp(hue: number): HTMLCanvasElement[] {
  return [
    bakeSprite(0.99, 0.035, hue + 30), // white-gold core
    bakeSprite(0.92, 0.12, hue + 14),
    bakeSprite(0.83, 0.17, hue),
    bakeSprite(0.72, 0.19, hue - 4),
    bakeSprite(0.58, 0.17, hue - 6), // cooling ember
  ]
}

const RAMP_CACHE = new Map<number, HTMLCanvasElement[]>()
function ramp(hue: number): HTMLCanvasElement[] {
  const key = Math.round(hue)
  let r = RAMP_CACHE.get(key)
  if (!r) {
    r = bakeRamp(key)
    RAMP_CACHE.set(key, r)
  }
  return r
}

// ─────────────────────────── silhouette specs ───────────────────────────

export interface EmberSpec {
  /** the filled mass that burns, in the shared 96×96 space */
  body: Path2D
  /** thin accents (limbs, horns, spikes) stroked as flame edges */
  rim?: Path2D
  /** bright cores that flare with intensity (eyes, a heart) */
  cores: { x: number; y: number; r: number }[]
  /** base flame hue (oklch angle) */
  hue: number
  /** how hard it burns at rest, before intensity is added (0–1) */
  base: number
}

function path(...d: string[]): Path2D {
  const p = new Path2D()
  for (const s of d) p.addPath(new Path2D(s))
  return p
}

/** Enemy silhouettes — the same masses the duotone line-art drew, so each
 *  family stays instantly recognisable once it's rendered as fire. */
type Family = 'golem' | 'beast' | 'spider' | 'wisp' | 'drake' | 'revenant' | 'titan' | 'void'

export function enemySpec(family: Family, hue: number): EmberSpec {
  switch (family) {
    case 'golem': {
      return {
        body: path(
          'M31 20 L65 16 L74 38 L63 52 L34 54 L23 40 Z',
          'M8 86 L16 62 L30 54 L38 60 L38 86 Z',
          'M88 86 L80 62 L66 54 L58 60 L58 86 Z',
        ),
        rim: path('M30 33 L48 30 L67 31', 'M56 17 L53 26 L58 32'),
        cores: [
          { x: 42, y: 40, r: 2.2 },
          { x: 54, y: 40, r: 2.2 },
        ],
        hue,
        base: 0.34,
      }
    }
    case 'beast': {
      return {
        body: path('M14 78 C16 60 26 48 44 46 L70 44 C80 44 86 52 86 62 L86 78 Z', 'M64 44 L58 26 L72 36 Z'),
        rim: path('M82 46 L88 30 L74 38', 'M56 56 L64 64 M66 54 L72 60', 'M70 62 L64 66 L70 68'),
        cores: [
          { x: 60, y: 52, r: 2.2 },
          { x: 74, y: 50, r: 1.8 },
        ],
        hue,
        base: 0.4,
      }
    }
    case 'spider': {
      const body = new Path2D()
      body.ellipse(48, 40, 14, 12, 0, 0, Math.PI * 2)
      body.ellipse(48, 62, 18, 16, 0, 0, Math.PI * 2)
      return {
        body,
        rim: path('M36 34 L18 24 M34 42 L12 42 M36 50 L16 62', 'M60 34 L78 24 M62 42 L84 42 M60 50 L80 62'),
        cores: [
          { x: 43, y: 38, r: 1.9 },
          { x: 53, y: 38, r: 1.9 },
          { x: 47, y: 33, r: 1.3 },
          { x: 49, y: 43, r: 1.3 },
        ],
        hue,
        base: 0.36,
      }
    }
    case 'wisp': {
      return {
        body: path('M48 12 C60 22 66 34 66 48 a18 18 0 0 1 -36 0 C30 34 36 22 48 12 Z'),
        cores: [{ x: 48, y: 46, r: 2.8 }],
        hue,
        base: 0.55,
      }
    }
    case 'drake': {
      return {
        body: path('M18 62 C22 44 34 34 52 34 L78 40 L64 50 L70 58 L52 60 C40 62 32 68 28 78 Z'),
        rim: path('M52 34 C50 24 42 18 32 16 L44 30', 'M64 30 C66 22 62 14 56 10 L58 26', 'M34 70 L26 86 M46 66 L44 84'),
        cores: [{ x: 58, y: 43, r: 2.4 }],
        hue,
        base: 0.44,
      }
    }
    case 'revenant': {
      return {
        body: path(
          'M48 10 C34 10 27 24 29 38 C30 47 36 53 44 55 L40 86 L48 76 L56 86 L52 55 C60 53 66 47 67 38 C69 24 62 10 48 10 Z',
        ),
        rim: path('M30 62 L20 70 M66 62 L76 70'),
        cores: [
          { x: 42, y: 40, r: 2.1 },
          { x: 54, y: 40, r: 2.1 },
        ],
        hue,
        base: 0.42,
      }
    }
    case 'titan': {
      return {
        body: path(
          'M12 86 L20 56 L34 48 L48 52 L62 48 L76 56 L84 86 Z',
          'M34 48 L38 30 L48 44 L58 30 L62 48 L48 54 Z',
        ),
        rim: path('M34 48 L30 20 L44 36', 'M62 48 L66 20 L52 36', 'M26 66 L34 72 M70 66 L62 72'),
        cores: [
          { x: 42, y: 40, r: 2.3 },
          { x: 54, y: 40, r: 2.3 },
        ],
        hue,
        base: 0.4,
      }
    }
    default: {
      // void: geometry that should not close
      return {
        body: path('M48 10 L78 34 L66 76 L30 76 L18 34 Z'),
        rim: path('M48 10 L48 40 M78 34 L52 46 M66 76 L50 52 M30 76 L44 52 M18 34 L42 46', 'M28 22 L20 14 M68 22 L76 14'),
        cores: [
          { x: 44, y: 44, r: 2 },
          { x: 52, y: 48, r: 2 },
          { x: 48, y: 46, r: 2.4 },
        ],
        hue,
        base: 0.48,
      }
    }
  }
}

/** The hero: a hooded War-Weaver rendered as a standing column of fire. Cloak
 *  and hood are the burning mass; the two eyes and a chest ember are the cores
 *  that flare as Heat climbs. */
export function heroSpec(hue: number): EmberSpec {
  return {
    body: path(
      'M16 86 C20 66 32 58 48 58 C64 58 76 66 80 86 Z',
      'M48 10 C31 10 24 27 26 42 C27.5 52 36 58 48 58 C60 58 68.5 52 70 42 C72 27 65 10 48 10 Z',
    ),
    rim: path('M22 80 C30 72 40 68 48 68 C56 68 66 72 74 80'),
    cores: [
      { x: 42.5, y: 41, r: 2.6 }, // eyes
      { x: 53.5, y: 41, r: 2.6 },
      { x: 48, y: 66, r: 2.2 }, // the heart-ember
    ],
    hue,
    base: 0.32,
  }
}

/** OS-level or in-app reduced-motion preference — the app writes the latter to
 *  `documentElement.dataset.motion` (see profile.applyMotion). */
export function prefersReducedMotion(): boolean {
  if (typeof window === 'undefined') return false
  const os = window.matchMedia?.('(prefers-reduced-motion: reduce)')?.matches ?? false
  const app = typeof document !== 'undefined' && document.documentElement.dataset.motion === 'reduced'
  return os || app
}

// ─────────────────────────── the renderer ───────────────────────────

interface Particle {
  x: number
  y: number
  vy: number // rise speed, 96-units/s
  age: number
  life: number
  size: number
  seed: number
  wf: number // wander frequency
  spark: boolean // escapes the silhouette out the crown
}

export interface EmberState {
  /** 0–1 — the master dial (Heat/10 for the hero) */
  intensity?: number
  /** hotter, redder, fiercer */
  enraged?: boolean
  /** a corpse: freeze to a dim static ember */
  alive?: boolean
}

const PI = Math.PI

/** One figure's fire. Owns a canvas, a particle field and a RAF loop; drives
 *  itself off a silhouette spec. Cheap to run, and cleans up after itself. */
export class EmberField {
  private ctx: CanvasRenderingContext2D | null = null
  private raf = 0
  private ro: ResizeObserver | null = null
  private parts: Particle[] = []
  private interior: { x: number; y: number }[] = []
  private crown: { x: number; y: number }[] = []
  private bbox = { minX: 0, minY: 0, maxX: 96, maxY: 96 }
  private last = 0
  private accum = 0
  private px = 0 // backing pixel size (square)
  private scale = 1 // 96-space → device px
  private disposed = false

  // live, poked from the component
  intensity = 0
  enraged = false
  alive = true

  constructor(
    private canvas: HTMLCanvasElement,
    private spec: EmberSpec,
    private reducedMotion: boolean,
  ) {
    const ctx = canvas.getContext('2d')
    if (!ctx || typeof document === 'undefined') return
    this.ctx = ctx as unknown as CanvasRenderingContext2D
    this.sampleSilhouette()
    this.resize()

    this.ro = new ResizeObserver(() => this.resize())
    this.ro.observe(canvas)

    if (this.reducedMotion) this.renderStatic()
    else {
      this.last = performance.now()
      this.raf = requestAnimationFrame(this.tick)
    }
  }

  set(s: EmberState): void {
    if (s.intensity != null) this.intensity = Math.max(0, Math.min(1, s.intensity))
    if (s.enraged != null) this.enraged = s.enraged
    if (s.alive != null) this.alive = s.alive
    // A still image needs a manual repaint when its inputs change.
    if (this.reducedMotion && !this.disposed) this.renderStatic()
  }

  destroy(): void {
    this.disposed = true
    if (this.raf) cancelAnimationFrame(this.raf)
    this.ro?.disconnect()
    this.ro = null
    this.ctx = null
    this.parts.length = 0
  }

  // ---- setup ----------------------------------------------------------

  /** Rejection-sample the silhouette once, in 96-space, so embers can spawn
   *  from anywhere inside the shape (weighted to the base) and sparks from the
   *  crown. Uses an untransformed scratch context for the hit test. */
  private sampleSilhouette(): void {
    const ctx = this.ctx!
    let minX = 96
    let minY = 96
    let maxX = 0
    let maxY = 0
    ctx.save()
    ctx.setTransform(1, 0, 0, 1, 0, 0)
    for (let y = 2; y < 96; y += 2.5) {
      for (let x = 2; x < 96; x += 2.5) {
        if (ctx.isPointInPath(this.spec.body, x, y)) {
          this.interior.push({ x, y })
          if (x < minX) minX = x
          if (y < minY) minY = y
          if (x > maxX) maxX = x
          if (y > maxY) maxY = y
        }
      }
    }
    ctx.restore()
    if (this.interior.length === 0) this.interior.push({ x: 48, y: 60 })
    this.bbox = { minX, minY, maxX, maxY }
    // ascending by y so a low bias (base of the flame) is a simple index skew
    this.interior.sort((a, b) => a.y - b.y)
    const crownCut = minY + (maxY - minY) * 0.42
    this.crown = this.interior.filter((p) => p.y <= crownCut)
    if (this.crown.length === 0) this.crown = this.interior.slice(0, Math.max(1, this.interior.length >> 2))
  }

  private resize(): void {
    if (!this.ctx || this.disposed) return
    const r = this.canvas.getBoundingClientRect()
    const side = Math.max(r.width, r.height)
    if (side === 0) return
    const dpr = Math.min(2, window.devicePixelRatio || 1)
    this.px = Math.round(side * dpr)
    if (this.canvas.width !== this.px) this.canvas.width = this.px
    if (this.canvas.height !== this.px) this.canvas.height = this.px
    this.scale = this.px / 96
    if (this.reducedMotion) this.renderStatic()
  }

  // ---- particles ------------------------------------------------------

  private spawn(spark: boolean): Particle {
    const pool = spark ? this.crown : this.interior
    const n = pool.length
    // base-weighted pick: skew toward the tail (largest y) for body embers
    const t = spark ? Math.random() : Math.random() ** 0.5
    const src = pool[Math.min(n - 1, Math.floor(t * n))]!
    return {
      x: src.x + (Math.random() - 0.5) * 3,
      y: src.y + (Math.random() - 0.5) * 3,
      vy: (spark ? 20 : 11) + Math.random() * 10,
      age: 0,
      life: (spark ? 0.7 : 1.0) + Math.random() * 0.8,
      size: (spark ? 5 : 9) + Math.random() * 6,
      seed: Math.random() * PI * 2,
      wf: 1.5 + Math.random() * 2.5,
      spark,
    }
  }

  /** target live-particle count for the current burn */
  private budget(): number {
    const heat = this.spec.base + this.intensity * 0.9
    return Math.round(8 + heat * (this.spec === undefined ? 0 : 26))
  }

  // ---- the loop -------------------------------------------------------

  private tick = (now: number): void => {
    if (this.disposed || !this.ctx) return
    let dt = (now - this.last) / 1000
    this.last = now
    if (dt > 0.05) dt = 0.05 // clamp after a tab-switch stall
    if (!document.hidden) this.step(dt, now)
    this.raf = requestAnimationFrame(this.tick)
  }

  private step(dt: number, now: number): void {
    const heat = Math.min(1, this.spec.base + this.intensity)
    const want = this.alive ? this.budget() : Math.round(this.budget() * 0.25)

    // spawn toward budget; a slice of the field escapes as crown sparks
    if (this.parts.length < want) {
      this.accum += dt * (18 + heat * 40)
      while (this.accum >= 1 && this.parts.length < want) {
        this.accum -= 1
        this.parts.push(this.spawn(Math.random() < 0.16 + heat * 0.14))
      }
    }

    // advance
    for (let i = this.parts.length - 1; i >= 0; i--) {
      const p = this.parts[i]!
      p.age += dt
      if (p.age >= p.life) {
        this.parts.splice(i, 1)
        continue
      }
      const rise = p.vy * (0.6 + heat * 0.8)
      p.y -= rise * dt
      p.x += Math.sin(now * 0.001 * p.wf + p.seed) * (p.spark ? 8 : 4) * dt
    }

    this.paint(heat, now)
  }

  // ---- painting -------------------------------------------------------

  private paint(heat: number, now: number): void {
    const ctx = this.ctx!
    ctx.setTransform(1, 0, 0, 1, 0, 0)
    ctx.clearRect(0, 0, this.px, this.px)
    ctx.setTransform(this.scale, 0, 0, this.scale, 0, 0)

    const hue = this.enraged ? this.spec.hue - 14 : this.spec.hue
    const sprites = ramp(hue)
    const wob = Math.sin(now * 0.002) * (0.4 + heat * 0.6) // heat-haze sway

    ctx.save()
    ctx.translate(wob, 0)

    this.paintAura(ctx, hue, heat)
    this.paintBody(ctx, hue, heat)

    // embers, additively — cached sprite per temperature, no per-particle work
    ctx.globalCompositeOperation = 'lighter'
    for (const p of this.parts) {
      const lifeT = p.age / p.life
      let idx = Math.floor(lifeT * (1 - 0.35 * heat) * sprites.length)
      if (idx < 0) idx = 0
      if (idx >= sprites.length) idx = sprites.length - 1
      const a = Math.sin(lifeT * PI) * (0.4 + 0.55 * heat)
      const s = p.size * (0.7 + 0.5 * heat) * (1 - 0.3 * lifeT)
      ctx.globalAlpha = a
      ctx.drawImage(sprites[idx]!, p.x - s / 2, p.y - s / 2, s, s)
    }
    ctx.globalAlpha = 1

    this.paintRim(ctx, hue, heat, now)
    this.paintCores(ctx, hue, heat, now)

    ctx.restore()
    ctx.globalCompositeOperation = 'source-over'
  }

  /** A soft heat bloom behind the figure, so it sits in its own light. */
  private paintAura(ctx: CanvasRenderingContext2D, hue: number, heat: number): void {
    const cx = (this.bbox.minX + this.bbox.maxX) / 2
    const cy = (this.bbox.minY + this.bbox.maxY) / 2
    const rad = Math.max(this.bbox.maxX - this.bbox.minX, this.bbox.maxY - this.bbox.minY) * 0.8
    const g = ctx.createRadialGradient(cx, cy, 0, cx, cy, rad)
    const l = 0.7 + heat * 0.18
    g.addColorStop(0, `oklch(${l} 0.16 ${hue} / ${0.1 + heat * 0.22})`)
    g.addColorStop(1, `oklch(${l} 0.16 ${hue} / 0)`)
    ctx.globalCompositeOperation = 'lighter'
    ctx.fillStyle = g
    ctx.fillRect(0, 0, 96, 96)
    ctx.globalCompositeOperation = 'source-over'
  }

  /** The burning mass: a vertical coal gradient clipped to the silhouette, so
   *  the gaps between embers never read as empty. */
  private paintBody(ctx: CanvasRenderingContext2D, hue: number, heat: number): void {
    ctx.save()
    ctx.clip(this.spec.body)
    const g = ctx.createLinearGradient(0, this.bbox.minY, 0, this.bbox.maxY)
    const a = 0.32 + heat * 0.34
    g.addColorStop(0, `oklch(${0.8 + heat * 0.12} 0.15 ${hue} / ${a * 0.7})`)
    g.addColorStop(0.55, `oklch(0.66 0.19 ${hue} / ${a})`)
    g.addColorStop(1, `oklch(0.42 0.16 ${hue - 4} / ${a + 0.12})`)
    ctx.fillStyle = g
    ctx.fillRect(0, 0, 96, 96)
    ctx.restore()
  }

  /** The flame edge: a flickering bright stroke of the silhouette + accents. */
  private paintRim(ctx: CanvasRenderingContext2D, hue: number, heat: number, now: number): void {
    const flick = 0.6 + 0.4 * Math.sin(now * 0.012)
    ctx.globalCompositeOperation = 'lighter'
    ctx.lineJoin = 'round'
    ctx.lineCap = 'round'
    ctx.strokeStyle = `oklch(${0.86 + heat * 0.1} 0.15 ${hue + 8} / ${(0.35 + heat * 0.4) * flick})`
    ctx.lineWidth = 1.4 + heat * 0.8
    ctx.stroke(this.spec.body)
    if (this.spec.rim) {
      ctx.strokeStyle = `oklch(0.9 0.14 ${hue + 12} / ${(0.3 + heat * 0.4) * flick})`
      ctx.lineWidth = 1.2 + heat * 0.6
      ctx.stroke(this.spec.rim)
    }
    ctx.globalCompositeOperation = 'source-over'
  }

  /** Eyes / heart: bright cores that bank low then flare with the burn. */
  private paintCores(ctx: CanvasRenderingContext2D, hue: number, heat: number, now: number): void {
    const sprites = ramp(hue)
    const flare = 0.5 + 0.5 * heat + 0.12 * Math.sin(now * 0.006)
    ctx.globalCompositeOperation = 'lighter'
    for (const c of this.spec.cores) {
      const s = c.r * (3.4 + heat * 2.2) * flare
      ctx.globalAlpha = Math.min(1, 0.5 + heat * 0.6)
      ctx.drawImage(sprites[0]!, c.x - s / 2, c.y - s / 2, s, s)
      // a hot pinpoint at the very centre
      ctx.globalAlpha = Math.min(1, 0.7 + heat * 0.3)
      const hs = c.r * 1.5
      ctx.drawImage(sprites[0]!, c.x - hs / 2, c.y - hs / 2, hs, hs)
    }
    ctx.globalAlpha = 1
    ctx.globalCompositeOperation = 'source-over'
  }

  // ---- reduced motion: a single, still, on-theme ember ----------------

  private renderStatic(): void {
    if (!this.ctx || this.disposed || this.px === 0) return
    const ctx = this.ctx
    const heat = Math.min(1, this.spec.base + this.intensity * 0.6)
    const hue = this.enraged ? this.spec.hue - 14 : this.spec.hue
    ctx.setTransform(1, 0, 0, 1, 0, 0)
    ctx.clearRect(0, 0, this.px, this.px)
    ctx.setTransform(this.scale, 0, 0, this.scale, 0, 0)
    this.paintAura(ctx, hue, heat)
    this.paintBody(ctx, hue, heat)
    // a fixed scatter of embers so the shape still reads as fire, not a decal
    const sprites = ramp(hue)
    ctx.globalCompositeOperation = 'lighter'
    const n = this.interior.length
    for (let i = 0; i < 16 && n > 0; i++) {
      const src = this.interior[Math.floor((i / 16) ** 0.5 * n) % n]!
      const idx = i % sprites.length
      ctx.globalAlpha = 0.5
      const s = 8 + (i % 4) * 2
      ctx.drawImage(sprites[idx]!, src.x - s / 2, src.y - s / 2, s, s)
    }
    ctx.globalAlpha = 1
    this.paintRim(ctx, hue, heat, 0)
    this.paintCores(ctx, hue, heat, 0)
    ctx.globalCompositeOperation = 'source-over'
  }
}
