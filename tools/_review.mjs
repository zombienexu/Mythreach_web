// Dev review driver: boots the dev server, plays a few seconds, screenshots.
import { chromium } from 'playwright'
import { createServer } from 'vite'

const out = process.argv[2] ?? '/tmp/review'
const server = await createServer({ root: process.cwd(), server: { port: 0 } })
await server.listen()
const port = server.httpServer.address().port

const browser = await chromium.launch()
const page = await browser.newPage({ viewport: { width: 1280, height: 800 } })
await page.goto(`http://localhost:${port}/`)
await page.waitForTimeout(900) // fonts + first paint

await page.keyboard.press('2') // Ignite
await page.waitForTimeout(300)
await page.keyboard.press('1') // Fireball
await page.waitForTimeout(1200) // mid-cast
await page.screenshot({ path: `${out}-a.png` })

await page.waitForTimeout(1700) // fireball landed, DoT ticking
await page.keyboard.press('3') // Renew
await page.waitForTimeout(1000) // mid-renew
await page.screenshot({ path: `${out}-b.png` })

await page.waitForTimeout(3000)
await page.screenshot({ path: `${out}-c.png` })

const log = await page.locator('.log li .text').allTextContents()
console.log(log.join('\n'))
const hp = await page.locator('.hp').allTextContents()
console.log('HP:', hp.join(' | '))

await browser.close()
await server.close()
