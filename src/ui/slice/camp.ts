/** THE KINDLE YARD — the Ember Legion's recruitment camp, and the game's
 *  opening arc. A fresh conscript owns a wooden staff and no magic. The camp
 *  is a fixed script of sparring duels, run one at a time in the circle:
 *
 *    The Proving   — three staff-only duels that teach the swing, the Sharpen
 *                    (Focus into your own wind-up) and the Read (Focus into
 *                    the foe's). Winning the proving pays enough Standing to
 *                    cross Blooded — the First Weaving: Fireball is taught.
 *    The Tempering — two duels with Fireball in hand that teach Heat: feed it,
 *                    ride it, watch it slip your grip at the top.
 *    Graduation    — Sergeant Vale hands the classic first order (six boars),
 *                    and the Map and the field board unlock.
 *
 *  Pure data + helpers: the Expedition persists how many steps are done, the
 *  Game spawns each duel through `sim.startFight({enemyIds, sparring})`. */

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
      '“Pell first. He telegraphs everything — perfect for you. Square up and let the staff work: it swings on its own once you’re in the circle. Watch your own wind-up arc. Learn its rhythm.”',
    lesson: 'Your staff auto-swings at your mark. Casting nothing? You are still fighting.',
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
      '“So the Legion gave you fire. Understand what you were given: every Fireball feeds your Heat, and every point of Heat burns the next one hotter. Stop weaving and it bleeds away. Derrin will chant at you mid-bout — a chant is the longest tell there is. You know what to do with tells.”',
    lesson: 'Heat: +3% fire damage per point, bleeding away unfed. A chant is a tell — read it.',
  },
  {
    opponentId: 'sparhand-mavet',
    title: 'The Tempering · the boil',
    brief:
      '“Last circle. Mavet gets angrier the longer you take, so don’t take long: feed the Heat and ride it to the top. At ten, your next Fireball is a Blaze that goes through everything — and then the fire slips your grip and you start again from cold. Hear me, conscript: nobody masters the Weave. You will chase that boil your whole life.”',
    lesson: 'At 10 Heat the next Fireball pierces the line — then Heat crashes to cold.',
  },
]

/** Duels in the proving (staff only); winning the last one pays the proving
 *  bonus, which crosses Blooded — the First Weaving. */
export const PROVING_DUELS = 3

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
