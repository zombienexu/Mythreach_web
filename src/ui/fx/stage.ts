/** The arena's effects stage: a Pixi canvas laid over both combat cards.
 *
 *  Everything here is spawned from CombatEvents by the director — the stage
 *  itself knows nothing about the game, only about light. Textures are drawn
 *  procedurally at boot (no image assets ship), sprites are pooled, and one
 *  ticker advances particles, projectiles, arcs and standing emitters.
 *
 *  `timeScale` exists so impacts can bite: the director dips it toward zero
 *  for a few frames on a crit, which reads as hit-stop. */
import type { Application, Container, Sprite, Texture } from 'pixi.js'
import { SMOKE } from './palette'

type PixiModule = typeof import('pixi.js')

export interface Spot {
  x: number
  y: number
}

export interface Region extends Spot {
  w: number
  h: number
}

/** Where the combatants live, in stage coordinates. */
export interface Anchors {
  /** portrait centre — where spells are cast from and land on */
  player: Spot
  enemy: Spot
  /** whole-card boxes — for auras, dissolves and full-body washes */
  playerCard: Region
  enemyCard: Region
}

export type TexName = 'glow' | 'spark' | 'ring' | 'shard' | 'smoke'
type Blend = 'add' | 'normal'

interface Particle {
  sp: Sprite
  x: number
  y: number
  vx: number
  vy: number
  ay: number
  drag: number
  life: number
  max: number
  s0: number
  s1: number
  a0: number
  a1: number
  spin: number
  /** stretch along the velocity vector — turns a dot into a streak */
  stretch: number
  blend: Blend
}

interface Projectile {
  head: Sprite
  halo: Sprite
  sx: number
  sy: number
  ex: number
  ey: number
  /** perpendicular bow of the flight path, px */
  arc: number
  t: number
  dur: number
  x: number
  y: number
  size: number
  trailAccum: number
  trailRate: number
  onTrail: ((x: number, y: number, vx: number, vy: number) => void) | null
  onArrive: () => void
}

interface Arc {
  gfx: Container
  life: number
  max: number
}

interface Emitter {
  id: number
  life: number
  /** seconds between spawns */
  every: number
  accum: number
  tick: () => void
}

export interface BurstOpts {
  count: number
  /** px/second */
  speed: [number, number]
  /** radians; defaults to a full circle */
  angle?: [number, number]
  /** seconds */
  life: [number, number]
  /** starting diameter in px */
  size: [number, number]
  /** size multiplier at death */
  endScale?: number
  tint: number | readonly number[]
  gravity?: number
  drag?: number
  alpha?: number
  fadeTo?: number
  tex?: TexName
  stretch?: number
  blend?: Blend
}

const TAU = Math.PI * 2
const rand = (a: number, b: number): number => a + Math.random() * (b - a)
const pick = (t: number | readonly number[]): number =>
  typeof t === 'number' ? t : t[(Math.random() * t.length) | 0]!

/** Soft radial gradient — the workhorse. `hardness` tightens the core. */
function radialTexture(size: number, hardness: number): HTMLCanvasElement {
  const c = document.createElement('canvas')
  c.width = c.height = size
  const ctx = c.getContext('2d')!
  const r = size / 2
  const g = ctx.createRadialGradient(r, r, 0, r, r, r)
  g.addColorStop(0, 'rgba(255,255,255,1)')
  g.addColorStop(hardness, 'rgba(255,255,255,0.75)')
  g.addColorStop(1, 'rgba(255,255,255,0)')
  ctx.fillStyle = g
  ctx.beginPath()
  ctx.arc(r, r, r, 0, TAU)
  ctx.fill()
  return c
}

function ringTexture(size: number): HTMLCanvasElement {
  const c = document.createElement('canvas')
  c.width = c.height = size
  const ctx = c.getContext('2d')!
  const r = size / 2
  ctx.strokeStyle = '#fff'
  ctx.lineWidth = size * 0.055
  ctx.beginPath()
  ctx.arc(r, r, r * 0.86, 0, TAU)
  ctx.stroke()
  // a soft inner wash so the ring reads as a pressure wave, not a hoop
  const g = ctx.createRadialGradient(r, r, r * 0.5, r, r, r * 0.9)
  g.addColorStop(0, 'rgba(255,255,255,0)')
  g.addColorStop(1, 'rgba(255,255,255,0.28)')
  ctx.fillStyle = g
  ctx.beginPath()
  ctx.arc(r, r, r * 0.9, 0, TAU)
  ctx.fill()
  return c
}

