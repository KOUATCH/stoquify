// Read-only TypeScript compiler analysis of explicit production roots.
// Does not load Next configuration, environment files, application modules,
// compiler plugins, database targets, generators or package lifecycle hooks.
// noEmit + incremental:false prevents compiled output and tsbuildinfo writes.
// The only write is the adjacent evidence JSON produced below.
const fs = require('node:fs');
const path = require('node:path');
const crypto = require('node:crypto');
const root = path.resolve(__dirname, '../../../..');
const ts = require(path.join(root, 'node_modules/typescript'));
const roots = [
  'components/finance/CustomerSettlementControls.tsx',
  'components/finance/AROpenItemsHistoryWorkbench.tsx',
  'actions/finance/customer-settlement.actions.ts',
  'services/accounting/customer-settlement-workbench.service.ts',
  'hooks/useAROpenItemsHistoryWorkbench.ts',
  'components/pos/ProfessionalPOSSystem.tsx',
];
const normalize = value => path.resolve(value).toLowerCase();
const owned = new Set(roots.map(value => normalize(path.join(root, value))));
const config = ts.readConfigFile(path.join(root, 'tsconfig.json'), ts.sys.readFile);
if (config.error) throw new Error(ts.flattenDiagnosticMessageText(config.error.messageText, '\n'));
// Retain current compiler options/extends while preventing broad include globs
// from enumerating old build/runtime copies. Root files are explicit below.
const parsed = ts.parseJsonConfigFileContent({ ...config.config, files: roots, include: [], exclude: [] }, ts.sys, root, { noEmit: true, incremental: false });
if (parsed.errors.length) throw new Error(parsed.errors.map(error => ts.flattenDiagnosticMessageText(error.messageText, '\n')).join('\n'));
const options = { ...parsed.options, noEmit: true, incremental: false, tsBuildInfoFile: undefined };
const program = ts.createProgram({ rootNames: roots.map(value => path.join(root, value)), options });
const diagnostics = ts.getPreEmitDiagnostics(program);
const ownDiagnostics = [];
const globalDiagnostics = [];
const externalCounts = {};
for (const diagnostic of diagnostics) {
  const summary = { code: diagnostic.code, category: ts.DiagnosticCategory[diagnostic.category], message: ts.flattenDiagnosticMessageText(diagnostic.messageText, '\n') };
  if (!diagnostic.file) { globalDiagnostics.push(summary); continue; }
  const relative = path.relative(root, diagnostic.file.fileName).replaceAll('\\', '/');
  if (!owned.has(normalize(diagnostic.file.fileName))) { externalCounts[relative] = (externalCounts[relative] ?? 0) + 1; continue; }
  const position = diagnostic.file.getLineAndCharacterOfPosition(diagnostic.start ?? 0);
  ownDiagnostics.push({ file: relative, line: position.line + 1, column: position.character + 1, ...summary });
}
const report = {
  checkedAt: new Date().toISOString(), typescriptVersion: ts.version,
  evidenceClass: 'Focused semantic/source verification; not a whole-repository typecheck, application build, database or browser check.',
  rootNames: roots, noEmit: options.noEmit, incremental: options.incremental,
  sourceHashes: Object.fromEntries(roots.map(relative => [relative, crypto.createHash('sha256').update(fs.readFileSync(path.join(root, relative))).digest('hex')])),
  sourceFileCount: program.getSourceFiles().length,
  ownedDiagnosticCount: ownDiagnostics.length, ownedDiagnostics: ownDiagnostics,
  globalDiagnosticCount: globalDiagnostics.length, globalDiagnostics,
  externalDiagnosticCount: Object.values(externalCounts).reduce((total, count) => total + count, 0),
  externalDiagnosticFileCount: Object.keys(externalCounts).length,
  externalCounts,
};
fs.writeFileSync(path.join(__dirname, 'owned-types.result.json'), JSON.stringify(report, null, 2) + '\n');
console.log(JSON.stringify({ ...report, sourceHashes: undefined, externalCounts: undefined }, null, 2));
process.exitCode = ownDiagnostics.some(item => item.category === 'Error') || globalDiagnostics.some(item => item.category === 'Error') ? 1 : 0;
