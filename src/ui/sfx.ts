/** Synthesized sound — still no assets, but with weight now.
 *
 *  A hit is not one beep. It is a *body* (a low sine thumping down), a *crack*
 *  (a filtered noise burst), and sometimes a *sizzle* (a bright tail). Layering
 *  those three is the whole difference between a UI blip and a spell landing.
 *
 *  Two sustained voices hang off the same master gain: a drone while a boss is
 *  on the field, and a heartbeat when you are nearly dead. */

export type SfxName =
  | 'cast'
  | 'pyro-cast'
  | 'hit'
  | 'pyro-hit'
  | 'crit'
  | 'burn'
  | 'ignite'
  | 'heal'
  | 'barrier'
  | 'absorb'
  | 'shatter'
  | 'kill'
  | 'loot'
  | 'epic'
  | 'level'
  | 'death'
  | 'interrupt'
  | 'boss'
  | 'warn'
  | 'denied'

interface Tone {
  kind: 'tone'
  type: OscillatorType
  /** frequency sweep, Hz */
  freq: [number, number]
  dur: number
  gain: number
  delay?: number
}

interface Noise {
  kind: 'noise'
  /** filter cutoff sweep, Hz */
  cut: [number, number]
  filter?: BiquadFilterType
  q?: number
  dur: number
  gain: number
  delay?: number
}

type Voice = Tone | Noise

