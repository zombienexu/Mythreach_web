import {
  ABILITIES,
  ABILITY_EFFECTS,
  ABILITY_IDS,
  AFTERIMAGE_DURATION_TICKS,
  AFTERIMAGE_SWING_TICKS,
  CARD_IDS,
  CARDS,
  CATARACT_PCT,
  COMBUSTION_CRIT_BONUS,
  COMBUSTION_FIRE_BONUS_PCT,
  DOORWAY_DAMAGE_BONUS_PCT,
  DOORWAY_FREEZE_TICKS,
  ECHO_DURATION_TICKS,
  ECHO_SWING_TICKS,
  FINAL_CHAPTER_MAX_PER_PAGE,
  FINAL_CHAPTER_MIN_PER_PAGE,
  FOLD_MAX_PER_CARD,
  FOLD_MIN_PER_CARD,
  HOUSE_RULES_CRIT_BONUS,
  PHASE_EDGE_MAX_PER_CHARGE,
  PHASE_EDGE_MIN_CHARGES,
  PHASE_EDGE_MIN_PER_CHARGE,
  REWIND_HEAL_PCT,
  RIFT_TEAR_SPLASH_PCT,
  STASIS_FREEZE_TICKS,
  // ── the Arcanist's fire ──
  DETONATE_PER_STACK,
  FIREBALL_SPLASH_PCT,
  FLASHPOINT_TICKS_PER_HEAT,
  FOCUS_CD_TICKS,
  FOCUS_WHIFF_CD_TICKS,
  HEAT_EMPOWERED_AT,
  HEAT_MAX,
  HEAT_OPENING_BONUS,
  HEAT_OVERHEAT_AT,
  HEAT_PER_DETONATE,
  HEAT_PER_FIREBALL,
  HEAT_PER_KINDLE,
  INFERNO_PER_HEAT,
  INFERNO_PER_SMOLDER,
  OPENING_DMG_PCT,
  OPENING_TICKS,
  SMOLDER_BURN,
  SMOLDER_MAX,
  SMOLDER_DURATION_TICKS,
  SMOLDER_TICK_TICKS,
  WILDFIRE_SEED_STACKS,
  WILDFIRE_SPREAD_PCT,
  type AbilityEffect,
} from './abilities'
import { ACHIEVEMENT_BY_ID } from './content/achievements'
import { CLASS_KITS, type ClassKit } from './content/classes'
import { COMPANIONS } from './content/companions'
import { generateItem, sellValue } from './content/items'
import { DEFAULT_CONTENT } from './content/regions'
import { TALENTS } from './content/talents'
import { WORLD_BOSS, WORLD_BOSS_MAX_HP } from './content/worldboss'
import { Dot } from './dot'
import { EnemyUnit, smolderBandOf } from './enemyUnit'
import type { CombatEvent, DamageSource } from './events'
import { PlayerUnit, type TimedBuffId } from './playerUnit'
import {
  abilitiesUnlockedAt,
  castTicksFor,
  deriveStats,
  talentPointsEarned,
  talentPointsSpent,
  unlockedAbilities,
  xpToNext,
} from './progression'
import { pickOne, pickWeighted, rollInt, rollPct, type Rng } from './rng'
import type {
  AbilityId,
  CardId,
  ClassResourceSnapshot,
  CombatSnapshot,
  ContentPack,
  DerivedStats,
  EncounterSlot,
  EnemyDef,
  HeroIdentity,
  Item,
  ItemSlot,
  LifetimeStats,
  LootBundle,
  MaterialStackView,
  ProgressSnapshot,
  QuestState,
  QuestView,
  Rarity,
  Records,
  RegionDef,
  RegionProgress,
  SaveData,
  School,
  SmolderBand,
  TalentId,
} from './types'
import {
  AUTO_REST_TICKS,
  DEFAULT_IDENTITY,
  HAND_SIZE_BASE,
  INVENTORY_CAP,
  LEDGER_CAP_BASE,
  LEVEL_CAP,
  MAX_ACTIVE_QUESTS,
  PLAYER_RESPAWN_TICKS,
  RECKONING_INTERVAL_TICKS,
  RECKONING_RATE_PCT,
  REGEN_INTERVAL_TICKS,
  RESPEC_COST,
  RIFT_CHARGE_CAP_BASE,
} from './types'

export interface SimOptions {
  content?: ContentPack
  /** Required: the engine owns no wall clock and no ambient randomness. The UI
   *  passes the platform PRNG; tests pass a seeded `mulberry32`. */
  rng: Rng
  /** Who this hero is. Defaults to a signless, originless Arcanist — every
   *  save that predates the callings. */
  identity?: HeroIdentity
}

/** The whole game: pure, synchronous, integer-tick simulation of combat AND
 *  progression. Events are buffered and returned from the tick() that surfaces
 *  them, so the UI drains exactly one array per tick. */
export class GameSim {
  private tickCount = 0
  private readonly content: ContentPack
  private readonly rng: Rng
  private identity: HeroIdentity
  private kit: ClassKit

  // ── progression ──
  private level = 1
  private xp = 0
  private gold = 0
  private talents: Partial<Record<TalentId, number>> = {}
  private equipped: Partial<Record<ItemSlot, Item>> = {}
  private inventory: Item[] = []
  private nextUid = 1
  private region: RegionDef
  /** Inert crafting materials: materialId → count. */
  private materials: Record<string, number> = {}
  /** Accepted quests: questId → progress toward the objective count. */
  private questProgress: Record<string, number> = {}
  private readonly completedQuests = new Set<string>()
  private readonly achievements = new Set<string>()
  private lifetime: LifetimeStats = {
    kills: 0,
    deaths: 0,
    goldEarned: 0,
    interrupts: 0,
    epicsFound: 0,
    bossKills: 0,
  }
  private records: Records = {
    worldBossFells: 0,
    bestAssaultDamage: 0,
  }
  autoBattle = false

  /** Grace-gated teaching (the redesign): when non-null, an ability is usable
   *  only if the world has *taught* it — access is decoupled from level, which
   *  now governs only power. Null = legacy level-gated behavior, so every
   *  existing save and test is unaffected. Owned/persisted by the meta layer;
   *  re-applied on load via {@link setTaught}. */
  private taught: Set<AbilityId> | null = null

  // ── phase ──
  /** idle: waiting for the player to start a fight. combat: a pack is live.
   *  looting: the pack is down, corpses hold their spoils. assault: world boss. */
  private phase: 'idle' | 'combat' | 'looting' | 'assault' = 'idle'

  // ── world boss (scaffold) ──
  private worldBossHp = WORLD_BOSS_MAX_HP

  // ── companion (scaffold) ──
  private companionId: string | null = null
  private companionSwing = 0

  // ── combat ──
  private stats: DerivedStats
  private readonly player: PlayerUnit
  /** The current pack. Corpses stay (holding loot) until the field settles. */
  private enemies: EnemyUnit[] = []
  /** iid of the targeted enemy. Always a living enemy while any are alive. */
  private targetIid: number | null = null
  private nextIid = 1
  /** Idle breather countdown — only auto-battle waits on it before the next fight. */
  private restIn = 0
  private pending: CombatEvent[] = []
  /** Set for exactly one damage roll when a Hot Streak makes Pyroblast a
   *  guaranteed crit; the roll reads and clears it. */
  private forceCritNext = false

  constructor(opts: SimOptions) {
    this.content = opts.content ?? DEFAULT_CONTENT
    this.rng = opts.rng
    this.identity = { ...DEFAULT_IDENTITY, ...opts.identity }
    this.kit = CLASS_KITS[this.identity.classId]
    const first = this.content.regions[0]
    if (!first) throw new Error('content pack has no regions')
    this.region = first
    this.stats = deriveStats(this.identity, this.level, this.talents, this.equipped)
    this.player = new PlayerUnit(this.stats)
  }

  // ─────────────────────── class mechanic dials ───────────────────────

  private get ledgerCap(): number {
    return LEDGER_CAP_BASE + (this.stats.mods.ledgerCap ?? 0)
  }

  private get handSize(): number {
    return HAND_SIZE_BASE + (this.stats.mods.extraDraw ?? 0)
  }

  private get chargeCap(): number {
    return RIFT_CHARGE_CAP_BASE + (this.stats.mods.chargeCap ?? 0)
  }

  private drawHand(): CardId[] {
    const cards: CardId[] = []
    for (let i = 0; i < this.handSize; i++) {
      cards.push(
        pickWeighted(
          this.rng,
          CARD_IDS.map((id) => ({ value: id, weight: CARDS[id].weight })),
        ),
      )
    }
    return cards
  }

  /** Per-fight class state: the deadline resets, the hand is dealt fresh,
   *  the charges drain, the Tower's grace returns. Pages persist — they are
   *  the ledger's whole point. */
  private resetFightState(): void {
    const p = this.player
    p.cheatedDeath = false
    p.heat = 0
    p.focusCd = 0
    p.lastHitTaken = 0
    p.debt = 0
    p.reckoningIn = RECKONING_INTERVAL_TICKS
    p.charges = 0
    p.doorwayTarget = null
    if (this.kit.resource === 'hand') p.hand = this.drawHand()
  }

  /** Start the next fight: mostly a normal encounter, occasionally an elite.
   *  Spawns immediately — the click is the countdown. */
  startFight(): boolean {
    if (this.phase !== 'idle' || !this.player.alive) return false
    const elite = this.region.eliteEncounters.length > 0 && rollPct(this.rng, 12)
    const table = elite ? this.region.eliteEncounters : this.region.encounters
    const slots: EncounterSlot[] = pickWeighted(
      this.rng,
      table.map((e) => ({ value: e.slots, weight: e.weight })),
    )
    this.enemies = slots.map(
      (s) => new EnemyUnit(this.enemyDef(s.enemyId), this.nextIid++, s.row ?? 'front'),
    )
    this.phase = 'combat'
    this.resetFightState()
    this.autoTarget()
    for (const e of this.enemies) {
      this.push({
        kind: 'enemySpawned',
        iid: e.iid,
        defId: e.def.id,
        name: e.def.name,
        rank: e.def.rank,
        intro: e.def.intro,
      })
    }
    return true
  }

  private enemyDef(id: string): EnemyDef {
    const def = this.content.enemies[id]
    if (!def) throw new Error(`unknown enemy: ${id}`)
    return def
  }

  // ─────────────────────── targeting ───────────────────────

  private get living(): EnemyUnit[] {
    return this.enemies.filter((e) => e.combatant.alive)
  }

  /** The targeted enemy, if it's alive. */
  private get target(): EnemyUnit | null {
    return this.enemies.find((e) => e.iid === this.targetIid && e.combatant.alive) ?? null
  }

  /** Front row falls first: when a target dies, the next front mob steps up. */
  private autoTarget(): void {
    const living = this.living
    const next = living.find((e) => e.row === 'front') ?? living[0] ?? null
    this.targetIid = next?.iid ?? null
  }

  /** Point your spells at a specific living enemy. */
  setTarget(iid: number): boolean {
    const e = this.enemies.find((x) => x.iid === iid && x.combatant.alive)
    if (!e || this.targetIid === iid) return false
    this.targetIid = iid
    return true
  }

