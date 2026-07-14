import {
  ABILITIES,
  ABILITY_EFFECTS,
  ABILITY_IDS,
  COMBUSTION_CRIT_BONUS,
  COMBUSTION_FIRE_BONUS_PCT,
} from './abilities'
import { ACHIEVEMENT_BY_ID } from './content/achievements'
import { BLESSING_IDS, BLESSINGS } from './content/blessings'
import { COMPANIONS } from './content/companions'
import { generateItem, sellValue } from './content/items'
import { TALENTS } from './content/talents'
import { WORLD_BOSS, WORLD_BOSS_MAX_HP } from './content/worldboss'
import { DEFAULT_CONTENT } from './content/zones'
import { Dot } from './dot'
import { EnemyUnit } from './enemyUnit'
import type { CombatEvent, DamageSource } from './events'
import { generateRoute } from './expedition'
import { PlayerUnit } from './playerUnit'
import {
  abilitiesUnlockedAt,
  deriveStats,
  talentPointsEarned,
  talentPointsSpent,
  unlockedAbilities,
  xpToNext,
} from './progression'
import { pickOne, pickWeighted, rollInt, rollPct, type Rng } from './rng'
import type {
  AbilityId,
  BlessingId,
  CombatSnapshot,
  ContentPack,
  DerivedStats,
  EncounterSlot,
  EnemyDef,
  ExpeditionNodeView,
  ExpeditionSnapshot,
  Item,
  ItemSlot,
  LifetimeStats,
  NodeKind,
  ProgressSnapshot,
  Rarity,
  Records,
  SaveData,
  School,
  TalentId,
  ZoneDef,
} from './types'
import {
  AUTO_BREATHER_TICKS,
  BOSS_APPROACH_TICKS,
  GCD_TICKS,
  INVENTORY_CAP,
  LEVEL_CAP,
  NODE_SPAWN_TICKS,
  PLAYER_RESPAWN_TICKS,
  REGEN_INTERVAL_TICKS,
  RESPEC_COST,
  TRAVEL_TICKS,
} from './types'

export interface SimOptions {
  content?: ContentPack
  /** Required: the engine owns no wall clock and no ambient randomness. The UI
   *  passes the platform PRNG; tests pass a seeded `mulberry32`. */
  rng: Rng
}

/** The whole game: pure, synchronous, integer-tick simulation of combat AND
 *  progression. Events are buffered and returned from the tick() that surfaces
 *  them, so the UI drains exactly one array per tick. */
export class GameSim {
  private tickCount = 0
  private readonly content: ContentPack
  private readonly rng: Rng

