/** Turns CombatEvents into light, force and sound.
 *
 *  Two channels, matching the engine's own split:
 *    handle(event)  — one-shots. A spell fires, a body falls.
 *    sync(snapshot) — standing state. A burn still burns, a shield still holds.
 *
 *  The important trick lives in `damage()`: a projectile spell does not land
 *  the instant the sim resolves it. The bolt has to *fly*. So the float, the
 *  impact, the shake and the sound are all withheld until the projectile
 *  arrives — which is also, by design, roughly when the health bar's trailing
 *  loss layer starts to drain. Cause and effect line up. */
import type { AbilityId, CombatEvent, CombatSnapshot, Side } from '../../engine'
import type { SfxName } from '../sfx'
import { HOT, TONE, TONE_DEEP, VENOM, WOUND } from './palette'
import { Shaker } from './shake'
import { FxStage, type Spot } from './stage'

/** What the director needs back from the Game to finish a beat. */
export interface FxHost {
  /** `at` is a point in arena-stage space — the number lands where the spell did. */
  float(side: Side, kind: 'damage' | 'crit' | 'heal' | 'absorb', amount: number, tone: string, at: Spot): void
  bump(side: Side): void
  sfx(name: SfxName): void
}

/** Flight time per projectile spell, seconds. Short enough that the health
 *  bar and the detonation still read as one event; long enough to see it. */
const FLIGHT: Partial<Record<string, number>> = {
  fireball: 0.14,
  pyroblast: 0.28,
  enemyCast: 0.22,
}

const CSS_TONE: Record<string, string> = {
  fireball: 'var(--tone-fireball)',
  ignite: 'var(--tone-ignite)',
  renew: 'var(--tone-renew)',
  pyroblast: 'var(--tone-pyroblast)',
  counterspell: 'var(--tone-counterspell)',
  barrier: 'var(--tone-barrier)',
  combustion: 'var(--tone-combustion)',
  enemySwing: 'var(--wound)',
  enemyCast: 'oklch(0.78 0.14 65)',
  venom: 'oklch(0.78 0.13 130)',
}

export class FxDirector {
  readonly stage = new FxStage()
  readonly shaker = new Shaker()

  /** Decided at construction, not at start(): child components mount before
   *  their parent's onMount, so ArenaFx asks to mount the stage before the
   *  Game has run a line of start(). If this were set there, we'd spin up a
   *  WebGL context for a player who explicitly asked for no motion. */
  reduced = typeof window !== 'undefined' && window.matchMedia('(prefers-reduced-motion: reduce)').matches

  private host: FxHost | null = null

  /** standing emitters, reconciled against the snapshot each frame */
  private chargeFx = 0
  private igniteFx = 0
  private enrageFx = 0
  private combustionFx = 0
  private enemyCastFx = 0

  /** cast progress, read by the charge emitter so the gather tightens */
  private charge = 0

  bind(host: FxHost): void {
    this.host = host
  }

  /** The element the whole view shakes on — the page, not the card. */
  attachShake(el: HTMLElement): void {
    this.shaker.reduced = this.reduced
    this.shaker.attach(el)
  }

  /** Pixi is loaded here, on demand: it is a large chunk and nothing in the
   *  game depends on it, so the fight is playable before it arrives. */
  async mountStage(host: HTMLElement): Promise<void> {
    if (this.reduced) return // no canvas at all — none of this is load-bearing
    await this.stage.mount(host)
  }

  setAnchors(a: FxStage['anchors']): void {
    this.stage.anchors = a
  }

  destroy(): void {
    this.shaker.detach()
    this.stage.destroy()
  }

  private get player(): Spot {
    return this.stage.anchors.player
  }

  private get enemy(): Spot {
    return this.stage.anchors.enemy
  }

  // ─────────────── standing state ───────────────

