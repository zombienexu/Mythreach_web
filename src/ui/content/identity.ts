/** Who you are before the first fireball — the *presentation* half.
 *
 *  The engine owns the mechanics (class kits, origin leanings, sign boons);
 *  this file owns the poetry: epithets, lore, hues, and the constellation
 *  art. Every id here is an engine id — the two halves are joined at
 *  character creation and never drift, because the kit list and ability
 *  names come straight from the engine registries. */
import {
  ABILITIES,
  CLASS_KITS,
  ORIGINS as ENGINE_ORIGINS,
  SIGNS as ENGINE_SIGNS,
  type ClassId,
  type OriginDef,
} from '../../engine'

export type { ClassId }
export type { OriginDef }

export interface ClassAbilityPreview {
  name: string
  /** The blurb, in the atlas's voice. */
  blurb: string
  unlockLevel: number
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
  /** Two or three sentences, second person, in the atlas's voice. */
  lore: string
  /** The class gimmick — the thing no other calling gets. */
  mechanic: { name: string; text: string }
  /** Three signature previews, real abilities from the engine kit. */
  abilities: ClassAbilityPreview[]
}

/** The flavor half, keyed by engine class id. `signature` picks which three
 *  kit abilities to preview, with a hand-written blurb each. */
interface ClassFlavor {
  epithet: string
  hue: number
  lore: string
  mechanicText: string
  signature: Array<{ id: string; blurb: string }>
}

const FLAVOR: Record<ClassId, ClassFlavor> = {
  arcanist: {
    epithet: 'The Candle That Answers Back',
    hue: 195,
    lore:
      'You studied in the Observatory until the Observatory started studying you. Fire obeys you, the arcane hums under your fingernails, and a small stubborn light in your chest refuses to be put out. The classic calling — and the reach has never once regretted it.',
    mechanicText:
      'Read the foe for Openings, stack Smolder and let it age, ride Heat until Fireball pierces a whole line — then Detonate the field into an Inferno.',
    signature: [
      { id: 'fireball', blurb: 'The old reliable. Arcs across the field and lands with an opinion.' },
      { id: 'detonate', blurb: 'Set off every ember at once. Older fire hits like a landslide.' },
      { id: 'inferno', blurb: 'Everything you built, spent in one breath. The field goes white.' },
    ],
  },
  gravewright: {
    epithet: 'Sexton of the Unquiet Field',
    hue: 135,
    lore:
      'Every kill in the reach is inked into somebody’s ledger. Yours. You keep the book of the fallen, and when you need a hand, you tear out a page and the page stands up. The dead don’t mind — it beats lying in the rain.',
    mechanicText:
      'Every kill writes a page into your ledger. Spend pages on Last Rites and Exhume — or hold the whole book and slam it shut with Final Chapter.',
    signature: [
      { id: 'exhume', blurb: 'The last thing you killed fights the next thing you kill.' },
      { id: 'gravechill', blurb: 'A cold that files paperwork in the marrow. It also slows the hand that swings.' },
      { id: 'lastRites', blurb: 'Trade a page of the ledger for a heartbeat of your own.' },
    ],
  },
  hourwarden: {
    epithet: 'Keeper of the Borrowed Second',
    hue: 240,
    lore:
      'You keep time the way other people keep debts — carefully, and never in your favor for long. Every miracle is borrowed from a future you, and future you always collects. So far you have stayed one second ahead. So far.',
    mechanicText:
      'Nothing you do has a cast time — everything adds Sand Debt, and every 16 seconds the Reckoning collects it in blood. Finish the fight first and the borrowing was free; or break the hourglass over their head and make the debt *theirs*.',
    signature: [
      { id: 'splitSecond', blurb: 'Act in both halves of the moment. Owe for both.' },
      { id: 'rewindWound', blurb: 'The last blow that landed on you politely un-lands.' },
      { id: 'hourglassShatter', blurb: 'The target experiences your entire debt all at once.' },
    ],
  },
  cartomancer: {
    epithet: 'Dealer of the Fifty-Third Card',
    hue: 80,
    lore:
      'Fifty-two cards describe the world. The fifty-third edits it. You found the deck in a dead man’s coat — or the deck found you, it enjoys telling the story both ways. You never draw a bad hand; you draw hands other people are bad at.',
    mechanicText:
      'Every fight deals you a hand of fate. Deal Fate plays the top card — a tower, a comet, an ace of hearts. Cut the deck when the hand is bad; fold the whole world when it’s worse.',
    signature: [
      { id: 'dealFate', blurb: 'Flip the top card. It is never a two. It is occasionally a tower.' },
      { id: 'houseRules', blurb: 'For eight seconds, the odds work for you and hate it.' },
      { id: 'foldTheWorld', blurb: 'Discard your hand. Reality discards something too.' },
    ],
  },
  thornspeaker: {
    epithet: 'Voice of the Patient Green',
    hue: 150,
    lore:
      'The wilds do not hurry, and neither do you. You plant a quarrel the way others plant a garden and harvest it in screams of foliage. Long fights are your growing season — nothing outlasts a person the forest agrees with.',
    mechanicText:
      'Everything you plant keeps growing — each briar tick hits harder than the last. Force the bloom with Wildswell, or harvest the whole garden at once with Verdant Cataract.',
    signature: [
      { id: 'sowBriar', blurb: 'A seed today, a hedge of knives tomorrow. Tomorrow comes fast.' },
      { id: 'sapdraw', blurb: 'Their vigor, rerouted. The garden must be watered.' },
      { id: 'verdantCataract', blurb: 'The whole garden blooms at once. Bring shears. It won’t help.' },
    ],
  },
  riftblade: {
    epithet: 'Edge of the Elsewhere',
    hue: 305,
    lore:
      'Somewhere between here and there is a seam, and you carry the only knife that fits it. You fight in footnotes — behind them, beside them, briefly *inside* the space they were standing in. Front row, back row: suggestions.',
    mechanicText:
      'Fast strikes bank rift charges; Phase Edge spends them all on one blow from elsewhere. Seamstep makes the next hit miss the space you were in — and Doorway Duel locks the whole pack outside while you finish someone privately.',
    signature: [
      { id: 'throughCut', blurb: 'The blade arrives before you do. Rude, effective.' },
      { id: 'afterimage', blurb: 'Leave a you-shaped argument behind. It also has a sword.' },
      { id: 'doorwayDuel', blurb: 'Drag one enemy into the elsewhere. Only you are invited back.' },
    ],
  },
}

