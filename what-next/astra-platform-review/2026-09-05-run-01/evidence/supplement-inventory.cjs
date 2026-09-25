const fs = require('node:fs');
const path = require('node:path');
const crypto = require('node:crypto');
const root = process.cwd();
const out = path.dirname(__dirname);
const now = new Date().toISOString();
const coverage = JSON.parse(fs.readFileSync(path.join(out,'coverage.json'),'utf8'));
const known = new Set(coverage.files.map(f=>f.path));
const roots = ['app','actions','services','lib','components','hooks','config','types','prisma','scripts','tests','messages','.github','infra','infrastructure','docker','public','i18n','validations','__tests__'].filter(p=>fs.existsSync(p));
const listed=[];
function walk(dir){for(const item of fs.readdirSync(dir,{withFileTypes:true})){const p=dir+'/'+item.name;if(item.isDirectory()){if(!['generated','graphify-out','vendor','node_modules','dist','build','coverage','uploads','.auth'].includes(item.name))walk(p);}else if(item.isFile())listed.push(p);}}
for(const dir of roots)walk(dir);
const extensions = /\.(?:[cm]?js|jsx|tsx?|json|prisma|sql|ya?ml|toml|css|scss|sh|ps1)$/i;
const additions = [];
const excluded = [];
for(const p of listed){
 if(known.has(p))continue;
 if(!extensions.test(p)||/(?:^|\/)(?:generated|vendor|node_modules|dist|build|coverage|uploads|\.auth)(?:\/|$)/.test(p)||/(?:^|\/)\.env/.test(p)||/(?:credential|secret|password).*\.json$/i.test(p)&&!p.startsWith('scripts/')){
  excluded.push({path:p,reason:'Non-code asset, generated/vendor/runtime data, or potentially sensitive local configuration; contents not read.'});continue;
 }
 const bytes=fs.readFileSync(p);
 const sha256=crypto.createHash('sha256').update(bytes).digest('hex');
 coverage.files.push({path:p,area:p.split('/')[0],domain:p.split('/')[0],bytes:bytes.length,lines:bytes.toString().split(/\r?\n/).length,isTest:/(?:__tests__|tests\/|\.(?:test|spec)\.)/.test(p),sha256,depth:{inventoried:true,automaticallyChecked:false,manuallyReviewed:false,behaviorTested:false},checks:['late inventory and fingerprint; not included in original pattern triage'],discoveredAt:now,baselineFingerprintUnavailable:true});
 additions.push(p);known.add(p);
}
coverage.initialFileCount ??= coverage.fileCount;
coverage.inventorySupplements ??= [];
if(additions.length)coverage.inventorySupplements.push({recordedAt:now,reason:'Final completeness check adds missing roots and ignored first-party source; original baseline is retained.',files:additions});
coverage.files.sort((a,b)=>a.path.localeCompare(b.path));
coverage.fileCount=coverage.files.length;
coverage.excluded=coverage.excluded.filter(f=>!known.has(f.path));
coverage.supplementalExclusions=excluded;
coverage.excludedRootReasons={'src':'Only release-protocol-templates.md; documentation, not application code.','_legacy-dashboard':'Two archived legacy dashboard column files, explicitly excluded by tsconfig; retained as history.','skill-drafts/skills/.codex-skill-drafts/.codex-skill-staging':'Assistant skill packages and draft tooling, not deployed application source.','playwright':'Private browser session state, no first-party source found.','projects':'Historical project material, no matching first-party executable source found.','attack-stage-2/attack-stage-3/security-scan-stage':'Prior security evidence, no matching first-party executable source found.'};
fs.writeFileSync(path.join(out,'coverage.json'),JSON.stringify(coverage,null,2)+'\n');
fs.writeFileSync(path.join(__dirname,'inventory-supplement.json'),JSON.stringify({recordedAt:now,roots,additions,excludedCount:excluded.length,total:coverage.fileCount},null,2)+'\n');
console.log(JSON.stringify({added:additions.length,files:additions,total:coverage.fileCount},null,2));
