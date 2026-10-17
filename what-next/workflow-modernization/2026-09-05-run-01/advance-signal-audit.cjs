const fs = require('node:fs'), path = require('node:path');
const file = path.join(__dirname, 'reconcile-current-progress.cjs');
let code = fs.readFileSync(file, 'utf8');
function replace(before, after) { if (!code.includes(before)) throw new Error('Expected reconciliation text is missing: ' + before.slice(0, 80)); code = code.replace(before, after); }
replace("digest.implementationStatus = 'inventory_loss_handoff_and_identity_scoped_cache_withdrawal_corrected';", "digest.implementationStatus = 'payroll_history_no_longer_inferred_as_risk';");
replace("digest.runtimeStatus = 'owned_en_fr_loss_handoff_revocation_recovery_and_prior_workspace_views_verified';", "digest.runtimeStatus = 'owned_en_fr_payroll_history_and_missing_forecast_proof_verified';");
replace("  'Seven-day weekly aggregation and selected-period evidence are verified. Audit remaining source rules, generated labels/units and destination localization. Agent adapter/validator handoff and disabled release are verified; enabled governed-run lifecycle still requires genuine release authorization.',", "  'Six produced signal families have EN/FR label, source and unit checks. Historical payroll activity no longer invents exposure; missing forecast proof remains runtime verified. Remaining: employee-balance currency aggregation and related forecast/settlement amount boundaries. Destination localization remains with its source workflows.',");
replace("const lossRead = register.workflows.find(w => w.id === 'IN-013');", `const signalReport = 'DAILY_DIGEST_SIGNAL_AUDIT_2026-09-27.md';
if (!digest.evidence.includes(signalReport)) digest.evidence.push(signalReport);
digest.closureReview.verifiedCriteria.push('historical_payroll_count_does_not_infer_exposure', 'en_fr_owned_payroll_history_and_forecast_blocker_preservation', 'six_generated_signal_family_labels_units_and_source_contracts');
const cashRead = register.workflows.find(w => w.id === 'FA-CASH-COMMAND');
const currencyGap = 'Shared tenant snapshot sums employee-balance cases without currency grouping and omits the unit in blocker copy. Reproduce mixed currencies; establish nullable totals/per-currency evidence and verify Cash Command consumers, related settlements and forecast amounts.';
if (!cashRead.remaining.includes(currencyGap)) cashRead.remaining.push(currencyGap);
if (!cashRead.evidence.includes(signalReport)) cashRead.evidence.push(signalReport);
const cashLaneFile = path.join(root, 'lanes/finance-accounting/WORKFLOW_REGISTER.json');
const cashLane = JSON.parse(fs.readFileSync(cashLaneFile, 'utf8'));
const laneCash = cashLane.workflows.find(w => w.id === cashRead.id);
if (!laneCash.remaining.includes(currencyGap)) laneCash.remaining.push(currencyGap);
if (!laneCash.evidence.includes('../../' + signalReport)) laneCash.evidence.push('../../' + signalReport);
fs.writeFileSync(cashLaneFile, JSON.stringify(cashLane, null, 2) + '\\n');
const lossRead = register.workflows.find(w => w.id === 'IN-013');`);
replace("if (!laneDigest.evidence.includes('../../' + lossReport)) laneDigest.evidence.push('../../' + lossReport);", "if (!laneDigest.evidence.includes('../../' + lossReport)) laneDigest.evidence.push('../../' + lossReport);\nif (!laneDigest.evidence.includes('../../' + signalReport)) laneDigest.evidence.push('../../' + signalReport);");
replace("supportingDependency: null", "supportingDependency: 'FA-CASH-COMMAND'");
replace("Overdue source contract verified; no additional active workflow. Queued includes previously assessed work awaiting resumed closure. Historical detail retained.", "Shared payroll-currency read contract is the supporting dependency; full Cash Command workflow remains queued. Historical evidence retained.");
const lines = code.split(/\r?\n/);
for (let i = 0; i < lines.length; i++) {
  if (lines[i].startsWith('| Primary |')) lines[i] = '| Primary | AN-DAILY-DIGEST: reliable role-scoped digest and source handoff | In progress | False payroll-history risk removed; genuine forecast warning and EN/FR source contracts verified | [Full checklist](DAILY_DIGEST_CLOSURE.md): currency semantics and accessibility | Engineering | Correct payroll currency aggregation |';
  if (lines[i].startsWith('| Supporting contract |')) lines[i] = '| Supporting contract | FA-CASH-COMMAND: payroll amounts in cash intelligence | Full workflow queued | Shared consumers have regression coverage | Currency grouping, nullable total and related forecast/settlement units | Engineering | Reproduce mixed-currency balances in owned DB |';
  if (lines[i].startsWith('**Since the previous report:**')) lines[i] = '**Since the previous report:** Historical approved/paid/posted/archived payroll counts no longer create an unsupported exposure risk. Real EN/FR checks preserve all five historical statuses and show no false action; genuinely missing forecast proof still produces its warning and review link. Reads preserve payroll and financial records. Six-family tests cover labels, units and source identity. Shared tests and lint pass; [one detailed record](DAILY_DIGEST_SIGNAL_AUDIT_2026-09-27.md) contains terminal typecheck results and retained failures. Discovered an ungrouped, unlabeled employee-balance total; the audit remains open for that engineering correction. No workflow closed or newly visited; prior Inventory Loss evidence retained.';
}
code = lines.join('\n');
const fd = fs.openSync(file, 'r+'); try { fs.writeFileSync(fd, code); fs.ftruncateSync(fd, Buffer.byteLength(code)); } finally { fs.closeSync(fd); }
console.log('Updated the existing current-progress reconciler with the source-audit findings.');
