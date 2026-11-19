# P03-R01 grant-command recovery contract

A focused regression through the real invite-to-grant service functions reproduced same-command CONFLICT after first success (database mocked). Different-command conflict remained correct. Source review located the dropped invitation key. This is distinct from the sealed UI pending-state experiment.

The optional key now reaches the grant service. A tenant/key advisory transaction lock serializes keyed commands. An applied BusinessEvent receipt binds authoritative tenant/actor, normalized request identity, grant ID and the complete returned grant-row hash. The existing ACCOUNTANT_ACCESS_GRANTED event and notification outbox remain unchanged; the additional receipt has no delivery. Receipt and grant commit atomically.

An exact retry returns only the same unchanged, non-revoked, unexpired grant with a valid reserved scope. Current permission and fresh-auth protection still wrap the action before service invocation. Scheduled grants remain scheduled. Missing/mismatched receipts, changed input or grant data, revoked/expired grants and distinct active-scope commands fail closed. An omitted effectiveFrom is hashed as an omission marker, not a newly computed clock value. Expiry is reassessed after lock/read latency.

No schema migration or historical grant backfill is introduced. Legacy grants without a command receipt keep their existing conflict behavior. Mixed-version rollout and combined current-source release qualification remain outside this bounded comparison (P13/P33). Reverting the owned code preserves all grants and receipts; old code may report conflict on retry, requiring current-state review, but must never delete or recreate consent.

Verification: initial regression1fail/1pass; first repair19pass/2fail exposed mutable grant evidence; tightened26/26 mocked replay cases pass; combined service/action50/50 pass. Real PostgreSQL concurrency/rollback and separately sealed native response-loss recovery are still required.

Isolation review holds the native suite pending a private generated-client mapping, because the shared Prisma client has environment-file lookup paths. Prior mocked suites had fully mocked DB operations; their environment-loading limits are under review and must not be relabelled native or fully isolated proof.
