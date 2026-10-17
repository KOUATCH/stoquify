// Audit artifact generator. Reads current route source; writes only this report directory.
const fs = require('node:fs');
const path = require('node:path');
const crypto = require('node:crypto');
const cp = require('node:child_process');
const root = path.resolve(__dirname, '../../..');
const walk = dir => fs.readdirSync(dir, { withFileTypes: true }).flatMap(entry => entry.isDirectory() ? walk(path.join(dir, entry.name)) : [path.join(dir, entry.name)]);
const relative = file => path.relative(root, file).replaceAll('\\', '/');
const routes = walk(path.join(root, 'app')).filter(file => /[/\\]page\.tsx$/.test(file)).map(file => {
  const text = fs.readFileSync(file, 'utf8');
  const source = relative(file);
  const route = '/' + source.replace(/^app\//, '').replace(/\/page\.tsx$/, '').replace(/^page\.tsx$/, '').split('/').filter(part => !/^\(.*\)$/.test(part)).join('/');
  const segment = route.split('/dashboard')[1];
  const family = segment === undefined ? (/\(auth\)/.test(source) ? 'Authentication' : 'Public and shared documents') : (segment.split('/')[1] || 'Dashboard');
  const imports = [...text.matchAll(/from\s+["']([^"']+)["']/g)].map(match => match[1]);
  const redirects = text.split('\n').map((line, index) => ({ line: index + 1, text: line.trim() })).filter(line => /\bredirect\(/.test(line.text));
  return { route, family, source, lines: text.split('\n').length, hash: crypto.createHash('sha256').update(text).digest('hex'), components: imports.filter(name => name.startsWith('@/components/')), redirects, evidence: 'Route source scanned; component/journey inspection varies. Not a runtime or permission certification.' };
});
const counts = Object.fromEntries([...new Set(routes.map(route => route.family))].sort().map(family => [family, routes.filter(route => route.family === family).length]));
const revision = cp.execFileSync('git', ['rev-parse', 'HEAD'], { cwd: root, encoding: 'utf8' }).trim();
const status = cp.execFileSync('git', ['status', '--porcelain', '-uno'], { cwd: root, encoding: 'utf8', maxBuffer: 8 * 1024 * 1024 });
const graphs = ['graph_app.json', 'graph_components.json'].map(name => {
  const file = path.join(root, 'graphify-out', name), graph = JSON.parse(fs.readFileSync(file, 'utf8'));
  return { name, filesystemModified: fs.statSync(file).mtime.toISOString(), nodes: graph.nodes.filter(node => /EnhancedEnterpriseDashboard.tsx|Navbar.tsx|OwnerWarRoomPage\(\)|ProfessionalPOSSystem.tsx/.test(node.label)), note: 'Filesystem date is not a guarantee of graph generation date or freshness. Current source takes precedence.' };
});
fs.writeFileSync(path.join(__dirname, 'route-inventory.json'), JSON.stringify({ inspectedAt: new Date().toISOString(), revision, trackedDirtyFileCount: status.trim().split('\n').filter(Boolean).length, counts, graphs, routes }, null, 2));
fs.writeFileSync(path.join(__dirname, 'coverage.md'), '# Route coverage inventory\n\nCurrent working-copy route scan, 2026-10-12. Every row is a discovered page.tsx entry, including redirects, previews, legacy aliases, and public document routes; presence does not establish production availability. Dynamic records were not created for testing.\n\nAll roles are mapped in the main report; the browser session available was SUPER_ADMIN only. Source scanning does not establish another role\'s rendered access.\n\n| Family | Page files |\n|---|---:|\n' + Object.entries(counts).map(([family,count]) => `| ${family} | ${count} |`).join('\n') + '\n\n| Route pattern | Source evidence | Entry component(s) | Redirect evidence | Browser status |\n|---|---|---|---|---|\n' + routes.map(route => `| ${route.route} | [source](../../../${route.source}) · ${route.lines} lines | ${route.components.map(component => component.replace('@/components/', '')).join(', ') || 'Inline or local composition'} | ${route.redirects.length ? 'Present; see JSON line evidence' : 'None in page body'} | See browser-evidence.md; otherwise not exercised |`).join('\n') + '\n');
console.log(JSON.stringify({ revision, routeCount: routes.length, familyCount: Object.keys(counts).length, counts, trackedDirtyFileCount: status.trim().split('\n').filter(Boolean).length }));
