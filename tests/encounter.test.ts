import { describe, expect, it } from 'vitest'
import { advance, advanceTimeline, eventsOf, makeEngine } from './helpers'

describe('Encounter loop', () => {
  it('kill grants +1 kill and +10 gold, clears DoTs, respawns at +60 ticks', () => {
    const e = makeEngine({ enemyMaxHp: 10 })
    e.useAbility('ignite') // DoT active so we can watch it clear
    advance(e, 1)
    e.useAbility('fireball')
    const events = advance(e, 50) // fireball resolves on tick 51; DoT ticked once (tick 20)
    expect(eventsOf(events, 'enemyDied')).toHaveLength(1)

    const s = e.snapshot()
    expect(s.kills).toBe(1)
    expect(s.gold).toBe(10)
    expect(s.enemy.alive).toBe(false)
    expect(s.dot).toBeNull()

    const toRespawn = advance(e, 60) // died tick 51 → respawn tick 111
    expect(eventsOf(toRespawn, 'enemyRespawned')).toHaveLength(1)
    const s2 = e.snapshot()
    expect(s2.enemy.alive).toBe(true)
    expect(s2.enemy.hp).toBe(10)
  })

  it('emits the killing damage event before enemyDied in the same tick', () => {
    const e = makeEngine({ enemyMaxHp: 10 })
    e.useAbility('fireball')
    const timeline = advanceTimeline(e, 50)
    const deathTick = timeline.find(({ events }) => eventsOf(events, 'enemyDied').length > 0)
    expect(deathTick).toBeDefined()
    const kinds = deathTick!.events.map((ev) => ev.kind)
    expect(kinds.indexOf('damage')).toBeGreaterThanOrEqual(0)
    expect(kinds.indexOf('damage')).toBeLessThan(kinds.indexOf('enemyDied'))
    // overkill clamps: 10 HP enemy takes exactly 10
    const hits = eventsOf(deathTick!.events, 'damage')
    expect(hits[0]!.amount).toBe(10)
  })

  it('blocks offensive abilities against a dead enemy but Renew still works', () => {
    const e = makeEngine({ enemyMaxHp: 10 })
    e.useAbility('fireball')
    advance(e, 55) // dead, mid respawn window
    expect(e.snapshot().enemy.alive).toBe(false)
    expect(e.canUse('fireball')).toBe(false)
    expect(e.canUse('ignite')).toBe(false)
    expect(e.canUse('renew')).toBe(true)
    expect(e.useAbility('renew')).toBe(true)
  })

  it('a cast in flight when the enemy dies completes but fizzles', () => {
    const e = makeEngine({ enemyMaxHp: 10 })
    e.useAbility('ignite') // DoT kills at tick 60 (4+4 then clamped 2)
    advance(e, 12)
    e.useAbility('fireball') // resolves tick 62, enemy dies tick 60
    const timeline = advanceTimeline(e, 60)

    const deathTick = timeline.find(({ events }) => eventsOf(events, 'enemyDied').length > 0)
    expect(deathTick!.tick).toBe(60)
    const kinds = deathTick!.events.map((ev) => ev.kind)
    expect(kinds.indexOf('damage')).toBeLessThan(kinds.indexOf('enemyDied'))

    const fizzleTick = timeline.find(({ events }) => eventsOf(events, 'castFizzled').length > 0)
    expect(fizzleTick!.tick).toBe(62)
    // the fizzled cast dealt no damage and there was no castFinished
    const all = timeline.flatMap(({ events }) => events)
    expect(eventsOf(all, 'castFinished')).toEqual([])
    expect(eventsOf(all, 'damage').filter((d) => d.source === 'fireball')).toEqual([])
  })
})
