// Read-only diagnosis of an already recorded S12 source/restore pair.
const fs = require('node:fs');
const path = require('node:path');
const assert = require('node:assert/strict');
const { spawnSync } = require('node:child_process');
const { sourceTarget } = require('./s12-target.cjs');
const { profileAll } = require('./run-s12-rehearsal.cjs');
async function main() {
  const [record, output] = process.argv.slice(2), report = JSON.parse(fs.readFileSync(record));
  assert.match(report.restoreName, /^stoquify_restore_s12_\d{8}_[a-f0-9]{10}$/);
  const source = sourceTarget(report.sourceName), target = new URL(source); target.pathname = '/' + report.restoreName;
  const before = await profileAll(source.toString()), restored = await profileAll(target.toString());
  const comparison = { contentEqual: JSON.stringify(before) === JSON.stringify(restored), tables: before.length, nonemptyTables: before.filter(x => x.count !== '0').length };
  for (const [label, url] of [['source', source], ['restored', target]]) {
    const result = spawnSync(process.execPath, ['node_modules/prisma/build/index.js', 'migrate', 'diff', '--from-schema-datasource', path.resolve('prisma/schema.prisma'), '--to-schema-datamodel', path.resolve('prisma/schema.prisma'), '--script'], { env: { ...process.env, NODE_ENV: 'test', DATABASE_URL: url.toString(), DIRECT_URL: url.toString(), SHADOW_DATABASE_URL: url.toString() }, encoding: 'utf8', timeout: 120000, windowsHide: true, maxBuffer: 10e6 });
    assert.equal(result.status, 0, label + ' schema inspection failed');
    fs.writeFileSync(output + '-' + label + '.sql', result.stdout, { flag: 'wx' });
  }
  fs.writeFileSync(output + '.json', JSON.stringify(comparison, null, 2), { flag: 'wx' });
  console.log(JSON.stringify(comparison));
}
main().catch(error => { console.error(error.message); process.exitCode = 1 });
