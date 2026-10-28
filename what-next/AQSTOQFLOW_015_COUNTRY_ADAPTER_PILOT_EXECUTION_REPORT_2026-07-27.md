# AQSTOQFLOW Skill 015 — Country Adapter Pilot Execution Report

Date: 2026-07-27  
Selected skill: `015-aqstoqflow-country-adapter-pilot`  
Pilot: Cameroon DGI sandbox-shaped authority adapter  
Previous skill: `014-aqstoqflow-offline-pos-sync`  
Next recommended skill: `016-aqstoqflow-ai-copilot-guardrails`

## Outcome

The first country adapter is development-ready as a tenant-scoped, production-shaped
**sandbox pilot**. It now has first-class official-spec provenance, independent
review evidence, external credential references, expiry and rotation controls,
per-tenant disable behavior, operator health metrics, stable protected actions,
business events, audit evidence, tests, a durable migration, and an operations
runbook.

The implementation intentionally does not register or enable a production Cameroon
DGI adapter. The repository does not contain an authority-validated DGI API
contract, external sandbox conformance result, regulator production credentials, or
an independent signed production review sufficient to make that claim.

## Architecture decision

- Reuse the shared `ComplianceAdapter` contract, fiscal-document kernel,
  compliance submission outbox, evidence service, business-event gateway,
  protected actions, country-pack resolver, and Compliance Center.
- Keep `CM_DGI_SANDBOX` sandbox-only and fail closed for `PRODUCTION`.
- Store secrets only in an external secret manager; persist and expose only an
  opaque credential reference and dashboard presence flag.
- Keep authority calls outside POS posting. Adapter disablement stops submission
  attempts without changing valid POS, stock, cash, payment, or ledger facts.
- Treat official specifications, expert review, and regulator confirmation as
  evidence-backed states, not booleans that silently enable production.

## Files changed

### Schema and migration

- `prisma/schema.prisma`
- `prisma/migrations/20260727143000_country_adapter_pilot_foundation/migration.sql`

The migration creates the previously unmigrated compliance/fiscal kernel:

- fiscal documents and lines;
- fiscal sequences;
- compliance submissions;
- compliance adapter configurations;
- compliance evidence;
- associated enums, indexes, uniqueness rules, and foreign keys.

It also includes:

- official specification title, version, publication/effective date, reference,
  and document hash;
- independent review status, reviewer, qualification, conflict declaration, date,
  and evidence hash;
- credential expiry and rotation evidence.

The migration is additive and was not applied to any database.

### Services and actions

- `services/compliance/country-adapter-pilot.schemas.ts`
- `services/compliance/country-adapter-pilot.service.ts`
- `services/compliance/certification-outbox.service.ts`
- `services/compliance/compliance-center.service.ts`
- `services/compliance/index.ts`
- `actions/compliance/country-adapter-pilot.actions.ts`

Implemented:

- tenant-scoped sandbox configuration;
- approved external secret-manager URI validation;
- credential rotation and expiry enforcement;
- independent maker-checker review;
- tenant disable/containment;
- redacted DTO, audit, notification, and business-event evidence;
- stable `{ ok: true } | { ok: false, errorCode }` action extension;
- fresh authentication and permission enforcement.

Business events include:

- `AUTHORITY_ADAPTER_CONFIGURED`;
- `AUTHORITY_CREDENTIAL_ROTATED`;
- `AUTHORITY_ADAPTER_REVIEW_RECORDED`;
- `AUTHORITY_ADAPTER_DISABLED`;
- existing submission accepted/rejected/retry events.

### Health and operator UX

- `components/compliance/ComplianceCenterDashboard.tsx`
- `messages/en.json`
- `messages/fr.json`

The adapter health panel now exposes:

- `HEALTHY`, `DEGRADED`, `BLOCKED`, or `DISABLED`;
- credential presence and expiry;
- official-spec readiness;
- independent review status;
- open submission count and oldest queue age.

No credential reference or secret value is returned to the dashboard.

### Verification and operations

- `services/compliance/__tests__/country-adapter-pilot.service.test.ts`
- `actions/compliance/__tests__/country-adapter-pilot.actions.test.ts`
- `services/compliance/__tests__/compliance-center.service.test.ts`
- `scripts/country-adapter-pilot-gate.js`
- `scripts/__tests__/country-adapter-pilot-gate.test.js`
- `package.json`
- `docs/domains/compliance/CAMEROON_DGI_COUNTRY_ADAPTER_PILOT_OPERATIONS_RUNBOOK_2026-07-27.md`
- `what-next/country-adapter-pilot-readiness.md`
- `what-next/country-adapter-pilot-readiness.json`

## Gates passed

- Shared country adapter contract and registry.
- Sandbox-only production fail-closed boundary.
- Tenant scope and cross-tenant rejection.
- RBAC denial and fresh-auth/step-up enforcement.
- Maker-checker review separation.
- Official-spec provenance storage.
- External credential references and output redaction.
- Credential expiry and rotation evidence.
- Accept, reject, outage, and rate-limit fixtures.
- Submission idempotency and hashed evidence.
- Per-tenant disable without POS posting dependency.
- Operator health, credential expiry, and queue-age visibility.
- Additive schema migration.
- Regulatory country-pack hardcode gate.
- Migration safety gate.

## Verification result

- Focused Skill 015 bundle: **6 suites passed; 25 tests passed**.
- TypeScript: **passed**.
- Prisma schema validation: **passed**.
- Prisma client generation: **passed**.
- Targeted ESLint: **passed**.
- Country adapter pilot fail-mode gate: **14/14 ready; 0 development blockers**.
- Prisma migration safety gate: **8/8 ready; 0 risk findings**.
- Regulatory hardcode fail-mode gate: **passed; 0 active findings**.
- Production-only placeholder/inline-secret scan: **no findings**.

## Gates blocked

Development blockers: **none**.

Production authority certification remains blocked by external evidence:

1. `official_dgi_technical_contract_not_validated`
2. `independent_expert_production_review_not_attached`
3. `regulator_production_credentials_not_provisioned`
4. `external_sandbox_conformance_not_executed`

These blockers do not prevent continued platform development or Skill 016. They
prevent only a production DGI submission/certification claim.

## Final decision

**Skill 015 internal development gate: READY**  
**Country adapter checks: 14/14 ready; 0 development blockers**  
**Production DGI authority certification: BLOCKED / NOT CLAIMED**  
**Advance to Skill 016: YES**
