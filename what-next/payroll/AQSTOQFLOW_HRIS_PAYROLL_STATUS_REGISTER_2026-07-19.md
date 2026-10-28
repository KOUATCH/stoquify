# AqStoqFlow HRIS–Payroll Canonical Status Register

Date: 2026-07-19  
Skill: `aqstoqflow-hris-payroll-01-status-register`  
Release posture: **controlled local pilot only; NO-GO for unrestricted production**

## Governing decision

Adopt the selective-rebuild decision in `docs/HRIS-Payroll/STOQUIFY_HRIS_PAYROLL_ARCHITECTURE_DECISION_2026-07-19.md`:

- Preserve the Payroll kernel and downstream evidence chain.
- Rebuild HRIS/People Core as the exclusive upstream owner.
- Maintain one canonical employee identity.
- Replace parallel writers with compatibility adapters.
- Persist immutable certified HRIS-to-Payroll snapshots.
- Migrate incrementally with shadowing, reconciliation, and rollback.

## Status classification

| Capability or evidence | Classification | Current interpretation | Next owner |
|---|---|---|---|
| Payroll kernel, runs, corrections, payslips | Controlled-pilot-ready | Preserve; not a rewrite target | Payroll |
| Payment, declaration, accounting and assurance lanes | Controlled-pilot-ready / environment-blocked | Preserve; production proof remains open | Payroll, Accounting, Assurance |
| DB immutability for finalized Payroll artifacts | Closed for current workspace | Target databases still require migration/runtime proof | Payroll/Assurance |
| HRIS facade, People routes, permissions, focused tests | Implemented compatibility layer | Useful but not final ownership architecture | HRIS |
| Exclusive HRIS writer boundary | Open | Parallel Payroll actions remain | HRIS architecture |
| Canonical employee identity | Ready for consolidation | Reuse current row; no duplicate master | HRIS |
| First-class org/reporting/position model | Open | Current manager scope is incomplete | HRIS |
| Relational lifecycle/document governance | Open | Core state remains partly in metadata | HRIS/Data |
| Full time/leave/attendance source engine | Open | Current layer certifies aggregates | HRIS |
| Immutable persisted HRIS input snapshot | Open / partial | Hash proof exists; aggregate boundary is incomplete | HRIS/Payroll |
| HRIS module entitlement dependency | Open | Permission split exists; commercial module ownership is ambiguous | Module control plane |
| Statutory country-pack breadth | Open / external-review blocked | No unreviewed formula promotion | Regulatory |
| Provider settlement and authority filing | Open / environment blocked | Local fixtures are not production proof | Payroll integrations |
| Migration pilot | Controlled-local-pilot-only | One tenant, Cameroon fixture, one employee | Data migration |
| Full typecheck | Open | Prior 8 GB run ended in V8 OOM | Release engineering |
| Unrestricted production | Blocked | Evidence is incomplete | Assurance |

## Supersession map

- The July 12 status and roadmap remain historical design evidence.
- The July 14 current-state register is superseded where it describes missing HRIS folders or selects the facade as future work; those surfaces now exist.
- The July 17 final-readiness report remains authoritative for its bounded local pilot and NO-GO decision.
- The July 19 architecture decision is authoritative for target ownership and implementation direction.

## Do-not-weaken constraints

- No UI-derived Payroll truth.
- No second employee master.
- No direct Payroll mutation of HR-owned facts after a caller is migrated.
- No calculation without certified readiness.
- No finalized-state destructive update.
- No statutory formula without provenance and expert review.
- No payment or filing without approved evidence.
- No production backfill without dry-run, idempotency, reconciliation, rollback, and sign-off.
- Preserve tenant isolation, RBAC, fresh auth, maker-checker, audit, and redaction.

## Phase entry decision

Phase 0 evidence/governance is ready once this register, the source-truth map, and the orchestrator report pass consistency checks. Phase 1 may begin only with the employee writer-consolidation tranche. Broader HRIS schema or Payroll refactoring is not yet authorized by this gate.

## Verification and skipped checks

Required evidence terms: HRIS, Payroll, Accounting, Assurance, open, controlled pilot, superseded, unrestricted production, immutable snapshot, direct writer, tenant, RBAC, audit, and redaction.

No production code, schema, browser, external integration, or tenant data was changed by this status-register slice.

## Next handoff

`aqstoqflow-hris-payroll-02-source-truth-map`.

