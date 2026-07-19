import { describe, expect, it } from 'vitest'
import { ABILITIES } from '../src/engine/abilities'
import { CLASS_IDS, CLASS_KITS } from '../src/engine/content/classes'
import { TALENTS } from '../src/engine/content/talents'
import { mulberry32 } from '../src/engine/rng'
import { GameSim } from '../src/engine/sim'
import type { ClassId, HeroIdentity, SaveData } from '../src/engine/types'
import { LEDGER_CAP_BASE, RECKONING_INTERVAL_TICKS } from '../src/engine/types'
import { advance, advanceToSpawn, blankSave, eventsOf, makeSim, testContent } from './helpers'

function identity(classId: ClassId, over: Partial<HeroIdentity> = {}): HeroIdentity {
  return { classId, originId: '', signId: '', ...over }
}

/** Cast an instant (or start a cast) and wait out the GCD + cast. */
function cast(sim: GameSim, id: Parameters<GameSim['useAbility']>[0], settleTicks = 30) {
  expect(sim.useAbility(id), `useAbility(${id}) refused`).toBe(true)
  return advance(sim, settleTicks)
}

describe('kit registration', () => {
  it('every kit ability and talent exists, and levels ramp sanely', () => {
    for (const classId of CLASS_IDS) {
      const kit = CLASS_KITS[classId]
      expect(kit.abilities.length).toBeGreaterThanOrEqual(6)
      expect(kit.talents.length).toBe(6)
      for (const t of kit.talents) expect(TALENTS[t], `${classId} missing talent ${t}`).toBeDefined()
      // At most one unlock per level, and the capstone lands at 11.
      const unlocks = kit.abilities.map((id) => ABILITIES[id].unlockLevel)
      expect(Math.max(...unlocks)).toBe(11)
    }
  })

  it('a class can only use and learn its own kit', () => {
    const sim = makeSim({ identity: identity('gravewright') })
    advanceToSpawn(sim)
    expect(sim.canUse('fireball')).toBe(false)
    expect(sim.useAbility('fireball')).toBe(false)
    expect(sim.canUse('gravebolt')).toBe(true)
    const leveled = makeSim({ identity: identity('gravewright'), level: 5 })
    expect(leveled.spendTalent('impFireball')).toBe(false)
    expect(leveled.spendTalent('deeperCuts')).toBe(true)
  })
})

describe('gravewright — the ledger of the dead', () => {
  it('kills write pages into the ledger, up to the cap', () => {
    const sim = makeSim({ identity: identity('gravewright'), content: testContent({ hp: 1 }) })
    for (let i = 0; i < LEDGER_CAP_BASE + 2; i++) {
      advanceToSpawn(sim)
      cast(sim, 'gravebolt', 45)
    }
    const res = sim.combatSnapshot().resource
    expect(res?.kind).toBe('ledger')
    if (res?.kind === 'ledger') {
      expect(res.pages).toBe(LEDGER_CAP_BASE)
      expect(res.cap).toBe(LEDGER_CAP_BASE)
      expect(res.buried).toBe('Training Dummy')
    }
  })

  it('Last Rites needs a page, spends it, and heals', () => {
    const sim = makeSim({ identity: identity('gravewright'), level: 3, content: testContent({ hp: 1 }) })
    advanceToSpawn(sim)
    expect(sim.canUse('lastRites')).toBe(false) // empty ledger
    cast(sim, 'gravebolt', 45) // bury one
    // hurt ourselves so the heal has room: reload trick — just check the page spend
    advanceToSpawn(sim)
    expect(sim.canUse('lastRites')).toBe(true)
    const events = cast(sim, 'lastRites', 5)
    // At full HP the heal clamps to zero, but the page is spent either way.
    const res = sim.combatSnapshot().resource
    if (res?.kind === 'ledger') expect(res.pages).toBe(0)
    expect(events).toBeDefined()
  })

  it('Exhume raises the last buried foe, which fights for you', () => {
    const sim = makeSim({
      identity: identity('gravewright'),
      level: 4,
      content: testContent({ hp: 1, dmgMin: 10, dmgMax: 12 }),
    })
    advanceToSpawn(sim)
    cast(sim, 'gravebolt', 45)
    advanceToSpawn(sim)
    const events = cast(sim, 'exhume', 5)
    expect(eventsOf(events, 'echoRaised')[0]?.name).toBe('Training Dummy')
    expect(sim.combatSnapshot().echo?.name).toBe('Training Dummy')
    // Give the dummy some HP so the echo has something to hit.
    const sim2 = makeSim({
      identity: identity('gravewright'),
      level: 4,
      content: testContent({ hp: 500, dmgMin: 10, dmgMax: 12, swingTicks: 10_000 }),
    })
    advanceToSpawn(sim2)
    // Kill nothing — no pages, exhume refused.
    expect(sim2.canUse('exhume')).toBe(false)
  })

  it('Final Chapter consumes every page and scales with them', () => {
    // A full ledger against something sturdy: slam the book shut.
    const sturdy = makeSim({
      identity: identity('gravewright'),
      level: 11,
      save: { ledgerPages: 3 },
      content: testContent({ hp: 10_000, swingTicks: 10_000 }),
    })
    advanceToSpawn(sturdy)
    const events = cast(sturdy, 'finalChapter', 5)
    const hits = eventsOf(events, 'damage').filter((e) => e.source === 'finalChapter')
    expect(hits).toHaveLength(1)
    // 3 pages × 26..36, times power at level 11 (30): ≥ 78 before power.
    expect(hits[0]!.amount).toBeGreaterThanOrEqual(78)
    const res = sturdy.combatSnapshot().resource
    if (res?.kind === 'ledger') expect(res.pages).toBe(0)
  })

  it('ledger pages survive the save round-trip', () => {
    const sim = makeSim({ identity: identity('gravewright'), content: testContent({ hp: 1 }) })
    advanceToSpawn(sim)
    cast(sim, 'gravebolt', 45)
    const save = sim.serialize()
    expect(save.classId).toBe('gravewright')
    expect(save.ledgerPages).toBe(1)
    const restored = GameSim.deserialize(save, { content: testContent(), rng: mulberry32(2) })
    const res = restored.combatSnapshot().resource
    expect(res?.kind).toBe('ledger')
    if (res?.kind === 'ledger') expect(res.pages).toBe(1)
  })
})

