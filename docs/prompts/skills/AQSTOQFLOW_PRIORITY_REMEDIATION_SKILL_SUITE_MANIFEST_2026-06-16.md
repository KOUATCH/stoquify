# AqStoqFlow Priority Remediation Skill Suite Manifest

Date: 2026-06-16

## Source Material

- what-next/AQSTOQFLOW_ENTERPRISE_SYSTEM_EXAMINATION_REPORT_2026-06-16.md
- what-next/AQSTOQFLOW_STATUTORY_SERVICE_MODERNIZATION_SCAN_2026-06-16.md
- what-next/AQSTOQFLOW_CERTIFICATION_ASSURANCE_SCAN_2026-06-16.md
- what-next/AQSTOQFLOW_SERVICE_BOUNDARY_GATE_REPORT_2026-06-16.md
- what-next/AQSTOQFLOW_010_INVENTORY_VALUATION_KERNEL_CONTINUATION_REPORT_2026-06-15.md
- graphify-out/GRAPH_REPORT.md

## Suite Order

| Priority | Skill | Risk Solved | Depends On | First Verification Command |
| --- | --- | --- | --- | --- |
| 001 | `priority-001-green-baseline-ratchets` | Without a stable baseline, later remediation can mix real regressions with pre-existing noise and make release hardening unreliable. | None. | `npm run prisma:validate` |
| 002 | `priority-002-service-boundary-ratchets` | Direct Prisma and action-owned economic mutation can bypass tenant isolation, RBAC, audit, typed errors, open-period controls, and service-owned business rules. | priority-001-green-baseline-ratchets. | `node --check scripts/service-boundary-gate.js` |
| 003 | `priority-003-tenant-rbac-maker-checker` | Legacy actions and routes can accept caller-supplied organization scope or permit approval/posting without proven actor segregation. | priority-001-green-baseline-ratchets and priority-002-service-boundary-ratchets. | `npm test -- services/_shared --runInBand` |
| 004 | `priority-004-inventory-item-action-migrator` | Old item and inventory actions still expose direct item mutation, mock inventory data, transfer/reservation logic, hard deletes, and incomplete count/adjustment/write-off service ownership. | priority-001 through priority-003. | `npm run inventory:boundary:fail` |
| 005 | `priority-005-purchasing-ap-consolidator` | Split ownership between services/purchase-order and services/purchasing can bypass AP controls, raw error handling, receipt stock discipline, ledger evidence, reconciliation, and country-pack blockers. | priority-001 through priority-004. | `npm test -- services/purchasing services/purchase-order actions/purchasing --runInBand` |
| 006 | `priority-006-hard-delete-immutability` | Economic or audit-bearing records can be physically deleted instead of cancelled, reversed, soft-deleted, or draft-cleaned with evidence. | priority-001 through priority-005 where domain deletes depend on canonical services. | `node scripts/hard-delete-gate.js --mode report` |
| 007 | `priority-007-error-response-normalizer` | Raw throw/rethrow/console error patterns can leak internals, produce inconsistent UX, and bypass error classifications needed for support and controls. | priority-001 through priority-006. | `npm test -- services/_shared lib/error-handling actions app/api --runInBand` |
| 008 | `priority-008-demo-report-trust-cleaner` | Mock inventory, monitoring, and report placeholders can make dashboards and reports appear more operationally trustworthy than their evidence supports. | priority-001 through priority-007. | `rg -n "Mock implementation|mockItems|mockTransactions|mockAdjustments|mockTransfers|demo route|TODO: Update the import path" actions app components lib services` |
| 009 | `priority-009-offline-pos-replay-finalizer` | Offline POS accepted envelopes remain pending replay and cannot yet become final legal or accounting truth safely. | priority-001 through priority-008, especially inventory and error normalization. | `npm test -- services/pos services/inventory services/compliance services/accounting services/payments --runInBand` |
| 010 | `priority-010-certification-assurance-hardener` | The system has internal evidence certification language, but automatic invalidation, inventory valuation annexes, and truthful statutory blockers require stronger service-owned controls. | priority-001 through priority-009 where inventory/offline evidence affects close readiness. | `node C:\Users\J COMPUTER\.codex\skills\aqstoqflow-certification-assurance-hardener\scripts\certification-assurance-scan.js --root .` |
| 011 | `priority-011-compliance-provider-integration` | Provider credentials, authority adapters, country-pack expert review, statutory payroll parameters, and external statements remain incomplete, so production/legal readiness can be overstated. | priority-001 through priority-010. | `npm test -- services/compliance services/payments services/payroll services/accounting --runInBand` |
| 012 | `priority-012-ci-release-gate-modernizer` | Deprecated lint commands, no-lint builds, and disconnected policy gates can let regressions pass release checks. | priority-001 through priority-011, or run earlier only in report mode. | `npm run verify:repo` |

## Ordering Rationale

The suite follows the examination report order: preserve the green baseline, stop new service-boundary bypasses, harden tenant/RBAC controls, migrate protected economic truth paths, enforce immutability, normalize errors, remove mock/report trust gaps, finish offline and certification evidence, then ratchet release gates.

## Execution Rule

Run skills in numeric order unless production breakage requires a narrow emergency fix. Every implementation run must save a completion report under `what-next/` before the next priority skill starts.
