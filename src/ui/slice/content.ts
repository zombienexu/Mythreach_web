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
import type { AbilityId, CombatEvent, EnemyRank } from '../../engine'

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
  { key: 'recruit',  name: 'Recruit',           at: 0,   teaches: ['fireball'],
    blurb: 'A conscript is handed a spark and a name. Do not die with them.' },
  { key: 'blooded',  name: 'Blooded',            at: 45,  teaches: ['detonate'],
    blurb: 'You have laid enough fire. Now you are shown how to set it off.' },
  { key: 'hardened', name: 'Hardened',           at: 140, teaches: ['kindle'],
    blurb: 'A faster hand for the ember — pressure without the wait.' },
  { key: 'trusted',  name: 'Trusted',            at: 300, teaches: ['wildfire'],
    blurb: 'The Legion trusts you to spread living fire across a whole line.' },
  { key: 'sworn',    name: 'Sworn of the Ember',  at: 520, teaches: ['flashpoint'],
    blurb: 'You take the oath. Now you tear your own moment out of the air.' },
  { key: 'ember-lord', name: 'Ember-Lord',        at: 780, teaches: ['inferno'],
    blurb: 'The whole fire answers when you call. Spend it all at once.' },
]

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
]

/** The caster-sergeant who hands you your orders. */
export const SERGEANT = 'Sergeant Vale'

/** The first order every conscript is handed the moment they arrive. */
export const FIRST_ORDER = 'q-hollow-cull'

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
