/** THE FILE YOU EDIT.
 *
 *  Every spell's whole look and sound lives here, as one row. To add an
 *  ability: define it in the engine, then add a row below. To restyle one:
 *  change its row. Nothing in `director.ts`, `stage.ts` or `recipe.ts` needs to
 *  know your spell exists.
 *
 *  A row can declare:
 *    charge      what gathering it looks like while you cast    (cast spells)
 *    release     what leaving the caster's hand looks like
 *    projectile  how it crosses the arena, and what it sheds    (omit ⇒ instant)
 *    impact      what landing looks like
 *    crit        what landing *hard* looks like, on top of impact
 *    aura        what it looks like while it lingers on a card  (DoTs, buffs)
 *    sfx         which sounds go with which beat
 *
 *  Sizes are in px at scale 1. `scale` at play time carries the weight of the
 *  hit, so tune these for an ordinary hit and let magnitude do the rest. */
import type { AbilityId } from '../../engine'
import type { SfxName } from '../sfx'
import { TONE, TONE_DEEP, VENOM, WOUND } from './palette'
import type { Recipe, Step } from './recipe'

/** Everything that can produce a damage/heal effect. */
export type FxSource = AbilityId | 'enemySwing' | 'enemyCast' | 'venom'

export interface ChargeSpec {
  /** seconds between mote spawns — lower is denser */
  rate: number
  /** how far out the motes start, px */
  radius: number
  /** 0–1: how much the gather tightens as the cast completes */
  tighten: number
}

export interface ProjectileSpec {
  /** flight time, seconds. Short enough that the health bar still reads as
   *  one event with the detonation; long enough that you see it travel. */
  flight: number
  size: number
  haloSize: number
  /** perpendicular bow of the flight path; negative arcs upward */
  arc: number
  /** seconds between trail emissions */
  trailRate: number
  /** shed behind the bolt, aimed automatically */
  trail: Step
  /** puffs of smoke behind it, 0–1 chance per trail step */
  smoke?: number
}

/** A standing emitter that clings to a card for as long as some state holds.
 *  *Which* card is the fight's business, not the spell's — the director knows
 *  that Ignite burns the enemy and Venom burns you. */
export interface AuraSpec {
  /** seconds between mote spawns — lower is denser */
  rate: number
  alpha: number
}

export interface SpellFx {
  tone: number
  deep: number
  /** the CSS colour of this spell's damage numbers — mirrors --tone-* */
  css: string
  charge?: ChargeSpec
  release?: Recipe
  projectile?: ProjectileSpec
  impact?: Recipe
  crit?: Recipe
  aura?: AuraSpec
  sfx?: { release?: SfxName; impact?: SfxName; crit?: SfxName }
}

// ── shared phrases ───────────────────────────────────────────────────
// Effects that several spells want. Because tints are symbolic, the same
// phrase comes out orange for Fireball and violet for Ignite.

/** The core of any impact: white-hot centre, coloured bloom, pressure ring.
 *  Keep the white core *small* — it is additive, so it blows out fast, and a
 *  blown-out core just hides the fight. Reach comes from the ring. */
const DETONATE = (size: number, ring: number): Recipe => [
  { fx: 'flash', tint: 'hot', size, life: 0.13, alpha: 0.95, grow: 2 },
  { fx: 'flash', tint: 'tone', size: size * 1.5, life: 0.3, alpha: 0.5, grow: 1.6 },
  { fx: 'ring', tint: 'tone', from: ring * 0.12, to: ring, life: 0.36, alpha: 0.9 },
]

/** Debris thrown out of an impact and pulled down by gravity. */
const DEBRIS = (count: number, speed: number, size: number): Step => ({
  fx: 'burst',
  count,
  speed: [speed * 0.34, speed],
  size: [size * 0.38, size],
  life: [0.32, 0.85],
  tint: 'mix',
  gravity: 420,
  drag: 2,
  stretch: 2,
})

/** What a crit adds on top: a star of light, a second wave, and a beat of
 *  frozen time. Scale does the rest — this is the same for every school. */
