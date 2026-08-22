# Stoquify blocker and gate control plane — phased implementation plan

Prepared: 2026-08-18  
Implementation status: not started by this design run  
Initial scope: G1 pilot extending Workflow Assurance

## Delivery strategy

Build the capability as an additive extension of the existing Assurance module. Keep the current G1 JSON contract, register and fail-closed scripts operational until the runtime workflow produces equivalent or stronger evidence and an independent comparison passes.

Use observe mode first. Do not enable gate enforcement from the new runtime models until G1 import, approval, verification, drift and rollback tests pass and the governance roster is approved.

## Phase 0 — terminology, ownership and authoritative-source freeze

### Scope

- Approve canonical definitions for identity, access role, authority, delegation, qualification, approval, attestation, evidence, verification, certification, blocker, gate and waiver.
- Name the organizational owner for authority data.
- Define accepted appointment and qualification evidence.
- Confirm the G1 role codes and segregation-of-duties matrix.
- Decide retention, redaction and external-signature requirements.

### Dependencies

- HR/security/governance participation.
- Product, finance, POS, risk, operations and qualified Cameroon/accounting reviewer input.

### Schema/API/UI impact

None. Produce signed-off policy artifacts only.

### Tests and evidence

- Policy consistency review.
- G1 decision-to-role count must equal 33.
- No ambiguous role label may become an authority code.
- Evidence: authority-source decision, SoD matrix, retention decision and qualification rules.

### Rollback

Supersede draft policy artifacts; no runtime state exists.

### Risks

- Governance delay.
- One person holding incompatible roles.
- Unavailable qualified reviewer.

### Exit criteria

- Authority data owner is named.
- Role-code and delegation policies are approved.
- G1 qualified-review requirements are explicit.
- Unresolved names remain open; no placeholder is treated as authoritative.

## Phase 1 — G1 authority, artifact and evidence-envelope pilot

### Scope

- Add the general authority/delegation registry.
- Add artifact/version/digest records.
- Import the exact G1 artifact and verify its current SHA-256.
- Add versioned G1 decision policy and 33 role obligations.
- Add approval request/entry, authentication attestation and evidence envelope.
- Keep the existing gate script as the final comparison boundary.

### Dependencies

- Phase 0 decisions.
- Existing `requireFreshAuth`, `protect`, business events and assurance persistence.

### Schema impact

Additive tables only. No existing evidence or approval rows are rewritten. Use tenant-safe composite keys, `onDelete: Restrict` for evidence relationships and explicit supersession.

### APIs/events

- Authority read/manage actions.
- Artifact register/freeze/read actions.
- Policy import/read actions.
- Approval-request and decision actions.
- `control.authority.*`, `control.artifact.*`, `control.approval.*` events.

### UI

- G1 authority roster view.
- G1 obligations and approval inbox.
- Exact contract/decision review view.
- Evidence receipt view.

### Required tests

- Cross-tenant denial.
- Authority missing/expired/revoked/conflicted.
- Fresh-authentication expiry and tenant mismatch.
- Server-side canonical payload and digest.
- Replay/idempotency conflict.
- Same-user incompatible-role denial.
- Artifact drift invalidation.
- Transaction rollback when audit/event write fails.
- Accessible keyboard and screen-reader approval flow.

### Migration/backfill

- Register only the G1 frozen artifact and policy.
- Do not backfill handwritten images as approvals.
- Candidate identities may be imported only as unresolved references, not authority assignments.

### Rollback

- Disable the pilot feature flag and continue using the existing detached register.
- Preserve new append-only evidence for audit; do not delete it.
- No gate consumes runtime approval evidence until Phase 2 comparison passes.

### Exit criteria

- Exact G1 artifact hash is reproducible.
- Policy deterministically produces 11 decisions and 33 obligations.
- A test tenant can complete authenticated approvals with immutable envelopes.
- No agent or unauthorized role can approve.
- Current production authorization remains false.

## Phase 2 — independent verifier and G1 gate integration

### Scope

- Add deterministic approval verification.
- Add automated and human-checker verification classes.
- Generate a verified G1 approval manifest from runtime records.
- Compare generated manifest against the existing contract gate.
- Add source-drift and downstream invalidation.

