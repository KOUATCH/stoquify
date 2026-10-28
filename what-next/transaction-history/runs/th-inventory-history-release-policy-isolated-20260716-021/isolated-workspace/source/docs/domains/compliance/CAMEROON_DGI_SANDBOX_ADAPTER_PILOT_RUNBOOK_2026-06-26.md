# Cameroon DGI Sandbox Adapter Pilot Runbook

Date: 2026-06-26
Skill: 015-aqstoqflow-country-adapter-pilot
Scope: Cameroon DGI sandbox-shaped compliance adapter only

## Decision

The platform may run the `CM_DGI_SANDBOX` adapter only as a sandbox pilot. It must not be presented as production fiscal certification, because the Cameroon country pack still marks e-invoicing as `REQUIRES_EXPERT_REVIEW` and blocks production automation until official DGI technical specifications and qualified expert review are attached.

## Preconditions

- The tenant has an active `ComplianceAdapterConfig` for country `CM`, channel `CM_DGI_E_SERVICES_PORTAL`, environment `SANDBOX`, and adapter key `CM_DGI_SANDBOX`.
- The adapter config stores only a credential reference to an external vault or secret manager. Secrets and raw credential paths must not be stored in country packs, submitted payloads, response payloads, logs, dashboard snapshots, or evidence summaries.
- The fiscal document must come from a posted ledger source with a posting batch and country-pack resolution hash.
- The resolved country pack must match the fiscal document pack version, schema version, and resolution hash.
- Production adapter registration remains blocked until official specifications, expert approval, sandbox evidence, and tenant credential governance are recorded.

## Pilot Flow

1. Confirm the country pack resolves Cameroon e-invoicing metadata and that `productionAutomationAllowed` is `false`.
2. Create or select a posted fiscal document with immutable source trace, line totals, tax amounts, and pack metadata.
3. Enqueue a compliance submission through the protected server action or service, preserving the idempotency key.
4. Let the outbox processor build the canonical authority payload and store submitted-payload evidence.
5. Submit through `CM_DGI_SANDBOX` only after the DB submission state is updated.
6. Store authority response, authority reference, and artifact evidence with hashes.
7. Show the tenant only adapter readiness and credential presence in the Compliance Center.

## Sandbox Fixtures

- `ACCEPT`: returns a `CM-SBX-*` authority reference with `SANDBOX_ONLY_NO_PRODUCTION_CERTIFICATION`.
- `OUTAGE`: returns retryable outage status and schedules retry without rejecting the fiscal document.
- `RATE_LIMITED`: returns retryable rate-limit status and schedules retry without rejecting the fiscal document.
- `REJECT`: returns a terminal sandbox rejection and marks the fiscal document rejected.

## Disable And Rollback

- Disable the tenant adapter config by setting status to `DISABLED`; this must stop future submissions without breaking POS posting or ledger posting.
- Keep existing fiscal documents and evidence immutable.
- Requeue only submissions that remain safe to retry and whose payload hash still matches the canonical fiscal document.

## Production Blockers

- No official DGI e-invoicing API, portal, or certification technical specification is attached with version/date.
- No qualified expert review approves production formula, payload, artifact, credential, and submission semantics.
- No regulator-confirmed production credential process is recorded.
- No production endpoint, payload schema, retry contract, rejection taxonomy, or certification artifact contract is validated.

## Validation Gates

- Country-pack validation passes.
- Sandbox adapter unit tests cover accept, outage, rate-limit, rejection, non-sandbox block, and credential redaction.
- Outbox tests prove evidence capture, retry scheduling, and terminal rejection behavior.
- Dashboard snapshot exposes credential presence only, not the raw credential reference.
- Prisma schema validation, typecheck, lint, and compliance route smoke checks pass for touched surfaces.