  /** Persistent effects follow the snapshot, never event bookkeeping — a burn
   *  that expires quietly still has to stop burning. */
  sync(c: CombatSnapshot): void {
    if (this.reduced || !this.stage.ready) return
    this.charge = c.cast?.progress ?? 0

    const casting = c.cast !== null && (c.cast.abilityId === 'fireball' || c.cast.abilityId === 'pyroblast' || c.cast.abilityId === 'renew')
    if (casting && !this.chargeFx) {
      const id = c.cast!.abilityId
      this.chargeFx = this.stage.emit(Infinity, 0.022, () => this.gather(id))
    } else if (!casting && this.chargeFx) {
      this.stage.stopEmitter(this.chargeFx)
      this.chargeFx = 0
    }

    const burning = c.enemy?.dot != null
    if (burning && !this.igniteFx) {
      this.igniteFx = this.stage.emit(Infinity, 0.028, () =>
        this.lick(this.stage.anchors.enemyCard, TONE.ignite, TONE_DEEP.ignite, 0.8),
      )
    } else if (!burning && this.igniteFx) {
      this.stage.stopEmitter(this.igniteFx)
      this.igniteFx = 0
    }

    const enraged = c.enemy?.enraged ?? false
    if (enraged && !this.enrageFx) {
      this.enrageFx = this.stage.emit(Infinity, 0.07, () =>
        this.lick(this.stage.anchors.enemyCard, WOUND, 0xb01020, 0.5),
      )
    } else if (!enraged && this.enrageFx) {
      this.stage.stopEmitter(this.enrageFx)
      this.enrageFx = 0
    }

    const lit = c.player.buffs.some((b) => b.id === 'combustion')
    if (lit && !this.combustionFx) {
      this.combustionFx = this.stage.emit(Infinity, 0.018, () =>
        this.lick(this.stage.anchors.playerCard, TONE.combustion, TONE_DEEP.fireball, 1),
      )
      // your fire is literally hotter — every fire effect gets denser
      this.stage.setIntensity(1.6)
    } else if (!lit && this.combustionFx) {
      this.stage.stopEmitter(this.combustionFx)
      this.combustionFx = 0
      this.stage.setIntensity(1)
    }

    const hardcasting = c.enemy?.cast != null
    if (hardcasting && !this.enemyCastFx) {
      this.enemyCastFx = this.stage.emit(Infinity, 0.03, () => this.gatherEnemy())
    } else if (!hardcasting && this.enemyCastFx) {
      this.stage.stopEmitter(this.enemyCastFx)
      this.enemyCastFx = 0
    }
  }

  /** Flames licking off the top edge of a card. */
  private lick(r: { x: number; y: number; w: number; h: number }, hot: number, deep: number, alpha: number): void {
    if (r.w === 0) return
    this.stage.burst(r.x + Math.random() * r.w, r.y + r.h * (0.55 + Math.random() * 0.45), {
      count: 1,
      speed: [26, 70],
      angle: [-Math.PI * 0.72, -Math.PI * 0.28],
      life: [0.35, 0.75],
      size: [7, 17],
      endScale: 0.1,
      tint: [hot, deep],
      gravity: -60,
      drag: 1.1,
      alpha,
      tex: 'glow',
    })
  }

  /** Power gathering in the caster's hand: motes spiralling inward, tightening
   *  as the cast completes. This is the anticipation the old UI never had. */
  private gather(id: AbilityId): void {
    const a = this.player
    const t = this.charge
    const radius = 62 - t * 34
    const ang = Math.random() * Math.PI * 2
    const x = a.x + Math.cos(ang) * radius
    const y = a.y + Math.sin(ang) * radius
    const pull = 150 + t * 260
    this.stage.burst(x, y, {
      count: 1,
      speed: [pull * 0.8, pull],
      angle: [ang + Math.PI - 0.35, ang + Math.PI + 0.35],
      life: [0.24, 0.4],
      size: [5, 12],
      endScale: 0.2,
      tint: [TONE[id], TONE_DEEP[id], HOT],
      drag: 0.2,
      stretch: 1.4,
    })
    // the core brightens as the spell ripens
    if (Math.random() < 0.35) {
      this.stage.flash(a.x, a.y, {
        tint: TONE[id],
        size: 26 + t * 54,
        life: 0.2,
        alpha: 0.14 + t * 0.4,
        grow: 0.7,
      })
    }
  }

  private gatherEnemy(): void {
    const a = this.enemy
    const ang = Math.random() * Math.PI * 2
    const r = 54
    this.stage.burst(a.x + Math.cos(ang) * r, a.y + Math.sin(ang) * r, {
      count: 1,
      speed: [140, 240],
      angle: [ang + Math.PI - 0.3, ang + Math.PI + 0.3],
      life: [0.2, 0.34],
      size: [5, 11],
      tint: [0xff8a3c, 0xd93a1a],
      drag: 0.2,
      stretch: 1.2,
      alpha: 0.9,
    })
  }

