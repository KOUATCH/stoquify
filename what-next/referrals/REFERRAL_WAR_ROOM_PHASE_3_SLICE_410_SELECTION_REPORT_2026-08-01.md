# Referral War Room Phase 3 / Slice 410 Selection Report

Date: 2026-08-01
Slice: 410
Name: Inventory Loss Authenticated Browser Certification
Operating skills: `stoquify-referral-war-room-orchestrator`, `stoquify-inventory-loss-control`, `aqstoqflow-release-verification-foundation`, `stoquify-release-evidence-ratchet`

## Selection Decision

Slice 410 is selected to close the explicit authenticated visual, accessibility, and responsive-layout evidence gap left by the capability-certified Slice 409 Inventory Loss Operating Surface.

The live codebase supports a narrow solution. Existing transaction-history and payroll Playwright flows establish isolated local tenant seeds, fresh API-auth storage states, RBAC assertions, desktop/mobile browser checks, Axe scanning, screenshots, and durable JSON evidence. The inventory module has no required module dependencies. The protected Slice 408 query already recognizes an administrator role as tenant-wide operating authority and derives tenant, actor, permissions, and scope on the server.

## Scope

Selected implementation:

- Add a production-refusing, idempotent local E2E fixture for a dedicated inventory-loss tenant.
- Give the dedicated local `admin` role only `dashboard.read` and `inventory.levels.read`.
- Entitle the fixture tenant to the inventory module through its existing `requestedModules` contract.
- Seed deterministic completed negative stock-adjustment evidence across complete and partial reporting periods.
- Create a fresh inventory-loss Playwright storage state through the real sign-in endpoint.
- Assert the authenticated identity resolves to the dedicated organization and required RBAC permissions.
- Certify the existing workbench at desktop and mobile widths with screenshots, serious/critical Axe checks, overflow, overlap, and clipping checks.
- Exercise complete, partial, and empty service-owned workbench states.
- Assert approver attribution remains visibly non-causal and stored evidence hashes are not rendered.
- Save a redacted browser evidence manifest under `what-next/referrals/screenshots/slice410/`.

Expected files:

- `scripts/seed-inventory-loss-e2e-user.js`
- `scripts/__tests__/seed-inventory-loss-e2e-user.test.js`
- `tests/e2e/inventory-loss-auth.setup.ts`
- `tests/e2e/inventory-loss-authenticated-release.spec.ts`
- `playwright.config.ts`
- `package.json`
- dated Slice 410 certification and release-evidence reports
- `what-next/referrals/REFERRAL_WAR_ROOM_STATUS.md`

## Evidence Inputs

- Slice 409 capability and release reports.
- `scripts/seed-transaction-history-e2e-user.js`.
- `tests/e2e/transaction-history-auth.setup.ts`.
- `tests/e2e/transaction-history-authenticated-release.spec.ts`.
- `scripts/seed-payroll-e2e-user.js` local-only fixture guard.
- `playwright.config.ts` authenticated project topology.
- Slice 407 inventory-loss read model and source selection.
- Slice 408 protected query, module entitlement, and audited operating-access scope.
- Current Prisma organization, role, user, account, location, unit, item, stock-adjustment, and adjustment-line models.

## Authority Contract

The fixture is local E2E evidence, never production truth. It must refuse production-marked environments, never move an existing email between tenants, invalidate stale fixture sessions, and write only deterministic records inside its dedicated tenant.

Browser authority must come from the real authenticated session. The suite cannot supply organization, actor, role, permission, or plural location authority to the product action. Every workbench load must continue through `getInventoryLossSummaryAction`, enforced inventory entitlement, and audited operating-scope resolution.

## Explicit Non-Authority

Slice 410 adds no product route, action, service behavior, stock command, adjustment approval, loss resolution, alert, assurance incident, daily-truth or leakage feed, permission, schema, migration, production seed, AI/copilot behavior, WhatsApp behavior, export, or external sharing.

The fixture does not prove production data quality or deployment readiness. `RECORDED_THEFT` remains a source category only, and approving actors remain approval evidence rather than evidence of causation, fault, fraud, or theft.

## Expected Verification

- Focused Jest for fixture guardrails and non-authority contract.
- Prisma validation and idempotent local fixture execution.
- Playwright inventory-loss auth setup.
- Authenticated desktop/mobile complete-state certification.
- Authenticated partial and empty-state certification.
- Serious/critical Axe, horizontal overflow, overlap, clipping, screenshot, and evidence-manifest checks.
- Existing Slice 409 UI and Slice 408 query regression tests.
- `npm run typecheck`.
- Scoped ESLint and syntax checks.
- Production-authority, secret-output, source-boundary, and whitespace/diff scans.

## Success Criteria

