# Real PostgreSQL workflow checks

Executed 2026-09-05 against the exact loopback database `stoquify_local_modern_modules_controls_20260905_01`. Existing organizations passed the established ownership guard before writes; new fixtures use unique `org_modules_service_smoke_workflow_*` IDs and the existing controls source marker. No schema changes, migrations, existing-account changes or external messages occurred.

## Results and bindings

| Receipt | Result | Scope |
|---|---|---|
| `postgres-preflight-c1e6d395cc37.json` | Ready, read-only | Real DB/ownership/migration guard and runtime imports |
| `postgres-run-f799fb30e867.json` |3 grouped identity checks passed;1 statement setup failed | Initial actual-service run; failure preserved |
| `postgres-statement-dd56bf1aa069.json` |1 grouped statement check passed | Only affected workflow rerun after source correction |

Aggregate completed behavior: three identity groups plus one statement group. These are grouped scenarios with multiple assertions, not four individual assertions. No failed initial test was overwritten.

Identity source was stable during its run. The original helper encoded file buffers as JSON before fingerprinting. `environment-binding.json` verifies those original fingerprints against the same bytes and supplies standard raw-byte SHA-256 values. The later statement receipt and current driver use standard raw-byte hashes. Subsequent parent OTP work is a separately verified source revision, not silently included in these results.

## Identity behavior actually proved

The installed Better Auth email/password API created genuine sessions for two newly created synthetic users. No session was manufactured by inserting an authenticated row.

Two current-token completion calls were coordinated only after both real reads observed the same token. They then used two distinct PostgreSQL backend connections and real transactions. Results were404 and200; conditional consumption counts were0 and1. Exactly one password-history record and one completion audit were created. The existing genuine session was removed; User and credential Account hashes agreed and only the winning replacement password verified.

Expired, replaced, six-digit and malformed reset tokens all returned404 with unchanged token/credential/history/session snapshots. The six-digit case confirms an OTP does not satisfy the reset-token format.

The rollback test injected a runner-only exception at Account upsert, after the real conditional token update and User password update. PostgreSQL restored the entire original identity snapshot, including the genuine session and current token. Retrying without the fault succeeded and revoked the session exactly through the production service. No production bypass, trigger or schema change was introduced.

Four HIBP fetch attempts were blocked before network transmission. Production policy followed its existing offline behavior. Online password-breach screening is therefore unverified; password schema, hashing, history, abuse limiter and credential transactions were real. The completion workflow sent no email and needed no mail-provider key.

## Statement behavior actually proved

A clearly labeled synthetic immutable snapshot supplied a25.00 balance and matching real content hash. This input does not prove snapshot generation, posted receivable provenance or accounting correctness. All downstream token signing, stored token resolution, recipient actions, states, events, access logs and audit writes used the real production services and PostgreSQL constraints.

The initial no-metadata token issuance failed with PostgreSQL23514: the service wrote JSON null, while `customer_statement_access_tokens_metadata_check` accepts SQL NULL or an object. The owner corrected only the omitted-metadata default to `Prisma.DbNull`; schema and constraints remained unchanged. The exact omitted-metadata call then succeeded in the rerun.

A20.00 promise was accepted for a future date. Retrying the identical command after that date but before token expiry returned the same recorded action, payload hash and state hash. Counts stayed at one recipient action, one state and one creation event. Current access authorization remained effective: changed-payload conflict, a new past-dated promise, expired token, different statement ID and revoked token all rejected without extra action/state/event records. The source receipt calls the different ID “foreign snapshot”; this was a signed-token/statement-ID mismatch, not a separately populated cross-tenant statement fixture. Do not claim broader cross-tenant record proof from that case.

The snapshot content hash remained unchanged. Access-read evidence may legitimately increase on replay. Internal service clock inputs model elapsed time; the public transport's rejection of caller-supplied clocks is separate action/schema coverage. No payment, settlement, delivery, ledger posting or external customer contact was invoked.

## Retention and follow-up

Unique controls fixtures are retained for evidence reproducibility; raw tokens/passwords/signing secrets were held only in process memory and discarded on exit. Receipts contain safe identifiers, counts and hashes. Neither previous controls fixtures nor the five existing browser identities were changed by these checks.

Purchase-editor fixtures are a separately authorized stage in the existing browser database. Their creation and UI results have their own receipts and do not alter the scope of this PostgreSQL evidence.
