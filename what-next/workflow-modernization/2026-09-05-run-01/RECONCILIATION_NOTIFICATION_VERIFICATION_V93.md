# Reconciliation notification verification — v93

2026-09-09T08:10:12.320Z. Branch `codex/migration-control-plane-release-2026-08-29`, HEAD `a05a41ef66cd5d98fd69ae3df18225795f912232`; shared dirty tree preserved. [Baseline](evidence/source-baseline-v93.json), [receipt](evidence/reconciliation-notifications-v93.json), [guide and review matrix](RECONCILIATION_NOTIFICATION_GUIDE.md).

## Passed

- 86 tests/seven suites, final session 4654 exit 0: event sibling identity, transaction client, duplicate result, scoped explicit revisions, missing tenant/failed insert, existing suspense/run/ledger/history/summary and inbox rendering. Strengthened denial/failed-post assertions check no notification insertion.
- Ten owned PostgreSQL checks: sibling exception/suspense events, unchanged retry bytes, eight concurrent deliveries/one insert, transaction rollback, tenant-key independence, missing tenant, distinct revision keys, 60 newer ledger receipts cannot hide observations, latest-25 bound. Source hashes and unrelated notification rows unchanged.
- Actual EN/FR browser: 25 records, exact XAF/USD including a value beyond Number precision, malformed-amount fallback, localized severity/recorded status, explicit limited-list description, normal sign-in, reload, 320/390/768/1440 widths, 200% text and reduced motion. Ten screenshots; English desktop and French 320 screenshots visually inspected. No page errors. Source and unrelated notification rows unchanged.
- Typecheck 62875 exit 0 (de46e0); final eight-file lint exit 0 (d7de3b). No schema change, migration, live customer activation, external delivery, production build or deployment.

## Commands

Inspected direct bundled Node commands avoid migration/seed lifecycle hooks.

### tests

```text
node node_modules/jest/bin/jest.js --runInBand --runTestsByPath "components/finance/__tests__/PaymentReconciliationWorkbench.test.tsx" "services/reconciliation/__tests__/payment-reconciliation-summary.service.test.ts" "services/reconciliation/__tests__/payment-reconciliation-run.service.test.ts" "services/reconciliation/__tests__/payment-suspense-read.service.test.ts" "services/reconciliation/__tests__/payment-suspense-ledger.service.test.ts" "services/reconciliation/__tests__/payment-suspense-workflow.service.test.ts" "services/reconciliation/__tests__/payment-reconciliation-notifications.test.ts" --json --outputFile="what-next/workflow-modernization/2026-09-05-run-01/evidence/reconciliation-notifications-final-v93-attempt2.json"
```

### typecheck

```text
node node_modules/typescript/bin/tsc --noEmit --incremental false --pretty false
```

### database

```text
node what-next/workflow-modernization/2026-09-05-run-01/lanes/environment/verify-reconciliation-notifications-v93.cjs
```

### browser

```text
node what-next/workflow-modernization/2026-09-05-run-01/lanes/environment/verify-reconciliation-notifications-browser-v93.cjs
```

### baseline

```text
node what-next/workflow-modernization/2026-09-05-run-01/capture-source-baseline.cjs
```

### lint

```text
node node_modules/eslint/bin/eslint.js services/reconciliation/payment-reconciliation-notifications.ts services/reconciliation/payment-reconciliation-dashboard.service.ts services/reconciliation/payment-suspense-workflow.service.ts components/finance/PaymentReconciliationWorkbench.tsx services/reconciliation/__tests__/payment-reconciliation-notifications.test.ts services/reconciliation/__tests__/payment-reconciliation-run.service.test.ts services/reconciliation/__tests__/payment-suspense-workflow.service.test.ts components/finance/__tests__/PaymentReconciliationWorkbench.test.tsx
```

## Attempts, observations and limits

First focused run: all 61 tests/four suites passed, but receipt writing failed EPERM (session 1603, exit 1). This was a filesystem write failure, not an automatic approval-review rejection or test failure. An authorized rerun saved `evidence/reconciliation-notifications-final-v93.json` (86/seven, session 19581 exit 0). Final attempt2 repeats those suites after strengthening non-insertion assertions. All failed-attempt output is reported; no receipt was fabricated for the EPERM attempt.

Browser load observations: en 16372 ms, fr 9562 ms. Development compilation/cache differ from prior observations; no controlled latency improvement or approved budget pass is claimed. Browser rows are synthetic observations, not real financial/source approvals. No full screen-reader/contrast, denied-browser, current module matrix, scheduler, source reconstruction or release certification was performed in this batch.

The dashboard is still a notification producer on read. SLA/ready scans remain bounded; delivery failure can still fail the dashboard. Inbox full history, personal acknowledgements, deep links and background recovery remain incomplete. Original overwritten history was not reconstructed. These are engineering tasks, not external approval blockers. No X1 gate was cleared.

Coverage remains 228 provisional / 0 whole verified / 209 unmapped entry sources. Existing NTF-RECON-ALERT and NTF-RECON-INBOX entries were updated instead of creating duplicates. The full assignment remains active.
