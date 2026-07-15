import {
  ABILITIES,
  ABILITY_EFFECTS,
  ABILITY_IDS,
  COMBUSTION_CRIT_BONUS,
  COMBUSTION_FIRE_BONUS_PCT,
} from './abilities'
import { ACHIEVEMENT_BY_ID } from './content/achievements'
import { COMPANIONS } from './content/companions'
import { generateItem, sellValue } from './content/items'
import { DEFAULT_CONTENT } from './content/regions'
import { TALENTS } from './content/talents'
import { WORLD_BOSS, WORLD_BOSS_MAX_HP } from './content/worldboss'
import { Dot } from './dot'
import { EnemyUnit } from './enemyUnit'
import type { CombatEvent, DamageSource } from './events'
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
  CombatSnapshot,
  ContentPack,
  DerivedStats,
  EncounterSlot,
  EnemyDef,
  Item,
  ItemSlot,
  LifetimeStats,
  MaterialStackView,
  ProgressSnapshot,
  Rarity,
  Records,
  RegionDef,
  RegionProgress,
  SaveData,
  School,
  TalentId,
} from './types'
import {
  GCD_TICKS,
  INVENTORY_CAP,
  LEVEL_CAP,
  NODE_SPAWN_TICKS,
  PLAYER_RESPAWN_TICKS,
  REGEN_INTERVAL_TICKS,
  RESPEC_COST,
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
  private region: RegionDef
  /** Inert crafting materials: materialId → count. */
  private materials: Record<string, number> = {}
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

  // ── phase ──
  /** combat: hunting in a region (endless). assault: fighting the world boss. */
  private phase: 'combat' | 'assault' = 'combat'

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
  /** Breather countdown before the next pack arrives (0 once on the field). */
  private spawnIn = 0
  /** What the pending spawn will be, when `spawnIn` reaches 0. */
  private pendingSpawn: 'battle' | 'elite' | null = null
  private pending: CombatEvent[] = []

  constructor(opts: SimOptions) {
    this.content = opts.content ?? DEFAULT_CONTENT
    this.rng = opts.rng
    const first = this.content.regions[0]
    if (!first) throw new Error('content pack has no regions')
    this.region = first
    this.stats = deriveStats(this.level, this.talents, this.equipped)
    this.player = new PlayerUnit(this.stats)
    this.scheduleSpawn()
  }

  /** Queue the next pack: mostly a normal encounter, occasionally an elite. */
  private scheduleSpawn(): void {
    const elite = this.region.eliteEncounters.length > 0 && rollPct(this.rng, 12)
    this.pendingSpawn = elite ? 'elite' : 'battle'
    this.spawnIn = NODE_SPAWN_TICKS
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
      // You catch your breath between packs — flesh knits back a little while
      // the field is empty. There is no such mercy mid-fight.
      if (this.phase === 'combat' && this.enemies.length === 0) {
        p.combatant.heal(Math.max(1, Math.round((p.combatant.maxHp * 8) / 100)))
      }
    }

    // Between packs, the next one closes in.
    if (this.pendingSpawn !== null && this.enemies.length === 0) {
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
    if (this.autoBattle) this.autoAct()
    return this.drain()
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
    this.rollMaterial()

    // The world boss lives in its own pool; its death runs a different path.
    if (this.phase === 'assault') {
      this.onWorldBossFelled()
      return
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

  /** The whole pack is down. Catch your breath, then the next pack is on its
   *  way — the hunt never ends. */
  private onEncounterCleared(): void {
    this.push({ kind: 'encounterCleared' })
    if (this.player.queued && ABILITIES[this.player.queued].offensive) this.player.queued = null
    this.enemies = []
    this.targetIid = null
    // Clearing a pack mends a quarter of your health — the reward for a clean win.
    if (this.player.alive) this.player.combatant.heal(Math.round((this.player.combatant.maxHp * 25) / 100))
    this.scheduleSpawn()
  }

  /** ~35% of kills cough up a stack of one of the current region's materials. */
  private rollMaterial(): void {
    if (!rollPct(this.rng, 35)) return
    const ids = this.region.materials
    if (ids.length === 0) return
    const id = pickOne(this.rng, ids)
    const count = rollInt(this.rng, 1, 3)
    this.materials[id] = (this.materials[id] ?? 0) + count
    this.push({ kind: 'materialDropped', id, count })
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
      this.endAssault()
      return
    }
    // The field clears; combat resumes when you revive.
    this.enemies = []
    this.targetIid = null
    this.scheduleSpawn()
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
    const table =
      kind === 'elite' && this.region.eliteEncounters.length > 0
        ? this.region.eliteEncounters
        : this.region.encounters
    const slots: EncounterSlot[] = pickWeighted(
      this.rng,
      table.map((e) => ({ value: e.slots, weight: e.weight })),
    )
    this.enemies = slots.map(
      (s) => new EnemyUnit(this.enemyDef(s.enemyId), this.nextIid++, s.row ?? 'front'),
    )
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
    this.stats = deriveStats(this.level, this.talents, this.equipped)
    this.player.applyStats(this.stats, fullRestore)
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

  /** Switch regions. Allowed any time you are in combat (not mid-assault). */
  enterRegion(regionId: string): boolean {
    if (this.phase !== 'combat') return false
    const region = this.content.regions.find((r) => r.id === regionId)
    if (!region || region.id === this.region.id) return false
    this.region = region
    this.despawnForTransition()
    this.pendingSpawn = null
    this.scheduleSpawn()
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
    if (this.phase !== 'combat' || !this.player.alive) return false
    this.phase = 'assault'
    this.pendingSpawn = null
    this.despawnForTransition()
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

  /** End an assault (retreat or death): bank the damage, return to region combat. */
  private endAssault(): boolean {
    const colossus = this.enemies[0]
    const remaining = colossus ? colossus.combatant.hp : this.worldBossHp
    const damageDealt = this.worldBossHp - remaining
    this.worldBossHp = remaining
    if (damageDealt > this.records.bestAssaultDamage) this.records.bestAssaultDamage = damageDealt
    this.enemies = []
    this.targetIid = null
    this.phase = 'combat'
    this.scheduleSpawn()
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
    this.phase = 'combat'
    this.scheduleSpawn()
  }

  // ─────────────────────── companion (scaffold) ───────────────────────

  /** Hire a companion: pays its cost and persists in the save. */
  hireCompanion(id = 'wren'): boolean {
    if (this.phase !== 'combat' || this.companionId !== null) return false
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

  private regionProgress(): RegionProgress[] {
    return this.content.regions.map((r) => ({
      id: r.id,
      name: r.name,
      epithet: r.epithet,
      tier: r.tier,
      minLevel: r.minLevel,
      maxLevel: r.maxLevel,
      hue: r.hue,
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
      stats: { ...this.stats },
      unlockedAbilities: unlockedAbilities(this.level),
      talentPoints: talentPointsEarned(this.level) - talentPointsSpent(this.talents),
      talentRanks: ranks,
      inventory: [...this.inventory],
      equipped: { ...this.equipped },
      regionId: this.region.id,
      regions: this.regionProgress(),
      materials: this.materialStacks(),
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
      version: 3,
      level: this.level,
      xp: this.xp,
      gold: this.gold,
      talents: { ...this.talents },
      equipped: { ...this.equipped },
      inventory: [...this.inventory],
      nextUid: this.nextUid,
      regionId: this.region.id,
      materials: { ...this.materials },
      achievements: [...this.achievements],
      lifetime: { ...this.lifetime },
      records: { ...this.records },
      worldBossHp: this.worldBossHp,
      companionId: this.companionId,
      autoBattle: this.autoBattle,
    }
  }

  /** Legacy zoneId → region, for saves written before regions existed. */
  private static readonly ZONE_TO_REGION: Record<string, string> = {
    hollowroot: 'verdant',
    duskmire: 'verdant',
    stormcrag: 'emberwild',
    'ashen-wastes': 'emberwild',
    'sundered-spire': 'riftedge',
  }

  /** Rebuild a sim from a save. In-combat state is not persisted: you come back
   *  at full strength, already hunting the region you last chose. */
  static deserialize(data: SaveData, opts: SimOptions): GameSim {
    // v1/v2 saves are accepted; their dead fields (savedAt, muted, zoneKills,
    // bossesDefeated, expedition records) are simply ignored on the way in.
    const raw = data as unknown as Record<string, unknown>
    const version = data.version as number
    if (version !== 1 && version !== 2 && version !== 3) {
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
    for (const id of data.achievements) sim.achievements.add(id)
    sim.lifetime = { ...data.lifetime }
    const rec = raw.records as Partial<Records> | undefined
    sim.records = {
      worldBossFells: rec?.worldBossFells ?? 0,
      bestAssaultDamage: rec?.bestAssaultDamage ?? 0,
    }
    sim.materials = { ...((raw.materials as Record<string, number> | undefined) ?? {}) }
    sim.worldBossHp = (data.worldBossHp as number | undefined) ?? WORLD_BOSS_MAX_HP
    sim.companionId = (data.companionId as string | null | undefined) ?? null
    sim.autoBattle = data.autoBattle ?? false
    // Resolve the region: prefer regionId (v3), then map a legacy zoneId, else default.
    const regionId =
      (raw.regionId as string | undefined) ??
      GameSim.ZONE_TO_REGION[(raw.zoneId as string | undefined) ?? ''] ??
      sim.content.regions[0]!.id
    const region = sim.content.regions.find((r) => r.id === regionId)
    if (region) sim.region = region
    sim.refreshStats(true)
    sim.scheduleSpawn()
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
