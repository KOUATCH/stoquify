// Explicit scoped HMR update; no database, auth, environment or process access.
const fs = require('node:fs');
const path = require('node:path');
const { createHash } = require('node:crypto');
const root = path.resolve(__dirname, '../../../..');
const hash = bytes => createHash('sha256').update(bytes).digest('hex');
const provenancePath = path.join(__dirname, 'SOURCE_PROVENANCE.json');
const provenance = JSON.parse(fs.readFileSync(provenancePath, 'utf8'));
const target = JSON.parse(fs.readFileSync(path.join(__dirname, 'DATABASE_TARGET.json'), 'utf8'));
const sourceRoot = fs.realpathSync(provenance.sourceRoot);
if (!sourceRoot.startsWith(fs.realpathSync(target.directory) + path.sep)
  || !/^source-[a-f0-9]{8}$/.test(path.basename(sourceRoot))) throw Error('Unexpected owned source copy');
const files = [
  'actions/finance/customer-settlement.actions.ts',
  'services/accounting/customer-settlement-workbench.service.ts',
  'components/finance/CustomerSettlementControls.tsx',
  'components/finance/AROpenItemsHistoryWorkbench.tsx',
  'components/pos/ProfessionalPOSSystem.tsx',
  'hooks/useAROpenItemsHistoryWorkbench.ts',
];
const entries = [];
for (const relative of files) {
  const currentPath = path.join(root, relative), destination = path.join(sourceRoot, relative);
  const bytes = fs.readFileSync(currentPath), currentSha256 = hash(bytes);
  const previousSha256 = fs.existsSync(destination) ? hash(fs.readFileSync(destination)) : null;
  if (previousSha256 !== currentSha256) fs.writeFileSync(destination, bytes);
  if (hash(fs.readFileSync(currentPath)) !== currentSha256 || hash(fs.readFileSync(destination)) !== currentSha256) throw Error('Source changed during scoped sync; repeat after edits settle');
  const entry = provenance.files.find(file => file.path === relative);
  if (entry) entry.sha256 = currentSha256; else provenance.files.push({ path: relative, sha256: currentSha256 });
  entries.push({ path: relative, previousSha256, currentSha256, copied: previousSha256 !== currentSha256 });
}
provenance.files.sort((a, b) => a.path.localeCompare(b.path));
provenance.manifestSha256 = hash(JSON.stringify(provenance.files));
provenance.hmrSyncs = [...(provenance.hmrSyncs || []), { utc: new Date().toISOString(), files: entries, method: 'Explicit scoped current-source HMR sync; development runtime, not immutable artifact' }];
fs.writeFileSync(provenancePath, JSON.stringify(provenance, null, 2) + '\n');
console.log(JSON.stringify({ matching: files.length, copied: entries.filter(entry => entry.copied).map(entry => entry.path), manifestSha256: provenance.manifestSha256 }));
