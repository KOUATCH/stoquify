# AqStoqFlow Close Assurance Live Smoke Pass - 2026-07-20

## Outcome

Status: PASS

The approved live close-assurance e2e flow completed successfully against the local PostgreSQL database and authenticated browser route.

Command:

```powershell
npm run test:e2e:close-assurance
```

Result:

```text
4 passed (6.3m)
```

## Coverage

- Preflight gate passed: `npm run test:e2e:close-assurance:preflight`
- Prisma migration deploy found no pending migrations.
- Local payroll/accounting e2e seed completed for `org_payroll_e2e_local`.
- Auth setup created tenant-scoped payroll/accounting manager state.
- Auth setup created a requester account without HRIS access.
- Authenticated close dashboard rendered at `/en/dashboard/accounting/close`.
- Authenticated period dashboard rendered at `/en/dashboard/accounting/close/payroll_e2e_browser_2026_06_accounting_period`.
- Close assessment ran successfully through the service action.
- Draft close pack downloaded as deterministic JSON.

## Evidence

- Browser smoke evidence: `what-next/accounting/AQSTOQFLOW_CLOSE_ASSURANCE_BROWSER_SMOKE_2026-07-20.json`
- Dashboard screenshot: `what-next/accounting/close-assurance-browser-smoke/close-dashboard.png`
- Draft export screenshot: `what-next/accounting/close-assurance-browser-smoke/close-pack-draft-download.png`
- Downloaded draft close pack: `what-next/accounting/close-assurance-browser-smoke/close-pack-draft-not-certified-cmrt863st001jmabgcwg1i6jj-c22b6967-c03.json`
- Draft content hash: `sha256:0d85df79afdb5468a7fadbc72bd2ec04a96a7265d591f362faa2f9231879f64a`
- Watermark: `close-pack-draft-not-certified-cmrt863st001jmabgcwg1i6jj-c22b6967-c03`

## Regression Closed

The live smoke previously failed because close-assurance workflow events wrote domain object names such as `CloseRun` into `BusinessEvent.sourceType`, while the Prisma model requires the `AccountingSourceType` enum. The service now stores the business-event source as `MANUAL` and preserves the close-domain source in event metadata and notification metadata.

Focused coverage now asserts:

- `close.assurance.run.completed` uses enum-valid `sourceType: "MANUAL"`.
- Close-domain source identity remains traceable through metadata.
- Critical finding events follow the same mapping.

## Non-Blocking Notes

- Next.js emitted a dev-server warning about future `allowedDevOrigins` configuration for `127.0.0.1`.
- A post-run `ECONNRESET` appeared after all tests had already passed, consistent with dev-server/browser shutdown rather than a close-assurance failure.
- Seed output remains explicitly demo-only and must not be treated as statutory or production backfill evidence.

## Release Readiness

Close assurance browser smoke is release-evidence ready for the local authenticated flow. The next release-hardening step is to fold this pass report into the broader close-pack certification evidence index or CI release checklist, without fabricating statutory/OHADA/SYSCOHADA attestations.
## Integrated Artifact-Gated Rerun

The close-assurance e2e command was rerun after appending the bounded local artifact gate to the package script:

```powershell
npm run test:e2e:close-assurance
```

Result:

```text
4 passed (7.5m)
```

Additional checks in the same command:

- Database preflight passed.
- Prisma migration deploy applied `20260720210000_workflow_assurance_multi_finding_persistence`.
- Payroll/accounting e2e seed completed for `org_payroll_e2e_local`.
- Close-assurance authenticated Playwright smoke passed.
- Bounded artifact gate passed with 13 files scanned and 0 blockers.

Latest artifact readiness report:

- `what-next/accounting/close-assurance-smoke-artifact-readiness-2026-07-20.md`