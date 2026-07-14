/** Screen shake as a decaying impulse.
 *
 *  A fixed CSS keyframe shakes the same for a 3-damage tick and a 900-damage
 *  Pyroblast crit, which teaches the player nothing. This takes an intensity,
 *  keeps the strongest impulse in flight, and decays it exponentially — so
 *  force reads, and a small hit during a big shake never weakens it.
 *
 *  Hand-rolled rather than tweened: it is one scalar falling to zero on a rAF
 *  loop, and it sits on the game's hottest path. */

const MAX_AMP = 14
/** amplitude is down to ~0.2% of peak after `duration` seconds */
const DECAY_CONSTANT = 6

export class Shaker {
  private el: HTMLElement | null = null
  private amp = 0
  private k = DECAY_CONSTANT / 0.42
  private raf = 0
  reduced = false

  attach(el: HTMLElement): void {
    this.el = el
  }

  detach(): void {
    if (this.raf) cancelAnimationFrame(this.raf)
    this.raf = 0
    this.amp = 0
    if (this.el) this.el.style.transform = ''
    this.el = null
  }

  /** @param intensity roughly px of displacement at the peak */
  punch(intensity: number, duration = 0.42): void {
    if (!this.el || this.reduced || intensity <= 0) return
    this.amp = Math.min(MAX_AMP, Math.max(this.amp, intensity))
    this.k = DECAY_CONSTANT / Math.max(duration, 0.05)
    if (!this.raf) {
      let last = performance.now()
      const frame = (now: number): void => {
        const dt = Math.min(now - last, 50) / 1000
        last = now
        const el = this.el
        if (!el) {
          this.raf = 0
          return
        }
        this.amp *= Math.exp(-this.k * dt)
        if (this.amp <= 0.05) {
          this.amp = 0
          el.style.transform = ''
          this.raf = 0
          return
        }
        const a = this.amp
        const x = (Math.random() * 2 - 1) * a
        const y = (Math.random() * 2 - 1) * a * 0.7
        const r = (Math.random() * 2 - 1) * a * 0.055
        el.style.transform = `translate3d(${x.toFixed(2)}px, ${y.toFixed(2)}px, 0) rotate(${r.toFixed(3)}deg)`
        this.raf = requestAnimationFrame(frame)
      }
      this.raf = requestAnimationFrame(frame)
    }
  }
}
