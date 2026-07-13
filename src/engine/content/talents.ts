import type { TalentId } from '../types'

export interface TalentDef {
  id: TalentId
  name: string
  maxRanks: number
  /** Effect magnitude per rank, for UI copy. */
  perRank: string
  description: string
}

export const TALENTS: Record<TalentId, TalentDef> = {
  impFireball: {
    id: 'impFireball',
    name: 'Improved Fireball',
    maxRanks: 5,
    perRank: '−0.1 s cast',
    description: 'Shave the hesitation off your Fireball. 0.1 s faster cast per rank.',
  },
  searingFlames: {
    id: 'searingFlames',
    name: 'Searing Flames',
    maxRanks: 5,
    perRank: '+8% fire damage',
    description: 'Your fire spells burn 8% hotter per rank.',
  },
  criticalMass: {
    id: 'criticalMass',
    name: 'Critical Mass',
    maxRanks: 5,
    perRank: '+2% crit',
    description: 'Everything you cast is 2% more likely to crit per rank.',
  },
  fortitude: {
    id: 'fortitude',
    name: 'Fortitude',
    maxRanks: 5,
    perRank: '+6% max health',
    description: 'Thicker blood. 6% more maximum health per rank.',
  },
  meditation: {
    id: 'meditation',
    name: 'Meditation',
    maxRanks: 5,
    perRank: '+12% mana regen',
    description: 'The stars pour back faster. 12% more mana regeneration per rank.',
  },
  swiftRenewal: {
    id: 'swiftRenewal',
    name: 'Swift Renewal',
    maxRanks: 5,
    perRank: '−0.2 s cast, +8% healing',
    description: 'Renew casts 0.2 s faster and heals 8% more per rank.',
  },
}

export const TALENT_IDS: readonly TalentId[] = [
  'impFireball',
  'searingFlames',
  'criticalMass',
  'fortitude',
  'meditation',
  'swiftRenewal',
]
