/** The slice: one world, one magic system.
 *
 *  Fiction — you are a Fieldworker of the Institute, projected through the
 *  Threshold into the ancient world of the **Ember Legion**, an army that
 *  fields war-mages. You wear a conscript's life. You earn the Legion's
 *  *trust* (Standing); trust earns you *teaching* (Grace tiers hand you the
 *  next War-Weaving); using the magic fills the **Codex**; the Codex is
 *  transmitted home as **findings**, and enough findings recover the art.
 *
 *  All of this is UI-side meta. The engine only learns which abilities are
 *  taught (via `sim.setTaught`). Everything else is presentation + pacing. */
import type { AbilityId, ClassId, CombatEvent, EnemyRank } from '../../engine'

export const FACTION = {
  id: 'ember-legion',
  name: 'The Ember Legion',
  /** the warm hue the recovered world glows in, inside the cold console */
  hue: 42,
} as const

// ─────────────────────────── Standing → Grace ───────────────────────────

/** A rung of the Legion's trust. Crossing its threshold *teaches* new magic —
 *  access is Grace, not level (level still governs raw power). */
export interface GraceTier {
  key: string
  /** the rank the Legion grants you */
  name: string
  /** cumulative Standing required to reach this tier */
  at: number
  /** the War-Weaving taught the moment you reach it */
  teaches: readonly AbilityId[]
  /** one line the caster-sergeant says as they teach it */
  blurb: string
}

export const GRACE_TIERS: readonly GraceTier[] = [
  { key: 'recruit',  name: 'Recruit',           at: 0,   teaches: [],
    blurb: 'A staff, a bunk, and a name. Magic is earned here, not issued.' },
  { key: 'blooded',  name: 'Blooded',            at: 45,  teaches: ['fireball'],
    blurb: 'You proved your hands in the circle. Now they are given the spark.' },
  { key: 'hardened', name: 'Hardened',           at: 140, teaches: ['detonate'],
    blurb: 'You have laid enough fire. Now you are shown how to set it off.' },
  { key: 'trusted',  name: 'Trusted',            at: 300, teaches: ['kindle'],
    blurb: 'A faster hand for the ember — pressure without the wait.' },
  { key: 'sworn',    name: 'Sworn of the Ember',  at: 520, teaches: ['wildfire'],
    blurb: 'The Legion trusts you to spread living fire across a whole line.' },
  { key: 'ember-lord', name: 'Ember-Lord',        at: 780, teaches: ['flashpoint'],
    blurb: 'You take the oath. Now you tear your own moment out of the air.' },
  { key: 'pyre-sovereign', name: 'Pyre-Sovereign', at: 1080, teaches: ['inferno'],
    blurb: 'The whole fire answers when you call. Spend it all at once.' },
]

/** Crossing a Grace tier *offers* its War-Weaving; the conscript takes it up in
 *  their own time, from the Talents screen. These are the exceptions — workings
 *  the Legion puts in your hands whether you asked or not. Fireball is the camp's
 *  First Weaving: it is a ceremony, not a shopping trip, and the tempering duels
 *  that follow assume you are already holding it. */
export const AUTO_LEARNED: readonly AbilityId[] = ['fireball']

/** Standing paid out per felled foe, by rank. */
export function standingForKill(rank: EnemyRank): number {
  return rank === 'boss' ? 45 : rank === 'elite' ? 14 : 4
}

/** Standing paid out when a Charge (local quest) is turned in — enough that
 *  turning in your very first Charge crosses into Blooded and teaches Renew. */
export const STANDING_PER_CHARGE = 45

// ─────────────────────────── Deployments (fronts) ───────────────────────────

/** The Legion deploys you to fiercer fronts as it trusts you — a front opens at
 *  a Grace tier, so Standing gates *where* you fight as well as *what* you cast.
 *  regionId matches the engine's regions; order = escalation. */
export interface Front {
  regionId: string
  /** Grace tier index at which this front opens (see GRACE_TIERS). */
  tierIndex: number
}

export const FRONTS: readonly Front[] = [
  { regionId: 'hollowroot', tierIndex: 0 },
  { regionId: 'duskmire', tierIndex: 1 },
  { regionId: 'stormcrag', tierIndex: 2 },
  { regionId: 'ashen-wastes', tierIndex: 3 },
  { regionId: 'sundered-spire', tierIndex: 4 },
  { regionId: 'emberwall', tierIndex: 6 },
  { regionId: 'stormharrow', tierIndex: 6 },
  { regionId: 'gravecall', tierIndex: 6 },
]

