/** Turns CombatEvents into light, force and sound.
 *
 *  The director knows *nothing* about what any spell looks like — that all
 *  lives in `spells.ts`. Its job is the three things a data table can't do:
 *
 *  1. **Timing.** A projectile spell does not land the instant the sim resolves
 *     it; the bolt has to fly. So the float, the card recoil, the shake and the
 *     sound are withheld until it arrives — which is also, by design, when the
 *     health bar's trailing loss layer starts to drain. Cause and effect line up.
 *
 *  2. **Weight.** It turns "18 damage to a 160 HP wolf" into a scale factor
 *     that every part of the effect obeys at once: particle size, shockwave
 *     reach, screen shake, and how big the number is. A chip and a crit run the
 *     same recipe and land completely differently.
 *
 *  3. **Standing state.** One-shots come from events; auras (a burn still
 *     burning, a shield still held) are reconciled against the snapshot, because
 *     an Ignite that expires quietly emits no event and would otherwise burn
 *     forever. */
import type { AbilityId, CombatEvent, CombatSnapshot, Side } from '../../engine'
import type { SfxName } from '../sfx'
import { TONE, TONE_DEEP } from './palette'
import { coneBehind, playRecipe, type Recipe, type RecipeCtx } from './recipe'
import { Shaker } from './shake'
import { FxStage, type Region, type Spot } from './stage'
import {
  BARRIER_SHATTER,
  DISINTEGRATE,
  ENRAGE,
  ENRAGE_AURA,
  LEVEL_UP,
  LOOT,
  LOOT_EPIC,
  MATERIALIZE,
  PLAYER_DEATH,
  SHIELD_HOLD,
  SPELL_FX,
  type FxSource,
  type SpellFx,
} from './spells'

/** What the director needs back from the Game to finish a beat. */
export interface FxHost {
  /** `at` is a point in arena-stage space — the number lands where the spell did */
  float(f: { side: Side; kind: 'damage' | 'crit' | 'heal' | 'absorb'; amount: number; tone: string; scale: number; at: Spot }): void
  /** the card recoils; `power` and `crit` decide how hard */
  bump(side: Side, power: number, crit: boolean): void
  sfx(name: SfxName, gain?: number): void
}

/** The damage at which an effect is as big as it gets. Everything above is
 *  capped, so a monster crit can't break the screen.
 *
 *  Deliberately measured in *absolute damage*, not as a share of the target's
 *  health: a Pyroblast is a Pyroblast whether it hits a wolf or a boss, and
 *  sizing by share would draw a timid little number on the boss — exactly
 *  backwards. Your numbers grow as you do. */
const BIG_HIT = 180

export class FxDirector {
  readonly stage = new FxStage()
  readonly shaker = new Shaker()

  /** Decided at construction, not at start(): child components mount before
   *  their parent's onMount, so ArenaFx asks to mount the stage before the Game
   *  has run a line of start(). Set it there and we'd spin up a WebGL context
   *  for a player who explicitly asked for no motion. */
  reduced = typeof window !== 'undefined' && window.matchMedia('(prefers-reduced-motion: reduce)').matches

  private host: FxHost | null = null

  /** standing emitters, reconciled against the snapshot every frame */
  private readonly standing = new Map<string, number>()
  /** cast progress, read live by the gather emitters so they tighten as the
   *  spell ripens. Fields, not closed-over snapshots — a snapshot captured when
   *  the emitter was created is frozen at 0% forever. */
  private charge = 0
  private enemyCharge = 0
  /** which spell the gather belongs to, so chain-casting restarts it */
  private chargeId: AbilityId | null = null

  bind(host: FxHost): void {
    this.host = host
  }

  attachShake(el: HTMLElement): void {
    this.shaker.reduced = this.reduced
    this.shaker.attach(el)
  }

  /** Pixi is loaded here, on demand: it is a large chunk and nothing in the
   *  game depends on it, so the fight is playable before it arrives. */
  async mountStage(host: HTMLElement): Promise<void> {
    if (this.reduced) return
    await this.stage.mount(host)
  }

  setAnchors(a: FxStage['anchors']): void {
    this.stage.anchors = a
  }

