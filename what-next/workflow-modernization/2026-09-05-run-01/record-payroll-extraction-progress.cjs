const fs=require('node:fs'),path=require('node:path'),crypto=require('node:crypto'),assert=require('node:assert/strict');
const root=__dirname,repo=path.resolve(root,'../../..'),sha=value=>crypto.createHash('sha256').update(value).digest('hex'),hash=file=>sha(fs.readFileSync(file));
const read=file=>JSON.parse(fs.readFileSync(path.join(root,file)));
const binding=read('evidence/payroll-forecast-extraction-binding.json');
const old=fs.readFileSync(path.join(root,binding.baseline),'utf8');assert.equal(sha(old),binding.beforeSha256);
const current=fs.readFileSync(path.join(repo,binding.file),'utf8'),extracted=fs.readFileSync(path.join(repo,binding.destination),'utf8');
const start=old.indexOf('type PayrollFinanceForecastResult ='),end=old.indexOf('function tenantEvidenceGrade(',start),a=old.indexOf('const PAYROLL_FINANCE_FORECAST_HORIZON_DAYS'),b=old.indexOf('export async function getTenantOperatingSnapshot(',a);
const extractedConstants=extracted.slice(extracted.indexOf('const PAYROLL_FINANCE_FORECAST_HORIZON_DAYS'),extracted.indexOf('export type PayrollFinanceForecastResult ='));
const extractedBody=extracted.slice(extracted.indexOf('export type PayrollFinanceForecastResult =')).replace('export type PayrollFinanceForecastResult =','type PayrollFinanceForecastResult =').replace('export async function getPayrollFinanceForecast(','async function getPayrollFinanceForecast(').replace('export function payrollForecastBlockers(','function payrollForecastBlockers(');
assert.equal(sha(extractedBody),binding.bodySha256);assert.equal(sha(extractedConstants),binding.constantsSha256);
let reconstructed=old.slice(0,start)+old.slice(end);reconstructed=reconstructed.slice(0,a)+reconstructed.slice(b);
for(const name of ['AccountingSourceType','LedgerPostingBatchStatus','Prisma','PayrollDeclarationStatus','PayrollPaymentBatchStatus','PayrollFinanceForecastMetrics','SnapshotBlocker','createSnapshotSourceHash'])reconstructed=reconstructed.replace(new RegExp('  '+name+',\\r?\\n'),'');
reconstructed=reconstructed.replace('import { payrollCertifiedInputProofFromMetadata } from "@/services/payroll/certified-input-proof"','import { getPayrollFinanceForecast, payrollForecastBlockers } from "@/services/payroll/payroll-finance-forecast.service"');
assert.equal(current,reconstructed,'Only moved blocks and their imports may change');
const staticFile='evidence/payroll-extraction-checks-26ffacbc-79a6-40ee-aadb-465474c76d2f.json',runtimeFile='lanes/environment/payroll-extraction-53ed0d2e-d2e4-47a4-ae15-c95240cbc37e.json';
const tests=read(staticFile),runtime=read(runtimeFile),prior=read('evidence/cash-private-review-2026-09-28.json');
assert.ok(tests.passed&&tests.sourceStable&&runtime.passed&&runtime.sourceStable&&runtime.readOnlyGuardEnforced&&runtime.checks.length===2);
const sourceHashes={...prior.sourceHashes,...tests.sourceAfter,...runtime.sourceAfter};for(const [file,expected] of Object.entries(sourceHashes))assert.equal(hash(path.join(repo,file)),expected,file);
const priorImpact=Object.entries(prior.sourceHashes).filter(([file,before])=>sourceHashes[file]!==before).map(([file,before])=>({file,before,after:sourceHashes[file]}));
assert.deepEqual(priorImpact.map(row=>row.file),[binding.file]);
const report='CASH_COMMAND_PAYROLL_SOURCE_EXTRACTION_2026-09-28.md';
const review={at:new Date().toISOString(),workflow:'FA-CASH-COMMAND',report,completeWorkflowVerified:false,sourceHashes,priorImpact,
 verifiedSubcriteria:['payroll_forecast_independent_source_preserves_exact_proof_algorithm','owned_forecast_incomplete_proof_and_empty_source_equivalent'],
 receipts:[staticFile,runtimeFile,'evidence/payroll-forecast-extraction-binding.json',binding.baseline].map(file=>({file,sha256:hash(path.join(root,file))})),
 extraction:{source:binding.file,destination:binding.destination,before:binding.beforeSha256,after:sha(current),algorithmSha256:binding.bodySha256,constantsSha256:binding.constantsSha256,exactRemainderVerified:true},
 reuse:'All forecast executable logic and constants are byte-identical after removing export modifiers. Remaining tenant source is exactly reconstructed by removing those blocks and adjusting imports. Three existing test suites pass, including the completed Daily Digest consumer. Actual PostgreSQL complete aggregate equality and independent forecast equality pass for proof-incomplete and empty sources. Existing UI and permission gates are unchanged; no browser rerun claimed.',
 remaining:'Wire independent authorized Cash Command source reads; extraction alone does not prevent existing broad tenant queries. Provider evidence remains an input and still needs current source admission. Complete scope/provenance, payroll/inventory handoffs, full EN/FR, remaining proofs and genuinely posted payroll lifecycle.'};
