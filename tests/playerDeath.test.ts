import { describe, expect, it } from 'vitest'
import { advance, advanceTimeline, eventsOf, makeEngine } from './helpers'

// 9 max HP + pinned 9 damage: the first swing (tick 44) kills the hero.
const LETHAL = { playerMaxHp: 9, enemyDamageMin: 9, enemyDamageMax: 9 }

describe('Player death', () => {
  it('dies to the killing swing, damage event preceding playerDied', () => {
    const e = makeEngine(LETHAL)
    const timeline = advanceTimeline(e, 44)
    const deathTick = timeline.find(({ events }) => eventsOf(events, 'playerDied').length > 0)
    expect(deathTick!.tick).toBe(44)
    const kinds = deathTick!.events.map((ev) => ev.kind)
    expect(kinds.indexOf('damage')).toBeLessThan(kinds.indexOf('playerDied'))
    expect(e.snapshot().player.alive).toBe(false)
    expect(e.snapshot().player.hp).toBe(0)
  })

  it('cancels an in-flight cast', () => {
    const e = makeEngine(LETHAL)
    advance(e, 20)
    e.useAbility('renew') // would resolve at tick 56, death at 44
    const events = advance(e, 60)
    expect(eventsOf(events, 'playerDied')).toHaveLength(1)
    expect(eventsOf(events, 'castFinished')).toEqual([])
    expect(eventsOf(events, 'heal')).toEqual([])
    expect(e.snapshot().cast).toBeNull()
  })

  it('clears DoTs on death', () => {
    const e = makeEngine(LETHAL)
    e.useAbility('ignite')
    advance(e, 30)
    expect(e.snapshot().dot).not.toBeNull()
    advance(e, 14) // death at 44
    expect(e.snapshot().dot).toBeNull()
  })

  it('stops the enemy attacking while the hero is dead', () => {
    const e = makeEngine(LETHAL)
    advance(e, 44)
    const whileDead = advance(e, 59)
    expect(eventsOf(whileDead, 'damage')).toEqual([])
  })

  it('blocks all abilities while dead', () => {
    const e = makeEngine(LETHAL)
    advance(e, 50)
    expect(e.canUse('fireball')).toBe(false)
    expect(e.canUse('ignite')).toBe(false)
    expect(e.canUse('renew')).toBe(false)
    expect(e.useAbility('renew')).toBe(false)
  })

  it('revives at +60 ticks with a fresh full-HP enemy and a fresh swing timer', () => {
    const e = makeEngine({ ...LETHAL, enemyMaxHp: 80 })
    e.useAbility('ignite')
    advance(e, 40) // two DoT ticks: enemy at 72
    expect(e.snapshot().enemy.hp).toBe(72)
    advance(e, 4) // death at 44

    const toRevive = advance(e, 60) // revive on tick 104
    expect(eventsOf(toRevive, 'playerRespawned')).toHaveLength(1)
    const s = e.snapshot()
    expect(s.player.alive).toBe(true)
    expect(s.player.hp).toBe(9)
    expect(s.enemy.hp).toBe(80) // fresh encounter
    expect(s.swingProgress).toBe(0)

    // fresh swing timer: next hit lands 44 ticks after revival
    const before = advance(e, 43)
    expect(eventsOf(before, 'damage')).toEqual([])
    const at = advance(e, 1)
    expect(eventsOf(at, 'damage').filter((d) => d.target === 'player')).toHaveLength(1)
  })
})
