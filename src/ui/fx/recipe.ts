/** The effect language.
 *
 *  An effect is a list of Steps, not a function. That is the whole point: a
 *  new spell, or a new flourish on an old one, is a data edit in `spells.ts` —
 *  nobody has to touch the director, the stage, or learn the particle API.
 *
 *  Two things every Step gets for free:
 *
 *  - **Tints are symbolic.** Say `'tone'`, not `0xff7a2f`. The recipe is
 *    resolved against whichever spell is playing it, so one shared recipe
 *    (`IMPACT_BURST`, say) comes out orange for Fireball and violet for Ignite.
 *  - **Everything scales together.** `ctx.scale` carries the *weight* of the
 *    event — how big the hit was, whether it crit. It multiplies sizes, counts,
 *    reach and shake in one place, so a chip tick and a Pyroblast crit run the
 *    same recipe and land completely differently. */
import { HOT } from './palette'
import type { Shaker } from './shake'
import type { FxStage, Spot, TexName } from './stage'

/** Symbolic colours, resolved per spell at play time. */
export type Tint = 'tone' | 'deep' | 'hot' | 'white' | 'mix' | number

/** Where a step happens. Defaults to the target. */
export type At = 'source' | 'target'

/** How a burst is aimed. */
export type Spread =
  /** full circle */
  | 'all'
  /** upward, like flame or rising motes */
  | 'up'
  /** along source → target, like debris thrown off a release */
  | 'away'
  /** back down source ← target, like splash off an impact */
  | 'back'

export type Step =
  | { fx: 'flash'; size: number; life?: number; tint?: Tint; alpha?: number; grow?: number; at?: At }
  | { fx: 'ring'; from: number; to: number; life?: number; tint?: Tint; alpha?: number; at?: At }
  | {
      fx: 'burst'
      count: number
      speed: [number, number]
      size: [number, number]
      life?: [number, number]
      tint?: Tint
      spread?: Spread
      gravity?: number
      drag?: number
      stretch?: number
      endScale?: number
      alpha?: number
      tex?: TexName
      at?: At
    }
  | { fx: 'rays'; count: number; reach: number; width: number; life?: number; tint?: Tint; at?: At }
  | { fx: 'implode'; count: number; radius: number; size: [number, number]; life?: [number, number]; tint?: Tint; at?: At }
  | { fx: 'smoke'; count: number; at?: At }
  | { fx: 'dissolve'; count?: number; tint?: Tint }
  /** always source → target */
  | { fx: 'bolt'; tint?: Tint; life?: number; width?: number; jitter?: number; forks?: number }
  | { fx: 'shake'; amp: number; dur?: number }
  | { fx: 'hitStop'; hold: number }

export type Recipe = readonly Step[]

export interface RecipeCtx {
  stage: FxStage
  shaker: Shaker
  /** the caster's card */
  source: Spot
  /** the card being hit; for self-cast spells this is the caster */
  target: Spot
  /** region for whole-card effects (dissolve) */
  region: { x: number; y: number; w: number; h: number }
  tone: number
  deep: number
  /** the weight of this event: 1 is an ordinary hit, >1 is a heavy one or a crit */
  scale: number
}

function tint(t: Tint | undefined, c: RecipeCtx): number | readonly number[] {
  if (typeof t === 'number') return t
  switch (t) {
    case 'deep':
      return c.deep
    case 'hot':
      return HOT
    case 'white':
      return 0xffffff
    case 'mix':
      return [c.tone, c.deep, HOT]
    default:
      return c.tone
  }
}

function angles(spread: Spread | undefined, c: RecipeCtx): [number, number] | undefined {
  if (spread === 'up') return [-Math.PI * 0.9, -Math.PI * 0.1]
  if (spread === 'away' || spread === 'back') {
    const a = Math.atan2(c.target.y - c.source.y, c.target.x - c.source.x)
    const dir = spread === 'away' ? a : a + Math.PI
    return [dir - 0.7, dir + 0.7]
  }
  return undefined // full circle
}

export function playRecipe(recipe: Recipe | undefined, c: RecipeCtx): void {
  if (!recipe) return
  const s = c.scale
  // Counts and reach grow more gently than raw scale, or a big crit turns the
  // screen into soup. Sizes take the full multiplier — that's what reads.
  const n = (v: number): number => Math.max(1, Math.round(v * (0.6 + 0.4 * s)))
  const reach = (v: number): number => v * (0.7 + 0.3 * s)

  for (const step of recipe) {
    const at = step.fx === 'bolt' || step.fx === 'shake' || step.fx === 'hitStop' || step.fx === 'dissolve'
      ? c.target
      : (step.at ?? 'target') === 'source'
        ? c.source
        : c.target

    switch (step.fx) {
      case 'flash':
        c.stage.flash(at.x, at.y, {
          tint: tint(step.tint, c) as number,
          size: step.size * s,
          life: step.life ?? 0.2,
          alpha: step.alpha ?? 1,
          grow: step.grow ?? 1.8,
        })
        break

      case 'ring':
        c.stage.ring(at.x, at.y, {
          tint: tint(step.tint, c) as number,
          from: step.from * s,
          to: reach(step.to) * s,
          life: step.life ?? 0.34,
          alpha: step.alpha ?? 0.85,
        })
        break

      case 'burst':
        c.stage.burst(at.x, at.y, {
          count: n(step.count),
          speed: [step.speed[0], reach(step.speed[1])],
          size: [step.size[0], step.size[1] * s],
          life: step.life ?? [0.3, 0.75],
          tint: tint(step.tint ?? 'mix', c),
          angle: angles(step.spread, c),
          gravity: step.gravity,
          drag: step.drag,
          stretch: step.stretch,
          endScale: step.endScale,
          alpha: step.alpha,
          tex: step.tex,
        })
        break

      case 'rays':
        c.stage.rays(at.x, at.y, {
          count: n(step.count),
          reach: reach(step.reach) * s,
          width: step.width * s,
          life: step.life ?? 0.26,
          tint: tint(step.tint ?? 'hot', c),
        })
        break

      case 'implode':
        c.stage.implode(at.x, at.y, {
          count: n(step.count),
          radius: step.radius,
          size: [step.size[0], step.size[1] * s],
          life: step.life ?? [0.28, 0.5],
          tint: tint(step.tint ?? 'mix', c),
        })
        break

      case 'smoke':
        c.stage.smokePuff(at.x, at.y, n(step.count))
        break

      case 'dissolve':
        c.stage.dissolve(c.region, tint(step.tint ?? 'mix', c), n(step.count ?? 48))
        break

      case 'bolt':
        c.stage.bolt(c.source, c.target, {
          tint: tint(step.tint, c) as number,
          life: step.life ?? 0.18,
          width: (step.width ?? 3) * s,
          jitter: step.jitter,
          forks: step.forks,
        })
        break

      case 'shake':
        c.shaker.punch(step.amp * s, step.dur)
        break

      case 'hitStop':
        c.stage.hitStop(step.hold)
        break
    }
  }
}

/** The cone *behind* a moving thing — where a projectile sheds its embers. */
export function coneBehind(vx: number, vy: number, halfWidth = 0.9): [number, number] {
  const a = Math.atan2(-vy, -vx)
  return [a - halfWidth, a + halfWidth]
}
