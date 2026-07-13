import {
  ABILITIES,
  ABILITY_EFFECTS,
  ABILITY_IDS,
  COMBUSTION_CRIT_BONUS,
  COMBUSTION_FIRE_BONUS_PCT,
} from './abilities'
import { ACHIEVEMENT_BY_ID } from './content/achievements'
import { generateItem, sellValue } from './content/items'
import { TALENTS } from './content/talents'
import { DEFAULT_CONTENT } from './content/zones'
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
import { pickWeighted, rollInt, rollPct, type Rng } from './rng'
import type {
  AbilityId,
  CombatSnapshot,
  ContentPack,
  DerivedStats,
  EnemyDef,
  Item,
  ItemSlot,
  LifetimeStats,
  OfflineSummary,
  ProgressSnapshot,
  SaveData,
  School,
  TalentId,
  ZoneDef,
} from './types'
import {
  BOSS_APPROACH_TICKS,
  BOSS_KILLS_REQUIRED,
  GCD_TICKS,
  INVENTORY_CAP,
  LEVEL_CAP,
  MS_PER_TICK,
  OFFLINE_CAP_TICKS,
  PLAYER_RESPAWN_TICKS,
  REGEN_INTERVAL_TICKS,
  RESPEC_COST,
  SPAWN_GAP_TICKS,
} from './types'

export interface SimOptions {
  content?: ContentPack
  rng?: Rng
}

