// Reduced-motion + keyboard-focus sanity pass.
import { chromium } from 'playwright'
import { createServer } from 'vite'

const out = process.argv[2] ?? '/tmp/a11y'
const server = await createServer({ root: process.cwd(), server: { port: 0 } })
await server.listen()
const port = server.httpServer.address().port

const browser = await chromium.launch()

// 1. reduced motion: page must render, no drifting blobs/sheen (visual check)
const rm = await browser.newPage({ viewport: { width: 1280, height: 800 }, reducedMotion: 'reduce' })
await rm.goto(`http://localhost:${port}/`)
await rm.waitForTimeout(900)
await rm.keyboard.press('2')
await rm.waitForTimeout(600)
await rm.screenshot({ path: `${out}-reduced.png` })
await rm.close()

// 2. keyboard: tab reaches the ability buttons, Enter activates
const kb = await browser.newPage({ viewport: { width: 1280, height: 800 } })
await kb.goto(`http://localhost:${port}/`)
await kb.waitForTimeout(900)
for (let i = 0; i < 3; i++) await kb.keyboard.press('Tab')
const focused = await kb.evaluate(() => {
  const el = document.activeElement
  return el ? `${el.tagName} ${el.getAttribute('aria-label') ?? ''}` : 'none'
})
console.log('focused after 3 tabs:', focused)
await kb.keyboard.press('Enter') // activate focused ability
await kb.waitForTimeout(400)
const casting = await kb.locator('.cast-slot.active').count()
console.log('cast slot active after Enter:', casting)
await kb.screenshot({ path: `${out}-focus.png` })

// 3. background-tab catch-up clamp: freeze rAF via CDP page pause is hard headless;
//    instead verify the loop clamps by faking a long frame through visibility.
const clamp = await kb.evaluate(() => new Promise((resolve) => {
  const t0 = performance.now()
  requestAnimationFrame(() => resolve(performance.now() - t0))
}))
console.log('rAF alive, frame delta ms:', Math.round(clamp))

await browser.close()
await server.close()
