# AF16 staged rollout and restrictive recovery

25 October 2026. Development rehearsal and future operational procedure. No production rollout or schema promotion is authorized by AF16 development verification.

## Before a later rollout

Freeze the exact source, migrations, artifact digest and release scope. Review the current GO_NO_GO matrix. Require a successfully built, sealed application artifact, its verification receipt, hosted migration prerequisites, populated upgrade evidence, acceptable current authority/browser checks and named support owners. Obtain any qualified country evidence required by the selected cut. A prepared pilot is not a passed pilot.

Reuse `docs/release/ARTIFACT_SCHEMA_PROMOTION.md` and the existing release scripts. Build/artifact preparation and schema promotion are separate operations. The promotion gate must validate the trusted artifact before target connection/migration and retain its lock throughout the operation. This run's fixture tests do not establish an actual deployable standalone build or hosted compatibility.

## Staging and observable failure signals

Start with the explicitly approved internal/synthetic cohort, then separately authorized firms. Verify sign-in, portfolio coverage, managed consent and assignment, request/response/review, bounded exports and fresh authority after each step. Observe access denials, unavailable/partial proof, stale sources, duplicate receipts, transaction failures, outbox pending/locked/failed/dead-letter counts and oldest actionable age. Operations and product must agree latency/error budgets before a live gate.

Never treat upload or response acceptance as reconciliation signoff, a statutory filing, a completed close or independently reviewed financial truth. AF11 unsupported candidates remain UNKNOWN.

## Stop and recover

1. Stop new writes through existing release/operational controls for the affected surface; preserve read/retention behavior only where current authorization allows it. Suspend the affected engagement through its lifecycle when the incident is engagement-specific. Record actor, reason, scope and correlation evidence.
2. Preserve named grants, managed links, assignments, versions, audit/event receipts and retained work. Never delete a managed link, replace a managed scope key with a legacy key, enable a flag fallback or activate a revoked grant to restore access.
3. On uncertain commands, retrieve current state and retry the original idempotency key/payload only after current authorization and source checks. Do not issue a new financial command merely because the response was lost.
4. For queues, inspect current leases and attempts. Retry through the existing worker after its backoff; stale owners must fail acknowledgement. Keep dead letters visible with their incident owner. Local no-op delivery tests do not authorize external delivery or prove provider availability.
5. Roll application code back only to a version compatible with retained schema and restrictive managed authorization. A pre-AF04 grant-only reader must remain fenced by the managed key. No destructive down migration, direct balance rewrite or whole-opening-cutover undo is permitted by this runbook.
6. Reconcile affected retained receipts, exports and source hashes. Re-run the exact failed scenario and current authority checks before resuming the surface. Document unresolved effects and obtain the separate release decision.

## Support and incident handoff

Capture the source/artifact identity, route and locale, role, pseudonymous scope, command/correlation identifier, timestamps, expected versus actual outcome and receipt references. Exclude passwords, session tokens, confidential notes and unrelated client data. Engineering owns defect triage; operations owns containment/recovery; the firm reviewer owns financial interpretation; a qualified reviewer owns country support claims. Notify real people only under separately authorized communication.

## Rehearsal record

See RESULT.md for actual current database, browser, worker and release-fixture outcomes. Tests of suspension, grant-key fences, duplicate commands and stale leases are local control rehearsals. Full previous-application deployment, hosted promotion and restoration from a production backup remain separate, unexecuted operational exercises.
