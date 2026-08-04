# Stoquify Workflow Remediation Roadmap — 2026-07-28

## Phase 0: immediate containment (days)

1. Disable store-credit tender until an authoritative balance exists. Acceptance: all store-credit commits fail closed with a safe reason; no ledger entry is posted.
2. Remove `APPROVED` from generic PO bulk status changes. Acceptance: every approval has approver, requester separation, transition event and audit evidence.
3. Keep electronic tenders/refunds provisional unless provider-authoritative proof exists. Acceptance: no report labels provisional value settled.
4. Reject non-allowlisted Host/forwarded-host origins. Acceptance: spoofed-origin tests fail closed.

## Phase 1: trust boundaries (1–3 sprints)

5. Implement/supersede org-scoped Prisma ADR with scoped client or RLS/repository boundary. Acceptance: cross-tenant adversarial suite and raw-client gate pass; explicit reviewed escape only.
6. Make module entitlement mandatory for external mutations. Acceptance: route/action/API/service matrix has no unexplained gap.
7. Add transactional append-only critical audit outbox; hash invite tokens; persist offline original actor and narrow replay authority. Acceptance: DB/outbox failure, concurrent redemption and replay-actor tests pass.

## Phase 2: financial truth (2–4 sprints)

8. Create immutable store-credit ledger and reserve/consume/reverse commands.
9. Add provider tender/refund lifecycle, signed evidence, deterministic idempotency, clearing/suspense and reconciliation.
10. Replace customer/drawer read-set balances with CAS/atomic updates backed by immutable entries.
11. Publish and enforce legacy Payment-to-PaymentTransaction transition policy.

Acceptance: concurrent sales/refunds preserve balances; duplicate/replayed provider events have one effect; settlement reports tie to statement evidence; corrections preserve lineage.

## Phase 3: projection convergence (1–3 sprints)

12. Define shared cash, AR, refunds, settlement, tax and as-of semantics.
13. Convert dashboard, snapshot and finance projections to the same adapter and golden fixtures.
14. Add freshness/provenance/reconciliation metadata everywhere; retire duplicate routes/actions through tested adapters/redirects.

Acceptance: identical fixtures produce identical totals and trust badges across all role surfaces.

## Phase 4: assurance and release (ongoing)

15. Expand assurance to identity, tenant boundaries, entitlements, HRIS, master data, evidence retention and public integrations.
16. Resolve migration-history and managed-secret blockers; wire external logs/metrics/alerts and test delivery, redaction, paging and recovery.
17. Bind statutory packs to signed sources/effective dates/expert approvals and authority conformance.

Acceptance: enterprise blocker register has no open item; clean candidate commit is bound to executable evidence; external/statutory controls are independently validated. Rollback preserves append-only records and correction history.

## Dependency order

Containment → tenant/security boundary → financial lifecycle/concurrency → projection convergence → external/statutory/release certification. Do not begin broad UI redesign before canonical fact semantics stabilize.
