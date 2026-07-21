/** The meta layer for one Expedition: Standing → Grace (teaching) → Codex →
 *  findings → Recovery. Pure UI-side state that *reacts* to the engine's
 *  combat events (events out, not callbacks in — the same law, one level up).
 *
 *  It owns the teaching gate: whatever it computes from Standing is pushed to
 *  the sim via `sim.setTaught`. The engine save stays untouched; this persists
 *  itself under its own key. */
import type { AbilityId, CombatEvent, GameSim } from '../../engine'
import type { Storagelike } from '../persistence'
import { expeditionKeyFor, type SlotId } from '../profile'
import { CAMP_DUELS, PROVING_DUELS, bonusForStep, inCamp } from './camp'
import {
  AUTO_LEARNED,
  CODEX,
  GRACE_TIERS,
  STANDING_PER_CHARGE,
  TOTAL_FINDINGS,
  standingForKill,
  taughtFor,
  tierIndexFor,
  type CodexCtx,
  type GraceTier,
} from './content'

interface ExpeditionSave {
  standing: number
  progress: Record<string, number>
  transmitted: string[]
  briefed?: boolean
  /** Kindle Yard steps completed (absent on pre-camp saves). */
  camp?: number
  /** Has the conscript taken a staff off the yard's rack? (absent on saves
   *  that predate the rack — see the migration in `load`). */
  staffTaken?: boolean
  /** Workings actually taken up (absent on saves that predate learning). */
  learned?: AbilityId[]
}

export class Expedition {
  /** the Legion's trust in you */
  standing = $state(0)
  /** objectiveId → observed count (uncapped; getters clamp to target) */
  progress: Record<string, number> = $state({})
  /** objective ids whose findings are already banked home */
  transmitted: string[] = $state([])

  /** Kindle Yard steps completed (persisted). At CAMP_DUELS.length the
   *  conscript has graduated and the world proper is open. */
  camp = $state(0)

  /** The workings actually in your hands (persisted). Standing *offers* a
   *  War-Weaving; you take it up at leisure from the Talents screen. This — not
   *  Standing — is what arms the sim. */
  learned = $state<AbilityId[]>([])

  /** bumps every time Standing is earned — drives the telemetry pulse */
  standingPulse = $state(0)
  /** newly taught abilities awaiting a teaching ceremony, or null */
  justTaught: AbilityId[] | null = $state(null)
  /** newly *offered* workings awaiting a quiet toast — never a modal, because
   *  Standing is usually crossed with a foe still swinging at you. */
  justOffered: AbilityId[] | null = $state(null)
  /** set once when the last chapter transmits — the art is recovered */
  justRecovered = $state(false)
  /** the conscript has arrived and been mustered (persisted) */
  briefed = $state(false)
  /** a practice staff has been taken off the yard's rack (persisted). Until it
   *  is, the rack panel holds the screen — the very first beat of the yard. */
  staffTaken = $state(false)
  /** set once, the moment the final duel graduates the conscript */
  justGraduated = $state(false)
  /** set once, the moment the proving is won: the Heat guide (manual page one)
   *  is owed before the Fireball ceremony — page two — can run. */
  justLecture = $state(false)

  private readonly ctx: CodexCtx = { enraged: new Set() }
  private prevTier = 0
  private readonly storage: Storagelike
  private readonly key: string

  constructor(storage: Storagelike, slot: SlotId = 1) {
    this.storage = storage
    this.key = expeditionKeyFor(slot)
    this.load()
    this.prevTier = tierIndexFor(this.standing)
  }

  // ─────────────────────────── derived ───────────────────────────

  get tierIndex(): number {
    return tierIndexFor(this.standing)
  }
  get tier(): GraceTier {
    return GRACE_TIERS[this.tierIndex]!
  }
  get nextTier(): GraceTier | null {
    return GRACE_TIERS[this.tierIndex + 1] ?? null
  }
  /** 0..1 toward the next Grace tier (1 when at the top rank). */
  get graceProgress(): number {
    const next = this.nextTier
    if (!next) return 1
    const floor = this.tier.at
    return Math.min(1, (this.standing - floor) / (next.at - floor))
  }
  /** Everything the Legion's trust has unlocked — offered, not necessarily taken. */
  offeredIds(): AbilityId[] {
    return taughtFor(this.standing)
  }
  /** The workings you actually carry. This is what arms the sim. */
  taughtIds(): AbilityId[] {
    return [...this.learned]
  }
  /** Offered but not yet taken up — waiting on the Talents screen. */
  get pendingLearns(): AbilityId[] {
    return this.offeredIds().filter((id) => !this.learned.includes(id))
  }
  get hasPendingLearns(): boolean {
    return this.pendingLearns.length > 0
  }
  /** How many workings are waiting to be taken up — the nav badge. */
  get pendingLearnCount(): number {
    return this.pendingLearns.length
  }

