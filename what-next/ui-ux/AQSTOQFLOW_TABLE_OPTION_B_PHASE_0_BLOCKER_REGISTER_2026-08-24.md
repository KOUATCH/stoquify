# Stoquify Table Option B — Phase 0 Blocker Register

Date: 2026-08-24

Decision: **BLOCK PHASE 1 — browser repaired, but no authenticated and authorized evidence identity exists**

## Executive finding

The Windows browser bridge is no longer the blocker. The approved in-app browser starts, the Stoquify server responds, and `/api/auth/get-session` returns HTTP 200. The remaining gate is an evidence-environment problem: the browser is unauthenticated, the current database has no ready account covering the required route permissions, the known fixtures are absent and split across workflows, and the fixture scripts cannot safely be run against the current nonlocal database without explicit authorization and compatibility work.

Phase 1 is independently blocked by directly overlapping user-owned edits in the shared table and target-route files. Those changes are now hash-baselined, but they have not been adopted as agent-owned work.

No application file or database record was changed by this audit.

## Blocker register

| ID | Status | Finding | Safe resolution |
| --- | --- | --- | --- |
| P0-001 | Resolved | Browser helper failed because the protected repository `.git` directory was owned by `BUILTIN\Administrators`. | The owner-only repair is verified; no further repository ACL change is needed. |
| P0-002 | Ready | The running server and auth endpoint respond; protected-route navigation completes and redirects correctly when the controlled browser is unauthenticated. | Keep the existing server and approved in-app browser. |
| P0-003 | Blocking | No authenticated session exists in the approved evidence browser. A fresh post-repair supplier-route navigation again resolved to the login callback. | Sign in only after a suitable evidence account exists. Do not place credentials in reports or retained evidence. |
| P0-004 | Blocking | A read-only database query found **0** active verified users with all five highlighted route permissions plus payroll and purchasing module access. | Provision one least-privilege evidence account, or approve a deliberate multi-account evidence plan. |
| P0-005 | Blocking | Known payroll, supplier, and supplier-PO fixture organizations/users are absent; their roles do not cover the same routes. | Prefer a dedicated account. Do not seed until the database is confirmed as an approved non-production target. |
| P0-006 | Ready | Supplier and payroll fixture scripts now normalize datasource URLs to `prisma+postgres` for Prisma Edge compatibility while preserving the same nonlocal protection behavior. | Keep the existing nonlocal gate intact and run only against approved non-production databases (or with explicit nonlocal authorization). |
| P0-007 | Blocking | `representative_active_evidence_or_audit_route` in the matrix is not a real route. | Select a concrete route before capture. `/en/dashboard/people/history` is available but contains HR evidence and requires strict redaction. |
| P0-008 | Blocking Phase 1 | Shared DataTable, date-range, payroll, and purchase-order files contain directly overlapping user-owned edits. | After Phase 0 passes, explicitly adopt the ownership baseline or isolate minimal hunks. Stop on non-isolatable overlap. |
| P0-009 | Pending | Screenshots, responsive checks, EN/FR, keyboard, zoom/reflow, and accessibility smoke are still at zero. | Run them only after P0-003, P0-004, P0-005/P0-006, and P0-007 are resolved. |
| P0-010 | Non-blocking | Git cannot read the user-level `.config/git/ignore` path inside the sandbox. | Treat as maintenance; do not broaden ACL changes while Git operations remain functional. |
| P0-011 | Passed, limited | Two focused table contract suites passed: 2 suites, 5 tests. | Retain as structural evidence only; it cannot replace browser or assistive-technology evidence. |

## Required browser identity

The five highlighted routes require:

- `purchases.suppliers.read`
- `payroll.compensation.read`
- `payroll.employees.read`
- `hris.people.read`
- `purchases.orders.read`
- an active organization with the Payroll module enabled; purchasing access must also be present for a coherent evidence workspace

The wider Phase 0 route set additionally requires:

- `inventory.brands.read`
- `inventory.units.read`
- `inventory.levels.read`
- `accounting.reports.read`
- `OPERATE_POS`

An unrestricted production administrator is not the preferred evidence identity. The safer option is a time-bounded, evidence-only role on a redaction-safe non-production organization containing representative synthetic rows.

## Why the proposal cannot yet execute freely

The prompt correctly treats browser evidence as a hard prerequisite, but it assumes the evidence environment already contains an authenticated, cross-module, redaction-safe identity and representative data. That assumption is false in the current workspace. The proposal also delays ownership isolation until after Phase 0, while its Phase 1 candidate files already contain exactly the table changes Phase 1 intends to make. Therefore the execution cannot safely move forward merely because the browser bridge was repaired.

The gates are useful and should remain. The improvement is to add an explicit **Phase 0A evidence-environment preflight** before browser capture:

1. Confirm database classification: local/non-production and approved for test writes, or read-only production-like.
2. Select one concrete evidence/audit route.
3. Provision or identify an evidence account and verify permissions/module entitlements without disclosing identity data.
4. Verify representative synthetic data and a redaction plan for payroll, HR, supplier, finance, and audit tables.
5. Authenticate in the approved in-app browser and check all target routes once at desktop width.
6. Only then run the full viewport, locale, keyboard, zoom/reflow, and accessibility matrix.

## Recommended recovery path

1. **Recommended:** provision one least-privilege evidence account on an approved non-production organization with the permissions above and synthetic/redaction-safe data.
2. Authenticate that account in the existing approved browser session.
3. Resolve the placeholder audit route to `/en/dashboard/people/history` or another explicitly approved route.
4. Run a route-access preflight before capturing screenshots; stop on the first permission, module, or data-sensitivity failure.
5. Capture the full Phase 0 matrix and keep `phase1Authorized` false until every required evidence class is present.
6. After Phase 0 passes, compare the current hashes in `ownership-baseline.json`; obtain explicit baseline adoption or isolate hunks before any Phase 1 edit.

Alternative: use multiple existing fixtures. This is slower and still unsafe because the fixtures are absent, route-specific, materially write data, and reject the current nonlocal database without explicit authorization. Compatibility itself is repaired.

## Verification performed

- Approved browser: session creation, rendered login page, and a fresh post-repair protected-route login redirect verified.
- Auth endpoint: HTTP 200 with unauthenticated `null` session.
- Database: direct read-only connectivity succeeded.
- Fixture runtime compatibility: new focused checks for supplier and payroll fixture datasource resolution passed without DB mutation (supported `postgresql://`, `postgres://`, `prisma://`, and `prisma+postgres://` inputs; supplier `assertLocalFixtureAllowed` guard behavior unchanged).
- Fixture presence: 0 known fixture organizations and 0 known fixture users.
- Eligible five-route identities: 0.
- Focused structural contracts: 2 suites passed, 5 tests passed.
- Application mutations: none.
- Database mutations: none.

## Gate decision

**BLOCK — preserve Phase 0 and Phase 1 gates. Continue only after evidence identity, route scope, safe data, and ownership are explicit.**
