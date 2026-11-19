// P04-R02 source/metadata inspection only. Never imports application code,
// loads environment, connects to a database, or reads image file contents.
// Writes only this inventory-review directory.
const fs = require('node:fs');
const path = require('node:path');
const crypto = require('node:crypto');
const root = path.resolve(__dirname, '../../../../..');
const ts = require(path.join(root, 'node_modules/typescript'));
const hash = value => crypto.createHash('sha256').update(value).digest('hex');
const relative = value => path.relative(root, value).replaceAll('\\', '/');
const ignored = new Set(['node_modules', '.git', 'graphify-out', '.next', 'coverage', 'generated', 'migrations']);
const roots = ['actions', 'app', 'components', 'lib', 'services', 'prisma', 'scripts', 'types', 'config', 'hooks', 'src', '_legacy-dashboard', 'tests', '__tests__', 'validations'];
const files = [];
function walk(directory) {
  if (!fs.existsSync(directory)) return;
  for (const entry of fs.readdirSync(directory, { withFileTypes: true })) {
    if (ignored.has(entry.name) || entry.name.startsWith('.env')) continue;
    const file = path.join(directory, entry.name);
    if (entry.isDirectory()) walk(file);
    else if (entry.isFile() && /\.(?:tsx?|[cm]?js|prisma)$/.test(entry.name)) files.push(file);
  }
}
roots.forEach(directory => walk(path.join(root, directory)));
['next.config.mjs', 'middleware.ts', 'package.json', '.gitignore'].forEach(file => files.push(path.join(root, file)));
const references = [], consumers = [], manifest = [];
for (const file of files.sort()) {
  const source = fs.readFileSync(file, 'utf8');
  const name = relative(file), sha256 = hash(source);
  manifest.push({ path: name, sha256 });
  source.split(/\r?\n/).forEach((text, index) => {
    if (/(?:\/uploads(?:\/|\b)|["']uploads["']|localStoragePath|savePhotoLocally|deletePhotoLocally|ensureLocalStorageDirectories)/i.test(text)) {
      references.push({ path: name, line: index + 1, text: text.trim().slice(0, 500), sha256,
        classification: /__tests__|\.test\.|\.node-test\./.test(name) ? 'test' : name.startsWith('scripts/') ? 'script' : 'current-source',
        reviewLevel: 'lexical-discovery-see-manual-traces' });
    }
  });
  if (!file.endsWith('.tsx') || /__tests__/.test(name)) continue;
  const ast = ts.createSourceFile(name, source, ts.ScriptTarget.Latest, true, ts.ScriptKind.TSX);
  function visit(node) {
    if (ts.isJsxSelfClosingElement(node) || ts.isJsxOpeningElement(node)) {
      const element = node.tagName.getText(ast);
      if (['img', 'Image', 'AvatarImage'].includes(element)) {
        const attributes = node.attributes.properties.filter(ts.isJsxAttribute);
        const src = attributes.find(a => a.name.getText(ast) === 'src');
        consumers.push({ path: name, line: ast.getLineAndCharacterOfPosition(node.getStart(ast)).line + 1,
          element, src: src?.initializer?.getText(ast) ?? null,
          unoptimizedAttribute: attributes.find(a => a.name.getText(ast) === 'unoptimized')?.getText(ast) ?? null,
          sha256, reviewLevel: 'AST-discovery-not-dataflow-qualification' });
      }
    }
    ts.forEachChild(node, visit);
  }
  visit(ast);
}
const metadata = [];
function assetMetadata(directory) {
  if (!fs.existsSync(directory)) return;
  for (const entry of fs.readdirSync(directory, { withFileTypes: true })) {
    const target = path.join(directory, entry.name);
    const stat = fs.lstatSync(target);
    metadata.push({ path: relative(target), kind: stat.isSymbolicLink() ? 'symlink-not-followed' : stat.isDirectory() ? 'directory' : 'file',
      bytes: stat.isFile() ? stat.size : null, modifiedUtc: stat.mtime.toISOString(), contentsRead: false });
    if (stat.isDirectory() && !stat.isSymbolicLink()) assetMetadata(target);
  }
}
assetMetadata(path.join(root, 'public', 'uploads'));
const common = { observedAt: new Date().toISOString(), evidenceClass: 'source-and-filesystem-metadata-only',
  boundaries: ['No application imports', 'No environment files read or loaded', 'No database or network access', 'No image contents read/rendered', 'No application changes'],
  scope: { sourceRoots: roots, rootFiles: ['next.config.mjs', 'middleware.ts', 'package.json', '.gitignore'], excludedDirectories: [...ignored],
    limitations: 'Lexical discovery and AST JSX inventory are bounded to listed source roots/extensions. No database-reference prevalence or deployed/CDN/cache state is asserted.' } };
fs.writeFileSync(path.join(__dirname, 'source-reference-inventory.json'), JSON.stringify({ ...common, fileCount: files.length, references, imageConsumerCandidates: consumers, sourceManifest: manifest }, null, 2) + '\n');
fs.writeFileSync(path.join(__dirname, 'legacy-asset-metadata.json'), JSON.stringify({ ...common, root: 'public/uploads', exists: fs.existsSync(path.join(root, 'public/uploads')), entries: metadata }, null, 2) + '\n');
const dependencies = ['node_modules/next/package.json', 'node_modules/next/dist/server/image-optimizer.js', 'node_modules/next/dist/server/lib/mock-request.js'].map(name => {
  const source = fs.readFileSync(path.join(root, name), 'utf8');
  return { path: name, sha256: hash(source), ...(name.endsWith('package.json') ? { version: JSON.parse(source).version } : {}),
    reviewLevel: 'read-installed-source-not-executed' };
});
const graphs = ['graphify-out/graph_actions.json', 'graphify-out/graph_app.json'].map(name => {
  const file = path.join(root, name), source = fs.readFileSync(file, 'utf8'), graph = JSON.parse(source);
  return { path: name, sha256: hash(source), modifiedUtc: fs.statSync(file).mtime.toISOString(), status: 'dated-discovery-only',
    nodes: (graph.nodes || []).filter(node => /^(storage_photo_upload_actions_(savephotolocally|deletephotolocally|uploadphoto)|storage_storage_config_actions_ensurelocalstoragedirectories|api_uploads_path_route_ts|path_route_get)$/.test(node.id)) };
});
fs.writeFileSync(path.join(__dirname, 'dependency-source-evidence.json'), JSON.stringify({ ...common, dependencies, graphs,
  optimizerEvidence: [{ path: dependencies[1].path, line: 714, claim: 'Cache key uses href,width,quality,mimeType, not actor identity' },
    { path: dependencies[1].path, line: 953, claim: 'Internal fetch builds request without original headers/cookies' },
    { path: dependencies[2].path, line: 424, claim: 'Mock internal request headers default to empty object' },
    { path: dependencies[1].path, line: 1137, claim: 'Optimizer response sets public cache-control' }]
}, null, 2) + '\n');
console.log(JSON.stringify({ inspectedSourceFiles: files.length, referenceHits: references.length, imageConsumerCandidates: consumers.length,
  legacyFiles: metadata.filter(x => x.kind === 'file').length, legacyDirectories: metadata.filter(x => x.kind === 'directory').length,
  legacySymlinks: metadata.filter(x => x.kind === 'symlink-not-followed').length }));
