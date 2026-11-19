// Capture source before edits; copy reviewed runners into this owned run only.
const fs=require('node:fs'),path=require('node:path'),crypto=require('node:crypto'),cp=require('node:child_process')
const root=path.resolve(__dirname,'../../../..');process.chdir(root)
const hash=p=>fs.existsSync(p)&&fs.statSync(p).isFile()?crypto.createHash('sha256').update(fs.readFileSync(p)).digest('hex'):null
const git=args=>cp.execFileSync('git',args,{encoding:'utf8',maxBuffer:32*1024*1024})
const prior=JSON.parse(fs.readFileSync('docs/retention/execution/P12/evidence/BASELINE.json'))
const paths=new Set(prior.files.map(e=>e.path))
for(const p of git(['diff','HEAD','--name-only','-z']).split('\0').filter(Boolean))paths.add(p)
for(const p of cp.execFileSync('rg',['--files','services/analytics','services/pos','actions/pos','hooks/posHooks','lib/pos','lib/security','components/pos','services/modules','docs/retention/execution/P06-operator-2026-10-17'],{encoding:'utf8',maxBuffer:16*1024*1024}).split(/\r?\n/).filter(Boolean))paths.add(p.replaceAll('\\','/'))
for(const p of ['prisma/db.ts','lib/auth.ts','scripts/dev-app-safe.js','next.config.mjs','jest.setup.ts','jest.payroll-trust-spine.config.cjs','node_modules/.prisma/client/schema.prisma','node_modules/.prisma/client/index.d.ts','services/analytics/__tests__/retention-outcomes.postgres.test.ts'])paths.add(p)
fs.writeFileSync(path.join(__dirname,'BASELINE.json'),JSON.stringify({at:new Date().toISOString(),head:git(['rev-parse','HEAD']).trim(),status:git(['status','--short','--untracked-files=no']),untracked:git(['ls-files','--others','--exclude-standard','-z']).split('\0').filter(Boolean),files:[...paths].sort().map(p=>({path:p,sha256:hash(p)}))},null,2),{flag:'wx'})
fs.copyFileSync('docs/retention/execution/STATUS.md',path.join(__dirname,'INITIAL_STATUS.md'),fs.constants.COPYFILE_EXCL)
for(const file of ['database.cjs','application.cjs','jest.database.cjs','browser-operator.cjs','browser-server-close.cjs','browser-read-states.cjs','check-cleanup.cjs']){
 let text=fs.readFileSync('docs/retention/execution/P06-operator-2026-10-17/'+file,'utf8').replaceAll('retention-p06-operator','retention-p02-p06-refresh').replaceAll('20261017','20261018').replaceAll('3187','3192')
 fs.writeFileSync(path.join(__dirname,file),text,{flag:'wx'})
}
let workflow=fs.readFileSync('docs/retention/execution/P12/evidence/workflow.cjs','utf8').replaceAll('../../../../..','../../../..')
fs.writeFileSync(path.join(__dirname,'workflow.cjs'),workflow,{flag:'wx'})
console.log('Captured baseline and copied seven reviewed runners; no application/database execution')
