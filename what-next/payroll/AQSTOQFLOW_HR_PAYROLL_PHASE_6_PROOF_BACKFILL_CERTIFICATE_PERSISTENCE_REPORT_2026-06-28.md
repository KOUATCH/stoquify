# AqStoqFlow HR/Payroll Phase 6 Proof Backfill Certificate Persistence Report - 2026-06-28

## Scope

Skill: `aqstoqflow-hrpayroll-06-seed-backfill-setup`

Roadmap lane: production migration/backfill.

This slice extends the disabled-by-default payroll proof backfill executor so reviewed validate-mode certificates can be persisted as redacted audit evidence. It does not enable payroll evidence mutation, production backfill mutation, or statutory/payment automation.

## Source Context

Inspected:

- User-provided full HR/payroll production roadmap prompt attachment.
- `C:\Users\J COMPUTER\.codex\skills\aqstoqflow-hrpayroll-06-seed-backfill-setup\SKILL.md`.
- Existing audit/workflow assurance schema surfaces in `prisma/schema.prisma`.
- Existing payroll audit patterns in payroll employee, payment reconciliation, and assurance services.
- Current proof-backfill executor and payroll setup action/tests.

Source prerequisite gap:

- The skill's source prompt suite path `what-next/payroll/AQSTOQFLOW_HR_PAYROLL_EXPERT_GRADE_IMPLEMENTATION_PROMPT_SUITE_2026-06-25.md` is still not present in this worktree. This slice used the available roadmap prompt, current phase reports, readiness artifacts, and live code as the controlling evidence.

## Design Decision

The certificate is persisted through the existing `AuditLog` model instead of adding a new table or using workflow-assurance incidents.

Reasoning:

- Workflow assurance tables model check runs, incidents, waivers, and alert delivery. This artifact is a reviewed operational evidence certificate, not an incident lifecycle event.
- `AuditLog` already supports tenant-scoped evidence history and is used by payroll source data, payment reconciliation, accounting, and assurance workflows.
- The audit row keeps real `organizationId` and `userId` in indexed audit columns for queryability, while the JSON `changes` payload contains only redacted refs, hashes, statuses, counts, blockers, and proof-backfill gap metadata.

## Implemented Controls

- Added `persistCertificate` to the proof-backfill execution input.
- Kept `executionMode: "execute"` rejected before tenant scans or audit writes.
- Kept payroll proof backfill mutation disabled; persistence writes only an `AuditLog` row.
- Kept certificate hash stable over the redacted certificate core. The database-generated audit id is returned separately as persistence metadata.
- Added certificate persistence metadata:
  - requested/persisted flags;
  - audit log id;
  - audit entity type;
  - audit action.
- Added a redacted audit payload containing:
  - certificate hash;
  - dry-run evidence hash and match status;
  - execution disabled/mutation false flags;
  - approval bundle hash, not raw approver ids;
  - idempotency ledger;
  - proof-backfill gap counts and planned job count;
  - correction intents with mutationAllowed false;
  - post-run reconciliation expectations;
  - blocker codes and redaction policy.
- Threaded `persistCertificate` through the protected server action using server-derived tenant and actor context.

## Files Changed

- `services/payroll/payroll-proof-backfill-executor.service.ts`
- `services/payroll/__tests__/payroll-proof-backfill-executor.service.test.ts`
- `actions/payroll/payroll-setup.actions.ts`
- `actions/payroll/__tests__/payroll-setup.actions.test.ts`
- `what-next/payroll/payroll-immutability-runtime-check.md` refreshed by policy gate
- `what-next/payroll/payroll-immutability-runtime-check.json` refreshed by policy gate

## Verification

Passed:

```powershell
npm test -- --runTestsByPath services/payroll/__tests__/payroll-proof-backfill-executor.service.test.ts actions/payroll/__tests__/payroll-setup.actions.test.ts --runInBand
```

Result: 2 suites passed, 9 tests passed.

```powershell
npm test -- --runTestsByPath actions/payroll/__tests__/payroll-setup.actions.test.ts services/payroll/__tests__/payroll-setup-readiness.service.test.ts services/payroll/__tests__/payroll-seed-backfill-plan.service.test.ts services/payroll/__tests__/payroll-proof-backfill-executor.service.test.ts --runInBand
```

Result: 4 suites passed, 18 tests passed.

```powershell
npm run typecheck
```

Result: passed.

```powershell
npm run service:boundary:fail
```

Result: passed. Active service-boundary violations: 0.

```powershell
npm run regulatory:hardcode:fail
```

Result: passed. Active findings: 0.

```powershell
npm run prisma:validate
```

Result: passed. Prisma schema is valid.

```powershell
npm run policy:gates
```

Result: passed. Included inventory boundary, service boundary, workflow assurance runtime check, payroll immutability runtime check, hard-delete gate, regulatory hardcode gate, demo trust gate, and raw error boundary gate.

## Test Evidence Added

- Execute mode rejects before tenant scans, proof-gap counts, or audit persistence.
- Validate mode without `persistCertificate` does not write audit evidence.
- Matching signoff bundle still leaves mutation execution disabled.
- Signed validate-mode certificate with `persistCertificate: true` writes exactly one audit row.
- Audit JSON excludes raw organization id, approver ids, employee email/name, salary/payment destination hashes, and provider payload data.
- Protected action parses `persistCertificate: "true"` and passes `persistCertificate: true` to the service while deriving tenant/actor server-side.

## Residual Blockers

This does not make full production backfill ready. Remaining blockers before full rollout:

- Production evidence mutation executor remains intentionally disabled.
- Real tenant-by-tenant execution still needs an approved mutation plan, rollback/correction strategy, and post-run reconciliation certificate execution.
- Statutory country-pack breadth and payroll engine hardening remain deeper product blockers.
- Authority/payment adapters still need real provider/authority payload mappings and operational credentials before automated filing/payment claims.
- Operator/employee UI routes and BI surfaces should remain downstream of complete calculation/register truth.

## Handoff

Next recommended slice: build the post-migration reconciliation certificate runner that consumes persisted proof-backfill certificates, reruns dry-run/data-trust/immutability checks, and reports whether proof gaps dropped to zero without enabling production mutation by default.