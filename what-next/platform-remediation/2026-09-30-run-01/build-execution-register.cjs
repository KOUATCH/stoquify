const fs = require('node:fs')
const path = require('node:path')
const crypto = require('node:crypto')
const root = path.resolve(__dirname, '../../..')
const roadmap = require('../../platform-correctness-roadmap/2026-09-30-run-01/roadmap-data.cjs')
const baseline = JSON.parse(fs.readFileSync(path.join(__dirname, 'baseline.json'), 'utf8'))
const progress = {
  R00: ['PARTIAL', 'Execution baseline captured; original dirty work preserved. Named human owners and first-release cohort decisions remain unconfirmed.', ['baseline.json'], 'Confirm D01–D08 and assign accountable reviewers before any release decision.'],
  R01: ['PARTIAL', 'Repaired 18 stale assertions; full-scope typecheck passes. Report/payroll gate pair passes 351 tests, with final changed-clause follow-ups passing. Frozen app build passes compilation, lint/types, static generation and tracing but exits1 on Windows standalone symlink EPERM. Packaging recovery fails: one missing trace file and dependencies resolving outside its output. Relocated runtime was not run. Workspace-backed authenticated smoke renders four dashboards and shows one truthful module denial; reconciliation retains an unclassified visible alert and no workflow-success claim.', ['runner/README.md', 'stale-tests-normal-after.result.json', 'runner/readiness-gates-normal.result.json', 'runner/report-trust-frozen.json', 'payroll-gate-after.json', 'runner/app-build-final.result.json', 'runner/standalone-recovery.lifecycle.json', 'runner/standalone-resolution-preflight.json', 'data-impact/browser/relocated/relocated-readiness.json', 'data-impact/browser/authenticated-smoke.json', 'data-impact/browser/reconciliation-followup/authenticated-smoke.json'], 'Qualify a fresh stable integrated candidate through the normal build and isolated runtime path; expand route checks into panel-level and full business workflows.'],
  R02: ['PARTIAL', 'Manual FX creation/posting validates explicit rates and stored base amounts; functional-currency reporting rejects missing evidence; unsupported base-currency transitions are rejected.', ['accounting/implementation-evidence.md', 'data-impact/aggregate-impact.json'], 'Review historical missing amounts and rate provenance policy; do not release affected reports before R09 disposition.'],
  R03: ['PARTIAL', 'Generic posting/reversal admits MANUAL sources only; all source-owned enum cases are covered by denial tests.', ['accounting/implementation-evidence.md'], 'Prove each supported source-owned compensating workflow and PostgreSQL duplicate/failure races.'],
  R04: ['PARTIAL', 'Transactional IndexedDB queue, atomic sequence allocation, corruption quarantine and conservative legacy migration implemented; real-browser tests pass.', ['offline/implementation-and-limits.md', 'offline/verification-manifest.json'], 'Qualify supported devices, eviction policy, older-client shutdown and operator recovery/export before pilot.'],
  R05: ['PARTIAL', 'Persisted leases, original-identity retries, uncertain outcome recovery, cross-tab exclusion and complete acknowledgement checks implemented.', ['offline/implementation-and-limits.md', 'offline/verification-manifest.json'], 'Prove one sale/stock/journal effect jointly in a browser and disposable PostgreSQL after lost response; implement governed recovery UI.'],
  R06: ['PARTIAL', 'First fiscal period clips to actual year start. General ledger uses opening balances and a repeatable-read snapshot; exports add a hashed summary including empty ranges and apply the selected period to actual query bounds.', ['accounting/implementation-evidence.md', 'accounting/general-ledger-summary-contract.md'], 'Complete independent accountant/browser acceptance and disposition the 22 historical entry/period date candidates.'],
  R07: ['PARTIAL', 'Period close requires a completed current non-blocked assessment, checks live blocking findings, records its run ID, and rejects incomplete/unbalanced functional amounts. Assessment invalidation and finalization fixes are separately verified.', ['close-assurance-integration.result.json', 'close-functional-preflight.result.json', 'accounting/implementation-evidence.md'], 'Complete a shared writer/close locking contract and late-evidence policy, then prove all PostgreSQL interleavings and fresh source coverage.'],
  R08: ['PARTIAL', 'Added database guards for posted-line mutations, tenant consistency and posted status regression. Three original invalid-write probes now reject on the restored copy; eight compatibility checks and seventeen supplemental checks pass. Clean 89-migration replay and repeat deployment pass; populated-copy deploy/status also pass. Payroll SQL approval/duplicate/failure checks pass.', ['data-impact/restore/journal-boundary-probes-after.json', 'data-impact/restore/journal-migration-verification.json', 'accounting/journal-guard-supplement-results.json', 'data-impact/restore/fresh-replay-89-execution.json', 'data-impact/restore/payroll-trust-spine-postgres.json'], 'Complete posted-header/late-insert/parent-retention boundaries, reciprocal tenant guards, draft-post races and deployed least-privilege verification.'],
  R09: ['PARTIAL', 'Read-only scan found 120 missing-base lines across 24 journals and 22 out-of-period journals. All candidates carry four synthetic-seed markers; a capture-only reproduction matches the exact counts. The future seed producer now writes base amounts and chooses periods from actual dates. Existing records remain unchanged.', ['data-impact/aggregate-impact.json', 'data-impact/seed-provenance.json', 'data-impact/seed-producer-disposition.md', 'data-impact/seed-producer-verification.json'], 'Review fixture regeneration on a separate disposable database; preserve original evidence. For any business/mixed-provenance population, prepare source-owned corrections with independently reviewed historical evidence.'],
  R17: ['PARTIAL', 'Existing payroll approval SQL contract passed three real PostgreSQL concurrency/duplicate/rollback checks on a newly restored local copy. Calculation, country qualification and complete application workflow remain unproved in this batch.', ['data-impact/restore/payroll-trust-spine-postgres.json'], 'Complete source-to-payroll, payment, declaration and GL application-level acceptance with independently qualified country rules.'],
  R30: ['PARTIAL', 'Unsafe account deletion instructions removed. Local restore passed 87/87 migration history/status, preserved schema-diff fingerprint and nine-table auth/accounting count profiles; temporary dump removed. Later clone upgrade to89 is separately recorded. Ordinary login and three dashboard renders pass on the clone; reconciliation separately renders with an unclassified alert and close remains module-locked. Measured business counts are stable; full recovered workflows remain unproved.', ['../../../docs/operations/runbooks/RUNBOOK.md', 'data-impact/restore/restore-rehearsal.md', 'data-impact/restore/execution.json', 'data-impact/browser/authenticated-smoke.json', 'data-impact/browser/reconciliation-followup/review-classification.json'], 'Complete recovered business/worker/offline workflows and agreed measured recovery objectives before production qualification.'],
}
const packages = roadmap.map(item => {
  const update = progress[item.id]
  return {
    id: item.id, title: item.title, priority: item.priority, dependencies: item.deps,
    status: update?.[0] || (Number(item.id.slice(1)) >= 34 ? 'CONDITIONAL_NOT_STARTED' : 'NOT_STARTED'),
    progress: update?.[1] || 'No completion claim in this execution batch; prior implementation and planning evidence still require current package-specific acceptance.',
    evidence: update?.[2] || [],
    nextAction: update?.[3] || item.steps[0],
    acceptance: item.done, releaseGate: item.gate,
    ownerRole: item.owner, reviewerRole: item.reviewer,
    humanAssignment: 'UNCONFIRMED',
    findings: item.findings, capabilities: item.caps,
  }
})
const verification = []
function inspect(directory) {
  for (const entry of fs.readdirSync(directory, { withFileTypes: true })) {
    const full = path.join(directory, entry.name)
    if (entry.isDirectory()) inspect(full)
    else if (entry.name.endsWith('.result.json')) {
      const result = JSON.parse(fs.readFileSync(full, 'utf8'))
      verification.push({ file: path.relative(__dirname, full).replace(/\\/g, '/'), ...result })
    }
  }
}
inspect(__dirname)
const report = {
  schemaVersion: 'stoquify-remediation-execution.v1', generatedAt: new Date().toISOString(),
  status: 'IN_PROGRESS_NOT_RELEASE_APPROVED', baselineFile: 'baseline.json',
  batchStatus: 'IMPLEMENTED_VERIFICATION_RECORDED_RELEASE_BLOCKED',
  baselineSha256: crypto.createHash('sha256').update(fs.readFileSync(path.join(__dirname, 'baseline.json'))).digest('hex'),
  baselineHashContract: 'SHA-256 of exact baseline.json file bytes',
  assumptions: ['Core correctness work proceeds independently of the unconfirmed first customer cohort.', 'Role names are planning responsibilities, not accepted assignments.', 'A static gate or passing unit test is not provider, statutory, device or production certification.'],
  candidateBoundary: {
    buildRecord: 'runner/app-build-final.result.json',
    sourceManifest: 'runner/app-build-final.sources-after.json',
    postBuildConcurrentDrift: 'source-stability-after-smoke.json',
    taskOwnedStability: 'task-owned-source-stability-final.json',
    qualification: 'Verification applies to the recorded candidate. Unclaimed purchasing/inventory edits arrived after the build; no latest-checkout pass is asserted. Declared remediation source paths remain unchanged.',
  },
  packages, verification,
  verificationReceiptScope: 'The verification array contains command-wrapper *.result.json receipts; it is not the complete evidence index or a count of unique tests.',
  additionalVerificationArtifacts: [
    'accounting/accounting-suite-final-results.json', 'offline/final-focused-jest.json',
    'offline/verification-manifest.json', 'accounting/journal-guard-supplement-results.json',
    'data-impact/restore/journal-boundary-probes-after.json', 'data-impact/restore/journal-migration-verification.json',
    'data-impact/restore/payroll-trust-spine-postgres.json', 'data-impact/restore/fresh-replay-89-execution.json',
    'data-impact/restore/fresh-replay-89.json', 'data-impact/seed-producer-verification.json',
    'runner/standalone-recovery.lifecycle.json', 'runner/standalone-resolution-preflight.json',
    'runner/packaging-probe-cleanup.json', 'data-impact/browser/relocated/relocated-readiness.json',
    'data-impact/browser/reconciliation-followup/review-classification.json',
  ],
  production: { deployed: false, migrationsAppliedToSource: false, historicalDataRepaired: false, offlineReplayEnabled: false },
}
fs.writeFileSync(path.join(__dirname, 'execution-register.json'), JSON.stringify(report, null, 2) + '\n')
const rows = packages.map(p => `| ${p.id} | ${p.title} | ${p.status} | ${p.nextAction.replace(/\|/g, '/')} |`)
const text = [
  '# Stoquify roadmap execution register', '', `Updated: ${report.generatedAt}`, '',
  '**Execution is in progress. The 38-package roadmap is not complete and no release is approved.**', '',
  'The first implementation batch addresses the audit’s financial correctness, offline durability, close control and verification failures. Historical data findings prevent treating these source fixes as an immediately releasable financial system.', '',
  '## Material data findings', '',
  '- Local snapshot only: 120 of 364 posted/reversed lines lack both base amounts; 24 of 137 entries cannot be checked for base balance.',
  '- 22 of 137 entries fall outside their assigned accounting periods. All missing-base and date-mismatch candidates carry four seed markers; the original seed function independently reproduces the exact population fingerprint.',
  '- The future seed generator is corrected. Existing historical records remain intact, and their reviewed disposition is still pending.',
  '- The 244 complete-base lines match their stored conversion rates; 113 complete-base entries balance. Zero candidates on those subsets does not cover missing evidence.',
  '- Source migration names/checksums match 87/87; the source was scanned in a read-only repeatable-read transaction and rolled back. New guard migrations are verified only on newly created disposable databases.', '',
  '## Package status', '', '| ID | Package | Status | Next concrete action |', '|---|---|---|---|', ...rows, '',
  '## Evidence and completion rules', '',
  'See execution-register.json for dependency edges, acceptance criteria, role assignments, evidence paths and timestamped verification attempts. Failed/time-limited attempts remain in the record. Repeated or overlapping test runs must not be summed as unique coverage.', '',
  'Code-level corrections are PARTIAL until all acceptance conditions in the published roadmap are met. NOT_STARTED means this batch has not completed or revalidated that package; it does not imply the application has no existing implementation.', '',
  'The immediate dependency sequence is: qualify a stable integrated candidate through the ordinary build and isolated runtime checks (the Windows standalone build and packaging recovery both failed); resolve R07 source/close concurrency; complete R08 database boundaries; disposition R09 historical data; then finalize domain integration, BI source contracts and customer/device pilots. Work that needs expert or business decisions remains explicit.', '',
  'No source-database migration, historical repair, external payment, production rollout or offline replay enablement is authorized by a green static gate.', '',
].join('\n')
fs.writeFileSync(path.join(__dirname, 'EXECUTION_REGISTER.md'), text)
console.log(JSON.stringify({ packageCount: packages.length, status: report.status, verificationAttempts: verification.length }))
