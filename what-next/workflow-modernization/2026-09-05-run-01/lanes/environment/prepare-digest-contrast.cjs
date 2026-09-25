const fs = require('node:fs'), path = require('node:path');
const source = fs.readFileSync(path.join(__dirname, 'verify-digest-urgency-current.cjs'), 'utf8');
const marker = '  for (const locale of process.argv.includes';
if (!source.includes(marker)) throw new Error('Fixture anchor missing');
let prefix = source.slice(0, source.indexOf(marker));
prefix = prefix.replace('const hashes = () =>', "files.push('app/globals.css', 'components/ui/button.tsx', 'components/bi/BIEvidenceBadgeRow.tsx');\nconst hashes = () =>");
const body = String.raw`
  for (const locale of ['en', 'fr']) {
    const context = await browser.newContext({ viewport: { width: locale === 'fr' ? 320 : 1440, height: 1100 }, reducedMotion: 'reduce' });
    await context.route('**/*', route => new URL(route.request().url()).origin === base ? route.continue() : route.abort());
    assert.equal((await context.request.post(base + '/api/auth/sign-in/email', { headers: { Origin: base }, data: { email: actor.email, password }, timeout: 60000 })).status(), 200);
    const page = await context.newPage(); currentPage = page;
    const row = { locale, errors: [], scans: [] }; result.browser.push(row);
    page.on('pageerror', error => row.errors.push(f.safe(error, secrets)));
    await page.goto(base + '/' + locale + '/dashboard/daily-digest', { waitUntil: 'domcontentloaded', timeout: 120000 });
    await page.addScriptTag({ path: require.resolve('axe-core') });
    for (const name of locale === 'en' ? ['Brief', 'Command', 'Investigate'] : ['Synthèse', 'Pilotage', 'Examiner']) {
      const mode = page.getByRole('button', { name, exact: true }); await expect(mode).toBeEnabled(); await mode.focus(); await page.keyboard.press('Enter');
      await expect(mode).toHaveAttribute('aria-pressed', 'true');
      const scan = await page.evaluate(async () => {
        const report = await window.axe.run('.dashboard-landing-content', { runOnly: { type: 'tag', values: ['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa'] } });
        const summarize = entries => entries.map(value => ({ id: value.id, impact: value.impact, nodes: value.nodes.map(node => ({ target: node.target, html: node.html, any: node.any, all: node.all, none: node.none })) }));
        return { violations: summarize(report.violations), incomplete: summarize(report.incomplete), passes: report.passes.map(item => item.id) };
      });
      const contrast = scan.incomplete.find(item => item.id === 'color-contrast')?.nodes || [];
      const backgrounds = [];
      for (const node of contrast.slice(0, 4)) {
        if (typeof node.target[0] !== 'string') continue;
        backgrounds.push(await page.locator(node.target[0]).first().evaluate(element => {
          const result = []; for (let current = element; current; current = current.parentElement) {
            const style = getComputedStyle(current); result.push({ tag: current.tagName, class: current.className, color: style.color, background: style.backgroundColor, image: style.backgroundImage, opacity: style.opacity, filter: style.filter, backdrop: style.backdropFilter });
          } return result;
        }));
      }
      const renderedContrast = await require('./measure-rendered-contrast.cjs')(page, contrast);
      row.scans.push({ mode: name, ...scan, backgrounds, renderedContrast });
      console.log(locale + ' ' + name + ': ' + scan.violations.length + ' violations; ' + scan.incomplete.length + ' incomplete rule groups');
    }
    const shot = 'digest-contrast-' + stamp + '-' + locale + '.png'; await page.screenshot({ path: path.join(__dirname, shot), animations: 'disabled', caret: 'initial' }); row.screenshot = shot;
    assert.deepEqual(row.errors, []); await context.close();
  }
  assert.deepEqual(await effects(), before); result.noFinancialEffects = true; result.scanCompleted = true;
}
main().catch(error => { result.scanCompleted = false; result.error = f.safe(error, secrets); process.exitCode = 1; }).finally(async () => { await browser?.close(); result.sourceAfter = hashes(); result.sourceStable = JSON.stringify(result.sourceBefore) === JSON.stringify(result.sourceAfter); const output = path.join(__dirname, 'digest-contrast-' + stamp + '.json'); fs.writeFileSync(output, JSON.stringify(result, null, 2), { flag: 'wx' }); console.log(JSON.stringify({ output, scanCompleted: result.scanCompleted, error: result.error, sourceStable: result.sourceStable })); await db.$disconnect(); });
`;
fs.writeFileSync(path.join(__dirname, 'verify-digest-contrast.cjs'), prefix + body, { flag: 'wx' });
console.log('Created scoped Digest accessibility diagnostic');