  /** Take up an offered working. Returns false for anything not on offer (or
   *  already carried); the caller re-arms the sim on true. */
  learn(id: AbilityId): boolean {
    if (!this.pendingLearns.includes(id)) return false
    this.learned = [...this.learned, id]
    this.save()
    return true
  }

  /** True once the given front's Grace tier has been reached. */
  frontOpen(tierIndex: number): boolean {
    return this.tierIndex >= tierIndex
  }

  /** True while the conscript is still training in the Kindle Yard — the Map
   *  and the field board stay shut until graduation. */
  get inCamp(): boolean {
    return inCamp(this.camp)
  }

  /** A camp duel was won: advance the script and pay any boundary bonus (the
   *  proving crossing Blooded is what teaches Fireball). The proving's last win
   *  also owes the Heat guide, which the UI shows *before* the ceremony.
   *  Returns any freshly learned abilities so the caller can re-arm the sim. */
  advanceCamp(): AbilityId[] | null {
    if (!this.inCamp) return null
    this.camp++
    if (this.camp === PROVING_DUELS) this.justLecture = true
    if (this.camp >= CAMP_DUELS.length) this.justGraduated = true
    const learnt = this.gainStanding(bonusForStep(this.camp))
    this.save()
    return learnt
  }
  clearGraduated(): void {
    this.justGraduated = false
  }
  clearLecture(): void {
    this.justLecture = false
  }

  /** Take a practice staff off the rack — the yard's opening beat. The sim
   *  already issued it; this only records that the conscript has it in hand. */
  takeStaff(): void {
    if (this.staffTaken) return
    this.staffTaken = true
    this.save()
  }

  /** Mark the arrival muster done. */
  markBriefed(): void {
    if (this.briefed) return
    this.briefed = true
    this.save()
  }

  countOf(id: string): number {
    return this.progress[id] ?? 0
  }
  isComplete(id: string): boolean {
    const o = CODEX.find((c) => c.id === id)
    return !!o && this.countOf(id) >= o.target
  }
  isTransmitted(id: string): boolean {
    return this.transmitted.includes(id)
  }
  canTransmit(id: string): boolean {
    return this.isComplete(id) && !this.isTransmitted(id)
  }
  /** findings banked home so far */
  get findings(): number {
    return CODEX.filter((o) => this.isTransmitted(o.id)).reduce((s, o) => s + o.findings, 0)
  }
  /** 0..1 recovery of the whole art */
  get recovery(): number {
    return TOTAL_FINDINGS === 0 ? 0 : this.findings / TOTAL_FINDINGS
  }
  get recovered(): boolean {
    return CODEX.every((o) => this.isTransmitted(o.id))
  }
  /** how many chapters are complete but not yet transmitted (a call to action) */
  get pendingTransmits(): number {
    return CODEX.filter((o) => this.canTransmit(o.id)).length
  }

  // ─────────────────────────── observation ───────────────────────────

  /** Fold one combat event into Standing + Codex. Returns the newly taught
   *  abilities when this event crossed a Grace tier (so the caller can re-arm
   *  the sim and raise the teaching banner), else null. */
  observe(e: CombatEvent): AbilityId[] | null {
    // keep the enrage set current so a kill can be credited as an enraged kill
    if (e.kind === 'enemyEnraged') this.ctx.enraged.add(e.iid)
    if (e.kind === 'encounterCleared') this.ctx.enraged.clear()

    // Codex: advance every unfinished, untransmitted chapter
    for (const o of CODEX) {
      if (this.isTransmitted(o.id)) continue
      const inc = o.count(e, this.ctx)
      if (inc > 0) this.progress[o.id] = Math.min(o.target, this.countOf(o.id) + inc)
    }

    // Standing
    let gained = 0
    if (e.kind === 'enemyDied') {
      gained += standingForKill(e.rank)
      this.ctx.enraged.delete(e.iid)
    }
    if (e.kind === 'questTurnedIn') gained += STANDING_PER_CHARGE

    return gained > 0 ? this.gainStanding(gained) : null
  }