  /** Tab: next living enemy in field order (wraps). */
  cycleTarget(): boolean {
    const living = this.living
    if (living.length < 2) return false
    const i = living.findIndex((e) => e.iid === this.targetIid)
    this.targetIid = living[(i + 1) % living.length]!.iid
    return true
  }

  // ─────────────────────────── tick ───────────────────────────

  /** Advance exactly one tick; returns every event it produced. */
  tick(): CombatEvent[] {
    this.tickCount++
    const p = this.player

    // Cooldowns/buff timers first, so anything set later this tick keeps its full duration.
    for (const id of ABILITY_IDS) {
      if (p.cooldowns[id] > 0) p.cooldowns[id]--
    }
    if (p.gcd > 0) p.gcd--
    if (p.focusCd > 0) p.focusCd--
    if (p.combustion > 0) {
      p.combustion--
      if (p.combustion === 0) this.push({ kind: 'buffExpired', id: 'combustion' })
    }
    for (const [id, remaining] of p.buffs) {
      if (remaining <= 0) continue
      p.buffs.set(id, remaining - 1)
      if (remaining - 1 === 0) {
        p.buffs.delete(id)
        if (id === 'doorway') p.doorwayTarget = null
        this.push({ kind: 'buffExpired', id })
      }
    }
    if (p.shield) {
      p.shield.remaining--
      if (p.shield.remaining <= 0) {
        p.shield = null
        this.push({ kind: 'buffExpired', id: 'barrier' })
      }
    }

    if (!p.alive) {
      p.respawnIn--
      if (p.respawnIn <= 0) this.revivePlayer()
      return this.drain()
    }

    // Mana flows back on the interval clock.
    p.regenElapsed++
    if (p.regenElapsed >= REGEN_INTERVAL_TICKS) {
      p.regenElapsed = 0
      p.mana = Math.min(this.stats.maxMana, p.mana + this.stats.regenPerInterval)
      // You catch your breath between fights — flesh knits back a little in
      // idle and on the loot screen. There is no such mercy mid-fight.
      if (this.phase === 'idle' || this.phase === 'looting') {
        p.combatant.heal(Math.max(1, Math.round((p.combatant.maxHp * 8) / 100)))
      }
    }

    // The idle breather auto-battle waits out before wading back in.
    if (this.phase === 'idle' && this.restIn > 0) this.restIn--

    // Player cast progress.
    if (p.cast !== null) {
      p.cast.elapsed++
      if (p.cast.elapsed >= p.cast.total) {
        const id = p.cast.id
        p.cast = null
        this.resolveCast(id)
      }
    }

    // Queued ability fires the moment both cast and GCD clear.
    if (p.cast === null && p.gcd === 0 && p.queued !== null) {
      const q = p.queued
      if (this.canStart(q)) {
        p.queued = null
        this.startAbility(q)
      } else if (!this.queueStillValid(q)) {
        p.queued = null
      }
    }

    // The Hourwarden's deadline. It only collects mid-fight — the debt is a
    // combat debt, and surviving to the bell means the borrowing was free.
    if (this.kit.resource === 'debt' && (this.phase === 'combat' || this.phase === 'assault')) {
      p.reckoningIn--
      if (p.reckoningIn <= 0) {
        p.reckoningIn = RECKONING_INTERVAL_TICKS
        if (p.debt > 0) {
          const relief = this.stats.mods.reckoningReliefPct ?? 0
          const due = Math.max(
            1,
            Math.round((p.debt * RECKONING_RATE_PCT * Math.max(0, 100 - relief)) / 10_000),
          )
          p.debt = 0
          this.push({ kind: 'reckoning', amount: due })
          this.damagePlayer(due, 'reckoning', 'The Reckoning')
          if (!p.alive) return this.drain()
        }
      }
    }

    // Venom on the hero.
    if (p.venom) {
      const venomName = p.venom.name
      const due = p.venom.tick()
      if (!p.venom.active) p.venom = null
      if (due > 0) {
        this.damagePlayer(due, 'venom', venomName)
        if (!p.alive) return this.drain()
      }
    }

    // The raised ally swings on its own clock.
    this.echoSwing()

    // Enemy phase: every living mob in the pack acts. Iterate over a copy —
    // a death can clear the whole array mid-loop when the pack goes down.
    for (const e of [...this.enemies]) {
      if (!e.combatant.alive) continue

      // The hero's affliction burns whether or not the mob can act — and under
      // Wildswell the whole garden ticks double-time.
      if (e.bane) {
        const banePasses = p.hasBuff('wildswell') ? 2 : 1
        let died = false
        for (let pass = 0; pass < banePasses && e.bane; pass++) {
          const source = (e.baneSource ?? 'smolder') as DamageSource
          const due = e.bane.tick()
          if (!e.bane.active) {
            e.bane = null
            e.baneSource = null
            e.chillPct = 0
          }
          if (due > 0) {
            const dealt = e.combatant.damage(due)
            if (dealt > 0) {
              this.push({ kind: 'damage', target: 'enemy', iid: e.iid, amount: dealt, absorbed: 0, crit: false, source })
            }
            if (!e.combatant.alive) {
              this.onEnemyKilled(e)
              died = true
              break
            }
            if (e.checkEnrage()) this.push({ kind: 'enemyEnraged', iid: e.iid, name: e.def.name })
          }
        }
        if (died) continue
      }

      // The Arcanist's Smolder ages and licks at the foe whether or not it can
      // act — and a mature enough field can burn a mob down on its own.
      if (e.smolder.length > 0) {
        if (this.tickSmolder(e)) continue
      }
      // An Opening is a fleeting thing.
      if (e.opening > 0) {
        e.opening--
        if (e.opening === 0) e.telling = false
      }

      // Outside time: no swings, no spells, a cast in flight simply holds.
      if (e.frozen > 0) {
        e.frozen--
        continue
      }

      // Read the foe: the moment a tell opens is worth announcing (once).
      const tell = e.tellOpen
      if (tell && !e.telling) this.push({ kind: 'tellOpened', iid: e.iid })
      e.telling = tell

      if (e.cast) {
        // Hardcast winds up; no swings while casting.
        e.cast.elapsed++
        if (e.cast.elapsed >= e.cast.mech.castTicks) {
          const mech = e.cast.mech
          e.cast = null
          e.castCooldown = mech.cooldownTicks
          this.damagePlayer(rollInt(this.rng, mech.dmgMin, mech.dmgMax), 'enemyCast', mech.name, e.iid)
          if (!p.alive) return this.drain()
        }
      } else {
        const hc = e.hardcastMech
        if (hc) {
          e.castCooldown--
          if (e.castCooldown <= 0) {
            e.cast = { mech: hc, elapsed: 0 }
            this.push({ kind: 'enemyCastStarted', iid: e.iid, name: hc.name })
          }
        }
        if (e.cast === null) {
          e.swingElapsed++
          if (e.swingElapsed >= e.swingTicks) {
            e.swingElapsed = 0
            const [min, max] = e.dmgRange
            this.damagePlayer(rollInt(this.rng, min, max), 'enemySwing', undefined, e.iid)
            if (!p.alive) return this.drain()
          }
        }
      }

      const vm = e.venomMech
      if (vm) {
        e.venomTimer--
        if (e.venomTimer <= 0) {
          e.venomTimer = vm.everyTicks
          p.venom = new Dot(vm.name, vm.tickDamage, vm.intervalTicks, vm.tickCount)
          this.push({ kind: 'dotApplied', target: 'player', iid: e.iid, name: vm.name })
        }
      }
    }

    this.companionSwing_(p.alive)

    return this.autoThenDrain()
  }

  /** The exhumed echo / afterimage: swings at your target, takes no damage,
   *  and fades on its timer. */
  private echoSwing(): void {
    const p = this.player
    const echo = p.echo
    if (!echo) return
    echo.remaining--
    if (echo.remaining <= 0) {
      p.echo = null
      return
    }
    if (this.living.length === 0 || this.target === null || !p.alive) {
      echo.swingElapsed = 0
      return
    }
    echo.swingElapsed++
    if (echo.swingElapsed < echo.swingTicks) return
    echo.swingElapsed = 0
    const amount = Math.max(1, this.rollRange(echo.dmgMin, echo.dmgMax))
    this.damageEnemy(amount, false, 'echo')
  }

  /** The hireling swings on its own clock at your current target, in any combat
   *  (battle/elite/boss/assault). It never crits and takes no damage. Idle — and
   *  timer reset — the moment there is nothing to hit. */
  private companionSwing_(playerAlive: boolean): void {
    if (this.companionId === null || this.living.length === 0 || !playerAlive) {
      this.companionSwing = 0
      return
    }
    const comp = COMPANIONS[this.companionId]
    if (!comp || this.target === null) return
    this.companionSwing++
    if (this.companionSwing < comp.swingTicks) return
    this.companionSwing = 0
    const d = Math.max(1, comp.baseDmg + comp.dmgPerLevel * this.level)
    const amount = Math.max(1, rollInt(this.rng, d - 2, d + 2))
    this.damageEnemy(amount, false, 'companion')
  }

  private autoThenDrain(): CombatEvent[] {
    if (this.autoBattle) this.autoAct()
    return this.drain()
  }

  // ─────────────────────── abilities ───────────────────────

  /** "Would this ability be accepted right now?" — queueing counts as accepted,
   *  so an active cast or GCD does not make this false. */
  /** Set the taught-ability gate (the redesign's Grace teaching). Pass the
   *  full set the world has taught so far; passing an empty iterable teaches
   *  nothing, `null` restores legacy level-gating. Only kit abilities matter. */
  setTaught(ids: Iterable<AbilityId> | null): void {
    this.taught = ids === null ? null : new Set(ids)
  }

  /** The abilities currently usable-by-teaching (for the meta layer / UI).
   *  Falls back to the level-unlocked set when teaching isn't in force. */
  get taughtAbilities(): AbilityId[] {
    if (this.taught) return this.kit.abilities.filter((id) => this.taught!.has(id))
    return unlockedAbilities(this.identity.classId, this.level)
  }

  canUse(id: AbilityId): boolean {
    const def = ABILITIES[id]
    const p = this.player
    if (def.classId !== this.kit.id) return false
    if (!p.alive) return false
    // Grace-gated teaching decouples access from level; legacy saves keep the
    // level gate. Either way, an untaught / not-yet-unlocked spell is refused.
    if (this.taught) {
      if (!this.taught.has(id)) return false
    } else if (this.level < def.unlockLevel) {
      return false
    }
    if (p.cooldowns[id] > 0) return false
    if (p.mana < def.manaCost) return false
    if (def.offensive && this.target === null) return false
    // Class-resource gates: no page, no rite; no charge, no edge.
    switch (id) {
      // ── arcanist ──
      case 'detonate':
        return (this.target?.smolder.length ?? 0) >= 1
      case 'flashpoint':
        return p.heat >= 1
      case 'inferno':
        return p.heat >= 1 || (this.target?.smolder.length ?? 0) >= 1
      case 'lastRites':
      case 'finalChapter':
        return p.pages >= 1
      case 'exhume':
        return p.pages >= 1 && p.buried !== null
      case 'rewindWound':
        return p.lastHitTaken > 0
      case 'phaseEdge':
        return p.charges >= PHASE_EDGE_MIN_CHARGES
      case 'foldTheWorld':
        return p.hand.length >= 1
      case 'verdantCataract':
        return this.target?.bane?.active === true && this.target.baneSource === 'sowBriar'
      default:
        return true
    }
  }

