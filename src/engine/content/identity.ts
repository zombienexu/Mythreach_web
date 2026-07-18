/** The mechanical half of who you are: what an origin or a birth sign
 *  actually *does*. The UI's identity content (lore, epithets, star maps)
 *  keys off these ids; the engine reads only the numbers.
 *
 *  Origins lean; signs intervene. An origin is a steady percentage that
 *  shapes a whole run. A sign is a moment — a drop that finds you, a death
 *  that doesn't stick. Neither is ever a cage: every build works under
 *  every sky. */

export interface OriginDef {
  id: string
  name: string
  /** One-line memory of where you were. */
  line: string
  /** The leaning, stated as fact now — no longer a promise. */
  boon: string
  effects: {
    /** Bonus XP, percent. */
    xpPct?: number
    /** Bonus max health, percent. */
    hpPct?: number
    /** Bonus gold from kills and quests, percent. */
    goldPct?: number
    /** Bonus mana regeneration, percent. */
    regenPct?: number
  }
}

export const ORIGINS: readonly OriginDef[] = [
  {
    id: 'lamplit-scholar',
    name: 'Lamplit Scholar',
    line: 'Raised in the Observatory stacks, where the books read back.',
    boon: 'Wisdom comes easier: +10% experience.',
    effects: { xpPct: 10 },
  },
  {
    id: 'ashmarch-survivor',
    name: 'Ashmarch Survivor',
    line: 'You walked out of a burning province. The province did not.',
    boon: 'Grit in the blood: +8% maximum health.',
    effects: { hpPct: 8 },
  },
  {
    id: 'guild-courier',
    name: 'Guild Courier',
    line: 'You know every road in the reach and exactly what each toll-keeper drinks.',
    boon: 'Coin finds a familiar pocket: +12% gold.',
    effects: { goldPct: 12 },
  },
  {
    id: 'hedgewitch-ward',
    name: 'Hedge-Witch’s Ward',
    line: 'Brought up on soup, superstition, and things that were technically true.',
    boon: 'Spirit runs deep: +15% mana regeneration.',
    effects: { regenPct: 15 },
  },
]

export const ORIGIN_BY_ID: Record<string, OriginDef> = Object.fromEntries(
  ORIGINS.map((o) => [o.id, o]),
)

export interface SignDef {
  id: string
  name: string
  /** The omen, one line. */
  omen: string
  /** What the stars actually do. */
  boon: string
  effects: {
    /** Additive item-drop chance, percent points. */
    dropPct?: number
    /** Additive material-drop chance, percent points. */
    materialPct?: number
    /** Respawn-time reduction, percent. */
    respawnCutPct?: number
    /** Additive crit chance, percent points. */
    critPct?: number
    /** Once per fight, a killing blow leaves you at 1 HP instead. */
    cheatDeath?: boolean
  }
}

export const SIGNS: readonly SignDef[] = [
  {
    id: 'lantern',
    name: 'The Lantern',
    omen: 'Lost things find you. Found things stay.',
    boon: '+6% item drops, +10% material finds.',
    effects: { dropPct: 6, materialPct: 10 },
  },
  {
    id: 'serpent',
    name: 'The Serpent',
    omen: 'Endings coil into beginnings. Bring both.',
    boon: 'You return from death 40% sooner.',
    effects: { respawnCutPct: 40 },
  },
  {
    id: 'tower',
    name: 'The Tower',
    omen: 'You bend before you break — and then you don’t break.',
    boon: 'Once per fight, a killing blow leaves you at 1 HP.',
    effects: { cheatDeath: true },
  },
  {
    id: 'moth',
    name: 'The Moth',
    omen: 'Drawn to what burns. Unburnt — so far.',
    boon: '+3% critical strike chance.',
    effects: { critPct: 3 },
  },
]

export const SIGN_BY_ID: Record<string, SignDef> = Object.fromEntries(SIGNS.map((s) => [s.id, s]))
