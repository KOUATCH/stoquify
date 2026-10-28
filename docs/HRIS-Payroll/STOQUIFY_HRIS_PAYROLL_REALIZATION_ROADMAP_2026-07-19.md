# Stoquify HRIS–Payroll Selective-Rebuild Realization Roadmap

Date: 2026-07-19  
Status: Active  
Release posture: Controlled local pilot only

## Program objective

Make HRIS the exclusive owner of people and employment truth while preserving the proven Payroll financial/statutory kernel. Payroll must consume immutable certified HRIS snapshots; Accounting owns ledger truth; Assurance proves the chain.

## Authoritative skill chain

Use `aqstoqflow-hris-payroll-00` through `18` as the primary dependency chain. Treat `stoquify-hris-*` and `aqstoqflow-hrpayroll-*` as reusable compatibility/domain skills, not competing orchestrators. Do not create another full suite.

Missing capabilities must be added only as narrow staged skills or contracts for:

- Direct-writer inventory and enforcement
- Metadata-to-relational migration
- Persisted immutable snapshot architecture
- Legacy-writer retirement certification
- Module dependency enforcement
- Characterization-test-led Payroll decomposition

## Phases and gates

| Phase | Deliverable | Entry gate | Exit gate | Status |
|---|---|---|---|---|
| 0 Evidence/governance | Canonical status, supersession, ownership, dependency plan | Governing reports readable | Consistency grep; one next tranche | Completed 2026-07-19 |
| 1 Ownership freeze | Direct-writer inventory and HRIS adapter ratchets | Phase 0 closed | No new direct writer; focused tests | Employee slice completed; other domains pending |
| 2 Canonical People Core | Effective-dated relational identity/org schema | Ownership frozen | Migration, tenant, duplicate and rollback tests | Pending |
| 3 Exclusive HRIS writers | Contract, compensation, destination, lifecycle adapters | Canonical contracts stable | Legacy calls route through HRIS | Pending |
| 4 Immutable input snapshot | Persisted versioned HRIS-to-Payroll snapshot | Readiness rules complete | Mutation/diff/correction tests | Pending |
| 5 Metadata migration | JSON projections moved to constrained models | New models deployed | Idempotent backfill and reconciliation | Pending |
| 6 HRIS completion | Org, documents, schedules, leave, attendance | Relational core ready | Domain and approval gates pass | Pending |
| 7 Payroll decomposition | Split control hotspot behind characterization tests | Snapshot boundary stable | Behavioral parity and rollback | Pending |
| 8 Shadow/reconcile | Old/new projections and Payroll outputs compared | Migration tooling ready | No unexplained difference | Pending |
| 9 Tenant/country pilot | Multi-scenario Cameroon pilot | Shadow gate passes | Close pack and owner sign-off | Pending |
| 10 Legacy retirement | Remove compatibility writers after zero callers | Pilot proven | Static zero-caller certification | Pending |
| 11 Production certification | Full security, statutory, browser, migration and environment proof | All prior phases complete | Independent GO decision | Blocked |

## First executable tranche

1. Retain existing Payroll action names and access contracts.
2. Route Payroll employee profile/evidence mutations through the HRIS facade.
3. Return HRIS ownership metadata through the compatibility action.
4. Add a static boundary ratchet against new physical-writer imports.
5. Run focused action/service tests.
6. Save the employee-identity completion report.

Non-goals: no schema rename, broad HRIS feature, contract/compensation/destination migration, module packaging change, Payroll formula change, production backfill, or service decomposition.

## Program release rule

No later phase may convert an earlier failure into a warning. Each tranche must preserve tenant isolation, RBAC, fresh authentication, maker-checker controls, audit evidence, redaction, idempotency, immutability, and correction/rollback capability.