  /** Add Standing and, if it crosses one or more Grace thresholds, *offer* the
   *  War-Weavings between them. Only AUTO_LEARNED workings (the camp's Fireball)
   *  land in your hands on the spot and raise the teaching ceremony — the rest
   *  wait quietly on the Talents screen, because a tier is usually crossed with
   *  a foe still mid-swing and a modal there is an assassination.
   *  Returns the freshly *learned* ids so the caller can re-arm the sim.
   *  The single place Standing ever grows — kills, turn-ins, and rare-clear
   *  bonuses all funnel through here. */
  private gainStanding(amount: number): AbilityId[] | null {
    if (amount <= 0) return null
    this.standing += amount
    this.standingPulse++
    let learnt: AbilityId[] | null = null
    const t = tierIndexFor(this.standing)
    if (t > this.prevTier) {
      // one or more tiers crossed at once — offer everything between
      const fresh: AbilityId[] = []
      for (let i = this.prevTier + 1; i <= t; i++) fresh.push(...GRACE_TIERS[i]!.teaches)
      this.prevTier = t
      const auto = fresh.filter((id) => AUTO_LEARNED.includes(id) && !this.learned.includes(id))
      const offered = fresh.filter((id) => !auto.includes(id) && !this.learned.includes(id))
      if (auto.length > 0) {
        this.learned = [...this.learned, ...auto]
        this.justTaught = auto
        learnt = auto
      }
      if (offered.length > 0) this.justOffered = offered
    }
    this.save()
    return learnt
  }

  /** Bonus Standing for felling a rarer sighting — a champion or the apex. */
  clearBonus(rarity: string): number {
    return rarity === 'apex' ? 60 : rarity === 'rare' ? 20 : 0
  }

  /** Bank a rare/apex clear's bonus Standing. Returns any freshly taught abilities. */
  awardClear(rarity: string): AbilityId[] | null {
    return this.gainStanding(this.clearBonus(rarity))
  }

  /** Bank a completed chapter's findings home. */
  transmit(id: string): boolean {
    if (!this.canTransmit(id)) return false
    this.transmitted = [...this.transmitted, id]
    if (this.recovered) this.justRecovered = true
    this.save()
    return true
  }

  /** Push the current teaching to the sim (called on load and after a tier up). */
  applyTo(sim: GameSim): void {
    sim.setTaught(this.taughtIds())
  }

  clearTeaching(): void {
    this.justTaught = null
  }
  clearOffered(): void {
    this.justOffered = null
  }
  clearRecovered(): void {
    this.justRecovered = false
  }

  // ─────────────────────────── persistence ───────────────────────────

  private save(): void {
    try {
      const data: ExpeditionSave = {
        standing: this.standing,
        progress: { ...this.progress },
        transmitted: [...this.transmitted],
        briefed: this.briefed,
        camp: this.camp,
        staffTaken: this.staffTaken,
        learned: [...this.learned],
      }
      this.storage.setItem(this.key, JSON.stringify(data))
    } catch {
      // storage unavailable — the run continues unsaved
    }
  }

  private load(): void {
    try {
      const raw = this.storage.getItem(this.key)
      if (!raw) return
      const data = JSON.parse(raw) as ExpeditionSave
      this.standing = Math.max(0, data.standing ?? 0)
      this.progress = { ...(data.progress ?? {}) }
      this.transmitted = [...(data.transmitted ?? [])]
      this.briefed = data.briefed === true
      // Camp migration: a save that predates the Kindle Yard was trained under
      // the old law — treat it as graduated, and floor its Standing at Blooded
      // so nobody who could already cast Fireball wakes up unable to.
      if (data.camp === undefined) {
        this.camp = this.briefed ? CAMP_DUELS.length : 0
        if (this.briefed && this.standing < GRACE_TIERS[1]!.at) this.standing = GRACE_TIERS[1]!.at
      } else {
        this.camp = Math.max(0, Math.min(data.camp, CAMP_DUELS.length))
      }
      // Rack migration: a save written before the rack existed already fought
      // with a staff in hand. Only a run still standing at the gate — no duel
      // won, not yet mustered — is offered the panel.
      this.staffTaken = data.staffTaken ?? (this.camp > 0 || this.briefed)
      // Learning migration: a save from before workings were taken up by hand
      // carried everything its Standing had reached — never take a spell away
      // from someone who already had it. Otherwise trust the stored list, but
      // clamp it to what this Standing actually offers, and make sure the camp's
      // First Weaving is in hand if it was ever handed over.
      const offered = taughtFor(this.standing)
      this.learned =
        data.learned === undefined ? [...offered] : data.learned.filter((id) => offered.includes(id))
      for (const id of AUTO_LEARNED) {
        if (offered.includes(id) && !this.learned.includes(id)) this.learned.push(id)
      }
    } catch {
      // corrupt — start the expedition fresh
    }
  }

  static wipe(storage: Storagelike, slot: SlotId = 1): void {
    try {
      storage.removeItem(expeditionKeyFor(slot))
    } catch {
      /* ignore */
    }
  }
}
