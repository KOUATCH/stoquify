const fs = require('node:fs');
const path = require('node:path');
const ts = require('typescript');
const root = path.resolve(__dirname, '../../..');
const inventory = JSON.parse(fs.readFileSync(path.join(__dirname, 'baseline.json'), 'utf8'));
const sourcePaths = new Set(inventory.manifest.filter(row => row.category === 'application').map(row => row.file));
const config = ts.readConfigFile(path.join(root, 'tsconfig.json'), ts.sys.readFile).config;
const options = ts.parseJsonConfigFileContent(config, ts.sys, root).options;

function dependencies(file, content) {
  const source = ts.createSourceFile(file, content, ts.ScriptTarget.Latest, true);
  const result = new Set();
  function add(specifier) {
    const base = specifier.startsWith('@/') ? specifier.slice(2) : specifier.startsWith('.') ? path.posix.normalize(path.posix.join(path.posix.dirname(file), specifier)) : null;
    if (!base) return;
    const resolved = [base, ...['.ts', '.tsx', '.js', '.jsx', '/index.ts', '/index.tsx', '/index.js'].map(ext => base + ext)].find(candidate => sourcePaths.has(candidate));
    if (resolved) result.add(resolved);
  }
  function visit(node) {
    if ((ts.isImportDeclaration(node) || ts.isExportDeclaration(node)) && node.moduleSpecifier && ts.isStringLiteral(node.moduleSpecifier)) add(node.moduleSpecifier.text);
    if (ts.isCallExpression(node) && (node.expression.kind === ts.SyntaxKind.ImportKeyword || node.expression.getText(source) === 'require') && node.arguments.length && ts.isStringLiteral(node.arguments[0])) add(node.arguments[0].text);
    ts.forEachChild(node, visit);
  }
  visit(source);
  return result;
}

function hasCycle(files, edges) {
  const visiting = new Set(), visited = new Set();
  function visit(file) {
    if (visiting.has(file)) return true;
    if (visited.has(file)) return false;
    visiting.add(file);
    for (const target of edges.get(file) || []) if (files.includes(target) && visit(target)) return true;
    visiting.delete(file); visited.add(file);
    return false;
  }
  return files.some(visit);
}

const groups = inventory.cycles.map(files => {
  const emitted = new Map(), removedEdges = [], survivingEdges = [];
  for (const file of files) {
    const content = fs.readFileSync(path.join(root, file), 'utf8');
    const originalEdges = dependencies(file, content);
    const output = ts.transpileModule(content, { fileName: file, compilerOptions: { ...options, noEmit: false, declaration: false, sourceMap: false, module: ts.ModuleKind.ESNext } }).outputText;
    const emittedEdges = dependencies(file, output);
    emitted.set(file, emittedEdges);
    for (const target of originalEdges) if (files.includes(target)) {
      (emittedEdges.has(target) ? survivingEdges : removedEdges).push({ from: file, to: target });
    }
  }
  return { files, hasEmittedCycle: hasCycle(files, emitted), removedEdges, survivingEdges };
});
const result = {
  recordedAt: new Date().toISOString(),
  method: 'Classify only the eight original source-import SCCs using TypeScript transpileModule with repository options and ESNext imports. Removed edges are erased during transpilation. Surviving edges include deferred literal imports; presence does not establish eager initialization failure. No bundler execution or nonliteral dynamic-import analysis.',
  sourceGroups: groups.length,
  groupsWithEmittedCycles: groups.filter(group => group.hasEmittedCycle).length,
  groups,
};
fs.writeFileSync(path.join(__dirname, 'cycles-classified.json'), JSON.stringify(result, null, 2) + '\n');
console.log(JSON.stringify({ sourceGroups: result.sourceGroups, groupsWithEmittedCycles: result.groupsWithEmittedCycles, groups: groups.map(({ files, hasEmittedCycle }) => ({ files, hasEmittedCycle })) }, null, 2));