/** The caster-sergeant who runs the Kindle Yard and hands you your orders. */
export const SERGEANT = 'Sergeant Vale'

/** The first true order — handed out at graduation, in the oldest tradition
 *  of every recruitment camp there has ever been: go kill six boars. */
export const FIRST_ORDER = 'q-hollow-boars'

/** The current Grace tier index for a given Standing. */
export function tierIndexFor(standing: number): number {
  let idx = 0
  for (let i = 0; i < GRACE_TIERS.length; i++) if (standing >= GRACE_TIERS[i]!.at) idx = i
  return idx
}

/** Every ability taught at or below the current Standing. */
export function taughtFor(standing: number): AbilityId[] {
  const idx = tierIndexFor(standing)
  const out: AbilityId[] = []
  for (let i = 0; i <= idx; i++) out.push(...GRACE_TIERS[i]!.teaches)
  return out
}

// ─────────────────────────────── The Codex ───────────────────────────────

/** Live context the objective predicates read (things no single event says). */
export interface CodexCtx {
  /** iids currently enraged — so a kill can be credited as an enraged kill. */
  enraged: Set<number>
}

/** One research chapter: fill the bar by *observing the magic behave*, and it
 *  transmits `findings` home. Predicates run over the engine's event stream. */
export interface CodexObjective {
  id: string
  title: string
  note: string
  target: number
  findings: number
  /** how much this event advances the objective (0 = not relevant) */
  count(e: CombatEvent, ctx: CodexCtx): number
}

/** True when a damage event was dealt *by the player's* War-Weaving. */
function playerHit(e: Extract<CombatEvent, { kind: 'damage' }>): boolean {
  return e.target === 'enemy' && e.source !== 'companion' && e.source !== 'echo'
}

export const CODEX: readonly CodexObjective[] = [
  {
    id: 'kindling', title: 'Kindling', note: 'Record the lingering burn — Smolder ticking on the living.',
    target: 40, findings: 8,
    count: (e) => (e.kind === 'damage' && e.source === 'smolder' && e.target === 'enemy' ? 1 : 0),
  },
  {
    id: 'overload', title: 'Overload', note: 'Capture the moment the fire doubles over — a critical strike.',
    target: 15, findings: 8,
    count: (e) => (e.kind === 'damage' && e.crit && playerHit(e) ? 1 : 0),
  },
  {
    id: 'detonation', title: 'Detonation', note: 'Cash in a built field. Detonate Smolder on a foe.',
    target: 8, findings: 12,
    count: (e) => (e.kind === 'smolderDetonated' ? 1 : 0),
  },
  {
    id: 'silence', title: 'Silence', note: 'Read a hostile chant and cut it short. Focus an interrupt.',
    target: 5, findings: 10,
    count: (e) => (e.kind === 'interrupted' ? 1 : 0),
  },
  {
    id: 'cornered', title: 'Cornered Flame', note: 'Fell a foe while it rages — the Weave under pressure.',
    target: 3, findings: 12,
    count: (e, ctx) => (e.kind === 'enemyDied' && ctx.enraged.has(e.iid) ? 1 : 0),
  },
  {
    id: 'sweep', title: 'Field Sweep', note: 'Clear whole packs. Prove the art holds a line.',
    target: 12, findings: 10,
    count: (e) => (e.kind === 'encounterCleared' ? 1 : 0),
  },
]

/** Total findings the Codex can yield — the denominator of Recovery. */
export const TOTAL_FINDINGS = CODEX.reduce((s, o) => s + o.findings, 0)

/** The starting identity for the slice — a War-Weaver of the Ember Legion.
 *  (No character-creation ceremony in the slice: one system, one life.) */
export const SLICE_IDENTITY = { classId: 'arcanist', originId: 'ashmarch-survivor', signId: 'tower' } as const

// ─────────────────────────── The opening sequence ───────────────────────────

/** Cold calibration readouts the Threshold prints as it spins up — the short
 *  animated intro before the lore rolls. */