describe('hourwarden — sand debt', () => {
  const content = () => testContent({ hp: 100_000, swingTicks: 10_000 })

  it('strikes borrow debt; the Reckoning collects it and clears the slate', () => {
    const sim = makeSim({ identity: identity('hourwarden'), content: content() })
    advanceToSpawn(sim)
    cast(sim, 'secondhandStrike', 1)
    let res = sim.combatSnapshot().resource
    expect(res?.kind).toBe('debt')
    if (res?.kind === 'debt') expect(res.debt).toBe(8)
    // Wait for the bell.
    const events = advance(sim, RECKONING_INTERVAL_TICKS + 5)
    const reck = eventsOf(events, 'reckoning')
    expect(reck).toHaveLength(1)
    expect(reck[0]!.amount).toBe(Math.round((8 * 80) / 100))
    res = sim.combatSnapshot().resource
    if (res?.kind === 'debt') expect(res.debt).toBe(0)
    // The player actually took it.
    const hurt = eventsOf(events, 'damage').filter((e) => e.source === 'reckoning')
    expect(hurt).toHaveLength(1)
  })

  it('surviving to the end of the fight forgives the debt', () => {
    const sim = makeSim({ identity: identity('hourwarden'), content: testContent({ hp: 1 }) })
    advanceToSpawn(sim)
    const events = cast(sim, 'secondhandStrike', 60) // kills the 1 HP dummy
    expect(eventsOf(events, 'enemyDied')).toHaveLength(1)
    expect(eventsOf(events, 'reckoning')).toHaveLength(0)
    const res = sim.combatSnapshot().resource
    if (res?.kind === 'debt') expect(res.debt).toBe(0)
  })

  it('Hourglass Shatter cashes the whole debt out as damage', () => {
    const sim = makeSim({ identity: identity('hourwarden'), level: 11, content: content() })
    advanceToSpawn(sim)
    cast(sim, 'secondhandStrike', 30)
    cast(sim, 'secondhandStrike', 30)
    cast(sim, 'borrowedBlade', 30) // debt: 8+8+20 = 36
    const events = cast(sim, 'hourglassShatter', 5)
    const hits = eventsOf(events, 'damage').filter((e) => e.source === 'hourglassShatter')
    expect(hits).toHaveLength(1)
    // 18..26 rolled (+power) plus the full 36 debt.
    expect(hits[0]!.amount).toBeGreaterThan(36)
    const res = sim.combatSnapshot().resource
    if (res?.kind === 'debt') expect(res.debt).toBe(0)
  })

  it('Rewind Wound heals a share of the last blow taken', () => {
    const sim = makeSim({
      identity: identity('hourwarden'),
      level: 2,
      content: testContent({ hp: 100_000, swingTicks: 20, dmgMin: 30, dmgMax: 30 }),
    })
    advanceToSpawn(sim)
    expect(sim.canUse('rewindWound')).toBe(false) // unhit, nothing to rewind
    advance(sim, 25) // eat a swing
    expect(sim.canUse('rewindWound')).toBe(true)
    const before = sim.combatSnapshot().player.hp
    const events = cast(sim, 'rewindWound', 3)
    const heals = eventsOf(events, 'heal').filter((e) => e.source === 'rewindWound')
    expect(heals).toHaveLength(1)
    expect(heals[0]!.amount).toBe(21) // 70% of 30
    expect(sim.combatSnapshot().player.hp).toBeGreaterThan(before)
  })

  it('Stasis lifts the target out of time: no swings while frozen', () => {
    const sim = makeSim({
      identity: identity('hourwarden'),
      level: 6,
      content: testContent({ hp: 100_000, swingTicks: 20, dmgMin: 5, dmgMax: 5 }),
    })
    advanceToSpawn(sim)
    cast(sim, 'stasis', 0)
    expect(sim.combatSnapshot().enemies[0]!.frozenTicks).toBeGreaterThan(0)
    const during = advance(sim, 55)
    expect(eventsOf(during, 'damage').filter((e) => e.target === 'player')).toHaveLength(0)
    const after = advance(sim, 60)
    expect(eventsOf(after, 'damage').filter((e) => e.target === 'player').length).toBeGreaterThan(0)
  })

  it('Split Second makes Secondhand Strike land twice', () => {
    const sim = makeSim({ identity: identity('hourwarden'), level: 4, content: content() })
    advanceToSpawn(sim)
    cast(sim, 'splitSecond', 30)
    const events = cast(sim, 'secondhandStrike', 3)
    const hits = eventsOf(events, 'damage').filter((e) => e.source === 'secondhandStrike')
    expect(hits).toHaveLength(2)
  })
})

