// Metadata-only integrity and P10-row publication. No application import or environment reads.
const fs=require('node:fs'),path=require('node:path'),crypto=require('node:crypto'),cp=require('node:child_process')
const root='docs/retention/execution/P10',out=`${root}/evidence`,statusPath='docs/retention/execution/STATUS.md'
const read=p=>JSON.parse(fs.readFileSync(p,'utf8')),hash=p=>crypto.createHash('sha256').update(fs.readFileSync(p)).digest('hex')
const baseline=read(`${out}/BASELINE.json`),names=fs.readdirSync(out)
const latest=names.filter(n=>/^tests-\d+\.results.json$/.test(n)).sort().at(-1)
const tests=read(`${out}/${latest}`),testExecution=read(`${out}/${latest.replace('.results.json','.execution.json')}`)
const workflowName=names.filter(n=>/^workflow-\d+\.execution.json$/.test(n)).sort().at(-1),workflow=read(`${out}/${workflowName}`)
if(!tests.success||tests.numPassedTests!==30||tests.numPassedTestSuites!==4||tests.numFailedTests||tests.numPendingTests||testExecution.exitCode!==0||workflow.exitCode!==0)throw new Error('Required current checks have not passed')
const drift=baseline.files.filter(f=>f.path!==statusPath&&(!fs.existsSync(f.path)||hash(f.path)!==f.sha256)).map(f=>({...f,current:fs.existsSync(f.path)?hash(f.path):null}))
const unrelated=p=>p.startsWith('components/landing/')||p==='components/Forms/WaitList.tsx'||p==='app/[locale]/(home)/workflows/page.tsx'||p.startsWith('scripts/__tests__/landing-')
if(drift.some(f=>!unrelated(f.path)))throw new Error('Relevant source changed; revalidate before publishing: '+drift.filter(f=>!unrelated(f.path)).map(f=>f.path).join(', '))
const current=fs.readFileSync(statusPath,'utf8'),before=fs.readFileSync(`${out}/STATUS.md.before`,'utf8')
const omit=s=>s.split(/\r?\n/).filter(l=>!l.startsWith('| [P10]')).join('\n')
if(omit(current)!==omit(before))throw new Error('Other status rows changed; preserve and recheck')
const docs=['RESULT.md','LIFECYCLE_POLICY_PROPOSAL.md','SUPPORT_RUNBOOK_DRAFT.md','PACKAGING_DECISIONS.md']
const policy=fs.readFileSync(`${root}/LIFECYCLE_POLICY_PROPOSAL.md`,'utf8')
const transitions=[...policy.matchAll(/^\| T\d+ /gm)].length,scenarios=[...policy.matchAll(/^\| C\d+ /gm)].length
if(transitions!==11||scenarios!==17)throw new Error('Incomplete transition/scenario table')
const planned=new Set([`${out}/VALIDATION.json`,`${out}/MANIFEST.json`].map(p=>path.resolve(p)))
const links=[]
for(const name of docs){const file=`${root}/${name}`;for(const m of fs.readFileSync(file,'utf8').matchAll(/\]\(([^)]+)\)/g)){
 const target=m[1].replace(/^<|>$/g,'').split('#')[0];if(!target||/^[a-z]+:\/\//i.test(target))continue
 const resolved=path.resolve(path.dirname(file),target)
 if(!fs.existsSync(resolved)&&!planned.has(resolved))throw new Error('Missing link '+file+' '+target)
 links.push({file,target,resolved})
}}
const row='| [P10](../implementation-prompts/10_COMMERCIAL_LIFECYCLE_AND_SUPPORT.md) | P01, P04, P09 | Product/commercial owner with support and legal review | R08 | PASS — proposed policy and bounded scenarios | [P10 result](P10/RESULT.md): 11 transitions, 17 scenarios; 30 mocked tests / 4 suites; support/package/research drafts | Business/legal approval, actual billing/support ownership, retained archive rights and unsupported stop behavior remain open; no live lifecycle change |'
if(current.split(/\r?\n/).filter(l=>l.startsWith('| [P10]')).length!==1)throw new Error('Expected one P10 row')
fs.writeFileSync(statusPath,current.split(/\r?\n/).map(l=>l.startsWith('| [P10]')?row:l).join('\r\n'))
const additional=['components/landing/public-pages.tsx','services/communication/customer-statement-delivery.provider.ts','services/users/user-identity.service.ts','services/signals/signal-notification.service.ts','services/purchasing/ap-history-export.service.ts','actions/purchasing/ap-history.actions.ts','actions/accounting/data-trust.actions.ts','services/accounting/accountant-access.service.ts','lib/security/rbac.ts','services/_shared/protect.ts']
fs.writeFileSync(`${out}/SOURCE_REVIEW.json`,JSON.stringify({utc:new Date().toISOString(),scope:'Current inspected source; no production configuration/customer data',sourceHashes:additional.map(p=>({path:p,sha256:hash(p)})),searchRoots:['app','actions','services','lib','prisma/schema.prisma','package.json'],searchTerms:['subscription','billing portal','billing provider','stripe','paddle','support ticket','zendesk','intercom','freshdesk','support','pricing','Resend'],finding:'No platform subscription/helpdesk process established in scoped discovery; external/manual systems unknown. Merchant payments and business/identity notification code are separate.'},null,2)+'\n')
const head=cp.execFileSync('git',['rev-parse','HEAD'],{encoding:'utf8'}).trim()
if(head!==baseline.head)throw new Error('HEAD changed during task')
const validation={utc:new Date().toISOString(),head,selectedFiles:baseline.files.length,concurrentUnrelatedDrift:drift,onlyP10StatusRow:omit(before)===omit(fs.readFileSync(statusPath,'utf8')),prerequisites:read(`${out}/PREREQUISITES.json`),tests:{file:latest,passed:tests.numPassedTests,suites:tests.numPassedTestSuites,failed:tests.numFailedTests,skipped:tests.numPendingTests,exitCode:testExecution.exitCode,startedAt:testExecution.startedAt,finishedAt:testExecution.finishedAt},workflow:{file:workflowName,exitCode:workflow.exitCode},transitions,scenarios,status:'PASS — proposal artifact integrity and scoped mocked evidence only'}
fs.writeFileSync(`${out}/VALIDATION.json`,JSON.stringify(validation,null,2)+'\n')
const walk=p=>fs.readdirSync(p,{withFileTypes:true}).flatMap(d=>d.isDirectory()?walk(`${p}/${d.name}`):[`${p}/${d.name}`])
const writeManifest=()=>fs.writeFileSync(`${out}/MANIFEST.json`,JSON.stringify({utc:validation.utc,files:[statusPath,...walk(root)].filter(p=>p!==`${out}/MANIFEST.json`).map(p=>({path:p,sha256:hash(p),bytes:fs.statSync(p).size}))},null,2)+'\n')
writeManifest()
const checked=links.map(({resolved,...l})=>({...l,exists:fs.existsSync(resolved)}))
fs.writeFileSync(`${out}/ARTIFACT_LINKS.json`,JSON.stringify({pass:checked.every(l=>l.exists),links:checked},null,2)+'\n')
if(checked.some(l=>!l.exists))throw new Error('Final artifact link missing')
writeManifest()
console.log(JSON.stringify({pass:true,files:baseline.files.length,concurrentUnrelatedDrift:drift.map(f=>f.path),onlyP10StatusRow:validation.onlyP10StatusRow,tests:validation.tests,transitions,scenarios,links:checked.length}))
