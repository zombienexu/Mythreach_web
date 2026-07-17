/** Who you are before the first fireball: classes, origins, and birth signs.
 *
 *  This is UI-owned *identity* content — the engine never reads it. One class
 *  is playable today (the Arcanist — the game you already have); the rest are
 *  sealed callings: fully designed, browsable at character creation, waiting
 *  for their chapter. Origins and signs are chosen now and *remembered* now,
 *  and will start echoing into the sim in a later update.
 */

export type ClassId =
  | 'arcanist'
  | 'gravewright'
  | 'hourwarden'
  | 'cartomancer'
  | 'thornspeaker'
  | 'riftblade'

export interface ClassAbilityPreview {
  name: string
  blurb: string
}

export interface ClassDef {
  id: ClassId
  name: string
  /** The line under the name — how the world says it. */
  epithet: string
  /** One-word posture, for the little role chip. */
  role: string
  /** oklch hue angle that themes the class everywhere it appears. */
  hue: number
  playable: boolean
  /** Two or three sentences, second person, in the atlas's voice. */
  lore: string
  /** The class gimmick — the thing no other calling gets. */
  mechanic: { name: string; text: string }
  /** Three signature previews. For the Arcanist these are real; for sealed
   *  callings they are the design promise. */
  abilities: ClassAbilityPreview[]
}

export const CLASSES: readonly ClassDef[] = [
  {
    id: 'arcanist',
    name: 'Arcanist',
    epithet: 'The Candle That Answers Back',
    role: 'Spellweaver',
    hue: 195,
    playable: true,
    lore:
      'You studied in the Observatory until the Observatory started studying you. Fire obeys you, the arcane hums under your fingernails, and a small stubborn light in your chest refuses to be put out. The classic calling — and the reach has never once regretted it.',
    mechanic: {
      name: 'The Weave',
      text: 'Chain fire, arcane, and mending in one breath. Combustion turns a careful rotation into a bonfire; Counterspell shuts a caster’s mouth mid-word.',
    },
    abilities: [
      { name: 'Fireball', blurb: 'The old reliable. Arcs across the field and lands with an opinion.' },
      { name: 'Pyroblast', blurb: 'A long breath, then a very short argument.' },
      { name: 'Renew', blurb: 'The candle relights itself. Healing over time, warm as a hearth.' },
    ],
  },
  {
    id: 'gravewright',
    name: 'Gravewright',
    epithet: 'Sexton of the Unquiet Field',
    role: 'Summoner',
    hue: 135,
    playable: false,
    lore:
      'Every kill in the reach is inked into somebody’s ledger. Yours. You keep the book of the fallen, and when you need a hand, you tear out a page and the page stands up. The dead don’t mind — it beats lying in the rain.',
    mechanic: {
      name: 'The Ledger of the Dead',
      text: 'Slain foes are written into your ledger. Spend entries to raise brief, loyal echoes of the very monsters you buried.',
    },
    abilities: [
      { name: 'Exhume', blurb: 'The last thing you killed fights the next thing you kill.' },
      { name: 'Gravechill', blurb: 'A cold that files paperwork in the marrow. Damage over time.' },
      { name: 'Last Rites', blurb: 'Trade a page of the ledger for a heartbeat of your own.' },
    ],
  },
  {
    id: 'hourwarden',
    name: 'Hourwarden',
    epithet: 'Keeper of the Borrowed Second',
    role: 'Tempomancer',
    hue: 240,
    playable: false,
    lore:
      'You keep time the way other people keep debts — carefully, and never in your favor for long. Every miracle is borrowed from a future you, and future you always collects. So far you have stayed one second ahead. So far.',
    mechanic: {
      name: 'Sand Debt',
      text: 'Abilities borrow seconds from your future self. The debt comes due as a Reckoning — survive it, and the borrowing was free.',
    },
    abilities: [
      { name: 'Split Second', blurb: 'Act twice. Owe once.' },
      { name: 'Rewind Wound', blurb: 'The last blow that landed on you politely un-lands.' },
      { name: 'Hourglass Shatter', blurb: 'The target experiences next Tuesday all at once.' },
    ],
  },
  {
    id: 'cartomancer',
    name: 'Cartomancer',
    epithet: 'Dealer of the Fifty-Third Card',
    role: 'Gambler',
    hue: 80,
    playable: false,
    lore:
      'Fifty-two cards describe the world. The fifty-third edits it. You found the deck in a dead man’s coat — or the deck found you, it enjoys telling the story both ways. You never draw a bad hand; you draw hands other people are bad at.',
    mechanic: {
      name: 'The Living Deck',
      text: 'Each fight deals you a hand of fate. Every card plays once, every achievement shuffles a new card into the deck. The Wager loves you back.',
    },
    abilities: [
      { name: 'Deal Fate', blurb: 'Flip the top card. It is never a two. It is occasionally a tower.' },
      { name: 'House Rules', blurb: 'For six seconds, the odds work for you and hate it.' },
      { name: 'Fold the World', blurb: 'Discard your hand. Reality discards something too.' },
    ],
  },
  {
    id: 'thornspeaker',
    name: 'Thornspeaker',
    epithet: 'Voice of the Patient Green',
    role: 'Cultivator',
    hue: 150,
    playable: false,
    lore:
      'The wilds do not hurry, and neither do you. You plant a quarrel the way others plant a garden and harvest it in screams of foliage. Long fights are your growing season — nothing outlasts a person the forest agrees with.',
    mechanic: {
      name: 'Rootbound Garden',
      text: 'Seed the battlefield and your foes alike. Everything you plant keeps growing as the fight runs — the longer the hunt, the harder the bloom.',
    },
    abilities: [
      { name: 'Sow Briar', blurb: 'A seed today, a hedge of knives tomorrow. Tomorrow comes fast.' },
      { name: 'Sapdraw', blurb: 'Their vigor, rerouted. The garden must be watered.' },
      { name: 'Verdant Cataract', blurb: 'The whole garden blooms at once. Bring shears. It won’t help.' },
    ],
  },
  {
    id: 'riftblade',
    name: 'Riftblade',
    epithet: 'Edge of the Elsewhere',
    role: 'Spellblade',
    hue: 305,
    playable: false,
    lore:
      'Somewhere between here and there is a seam, and you carry the only knife that fits it. You fight in footnotes — behind them, beside them, briefly *inside* the space they were standing in. Front row, back row: suggestions.',
    mechanic: {
      name: 'Blink Tempo',
      text: 'Step through the seam between formation rows. Strikes from elsewhere ignore the front line entirely — position is a weapon.',
    },
    abilities: [
      { name: 'Through-Cut', blurb: 'The blade arrives before you do. Rude, effective.' },
      { name: 'Afterimage', blurb: 'Leave a you-shaped argument behind. It also has a sword.' },
      { name: 'Doorway Duel', blurb: 'Drag one enemy into the elsewhere. Only you are invited back.' },
    ],
  },
]

