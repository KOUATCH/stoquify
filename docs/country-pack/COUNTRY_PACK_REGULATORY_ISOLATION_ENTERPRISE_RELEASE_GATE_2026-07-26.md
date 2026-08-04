# Country-Pack Regulatory Isolation Enterprise Release Gate

**Date:** 2026-07-26  
**Selected skill:** `017-aqstoqflow-enterprise-release-gate`  
**Prerequisite reviewed:** `016-aqstoqflow-ai-copilot-guardrails`  
**Active chunk:** Country-pack regulatory isolation and deferred POS fiscalization  
**Promotion target:** Production release  
**Decision:** `REJECTED / NO-GO`  
**Development and sandbox continuation:** Authorized within the existing fail-closed boundaries  
**Production activation:** Not authorized

## Executive decision

The regulatory-isolation implementation is technically sound for continued development and sandbox integration. The application no longer requires synchronous country-pack resolution to commit a POS sale, the accounting transaction remains ledger-first, fiscalization is queued through a tenant-scoped and idempotent outbox, and production regulatory automation remains fail-closed.

Production promotion is rejected. Two statutory evidence conditions are deliberately unresolved, the fiscalization exception queue is not yet exposed as an actionable protected operator surface, deployment and scheduler evidence is absent, the production database target and dedicated release secrets are not configured, and the current 122-change worktree is not an immutable release candidate.

This decision does not authorize live statutory interpretation, fiscal submission, payroll calculation, payment, declaration, or authority communication.

## Required context reviewed

- `017-aqstoqflow-enterprise-release-gate` and its universal Gate A through G contract.
- `016-aqstoqflow-ai-copilot-guardrails` and the repository evidence recording its completed controlled Phase 2A boundary.
- `docs/prompts/skills/AQSTOQFLOW_ORDERED_IMPLEMENTATION_CHUNKS_AND_SKILL_SUITE_2026-06-14.md`.
- `docs/domains/accounting-close/OHADA_SMB_PLATFORM_TECHNICAL_SPEC_2026-06-14.md`.
- `graphify-out/GRAPH_REPORT.md`, including the ledger-first, tenant/RBAC, service-boundary, and compliance communities.
- The regulatory capability port, country-pack adapter, POS commit path, fiscalization worker, receipt projection, Compliance Center snapshot, migrations, gates, tests, and implementation record.

## Universal gate matrix

| Gate | Result | Evidence and decision |
|---|---|---|
| A. Architecture and context | Passed | Feature code consumes the regulatory capability boundary; the published country-pack adapter owns the implementation dependency. Static analysis checked 1,382 files with zero boundary violations. Existing business-event and outbox foundations are reused. |
| B. Tenant, RBAC, and module control | Passed for implemented code | POS commit derives tenant and actor scope from the protected `pos.use` action. Sale, ledger, event, outbox, worker claim, receipt, and Compliance Center reads are organization-scoped. Compliance Center reads and submission actions retain explicit permissions and fresh-auth controls where required. |
| C. Event and ledger integrity | Passed | Sale and payment postings complete before the fiscalization request is emitted. A posting batch is mandatory. Business events include organization, actor, source, posting batch, payload hash, and stable idempotency keys. Posting failures prevent commit evidence; country-pack or fiscal adapter failures do not roll back a valid sale. |
| D. Error and notification contract | Approved with required fixes | Worker failures are classified into deferred, retryable failed, and dead-letter states, with bounded error storage and success notifications. Production-unavailable decisions fail closed. Promotion is blocked until fiscalization errors have operator-visible correlation, alert ownership, and protected remediation. |
| E. UX completeness | Blocked for production | Receipts expose pending regulatory processing without making a statutory claim. The Compliance Center service returns fiscalization queue counts, but `ComplianceCenterDashboard` does not render that queue and no protected fiscalization requeue action is wired to the UI. |
| F. Evidence and observability | Blocked for production | Audit logs, business events, source hashes, outbox attempts, leases, failures, and reconciliation metrics exist. Qualified statutory approval, production worker/scheduler evidence, alert transport evidence, deployment smoke evidence, and an immutable release artifact do not exist for this slice. |
| G. Verification | Repository checks passed; promotion blocked | TypeScript, Prisma, focused lint, focused tests, boundary, development, CI topology, and migration safety checks pass. Production country-pack, release secret, production database, global evidence, and immutable-release conditions remain blocked. |

## Gates passed

