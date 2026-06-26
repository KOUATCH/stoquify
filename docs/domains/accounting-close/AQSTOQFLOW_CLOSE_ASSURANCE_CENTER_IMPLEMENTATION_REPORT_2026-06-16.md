# AqStoqFlow Close & Assurance Center Implementation Report

Date: 2026-06-16

## Status

Compliance status: `system-certified-close-pack-ready` for system evidence packs, with statutory certification explicitly out of scope.

The first usable Close & Assurance Center is available at:

- `/dashboard/accounting/close`
- `/dashboard/accounting/close/[periodId]`

The route is protected and tenant-scoped. A local smoke request to `/en/dashboard/accounting/close` returned a `307` redirect to `/en/login?callbackUrl=%2Fen%2Fdashboard%2Faccounting%2Fclose`.

## Skill Installed

Created and validated:

- `C:\Users\J COMPUTER\.codex\skills\aqstoqflow-close-assurance-center-builder`

Validation result:

- `Skill is valid!`

The skill now guides future runs through the June 15 blueprint, readiness engine, protected actions, dashboard, hash-backed export, tests, and final report.

## Schema And Migration

The additive Close & Assurance schema is present in `prisma/schema.prisma`.

Models:

- `CloseRun`
- `CloseChecklistItem`
- `CloseAssuranceFinding`
- `CloseEvidenceItem`
- `ClosePackExport`
- `AccountantReview`
- `AccountantComment`

Migration:

- `prisma/migrations/20260616120000_close_assurance_center/migration.sql`

No reset, reseed, destructive migration, or model removal was performed.

## Services

Readiness engine:

- `services/accounting/close-assurance.service.ts`

Hash-backed pack export:

- `services/accounting/close-assurance-pack.service.ts`

The engine composes existing ledger-first truth:

- period close preflight
- ledger reconciliation
- payment reconciliation status
- suspense/payment exception evidence
- data-trust provenance
- source links and ledger audit events

The pack service now supports:

- deterministic JSON payloads
- stable canonical hashing
- SHA-256 content hashes
- watermark IDs
- persisted `ClosePackExport` metadata
- ledger audit events
- draft export with `DRAFT_NOT_CERTIFIED`
- certified export only when gates pass

Certified export is blocked by non-ready runs, open high/critical findings, high-risk failed or unavailable checklist gates, unsigned reconciliation evidence, missing critical evidence, stale fresh auth, missing permission, or same-actor SoD violations.

## Actions And Hooks

Protected actions:

- `actions/accounting/close-assurance.actions.ts`

Hook layer:

- `hooks/accounting/useCloseAssurance.ts`

Added export actions:

- `exportDraftClosePackAction`
- `exportCertifiedClosePackAction`

Certified export uses `freshAuth: { maxAgeSeconds: 300 }`.

## Dashboard

Client workbench:

- `components/accounting/CloseAssuranceCenter.tsx`

Routes:

- `app/[locale]/(dashboard)/dashboard/accounting/close/page.tsx`
- `app/[locale]/(dashboard)/dashboard/accounting/close/[periodId]/page.tsx`

The dashboard supports:

- period selection
- run assessment
- readiness status and score
- blocker/finding review
- checklist inspection
- evidence coverage
- provenance and evidence graph counts
- accountant comments
- waiver requests
- control facts
- draft close pack JSON download
- certified close pack JSON download when server gates allow it

UI copy is bilingual English/French and uses existing dashboard semantic tokens.

## Permissions

Permissions added or reused:

- `accounting.close.read`
- `accounting.close.run`
- `accounting.close.finding.assign`
- `accounting.close.finding.comment`
- `accounting.close.waiver.request`
- `accounting.close.waiver.approve`
- `accounting.close.certify`
- `accounting.close.export`
- `accounting.close.accountant.review`
- `accounting.close.accountant.comment`
- `accounting.close.accountant.invite`

Waiver approval and certified export require fresh authentication. Same-actor waiver/certification paths are blocked for segregation of duties.

## Tests Added

Added:

- `services/accounting/__tests__/close-assurance-pack.service.test.ts`

Extended:

- `actions/accounting/__tests__/close-assurance.actions.test.ts`

Existing readiness tests remain:

- `services/accounting/__tests__/close-assurance.service.test.ts`

Coverage includes clean readiness, blockers, persisted runs, comments, waiver SoD, draft export, certified export blocking, certified export SoD, deterministic hash behavior, export audit records, and protected action fresh-auth registration.

## Verification

Successful checks:

```text
python C:\Users\J COMPUTER\.codex\skills\.system\skill-creator\scripts\quick_validate.py C:\Users\J COMPUTER\.codex\skills\aqstoqflow-close-assurance-center-builder
npm test -- --runTestsByPath services/accounting/__tests__/close-assurance.service.test.ts services/accounting/__tests__/close-assurance-pack.service.test.ts actions/accounting/__tests__/close-assurance.actions.test.ts --runInBand
npm run prisma:validate
npm run typecheck
```

Results:

- skill validation passed
- 3 focused Jest suites passed
- 16 focused Jest tests passed
- Prisma schema valid
- TypeScript typecheck passed

Route smoke:

```text
GET http://localhost:3000/en/dashboard/accounting/close
307 -> /en/login?callbackUrl=%2Fen%2Fdashboard%2Faccounting%2Fclose
```

Dev server:

- `http://localhost:3000`

## Data Trust

Dashboard and draft pack target: T3+ when source services provide evidence.

Certified pack target: T4-style system evidence, but not statutory certification. The pack redacts secrets, raw provider payloads, credentials, and tenant internals.

## Remaining Limits

- Automatic recertification triggers are recorded as a limitation, not fully automated.
- Deeper inventory valuation certification remains a future hardening item.
- External accountant invitation workflow remains separate from this first close pack slice.
- Jurisdiction-specific statutory filing/certification still requires qualified expert validation.

## Next Hardening

- Add recertification invalidation when period, posting, reconciliation, suspense, permission, or evidence rows change.
- Add richer evidence graph drill-down by source document.
- Add accountant invite/access lifecycle for external accountants.
- Add country-pack-specific close pack annexes for OHADA jurisdictions.