function shardTexture(size: number): HTMLCanvasElement {
  const c = document.createElement('canvas')
  c.width = c.height = size
  const ctx = c.getContext('2d')!
  ctx.fillStyle = '#fff'
  ctx.beginPath()
  ctx.moveTo(size * 0.5, 0)
  ctx.lineTo(size, size * 0.72)
  ctx.lineTo(size * 0.28, size)
  ctx.closePath()
  ctx.fill()
  return c
}

export class FxStage {
  private pixi: PixiModule | null = null
  private app: Application | null = null
  private back: Container | null = null
  private add: Container | null = null
  private tex: Record<TexName, Texture> | null = null

  private readonly live: Particle[] = []
  private readonly pool: Sprite[] = []
  private readonly projectiles: Projectile[] = []
  private readonly arcs: Arc[] = []
  private readonly emitters: Emitter[] = []
  private nextEmitterId = 1

  /** in flight, so two rapid mounts can't build two WebGL contexts */
  private mounting: Promise<void> | null = null
  /** hidden: the arena is unmounted (player is on another tab) */
  private paused = false
  /** the GPU took the context away; Pixi restores it, we just hold off */
  private contextLost = false

  /** Dipped toward 0 on impact for hit-stop, then eased back. */
  timeScale = 1
  private stopHold = 0
  /** Combustion amplifies every fire effect — the buff you can *see*. */
  intensity = 1
  private intensityTarget = 1

  anchors: Anchors = {
    player: { x: 0, y: 0 },
    enemy: { x: 0, y: 0 },
    playerCard: { x: 0, y: 0, w: 0, h: 0 },
    enemyCard: { x: 0, y: 0, w: 0, h: 0 },
  }

  /** False while hidden or while the GPU context is away: every spawn call
   *  no-ops, so nothing piles up unrendered. */
  get ready(): boolean {
    return this.app !== null && !this.paused && !this.contextLost
  }

  /** CombatView is mounted and unmounted every time the player visits another
   *  tab, so mount() is not a one-shot. If the app already exists we adopt the
   *  new host — leaving the canvas parented to the old, destroyed div is how
   *  you get effects that silently stop forever. */
  async mount(host: HTMLElement): Promise<void> {
    if (this.mounting) await this.mounting
    if (this.app) {
      this.adopt(host)
      return
    }
    this.mounting = this.create(host)
    try {
      await this.mounting
    } finally {
      this.mounting = null
    }
  }

  private adopt(host: HTMLElement): void {
    const app = this.app
    if (!app) return
    host.appendChild(app.canvas) // moves it out of the dead host
    app.resizeTo = host
    app.resize()
    this.resume()
  }

  /** Stop rendering and stop spawning while the arena is off screen. */
  pause(): void {
    this.paused = true
    this.app?.ticker.stop()
  }

  private resume(): void {
    if (!this.app || !this.paused) return
    this.paused = false
    // Anything mid-flight is from another era. Settle its consequences (a
    // fireball still has to deal its damage) and wipe the slate.
    this.flush()
    this.app.ticker.start()
  }

  /** Fire pending projectile arrivals, then drop every transient object. */
  private flush(): void {
    const arrivals = this.projectiles.map((p) => p.onArrive)
    for (const p of this.projectiles) {
      p.head.destroy()
      p.halo.destroy()
    }
    this.projectiles.length = 0
    for (const p of this.live) {
      p.sp.removeFromParent()
      p.sp.destroy()
    }
    this.live.length = 0
    for (const a of this.arcs) a.gfx.destroy({ children: true })
    this.arcs.length = 0
    // the pool survives: those sprites are inert, detached and still valid
    for (const arrive of arrivals) arrive()
  }

  /** The host can change size without the window doing so (sidebar, layout). */
  resize(): void {
    this.app?.resize()
  }

