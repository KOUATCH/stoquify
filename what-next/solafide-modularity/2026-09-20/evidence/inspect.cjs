const fs = require('fs');
const path = require('path');
const crypto = require('crypto');
const root = process.cwd();
const out = __dirname;
const graphResults = [];
for (const name of ['components', 'actions', 'app', 'hooks', 'types']) {
  const file = `graphify-out/graph_${name}.json`;
  const g = JSON.parse(fs.readFileSync(file, 'utf8'));
  const nodes = g.nodes || [];
  const links = g.links || g.edges || [];
  const selected = nodes.filter(n => /module|entitlement|subscription|billing/i.test(JSON.stringify(n)));
  graphResults.push({file, keys:Object.keys(g), nodeCount:nodes.length, edgeCount:links.length,
    matchedCount:selected.length, nodes:selected.slice(0, 18), metadata:g.metadata || g.graph || null});
}
fs.writeFileSync(path.join(out, 'graph-extracts.json'), JSON.stringify(graphResults, null, 2));
function walk(dir) { return fs.readdirSync(dir,{withFileTypes:true}).flatMap(e => e.isDirectory() ? walk(path.join(dir,e.name)) : [path.join(dir,e.name)]); }
const files = ['services/modules','actions/modules','components/modules','lib/modules'].flatMap(walk)
 .concat(['services/_shared/protect.ts','lib/security/server-authz.ts','lib/security/rbac.ts','config/sidebar.ts','prisma/schema.prisma','package.json','jest.config.ts']);
const hashes = files.map(file => ({file:file.replaceAll('\\','/'),sha256:crypto.createHash('sha256').update(fs.readFileSync(file)).digest('hex'),bytes:fs.statSync(file).size}));
fs.writeFileSync(path.join(out,'source-hashes.json'), JSON.stringify(hashes,null,2));
console.log(JSON.stringify(graphResults.map(g => ({file:g.file,nodes:g.nodeCount,edges:g.edgeCount,matches:g.matchedCount,sample:g.nodes.slice(0,3)})),null,2));
console.log(`Hashed ${hashes.length} inspected-boundary files`);
