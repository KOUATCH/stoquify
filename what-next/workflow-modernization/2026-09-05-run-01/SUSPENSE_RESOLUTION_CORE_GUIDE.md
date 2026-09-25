# Suspense resolution: server foundation, v103

The server can now record a full resolution or the supported expense write-off against an existing, independently posted manual clearing journal. Recording the resolution posts no additional journal. The original suspense posting, clearing journal, proposal, independent decision and allocation remain linked and verifiable.

This is an internal service foundation. There is no new resolution button, public action or end-to-end operator journey yet. Do not invoke it for a live customer. Source-owned reopening/reversal recovery, protected actions, history and EN/FR operator controls remain implementation work; they do not require a new user approval to develop and verify in isolation.

## Supported behavior and information

| Input | Where it comes from | What is verified |
| --- | --- | --- |
| Suspense item | Existing reconciliation queue | Current tenant, original posted journal and independent approval, actual posting cycle, no pending posting correction |
| Clearing journal ID | Accounting journal register after independent posting | Posted manual two-line journal, retained reference, posting audit/source link, same configured accounting currency, exact full suspense offset |
| Outcome | Authorized finance review | Expense clearance must use explicit write-off; supported write-off clears a debit suspense balance to an expense. Other policies remain unavailable |
| Reason | Proposer's explanation and independent review | Required bounded text retained in immutable records; text alone does not prove statutory authority |
| Revision and request ID | Server preview and client request lifecycle when integrated | Stale evidence refused; exact retry reuses the durable result; changing a decision under an existing request conflicts |
| Actor, organization, permissions, authentication | Server-derived authenticated context when actions are implemented | Active scoped actor, reconciliation and accounting read access, existing proposal/post controls, fresh independent approval; clearing maker cannot approve resolution |

Use an actual accountant-approved destination and source reference. Fixtures are synthetic and confer no accounting or organizational approval. Partial clearing, foreign exchange conversion, multi-line settlement allocation, a simple reversal of the original classification and reuse of an allocated clearing journal are not supported by this path.

## Lifecycle and integrity

Preview is read-only. Proposal leaves `POSTED_TO_SUSPENSE` unchanged. Rejection retains the original journals and allows a fresh proposal. Approval atomically reserves the clearing journal, records the decision, updates `RESOLVED` or `WRITTEN_OFF`, invalidates affected close evidence, records the audit and queues the existing notification event. Late audit failure rolls back those effects. Related exceptions are not automatically closed.

The reconciliation manifest now verifies terminal resolution evidence, including the current clearing financial hash and proposal/decision/allocation lineage. A final status alone cannot establish certificate readiness. Legacy final records without that proof fail with a reviewable conflict; do not backfill synthetic approvals to make them pass.

Generic journal reversal refuses a journal allocated to a resolution. The source-owned recovery workflow must be implemented before exposing final resolution controls. Recovery must neutralize the clearing journal with independent authorization, reopen the obligation, retain the historical allocation and invalidate downstream evidence. Deleting a receipt or editing a posted journal is not a recovery process.

## Review responsibilities and rollout

Architecture/backend: service-owned lifecycle uses existing inbox, ledger audit and transactions. Database: no schema change or migration; serializable writes and scoped row locks. Security: scoped active actors and existing independent/fresh controls; transport enforcement remains unimplemented. Finance/audit: original and clearing evidence retained, exact full amount and currency checked; no statutory certification. SRE/quality: owned concurrency, retry and rollback evidence; production scale and operational dispatch remain unverified. UX/accessibility/localization: no new surface yet, so no new UI verification claim. Packaging: existing capability boundaries must be enforced by future actions; no new prices or entitlement model. Country-pack law, HR/payroll, offline, AI and billing-provider changes: not applicable to this bounded server addition.

No deployment, migration, X1 clearance or notification-worker cutover occurred. Before rollout: implement recovery and the protected UI, review legacy final records, verify sign-off/export and exception handoffs, test conflicting allocations and concurrent reversal, then follow the existing release controls. Rollback must retain immutable records and prevent generic reversal of allocated journals; reverting only the guard after creating resolutions is unsafe.

Selected skill: `009-aqstoqflow-payment-reconciliation-moat`. Changed source: three new resolution contract/service/evidence files; existing correction loader, suspense ledger verification, reconciliation manifest, notification types and generic journal reversal; three focused test files. Verification: [v103 evidence](SUSPENSE_RESOLUTION_CORE_VERIFICATION_V103.md). Next numbered skill is 010 after the reconciliation boundary is adequately completed; recovery and public workflow integration come first.
