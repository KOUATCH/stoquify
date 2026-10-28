# Tomorrow Work Plan - AqStoqFlow Correction Program

Date prepared: 2026-06-17
Target work date: 2026-06-18
Workspace: `E:\ohada saas\newStockFlow\aqstoqflow`

## Purpose

This report converts the Correction Program into a practical one-slice-at-a-time execution plan. The goal is to avoid a broad, risky remediation pass and instead run specialized skills that each own one measurable problem area, reduce a current baseline, verify the result, and save a follow-up report.

The working service-boundary burn-down baseline is the latest reported `165` findings. The first task tomorrow is to refresh the baseline before editing so the active count and reports are current.

## Operating Rules

- Work from `E:\ohada saas\newStockFlow\aqstoqflow`.
- Resolve one aspect at a time.
- Read or regenerate the latest reports before each slice.
- Keep changes surgical and domain-owned.
- Move direct Prisma access behind service-owned APIs and DTOs.
- Remove mock/demo helpers from production trust paths.
- Require business events, audit evidence, idempotency, and source links for financial or compliance workflows.
- Run focused verification before moving to the next slice.
- Save a dated `what-next` report after every slice.

## Recommended Skill Suite

### 1. `aqstoqflow-baseline-refresh-ratchet`

Use this first tomorrow.

Prompt:

> Run and regenerate the active release-readiness reports: service-boundary, hard-delete, demo-trust, raw-error, Prisma validation, typecheck, lint, and focused POS/compliance tests. Use the latest 165 service-boundary findings as the working burn-down baseline, identify deltas, and save a baseline report.

Success:

- Active service-boundary count is confirmed.
- Hard-delete, demo-trust, raw-error, Prisma, typecheck, lint, POS, and compliance outcomes are recorded.
- New baseline report is saved under `what-next`.

### 2. `aqstoqflow-platform-tooling-stabilizer`

Use after the baseline is known.

Prompt:

> Stabilize AqStoqFlow platform tooling by moving Prisma package config to `prisma.config.ts`, replacing deprecated `next lint`, removing `--no-lint` from production build only once lint is stable, and making `verify:repo` the single release-gate command. Preserve existing scripts unless they conflict with the release gate.

Success:

- Prisma config is modernized.
- Deprecated lint path is replaced.
- Production build no longer bypasses lint once lint is stable.
- `verify:repo` becomes the single release-gate command.

### 3. `aqstoqflow-service-boundary-domain-burner`

Use repeatedly, one domain per run.

Prompt:

> Burn down direct Prisma service-boundary findings for one assigned domain only. Start with the current report, migrate direct reads and writes behind service-owned methods and DTOs, remove mock/demo helpers where they affect trust boundaries, rerun service-boundary ratchets, and prove the active count decreased with no new findings.

Suggested domain order:

1. `actions/dashboard/getDashboardData.ts`
2. `actions/accounting/reports.actions.ts`
3. Role, user, and auth actions
4. Supplier, customer, location, tax, and unit actions
5. POS actions
6. Remaining inventory and reporting paths

Success:

- The selected domain has fewer active findings.
- No unrelated domain is refactored.
- Ratchet output proves no new findings were introduced.

### 4. `aqstoqflow-purchasing-ap-ownership-finalizer`

Use when service-boundary work reaches purchasing/AP or when PO lifecycle duplication blocks progress.

Prompt:

> Collapse purchasing and AP lifecycle behavior into the canonical purchasing service. Cover submit, approve, receive, cancel, close, archive, invoice handoff, audit evidence, business-event emission, authorization, idempotency, and tenant boundaries. Remove duplicate action-owned lifecycle logic.

Success:

- PO lifecycle behavior is service-owned.
- Submit, approve, receive, cancel, close, archive, and invoice handoff are covered.
- Business events and audit evidence are durable.

### 5. `aqstoqflow-inventory-release-workflow`

Use to replace the current fail-closed compatibility path.

Prompt:

> Replace the compatibility `releaseInventory` path with a real service-owned inventory release workflow. Validate tenant, authorization, stock availability, ledger impact, event evidence, rollback behavior, idempotency, and audit/source links. Preserve fail-closed behavior only for invalid requests, not as the normal implementation.

Success:

