---
name: priority-007c-aqstoqflow-error-boundary-migration-ratchet
description: "Migrate AqStoqFlow legacy raw-error boundaries onto the canonical error-notification system. Use when moving role/user/auth actions, management actions, App Router API routes, POS services, purchase-order services, or raw throw/console error patterns onto safe action and route envelopes with a report-mode raw-error scanner and ratchet."
---

# Priority 007C Error Boundary Migration Ratchet

## Purpose

Use this skill after `priority-007b-aqstoqflow-error-notification-unifier` has introduced the canonical mapper in `lib/error-handling`.

This skill migrates legacy callers onto that foundation and adds a raw-error scanner so the remaining migration can be tracked and eventually ratcheted.

## Required First Reads

Read these files before implementation:

- `lib/error-handling/canonical.ts`
- `lib/error-handling/route-response.ts`
- `services/_shared/action-errors.ts`
- `services/_shared/protect.ts`
- `what-next/AQSTOQFLOW_PRIORITY_007B_ERROR_NOTIFICATION_UNIFIER_REPORT_2026-06-17.md`
- `what-next/AQSTOQFLOW_ENTERPRISE_SYSTEM_EXAMINATION_REPORT_2026-06-16.md`
- `what-next/AQSTOQFLOW_STATUTORY_SERVICE_MODERNIZATION_SCAN_2026-06-16.md`

Read references as needed:

- `references/runtime-boundary.md` before edits.
- `references/migration-order.md` before selecting the implementation slice.
- `references/scanner-classification.md` before writing or changing the scanner.

## Migration Workflow

1. Inventory current raw-error surfaces.
   - Search for `throw new Error(`, `throw error`, `console.error(`, and raw `NextResponse.json({ error`.
   - Separate client-boundary leakage from internal logging-only or test-only patterns.
   - Prioritize actions, routes, POS, and purchase-order paths that users can trigger.

2. Reuse the canonical foundation.
   - Keep `lib/error-handling` as the source of truth.
   - Keep `services/_shared/action-errors.ts` as a compatibility facade.
   - Do not create another error taxonomy.

3. Migrate boundaries domain by domain.
   - Use `toSafeActionError` and `protect` for server actions.
   - Use `jsonErrorResponse`, `jsonAuthzError`, and `jsonMethodNotAllowed` for API routes.
   - Convert service raw errors to `BusinessRuleError`, `NotFoundError`, `ConflictError`, `AuthRequiredError`, or `ForbiddenError`.
   - Preserve old public action result fields while allowing safe metadata additions.

4. Add the scanner.
   - Create or update `scripts/raw-error-boundary-gate.js`.
   - Start in report mode.
   - Move to warn/fail only when active unsafe findings reach zero or have reviewed allowlist entries.

5. Add focused regression tests.
   - Cover the migrated action or route contract.
   - Cover scanner detection/classification.
   - Prove unknown errors do not leak secrets, SQL, Prisma internals, tokens, paths, or stacks.

6. Run verification and save a report.

## Edit Boundary

May edit:

- `scripts/raw-error-boundary-gate.js`
- `scripts/__tests__/raw-error-boundary-gate.test.js`
- `lib/error-handling/**/*`
- `services/_shared/**/*`
- focused `actions/**/*`
- focused `app/api/**/*`
- focused `services/pos/**/*`
- focused `services/purchase-order/**/*`
- focused tests and `what-next/` reports.

Must not edit:

- unrelated UI, generated files, migrations, or evidence records;
- legal/statutory claims without authority evidence;
- broad domain rewrites unrelated to error-boundary migration.

## Verification Commands

Run the relevant subset, then broaden when stable:

```powershell
node scripts/raw-error-boundary-gate.js --mode report
npm test -- scripts/__tests__/raw-error-boundary-gate.test.js lib/error-handling services/_shared actions app/api services/pos services/purchase-order --runInBand
npm run prisma:validate
npm run service:boundary:ratchet
npm run typecheck
npm run lint
```

If a broad test target fails because unrelated suites are stale, run and report the focused touched-slice tests plus the exact blocker.

## Completion Report

Save:

`what-next/AQSTOQFLOW_PRIORITY_007C_ERROR_BOUNDARY_MIGRATION_RATCHET_REPORT_2026-06-17.md`

Include:

- skill name and objective;
- files inspected and changed;
- domains migrated;
- raw-error scanner summary;
- tests added or changed;
- verification commands and results;
- remaining unsafe findings by domain;
- whether the scanner can remain report mode, move to warn, or move to fail;
- next migration slice.

## Done Criteria

The codebase has a working raw-error boundary scanner and the selected high-risk legacy boundaries are migrated to canonical safe action/route envelopes or typed domain errors. Remaining raw-error surfaces are inventoried and classified for controlled follow-up migration.
