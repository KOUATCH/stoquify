# v139 — Independently reconcile a recorded offline replay

Evidence date: 2026-09-13. Bounded implementation; platform workflow review remains incomplete. Current source/branch/dirty tree and exact hashes are in `evidence/source-baseline-v139-final.json`; final receipts are in `evidence/pos-offline-resolution-v139.json`.

## Delivered behavior and reason

v137 recorded review ownership but could not resolve any conflict. v138 prevents future stale replay transitions. Historical late failures can still leave an event BLOCKED even though its original commit, replay business event and posted journal already exist. This batch provides an independently reviewed reconciliation of that recorded outcome. It performs no POS commit, receipt hydration, payment, stock operation, journal posting or outbox delivery.

The service accepts only a current OPEN/ACKNOWLEDGED, noncritical UNPOSTED_ACCEPTED_EVENT conflict whose recorded blocker is OFFLINE_REPLAY_BLOCKED. It requires an ACTIVE scoped device, consistent original payload/request and incoming conflict hash, scoped replay event, original cashier's immutable commit result, and actual POSTED POS_SALE/SALE_COMPLETION journal. Device/signature disputes, domain-specific compliance/payment/stock failures, missing proof and mismatches remain ineligible. Another authorized reviewer must act; the original cashier cannot resolve the conflict.

A server preview binds compared records and the remaining device workload. Resolution recomputes that revision in a serializable transaction, rejects changed proof, conditionally changes the selected conflict and restores a BLOCKED event's replay metadata from its existing replay business event. Previous blocked metadata and the original replay reference are retained. An exact retry returns the saved resolution and creates no second audit. PostgreSQL serialization conflicts become actionable stale-evidence errors.

Remaining open/acknowledged conflicts and PENDING_REPLAY/RECORDED/BLOCKED events continue to block. Only the matching OPEN/BLOCKED operational certificate cache can be refreshed; other certificate gates remain intact. The operation does not issue certification or advance its last certified sequence. Its stale operational hash is invalidated. Fiscal delivery remains a separate requirement, and current sale status is shown separately from the original recorded result.

## Operator instructions and required inputs

Open `/en/dashboard/pos` or `/fr/dashboard/pos`, select **Review conflicts / Examiner les conflits**, then inspect the conflict.

1. Use an account with current `controls.manage` and `pos.transactions.read` permission in the same organization. A reader alone can inspect the existing review but cannot check or resolve the recorded outcome. Ask the organization's existing role administrator for the appropriate assignment; do not grant it to yourself through this screen.
2. Enter a 10–1000 character review note explaining the evidence reviewed and remaining follow-up. Obtain the original sale/order and posting references from the linked records shown in the preview. They are server-derived; no manual approval ID, hash, signature or journal reference is needed.
3. Select **Check recorded outcome / Vérifier le résultat enregistré**. Review the order, its current status, posted batch and remaining conflict/event counts. An unavailable preview explains why resolution cannot proceed. Preserve the evidence and route genuine device/signature, fiscal or domain failures to their responsible operator.
4. Select **Reconcile record / Rapprocher** only after reviewing the result. If requested, confirm your current password through the existing authentication form, then explicitly select the action again. Authentication does not submit a resolution.
5. On changed evidence, check the outcome again. On a lost response, retry the same action and note; the durable resolution makes that retry idempotent. The note stays in the current panel after recoverable failures. Browser closure does not preserve this unsaved draft.

The resolution is recorded in POSOfflineSyncConflict (`resolvedById`, `resolvedAt`, `resolutionNote`, metadata) and AuditLog action `POS_OFFLINE_RECORDED_REPLAY_RESOLVED`, scoped to the organization. The panel still lists at most ten open conflicts. A dedicated complete historical queue and durable drafts remain unfinished.

## Source and design-system integration