  // ─────────────── one-shots ───────────────

  handle(event: CombatEvent, snapshot: CombatSnapshot): void {
    // Damage and heal own their own sound, because a projectile's sound has to
    // wait for the projectile. Everything else is cued the moment it happens.
    if (event.kind === 'damage') {
      if (this.reduced) this.plainDamage(event)
      else this.damage(event, snapshot)
      return
    }
    if (event.kind === 'heal') {
      this.host?.float('player', 'heal', event.amount, CSS_TONE.renew!, this.player)
      this.host?.sfx('heal')
      if (!this.reduced) this.heal(event.crit)
      return
    }

    this.cue(event)
    if (!this.reduced) this.visual(event)
  }

  /** Sound is never a motion effect — reduced-motion users still hear the fight. */
  private cue(event: CombatEvent): void {
    switch (event.kind) {
      case 'dotApplied':
        this.host?.sfx(event.target === 'enemy' ? 'ignite' : 'warn')
        break
      case 'buffApplied':
        this.host?.sfx(event.id === 'barrier' ? 'barrier' : 'epic')
        break
      case 'shieldBroken':
        this.host?.sfx('shatter')
        break
      case 'interrupted':
        this.host?.sfx('interrupt')
        break
      case 'enemyCastStarted':
        this.host?.sfx('warn')
        break
      case 'enemyEnraged':
        this.host?.sfx('boss')
        break
      case 'enemySpawned':
        if (event.rank === 'boss') this.host?.sfx('boss')
        break
      case 'playerDied':
        this.host?.sfx('death')
        break
      default:
        break
    }
  }

  private visual(event: CombatEvent): void {
    switch (event.kind) {
      case 'castFizzled':
        this.stage.smokePuff(this.player.x, this.player.y, 4)
        break
      case 'dotApplied':
        if (event.target === 'enemy') this.igniteCatch()
        else this.venomTouch()
        break
      case 'buffApplied':
        if (event.id === 'barrier') this.barrierUp()
        else this.combustionUp()
        break
      case 'shieldBroken':
        this.barrierShatter()
        break
      case 'interrupted':
        this.counterspell()
        break
      case 'enemyEnraged':
        this.enrage()
        break
      case 'enemySpawned':
        this.materialize()
        break
      case 'enemyDied':
        this.disintegrate()
        break
      case 'playerDied':
        this.playerDeath()
        break
      case 'levelUp':
        this.levelUp()
        break
      case 'lootDropped':
        if (!event.autoSold) this.loot(event.item.rarity === 'epic')
        break
      default:
        break
    }
  }

  /** Reduced-motion path: the information, none of the theatre. */
  private plainDamage(e: Extract<CombatEvent, { kind: 'damage' }>): void {
    const tone = CSS_TONE[e.source] ?? 'var(--wound)'
    if (e.target === 'enemy') {
      this.host?.float('enemy', e.crit ? 'crit' : 'damage', e.amount, tone, this.enemy)
      this.host?.bump('enemy')
    } else if (e.amount > 0) {
      this.host?.float('player', 'damage', e.amount, tone, this.player)
      this.host?.bump('player')
    } else if (e.absorbed > 0) {
      this.host?.float('player', 'absorb', e.absorbed, 'var(--shield)', this.player)
    }
    this.host?.sfx(e.amount === 0 && e.absorbed > 0 ? 'absorb' : e.crit ? 'crit' : 'hit')
  }

  // ─── damage ───