const CRIT_FLOURISH: Recipe = [
  { fx: 'flash', tint: 'white', size: 58, life: 0.08, alpha: 0.8, grow: 2.2 },
  { fx: 'rays', tint: 'hot', count: 9, reach: 210, width: 11, life: 0.26 },
  { fx: 'ring', tint: 'hot', from: 44, to: 300, life: 0.5, alpha: 0.7 },
  { fx: 'ring', tint: 'white', from: 20, to: 170, life: 0.26, alpha: 0.75 },
  { fx: 'burst', count: 22, speed: [420, 940], size: [7, 18], life: [0.4, 0.95], tint: 'mix', gravity: 380, drag: 1.6, stretch: 2.6 },
  { fx: 'hitStop', hold: 0.08 },
  { fx: 'shake', amp: 9, dur: 0.5 },
]

// ── the registry ─────────────────────────────────────────────────────

export const SPELL_FX: Record<FxSource, SpellFx> = {
  fireball: {
    tone: TONE.fireball,
    deep: TONE_DEEP.fireball,
    css: 'var(--tone-fireball)',
    charge: { rate: 0.022, radius: 62, tighten: 0.55 },
    release: [
      { fx: 'flash', at: 'source', tint: 'hot', size: 74, life: 0.18, alpha: 0.95, grow: 1.5 },
      { fx: 'ring', at: 'source', tint: 'tone', from: 18, to: 88, life: 0.28, alpha: 0.6 },
      { fx: 'burst', at: 'source', count: 9, speed: [180, 460], size: [5, 13], life: [0.2, 0.4], spread: 'away', drag: 2, stretch: 1.6 },
      { fx: 'shake', amp: 1.6, dur: 0.2 },
    ],
    projectile: {
      flight: 0.14,
      size: 20,
      haloSize: 76,
      arc: -18,
      trailRate: 0.01,
      smoke: 0.22,
      trail: { fx: 'burst', count: 2, speed: [30, 150], size: [5, 13], life: [0.24, 0.6], tint: 'mix', gravity: 260, drag: 1.6 },
    },
    impact: [
      ...DETONATE(78, 250),
      { fx: 'rays', tint: 'hot', count: 6, reach: 150, width: 10, life: 0.2 },
      DEBRIS(32, 760, 19),
      { fx: 'smoke', count: 4 },
      { fx: 'shake', amp: 6 },
    ],
    crit: CRIT_FLOURISH,
    sfx: { release: 'cast', impact: 'hit', crit: 'crit' },
  },

  pyroblast: {
    tone: TONE.pyroblast,
    deep: TONE_DEEP.pyroblast,
    css: 'var(--tone-pyroblast)',
    charge: { rate: 0.014, radius: 88, tighten: 0.7 },
    release: [
      { fx: 'flash', at: 'source', tint: 'hot', size: 130, life: 0.22, alpha: 1, grow: 1.6 },
      { fx: 'ring', at: 'source', tint: 'tone', from: 24, to: 150, life: 0.34, alpha: 0.7 },
      { fx: 'rays', at: 'source', tint: 'tone', count: 8, reach: 130, width: 12, life: 0.24 },
      { fx: 'burst', at: 'source', count: 18, speed: [200, 520], size: [7, 18], life: [0.2, 0.45], spread: 'away', drag: 2, stretch: 1.8 },
      { fx: 'shake', amp: 4, dur: 0.24 },
    ],
    projectile: {
      flight: 0.3,
      size: 36,
      haloSize: 140,
      arc: -58,
      trailRate: 0.009,
      smoke: 0.55,
      trail: { fx: 'burst', count: 3, speed: [30, 170], size: [9, 22], life: [0.3, 0.7], tint: 'mix', gravity: 240, drag: 1.5 },
    },
    // A comet is not a bigger fireball; it lands like masonry.
    impact: [
      ...DETONATE(96, 380),
      { fx: 'ring', tint: 'deep', from: 30, to: 500, life: 0.7, alpha: 0.45 },
      { fx: 'rays', tint: 'hot', count: 11, reach: 260, width: 16, life: 0.3 },
      DEBRIS(56, 1050, 26),
      { fx: 'burst', count: 14, speed: [60, 260], size: [16, 40], life: [0.6, 1.3], tint: 'deep', gravity: -40, drag: 1.4, alpha: 0.7 },
      { fx: 'smoke', count: 10 },
      { fx: 'shake', amp: 13, dur: 0.55 },
      { fx: 'hitStop', hold: 0.05 },
    ],
    crit: CRIT_FLOURISH,
    sfx: { release: 'pyro-cast', impact: 'pyro-hit', crit: 'crit-heavy' },
  },

  ignite: {
    tone: TONE.ignite,
    deep: TONE_DEEP.ignite,
    css: 'var(--tone-ignite)',
    // instant: no charge, no projectile — the fire simply catches
    release: [
      { fx: 'flash', tint: 'tone', size: 90, life: 0.3, alpha: 0.85, grow: 1.6 },
      { fx: 'ring', tint: 'tone', from: 20, to: 150, life: 0.36, alpha: 0.7 },
      { fx: 'burst', count: 20, speed: [90, 300], size: [7, 18], life: [0.4, 0.85], spread: 'up', gravity: -140, drag: 1.5 },
      { fx: 'shake', amp: 3, dur: 0.25 },
    ],
    // each burning tick
    impact: [
      { fx: 'flash', tint: 'tone', size: 44, life: 0.22, alpha: 0.45 },
      { fx: 'burst', count: 8, speed: [40, 150], size: [6, 15], life: [0.3, 0.6], spread: 'up', gravity: -110, drag: 1.3 },
    ],
    crit: [
      { fx: 'flash', tint: 'white', size: 70, life: 0.1, alpha: 0.8, grow: 2.2 },
      { fx: 'rays', tint: 'tone', count: 6, reach: 130, width: 9, life: 0.22 },
      { fx: 'shake', amp: 3 },
    ],
    aura: { rate: 0.028, alpha: 0.8 },
    sfx: { release: 'ignite', impact: 'burn', crit: 'burn' },
  },

  renew: {
    tone: TONE.renew,
    deep: TONE_DEEP.renew,
    css: 'var(--tone-renew)',
    charge: { rate: 0.03, radius: 70, tighten: 0.4 },
    impact: [
      { fx: 'flash', tint: 'tone', size: 100, life: 0.42, alpha: 0.75, grow: 1.7 },
      { fx: 'ring', tint: 'tone', from: 24, to: 170, life: 0.44, alpha: 0.6 },
      // motes rising up out of the card and settling into you
      { fx: 'burst', count: 26, speed: [70, 190], size: [5, 12], life: [0.55, 1], spread: 'up', gravity: -60, drag: 0.9 },
      { fx: 'implode', count: 16, radius: 90, size: [4, 10], life: [0.35, 0.6] },
    ],
    crit: [
      { fx: 'flash', tint: 'white', size: 90, life: 0.14, alpha: 0.8, grow: 2 },
      { fx: 'rays', tint: 'tone', count: 8, reach: 170, width: 10, life: 0.26 },
    ],
    sfx: { impact: 'heal', crit: 'heal' },
  },

  counterspell: {
    tone: TONE.counterspell,
    deep: TONE_DEEP.counterspell,
    css: 'var(--tone-counterspell)',
    // a bolt, not a projectile: it is *already there*
    release: [
      { fx: 'bolt', tint: 'tone', life: 0.19, width: 3.5, jitter: 22, forks: 3 },
      { fx: 'flash', tint: 'white', size: 80, life: 0.11, alpha: 1, grow: 2.2 },
      { fx: 'ring', tint: 'tone', from: 30, to: 190, life: 0.3, alpha: 0.9 },
      { fx: 'rays', tint: 'tone', count: 8, reach: 160, width: 8, life: 0.18 },
      // the enemy's gathered spell breaking into pieces
      { fx: 'burst', count: 22, speed: [200, 560], size: [6, 16], life: [0.3, 0.65], tint: 'mix', gravity: 380, drag: 1.4, endScale: 0.35, tex: 'shard' },
      { fx: 'shake', amp: 6, dur: 0.3 },
      { fx: 'hitStop', hold: 0.05 },
    ],
    sfx: { release: 'interrupt' },
  },

  barrier: {
    tone: TONE.barrier,
    deep: TONE_DEEP.barrier,
    css: 'var(--tone-barrier)',
    release: [
      { fx: 'flash', tint: 'tone', size: 120, life: 0.34, alpha: 0.8, grow: 1.3 },
      // the shell knitting itself together, out of the air
      { fx: 'implode', count: 30, radius: 130, size: [4, 12], life: [0.3, 0.55] },
      { fx: 'ring', tint: 'tone', from: 130, to: 78, life: 0.42, alpha: 0.95 },
    ],
    sfx: { release: 'barrier' },
  },

  combustion: {
    tone: TONE.combustion,
    deep: TONE_DEEP.fireball,
    css: 'var(--tone-combustion)',
    release: [
      { fx: 'flash', tint: 'tone', size: 150, life: 0.5, alpha: 0.9, grow: 1.9 },
      { fx: 'ring', tint: 'tone', from: 26, to: 260, life: 0.55, alpha: 0.85 },
      { fx: 'ring', tint: 'deep', from: 20, to: 340, life: 0.75, alpha: 0.5 },
      { fx: 'rays', tint: 'hot', count: 12, reach: 220, width: 14, life: 0.32 },
      { fx: 'burst', count: 40, speed: [140, 480], size: [7, 20], life: [0.5, 1.1], tint: 'mix', gravity: -90, drag: 1.3, stretch: 1.5 },
      { fx: 'shake', amp: 7 },
    ],
    aura: { rate: 0.018, alpha: 1 },
    sfx: { release: 'epic' },
  },

  // ── what the enemy does to you ─────────────────────────────────────

  enemySwing: {
    tone: WOUND,
    deep: 0xb01020,
    css: 'var(--wound)',
    // a claw drawn across you, then the wound
    impact: [
      { fx: 'bolt', tint: 'tone', life: 0.14, width: 4, jitter: 6, forks: 0 },
      { fx: 'flash', tint: 'tone', size: 84, life: 0.2, alpha: 0.7, grow: 1.6 },
      { fx: 'ring', tint: 'tone', from: 24, to: 150, life: 0.28, alpha: 0.6 },
      { fx: 'burst', count: 16, speed: [160, 460], size: [5, 14], life: [0.28, 0.6], tint: 'mix', gravity: 420, drag: 1.8, stretch: 1.8 },
    ],
    crit: [
      { fx: 'flash', tint: 'white', size: 90, life: 0.1, alpha: 0.9, grow: 2.4 },
      { fx: 'rays', tint: 'tone', count: 8, reach: 190, width: 12, life: 0.24 },
      { fx: 'shake', amp: 7 },
    ],
    sfx: { impact: 'hit', crit: 'crit' },
  },

  enemyCast: {
    tone: 0xff8a3c,
    deep: 0xd93a1a,
    css: 'oklch(0.78 0.14 65)',
    // the wind-up you are racing to interrupt
    charge: { rate: 0.026, radius: 58, tighten: 0.45 },
    release: [{ fx: 'flash', at: 'source', tint: 'tone', size: 90, life: 0.2, alpha: 0.9, grow: 1.5 }],
    projectile: {
      flight: 0.24,
      size: 26,
      haloSize: 100,
      arc: 22,
      trailRate: 0.012,
      smoke: 0.2,
      trail: { fx: 'burst', count: 2, speed: [40, 160], size: [6, 15], life: [0.25, 0.55], tint: 'mix', gravity: 200, drag: 1.5 },
    },
    impact: [
      ...DETONATE(80, 230),
      DEBRIS(24, 620, 16),
      { fx: 'smoke', count: 4 },
      { fx: 'shake', amp: 8 },
    ],
    crit: CRIT_FLOURISH,
    sfx: { impact: 'hit', crit: 'crit' },
  },

  venom: {
    tone: VENOM,
    deep: 0x4f8f2a,
    css: 'oklch(0.78 0.13 130)',
    release: [
      { fx: 'flash', tint: 'tone', size: 76, life: 0.34, alpha: 0.6 },
      { fx: 'burst', count: 14, speed: [40, 140], size: [5, 13], life: [0.5, 1], tint: 'mix', gravity: 90, drag: 1.4 },
    ],
    impact: [
      { fx: 'flash', tint: 'tone', size: 40, life: 0.24, alpha: 0.4 },
      { fx: 'burst', count: 6, speed: [30, 110], size: [4, 11], life: [0.3, 0.6], tint: 'mix', gravity: 70, drag: 1.4 },
    ],
    aura: { rate: 0.06, alpha: 0.5 },
    sfx: { impact: 'burn' },
  },
}

