// Verifies the kill → gold → respawn cycle in a real browser.
import { chromium } from 'playwright'
import { createServer } from 'vite'

const out = process.argv[2] ?? '/tmp/kill'
const server = await createServer({ root: process.cwd(), server: { port: 0 } })
await server.listen()
const port = server.httpServer.address().port

const browser = await chromium.launch()
const page = await browser.newPage({ viewport: { width: 1280, height: 800 } })
await page.goto(`http://localhost:${port}/`)
await page.waitForTimeout(800)

let deathShot = false
for (let i = 0; i < 200; i++) {
  await page.keyboard.press('1')
  await page.keyboard.press('2')
  await page.waitForTimeout(200)
  if (!deathShot) {
    const slain = await page.locator('.log li .text', { hasText: 'slain' }).count()
    if (slain > 0) {
      await page.screenshot({ path: `${out}-death.png` })
      deathShot = true
    }
  }
  const kills = await page.locator('.kills .num').textContent()
  if (Number(kills) >= 2) break
}

await page.screenshot({ path: `${out}-after.png` })
const kills = await page.locator('.kills .num').textContent()
const gold = await page.locator('.stat.gold .num').textContent()
const tail = (await page.locator('.log li .text').allTextContents()).slice(-8)
console.log(`kills=${kills} gold=${gold}`)
console.log(tail.join('\n'))

await browser.close()
await server.close()
