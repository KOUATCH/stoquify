// Scoped TypeScript analysis only. Explicitly disables incremental output.
const fs = require('node:fs'), path = require('node:path'), { spawnSync } = require('node:child_process');
const args = ['node_modules/typescript/bin/tsc', '--project', 'tsconfig.close-browser.json', '--noEmit', '--incremental', 'false'];
const start = new Date().toISOString(), r = spawnSync(process.execPath, args, { encoding: 'utf8', maxBuffer: 4 * 1024 * 1024 });
fs.writeFileSync(path.join(__dirname, 'typecheck-results.json'), JSON.stringify({ start, end: new Date().toISOString(), command: 'node ' + args.join(' '), exitCode: r.status, diagnostics: r.stdout + r.stderr }, null, 2));
console.log(r.status === 0 ? 'PASS: scoped TypeScript' : r.stdout + r.stderr); process.exitCode = r.status ?? 1;
