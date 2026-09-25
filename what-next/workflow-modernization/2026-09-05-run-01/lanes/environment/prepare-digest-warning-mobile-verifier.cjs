const fs = require('node:fs'), path = require('node:path');
const source = fs.readFileSync(path.join(__dirname, 'verify-digest-warnings.cjs'), 'utf8');
const before = "await disclosure.scrollIntoViewIfNeeded(); const shot =";
if (!source.includes(before)) throw new Error('Expected verification point missing');
const text = source.replace("for (const locale of ['en', 'fr'])", "for (const locale of ['fr'])")
  .replace("width: locale === 'fr' ? 390 : 1440", "width: 320")
  .replace(before, `const overflow = await limitations.locator('summary, p').evaluateAll(elements => elements.filter(element => element.scrollWidth > element.clientWidth + 1).map(element => ({ text: element.textContent, width: element.clientWidth, contentWidth: element.scrollWidth })));
    row.overflow = overflow;
    assert.deepEqual(overflow, []);
    row.viewport = 320;
    await disclosure.scrollIntoViewIfNeeded(); const shot =`);
fs.writeFileSync(path.join(__dirname, 'verify-digest-warnings-mobile.cjs'), text, { flag: 'wx' });
console.log('Prepared 320px warning reflow check.');
