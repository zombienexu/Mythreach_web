// End-to-end smoke for the Threshold slice + the Kindle Yard opening.
// Verifies: projection, arrival at the recruitment camp, the sparring circle
// (the Q-swung staff + Stoke), camp progress persisting, and — on a seeded
// graduated save — the scattered field, the Map atlas, and Heat climbing.
// Fails on any console/page error.
import { mkdir } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { chromium } from 'playwright'
import { build, preview } from 'vite'

const OUT = `${tmpdir()}/mythreach-smoke-shots`
await mkdir(OUT, { recursive: true })

await build({ logLevel: 'warn' })
const server = await preview({ preview: { port: 0 } })
const { port } = server.httpServer.address()
const base = `http://localhost:${port}/`
const browser = await chromium.launch()

const errors = []
function watch(page) {
  page.on('console', (m) => {
    if (m.type() === 'error') errors.push(`console: ${m.text()}`)
  })
  page.on('pageerror', (e) => errors.push(`pageerror: ${String(e)}`))
}
const results = {}

// ── 1. fresh conscript: projection → the Kindle Yard → first duel ────
{
  const page = await browser.newPage({ viewport: { width: 1320, height: 840 } })
  watch(page)
  await page.goto(base)
  await page.waitForTimeout(600)
  // Title screen → a fresh slot → name the conscript (name only now).
  await page.getByRole('button', { name: /Begin a new legend/ }).first().click()
  await page.waitForTimeout(400)
  await page.getByRole('button', { name: /Cross the Threshold/ }).click()
  await page.waitForTimeout(700)

  // Opening sequence: intro + rolling lore, then the Codex directive plaque.
  await page.getByRole('button', { name: 'Skip' }).click().catch(() => {})
  await page.waitForTimeout(400)
  results.directive = (await page.getByText(/Recover the War-Weaving/i).count()) > 0
  await page.screenshot({ path: `${OUT}/b1a-opening-directive.png` })
  await page.getByRole('button', { name: 'Skip' }).click().catch(() => {})
  await page.waitForTimeout(700)

  // Projection Station: pick the one open world → the Ember Legion.
  await page.getByRole('button', { name: /Open the Threshold/ }).click()
  await page.waitForTimeout(700)

  // Arrival: the drill sergeant, the wooden staff, the proving.
  results.briefed = (await page.getByText(/Sergeant Vale/i).count()) > 0
  await page.screenshot({ path: `${OUT}/b1b-arrival-camp.png` })
  await page.getByRole('button', { name: /Report to the yard/ }).click()
  await page.waitForTimeout(900)

  // The rack: the yard's opening beat — take a practice staff before anything
  // else can take input. Space picks it up.
  results.rack = (await page.getByText(/Grey Wood Staff/).count()) > 0
  await page.screenshot({ path: `${OUT}/b1c-staff-rack.png` })
  await page.keyboard.press(' ')
  await page.waitForTimeout(600)

  // In-world: the Kindle Yard's sparring circle stands where the field board
  // will be, and the Map is locked until graduation.
  results.camp = (await page.getByText(/the kindle yard/i).count()) > 0
  results.mapLocked = await page
    .getByRole('button', { name: /^Map/ })
    .isDisabled()
    .catch(() => false)
  await page.screenshot({ path: `${OUT}/b2-kindle-yard.png`, fullPage: true })

  // Step into the circle (Space). The staff no longer swings itself: the bar
  // shows the Q prompt, and every blow in the bout is one the player called.
  await page.keyboard.press(' ')
  await page.waitForTimeout(900)
  results.strikeBar = (await page.getByText(/^Staff$/).count()) > 0
  results.qPrompt = (await page.getByText(/Q ▸ strike/).count()) > 0
  // The calling is sealed in the proving: no fire in the flue until Fireball.
  results.sealedHub = await page
    .getByRole('button', { name: /Stoke — sealed/ })
    .isDisabled()
    .catch(() => false)
  await page.screenshot({ path: `${OUT}/b3-first-duel.png` })

  // Fight the proving the way a player does: Q swings, Space reads — the
  // Sharpen on your own wind-up, the deflect on theirs, then the next bout.
  const deadline = Date.now() + 60_000
  while (Date.now() < deadline) {
    await page.keyboard.press('q')
    await page.waitForTimeout(320)
    await page.keyboard.press(' ')
    await page.waitForTimeout(340)
  }
  const state = await page.evaluate(() => {
    const raw = localStorage.getItem('mythreach-expedition-v1')
    return raw ? JSON.parse(raw) : null
  })
  results.grind = state
  await page.screenshot({ path: `${OUT}/b3b-proving-progress.png` })
  await page.close()
}