// ── effects that belong to the fight, not to a spell ──────────────────

/** A standing aura with no spell behind it. */
export interface FightAura extends AuraSpec {
  tone: number
  deep: number
}

/** A cornered animal, permanently lit. */
export const ENRAGE_AURA: FightAura = { rate: 0.07, alpha: 0.5, tone: WOUND, deep: 0xb01020 }

/** An enemy arriving out of the dark. */
export const MATERIALIZE: Recipe = [
  { fx: 'implode', count: 30, radius: 150, size: [4, 12], life: [0.35, 0.6], tint: 0x9fb8e0 },
  { fx: 'flash', tint: 0x9fb8e0, size: 70, life: 0.45, alpha: 0.5, grow: 1.4 },
]

/** An enemy leaving it. */
export const DISINTEGRATE: Recipe = [
  { fx: 'dissolve', count: 56, tint: 'mix' },
  { fx: 'flash', tint: 'hot', size: 110, life: 0.3, alpha: 0.85, grow: 2 },
  { fx: 'ring', tint: 'tone', from: 30, to: 300, life: 0.5, alpha: 0.7 },
  { fx: 'rays', tint: 'hot', count: 8, reach: 200, width: 12, life: 0.3 },
  { fx: 'smoke', count: 8 },
  { fx: 'shake', amp: 6, dur: 0.5 },
]

