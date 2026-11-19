# P04-V02 isolated full-application qualification

The user authorized current-source session, browser and provider qualification on 9 November 2026. This packet owns evidence and disposable local fixtures only. It does not authorize product repairs, production changes, commits or deployment.

## Targets and provenance

- Fresh storage: `D:/p04-v02-fullapp-20261109-r1`; preparation refuses an existing target and requires 12 GiB free. The preparation process copies installed dependencies physically. This is not clean-install evidence.
- Source: current tracked and untracked source captured by the inspected `scripts/candidate-snapshot.cjs`, including local R01–R04 repairs. Capture excludes environment files, dependencies, generated output and roadmap evidence.
- Explicit candidate exceptions: the prior three approved private image aliases are preserved; one synthetic fourth alias, its synthetic tenant upload and one public control image are added for local qualification. The four-alias artifact is not a production-policy release artifact.
- PostgreSQL: fresh data directory under the same storage root, PostgreSQL 17, `127.0.0.1:55509`, role `p04v02`. Exact database names are `stoquify_local_p04v02_20261109_build_r1` and `stoquify_local_p04v02_20261109_full_r1`.
- Application: sealed standalone artifact copied to an external runtime; internal HTTP uses `localhost:3197`, outward TLS uses `https://localhost:3196`. The self-signed certificate and synthetic credentials stay under the task's private storage directory.
- Browser deny proxy: `127.0.0.1:3199`; provider callback receiver: `127.0.0.1:3198`. External provider traffic is blocked, and provider credentials are synthetic protocol fixtures.

## Reviewed sequence

1. `prepare-candidate.cjs`, then `admit-preparation.cjs`: freeze source, preserve originals, copy installed dependencies and verify exact candidate exceptions. No application or database executes here.
2. `database/prepare.cjs`: create a fresh cluster, migrate the exact 121 current migrations in a configuration scaffold, verify ledger checksums, and clone the empty build database into the full-app fixture database. No existing database is reset.
3. `run-build.cjs`: generate a private Prisma client, verify canonical schema equivalence, execute the current `release:artifact` chain with an explicit synthetic environment, and verify the standalone artifact digest. Current release helpers perform a local build; no schema promotion/deployment is delegated.
4. `database/seed-fixture.cjs`: create only synthetic organizations, independent roles, users, credential accounts, modules, locations and items. No session is inserted: signed cookies must come from real credential sign-in.
5. `browser/admit-source.cjs`: reconcile current checkout and isolated source hashes, exact fixture deviations and browser harness syntax. Independent review is a separate required receipt.
6. `run-runtime.cjs`: start the sealed app, TLS proxy and reviewed browser suites. Requalify both image delivery paths and original-alias denial-only protection, then execute current auth transport and private UI recovery cases and the independent UploadThing protocol suite. Failed assertion receipts remain; one independent lane's failure does not establish the outcome of another.
7. `database/finalize.cjs`, `database/stop.cjs`, `final-integrity.cjs`: revoke all sessions belonging to the dedicated synthetic identities, prove business/audit state unchanged by cleanup, stop only the recorded owned cluster after checking its clients/PID/data directory, release owned ports, and verify checkout/source/artifact hashes.

## Effects and evidence

Every database snapshot digests all business tables, including user, role and provider-account state. Session and audit tables have separate full-row hashes and sanitized identities. Neither tokens nor passwords are published. The baseline read classifier permits only the exact expected module-denial audit rows and cleanup of a request's already-expired session; it rejects any other change. Provider protocol cases require session and business digests unchanged and identify the one allowed module-denial audit case precisely. Auth mutation tests record before/after database state even if a denial fails.

Browser tests retain the default HTTP cache and use actual signed cookies, the real current application and real database state. Source review, recipe syntax checks, actual HTTP, browser observations and native database effects are reported separately. Hosted OAuth, hosted UploadThing/CDN, production alias owner reads, clean installation and production deployment remain separate acceptance work.

## Recovery

No checkout product source is changed. Failed attempts are retained under distinct receipts. Synthetic module transitions restore the prior fixture state; session revocation is recorded rather than recreating revoked tokens. Unexpected writes remain isolated and are reported as findings. The owned runtime/proxy/browser processes are closed in `finally`; cluster cleanup checks exact ownership and refuses unexpected clients. Database and artifact files remain available for review after shutdown. Never point these scripts at retained historical targets or production.