- Inventory release is a real workflow, not a placeholder.
- Tenant, authorization, stock, ledger, event, and rollback behavior are validated.
- Focused inventory tests and boundary checks pass.

### 6. `aqstoqflow-business-event-evidence-standardizer`

Use across financial and compliance workflows.

Prompt:

> Standardize business events and evidence for financial or compliance-relevant workflows. Require durable event envelopes, actor/context evidence, idempotency keys, immutable audit records, and source links into ledger, compliance, inventory, purchasing, POS, payroll, and reporting paths.

Success:

- Touched workflows emit consistent event envelopes.
- Actor/context evidence is retained.
- Source links connect operational actions to ledger, compliance, or reporting records.

### 7. `aqstoqflow-close-certification-invalidator`

Use after event and evidence paths are reliable.

Prompt:

> Wire certification invalidation into every workflow that can change certified financial or compliance state. Add calls into `recordCloseCertificationInvalidation` from inventory, ledger, payments, compliance, payroll, purchasing, permissions, and country-pack changes, with actor/context evidence and source links.

Success:

- Certified close state becomes stale when underlying facts change.
- Invalidation records include actor, reason, source, and affected domain.
- Close certification tests or focused checks cover the new hooks.

### 8. `aqstoqflow-external-readiness-adapters`

Use for production integration readiness.

Prompt:

> Build external readiness for statutory authority adapters, payment provider statement ingestion, payroll filing adapters, credential handling, outage/staleness monitoring, and country-pack expert review workflows. Avoid mock/demo trust paths in production surfaces.

Success:

- Real adapter contracts replace production mock paths.
- Credentials are handled through controlled boundaries.
- Staleness and outage states are observable.
- Country-pack expert review is represented as a real workflow.

### 9. `aqstoqflow-offline-pos-hardener`

Use for offline POS risk reduction.

Prompt:

> Harden offline POS by adding manager conflict resolution, offline tender reconciliation, device key rotation, replay observability, and jurisdiction-aware fiscal-document eligibility checks. Preserve replay safety, idempotency, tenant isolation, and audit evidence.

Success:

- Offline conflicts require manager resolution where appropriate.
- Offline tenders reconcile against replayed sales.
- Device key rotation and replay observability are implemented.
- Fiscal-document eligibility respects jurisdiction rules.

### 10. `aqstoqflow-release-ratchet-promoter`

Use only after service-boundary findings reach zero.

Prompt:

> Promote report-mode ratchets to hard release gates once service-boundary findings reach zero. Convert service-boundary checks to fail-mode CI gates and keep hard-delete, demo-trust, raw-error, tenant/RBAC, and compliance gates mandatory for release. Update `verify:repo` as the single enforcement command.

Success:

- Service-boundary regressions fail CI.
- Hard-delete, demo-trust, raw-error, tenant/RBAC, and compliance gates remain mandatory.
- `verify:repo` is the release gate for local and CI validation.

## Tomorrow Execution Order

1. Run `aqstoqflow-baseline-refresh-ratchet`.
2. Save the refreshed baseline report.
3. If tooling blocks verification, run `aqstoqflow-platform-tooling-stabilizer`.
4. Start the first service-boundary domain burn-down against `actions/dashboard/getDashboardData.ts`.
5. Rerun the boundary ratchets and focused tests.
6. Save the slice report with before/after counts.

## Verification Commands To Prioritize

```powershell
npm run inventory:boundary:fail
npm run service:boundary:ratchet
npm run prisma:validate
npm run typecheck
npm run lint
npm run verify:repo
```

Also run the focused POS and compliance tests identified by the refreshed baseline report.

## Decision Rationale

The correction program is intentionally split into specialized skills because the risk areas are different. Tooling stabilization, service-boundary cleanup, purchasing/AP ownership, inventory release, business-event evidence, certification invalidation, external readiness, offline POS hardening, and CI ratchet promotion each need separate success criteria.

This structure keeps the work measurable: every run should either reduce an active count, replace an unsafe compatibility path, add durable audit evidence, or harden a release gate. It also protects the codebase from broad refactors by forcing each slice to start with a baseline, edit one domain, verify, and save a follow-up report.

## Next Report To Save

After the first tomorrow slice, save a new report under `what-next` with:

- Baseline command results.
- Service-boundary count before and after.
- Files changed.
- Tests and ratchets run.
- Remaining blockers.
- Recommended next domain.
