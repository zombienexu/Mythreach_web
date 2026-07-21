/** THE KINDLE YARD — the Ember Legion's recruitment camp, and the game's
 *  opening arc. A fresh conscript owns a wooden staff and no magic. The camp
 *  is a fixed script of sparring duels, run one at a time in the circle:
 *
 *    The Proving   — three staff-only duels that teach the swing (Q), the Sharpen
 *                    (Focus into your own wind-up) and the Read (Focus into
 *                    the foe's). Winning the proving pays enough Standing to
 *                    cross Blooded.
 *    The Lecture   — Vale stops the yard and *explains Heat* before anyone is
 *                    handed fire. A conscript who learns the rule first burns
 *                    fewer eyebrows off. Then the First Weaving: Fireball.
 *    The Tempering — three duels with Fireball in hand: feed the Heat, marry
 *                    the Read to the fire, then ride the boil to the crash.
 *    Graduation    — Sergeant Vale hands the classic first order (six boars),
 *                    and the Map and the field board unlock.
 *
 *  Pure data + helpers: the Expedition persists how many steps are done, the
 *  Game spawns each duel through `sim.startFight({enemyIds, sparring})`. */
import { SERGEANT } from './content'

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
      '“Okka now. She’s quicker. This time, watch the last stretch of your own swing — when the arc burns bright, press Space. Turn the blow as it lands. We call it the Sharpen. Timing is the whole art here.”',
    lesson: 'Focus (Space) late in your own wind-up Sharpens the landing blow: +50%.',
  },
  {
    opponentId: 'trainee-varn',
    title: 'The Proving · third circle',
    brief:
      '“Varn hits fast and leans into every swing — which means every swing tells you it’s coming. When his wind-up burns, press Space and take the blow apart. Deflect it, and he’s wide open. Read him, and you’ve out-fought the fastest hands in the yard.”',
    lesson: 'Focus (Space) on a foe’s open tell deflects the blow and cracks them Exposed.',
  },
  {
    opponentId: 'sparhand-derrin',
    title: 'The Tempering · the chant',
    brief:
      '“You have the theory. Now do it under fire. Keep the Fireballs coming and the Heat stays with you; go quiet for three breaths and it bleeds off — I want to see you never go quiet. Derrin will chant at you mid-bout. A chant is the longest tell there is, and you already know what to do with tells.”',
    lesson: 'Heat: +3% fire damage per point, bleeding away unfed. A chant is a tell — read it.',
  },
  {
    opponentId: 'sparhand-oreth',
    title: 'The Tempering · the marriage',
    brief:
      '“Oreth is slow and Oreth is heavy, and that is the point: you can see every swing coming from the next province. Read the wind-up with Space, then put the Fireball straight through the hole you just made. Fire into an Opening bites deeper, lays a second Smolder, and pays you an extra point of Heat. The staff work and the fire are not two skills, conscript. They are one.”',
    lesson: 'Fireball loosed into an Opening: extra Smolder and +1 Heat on top of the Exposed bonus.',
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
 *  bonus, which crosses Blooded — the Heat lecture, then the First Weaving. */
export const PROVING_DUELS = 3

/** Sergeant Vale stops the yard between the proving and the First Weaving. The
 *  Legion does not hand a conscript fire and then explain it afterwards — the
 *  rule comes first, the spark second. Delivered once, on the proving's last
 *  win, immediately before the Fireball ceremony. */
export const HEAT_LECTURE = {
  speaker: SERGEANT,
  title: 'On Heat',
  body:
    '“Before anyone gives you fire, you will hear the rule. The Weave is not a bucket you fill; it is a momentum you keep. Every working you loose banks a point of Heat, and every point of Heat burns the next one three parts hotter. Stop weaving and it bleeds straight back out of you — the Weave does not wait around for a conscript to make up their mind.\n\nRide it high enough and the fire goes wide: it splashes, it spreads, it catches on everything standing near what you aimed at. Ride it to ten and the next one is a Blaze that goes through the whole line — and then it is gone, all of it, and you are cold and starting over. That is not a punishment. That is what fire is.\n\nNobody in this Legion masters Heat. We ride it, we lose it, we build it again. Now put your staff down and hold out your hands.”',
} as const

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
