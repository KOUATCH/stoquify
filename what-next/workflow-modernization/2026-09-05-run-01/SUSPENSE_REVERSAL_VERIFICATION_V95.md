# Suspense reversal boundary verification — v95

2026-09-09T08:43:31.733Z. Branch `codex/migration-control-plane-release-2026-08-29`, HEAD `a05a41ef66cd5d98fd69ae3df18225795f912232`; shared dirty tree preserved. [Baseline](evidence/source-baseline-v95.json), [receipt](evidence/suspense-reversal-v95.json), [user/rollout guidance and required correction lifecycle](SUSPENSE_CORRECTION_BOUNDARY.md).

## Evidence

- Before: actual owned synthetic proposal/approval produced consistent suspense/ledger evidence. Generic reversal then created a posted counter-journal and reversed the original without updating suspense; the ledger truth verifier rejected the mismatch. `lanes/environment/suspense-reversal-v95-before-a5a4aa0c-68f.json` (7e3311 exit 0) is a successful defect reproduction, not a passing financial invariant. That synthetic defect fixture remains retained.
- After: four owned PostgreSQL checks (5bf724 exit 0) verify initial consistent posting, durable refusal with unchanged journals/batches/source links/suspense/notification state, repeated refusal without duplicate financial effects, and foreign-tenant rejection. Ledger truth remains valid.
- 29 tests/five suites: final session 84602 exit 0. Ordinary controlled manual reversal and close invalidation, customer-settlement source ownership, new suspense ownership, existing suspense posting and EN/FR journal-table behavior. Initial focused session 8697 also passed 29/five; final run saved the machine-readable receipt.
- Actual EN/FR browser, session 95957 exit 0: real synthetic suspense posting, normal sign-in, retained journal/explanation with no generic Reverse button, mobile/tablet/desktop horizontal-table access, 200% text/reduced motion, reload with no reversal/source-state change. Ten screenshots; English desktop and French 320px views visually inspected. No page errors; source and unrelated financial records unchanged.
- Typecheck session 34054 exit 0 (4a077b); four-file lint session 45905 exit 0 (147662). No schema change/migration, live financial operation, external message, production build/deployment or backfill.

## Commands

Inspected direct bundled Node commands avoid migration/seed hooks.

### tests

```text
node node_modules/jest/bin/jest.js --runInBand --runTestsByPath "app/[locale]/(dashboard)/dashboard/accounting/journals/__tests__/page.test.tsx" "services/reconciliation/__tests__/payment-suspense-ledger.service.test.ts" "services/accounting/__tests__/posting.service.test.ts" "services/reconciliation/__tests__/payment-suspense-workflow.service.test.ts" "services/accounting/__tests__/journal-close-invalidation.service.test.ts" --json --outputFile="what-next/workflow-modernization/2026-09-05-run-01/evidence/suspense-reversal-final-v95.json"
```

### typecheck

```text
node node_modules/typescript/bin/tsc --noEmit --incremental false --pretty false
```

### before

```text
node what-next/workflow-modernization/2026-09-05-run-01/lanes/environment/verify-suspense-reversal-boundary-v95.cjs before
```

### after

```text
node what-next/workflow-modernization/2026-09-05-run-01/lanes/environment/verify-suspense-reversal-boundary-v95.cjs after
```

### browser

```text
node what-next/workflow-modernization/2026-09-05-run-01/lanes/environment/verify-suspense-reversal-browser-v95.cjs
```

### baseline

```text
node what-next/workflow-modernization/2026-09-05-run-01/capture-source-baseline.cjs
```

### lint

```text
node node_modules/eslint/bin/eslint.js services/accounting/posting.service.ts services/accounting/__tests__/posting.service.test.ts "app/[locale]/(dashboard)/dashboard/accounting/journals/page.tsx" "app/[locale]/(dashboard)/dashboard/accounting/journals/__tests__/page.test.tsx"
```

## Limits

The source-owned correction/resolution workflow is still missing. This patch prevents an observed bypass; it does not clear suspense, reverse a source posting safely, implement write-off or establish period-close readiness. Source versioning, linked corrections, approvals, compensation, current obligations and history remain required. Existing generic reversal exposure for other source types and action fresh-auth provenance require further review.

New notice text is localized, while the wider journal page retains historical English text and currency rounding visible in the screenshots. No full-route localization, full screen-reader/contrast or production performance certification is claimed. Browser load observations: en 89456 ms, fr 5708 ms. The English first load was slow; cold compilation is a possible factor, not a proven root cause or acceptable performance result.

The v94 alert cutover remains held by automatic approval review. No change to that trigger or schedule occurred, and no repeated permission request was needed for this independent work.

PR-13 registers the missing linked correction workflow explicitly. Coverage: 229 provisional / 0 whole verified / 209 unmapped entry sources. The full goal remains active.