  // ── progression ──
  private level = 1
  private xp = 0
  private gold = 0
  private talents: Partial<Record<TalentId, number>> = {}
  private equipped: Partial<Record<ItemSlot, Item>> = {}
  private inventory: Item[] = []
  private nextUid = 1
  private zone: ZoneDef
  private readonly bossesDefeated = new Set<string>()
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
    expeditionsCompleted: 0,
    worldBossFells: 0,
    bestAssaultDamage: 0,
    fastestBossKills: {},
  }
  private completed = false
  autoBattle = false

  // ── expedition ──
  /** camp: at the Wayfarer's Rest. travel: walking a trail. node: resolving a
   *  node (combat or resolved-and-waiting). assault: fighting the world boss. */
  private phase: 'camp' | 'travel' | 'node' | 'assault' = 'camp'
  private route: NodeKind[] | null = null
  private nodeIndex = 0
  private nodeResolvedFlag = false
  /** Highest node index whose kind has been revealed (fog of war). */
  private revealedThrough = 0
  private travelRemaining = 0
  private travelTotal = 0
  private pendingShrine: BlessingId[] | null = null
  private readonly blessings = new Set<BlessingId>()
  /** Auto-battle pause counter at camp / a resolved node. */
  private autoBreather = 0

  // ── world boss (scaffold) ──
  private worldBossHp = WORLD_BOSS_MAX_HP

  // ── companion (scaffold) ──
  private companionId: string | null = null
  private companionSwing = 0

  // ── combat ──
  private stats: DerivedStats
  private readonly player: PlayerUnit
  /** The current pack. Dead mobs stay until the whole encounter is cleared. */
  private enemies: EnemyUnit[] = []
  /** iid of the targeted enemy. Always a living enemy while any are alive. */
  private targetIid: number | null = null
  private nextIid = 1
  /** Arrival countdown for the current node's encounter (0 once on the field). */
  private spawnIn = 0
  /** What the pending spawn will be, when `spawnIn` reaches 0. */
  private pendingSpawn: 'battle' | 'elite' | 'boss' | null = null
  /** Tick the current boss/world-boss spawned, for fastest-kill records. */
  private bossFightStart: number | null = null
  private pending: CombatEvent[] = []

  constructor(opts: SimOptions) {
    this.content = opts.content ?? DEFAULT_CONTENT
    this.rng = opts.rng
    const first = this.content.zones[0]
    if (!first) throw new Error('content pack has no zones')
    this.zone = first
    this.stats = deriveStats(this.level, this.talents, this.equipped)
    this.player = new PlayerUnit(this.stats)
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
    if (p.combustion > 0) {
      p.combustion--
      if (p.combustion === 0) this.push({ kind: 'buffExpired', id: 'combustion' })
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
      // The Wayfarer's Rest knits you back together — but only at camp. The
      // trail offers no such mercy.
      if (this.phase === 'camp') {
        p.combatant.heal(Math.max(1, Math.round((p.combatant.maxHp * 7) / 100)))
      }
    }

    // Walk the trail; on arrival, resolve the node.
    if (this.phase === 'travel') {
      this.travelRemaining--
      if (this.travelRemaining <= 0) this.arriveAtNode()
    } else if (this.pendingSpawn !== null && this.enemies.length === 0) {
      // A combat node's encounter closes in.
      this.spawnIn--
      if (this.spawnIn <= 0) this.spawnPending()
    }

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

    // Enemy phase: every living mob in the pack acts. Iterate over a copy —
    // a death can clear the whole array mid-loop when the pack goes down.
    for (const e of [...this.enemies]) {
      if (!e.combatant.alive) continue

      // The hero's burn.
      if (e.ignite) {
        const due = e.ignite.tick()
        if (!e.ignite.active) e.ignite = null
        if (due > 0) {
          const dealt = e.combatant.damage(due)
          if (dealt > 0) {
            this.push({ kind: 'damage', target: 'enemy', iid: e.iid, amount: dealt, absorbed: 0, crit: false, source: 'ignite' })
          }
          if (!e.combatant.alive) {
            this.onEnemyKilled(e)
            continue
          }
          if (e.checkEnrage()) this.push({ kind: 'enemyEnraged', iid: e.iid, name: e.def.name })
        }
      }

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

  /** The hireling swings on its own clock at your current target, in any combat
   *  (battle/elite/boss/assault). It never crits and takes no damage. Idle — and
   *  timer reset — the moment there is nothing to hit. */
  private companionSwing_(playerAlive: boolean): void {
    if (this.companionId === null || this.enemies.length === 0 || !playerAlive) {
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
    if (this.autoBattle) {
      this.autoExpedition()
      this.autoAct()
    }
    return this.drain()
  }

  /** Auto-battle also walks the trail hands-free: it embarks from camp, presses
   *  on from resolved nodes (after a short breather), and takes the first
   *  blessing a shrine offers. It never assaults the world boss. */
  private autoExpedition(): void {
    if (this.phase === 'assault' || !this.player.alive) return
    if (this.pendingShrine && this.pendingShrine.length > 0) {
      this.chooseBlessing(this.pendingShrine[0]!)
      return
    }
    if (this.phase === 'camp') {
      if (++this.autoBreather >= AUTO_BREATHER_TICKS) this.embark()
      return
    }
    if (this.phase === 'node' && this.nodeResolvedFlag && !this.isLastNode) {
      if (++this.autoBreather >= AUTO_BREATHER_TICKS) this.advance()
      return
    }
    // Travelling or mid-combat: no breather accrues.
    this.autoBreather = 0
  }

  // ─────────────────────── abilities ───────────────────────

  /** "Would this ability be accepted right now?" — queueing counts as accepted,
   *  so an active cast or GCD does not make this false. */
  canUse(id: AbilityId): boolean {
    const def = ABILITIES[id]
    const p = this.player
    if (!p.alive || this.level < def.unlockLevel) return false
    if (p.cooldowns[id] > 0) return false
    if (p.mana < def.manaCost) return false
    // Counterspell reads your *target's* lips — switching to the caster is the play.
    if (id === 'counterspell') return this.target?.cast != null
    if (def.offensive && this.target === null) return false
    return true
  }

  /** Start, queue, or resolve an ability. Returns false when refused outright. */
  useAbility(id: AbilityId): boolean {
    if (!this.canUse(id)) return false
    const def = ABILITIES[id]
    const p = this.player
    if (def.offGcd) {
      // Counterspell: fires immediately, even mid-cast.
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

  private castTicksOf(id: AbilityId): number {
    if (id === 'fireball') return this.stats.fireballCastTicks
    if (id === 'renew') return this.stats.renewCastTicks
    return ABILITIES[id].castTicks
  }

  private startAbility(id: AbilityId): void {
    const def = ABILITIES[id]
    const p = this.player
    p.gcd = GCD_TICKS
    const castTicks = this.castTicksOf(id)
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

  private rollSpell(min: number, max: number, school: School): { amount: number; crit: boolean } {
    let amount = Math.round((rollInt(this.rng, min, max) * (100 + this.stats.power)) / 100)
    let critChance = this.stats.critPct
    if (school === 'fire') {
      let pct = this.stats.fireMultPct
      if (this.player.combustion > 0) {
        pct += COMBUSTION_FIRE_BONUS_PCT
        critChance += COMBUSTION_CRIT_BONUS
      }
      amount = Math.round((amount * pct) / 100)
    }
    const crit = rollPct(this.rng, critChance)
    if (crit) amount = Math.round((amount * 7) / 4)
    return { amount, crit }
  }

  private applyEffect(id: AbilityId): void {
    const def = ABILITIES[id]
    const effect = ABILITY_EFFECTS[id]
    const p = this.player
    switch (effect.kind) {
      case 'damage': {
        const { amount, crit } = this.rollSpell(effect.min, effect.max, def.school)
        this.damageEnemy(amount, crit, id)
        break
      }
      case 'dot': {
        const e = this.target
        if (!e) break
        // The burn snapshots power/combustion at apply time; its ticks never crit.
        let tickDmg = Math.round((effect.tickDamage * (100 + this.stats.power)) / 100)
        const pct = this.stats.fireMultPct + (p.combustion > 0 ? COMBUSTION_FIRE_BONUS_PCT : 0)
        tickDmg = Math.max(1, Math.round((tickDmg * pct) / 100))
        e.ignite = new Dot(def.name, tickDmg, effect.intervalTicks, effect.tickCount)
        this.push({ kind: 'dotApplied', target: 'enemy', iid: e.iid, name: def.name, abilityId: id })
        break
      }
      case 'heal': {
        let amount = Math.round((rollInt(this.rng, effect.min, effect.max) * this.stats.healMultPct) / 100)
        const crit = rollPct(this.rng, this.stats.critPct)
        if (crit) amount = Math.round((amount * 7) / 4)
        const healed = p.combatant.heal(amount)
        if (healed > 0) this.push({ kind: 'heal', target: 'player', amount: healed, crit, source: id })
        break
      }
      case 'interrupt': {
        const e = this.target
        if (e?.cast) {
          const name = e.cast.mech.name
          e.castCooldown = e.cast.mech.cooldownTicks
          e.cast = null
          this.lifetime.interrupts++
          this.push({ kind: 'interrupted', iid: e.iid, name })
          this.checkAchievement('interrupts-10', this.lifetime.interrupts >= 10)
        }
        break
      }
      case 'shield': {
        const amount = effect.base + effect.perLevel * this.level
        p.shield = { amount, remaining: effect.durationTicks }
        this.push({ kind: 'buffApplied', id: 'barrier', amount })
        break
      }
      case 'buff': {
        p.combustion = effect.durationTicks
        this.push({ kind: 'buffApplied', id: 'combustion' })
        break
      }
    }
  }

  // ─────────────────────── damage & death ───────────────────────

  private damagePlayer(raw: number, source: DamageSource, label?: string, iid?: number): void {
    const p = this.player
    if (!p.alive || raw <= 0) return
    let absorbed = 0
    if (p.shield) {
      absorbed = Math.min(p.shield.amount, raw)
      p.shield.amount -= absorbed
      if (p.shield.amount <= 0) {
        p.shield = null
        this.push({ kind: 'shieldBroken' })
      }
    }
    const dealt = p.combatant.damage(raw - absorbed)
    if (dealt > 0 || absorbed > 0) {
      this.push({ kind: 'damage', target: 'player', iid, amount: dealt, absorbed, crit: false, source, label })
    }
    if (!p.alive) this.onPlayerDied()
  }

  private damageEnemy(amount: number, crit: boolean, source: DamageSource): void {
    const e = this.target
    if (!e) return
    const dealt = e.combatant.damage(amount)
    if (dealt > 0) this.push({ kind: 'damage', target: 'enemy', iid: e.iid, amount: dealt, absorbed: 0, crit, source })
    if (!e.combatant.alive) this.onEnemyKilled(e)
    else if (e.checkEnrage()) this.push({ kind: 'enemyEnraged', iid: e.iid, name: e.def.name })
  }

  /** One mob down: pay its rewards immediately. The pack decides the rest. */
  private onEnemyKilled(e: EnemyUnit): void {
    const def = e.def
    this.lifetime.kills++
    this.push({ kind: 'enemyDied', iid: e.iid, defId: def.id, name: def.name, rank: def.rank })

    this.addGold(rollInt(this.rng, def.goldMin, def.goldMax), 'kill')
    this.addXp(def.xp)
    if (rollPct(this.rng, def.dropPct)) this.dropLoot(def)

    if (def.rank === 'boss') {
      this.lifetime.bossKills++
      if (this.phase === 'assault') {
        // The world boss lives in its own pool; nothing here applies to it.
        this.onWorldBossFelled()
        return
      }
      const zoneIdx = this.content.zones.findIndex((z) => z.bossId === def.id)
      const zone = this.content.zones[zoneIdx]
      if (zone && !this.bossesDefeated.has(zone.id)) {
        this.bossesDefeated.add(zone.id)
        const next = this.content.zones[zoneIdx + 1] ?? null
        this.push({ kind: 'bossDefeated', zoneId: zone.id, nextZoneId: next?.id ?? null })
      }
      // Fastest-kill record: the time from the boss appearing to its death.
      if (this.bossFightStart !== null) {
        const elapsed = this.tickCount - this.bossFightStart
        const best = this.records.fastestBossKills[this.zone.id]
        this.records.fastestBossKills[this.zone.id] = best === undefined ? elapsed : Math.min(best, elapsed)
        this.bossFightStart = null
      }
      this.checkAchievement(`boss-${def.id}`, true)
      if (def.id === this.content.finalBossId && !this.completed) {
        this.completed = true
        this.push({ kind: 'gameCompleted' })
      }
    }

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

  /** The whole pack is down. A combat node is now resolved. */
  private onEncounterCleared(): void {
    this.push({ kind: 'encounterCleared' })
    if (this.player.queued && ABILITIES[this.player.queued].offensive) this.player.queued = null
    this.enemies = []
    this.targetIid = null

    // Elite nodes always drop something worth carrying.
    if (this.route && this.route[this.nodeIndex] === 'elite') {
      this.grantLoot(this.zone.minLevel + 1, 'uncommon')
    }
    this.resolveCurrentNode()
  }

  /** Mark the current node resolved — or, if it was the boss, complete the run. */
  private resolveCurrentNode(): void {
    if (this.route === null) return
    const kind = this.route[this.nodeIndex]
    if (kind === 'boss') {
      this.push({ kind: 'nodeResolved', index: this.nodeIndex })
      this.records.expeditionsCompleted++
      this.checkAchievement('expeditions-10', this.records.expeditionsCompleted >= 10)
      this.endExpedition('completed')
      return
    }
    this.nodeResolvedFlag = true
    this.push({ kind: 'nodeResolved', index: this.nodeIndex })
  }

  private onPlayerDied(): void {
    const p = this.player
    this.lifetime.deaths++
    p.clearCombatState()
    p.respawnIn = PLAYER_RESPAWN_TICKS
    this.push({ kind: 'playerDied' })
    this.checkAchievement('deaths-10', this.lifetime.deaths >= 10)
    // An assault banks its damage before the field is torn down, so endAssault
    // must read the colossus's HP first.
    if (this.phase === 'assault') {
      this.endAssault('death')
      return
    }
    // The field clears; you wake at camp.
    this.enemies = []
    this.targetIid = null
    this.pendingSpawn = null
    this.spawnIn = 0
    if (this.route !== null) this.endExpedition('death')
  }

  private revivePlayer(): void {
    const p = this.player
    p.combatant.reset()
    p.mana = this.stats.maxMana
    p.respawnIn = 0
    p.regenElapsed = 0
    this.push({ kind: 'playerRespawned' })
  }

  private spawnPending(): void {
    const kind = this.pendingSpawn
    if (kind === null) return
    this.pendingSpawn = null
    this.spawnIn = 0
    let slots: EncounterSlot[]
    if (kind === 'boss') {
      slots = [{ enemyId: this.zone.bossId }]
    } else if (kind === 'elite') {
      slots = pickWeighted(
        this.rng,
        this.zone.eliteEncounters.map((e) => ({ value: e.slots, weight: e.weight })),
      )
    } else {
      slots = pickWeighted(
        this.rng,
        this.zone.encounters.map((e) => ({ value: e.slots, weight: e.weight })),
      )
    }
    this.enemies = slots.map(
      (s) => new EnemyUnit(this.enemyDef(s.enemyId), this.nextIid++, s.row ?? 'front'),
    )
    if (kind === 'boss') this.bossFightStart = this.tickCount
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
  }

  // ─────────────────────── progression ───────────────────────

  private addXp(amount: number): void {
    if (amount <= 0) return
    this.push({ kind: 'xpGained', amount })
    if (this.level >= LEVEL_CAP) return
    this.xp += amount
    let leveled = false
    while (this.level < LEVEL_CAP && this.xp >= xpToNext(this.level)) {
      this.xp -= xpToNext(this.level)
      this.level++
      leveled = true
      this.push({ kind: 'levelUp', level: this.level, unlocked: abilitiesUnlockedAt(this.level) })
    }
    if (this.level >= LEVEL_CAP) this.xp = 0
    if (leveled) {
      this.refreshStats(true)
      this.checkAchievement('level-5', this.level >= 5)
      this.checkAchievement('level-10', this.level >= 10)
      this.checkAchievement('level-15', this.level >= LEVEL_CAP)
    }
  }

  private addGold(amount: number, source: 'kill' | 'sale'): void {
    if (amount <= 0) return
    this.gold += amount
    this.lifetime.goldEarned += amount
    this.push({ kind: 'goldGained', amount, source })
    this.checkAchievement('gold-1000', this.lifetime.goldEarned >= 1000)
  }

  private dropLoot(def: EnemyDef): void {
    this.grantLoot(def.level, def.rank === 'boss' ? 'rare' : 'common')
  }

  /** Roll and hand over an item at the given ilvl / minimum rarity, honouring
   *  the inventory cap (a full bag auto-sells). Returns the item either way, so
   *  a cache can name what it coughed up. */
  private grantLoot(ilvl: number, minRarity: Rarity): Item {
    const item = generateItem(this.rng, this.nextUid++, ilvl, { minRarity })
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
    return item
  }

  private refreshStats(fullRestore: boolean): void {
    this.stats = this.applyBlessings(deriveStats(this.level, this.talents, this.equipped))
    this.player.applyStats(this.stats, fullRestore)
  }

  /** Blessings bend the derived stats as a post-derive pass, read from the
   *  blessing table as data. `travelMult` is not a stat — it is read when a hop
   *  starts — so it is skipped here. */
  private applyBlessings(base: DerivedStats): DerivedStats {
    if (this.blessings.size === 0) return base
    const s = { ...base }
    for (const id of this.blessings) {
      const effect = BLESSINGS[id].effect
      switch (effect.kind) {
        case 'stat':
          s[effect.stat] += effect.add
          break
        case 'maxHpPct':
          s.maxHp = Math.round(s.maxHp * (1 + effect.pct / 100))
          break
        case 'regenMult':
          s.regenPerInterval = Math.round(s.regenPerInterval * effect.mult)
          break
        case 'travelMult':
          break
      }
    }
    return s
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

  spendTalent(id: TalentId): boolean {
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

  zoneUnlocked(zoneId: string): boolean {
    const idx = this.content.zones.findIndex((z) => z.id === zoneId)
    if (idx < 0) return false
    const prev = this.content.zones[idx - 1]
    return idx === 0 || (prev !== undefined && this.bossesDefeated.has(prev.id))
  }

  /** Change zones — only from camp, and only to an unlocked, different zone. */
  travelTo(zoneId: string): boolean {
    if (this.phase !== 'camp') return false
    const zone = this.content.zones.find((z) => z.id === zoneId)
    if (!zone || zone.id === this.zone.id || !this.zoneUnlocked(zoneId)) return false
    this.zone = zone
    this.push({ kind: 'zoneEntered', zoneId: zone.id, name: zone.name })
    return true
  }

  // ─────────────────────── expedition intents ───────────────────────

  private get isLastNode(): boolean {
    return this.route !== null && this.nodeIndex === this.route.length - 1
  }

  /** Set out from camp: generate a route and start walking to node 0. */
  embark(): boolean {
    if (this.phase !== 'camp' || !this.player.alive) return false
    this.route = generateRoute(this.rng, this.zone)
    this.blessings.clear()
    this.pendingShrine = null
    this.revealedThrough = -1
    this.autoBreather = 0
    this.refreshStats(false)
    this.push({ kind: 'expeditionStarted', zoneId: this.zone.id, nodes: this.route.length })
    this.startTravel(0)
    return true
  }

  /** Press on from a resolved node to the next. */
  advance(): boolean {
    if (this.phase !== 'node' || !this.nodeResolvedFlag || this.route === null) return false
    if (this.isLastNode) return false
    this.autoBreather = 0
    this.startTravel(this.nodeIndex + 1)
    return true
  }

  /** Turn back to camp at any point in an expedition, keeping all loot earned. */
  retreat(): boolean {
    if (this.phase === 'assault') return this.endAssault('retreat')
    if (this.route === null) return false
    this.despawnForTransition()
    this.pendingSpawn = null
    this.spawnIn = 0
    this.endExpedition('retreat')
    return true
  }

  /** Take one of the two blessings a shrine is offering. */
  chooseBlessing(id: BlessingId): boolean {
    if (!this.pendingShrine || !this.pendingShrine.includes(id)) return false
    this.pendingShrine = null
    this.gainBlessing(id)
    this.nodeResolvedFlag = true
    this.push({ kind: 'nodeResolved', index: this.nodeIndex })
    return true
  }

  private gainBlessing(id: BlessingId): void {
    this.blessings.add(id)
    this.push({ kind: 'blessingGained', id })
    const before = this.player.combatant.maxHp
    this.refreshStats(false)
    // Stoneskin heals the flesh it just added.
    if (BLESSINGS[id].effect.kind === 'maxHpPct') {
      const added = this.player.combatant.maxHp - before
      if (added > 0) this.player.combatant.heal(added)
    }
  }

  private startTravel(toIndex: number): void {
    this.nodeIndex = toIndex
    this.nodeResolvedFlag = false
    this.pendingSpawn = null
    // Reveal the node we now walk toward (fog of war).
    this.revealedThrough = Math.max(this.revealedThrough, toIndex)
    this.phase = 'travel'
    this.travelTotal = this.blessings.has('springstep') ? Math.floor(TRAVEL_TICKS / 2) : TRAVEL_TICKS
    this.travelRemaining = this.travelTotal
    const flavor = pickOne(this.rng, this.zone.travelLines)
    this.push({ kind: 'travelStarted', toIndex, flavor })
  }

  private arriveAtNode(): void {
    if (this.route === null) return
    this.phase = 'node'
    this.travelRemaining = 0
    const kind = this.route[this.nodeIndex]!
    this.push({ kind: 'nodeArrived', index: this.nodeIndex, nodeKind: kind })
    this.resolveArrival(kind)
  }

  /** Run a node's arrival behavior. Combat nodes queue a spawn; the rest
   *  resolve then and there (or, for a shrine, wait on a blessing choice). */
  private resolveArrival(kind: NodeKind): void {
    switch (kind) {
      case 'battle':
        this.pendingSpawn = 'battle'
        this.spawnIn = NODE_SPAWN_TICKS
        break
      case 'elite':
        this.pendingSpawn = 'elite'
        this.spawnIn = NODE_SPAWN_TICKS
        break
      case 'boss':
        this.pendingSpawn = 'boss'
        this.spawnIn = BOSS_APPROACH_TICKS
        break
      case 'cache':
        this.openCache()
        break
      case 'rest':
        this.takeRest()
        break
      case 'shrine':
        this.offerShrine()
        break
    }
  }

  private openCache(): void {
    const zoneOrdinal = this.content.zones.findIndex((z) => z.id === this.zone.id) + 1
    const gold = rollInt(this.rng, 12, 24) * zoneOrdinal
    this.addGold(gold, 'kill')
    let item: Item | null = null
    if (rollPct(this.rng, 35)) item = this.grantLoot(this.zone.minLevel + 1, 'uncommon')
    this.push({ kind: 'cacheOpened', gold, item })
    this.nodeResolvedFlag = true
    this.push({ kind: 'nodeResolved', index: this.nodeIndex })
  }

  private takeRest(): void {
    const p = this.player
    const hpRestored = p.combatant.heal(Math.floor(p.combatant.maxHp * 0.6))
    const manaBefore = p.mana
    p.mana = Math.min(this.stats.maxMana, p.mana + Math.floor(this.stats.maxMana * 0.6))
    this.push({ kind: 'rested', hpRestored, manaRestored: p.mana - manaBefore })
    this.nodeResolvedFlag = true
    this.push({ kind: 'nodeResolved', index: this.nodeIndex })
  }

  private offerShrine(): void {
    const pool = BLESSING_IDS.filter((id) => !this.blessings.has(id))
    const choices: BlessingId[] = []
    const copy = [...pool]
    while (choices.length < 2 && copy.length > 0) {
      const i = rollInt(this.rng, 0, copy.length - 1)
      choices.push(copy.splice(i, 1)[0]!)
    }
    if (choices.length === 0) {
      // Nothing left to offer — the shrine is silent.
      this.nodeResolvedFlag = true
      this.push({ kind: 'nodeResolved', index: this.nodeIndex })
      return
    }
    this.pendingShrine = choices
    this.push({ kind: 'shrineOffered', choices })
  }

  /** Tear down the expedition (any outcome), drop blessing modifiers, and stand
   *  the hero back at camp. */
  private endExpedition(outcome: 'completed' | 'retreat' | 'death'): void {
    this.route = null
    this.nodeIndex = 0
    this.nodeResolvedFlag = false
    this.pendingShrine = null
    this.pendingSpawn = null
    this.bossFightStart = null
    this.blessings.clear()
    this.phase = 'camp'
    this.autoBreather = 0
    this.refreshStats(false)
    this.push({ kind: 'expeditionEnded', outcome })
  }

  // ─────────────────────── world boss (scaffold) ───────────────────────

  /** Throw yourself at the Rift Colossus from camp. It spawns at its current
   *  pooled HP as the sole enemy; the fight ends on its death, yours, or
   *  retreat. */
  assaultWorldBoss(): boolean {
    if (this.phase !== 'camp' || !this.player.alive) return false
    this.phase = 'assault'
    const def: EnemyDef = { ...WORLD_BOSS, hp: this.worldBossHp }
    const unit = new EnemyUnit(def, this.nextIid++)
    this.enemies = [unit]
    this.targetIid = unit.iid
    this.bossFightStart = this.tickCount
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

  /** End an assault (retreat or death): bank the damage into the pool. */
  private endAssault(outcome: 'retreat' | 'death'): boolean {
    const colossus = this.enemies[0]
    const remaining = colossus ? colossus.combatant.hp : this.worldBossHp
    const damageDealt = this.worldBossHp - remaining
    this.worldBossHp = remaining
    if (damageDealt > this.records.bestAssaultDamage) this.records.bestAssaultDamage = damageDealt
    if (outcome === 'retreat') this.despawnForTransition()
    this.enemies = []
    this.targetIid = null
    this.bossFightStart = null
    this.phase = 'camp'
    this.autoBreather = 0
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
    this.bossFightStart = null
    this.phase = 'camp'
    this.autoBreather = 0
  }

  // ─────────────────────── companion (scaffold) ───────────────────────

  /** Hire a companion from camp: pays its cost and persists in the save. */
  hireCompanion(id = 'wren'): boolean {
    if (this.phase !== 'camp' || this.companionId !== null) return false
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

  combatSnapshot(): Readonly<CombatSnapshot> {
    const p = this.player
    return {
      tick: this.tickCount,
      phase: this.phase,
      player: p.snapshot(this.stats),
      enemies: this.enemies.map((e) => e.snapshot()),
      target: this.targetIid,
      spawnIn: this.enemies.length > 0 ? 0 : this.spawnIn,
      expedition: this.expeditionSnapshot(),
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
      companion: this.companionSnapshot(),
    }
  }

  private companionSnapshot(): { name: string; swingProgress: number } | null {
    if (this.companionId === null) return null
    const comp = COMPANIONS[this.companionId]
    if (!comp) return null
    return { name: comp.name, swingProgress: Math.min(1, this.companionSwing / comp.swingTicks) }
  }

  private expeditionSnapshot(): ExpeditionSnapshot | null {
    if (this.route === null) return null
    const nodes: ExpeditionNodeView[] = this.route.map((kind, i) => {
      const revealed = i <= this.revealedThrough || kind === 'boss'
      const state: ExpeditionNodeView['state'] =
        i < this.nodeIndex ? 'done' : i === this.nodeIndex ? 'current' : 'ahead'
      return { kind: revealed ? kind : 'unknown', state }
    })
    return {
      index: this.nodeIndex,
      total: this.route.length,
      traveling: this.phase === 'travel',
      travelRemaining: this.travelRemaining,
      travelTotal: this.travelTotal,
      nodeResolved: this.nodeResolvedFlag,
      nodes,
      pendingShrine: this.pendingShrine ? [...this.pendingShrine] : null,
      blessings: [...this.blessings],
    }
  }

  progressSnapshot(): Readonly<ProgressSnapshot> {
    const ranks = {} as Record<TalentId, number>
    for (const id of Object.keys(TALENTS) as TalentId[]) ranks[id] = this.talents[id] ?? 0
    return {
      level: this.level,
      xp: this.xp,
      xpToNext: xpToNext(this.level),
      gold: this.gold,
      stats: { ...this.stats },
      unlockedAbilities: unlockedAbilities(this.level),
      talentPoints: talentPointsEarned(this.level) - talentPointsSpent(this.talents),
      talentRanks: ranks,
      inventory: [...this.inventory],
      equipped: { ...this.equipped },
      zoneId: this.zone.id,
      zones: this.content.zones.map((z) => ({
        id: z.id,
        name: z.name,
        epithet: z.epithet,
        minLevel: z.minLevel,
        hue: z.hue,
        unlocked: this.zoneUnlocked(z.id),
        current: z.id === this.zone.id,
        bossDefeated: this.bossesDefeated.has(z.id),
        bossName: this.enemyDef(z.bossId).name,
        enemyNames: [
          ...new Set(z.encounters.flatMap((e) => e.slots.map((s) => this.enemyDef(s.enemyId).name))),
        ],
      })),
      achievements: [...this.achievements],
      lifetime: { ...this.lifetime },
      records: { ...this.records, fastestBossKills: { ...this.records.fastestBossKills } },
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
      completed: this.completed,
    }
  }

  // ─────────────────────── persistence ───────────────────────

  serialize(): SaveData {
    return {
      version: 2,
      level: this.level,
      xp: this.xp,
      gold: this.gold,
      talents: { ...this.talents },
      equipped: { ...this.equipped },
      inventory: [...this.inventory],
      nextUid: this.nextUid,
      zoneId: this.zone.id,
      bossesDefeated: [...this.bossesDefeated],
      achievements: [...this.achievements],
      lifetime: { ...this.lifetime },
      records: { ...this.records, fastestBossKills: { ...this.records.fastestBossKills } },
      worldBossHp: this.worldBossHp,
      companionId: this.companionId,
      autoBattle: this.autoBattle,
      completed: this.completed,
    }
  }

  /** Rebuild a sim from a save. Expedition state is not persisted: you come
   *  back rested, at full strength, standing in camp. */
  static deserialize(data: SaveData, opts: SimOptions): GameSim {
    // v1 saves are accepted; their dead fields (savedAt, muted, zoneKills that
    // no longer gate anything) are simply ignored on the way in.
    const version = data.version as number
    if (version !== 1 && version !== 2) {
      throw new Error(`unknown save version: ${String(data.version)}`)
    }
    const sim = new GameSim(opts)
    sim.level = Math.min(Math.max(1, data.level), LEVEL_CAP)
    sim.xp = Math.max(0, data.xp)
    sim.gold = Math.max(0, data.gold)
    sim.talents = { ...data.talents }
    sim.equipped = { ...data.equipped }
    sim.inventory = [...data.inventory]
    sim.nextUid = Math.max(1, data.nextUid)
    for (const id of data.bossesDefeated) sim.bossesDefeated.add(id)
    for (const id of data.achievements) sim.achievements.add(id)
    sim.lifetime = { ...data.lifetime }
    // New v2 fields; a v1 blob lacks them, so default in.
    const rec = data.records as Records | undefined
    if (rec) {
      sim.records = {
        expeditionsCompleted: rec.expeditionsCompleted ?? 0,
        worldBossFells: rec.worldBossFells ?? 0,
        bestAssaultDamage: rec.bestAssaultDamage ?? 0,
        fastestBossKills: { ...(rec.fastestBossKills ?? {}) },
      }
    }
    sim.worldBossHp = (data.worldBossHp as number | undefined) ?? WORLD_BOSS_MAX_HP
    sim.companionId = (data.companionId as string | null | undefined) ?? null
    sim.autoBattle = data.autoBattle
    sim.completed = data.completed
    const zone = sim.content.zones.find((z) => z.id === data.zoneId)
    if (zone && sim.zoneUnlocked(zone.id)) sim.zone = zone
    sim.refreshStats(true)
    return sim
  }

  private autoAct(): void {
    const p = this.player
    if (!p.alive) return
    const living = this.living

    // A mob is winding up a bolt and counterspell is off cooldown: swing the
    // target over to the caster and shatter it.
    const caster = living.find((u) => u.cast !== null)
    if (
      caster &&
      p.cooldowns['counterspell'] === 0 &&
      this.level >= ABILITIES.counterspell.unlockLevel &&
      p.mana >= ABILITIES.counterspell.manaCost
    ) {
      this.setTarget(caster.iid)
      if (this.canUse('counterspell')) this.useAbility('counterspell')
    }

    if (p.cast !== null || p.gcd > 0 || p.queued !== null) return
    const hpPct = (p.combatant.hp * 100) / p.combatant.maxHp
    if (hpPct <= 60 && this.canUse('renew')) return void this.useAbility('renew')
    if (hpPct <= 75 && this.canUse('barrier')) return void this.useAbility('barrier')
    if (living.length === 0) return

    // Focus fire: finishing the weakest packmate shrinks incoming damage.
    const e = this.target
    if (e && living.length > 1) {
      const weakest = living.reduce((a, b) => (b.combatant.hp < a.combatant.hp ? b : a))
      if (weakest.combatant.hp < e.combatant.hp) this.setTarget(weakest.iid)
    }
    const t = this.target
    if (!t) return
    const enemyHpPct = (t.combatant.hp * 100) / t.combatant.maxHp
    if ((t.def.rank !== 'normal' || enemyHpPct >= 60) && this.canUse('combustion')) {
      return void this.useAbility('combustion')
    }
    if (!t.ignite?.active && this.canUse('ignite')) return void this.useAbility('ignite')
    if (this.canUse('pyroblast')) return void this.useAbility('pyroblast')
    if (this.canUse('fireball')) return void this.useAbility('fireball')
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