  /** Start, queue, or resolve an ability. Returns false when refused outright. */
  useAbility(id: AbilityId): boolean {
    if (!this.canUse(id)) return false
    const def = ABILITIES[id]
    const p = this.player
    if (def.offGcd) {
      // Counterspell / Stasis: fires immediately, even mid-cast.
      p.mana = Math.max(0, p.mana - def.manaCost)
      p.cooldowns[id] = def.cooldownTicks
      this.applyEffect(id)
      return true
    }
    if (p.cast !== null || p.gcd > 0) {
      if (p.queued !== id) {
        p.queued = id
        this.push({ kind: 'abilityQueued', abilityId: id })
      }
      return true
    }
    this.startAbility(id)
    return true
  }

  private canStart(id: AbilityId): boolean {
    return this.player.cast === null && this.player.gcd === 0 && this.canUse(id)
  }

  private queueStillValid(id: AbilityId): boolean {
    const def = ABILITIES[id]
    if (!this.player.alive) return false
    if (def.offensive && this.target === null) return false
    return true
  }

  private startAbility(id: AbilityId): void {
    const def = ABILITIES[id]
    const p = this.player
    p.gcd = this.stats.gcdTicks
    const castTicks = castTicksFor(this.stats, id)
    if (castTicks > 0) {
      p.cast = { id, elapsed: 0, total: castTicks }
      this.push({ kind: 'castStarted', abilityId: id })
    } else {
      p.mana = Math.max(0, p.mana - def.manaCost)
      p.cooldowns[id] = def.cooldownTicks
      this.applyEffect(id)
    }
  }

  private resolveCast(id: AbilityId): void {
    const def = ABILITIES[id]
    const p = this.player
    // Cooldowns start when the ability resolves — including fizzles. A cast
    // whose target died mid-flight lands on the auto-picked next target; it
    // only fizzles when the whole field is empty.
    p.cooldowns[id] = def.cooldownTicks
    if (def.offensive && this.target === null) {
      // Fizzles refund the mana: it was never spent.
      this.push({ kind: 'castFizzled', abilityId: id })
      return
    }
    p.mana = Math.max(0, p.mana - def.manaCost)
    this.push({ kind: 'castFinished', abilityId: id })
    this.applyEffect(id)
  }

  /** rollInt, unless House Rules is in effect — then every roll is its max. */
  private rollRange(min: number, max: number): number {
    if (this.player.hasBuff('houseRules')) return max
    return rollInt(this.rng, min, max)
  }

  private critChance(school: School): number {
    let chance = this.stats.critPct
    if (school === 'fire' && this.player.combustion > 0) chance += COMBUSTION_CRIT_BONUS
    if (this.player.hasBuff('houseRules')) chance += HOUSE_RULES_CRIT_BONUS
    return chance
  }

  private rollSpell(min: number, max: number, school: School): { amount: number; crit: boolean } {
    let amount = Math.round((this.rollRange(min, max) * (100 + this.stats.power)) / 100)
    let pct = 100 + (this.stats.schoolBonusPct[school] ?? 0)
    if (school === 'fire' && this.player.combustion > 0) pct += COMBUSTION_FIRE_BONUS_PCT
    amount = Math.round((amount * pct) / 100)
    // A Hot Streak Pyroblast is a guaranteed crit — consumed here, once.
    let crit = rollPct(this.rng, this.critChance(school))
    if (this.forceCritNext) {
      crit = true
      this.forceCritNext = false
    }
    if (crit) amount = Math.round((amount * 7) / 4)
    return { amount, crit }
  }

  /** Is an ability unlocked to the hero — by teaching (the slice) or by level
   *  (legacy)? Used by Heat to know whether Pyroblast is the Hot Streak payoff. */
  private available(id: AbilityId): boolean {
    if (this.taught) return this.taught.has(id)
    return this.level >= ABILITIES[id].unlockLevel
  }

  // ═══════════════════ The Arcanist's fire: Heat, Smolder, Focus ═══════════════════

  /** The band Heat sits in — drives Fireball's evolution and the gauge. */
  private heatBand(heat = this.player.heat): 'cold' | 'empowered' | 'overheat' {
    if (heat >= HEAT_OVERHEAT_AT) return 'overheat'
    if (heat >= HEAT_EMPOWERED_AT) return 'empowered'
    return 'cold'
  }

  /** Bank Heat (capped at 10), announcing the moment it climbs a band. */
  private heatGain(n: number): void {
    const p = this.player
    if (n <= 0 || this.kit.id !== 'arcanist') return
    const before = p.heat
    p.heat = Math.min(HEAT_MAX, p.heat + n)
    if (p.heat === before) return
    const now = this.heatBand(p.heat)
    this.push({
      kind: 'heatChanged',
      heat: p.heat,
      band: now,
      crossedUp: now !== this.heatBand(before) && now !== 'cold',
    })
  }

  /** Spend all Heat back to cold (Flashpoint, Inferno). */
  private spendAllHeat(): number {
    const p = this.player
    const spent = p.heat
    if (spent > 0) {
      p.heat = 0
      this.push({ kind: 'heatChanged', heat: 0, band: 'cold', crossedUp: false })
    }
    return spent
  }

  /** Lay `n` Smolder on a living foe, announcing the new total. */
  private applySmolder(e: EnemyUnit, n: number, spread = false): void {
    if (!e.combatant.alive) return
    const added = e.addSmolder(n)
    if (added > 0) this.push({ kind: 'smolderApplied', iid: e.iid, stacks: e.smolder.length, spread })
  }

  /** Age a foe's Smolder one tick: mature the stacks, drop the burned-out ones,
   *  and deal the lingering burn on cadence. Returns true if the foe died. */
  private tickSmolder(e: EnemyUnit): boolean {
    for (let i = e.smolder.length - 1; i >= 0; i--) {
      e.smolder[i]!++
      if (e.smolder[i]! >= SMOLDER_DURATION_TICKS) e.smolder.splice(i, 1)
    }
    if (e.smolder.length === 0) {
      e.smolderBurnTimer = 0
      return false
    }
    e.smolderBurnTimer++
    if (e.smolderBurnTimer < SMOLDER_TICK_TICKS) return false
    e.smolderBurnTimer = 0
    let base = 0
    for (const age of e.smolder) base += SMOLDER_BURN[smolderBandOf(age)]
    const amount = Math.max(1, Math.round((base * (100 + this.stats.power)) / 100))
    this.damageEnemyUnit(e, amount, false, 'smolder')
    return !e.combatant.alive
  }

  /** Cash in every Smolder on a foe: older embers hit far harder. Returns the
   *  damage dealt. Wildfire (once learned) leaps the fire to the rest of the pack. */
  private detonateSmolder(e: EnemyUnit, source: AbilityId): number {
    if (e.smolder.length === 0) return 0
    const stacks = e.smolder.length
    const band = e.hottestBand ?? 'fresh'
    let base = 0
    for (const age of e.smolder) base += DETONATE_PER_STACK[smolderBandOf(age)]
    e.smolder = []
    e.smolderBurnTimer = 0
    this.push({ kind: 'smolderDetonated', iid: e.iid, stacks, band })
    const { amount, crit } = this.rollSpell(base, base, 'fire')
    const dealt = this.damageEnemyUnit(e, amount, crit, source)
    if (this.hasWildfire()) this.spreadWildfire(e, band, amount)
    return dealt
  }

  /** Whether the Wildfire passive (spread-on-consume) is learned. */
  private hasWildfire(): boolean {
    return this.kit.id === 'arcanist' && this.available('wildfire')
  }

  /** Wildfire: a consumed field throws living fire onto every other foe. */
  private spreadWildfire(from: EnemyUnit, band: SmolderBand, detonationAmount: number): void {
    const others = this.living.filter((o) => o.iid !== from.iid && o.combatant.alive)
    if (others.length === 0) return
    const splash = Math.max(1, Math.round((detonationAmount * WILDFIRE_SPREAD_PCT) / 100))
    const seed = band === 'volatile' ? 2 : 1
    for (const o of [...others]) {
      this.damageEnemyUnit(o, splash, false, 'wildfire')
      this.applySmolder(o, seed, true)
    }
  }

  /** Fireball resolves: the Heat you have already built decides what it becomes,
   *  then it lays Smolder and banks Heat. An Opening makes it fiercer. */
  private resolveFireball(): void {
    const e = this.target
    if (!e) return
    const exposed = e.opening > 0
    const band = this.heatBand()
    const base = ABILITY_EFFECTS.fireball as Extract<AbilityEffect, { kind: 'damage' }>
    const { amount, crit } = this.rollSpell(base.min, base.max, 'fire')
    this.damageEnemyUnit(e, amount, crit, 'fireball')
    this.applySmolder(e, 1 + (exposed ? 1 : 0))
    // Empowered (5–9): splash + a lick of Smolder onto up to two others.
    // Overheat (10): pierce the whole pack + burning ground (Smolder on all).
    if (band !== 'cold' && this.living.length > 1) {
      const others = this.living.filter((o) => o.iid !== e.iid && o.combatant.alive)
      const targets = band === 'overheat' ? others : others.slice(0, 2)
      for (const o of targets) {
        const pct = band === 'overheat' ? 100 : FIREBALL_SPLASH_PCT
        const splash = Math.max(1, Math.round((amount * pct) / 100))
        this.damageEnemyUnit(o, splash, false, 'fireball')
        this.applySmolder(o, 1)
      }
    }
    this.heatGain(HEAT_PER_FIREBALL + (exposed ? HEAT_OPENING_BONUS : 0))
  }

  /** Focus — the universal read-the-foe action (heart of the wheel / Space).
   *  Answer a tell and the foe comes Exposed; whiff and you eat a short lockout.
   *  Returns false only when Focus itself can't act (dead, on cooldown). */
  focus(): boolean {
    const p = this.player
    if (!p.alive || p.focusCd > 0) return false
    if (this.phase !== 'combat' && this.phase !== 'assault') return false
    let e = this.target && this.target.tellOpen ? this.target : null
    if (!e) e = this.living.find((u) => u.tellOpen) ?? null
    if (e) {
      // A read: deflect the committed blow and crack the foe open.
      if (e.cast) this.interruptCast(e)
      else e.swingElapsed = 0
      e.opening = OPENING_TICKS
      e.telling = false
      p.focusCd = FOCUS_CD_TICKS
      this.setTarget(e.iid)
      this.push({ kind: 'openingCreated', iid: e.iid, viaFocus: true })
      this.push({ kind: 'focusUsed', success: true, iid: e.iid })
      return true
    }
    // A whiff: nothing to read. Short lockout so it can't be mashed.
    p.focusCd = FOCUS_WHIFF_CD_TICKS
    this.push({ kind: 'focusUsed', success: false, iid: null })
    return true
  }

  private rollHeal(min: number, max: number, bonusPct = 0): { amount: number; crit: boolean } {
    let amount = Math.round(
      (this.rollRange(min, max) * this.stats.healMultPct * (100 + bonusPct)) / 10_000,
    )
    let chance = this.stats.critPct
    if (this.player.hasBuff('houseRules')) chance += HOUSE_RULES_CRIT_BONUS
    const crit = rollPct(this.rng, chance)
    if (crit) amount = Math.round((amount * 7) / 4)
    return { amount, crit }
  }