### Dependencies

- Phase 1 data and workflows.
- Approved verifier separation policy.

### APIs/events

- `verifyApprovalRequest` and `invalidateControlEvidence`.
- `control.verification.completed` and invalidation events.
- Read-only verified-manifest exporter for the G1 gate.

### UI

- Verification queue and reason codes.
- Side-by-side source/policy/artifact digest display.
- Human-checker action only where required.

### Required tests

- All 33 obligations complete.
- Missing role, wrong option, wrong hash and expired authority.
- Producer/verifier conflict.
- Artifact/policy/authority invalidation propagation.
- Generated manifest equals expected contract schema.
- G1 remains blocked for any unverified entry.

### Rollback

- Stop exporting the runtime manifest.
- Revert gate adapter to the existing detached-register input.
- Preserve verification history.

### Exit criteria

- Runtime manifest and independent verifier agree.
- The G1 gate accepts only verified evidence bound to the exact contract hash.
- A deliberately corrupted entry is rejected with a deterministic reason.
- Passing G1 is possible only after authentic human approvals.

## Phase 3 — persistent gate composition and blocker integration

### Scope

- Add versioned gate definitions, dependencies and composite gate runs.
- Map failures to existing Workflow Assurance incidents.
- Add explicit `NOT_EVALUATED` dependency behavior.
- Preserve the current repository gates as adapters during transition.

### Dependencies

- Phase 2 verifier.
- Gate-policy owner review.

### Tests

- Dependency graph cycle rejection.
- Exact gate-version input manifest.
- Downstream invalidation.
- Idempotent rerun and changed-input conflict.
- Blocker open/reopen/resolve behavior.
- Waiver policy and expiry behavior.

### Rollback

- Keep composite gates in observe mode.
- Continue existing script gates while parity is measured.

### Exit criteria

- G1 and G2 dependency behavior matches current scripts.
- No blocked dependency is reported as passed.
- Every blocker has an owner, source digest and next action.

## Phase 4 — operational UI, notifications and exports

### Scope

- Extend Assurance Control Tower.
- Add authority workbench, approvals inbox, artifact view, verification queue and gate graph.
- Add redacted alerts, reminders and escalation.
- Add controlled JSON/PDF evidence exports.

### Dependencies

- Stable Phase 1–3 contracts.
- EN/FR content and accessibility review.

### Tests

- Permission matrix and hidden-sensitive-data tests.
- Empty/loading/error/stale/expired/superseded states.
- Keyboard, focus, labels, announcements and contrast.
- Bilingual terminology consistency.
- Alert dedupe, retry and dead-letter recovery.
- Export digest verification and redaction.

### Rollback

- Hide new surfaces behind feature flags; service evidence remains available.

### Exit criteria

- Authorized users can understand and act on every G1 blocker without raw JSON editing.
- Unauthorized users cannot infer sensitive approval or identity details.

## Phase 5 — domain adoption

### Scope

Adopt one domain at a time:

1. destructive migrations;
2. country-pack reviews;
3. accounting close/reconciliation;
4. payment/treasury releases;
5. inventory adjustments and purchasing/AP;
6. payroll/compensation;
7. module and AI-agent activation;
8. production release/rollback.

### Rules

- Each domain keeps its own service and data truth.
- Add an evidence adapter and versioned policy, not cross-domain direct queries.
- Demonstrate parity with the existing domain workflow before enforcement.
- Never weaken an existing domain maker-checker or qualification requirement.

### Exit criteria per domain

- Owner-approved source map.
- Tenant/RBAC/privacy review.
- Adapter contract and failure behavior tested.
- Historical evidence migration explicitly classified.
- Observe-mode parity measured.
- Enforce-mode decision separately approved.

## Phase 6 — optional external e-signature integration

### Scope

- Provider-neutral adapter contract.
- Signed webhook intake, provider signer mapping and final artifact/audit digest.
- Evidence-envelope link to external signature evidence.

### Dependencies

- Legal/governance determination that a workflow requires external signature evidence.
- Provider security, privacy, residency and availability review.

### Tests