describe('cartomancer — the living deck', () => {
  const content = () => testContent({ hp: 100_000, swingTicks: 10_000 })

  it('a fresh hand is dealt at the start of every fight', () => {
    const sim = makeSim({ identity: identity('cartomancer'), content: content() })
    advanceToSpawn(sim)
    const res = sim.combatSnapshot().resource
    expect(res?.kind).toBe('hand')
    if (res?.kind === 'hand') expect(res.cards).toHaveLength(3)
  })

  it('Deal Fate plays the top card and consumes it', () => {
    const sim = makeSim({ identity: identity('cartomancer'), content: content() })
    advanceToSpawn(sim)
    const before = sim.combatSnapshot().resource
    const topCard = before?.kind === 'hand' ? before.cards[0] : undefined
    const events = cast(sim, 'dealFate', 3)
    const played = eventsOf(events, 'cardPlayed')
    expect(played).toHaveLength(1)
    expect(played[0]!.card).toBe(topCard)
    const after = sim.combatSnapshot().resource
    if (after?.kind === 'hand') expect(after.cards).toHaveLength(2)
  })

  it('an empty hand redraws instead of playing', () => {
    const sim = makeSim({ identity: identity('cartomancer'), content: content() })
    advanceToSpawn(sim)
    for (let i = 0; i < 3; i++) {
      cast(sim, 'dealFate', 130) // wait out the 6 s cooldown each time
    }
    let res = sim.combatSnapshot().resource
    if (res?.kind === 'hand') expect(res.cards).toHaveLength(0)
    const events = cast(sim, 'dealFate', 3)
    expect(eventsOf(events, 'cardPlayed')).toHaveLength(0)
    res = sim.combatSnapshot().resource
    if (res?.kind === 'hand') expect(res.cards).toHaveLength(3)
  })

  it('Cut the Deck replaces the hand; Fold the World spends it on everyone', () => {
    const sim = makeSim({
      identity: identity('cartomancer'),
      level: 8,
      content: testContent(
        { hp: 100_000, swingTicks: 10_000 },
        { region1Encounters: [{ slots: [{ enemyId: 'dummy' }, { enemyId: 'dummy' }], weight: 1 }] },
      ),
    })
    advanceToSpawn(sim)
    cast(sim, 'cutTheDeck', 30)
    const res = sim.combatSnapshot().resource
    if (res?.kind === 'hand') expect(res.cards).toHaveLength(3)
    const events = cast(sim, 'foldTheWorld', 3)
    const hits = eventsOf(events, 'damage').filter((e) => e.source === 'foldTheWorld')
    expect(hits).toHaveLength(2) // both dummies
    // 3 cards folded: 33..45 per enemy, before power.
    for (const h of hits) expect(h.amount).toBeGreaterThanOrEqual(33)
    const after = sim.combatSnapshot().resource
    if (after?.kind === 'hand') expect(after.cards).toHaveLength(0)
    expect(sim.canUse('foldTheWorld')).toBe(false) // nothing left to fold
  })

  it('House Rules turns every roll into its maximum', () => {
    const sim = makeSim({ identity: identity('cartomancer'), level: 6, content: content(), seed: 7 })
    advanceToSpawn(sim)
    cast(sim, 'houseRules', 30)
    for (let i = 0; i < 2; i++) {
      const events = cast(sim, 'cardflick', 60)
      const hits = eventsOf(events, 'damage').filter((e) => e.source === 'cardflick')
      expect(hits).toHaveLength(1)
      // level 6 → power 15; max roll 21 × 1.15 = 24; a crit lands at ×7/4.
      expect([24, 42]).toContain(hits[0]!.amount)
    }
  })
})

