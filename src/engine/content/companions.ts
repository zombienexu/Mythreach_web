/** "Hiring heroes" scaffold — a single-player hireling that swings at the
 *  player's current target on its own timer. HP comes later; for now it takes no
 *  damage. */
export interface CompanionDef {
  id: string
  name: string
  epithet: string
  /** Gold cost to hire. */
  cost: number
  /** Ticks between companion swings. */
  swingTicks: number
  /** Base swing damage before per-level scaling. */
  baseDmg: number
  dmgPerLevel: number
}

export const COMPANIONS: Record<string, CompanionDef> = {
  wren: {
    id: 'wren',
    name: 'Wren the Emberblade',
    epithet: 'a sellsword with a debt to the dark',
    cost: 150,
    swingTicks: 26,
    baseDmg: 3,
    dmgPerLevel: 1,
  },
}