export const ENRAGE: Recipe = [
  { fx: 'flash', tint: 'tone', size: 140, life: 0.4, alpha: 0.9, grow: 1.8 },
  { fx: 'ring', tint: 'tone', from: 24, to: 300, life: 0.6, alpha: 0.85 },
  { fx: 'rays', tint: 'tone', count: 10, reach: 240, width: 14, life: 0.3 },
  { fx: 'burst', count: 34, speed: [200, 620], size: [7, 19], life: [0.4, 0.9], tint: 'mix', gravity: 120, drag: 1.3, stretch: 1.6 },
  { fx: 'shake', amp: 9, dur: 0.55 },
]

export const PLAYER_DEATH: Recipe = [
  { fx: 'dissolve', count: 40, tint: 0x6a4a8a },
  { fx: 'flash', tint: 0x2a1030, size: 220, life: 0.7, alpha: 0.9, grow: 0.3 },
  { fx: 'shake', amp: 12, dur: 0.8 },
]

export const LEVEL_UP: Recipe = [
  { fx: 'flash', tint: 'tone', size: 180, life: 0.8, alpha: 0.9, grow: 2.2 },
  { fx: 'ring', tint: 'tone', from: 30, to: 420, life: 0.9, alpha: 0.8 },
  { fx: 'rays', tint: 'hot', count: 14, reach: 300, width: 16, life: 0.5 },
  { fx: 'burst', count: 60, speed: [120, 520], size: [6, 18], life: [0.8, 1.6], tint: 'mix', gravity: -40, drag: 0.8 },
  { fx: 'shake', amp: 6, dur: 0.7 },
]

