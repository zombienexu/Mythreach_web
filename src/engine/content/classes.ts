/** The six callings, engine-side: which abilities and talents each one owns,
 *  and which resource its mechanic runs on. Each kit is built for a kind of
 *  player:
 *
 *  - **arcanist** — the classicist: a clean rotation that rewards good hands.
 *  - **gravewright** — the collector: kills become pages, pages become power.
 *  - **hourwarden** — the deadline gambler: all instants, all borrowed, and
 *    every 16 seconds the debt comes due.
 *  - **cartomancer** — the variance lover: play the hand fate dealt, or fold
 *    the world and see what happens.
 *  - **thornspeaker** — the patient gardener: everything planted keeps
 *    growing; long fights are the growing season.
 *  - **riftblade** — the tempo duelist: build charges with fast strikes,
 *    spend them all on one edge from elsewhere. */
import type { AbilityId, ClassId, TalentId } from '../types'

export type ClassResourceKind = 'none' | 'ledger' | 'debt' | 'hand' | 'growth' | 'charge'

export interface ClassKit {
  id: ClassId
  name: string
  /** One-word posture, for chips and summaries. */
  role: string
  /** Action-bar order; hotkeys 1..n within the kit. */
  abilities: readonly AbilityId[]
  talents: readonly TalentId[]
  resource: ClassResourceKind
  /** The mechanic's name, shared with the UI's resource widget. */
  mechanic: string
}

export const CLASS_KITS: Record<ClassId, ClassKit> = {
  arcanist: {
    id: 'arcanist',
    name: 'Arcanist',
    role: 'Spellweaver',
    abilities: ['fireball', 'ignite', 'renew', 'pyroblast', 'counterspell', 'barrier', 'combustion'],
    talents: ['impFireball', 'searingFlames', 'criticalMass', 'fortitude', 'meditation', 'swiftRenewal'],
    resource: 'none',
    mechanic: 'The Weave',
  },
  gravewright: {
    id: 'gravewright',
    name: 'Gravewright',
    role: 'Summoner',
    abilities: ['gravebolt', 'gravechill', 'lastRites', 'exhume', 'requiem', 'boneward', 'finalChapter'],
    talents: ['inkOfTheFallen', 'deeperCuts', 'swiftQuill', 'boundEchoes', 'gravePact', 'oldBones'],
    resource: 'ledger',
    mechanic: 'The Ledger of the Dead',
  },
  hourwarden: {
    id: 'hourwarden',
    name: 'Hourwarden',
    role: 'Tempomancer',
    abilities: ['secondhandStrike', 'rewindWound', 'splitSecond', 'stasis', 'borrowedBlade', 'hourglassShatter'],
    talents: ['borrowedTime', 'finePrint', 'quickHands', 'compoundInterest', 'patientDebt', 'longCon'],
    resource: 'debt',
    mechanic: 'Sand Debt',
  },
  cartomancer: {
    id: 'cartomancer',
    name: 'Cartomancer',
    role: 'Gambler',
    abilities: ['cardflick', 'dealFate', 'cutTheDeck', 'houseRules', 'foldTheWorld', 'fiftyThirdCard'],
    talents: ['loadedDice', 'sleightOfHand', 'extraAce', 'crookedHouse', 'luckyPenny', 'toughCrowd'],
    resource: 'hand',
    mechanic: 'The Living Deck',
  },
  thornspeaker: {
    id: 'thornspeaker',
    name: 'Thornspeaker',
    role: 'Cultivator',
    abilities: ['thornlash', 'sowBriar', 'sapdraw', 'brambleWard', 'wildswell', 'verdantCataract'],
    talents: ['patientGreen', 'deepRoots', 'sapSurge', 'fullBloom', 'rootedCalm', 'thickBark'],
    resource: 'growth',
    mechanic: 'Rootbound Garden',
  },
  riftblade: {
    id: 'riftblade',
    name: 'Riftblade',
    role: 'Spellblade',
    abilities: ['throughCut', 'seamstep', 'phaseEdge', 'afterimage', 'riftTear', 'doorwayDuel'],
    talents: ['honedEdge', 'fleetFooted', 'mirrorTraining', 'duelistsEye', 'widenedSeam', 'scarTissue'],
    resource: 'charge',
    mechanic: 'Blink Tempo',
  },
}

export const CLASS_IDS: readonly ClassId[] = [
  'arcanist',
  'gravewright',
  'hourwarden',
  'cartomancer',
  'thornspeaker',
  'riftblade',
]

export function kitOf(classId: ClassId): ClassKit {
  return CLASS_KITS[classId]
}
