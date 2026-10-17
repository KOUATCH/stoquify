# Close request and response transaction authority

Primary FA-CASH-COMMAND; supporting FA-CLOSE-PACK. The previous turn was progress: expired-request recovery and actual EN/FR browser journeys passed. This continuation targets the remaining write-authority gap without changing the workflow denominator or the original modernization objective.

Baseline: branch `codex/migration-control-plane-release-2026-08-29`, HEAD `62a56036a5ac9b37236a20c9b148052199069479`; register SHA256 `280639cbc9e31ad34887ebd36b900248503411cc38f2ca590b382d7753ac2e43`. 270 discovered workflows, four Complete—verified, two In progress, 264 Queued, 191 unmapped source entries. Discovery remains incomplete. Shared changes and the rejected manual-posting proposal remain preserved.

## Finding and implementation

Request/response actions checked permission before entering their domain transaction. The request service's same-tenant access resolver returned tenant membership without reading current roles; the response service only checked an active user. A role or session revocation between those checks and publication therefore lacked transaction-bound enforcement. Acceptance already had stronger persisted-authority locks.

The existing acceptance authority implementation now provides explicit request/response policies as well. Both require a real persisted session and the current operation permission plus Close read access. Organization, managed module rows, user, tenant roles, memberships, exact session and any delegated consent are locked through the transaction. Session/module/consent expiry is revalidated before returning a saved replay and before commit. Serializable retry behavior remains in place. Missing or revoked sessions cannot be replaced by client-supplied identity.

Both current same-tenant workflow actions and the existing delegated request/response actions obtain the session from `requireSession`, bind its subject/organization to the protected server context and pass only that proof to the domain writer. Request and response do not acquire acceptance's password-freshness requirement. Acceptance retains its current fresh-password, independent-review, permission, consent and module controls.

Affected boundary: Close service, existing authority/context adapters, both action surfaces and focused tests. No schema, migration, financial posting, statutory calculation, provider or commercial behavior changes. Architecture/backend/data, security/IAM/privacy, workflow, accounting/audit, quality and operations reviews apply. New payroll, inventory, AI, statutory and packaging rules are not applicable; no expert certification is claimed.

## Acceptance criteria and evidence

- Current persisted session and permissions are required inside request/response transactions.
- Existing acceptance control tests remain passing; request/response succeed without a password step-up.
- A revocation winning a real database lock prevents publication and leaves evidence/financial state unchanged.
- Committed exact-request replay, assigned response, independent acceptance and retained historical evidence still work.
- Current action transport, typecheck and lint remain valid; prior browser proof is historical until the changed action/service source is exercised.

Initial focused verification: 298 tests across eight suites passed in `evidence/close-evidence-recovery-jest-9a40c9a4-74b0-4de0-9425-81fa8b5bde5c.json`. TypeScript initially found missing nullability narrowing at the throwing session guard (`close-evidence-recovery-typecheck-d36e8556-4705-4b8a-8556-a7d35c0c22de.json`); explicitly declaring the guard's `never` return corrects that control-flow typing. Final static checks are in progress.

The first actual race (`close-evidence-workflow-runtime-26beb0ef-3782-42d5-b38b-3941e4db6a0c.json`) denied mutation but returned INTERNAL_ERROR. A second retained observation (`close-evidence-workflow-runtime-a4b6f407-9f1b-407c-9d58-6a72fdeee980.json`) captured only sanitized error codes and established Prisma `P2010` with PostgreSQL `40001`: raw row-lock serialization conflicts were absent from the retry classifier. The existing three-attempt helper now recognizes raw `40001` and `40P01` as well as its existing Prisma conflicts. All retries re-enter the authority checks; unrelated SQL failures remain non-retryable.

Final actual runtime: all six checks passed in `lanes/environment/close-evidence-workflow-runtime-c751bb00-84ae-499e-9926-4334ea212be6.json`. Both races observed real blocked database connections before allowing revocation to commit. Request publication then returned FORBIDDEN; response publication returned AUTH_REQUIRED. Evidence and financial snapshots remained unchanged by both denied commands. Expired exact retry, historical discovery, assigned response, independent acceptance and retained original evidence passed. Source bindings and outside-fixture observations stayed stable. This is evidence for the recorded race directions only.

The runtime driver now supplies synthetic persisted maker/recipient sessions and includes controlled requester-role and recipient-session revocation transactions. It must observe the actual blocked database connection before releasing the revocation to commit, then assert denied publication and unchanged evidence/financial records. These are narrow interleavings, not universal concurrency proof.

Final static verification: 300/300 tests across eight suites in `evidence/close-evidence-recovery-jest-1a2341d5-c829-4164-9e7e-0e5e55d0c256.json`; no-emit TypeScript in `evidence/close-evidence-recovery-typecheck-cfd7d769-e533-4ffb-9b2d-63e5448853e0.json`; changed-file lint in `evidence/close-evidence-recovery-lint-dd12780a-030e-4821-b7dd-d3df23abd6db.json`. All passed on stable source bindings.

Actual browser transport: `lanes/environment/close-evidence-browser-ceb6ce32-930c-4b8f-9324-e385ab45d897.json` passed both EN desktop and FR mobile journeys through the changed server actions. The test used the new passed runtime fixture and verified loopback listener PID 1796. Requests, assigned responses, current replacement review, actual stale-auth refusal, verification without implicit acceptance, explicit retry, draft restoration and original evidence retention passed. Financial and outside-fixture observations stayed unchanged, source hashes stayed stable and no page errors were captured. New screenshots include final states at 1440, 768 and 320 pixels with reduced motion. The final French 320-pixel screenshot was visually inspected; its message and controls wrap without horizontal overflow. Prior detailed UI inspection remains relevant because this change did not alter the interface. These checks do not establish full accessibility or production performance certification.

Targeted inspection for the next bounded-list correction: `getCloseEvidenceWorkflow` filters assigned/review queues by selected period only after each queue applies its organization-wide item limit. Both queue input types currently omit period and cursor options. Recipient candidates are capped before eligibility filtering; the review-detail function searches only the bounded review queue. A complete correction must address period filtering, navigation through older candidates and direct authorized review lookup together; merely raising the limit would leave the workflow incomplete. This is current source evidence, not yet a large-list runtime result.

Recorded development navigation took 55.475 seconds for the first EN route visit, including route compilation, and 5.517–14.113 seconds for subsequent visits. These observations do not establish a production budget or improvement. After verification, listener PID 1796 was stopped after rechecking its loopback address and parent PID 5188's workspace command. Reports were published with SHA256 guards and backups in `evidence/close-authority-checkpoint-9a892125-394b-40b1-8f35-b0f2642aced2/`; current progress is 457 words. Workflow statuses remain unchanged.

## Operating behavior and remaining scope

If a session expires or is revoked during submission, sign in again and retry the preserved command; the server must determine whether it already committed. Revoked permissions/module access require correction by the appropriate access administrator, not repeated blind submissions. Evidence acceptance still requires an independent authorized reviewer and fresh identity verification.

Remaining scope includes recipient eligibility across concurrency, the opposite lock ordering and other authority interleavings, historical finding localization/assessment context, access beyond bounded lists, requester tracking, full accessibility/zoom and original cash/purchase/Close handoffs. No workflow closure, production release or X1 clearance is claimed.
