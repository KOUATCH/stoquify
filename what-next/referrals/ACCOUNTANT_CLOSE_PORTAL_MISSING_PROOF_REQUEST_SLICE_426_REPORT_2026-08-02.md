# Accountant Close Portal Missing-Proof Request Slice 426 Report

Generated: 2026-08-02
Phase: Phase 4, Accountant Portal And Close Pack
Skill: `013-aqstoqflow-data-trust-accountant-portal`
Orchestrator: `stoquify-referral-war-room-orchestrator`

## Decision

Current-worktree certification: GO.

Repository, migration, and production deployment: NO-GO. The broader accountant-access repository, identity, retention, lifecycle, and exact PostgreSQL deployment evidence remain outside this slice.

## Before

- No dedicated missing-proof request command or typed input/output contract existed.
- Delegated access exposed `READ` and `EXPORT`, but no review-write capability that denied read-only grants.
- No dedicated RBAC permission protected this business command.
- Missing evidence could be described in findings and comments, but there was no atomic request record tying assignment, client action, audit, event, and notification evidence together.
- The report-trust release gate had 20 checks and did not ratchet this command boundary.

## After

- `requestMissingCloseEvidenceInputSchema` validates a finding, recipient, request text, future due date, optional client organization, and optional correlation ID.
- `requestMissingCloseEvidenceAction` is protected by `accounting.close.evidence.request`, accepts unknown input, parses it, and forwards only the authenticated organization, actor, and permissions.
- Delegated client access now supports `REVIEW`; `READ_ONLY` grants fail closed before client work can be requested.
- The service owns its clock, resolves the target client from the authenticated home organization and active grant, and rejects terminal findings, findings without missing evidence, and inactive or cross-tenant recipients.
- Correlation replay returns the exact existing request and rejects reuse with different requester, recipient, text, or due date.
- One serializable transaction performs finding assignment, typed `CLIENT_ACTION_REQUIRED` comment persistence, ledger audit, business event, and notification outbox composition.
- No API route, UI, table, migration, external share, AI authority, WhatsApp authority, or POS activation was introduced.

## Security And Data Integrity

- Tenant truth is service-owned through `resolveAccountantClientAccess`; caller-provided organization fields are not authoritative.
- Actor truth comes from the protected action context; missing actor fails before access or database work.
- Recipient lookup requires both the resolved client organization and `isActive: true`.
- Finding lookup requires both finding ID and resolved client organization.
- Missing-evidence truth requires unavailable evidence, an unavailable checklist item, or zero checklist evidence.
- Serializable retry handles transaction conflicts while preserving the original service clock and correlation ID.
- Audit and business-event evidence are written inside the same transaction as the operational changes.

## Release Ratchet

The new `missing_proof_request_service_owned_command_evidence` check requires:

- immutable protected action and exact public wrapper;
- dedicated permission, audit resource, and authenticated context forwarding;
- service-owned actor, clock, due-date, tenant, and recipient preflights;
- delegated `REVIEW` access with read-only denial;
- correlation replay and mismatch protection;
- serializable transaction ownership;
- typed comment, assignment, audit, business event, and notification evidence.

The gate now reports 21/21 ready with zero blockers. Focused mutation tests reject wrapper bypass, mutable binding, wrong permission, attacker-controlled organization or actor, control spreads, lost revalidation, caller time, wrong delegated capability, lost idempotency, non-atomic execution, missing-evidence bypass, unscoped recipient, untyped comment evidence, missing audit/event evidence, and weakened delegated access.

## Verification

- Combined focused Jest: 5 suites, 158 tests passed.
- Slice 426 runtime subset: 4 suites, 90 tests passed.
- Report-trust gate suite: 1 suite, 68 tests passed.
- Full TypeScript check: passed.
- Scoped ESLint: passed.
- Prisma schema validation: passed.
- JavaScript syntax check: passed.
- Live report-trust gate: 21/21 ready, zero blockers.
- Scoped `git diff --check`: passed; only an existing CRLF normalization warning was reported.

## Independent Review

Findings: none.

- Plan alignment: PASS.
- Correctness in practice: PASS for service/action/runtime and mutation coverage.
- System integrity: PASS.
- Data integrity, authorization, security, observability, and testing: PASS.
- UI, accessibility, i18n, and theming: N/A because no product surface was added.
- Blast radius: narrow. Rollback is a code revert; no migration or external irreversible write was introduced.

## Residual Risks

- The command foundation has no action-center UI or client response/resolution workflow yet.
- `AccountantComment` correlation uniqueness remains enforced through serializable transaction semantics rather than a new database constraint; schema work was intentionally out of scope.
- Accountant identity foreign keys, retention, organization deletion policy, portfolio/register pagination, organization-timezone policy, and exact-revision PostgreSQL deployment evidence remain unresolved.
- Repository and production deployment certification remain NO-GO.

## Next Gate

No Slice 427 is selected by this run. The next skill is `stoquify-referral-war-room-orchestrator` for a fresh Phase 4 candidate audit, consulting `013-aqstoqflow-data-trust-accountant-portal` and preserving the report-trust gate as the release control.

