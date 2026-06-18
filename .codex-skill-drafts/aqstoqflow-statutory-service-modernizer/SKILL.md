---
name: aqstoqflow-statutory-service-modernizer
description: Modernize and harden the AqStoqFlow OHADA SaaS codebase by migrating legacy actions, App Router routes, hooks, components, mock/demo paths, hard deletes, and direct Prisma usage into statutory service-owned workflows. Use when Codex is asked to remove old code that violates the services to actions to hooks to UI paradigm, enforce tenant/RBAC/audit/ledger controls, add modernization gates, or run controlled domain-by-domain cleanup in AqStoqFlow.
---

# AqStoqFlow Statutory Service Modernizer

Use this skill to turn legacy AqStoqFlow code into controlled statutory service workflows without blind deletion. Migrate one domain at a time, prove replacement coverage, move all callers, add tests and gates, then remove obsolete paths only after usage reaches zero.

## Non-Negotiable Target Shape

Business-critical code must follow this ownership model:

```text
services/<domain>/*.schemas.ts
services/<domain>/*.errors.ts
services/<domain>/*.service.ts
services/<domain>/__tests__/*.test.ts

actions/<domain>/*.actions.ts     -> validation, auth context, service call, revalidation
hooks/<domain>/*.ts               -> query keys, fetch/mutate calls, cache invalidation
components/...                    -> presentation only
```

Services own Prisma access and business rules. Actions, route handlers, hooks, and UI must not directly mutate stock, money, journals, payroll, compliance, payments, purchasing, period close, or audit evidence.

## Required First Reads

Before editing code, read:

1. `what-next/AQSTOQFLOW_ENTERPRISE_SYSTEM_EXAMINATION_REPORT_2026-06-16.md` when present.
2. Any domain-specific `what-next/AQSTOQFLOW_*` report for the module being migrated.
3. The real schema, services, actions, hooks, routes, components, and tests for the target domain.
4. `references/migration-control-catalog.md` when classifying legacy findings or choosing controls.

If the report is missing, recreate the minimum current-state inventory before migrating.

## Run The Scanner

Use the bundled scanner to produce a current inventory:

```powershell
node "C:\Users\J COMPUTER\.codex\skills\aqstoqflow-statutory-service-modernizer\scripts\legacy-modernization-scan.js" --root . --out "what-next\AQSTOQFLOW_STATUTORY_SERVICE_MODERNIZATION_SCAN_2026-06-16.md" --json-out "what-next\AQSTOQFLOW_STATUTORY_SERVICE_MODERNIZATION_SCAN_2026-06-16.json"
```

Use `--mode fail` only after the current finding class is intentionally cleared or allowlisted.

## Migration Priority

Migrate in this order unless a production incident requires a narrower fix:

1. Inventory and item stock legacy actions.
2. Purchase-order/AP split-brain code.
3. Direct Prisma usage in App Router API routes and server pages.
4. Hard-delete paths for evidence-bearing records.
5. Mock/demo inventory, finance, reporting, and monitoring paths.
6. Raw error handling in legacy services/actions/routes.
7. Duplicate action modules and overlapping domain ownership.

## Service Controls

Every statutory service command that changes business truth must enforce:

- tenant and organization isolation;
- actor identity;
- RBAC and module permissions;
- maker-checker controls where sensitive;
- fresh-auth where required;
- open-period and locked-period guardrails;
- immutable business-event evidence;
- audit logging;
- idempotency or duplicate prevention;
- typed, user-safe domain errors;
- transaction integrity;
- ledger posting or explicit close blockers;
- notification/outbox evidence where applicable.

Never silently skip ledger posting. Post valid entries or create an explicit close blocker with enough evidence for accountant review.

## Controlled Migration Workflow

For each domain:

1. Inventory legacy paths grouped by file, behavior, risk, caller, and replacement service.
2. Confirm whether a statutory service already exists.
3. If absent, add the smallest complete service replacement using local patterns.
4. Move callers to service-backed actions and hooks.
5. Preserve behavior unless it violates tenant isolation, auditability, accounting discipline, RBAC, statutory evidence, or safety.
6. Add focused regression tests before deleting legacy code.
7. Delete old files/functions only after `rg` proves no runtime caller remains.
8. Add or update a static gate so the retired pattern cannot return.
9. Run focused tests and relevant repo gates.
10. Save a concise completion report under `what-next/`.

## Deletion Rules

Do not delete old code merely because a better service exists. Delete only when all are true:

- replacement service exists and is tested;
- all callers are migrated;
- behavior compatibility is verified or intentional differences are documented;
- no evidence-bearing historical data is destroyed;
- no route, hook, component, action, or test imports the old path;
- a static gate or regression test prevents reintroduction.

For economic records, prefer cancellation, reversal, soft delete, or corrective workflows over hard delete.

## Static Gates To Add Or Extend

Add deterministic scanners when useful:

- no direct Prisma in `app`, `components`, or `hooks`;
- no action-owned economic mutation;
- no final stock mutation outside `services/inventory`;
- no hard delete of evidence-bearing economic records;
- no production-visible mock/demo business data;
- no raw unsafe error leakage from actions/routes;
- no UI imports of Prisma or business-rule services.

Keep gates in report mode first. Ratchet to fail mode only after findings reach zero or have precise allowlist entries.

## Tests Required Per Migrated Workflow

Add or update tests for:

- successful service path;
- unauthorized actor rejection;
- wrong-tenant rejection;
- closed/locked-period rejection where applicable;
- maker-checker self-approval rejection where applicable;
- idempotent replay or duplicate prevention;
- ledger posting path or close-blocker fallback;
- safe action error response;
- proof that the old direct mutation path is no longer reachable.

## Verification

Run focused checks first, then broaden by blast radius:

```powershell
npm run prisma:validate
npm run typecheck
npm run inventory:boundary:fail
npm test -- --runInBand
```

Also run any new scanner in report or fail mode as appropriate. Run lint/build checks when App Router, hooks, or UI files are touched.

## Completion Report

Save a report under `what-next/` with:

- domains inspected;
- legacy paths found;
- paths migrated;
- paths deleted;
- statutory services added or reused;
- controls added;
- tests added;
- verification commands run;
- remaining blockers;
- next recommended migration slice.

If the run only inventories the system and does not migrate code, say that explicitly and list the first safe implementation slice.
