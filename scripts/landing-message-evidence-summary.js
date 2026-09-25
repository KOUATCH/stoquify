#!/usr/bin/env node
const fs = require('fs');
const path = require('path');
const crypto = require('crypto');
const root = path.resolve('docs/landing-message');
const read = file => JSON.parse(fs.readFileSync(path.join(root, file), 'utf8'));
const tests = ['capability-tests-2026-09-19.json', 'verification-2026-09-19/purchasing-reconciliation-tests.json', 'verification-2026-09-19/unit-tests.json'].map(file => {
  const result = read(file);
  return { file, passed: result.numPassedTests, failed: result.numFailedTests, suites: result.numPassedTestSuites, success: result.success };
});
const browser = read('verification-2026-09-19/browser-results.json');
const screenshots = fs.readdirSync(path.join(root, 'screenshots/before')).filter(file => file.endsWith('.png')).map(file => {
  const dimensions = relative => { const content = fs.readFileSync(path.join(root, relative)); return { width: content.readUInt32BE(16), height: content.readUInt32BE(20), sha256: crypto.createHash('sha256').update(content).digest('hex') }; };
  const before = `screenshots/before/${file}`;
  const after = `screenshots/after-2026-09-19/${file}`;
  return { file, before: { path: before, ...dimensions(before) }, after: fs.existsSync(path.join(root, after)) ? { path: after, ...dimensions(after) } : null };
});
const sources = [
  'app/[locale]/(home)/page.tsx', 'app/[locale]/(home)/landing.css',
  'components/landing/hero.tsx', 'components/landing/landing-message-copy.ts', 'components/landing/landing-message-sections.tsx',
  'components/landing/product-gallery.tsx', 'components/landing/final-cta.tsx', 'components/landing/landing-header.tsx',
  'components/landing/landing-footer.tsx', 'components/landing/landing-section-navigation.tsx', 'components/landing/pricing-section.tsx',
  'components/auth/AuthLayout.tsx', 'components/auth/EnhancedLoginForm.tsx', 'components/auth/BeautifulRegisterForm.tsx',
  'components/auth/public-auth-copy.ts', 'messages/en.json', 'messages/fr.json',
].map(file => ({ file, sha256: crypto.createHash('sha256').update(fs.readFileSync(file)).digest('hex') }));
const summary = {
  generated: new Date().toISOString(),
  scope: 'Local, dirty working tree. Source hashes identify the evidence snapshot; this is not production certification.',
  tests, totalPassedTests: tests.reduce((sum, result) => sum + result.passed, 0),
  lint: read('verification-2026-09-19/lint-result.json'), authLint: read('verification-2026-09-19/authLint-result.json'), typecheck: read('verification-2026-09-19/typecheck-result.json'),
  browser: { finished: browser.finished, passed: browser.checks.filter(item => item.status === 'PASS').length, failed: browser.checks.filter(item => item.status === 'FAIL'), pageCount: browser.pages.length },
  liveAuth: read('verification-2026-09-19/live-auth-results.json'), screenshots, sources,
};
fs.writeFileSync(path.join(root, 'verification-2026-09-19/evidence-summary.json'), JSON.stringify(summary, null, 2));
console.log(JSON.stringify({ tests: summary.totalPassedTests, browser: summary.browser, screenshots: screenshots.length, missingAfter: screenshots.filter(item => !item.after).length }, null, 2));
