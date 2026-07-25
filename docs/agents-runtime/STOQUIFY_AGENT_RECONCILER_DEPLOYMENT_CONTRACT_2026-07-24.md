# Stoquify Agent Reconciler Deployment Contract

**Date:** 2026-07-24  
**Last verified:** 2026-07-25  
**Scope:** Agent Runtime Phase 2 operational reconciliation  
**Repository status:** Implemented and locally verified  
**Deployment status:** Not deployed  
**Activation authority:** None

## Purpose

This contract defines the minimum provider-neutral deployment for Stoquify's five-minute Agent Runtime reconciler. It does not authorize an agent, create human approvals, or substitute local evidence for production-like operations.

The reconciler:

- closes abandoned read-only agent runs;
- reconciles release approvals, owners, certification, manifest, cadence, and alert health;
- records Workflow Assurance evidence;
- suspends an `ACTIVE_INTERNAL` release when blocking drift is detected;
- dispatches retry-safe Workflow Assurance alerts;
- never activates a release.

## Deployment Unit

Schedule this repository command every five minutes:

```text
npm run agent:reconciler:invoke
```

The worker calls:

```text
POST /api/internal/agents/reconcile-abandoned
```

It generates:

- `Authorization: Bearer <managed secret>`
- `x-stoquify-scheduler-run-id`
- `x-stoquify-scheduler-scheduled-at`

The run ID and scheduled timestamp are deterministic for each five-minute UTC window. Retries therefore use the same durable invocation identity.

## Managed Configuration

Required:

```text
STOQUIFY_AGENT_RELEASE_ENVIRONMENT
STOQUIFY_AGENT_RECONCILER_BASE_URL
STOQUIFY_AGENT_RECONCILER_SECRET
STOQUIFY_ASSURANCE_ALERT_WEBHOOK_URL
STOQUIFY_ASSURANCE_ALERT_WEBHOOK_SECRET
STOQUIFY_AGENT_ALERT_EVIDENCE_URL
STOQUIFY_AGENT_ALERT_EVIDENCE_SECRET
STOQUIFY_AGENT_ALERT_EVIDENCE_TIMEOUT_MS=20000
STOQUIFY_AGENT_GOVERNANCE_EVIDENCE_URL
STOQUIFY_AGENT_GOVERNANCE_EVIDENCE_SECRET
STOQUIFY_AGENT_GOVERNANCE_EVIDENCE_TIMEOUT_MS=20000
STOQUIFY_AGENT_CI_RELEASE_EVIDENCE_URL
STOQUIFY_AGENT_CI_RELEASE_EVIDENCE_SECRET
STOQUIFY_AGENT_CI_RELEASE_EVIDENCE_TIMEOUT_MS=20000
STOQUIFY_AGENT_CREDENTIAL_EVIDENCE_URL
STOQUIFY_AGENT_CREDENTIAL_EVIDENCE_SECRET
STOQUIFY_AGENT_CREDENTIAL_EVIDENCE_TIMEOUT_MS=20000
```

Bounded policy:

```text
STOQUIFY_AGENT_RECONCILER_LEASE_MINUTES=10
STOQUIFY_AGENT_RECONCILER_TIMEOUT_MS=120000
STOQUIFY_AGENT_RECONCILER_MAX_ATTEMPTS=3
STOQUIFY_AGENT_RECONCILE_AFTER_MINUTES=15
STOQUIFY_AGENT_RECONCILE_LIMIT=100
STOQUIFY_AGENT_SCHEDULER_EVIDENCE_URL
STOQUIFY_AGENT_SCHEDULER_EVIDENCE_SECRET
STOQUIFY_AGENT_SCHEDULER_EVIDENCE_TIMEOUT_MS=20000
```

Optional only during credential rotation:

```text
STOQUIFY_AGENT_RECONCILER_SECRET_PREVIOUS
```

Secret values must remain in the deployment provider's managed secret store. They must not appear in source control, command output, evidence files, URLs, or logs.

## Durable Invocation Ledger

Migration:

```text
20260724193000_agent_reconciler_invocation_ledger
```

Table:

```text
agent_reconciler_invocations
```

Each invocation records environment, schedule key, run ID, request hash, scheduled/start/completion times, status, correlation ID, sanitized result, and stable failure code.

Database constraints provide:

