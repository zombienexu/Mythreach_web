import type { BlessingId } from '../types'

/** How a blessing bends the hero's numbers, encoded as data so the sim reads a
 *  table instead of branching per-blessing:
 *  - `stat`  : add a flat amount to a derived percentage stat, post-derive.
 *  - `maxHpPct` : raise max HP by a percentage (and heal the added amount).
 *  - `regenMult`: scale mana regen per interval.
 *  - `travelMult`: scale travel time (read when a hop starts). */
export type BlessingEffect =
  | { kind: 'stat'; stat: 'fireMultPct' | 'critPct'; add: number }
  | { kind: 'maxHpPct'; pct: number }
  | { kind: 'regenMult'; mult: number }
  | { kind: 'travelMult'; mult: number }

export interface BlessingDef {
  id: BlessingId
  name: string
  description: string
  effect: BlessingEffect
}

export const BLESSINGS: Record<BlessingId, BlessingDef> = {
  emberheart: {
    id: 'emberheart',
    name: 'Emberheart',
    description: 'Your fire burns 15% hotter.',
    effect: { kind: 'stat', stat: 'fireMultPct', add: 15 },
  },
  stoneskin: {
    id: 'stoneskin',
    name: 'Stoneskin',
    description: 'Your flesh turns to stone: +20% maximum health.',
    effect: { kind: 'maxHpPct', pct: 20 },
  },
  springstep: {
    id: 'springstep',
    name: 'Springstep',
    description: 'The trail bends to your feet: travel takes half as long.',
    effect: { kind: 'travelMult', mult: 0.5 },
  },
  manatide: {
    id: 'manatide',
    name: 'Manatide',
    description: 'The well runs high: mana returns 50% faster.',
    effect: { kind: 'regenMult', mult: 1.5 },
  },
  keeneye: {
    id: 'keeneye',
    name: 'Keen Eye',
    description: 'You see the flaw in everything: +8% critical strike.',
    effect: { kind: 'stat', stat: 'critPct', add: 8 },
  },
}

export const BLESSING_IDS: readonly BlessingId[] = Object.keys(BLESSINGS) as BlessingId[]