| Verification | Result |
|---|---|
| Regulatory import boundary | `READY`; 1,382 files checked; zero violations |
| Country-pack development gate | `READY_FOR_DEVELOPMENT_TESTING`; 11/11 checks; zero development blockers |
| CI release readiness | `ready`; 11/11 checks |
| Prisma migration safety | `ready`; 8/8 checks; 35 migrations; zero destructive SQL findings |
| Prisma schema validation | Passed |
| TypeScript | Passed |
| Focused ESLint | Passed |
| Focused Jest | 7 suites and 29 tests passed |
| POS tenant and authorization boundary | Passed; protected `pos.use` action supplies trusted organization and actor scope |
| Ledger-first transaction and rollback behavior | Passed |
| Stable fiscalization idempotency and source-payload integrity | Passed |
| Production fail-closed adapter behavior | Passed |
| Skill 016 prerequisite | Previously completed and evidenced for the controlled Phase 2A boundary |

## Gates blocked

### 1. Statutory source authority

The production country-pack gate is `blocked` at 10/12:

- `source_artifact_hash_verification`;
- `source_artifact_expert_approval`.

These are authority-evidence requirements, not defects to bypass in code. A qualified reviewer must verify the actual source artifact and record a valid approval before the pack can authorize production behavior.

### 2. Operator exception workflow

The backend produces `fiscalizationQueue` metrics and supports tenant-scoped deferred requeue in the service layer. The Compliance Center does not display the queue, explain deferred reasons, provide drill-down, or expose a permission-protected requeue action. This leaves a regulated asynchronous workflow without a complete operator recovery surface.

### 3. Worker deployment and observability

The worker CLI and processing contract exist, but there is no environment-bound evidence for:

- application of the new migration to an approved production-like PostgreSQL target;
- deployment and scheduling under a stable workload identity;
- lease heartbeat and recovery behavior in the target environment;
- structured correlation across request, worker, fiscal document, alert, and operator action;
- alert delivery, acknowledgement, escalation, and recovery;
- a production-like end-to-end smoke test.

### 4. Production database target

The production migration preflight is `blocked` at 7/8 because `DATABASE_URL` is absent and the deployment target cannot be classified as safe. The migration set itself has zero destructive SQL findings.

### 5. Dedicated release secrets

The release secret preflight is `blocked` at 2/8. The following purpose-specific production secrets are absent:

- `PUBLIC_IDENTITY_ABUSE_HASH_SECRET`;
- `AQSTOQFLOW_RECEIPT_TOKEN_SECRET`;
- `AQSTOQFLOW_HISTORY_CURSOR_SECRET`.

No secret values were printed or persisted by the gate.

### 6. Immutable release identity

The current worktree contains 122 changes spanning this slice and unrelated user work. It is not a clean, reviewed, immutable release artifact, and no protected CI attestation or deployment digest binds these results to a releasable commit.

### 7. Global release evidence

The global release evidence structure passes 11/11 checks, but release enforcement reports five blockers:

- `readiness:statutory-country-pack-production`;
- `public_identity_hash_secret`;
- `public_receipt_token_secret`;
- `history_cursor_signing_secret`;
- `production_database_target`.

## Required remediation order

1. Complete the protected Compliance Center fiscalization exception surface: bilingual queue states, tenant-scoped drill-down, stable error codes, permitted requeue, audit evidence, loading/empty/error/degraded states, and accessibility tests.
2. Add request-to-worker correlation and structured operational telemetry, then verify retry, dead-letter, deferred requeue, acknowledgement, escalation, and recovery.
3. Obtain qualified verification of the exact statutory source artifact hash and record expert approval without weakening production guards.
4. Provision the three purpose-specific release secrets through the production secret manager.
5. Configure an approved non-local PostgreSQL deployment target and run the migration preflight and deployment under change control.
6. Deploy and schedule the fiscalization worker with a stable identity; capture production-like PostgreSQL, lease-recovery, idempotency, and reconciliation smoke evidence.
7. Produce a clean reviewed commit and immutable artifact, run protected CI against that identity, and bind the evidence bundle to its digest.
8. Rerun the country-pack production gate, release-secret preflight, production migration preflight, global release evidence gate, and skill 017.

## Verification result

`REJECTED / NO-GO` for production promotion.

The active chunk may continue to be integrated and tested in development and sandbox environments because those boundaries explicitly prohibit production use, legal approval claims, live payments, live declarations, and authority submissions.

## Next recommended numbered skill

Remain on `017-aqstoqflow-enterprise-release-gate`.

Do not advance or activate the production regulatory path until every HIGH blocker is closed with real, immutable, independently reviewable evidence and a fresh release decision authorizes promotion.