  private async create(host: HTMLElement): Promise<void> {
    const PIXI = (this.pixi = await import('pixi.js'))
    const app = new PIXI.Application()
    await app.init({
      backgroundAlpha: 0,
      antialias: true,
      resizeTo: host,
      resolution: Math.min(window.devicePixelRatio || 1, 2),
      autoDensity: true,
      preference: 'webgl',
    })
    // The host may have unmounted while we were awaiting the GPU context.
    if (!host.isConnected) {
      app.destroy(true)
      return
    }
    app.canvas.style.position = 'absolute'
    app.canvas.style.inset = '0'
    app.canvas.style.pointerEvents = 'none'
    host.appendChild(app.canvas)

    // A lost context (GPU reset, tab starved, driver hiccup) must not leave us
    // spawning into a void. Pixi re-uploads on restore; we just stop and wait.
    app.canvas.addEventListener('webglcontextlost', this.onContextLost)
    app.canvas.addEventListener('webglcontextrestored', this.onContextRestored)

    this.tex = {
      glow: PIXI.Texture.from(radialTexture(128, 0.16)),
      spark: PIXI.Texture.from(radialTexture(64, 0.5)),
      ring: PIXI.Texture.from(ringTexture(256)),
      shard: PIXI.Texture.from(shardTexture(32)),
      smoke: PIXI.Texture.from(radialTexture(128, 0.05)),
    }

    this.back = new PIXI.Container()
    this.add = new PIXI.Container()
    app.stage.addChild(this.back, this.add)
    this.app = app
    this.paused = false

    app.ticker.add((ticker) => {
      // Clamp so a backgrounded tab doesn't teleport every particle on return.
      const raw = Math.min(ticker.deltaMS, 50) / 1000
      this.advance(raw)
      this.step(raw * this.timeScale)
    })
  }

  /** Hit-stop and combustion intensity: two scalars easing on real time, so
   *  hit-stop can't slow down its own recovery. */
  private advance(dt: number): void {
    if (this.stopHold > 0) {
      this.stopHold -= dt
    } else if (this.timeScale < 1) {
      this.timeScale = Math.min(1, this.timeScale + (1 - this.timeScale) * Math.min(1, dt * 9) + dt * 0.6)
    }
    if (this.intensity !== this.intensityTarget) {
      this.intensity += (this.intensityTarget - this.intensity) * Math.min(1, dt * 5)
      if (Math.abs(this.intensityTarget - this.intensity) < 0.01) this.intensity = this.intensityTarget
    }
  }

  /** Freeze the world for a breath so a blow has weight. Visual only — the
   *  sim's tick clock is never touched. */
  hitStop(hold: number): void {
    this.timeScale = 0.05
    this.stopHold = hold
  }

  setIntensity(v: number): void {
    this.intensityTarget = v
  }

  // preventDefault is what makes the context *restorable* at all.
  private onContextLost = (e: Event): void => {
    e.preventDefault()
    this.contextLost = true
  }

  private onContextRestored = (): void => {
    this.contextLost = false
    this.flush()
  }

  destroy(): void {
    if (this.app) {
      this.app.canvas.removeEventListener('webglcontextlost', this.onContextLost)
      this.app.canvas.removeEventListener('webglcontextrestored', this.onContextRestored)
    }
    this.app?.destroy(true, { children: true, texture: true })
    this.app = null
    this.back = null
    this.add = null
    this.tex = null
    this.mounting = null
    this.paused = false
    this.contextLost = false
    this.live.length = 0
    this.pool.length = 0
    this.projectiles.length = 0
    this.arcs.length = 0
    this.emitters.length = 0
  }

  // ─────────────── the loop ───────────────