  private healPlayer(amount: number, crit: boolean, source: AbilityId): void {
    const healed = this.player.combatant.heal(amount)
    if (healed > 0) this.push({ kind: 'heal', target: 'player', amount: healed, crit, source })
  }

  private applyBuff(id: TimedBuffId, durationTicks: number): void {
    this.player.buffs.set(id, durationTicks)
    this.push({ kind: 'buffApplied', id })
  }

  private applyDotToTarget(
    effect: Extract<AbilityEffect, { kind: 'dot' }>,
    source: AbilityId,
    name: string,
    school: School,
  ): void {
    const e = this.target
    if (!e) return
    // The affliction snapshots power (and fire's combustion) at apply time;
    // its ticks never crit.
    let tickDmg = Math.round((effect.tickDamage * (100 + this.stats.power)) / 100)
    let pct = 100 + (this.stats.schoolBonusPct[school] ?? 0)
    if (school === 'fire' && this.player.combustion > 0) pct += COMBUSTION_FIRE_BONUS_PCT
    tickDmg = Math.max(1, Math.round((tickDmg * pct) / 100))
    let ticks = effect.tickCount
    if (source === 'sowBriar') ticks += this.stats.mods.briarTicks ?? 0
    e.bane = new Dot(name, tickDmg, effect.intervalTicks, ticks, effect.growth ?? 0)
    e.baneSource = source
    e.chillPct = effect.chillPct ?? 0
    this.push({ kind: 'dotApplied', target: 'enemy', iid: e.iid, name, abilityId: source })
  }

  private applyEffect(id: AbilityId): void {
    const def = ABILITIES[id]
    const effect = ABILITY_EFFECTS[id]
    const p = this.player
    // The borrowing happens as the ability fires — before its damage can end
    // the fight and settle the books (a killing blow still forgives its debt,
    // because onEncounterCleared wipes the slate *after* this).
    if (def.debt) p.debt = Math.min(100, p.debt + def.debt)
    if (def.chargeGain) p.charges = Math.min(this.chargeCap, p.charges + def.chargeGain)
    // Fireball is fully custom now — it reads Heat, evolves, lays Smolder.
    if (id === 'fireball') {
      this.resolveFireball()
      return
    }
    switch (effect.kind) {
      case 'damage': {
        // Split Second: the Hourwarden's strike lands in both halves of the moment.
        const strikes = id === 'secondhandStrike' && p.hasBuff('splitSecond') ? 2 : 1
        for (let i = 0; i < strikes && this.target; i++) {
          const { amount, crit } = this.rollSpell(effect.min, effect.max, def.school)
          this.damageEnemy(amount, crit, id)
        }
        break
      }
      case 'aoe': {
        this.damageAllEnemies(effect.min, effect.max, def.school, id)
        break
      }
      case 'dot': {
        this.applyDotToTarget(effect, id, def.name, def.school)
        break
      }
      case 'heal': {
        const { amount, crit } = this.rollHeal(effect.min, effect.max)
        this.healPlayer(amount, crit, id)
        break
      }
      case 'interrupt': {
        const e = this.target
        if (e) this.interruptCast(e)
        break
      }
      case 'shield': {
        const amount = effect.base + effect.perLevel * this.level
        const thorns =
          effect.thornsBase !== undefined
            ? effect.thornsBase + (effect.thornsPerLevel ?? 0) * this.level
            : 0
        p.shield = { amount, remaining: effect.durationTicks, thorns }
        this.push({ kind: 'buffApplied', id: 'barrier', amount })
        break
      }
      case 'buff': {
        if (effect.buff === 'combustion') {
          p.combustion = effect.durationTicks
          this.push({ kind: 'buffApplied', id: 'combustion' })
        } else {
          let duration = effect.durationTicks
          if (id === 'houseRules') duration += this.stats.mods.houseRulesTicks ?? 0
          // 'barrier' never ships as a buff effect — shields use kind 'shield'.
          this.applyBuff(effect.buff as TimedBuffId, duration)
        }
        break
      }
      case 'special': {
        this.applySpecial(id)
        break
      }
    }
  }

  /** Cut a hardcast short: the cooldown restarts as if the cast had resolved.
   *  Shared by Counterspell and Stasis, so the bookkeeping can't drift. */
  private interruptCast(e: EnemyUnit): void {
    if (!e.cast) return
    const name = e.cast.mech.name
    e.castCooldown = e.cast.mech.cooldownTicks
    e.cast = null
    this.lifetime.interrupts++
    this.push({ kind: 'interrupted', iid: e.iid, name })
    this.checkAchievement('interrupts-10', this.lifetime.interrupts >= 10)
  }

  /** Hit every living enemy (Requiem, the Comet, Fold the World). Rolls per
   *  mob, so a pack takes a spread, not a stamp. */
  private damageAllEnemies(min: number, max: number, school: School, source: DamageSource): void {
    for (const e of [...this.living]) {
      const { amount, crit } = this.rollSpell(min, max, school)
      this.damageEnemyUnit(e, amount, crit, source)
    }
  }

  // ─────────────────────── class specials ───────────────────────

  private applySpecial(id: AbilityId): void {
    const p = this.player
    switch (id) {
      // ── arcanist (the fire) ──
      case 'detonate': {
        const e = this.target
        if (e) this.detonateSmolder(e, 'detonate')
        this.heatGain(HEAT_PER_DETONATE)
        break
      }
      case 'kindle': {
        const e = this.target
        if (e) this.applySmolder(e, e.opening > 0 ? 2 : 1)
        this.heatGain(HEAT_PER_KINDLE)
        break
      }
      case 'wildfire': {
        for (const e of [...this.living]) this.applySmolder(e, WILDFIRE_SEED_STACKS)
        break
      }
      case 'flashpoint': {
        const e = this.target
        const heat = this.spendAllHeat()
        if (e) {
          e.opening = Math.max(OPENING_TICKS, heat * FLASHPOINT_TICKS_PER_HEAT)
          e.telling = false
          this.push({ kind: 'openingCreated', iid: e.iid, viaFocus: false })
        }
        break
      }
      case 'inferno': {
        const heat = this.spendAllHeat()
        for (const e of [...this.living]) {
          // Age-weight the field: Volatile pays double, Heated half again.
          let weighted = 0
          for (const age of e.smolder) {
            const b = smolderBandOf(age)
            weighted += b === 'volatile' ? 2 : b === 'heated' ? 1.5 : 1
          }
          const stacks = e.smolder.length
          e.smolder = []
          e.smolderBurnTimer = 0
          if (stacks > 0) this.push({ kind: 'smolderDetonated', iid: e.iid, stacks, band: 'volatile' })
          const base = heat * INFERNO_PER_HEAT + Math.round(weighted * INFERNO_PER_SMOLDER)
          if (base <= 0) continue
          const { amount, crit } = this.rollSpell(base, base, 'fire')
          this.damageEnemyUnit(e, amount, crit, 'inferno')
        }
        break
      }
      // ── gravewright ──
      case 'lastRites': {
        p.pages--
        const { amount, crit } = this.rollHeal(24, 32, this.stats.mods.lastRitesHealPct ?? 0)
        this.healPlayer(amount, crit, id)
        break
      }
      case 'exhume': {
        if (!p.buried) break
        p.pages--
        p.echo = {
          name: p.buried.name,
          dmgMin: p.buried.dmgMin,
          dmgMax: p.buried.dmgMax,
          swingTicks: ECHO_SWING_TICKS,
          swingElapsed: 0,
          remaining: ECHO_DURATION_TICKS,
        }
        this.push({ kind: 'echoRaised', name: p.buried.name })
        break
      }
      case 'finalChapter': {
        const pages = p.pages
        p.pages = 0
        const { amount, crit } = this.rollSpell(
          FINAL_CHAPTER_MIN_PER_PAGE * pages,
          FINAL_CHAPTER_MAX_PER_PAGE * pages,
          'shadow',
        )
        this.damageEnemy(amount, crit, id)
        break
      }

      // ── hourwarden ──
      case 'rewindWound': {
        const base = Math.max(1, Math.round((p.lastHitTaken * REWIND_HEAL_PCT) / 100))
        const amount = Math.round((base * this.stats.healMultPct) / 100)
        this.healPlayer(amount, false, id)
        break
      }
      case 'stasis': {
        const e = this.target
        if (!e) break
        e.frozen = Math.max(e.frozen, STASIS_FREEZE_TICKS)
        this.interruptCast(e)
        this.push({ kind: 'enemyFrozen', iid: e.iid, name: e.def.name })
        break
      }
      case 'hourglassShatter': {
        const bonus = 100 + (this.stats.mods.shatterBonusPct ?? 0)
        const debtDamage = Math.round((p.debt * bonus) / 100)
        p.debt = 0
        const { amount, crit } = this.rollSpell(18, 26, 'temporal')
        this.damageEnemy(amount + debtDamage, crit, id)
        break
      }

      // ── cartomancer ──
      case 'dealFate': {
        if (p.hand.length === 0) {
          p.hand = this.drawHand()
          break
        }
        const card = p.hand.shift()!
        this.playCard(card)
        break
      }
      case 'cutTheDeck': {
        p.hand = this.drawHand()
        break
      }
      case 'foldTheWorld': {
        const n = p.hand.length
        p.hand = []
        this.damageAllEnemies(FOLD_MIN_PER_CARD * n, FOLD_MAX_PER_CARD * n, 'fortune', id)
        break
      }
      case 'fiftyThirdCard': {
        this.playFiftyThird()
        break
      }

      // ── thornspeaker ──
      case 'sapdraw': {
        const e = this.target
        if (!e) break
        const { amount, crit } = this.rollSpell(14, 20, 'nature')
        const dealt = this.damageEnemyUnit(e, amount, crit, id)
        if (dealt > 0) {
          const heal = Math.max(1, Math.round((dealt * (100 + (this.stats.mods.sapHealPct ?? 0))) / 100))
          this.healPlayer(heal, false, id)
        }
        break
      }
      case 'verdantCataract': {
        const e = this.target
        if (!e?.bane?.active) break
        const owed = e.bane.consume()
        e.bane = null
        e.baneSource = null
        e.chillPct = 0
        const pct = CATARACT_PCT + (this.stats.mods.cataractPct ?? 0)
        const amount = Math.max(1, Math.round((owed * pct) / 100))
        this.damageEnemy(amount, false, id)
        break
      }

      // ── riftblade ──
      case 'phaseEdge': {
        const charges = p.charges
        p.charges = 0
        const { amount, crit } = this.rollSpell(
          PHASE_EDGE_MIN_PER_CHARGE * charges,
          PHASE_EDGE_MAX_PER_CHARGE * charges,
          'rift',
        )
        this.damageEnemy(amount, crit, id)
        break
      }
      case 'afterimage': {
        const base = 6 + 2 * this.level
        const pct = 100 + (this.stats.mods.afterimageDmgPct ?? 0)
        p.echo = {
          name: 'Afterimage',
          dmgMin: Math.max(1, Math.round(((base - 2) * pct) / 100)),
          dmgMax: Math.max(2, Math.round(((base + 2) * pct) / 100)),
          swingTicks: AFTERIMAGE_SWING_TICKS,
          swingElapsed: 0,
          remaining: AFTERIMAGE_DURATION_TICKS,
        }
        this.push({ kind: 'echoRaised', name: 'Afterimage' })
        break
      }
      case 'riftTear': {
        const e = this.target
        if (!e) break
        const { amount, crit } = this.rollSpell(26, 36, 'rift')
        this.damageEnemyUnit(e, amount, crit, id)
        const splash = Math.max(1, Math.round((amount * RIFT_TEAR_SPLASH_PCT) / 100))
        for (const other of [...this.living]) {
          if (other.iid === e.iid) continue
          this.damageEnemyUnit(other, splash, false, id)
        }
        break
      }
      case 'doorwayDuel': {
        const e = this.target
        if (!e) break
        p.doorwayTarget = e.iid
        this.applyBuff('doorway', DOORWAY_FREEZE_TICKS)
        for (const other of this.living) {
          if (other.iid === e.iid) continue
          other.frozen = Math.max(other.frozen, DOORWAY_FREEZE_TICKS)
          this.push({ kind: 'enemyFrozen', iid: other.iid, name: other.def.name })
        }
        break
      }

      default:
        break
    }
  }