export const CLASS_BY_ID: Record<ClassId, ClassDef> = Object.fromEntries(
  CLASSES.map((c) => [c.id, c]),
) as Record<ClassId, ClassDef>

/** Where you were before the atlas had your name in it. Chosen now,
 *  remembered forever; starts granting a leaning (never a cage) later. */
export interface OriginDef {
  id: string
  name: string
  /** The flavor line. */
  line: string
  /** What it will one day mean, stated as a promise. */
  promise: string
}

export const ORIGINS: readonly OriginDef[] = [
  {
    id: 'lamplit-scholar',
    name: 'Lamplit Scholar',
    line: 'Raised in the Observatory stacks, where the books read back.',
    promise: 'Will lean toward wisdom — experience comes a little easier.',
  },
  {
    id: 'ashmarch-survivor',
    name: 'Ashmarch Survivor',
    line: 'You walked out of a burning province. The province did not.',
    promise: 'Will lean toward grit — a little more health, a lot more nerve.',
  },
  {
    id: 'guild-courier',
    name: 'Guild Courier',
    line: 'You know every road in the reach and exactly what each toll-keeper drinks.',
    promise: 'Will lean toward coin — gold finds a familiar pocket.',
  },
  {
    id: 'hedgewitch-ward',
    name: 'Hedge-Witch’s Ward',
    line: 'Brought up on soup, superstition, and things that were technically true.',
    promise: 'Will lean toward spirit — mana returns like it missed you.',
  },
]