- one identity per environment, schedule, and run ID;
- one active lease per environment;
- conflicting replay rejection;
- completed replay without duplicate execution;
- stale-lease terminalization before a later window acquires the lease;
- no raw exception or secret persistence.

## Readiness Contract

An authenticated readiness request is available at:

```text
GET /api/internal/agents/reconcile-abandoned
```

The endpoint returns `200` only when:

- the current reconciler secret is configured;
- alert transport is healthy;
- the latest three windows are `COMPLETED`;
- the three windows follow the five-minute cadence within bounded jitter;
- the newest window is fresh;
- no active lease is stale.

It returns `503` with stable blocker codes otherwise. It returns `401` for an invalid bearer credential and `503` when the server-side current secret is missing.

This endpoint contains no secret values, raw failures, personal data, tenant records, or business evidence payloads.

## Rotation Procedure

1. Create a new managed secret version.
2. Deploy the server with the new value as `STOQUIFY_AGENT_RECONCILER_SECRET`.
3. Temporarily place the old value in `STOQUIFY_AGENT_RECONCILER_SECRET_PREVIOUS`.
4. Update the scheduled worker to use the new current value.
5. Prove three consecutive successful windows with the new value.
6. Remove `STOQUIFY_AGENT_RECONCILER_SECRET_PREVIOUS`.
7. Revoke the old managed secret version.
8. Retain deployment, health, and revocation references without storing either value.

The previous slot must never become a permanent fallback.

## Deployment Ceremony

1. Select a clean reviewed commit and immutable deployment artifact.
2. Apply all additive Prisma migrations through the release pipeline.
3. Configure the stable non-production release environment.
4. Configure managed reconciler and alert secrets.
5. Deploy the application without activating any agent package.
6. Schedule `npm run agent:reconciler:invoke` every five minutes with single-concurrency execution.
7. Observe three consecutive successful windows.
8. Query the authenticated readiness endpoint.
9. Prove unauthorized and missing-configuration responses.
10. Introduce controlled manifest drift and verify Workflow Assurance evidence.
11. Verify guarded suspension only against an explicitly approved test package.
12. Restore the package and retain rollback evidence.

## Local Verification

Verified locally:

- Prisma schema validation passed.
- Migration safety passed with 34 migrations and zero destructive findings.
- Migration deployed successfully to controlled PostgreSQL.
- Scheduler, route, cadence, auth, rotation, and error-policy tests passed.
- Focused scheduler regression passed: 5 suites and 33 tests.
- Focused readiness, evidence-capture, operational, and credential regression passed: 4 suites and 36 tests.
- Focused alert, operational, and reconciler evidence regression passed: 3 suites and 32 tests.
- Focused governance, operational, alert, and reconciler evidence regression passed: 4 suites and 44 tests.
- Focused CI/release, governance, operational, alert, and reconciler evidence regression passed: 5 suites and 56 tests.
- Focused scheduler-deployment, credential, CI/release, governance, operational, alert, and reconciler evidence regression passed: 8 suites and 83 tests.
- Full repository regression passed: 474 suites and 2,862 tests, with 3 suites and 15 tests intentionally skipped. A focused eight-suite, 83-test `--detectOpenHandles` run was clean.
- Full TypeScript validation passed.
- Production build passed with an explicit 8 GB Node heap and valid post-build output.
- PostgreSQL smoke rejected overlap and conflicting replay.
- PostgreSQL smoke replayed a completed request without re-execution.
- PostgreSQL smoke recovered an expired lease.
- PostgreSQL smoke retained terminal failure codes and released every active lease.
- Agent prohibited-action gate passed.
- Phase 2A static gate passed.
- Raw-error boundary gate returned zero active unsafe findings.

Not yet proven:

- a deployed production-like schedule;
- three real consecutive scheduler windows;
- healthy managed alert delivery and external acknowledgement;
- named operations-owner acceptance;
- clean-commit CI and deployment identity;
- credential-rotation and revocation evidence.

## Operational Evidence Gate

The provider-neutral completion register is:

```text
docs/agents-runtime/STOQUIFY_AGENT_RUNTIME_OPERATIONAL_RELEASE_EVIDENCE_2026-07-25.json
```

Run:

