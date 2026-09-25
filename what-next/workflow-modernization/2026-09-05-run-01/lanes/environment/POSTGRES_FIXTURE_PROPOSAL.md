# Scoped real PostgreSQL workflow proof

Parent authorized execution on 2026-09-05 after the read-only environment baseline. This plan does not authorize production work, messages, provider calls or changes to the five existing browser accounts.

## Target and ownership

Reuse `stoquify_local_modern_modules_controls_20260905_01` through the inspected `scripts/run-modern-modules-postgres-smoke.js` target resolver. Recheck exact current_database(), loopback, all current organization ownership markers and required migrations before writing. Both database URLs are bound to that target. New organization IDs use `org_modules_service_smoke_workflow_<unique>_<purpose>`, with the existing `local-modern-modules-postgres-controls` marker. New users, reset tokens, customers and statement inputs belong only to these organizations. No broad cleanup, seed, migration or schema changes.

The runner uses actual Prisma and current production services. Test-only wrappers coordinate two already-completed token reads and inject a failure inside a real transaction; they do not replace reads, token conditions, password hashing or writes. Concurrent reset attempts use separate real transactions/connections. Tokens/passwords/signing secrets stay in memory and never enter receipts. Source hashes before/after bind the result.

## Password reset

Create new verified synthetic identities with real credential hashes and current32-character lowercase-alphanumeric reset tokens. Obtain any session through the installed real `auth.api.signInEmail`; do not insert a manufactured authenticated session.

1. Two concurrent completion calls with different valid replacement passwords and the same current token: exactly one200 and one404; one credential/history change; original session revoked; User and credential Account agree; only the winning password verifies.
2. Expired token and replaced token: deny and preserve credentials/token/history/session state.
3. Invalid token format: deny without credential effects. Six-digit OTP is not a password-reset token.
4. Inject a test-only failure at credential Account upsert after the real conditional token update and User update. PostgreSQL must roll back token consumption and credential changes; retry without fault must succeed.

The production public abuse limiter remains active. Runner-generated secrets and unique subjects isolate its buckets. All outbound fetch is blocked; the password policy follows its existing HIBP-offline behavior. That is an explicit external-breach-service limitation, not a claim that an online breach check passed. Password hashing, history and database effects remain real. The mail constructor is now lazy; completion must not send email, and no provider key is supplied.

## Customer-statement recipient retry

Use a clearly labeled immutable synthetic snapshot input with internally consistent payload hash and balance; snapshot generation and ledger provenance are outside this downstream proof. Use the real token-issuance service, real signature verifier, real recipient-action service, real event/state/access/audit writes and database constraints.

1. Submit a promise for a future date, then retry the identical command after that date while the token remains valid: same action/state hashes, no duplicate creation/event/state; access-read evidence may increase.
2. Changed payload with the same key: conflict. A new command with a past promise date: reject without new action/state/event.
3. Expired, revoked or foreign-snapshot tokens: deny even when the requested action previously exists.
4. Check exact organization scope and retained snapshot hash. No delivery, settlement, payment or ledger posting is invoked.

Time control uses the existing internal service test clock; public input stripping/transport behavior is separate unit/action coverage. New fixture rows are retained under their unique source-owned prefix for reproducibility; secrets are discarded after the runner. Do not claim that rollback-only fixtures prove concurrency; only the two independent reset transactions do.

## Purchasing editor follow-up

Requires separate browser-target authorization and guard: a new scoped purchasing actor, supplier, item/location and real draft order. Do not alter existing accounts/grants/stops. Test quantity2 × cost100, tax19.25%, line discount10, shipping15 → total243.50; save unchanged through the real editor/action. A negative save must use an actually forbidden state/authority, not merely SUBMITTED because current source still allows that state. Retain draft on failure and compare persisted financial values before/after.