// ── 2. a graduated level-10 pyromancer: the field, the Map, the Heat ──
{
  const page = await browser.newPage({ viewport: { width: 1320, height: 840 } })
  watch(page)
  await page.addInitScript(() => {
    // Ember-Lord standing (the fire kit through Flashpoint) on a graduated
    // conscript; a crit trinket to make the fight vivid.
    localStorage.setItem(
      'mythreach-expedition-v1',
      // Graduated (the yard is six bouts now), with two workings already taken
      // up — so the Talents screen has real offers waiting to be learned.
      JSON.stringify({
        standing: 900,
        progress: {},
        transmitted: [],
        briefed: true,
        camp: 6,
        learned: ['fireball', 'detonate'],
      }),
    )
    localStorage.setItem(
      'mythreach-save-v1',
      JSON.stringify({
        version: 5, level: 10, xp: 0, gold: 2400,
        classId: 'arcanist', originId: 'ashmarch-survivor', signId: 'tower',
        talents: { impFireball: 3, searingFlames: 3, criticalMass: 3 },
        inventory: [], nextUid: 4, regionId: 'stormcrag',
        equipped: {
          staff: { uid: 1, name: 'Emberheart Focus', slot: 'staff', ilvl: 11, rarity: 'rare', stats: { power: 14, crit: 4 } },
          robe: { uid: 2, name: 'Cinderweave Robe', slot: 'robe', ilvl: 10, rarity: 'uncommon', stats: { stamina: 8, power: 4 } },
          trinket: { uid: 3, name: 'Emberglass Charm', slot: 'trinket', ilvl: 11, rarity: 'epic', stats: { crit: 10, power: 6 } },
        },
        materials: {}, activeQuests: {}, completedQuests: [], achievements: [],
        lifetime: { kills: 0, deaths: 0, goldEarned: 0, interrupts: 0, epicsFound: 0, bossKills: 0 },
        records: { worldBossFells: 0, bestAssaultDamage: 0 },
        worldBossHp: 40000, companionId: null, ledgerPages: 0,
      }),
    )
  })
  await page.goto(base)
  await page.waitForTimeout(700)
  await page.getByRole('button', { name: /Enter the Reach/ }).click()
  await page.waitForTimeout(1000)

  // Graduated: the Map opens and the atlas renders every front.
  await page.getByRole('button', { name: /^Map/ }).click()
  await page.waitForTimeout(500)
  results.atlas = (await page.getByText(/warfront atlas/i).count()) > 0
  await page.screenshot({ path: `${OUT}/b4-map-atlas.png`, fullPage: true })

  // The Talents screen: the Legion's offers wait here to be taken up, and the
  // rail wears a badge while any of them do.
  await page.getByRole('button', { name: /^Talents/ }).click()
  await page.waitForTimeout(500)
  results.talents = (await page.getByText(/taught by grace/i).count()) > 0
  const learnBtns = await page.getByRole('button', { name: /Learn it/ }).count()
  results.offers = learnBtns
  if (learnBtns > 0) {
    await page.getByRole('button', { name: /Learn it/ }).first().click()
    await page.waitForTimeout(500)
  }
  await page.screenshot({ path: `${OUT}/b4b-talents.png`, fullPage: true })

  await page.getByRole('button', { name: 'Arena' }).click()
  await page.waitForTimeout(700)
  // The scattered field: every body stands on the ground wearing its own card.
  results.scatter = (await page.getByText(/sightings scattered/i).count()) > 0
  const ground = page.getByRole('group', { name: /Sightings/ })
  results.mobCards = await ground.getByRole('button').count()
  await page.screenshot({ path: `${OUT}/b4c-field-scatter.png`, fullPage: true })
  // Space walks on to a fresh scatter; Tab walks the reticle body by body, and
  // the fight opens by *attacking* the marked one — no commit key any more.
  await page.keyboard.press(' ')
  await page.waitForTimeout(600)
  await page.keyboard.press('Tab')
  await page.waitForTimeout(250)
  results.marked = await ground.getByRole('button', { pressed: true }).count()
  // Enter must do nothing out here: the field only opens to a blow.
  await page.keyboard.press('Enter')
  await page.waitForTimeout(400)
  results.enterInert = (await page.getByText(/sightings scattered/i).count()) > 0
  await page.keyboard.press('q')

  await page.waitForTimeout(900)
  // The blow pulled the pack: the field screen is gone and foes stand the arena.
  results.qOpened = (await page.getByText(/sightings scattered/i).count()) === 0
  // The heart of the wheel is the calling now: Stoke, not a read.
  results.stokeHub = (await page.getByRole('button', { name: 'Stoke' }).count()) > 0
  // Time one properly: loose a Fireball, then throw the flue open late enough
  // that the fire *lands* inside the half second and banks two Heat.
  await page.keyboard.press('1')
  await page.waitForTimeout(2050)
  await page.keyboard.press(' ')
  await page.screenshot({ path: `${OUT}/b4d-stoke-open.png` })
  await page.waitForTimeout(500)

  // Ride the Heat by hand: Fireball (1) and Kindle (3) feed it; chaining casts
  // parks the decay clock. Poll for the band crossing into Empowered/the Boil.
  let heatClimbed = false
  for (let i = 0; i < 80; i++) {
    await page.keyboard.press(i % 7 === 6 ? 'q' : i % 4 === 3 ? '3' : '1')
    await page.waitForTimeout(260)
    if (i % 5 === 4) await page.keyboard.press(' ') // Stoke: throw the flue open
    const empowered = await page.getByText(/Empowered|The Boil/).count()
    if (empowered > 0) {
      heatClimbed = true
      await page.screenshot({ path: `${OUT}/b5-heat-evolved.png` })
      break
    }
  }
  results.heatClimbed = heatClimbed
  if (!heatClimbed) await page.screenshot({ path: `${OUT}/b5-arena-fire.png` })
  await page.close()
}