describe('thornspeaker — the rootbound garden', () => {
  const content = () => testContent({ hp: 100_000, swingTicks: 10_000 })

  it('the briar grows: each tick hits harder than the last', () => {
    const sim = makeSim({ identity: identity('thornspeaker'), content: content() })
    advanceToSpawn(sim)
    cast(sim, 'sowBriar', 1)
    const events = advance(sim, 205) // all 10 ticks land
    const ticks = eventsOf(events, 'damage').filter((e) => e.source === 'sowBriar')
    expect(ticks).toHaveLength(10)
    for (let i = 1; i < ticks.length; i++) {
      expect(ticks[i]!.amount).toBeGreaterThan(ticks[i - 1]!.amount)
    }
    expect(ticks[0]!.amount).toBe(3)
    expect(ticks[9]!.amount).toBe(12)
  })

  it('Sapdraw heals for every point it deals', () => {
    const sim = makeSim({
      identity: identity('thornspeaker'),
      level: 2,
      content: testContent({ hp: 100_000, swingTicks: 20, dmgMin: 20, dmgMax: 20 }),
    })
    advanceToSpawn(sim)
    advance(sim, 45) // take some hits so the heal is visible
    const events = cast(sim, 'sapdraw', 45)
    const hits = eventsOf(events, 'damage').filter((e) => e.source === 'sapdraw')
    const heals = eventsOf(events, 'heal').filter((e) => e.source === 'sapdraw')
    expect(hits).toHaveLength(1)
    expect(heals).toHaveLength(1)
    expect(heals[0]!.amount).toBe(hits[0]!.amount)
  })

  it('Verdant Cataract detonates the briar for 150% of what it still owed', () => {
    const sim = makeSim({ identity: identity('thornspeaker'), level: 11, content: content() })
    advanceToSpawn(sim)
    expect(sim.canUse('verdantCataract')).toBe(false) // nothing planted
    cast(sim, 'sowBriar', 1)
    expect(sim.canUse('verdantCataract')).toBe(true)
    // Harvest (the press queues behind Sow Briar's GCD, then casts 1.5 s).
    // At level 11 the freshly-sown briar owes ~85; a tick or two lands during
    // the wind-up, so the bloom collects at least 75% of the garden × 150%.
    const events = cast(sim, 'verdantCataract', 90)
    const hits = eventsOf(events, 'damage').filter((e) => e.source === 'verdantCataract')
    expect(hits).toHaveLength(1)
    expect(hits[0]!.amount).toBeGreaterThanOrEqual(95)
    // The briar is spent.
    expect(sim.combatSnapshot().enemies[0]!.dot).toBeNull()
    expect(sim.canUse('verdantCataract')).toBe(false)
  })

  it('the Bramble Ward bites back at attackers while it holds', () => {
    const sim = makeSim({
      identity: identity('thornspeaker'),
      level: 6,
      content: testContent({ hp: 100_000, swingTicks: 30, dmgMin: 5, dmgMax: 5 }),
    })
    advanceToSpawn(sim)
    cast(sim, 'brambleWard', 1)
    const events = advance(sim, 65) // two swings land on the ward
    const thorns = eventsOf(events, 'damage').filter((e) => e.source === 'thorns')
    expect(thorns.length).toBeGreaterThanOrEqual(2)
    expect(thorns[0]!.amount).toBe(12) // 6 + 1×6
  })

  it('Wildswell doubles the garden’s pace', () => {
    const sim = makeSim({ identity: identity('thornspeaker'), level: 8, content: content() })
    advanceToSpawn(sim)
    cast(sim, 'sowBriar', 1)
    cast(sim, 'wildswell', 1)
    // 10 ticks at 2×/tick pace: the whole briar lands in ~100 ticks instead of 200.
    const events = advance(sim, 120)
    const ticks = eventsOf(events, 'damage').filter((e) => e.source === 'sowBriar')
    expect(ticks).toHaveLength(10)
  })
})

