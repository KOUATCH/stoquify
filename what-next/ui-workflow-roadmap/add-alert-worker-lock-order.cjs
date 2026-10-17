const fs = require('node:fs');
const path = require('node:path');
const target = path.resolve(__dirname, '../../services/reconciliation/payment-reconciliation-alert-scan.service.ts');
let source = fs.readFileSync(target, 'utf8');
const original = source;
const newline = source.includes('\r\n') ? '\r\n' : '\n';
const lock = '        await tx.$queryRaw`SELECT id FROM organizations WHERE id = ${args.organizationId} FOR SHARE`';
if (source.includes(lock)) throw new Error('Lock already added; do not rerun.');
for (const anchor of ['      last = await db.$transaction(async tx => {', '      if (version !== undefined) await db.$transaction(async tx => {']) {
  if (source.split(anchor).length !== 2) throw new Error('Unexpected worker structure.');
  source = source.replace(anchor, anchor + newline + '        // Match organization-before-scan locking used by operator recovery.' + newline + lock);
}
source = source.replace('The caller must hold the scan control row lock.', 'The caller must lock organization before scan.');
const staged = target + '.lock-order-' + require('node:crypto').randomUUID() + '.tmp';
fs.writeFileSync(staged, source);
if (fs.readFileSync(target, 'utf8') !== original) throw new Error('Source changed during staging; target preserved.');
fs.renameSync(staged, target);
