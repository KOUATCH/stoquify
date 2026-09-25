# Suspense authority and ownership — v88

Evidence date: 2026-09-09. Workflows PR-07 (assignment), PR-08 (proposal) and PR-09 (approval). This is a bounded authority correction; their full lifecycles remain incomplete.

## Delivered behavior

- Assignment, proposal and approval actions now apply the existing `payment_reconciliation` module write gate, as manual matching and sign-off already do. A denied write stops before the domain service runs.
- Approval forwards the verified sign-in time and validates its actor/tenant provenance. It no longer replaces that time with `Date.now()`. The existing fresh-auth guard remains effective.
- Assignment only accepts an active user found in the current organization. Foreign, missing and inactive users receive the same unavailable-assignee error without revealing account details. Successful assignment updates the suspense item, its open exceptions, audit evidence and in-app owner notice in one transaction.

The fix does not grant permissions, change a commercial package, activate a module, reopen a period or create an approval. The user membership check is admission-time validation; it does not prevent a later authorized deactivation. Concurrent membership changes and reassignment remain separate lifecycle work.

## What operators need

| Situation | Information needed | Owner and source | What to do |
| --- | --- | --- | --- |
| Assign an item | Suspense item and intended active workspace member | Reconciliation operator; current queue and organization member directory | Choose an active member of this organization. The existing queue's assignment button assigns the signed-in operator. A service/API consumer supplying another owner must obey the same scope. |
| Assignee unavailable | Organization and active member status | Workspace administrator; Settings → Users and member history | Verify the intended workspace and member status. Do not substitute a user ID from another organization. An authorized reactivation is a separate process. |
| Module write denied | Actual module state, eligibility and allowed operation | Workspace administrator; module settings and authoritative module controls | Review the restriction. This patch does not authorize removing a valid gate or changing prices/eligibility. Retained-access policy is not inferred from a failed write. |
| Approval needs fresh authentication | Current signed-in user and verification for the same organization | Approver; existing sign-in/step-up workflow | Complete the existing authentication step and retry the reviewed operation. Do not type a timestamp into a form or API payload. |
| Wrong authentication scope | Organization selected in the session | Approver and workspace administrator; active organization/session state | Return to the intended organization and reauthenticate. No approval should be generated from another tenant's assurance. |
| Assignment interrupted | Item ID, current owner and retained history | Operator; refreshed queue and audit/inbox evidence | Inspect the committed state before assigning again. Idempotent assignment retry and stale proposal review are not added by this patch. |

Source-confirmed routes: `/en/dashboard/finance/reconciliation` and `/fr/dashboard/finance/reconciliation`. No UI change or new route was made. These are routes to review, not newly passed browser journeys.

## Rollout and recovery

Deliver `actions/payments/reconciliation.actions.ts` and `services/reconciliation/payment-suspense-workflow.service.ts` together, retaining v87 period protections. No schema migration, seed or backfill is required. Before any authorized release, exercise permitted/denied real sessions and module states in an isolated cohort, plus EN/FR recovery and draft preservation.

Monitor unavailable-assignee and module/step-up denials separately from successful assignments. A permission denial may retain its control audit; it must not change ownership or post an inbox notice. Invalid-assignee failures roll the transaction back. Existing foreign ownership from before the fix is not automatically repaired: identify it, retain the evidence and use an authorized reassignment after reviewing the intended owner.

Reverting these changes restores the demonstrated access gaps. Do not use rollback to make a denied action succeed. If operation must be stopped during investigation, use existing authorized restrictions and retain records. No production deployment was performed.

## Remaining review and verification

1. Bind proposal/approval submissions to the evidence actually reviewed; prevent stale proposal overwrite and unsafe concurrent state changes.
2. Verify safe terminal approval retry and preserved drafts in the actual application, including interrupted responses and EN/FR feedback.
3. Verify real-session/module admission and assignee-directory behavior. The v88 wrapper integration tests use mocked identity and entitlement lookups; they are not authenticated browser evidence.
4. Review deactivation/reassignment races and existing cross-tenant ownership repair. Admission-time validation is not a lifetime guarantee that an owner stays active.
5. Review proposal account eligibility, exception metadata preservation, standalone suspense close obligations and delivery status.
6. Continue the platform register. No workflow becomes complete solely because this boundary passes.

## Engineering review matrix

| Responsibility | Finding / evidence / limit |
| --- | --- |
| Architecture/backend/API | Reused `protect`, module admission and verified-auth helper. Direct owner validation protects assignment's tenant object boundary. |
| Database/data integrity | Actual PostgreSQL proves scoped assignment and aligned exception/notice records; denial rollback verified. Historical invalid-owner repair remains open. |
| IAM/security/privacy/fraud | Module write enforcement and original authentication provenance tested through actual actions/wrapper. No foreign assignee details disclosed. Full live-session verification remains open. |
| Finance/reconciliation/ledger/audit | Ownership cannot cross the tenant boundary; denied assignments leave financial records unchanged. Existing period and posting controls preserved. |
| UI/design/UX/accessibility/localization | No UI/token changes; existing routes and hook callers traced. EN/FR, keyboard and responsive recovery remain unverified here. |
| Product/operations/support | Required owner/member/session inputs and their sources listed above. No measured productivity claim. |
| QA/release/SRE/cost | Focused regressions, actual persisted effects, lint and typecheck recorded with source hashes. No production latency or release certification. |
| Events/notifications/records | In-app owner evidence checked; external delivery not invoked. Permission denial audit retained. |
| Analytics/data governance | Scoped ownership protects record meaning; no analytics model changed. |
| Statutory/country rules | Not applicable to the patch: no jurisdictional rule, accounting recipe or filing changes. |
| POS/offline/AP/inventory/HRIS/payroll | Not applicable to the patch: no producer, payroll, stock or invoice implementation changes. Shared guards receive regression coverage. |
| AI/agents | Not applicable: no agent approval or tool boundary changed. |
| SaaS packaging/billing/growth | Existing module admission reused; no package, subscription term or billing changes. |

Selected skill: `009-aqstoqflow-payment-reconciliation-moat`. Bounded tenant, module, fresh-auth provenance, error, ledger-no-effect and evidence checks passed. Full UX, real-session and release gates remain open. Next numbered skill: `010-aqstoqflow-inventory-valuation-kernel` after outstanding reconciliation work.
