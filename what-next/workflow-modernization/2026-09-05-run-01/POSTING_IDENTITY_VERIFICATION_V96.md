# Posting identity verification — v96

Evidence date 2026-09-09T09:00:45.508Z. Branch `codex/migration-control-plane-release-2026-08-29`, HEAD `a05a41ef66cd5d98fd69ae3df18225795f912232`. [Source baseline](evidence/source-baseline-v96.json), [receipt](evidence/posting-identity-v96.json), [guide and remaining correction sequence](POSTING_IDENTITY_AND_CORRECTION_PLAN.md). Shared dirty tree preserved.

## Results

- Before unit check: session 64689, exit 1; 16 failed and 5 passed. Incompatible identities were accepted. JSON receipt writing failed with sandbox EPERM; the tool output preserves the result.
- First database attempt: sandbox receipt write failed (5a512d); no saved success is claimed for that attempt. The inspected verifier was then authorized under escalation against the owned target.
- Before database reproduction: lanes/environment/posting-batch-identity-v96-before-01ee607d-88a.json, 86f3d9 exit 0. Four incompatible requests returned the original batch. This is successful defect reproduction, not a financial-invariant pass.
- After database: lanes/environment/posting-batch-identity-v96-after-9fb81e65-030.json, session 52819 / 95662e exit 0, five checks. Conflict nonmutation, canonical/null-v1 retries, ambiguous key/source collision, tenant separation and concurrent single durable batch with retry. Source hashes stable and pre-existing batch records unchanged. Synthetic fixture records retained; no live postings.
- 179 tests in ten suites: session 13769, exit 0. New shared identity checks plus accounting, suspense, customer settlements/reversals, inventory adjustments/reversals, AP and payroll callers.
- 12 POS posting/reversal tests in three suites: session 65614, exit 0. Total 191 tests / 13 suites.
- Typecheck: session 99873, 45fda1 exit 0. Two-file lint: session 73597, b61b42 exit 0.
- Baseline capture: session 21597, 1a01f0 exit 0. New test file counted; register source-baseline pointer corrected to the current snapshot.

## Commands

Inspected direct bundled Node commands avoid default build/migration hooks.

```text
node node_modules/jest/bin/jest.js --runInBand --runTestsByPath "services/accounting/__tests__/posting-batch-identity.test.ts" "services/payroll/__tests__/payroll-control.service.test.ts" "services/reconciliation/__tests__/payment-suspense-workflow.service.test.ts" "services/reconciliation/__tests__/payment-suspense-ledger.service.test.ts" "services/purchasing/__tests__/ap-control.service.test.ts" "services/accounting/__tests__/posting.service.test.ts" "services/accounting/__tests__/customer-settlement.service.test.ts" "services/accounting/__tests__/customer-settlement-reversal.service.test.ts" "services/inventory/__tests__/inventory-adjustment.service.test.ts" "services/inventory/__tests__/inventory-adjustment-reversal.service.test.ts" --json --outputFile="what-next/workflow-modernization/2026-09-05-run-01/evidence/posting-batch-identity-after-v96.json"
node node_modules/jest/bin/jest.js --runInBand --runTestsByPath "services/accounting/postings/post-payment.test.ts" "services/accounting/postings/post-sale.test.ts" "services/accounting/postings/post-reversal.test.ts" --json --outputFile="what-next/workflow-modernization/2026-09-05-run-01/evidence/posting-batch-pos-v96.json"
node what-next/workflow-modernization/2026-09-05-run-01/lanes/environment/verify-posting-batch-identity-v96.cjs before|after
node node_modules/typescript/bin/tsc --noEmit --pretty false
node node_modules/eslint/bin/eslint.js services/accounting/posting.service.ts services/accounting/__tests__/posting-batch-identity.test.ts
```

## Limits

No UI changed, so no new browser screenshots or accessibility/localization pass is claimed. No schema migration, backfill, build, production rollout or performance certification was performed. The second indexed lookup is required only when the key is absent; actual production latency remains unmeasured. Financial payload verification and authorization remain with each domain command. Concurrent losers may receive the existing uniqueness/serialization error and safely retry; no universal concurrency success guarantee is claimed.

The database still permits one batch per source/purpose. Repeated suspense correction, cycle-aware immutable evidence, compensation, reopening, later posting and the integrated EN/FR journey remain required engineering. No identity suffix workaround or weakened uniqueness was introduced. The v94 alert-trigger removal remains held. Coverage 229 provisional / 0 whole verified / 209 unmapped; the full goal remains active.
