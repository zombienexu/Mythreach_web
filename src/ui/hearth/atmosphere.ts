/** The sanctum's atmosphere — everything the WebGL layer draws is light:
 *  a starfield with real depth, the birth-sign constellation hung far out
 *  in it, embers climbing from the hearth, dust idling in the air. No
 *  meshes, no solids, no surfaces — the dashboard's glass and hairlines
 *  stay HTML; this canvas only supplies the night behind them.
 *
 *  Points use a soft radial sprite (raw gl points are squares), additive
 *  blending, and a fixed camera that leans slightly with the pointer so
 *  the depth reads without ever feeling like a camera move. */
import * as THREE from 'three'

export interface AtmosphereOpts {
  gilt: number
  /** birth-sign star figure (0–100 box), hung deep in the sky */
  sign: { stars: ReadonlyArray<readonly [number, number]>; lines: ReadonlyArray<readonly [number, number]> } | null
  /** where the hearth-fire stands, in stage coords (0..1 from top-left) */
  ember: { x: number; y: number }
  reducedMotion: boolean
}

export interface Atmosphere {
  setWarmth(n: number): void
  /** the constellation answers a glance: a slow bright breath */
  pulseSign(): void
  /** pointer in -1..1 — the sky leans a little, far things less than near */
  setPointer(px: number, py: number): void
  dispose(): void
}

const FOV = 42
const CAM_Z = 5