  private step(dt: number): void {
    for (let i = this.live.length - 1; i >= 0; i--) {
      const p = this.live[i]!
      p.life += dt
      const t = p.life / p.max
      if (t >= 1) {
        this.recycle(p)
        this.live.splice(i, 1)
        continue
      }
      p.vy += p.ay * dt
      const damp = Math.max(0, 1 - p.drag * dt)
      p.vx *= damp
      p.vy *= damp
      p.x += p.vx * dt
      p.y += p.vy * dt

      const sp = p.sp
      const scale = (p.s0 + (p.s1 - p.s0) * t) / sp.texture.width
      sp.position.set(p.x, p.y)
      sp.alpha = p.a0 + (p.a1 - p.a0) * t
      if (p.stretch > 0) {
        const speed = Math.hypot(p.vx, p.vy)
        sp.rotation = Math.atan2(p.vy, p.vx)
        sp.scale.set(scale * (1 + (speed / 900) * p.stretch), scale)
      } else {
        sp.rotation += p.spin * dt
        sp.scale.set(scale)
      }
    }

    for (let i = this.projectiles.length - 1; i >= 0; i--) {
      const pr = this.projectiles[i]!
      pr.t += dt / pr.dur
      const t = Math.min(1, pr.t)
      const px = pr.x
      const py = pr.y
      // quadratic bezier: the control point bows the flight path
      const mx = (pr.sx + pr.ex) / 2
      const my = (pr.sy + pr.ey) / 2
      const dx = pr.ex - pr.sx
      const dy = pr.ey - pr.sy
      const len = Math.hypot(dx, dy) || 1
      const cx = mx + (-dy / len) * pr.arc
      const cy = my + (dx / len) * pr.arc
      const u = 1 - t
      pr.x = u * u * pr.sx + 2 * u * t * cx + t * t * pr.ex
      pr.y = u * u * pr.sy + 2 * u * t * cy + t * t * pr.ey

      const vx = (pr.x - px) / Math.max(dt, 0.0001)
      const vy = (pr.y - py) / Math.max(dt, 0.0001)
      pr.head.position.set(pr.x, pr.y)
      pr.halo.position.set(pr.x, pr.y)
      pr.head.rotation = Math.atan2(vy, vx)
      // stretch the core along flight — cheap, convincing motion blur
      const speed = Math.hypot(vx, vy)
      const s = pr.size / pr.head.texture.width
      pr.head.scale.set(s * (1 + speed / 2600), s)

      pr.trailAccum += dt
      while (pr.trailAccum >= pr.trailRate) {
        pr.trailAccum -= pr.trailRate
        pr.onTrail?.(pr.x, pr.y, vx, vy)
      }

      if (t >= 1) {
        pr.head.destroy()
        pr.halo.destroy()
        this.projectiles.splice(i, 1)
        pr.onArrive()
      }
    }

    for (let i = this.arcs.length - 1; i >= 0; i--) {
      const a = this.arcs[i]!
      a.life += dt
      const t = a.life / a.max
      if (t >= 1) {
        a.gfx.destroy({ children: true })
        this.arcs.splice(i, 1)
        continue
      }
      // flicker hard, then snap out
      a.gfx.alpha = (1 - t) * (0.55 + Math.random() * 0.45)
    }

    for (let i = this.emitters.length - 1; i >= 0; i--) {
      const e = this.emitters[i]!
      e.life -= dt
      e.accum += dt
      while (e.accum >= e.every) {
        e.accum -= e.every
        e.tick()
      }
      if (e.life <= 0) this.emitters.splice(i, 1)
    }
  }

  // ─────────────── sprite pool ───────────────

  private take(name: TexName, blend: Blend, tint: number): Sprite | null {
    if (!this.pixi || !this.tex || !this.add || !this.back) return null
    const sp = this.pool.pop() ?? new this.pixi.Sprite()
    sp.texture = this.tex[name]
    sp.anchor.set(0.5)
    sp.blendMode = blend === 'add' ? 'add' : 'normal'
    sp.tint = tint
    sp.visible = true
    sp.rotation = 0
    ;(blend === 'add' ? this.add : this.back).addChild(sp)
    return sp
  }

  private recycle(p: Particle): void {
    p.sp.removeFromParent()
    p.sp.visible = false
    if (this.pool.length < 900) this.pool.push(p.sp)
    else p.sp.destroy()
  }

  private spawn(
    sp: Sprite,
    x: number,
    y: number,
    vx: number,
    vy: number,
    o: Omit<Particle, 'sp' | 'x' | 'y' | 'vx' | 'vy'>,
  ): void {
    sp.position.set(x, y)
    this.live.push({ sp, x, y, vx, vy, ...o })
  }

  // ─────────────── effects ───────────────

  burst(x: number, y: number, o: BurstOpts): void {
    if (!this.ready) return
    const blend = o.blend ?? 'add'
    const tex = o.tex ?? 'spark'
    const [a0, a1] = o.angle ?? [0, TAU]
    const count = Math.round(o.count * (tex === 'smoke' ? 1 : this.intensity))
    for (let i = 0; i < count; i++) {
      const sp = this.take(tex, blend, pick(o.tint))
      if (!sp) return
      const ang = rand(a0, a1)
      const speed = rand(o.speed[0], o.speed[1])
      const size = rand(o.size[0], o.size[1])
      this.spawn(sp, x, y, Math.cos(ang) * speed, Math.sin(ang) * speed, {
        ay: o.gravity ?? 0,
        drag: o.drag ?? 1.2,
        life: 0,
        max: rand(o.life[0], o.life[1]),
        s0: size,
        s1: size * (o.endScale ?? 0.15),
        a0: o.alpha ?? 1,
        a1: o.fadeTo ?? 0,
        spin: rand(-6, 6),
        stretch: o.stretch ?? 0,
        blend,
      })
    }
  }

