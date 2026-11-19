// P11 documentation evidence only: reads source/git; writes only this evidence directory.
const fs = require('node:fs');
const path = require('node:path');
const crypto = require('node:crypto');
const cp = require('node:child_process');
const root = path.resolve(__dirname, '../../../../..');
process.chdir(root);
const hash = p => fs.existsSync(p) && fs.statSync(p).isFile() ? crypto.createHash('sha256').update(fs.readFileSync(p)).digest('hex') : null;
const git = args => cp.execFileSync('git', args, { encoding: 'utf8', maxBuffer: 32 * 1024 * 1024 });
const write = (name, obj) => fs.writeFileSync(path.join(__dirname, name), JSON.stringify(obj, null, 2) + '\n', {flag:'wx'});
const historical = ['P01/evidence/SOURCE_MANIFEST.json','P01/evidence/SUPPLEMENTARY_SOURCE_MANIFEST.json','P03/evidence/SOURCE_MANIFEST.json'];
const prerequisites = historical.map(file => ({file, entries: JSON.parse(fs.readFileSync('docs/retention/execution/' + file)).map(e => ({path:e.path, expected:e.sha256_raw || e.sha256, actual:hash(e.path), matches:hash(e.path)===(e.sha256_raw || e.sha256)}))}));
const tracked = git(['diff','HEAD','--name-only','-z']).split('\0').filter(Boolean);
const reviewed=JSON.parse(fs.readFileSync(path.join(__dirname,'SOURCE_REVIEW.json'))).files.map(e=>e.path);
const paths = new Set([...tracked, ...reviewed, ...prerequisites.flatMap(p=>p.entries.map(e=>e.path))]);
for (const folder of ['docs/retention/execution/P01','docs/retention/execution/P03']) {
  const walk = dir => { for(const d of fs.readdirSync(dir,{withFileTypes:true})) { const p=dir+'/'+d.name; if(d.isDirectory()) walk(p); else paths.add(p); } }; walk(folder);
}
write('BASELINE.json',{at:new Date().toISOString(),head:git(['rev-parse','HEAD']).trim(),trackedStatus:git(['status','--short','--untracked-files=no']),untrackedPaths:git(['ls-files','--others','--exclude-standard','-z']).split('\0').filter(Boolean),fingerprints:[...paths].sort().map(p=>({path:p,sha256:hash(p)}))});
write('PREREQUISITES.json',prerequisites);
fs.writeFileSync(path.join(__dirname,'INITIAL_STATUS.md'),fs.readFileSync('docs/retention/execution/STATUS.md'),{flag:'wx'});
console.log(JSON.stringify({tracked:tracked.length,prerequisites:prerequisites.map(p=>({file:p.file,count:p.entries.length,drift:p.entries.filter(e=>!e.matches).map(e=>e.path)}))},null,2));
