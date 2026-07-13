/** Synthesized sound effects — no assets, just tiny WebAudio envelopes.
 *  Everything routes through one master gain so mute is instant. */

export type SfxName =
  | 'cast'
  | 'hit'
  | 'crit'
  | 'heal'
  | 'kill'
  | 'loot'
  | 'epic'
  | 'level'
  | 'death'
  | 'interrupt'
  | 'boss'
  | 'warn'

interface Voice {
  type: OscillatorType
  /** [startHz, endHz] frequency sweep */
  freq: [number, number]
  dur: number
  gain: number
  delay?: number
}

const VOICES: Record<SfxName, Voice[]> = {
  cast: [{ type: 'sine', freq: [520, 880], dur: 0.12, gain: 0.05 }],
  hit: [{ type: 'triangle', freq: [180, 90], dur: 0.09, gain: 0.06 }],
  crit: [
    { type: 'triangle', freq: [220, 110], dur: 0.1, gain: 0.07 },
    { type: 'sine', freq: [880, 1320], dur: 0.12, gain: 0.045, delay: 0.02 },
  ],
  heal: [
    { type: 'sine', freq: [660, 990], dur: 0.16, gain: 0.045 },
    { type: 'sine', freq: [990, 1320], dur: 0.14, gain: 0.03, delay: 0.07 },
  ],
  kill: [
    { type: 'triangle', freq: [140, 60], dur: 0.18, gain: 0.06 },
    { type: 'sine', freq: [1040, 1560], dur: 0.08, gain: 0.035, delay: 0.1 },
  ],
  loot: [
    { type: 'sine', freq: [780, 780], dur: 0.07, gain: 0.04 },
    { type: 'sine', freq: [1170, 1170], dur: 0.09, gain: 0.04, delay: 0.07 },
  ],
  epic: [
    { type: 'sine', freq: [520, 520], dur: 0.09, gain: 0.05 },
    { type: 'sine', freq: [780, 780], dur: 0.09, gain: 0.05, delay: 0.08 },
    { type: 'sine', freq: [1040, 1560], dur: 0.16, gain: 0.05, delay: 0.16 },
  ],
  level: [
    { type: 'sine', freq: [523, 523], dur: 0.1, gain: 0.05 },
    { type: 'sine', freq: [659, 659], dur: 0.1, gain: 0.05, delay: 0.09 },
    { type: 'sine', freq: [784, 784], dur: 0.1, gain: 0.05, delay: 0.18 },
    { type: 'sine', freq: [1046, 1046], dur: 0.22, gain: 0.055, delay: 0.27 },
  ],
  death: [
    { type: 'triangle', freq: [220, 55], dur: 0.5, gain: 0.06 },
    { type: 'sine', freq: [110, 41], dur: 0.6, gain: 0.045, delay: 0.05 },
  ],
  interrupt: [
    { type: 'square', freq: [740, 370], dur: 0.07, gain: 0.035 },
    { type: 'square', freq: [560, 280], dur: 0.07, gain: 0.03, delay: 0.05 },
  ],
  boss: [
    { type: 'triangle', freq: [98, 65], dur: 0.4, gain: 0.06 },
    { type: 'triangle', freq: [130, 98], dur: 0.35, gain: 0.05, delay: 0.18 },
  ],
  warn: [{ type: 'sine', freq: [980, 740], dur: 0.14, gain: 0.04 }],
}

export class Sfx {
  private ctx: AudioContext | null = null
  private master: GainNode | null = null
  muted = false

  /** Browsers gate audio behind a user gesture — call this from one. */
  unlock(): void {
    if (this.ctx) {
      if (this.ctx.state === 'suspended') void this.ctx.resume()
      return
    }
    try {
      this.ctx = new AudioContext()
      this.master = this.ctx.createGain()
      this.master.gain.value = 1
      this.master.connect(this.ctx.destination)
    } catch {
      this.ctx = null
    }
  }

  play(name: SfxName): void {
    if (this.muted || !this.ctx || !this.master || this.ctx.state !== 'running') return
    const now = this.ctx.currentTime
    for (const v of VOICES[name]) {
      const osc = this.ctx.createOscillator()
      const gain = this.ctx.createGain()
      const t0 = now + (v.delay ?? 0)
      osc.type = v.type
      osc.frequency.setValueAtTime(v.freq[0], t0)
      if (v.freq[1] !== v.freq[0]) osc.frequency.exponentialRampToValueAtTime(Math.max(20, v.freq[1]), t0 + v.dur)
      gain.gain.setValueAtTime(0.0001, t0)
      gain.gain.exponentialRampToValueAtTime(v.gain, t0 + 0.012)
      gain.gain.exponentialRampToValueAtTime(0.0001, t0 + v.dur)
      osc.connect(gain)
      gain.connect(this.master)
      osc.start(t0)
      osc.stop(t0 + v.dur + 0.05)
    }
  }
}