const RARITY_ORDER = { common: 0, uncommon: 1, rare: 2, epic: 3 } as const

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
  private zoneKills: Record<string, number> = {}
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
  private completed = false
  autoBattle = false
  /** UI sound setting; lives here only so one save blob covers everything. */
  muted = false

  // ── combat ──
  private stats: DerivedStats
  private readonly player: PlayerUnit
  private enemy: EnemyUnit | null = null
  private spawnIn = 20 // first enemy 1 s after boot
  private spawnKind: 'normal' | 'boss' = 'normal'
  private pending: CombatEvent[] = []

  constructor(opts: SimOptions = {}) {
    this.content = opts.content ?? DEFAULT_CONTENT
    this.rng = opts.rng ?? Math.random
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
      // Between fights the observatory knits you back together.
      if (this.enemy === null) {
        p.combatant.heal(Math.max(1, Math.round((p.combatant.maxHp * 7) / 100)))
      }
    }

    if (this.enemy === null) {
      this.spawnIn--
      if (this.spawnIn <= 0) this.spawnEnemy()
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

    // Enemy phase.
    const e = this.enemy
    if (e && e.combatant.alive) {
      // The hero's burn.
      if (e.ignite) {
        const due = e.ignite.tick()
        if (!e.ignite.active) e.ignite = null
        if (due > 0) {
          const dealt = e.combatant.damage(due)
          if (dealt > 0) {
            this.push({ kind: 'damage', target: 'enemy', amount: dealt, absorbed: 0, crit: false, source: 'ignite' })
          }
          if (!e.combatant.alive) {
            this.onEnemyKilled(e)
            return this.autoThenDrain()
          }
          if (e.checkEnrage()) this.push({ kind: 'enemyEnraged', name: e.def.name })
        }
      }

      if (e.cast) {
        // Hardcast winds up; no swings while casting.
        e.cast.elapsed++
        if (e.cast.elapsed >= e.cast.mech.castTicks) {
          const mech = e.cast.mech
          e.cast = null
          e.castCooldown = mech.cooldownTicks
          this.damagePlayer(rollInt(this.rng, mech.dmgMin, mech.dmgMax), 'enemyCast', mech.name)
          if (!p.alive) return this.drain()
        }
      } else {
        const hc = e.hardcastMech
        if (hc) {
          e.castCooldown--
          if (e.castCooldown <= 0) {
            e.cast = { mech: hc, elapsed: 0 }
            this.push({ kind: 'enemyCastStarted', name: hc.name })
          }
        }
        if (e.cast === null) {
          e.swingElapsed++
          if (e.swingElapsed >= e.swingTicks) {
            e.swingElapsed = 0
            const [min, max] = e.dmgRange
            this.damagePlayer(rollInt(this.rng, min, max), 'enemySwing')
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
          this.push({ kind: 'dotApplied', target: 'player', name: vm.name })
        }
      }
    }

    return this.autoThenDrain()
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
    if (id === 'counterspell') return this.enemy?.cast != null
    if (def.offensive && (!this.enemy || !this.enemy.combatant.alive)) return false
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
    if (def.offensive && (!this.enemy || !this.enemy.combatant.alive)) return false
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
    // Cooldowns start when the ability resolves — including fizzles.
    p.cooldowns[id] = def.cooldownTicks
    if (def.offensive && (!this.enemy || !this.enemy.combatant.alive)) {
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
        const e = this.enemy
        if (!e) break
        // The burn snapshots power/combustion at apply time; its ticks never crit.
        let tickDmg = Math.round((effect.tickDamage * (100 + this.stats.power)) / 100)
        const pct = this.stats.fireMultPct + (p.combustion > 0 ? COMBUSTION_FIRE_BONUS_PCT : 0)
        tickDmg = Math.max(1, Math.round((tickDmg * pct) / 100))
        e.ignite = new Dot(def.name, tickDmg, effect.intervalTicks, effect.tickCount)
        this.push({ kind: 'dotApplied', target: 'enemy', name: def.name, abilityId: id })
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
        const e = this.enemy
        if (e?.cast) {
          const name = e.cast.mech.name
          e.castCooldown = e.cast.mech.cooldownTicks
          e.cast = null
          this.lifetime.interrupts++
          this.push({ kind: 'interrupted', name })
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

  private damagePlayer(raw: number, source: DamageSource, label?: string): void {
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
      this.push({ kind: 'damage', target: 'player', amount: dealt, absorbed, crit: false, source, label })
    }
    if (!p.alive) this.onPlayerDied()
  }

  private damageEnemy(amount: number, crit: boolean, source: DamageSource): void {
    const e = this.enemy
    if (!e || !e.combatant.alive) return
    const dealt = e.combatant.damage(amount)
    if (dealt > 0) this.push({ kind: 'damage', target: 'enemy', amount: dealt, absorbed: 0, crit, source })
    if (!e.combatant.alive) this.onEnemyKilled(e)
    else if (e.checkEnrage()) this.push({ kind: 'enemyEnraged', name: e.def.name })
  }

  private onEnemyKilled(e: EnemyUnit): void {
    const def = e.def
    this.lifetime.kills++
    this.zoneKills[this.zone.id] = (this.zoneKills[this.zone.id] ?? 0) + 1
    this.push({ kind: 'enemyDied', defId: def.id, name: def.name, rank: def.rank })

    if (this.player.queued && ABILITIES[this.player.queued].offensive) this.player.queued = null

    this.addGold(rollInt(this.rng, def.goldMin, def.goldMax), 'kill')
    this.addXp(def.xp)
    if (rollPct(this.rng, def.dropPct)) this.dropLoot(def)

    if (def.rank === 'boss') {
      this.lifetime.bossKills++
      const zoneIdx = this.content.zones.findIndex((z) => z.bossId === def.id)
      const zone = this.content.zones[zoneIdx]
      if (zone && !this.bossesDefeated.has(zone.id)) {
        this.bossesDefeated.add(zone.id)
        const next = this.content.zones[zoneIdx + 1] ?? null
        this.push({ kind: 'bossDefeated', zoneId: zone.id, nextZoneId: next?.id ?? null })
      }
      this.checkAchievement(`boss-${def.id}`, true)
      if (def.id === this.content.finalBossId && !this.completed) {
        this.completed = true
        this.push({ kind: 'gameCompleted' })
      }
    } else if (
      (this.zoneKills[this.zone.id] ?? 0) === BOSS_KILLS_REQUIRED &&
      !this.bossesDefeated.has(this.zone.id)
    ) {
      this.push({ kind: 'bossReady', zoneId: this.zone.id })
    }

    this.checkAchievement('first-blood', true)
    this.checkAchievement('kills-100', this.lifetime.kills >= 100)
    this.checkAchievement('kills-500', this.lifetime.kills >= 500)

    this.enemy = null
    this.spawnIn = SPAWN_GAP_TICKS
    this.spawnKind = 'normal'
  }

  private onPlayerDied(): void {
    const p = this.player
    this.lifetime.deaths++
    p.clearCombatState()
    p.respawnIn = PLAYER_RESPAWN_TICKS
    // The victor wanders off; a boss must be re-challenged.
    this.enemy = null
    this.spawnKind = 'normal'
    this.push({ kind: 'playerDied' })
    this.checkAchievement('deaths-10', this.lifetime.deaths >= 10)
  }

  private revivePlayer(): void {
    const p = this.player
    p.combatant.reset()
    p.mana = this.stats.maxMana
    p.respawnIn = 0
    p.regenElapsed = 0
    this.spawnIn = SPAWN_GAP_TICKS
    this.spawnKind = 'normal'
    this.push({ kind: 'playerRespawned' })
  }

  private spawnEnemy(): void {
    const def: EnemyDef =
      this.spawnKind === 'boss'
        ? this.enemyDef(this.zone.bossId)
        : this.enemyDef(
            pickWeighted(
              this.rng,
              this.zone.spawns.map((s) => ({ value: s.enemyId, weight: s.weight })),
            ),
          )
    this.spawnKind = 'normal'
    this.spawnIn = 0
    this.enemy = new EnemyUnit(def)
    this.push({ kind: 'enemySpawned', defId: def.id, name: def.name, rank: def.rank, intro: def.intro })
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
    const item = generateItem(this.rng, this.nextUid++, def.level, {
      minRarity: def.rank === 'boss' ? 'rare' : 'common',
    })
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

  travelTo(zoneId: string): boolean {
    const zone = this.content.zones.find((z) => z.id === zoneId)
    if (!zone || zone.id === this.zone.id || !this.zoneUnlocked(zoneId)) return false
    this.zone = zone
    this.despawnForTransition()
    this.spawnKind = 'normal'
    this.spawnIn = SPAWN_GAP_TICKS
    this.push({ kind: 'zoneEntered', zoneId: zone.id, name: zone.name })
    return true
  }

  challengeBoss(): boolean {
    if (!this.player.alive) return false
    if ((this.zoneKills[this.zone.id] ?? 0) < BOSS_KILLS_REQUIRED) return false
    if (this.enemy?.def.rank === 'boss') return false
    if (this.enemy === null && this.spawnKind === 'boss') return false
    this.despawnForTransition()
    this.spawnKind = 'boss'
    this.spawnIn = BOSS_APPROACH_TICKS
    return true
  }

  private despawnForTransition(): void {
    this.enemy = null
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
      player: p.snapshot(this.stats),
      enemy: this.enemy?.snapshot() ?? null,
      spawnIn: this.enemy ? 0 : this.spawnIn,
      spawnKind: this.spawnKind,
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
        kills: this.zoneKills[z.id] ?? 0,
        bossReady: (this.zoneKills[z.id] ?? 0) >= BOSS_KILLS_REQUIRED,
        bossDefeated: this.bossesDefeated.has(z.id),
        bossName: this.enemyDef(z.bossId).name,
        enemyNames: z.spawns.map((s) => this.enemyDef(s.enemyId).name),
      })),
      achievements: [...this.achievements],
      lifetime: { ...this.lifetime },
      completed: this.completed,
    }
  }

  // ─────────────────────── persistence ───────────────────────

  serialize(): SaveData {
    return {
      version: 1,
      savedAt: Date.now(),
      level: this.level,
      xp: this.xp,
      gold: this.gold,
      talents: { ...this.talents },
      equipped: { ...this.equipped },
      inventory: [...this.inventory],
      nextUid: this.nextUid,
      zoneId: this.zone.id,
      zoneKills: { ...this.zoneKills },
      bossesDefeated: [...this.bossesDefeated],
      achievements: [...this.achievements],
      lifetime: { ...this.lifetime },
      autoBattle: this.autoBattle,
      muted: this.muted,
      completed: this.completed,
    }
  }

  /** Rebuild a sim from a save. Mid-combat state is not persisted: you come
   *  back rested, at full strength, with a fresh spawn on the way. */
  static deserialize(data: SaveData, opts: SimOptions = {}): GameSim {
    if (data.version !== 1) throw new Error(`unknown save version: ${String(data.version)}`)
    const sim = new GameSim(opts)
    sim.level = Math.min(Math.max(1, data.level), LEVEL_CAP)
    sim.xp = Math.max(0, data.xp)
    sim.gold = Math.max(0, data.gold)
    sim.talents = { ...data.talents }
    sim.equipped = { ...data.equipped }
    sim.inventory = [...data.inventory]
    sim.nextUid = Math.max(1, data.nextUid)
    sim.zoneKills = { ...data.zoneKills }
    for (const id of data.bossesDefeated) sim.bossesDefeated.add(id)
    for (const id of data.achievements) sim.achievements.add(id)
    sim.lifetime = { ...data.lifetime }
    sim.autoBattle = data.autoBattle
    sim.muted = data.muted
    sim.completed = data.completed
    const zone = sim.content.zones.find((z) => z.id === data.zoneId)
    if (zone && sim.zoneUnlocked(zone.id)) sim.zone = zone
    sim.refreshStats(true)
    return sim
  }

  /** How many ticks of offline progress a wall-clock gap earns (capped). */
  static offlineTicks(elapsedMs: number): number {
    if (elapsedMs <= 0) return 0
    return Math.min(OFFLINE_CAP_TICKS, Math.floor(elapsedMs / MS_PER_TICK))
  }

  /** Simulate `ticks` of auto-battle (your echo keeps fighting) and summarize.
   *  Never challenges bosses. */
  fastForward(ticks: number): OfflineSummary {
    const levelFrom = this.level
    const prevAuto = this.autoBattle
    this.autoBattle = true
    let kills = 0
    let deaths = 0
    let xpGained = 0
    let goldGained = 0
    let itemsSold = 0
    const itemsKept: Item[] = []
    for (let i = 0; i < ticks; i++) {
      for (const event of this.tick()) {
        switch (event.kind) {
          case 'enemyDied':
            kills++
            break
          case 'playerDied':
            deaths++
            break
          case 'xpGained':
            xpGained += event.amount
            break
          case 'goldGained':
            goldGained += event.amount
            break
          case 'lootDropped':
            if (event.autoSold) itemsSold++
            else itemsKept.push(event.item)
            break
        }
      }
    }
    this.autoBattle = prevAuto
    itemsKept.sort((a, b) => RARITY_ORDER[b.rarity] - RARITY_ORDER[a.rarity] || b.ilvl - a.ilvl)
    return { ticks, kills, deaths, xpGained, goldGained, levelFrom, levelTo: this.level, itemsKept, itemsSold }
  }

  private autoAct(): void {
    const p = this.player
    if (!p.alive) return
    const e = this.enemy
    if (e?.cast && this.canUse('counterspell')) {
      this.useAbility('counterspell')
    }
    if (p.cast !== null || p.gcd > 0 || p.queued !== null) return
    const hpPct = (p.combatant.hp * 100) / p.combatant.maxHp
    if (hpPct <= 60 && this.canUse('renew')) return void this.useAbility('renew')
    if (hpPct <= 75 && this.canUse('barrier')) return void this.useAbility('barrier')
    if (!e || !e.combatant.alive) return
    const enemyHpPct = (e.combatant.hp * 100) / e.combatant.maxHp
    if ((e.def.rank !== 'normal' || enemyHpPct >= 60) && this.canUse('combustion')) {
      return void this.useAbility('combustion')
    }
    if (!e.ignite?.active && this.canUse('ignite')) return void this.useAbility('ignite')
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
