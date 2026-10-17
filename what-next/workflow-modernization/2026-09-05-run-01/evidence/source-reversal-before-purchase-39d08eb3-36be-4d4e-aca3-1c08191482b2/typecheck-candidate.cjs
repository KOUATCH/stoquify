// Virtual TypeScript overlay: application files remain untouched; no emission or database access.
const fs = require('node:fs'), path = require('node:path'), crypto = require('node:crypto'), ts = require('typescript');
const root = process.cwd(), directory = __dirname, candidateDir = path.join(directory, 'candidate');
const sha = value => crypto.createHash('sha256').update(value).digest('hex');
const normalize = file => path.resolve(file).replaceAll('\\', '/').toLowerCase();
const manifest = JSON.parse(fs.readFileSync(path.join(candidateDir, 'manifest.json'), 'utf8'));
const files = manifest.files.filter(row => row.file.endsWith('.ts')).map(row => ({
  path: row.file.replaceAll('__', '/'), candidate: path.join(candidateDir, row.file), sha256: row.sha256,
}));
files.push(...JSON.parse(fs.readFileSync(path.join(candidateDir, 'test-manifest.json'), 'utf8')));
const actionManifest = path.join(directory, '..', 'source-reversal-before-actions-86596587-b770-4d20-b03f-7d6f96f53984', 'deferred-action-candidates.json');
for (const row of JSON.parse(fs.readFileSync(actionManifest, 'utf8'))) {
  files.push({ path: row.path, candidate: path.resolve(root, row.candidate), sha256: row.candidateSha256 });
}
const overlay = new Map(files.map(row => {
  const bytes = fs.readFileSync(row.candidate); if (sha(bytes) !== row.sha256) throw Error('Candidate manifest changed: ' + row.path);
  return [normalize(path.join(root, row.path)), bytes.toString('utf8')];
}));
const productionBefore = Object.fromEntries(files.map(row => [row.path, sha(fs.readFileSync(path.join(root, row.path)))]));
const shared = ['services/accounting/journal-reversal-order.service.ts', 'services/accounting/journal-close-invalidation.service.ts', 'services/inventory/inventory-close-invalidation.service.ts'];
const sharedBefore = Object.fromEntries(shared.map(file => [file, sha(fs.readFileSync(path.join(root, file)))]));
const configFile = ts.readConfigFile(path.join(root, 'tsconfig.json'), ts.sys.readFile);
if (configFile.error) throw Error(ts.flattenDiagnosticMessageText(configFile.error.messageText, '\n'));
const config = ts.parseJsonConfigFileContent(configFile.config, ts.sys, root);
const options = { ...config.options, noEmit: true, incremental: false, composite: false };
delete options.tsBuildInfoFile;
const host = ts.createCompilerHost(options), originalRead = host.readFile, originalGet = host.getSourceFile;
host.readFile = file => overlay.get(normalize(file)) ?? originalRead(file);
host.getSourceFile = (file, languageVersion, onError, shouldCreateNewSourceFile) => {
  const source = overlay.get(normalize(file));
  return source === undefined ? originalGet(file, languageVersion, onError, shouldCreateNewSourceFile) : ts.createSourceFile(file, source, languageVersion, true);
};
host.writeFile = () => { throw Error('Candidate typecheck must not emit'); };
const startedAt = new Date().toISOString();
const program = ts.createProgram([...new Set([...config.fileNames, ...files.map(row => path.join(root, row.path))])], options, host);
const diagnostics = ts.getPreEmitDiagnostics(program).map(item => ({
  path: item.file ? path.relative(root, item.file.fileName).replaceAll('\\', '/') : null,
  ...(item.file && typeof item.start === 'number' ? { line: item.file.getLineAndCharacterOfPosition(item.start).line + 1 } : {}),
  code: item.code, category: ts.DiagnosticCategory[item.category], message: ts.flattenDiagnosticMessageText(item.messageText, '\n'),
}));
const productionAfter = Object.fromEntries(files.map(row => [row.path, sha(fs.readFileSync(path.join(root, row.path)))]));
const sharedAfter = Object.fromEntries(shared.map(file => [file, sha(fs.readFileSync(path.join(root, file)))]));
const unchanged = JSON.stringify(productionBefore) === JSON.stringify(productionAfter) && JSON.stringify(sharedBefore) === JSON.stringify(sharedAfter);
const report = { kind: 'VIRTUAL_CANDIDATE_TYPECHECK_NO_EMIT', startedAt, completedAt: new Date().toISOString(), files, productionBefore, productionAfter, sharedBefore, sharedAfter, unchanged, diagnostics,
  passed: unchanged && diagnostics.every(row => row.category !== 'Error') };
const output = path.join(directory, 'candidate-typecheck-' + crypto.randomUUID() + '.json');
fs.writeFileSync(output, JSON.stringify(report, null, 2) + '\n', { flag: 'wx' });
console.log(JSON.stringify({ output, passed: report.passed, unchanged, diagnostics }));
if (!report.passed) process.exitCode = 1;