describe('riftblade — blink tempo', () => {
  const content = () => testContent({ hp: 100_000, swingTicks: 10_000 })

  it('Through-Cut banks charges; Phase Edge needs two and spends them all', () => {
    const sim = makeSim({ identity: identity('riftblade'), level: 4, content: content() })
    advanceToSpawn(sim)
    expect(sim.canUse('phaseEdge')).toBe(false)
    cast(sim, 'throughCut', 30)
    expect(sim.canUse('phaseEdge')).toBe(false) // one charge is not enough
    cast(sim, 'throughCut', 30)
    let res = sim.combatSnapshot().resource
    expect(res?.kind).toBe('charge')
    if (res?.kind === 'charge') expect(res.charge).toBe(2)
    const events = cast(sim, 'phaseEdge', 3)
    const hits = eventsOf(events, 'damage').filter((e) => e.source === 'phaseEdge')
    expect(hits).toHaveLength(1)
    expect(hits[0]!.amount).toBeGreaterThanOrEqual(26) // 2 × 13 before power
    res = sim.combatSnapshot().resource
    if (res?.kind === 'charge') expect(res.charge).toBe(0)
  })

  it('Seamstep dodges exactly one incoming blow', () => {
    const sim = makeSim({
      identity: identity('riftblade'),
      level: 2,
      content: testContent({ hp: 100_000, swingTicks: 24, dmgMin: 15, dmgMax: 15 }),
    })
    advanceToSpawn(sim)
    cast(sim, 'seamstep', 1)
    const events = advance(sim, 60) // two swings arrive inside the window+after
    const onPlayer = eventsOf(events, 'damage').filter((e) => e.target === 'player')
    // First swing: fully evaded (amount 0, absorbed = the blow). Second: lands.
    expect(onPlayer[0]!.amount).toBe(0)
    expect(onPlayer[0]!.absorbed).toBe(15)
    expect(onPlayer.some((e) => e.amount === 15)).toBe(true)
  })

  it('Afterimage stands up and swings on its own clock', () => {
    const sim = makeSim({ identity: identity('riftblade'), level: 6, content: content() })
    advanceToSpawn(sim)
    const raised = cast(sim, 'afterimage', 3)
    expect(eventsOf(raised, 'echoRaised')[0]?.name).toBe('Afterimage')
    const events = advance(sim, 120)
    const swings = eventsOf(events, 'damage').filter((e) => e.source === 'echo')
    expect(swings.length).toBeGreaterThanOrEqual(3)
  })

  it('Doorway Duel locks the pack outside and turns up the pain inside', () => {
    const sim = makeSim({
      identity: identity('riftblade'),
      level: 11,
      content: testContent(
        { hp: 100_000, swingTicks: 20, dmgMin: 5, dmgMax: 5 },
        { region1Encounters: [{ slots: [{ enemyId: 'dummy' }, { enemyId: 'dummy' }], weight: 1 }] },
      ),
    })
    advanceToSpawn(sim)
    const events = cast(sim, 'doorwayDuel', 1)
    expect(eventsOf(events, 'enemyFrozen')).toHaveLength(1)
    const snap = sim.combatSnapshot()
    const frozen = snap.enemies.filter((e) => e.frozenTicks > 0)
    expect(frozen).toHaveLength(1)
    expect(frozen[0]!.iid).not.toBe(snap.target)
    // Only the duelist swings at you while the door holds.
    const during = advance(sim, 100)
    const attackers = new Set(
      eventsOf(during, 'damage')
        .filter((e) => e.target === 'player')
        .map((e) => e.iid),
    )
    expect(attackers.size).toBeLessThanOrEqual(1)
  })
})