  /** An expanding pressure ring — the shape the eye reads as "that hurt". */
  ring(x: number, y: number, o: { tint: number; from: number; to: number; life: number; alpha?: number }): void {
    if (!this.ready) return
    const sp = this.take('ring', 'add', o.tint)
    if (!sp) return
    this.spawn(sp, x, y, 0, 0, {
      ay: 0,
      drag: 0,
      life: 0,
      max: o.life,
      s0: o.from,
      s1: o.to,
      a0: o.alpha ?? 0.9,
      a1: 0,
      spin: 0,
      stretch: 0,
      blend: 'add',
    })
  }

  /** A single soft pop of light. */
  flash(x: number, y: number, o: { tint: number; size: number; life: number; alpha?: number; grow?: number }): void {
    if (!this.ready) return
    const sp = this.take('glow', 'add', o.tint)
    if (!sp) return
    this.spawn(sp, x, y, 0, 0, {
      ay: 0,
      drag: 0,
      life: 0,
      max: o.life,
      s0: o.size,
      s1: o.size * (o.grow ?? 1.8),
      a0: o.alpha ?? 1,
      a1: 0,
      spin: 0,
      stretch: 0,
      blend: 'add',
    })
  }

  projectile(o: {
    from: Spot
    to: Spot
    dur: number
    size: number
    tint: number
    halo: number
    haloSize?: number
    arc?: number
    trailRate?: number
    onTrail?: (x: number, y: number, vx: number, vy: number) => void
    onArrive: () => void
  }): void {
    if (!this.ready) {
      o.onArrive()
      return
    }
    const head = this.take('spark', 'add', o.tint)
    const halo = this.take('glow', 'add', o.halo)
    if (!head || !halo) {
      o.onArrive()
      return
    }
    // the halo rides under the core: bright centre, soft bloom around it
    halo.removeFromParent()
    this.add!.addChildAt(halo, 0)
    const hs = (o.haloSize ?? o.size * 2.6) / halo.texture.width
    halo.scale.set(hs)
    halo.alpha = 0.75
    this.projectiles.push({
      head,
      halo,
      sx: o.from.x,
      sy: o.from.y,
      ex: o.to.x,
      ey: o.to.y,
      arc: o.arc ?? 0,
      t: 0,
      dur: o.dur,
      x: o.from.x,
      y: o.from.y,
      size: o.size,
      trailAccum: 0,
      trailRate: o.trailRate ?? 0.012,
      onTrail: o.onTrail ?? null,
      onArrive: o.onArrive,
    })
  }

  /** Jagged lightning between two points — counterspell, enemy bolts. */
  bolt(from: Spot, to: Spot, o: { tint: number; life: number; width?: number; jitter?: number; forks?: number }): void {
    if (!this.ready || !this.pixi || !this.add) return
    const PIXI = this.pixi
    const holder = new PIXI.Container()
    holder.blendMode = 'add'

    const draw = (ax: number, ay: number, bx: number, by: number, width: number, alpha: number): void => {
      const g = new PIXI.Graphics()
      const segs = 7
      const dx = bx - ax
      const dy = by - ay
      const nx = -dy
      const ny = dx
      const len = Math.hypot(dx, dy) || 1
      const jitter = o.jitter ?? 16
      g.moveTo(ax, ay)
      for (let i = 1; i <= segs; i++) {
        const t = i / segs
        // pinch the jitter to zero at both ends so it connects cleanly
        const wob = i === segs ? 0 : rand(-jitter, jitter) * Math.sin(t * Math.PI)
        g.lineTo(ax + dx * t + (nx / len) * wob, ay + dy * t + (ny / len) * wob)
      }
      g.stroke({ width, color: o.tint, alpha, cap: 'round', join: 'round' })
      holder.addChild(g)
    }

    const w = o.width ?? 3
    draw(from.x, from.y, to.x, to.y, w * 3.2, 0.28) // soft outer glow
    draw(from.x, from.y, to.x, to.y, w, 1) // core
    for (let f = 0; f < (o.forks ?? 2); f++) {
      const t = rand(0.3, 0.75)
      const bx = from.x + (to.x - from.x) * t
      const by = from.y + (to.y - from.y) * t
      const ang = rand(0, TAU)
      const reach = rand(24, 52)
      draw(bx, by, bx + Math.cos(ang) * reach, by + Math.sin(ang) * reach, w * 0.55, 0.8)
    }

    this.add.addChild(holder)
    this.arcs.push({ gfx: holder, life: 0, max: o.life })
  }