  destroy(): void {
    this.shaker.detach()
    this.stage.destroy()
    this.standing.clear()
  }

  // ─────────────── geometry ───────────────

  private spot(side: Side): Spot {
    return side === 'player' ? this.stage.anchors.player : this.stage.anchors.enemy
  }

  private region(side: Side): Region {
    return side === 'player' ? this.stage.anchors.playerCard : this.stage.anchors.enemyCard
  }

  private ctx(spec: { tone: number; deep: number }, from: Side, to: Side, scale = 1): RecipeCtx {
    return {
      stage: this.stage,
      shaker: this.shaker,
      source: this.spot(from),
      target: this.spot(to),
      region: this.region(to),
      tone: spec.tone,
      deep: spec.deep,
      scale,
    }
  }

  private play(recipe: Recipe | undefined, spec: { tone: number; deep: number }, from: Side, to: Side, scale = 1): void {
    playRecipe(recipe, this.ctx(spec, from, to, scale))
  }

  /** How hard did that land? One number drives particle size, shockwave reach,
   *  screen shake and the size of the damage text — so they can never disagree.
   *
   *  The particle multiplier is deliberately tamer than the text one. Light is
   *  additive: doubling it doesn't read as "twice as big", it reads as a white
   *  disc with the fight hidden behind it. The *number* is where a crit gets to
   *  shout, because a number can be enormous and still be information. */
  private weigh(amount: number, crit: boolean): { fx: number; text: number } {
    // Square-root curve: the difference between a 5 tick and a 30 hit reads
    // clearly, without a 300 crit needing to be six times taller than the card.
    const w = Math.min(1, Math.sqrt(Math.max(0, amount) / BIG_HIT))
    return {
      fx: (0.8 + w * 0.6) * (crit ? 1.35 : 1),
      text: (0.8 + w * 0.85) * (crit ? 1.7 : 1),
    }
  }

  // ─────────────── standing state ───────────────

  /** Reconcile every persistent emitter against the snapshot. Adding a new
   *  aura means adding one `hold(...)` line. */
  sync(c: CombatSnapshot): void {
    if (this.reduced || !this.stage.ready) return
    this.charge = c.cast?.progress ?? 0
    this.enemyCharge = c.enemy?.cast?.progress ?? 0

    // gathering power for a cast you can see coming
    const casting = c.cast && SPELL_FX[c.cast.abilityId].charge ? c.cast.abilityId : null
    if (casting !== this.chargeId) {
      // a queued spell can start the frame the last one ends — restart the
      // gather so it wears the new spell's colour, not the old one's
      this.stop('charge')
      this.chargeId = casting
    }
    this.hold('charge', casting !== null, () => this.gather(SPELL_FX[casting!], 'player', () => this.charge))

    this.hold('enemyCharge', c.enemy?.cast != null, () =>
      this.gather(SPELL_FX.enemyCast, 'enemy', () => this.enemyCharge),
    )

    // afflictions and buffs that cling to a card
    this.hold('ignite', c.enemy?.dot != null, () => this.aura(SPELL_FX.ignite, SPELL_FX.ignite.aura!, 'enemy'))
    this.hold('venom', c.player.dot != null, () => this.aura(SPELL_FX.venom, SPELL_FX.venom.aura!, 'player'))
    this.hold('enrage', c.enemy?.enraged ?? false, () => this.aura(ENRAGE_AURA, ENRAGE_AURA, 'enemy'))

    const lit = c.player.buffs.some((b) => b.id === 'combustion')
    this.hold('combustion', lit, () => this.aura(SPELL_FX.combustion, SPELL_FX.combustion.aura!, 'player'))
    // your fire is literally hotter — every fire effect gets denser
    this.stage.setIntensity(lit ? 1.6 : 1)
  }

  /** Start an emitter when a condition turns on, stop it when it turns off. */
  private hold(key: string, on: boolean, start: () => number): void {
    const id = this.standing.get(key)
    if (on && id === undefined) this.standing.set(key, start())
    else if (!on && id !== undefined) this.stop(key)
  }

  private stop(key: string): void {
    const id = this.standing.get(key)
    if (id === undefined) return
    this.stage.stopEmitter(id)
    this.standing.delete(key)
  }

