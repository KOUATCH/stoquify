const fs = require('node:fs');
const path = require('node:path');
const crypto = require('node:crypto');
const {execFileSync} = require('node:child_process');
const dir = __dirname;
if (fs.existsSync(path.join(dir, 'BASELINE.json'))) throw new Error('Baseline already exists');
const status = execFileSync('git', ['status','--short','--untracked-files=all'], {encoding:'utf8',maxBuffer:32e6});
fs.writeFileSync(path.join(dir,'WORKTREE_STATUS.txt'),status);
const roots = ['services/onboarding','actions/onboarding','components/onboarding','config/master-data-onboarding.ts','app/[locale]/(dashboard)/dashboard/settings/data-onboarding','docs/retention/execution/P03','docs/retention/execution/P04','docs/retention/execution/STATUS.md','prisma/schema.prisma','package.json','docs/ecc','design-system/stoquify','services/inventory/inventory-stock-event.service.ts'];
const files={};
function walk(p){if(!fs.existsSync(p))return;if(fs.statSync(p).isDirectory()){for(const n of fs.readdirSync(p))walk(p+'/'+n);}else{files[p]=crypto.createHash('sha256').update(fs.readFileSync(p)).digest('hex');}}
roots.forEach(walk);
for(const p of ['services/onboarding/master-data-import.service.ts','components/onboarding/MasterDataOnboardingWorkbench.tsx','docs/retention/execution/STATUS.md']) fs.writeFileSync(path.join(dir,path.basename(p)+'.before'),fs.readFileSync(p));
const result={at:new Date().toISOString(),head:execFileSync('git',['rev-parse','HEAD'],{encoding:'utf8'}).trim(),statusEntries:status.trim().split('\n').length,files};
fs.writeFileSync(path.join(dir,'BASELINE.json'),JSON.stringify(result,null,2));
console.log(JSON.stringify({head:result.head,statusEntries:result.statusEntries,files:Object.keys(files).length}));
