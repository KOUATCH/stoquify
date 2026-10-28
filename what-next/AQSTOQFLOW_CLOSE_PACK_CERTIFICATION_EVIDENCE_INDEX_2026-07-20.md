# AqStoqFlow Close Pack Certification Evidence Index

Date: 2026-07-20
Scope: close assurance and close-pack certification release evidence

## Status

Status: LOCAL AUTHENTICATED SMOKE PASSED

This index links the close-pack certification implementation evidence to the later authenticated browser smoke that exercised the close-assurance route, assessment action, and draft close-pack download against the local e2e PostgreSQL database.

This is system release evidence only. It is not statutory, OHADA, SYSCOHADA, tax-authority, external-auditor, or legal certification evidence.

## Primary Reports

- Implementation report: `what-next/AQSTOQFLOW_CLOSE_PACK_CERTIFICATION_RUN_REPORT_2026-07-20.md`
- Browser smoke readiness: `what-next/accounting/AQSTOQFLOW_CLOSE_ASSURANCE_BROWSER_SMOKE_READINESS_2026-07-20.md`
- Live smoke runbook: `what-next/accounting/AQSTOQFLOW_CLOSE_ASSURANCE_LIVE_SMOKE_RUNBOOK_2026-07-20.md`
- Live smoke pass report: `what-next/accounting/AQSTOQFLOW_CLOSE_ASSURANCE_LIVE_SMOKE_PASS_2026-07-20.md`
- Database preflight report: `what-next/accounting/close-assurance-e2e-db-preflight-2026-07-20.md`

## Passing Live Command

```powershell
npm run test:e2e:close-assurance
```

Observed result:

```text
4 passed (6.3m)
```

Covered steps:

- Non-mutating close-assurance e2e database preflight passed.
- Prisma migration deploy found no pending migrations.
- Local payroll/accounting e2e seed completed.
- Authenticated manager storage state was created.
- Requester account without HRIS access was created.
- `/en/dashboard/accounting/close` rendered as an authenticated tenant route.
- `/en/dashboard/accounting/close/payroll_e2e_browser_2026_06_accounting_period` ran a close assessment.
- Draft close pack JSON downloaded successfully.

## Browser Evidence

- Evidence JSON: `what-next/accounting/AQSTOQFLOW_CLOSE_ASSURANCE_BROWSER_SMOKE_2026-07-20.json`
- Dashboard screenshot: `what-next/accounting/close-assurance-browser-smoke/close-dashboard.png`
- Draft export screenshot: `what-next/accounting/close-assurance-browser-smoke/close-pack-draft-download.png`
- Downloaded draft close pack: `what-next/accounting/close-assurance-browser-smoke/close-pack-draft-not-certified-cmrt863st001jmabgcwg1i6jj-c22b6967-c03.json`
- Draft content hash: `sha256:0d85df79afdb5468a7fadbc72bd2ec04a96a7265d591f362faa2f9231879f64a`
- Watermark: `close-pack-draft-not-certified-cmrt863st001jmabgcwg1i6jj-c22b6967-c03`

## Regression Evidence

The live smoke initially exposed an invalid business-event source mapping: close-assurance workflow events attempted to write domain names such as `CloseRun` into `BusinessEvent.sourceType`, while Prisma requires the `AccountingSourceType` enum.

Closed behavior:

- Business-event `sourceType` is now enum-valid as `MANUAL` for close workflow notification events.
- Close-domain source identity remains preserved in event metadata and notification metadata.
- Focused service tests assert the mapping for completed close runs and critical findings.
- The full live smoke passed after the fix and locator hardening.

## Controls

- The e2e seed is demo-only and must not be used as production payroll backfill or statutory truth.
- Certified close packs remain blocked by unresolved critical/high gates, stale evidence, unsigned reconciliation evidence, segregation-of-duties conflicts, missing permissions, and stale/missing fresh authentication.
- Draft close packs remain watermarked as not certified.
- No statutory, OHADA, SYSCOHADA, legal, authority, or external-auditor evidence is fabricated by this evidence set.

## CI Handoff

The GitHub Actions workflow now includes an explicit close-assurance browser smoke job that runs:

```powershell
npm run test:e2e:close-assurance
```

The CI job uses isolated synthetic PostgreSQL credentials and must continue to avoid production databases, production secrets, and statutory authority credentials.
CI artifact upload remains pending explicit approval. Before enabling it, run the local artifact readiness gate:

```powershell
npm run test:e2e:close-assurance:artifact-gate
```

The gate scans candidate smoke evidence for forbidden files, raw database URLs, bearer tokens, auth-state paths, database dumps, and unapproved Playwright trace/video binaries.

The close-assurance e2e package command now appends that bounded local artifact gate after the authenticated Playwright smoke, so a passing smoke command also confirms the `what-next/accounting` evidence set is locally scan-ready.

Latest CI release gate rerun:

- Command: `npm run ci:release:gate`
- Generated: `2026-07-20T16:44:30.300Z`
- Result: `ready`, 11/11 checks, 0 blockers
- Close-assurance browser smoke job: configured
- CI artifact upload: not enabled pending explicit approval

Latest integrated rerun:

- Command: `npm run test:e2e:close-assurance`
- Result: `4 passed (7.5m)`
- Artifact gate: `ready`, 13 files scanned, 0 blockers
- Migration applied during rerun: `20260720210000_workflow_assurance_multi_finding_persistence`