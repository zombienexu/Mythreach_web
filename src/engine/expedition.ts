import { pickWeighted, type Rng } from './rng'
import { ROUTE_STEPS, type NodeKind, type ZoneDef } from './types'

/** The weighted table for the interior nodes of a route (everything between the
 *  opening battle and the final boss). Boss is placed by hand, never rolled. */
const NODE_WEIGHTS: ReadonlyArray<{ value: NodeKind; weight: number }> = [
  { value: 'battle', weight: 46 },
  { value: 'elite', weight: 14 },
  { value: 'cache', weight: 14 },
  { value: 'shrine', weight: 12 },
  { value: 'rest', weight: 14 },
]

/** A candidate kind is legal at `index` when it breaks none of the route rules:
 *  - `elite` never appears at index 0 or 1 (no early elites).
 *  - `rest` never directly follows `rest`.
 *  `battle` is always legal, so a legal pick is always reachable. */
function legal(kind: NodeKind, index: number, route: readonly NodeKind[]): boolean {
  if (kind === 'elite' && index < 2) return false
  if (kind === 'rest' && route[index - 1] === 'rest') return false
  return true
}

/** Generate a deterministic route of `ROUTE_STEPS + 1` node kinds for a zone:
 *  index 0 is always `battle`, the last index is always `boss`, and the interior
 *  obeys the route rules. Illegal weighted picks are simply re-rolled — the loop
 *  is bounded because `battle` is always legal. */
export function generateRoute(rng: Rng, _zone: ZoneDef): NodeKind[] {
  const route: NodeKind[] = ['battle']
  for (let index = 1; index < ROUTE_STEPS; index++) {
    let pick: NodeKind = 'battle'
    for (let guard = 0; guard < 64; guard++) {
      pick = pickWeighted(rng, NODE_WEIGHTS)
      if (legal(pick, index, route)) break
    }
    route.push(pick)
  }
  route.push('boss')
  return route
}