export const CLASSES: readonly ClassDef[] = Object.values(CLASS_KITS).map((kit) => {
  const flavor = FLAVOR[kit.id]
  return {
    id: kit.id,
    name: kit.name,
    epithet: flavor.epithet,
    role: kit.role,
    hue: flavor.hue,
    lore: flavor.lore,
    mechanic: { name: kit.mechanic, text: flavor.mechanicText },
    abilities: flavor.signature.map((s) => {
      const def = ABILITIES[s.id as keyof typeof ABILITIES]
      return { name: def.name, blurb: s.blurb, unlockLevel: def.unlockLevel }
    }),
  }
})

export const CLASS_BY_ID: Record<ClassId, ClassDef> = Object.fromEntries(
  CLASSES.map((c) => [c.id, c]),
) as Record<ClassId, ClassDef>

/** Where you were before the atlas had your name in it — engine truth,
 *  boons and all. */
export const ORIGINS = ENGINE_ORIGINS

export const ORIGIN_BY_ID: Record<string, OriginDef> = Object.fromEntries(
  ORIGINS.map((o) => [o.id, o]),
)

/** The constellation overhead on the night you were written into the myth.
 *  Mechanics from the engine; star coordinates live in a 0–100 box and
 *  `lines` joins star indices. */
export interface SignDef {
  id: string
  name: string
  /** The omen, one line. */
  omen: string
  /** What the stars actually do — engine truth. */
  boon: string
  hue: number
  stars: ReadonlyArray<readonly [number, number]>
  lines: ReadonlyArray<readonly [number, number]>
}

const SIGN_ART: Record<
  string,
  { hue: number; stars: SignDef['stars']; lines: SignDef['lines'] }
> = {
  lantern: {
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
  serpent: {
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
  tower: {
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
  moth: {
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
}

export const SIGNS: readonly SignDef[] = ENGINE_SIGNS.map((s) => {
  const art = SIGN_ART[s.id]!
  return { id: s.id, name: s.name, omen: s.omen, boon: s.boon, ...art }
})

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
