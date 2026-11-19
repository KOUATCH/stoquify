// Read-only reconciliation of synthetic records and local source provenance.
const fs = require('node:fs'), path = require('node:path'), crypto = require('node:crypto'), assert = require('node:assert/strict');
const { spawnSync } = require('node:child_process'), { PrismaClient } = require('@prisma/client');
const read = name => JSON.parse(fs.readFileSync(path.join(__dirname, name), 'utf8'));
const write = (name, value) => fs.writeFileSync(path.join(__dirname, name), JSON.stringify(value, null, 2));
const f = JSON.parse(fs.readFileSync('.codex-tmp/workflow-closure-private.json', 'utf8')), u = new URL(f.url);
if (u.hostname !== 'localhost' || u.pathname !== '/stoquify_pos_audit_20261026_d30f' || u.searchParams.get('schema') !== 'public') throw Error('Wrong disposable target');
const db = new PrismaClient({ datasourceUrl: f.url });
const hash = file => crypto.createHash('sha256').update(fs.readFileSync(file)).digest('hex');
(async () => {
  const initial = read('initial-matrix-reconciliation.json'), targeted = read('reconciliation.json');
  assert.equal(initial.length, 12); assert.equal(targeted.length, 1);
  const combined = [...initial, ...targeted];
  const readback = await db.$transaction(async tx => {
    await tx.$executeRawUnsafe('SET TRANSACTION READ ONLY');
    const results = [];
    for (const record of combined) {
      const organizationId = record.state.organizationId, where = { organizationId };
      const levels = await tx.inventoryLevel.findMany({ where: { location: { organizationId } } }); assert.equal(levels.length, 1);
      const level = levels[0], journals = await tx.journalEntry.findMany({ where, include: { lines: { include: { account: true } } }, orderBy: { id: 'asc' } });
      const state = { organizationId, stock: { quantity: level.quantityOnHand.toFixed(3), value: level.totalValue.toFixed(2), reserved: level.quantityReserved.toFixed(3) },
        orders: await tx.purchaseOrder.count({ where }), receipts: await tx.goodsReceipt.count({ where }), movements: await tx.inventoryTransaction.count({ where }), commits: await tx.pOSCommitResult.count({ where }), payments: await tx.payment.count({ where }),
        journals: journals.map(j => ({ id: j.id, lines: j.lines.map(l => ({ account: l.account.code, debit: l.debit.toString(), credit: l.credit.toString() })) })) };
      assert.deepEqual(state, record.state);
      const movements = await tx.inventoryTransaction.findMany({ where, select: { id: true, quantity: true, totalCost: true, type: true }, orderBy: { id: 'asc' } });
      results.push({ scenario: record.scenario, status: record.status, retainedStateMatches: true, state, movements });
    }
    return results;
  }, { timeout: 60000 });
  write('combined-reconciliation.json', combined); write('database-readback.json', { at: new Date().toISOString(), results: readback });
  const start = read('start-source.json');
  const compare = (entries, root) => entries.map(e => ({ ...e, finalSha256: fs.existsSync(path.join(root, e.file)) ? hash(path.join(root, e.file)) : null })).filter(e => e.sha256 !== e.finalSha256);
  const oldDrift = compare(start.oldFiles, start.baseline), currentDrift = compare(start.currentFiles, process.cwd());
  assert.equal(oldDrift.length, 0);
  const owned = ['services/inventory/__tests__/mixed-version.compatibility.postgres.test.ts', 'services/inventory/__tests__/mixed-version.worker.postgres.test.ts', 'jest.mixed-version.config.cjs', 'jest.mixed-version-worker.config.cjs', 'tsconfig.mixed-version.json'];
  const git = args => { const r = spawnSync('git', args, { encoding: 'utf8', windowsHide: true, maxBuffer: 16 * 1024 * 1024 }); if (r.status) throw Error('Git inspection failed'); return r.stdout; };
  write('final-source.json', { at: new Date().toISOString(), head: git(['rev-parse', 'HEAD']).trim(), baselineFiles: start.oldFiles.length, baselineDrift: oldDrift, currentDrift, owned: owned.map(file => ({ file, sha256: hash(file) })) });
  fs.writeFileSync(path.join(__dirname, 'final-working-tree.txt'), git(['status', '--short']));
  console.log(JSON.stringify({ reconciledScenarios: readback.length, baselineDrift: oldDrift.length, currentDrift: currentDrift.map(e => e.file) }));
})().catch(e => { console.error(String(e.message).replace(/postgres(?:ql)?:\/\/[^\s"']+/g, '[redacted URL]')); process.exitCode = 1; }).finally(() => db.$disconnect());