  /** Deal Fate's flip: one card, one swing of fortune. */
  private playCard(card: CardId): void {
    const def = CARDS[card]
    this.push({ kind: 'cardPlayed', card, label: def.name })
    const fx = def.effect
    switch (fx.kind) {
      case 'damage': {
        const { amount, crit } = this.rollSpell(fx.min, fx.max, 'fortune')
        this.damageEnemy(amount, crit, 'dealFate')
        break
      }
      case 'aoe':
        this.damageAllEnemies(fx.min, fx.max, 'fortune', 'dealFate')
        break
      case 'dot':
        this.applyDotToTarget(
          { kind: 'dot', tickDamage: fx.tickDamage, intervalTicks: fx.intervalTicks, tickCount: fx.tickCount },
          'dealFate',
          def.name,
          'fortune',
        )
        break
      case 'heal': {
        const { amount, crit } = this.rollHeal(fx.min, fx.max)
        this.healPlayer(amount, crit, 'dealFate')
        break
      }
      case 'shield': {
        const amount = fx.base + fx.perLevel * this.level
        this.player.shield = { amount, remaining: fx.durationTicks, thorns: 0 }
        this.push({ kind: 'buffApplied', id: 'barrier', amount })
        break
      }
      case 'gold':
        this.addGold(this.rollRange(fx.min, fx.max), 'kill')
        break
    }
  }

  /** The card that edits the world. Weighted so the modal outcome is violence. */
  private playFiftyThird(): void {
    const p = this.player
    const roll = this.rng() * 100
    if (roll < 45) {
      this.push({ kind: 'cardPlayed', card: 'fiftyThird', label: 'The Unmaking' })
      const { amount, crit } = this.rollSpell(60, 80, 'fortune')
      this.damageEnemy(amount, crit, 'fiftyThirdCard')
    } else if (roll < 65) {
      this.push({ kind: 'cardPlayed', card: 'fiftyThird', label: 'The World, Redrawn' })
      p.venom = null
      this.healPlayer(p.combatant.maxHp, false, 'fiftyThirdCard')
    } else if (roll < 80) {
      this.push({ kind: 'cardPlayed', card: 'fiftyThird', label: 'The Mint' })
      this.addGold(this.rollRange(40, 80), 'kill')
    } else {
      this.push({ kind: 'cardPlayed', card: 'fiftyThird', label: 'The Mirror' })
      const amount = 30 + 6 * this.level
      p.shield = { amount, remaining: 400, thorns: 0 }
      this.push({ kind: 'buffApplied', id: 'barrier', amount })
      p.hand = this.drawHand()
    }
  }

  // ─────────────────────── damage & death ───────────────────────

  private damagePlayer(raw: number, source: DamageSource, label?: string, iid?: number): void {
    const p = this.player
    if (!p.alive || raw <= 0) return
    // Seamstep: the blow lands in the space you were standing in. One blow —
    // the step is spent whether it was a scratch or a decapitation.
    if (
      (source === 'enemySwing' || source === 'enemyCast') &&
      p.hasBuff('seamstep')
    ) {
      p.buffs.delete('seamstep')
      this.push({ kind: 'buffExpired', id: 'seamstep' })
      this.push({ kind: 'damage', target: 'player', iid, amount: 0, absorbed: raw, crit: false, source, label })
      return
    }
    let absorbed = 0
    if (p.shield) {
      absorbed = Math.min(p.shield.amount, raw)
      p.shield.amount -= absorbed
      // The Bramble Ward bites whatever it just caught.
      if (absorbed > 0 && p.shield.thorns > 0 && iid !== undefined && (source === 'enemySwing' || source === 'enemyCast')) {
        const attacker = this.enemies.find((e) => e.iid === iid && e.combatant.alive)
        if (attacker) this.damageEnemyUnit(attacker, p.shield.thorns, false, 'thorns')
      }
      if (p.shield && p.shield.amount <= 0) {
        p.shield = null
        this.push({ kind: 'shieldBroken' })
      }
    }
    let toHp = raw - absorbed
    // The Tower overhead: once per fight, a killing blow leaves you at 1 HP.
    if (this.stats.cheatDeath && !p.cheatedDeath && toHp >= p.combatant.hp) {
      toHp = p.combatant.hp - 1
      p.cheatedDeath = true
      this.push({ kind: 'signIntervened' })
    }
    const dealt = p.combatant.damage(toHp)
    if (dealt > 0) p.lastHitTaken = dealt
    if (dealt > 0 || absorbed > 0) {
      this.push({ kind: 'damage', target: 'player', iid, amount: dealt, absorbed, crit: false, source, label })
    }
    if (!p.alive) this.onPlayerDied()
  }

  private damageEnemy(amount: number, crit: boolean, source: DamageSource): void {
    const e = this.target
    if (!e) return
    this.damageEnemyUnit(e, amount, crit, source)
  }

  /** Land damage on a specific mob. Returns the damage actually dealt. */
  private damageEnemyUnit(e: EnemyUnit, amount: number, crit: boolean, source: DamageSource): number {
    // Doorway Duel: the one dragged inside takes more from everything you do.
    if (
      this.player.doorwayTarget === e.iid &&
      this.player.hasBuff('doorway') &&
      source !== 'thorns'
    ) {
      amount = Math.round((amount * (100 + DOORWAY_DAMAGE_BONUS_PCT)) / 100)
    }
    // An Exposed foe takes more from everything you throw at it (not its own
    // thorns bite-back).
    if (e.opening > 0 && source !== 'thorns') {
      amount = Math.round((amount * (100 + OPENING_DMG_PCT)) / 100)
    }
    const dealt = e.combatant.damage(amount)
    if (dealt > 0) this.push({ kind: 'damage', target: 'enemy', iid: e.iid, amount: dealt, absorbed: 0, crit, source })
    if (!e.combatant.alive) this.onEnemyKilled(e)
    else if (e.checkEnrage()) this.push({ kind: 'enemyEnraged', iid: e.iid, name: e.def.name })
    return dealt
  }

  /** One mob down: XP pays on the spot (mid-fight level-ups stay), everything
   *  else is banked on the corpse until the player loots it. */
  private onEnemyKilled(e: EnemyUnit): void {
    const def = e.def
    this.lifetime.kills++
    this.push({ kind: 'enemyDied', iid: e.iid, defId: def.id, name: def.name, rank: def.rank })

    // The Gravewright writes every kill into the ledger.
    if (this.kit.resource === 'ledger') {
      const p = this.player
      p.pages = Math.min(this.ledgerCap, p.pages + 1)
      p.buried = {
        name: def.name,
        dmgMin: Math.max(2, Math.round(def.dmgMin * 0.8)),
        dmgMax: Math.max(4, Math.round(def.dmgMax * 0.8)),
      }
    }

    // The duel ends when the opponent does — the door opens for the pack.
    if (this.player.doorwayTarget === e.iid) {
      this.player.doorwayTarget = null
      if (this.player.hasBuff('doorway')) {
        this.player.buffs.delete('doorway')
        this.push({ kind: 'buffExpired', id: 'doorway' })
      }
      for (const other of this.living) other.frozen = 0
    }

    // The world boss lives in its own pool; its death pays instantly — there
    // is no loot screen for the Colossus — and runs a different path.
    if (this.phase === 'assault') {
      this.addGold(rollInt(this.rng, def.goldMin, def.goldMax), 'kill')
      this.addXp(def.xp)
      if (rollPct(this.rng, def.dropPct + this.stats.dropBonusPct)) this.dropLoot(def)
      this.rollMaterial()
      this.onWorldBossFelled()
      return
    }

    this.addXp(def.xp)
    e.loot = this.rollBundle(def)
    this.questKillProgress(def)

    this.checkAchievement('first-blood', true)
    this.checkAchievement('kills-100', this.lifetime.kills >= 100)
    this.checkAchievement('kills-500', this.lifetime.kills >= 500)

    if (this.living.length === 0) {
      this.onEncounterCleared()
    } else if (this.targetIid === e.iid) {
      // Your target fell and its packmates are still coming.
      this.autoTarget()
    }
  }

  /** Roll a corpse's spoils — gold, then maybe an item, then maybe a material
   *  stack (the order keeps seeded runs deterministic). Banked, not paid. */
  private rollBundle(def: EnemyDef): LootBundle {
    const gold = rollInt(this.rng, def.goldMin, def.goldMax)
    const items: Item[] = []
    if (rollPct(this.rng, def.dropPct + this.stats.dropBonusPct)) {
      const minRarity: Rarity = def.rank === 'boss' ? 'rare' : 'common'
      items.push(generateItem(this.rng, this.nextUid++, def.level, { minRarity }))
    }
    const materials: LootBundle['materials'] = []
    if (rollPct(this.rng, 35 + this.stats.materialBonusPct) && this.region.materials.length > 0) {
      const id = pickOne(this.rng, this.region.materials)
      const count = rollInt(this.rng, 1, 3)
      materials.push({ id, name: this.content.materials[id]?.name ?? id, count })
    }
    return { gold, items, materials }
  }

  /** The whole pack is down: the fight is won. Corpses keep their spoils on
   *  the field until the player loots them (or something settles the field). */
  private onEncounterCleared(): void {
    this.push({ kind: 'encounterCleared' })
    const p = this.player
    if (p.queued && ABILITIES[p.queued].offensive) p.queued = null
    // You won — nothing keeps gnawing at you on the loot screen, and the
    // deadline never chases you out of a fight you finished. The borrowing
    // was free: that is the whole game the Hourwarden is playing.
    p.venom = null
    p.debt = 0
    p.doorwayTarget = null
    this.targetIid = null
    this.phase = 'looting'
    // Clearing a pack mends a quarter of your health — the reward for a clean win.
    if (p.alive) p.combatant.heal(Math.round((p.combatant.maxHp * 25) / 100))
  }

