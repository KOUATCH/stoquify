# Stoquify Public HRIS Capability Status

**Date:** 2026-07-18
**Purpose:** Evidence boundary for public landing-page representation
**Public positioning:** Controlled, evidence-backed HRIS foundation
**Unrestricted production claim:** Not approved by the latest final-readiness decision

## Repository Evidence

The architecture graph identifies a connected attendance-to-payroll operating story. Direct repository inspection confirms dedicated HRIS routes, actions, services, components, permissions, and tests.

### Implemented Surfaces

| Capability | Repository evidence | Public wording |
| --- | --- | --- |
| People directory and profiles | dashboard/people and dashboard/people/[employeeId] routes; employee service and tests | Permission-scoped people records |
| Employee self-service | dashboard/people/me; HrisEmployeeSelfService; self-service service and tests | Own-record self-service |
| Manager scope | dashboard/people/team; HrisManagerSelfService; manager self-service and organization-scope services | Scoped manager workspace |
| Approval inbox | dashboard/people/approvals; approval actions, service, component, and tests | Controlled people-change approvals |
| Movement history | dashboard/people/history; movement-history service, component, and tests | Redacted people-change evidence |
| Contracts and lifecycle | HRIS contract and lifecycle services/actions/tests | Effective-dated contract controls |
| Compensation | HRIS compensation services/actions/tests | Approved compensation changes |
| Time and leave | HRIS time-leave services/actions/tests | Time and leave inputs |
| Document evidence | HRIS document-evidence service and tests | Redacted document evidence |
| Payment destination | HRIS payment-destination services/actions/tests | Controlled payment-destination changes |
| Payroll readiness | HRIS payroll-readiness contract and payroll integration evidence | Certified downstream payroll inputs |
| Permissions | Dedicated hris permissions and route-level access checks | Role-controlled HRIS access |

## Operating Boundary

- HRIS owns people identity, organization scope, contracts, compensation, time, leave, approved changes, and movement evidence.
- Payroll remains a separate execution boundary. It consumes certified people facts for calculations, payslips, declarations, payments, and posting.
- Accounting owns ledger truth and close decisions.
- External providers and statutory authorities own their acknowledgements and settlement or filing states.
- Public copy must not collapse these states into one generic completed status.

## Latest Readiness Decision

The latest report, what-next/payroll/STOQUIFY_HRIS_FINAL_READINESS_2026-07-17.md, records:

- Controlled local migration pilot accepted for that scope.
- Focused HRIS tests and policy gates passed in that run.
- Unrestricted production release remained no-go.
- Environment, deployment, provider, authority, and final release evidence remained outstanding.
- The report also recorded a full-project typecheck OOM.

During this landing refinement, npm run typecheck completed successfully. That is useful new evidence, but it does not by itself recertify the HRIS release decision or clear environment-specific blockers.

## Deferred Release Work

1. Rerun the complete HRIS final-readiness sequence against the current tree.
2. Capture production-like deployment and database-target evidence.
3. Prove identity, receipt-token, and history-cursor secrets in the target environment.
4. Replay provider settlement, statutory authority, and accounting-close integrations in staging or production-like conditions.
5. Run the broader cross-browser HRIS accessibility and RBAC suite.
6. Resolve the focused Jest worker teardown warning recorded by the latest readiness report.
7. Complete native French terminology and diacritic review.

## Landing Decision

The landing page may truthfully present HRIS as an implemented, permission-gated foundation with people records, contracts, compensation, time and leave, approvals, self-service, movement evidence, and payroll-readiness integration.

The landing page must also state that unrestricted production promotion remains gated. It must not claim universal tenant readiness, completed statutory filing, provider settlement, or unrestricted production certification.
