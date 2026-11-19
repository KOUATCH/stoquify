'use strict';
// Reads the frozen refresh manifest and named source files; writes two exclusive local evidence files.
const fs = require('node:fs');
const path = require('node:path');
const crypto = require('node:crypto');
const assert = require('node:assert/strict');
const root = path.resolve(__dirname, '../../../../../..');
const prior = path.resolve(__dirname, '../../qualification-20261110-r2');
const hash = bytes => crypto.createHash('sha256').update(bytes).digest('hex');
const read = name => JSON.parse(fs.readFileSync(path.join(__dirname, name), 'utf8'));
const manifestBytes = fs.readFileSync(path.join(__dirname, 'CURRENT-SOURCE-MANIFEST-r1.json'));
const manifest = JSON.parse(manifestBytes);
const report = read('SOURCE-REFRESH-r1.json');
const selected = read('SELECTED-INPUTS-REFRESH-r1.json');
const statStartedAt = new Date().toISOString();
const sized = manifest.files.map(row => {
  const stat = fs.lstatSync(path.join(root, row.path));
  assert(stat.isFile(), 'Size estimate expects a regular source file');
  return { ...row, bytes: stat.size, estimatedAllocatedBytes: Math.ceil(stat.size / 4096) * 4096 };
});
const sizes = { at: new Date().toISOString(), statStartedAt,
  sourceManifest: { path: 'CURRENT-SOURCE-MANIFEST-r1.json', sha256: hash(manifestBytes), identitySha256: manifest.identitySha256 },
  allocationUnitBytes: 4096, allocationUnitProvenance: 'Runtime owner reported observed D: NTFS allocation unit; this receipt estimates per-file allocation and does not query or reserve D:',
  files: sized, contentBytes: sized.reduce((total, row) => total + row.bytes, 0),
  estimatedAllocatedBytes: sized.reduce((total, row) => total + row.estimatedAllocatedBytes, 0),
  limits: ['Later stat interval supplies byte lengths only; content hashes remain the earlier manifest observations.',
    'No alternate streams, filesystem metadata, directories, archive, dependencies or build output included in this estimate.',
    'Actual candidate capture must rebind exact bytes/hashes and refresh free-space before allocation.'] };