  private damage(e: Extract<CombatEvent, { kind: 'damage' }>, c: CombatSnapshot): void {
    const flight = FLIGHT[e.source]
    const tone = CSS_TONE[e.source] ?? 'var(--wound)'

    if (e.target === 'enemy') {
      if (e.source === 'fireball' || e.source === 'pyroblast') {
        const id = e.source
        this.launch(id, () => this.spellImpact(id, e.amount, e.crit, tone))
      } else if (e.source === 'ignite') {
        this.burnTick(e.amount, e.crit, tone)
      } else {
        this.spellImpact('fireball', e.amount, e.crit, tone)
      }
      return
    }

    // incoming
    const share = c.player.maxHp > 0 ? e.amount / c.player.maxHp : 0
    const force = Math.min(13, 3 + share * 55)
    const land = (): void => {
      if (e.amount > 0) {
        this.host?.float('player', 'damage', e.amount, tone, this.player)
        this.host?.bump('player')
        this.host?.sfx('hit')
        this.shaker.punch(force)
      } else if (e.absorbed > 0) {
        this.host?.float('player', 'absorb', e.absorbed, 'var(--shield)', this.player)
        this.host?.sfx('absorb')
      }
      if (e.absorbed > 0) this.shieldSpark()
      this.hurt(e.source === 'venom' ? VENOM : WOUND, e.amount === 0)
    }

    if (e.source === 'enemyCast' && flight) {
      this.enemyBolt(flight, land)
    } else if (e.source === 'enemySwing') {
      this.slash()
      land()
    } else {
      land()
    }
  }

  /** Fireball / Pyroblast: the flagship. Release, flight, detonation. */
  private launch(id: 'fireball' | 'pyroblast', onArrive: () => void): void {
    const from = this.player
    const to = this.enemy
    const big = id === 'pyroblast'
    const hot = TONE[id]
    const deep = TONE_DEEP[id]

    // release: the gathered orb tears loose
    this.stage.flash(from.x, from.y, { tint: HOT, size: big ? 110 : 74, life: 0.18, alpha: 0.95, grow: 1.5 })
    this.stage.ring(from.x, from.y, { tint: hot, from: 18, to: big ? 130 : 88, life: 0.28, alpha: 0.6 })
    const away = Math.atan2(to.y - from.y, to.x - from.x)
    this.stage.burst(from.x, from.y, {
      count: big ? 16 : 9,
      speed: [180, 460],
      angle: [away - 0.7, away + 0.7],
      life: [0.2, 0.4],
      size: [5, 13],
      tint: [hot, deep, HOT],
      drag: 2,
      stretch: 1.6,
    })
    this.host?.sfx(big ? 'pyro-cast' : 'cast')
    this.shaker.punch(big ? 3.5 : 1.6, 0.2)

    this.stage.projectile({
      from,
      to,
      dur: FLIGHT[id]!,
      size: big ? 34 : 20,
      tint: HOT,
      halo: hot,
      haloSize: big ? 130 : 76,
      arc: big ? -54 : -18,
      trailRate: 0.01,
      onTrail: (x, y, vx, vy) => {
        // embers shed backward off the bolt, then fall
        this.stage.burst(x, y, {
          count: big ? 3 : 2,
          speed: [30, 150],
          angle: [Math.atan2(-vy, -vx) - 0.9, Math.atan2(-vy, -vx) + 0.9],
          life: [0.24, 0.6],
          size: big ? [8, 20] : [5, 13],
          tint: [hot, deep, HOT],
          gravity: 260,
          drag: 1.6,
          alpha: 0.95,
        })
        if (Math.random() < (big ? 0.5 : 0.22)) this.stage.smokePuff(x, y, 1)
      },
      onArrive,
    })
  }

  /** The detonation. Everything the player pressed the button for. */
  private spellImpact(id: AbilityId, amount: number, crit: boolean, tone: string): void {
    const a = this.enemy
    const big = id === 'pyroblast'
    const hot = TONE[id]
    const deep = TONE_DEEP[id]
    const k = big ? 1.7 : 1

    this.host?.float('enemy', crit ? 'crit' : 'damage', amount, tone, a)
    this.host?.bump('enemy')
    this.host?.sfx(crit ? 'crit' : big ? 'pyro-hit' : 'hit')

    // white-hot core, then the pressure wave, then the debris
    this.stage.flash(a.x, a.y, { tint: HOT, size: 78 * k, life: 0.14, alpha: 1, grow: 2.4 })
    this.stage.flash(a.x, a.y, { tint: hot, size: 130 * k, life: 0.3, alpha: 0.7, grow: 1.7 })
    this.stage.ring(a.x, a.y, { tint: hot, from: 26 * k, to: 250 * k, life: 0.36, alpha: 0.9 })
    this.stage.burst(a.x, a.y, {
      count: Math.round(32 * k),
      speed: [240, 760 * k],
      life: [0.32, 0.85],
      size: [7, 19 * k],
      tint: [hot, deep, HOT],
      gravity: 420,
      drag: 2,
      stretch: 2,
    })
    this.stage.smokePuff(a.x, a.y, big ? 8 : 4)
    this.shaker.punch((big ? 12 : 6) * (crit ? 1.9 : 1))

    if (crit) {
      // a crit earns a second wave, a whiter flash, and a beat of hit-stop
      this.stage.flash(a.x, a.y, { tint: 0xffffff, size: 90 * k, life: 0.09, alpha: 0.9, grow: 2.8 })
      this.stage.ring(a.x, a.y, { tint: HOT, from: 40 * k, to: 320 * k, life: 0.5, alpha: 0.7 })
      this.stage.burst(a.x, a.y, {
        count: Math.round(22 * k),
        speed: [420, 1000 * k],
        life: [0.4, 0.95],
        size: [7, 20 * k],
        tint: [HOT, hot],
        gravity: 380,
        drag: 1.6,
        stretch: 2.6,
      })
      this.stage.hitStop(big ? 0.11 : 0.075)
    }
  }

