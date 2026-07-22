# AqStoqFlow Close Assurance Live Smoke Runbook

Date: 2026-07-20

Status: READY, APPROVAL-GATED

## Purpose

Run the authenticated close-assurance browser smoke against the local development database after a non-mutating safety preflight confirms the configured database is safe for e2e migration and seed operations.

This runbook covers the local verification step only. It does not create statutory, legal, OHADA, SYSCOHADA, or external auditor certification.

## Approval Gate

The live smoke command applies migrations and seeds local test data before launching Playwright. Run it only after explicit approval for local database mutation.

Approval wording:

```text
I approve running npm run test:e2e:close-assurance, including local database migrations and seed data.
```

## Command

```powershell
npm run test:e2e:close-assurance
```

Current guarded command order:

```text
npm run test:e2e:close-assurance:preflight && npm run prisma:migrate:deploy && npm run seed:e2e:payroll && npm run test:e2e -- --project=close-assurance-authenticated-smoke
```

## Preflight Criteria

The command must stop before migration or seed if any preflight check fails.

Required preflight pass state:

- `DATABASE_URL` is present.
- Database host is local or explicitly allowed for remote e2e use.
- Production environment markers are absent.
- Database URL is redacted in generated evidence.
- Result is `OK_TO_RUN_LOCAL_E2E`.

Preflight evidence paths:

- `what-next/accounting/close-assurance-e2e-db-preflight-2026-07-20.md`
- `what-next/accounting/close-assurance-e2e-db-preflight-2026-07-20.json`

## Browser Smoke Acceptance Criteria

The authenticated browser smoke passes only if:

- The close dashboard renders as an authenticated tenant route.
- The June 2026 seeded accounting period can run close-assurance assessment.
- Draft close pack download succeeds.
- Downloaded pack has `kind: "AQSTOQFLOW_CLOSE_ASSURANCE_PACK"`.
- Downloaded pack remains draft-only with `mode: "DRAFT_NOT_CERTIFIED"`.
- Downloaded pack has a `sha256:*` content hash.
- Downloaded pack has draft watermark `draft-not-certified`.
- Downloaded pack includes a `STATUTORY_BLOCKED` status where statutory evidence remains unavailable.
- Downloaded pack does not expose obvious raw secret, credential, token, raw provider payload, salary, or private contact terms.

Expected smoke evidence paths:

- `what-next/accounting/AQSTOQFLOW_CLOSE_ASSURANCE_BROWSER_SMOKE_2026-07-20.json`
- `what-next/accounting/close-assurance-browser-smoke/`

## Failure Handling

If preflight fails:

- Do not override it unless the database target is intentionally selected for e2e testing.
- Review the redacted preflight evidence and database host classification.
- Do not run migration or seed manually against an unreviewed database URL.

If migration or seed fails:

- Stop the run and keep the failure output.
- Do not change production-like data to satisfy the smoke.
- Fix fixture idempotency, schema drift, or local environment setup before retrying.

If browser smoke fails:

- Inspect Playwright screenshots, traces, and the smoke JSON evidence.
- Classify failure as auth setup, route render, assessment run, export/download, or redaction/content validation.
- Fix the smallest failing layer and rerun the same command after preflight passes.

## Rollback Posture

This smoke is designed for a local e2e database. The seeded fixtures use stable e2e identifiers and should be idempotent. If local data cleanup is needed, prefer fixture-targeted cleanup scripts or database reset workflows already used by the project. Do not use broad destructive database commands from this runbook.

## Current Non-Mutating Validation

Completed before live run:

- `npx jest scripts/__tests__/close-assurance-e2e-preflight.test.js scripts/__tests__/close-assurance-e2e-script-guard.test.js --runInBand --forceExit --silent`: passed.
- `npx eslint "scripts/close-assurance-e2e-preflight.js" "scripts/__tests__/close-assurance-e2e-preflight.test.js" "scripts/__tests__/close-assurance-e2e-script-guard.test.js"`: passed.
- `node -e ...`: confirmed `PREFLIGHT_FIRST`.
- `npx playwright test --list --project=close-assurance-authenticated-smoke`: listed 4 intended tests.

## Decision

Next action after explicit approval:

```powershell
npm run test:e2e:close-assurance
```