  /** Motes spiralling into the caster's hand, tightening as the cast ripens.
   *  This is the anticipation the old UI never had. */
  private gather(spec: SpellFx, side: Side, progress: () => number): number {
    const ch = spec.charge!
    return this.stage.emit(Infinity, ch.rate, () => {
      const a = this.spot(side)
      const t = progress()
      this.stage.implode(a.x, a.y, {
        count: 1,
        radius: ch.radius * (1 - t * ch.tighten),
        life: [0.24, 0.4],
        size: [5, 8 + t * 8],
        tint: [spec.tone, spec.deep],
      })
      // the core brightens as the spell ripens
      if (Math.random() < 0.35) {
        this.stage.flash(a.x, a.y, { tint: spec.tone, size: 26 + t * 60, life: 0.2, alpha: 0.14 + t * 0.45, grow: 0.7 })
      }
    })
  }

  /** Flames licking off a card, for as long as the thing burns. */
  private aura(spec: { tone: number; deep: number }, a: { rate: number; alpha: number }, side: Side): number {
    return this.stage.emit(Infinity, a.rate, () => {
      const r = this.region(side)
      if (r.w === 0) return
      this.stage.burst(r.x + Math.random() * r.w, r.y + r.h * (0.55 + Math.random() * 0.45), {
        count: 1,
        speed: [26, 70],
        angle: [-Math.PI * 0.72, -Math.PI * 0.28],
        life: [0.35, 0.75],
        size: [7, 17],
        endScale: 0.1,
        tint: [spec.tone, spec.deep],
        gravity: -60,
        drag: 1.1,
        alpha: a.alpha,
        tex: 'glow',
      })
    })
  }

  // ─────────────── one-shots ───────────────

  handle(event: CombatEvent): void {
    if (event.kind === 'damage') {
      this.damage(event)
      return
    }
    if (event.kind === 'heal') {
      const spec = SPELL_FX.renew
      const w = this.weigh(event.amount, event.crit)
      this.host?.float({
        side: 'player',
        kind: 'heal',
        amount: event.amount,
        tone: spec.css,
        scale: w.text,
        at: this.spot('player'),
      })
      this.host?.sfx('heal')
      if (this.reduced) return
      this.play(spec.impact, spec, 'player', 'player', w.fx)
      if (event.crit) this.play(spec.crit, spec, 'player', 'player', w.fx)
      return
    }

    this.cue(event)
    if (!this.reduced) this.visual(event)
  }

  /** Sound is never a motion effect — reduced-motion players still hear the
   *  fight. Only visuals are gated. */
  private cue(event: CombatEvent): void {
    switch (event.kind) {
      case 'dotApplied':
        this.host?.sfx(event.target === 'enemy' ? 'ignite' : 'warn')
        break
      case 'buffApplied':
        this.host?.sfx(SPELL_FX[event.id === 'barrier' ? 'barrier' : 'combustion'].sfx?.release ?? 'cast')
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
        this.stage.smokePuff(this.spot('player').x, this.spot('player').y, 4)
        break
      case 'dotApplied': {
        const on: Side = event.target === 'enemy' ? 'enemy' : 'player'
        const spec = SPELL_FX[event.target === 'enemy' ? 'ignite' : 'venom']
        this.play(spec.release, spec, on === 'enemy' ? 'player' : 'enemy', on)
        break
      }
      case 'buffApplied': {
        const spec = SPELL_FX[event.id === 'barrier' ? 'barrier' : 'combustion']
        this.play(spec.release, spec, 'player', 'player')
        break
      }
      case 'shieldBroken':
        this.play(BARRIER_SHATTER, SPELL_FX.barrier, 'player', 'player')
        break
      case 'interrupted':
        this.play(SPELL_FX.counterspell.release, SPELL_FX.counterspell, 'player', 'enemy')
        break
      case 'enemyEnraged':
        this.play(ENRAGE, ENRAGE_AURA, 'player', 'enemy')
        break
      case 'enemySpawned':
        this.play(MATERIALIZE, { tone: 0x9fb8e0, deep: 0x5f7aa8 }, 'player', 'enemy')
        break
      case 'enemyDied':
        this.play(DISINTEGRATE, { tone: 0xffb070, deep: 0x9a7ad9 }, 'player', 'enemy')
        break
      case 'playerDied':
        this.play(PLAYER_DEATH, { tone: 0x6a4a8a, deep: 0x3a2a5a }, 'enemy', 'player')
        break
      case 'levelUp':
        this.play(LEVEL_UP, { tone: TONE.combustion, deep: TONE_DEEP.combustion }, 'player', 'player')
        break
      case 'lootDropped':
        if (!event.autoSold) {
          const epic = event.item.rarity === 'epic'
          this.play(epic ? LOOT_EPIC : LOOT, { tone: TONE.combustion, deep: TONE_DEEP.combustion }, 'player', 'enemy')
        }
        break
      default:
        break
    }
  }