export const BARRIER_SHATTER: Recipe = [
  { fx: 'flash', tint: 'tone', size: 110, life: 0.16, alpha: 1, grow: 1.6 },
  { fx: 'burst', count: 26, speed: [180, 520], size: [8, 20], life: [0.45, 0.9], tint: 'mix', gravity: 620, drag: 0.9, endScale: 0.4, tex: 'shard' },
  { fx: 'shake', amp: 5 },
]

/** The barrier taking a blow and holding. */
export const SHIELD_HOLD: Recipe = [
  { fx: 'ring', tint: 'tone', from: 70, to: 120, life: 0.24, alpha: 0.8 },
  { fx: 'burst', count: 10, speed: [80, 240], size: [4, 10], life: [0.2, 0.45], tint: 'mix', drag: 2, stretch: 1.4 },
]

export const LOOT: Recipe = [
  { fx: 'burst', count: 16, speed: [60, 260], size: [5, 14], life: [0.6, 1.2], tint: 'mix', gravity: -50, drag: 1 },
]

export const LOOT_EPIC: Recipe = [
  { fx: 'flash', tint: 0xc07aff, size: 120, life: 0.5, alpha: 0.8, grow: 1.8 },
  { fx: 'rays', tint: 0xffffff, count: 10, reach: 200, width: 12, life: 0.4 },
  { fx: 'burst', count: 34, speed: [60, 300], size: [5, 15], life: [0.7, 1.4], tint: 0xc07aff, gravity: -50, drag: 1 },
]
