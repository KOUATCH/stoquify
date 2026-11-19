// P12 read-only review; writes summaries only under this evidence directory.
const fs=require('node:fs'),path=require('node:path'),crypto=require('node:crypto')
const root=path.resolve(__dirname,'../../../../..');process.chdir(root)
const hash=p=>crypto.createHash('sha256').update(fs.readFileSync(p)).digest('hex')
const base='docs/retention/execution/'
const samples=[
 ['M','P02/evidence/JEST_RESULTS_FINAL_02.json'],['M superseded','P03/evidence/FIXTURE_AND_IMPORT_RESULTS.json'],['M','P03/evidence/FIXTURE_AND_IMPORT_RESULTS_FINAL.json'],['M selected; 29 filtered','P03/evidence/INVENTORY_BOUNDARY_RESULTS.json'],
 ['M','P04/evidence/RBAC_RESULTS.json'],['M','P04/evidence/ACCESS_RESULTS.json'],
 ['M','P05-P06-closure-2026-10-17/ui-green.results.json'],['D','P05-P06-closure-2026-10-17/lifecycle.results.json'],['D','P05-P06-closure-2026-10-17/full-commit.results.json'],
 ['M failed superseded','P06-operator-2026-10-17/ui.results.json'],['M','P06-operator-2026-10-17/ui-1792236995592.results.json'],['M repeated subset','P06-operator-2026-10-17/panel-final.results.json'],['B isolated storage','P06-operator-2026-10-17/storage-1792236525804.results.json'],['D','P06-operator-2026-10-17/full-commit.results.json'],
 ['M','P07-media-2026-10-18/evidence/unit-1792340632787.results.json'],['D','P07-media-2026-10-18/evidence/database-1792341206330.results.json'],
 ['M','P08/evidence/unit-1792343498866.results.json'],['M pure','P09/evidence/unit-1792344882953.results.json'],['M','P10/evidence/tests-1792351292853.results.json'],
 ['B sandbox attempt','P12/evidence/STORAGE_SANDBOX_RESULTS.json'],['B current isolated storage','P12/evidence/STORAGE_RESULTS.json']
]
const records=samples.map(([type,p])=>{const file=base+p,j=JSON.parse(fs.readFileSync(file));return {file,type,historical:!p.startsWith('P12/'),sha256:hash(file),success:j.success,passed:j.numPassedTests,failed:j.numFailedTests,skipped:j.numPendingTests,suites:j.numPassedTestSuites,assertions:j.testResults?.flatMap(s=>s.assertionResults.map(a=>({name:a.fullName,status:a.status})))};})
fs.writeFileSync(path.join(__dirname,'EVIDENCE_REVIEW.json'),JSON.stringify({at:new Date().toISOString(),note:'Selected actual raw results; historical counts are not reruns or additive unique coverage. D labels rely on inspected predecessor environment/runner records, not test names.',records},null,2)+'\n')
const targets=[
 ['services/analytics/retention-outcomes.service.ts','requireAllPermissions|RepeatableRead|RETENTION_SOURCE_LIMIT|organizationId: ctx.orgId'],
 ['services/analytics/retention-cohorts.ts','UNKNOWN|HUMAN'],
 ['services/onboarding/master-data-import.service.ts','opening|balance|ledger'],
 ['services/inventory/inventory-stock-event.service.ts','OPENING_STOCK_LEDGER_REVIEW|postOpeningStock'],
 ['services/pos/pos.service.ts','function commitPOSSale'],
 ['services/accounting/accounting-settings.service.ts','function getAccountingSettings'],
 ['services/pos/offline-sync.service.ts','isOfflinePOSReplayAuthorized|NODE_ENV|disabled for'],
 ['lib/pos/offline-local-queue.ts','inspectOfflineLocalQueues|assertNoLocalOfflineWork|quarantined'],
 ['actions/accounting/data-trust.actions.ts','protect|permission:|capability:|module:'],
 ['services/_shared/protect.ts','options.module|observeModuleAccess'],
 ['services/accounting/data-trust.service.ts','exportAccountantTrustPack|evaluateAndAuditSensitiveAction'],
 ['services/pos/__tests__/retention-offline-operator.browser-fixture.test.ts','assertDisposable|RUN_RETENTION|DATABASE|loopback|localhost'],
 ['package.json','agent:workflow:check|preagent:workflow:check|postagent:workflow:check'],
 ['jest.payroll-trust-spine.config.cjs','setupFilesAfterEnv|transform|testEnvironment'],
 ['jest.setup.ts','jest.mock'],
 ['lib/pos/__tests__/offline-local-queue.test.ts','listen|launch|rmSync|expectedPrefix|afterAll|it\\(']
]
const files=targets.map(([file,pattern])=>({file,sha256:hash(file),matches:fs.readFileSync(file,'utf8').split(/\r?\n/).flatMap((text,i)=>new RegExp(pattern,'i').test(text)?[{line:i+1,text}]:[])}))
const graph=JSON.parse(fs.readFileSync('graphify-out/graph.json'))
const ids=['pos_pos_service_commitpossale','accounting_accounting_settings_service_getaccountingsettings','services_regulatory_country_packs_registry_ts']
const nodes=graph.nodes.filter(n=>ids.includes(n.id)),edges=graph.links.filter(e=>ids.includes(e.source)||ids.includes(e.target))
fs.writeFileSync(path.join(__dirname,'SOURCE_REVIEW.json'),JSON.stringify({at:new Date().toISOString(),files,graph:{path:'graphify-out/graph.json',sha256:hash('graphify-out/graph.json'),freshness:'August discovery evidence, not live behavior',nodes,edges}},null,2)+'\n')
console.log(records.map(r=>({file:r.file,passed:r.passed,failed:r.failed,skipped:r.skipped})))
