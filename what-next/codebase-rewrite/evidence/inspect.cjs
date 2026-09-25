const fs = require('node:fs');
const path = require('node:path');
const crypto = require('node:crypto');
const { execFileSync } = require('node:child_process');
const ts = require('typescript');
const root = path.resolve(__dirname, '../../..');
process.chdir(root);
const label = process.argv[2] || 'baseline';
if (!/^[a-z-]+$/.test(label)) throw new Error('Invalid evidence label');
const roots = new Set(['app', 'actions', 'services', 'components', 'hooks', 'lib', 'config', 'types', 'validations', 'i18n', 'src']);
const git = (...args) => execFileSync('git', ['-c', 'core.excludesFile=', ...args], { encoding: 'utf8', maxBuffer: 32 * 1024 * 1024 });
const paths = [...new Set(git('ls-files', '-c', '-o', '--exclude-standard', '-z').split('\0').filter(Boolean))].sort();
const hash = value => crypto.createHash('sha256').update(value).digest('hex');
const manifest = [], complexity = [], unresolved = [];
const duplicates = new Map(), dependencies = new Map(), summaries = {};
const config = ts.readConfigFile('tsconfig.json', ts.sys.readFile).config;
const parsed = ts.parseJsonConfigFileContent(config, ts.sys, root);
const checked = new Set(parsed.fileNames.map(file => path.relative(root, file).replaceAll('\\', '/')));
const sourcePaths = new Set(paths.filter(file => roots.has(file.split('/')[0]) && /\.[cm]?[jt]sx?$/.test(file)));
function resolve(owner, specifier) {
  const base = specifier.startsWith('@/') ? specifier.slice(2) : specifier.startsWith('.') ? path.posix.normalize(path.posix.join(path.posix.dirname(owner), specifier)) : null;
  if (!base) return null;
  return [base, ...['.ts', '.tsx', '.js', '.jsx', '/index.ts', '/index.tsx', '/index.js'].map(ext => base + ext)].find(file => sourcePaths.has(file));
}
const printer = ts.createPrinter({ removeComments: true });
for (const file of paths) {
  if (!fs.existsSync(file) || !fs.statSync(file).isFile()) continue;
  const top = file.split('/')[0], application = sourcePaths.has(file);
  const test = /(^|\/)(__tests__|tests|playwright)(\/|$)|\.(test|spec)\.[jt]sx?$/.test(file);
  let category = application ? 'application' : null;
  if (test && /\.[cm]?[jt]sx?$/.test(file)) category = 'tests';
  else if (/^prisma\/migrations\//.test(file)) category = 'migrations';
  else if (top === 'scripts' && /\.[cm]?[jt]sx?$/.test(file)) category = 'tooling';
  else if (top === '_legacy-dashboard') category = 'legacy-root';
  else if (/^(docs|what-next|innovation)\//.test(file) && /\.md$/.test(file)) category = 'documentation';
  else if (/\.prisma$/.test(file)) category = 'schema';
  if (category === 'tests' && /^(docs|what-next)\//.test(file)) category = 'reference-tests';
  if (category === 'schema' && file !== 'prisma/schema.prisma') category = 'reference-schema';
  if (!category || file.startsWith('what-next/codebase-rewrite/')) continue;
  const content = fs.readFileSync(file, 'utf8');
  const lines = content ? content.split(/\r?\n/).length - (content.endsWith('\n') ? 1 : 0) : 0;
  const row = { file, category, lines, bytes: Buffer.byteLength(content), sha256: hash(content) };
  if (application) row.typecheckRoot = checked.has(file);
  manifest.push(row);
  const summary = summaries[category] ||= { files: 0, lines: 0, bytes: 0 };
  summary.files++; summary.lines += lines; summary.bytes += row.bytes;
  if (!application || test) continue;
  const source = ts.createSourceFile(file, content, ts.ScriptTarget.Latest, true);
  const edges = new Set();
  const visit = node => {
    if ((ts.isImportDeclaration(node) || ts.isExportDeclaration(node)) && node.moduleSpecifier && ts.isStringLiteral(node.moduleSpecifier)) {
      const specifier = node.moduleSpecifier.text, target = resolve(file, specifier);
      if (target) edges.add(target);
      else if (specifier.startsWith('@/') || specifier.startsWith('.')) unresolved.push({ file, specifier });
    }
    if (ts.isCallExpression(node) && (node.expression.kind === ts.SyntaxKind.ImportKeyword || node.expression.getText(source) === 'require') && node.arguments.length && ts.isStringLiteral(node.arguments[0])) {
      const target = resolve(file, node.arguments[0].text);
      if (target) edges.add(target);
    }
    if ((ts.isFunctionDeclaration(node) || ts.isArrowFunction(node) || ts.isMethodDeclaration(node) || ts.isFunctionExpression(node)) && node.body) {
      const start = source.getLineAndCharacterOfPosition(node.getStart(source)).line + 1;
      const length = source.getLineAndCharacterOfPosition(node.end).line + 2 - start;
      const name = node.name?.getText(source) || (ts.isVariableDeclaration(node.parent) ? node.parent.name.getText(source) : '<anonymous>');
      let decisions = 1;
      const count = child => {
        if (child !== node && (ts.isFunctionDeclaration(child) || ts.isArrowFunction(child) || ts.isFunctionExpression(child))) return;
        if (ts.isIfStatement(child) || ts.isConditionalExpression(child) || ts.isForStatement(child) || ts.isForOfStatement(child) || ts.isForInStatement(child) || ts.isWhileStatement(child) || ts.isDoStatement(child) || ts.isCaseClause(child) || ts.isCatchClause(child) || (ts.isBinaryExpression(child) && [ts.SyntaxKind.AmpersandAmpersandToken, ts.SyntaxKind.BarBarToken, ts.SyntaxKind.QuestionQuestionToken].includes(child.operatorToken.kind))) decisions++;
        ts.forEachChild(child, count);
      };
      count(node);
      complexity.push({ file, name, start, lines: length, decisionCount: decisions });
      if (length >= 12) {
        const key = hash(printer.printNode(ts.EmitHint.Unspecified, node.body, source));
        const group = duplicates.get(key) || [];
        group.push({ file, name, start, lines: length }); duplicates.set(key, group);
      }
    }
    ts.forEachChild(node, visit);
  };
  visit(source); dependencies.set(file, [...edges]);
}
const indices = new Map(), low = new Map(), stack = [], active = new Set(), cycles = [];
let index = 0;
function connect(file) {
  indices.set(file, index); low.set(file, index++); stack.push(file); active.add(file);
  for (const target of dependencies.get(file) || []) {
    if (!indices.has(target)) { connect(target); low.set(file, Math.min(low.get(file), low.get(target))); }
    else if (active.has(target)) low.set(file, Math.min(low.get(file), indices.get(target)));
  }
  if (low.get(file) === indices.get(file)) {
    const group = []; let member;
    do { member = stack.pop(); active.delete(member); group.push(member); } while (member !== file);
    if (group.length > 1) cycles.push(group.sort());
  }
}
for (const file of dependencies.keys()) if (!indices.has(file)) connect(file);
const p = JSON.parse(fs.readFileSync('package.json', 'utf8'));
const result = {
  recordedAt: new Date().toISOString(), head: git('rev-parse', 'HEAD').trim(), node: process.version,
  measurement: 'Git tracked plus nonignored untracked files; physical lines including blank/comment lines; tests separated. Generated build/vendor/ignored files excluded. Import cycles include type imports; no nonliteral dynamic resolution. Decision count is a syntax-based complexity proxy.',
  summaries, productionDependencies: Object.keys(p.dependencies).length,
  applicationTypecheckRoots: manifest.filter(row => row.category === 'application' && row.typecheckRoot).length,
  applicationExcludedRoots: manifest.filter(row => row.category === 'application' && !row.typecheckRoot).length,
  largest: manifest.filter(row => row.category === 'application').sort((a,b) => b.lines-a.lines).slice(0,30),
  duplicates: [...duplicates.values()].filter(group => group.length > 1).sort((a,b) => b.length*b[0].lines-a.length*a[0].lines),
  complexity: complexity.sort((a,b) => b.decisionCount-a.decisionCount).slice(0,80),
  cycles, unresolvedImports: unresolved, manifest,
};
fs.writeFileSync(path.join(__dirname, `${label}.json`), JSON.stringify(result, null, 2) + '\n');
if (label === 'baseline') fs.writeFileSync(path.join(__dirname, 'git-status-before.txt'), git('status', '--short', '-uall', '--ignore-submodules'));
console.log(JSON.stringify({ summaries, productionDependencies: result.productionDependencies, excluded: result.applicationExcludedRoots, cycles: cycles.length, duplicateGroups: result.duplicates.length, largest: result.largest.slice(0, 10), duplicates: result.duplicates.slice(0, 10) }, null, 2));