  /** ~35% of kills cough up a stack of one of the current region's materials.
   *  Instant-pay variant — only assault kills use it; region kills bank
   *  materials in the corpse bundle instead. */
  private rollMaterial(): void {
    if (!rollPct(this.rng, 35 + this.stats.materialBonusPct)) return
    const ids = this.region.materials
    if (ids.length === 0) return
    const id = pickOne(this.rng, ids)
    const count = rollInt(this.rng, 1, 3)
    this.materials[id] = (this.materials[id] ?? 0) + count
    this.push({ kind: 'materialDropped', id, count })
  }

  // ─────────────────────── looting ───────────────────────

  /** Pay one corpse's bundle into the player's pockets. */
  private payBundle(e: EnemyUnit): void {
    const bundle = e.loot
    if (!bundle) return
    e.loot = null
    if (bundle.gold > 0) this.addGold(bundle.gold, 'kill')
    for (const item of bundle.items) this.receiveItem(item)
    for (const m of bundle.materials) {
      this.materials[m.id] = (this.materials[m.id] ?? 0) + m.count
      this.push({ kind: 'materialDropped', id: m.id, count: m.count })
      this.questCollectProgress(m.id, m.count)
    }
  }

  /** Loot one corpse. Paying the last bundle settles the field back to idle. */
  collectLoot(iid: number): boolean {
    if (this.phase !== 'looting') return false
    const e = this.enemies.find((x) => x.iid === iid && x.loot !== null)
    if (!e) return false
    this.payBundle(e)
    if (this.enemies.every((x) => x.loot === null)) this.clearField()
    return true
  }

  /** R: loot every corpse at once. */
  collectAllLoot(): boolean {
    if (this.phase !== 'looting') return false
    for (const e of this.enemies) this.payBundle(e)
    this.clearField()
    return true
  }

  /** Bank every pending bundle. Loot is pacing, not risk: no transition —
   *  death, a region switch, an assault — ever destroys it. */
  private settleLoot(): void {
    for (const e of this.enemies) this.payBundle(e)
  }

  /** The looted field empties; the hunt goes quiet until the next start. */
  private clearField(): void {
    this.enemies = []
    this.targetIid = null
    this.enterIdle()
  }

  private enterIdle(): void {
    this.phase = 'idle'
    this.restIn = AUTO_REST_TICKS
    const p = this.player
    p.debt = 0
    p.reckoningIn = 0
    p.doorwayTarget = null
  }

  // ─────────────────────── quests ───────────────────────

  /** Take on a traveler's ask. At most MAX_ACTIVE_QUESTS underway at once. */
  acceptQuest(id: string): boolean {
    const quest = this.content.quests.find((q) => q.id === id)
    if (!quest || this.questProgress[id] !== undefined || this.completedQuests.has(id)) return false
    if (Object.keys(this.questProgress).length >= MAX_ACTIVE_QUESTS) return false
    this.questProgress[id] = 0
    this.push({ kind: 'questAccepted', id, name: quest.name })
    return true
  }

  /** Drop an active quest. Its progress is lost; the ask stays on the board. */
  abandonQuest(id: string): boolean {
    if (this.questProgress[id] === undefined) return false
    delete this.questProgress[id]
    return true
  }

  /** Claim a finished quest: xp, gold, and sometimes gear. */
  turnInQuest(id: string): boolean {
    const quest = this.content.quests.find((q) => q.id === id)
    const prog = this.questProgress[id]
    if (!quest || prog === undefined || prog < quest.objective.count) return false
    delete this.questProgress[id]
    this.completedQuests.add(id)
    this.push({ kind: 'questTurnedIn', id, name: quest.name })
    this.addXp(quest.reward.xp)
    this.addGold(quest.reward.gold, 'quest')
    if (quest.reward.gear) this.grantLoot(quest.reward.gear.ilvl, quest.reward.gear.minRarity)
    return true
  }

  /** A region kill advances matching kill quests: named foes count anywhere
   *  they spawn; "any foe" counts only in the quest's own region. */
  private questKillProgress(def: EnemyDef): void {
    for (const q of this.content.quests) {
      const prog = this.questProgress[q.id]
      if (prog === undefined || q.objective.kind !== 'kill' || prog >= q.objective.count) continue
      const wanted = q.objective.enemyId
      const matches = wanted === null ? q.regionId === this.region.id : wanted === def.id
      if (!matches) continue
      this.questProgress[q.id] = prog + 1
      if (prog + 1 >= q.objective.count) this.push({ kind: 'questCompleted', id: q.id, name: q.name })
    }
  }

  /** Looting a material stack advances matching collect quests. */
  private questCollectProgress(materialId: string, count: number): void {
    for (const q of this.content.quests) {
      const prog = this.questProgress[q.id]
      if (prog === undefined || q.objective.kind !== 'collect' || prog >= q.objective.count) continue
      if (q.objective.materialId !== materialId) continue
      const next = Math.min(q.objective.count, prog + count)
      this.questProgress[q.id] = next
      if (next >= q.objective.count) this.push({ kind: 'questCompleted', id: q.id, name: q.name })
    }
  }

  private questViews(): QuestView[] {
    return this.content.quests.map((q) => {
      const region = this.content.regions.find((r) => r.id === q.regionId)
      const prog = this.questProgress[q.id]
      const done = this.completedQuests.has(q.id)
      const o = q.objective
      const state: QuestState = done
        ? 'done'
        : prog === undefined
          ? 'available'
          : prog >= o.count
            ? 'complete'
            : 'active'
      const targetName =
        o.kind === 'kill'
          ? o.enemyId === null
            ? 'any foe'
            : (this.content.enemies[o.enemyId]?.name ?? o.enemyId)
          : (this.content.materials[o.materialId]?.name ?? o.materialId)
      return {
        id: q.id,
        name: q.name,
        giver: q.giver,
        text: q.text,
        regionId: q.regionId,
        regionName: region?.name ?? q.regionId,
        regionHue: region?.hue ?? 260,
        state,
        objective: { kind: o.kind, targetName, count: o.count, progress: done ? o.count : (prog ?? 0) },
        reward: { ...q.reward, gear: q.reward.gear ? { ...q.reward.gear } : null },
      }
    })
  }

  private onPlayerDied(): void {
    const p = this.player
    this.lifetime.deaths++
    p.clearCombatState()
    p.respawnIn = Math.max(
      20,
      Math.round((PLAYER_RESPAWN_TICKS * (100 - this.stats.respawnCutPct)) / 100),
    )
    this.push({ kind: 'playerDied' })
    this.checkAchievement('deaths-10', this.lifetime.deaths >= 10)
    // An assault banks its damage before the field is torn down, so endAssault
    // must read the colossus's HP first.
    if (this.phase === 'assault') {
      this.endAssault()
      return
    }
    // The fight is lost, but what was already slain still pays out.
    this.settleLoot()
    this.enemies = []
    this.targetIid = null
    this.enterIdle()
  }

  private revivePlayer(): void {
    const p = this.player
    p.combatant.reset()
    p.mana = this.stats.maxMana
    p.respawnIn = 0
    p.regenElapsed = 0
    p.heat = 0
    this.push({ kind: 'playerRespawned' })
  }

  // ─────────────────────── progression ───────────────────────

  private addXp(amount: number): void {
    amount = Math.round((amount * this.stats.xpMultPct) / 100)
    if (amount <= 0) return
    this.push({ kind: 'xpGained', amount })
    if (this.level >= LEVEL_CAP) return
    this.xp += amount
    let leveled = false
    while (this.level < LEVEL_CAP && this.xp >= xpToNext(this.level)) {
      this.xp -= xpToNext(this.level)
      this.level++
      leveled = true
      this.push({
        kind: 'levelUp',
        level: this.level,
        unlocked: abilitiesUnlockedAt(this.identity.classId, this.level),
      })
    }
    if (this.level >= LEVEL_CAP) this.xp = 0
    if (leveled) {
      this.refreshStats(true)
      this.checkAchievement('level-5', this.level >= 5)
      this.checkAchievement('level-10', this.level >= 10)
      this.checkAchievement('level-15', this.level >= LEVEL_CAP)
    }
  }

  private addGold(amount: number, source: 'kill' | 'sale' | 'quest'): void {
    // The courier's lean (and the Cartomancer's pennies): spoils pay better;
    // fencing your own gear does not.
    if (source !== 'sale') amount = Math.round((amount * this.stats.goldMultPct) / 100)
    if (amount <= 0) return
    this.gold += amount
    this.lifetime.goldEarned += amount
    this.push({ kind: 'goldGained', amount, source })
    this.checkAchievement('gold-1000', this.lifetime.goldEarned >= 1000)
  }

  private dropLoot(def: EnemyDef): void {
    this.grantLoot(def.level, def.rank === 'boss' ? 'rare' : 'common')
  }

  /** Roll and hand over an item at the given ilvl / minimum rarity. Returns
   *  the item either way, so a cache can name what it coughed up. */
  private grantLoot(ilvl: number, minRarity: Rarity): Item {
    const item = generateItem(this.rng, this.nextUid++, ilvl, { minRarity })
    this.receiveItem(item)
    return item
  }

  /** Take ownership of an already-rolled item, honouring the inventory cap
   *  (a full bag auto-sells). Epic bookkeeping lands here — the moment the
   *  player receives it, not the moment it drops. */
  private receiveItem(item: Item): void {
    if (item.rarity === 'epic') {
      this.lifetime.epicsFound++
      this.checkAchievement('epic-find', true)
    }
    const value = sellValue(item)
    if (this.inventory.length >= INVENTORY_CAP) {
      this.gold += value
      this.lifetime.goldEarned += value
      this.push({ kind: 'lootDropped', item, autoSold: true, goldValue: value })
    } else {
      this.inventory.push(item)
      this.push({ kind: 'lootDropped', item, autoSold: false, goldValue: value })
    }
  }

  private refreshStats(fullRestore: boolean): void {
    this.stats = deriveStats(this.identity, this.level, this.talents, this.equipped)
    this.player.applyStats(this.stats, fullRestore)
    this.player.pages = Math.min(this.player.pages, this.ledgerCap)
  }

  private checkAchievement(id: string, condition: boolean): void {
    if (!condition || this.achievements.has(id)) return
    const def = ACHIEVEMENT_BY_ID[id]
    if (!def) return
    this.achievements.add(id)
    this.push({ kind: 'achievementUnlocked', id, name: def.name })
  }

  // ─────────────────────── player intents ───────────────────────

  equipItem(uid: number): boolean {
    const idx = this.inventory.findIndex((i) => i.uid === uid)
    const item = this.inventory[idx]
    if (idx === -1 || !item) return false
    this.inventory.splice(idx, 1)
    const prev = this.equipped[item.slot]
    this.equipped[item.slot] = item
    if (prev) this.inventory.push(prev)
    this.refreshStats(false)
    return true
  }

  sellItem(uid: number): boolean {
    const idx = this.inventory.findIndex((i) => i.uid === uid)
    const item = this.inventory[idx]
    if (idx === -1 || !item) return false
    this.inventory.splice(idx, 1)
    this.addGold(sellValue(item), 'sale')
    return true
  }

  /** Sell the whole stack of one material for gold. */
  sellMaterial(id: string): boolean {
    const have = this.materials[id] ?? 0
    const def = this.content.materials[id]
    if (have <= 0 || !def) return false
    delete this.materials[id]
    this.addGold(have * def.value, 'sale')
    return true
  }