  private burnTick(amount: number, crit: boolean, tone: string): void {
    const a = this.enemy
    this.host?.float('enemy', crit ? 'crit' : 'damage', amount, tone, a)
    this.host?.sfx('burn')
    this.stage.burst(a.x, a.y, {
      count: 8,
      speed: [40, 150],
      angle: [-Math.PI * 0.85, -Math.PI * 0.15],
      life: [0.3, 0.6],
      size: [6, 15],
      tint: [TONE.ignite, TONE_DEEP.ignite, HOT],
      gravity: -110,
      drag: 1.3,
    })
    this.stage.flash(a.x, a.y, { tint: TONE.ignite, size: 44, life: 0.22, alpha: 0.45 })
  }

  private igniteCatch(): void {
    const a = this.enemy
    this.stage.flash(a.x, a.y, { tint: TONE.ignite, size: 90, life: 0.3, alpha: 0.85, grow: 1.6 })
    this.stage.ring(a.x, a.y, { tint: TONE.ignite, from: 20, to: 150, life: 0.36, alpha: 0.7 })
    this.stage.burst(a.x, a.y, {
      count: 20,
      speed: [90, 300],
      angle: [-Math.PI * 0.95, -Math.PI * 0.05],
      life: [0.4, 0.85],
      size: [7, 18],
      tint: [TONE.ignite, TONE_DEEP.ignite, HOT],
      gravity: -140,
      drag: 1.5,
    })
    this.shaker.punch(3, 0.25)
  }

  private venomTouch(): void {
    const a = this.player
    this.stage.flash(a.x, a.y, { tint: VENOM, size: 76, life: 0.34, alpha: 0.6 })
    this.stage.burst(a.x, a.y, {
      count: 14,
      speed: [40, 140],
      life: [0.5, 1],
      size: [5, 13],
      tint: [VENOM, 0x4f8f2a],
      gravity: 90,
      drag: 1.4,
    })
  }

  // ─── heal / defence ───

  private heal(crit: boolean): void {
    const a = this.player
    const card = this.stage.anchors.playerCard
    this.stage.flash(a.x, a.y, { tint: TONE.renew, size: 100, life: 0.42, alpha: 0.75, grow: 1.7 })
    this.stage.ring(a.x, a.y, { tint: TONE.renew, from: 24, to: 170, life: 0.44, alpha: 0.6 })
    // motes rise out of the card and settle into you
    for (let i = 0; i < (crit ? 34 : 24); i++) {
      const x = card.x + Math.random() * card.w
      this.stage.burst(x, card.y + card.h, {
        count: 1,
        speed: [70, 190],
        angle: [-Math.PI * 0.62, -Math.PI * 0.38],
        life: [0.55, 1],
        size: [5, 12],
        tint: [TONE.renew, HOT],
        gravity: -60,
        drag: 0.9,
      })
    }
  }

  private barrierUp(): void {
    const a = this.player
    this.stage.flash(a.x, a.y, { tint: TONE.barrier, size: 120, life: 0.34, alpha: 0.8, grow: 1.3 })
    this.stage.ring(a.x, a.y, { tint: TONE.barrier, from: 130, to: 78, life: 0.42, alpha: 0.95 })
    this.stage.burst(a.x, a.y, {
      count: 22,
      speed: [10, 40],
      life: [0.4, 0.8],
      size: [4, 11],
      tint: [TONE.barrier, HOT],
      drag: 2,
    })
  }