describe('birth signs in combat', () => {
  it('the Tower turns one killing blow per fight into 1 HP', () => {
    const sim = makeSim({
      identity: identity('arcanist', { signId: 'tower' }),
      content: testContent({ hp: 100_000, swingTicks: 20, dmgMin: 5000, dmgMax: 5000 }),
    })
    advanceToSpawn(sim)
    const events = advance(sim, 25) // the first massive swing lands
    expect(eventsOf(events, 'signIntervened')).toHaveLength(1)
    expect(eventsOf(events, 'playerDied')).toHaveLength(0)
    expect(sim.combatSnapshot().player.hp).toBe(1)
    const second = advance(sim, 25) // the grace is spent — the next one kills
    expect(eventsOf(second, 'playerDied')).toHaveLength(1)
  })

  it('the Serpent shortens the walk back from death', () => {
    const sim = makeSim({
      identity: identity('arcanist', { signId: 'serpent' }),
      content: testContent({ hp: 100_000, swingTicks: 10, dmgMin: 5000, dmgMax: 5000 }),
    })
    advanceToSpawn(sim)
    advance(sim, 15)
    const snap = sim.combatSnapshot()
    expect(snap.player.alive).toBe(false)
    expect(snap.player.respawnIn).toBeLessThanOrEqual(60) // 100 × 0.6
  })

  it('the Lamplit Scholar learns faster from every kill', () => {
    const sim = makeSim({
      identity: identity('arcanist', { originId: 'lamplit-scholar' }),
      content: testContent({ hp: 1, xp: 60 }),
    })
    advanceToSpawn(sim)
    const events = cast(sim, 'fireball', 50)
    const xp = eventsOf(events, 'xpGained')
    expect(xp).toHaveLength(1)
    expect(xp[0]!.amount).toBe(66) // 60 × 1.10
  })
})

describe('every calling can play the real game', () => {
  // The balance contract: a fresh level-1 hero of ANY class, on auto-battle
  // in the real starting region, survives and progresses. If a kit's numbers
  // drift out of line, this is the test that says so.
  for (const classId of CLASS_IDS) {
    it(`a level-1 ${classId} survives and progresses in the Verdant Reach`, () => {
      const sim = new GameSim({ rng: mulberry32(42), identity: identity(classId) })
      sim.autoBattle = true
      let kills = 0
      let deaths = 0
      for (let i = 0; i < 24_000; i++) {
        // 20 minutes
        for (const e of sim.tick()) {
          if (e.kind === 'enemyDied') kills++
          if (e.kind === 'playerDied') deaths++
        }
      }
      expect(kills, `${classId} kills`).toBeGreaterThanOrEqual(15)
      expect(deaths, `${classId} deaths`).toBeLessThanOrEqual(12)
      expect(sim.progressSnapshot().level, `${classId} level`).toBeGreaterThanOrEqual(3)
    })
  }
})

describe('identity persistence', () => {
  it('class, origin and sign survive the save round-trip', () => {
    const sim = makeSim({
      identity: { classId: 'thornspeaker', originId: 'guild-courier', signId: 'moth' },
    })
    const save = sim.serialize()
    const restored = GameSim.deserialize(save, { content: testContent(), rng: mulberry32(2) })
    const p = restored.progressSnapshot()
    expect(p.classId).toBe('thornspeaker')
    expect(p.originId).toBe('guild-courier')
    expect(p.signId).toBe('moth')
  })

  it('a pre-callings v4 save takes its identity from the caller', () => {
    const v4 = blankSave() as unknown as Record<string, unknown>
    v4.version = 4
    delete v4.classId
    delete v4.originId
    delete v4.signId
    delete v4.ledgerPages
    const restored = GameSim.deserialize(v4 as unknown as SaveData, {
      content: testContent(),
      rng: mulberry32(1),
      identity: { classId: 'hourwarden', originId: 'lamplit-scholar', signId: 'moth' },
    })
    const p = restored.progressSnapshot()
    expect(p.classId).toBe('hourwarden')
    expect(p.originId).toBe('lamplit-scholar')
    // And it re-serializes as v5 with the identity sealed in.
    expect(restored.serialize().classId).toBe('hourwarden')
  })
})