  spendTalent(id: TalentId): boolean {
    // Only your own calling's talents — the atlas keeps six pages per hero.
    if (!this.kit.talents.includes(id)) return false
    const rank = this.talents[id] ?? 0
    if (rank >= TALENTS[id].maxRanks) return false
    if (talentPointsEarned(this.level) - talentPointsSpent(this.talents) <= 0) return false
    this.talents[id] = rank + 1
    this.refreshStats(false)
    return true
  }

  respec(): boolean {
    if (talentPointsSpent(this.talents) === 0 || this.gold < RESPEC_COST) return false
    this.gold -= RESPEC_COST
    this.talents = {}
    this.refreshStats(false)
    return true
  }

  /** Switch regions. Allowed any time you are not mid-assault; pending loot
   *  banks itself on the way out. */
  enterRegion(regionId: string): boolean {
    if (this.phase === 'assault') return false
    const region = this.content.regions.find((r) => r.id === regionId)
    if (!region || region.id === this.region.id) return false
    this.settleLoot()
    this.region = region
    this.despawnForTransition()
    this.enterIdle()
    this.push({ kind: 'regionEntered', regionId: region.id, name: region.name })
    return true
  }

  /** Break off a world-boss assault, keeping the damage banked. No-op otherwise. */
  retreat(): boolean {
    if (this.phase === 'assault') return this.endAssault()
    return false
  }

  // ─────────────────────── world boss (scaffold) ───────────────────────

  /** Throw yourself at the Rift Colossus. It spawns at its current pooled HP as
   *  the sole enemy; the fight ends on its death, yours, or retreat, after which
   *  you return to hunting your current region. */
  assaultWorldBoss(): boolean {
    if (this.phase === 'assault' || !this.player.alive) return false
    this.settleLoot()
    this.despawnForTransition()
    this.phase = 'assault'
    this.resetFightState()
    const def: EnemyDef = { ...WORLD_BOSS, hp: this.worldBossHp }
    const unit = new EnemyUnit(def, this.nextIid++)
    this.enemies = [unit]
    this.targetIid = unit.iid
    this.push({
      kind: 'enemySpawned',
      iid: unit.iid,
      defId: def.id,
      name: def.name,
      rank: def.rank,
      intro: def.intro,
    })
    return true
  }

  /** End an assault (retreat or death): bank the damage, return to idle. */
  private endAssault(): boolean {
    const colossus = this.enemies[0]
    const remaining = colossus ? colossus.combatant.hp : this.worldBossHp
    const damageDealt = this.worldBossHp - remaining
    this.worldBossHp = remaining
    if (damageDealt > this.records.bestAssaultDamage) this.records.bestAssaultDamage = damageDealt
    this.enemies = []
    this.targetIid = null
    this.enterIdle()
    this.push({ kind: 'worldBossAssaultEnded', damageDealt, remaining })
    return true
  }

  /** The colossus falls: pay the reward and reset its pool to full. */
  private onWorldBossFelled(): void {
    const dealt = this.worldBossHp
    if (dealt > this.records.bestAssaultDamage) this.records.bestAssaultDamage = dealt
    this.records.worldBossFells++
    this.push({ kind: 'worldBossAssaultEnded', damageDealt: dealt, remaining: 0 })
    this.push({ kind: 'worldBossFelled' })
    this.addGold(500, 'kill')
    this.grantLoot(16, 'epic')
    this.checkAchievement('worldboss-felled', true)
    this.worldBossHp = WORLD_BOSS_MAX_HP
    this.enemies = []
    this.targetIid = null
    this.lifetime.bossKills++
    this.enterIdle()
  }

  // ─────────────────────── companion (scaffold) ───────────────────────

  /** Hire a companion: pays its cost and persists in the save. */
  hireCompanion(id = 'wren'): boolean {
    if (this.phase === 'assault' || this.companionId !== null) return false
    const comp = COMPANIONS[id]
    if (!comp || this.gold < comp.cost) return false
    this.gold -= comp.cost
    this.companionId = comp.id
    this.companionSwing = 0
    this.push({ kind: 'companionHired', id: comp.id, name: comp.name })
    return true
  }

  private despawnForTransition(): void {
    this.enemies = []
    this.targetIid = null
    const p = this.player
    if (p.cast && ABILITIES[p.cast.id].offensive) {
      const id = p.cast.id
      p.cast = null
      this.push({ kind: 'castFizzled', abilityId: id })
    }
    if (p.queued && ABILITIES[p.queued].offensive) p.queued = null
  }

  // ─────────────────────── snapshots ───────────────────────

  private resourceSnapshot(): ClassResourceSnapshot | null {
    const p = this.player
    switch (this.kit.resource) {
      case 'ledger':
        return { kind: 'ledger', pages: p.pages, cap: this.ledgerCap, buried: p.buried?.name ?? null }
      case 'debt':
        return {
          kind: 'debt',
          debt: p.debt,
          reckoningIn: this.phase === 'combat' || this.phase === 'assault' ? p.reckoningIn : 0,
        }
      case 'hand':
        return { kind: 'hand', cards: [...p.hand] }
      case 'growth': {
        const bane = this.target?.baneSource === 'sowBriar' ? this.target.bane : null
        return {
          kind: 'growth',
          perTick: bane?.active ? bane.tickDamage : 0,
          remainingTicks: bane?.active ? bane.remainingTicks : 0,
        }
      }
      case 'charge':
        return { kind: 'charge', charge: p.charges, cap: this.chargeCap }
      default:
        return null
    }
  }

  combatSnapshot(): Readonly<CombatSnapshot> {
    const p = this.player
    return {
      tick: this.tickCount,
      phase: this.phase,
      player: p.snapshot(this.stats),
      enemies: this.enemies.map((e) => e.snapshot()),
      target: this.targetIid,
      cast: p.cast
        ? {
            abilityId: p.cast.id,
            progress: p.cast.elapsed / p.cast.total,
            remainingTicks: p.cast.total - p.cast.elapsed,
            totalTicks: p.cast.total,
          }
        : null,
      queued: p.queued,
      cooldowns: { ...p.cooldowns },
      gcdRemaining: p.gcd,
      autoBattle: this.autoBattle,
      resource: this.resourceSnapshot(),
      echo: p.echo
        ? {
            name: p.echo.name,
            swingProgress: Math.min(1, p.echo.swingElapsed / p.echo.swingTicks),
            remainingTicks: p.echo.remaining,
          }
        : null,
      companion: this.companionSnapshot(),
    }
  }

  private companionSnapshot(): { name: string; swingProgress: number } | null {
    if (this.companionId === null) return null
    const comp = COMPANIONS[this.companionId]
    if (!comp) return null
    return { name: comp.name, swingProgress: Math.min(1, this.companionSwing / comp.swingTicks) }
  }

  private regionProgress(): RegionProgress[] {
    return this.content.regions.map((r) => ({
      id: r.id,
      name: r.name,
      epithet: r.epithet,
      tier: r.tier,
      minLevel: r.minLevel,
      maxLevel: r.maxLevel,
      hue: r.hue,
      intro: r.intro,
      current: r.id === this.region.id,
      enemyNames: [
        ...new Set(r.encounters.flatMap((e) => e.slots.map((s) => this.enemyDef(s.enemyId).name))),
      ],
    }))
  }

  private materialStacks(): MaterialStackView[] {
    const order: Record<string, number> = { low: 0, medium: 1, hard: 2 }
    return Object.entries(this.materials)
      .filter(([, count]) => count > 0)
      .map(([id, count]) => {
        const def = this.content.materials[id]!
        return { id, name: def.name, tier: def.tier, count, value: count * def.value }
      })
      .sort((a, b) => order[a.tier]! - order[b.tier]! || a.name.localeCompare(b.name))
  }

  progressSnapshot(): Readonly<ProgressSnapshot> {
    const ranks = {} as Record<TalentId, number>
    for (const id of Object.keys(TALENTS) as TalentId[]) ranks[id] = this.talents[id] ?? 0
    return {
      level: this.level,
      xp: this.xp,
      xpToNext: xpToNext(this.level),
      gold: this.gold,
      classId: this.identity.classId,
      originId: this.identity.originId,
      signId: this.identity.signId,
      stats: { ...this.stats },
      unlockedAbilities: unlockedAbilities(this.identity.classId, this.level),
      talentPoints: talentPointsEarned(this.level) - talentPointsSpent(this.talents),
      talentRanks: ranks,
      inventory: [...this.inventory],
      equipped: { ...this.equipped },
      regionId: this.region.id,
      regions: this.regionProgress(),
      materials: this.materialStacks(),
      quests: this.questViews(),
      achievements: [...this.achievements],
      lifetime: { ...this.lifetime },
      records: { ...this.records },
      worldBoss: {
        name: WORLD_BOSS.name,
        hp: this.worldBossHp,
        maxHp: WORLD_BOSS_MAX_HP,
        fells: this.records.worldBossFells,
      },
      companion:
        this.companionId !== null && COMPANIONS[this.companionId]
          ? { id: this.companionId, name: COMPANIONS[this.companionId]!.name }
          : null,
    }
  }

  // ─────────────────────── persistence ───────────────────────

  serialize(): SaveData {
    return {
      version: 5,
      level: this.level,
      xp: this.xp,
      gold: this.gold,
      classId: this.identity.classId,
      originId: this.identity.originId,
      signId: this.identity.signId,
      talents: { ...this.talents },
      equipped: { ...this.equipped },
      inventory: [...this.inventory],
      nextUid: this.nextUid,
      regionId: this.region.id,
      materials: { ...this.materials },
      activeQuests: { ...this.questProgress },
      completedQuests: [...this.completedQuests],
      achievements: [...this.achievements],
      lifetime: { ...this.lifetime },
      records: { ...this.records },
      worldBossHp: this.worldBossHp,
      companionId: this.companionId,
      ledgerPages: this.player.pages,
      autoBattle: this.autoBattle,
    }
  }

  /** v3's three merged regions → the five they un-merged into. (v1/v2 zone
   *  ids are themselves region ids now and resolve directly.) */
  private static readonly LEGACY_REGION: Record<string, string> = {
    verdant: 'hollowroot',
    emberwild: 'stormcrag',
    riftedge: 'sundered-spire',
  }

