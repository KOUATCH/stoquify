# Stoquify HRIS Movement History

Date: 2026-07-15

## Executive decision

This slice adds a tenant-scoped, redacted HRIS movement read model over existing domain records, immutable business events, and explicitly linked audit evidence. It does not create a second employee, payroll, or audit truth store.

The history can explain employee source, lifecycle, contract, document, compensation, payment-destination, attendance, payroll-run, and payslip movements. Proof badges distinguish event-and-audit evidence from event-only and source-record-only evidence. Missing audit or event links are never upgraded into proof.

## Sources inspected

- Governing HRIS proposal, implementation analysis, targeted skill system, status register, and approval-inbox report.
- `prisma/schema.prisma` employee, contract, assignment, salary, payment-destination, attendance, payroll-run, payslip, business-event, and audit models.
- Existing HRIS lifecycle, contract, document, compensation, payment-destination, attendance, people-scope, and approval services.
- Payroll employee, contract, compensation, payment evidence, control, and payslip event producers.
- Shared security redaction policy and existing People workspace patterns.

No usable `graphify-out` architecture report was present for this slice, so current source and Prisma contracts were treated as authoritative.

## Implemented

- Added a normalized movement catalog for 29 explicit HRIS/payroll event types across nine domains.
- Resolved the authorized employee set before deriving domain source identifiers.
- Constrained business-event reads by organization, allowlisted event type, and scoped source identifiers.
- Expanded payroll-run events through scoped employee run lines without exposing financial amounts.
- Added period, employee, department, location, domain, outcome, risk, proof-state, and cursor inputs at the service boundary.
- Added deterministic proof states:
  - `AUDIT_AND_EVENT`: applied hashed event with an explicit audit reference;
  - `EVENT_ONLY`: hashed business event without an explicit audit link;
  - `SOURCE_RECORD_ONLY`: source row without event proof;
  - `FAILED_EVENT`: failed or rejected event;
  - `UNPROVEN`: no qualifying proof.
- Added source-only payslip chronology so a payslip record is visible without falsely claiming event or audit proof.
- Added read auditing with result counts and explicit assertions that raw payloads, before/after values, actor identifiers, and hashes were excluded.
- Added a compact People history route with search, domain, proof, and risk filters plus risk/proof badges.
- Added a visible warning when the bounded employee set reaches its 500-record safety limit.
- Added a History entry beside Approvals in the People workspace.

## Security and ownership decisions

- Route and service both require `hris.people.read` or stronger HRIS authority.
- Manager access continues to use the current managed-location responsibility resolver; it is not described as reporting-line authority.
- The service never trusts event payload employee identifiers for access. It maps events through scoped domain source records.
- Raw event payloads, audit `changes`, salary values, payment destinations, document contents, hashes, actor IDs, and internal evidence references are not returned.
- Event and audit identifiers are used server-side only to derive proof state.
- HRIS/domain services own people truth, payroll owns certified financial results, accounting owns ledger truth, and this service owns only the redacted read projection.

## Verification

- Jest: 4 suites passed, 10 tests passed.
  - proof-state consistency;
  - tenant and manager source filtering;
  - hostile salary, bank, actor, and hash payload redaction;
  - source-only proof behavior;
  - rendered DOM redaction and proof filtering;
  - protected route, denied state, and People navigation.
- Focused ESLint: passed for all eight movement service, component, route, navigation, and test files.
- TypeScript: the first full `tsc --noEmit --pretty false` pass succeeded in 249.9 seconds after the movement service, component, route, and tests were present.
- Runtime route probe: `GET /en/dashboard/people/history` returned the expected `307` to `/en/login` with the localized history URL preserved as `callbackUrl`.

## Current compiler drift

A final full TypeScript rerun after the last UI warning and navigation assertion was blocked exclusively by unrelated concurrent errors in `services/inventory/inventory-history-background-export.service.ts`. The diagnostics concern its schema version, encrypted artifact shape, missing `artifactDeletionState`, and missing `chunkReferences`/`chunkReferenceSchema`; no HRIS movement-history file appeared in the diagnostics.

The final HRIS files still pass their focused Jest and ESLint gates. The repository-wide compiler must be rerun after the inventory export work stabilizes before landing the combined working tree.

## Data and migration impact

- No Prisma schema or migration was added.
- Business events, audit logs, and domain rows remain authoritative.
- The movement service is a read projection and writes only its own read-audit record.

## Explicit boundaries and residual risk

- Employee source discovery is bounded to 500 visible employees and 1,500 recent source rows per domain. The UI exposes the employee-limit state, but complete deep-history pagination still requires a dedicated source-ID pagination strategy.
- The current route loads 100 movements and its interactive filters operate on that loaded set. The service supports server-side filters and cursor input, but route-level cursor/filter synchronization is not yet implemented.
- A payslip source row remains `SOURCE_RECORD_ONLY` unless a qualifying event exists. It is intentionally not presented as audit-proven.
- Legacy records created before the current event producers may be absent or source-only. This service does not synthesize proof for missing historical evidence.
- Evidence detail drawers and exports remain deferred until sensitive-detail authorization, retention, export controls, and fresh-auth requirements are defined.
- Authenticated responsive browser and accessibility validation was not completed because no authenticated test session was available.

## Files changed

- `services/hris/movement-history.service.ts`
- `services/hris/__tests__/movement-history.service.test.ts`
- `components/hris/HrisMovementHistory.tsx`
- `components/hris/__tests__/HrisMovementHistory.test.tsx`
- `app/[locale]/(dashboard)/dashboard/people/history/page.tsx`
- `app/[locale]/(dashboard)/dashboard/people/history/__tests__/page.test.tsx`
- `app/[locale]/(dashboard)/dashboard/people/page.tsx`
- `app/[locale]/(dashboard)/dashboard/people/__tests__/page.test.tsx`

## Landing status

Ready for review as part of the ordered HRIS foundation. Movement behavior, redaction, tenant/manager scope, proof consistency, route protection, focused tests, and lint are green. Repository-wide TypeScript landing remains blocked by the unrelated inventory export diagnostics described above.

The broad working tree is already heavily staged and modified. Stage this ordered HRIS series separately or land its prerequisite slices first; no staging or commit was performed by this skill.

## Next logical skill

Run `stoquify-hris-13-payroll-readiness-contract` next. It should consume service-owned HRIS readiness and approval evidence without treating movement-history UI state or source-only chronology as payroll authorization.
