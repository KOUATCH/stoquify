"use strict";
const fs = require('node:fs'), path = require('node:path'), crypto = require('node:crypto'), { spawnSync } = require('node:child_process');
if (process.argv[2] !== '--run') { console.log('Inert; --run executes the inspected read-only service boundary gate.'); process.exit(0); }
const root = path.resolve(__dirname, '../../../../..'), evidence = path.resolve(__dirname, '../../evidence'), stem = path.join(evidence, 'sign-close-boundary-' + crypto.randomUUID());
const sha = value => crypto.createHash('sha256').update(value).digest('hex');
function files(dir) { return fs.readdirSync(dir, { withFileTypes: true }).flatMap(entry => ['.git', '.next', '.turbo', 'coverage', 'dist', 'build', 'node_modules', 'graphify-out'].includes(entry.name) ? [] : entry.isDirectory() ? files(path.join(dir, entry.name)) : /\.(ts|tsx|js|jsx|mjs|cjs)$/.test(entry.name) ? [path.join(dir, entry.name)] : []); }
const tracked = [...['app', 'actions', 'components', 'hooks'].flatMap(dir => files(path.join(root, dir))), path.join(root, 'scripts/service-boundary-gate.js'), path.join(root, 'package.json'), __filename];
const sources = () => Object.fromEntries(tracked.map(file => [path.relative(root, file).replaceAll('\\', '/'), sha(fs.readFileSync(file))]));
const command = ['scripts/service-boundary-gate.js', '--mode', 'fail', '--json-out', stem + '-findings.json'];
const report = { at: new Date().toISOString(), command, sourceBefore: sources(), scope: 'Existing app/actions/components/hooks static service-boundary gate. No database, migration, seed, build, network or product mutation.' };
const result = spawnSync(process.execPath, command, { cwd: root, encoding: 'utf8', windowsHide: true, maxBuffer: 32 * 1024 * 1024 });
report.exitCode = result.status; if (result.error) report.error = result.error.message;
report.sourceAfter = sources(); report.sourceStable = JSON.stringify(report.sourceBefore) === JSON.stringify(report.sourceAfter);
fs.writeFileSync(stem + '.log', (result.stdout || '') + (result.stderr || ''), { flag: 'wx' });
if (fs.existsSync(stem + '-findings.json')) report.summary = JSON.parse(fs.readFileSync(stem + '-findings.json')).summary;
report.passed = result.status === 0 && report.sourceStable;
fs.writeFileSync(stem + '.json', JSON.stringify(report, null, 2) + '\n', { flag: 'wx' }); console.log(JSON.stringify({ receipt: stem + '.json', passed: report.passed, exitCode: report.exitCode, summary: report.summary, sourceStable: report.sourceStable })); process.exitCode = report.passed ? 0 : 1;