  private shieldSpark(): void {
    const a = this.player
    this.stage.ring(a.x, a.y, { tint: TONE.barrier, from: 70, to: 120, life: 0.24, alpha: 0.8 })
    this.stage.burst(a.x, a.y, {
      count: 10,
      speed: [80, 240],
      life: [0.2, 0.45],
      size: [4, 10],
      tint: [TONE.barrier, HOT],
      drag: 2,
      stretch: 1.4,
    })
  }

  private barrierShatter(): void {
    const a = this.player
    this.stage.flash(a.x, a.y, { tint: TONE.barrier, size: 110, life: 0.16, alpha: 1, grow: 1.6 })
    this.stage.burst(a.x, a.y, {
      count: 26,
      speed: [180, 520],
      life: [0.45, 0.9],
      size: [8, 20],
      endScale: 0.4,
      tint: [TONE.barrier, HOT, 0x8fb4ff],
      gravity: 620,
      drag: 0.9,
      tex: 'shard',
    })
    this.shaker.punch(5)
  }

  private combustionUp(): void {
    const a = this.player
    this.stage.flash(a.x, a.y, { tint: TONE.combustion, size: 150, life: 0.5, alpha: 0.9, grow: 1.9 })
    this.stage.ring(a.x, a.y, { tint: TONE.combustion, from: 26, to: 260, life: 0.55, alpha: 0.85 })
    this.stage.ring(a.x, a.y, { tint: TONE_DEEP.fireball, from: 20, to: 340, life: 0.75, alpha: 0.5 })
    this.stage.burst(a.x, a.y, {
      count: 40,
      speed: [140, 480],
      life: [0.5, 1.1],
      size: [7, 20],
      tint: [TONE.combustion, TONE.fireball, HOT],
      gravity: -90,
      drag: 1.3,
      stretch: 1.5,
    })
    this.shaker.punch(7)
  }

  private counterspell(): void {
    const from = this.player
    const to = this.enemy
    this.stage.bolt(from, to, { tint: TONE.counterspell, life: 0.19, width: 3.5, jitter: 22, forks: 3 })
    this.stage.flash(to.x, to.y, { tint: 0xffffff, size: 80, life: 0.11, alpha: 1, grow: 2.2 })
    this.stage.ring(to.x, to.y, { tint: TONE.counterspell, from: 30, to: 190, life: 0.3, alpha: 0.9 })
    // the enemy's gathered spell breaks apart
    this.stage.burst(to.x, to.y, {
      count: 22,
      speed: [200, 560],
      life: [0.3, 0.65],
      size: [6, 16],
      endScale: 0.35,
      tint: [TONE.counterspell, HOT, 0xff8a3c],
      gravity: 380,
      drag: 1.4,
      tex: 'shard',
    })
    this.shaker.punch(6, 0.3)
    this.stage.hitStop(0.05)
  }

  private enemyBolt(dur: number, onArrive: () => void): void {
    const from = this.enemy
    const to = this.player
    this.stage.flash(from.x, from.y, { tint: 0xff8a3c, size: 90, life: 0.2, alpha: 0.9, grow: 1.5 })
    this.stage.projectile({
      from,
      to,
      dur,
      size: 24,
      tint: 0xffd0a0,
      halo: 0xff6a2a,
      haloSize: 92,
      arc: 22,
      trailRate: 0.012,
      onTrail: (x, y, vx, vy) => {
        this.stage.burst(x, y, {
          count: 2,
          speed: [40, 160],
          angle: [Math.atan2(-vy, -vx) - 0.8, Math.atan2(-vy, -vx) + 0.8],
          life: [0.25, 0.55],
          size: [6, 15],
          tint: [0xff8a3c, 0xd93a1a],
          gravity: 200,
          drag: 1.5,
        })
      },
      onArrive,
    })
  }

  private slash(): void {
    const a = this.player
    // a claw drawn across you, corner to corner
    const d = 42
    this.stage.bolt({ x: a.x - d, y: a.y - d * 0.8 }, { x: a.x + d, y: a.y + d * 0.8 }, {
      tint: WOUND,
      life: 0.14,
      width: 4,
      jitter: 6,
      forks: 0,
    })
  }

