const fs = require('node:fs'), path = require('node:path')
process.env.PLAYWRIGHT_BROWSERS_PATH = 'C:/Users/J COMPUTER/AppData/Local/ms-playwright'
const { chromium } = require('playwright')
const fixture = JSON.parse(fs.readFileSync(path.join(__dirname, 'BROWSER_FIXTURE.json'), 'utf8'))
const app = JSON.parse(fs.readFileSync(path.join(__dirname, 'APPLICATION_TARGET.json'), 'utf8'))
if (app.origin !== 'http://127.0.0.1:3187') throw new Error('Unexpected fixture origin')
async function main() {
  const browser = await chromium.launch({ headless: true })
  const context = await browser.newContext({ viewport: { width: 1366, height: 768 } })
  context.setDefaultTimeout(60000)
  // Never contact external hosts while compiling/rendering the actual application.
  await context.route('**/*', route => new URL(route.request().url()).origin === app.origin ? route.continue() : route.abort())
  const results = { browser: browser.version(), viewport: { width: 1366, height: 768 }, origin: app.origin, steps: [], errors: [] }
  let page
  try {
    console.log('Signing in synthetic cashier through real auth endpoint')
    const auth = await context.request.post(app.origin + '/api/auth/sign-in/email', { data: { email: fixture.email, password: 'Retention-Synthetic-Only-2026!', rememberMe: true }, headers: { Origin: app.origin }, timeout: 240000 })
    results.steps.push({ step: 'credential sign-in', status: auth.status() })
    if (!auth.ok()) { results.errors.push((await auth.text()).slice(0, 1500)); throw new Error('Synthetic sign-in failed') }
    const permissions = await context.request.get(app.origin + '/api/me/permissions', { timeout: 240000 })
    results.steps.push({ step: 'fresh permissions', status: permissions.status(), data: await permissions.json() })
    page = await context.newPage()
    page.on('pageerror', error => results.errors.push(error.message))
    console.log('Opening actual English POS route')
    await page.goto(app.origin + '/en/dashboard/pos', { waitUntil: 'domcontentloaded', timeout: 240000 })
    await page.getByTestId('pos-commit-recovery').waitFor({ state: 'visible', timeout: 180000 })
    results.steps.push({ step: 'retained recovery visible', result: 'PASS' })
  } catch (error) { results.failure = error.message; process.exitCode = 1 }
  finally {
    if (page) {
      results.url = page.url()
      fs.writeFileSync(path.join(__dirname, 'BROWSER_PROBE_BODY.txt'), await page.locator('body').innerText().catch(() => 'Unavailable'))
      await page.screenshot({ path: path.join(__dirname, 'BROWSER_PROBE.png'), fullPage: true }).catch(() => {})
    }
    fs.writeFileSync(path.join(__dirname, 'BROWSER_PROBE.json'), JSON.stringify(results, null, 2))
    await context.close(); await browser.close()
  }
}
main().catch(error => { console.error(error.message); process.exitCode = 1 })
