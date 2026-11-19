# P04-R06 bounded authentication repair contract

Authorization: see [AUTHORIZATION.md](AUTHORIZATION.md). Before-state inventory and historical V02 failures remain immutable.

## Implemented scope pending qualification

Only lib/auth.ts and lib/security/auth-session.ts are product edits. Better Auth cookie-cache authority is disabled, including still-signed caches issued by the earlier configuration. The shared before hook checks protected HTTP and server API operations using the SDK fresh-session resolver, clears a pre-existing context session, and forces cache bypass and no refresh regardless of caller query. It reads current active/lock state by the session subject. Public endpoint templates retain their existing proof; sign-out remains a cleanup exception; anonymous or expired get-session retains its native nullable behavior.

Inactive, missing, indefinitely locked and currently throttled accounts receive a generic current-session denial. An expired temporary lock is eligible without an incidental unlock. Full tenant/role/module/email admission is still enforced at existing application guards, not imposed on every self-account operation. The application session helper translates only this exact new recognized denial to the existing unauthenticated error; other errors propagate.

## Verification and advancement

1. Independent source and recipe review, bounded mocked regressions with network and environment-file access disabled.
2. Fresh isolated full source and physical dependency copy on D:, no shared generated client, synthetic local credentials and empty disposable database. Record migration/build/artifact identity and do not touch existing application targets.
3. Genuine pre-repair signed-cache issuance against the same isolated identities and signing secret after the repaired build completes; stop baseline then replay unmodified cookies against the repaired artifact before original expiry. Prove cookie identity and remaining lifetime without recording raw credentials or cookies.
4. Denials for revoked/expired sessions and current-account lifecycle changes; authorized reads/writes; exact native database before/after evidence. Classify any intended expiry cleanup separately. Confirm real EN/FR app consumers deny safely and fresh sign-in restores authorized access.
5. Independently review actual outcomes, preserve failed attempts, record source drift, stop owned processes and revoke synthetic sessions. Advance only when each scoped gate passes.

## Boundaries and recovery

R06 does not qualify concurrent revocation ordered atomically against an already executing mutation. It adds fresh admission reads and may increase database work; no performance capacity claim is made. Disabled deletion/email-change and hosted-provider branches remain outside local success evidence. P04-R05/R07/R08 and parent qualification remain separate.

Before files are preserved with hashes in preservation/before. Rollback would restore only owned hunks after checking for subsequent edits; never reset the dirty working tree. Such rollback restores the known authentication defect and requires retaining the production block. No commit, push, production flags/data migration or deployment.

## Source correction before capture

Independent review confirmed a source-derived transient-error path in the initial revision: the SDK convenience session resolver catches lookup errors and returns null. A nullable session endpoint could then retry and expose an ineligible subject without the account check. Revision2 calls the exported raw SDK getSession endpoint with the same forced fresh/no-refresh/GET settings, propagates lookup errors, and preserves response headers. A successful native null remains anonymous; a failed lookup cannot be treated as proof of anonymity. Original source/test admissions and83-test outcome are retained; successor source review and87-test regression outcome are required before capture. No runtime reproduction of the transient fault is claimed.
