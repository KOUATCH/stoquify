// Read-only source inventory; writes only this audit's evidence artifacts.
const fs = require('node:fs');
const path = require('node:path');
const crypto = require('node:crypto');
const root = process.cwd();
const out = path.join(root, 'what-next/ui-use-case-gap-audit');
function walk(dir) {
  return fs.readdirSync(dir, {withFileTypes:true}).flatMap(e => {
    const f = path.join(dir,e.name);
    return e.isDirectory() ? walk(f) : [f];
  });
}
const pages = walk(path.join(root,'app')).filter(f => /[\\/]page\.tsx$/.test(f));
const rows = pages.map(f => {
  const source = fs.readFileSync(f,'utf8');
  const file = path.relative(root,f).replaceAll('\\','/');
  const route = '/' + file.split('/').slice(1,-1).filter(s=>!s.startsWith('(')).join('/');
  const imports = [...source.matchAll(/from\s+["']([^"']+)["']/g)].map(m=>m[1]);
  return {route,file,lines:source.split('\n').length,sha256:crypto.createHash('sha256').update(source).digest('hex'),imports,sourceStatus:'Entry source scanned; follow-up depth is recorded in report',runtimeStatus:route.includes('/dashboard')?'Inaccessible in current browser session; unauthenticated': 'Unverified unless listed in report browser log'};
});
fs.writeFileSync(path.join(out,'route-inventory.json'),JSON.stringify({date:'2026-10-04',count:rows.length,warning:'Static inventory is not end-to-end verification',pages:rows},null,2));
const lines=['# UI route coverage inventory','', 'Date: 2026-10-04. Every page entry was read for imports and surface ownership. This is a static scan, not a deep review of every component or a successful runtime test. See the main report for reviewed workflows and browser results.','', '| Route | Source entry | Coverage |','|---|---|---|'];
for(const r of rows) lines.push(`| \`${r.route}\` | [page source](<${root.replaceAll('\\','/')}/${r.file}:1>) | Source entry scanned; ${r.runtimeStatus} |`);
fs.writeFileSync(path.join(out,'route-coverage.md'),lines.join('\n')+'\n');
console.log(JSON.stringify({pages:rows.length,dashboardPages:rows.filter(r=>r.route.includes('/dashboard')).length,outputs:['route-inventory.json','route-coverage.md']}));
