# AqStoqFlow Close Assurance Center Implementation Report

Date: 2026-07-20
Skill: `023-aqstoqflow-close-assurance-suite`
Compliance language: `system-certified-close-pack-ready`

## Executive Status

The ordered close assurance suite has been consolidated across audit, schema/contracts, engine, portal, and close-pack certification. The module is ready for system-certified close-pack workflows with accountant review controls. It is not legal/statutory certification; statutory filings and OHADA/SYSCOHADA jurisdictional conclusions still require qualified expert validation and configured authority/country-pack evidence.

## Phase Results

- `018` Readiness audit: completed with `GO_WITH_GATES`; report saved at `what-next/AQSTOQFLOW_CLOSE_ASSURANCE_READINESS_AUDIT_2026-07-20.md`.
- `019` Schema/contracts: completed with migration-trail fix; report saved at `what-next/AQSTOQFLOW_CLOSE_ASSURANCE_SCHEMA_RUN_REPORT_2026-07-20.md`.
- `020` Engine: completed with focused engine hardening; report saved at `what-next/AQSTOQFLOW_CLOSE_ASSURANCE_ENGINE_RUN_REPORT_2026-07-20.md`.
- `021` Portal: completed with portal/accountant review hardening; report saved at `what-next/AQSTOQFLOW_CLOSE_ASSURANCE_PORTAL_RUN_REPORT_2026-07-20.md`.
- `022` Close pack certification: completed with deterministic export, trust gates, redaction, and certification tests; report saved at `what-next/AQSTOQFLOW_CLOSE_PACK_CERTIFICATION_RUN_REPORT_2026-07-20.md`.
- `023` Suite consolidation: completed with suite validation and safe-error hardening.

## Files Changed In This Consolidation Pass

- `services/accounting/close-assurance.service.ts`
- `services/accounting/close-assurance-pack.service.ts`
- `services/accounting/__tests__/close-assurance-pack.service.test.ts`
- `components/accounting/CloseAssuranceCenter.tsx`
- `components/accounting/__tests__/CloseAssuranceCenter.test.tsx`

## Suite Capabilities Verified

- Protected server actions for read, run, evidence graph, finding assignment, comments, waiver request/approval, accountant review, draft export, and certified export.
- Fresh authentication on waiver approval and certified close-pack export.
- Segregation-of-duties blocking for certifier equals close runner.
- Deterministic JSON close-pack export with content hash and watermark.
- Certified export blocks on unresolved high/critical findings, unsigned/hashless reconciliation evidence, stale inventory evidence, missing pilot-cycle evidence, below-`T4` trust, missing permission, stale auth, and SoD conflict.
- Draft export remains available with blockers and explicit non-certified watermarking.
- Public pack content redacts raw provider payloads, credentials, secrets, tokens, auth headers, employee/salary/payment sensitive fields, and raw audit payloads.
- Pack includes explicit evidence summaries for data trust, ledger, trial balance, signed payment reconciliation, suspense, exceptions, AR/AP, inventory, tax/VAT, and redacted audit excerpt.
- Portal renders partial-data, permission/action error, no-period, certification, review, and export states.

## Additional Hardening Applied By 023

- Replaced raw inventory-refresh exception forwarding in close-pack freshness with a safe limitation message.
- Replaced raw period-close preflight exception forwarding with existing safe application-error handling.
- Added a client-side action-error sanitizer that suppresses obvious raw internals, SQL/Prisma hints, secrets, tokens, credentials, auth headers, and raw provider payload phrases.
- Added focused tests proving inventory-refresh errors and protected UI action errors do not leak secret-bearing raw messages.

## Validation

Passed:

```powershell
npm run prisma:validate
```

Passed:

```powershell
npx jest --runTestsByPath "services/accounting/__tests__/close-assurance.service.test.ts" "services/accounting/__tests__/close-assurance-pack.service.test.ts" "services/accounting/__tests__/journal-close-invalidation.service.test.ts" "actions/accounting/__tests__/close-assurance.actions.test.ts" "components/accounting/__tests__/CloseAssuranceCenter.test.tsx" "app/[locale]/(dashboard)/dashboard/accounting/close/__tests__/page.test.tsx" --runInBand --forceExit
```

Result: 6 suites passed, 48 tests passed.

Passed:

```powershell
npm run typecheck
```

Passed targeted lint:

```powershell
npx eslint "components/accounting/CloseAssuranceCenter.tsx" "components/accounting/__tests__/CloseAssuranceCenter.test.tsx"
npx eslint "services/accounting/close-assurance.service.ts" "services/accounting/close-assurance-pack.service.ts" "services/accounting/__tests__/close-assurance-pack.service.test.ts"
npx eslint "services/accounting/close-assurance.service.ts" "services/accounting/close-assurance-pack.service.ts" "services/accounting/journal-close-invalidation.service.ts" "actions/accounting/close-assurance.actions.ts" "components/accounting/CloseAssuranceCenter.tsx" "components/accounting/__tests__/CloseAssuranceCenter.test.tsx"
```

Targeted scans completed:

- Action protection scan confirmed `protect<...>` wrappers, permissions, audit resources, and fresh-auth gates on close actions.
- Raw-error/secret scan showed only redaction/sanitizer code and safe application-error handling after hardening.
- Direct database-access scan found database access inside server-only accounting services, not UI/action bypass paths.

## Migrations And Permissions

Schema and permission coverage was completed in the earlier `019` phase and revalidated here with `npm run prisma:validate`. No additional Prisma schema edits were made in the `023` consolidation pass.

Close action permissions verified in `actions/accounting/close-assurance.actions.ts` include:

- `accounting.close.read`
- `accounting.close.run`
- `accounting.close.finding.assign`
- `accounting.close.finding.comment`
- `accounting.close.waiver.request`
- `accounting.close.waiver.approve`
- `accounting.close.accountant.review`
- `accounting.close.export`
- `accounting.close.certify`

## Compliance And Data-Trust Status

- Compliance status: `system-certified-close-pack-ready` for internal system evidence packs.
- Data trust: draft pack reports the `T3` minimum honestly; certified export requires `T4`.
- OHADA/SYSCOHADA status: guarded language only. No statutory audit certification, authority acceptance, or legal filing readiness was claimed or fabricated.
- Missing AR/AP or tax/VAT evidence is reported as `NOT_CAPTURED_IN_CLOSE_RUN` rather than inferred.

## Remaining Gaps

- Browser-level route smoke with a live authenticated session was not performed in this consolidation pass; page-level route tests passed instead.
- Statutory authority/country-pack production integrations remain outside this close-pack certification pass.
- Expert accountant/legal validation is still required before claiming statutory certification.
- The worktree contains many unrelated dirty files outside this close-assurance pass; they were left untouched.

## Next Recommended Hardening

- Run a live authenticated browser smoke of `/dashboard/accounting/close` and `/dashboard/accounting/close/[periodId]` once a seeded tenant/session is available.
- Add an end-to-end export/download smoke that verifies the generated JSON file name, watermark, content hash, and no public sensitive terms in the browser artifact.
- Extend recertification invalidation coverage across every close-impacting write path as new modules are connected.