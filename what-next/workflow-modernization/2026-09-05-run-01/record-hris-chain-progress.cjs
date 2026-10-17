const fs = require('node:fs'), path = require('node:path'), crypto = require('node:crypto'), assert = require('node:assert/strict');
const root = __dirname, repo = path.resolve(root, '../../..');
const read = file => JSON.parse(fs.readFileSync(path.join(root, file)));
const hash = file => crypto.createHash('sha256').update(fs.readFileSync(file)).digest('hex');
const receiptFile = 'lanes/environment/payroll-hris-input-chain-bd47490f-c26b-4cb8-89f9-efb457b6075b.json';
const countryFile = 'lanes/environment/payroll-country-review-a6c06546-5382-4132-a552-cca489d0a8c9.json';
const receipt = read(receiptFile), country = read(countryFile), prior = read('evidence/cash-release-readiness-review-2026-09-30.json');
assert.ok(receipt.passed && receipt.sourceStable && receipt.hrisProof.status === 'READY');
assert.ok(receipt.periodCreation.noPeriodCreated && receipt.calculation.noFinancialEffects && !receipt.calculation.calculationExecuted && !receipt.calculation.releaseExecuted);
assert.ok(country.sourceStable && country.noApprovalSubmitted && country.certificate.status === 'BLOCKED');
const sourceHashes = {...receipt.sourceAfter, ...country.sourceAfter};
for (const file of ['services/payroll/payroll-country-pack-review-intake-persistence.service.ts', 'actions/payroll/payroll-country-pack-review-intake.actions.ts']) sourceHashes[file] = hash(path.join(repo, file));
for (const [file, value] of Object.entries(sourceHashes)) assert.equal(hash(path.join(repo, file)), value, file);
const report = 'CASH_PAYROLL_HRIS_CHAIN_2026-09-30.md', reviewFile = 'evidence/cash-hris-chain-review-2026-09-30.json';
const remaining = [...prior.remaining];
remaining[1] = remaining[1].replace('prepare genuine source-backed HRIS calculation evidence instead of inserting proof strings.', 'actual HRIS producer services now supply a valid readiness export in an isolated fixture. Current period creation and calculation stop at unreviewed bundled CNPS provenance; authentic expert review, encoded country-pack proposal and resolver integration remain prerequisites. IRPP topic evidence is also missing. Do not insert proof strings or relabel the current pack to pass.');
const review = {at: new Date().toISOString(), workflow: 'FA-CASH-COMMAND', completeWorkflowVerified: false, report, sourceHashes,
  verifiedSubcriteria: ['actual_hris_identity_document_contract_destination_attendance_readiness_chain_on_synthetic_inputs', 'current_country_pack_period_and_calculation_denials_without_financial_effects'],
  receipts: [receiptFile, countryFile, 'lanes/environment/payroll-hris-input-chain-7673617d-339e-4fba-8e7f-50fafad6a2d1.json'].map(file => ({file, sha256: hash(path.join(root, file))})),
  artifacts: [report, 'lanes/environment/verify-payroll-hris-input-chain.cjs', 'lanes/environment/inspect-payroll-country-review.cjs'].map(file => ({file, sha256: hash(path.join(root, file))})), remaining,
  externalDependency: {owner: 'qualified payroll/statutory reviewer and authorized legal owner', input: 'authentic reviewed CNPS rules, IRPP review topics and executable expected-output evidence', engineeringAfter: 'encode and validate reviewed pack; integrate resolver version; repeat full financial lifecycle'},
  limits: ['synthetic upstream document/policy/scanner inputs are not real approvals', 'raw fixture period only for isolated HRIS attendance verification', 'calculation and release remain unexecuted', 'no application/schema changes or new browser validation'], next: 'Continue unaffected Cash/payroll accessibility and recovery; preserve statutory dependency.'};
const file = path.join(root, 'reconcile-current-progress.cjs');
let source = fs.readFileSync(file, 'utf8');
function replace(before, after) {assert.ok(source.includes(before), before); source = source.replace(before, after);}
replace('cashRead.remaining = cashReleaseReadiness.remaining;', `const cashHrisChain = JSON.parse(fs.readFileSync(path.join(root, '${reviewFile}')));
for (const row of [...cashHrisChain.receipts, ...cashHrisChain.artifacts]) if (crypto.createHash('sha256').update(fs.readFileSync(path.join(root, row.file))).digest('hex') !== row.sha256) throw new Error('HRIS chain evidence changed');
const cashHrisChainCurrent = Object.entries(cashHrisChain.sourceHashes).every(([source, expected]) => crypto.createHash('sha256').update(fs.readFileSync(path.resolve(root, '../../..', source))).digest('hex') === expected);
if (!cashHrisChainCurrent) throw new Error('HRIS chain source changed; review required');
cashRead.remaining = cashHrisChain.remaining;
cashRead.closureReview.hrisChainBindingCurrent = cashHrisChainCurrent;
cashRead.closureReview.verifiedSubcriteria = [...new Set([...(cashRead.closureReview.verifiedSubcriteria ?? []), ...cashHrisChain.verifiedSubcriteria])];
for (const report of [cashHrisChain.report, '${reviewFile}']) if (!cashRead.evidence.includes(report)) cashRead.evidence.push(report);`);
replace('| Supporting contract | Payroll posting/forecast | In progress | Posting, balance, destination proof and readiness guidance verified | Legacy recovery; payment/declaration chain; wider payroll UX | Engineering | Prepare HRIS-backed calculation, then verify release and settlement |', '| Supporting contract | Payroll calculated-input handoff | Blocked—external (statutory branch) | Actual HRIS producer chain and valid fixture export | Reviewed CNPS/IRPP; resolver integration; complete financial lifecycle | Statutory reviewer + engineering | Obtain authentic review; continue unaffected accessibility/recovery |');
replace('| Engineering | Verify remaining payroll obligations and successful proof lifecycles |', '| Engineering | Complete Cash/payroll accessibility and recovery; retain statutory dependency |');
const start = source.indexOf('**Since the previous report:**'), end = source.indexOf('\n\n**Remaining priority:**', start); assert.ok(start > 0 && end > start);
source = source.slice(0, start) + '**Since the previous report:** Verified actual HRIS identity, document approval, contract activation, destination application and attendance services on isolated synthetic records; their persisted evidence produces a valid HRIS readiness export. Period creation and calculation correctly stop at unreviewed bundled CNPS provenance, without financial effects. Read-only intake evaluation identifies missing IRPP topic evidence. [Exact results, limits, owners and required inputs](CASH_PAYROLL_HRIS_CHAIN_2026-09-30.md). No application code changed or workflow closed. The successful financial lifecycle stays open; continue unaffected Cash/payroll accessibility and recovery while authentic statutory review is outstanding.' + source.slice(end);
fs.writeFileSync(path.join(root, reviewFile), JSON.stringify(review, null, 2) + '\n', {flag: 'wx'});
fs.writeFileSync(file, source);
console.log(JSON.stringify({reviewFile, applicationSourceUnchanged: true}));