const VOICES: Record<SfxName, Voice[]> = {
  // ── casting: air being displaced ──
  cast: [
    { kind: 'noise', cut: [500, 2800], filter: 'bandpass', q: 1.2, dur: 0.22, gain: 0.07 },
    { kind: 'tone', type: 'sine', freq: [300, 920], dur: 0.16, gain: 0.05 },
  ],
  'pyro-cast': [
    { kind: 'noise', cut: [200, 1900], filter: 'bandpass', q: 0.8, dur: 0.42, gain: 0.1 },
    { kind: 'tone', type: 'sine', freq: [120, 420], dur: 0.34, gain: 0.07 },
    { kind: 'tone', type: 'triangle', freq: [60, 180], dur: 0.4, gain: 0.05, delay: 0.04 },
  ],

  // ── impact: body + crack ──
  hit: [
    { kind: 'tone', type: 'triangle', freq: [170, 52], dur: 0.19, gain: 0.14 },
    { kind: 'noise', cut: [2400, 320], filter: 'lowpass', dur: 0.12, gain: 0.1 },
  ],
  'pyro-hit': [
    { kind: 'tone', type: 'sine', freq: [95, 28], dur: 0.52, gain: 0.2 },
    { kind: 'noise', cut: [3200, 220], filter: 'lowpass', dur: 0.34, gain: 0.16 },
    { kind: 'noise', cut: [700, 90], filter: 'lowpass', dur: 0.6, gain: 0.08, delay: 0.06 },
  ],
  crit: [
    { kind: 'tone', type: 'triangle', freq: [210, 44], dur: 0.28, gain: 0.18 },
    { kind: 'noise', cut: [4600, 400], filter: 'lowpass', dur: 0.2, gain: 0.15 },
    { kind: 'tone', type: 'sine', freq: [1180, 2500], dur: 0.14, gain: 0.055, delay: 0.015 },
  ],

  // ── fire over time ──
  burn: [{ kind: 'noise', cut: [1800, 3400], filter: 'highpass', q: 0.7, dur: 0.09, gain: 0.028 }],
  ignite: [
    { kind: 'noise', cut: [600, 3000], filter: 'bandpass', q: 1, dur: 0.26, gain: 0.07 },
    { kind: 'tone', type: 'sine', freq: [380, 820], dur: 0.2, gain: 0.045 },
  ],

  // ── defence ──
  heal: [
    { kind: 'tone', type: 'sine', freq: [660, 990], dur: 0.18, gain: 0.05 },
    { kind: 'tone', type: 'sine', freq: [990, 1320], dur: 0.16, gain: 0.035, delay: 0.07 },
    { kind: 'noise', cut: [3000, 6000], filter: 'highpass', dur: 0.22, gain: 0.02 },
  ],
  barrier: [
    { kind: 'tone', type: 'sine', freq: [880, 1420], dur: 0.3, gain: 0.055 },
    { kind: 'tone', type: 'sine', freq: [1420, 1760], dur: 0.24, gain: 0.035, delay: 0.06 },
    { kind: 'noise', cut: [3400, 6800], filter: 'highpass', dur: 0.16, gain: 0.03 },
  ],
  absorb: [
    { kind: 'tone', type: 'sine', freq: [520, 300], dur: 0.11, gain: 0.05 },
    { kind: 'noise', cut: [1400, 420], filter: 'lowpass', dur: 0.09, gain: 0.04 },
  ],
  shatter: [
    { kind: 'noise', cut: [5200, 1400], filter: 'highpass', dur: 0.32, gain: 0.1 },
    { kind: 'tone', type: 'square', freq: [1700, 380], dur: 0.11, gain: 0.035 },
  ],

  // ── consequences ──
  kill: [
    { kind: 'tone', type: 'triangle', freq: [140, 46], dur: 0.24, gain: 0.1 },
    { kind: 'noise', cut: [2600, 200], filter: 'lowpass', dur: 0.28, gain: 0.08 },
    { kind: 'tone', type: 'sine', freq: [1040, 1560], dur: 0.09, gain: 0.035, delay: 0.11 },
  ],
  loot: [
    { kind: 'tone', type: 'sine', freq: [780, 780], dur: 0.07, gain: 0.04 },
    { kind: 'tone', type: 'sine', freq: [1170, 1170], dur: 0.09, gain: 0.04, delay: 0.07 },
  ],
  epic: [
    { kind: 'tone', type: 'sine', freq: [520, 520], dur: 0.09, gain: 0.05 },
    { kind: 'tone', type: 'sine', freq: [780, 780], dur: 0.09, gain: 0.05, delay: 0.08 },
    { kind: 'tone', type: 'sine', freq: [1040, 1560], dur: 0.18, gain: 0.05, delay: 0.16 },
    { kind: 'noise', cut: [4000, 8000], filter: 'highpass', dur: 0.3, gain: 0.025, delay: 0.16 },
  ],
  level: [
    { kind: 'tone', type: 'sine', freq: [523, 523], dur: 0.1, gain: 0.05 },
    { kind: 'tone', type: 'sine', freq: [659, 659], dur: 0.1, gain: 0.05, delay: 0.09 },
    { kind: 'tone', type: 'sine', freq: [784, 784], dur: 0.1, gain: 0.05, delay: 0.18 },
    { kind: 'tone', type: 'sine', freq: [1046, 1046], dur: 0.26, gain: 0.055, delay: 0.27 },
  ],
  death: [
    { kind: 'tone', type: 'triangle', freq: [220, 40], dur: 0.6, gain: 0.09 },
    { kind: 'tone', type: 'sine', freq: [110, 34], dur: 0.7, gain: 0.06, delay: 0.05 },
    { kind: 'noise', cut: [900, 90], filter: 'lowpass', dur: 0.7, gain: 0.05 },
  ],
  interrupt: [
    { kind: 'tone', type: 'square', freq: [820, 300], dur: 0.07, gain: 0.045 },
    { kind: 'noise', cut: [6000, 2000], filter: 'highpass', dur: 0.12, gain: 0.055 },
    { kind: 'tone', type: 'square', freq: [560, 240], dur: 0.06, gain: 0.03, delay: 0.045 },
  ],
  boss: [
    { kind: 'tone', type: 'triangle', freq: [98, 62], dur: 0.5, gain: 0.09 },
    { kind: 'tone', type: 'triangle', freq: [130, 96], dur: 0.42, gain: 0.06, delay: 0.18 },
    { kind: 'noise', cut: [400, 60], filter: 'lowpass', dur: 0.8, gain: 0.05 },
  ],
  warn: [
    { kind: 'tone', type: 'sine', freq: [980, 720], dur: 0.15, gain: 0.045 },
    { kind: 'tone', type: 'sine', freq: [720, 560], dur: 0.14, gain: 0.03, delay: 0.1 },
  ],
  // a dull wooden "no" — audibly *not* a spell going off
  denied: [
    { kind: 'tone', type: 'triangle', freq: [150, 96], dur: 0.09, gain: 0.05 },
    { kind: 'noise', cut: [700, 260], filter: 'lowpass', dur: 0.06, gain: 0.03 },
  ],
}

const EPS = 0.0001

export class Sfx {
  private ctx: AudioContext | null = null
  private master: GainNode | null = null
  private noiseBuf: AudioBuffer | null = null

  private droneNodes: { osc: OscillatorNode[]; gain: GainNode } | null = null
  private beatTimer: ReturnType<typeof setInterval> | null = null

  private _muted = false

  get muted(): boolean {
    return this._muted
  }

  set muted(v: boolean) {
    this._muted = v
    if (this.master && this.ctx) {
      this.master.gain.setTargetAtTime(v ? 0 : 1, this.ctx.currentTime, 0.02)
    }
    if (v) this.heartbeat(false)
  }