await browser.close()
server.httpServer.close()

// ── verdict ──────────────────────────────────────────────────────────
console.log('\n===== SLICE SMOKE (the Kindle Yard opening + combat) =====')
console.log('codex directive granted:', results.directive)
console.log('arrival at the camp shown:', results.briefed)
console.log('staff rack offered at the gate:', results.rack)
console.log('kindle yard circle shown:', results.camp)
console.log('map locked in camp:', results.mapLocked)
console.log('strike bar shown in the duel:', results.strikeBar)
console.log('staff prompts for Q (no auto-swing):', results.qPrompt)
console.log('stoke sealed during the proving:', results.sealedHub)
console.log('camp progress:', JSON.stringify(results.grind))
console.log('warfront atlas (graduated):', results.atlas)
console.log('talents screen (grace ladder):', results.talents)
console.log('workings offered to learn:', results.offers)
console.log('field scattered across the ground:', results.scatter)
console.log('mobs wearing their own cards:', results.mobCards)
console.log('Tab marks exactly one body:', results.marked)
console.log('Enter commits to nothing out here:', results.enterInert)
console.log('Q opened the fight on the marked body:', results.qOpened)
console.log('the wheel\'s heart is the calling (Stoke):', results.stokeHub)
console.log('heat climbed a band:', results.heatClimbed)
console.log('errors:', errors.length ? errors : 'none')
console.log('shots in:', OUT)

const standing = results.grind?.standing ?? 0
const duelsWon = results.grind?.camp ?? 0
const ok =
  errors.length === 0 &&
  results.directive === true &&
  results.briefed === true &&
  results.camp === true &&
  results.mapLocked === true &&
  results.rack === true &&
  results.strikeBar === true &&
  results.qPrompt === true &&
  results.sealedHub === true &&
  results.stokeHub === true &&
  duelsWon >= 1 &&
  standing > 0 &&
  results.atlas === true &&
  results.talents === true &&
  results.scatter === true &&
  results.mobCards >= 4 &&
  results.marked === 1 &&
  results.enterInert === true &&
  results.qOpened === true &&
  results.heatClimbed === true

console.log(ok ? '\n✅ PASS — the fresh start turns end to end' : '\n❌ FAIL — see above')
process.exit(ok ? 0 : 1)