  // ─────────────── damage: the whole point ───────────────

  private damage(e: Extract<CombatEvent, { kind: 'damage' }>): void {
    const spec = SPELL_FX[e.source as FxSource]
    const to: Side = e.target
    const from: Side = to === 'enemy' ? 'player' : 'enemy'
    const w = this.weigh(e.amount, e.crit)

    // Everything that says "it landed", in one place. For a projectile this is
    // deferred until the bolt actually arrives.
    const land = (): void => {
      if (e.amount === 0 && e.absorbed > 0) {
        this.host?.float({
          side: to,
          kind: 'absorb',
          amount: e.absorbed,
          tone: SPELL_FX.barrier.css,
          scale: 1,
          at: this.spot(to),
        })
        this.host?.sfx('absorb')
        if (!this.reduced) this.play(SHIELD_HOLD, SPELL_FX.barrier, from, to)
        return
      }

      this.host?.float({
        side: to,
        kind: e.crit ? 'crit' : 'damage',
        amount: e.amount,
        tone: spec.css,
        scale: w.text,
        at: this.spot(to),
      })
      this.host?.bump(to, w.fx, e.crit)

      const cue = e.crit ? (spec.sfx?.crit ?? spec.sfx?.impact) : spec.sfx?.impact
      // a big hit is a loud hit
      if (cue) this.host?.sfx(cue, 0.7 + w.fx * 0.35)

      if (this.reduced) return
      this.play(spec.impact, spec, from, to, w.fx)
      if (e.crit) this.play(spec.crit, spec, from, to, w.fx)
      if (e.absorbed > 0) this.play(SHIELD_HOLD, SPELL_FX.barrier, from, to)
    }

    if (this.reduced || !spec.projectile) {
      // Instant, or a DoT tick: it is already there.
      if (!this.reduced) this.play(spec.release, spec, from, to, w.fx)
      land()
      return
    }

    // It has to cross the arena first.
    this.play(spec.release, spec, from, to, w.fx)
    if (spec.sfx?.release) this.host?.sfx(spec.sfx.release)
    this.launch(spec, from, to, w.fx, land)
  }

  private launch(spec: SpellFx, from: Side, to: Side, scale: number, onArrive: () => void): void {
    const p = spec.projectile!
    const ctx = this.ctx(spec, from, to, scale)
    this.stage.projectile({
      from: ctx.source,
      to: ctx.target,
      dur: p.flight,
      size: p.size,
      tint: 0xfff2dc,
      halo: spec.tone,
      haloSize: p.haloSize,
      arc: p.arc,
      trailRate: p.trailRate,
      onTrail: (x, y, vx, vy) => {
        // the trail is a recipe step too — aimed backward off the bolt
        if (p.trail.fx !== 'burst') return
        this.stage.burst(x, y, {
          count: p.trail.count,
          speed: p.trail.speed,
          angle: coneBehind(vx, vy),
          life: p.trail.life ?? [0.25, 0.6],
          size: p.trail.size,
          tint: [spec.tone, spec.deep, 0xfff2dc],
          gravity: p.trail.gravity,
          drag: p.trail.drag,
          alpha: 0.95,
        })
        if (p.smoke && Math.random() < p.smoke) this.stage.smokePuff(x, y, 1)
      },
      onArrive,
    })
  }
}

export type { FxSource }