- Provider webhook signature and replay protection.
- Incorrect signer/role mapping.
- Cancelled/expired envelope.
- Provider outage and delayed completion.
- Audit-certificate/final-document hash mismatch.

### Rollback

- Disable provider adapter; internal operational approvals continue where policy permits.

### Exit criteria

- External evidence strengthens rather than bypasses Stoquify authority and policy checks.
- No provider-specific field leaks into the core approval contract.

## Phase 7 — enterprise hardening and rollout

### Scope

- PostgreSQL integration and concurrency tests.
- Chaos and recovery testing.
- Backup/restore and evidence reconciliation.
- Capacity, latency and cost baselines.
- Security review, threat-model closure and penetration testing.
- Operating procedures, training and support rollout.

### Chaos cases

- Database commit succeeds but notification delivery fails.
- Outbox worker restarts after lease acquisition.
- Authority source becomes unavailable mid-request.
- Artifact storage returns stale or different bytes.
- Verifier is delayed or duplicated.
- External provider sends repeated/out-of-order webhooks.
- Clock skew causes future or stale authentication timestamps.
- Restore contains approval entries but missing export objects.

### Exit criteria

- No evidence loss under tested recovery cases.
- Reconciliation identifies and repairs incomplete projections without inventing approvals.
- Alerting and runbooks are operational.
- Enforcement rollout is approved per domain and tenant cohort.

## Prioritized build backlog

| ID | Work package and owned boundary | Dependencies | Acceptance criteria | Security/tests/evidence | Rollback | Size | Human input first? |
| --- | --- | --- | --- | --- | --- | --- | --- |
| BG-00 | Governance terminology and authority-source ADR in `docs/blockers-and-gates/` | None | Authority, delegation, qualification and SoD rules approved | Review record and policy digest | Supersede draft | M | Yes |
| BG-01 | Shared canonicalization/digest contract under `services/assurance/artifacts/` | BG-00 | Binary/JSON profiles versioned; independent recomputation matches G1 | Golden vectors, drift and malformed-input tests | Feature flag; retain existing hash helpers | M | No |
| BG-02 | Additive Prisma models/migration for artifact, authority, policy, approvals, attestation, envelope and verification | BG-00/BG-01 | Schema valid; tenant-safe keys; evidence relationships restricted | Migration tests, rollback plan, data classification | Migration down-plan only before live data; otherwise disable feature | L | Yes, schema review |
| BG-03 | Authority/delegation services and actions under `services/assurance/authority/` | BG-02 | Active scoped assignment required; conflicts/expiry visible | Cross-tenant, revocation, delegation, SoD and fresh-auth tests | Disable management actions; preserve records | L | Yes, real assignments |
| BG-04 | Artifact registry and G1 import adapter under `services/assurance/artifacts/` | BG-01/BG-02 | Exact contract digest verified; frozen version immutable | G1 golden hash, path/URI boundary, drift tests | Keep current file-based gate | M | Domain owner freezes import |
| BG-05 | Decision/policy catalog under `services/assurance/policies/` | BG-02/BG-04 | D-01–D-11 import produces exactly 33 obligations | Policy digest, cycle/duplicate/role tests | Supersede unpublished version | L | Yes, policy approval |
| BG-06 | Approval request and decision service under `services/assurance/approvals/` plus protected actions | BG-03/BG-05 | Explicit fresh-auth decision writes immutable entry/attestation/event | Tenant, RBAC, replay, transaction, stale auth and SoD tests | Disable actions; preserve entries | L | Real approvers required for live use |
| BG-07 | Evidence-envelope service/export under `services/assurance/evidence-envelopes/` | BG-01/BG-06 | Canonical JSON and redacted PDF share verifiable subject digest | Golden envelope, redaction, export corruption tests | Regenerate export from canonical record | M | Retention/redaction approval |
| BG-08 | Independent verifier under `services/assurance/verification/` | BG-03/BG-07 | Deterministic reason codes; producer separation; invalidation | 33-obligation, drift, authority, qualification and verifier-conflict tests | Stop verification jobs; preserve results | L | Checker policy required |
| BG-09 | G1 verified-manifest adapter and gate parity | BG-08 | Current gate trusts only verified exact-hash evidence; legacy comparison retained | Focused G1/program tests and corrupt-manifest tests | Revert adapter selection | M | Gate owner approval |
| BG-10 | Persistent gate/dependency/run layer under `services/assurance/gates/` | BG-09 | Acyclic graph; correct not-evaluated/blocked/pass behavior | Dependency, idempotency and invalidation tests | Observe mode / existing scripts | L | Gate catalog approval |
| BG-11 | Extend assurance incidents and proof trails for artifacts/approvals/gates | BG-08/BG-10 | Every failed obligation creates a safe actionable blocker | Redaction, permission, reopen/resolve tests | Existing incident model remains | M | No |
| BG-12 | Approval/authority/gate UI under existing assurance routes/components | BG-06–BG-11 | State-complete EN/FR accessible workflow | Browser, accessibility, permission and error-state evidence | Feature flag UI | L | Content/accessibility review |
| BG-13 | Notification/escalation templates using existing alert delivery | BG-11 | Dedupe, expiry, escalation and safe content | Retry/dead-letter and privacy tests | Disable channels | M | Escalation policy |
| BG-14 | Domain evidence adapter SDK and second-domain pilot | BG-10/BG-11 | No direct cross-domain mutation; one selected domain reaches parity | Contract, failure and tenant tests | Remove adapter from registry | L | Domain owner selection |
| BG-15 | Optional external-signature adapter | BG-07 | Provider-neutral, verified webhooks and final evidence digests | Security/privacy/provider chaos tests | Disable provider | L | Legal/provider decision |
| BG-16 | Enterprise hardening, runbooks and rollout gates | All prior | Restore/reconciliation/chaos/security evidence accepted | Full hardening packet | Keep observe mode | L | Yes, release authority |