export const ORIGIN_BY_ID: Record<string, OriginDef> = Object.fromEntries(
  ORIGINS.map((o) => [o.id, o]),
)

/** The constellation overhead on the night you were written into the myth.
 *  Star coordinates live in a 0–100 box; `lines` joins star indices. */
export interface SignDef {
  id: string
  name: string
  /** The omen, one line. */
  omen: string
  hue: number
  stars: ReadonlyArray<readonly [number, number]>
  lines: ReadonlyArray<readonly [number, number]>
}

export const SIGNS: readonly SignDef[] = [
  {
    id: 'lantern',
    name: 'The Lantern',
    omen: 'Lost things find you. Found things stay.',
    hue: 85,
    stars: [
      [50, 12],
      [32, 34],
      [68, 34],
      [26, 64],
      [74, 64],
      [50, 86],
    ],
    lines: [
      [0, 1],
      [0, 2],
      [1, 3],
      [2, 4],
      [3, 5],
      [4, 5],
    ],
  },
  {
    id: 'serpent',
    name: 'The Serpent',
    omen: 'Endings coil into beginnings. Bring both.',
    hue: 150,
    stars: [
      [14, 22],
      [38, 14],
      [60, 26],
      [46, 48],
      [26, 62],
      [46, 80],
      [72, 74],
      [86, 56],
    ],
    lines: [
      [0, 1],
      [1, 2],
      [2, 3],
      [3, 4],
      [4, 5],
      [5, 6],
      [6, 7],
    ],
  },
  {
    id: 'tower',
    name: 'The Tower',
    omen: 'You bend before you break — and then you don’t break.',
    hue: 240,
    stars: [
      [38, 88],
      [62, 88],
      [40, 58],
      [60, 58],
      [43, 30],
      [57, 30],
      [50, 10],
    ],
    lines: [
      [0, 2],
      [1, 3],
      [2, 3],
      [2, 4],
      [3, 5],
      [4, 5],
      [4, 6],
      [5, 6],
    ],
  },
  {
    id: 'moth',
    name: 'The Moth',
    omen: 'Drawn to what burns. Unburnt — so far.',
    hue: 305,
    stars: [
      [50, 30],
      [22, 18],
      [10, 46],
      [30, 58],
      [78, 18],
      [90, 46],
      [70, 58],
      [50, 82],
    ],
    lines: [
      [0, 1],
      [1, 2],
      [2, 3],
      [3, 0],
      [0, 4],
      [4, 5],
      [5, 6],
      [6, 0],
      [0, 7],
    ],
  },
]

export const SIGN_BY_ID: Record<string, SignDef> = Object.fromEntries(SIGNS.map((s) => [s.id, s]))

/* ---- The name forge ---------------------------------------------------- */

const ONSETS = [
  'Ael', 'Bran', 'Cael', 'Dro', 'Eira', 'Fen', 'Gal', 'Hara', 'Ish', 'Kael',
  'Lyr', 'Mor', 'Nim', 'Ory', 'Pryn', 'Quil', 'Ryn', 'Sabl', 'Tam', 'Umbr',
  'Vesp', 'Wren', 'Ys', 'Zeph',
]
const BRIDGES = ['a', 'e', 'i', 'o', 'ar', 'en', 'il', 'or', 'um', 'ys']
const CODAS = [
  'dor', 'eth', 'fell', 'gard', 'holt', 'ith', 'lin', 'mere', 'nor', 'rick',
  'row', 'shade', 'thorn', 'vane', 'wick', 'wyn',
]

/** Let fate write it. Deterministic under an injected rng, so tests can
 *  hold the quill still. */
export function forgeName(rng: () => number = Math.random): string {
  const pick = <T>(xs: readonly T[]): T => xs[Math.min(xs.length - 1, Math.floor(rng() * xs.length))]!
  const bridge = rng() < 0.55 ? pick(BRIDGES) : ''
  const name = pick(ONSETS) + bridge + pick(CODAS)
  return name.charAt(0).toUpperCase() + name.slice(1)
}

/** What a character may be called. Trimmed, 2–16 chars. */
export function validName(name: string): boolean {
  const n = name.trim()
  return n.length >= 2 && n.length <= 16
}