```text
npm run agent:reconciler:evidence:report
npm run agent:reconciler:evidence:gate
npm run agent:reconciler:evidence:apply
npm run agent:scheduler:evidence:report
npm run agent:scheduler:evidence:gate
npm run agent:scheduler:evidence:apply
npm run agent:alert:evidence:report
npm run agent:alert:evidence:gate
npm run agent:alert:evidence:apply
npm run agent:ci-release:evidence:report
npm run agent:ci-release:evidence:gate
npm run agent:ci-release:evidence:apply
npm run agent:governance:evidence:report
npm run agent:governance:evidence:gate
npm run agent:governance:evidence:apply
npm run agent:credential-rotation:evidence:report
npm run agent:credential-rotation:evidence:gate
npm run agent:credential-rotation:evidence:apply
npm run agent:credential-rotation:gate
npm run agent:operational-release:report
npm run agent:operational-release:gate
```

The fail-closed gate binds the deployed commit and artifact to clean CI, distinct product/security approvals, six owner responsibilities, three five-minute windows, fresh readiness and heartbeat, alert acknowledgement/escalation/recovery, and the independently evaluated credential-rotation register.

The collector runbook is `docs/agents-runtime/STOQUIFY_AGENT_RECONCILER_EVIDENCE_CAPTURE_RUNBOOK_2026-07-25.md`. The collector performs invalid-auth and authenticated readiness probes, sanitizes three window identities/timestamps, hashes the evidence, and can patch only scheduler evidence while activation remains false/null.

The scheduler deployment collector runbook is `docs/agents-runtime/STOQUIFY_AGENT_SCHEDULER_DEPLOYMENT_EVIDENCE_CAPTURE_RUNBOOK_2026-07-25.md`. It independently proves the scheduler control plane, managed authentication reference, concurrency policy, deployed commit/artifact, missing-configuration 503 behavior, and failure-alert provenance. It can patch deployment metadata only; readiness and successful windows remain owned by the reconciler collector.

The alert collector runbook is `docs/agents-runtime/STOQUIFY_AGENT_ALERT_EVIDENCE_CAPTURE_RUNBOOK_2026-07-25.md`. It performs invalid-auth and authenticated query-free HTTPS probes, validates fresh delivery, owner acknowledgement within SLO, retry, dead-letter, recovery, escalation, and secret rotation, hashes the sanitized evidence, and can patch only alerting evidence while activation remains false/null.

The governance collector runbook is `docs/agents-runtime/STOQUIFY_AGENT_GOVERNANCE_EVIDENCE_CAPTURE_RUNBOOK_2026-07-25.md`. It rejects local E2E identities, performs invalid-auth and authenticated query-free HTTPS probes, binds real approvals and six-owner coverage to the frozen release, hashes the sanitized attestation, and can patch only governance, approvals, and owners while activation remains false/null.

The CI/release collector runbook is `docs/agents-runtime/STOQUIFY_AGENT_CI_RELEASE_EVIDENCE_CAPTURE_RUNBOOK_2026-07-25.md`. It proves invalid-auth rejection, clean and fresh CI, certified inactive package state, immutable release/hash alignment, and can patch only release and CI evidence while activation remains false/null. Run it before governance capture so approvals bind to the frozen identity.

The credential collector runbook is `docs/agents-runtime/STOQUIFY_AGENT_CREDENTIAL_ROTATION_EVIDENCE_CAPTURE_RUNBOOK_2026-07-25.md`. It requires all 15 credential classes exactly once, rejects value-bearing and synthetic evidence, proves invalid-auth rejection, binds a fresh security attestation to the frozen inactive release, and can update only the credential register and its operational hash/reference binding.

Required apply order:

```text
npm run agent:ci-release:evidence:apply
npm run agent:governance:evidence:apply
npm run agent:scheduler:evidence:apply
npm run agent:reconciler:evidence:apply
npm run agent:alert:evidence:apply
npm run agent:credential-rotation:evidence:apply
npm run agent:credential-rotation:gate
npm run agent:operational-release:gate
```

It accepts value-free evidence references only. Even a passing result means `READY_FOR_INDEPENDENT_REVIEW`; it never authorizes activation.

## Release Decision

This contract makes the deployment step executable and auditable. It does not close the deployment gate by itself.

Internal activation remains `NO-GO`, and Phase 3 remains unauthorized until the external and human evidence is complete and the independent enterprise release gate approves promotion.