- `services/pos/offline-resolution.service.ts`: authoritative preview, independent reviewer, proof reconciliation, revision/CAS, idempotency, audit and conservative operational blocker refresh.
- `services/pos/pos.service.ts`: extracts the existing read-only commit-status body into a transaction helper; sanitizes private mismatch evidence at that boundary. Sale admission/financial mutation is unchanged.
- `actions/pos/offline-review.actions.ts`: existing protect/RBAC contract, server-derived identity and fresh authentication (300 seconds) for mutation.
- `components/pos/offline/OfflineConflictReview.tsx` and EN/FR messages: preview/impact/action integrated into the inherited dashboard, existing Button, focus and password recovery patterns. Neutral surface/border tokens describe evidence; brand buttons identify actions without implying certification. No portal, dialog or second shell added.

Mobile inspection found fragmented French action text at 320px/200% text. The final action is shorter and the preview has smaller narrow-screen padding. Automated panel overflow/hit-target checks and actual screenshots were repeated. Adjacent POS setup panels still need their own full zoom/accessibility review; no whole-screen accessibility certification is asserted.

## Verification and evidence limits

Focused regression: 93 tests across five suites; six component tests repeated after the final layout/copy change. Six-file lint and typecheck passed. Owned PostgreSQL scenarios cover current and foreign tenants, independent reviewer, changed proof including same timestamps, concurrent submissions, duplicate retry, retained payload/financial/outbox records, device revocation, signature disputes, missing posted journal, other conflicts and orphan blocked events. Domain-specific blocker and incoming-hash mismatches are rejected.

Actual localhost browser journeys cover EN/FR, 1440/768/320px, 200% text, fresh authentication without automatic submission, stale preview with retained note, dropped response after actual commit, explicit keyboard retry and exactly one resolution audit. No browser action emitted a real payment or external message. Cold development readiness measurements are recorded as observations, not production performance certification.

The initial typecheck found a nullable Prisma JSON predicate; corrected with the explicit Prisma null filter. The initial PostgreSQL assertions passed but saving their receipt failed with sandbox EPERM; the command was rerun with narrowly approved local evidence access. Earlier passing browser evidence precedes the final narrow-screen improvement; final source bindings take precedence. Preserve all receipts.

## Rollout, recovery and remaining controls

No schema migration, backfill, deployment, customer activation or X1 clearance. Use the existing release process and an isolated cohort review before any rollout. Monitor the dedicated resolution audit, stale conflicts, device open/conflict counts and failures. Removing the new action/UI entry rolls back availability; keep resolution/audit records intact. Do not delete audit rows, reopen conflicts or reverse sales to undo an interface rollout. A disputed resolution requires a new controlled investigation/correction with retained evidence.

The previously rejected offline admission/continuation changes remain unapplied. This work does not enable production offline replay, stopped-module continuation, signature validation or certification. Actual correction/supersession of unposted events, full history/drafts, ingestion/signature/revocation/close lifecycle, admission approval and broader workflow inventory remain unfinished.

## Review accountability

Architecture/backend/database: existing control service and read-only transaction helper; serializable updates, no migration. Security/IAM/privacy: current dual permissions, tenant-derived identity, fresh authentication, independent reviewer, no accepted payment payload sent to browser. Finance/reconciliation/ledger: existing posted source required, no new financial effects, original/current status separated. Audit/records/API: durable scoped resolution and one audit, no new route or external provider. Frontend/UX/localization/quality: existing tokens and shell, EN/FR and recovery/browser tests above. SRE/rollout/support: failed queries stay failures; retry and release/recovery guidance supplied. Country/statutory: no rule changed, legal delivery untouched, no certification. SaaS packaging: no entitlement or commercial change. HR/payroll, purchasing/AP, analytics, AI/agent behavior: not applicable to this bounded reconciliation; remain in the overall workflow scope.

Selected skill: `007-aqstoqflow-pos-ledger-controls`. Tenant, current authority, original-result/journal, revision, concurrency, error, audit, localized recovery gates have bounded evidence. End-to-end offline lifecycle and platform release gates remain open. Do not advance to the next numbered compliance/release certification while those HIGH/CRITICAL boundaries remain unresolved.
