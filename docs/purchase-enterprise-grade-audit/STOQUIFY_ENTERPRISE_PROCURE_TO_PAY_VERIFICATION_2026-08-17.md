# Stoquify Procure-to-Pay Verification Ledger

Date: 2026-08-17  
Mode: read-only/static verification; generated reports redirected into the audit evidence folder  
Result: **8 checks passed; 1 release gate failed with one active inventory-boundary violation**

## Preservation approach

The package scripts for several gates normally write to what-next. To preserve the dirty worktree and existing generated evidence, equivalent fail-mode Node commands were executed with output paths redirected to docs/purchase-enterprise-grade-audit/evidence. No migration, reset, reseed, supplier payment, provider call, or runtime business mutation was performed.

## Exact results

### Purchasing/AP consolidation

Command:

    node scripts/purchasing-ap-consolidation-gate.js --mode fail --out docs/purchase-enterprise-grade-audit/evidence/purchasing-ap-consolidation-readiness.md --json-out docs/purchase-enterprise-grade-audit/evidence/purchasing-ap-consolidation-readiness.json

Result: PASS, exit 0. Checks ready: 11/11. Blockers: 0.

### AP fraud controls

Command:

    node scripts/ap-fraud-control-readiness.js --mode fail --out docs/purchase-enterprise-grade-audit/evidence/ap-fraud-control-readiness.md --json-out docs/purchase-enterprise-grade-audit/evidence/ap-fraud-control-readiness.json

Result: PASS, exit 0. Checks ready: 9/9. Gaps: 0.

### Inventory boundary

Command:

    node scripts/inventory-boundary-gate.js --mode fail --out docs/purchase-enterprise-grade-audit/evidence/inventory-boundary-readiness.md --json-out docs/purchase-enterprise-grade-audit/evidence/inventory-boundary-readiness.json

Result: **FAIL, exit 1.** Active violations: 1. Allowed kernel/test findings: 27. The active violation is scripts/supplier-po-ack-e2e-fixture.js:195, inventoryLevel.create, classified SCRIPT_STOCK_MUTATION because a runtime-like script must use the stock-event kernel or be explicitly and safely classified seed-only.

### Service boundary

Command:

    node scripts/service-boundary-gate.js --mode fail --out docs/purchase-enterprise-grade-audit/evidence/service-boundary-readiness.md --json-out docs/purchase-enterprise-grade-audit/evidence/service-boundary-readiness.json

Result: PASS, exit 0. Active service-boundary violations: 0. Allowed test/mock/service findings: 13.

### Workflow-assurance runtime tables

Command:

    node scripts/workflow-assurance-runtime-table-check.js --mode fail --out docs/purchase-enterprise-grade-audit/evidence/workflow-assurance-runtime-readiness.md --json-out docs/purchase-enterprise-grade-audit/evidence/workflow-assurance-runtime-readiness.json

Result: PASS, exit 0. Runtime tables: 7/7. Migration rows: 3/3. This was a read-only database metadata check; it did not apply migrations.

### Prisma schema

Command:

    npm run prisma:validate

Result: PASS, exit 0. Prisma reported that prisma/schema.prisma is valid.

### TypeScript

Command:

    npm run typecheck

Result: PASS, exit 0. tsc --noEmit completed without diagnostics.

### Attached-prompt exact Jest path set

Command:

    npx jest --runTestsByPath services/purchase-order/__tests__/purchase-order.service.test.ts services/purchase-order/__tests__/purchase-order-receive-batch.service.test.ts actions/purchaseOrderWorkflow/__tests__/purchaseOrderSystemAction.test.ts services/purchasing/__tests__/ap-control.service.test.ts actions/purchasing/__tests__/ap-control.actions.test.ts services/purchasing/__tests__/ap-history.service.test.ts --runInBand

Result: PASS, exit 0. Test suites: 6/6. Tests: 45/45. Snapshots: 0.

### Additional audit-focused Jest set

Command:

    npx jest services/purchase-order/__tests__/purchase-order.service.test.ts services/purchasing/__tests__/ap-control.service.test.ts actions/purchasing/__tests__/ap-control.actions.test.ts services/inventory/__tests__/inventory-stock-event.service.test.ts scripts/__tests__/purchasing-ap-consolidation-gate.test.js scripts/__tests__/ap-fraud-control-readiness.test.js --runInBand

Result: PASS, exit 0. Test suites: 6/6. Tests: 50/50. Snapshots: 0.

## Interpretation

Static purchasing/AP and fraud controls are strong, the protected service boundary is clean, required workflow-assurance tables are present, schema/type checks pass, and both focused test selections pass. This does not cancel the inventory gate failure and does not prove the proposed receipt-concurrency, inspection, GRNI, match-exception, return/credit, document-storage, browser, accessibility, migration, or provider behaviors. Those remain explicit implementation and release gates.

