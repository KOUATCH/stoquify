# Stoquify HRIS Approval Inbox

Date: 2026-07-15

## Executive decision

This slice adds a federated, tenant-scoped HRIS approval inbox over existing domain-owned workflow truth. It does not introduce a second approval ledger or allow the UI to manufacture workflow state.

Lifecycle, contract activation, contract-document evidence, compensation assignment, salary change, and payment-destination workflows can now be reviewed from one People workspace. Every decision is re-authorized server-side, checked against manager scope and segregation-of-duties rules, then delegated to the owning domain service so its audit, event, revision, and state-transition controls remain authoritative.

## Implemented

- Added a redacted approval projection with explicit domain, stage, status, allowed-decision, readiness-blocker, and ownership metadata.
- Scoped reads and decisions by active organization and the existing HRIS people-access resolver.
- Added a generic fresh-auth decision boundary that derives organization, actor, permissions, and manager scope on the server.
- Added salary-change rejection through the HRIS compensation facade instead of exposing the payroll service directly to the UI.
- Exported strict pending-state decoders for contract activation, document evidence, and compensation assignment metadata.
- Added a compact People approval route with Review/Apply modes, domain filtering, evidence capture, safe disabled states, and generic stale-state errors.
- Added an Approvals entry to the People workspace without changing the main application sidebar.
- Recorded approval-inbox reads in the HRIS audit trail; decisions continue to emit the owning domain's audit and business events.
- Returned deterministic blocker codes while pending approval work exists, ready for the later payroll-input readiness integration.

## Workflow and segregation-of-duties behavior

| Domain | Review decisions | Apply decision | Separation enforced |
| --- | --- | --- | --- |
| Employee lifecycle | Approve, reject | Yes | Requester cannot review or apply |
| Contract activation | Approve | No separate apply stage | Requester cannot approve |
| Contract document | Approve | No separate apply stage | Uploader/requester cannot approve |
| Compensation assignment | Approve | No separate apply stage | Requester cannot approve |
| Salary change | Approve, reject | Yes | Requester, approver, and applier are separated |
| Payment destination | Approve, reject | Yes | Requester, approver, and applier are separated |

The inbox never trusts client-supplied tenant, actor, role, manager-scope, status, or salary/payment values. Sensitive amounts, destination details, document content, hashes, and internal actor identifiers are not exposed in the projection.

## Readiness behavior

An empty scoped inbox reports `READY`. Pending items report domain-specific blocker codes and counts. These blockers describe HRIS approval readiness only; they are not yet wired into the final payroll readiness contract. That integration belongs to the later input-readiness skill and must consume this service-owned projection or equivalent domain truth without trusting UI state.

## Verification

- Jest: 7 suites passed, 19 tests passed.
  - approval-inbox service aggregation, redaction, readiness blockers, audit, and segregation-of-duties matrix;
  - protected action derivation, field allowlist, fresh-auth, permissions, and revalidation;
  - component self-approval and stale/error-state safety;
  - route scoped loading and denied state;
  - compensation service/action compatibility and People workspace navigation.
- Focused ESLint: passed for all touched approval-inbox, compensation, route, component, and test files.
- TypeScript: isolated `tsc --noEmit --pretty false` passed (141.4 seconds).
- Runtime route probe: `GET /en/dashboard/people/approvals` returned the expected `307` to `/en/login` with the localized approvals URL preserved as `callbackUrl`.

## Data and migration impact

- No Prisma schema or migration was added.
- Existing domain rows and versioned metadata remain the source of truth.
- The inbox is a read projection plus a decision dispatcher, not a parallel workflow store.

## Explicit gaps

- Time, leave, overtime, and attendance currently have a certified payroll handoff, but the repository still lacks the operational request and correction ledgers required to produce actionable pending inbox items. This slice does not invent those records from aggregate certification metadata.
- Contract activation, contract-document evidence, and compensation assignment currently model approval but no explicit rejection transition. The inbox therefore exposes approval only for those domains. Rejection requires an owning-domain state machine, reason/evidence contract, audit event, and tests before it can be added safely.
- Authenticated browser and responsive visual validation was not completed because no authenticated test session was available. The protected route boundary was verified by HTTP probe.
- No broad repository build or full Jest run is claimed; verification stayed focused on this slice.

## Landing status

Ready for review. Focused tests, lint, TypeScript compilation, and the protected-route probe are green. Review and stage this slice separately from unrelated working-tree changes.

Before a production rollout, define the missing operational leave/attendance request ledger and decide whether contract, document, and compensation-assignment rejection transitions are required for the first HRIS release.

Git currently reports most prerequisite HRIS services, actions, routes, components, and tests as untracked, while `services/payroll/contract.service.ts` is a tracked modification. This approval slice should therefore land with the ordered HRIS foundation or after those prerequisite slices are committed; it is not an independently stageable patch in the present working tree.

## Next logical skill

Run `stoquify-hris-12-movement-history` next. It should assemble a tenant-scoped, redacted chronology from the domain events and immutable revision lineage without treating the approval inbox as a new source of truth.
