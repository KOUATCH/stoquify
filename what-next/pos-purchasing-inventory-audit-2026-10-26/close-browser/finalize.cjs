// Read-only source comparison; writes only this evidence directory.
const fs = require('node:fs'), path = require('node:path'), crypto = require('node:crypto'), { spawnSync } = require('node:child_process');
const root = process.cwd(), app = path.join(root, '.codex-tmp/close-browser-app');
const start = JSON.parse(fs.readFileSync(path.join(__dirname, 'start-source.json'), 'utf8'));
const owned = ['actions/accounting/close-assurance.actions.ts', 'actions/accounting/__tests__/close-assurance.actions.test.ts', 'components/accounting/CloseAssuranceCenter.tsx', 'components/accounting/__tests__/CloseAssuranceCenter.test.tsx', 'app/[locale]/(dashboard)/dashboard/accounting/setup/page.tsx', 'app/[locale]/(dashboard)/dashboard/accounting/setup/__tests__/page.test.tsx'];
const newFiles = ['services/inventory/__tests__/close-browser-seed.postgres.test.ts', 'jest.close-browser-actions.config.cjs', 'jest.close-browser-ui.config.cjs', 'tsconfig.close-browser.json', 'jest.close-browser-setup.config.cjs'];
const hash = file => fs.existsSync(file) ? crypto.createHash('sha256').update(fs.readFileSync(file)).digest('hex') : null;
const files = start.files.map(f => ({ file: f.file, sha256: hash(path.join(root, f.file)), startSha256: f.sha256, browserSha256: hash(path.join(app, f.file)) }));
const git = args => { const r = spawnSync('git', args, { encoding: 'utf8', maxBuffer: 16 * 1024 * 1024 }); if (r.status !== 0) throw Error(r.stderr); return r.stdout; };
const result = { at: new Date().toISOString(), head: git(['rev-parse', 'HEAD']).trim(), files, owned, newFiles: newFiles.map(file => ({ file, sha256: hash(path.join(root, file)) })), changesSinceStart: files.filter(f => f.sha256 !== f.startSha256).map(f => ({ ...f, owned: owned.includes(f.file) })), browserDifferences: files.filter(f => f.browserSha256 !== f.sha256), faultMarkerActive: fs.existsSync(path.join(app, '.close-cache-fault')) };
fs.writeFileSync(path.join(__dirname, 'final-source.json'), JSON.stringify(result, null, 2));
fs.writeFileSync(path.join(__dirname, 'owned.patch'), git(['diff', '--', ...owned]));
fs.writeFileSync(path.join(__dirname, 'final-working-tree.txt'), git(['status', '--short']));
git(['diff', '--check', '--', ...owned]);
console.log(JSON.stringify({ head: result.head, files: files.length, changed: result.changesSinceStart.map(f => ({ file: f.file, owned: f.owned })), browserDifferences: result.browserDifferences.map(f => f.file), faultMarkerActive: result.faultMarkerActive, ownedDiffCheck: 'PASS' }, null, 2));
