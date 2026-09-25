const fs = require('node:fs');
const path = require('node:path');
const crypto = require('node:crypto');
const Module = require('node:module');
const ts = require('typescript');
const root = process.cwd();
const out = __dirname;
function dataModule(relative) {
  const filename = path.join(root, relative);
  const compiled = ts.transpileModule(fs.readFileSync(filename, 'utf8'), { compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2017 } });
  const mod = new Module(filename);
  mod._compile(compiled.outputText, filename);
  return mod.exports;
}
const product = dataModule('components/landing/public-product-copy.ts');
const auth = dataModule('components/auth/public-auth-copy.ts');
const landing = dataModule('components/landing/landing-message-copy.ts');
const catalogue = { ...product, ...auth, ...landing, workflowMessages: Object.fromEntries(['en','fr'].map(locale => [locale, JSON.parse(fs.readFileSync(`messages/${locale}.json`, 'utf8')).landing.workflowAtlas])) };
fs.writeFileSync(path.join(out, 'final-bilingual-copy.json'), JSON.stringify(catalogue,null,2));
const files = [
  'app/[locale]/(home)/page.tsx',
  'components/landing/hero.tsx', 'components/landing/landing-message-sections.tsx',
  'components/landing/capability-overview.tsx', 'components/landing/public-product-copy.ts',
  'components/landing/workflow-atlas.tsx', 'components/landing/__tests__/workflow-atlas.test.tsx',
  'components/auth/AuthLayout.tsx', 'components/auth/public-auth-copy.ts',
  'components/auth/public-workspace-guide.tsx', 'components/auth/EnhancedLoginForm.tsx',
  'components/auth/BeautifulRegisterForm.tsx', 'messages/en.json', 'messages/fr.json',
  'package.json', 'scripts/ui-route-smoke-gate.js', 'scripts/__tests__/ui-route-smoke-gate.test.js',
  'scripts/public-product-communication-browser-smoke.cjs', 'scripts/__tests__/workflow-atlas-landing.test.js',
];
fs.writeFileSync(path.join(out, 'changed-source-hashes.json'), JSON.stringify(files.map(file => ({ file, sha256: crypto.createHash('sha256').update(fs.readFileSync(file)).digest('hex') })), null, 2));
console.log('Exported bilingual copy and hashes for', files.length, 'source/test files.');
