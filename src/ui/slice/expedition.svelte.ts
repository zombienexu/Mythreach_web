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
import {
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
}

export class Expedition {
  /** the Legion's trust in you */
  standing = $state(0)
  /** objectiveId → observed count (uncapped; getters clamp to target) */
  progress: Record<string, number> = $state({})
  /** objective ids whose findings are already banked home */
  transmitted: string[] = $state([])

  /** bumps every time Standing is earned — drives the telemetry pulse */
  standingPulse = $state(0)
  /** newly taught abilities awaiting a teaching ceremony, or null */
  justTaught: AbilityId[] | null = $state(null)
  /** set once when the last chapter transmits — the art is recovered */
  justRecovered = $state(false)
  /** the conscript has been handed their first orders (persisted) */
  briefed = $state(false)
  /** show the one-time arrival briefing from the sergeant */
  justBriefed = $state(false)

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
  /** the full set of abilities the world has taught so far */
  taughtIds(): AbilityId[] {
    return taughtFor(this.standing)
  }

  /** True once the given front's Grace tier has been reached. */
  frontOpen(tierIndex: number): boolean {
    return this.tierIndex >= tierIndex
  }

  /** Mark the arrival briefing done and raise its one-time card. */
  markBriefed(showCard: boolean): void {
    if (this.briefed) return
    this.briefed = true
    if (showCard) this.justBriefed = true
    this.save()
  }
  clearBriefing(): void {
    this.justBriefed = false
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

    let taught: AbilityId[] | null = null
    if (gained > 0) {
      this.standing += gained
      this.standingPulse++
      const t = tierIndexFor(this.standing)
      if (t > this.prevTier) {
        // one or more tiers crossed at once — teach everything between
        const fresh: AbilityId[] = []
        for (let i = this.prevTier + 1; i <= t; i++) fresh.push(...GRACE_TIERS[i]!.teaches)
        this.prevTier = t
        this.justTaught = fresh
        taught = fresh
      }
      this.save()
    }
    return taught
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