## Proposed permissions

Permissions are proposals and require catalog review:

```text
controls.artifact.read
controls.artifact.manage
controls.authority.read
controls.authority.manage
controls.policy.read
controls.policy.manage
controls.approval.read
controls.approval.decide
controls.verification.read
controls.verification.execute
controls.gate.read
controls.gate.run
controls.evidence.export
```

Sensitive mutations require fresh authentication. Approval and verification also require the policy-specific authority, not only the general permission.

## Verification strategy

### Unit and contract

- Canonicalization vectors and hash formats.
- Policy expansion/quorum/SoD.
- State transitions and invalidation.
- Authority effectivity and delegation.
- Evidence-envelope serialization.
- Deterministic verifier reason codes.

### Integration

- PostgreSQL transactions, unique keys and concurrent decisions.
- Audit/business-event/outbox atomicity.
- Tenant isolation and cross-tenant negative cases.
- Migration deployment and rollback readiness.
- Worker retry and dead-letter reconciliation.

### Browser/accessibility

- Fresh-auth challenge and recovery.
- Exact artifact/decision review before approval.
- Expired, superseded, rejected and blocked states.
- Keyboard-only, screen-reader, focus and bilingual content.
- Permission-sensitive redaction.

### Gate evidence

- Current G1 contract digest.
- 11/33 policy expansion.
- Valid and invalid evidence envelopes.
- Verified-manifest digest.
- G1 and POS program non-writing gate results.
- Downstream `NOT_EVALUATED` behavior.

## Operational KPIs

- Median time from blocker creation to assigned owner.
- Median and 95th-percentile approval-obligation age.
- Percentage of obligations routed to confirmed authority on first attempt.
- Verification failure rate by reason.
- Artifact/policy drift invalidation rate.
- Number of attempted self-approvals and cross-tenant denials.
- Alert retry/dead-letter rate.
- Evidence export verification success rate.
- Time between authority expiry warning and remediation.

Do not use these metrics to rank or punish individual approvers. They measure process health.

## Immediate next actions

1. Approve or amend the target architecture ADR.
2. Complete Phase 0 governance decisions.
3. Assign file ownership for BG-01 through BG-05.
4. Review the additive schema design before generating a migration.
5. Keep G1 fail closed and do not edit the frozen contract.
6. Begin implementation only after the authority-source and G1 policy decisions are documented.
