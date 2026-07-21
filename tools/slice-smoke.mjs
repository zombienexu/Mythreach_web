// End-to-end smoke for the Threshold slice + the Kindle Yard opening.
// Verifies: projection, arrival at the recruitment camp, the sparring circle
// (staff-only basic attack + Focus), camp progress persisting, and — on a
// seeded graduated save — the field board, the Map atlas, and Heat climbing.
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
  await page.getByRole('button', { name: /Take up the staff/ }).click()
  await page.waitForTimeout(900)

  // In-world: the Kindle Yard's sparring circle stands where the field board
  // will be, and the Map is locked until graduation.
  results.camp = (await page.getByText(/the kindle yard/i).count()) > 0
  results.mapLocked = await page
    .getByRole('button', { name: /^Map/ })
    .isDisabled()
    .catch(() => false)
  await page.screenshot({ path: `${OUT}/b2-kindle-yard.png`, fullPage: true })

  // Step into the circle (Space) — the staff auto-swings: the strike bar
  // appears and the bout runs on basic attacks + Focus alone (no spells yet).
  await page.keyboard.press(' ')
  await page.waitForTimeout(900)
  results.strikeBar = (await page.getByText(/^Staff$/).count()) > 0
  await page.screenshot({ path: `${OUT}/b3-first-duel.png` })

  // Fight the proving the way a player does: Space is the whole tutorial —
  // the Sharpen on your own wind-up, the read on theirs, the next bout.
  const deadline = Date.now() + 50_000
  while (Date.now() < deadline) {
    await page.keyboard.press(' ')
    await page.waitForTimeout(420)
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
      JSON.stringify({ standing: 900, progress: {}, transmitted: [], briefed: true, camp: 5 }),
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

  await page.getByRole('button', { name: 'Arena' }).click()
  await page.waitForTimeout(500)
  await page.keyboard.press(' ') // engage the marked sighting

  // Ride the Heat by hand: Fireball (1) and Kindle (3) feed it; chaining casts
  // parks the decay clock. Poll for the band crossing into Empowered/the Boil.
  let heatClimbed = false
  for (let i = 0; i < 80; i++) {
    await page.keyboard.press(i % 4 === 3 ? '3' : '1')
    await page.waitForTimeout(260)
    if (i % 5 === 4) await page.keyboard.press(' ') // Focus: the read
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
console.log('kindle yard circle shown:', results.camp)
console.log('map locked in camp:', results.mapLocked)
console.log('strike bar shown in the duel:', results.strikeBar)
console.log('camp progress:', JSON.stringify(results.grind))
console.log('warfront atlas (graduated):', results.atlas)
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
  results.strikeBar === true &&
  duelsWon >= 1 &&
  standing > 0 &&
  results.atlas === true &&
  results.heatClimbed === true

console.log(ok ? '\n✅ PASS — the fresh start turns end to end' : '\n❌ FAIL — see above')
process.exit(ok ? 0 : 1)
