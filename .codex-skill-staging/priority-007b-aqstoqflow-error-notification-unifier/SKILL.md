---
name: priority-007b-aqstoqflow-error-notification-unifier
description: Unify AqStoqFlow error handling and notification foundations. Use when replacing split `lib/error-handling` and `services/_shared/action-errors.ts` behavior with one canonical, enterprise-grade, tenant-safe, user-safe, correlation-aware error model for services, server actions, App Router API routes, notifications, and regression gates.
---

# Priority 007B Error Notification Unifier

## Purpose

Use this skill to consolidate AqStoqFlow's two overlapping error layers into one canonical platform-wide error and notification system.

Target architecture:

- `lib/error-handling/*` is the canonical engine for taxonomy, classification, redaction, correlation IDs, action/route mapping, notification intent, and operator diagnostics.
- `services/_shared/action-errors.ts` becomes a compatibility facade for service ergonomics such as `BusinessRuleError`, `NotFoundError`, `ConflictError`, and `toSafeActionError`.
- Server actions and App Router API routes normalize all failures before anything reaches a client.

Do not attempt a blind repo-wide rewrite. Build a ratcheted migration: canonicalize the core, migrate high-risk boundaries, prove compatibility, then report remaining raw-error surfaces for later domain slices.

## Required First Reads

Read the current code before editing:

- `lib/error-handling/types.ts`
- `lib/error-handling/categories.ts`
- `lib/error-handling/error-handler.ts`
- `lib/error-handling/server-action-wrapper.ts`
- `lib/error-handling/notification-integration.ts`
- `services/_shared/action-errors.ts`
- `services/_shared/protect.ts`
- `app/api/**/*route.ts`
- `what-next/AQSTOQFLOW_ENTERPRISE_SYSTEM_EXAMINATION_REPORT_2026-06-16.md`
- `what-next/AQSTOQFLOW_STATUTORY_SERVICE_MODERNIZATION_SCAN_2026-06-16.md`
- `what-next/AQSTOQFLOW_PRIORITY_007_ERROR_RESPONSE_NORMALIZER_REPORT_*.md` when present
- `graphify-out/GRAPH_REPORT.md` only when architecture impact is unclear.

Read references only when needed:

- `references/runtime-boundary.md` for allowed edits, stop conditions, and gates.
- `references/compatibility-contract.md` when changing `services/_shared/action-errors.ts`.
- `references/migration-checklist.md` before migrating actions or API routes.

## Execution Workflow

1. Inventory the current error surfaces.
   - Search for `throw new Error(`, `throw error`, `console.error(`, raw `NextResponse.json({ error`, and custom action error shapes.
   - Separate client-boundary leakage from internal typed domain errors.
   - Prioritize economic, auth/RBAC, inventory, purchasing/AP, POS, accounting, payments, payroll, compliance, and close-assurance paths.

2. Define or repair the canonical model in `lib/error-handling`.
   - Ensure one serializable canonical shape includes code, category, severity, status, retryability, user message, operator message, correlation/request ID, safe metadata, field errors, and notification intent.
   - Preserve Next.js control-flow errors such as redirect and not-found.
   - Redact secrets, tokens, cookies, SQL, Prisma internals, database URLs, filesystem paths, and raw provider payloads.

3. Turn `services/_shared/action-errors.ts` into a compatibility facade.
   - Keep existing exported class names and function names unless every caller is migrated.
   - Map `ApplicationError`, `BusinessRuleError`, `NotFoundError`, `ConflictError`, Zod errors, Prisma known errors, and unknown errors into the canonical model.
   - Keep old action result fields (`error`, `status`, `code`) where callers depend on them, but add correlation and structured metadata when safe.

4. Normalize server action boundaries.
   - Prefer `protect` or existing action wrappers for RBAC-scoped actions.
   - Return stable safe envelopes; never expose raw exception messages for unknown system errors.
   - Log operator details with redaction and correlation ID.

5. Normalize App Router API boundaries.
   - Add a small route response helper if one does not already exist.
   - Map domain, validation, auth/RBAC, Prisma, and unknown errors to safe JSON responses.
   - Include support-friendly correlation metadata without leaking internals.

6. Add regression tests before broadening.
   - Test the canonical mapper, compatibility facade, protected action envelope, and at least one route helper.
   - Prove unknown exceptions do not leak stack traces, SQL, secrets, tokens, database URLs, or internal filesystem paths.

7. Ratchet and report.
   - Update or add a report-mode scan when useful, but move to fail mode only when the active class is truly clean or explicitly allowlisted.
   - Save a completion report under `what-next/`.

## Canonical Error Requirements

Every canonical error response must be serializable and safe:

- `code`: stable machine-readable error code.
- `category`: validation, authentication, authorization, business_rule, database, inventory, accounting, payment, payroll, compliance, external, configuration, or system.
- `severity`: low, medium, high, or critical.
- `status`: HTTP/action status.
- `retryable`: boolean.
- `userMessage`: safe, actionable message.
- `operatorMessage`: redacted diagnostic message for logs only.
- `correlationId` or `requestId`: present on every boundary failure.
- `metadata`: safe redacted data only.
- `fieldErrors`: optional validation details.
- `notification`: user/admin notification intent.

## Migration Rules

- Keep behavior stable unless it leaks internals or conflicts with tenant safety, RBAC, auditability, fiscal period controls, ledger integrity, or OHADA discipline.
- Do not replace domain validation with generic catches.
- Do not mask authorization failures as generic crashes.
- Do not retry financial, stock, payroll, payment, ledger, or external side-effect writes unless idempotency exists.
- Do not add a second taxonomy. Extend `lib/error-handling` and adapt old callers through compatibility helpers.
- Delete legacy helpers only after usage reaches zero and tests cover the replacement.

## Verification Commands

Run the focused commands that match touched files:

```powershell
npm test -- lib/error-handling services/_shared actions app/api --runInBand
npm run prisma:validate
npm run service:boundary:ratchet
npm run typecheck
npm run lint
```

If global typecheck or lint fails from unrelated existing blockers, document exact files and prove the touched slice with focused tests.

## Completion Report

Save:

`what-next/AQSTOQFLOW_PRIORITY_007B_ERROR_NOTIFICATION_UNIFIER_REPORT_2026-06-17.md`

Include:

- skill name and objective;
- files and reports inspected;
- files changed;
- canonical error architecture;
- compatibility strategy;
- migrated server actions and API routes;
- notification and correlation behavior;
- tests added or changed;
- verification commands and results;
- remaining raw-error surfaces;
- next migration slices.

## Done Criteria

The project has one canonical error and notification foundation. Existing service-level typed errors still work through the compatibility facade, client boundaries return safe correlation-aware envelopes, and future migrations can remove legacy raw errors without creating another parallel error layer.