export function createAtmosphere(canvas: HTMLCanvasElement, opts: AtmosphereOpts): Atmosphere {
  const disposables: Array<{ dispose(): void }> = []
  const track = <T extends { dispose(): void }>(d: T): T => {
    disposables.push(d)
    return d
  }

  const renderer = new THREE.WebGLRenderer({ canvas, antialias: true, alpha: true })
  renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2))
  const scene = new THREE.Scene()
  const camera = new THREE.PerspectiveCamera(FOV, 16 / 9, 0.1, 40)
  camera.position.set(0, 0, CAM_Z)

  /** soft round sprite — no point is ever a square */
  const dot = (() => {
    const c = document.createElement('canvas')
    c.width = c.height = 32
    const ctx = c.getContext('2d')
    if (ctx) {
      const g = ctx.createRadialGradient(16, 16, 0, 16, 16, 16)
      g.addColorStop(0, 'rgba(255,255,255,1)')
      g.addColorStop(0.45, 'rgba(255,255,255,0.55)')
      g.addColorStop(1, 'rgba(255,255,255,0)')
      ctx.fillStyle = g
      ctx.fillRect(0, 0, 32, 32)
    }
    return track(new THREE.CanvasTexture(c))
  })()

  const pointsMat = (color: number, size: number, opacity: number): THREE.PointsMaterial =>
    track(
      new THREE.PointsMaterial({
        color,
        size,
        map: dot,
        transparent: true,
        opacity,
        blending: THREE.AdditiveBlending,
        depthWrite: false,
        sizeAttenuation: true,
      }),
    )

  /** world half-extents of the view at a given z-plane */
  function extentAt(z: number): { hw: number; hh: number } {
    const hh = Math.tan(THREE.MathUtils.degToRad(FOV / 2)) * (CAM_Z - z)
    return { hw: hh * camera.aspect, hh }
  }

  /* ---- Starfield: two depths of quiet ------------------------------- */
  interface StarLayer {
    points: THREE.Points
    mat: THREE.PointsMaterial
    z: number
    drift: number
  }
  const starLayers: StarLayer[] = []
  for (const layer of [
    { n: 70, z: -3.2, size: 0.055, opacity: 0.5, drift: 0.006 },
    { n: 45, z: -1.6, size: 0.045, opacity: 0.65, drift: 0.011 },
  ]) {
    const { hw, hh } = { hw: 6.2, hh: 3.4 } // generous, so drift never shows an edge
    const pos = new Float32Array(layer.n * 3)
    for (let i = 0; i < layer.n; i++) {
      pos[i * 3] = (Math.random() * 2 - 1) * hw
      pos[i * 3 + 1] = (Math.random() * 2 - 1) * hh
      pos[i * 3 + 2] = layer.z + (Math.random() - 0.5) * 0.6
    }
    const geo = track(new THREE.BufferGeometry())
    geo.setAttribute('position', new THREE.BufferAttribute(pos, 3))
    const mat = pointsMat(0xd8dcf0, layer.size, layer.opacity)
    const points = new THREE.Points(geo, mat)
    scene.add(points)
    starLayers.push({ points, mat, z: layer.z, drift: layer.drift })
  }

  /* ---- The birth-sign, hung deep with real parallax ------------------- */
  const signGroup = new THREE.Group()
  signGroup.position.set(1.15, 0.75, -1.9)
  scene.add(signGroup)
  let signMat: THREE.PointsMaterial | null = null
  let signLineMat: THREE.LineBasicMaterial | null = null
  if (opts.sign) {
    const s = opts.sign
    const SPREAD = 2.0
    /** deterministic depth per star, so the figure has body but tests stay honest */
    const depth = (i: number): number => (((i * 37) % 11) / 11 - 0.5) * 0.9
    const world = (sx: number, sy: number, i: number): [number, number, number] => [
      ((sx - 50) / 100) * SPREAD,
      ((50 - sy) / 100) * SPREAD * 0.85,
      depth(i),
    ]
    const pos = new Float32Array(s.stars.length * 3)
    s.stars.forEach(([sx, sy], i) => {
      const [x, y, z] = world(sx, sy, i)
      pos[i * 3] = x
      pos[i * 3 + 1] = y
      pos[i * 3 + 2] = z
    })
    const geo = track(new THREE.BufferGeometry())
    geo.setAttribute('position', new THREE.BufferAttribute(pos, 3))
    signMat = pointsMat(0xf2e6c0, 0.16, 0.95)
    signGroup.add(new THREE.Points(geo, signMat))

    const linePts: number[] = []
    for (const [a, b] of s.lines) {
      const pa = s.stars[a]
      const pb = s.stars[b]
      if (!pa || !pb) continue
      linePts.push(...world(pa[0], pa[1], a), ...world(pb[0], pb[1], b))
    }
    const lineGeo = track(new THREE.BufferGeometry())
    lineGeo.setAttribute('position', new THREE.BufferAttribute(new Float32Array(linePts), 3))
    signLineMat = track(
      new THREE.LineBasicMaterial({ color: opts.gilt, transparent: true, opacity: 0.4 }),
    )
    signGroup.add(new THREE.LineSegments(lineGeo, signLineMat))
  }

  /* ---- Embers: the hearth is a column of climbing light ---------------- */
  const EMBERS = 26
  const emberPos = new Float32Array(EMBERS * 3)
  const emberSeed = Array.from({ length: EMBERS }, (_, i) => ({
    phase: (i * 0.147) % 1,
    swaySpeed: 5 + ((i * 13) % 7),
    swayAmp: 0.05 + ((i * 7) % 5) * 0.02,
    rise: 1.7 + ((i * 11) % 6) * 0.16,
  }))
  const emberGeo = track(new THREE.BufferGeometry())
  emberGeo.setAttribute('position', new THREE.BufferAttribute(emberPos, 3))
  const emberMat = pointsMat(0xffa050, 0.085, 0.8)
  scene.add(new THREE.Points(emberGeo, emberMat))
  const EMBER_Z = 0.6
  let emberBase: [number, number] = [0, 0]
  function placeEmbers(): void {
    const { hw, hh } = extentAt(EMBER_Z)
    emberBase = [(opts.ember.x * 2 - 1) * hw, (1 - opts.ember.y * 2) * hh]
  }

  /* ---- Dust: gilt motes idling in the air ------------------------------ */
  const MOTES = 26
  const motePos = new Float32Array(MOTES * 3)
  const moteSeed = Array.from({ length: MOTES }, () => ({
    x: (Math.random() * 2 - 1) * 3.4,
    y: (Math.random() * 2 - 1) * 1.9,
    z: Math.random() * 1.4 - 0.4,
    p: Math.random() * Math.PI * 2,
    s: 0.3 + Math.random() * 0.5,
  }))
  const moteGeo = track(new THREE.BufferGeometry())
  moteGeo.setAttribute('position', new THREE.BufferAttribute(motePos, 3))
  const moteMat = pointsMat(0xd8c9a0, 0.045, 0.35)
  scene.add(new THREE.Points(moteGeo, moteMat))

  /* ---- State ------------------------------------------------------------ */
  let warmth = 2
  let pulse = 0
  let pointerX = 0
  let pointerY = 0

  const clock = new THREE.Clock()
  let disposed = false

  function frame(): void {
    if (disposed) return
    const t = clock.getElapsedTime()

    // the lean: near things move more than far ones, by nature of the camera
    camera.position.x += (pointerX * 0.22 - camera.position.x) * 0.06
    camera.position.y += (-pointerY * 0.15 - camera.position.y) * 0.06
    camera.lookAt(0, 0, -1)

    if (!opts.reducedMotion) {
      for (const l of starLayers) l.points.position.x = Math.sin(t * l.drift * 10) * 0.25
    }

    // the sign breathes; a glance makes it answer
    if (pulse > 0) pulse = Math.max(0, pulse - 0.008)
    const glow = 0.95 + (opts.reducedMotion ? 0 : Math.sin(t * 0.8) * 0.05) + pulse * 0.6
    if (signMat) signMat.opacity = Math.min(1, glow)
    if (signLineMat) signLineMat.opacity = 0.4 + pulse * 0.5
    const ss = 1 + pulse * 0.06
    signGroup.scale.set(ss, ss, ss)
    if (!opts.reducedMotion) signGroup.rotation.y = Math.sin(t * 0.05) * 0.08

    // embers climb; warmth decides how many make it and how bright
    const [ex, ey] = emberBase
    for (let i = 0; i < EMBERS; i++) {
      const seed = emberSeed[i]!
      const speed = opts.reducedMotion ? 0.05 : 0.14 + warmth * 0.03
      const cycle = (t * speed + seed.phase) % 1
      emberPos[i * 3] = ex + Math.sin(cycle * seed.swaySpeed + i) * seed.swayAmp * (1 + cycle * 2)
      emberPos[i * 3 + 1] = ey + cycle * seed.rise
      emberPos[i * 3 + 2] = EMBER_Z - cycle * 0.4
    }
    emberGeo.attributes.position!.needsUpdate = true
    emberMat.opacity = 0.25 + warmth * 0.2

    // dust hangs
    for (let i = 0; i < MOTES; i++) {
      const m = moteSeed[i]!
      motePos[i * 3] = m.x + Math.sin(t * 0.1 * m.s + m.p) * 0.4
      motePos[i * 3 + 1] = m.y + Math.sin(t * 0.14 * m.s + m.p * 2) * 0.25
      motePos[i * 3 + 2] = m.z
    }
    moteGeo.attributes.position!.needsUpdate = true

    renderer.render(scene, camera)
  }
  renderer.setAnimationLoop(frame)

  const ro = new ResizeObserver(() => {
    const w = canvas.clientWidth
    const h = canvas.clientHeight
    if (w === 0 || h === 0) return
    renderer.setSize(w, h, false)
    camera.aspect = w / h
    camera.updateProjectionMatrix()
    placeEmbers()
  })
  ro.observe(canvas)
  renderer.setSize(canvas.clientWidth || 1, canvas.clientHeight || 1, false)
  camera.aspect = (canvas.clientWidth || 16) / (canvas.clientHeight || 9)
  camera.updateProjectionMatrix()
  placeEmbers()

  return {
    setWarmth: (n) => {
      warmth = n
    },
    pulseSign: () => {
      pulse = 1
    },
    setPointer: (px, py) => {
      pointerX = px
      pointerY = py
    },
    dispose: () => {
      disposed = true
      renderer.setAnimationLoop(null)
      ro.disconnect()
      for (const d of disposables) d.dispose()
      renderer.dispose()
    },
  }
}

/** Resolve a CSS color (oklch included) to a numeric color the renderer
 *  understands. A 2D canvas normalizes any color it accepts to #rrggbb —
 *  unlike getComputedStyle, which preserves the oklch() notation. */
export function resolveCssColor(css: string, fallback: number): number {
  if (typeof document === 'undefined') return fallback
  const ctx = document.createElement('canvas').getContext('2d')
  if (!ctx) return fallback
  ctx.fillStyle = css
  const s = ctx.fillStyle
  return /^#[0-9a-f]{6}$/i.test(s) ? parseInt(s.slice(1), 16) : fallback
}
