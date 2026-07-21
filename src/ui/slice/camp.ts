/** THE KINDLE YARD — the Ember Legion's recruitment camp, and the game's
 *  opening arc. A fresh conscript owns a wooden staff and no magic. The camp
 *  is a fixed script of sparring duels, run one at a time in the circle:
 *
 *    The Rack      — you take a practice staff off the rack. Nothing is given
 *                    to a conscript that they did not pick up themselves.
 *    The Proving   — three staff-only duels that teach the swing (Q), that the
 *                    staff and the weave share one pair of hands, and how to
 *                    read the rhythm of a committed blow. Winning the proving
 *                    pays enough Standing to cross Blooded.
 *    The Guides    — two manual pages, in order: Heat, then Fireball. Rules,
 *                    not speeches — the second page *is* the First Weaving.
 *    The Tempering — three duels with Fireball in hand: feed the Heat, learn
 *                    the Stoke, then ride the boil to the crash.
 *    Graduation    — Sergeant Vale hands the classic first order (six boars),
 *                    and the Map and the field board unlock.
 *
 *  Pure data + helpers: the Expedition persists how many steps are done, the
 *  Game spawns each duel through `sim.startFight({enemyIds, sparring})`. */
import {
  ABILITIES,
  FIREBALL_SPLASH_PCT,
  HEAT_DECAY_TICKS,
  HEAT_EMPOWERED_AT,
  HEAT_FIRE_PCT_PER_POINT,
  HEAT_MAX,
  HEAT_OVERHEAT_AT,
  HEAT_PER_LANDING,
  HEAT_PER_STOKED_LANDING,
  STOKE_CD_TICKS,
  STOKE_WINDOW_TICKS,
  ABILITY_EFFECTS,
  type AbilityEffect,
} from '../../engine'
import { ticksToSeconds } from '../format'

export interface CampDuel {
  /** enemy defId of the sparring partner. */
  opponentId: string
  /** the circle's billing for the bout */
  title: string
  /** Sergeant Vale, before the duel */
  brief: string
  /** the one mechanical lesson this duel exists to teach */
  lesson: string
}

/** The camp script, in order. `expedition.camp` counts how many are done. */
export const CAMP_DUELS: readonly CampDuel[] = [
  {
    opponentId: 'trainee-pell',
    title: 'The Proving · first circle',
    brief:
      '“Pell first. He telegraphs everything — perfect for you. Square up and swing: Q puts the staff in motion, and nothing swings itself in my yard. Watch your own wind-up arc all the way through. Learn its rhythm.”',
    lesson: 'Q swings the staff. Casting nothing? Keep swinging — you are still fighting.',
  },
  {
    opponentId: 'trainee-okka',
    title: 'The Proving · second circle',
    brief:
      '“Okka now. She’s quicker, so you’ll want the staff moving the whole bout. Understand this early: the swing and the weave are one pair of hands. A working in flight holds your arc where it stands. Whenever you aren’t weaving, you should be swinging — dead hands are how conscripts die.”',
    lesson: 'The staff and the weave share your hands: a cast holds the wind-up. Idle hands do nothing.',
  },
  {
    opponentId: 'trainee-varn',
    title: 'The Proving · third circle',
    brief:
      '“Varn hits fast and leans into every swing — which means every swing tells you it’s coming. Watch the ring on him: when it burns, the blow is committed and there is nothing he can do about it. Learn to see that. Everything else this Legion teaches you is timing, and timing starts with knowing when a thing has already been decided.”',
    lesson: 'A burning ring is a committed blow. Read the rhythm of a bout — timing is the whole art.',
  },
  {
    opponentId: 'sparhand-derrin',
    title: 'The Tempering · the chant',
    brief:
      '“You have the theory. Now do it under fire. Keep the Fireballs coming and the Heat stays with you; go quiet for three breaths and it bleeds off — I want to see you never go quiet. Derrin will chant at you mid-bout. A chant is the longest tell there is, and you already know what to do with tells.”',
    lesson: 'Heat: +5% fire damage per point, bleeding away unfed. Every landing working banks one.',
  },
  {
    opponentId: 'sparhand-oreth',
    title: 'The Tempering · the Stoke',
    brief:
      '“Now the calling itself. Space throws the flue open — half a second, no more, and then it shuts and won’t open again for three. Anything of yours that *lands* inside that half second banks two Heat instead of one. Note the word: lands. Your Fireball takes a breath to fly. Open the flue for where the fire will be, not where your hand is. Oreth is slow enough to let you practise. Nobody else will be.”',
    lesson: 'Stoke (Space): half a second of open flue. A working that lands inside it banks 2 Heat, not 1. 3s cooldown.',
  },
  {
    opponentId: 'sparhand-mavet',
    title: 'The Tempering · the boil',
    brief:
      '“Last circle. Mavet gets angrier the longer you take, so don’t take long — this is where you find out whether you were listening. Ten Heat, one Blaze, straight through the line, and then cold. Everything I told you, at speed, against someone who wants to win. You will chase that boil your whole life. Start today.”',
    lesson: 'At 10 Heat the next Fireball pierces the line — then Heat crashes to cold.',
  },
]

