# Suspense posting cycles verification — v97

2026-09-09T09:18:39.614Z. Branch `codex/migration-control-plane-release-2026-08-29`, HEAD `a05a41ef66cd5d98fd69ae3df18225795f912232`; shared dirty tree preserved. [Baseline](evidence/source-baseline-v97.json), [receipt](evidence/suspense-cycles-v97.json), [operator and rollout guide](SUSPENSE_POSTING_CYCLES.md).

## Evidence

- Six exact-SQL rehearsal checks: lanes/environment/suspense-cycle-migration-v97-bd798055-3ed.json, dabc68 exit 0. All DDL and synthetic rows rolled back; original schema and row hashes restored.
- Owned-target application: lanes/environment/suspense-cycle-apply-v97-b158b081-f10.json, session 40982 / 608a51 exit 0. Existing fields unchanged, all old rows cycle 1, exact applied migration registered through Prisma and checksum verified. No other pending migration or live target invoked.
- Prisma generation initially failed with a locked Windows query engine DLL (session 57433). Owned app launcher 22712, child 8508 and server 20532 were verified; only that server was stopped. Old launcher session 71557 exited 0. Regeneration session 29581 exited 0; replacement launcher session 16833 confirmed ready on loopback port 3110.
- Schema validation d421b0 exit 0. Migration catalog 3d1114 exit 0, ready, 85 migrations; existing grandfathered timestamp exception preserved.
- Five owned runtime checks: lanes/environment/suspense-cycle-runtime-v97-c50557bf-22e.json, bcef31 exit 0. Actual initial suspense approval/ledger truth, original receipt retry, legacy cycle-one lookup, later-cycle-key refusal, unactivated-cycle isolation and retained generic reversal guard. Pre-existing financial records unchanged.
- 192 tests / 13 suites: session 33818, 3898f9 exit 0, covering shared identity and directly affected accounting/reconciliation/customer-settlement/inventory/AP/payroll/POS callers.
- Actual EN/FR browser: lanes/environment/suspense-cycle-v97-browser-03f56319-c39.json, session 49600, 191331 exit 0; synthetic initial posting, normal sign-in, retained journal/evidence, localized unavailable-correction explanation, 320/390/768/1440 widths, 200% text, reduced motion and reload nonmutation. Ten screenshots; English desktop and French 320 visually inspected. No page errors.
- First typecheck session 45996 failed with TS6053 while the restarting Next app removed/rebuilt generated route files. Stable follow-up session 36232 completed successfully; no compiler exclusions or source weakening applied. Two-file lint 9a6477 exit 0.
- Browser-helper creation initially failed under workspace sandbox (2f198d), followed by MODULE_NOT_FOUND on that attempted launch (8b3d57). The new versioned helper was then written with reviewed escalation (c5e0d4) and ran successfully. No browser outcome claimed for the failed launch.
- Source baseline d76877 exit 0; stored source and migration hashes checked before publication.

## Commands

Inspected direct bundled Node commands avoid default build/seed hooks. Rehearsal/apply/publisher helpers are one-use records; do not rerun them against the migrated schema.

### tests

```text
node node_modules/jest/bin/jest.js --runInBand --runTestsByPath "services/accounting/postings/post-sale.test.ts" "services/payroll/__tests__/payroll-control.service.test.ts" "services/accounting/postings/post-payment.test.ts" "services/accounting/__tests__/posting-batch-identity.test.ts" "services/purchasing/__tests__/ap-control.service.test.ts" "services/accounting/postings/post-reversal.test.ts" "services/accounting/__tests__/customer-settlement.service.test.ts" "services/accounting/__tests__/customer-settlement-reversal.service.test.ts" "services/reconciliation/__tests__/payment-suspense-workflow.service.test.ts" "services/inventory/__tests__/inventory-adjustment.service.test.ts" "services/accounting/__tests__/posting.service.test.ts" "services/inventory/__tests__/inventory-adjustment-reversal.service.test.ts" "services/reconciliation/__tests__/payment-suspense-ledger.service.test.ts" --json --outputFile="what-next/workflow-modernization/2026-09-05-run-01/evidence/suspense-cycles-tests-v97.json"
```

### rehearsal

```text
node what-next/workflow-modernization/2026-09-05-run-01/lanes/environment/verify-suspense-cycle-migration-v97.cjs
```

### apply

```text
node what-next/workflow-modernization/2026-09-05-run-01/lanes/environment/apply-suspense-cycle-migration-v97.cjs
```

### runtime

```text
node what-next/workflow-modernization/2026-09-05-run-01/lanes/environment/verify-suspense-cycle-runtime-v97.cjs
```

### browser

```text
node what-next/workflow-modernization/2026-09-05-run-01/lanes/environment/verify-suspense-cycle-browser-v97.cjs
```

### generate

```text
node node_modules/prisma/build/index.js generate
```

### schema

```text
node node_modules/prisma/build/index.js validate
```

### catalog

```text
node scripts/prisma-migration-catalog-gate.js --mode write --out what-next/workflow-modernization/2026-09-05-run-01/evidence/suspense-cycle-catalog-v97.json
```

### typecheck

```text
node node_modules/typescript/bin/tsc --noEmit --pretty false
```

### lint

```text
node node_modules/eslint/bin/eslint.js services/accounting/posting.service.ts services/accounting/__tests__/posting-batch-identity.test.ts
```

## Limits

Storage structure is implemented; full correction lifecycle remains missing. A cycle-two isolation fixture is explicitly unactivated and has no journal/approval. Cycle-aware domain command, immutable proposal/decision history, compensation/reopening, later posting and complete EN/FR recovery remain required. No production deployment, customer activation, real payment, external message or X1 clearance.

Browser load observations: English 42381 ms, French 2994 ms. The slow first route remains an open development performance observation. Wider journal English copy, fractional-currency rounding and full accessibility remain open; these screenshots are not full-route localization/financial display certification.

The expanded schema must precede the regenerated client. Unrelated domains remain cycle 1 by SQL constraint. Old code must not be used after real later cycles are activated; forward recovery and schema-contraction restrictions are documented. Alert-trigger cutover remains separately held. Coverage 229 provisional / 0 whole verified / 209 unmapped. Full assignment remains active.
