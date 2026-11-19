// Compiler-only analysis of the four production roots; no app modules execute.
const fs = require('node:fs'), path = require('node:path'), crypto = require('node:crypto');
const root = path.resolve(__dirname, '../../../..');
const ts = require(path.join(root, 'node_modules/typescript'));
const roots = ['actions/accounting/close-assurance.actions.ts', 'services/accounting/close-evidence-acceptance-authority.service.ts',
  'services/accounting/close-assurance.service.ts', 'services/accounting/close-assurance-pack.service.ts'];
const config = ts.readConfigFile(path.join(root, 'tsconfig.json'), ts.sys.readFile);
if (config.error) throw new Error(ts.flattenDiagnosticMessageText(config.error.messageText, '\n'));
const parsed = ts.parseJsonConfigFileContent({ ...config.config, files: roots, include: [], exclude: [] }, ts.sys, root, { noEmit: true, incremental: false });
if (parsed.errors.length) throw new Error(parsed.errors.map(error => ts.flattenDiagnosticMessageText(error.messageText, '\n')).join('\n'));
const options = { ...parsed.options, noEmit: true, incremental: false, tsBuildInfoFile: undefined };
const program = ts.createProgram({ rootNames: roots.map(file => path.join(root, file)), options });
const ownNames = new Set(roots.map(file => path.resolve(root, file).toLowerCase()));
const diagnostics = ts.getPreEmitDiagnostics(program).map(item => {
  const position = item.file?.getLineAndCharacterOfPosition(item.start ?? 0);
  return { file: item.file ? path.relative(root, item.file.fileName).replaceAll('\\', '/') : null,
    owned: !!item.file && ownNames.has(path.resolve(item.file.fileName).toLowerCase()),
    line: position ? position.line + 1 : null, code: item.code, category: ts.DiagnosticCategory[item.category],
    message: ts.flattenDiagnosticMessageText(item.messageText, '\n') };
});
const ownErrors = diagnostics.filter(item => (item.owned || !item.file) && item.category === 'Error');
const result = { checkedAt: new Date().toISOString(), typescriptVersion: ts.version, rootNames: roots,
  evidenceClass: 'Focused noEmit semantic analysis; not an application build or whole-repository typecheck', noEmit: true, incremental: false,
  sourceHashes: Object.fromEntries(roots.map(file => [file, crypto.createHash('sha256').update(fs.readFileSync(path.join(root, file))).digest('hex')])),
  sourceFileCount: program.getSourceFiles().length, ownedOrGlobalErrorCount: ownErrors.length,
  externalDiagnosticCount: diagnostics.filter(item => !item.owned && item.file).length, diagnostics };
fs.writeFileSync(path.join(__dirname, 'owned-types.result.json'), JSON.stringify(result, null, 2) + '\n');
console.log(JSON.stringify({ ownedOrGlobalErrorCount: ownErrors.length, externalDiagnosticCount: result.externalDiagnosticCount, sourceFileCount: result.sourceFileCount }));
process.exitCode = ownErrors.length ? 1 : 0;