/** Duels in the proving (staff only); winning the last one pays the proving
 *  bonus, which crosses Blooded — the Heat guide, then the Fireball guide
 *  (the First Weaving). */
export const PROVING_DUELS = 3

/** The rack by the gate: a conscript picks their own practice staff up before
 *  the first bout. The sim already issued it — this beat is the ceremony that
 *  hands it over on screen. */
export const STAFF_RACK = {
  title: 'The rack',
  blurb: 'A row of practice staves, grey with use. Nobody hands you one.',
  take: 'Take one',
} as const

/** A page of the yard's field manual: a title, one line of flavour at most,
 *  and a list of rules a conscript can actually act on. Every number in the
 *  lines is read out of the engine's own constants, so the manual cannot drift
 *  away from the mechanics it documents. */
export interface Guide {
  title: string
  /** ONE short sentence — the whole flavour budget for the page. */
  blurb: string
  lines: string[]
}

const FIREBALL = ABILITIES.fireball
const FIREBALL_HIT = ABILITY_EFFECTS.fireball as Extract<AbilityEffect, { kind: 'damage' }>
/** How long is left of the cast when the flue should be thrown open. */
const STOKE_LEAD = ticksToSeconds(STOKE_WINDOW_TICKS)

/** Manual page one, shown the moment the proving is won: what Heat is and how
 *  it is worked. The rule always lands before the spark. */
export const HEAT_GUIDE: Guide = {
  title: 'Heat',
  blurb: 'Heat is momentum, not a reserve — you ride it or you lose it.',
  lines: [
    `Every working of yours that lands on a foe banks ${HEAT_PER_LANDING} Heat. The staff is wood: it banks none.`,
    `Each point of Heat burns your fire ${HEAT_FIRE_PCT_PER_POINT}% hotter. Heat stops at ${HEAT_MAX}.`,
    `Land nothing and hold no cast for ${ticksToSeconds(HEAT_DECAY_TICKS)}s and you bleed off a point — and another every ${ticksToSeconds(HEAT_DECAY_TICKS)}s after. A cast in flight counts as feeding it.`,
    `At ${HEAT_EMPOWERED_AT} Heat your Fireball splashes ${FIREBALL_SPLASH_PCT}% of its hit onto up to two other foes and lays Smolder on them.`,
    `At ${HEAT_OVERHEAT_AT} Heat the next Fireball is a Blaze: it pierces the whole line at full force — then Heat crashes to cold.`,
    `Stoke (Space) throws the flue open for ${ticksToSeconds(STOKE_WINDOW_TICKS)}s. A working that lands inside it banks ${HEAT_PER_STOKED_LANDING} Heat instead of ${HEAT_PER_LANDING} — cast inside it counts for nothing. ${ticksToSeconds(STOKE_CD_TICKS)}s before it opens again.`,
  ],
}

/** Manual page two — and the First Weaving itself: the working is handed over
 *  with its own page, so the gift arrives already explained. */
export const FIREBALL_GUIDE: Guide = {
  title: FIREBALL.name,
  blurb: 'Your first working, and the one you will cast ten thousand times.',
  lines: [
    `${ticksToSeconds(FIREBALL.castTicks)}s cast, ${FIREBALL.manaCost} mana, key ${FIREBALL.key}.`,
    `${FIREBALL_HIT.min}–${FIREBALL_HIT.max} Fire damage and one stack of Smolder on what it hits.`,
    `Every Fireball that lands banks ${HEAT_PER_LANDING} Heat, so the chain feeds itself — keep casting and the fire stays with you.`,
    `A cast in flight holds your staff wind-up where it stands: one pair of hands, so never stand idle between casts.`,
    `Stoke the landing, not the cast. Press Space with about ${STOKE_LEAD}s of the ${ticksToSeconds(FIREBALL.castTicks)}s cast left, and the bolt arrives inside the open flue for ${HEAT_PER_STOKED_LANDING} Heat.`,
  ],
}

/** Standing paid when the proving is won — with the three duel kills, exactly
 *  enough to cross Blooded (45) and be taught Fireball at the ceremony. */
export const PROVING_BONUS = 45

/** Standing paid at graduation, on winning the final tempering duel. */
export const GRADUATION_BONUS = 20

/** How Sergeant Vale sends you out the gate, alongside the boar order. */
export const GRADUATION_SEND_OFF =
  '“That’s everything the yard can teach you. The rest is out there. Report to the cookfires’ quartermaster — no, better: bring them something. Six boars, cavern mouth. Move.”'

/** The next duel to fight, or null once the camp is complete. */
export function currentDuel(stepsDone: number): CampDuel | null {
  return CAMP_DUELS[stepsDone] ?? null
}

/** True while the conscript is still in the Kindle Yard. */
export function inCamp(stepsDone: number): boolean {
  return stepsDone < CAMP_DUELS.length
}

/** The Standing bonus a just-completed step pays (0 for ordinary steps). */
export function bonusForStep(justCompleted: number): number {
  if (justCompleted === PROVING_DUELS) return PROVING_BONUS
  if (justCompleted === CAMP_DUELS.length) return GRADUATION_BONUS
  return 0
}
