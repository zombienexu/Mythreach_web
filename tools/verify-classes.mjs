// npm run verify:classes — build, boot the preview server, and drive the
// game end-to-end as two of the callings: a Gravewright rolled at the
// creation ceremony, and a seeded mid-game Hourwarden. Fails on any browser
// error or missing class machinery.
import { chromium } from 'playwright'
import { build, preview } from 'vite'

await build({ logLevel: 'warn' })
const server = await preview({ preview: { port: 0 } })
const { port } = server.httpServer.address()
const browser = await chromium.launch()
const errors = []

async function newPage() {
  const page = await browser.newPage({ viewport: { width: 1280, height: 800 } })
  page.on('pageerror', (e) => errors.push(`pageerror: ${e.message}`))
  page.on('console', (m) => {
    if (m.type() === 'error') errors.push(`console: ${m.text()}`)
  })
  return page
}

const shots = process.env.SHOTS_DIR ?? 'docs'

// ── Scenario 1: create a Gravewright at the ceremony, fight, bury, spend ──
{
  const page = await newPage()
  await page.goto(`http://localhost:${port}/`)
  await page.waitForTimeout(2000)
  await page.getByRole('button', { name: /Begin a new legend/ }).first().click()
  await page.waitForTimeout(900)

  // Pick the Gravewright calling, Ashmarch origin, Tower sign.
  await page.getByRole('option', { name: /Gravewright/ }).click()
  await page.waitForTimeout(400)
  const detail = await page.textContent('article.detail')
  if (!detail.includes('Ledger of the Dead')) throw new Error('creation detail missing mechanic')
  if (!detail.includes('Exhume')) throw new Error('creation detail missing real ability')
  await page.getByRole('button', { name: /Ashmarch Survivor/ }).click()
  await page.getByRole('button', { name: /The Tower/ }).click()
  await page.screenshot({ path: `${shots}/verify-create-gravewright.png`, fullPage: true })
  await page.getByRole('button', { name: 'Begin the long hunt' }).click()
  await page.waitForTimeout(1200)

  // The resource widget names the mechanic before a single kill.
  const foot = await page.textContent('body')
  if (!foot.includes('The Ledger of the Dead')) throw new Error('ledger widget missing')

  // Fight: gravebolt until the pack is down, loot, check a page was written.
  await page.getByRole('button', { name: 'Start fight' }).click()
  for (let i = 0; i < 40; i++) {
    await page.keyboard.press('1')
    await page.waitForTimeout(400)
    if (await page.getByRole('button', { name: /Loot all/ }).isVisible().catch(() => false)) break
  }
  await page.screenshot({ path: `${shots}/verify-gravewright-fight.png` })
  const body = await page.textContent('body')
  if (!body.includes('last buried:')) throw new Error('no page was buried after a kill')
  console.log('gravewright: creation, kit bar, ledger page ✓')
  await page.close()
}

// ── Scenario 2: a seeded mid-game Hourwarden — debt, reckoning meter ──
{
  const page = await newPage()
  await page.goto(`http://localhost:${port}/`)
  await page.evaluate(() => {
    const save = {
      version: 5, level: 8, xp: 0, gold: 100,
      classId: 'hourwarden', originId: 'lamplit-scholar', signId: 'serpent',
      talents: {}, equipped: {}, inventory: [], nextUid: 10, regionId: 'hollowroot',
      materials: {}, activeQuests: {}, completedQuests: [], achievements: [],
      lifetime: { kills: 0, deaths: 0, goldEarned: 0, interrupts: 0, epicsFound: 0, bossKills: 0 },
      records: { worldBossFells: 0, bestAssaultDamage: 0 },
      worldBossHp: 40000, companionId: null, ledgerPages: 0, autoBattle: false,
    }
    const profile = { name: 'Tessaly', classId: 'hourwarden', originId: 'lamplit-scholar', signId: 'serpent', createdAt: Date.now(), playedAt: Date.now() }
    localStorage.setItem('mythreach-save-s2-v1', JSON.stringify(save))
    localStorage.setItem('mythreach-profile-s2-v1', JSON.stringify(profile))
  })
  await page.reload()
  await page.waitForTimeout(2000)
  await page.getByRole('button', { name: /Tessaly/ }).click()
  await page.waitForTimeout(1200)

  const body0 = await page.textContent('body')
  if (!body0.includes('Sand Debt')) throw new Error('debt widget missing')

  await page.getByRole('button', { name: 'Start fight' }).click()
  await page.waitForTimeout(400)
  await page.keyboard.press('1') // Secondhand Strike (+8 debt)
  await page.waitForTimeout(600)
  const body1 = await page.textContent('body')
  if (!body1.includes('reckoning in')) throw new Error('reckoning countdown missing after borrowing')
  await page.keyboard.press('2') // Rewind Wound may refuse (unhit) — fine, tests cover it
  await page.screenshot({ path: `${shots}/verify-hourwarden-fight.png` })
  console.log('hourwarden: seeded save, kit bar, debt + reckoning ✓')
  await page.close()
}

await browser.close()
await server.close()

if (errors.length > 0) {
  console.error('BROWSER ERRORS:\n' + errors.join('\n'))
  process.exit(1)
}
console.log('verify-classes: all scenarios passed, no browser errors')
process.exit(0)
