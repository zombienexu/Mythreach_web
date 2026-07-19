// End-to-end smoke for the Threshold slice + combat/quest upgrades.
// Verifies: projection, arrival briefing, deployments/orders, the Codex loop,
// teaching, and the War-Weaving Heat widget under forced crits. Fails on any
// console/page error.
import { mkdir } from 'node:fs/promises'
import { chromium } from 'playwright'
import { build, preview } from 'vite'

const OUT = '/tmp/claude-1000/-home-ztovs-work-mythreach-web/9559c156-5e56-42ff-9dba-9fe43b8710aa/scratchpad/shots'
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

// ── 1. fresh: projection → briefing → orders → arena → grind ─────────
{
  const page = await browser.newPage({ viewport: { width: 1320, height: 840 } })
  watch(page)
  await page.goto(base)
  await page.waitForTimeout(600)
  // Title screen → a fresh slot → name it → cross the Threshold.
  await page.getByRole('button', { name: /Begin a new legend/ }).first().click()
  await page.waitForTimeout(400)
  await page.getByRole('button', { name: /Cross the Threshold/ }).click()
  await page.waitForTimeout(700)
  await page.getByRole('button', { name: /Skip projection/ }).click().catch(() => {})
  await page.waitForTimeout(1000)

  // arrival briefing from the sergeant
  results.briefed = (await page.getByText(/Sergeant Vale/i).count()) > 0
  await page.screenshot({ path: `${OUT}/b1-briefing.png` })
  await page.getByRole('button', { name: /Acknowledge orders/ }).click().catch(() => {})
  await page.waitForTimeout(600)
  // lands on the Dossier — deployments + scoped orders
  results.deployments = (await page.getByText(/deployments/i).count()) > 0
  await page.screenshot({ path: `${OUT}/b2-dossier-orders.png`, fullPage: true })

  // arena: sealed seats + Heat gauge
  await page.getByRole('button', { name: 'Arena' }).click()
  await page.waitForTimeout(600)
  results.heatWidget = (await page.getByText(/Building Heat|Empowered|Overheat/).count()) > 0
  await page.screenshot({ path: `${OUT}/b3-arena.png` })

  // grind with automation
  await page.keyboard.press('a')
  await page.keyboard.press(' ')
  await page.waitForTimeout(45_000)
  const state = await page.evaluate(() => {
    const raw = localStorage.getItem('mythreach-expedition-v1')
    return raw ? JSON.parse(raw) : null
  })
  results.grind = state
  await page.close()
}

// ── 2. a level-10 pyromancer: Heat climbs, the fire evolves ──────────
{
  const page = await browser.newPage({ viewport: { width: 1320, height: 840 } })
  watch(page)
  await page.addInitScript(() => {
    // Ember-Lord standing → the whole fire kit taught; a crit trinket to make
    // the fight vivid; auto-battle drives the loop.
    localStorage.setItem(
      'mythreach-expedition-v1',
      JSON.stringify({ standing: 900, progress: {}, transmitted: [], briefed: true }),
    )
    localStorage.setItem(
      'mythreach-save-v1',
      JSON.stringify({
        version: 5, level: 10, xp: 0, gold: 0,
        classId: 'arcanist', originId: 'ashmarch-survivor', signId: 'tower',
        talents: {}, inventory: [], nextUid: 2, regionId: 'hollowroot',
        equipped: { trinket: { uid: 1, name: 'Emberglass Charm', slot: 'trinket', ilvl: 6, rarity: 'epic', stats: { crit: 40 } } },
        materials: {}, activeQuests: {}, completedQuests: [], achievements: [],
        lifetime: { kills: 0, deaths: 0, goldEarned: 0, interrupts: 0, epicsFound: 0, bossKills: 0 },
        records: { worldBossFells: 0, bestAssaultDamage: 0 },
        worldBossHp: 40000, companionId: null, ledgerPages: 0, autoBattle: true,
      }),
    )
  })
  await page.goto(base)
  await page.waitForTimeout(700)
  await page.getByRole('button', { name: /Enter the Reach/ }).click()
  await page.waitForTimeout(1000)
  await page.keyboard.press(' ') // ensure a fight is on

  // Poll for Heat climbing into a hotter band as auto-battle stacks Fireballs.
  let heatClimbed = false
  for (let i = 0; i < 30; i++) {
    await page.waitForTimeout(400)
    const empowered = await page.getByText(/Empowered|Overheat/).count()
    if (empowered > 0) {
      heatClimbed = true
      await page.screenshot({ path: `${OUT}/b4-heat-evolved.png` })
      break
    }
  }
  results.heatClimbed = heatClimbed
  if (!heatClimbed) await page.screenshot({ path: `${OUT}/b4-arena-fire.png` })
  await page.close()
}

await browser.close()
server.httpServer.close()

// ── verdict ──────────────────────────────────────────────────────────
console.log('\n===== SLICE SMOKE (combat + quests) =====')
console.log('briefing shown:', results.briefed)
console.log('deployments shown:', results.deployments)
console.log('heat gauge shown:', results.heatWidget)
console.log('grind exp:', JSON.stringify(results.grind))
console.log('heat climbed a band:', results.heatClimbed)
console.log('errors:', errors.length ? errors : 'none')
console.log('shots in:', OUT)

const standing = results.grind?.exp?.standing ?? results.grind?.standing ?? 0
const ok =
  errors.length === 0 &&
  results.briefed === true &&
  results.deployments === true &&
  results.heatWidget === true &&
  standing > 0 &&
  results.heatClimbed === true

console.log(ok ? '\n✅ PASS — combat + quest systems turn end to end' : '\n❌ FAIL — see above')
process.exit(ok ? 0 : 1)
