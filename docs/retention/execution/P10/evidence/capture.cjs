const fs=require('node:fs'),cp=require('node:child_process'),crypto=require('node:crypto')
const out='docs/retention/execution/P10/evidence'
const hash=p=>crypto.createHash('sha256').update(fs.readFileSync(p)).digest('hex')
const git=args=>cp.execFileSync('git',args,{encoding:'utf8',maxBuffer:32*1024*1024})
const read=p=>JSON.parse(fs.readFileSync(p,'utf8'))
const status=git(['status','--short','--untracked-files=no'])
const paths=new Set(status.trimEnd().split('\n').map(l=>l.slice(3).replaceAll('"','')))
const p04=read('docs/retention/execution/P04/evidence/SOURCE_MANIFEST.json')
const p09=read('docs/retention/execution/P09/evidence/MANIFEST.json').files
for(const f of [...p04,...p09])paths.add(f.path)
const sources=['services/modules/module-composition.service.ts','services/modules/module-stop-policy.service.ts','services/modules/module-entitlement.service.ts','services/modules/module-admission.service.ts','services/modules/module-reconciliation-obligations.service.ts','services/modules/module-operational-dependencies.ts','services/modules/module-catalog.service.ts','services/modules/module-control-contracts.ts','services/assurance/assurance-incident.service.ts','actions/assurance/workflow-assurance-incident.actions.ts','services/modules/__tests__/module-stop-policy.service.test.ts','services/modules/__tests__/module-retention-access.test.ts','services/accounting/__tests__/accountant-access-retention-boundary.test.ts','lib/security/__tests__/rbac.test.ts','jest.setup.ts','package.json','package-lock.json','prisma/schema.prisma','docs/ecc/WORKFLOW.md','docs/ecc/test-lanes.md']
sources.forEach(p=>paths.add(p))
for(const dir of ['P01','P04','P09'])for(const n of fs.readdirSync(`docs/retention/execution/${dir}`))if(n.endsWith('.md'))paths.add(`docs/retention/execution/${dir}/${n}`)
const baseline={utc:new Date().toISOString(),head:git(['rev-parse','HEAD']).trim(),trackedStatus:status,files:[...paths].filter(p=>fs.existsSync(p)&&fs.statSync(p).isFile()).map(p=>({path:p,sha256:hash(p)}))}
fs.writeFileSync(`${out}/BASELINE.json`,JSON.stringify(baseline,null,2)+'\n',{flag:'wx'})
fs.copyFileSync('docs/retention/execution/STATUS.md',`${out}/STATUS.md.before`,fs.constants.COPYFILE_EXCL)
const compare=rows=>rows.map(f=>({path:f.path,expected:f.sha256_raw||f.sha256,current:fs.existsSync(f.path)?hash(f.path):null})).filter(f=>f.expected!==f.current)
const p01=[...read('docs/retention/execution/P01/evidence/SOURCE_MANIFEST.json'),...read('docs/retention/execution/P01/evidence/SUPPLEMENTARY_SOURCE_MANIFEST.json')]
const prior={p01:{checked:p01.length,drift:compare(p01)},p04:{checked:p04.length,drift:compare(p04)},p09:{checked:p09.length,drift:compare(p09)}}
fs.writeFileSync(`${out}/PREREQUISITES.json`,JSON.stringify(prior,null,2)+'\n')
const graph=read('graphify-out/ordered-code-graph.json')
const nodes=graph.nodes.filter(n=>/getmodulestopimpact|previewmodulecomposition|evaluatemoduleentitlement|resolveworkflowassuranceincident|assignworkflowassuranceincident/.test(n.id||''))
fs.writeFileSync(`${out}/GRAPH_NODES.json`,JSON.stringify({refresh:'2026-08-09; navigation only',nodes},null,2)+'\n')
console.log(JSON.stringify({files:baseline.files.length,head:baseline.head,prior:Object.fromEntries(Object.entries(prior).map(([k,v])=>[k,{checked:v.checked,drift:v.drift.map(f=>f.path)}])),nodes:nodes.length}))