  /** Browsers gate audio behind a user gesture — call this from one. */
  unlock(): void {
    if (this.ctx) {
      if (this.ctx.state === 'suspended') void this.ctx.resume()
      return
    }
    try {
      const ctx = new AudioContext()
      const master = ctx.createGain()
      master.gain.value = this._muted ? 0 : 1
      master.connect(ctx.destination)

      // One second of white noise, reused by every crack, sizzle and rumble.
      const buf = ctx.createBuffer(1, ctx.sampleRate, ctx.sampleRate)
      const data = buf.getChannelData(0)
      for (let i = 0; i < data.length; i++) data[i] = Math.random() * 2 - 1

      this.ctx = ctx
      this.master = master
      this.noiseBuf = buf
    } catch {
      this.ctx = null
    }
  }

  private get live(): boolean {
    return !this._muted && this.ctx !== null && this.master !== null && this.ctx.state === 'running'
  }

  /** Percussive envelope: near-instant attack, exponential decay. */
  private envelope(peak: number, t0: number, dur: number): GainNode {
    const g = this.ctx!.createGain()
    g.gain.setValueAtTime(EPS, t0)
    g.gain.exponentialRampToValueAtTime(Math.max(peak, EPS), t0 + 0.008)
    g.gain.exponentialRampToValueAtTime(EPS, t0 + dur)
    return g
  }

  play(name: SfxName): void {
    if (!this.live) return
    const ctx = this.ctx!
    const now = ctx.currentTime

    for (const v of VOICES[name]) {
      const t0 = now + (v.delay ?? 0)
      const env = this.envelope(v.gain, t0, v.dur)
      env.connect(this.master!)

      if (v.kind === 'tone') {
        const osc = ctx.createOscillator()
        osc.type = v.type
        osc.frequency.setValueAtTime(v.freq[0], t0)
        if (v.freq[1] !== v.freq[0]) {
          osc.frequency.exponentialRampToValueAtTime(Math.max(20, v.freq[1]), t0 + v.dur)
        }
        osc.connect(env)
        osc.start(t0)
        osc.stop(t0 + v.dur + 0.05)
      } else {
        const src = ctx.createBufferSource()
        src.buffer = this.noiseBuf
        const filt = ctx.createBiquadFilter()
        filt.type = v.filter ?? 'lowpass'
        filt.Q.value = v.q ?? 1
        filt.frequency.setValueAtTime(v.cut[0], t0)
        if (v.cut[1] !== v.cut[0]) {
          filt.frequency.exponentialRampToValueAtTime(Math.max(20, v.cut[1]), t0 + v.dur)
        }
        src.connect(filt)
        filt.connect(env)
        src.start(t0)
        src.stop(t0 + v.dur + 0.05)
      }
    }
  }

  /** A low, detuned pedal tone while a boss holds the field. */
  drone(on: boolean): void {
    if (on && !this.droneNodes && this.live) {
      const ctx = this.ctx!
      const gain = ctx.createGain()
      gain.gain.setValueAtTime(EPS, ctx.currentTime)
      gain.gain.exponentialRampToValueAtTime(0.035, ctx.currentTime + 2)
      gain.connect(this.master!)
      // a hair of detune between the two makes the pedal beat slowly
      const osc = [55, 55.6, 82.4].map((f) => {
        const o = ctx.createOscillator()
        o.type = 'sine'
        o.frequency.value = f
        o.connect(gain)
        o.start()
        return o
      })
      this.droneNodes = { osc, gain }
    } else if (!on && this.droneNodes && this.ctx) {
      const { osc, gain } = this.droneNodes
      const t = this.ctx.currentTime
      gain.gain.cancelScheduledValues(t)
      gain.gain.setValueAtTime(Math.max(gain.gain.value, EPS), t)
      gain.gain.exponentialRampToValueAtTime(EPS, t + 0.8)
      for (const o of osc) o.stop(t + 0.9)
      this.droneNodes = null
    }
  }

  /** Two thumps a beat, while you are close to death. Matches the vignette. */
  heartbeat(on: boolean): void {
    if (on && !this.beatTimer && this.live) {
      const thump = (): void => {
        if (!this.live) return
        const ctx = this.ctx!
        for (const [delay, gain] of [
          [0, 0.09],
          [0.17, 0.06],
        ] as const) {
          const t0 = ctx.currentTime + delay
          const env = this.envelope(gain, t0, 0.16)
          env.connect(this.master!)
          const osc = ctx.createOscillator()
          osc.type = 'sine'
          osc.frequency.setValueAtTime(70, t0)
          osc.frequency.exponentialRampToValueAtTime(38, t0 + 0.16)
          osc.connect(env)
          osc.start(t0)
          osc.stop(t0 + 0.22)
        }
      }
      thump()
      this.beatTimer = setInterval(thump, 1150)
    } else if (!on && this.beatTimer) {
      clearInterval(this.beatTimer)
      this.beatTimer = null
    }
  }

  dispose(): void {
    this.heartbeat(false)
    this.drone(false)
  }
}
