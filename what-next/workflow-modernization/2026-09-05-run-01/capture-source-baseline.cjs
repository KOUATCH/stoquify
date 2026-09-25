// Discovery evidence only. Source enumeration is not a workflow review or runtime pass.
const fs = require('node:fs');
const path = require('node:path');
const crypto = require('node:crypto');
const { execFileSync } = require('node:child_process');
const root = path.resolve(__dirname, '../../..');
const ts = require(path.join(root, 'node_modules/typescript'));
const sha = value => crypto.createHash('sha256').update(value).digest('hex');
const run = (name, args) => execFileSync(name, args, { cwd: root, encoding: 'utf8', windowsHide: true }).trim();
const roots = ['app', 'actions', 'services', 'components', 'hooks', 'lib', 'config', 'prisma', 'scripts', 'tests', 'types', 'i18n', 'messages', 'utils', '.github'].filter(dir => fs.existsSync(path.join(root, dir)));
const found = run('rg', ['--files', '--hidden', ...roots]).split(/\r?\n/).filter(Boolean).map(file => file.replaceAll('\\', '/'));
const extras = ['package.json', 'package-lock.json', 'pnpm-lock.yaml', 'tsconfig.json', 'next.config.mjs', 'middleware.ts', 'jest.config.ts', 'jest.setup.ts', 'playwright.config.ts'];
const files = [...new Set([...found, ...extras.filter(file => fs.existsSync(path.join(root, file)))])].sort();
const excluded = [], sources = [];
for (const file of files) {
  if (/(?:^|\/)(?:node_modules|graphify-out|generated|\.next[^/]*)(?:\/|$)/.test(file)) { excluded.push({ file, reason: 'Generated/vendor/historical graph output; graph references inventoried separately.' }); continue; }
  if (!/\.(?:[cm]?[jt]sx?|json|ya?ml|prisma|sql|css|ps1|py)$/.test(file)) { excluded.push({ file, reason: 'Not executable source/config in this pass; referenced resources still need review.' }); continue; }
  const bytes = fs.readFileSync(path.join(root, file));
  const test = /(?:^|\/)(?:tests|__tests__|__mocks__)(?:\/|$)|\.(?:test|spec)\.[cm]?[jt]sx?$/.test(file);
  const item = { path: file, sha256: sha(bytes), bytes: bytes.length, kind: test ? 'test' : 'source', imports: [], exports: [], controls: [] };
  if (/\.[cm]?[jt]sx?$/.test(file)) {
    const source = ts.createSourceFile(file, bytes.toString('utf8'), ts.ScriptTarget.Latest, true);
    for (const statement of source.statements) {
      if (ts.isImportDeclaration(statement) && ts.isStringLiteral(statement.moduleSpecifier)) item.imports.push(statement.moduleSpecifier.text);
      if (statement.modifiers?.some(modifier => modifier.kind === ts.SyntaxKind.ExportKeyword)) {
        if (statement.name) item.exports.push({ name: statement.name.getText(source), line: source.getLineAndCharacterOfPosition(statement.getStart(source)).line + 1 });
        if (ts.isVariableStatement(statement)) for (const declaration of statement.declarationList.declarations) item.exports.push({ name: declaration.name.getText(source), line: source.getLineAndCharacterOfPosition(declaration.getStart(source)).line + 1 });
      }
    }
    if (!test) {
      const visit = node => {
        if (ts.isJsxOpeningElement(node) || ts.isJsxSelfClosingElement(node)) {
          const tag = node.tagName.getText(source);
          const attrs = node.attributes.properties.filter(ts.isJsxAttribute).map(attr => attr.name.getText(source));
          if (/(?:Button|Form|Dialog|Drawer|Table|Input|Select|Link|MenuItem|TabsTrigger|Upload|Download)$/.test(tag) || /^(?:form|button|a|input|select)$/.test(tag) || attrs.some(attr => /^(?:onClick|onSubmit|action|href)$/.test(attr))) item.controls.push({ tag, line: source.getLineAndCharacterOfPosition(node.getStart(source)).line + 1, attributes: attrs });
        }
        ts.forEachChild(node, visit);
      };
      visit(source);
    }
  }
  if (!test && /^app\/(?:.+\/)?page\.[jt]sx?$/.test(file)) item.entryKind = 'page';
  if (!test && /^app\/(?:.+\/)?route\.[jt]sx?$/.test(file)) item.entryKind = 'route-handler';
  if (!test && /^actions\//.test(file)) item.entryKind = 'action-source';
  if (!test && /(?:worker|webhook|scheduler|outbox|cron|reconciler)/i.test(file)) item.backgroundCandidate = true;
  sources.push(item);
}
const graphs = ['app', 'actions', 'components', 'hooks', 'types'].map(kind => {
  const file = `graphify-out/graph_${kind}.json`, bytes = fs.readFileSync(path.join(root, file));
  const graph = JSON.parse(bytes), nodes = graph.nodes || [], links = graph.links || graph.edges || [];
  return { path: file, sha256: sha(bytes), nodeCount: nodes.length, edgeCount: links.length, sampleNodes: nodes.slice(0, 2), evidenceMeaning: 'Historical hints; verify relationships against current source.' };
});
const summary = { sourceFiles: sources.length, tests: sources.filter(item => item.kind === 'test').length, pages: sources.filter(item => item.entryKind === 'page').length, routeHandlers: sources.filter(item => item.entryKind === 'route-handler').length, actionSources: sources.filter(item => item.entryKind === 'action-source').length, backgroundCandidates: sources.filter(item => item.backgroundCandidate).length, uiControlCandidates: sources.reduce((total, item) => total + item.controls.length, 0), excludedFiles: excluded.length, workflowsVerified: 0, workflowDenominator: null };
const result = { recordedAt: new Date().toISOString(), branch: run('git', ['branch', '--show-current']), commit: run('git', ['rev-parse', 'HEAD']), workingTree: run('git', ['status', '--porcelain', '--untracked-files=normal']).split(/\r?\n/).filter(Boolean), task: 'All existing workflows, including incomplete, secondary, exceptional and background paths.', discoveryComplete: false, summary, exclusions: excluded, graphs, sources };
const evidence = path.join(__dirname, 'evidence'); fs.mkdirSync(evidence, { recursive: true });
fs.writeFileSync(path.join(evidence, 'source-baseline-v160.json'), JSON.stringify(result, null, 2) + '\n', { flag: 'wx' });
console.log(JSON.stringify({ recordedAt: result.recordedAt, ...summary, output: 'evidence/source-baseline-v160.json' }));
