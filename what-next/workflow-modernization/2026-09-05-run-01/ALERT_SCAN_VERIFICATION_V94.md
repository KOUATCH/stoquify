# Alert scan verification — v94

2026-09-09T08:28:09.818Z. Branch `codex/migration-control-plane-release-2026-08-29`, HEAD `a05a41ef66cd5d98fd69ae3df18225795f912232`; shared dirty tree retained. [Baseline](evidence/source-baseline-v94.json), [receipt](evidence/alert-scan-v94.json), [operator guide, review responsibilities and held cutover](ALERT_SCAN_GUIDE_AND_CUTOVER.md).

## Passed

- 99 tests/eight suites (session 36815 exit 0): explicit CLI scope/UUID/page bounds, help and incomplete/complete statuses, error propagation, strict progress input, missing/failed/corrupt reads, existing notification/run/suspense/generic inbox behavior and UI scan states.
- Ten owned PostgreSQL checks (2f9328 exit 0): first 100 observations/checkpoint; real mid-page insert failure and full page rollback; durable failure preserving previous progress; two-worker resumption; all 205 overdue suspense and 31 ready-run observations; final review/completion; completed replay no changes; old dashboard trigger coexists without duplicates/overwrites; generic inbox leasing exclusion; new evidence via a new pass; independent tenant with same scan ID. The actual exported CLI executor was invoked; no production shell launcher or scheduler was deployed.
- Actual EN/FR app (session 78169 exit 0): absent, partial, failed and resumed-complete states from real scan service effects; old alerts remain visible; mobile/tablet/desktop, 200% text and reduced motion. 16 screenshots; English failed desktop and French complete 320px views visually inspected. No page errors. Source hashes and unrelated notification records unchanged.
- Typecheck session 52854 exit 0 (eae11e); seven-file lint exit 0 (3fcbdf). Source baseline captured after the final edit. No schema changes/migrations, production build, external messages, financial postings or deployment.

## Commands

Inspected direct bundled Node commands bypass migration/seed lifecycle hooks.

### tests

```text
node node_modules/jest/bin/jest.js --runInBand --runTestsByPath "scripts/__tests__/reconciliation-alert-worker.test.ts" "services/payments/__tests__/payment-reconciliation-inbox-worker.service.test.ts" "components/finance/__tests__/PaymentReconciliationWorkbench.test.tsx" "services/reconciliation/__tests__/payment-reconciliation-alert-scan.service.test.ts" "services/reconciliation/__tests__/payment-reconciliation-summary.service.test.ts" "services/reconciliation/__tests__/payment-suspense-workflow.service.test.ts" "services/reconciliation/__tests__/payment-reconciliation-run.service.test.ts" "services/reconciliation/__tests__/payment-reconciliation-notifications.test.ts" --json --outputFile="what-next/workflow-modernization/2026-09-05-run-01/evidence/alert-scan-final-v94.json"
```

### typecheck

```text
node node_modules/typescript/bin/tsc --noEmit --incremental false --pretty false
```

### database

```text
node what-next/workflow-modernization/2026-09-05-run-01/lanes/environment/verify-alert-scan-v94.cjs
```

### browser

```text
node what-next/workflow-modernization/2026-09-05-run-01/lanes/environment/verify-alert-scan-browser-v94.cjs
```

### baseline

```text
node what-next/workflow-modernization/2026-09-05-run-01/capture-source-baseline.cjs
```

### lint

```text
node node_modules/eslint/bin/eslint.js services/reconciliation/payment-reconciliation-alert-scan.service.ts services/reconciliation/payment-reconciliation-dashboard.service.ts scripts/reconciliation-alert-worker.ts scripts/__tests__/reconciliation-alert-worker.test.ts services/reconciliation/__tests__/payment-reconciliation-alert-scan.service.test.ts components/finance/PaymentReconciliationWorkbench.tsx components/finance/__tests__/PaymentReconciliationWorkbench.test.tsx
```

## Failed attempt and automatic approval review

Initial focused tests (session 1388) passed 55 and failed one: an empty array in Jest.each was interpreted as a done callback, causing a 5000ms harness timeout. Inputs were wrapped as named argument objects, then all final 99 tests passed. No timeout or assertion was weakened.

An apply_patch invocation that would remove dashboard-triggered alerts was rejected by automatic approval review: no replacement schedule or worker deployment was operational, creating a missed-alert risk. The rejected removal was not applied through another tool. The implemented safer alternative stages the worker/status while retaining the old trigger. The publisher explicitly verifies that call is still present. The held action and required evidence/approval are documented in the guide. This is the first goal turn with this cutover rejection; other authorized engineering remains possible and the overall goal is not marked blocked.

## Limits and next action

The worker service is verified; actual deployment scheduling, host restart handling, monitoring and trigger cutover remain unverified. The dashboard is still a writer, its old scan remains bounded and write failure can still fail the read. A scan pass is not an atomic source snapshot or proof of current operational health; per-page observations and initial creation/deadline boundaries are explicit in the guide. Full lifecycle resolution/reversal/export, notification archive/acknowledgements, stronger access/accessibility and broader platform workflows remain incomplete.

Development load observations: en 16381 ms, fr 11163 ms. No controlled production performance improvement or approved budget pass is claimed.

Coverage: 228 provisional / 0 whole verified / 209 unmapped entry sources. Existing notification workflows were extended with the worker entry point rather than duplicated. The full goal remains active.
