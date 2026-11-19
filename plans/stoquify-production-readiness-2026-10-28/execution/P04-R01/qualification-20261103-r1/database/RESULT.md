# P04-R01 native qualification result

**Passed locally, 3 November 2026:** 37/37 tests, zero failed or skipped. Independently reviewed runner `run-native-retry01.cjs` executed from 17:35:54 to 17:37:49 UTC. [Execution receipt](native-result-retry01.json), [Jest result](native-jest.json), [database observations](native-observations.json). This result is real PostgreSQL and actual server-action composition; it is not HTTP, signed-cookie or browser qualification.

The runner created an entirely new PostgreSQL17 cluster at `.codex-tmp/p04r01-qualification-20261103-r1/postgres`, user `p04r01`, database `stoquify_local_p04_r01_20261103_r1`, IPv4 loopback port64932. All121 current migrations replayed successfully and their stored checksums matched copied source. No retained P03/R02 cluster/database was started or changed. The existing private Prisma client passed every manifest hash and exact canonical schema comparison using the pinned installed Prisma6.19.3 WASM transform.

All5,204 captured application/test/recipe files matched before and after execution. Root and copied migration bytes also remained unchanged. Source evidence is content-bound in the execution receipt; concurrent changes made after this run are not automatically qualified.

## Observed outcomes

- Reserved `Admin`, `Administrator`, `Super Admin` and normalized codes are denied for limited delegates in creation and assignment. Empty reserved roles and ordinary dashboard grants/role edits that would activate a latent reserved role are denied.
- Legitimate tenant administrators can create, edit and assign reserved roles. Ordinary delegates can assign normal roles without expanding recipient location scope. Target sessions are actually revoked by successful assignments.
- Current persisted expired/revoked sessions, removed permissions, foreign roles and forged organizations are denied through real action functions despite stale stubbed transport. A lost reserved role code or membership prevents replay even when explicit permissions remain.
- Invitation issuance/replay/replacement, both advisory and locked redemption authority reads, and historical invitation acceptance are qualified. A historical reserved invitation without code provenance is denied with no account/invite change; an ordinary historical invitation creates its real credential account/password-history row and becomes accepted. Actual password hashing ran; no email provider was invoked.
- Reactivation uses an actual preceding deactivation and its stored receipt. Limited delegates cannot reactivate reserved authority; legitimate administrator and ordinary limited-delegate positives pass.
- Access-request submit/preview/decision/application use actual action exports. Normal application commits and replays once. Current code loss blocks pending and already-APPLIED reserved-grant replay; pending failure retains the explicitly allowed FAILED/REVIEW_REQUIRED evidence transition.
- Two real database clients demonstrate an actual organization-row lock wait. Revoking the actor's reserved code before releasing the lock causes the waiting command to deny without unauthorized changes. A fixture-conditioned receipt-write failure rolls back role membership and target-session deletion; a subsequent successful command revokes the one retained target session.

The observations contain33 selected-state before/after pairs across36 recorded observations. They hash full synthetic organizations, users, roles, memberships, sessions, accounts, password history, locations, invitations, access requests, business events/outbox/audits and module configuration/grant/command rows. They are not whole-platform table coverage. General security audit rows are counted separately. The expected FAILED access-request transition and race's deliberate actor-role edit are explicit exceptions; public-identity abuse accounting added one bucket per historical redemption attempt. These allowed security/evidence writes are not hidden under a blanket zero-write claim.

## Cleanup and limits

The test disconnected Prisma and its auxiliary clients. The runner found no remaining client sessions, verified the owned postmaster PID18504/data-directory identity, stopped it, confirmed stopped status and released port64932. The database and all evidence remain intact. No reset/delete of retained fixtures, production migration, commit, push or deployment occurred.

Better Auth `getSession`, Next headers and cache invalidation are explicit stubs. Persisted session/fresh-auth/RBAC/tenant checks, services, actions and PostgreSQL were real. No actual signed cookie, HTTP server-action transport, rendered browser, provider delivery or hosted deployment is certified. No clean dependency installation/build occurred. Package advancement remains the parent agent's independently reviewed gate decision.

Initial attempt01 failed before any process/database creation on a whitespace-only schema-comparison issue. Its original receipt/recipe remain preserved in [ATTEMPTS.md](ATTEMPTS.md). Retry01 strengthened admission to exact canonical Prisma bytes rather than weakening schema validation.

Evidence SHA-256:

- `native-result-retry01.json`: `55636916200b65001ef83382cd08455bff8325688fafa2761b1f8ebc6d2b6b5d`
- `native-jest.json`: `18428d3172fdcb6767771e97bce336138eedd08cfc2900058d802d68a680cb8e`
- `native-observations.json`: `ae476b10bae6c320a8c6a8ecef3d1b06c879708b6f6e92495a1ce43c85212582`

The executed test source is now retained byte-exact as [authority.postgres.test.ts.source.txt](authority.postgres.test.ts.source.txt). [Relocation receipt](test-source-relocation.json) preserves the executed path/hash; historical one-shot runner/config remain unchanged.