fs.writeFileSync(path.join(root,'evidence/payroll-extraction-review-2026-09-28.json'),JSON.stringify(review,null,2)+'\n',{flag:'wx'});
fs.writeFileSync(path.join(root,report),`# Payroll forecast source separation for Cash Command

${review.at}. FA-CASH-COMMAND remains In progress. Previous turn was progress: drawer and module diagnostics admission was implemented and verified.

The mixed tenant snapshot contained the complete payroll forecast algorithm alongside unrelated domain queries. Its forecast calculation and blocker presentation now live in services/payroll/payroll-finance-forecast.service.ts. The existing tenant snapshot imports that service. This is the prerequisite for Cash Command to request payroll proof without invoking sales, purchasing, inventory or close reads; current Cash Command orchestration still invokes the mixed snapshot.

## Preservation and verification

${review.reuse}

- ${staticFile}: 147 tests/three suites, changed-file lint and full TypeScript passed. Existing tests cover currency mismatch, decimal totals, missing declaration/provider/posting/certified-input/register proof and successful source contracts.
- ${runtimeFile}: read-only PostgreSQL verification reuses existing synthetic organizations. The retained original source was transpiled only in the verifier process, without replacing repository files. Its complete aggregate equals the current integrated result, including metrics, hashes, freshness and blockers. Calling the new payroll service independently produces the same forecast and executes only PayrollPeriod, PayrollRun and (where needed) AccountingSourceLink reads, all scoped to the selected organization.
- Incomplete proof stays non-authoritative with null totals and all six missing-proof reasons. A successful query with no upcoming periods remains an empty zero forecast. Every model mutation was refused by the verification client. These synthetic records do not establish genuine posting or approval.
- Exact moved algorithm/constants and reconstructed remaining-source hashes are retained with the before-source text. This supports proportionate reuse of the unchanged completed Daily Digest behavior, with the newly extracted dependency now included in the source binding.

## Remaining implementation and operation

${review.remaining}

Routes and user inputs are unchanged: /en/dashboard/finance/cash-command and /fr/dashboard/finance/cash-command. No new approval, migration or configuration is needed. The payroll service is an internal calculation, not a public action or authorization boundary. Callers must authorize its source scope; do not expose it as an action without current identity, tenant, role and module checks. Continue preserving existing source-link, provider, certified-input, declaration and currency requirements.

No production deployment, live activation, payroll posting, payment or external message occurred. Recovery can restore the retained original source and remove the extracted module together; do not change proof logic to obtain a numeric forecast. Current isolated evidence is not a release or accounting certification.

## Review accountability

Architecture/backend: payroll-owned calculation separated from mixed orchestration. Finance/audit/data: exact algorithm, nullable and currency semantics preserved. Security: read scope traced; broad Cash Command admission remains explicitly unfinished. Quality/SRE: existing consumer tests and actual database equivalence; no latency claim. Frontend/product/operations: no visual or employee process change. Country packs, providers, offline, agents and migrations: not applicable to this extraction; no policy or lifecycle behavior changed.
`,{flag:'wx'});
const target=path.join(root,'reconcile-current-progress.cjs');let s=fs.readFileSync(target,'utf8');
const marker='const root = __dirname;';assert.ok(s.includes(marker));
s=s.replace(marker,()=>marker+`
const payrollExtraction = JSON.parse(fs.readFileSync(path.join(root, 'evidence/payroll-extraction-review-2026-09-28.json')));
for (const row of payrollExtraction.receipts) if (crypto.createHash('sha256').update(fs.readFileSync(path.join(root, row.file))).digest('hex') !== row.sha256) throw new Error('Payroll extraction receipt changed');
const payrollExtractionCurrent = Object.entries(payrollExtraction.sourceHashes).every(([source, expected]) => crypto.createHash('sha256').update(fs.readFileSync(path.resolve(root, '../../..', source))).digest('hex') === expected);
if (!payrollExtractionCurrent) throw new Error('Payroll extraction dependency changed; review required');
function reviewedPayrollExtraction(source, expected, actual) {
  return source === payrollExtraction.extraction.source && expected === payrollExtraction.extraction.before && actual === payrollExtraction.extraction.after;
}
`);
s=s.replace('  if (actual === expected) continue;', '  if (actual === expected || reviewedPayrollExtraction(source, expected, actual)) continue;');
s=s.replace('const cashPrivateCurrent = Object.entries(cashPrivate.sourceHashes).every(([source, expected]) => crypto.createHash', 'const cashPrivateCurrent = payrollExtractionCurrent && Object.entries(cashPrivate.sourceHashes).every(([source, expected]) => crypto.createHash');
s=s.replace('=== expected);\nfor (const row of cashPrivate.priorImpact)', '=== (payrollExtraction.priorImpact.find(row => row.file === source)?.after ?? expected));\nfor (const row of cashPrivate.priorImpact)');
s=s.replaceAll('=== (cashPrivate.priorImpact.find', '=== (payrollExtraction.priorImpact.find(row => row.file === source)?.after ?? cashPrivate.priorImpact.find');
s=s.replace('...cashPrivate.verifiedSubcriteria]', '...cashPrivate.verifiedSubcriteria, ...payrollExtraction.verifiedSubcriteria]');
s=s.replace('const currentCashLane =', `for (const report of [payrollExtraction.report, 'evidence/payroll-extraction-review-2026-09-28.json']) if (!cashRead.evidence.includes(report)) cashRead.evidence.push(report);
cashRead.closureReview.payrollExtractionBindingCurrent = payrollExtractionCurrent;
if (!digest.evidence.includes(payrollExtraction.report)) digest.evidence.push(payrollExtraction.report);
const currentCashLane =`);
const p=s.indexOf('**Since the previous report:**'),q=s.indexOf('**Remaining priority:**',p);assert.ok(p>0&&q>p);
s=s.slice(0,p)+`**Since the previous report:** Separated payroll forecast calculation from the mixed tenant snapshot, preserving every proof rule and constant. The existing tenant integration now reuses the payroll service. Its independent read touches only payroll periods/runs and source links. Actual PostgreSQL comparisons preserved complete aggregate output for missing-proof and empty cases. 147 tests/three suites, lint and TypeScript passed; exact code-move and dependency bindings support reuse of unchanged Daily Digest behavior. This removes an architectural dependency, but Cash Command still needs to call authorized sources independently. [Evidence and next boundary](CASH_COMMAND_PAYROLL_SOURCE_EXTRACTION_2026-09-28.md). No workflow was added or closed.

`+s.slice(q);
const pending=target+'.pending-'+crypto.randomUUID();fs.writeFileSync(pending,s,{flag:'wx'});fs.renameSync(pending,target);console.log(JSON.stringify({report,sourceImpact:priorImpact.map(row=>row.file),exactAlgorithmPreserved:true}));