  /** A standing emitter that runs for `life` seconds (Infinity ⇒ until stopped). */
  emit(life: number, every: number, tick: () => void): number {
    const id = this.nextEmitterId++
    this.emitters.push({ id, life, every, accum: 0, tick })
    return id
  }

  stopEmitter(id: number): void {
    const i = this.emitters.findIndex((e) => e.id === id)
    if (i !== -1) this.emitters.splice(i, 1)
  }

  /** Motes rushing *inward* to a point — power gathering, a shell knitting
   *  itself together. The visual opposite of a burst. */
  implode(
    x: number,
    y: number,
    o: { count: number; radius: number; life: [number, number]; size: [number, number]; tint: number | readonly number[]; spin?: number },
  ): void {
    if (!this.ready) return
    for (let i = 0; i < o.count; i++) {
      const sp = this.take('spark', 'add', pick(o.tint))
      if (!sp) return
      const ang = rand(0, TAU)
      const r = o.radius * rand(0.75, 1.15)
      const life = rand(o.life[0], o.life[1])
      const size = rand(o.size[0], o.size[1])
      // aimed inward, with a touch of tangential drift so it curls in
      const speed = r / life
      const swirl = o.spin ?? 0.35
      this.spawn(
        sp,
        x + Math.cos(ang) * r,
        y + Math.sin(ang) * r,
        -Math.cos(ang) * speed - Math.sin(ang) * speed * swirl,
        -Math.sin(ang) * speed + Math.cos(ang) * speed * swirl,
        {
          ay: 0,
          drag: 0,
          life: 0,
          max: life,
          s0: size,
          s1: size * 0.25,
          a0: 0.95,
          a1: 0.2,
          spin: 0,
          stretch: 1.3,
          blend: 'add',
        },
      )
    }
  }

  /** Hard light spikes thrown out from a point. Short-lived, high drag: they
   *  shoot, stop, and vanish — the shape the eye reads as *impact*. */
  rays(x: number, y: number, o: { count: number; reach: number; life: number; width: number; tint: number | readonly number[] }): void {
    if (!this.ready) return
    const count = Math.round(o.count * this.intensity)
    for (let i = 0; i < count; i++) {
      const sp = this.take('spark', 'add', pick(o.tint))
      if (!sp) return
      // even fan with jitter, so it reads as a star and not as noise
      const ang = (i / count) * TAU + rand(-0.18, 0.18)
      const speed = (o.reach * rand(0.6, 1.4)) / o.life
      this.spawn(sp, x, y, Math.cos(ang) * speed, Math.sin(ang) * speed, {
        ay: 0,
        drag: 9,
        life: 0,
        max: o.life,
        s0: o.width,
        s1: o.width * 0.3,
        a0: 1,
        a1: 0,
        spin: 0,
        stretch: 5,
        blend: 'add',
      })
    }
  }

  /** Scatter a region into rising motes — how a body leaves the world. */
  dissolve(r: Region, tint: number | readonly number[], count = 48): void {
    if (!this.ready) return
    for (let i = 0; i < count; i++) {
      const sp = this.take('glow', 'add', pick(tint))
      if (!sp) return
      const size = rand(4, 13)
      this.spawn(sp, rand(r.x, r.x + r.w), rand(r.y, r.y + r.h), rand(-24, 24), rand(-70, -20), {
        ay: -18,
        drag: 0.5,
        life: 0,
        max: rand(0.5, 1.25),
        s0: size,
        s1: size * 0.2,
        a0: rand(0.5, 0.95),
        a1: 0,
        spin: 0,
        stretch: 0,
        blend: 'add',
      })
    }
  }

  /** Point in a card region, biased by unit-square coords. */
  static at(r: Region, u: number, v: number): Spot {
    return { x: r.x + r.w * u, y: r.y + r.h * v }
  }

  smokePuff(x: number, y: number, count = 6): void {
    this.burst(x, y, {
      count,
      speed: [12, 60],
      life: [0.6, 1.3],
      size: [26, 58],
      endScale: 1.9,
      tint: SMOKE,
      gravity: -26,
      drag: 1.6,
      alpha: 0.34,
      tex: 'smoke',
      blend: 'normal',
    })
  }
}
