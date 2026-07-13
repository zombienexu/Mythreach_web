import { ABILITIES, ABILITY_IDS, type AbilityDef } from './abilities'
import { Combatant } from './combatant'
import { Dot } from './dot'
import type { CombatEvent } from './events'
import { rollInt, type Rng } from './rng'
import type { AbilityId, CombatSnapshot, EncounterConfig } from './types'

/** The whole game: pure, synchronous, integer-tick simulation.
 *  Events are buffered and returned from the tick() that surfaces them,
 *  so the UI drains exactly one array per tick. */
export class CombatEngine {
  private tickCount = 0
  private readonly player: Combatant
  private readonly enemy: Combatant
  private cast: { ability: AbilityDef; elapsed: number } | null = null
  private readonly cooldowns: Record<AbilityId, number> = { fireball: 0, ignite: 0, renew: 0 }
  private readonly dot: Dot
  private swingElapsed = 0
  private kills = 0
  private gold = 0
  private enemyRespawnIn = 0
  private playerRespawnIn = 0
  private pending: CombatEvent[] = []

  constructor(
    private readonly config: EncounterConfig,
    private readonly rng: Rng = Math.random,
  ) {
    this.player = new Combatant(config.playerMaxHp)
    this.enemy = new Combatant(config.enemyMaxHp)
    const igniteEffect = ABILITIES.ignite.effect
    if (igniteEffect.kind !== 'dot') throw new Error('ignite must be a dot ability')
    this.dot = new Dot(igniteEffect)
  }

  canUse(id: AbilityId): boolean {
    if (!this.player.alive) return false
    if (this.cast !== null) return false
    if (this.cooldowns[id] > 0) return false
    if (ABILITIES[id].offensive && !this.enemy.alive) return false
    return true
  }

  /** Start a cast or resolve an instant. Returns false when refused. */
  useAbility(id: AbilityId): boolean {
    if (!this.canUse(id)) return false
    const def = ABILITIES[id]
    if (def.castTicks > 0) {
      this.cast = { ability: def, elapsed: 0 }
      this.pending.push({ kind: 'castStarted', abilityId: id })
    } else {
      this.cooldowns[id] = def.cooldownTicks
      this.applyEffect(def)
    }
    return true
  }

  /** Advance exactly one tick; returns every event it produced. */
  tick(): CombatEvent[] {
    this.tickCount++

    // Cooldowns first, so one set later this same tick keeps its full duration.
    for (const id of ABILITY_IDS) {
      if (this.cooldowns[id] > 0) this.cooldowns[id]--
    }

    if (!this.player.alive) {
      this.playerRespawnIn--
      if (this.playerRespawnIn <= 0) this.revivePlayer()
      return this.drain()
    }

    if (!this.enemy.alive) {
      this.enemyRespawnIn--
      if (this.enemyRespawnIn <= 0) this.respawnEnemy()
    }

    if (this.cast !== null) {
      this.cast.elapsed++
      if (this.cast.elapsed >= this.cast.ability.castTicks) {
        const def = this.cast.ability
        this.cast = null
        this.finishCast(def)
      }
    }

    if (this.enemy.alive) {
      const due = this.dot.tick()
      if (due > 0) {
        const dealt = this.enemy.damage(due)
        if (dealt > 0) this.pending.push({ kind: 'damage', target: 'enemy', amount: dealt, source: 'ignite' })
        if (!this.enemy.alive) this.onEnemyDeath()
      }
    }

    if (this.enemy.alive && this.player.alive) {
      this.swingElapsed++
      if (this.swingElapsed >= this.config.enemySwingTicks) {
        this.swingElapsed = 0
        const dealt = this.player.damage(rollInt(this.rng, this.config.enemyDamageMin, this.config.enemyDamageMax))
        if (dealt > 0) this.pending.push({ kind: 'damage', target: 'player', amount: dealt, source: 'enemySwing' })
        if (!this.player.alive) this.onPlayerDeath()
      }
    }

    return this.drain()
  }

  snapshot(): Readonly<CombatSnapshot> {
    return {
      tick: this.tickCount,
      player: {
        hp: this.player.hp,
        maxHp: this.player.maxHp,
        alive: this.player.alive,
        respawnIn: this.player.alive ? 0 : this.playerRespawnIn,
      },
      enemy: {
        hp: this.enemy.hp,
        maxHp: this.enemy.maxHp,
        alive: this.enemy.alive,
        respawnIn: this.enemy.alive ? 0 : this.enemyRespawnIn,
      },
      cast: this.cast
        ? {
            abilityId: this.cast.ability.id,
            progress: this.cast.elapsed / this.cast.ability.castTicks,
            remainingTicks: this.cast.ability.castTicks - this.cast.elapsed,
          }
        : null,
      cooldowns: { ...this.cooldowns },
      swingProgress: this.enemy.alive && this.player.alive ? this.swingElapsed / this.config.enemySwingTicks : 0,
      dot: this.dot.active ? { abilityId: 'ignite', remainingTicks: this.dot.remainingTicks } : null,
      kills: this.kills,
      gold: this.gold,
    }
  }

  private finishCast(def: AbilityDef): void {
    // Cooldowns start when the ability resolves — including fizzles.
    this.cooldowns[def.id] = def.cooldownTicks
    if (def.offensive && !this.enemy.alive) {
      this.pending.push({ kind: 'castFizzled', abilityId: def.id })
      return
    }
    this.pending.push({ kind: 'castFinished', abilityId: def.id })
    this.applyEffect(def)
  }

  private applyEffect(def: AbilityDef): void {
    switch (def.effect.kind) {
      case 'damage': {
        const dealt = this.enemy.damage(rollInt(this.rng, def.effect.min, def.effect.max))
        if (dealt > 0) this.pending.push({ kind: 'damage', target: 'enemy', amount: dealt, source: def.id })
        if (!this.enemy.alive) this.onEnemyDeath()
        break
      }
      case 'dot': {
        this.dot.apply()
        this.pending.push({ kind: 'dotApplied', abilityId: def.id })
        break
      }
      case 'heal': {
        const healed = this.player.heal(rollInt(this.rng, def.effect.min, def.effect.max))
        if (healed > 0) this.pending.push({ kind: 'heal', target: 'player', amount: healed, source: def.id })
        break
      }
    }
  }

  private onEnemyDeath(): void {
    this.kills++
    this.gold += this.config.goldPerKill
    this.dot.clear()
    this.swingElapsed = 0
    this.enemyRespawnIn = this.config.respawnTicks
    this.pending.push({ kind: 'enemyDied' })
  }

  private onPlayerDeath(): void {
    this.cast = null
    this.dot.clear()
    this.playerRespawnIn = this.config.respawnTicks
    this.pending.push({ kind: 'playerDied' })
  }

  private respawnEnemy(): void {
    this.enemy.reset()
    this.swingElapsed = 0
    this.enemyRespawnIn = 0
    this.pending.push({ kind: 'enemyRespawned' })
  }

  private revivePlayer(): void {
    this.player.reset()
    this.enemy.reset() // fresh encounter
    this.dot.clear()
    this.swingElapsed = 0
    this.enemyRespawnIn = 0
    this.playerRespawnIn = 0
    this.pending.push({ kind: 'playerRespawned' })
  }

  private drain(): CombatEvent[] {
    if (this.pending.length === 0) return this.pending
    const out = this.pending
    this.pending = []
    return out
  }
}