  /** The player takes a hit: the world flinches red. */
  private hurt(tint: number, absorbedOnly: boolean): void {
    const a = this.player
    if (absorbedOnly) return
    this.stage.flash(a.x, a.y, { tint, size: 84, life: 0.2, alpha: 0.7, grow: 1.6 })
    this.stage.ring(a.x, a.y, { tint, from: 24, to: 150, life: 0.28, alpha: 0.6 })
    this.stage.burst(a.x, a.y, {
      count: 16,
      speed: [160, 460],
      life: [0.28, 0.6],
      size: [5, 14],
      tint: [tint, 0xffb0a0],
      gravity: 420,
      drag: 1.8,
      stretch: 1.8,
    })
  }

  // ─── the body count ───

  private materialize(): void {
    const card = this.stage.anchors.enemyCard
    const a = this.enemy
    if (card.w === 0) return
    for (let i = 0; i < 30; i++) {
      const ang = Math.random() * Math.PI * 2
      const r = 90 + Math.random() * 90
      this.stage.burst(a.x + Math.cos(ang) * r, a.y + Math.sin(ang) * r, {
        count: 1,
        speed: [180, 320],
        angle: [ang + Math.PI - 0.2, ang + Math.PI + 0.2],
        life: [0.35, 0.6],
        size: [4, 12],
        tint: [0x8fa8d9, 0xffffff],
        drag: 1,
        stretch: 1.2,
        alpha: 0.8,
      })
    }
    this.stage.flash(a.x, a.y, { tint: 0x9fb8e0, size: 70, life: 0.45, alpha: 0.5, grow: 1.4 })
  }

  private disintegrate(): void {
    const card = this.stage.anchors.enemyCard
    const a = this.enemy
    this.stage.dissolve(card, [0xffb070, 0xff7a3c, 0x9a7ad9, 0xffffff], 56)
    this.stage.flash(a.x, a.y, { tint: HOT, size: 110, life: 0.3, alpha: 0.85, grow: 2 })
    this.stage.ring(a.x, a.y, { tint: 0xffc07a, from: 30, to: 260, life: 0.5, alpha: 0.7 })
    this.stage.smokePuff(a.x, a.y, 8)
    this.shaker.punch(6, 0.5)
  }

  private playerDeath(): void {
    const a = this.player
    const card = this.stage.anchors.playerCard
    this.stage.dissolve(card, [0x6a4a8a, 0x3a2a5a], 40)
    this.stage.flash(a.x, a.y, { tint: 0x2a1030, size: 220, life: 0.7, alpha: 0.9, grow: 0.3 })
    this.shaker.punch(12, 0.8)
  }

  private enrage(): void {
    const a = this.enemy
    this.stage.flash(a.x, a.y, { tint: WOUND, size: 140, life: 0.4, alpha: 0.9, grow: 1.8 })
    this.stage.ring(a.x, a.y, { tint: WOUND, from: 24, to: 300, life: 0.6, alpha: 0.85 })
    this.stage.burst(a.x, a.y, {
      count: 34,
      speed: [200, 620],
      life: [0.4, 0.9],
      size: [7, 19],
      tint: [WOUND, 0xff9a80, 0xb01020],
      gravity: 120,
      drag: 1.3,
      stretch: 1.6,
    })
    this.shaker.punch(9, 0.55)
  }

  private levelUp(): void {
    const a = this.player
    this.stage.flash(a.x, a.y, { tint: TONE.combustion, size: 180, life: 0.8, alpha: 0.9, grow: 2.2 })
    this.stage.ring(a.x, a.y, { tint: TONE.combustion, from: 30, to: 420, life: 0.9, alpha: 0.8 })
    this.stage.burst(a.x, a.y, {
      count: 60,
      speed: [120, 520],
      life: [0.8, 1.6],
      size: [6, 18],
      tint: [TONE.combustion, HOT, 0xffe6a0],
      gravity: -40,
      drag: 0.8,
    })
    this.shaker.punch(6, 0.7)
  }

  private loot(epic: boolean): void {
    const a = this.enemy
    this.stage.burst(a.x, a.y, {
      count: epic ? 34 : 16,
      speed: [60, 260],
      life: [0.6, 1.2],
      size: [5, 14],
      tint: epic ? [0xc07aff, 0xffffff] : [TONE.combustion, HOT],
      gravity: -50,
      drag: 1,
    })
  }
}