export const INTRO_LINES: readonly string[] = [
  'Threshold reactor — spun up',
  'Consciousness lattice — bound',
  'Deep-time anchor — seeking',
]

/** The rolling lore, narrated by the Institute to a Fieldworker who has just
 *  woken on the uplink. Recovers the fiction from the Fieldworker's first
 *  second of consciousness through to "the uplink is yours." */
export const LORE_LINES: readonly string[] = [
  'Fieldworker. You are awake. Read while the anchor sets.',
  'Magic was real, once — a force the old worlds ran on, and lost when those worlds fell out of reach.',
  'We are the Institute. We cannot send a body into the deep past. We can send a mind.',
  'The Threshold seats your consciousness inside a life the era will accept. The locals will see one of their own.',
  'Your assignment is a world we name the Ember Legion — an army that fields war-mages on the open line.',
  'You will wear a conscript’s life. You will earn the Legion’s trust, and trust is how the art is taught.',
  'Every working you witness, you record. A full Codex, transmitted home, is one lost art recovered.',
  'You are one Fieldworker among thousands. Learn to belong — so that you can learn to leave.',
  'Anchor set. The uplink is yours.',
]

/** The first Codex quest — the Institute's standing directive, granted the
 *  moment the opening sequence ends and shown as a received plaque. It tracks
 *  the Recovery meta already modelled by the Expedition (findings → recovery). */
export const CODEX_DIRECTIVE = {
  code: 'CDX-001',
  giver: 'The Institute',
  title: 'Recover the War-Weaving',
  objective: 'Observe every chapter of the art and transmit the Codex home.',
  note: 'Your standing directive. Fill the Codex in the field; the Recovery advances with every finding you send back.',
} as const

// ─────────────────────────── The world-select station ───────────────────────────

/** A world the Fieldworker might be projected into. One world == one magic
 *  system == one calling. Only the open world can be entered in this slice;
 *  the rest are rumoured, their anchors not yet triangulated. */
export interface WorldOption {
  code: string
  /** the magic system recovered from the world */
  system: string
  /** the place, and its people */
  world: string
  /** how you are inserted and taught */
  frame: string
  /** one-line hook */
  teaser: string
  status: 'open' | 'locked'
  /** the engine calling this world seats you as — null while locked */
  classId: ClassId | null
  /** the hue the console relights in for this world */
  hue: number
}

export const WORLDS: readonly WorldOption[] = [
  {
    code: 'RA-01',
    system: 'War-Weaving',
    world: 'The Ember Legion',
    frame: 'Conscript',
    teaser: 'Battlefield evocation, learned on the line from a caster-sergeant, by surviving.',
    status: 'open',
    classId: SLICE_IDENTITY.classId,
    hue: FACTION.hue,
  },
  {
    code: 'RA-02',
    system: 'Necrologue',
    world: 'The Ossuary Reach',
    frame: 'Initiate',
    teaser: 'Forbidden death-accounting, traded in a grave-cult underground. Anchor not yet triangulated.',
    status: 'locked',
    classId: null,
    hue: 300,
  },
  {
    code: 'RA-03',
    system: 'The Green Rite',
    world: 'The Loamward Wood',
    frame: 'Supplicant',
    teaser: 'Druidic life-magic of a temple-folk. Signal too faint to hold a projection.',
    status: 'locked',
    classId: null,
    hue: 140,
  },
  {
    code: 'RA-██',
    system: 'Horology',
    world: '▓▓▓▓▓▓',
    frame: '—',
    teaser: 'Time-debt magic that resonates with the Threshold itself. Existence inferred, not confirmed.',
    status: 'locked',
    classId: null,
    hue: 210,
  },
]

// ─────────────────────────── First-world arrival ───────────────────────────

/** The caster-sergeant's greeting at the camp gate — the drill instructor who
 *  owns every conscript's first days before the game proper begins. */
export const ARRIVAL = {
  place: 'The Ember Legion · the Kindle Yard, recruitment camp',
  instructor: SERGEANT,
  greeting:
    '“New blood. The anchor’s set and you’re standing in my yard now — good. See that staff in your hands? Wood. That’s all you rate until you’ve proven the hands holding it. Nobody in this Legion is handed the Weave; it is earned in the circle. Three of your fellow trainees are waiting there. Best them, and we’ll talk about fire.”',
} as const