const nonDoc = report.currentVsFrozen.filter(row => !row.path.startsWith('docs/'));
const imports = text => [...new Set([...text.matchAll(/(?:from\s*|import\s*|require\s*\()\s*["']([^"']+)["']/g)].map(match => match[1]))].sort();
const sourceChanges = nonDoc.map(row => {
  const bytes = fs.readFileSync(path.join(root, row.path));
  const beforeFile = path.join(prior, 'candidate-context.json');
  const context = JSON.parse(fs.readFileSync(beforeFile));
  const previous = path.join(context.source, row.path);
  const beforeImports = fs.existsSync(previous) ? imports(fs.readFileSync(previous, 'utf8')) : [];
  const afterImports = imports(bytes.toString('utf8'));
  return { ...row, currentSha256AtInspection: hash(bytes), stillMatchesRefresh: hash(bytes) === row.afterSha256,
    classification: row.path.includes('/__tests__/') ? 'Concurrent finance test input' : 'Concurrent finance/payment product source',
    importsBefore: beforeImports, importsAfter: afterImports,
    importsAdded: afterImports.filter(name => !beforeImports.includes(name)),
    importsRemoved: beforeImports.filter(name => !afterImports.includes(name)) };
});
const privateMetadata = report.currentVsFrozen.filter(row => row.path.includes('PRIVATE_FIXTURE')).map(row => {
  const bytes = fs.readFileSync(path.join(root, row.path)), value = JSON.parse(bytes);
  assert.deepEqual(Object.keys(value).sort(), ['bytes', 'packs', 'path', 'sha256']);
  assert(Array.isArray(value.packs));
  for (const item of [value, ...value.packs]) {
    if (item !== value) assert.deepEqual(Object.keys(item).sort(), ['bytes', 'path', 'sha256']);
    assert(typeof item.path === 'string' && path.isAbsolute(item.path));
    assert(/^[a-f0-9]{64}$/.test(item.sha256));
    assert(Number.isInteger(item.bytes) && item.bytes >= 0);
  }
  return { path: row.path, sha256: hash(bytes), stillMatchesRefresh: hash(bytes) === row.afterSha256,
    classification: 'Metadata receipt naming external fixture/pack paths, byte lengths and SHA256 values; no fixture records or credentials embedded',
    keys: Object.keys(value).sort(), packCount: value.packs.length, rawReferencedPathsPublished: false,
    referencedFilesRead: false, staticPublicPath: false, artifactRequirement: 'Preserve in isolated source; verify this receipt and its external referenced fixture/pack files are absent from sealed runtime/public/static output. No external fixture file is needed for R06.' };
});
const graph = JSON.parse(fs.readFileSync(path.join(root, 'graphify-out/graph_actions.json')));
const graphNodes = (graph.nodes || []).filter(node => String(node.source_file).replaceAll('\\', '/') === 'finance/customer-settlement.actions.ts').map(({ id, community, source_location }) => ({ id, community, source_location }));
const impact = { at: new Date().toISOString(), sourceManifest: sizes.sourceManifest,
  sourceRefreshSha256: hash(fs.readFileSync(path.join(__dirname, 'SOURCE-REFRESH-r1.json'))),
  currentCount: manifest.files.length, head: manifest.head,
  deltaSummary: { versusFrozen: { modified: report.currentVsFrozen.filter(row => row.kind === 'modified').length,
    added: report.currentVsFrozen.filter(row => row.kind === 'added').length, removed: report.currentVsFrozen.filter(row => row.kind === 'removed').length },
    versusCapacity: { modified: report.currentVsCapacity.filter(row => row.kind === 'modified').length,
      added: report.currentVsCapacity.filter(row => row.kind === 'added').length, removed: report.currentVsCapacity.filter(row => row.kind === 'removed').length },
    productAndTestChanges: nonDoc.length, documentationAdditions: report.currentVsFrozen.filter(row => row.path.startsWith('docs/')).length },
  sourceChanges, allNonDocChangesStillMatch: sourceChanges.every(row => row.stillMatchesRefresh), privateMetadata,
  sourceImpact: [
    'The previous nine modified/three added files evolved into eleven modified/eighty-one added files. Thirteen changed paths are finance/payment source or tests; seventy-nine additions are close-monthly evidence documents.',
    'The new customer-settlement payment authority is imported by customer-settlement.service.ts and delegates to the existing POS electronic-tender authority. The workbench action imports settlement/read-model/schema services and existing shared RBAC/protect/module helpers.',
    'CustomerSettlementControls imports the settlement actions and existing step-up-auth action; its product importer is AROpenItemsHistoryWorkbench. These consumers share existing guards, but those R06 selected guard inputs have not changed.',
    'No direct settlement/payment imports were found in the inspected authentication/self-profile call chains. This bounded static search is not a complete transitive dependency or behavior proof.',
    'No source/package/schema/migration/configuration bytes in the selected68 changed. Full build/type/lint must include all concurrent source and tests; R06 qualification does not certify those independent finance workflows.',
    'No reference to the new close-monthly evidence directory or pg-PRIVATE_FIXTURE filename was found in actions/app/components/lib/services/config/next.config.mjs. The metadata file is under docs, not public. release-artifact.cjs packages traced standalone, static and public inputs; incidental tracing must still be checked on the actual sealed artifact.'
  ],
  unchangedCritical: selected.files.filter(row => /^(lib\/auth\.ts|lib\/security\/credential-sign-in-outcome\.ts|prisma\/schema\.prisma|package(?:-lock)?\.json|next\.config\.mjs|tsconfig\.json)$/.test(row.path) || /self-profile|SelfProfile|DashboardLanguageLink|Navbar/.test(row.path)).map(row => ({ path: row.path, sha256: row.currentSha256, matches: row.currentMatches })),
  graphDiscovery: { path: 'graphify-out/graph_actions.json', sha256: hash(fs.readFileSync(path.join(root, 'graphify-out/graph_actions.json'))), nodes: graphNodes,
    use: 'Historical discovery only; current source imports independently inspected; no graph freshness or coverage claim.' },
  executionNotes: ['Workflow check passed; 196 commands remain unclassified. No application/DB/build command was executed.',
    'First refresh invocation produced the four immutable receipts. Its exec session identifier was lost by output formatting. A second read-only invocation was launched, repeated the read pass, then failed EEXIST on the first exclusive output; no earlier receipt was overwritten. Only first-pass receipt identities are admitted here.',
    'Private metadata inspection published field shapes/classification only; no referenced private fixture/pack content was opened.',
    'Size supplement is a stat estimate; successor capture/free-space gates remain mandatory.'],
  advancement: 'Eligible for independent source-inventory/capture recipe review. No current-source behavioral qualification or retained-database resume is certified by this receipt.', qualificationPassed: false };
fs.writeFileSync(path.join(__dirname, 'SOURCE-SIZES-r1.json'), JSON.stringify(sizes, null, 2) + '\n', { flag: 'wx' });
fs.writeFileSync(path.join(__dirname, 'SOURCE-IMPACT-r1.json'), JSON.stringify(impact, null, 2) + '\n', { flag: 'wx' });
console.log(JSON.stringify({ files: sized.length, contentBytes: sizes.contentBytes, estimatedAllocatedBytes: sizes.estimatedAllocatedBytes,
  allNonDocChangesStillMatch: impact.allNonDocChangesStillMatch, privateMetadataCount: privateMetadata.length,
  receipts: ['SOURCE-SIZES-r1.json', 'SOURCE-IMPACT-r1.json'].map(name => ({ path: name, sha256: hash(fs.readFileSync(path.join(__dirname, name))) })) }));
