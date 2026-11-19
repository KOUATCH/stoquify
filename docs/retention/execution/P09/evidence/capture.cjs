const fs = require('node:fs')
const cp = require('node:child_process')
const crypto = require('node:crypto')
const path = require('node:path')
const root = process.cwd(), out = 'docs/retention/execution/P09/evidence'
const hash = p => crypto.createHash('sha256').update(fs.readFileSync(p)).digest('hex')
const git = args => cp.execFileSync('git', args, { encoding: 'utf8', maxBuffer: 32 * 1024 * 1024 })
const tracked = git(['status', '--short', '--untracked-files=no'])
const files = new Set(tracked.trimEnd().split('\n').map(s => s.slice(3).replaceAll('"', '')))
const prior = JSON.parse(fs.readFileSync('docs/retention/execution/P04/evidence/SOURCE_MANIFEST.json'))
prior.forEach(x => files.add(x.path))
for (const dir of ['docs/retention/execution/P01', 'docs/retention/execution/P04']) {
  for (const name of fs.readdirSync(dir)) if (name.endsWith('.md')) files.add(`${dir}/${name}`)
}
for (const p of ['package.json','package-lock.json','prisma/schema.prisma','services/customer/customer-export.service.ts','services/purchasing/ap-history-export.service.ts','services/accounting/close-assurance-pack.service.ts','services/inventory/inventory-history-background-export.service.ts','services/modules/module-entitlement.service.ts','services/organization/__tests__/organization-directory-export.service.test.ts']) files.add(p)
const baseline = { utc: new Date().toISOString(), head: git(['rev-parse','HEAD']).trim(), trackedStatus: tracked, files: [...files].filter(p=>fs.existsSync(p)&&fs.statSync(p).isFile()).map(p=>({path:p,sha256:hash(p)})) }
fs.writeFileSync(`${out}/BASELINE.json`,JSON.stringify(baseline,null,2)+'\n',{flag:'wx'})
fs.copyFileSync('docs/retention/execution/STATUS.md',`${out}/STATUS.md.before`,fs.constants.COPYFILE_EXCL)
fs.writeFileSync(`${out}/PREREQUISITE_DRIFT.json`,JSON.stringify(prior.map(x=>({path:x.path,before:x.sha256_raw,current:fs.existsSync(x.path)?hash(x.path):null})).filter(x=>x.before!==x.current),null,2)+'\n')
const nodes=[]
for(const file of ['graphify-out/ordered-code-graph.json','graphify-out/graph_actions.json']) {
 const g=JSON.parse(fs.readFileSync(file));
 for(const n of g.nodes||[]) if(/exportclosepack|preparecustomerexport|prepareaphistoryexport|streaminventoryhistoryexportdownload|resolveaccountantclientaccess/i.test(JSON.stringify(n))) nodes.push({file,...n})
}
fs.writeFileSync(`${out}/GRAPH_NODES.json`,JSON.stringify(nodes,null,2)+'\n')
console.log(JSON.stringify({head:baseline.head,files:baseline.files.length,drift:JSON.parse(fs.readFileSync(`${out}/PREREQUISITE_DRIFT.json`)).map(x=>x.path),graphNodes:nodes.length}))