  /** Rebuild a sim from a save. In-combat state (including unlooted corpses)
   *  is not persisted: you come back at full strength, idle in the region you
   *  last chose, ready to start the next fight. */
  static deserialize(data: SaveData, opts: SimOptions): GameSim {
    // v1–v4 saves are accepted; their dead fields (savedAt, muted, zoneKills,
    // bossesDefeated, expedition records) are simply ignored on the way in.
    const raw = data as unknown as Record<string, unknown>
    const version = data.version as number
    if (version !== 1 && version !== 2 && version !== 3 && version !== 4 && version !== 5) {
      throw new Error(`unknown save version: ${String(data.version)}`)
    }
    // Identity: v5 saves carry their own; older saves take it from the caller
    // (the profile), so a pre-callings Arcanist stays an Arcanist.
    const sim = new GameSim(opts)
    if (version === 5) {
      const classId = data.classId
      if (classId && CLASS_KITS[classId]) {
        sim.identity = {
          classId,
          originId: typeof data.originId === 'string' ? data.originId : '',
          signId: typeof data.signId === 'string' ? data.signId : '',
        }
        sim.kit = CLASS_KITS[classId]
      }
    }
    sim.level = Math.min(Math.max(1, data.level), LEVEL_CAP)
    sim.xp = Math.max(0, data.xp)
    sim.gold = Math.max(0, data.gold)
    sim.talents = { ...data.talents }
    sim.equipped = { ...data.equipped }
    sim.inventory = [...data.inventory]
    sim.nextUid = Math.max(1, data.nextUid)
    for (const id of data.achievements) sim.achievements.add(id)
    sim.lifetime = { ...data.lifetime }
    const rec = raw.records as Partial<Records> | undefined
    sim.records = {
      worldBossFells: rec?.worldBossFells ?? 0,
      bestAssaultDamage: rec?.bestAssaultDamage ?? 0,
    }
    sim.materials = { ...((raw.materials as Record<string, number> | undefined) ?? {}) }
    // Quests (v4+): ids the content pack no longer knows are silently dropped.
    const knownQuest = (id: string) => sim.content.quests.some((q) => q.id === id)
    const active = (raw.activeQuests as Record<string, number> | undefined) ?? {}
    for (const [id, prog] of Object.entries(active)) {
      if (knownQuest(id)) sim.questProgress[id] = Math.max(0, prog)
    }
    for (const id of (raw.completedQuests as string[] | undefined) ?? []) {
      if (knownQuest(id)) sim.completedQuests.add(id)
    }
    sim.worldBossHp = (data.worldBossHp as number | undefined) ?? WORLD_BOSS_MAX_HP
    sim.companionId = (data.companionId as string | null | undefined) ?? null
    sim.autoBattle = data.autoBattle ?? false
    // Resolve the region: regionId (v3+) or zoneId (v1/v2), mapped through the
    // legacy table when needed; an unknown id falls back to the first region.
    const saved = (raw.regionId as string | undefined) ?? (raw.zoneId as string | undefined) ?? ''
    const regionId = GameSim.LEGACY_REGION[saved] ?? saved
    const region = sim.content.regions.find((r) => r.id === regionId)
    if (region) sim.region = region
    sim.refreshStats(true)
    // The ledger survives the reload — clamp waits until stats exist.
    const pages = (raw.ledgerPages as number | undefined) ?? 0
    sim.player.pages = Math.max(0, Math.min(pages, sim.ledgerCap))
    return sim
  }

  // ─────────────────────── auto-battle ───────────────────────

  private autoAct(): void {
    const p = this.player
    if (!p.alive) return

    // Auto plays the whole loop: sweep the loot screen, breathe, wade back in.
    if (this.phase === 'looting') {
      this.collectAllLoot()
      return
    }
    if (this.phase === 'idle') {
      if (p.cast === null && p.gcd === 0 && p.queued === null && this.hpPct() <= 60) {
        this.autoIdleHeal()
      }
      if (this.restIn === 0 && p.cast === null) this.startFight()
      return
    }

    if (p.cast !== null || p.gcd > 0 || p.queued !== null) {
      // Off-GCD reactions still fire mid-cast.
      this.autoOffGcd()
      return
    }
    this.autoOffGcd()

    const living = this.living
    if (living.length === 0) return

    // Focus fire: finishing the weakest packmate shrinks incoming damage —
    // unless a duel has the rest of the pack locked outside the door.
    const e0 = this.target
    if (e0 && living.length > 1 && !p.hasBuff('doorway')) {
      const weakest = living.reduce((a, b) => (b.combatant.hp < a.combatant.hp ? b : a))
      if (weakest.combatant.hp < e0.combatant.hp) this.setTarget(weakest.iid)
    }

    // Read the foe: answer any open tell with Focus (off the GCD) before acting.
    if (p.focusCd === 0 && living.some((u) => u.tellOpen)) this.focus()

    switch (this.kit.id) {
      case 'arcanist':
        this.autoArcanist()
        break
      case 'gravewright':
        this.autoGravewright()
        break
      case 'hourwarden':
        this.autoHourwarden()
        break
      case 'cartomancer':
        this.autoCartomancer()
        break
      case 'thornspeaker':
        this.autoThornspeaker()
        break
      case 'riftblade':
        this.autoRiftblade()
        break
    }
  }

  /** Idle self-care between fights, per calling. */
  private autoIdleHeal(): void {
    if (this.canUse('lastRites')) return void this.useAbility('lastRites')
    if (this.canUse('rewindWound')) return void this.useAbility('rewindWound')
  }

  /** Reactions that ignore the GCD: Stasis on a caster. */
  private autoOffGcd(): void {
    const caster = this.living.find((u) => u.cast !== null)
    if (!caster) return
    for (const id of ['stasis'] as const) {
      if (!this.kit.abilities.includes(id)) continue
      const def = ABILITIES[id]
      if (
        this.player.cooldowns[id] === 0 &&
        this.level >= def.unlockLevel &&
        this.player.mana >= def.manaCost
      ) {
        this.setTarget(caster.iid)
        if (this.canUse(id)) this.useAbility(id)
      }
    }
  }

  private hpPct(): number {
    const p = this.player
    return (p.combatant.hp * 100) / p.combatant.maxHp
  }

  private targetInfo(): { unit: EnemyUnit; hpPct: number; tough: boolean } | null {
    const t = this.target
    if (!t) return null
    const hpPct = (t.combatant.hp * 100) / t.combatant.maxHp
    return { unit: t, hpPct, tough: t.def.rank !== 'normal' }
  }

  private autoArcanist(): void {
    const t = this.targetInfo()
    if (!t) return
    const e = t.unit
    const p = this.player
    // Apocalypse when the field is ripe: a mature pack, or a wall of Heat.
    if (
      this.canUse('inferno') &&
      (e.smolder.length >= 3 || p.heat >= 8) &&
      (t.tough || this.living.length >= 2 || e.smolder.length >= SMOLDER_MAX)
    ) {
      return void this.useAbility('inferno')
    }
    // Manufacture a moment when Heat has peaked and nothing is Exposed.
    if (this.canUse('flashpoint') && p.heat >= HEAT_MAX && e.opening === 0) {
      return void this.useAbility('flashpoint')
    }
    // Seed a fresh pack so Wildfire has something to leap between.
    if (this.living.length >= 2 && this.canUse('wildfire')) return void this.useAbility('wildfire')
    // Cash a matured field — Volatile, capped, or a target about to die.
    if (
      this.canUse('detonate') &&
      (e.hottestBand === 'volatile' || e.smolder.length >= SMOLDER_MAX || t.hpPct <= 25)
    ) {
      return void this.useAbility('detonate')
    }
    // Kindle into an Opening banks two stacks for free; otherwise Fireball.
    if (e.opening > 0 && e.smolder.length < SMOLDER_MAX && this.canUse('kindle')) {
      return void this.useAbility('kindle')
    }
    if (this.canUse('fireball')) return void this.useAbility('fireball')
    if (this.canUse('kindle')) return void this.useAbility('kindle')
  }

  private autoGravewright(): void {
    const p = this.player
    const hp = this.hpPct()
    if (hp <= 60 && this.canUse('lastRites')) return void this.useAbility('lastRites')
    if (hp <= 75 && this.canUse('boneward')) return void this.useAbility('boneward')
    const t = this.targetInfo()
    if (!t) return
    // A full ledger slammed shut on something worth the pages.
    if (p.pages >= this.ledgerCap && (t.tough || t.hpPct >= 60) && this.canUse('finalChapter')) {
      return void this.useAbility('finalChapter')
    }
    if (p.pages >= 2 && p.echo === null && this.canUse('exhume')) return void this.useAbility('exhume')
    if (!t.unit.bane?.active && this.canUse('gravechill')) return void this.useAbility('gravechill')
    if (this.living.length >= 2 && this.canUse('requiem')) return void this.useAbility('requiem')
    if (this.canUse('gravebolt')) return void this.useAbility('gravebolt')
  }

  private autoHourwarden(): void {
    const p = this.player
    const hp = this.hpPct()
    if (hp <= 65 && this.canUse('rewindWound')) return void this.useAbility('rewindWound')
    if (!this.targetInfo()) return
    // Cash the debt out as damage before the bell collects it.
    if (p.debt >= 50 && this.canUse('hourglassShatter')) return void this.useAbility('hourglassShatter')
    if (p.debt <= 40 && this.canUse('splitSecond')) return void this.useAbility('splitSecond')
    if (p.debt <= 60 && this.canUse('borrowedBlade')) return void this.useAbility('borrowedBlade')
    // Never borrow into a guaranteed lethal bell.
    if (p.debt < 95 && this.canUse('secondhandStrike')) return void this.useAbility('secondhandStrike')
  }

  private autoCartomancer(): void {
    const p = this.player
    const t = this.targetInfo()
    if (!t) return
    if ((t.tough || t.hpPct >= 60) && this.canUse('houseRules')) return void this.useAbility('houseRules')
    if (t.tough && this.canUse('fiftyThirdCard')) return void this.useAbility('fiftyThirdCard')
    if (this.living.length >= 2 && p.hand.length >= 2 && this.canUse('foldTheWorld')) {
      return void this.useAbility('foldTheWorld')
    }
    if (this.canUse('dealFate')) return void this.useAbility('dealFate')
    if (this.canUse('cardflick')) return void this.useAbility('cardflick')
  }

  private autoThornspeaker(): void {
    const hp = this.hpPct()
    if (hp <= 75 && this.canUse('brambleWard')) return void this.useAbility('brambleWard')
    const t = this.targetInfo()
    if (!t) return
    const bane = t.unit.baneSource === 'sowBriar' ? t.unit.bane : null
    // Harvest a grown briar before it runs out on its own.
    if (bane?.active && bane.remainingTicks <= 40 && this.canUse('verdantCataract')) {
      return void this.useAbility('verdantCataract')
    }
    if (!bane?.active && this.canUse('sowBriar')) return void this.useAbility('sowBriar')
    if (bane?.active && t.tough && this.canUse('wildswell')) return void this.useAbility('wildswell')
    if (hp <= 75 && this.canUse('sapdraw')) return void this.useAbility('sapdraw')
    if (this.canUse('thornlash')) return void this.useAbility('thornlash')
  }

  private autoRiftblade(): void {
    const p = this.player
    const hp = this.hpPct()
    if (hp <= 75 && this.canUse('seamstep')) return void this.useAbility('seamstep')
    const t = this.targetInfo()
    if (!t) return
    if (this.living.length >= 2 && t.tough && this.canUse('doorwayDuel')) {
      return void this.useAbility('doorwayDuel')
    }
    if (p.echo === null && this.canUse('afterimage')) return void this.useAbility('afterimage')
    if (p.charges >= Math.min(4, this.chargeCap) && this.canUse('phaseEdge')) {
      return void this.useAbility('phaseEdge')
    }
    if (this.living.length >= 2 && this.canUse('riftTear')) return void this.useAbility('riftTear')
    if (this.canUse('throughCut')) return void this.useAbility('throughCut')
  }

  private push(event: CombatEvent): void {
    this.pending.push(event)
  }

  private drain(): CombatEvent[] {
    if (this.pending.length === 0) return this.pending
    const out = this.pending
    this.pending = []
    return out
  }
}
