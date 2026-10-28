# Accountant Close Portal Client Missing-Proof Queue Slice 427 Report

Generated: 2026-08-02
Phase: Phase 4, Accountant Portal And Close Pack
Skill: `013-aqstoqflow-data-trust-accountant-portal`
Orchestrator: `stoquify-referral-war-room-orchestrator`

## Decision

Current-worktree certification: GO.

Repository, integration, and production deployment: NO-GO. This slice creates a service-owned read-model foundation only; no public action, route, action-center composition, or client UI is activated.

## Before

- Slice 426 persisted typed missing-proof request truth, but no dedicated client-recipient read model consumed it.
- A future action center would have needed to query accounting persistence or infer request meaning from generic comments.
- Recipient authority, open-finding scope, corrupt-evidence handling, metadata redaction, queue bounds, and urgency classification were not expressed as one reusable contract.
- Missing-proof request type and visibility were local writer constants and could drift from a later reader.
- The report-trust release inventory contained 21 checks and did not ratchet the client queue boundary.

## After

- Shared constants now define the writer and reader evidence vocabulary: `MISSING_CLOSE_EVIDENCE` and `CLIENT_ACTION_REQUIRED`.
- A versioned `CLIENT_MISSING_CLOSE_EVIDENCE_REQUEST_QUEUE` contract declares its permission, source tables, 100-item cap, action target, redaction policy, controls, summary, requests, and blockers.
- The service requires nonblank tenant and actor identifiers, `accounting.close.read`, and an active actor in the same organization before reading finding data.
- Actor and recipient are the same authority. No caller-controlled recipient or clock is accepted.
- The Prisma read is scoped by organization, owner, active finding statuses, comment visibility, request type, and requested recipient.
- Only the newest matching typed request for each active finding is loaded. Stored metadata is validated against author, recipient, correlation, due date, and nonblank request text.
- Malformed evidence becomes an explicit `INVALID_REQUEST_EVIDENCE` blocker; raw metadata never leaves the service.
- Results are capped at 100, expose truthful truncation, sort by request due time, and classify overdue, due-within-72-hours, and scheduled work from the service clock.
- The action path resolves to the existing close-period route. No new API route or product surface was invented.

## Inventory Delta

- Missing-proof command evidence: retained and still certified.
- Shared persistence vocabulary: added.
- Client-recipient queue contract: added.
- Service-owned client queue reader: added.
- Focused runtime tests: added.
- Report-trust checks: 21 before, 22 after.
- Report-trust blockers: 0 before, 0 after.
- Public routes/actions/UI: 0 added.
- Schema/migrations/external delivery: 0 added.

## Security And Data Integrity

- RBAC fails before tenant reads.
- Active actor membership is tenant-scoped.
- Finding ownership and request metadata must both identify the authenticated actor.
- Terminal finding statuses are excluded.
- Corrupt author, recipient, correlation, due-date, or body evidence cannot become valid work.
- Response contracts expose normalized fields and generic blockers, not raw JSON metadata.
- Bounded reads use the existing `[organizationId, ownerId, status, dueAt]` finding index and load one matching comment per finding.

## Release Ratchet

The new `client_missing_proof_request_queue_service_owned_evidence` check requires:

- shared writer/reader evidence constants;
- exact read permission and redaction contract;
- service-owned clock with no caller time;
- no recipient override;
- active tenant actor, organization, owner, and open-status scope;
- typed visibility and JSON request/recipient filters;
- one latest comment per finding and a 101-row preflight cap;
- author, recipient, and correlation validation;
- explicit malformed-evidence blockers;
- raw-metadata exclusion and truthful truncation.

Thirteen focused mutations prove that wrong permission, weak redaction, caller time, recipient override, inactive actor, missing organization scope, terminal status admission, untyped request evidence, unscoped metadata recipient, unbounded reads, raw metadata, silent corruption, or writer-local constants block release.

Final live verification exposed formatter-sensitive semicolon handling in the new static normalizer. The normalizer and ready fixture were hardened, all 81 gate tests were rerun, and live readiness returned to 22/22 before certification.

## Verification

- New queue service: 1 suite / 6 tests passed.
- Combined focused regression: 4 suites / 138 tests passed.
- Report-trust gate suite: 1 suite / 81 tests passed.
- Full TypeScript check: passed.
- Scoped ESLint: passed.
- Prisma schema validation: passed.
- JavaScript syntax check: passed.
- Scoped `git diff --check`: passed.
- Live report-trust gate: 22/22 ready, zero blockers.

## Independent Review

Findings: none.

- Plan alignment: PASS.
- Correctness in practice: PASS for the selected service and gate scope.
- System integrity: PASS.
- Auth, tenant isolation, security, redaction, performance bounds, and testing: PASS.
- UI, accessibility, i18n, theming, and external delivery: N/A because no public surface was added.
- Blast radius: narrow. Rollback is a code revert; no state migration or external write was introduced.

## Residual Risks

- No public server action, manager action-center composition, or client UI consumes the queue yet.
- PostgreSQL JSON-path behavior is type-checked and structurally gated but not exercised against a live database in this slice.
- Response/upload/completion/dismissal/reassignment/resolution workflows remain unimplemented.
- Cursor pagination and organization-local day boundaries remain deferred.
- Accountant identity integrity, retention/deletion policy, repository ownership, lifecycle constraints, and exact-revision deployment evidence remain unresolved.
- Repository and production deployment certification remain NO-GO.

## Next Gate

No Slice 428 is selected. Run `stoquify-referral-war-room-orchestrator` for a fresh Phase 4 candidate audit, consulting `013-aqstoqflow-data-trust-accountant-portal` and preserving the 22/22 report-trust release gate.
