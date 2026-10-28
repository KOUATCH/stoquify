# Stoquify `Customer` workflow verification

## 1. Decision summary

- Result: `PASS WITH CONDITIONS`
- Entity key: `CUSTOMER`
- Mode: `remediate` and `re-verify`
- Scope: Local authenticated browser verification of customer list, create, profile, edit, orders, and statement surfaces in English and French across desktop, tablet, and mobile, including loading, empty, denied, locked, error, degraded, and success states.
- Evidence baseline: dirty worktree on `codex/service-boundary-burndown` at `4a6cc16`, verified 2026-08-11 against the local database and isolated Next.js ports 3118-3122.
- Highest residual severity: `LOW`
- Browser matrix result: `PASS` (42 PNGs, 6 JSON artifacts, 36/36 success cells, all seven required states, zero serious accessibility violations, zero horizontal-overflow records, zero fixture residue).
- Certification boundary: This is an evidence-scoped engineering verification, not a legal, accounting, security, privacy, accessibility, or release certification.

## 2. Entity correctness contract

| Contract element | Expected rule | Source class | Evidence |
| --- | --- | --- | --- |
| Owner/source of truth | Customer reads and mutations remain behind customer actions and tenant-scoped route loaders. | Direct source | `actions/customers/customerActions.ts`, `actions/customers/customer-management-actions.ts`, focused Jest and live route evidence. |
| Identity/uniqueness | Browser fixtures use stable IDs and customer records are addressed within the authenticated organization. | Direct source/runtime | `scripts/customer-e2e-fixture.js`; create/edit browser mutation evidence. |
| Lifecycle/transitions | In-scope lifecycle is list -> create -> profile -> edit, with related orders and statement views. | Runtime | Six surfaces rendered in both locales and all three viewports; persisted create/edit mutation passed. |
| Roles/permissions | Every surface requires the catalogued permission set; denied users fail closed before customer disclosure. | Direct source/runtime | `customers-route-data-access.ts`, `customers-route-access.tsx`, RBAC-negative evidence across all six routes. |
| Tenant/entitlement boundary | Sales gates customer surfaces; Accounting gates statements; foreign-tenant customer data is not enumerated. | Direct source/runtime | Locked and degraded evidence; module decisions audited by the route wrapper. |
| Data/transaction invariants | Mutations persist only in the permitted fixture organization; organization currency must exist for orders/statements. | Direct source/runtime | Mutation test, orders/statement focused tests, fixture cleanup proof. |
| Side effects/handoffs | Customer orders hand off to Sales capabilities; statement presentation requires accounting export permission and entitlement. | Direct source/runtime | Orders and statement page tests plus live browser routes. |
| Audit/provenance | Module access checks request audit records and each artifact records route, state, locale, viewport, layout, and accessibility result. | Direct source/runtime | `observeModuleAccess(... audit: true)` and per-project JSON evidence. |
| Failure/recovery | Loading, empty, error, degraded, denied, and locked states remain distinct and expose a safe recovery route without cross-tenant disclosure. | Runtime | Six non-success screenshots and browser assertions. |

## 3. Aggregate and workflow map

- Aggregate root and aliases: `Customer`; related read surfaces include customer analytics/profile, sales orders, receivables capabilities, and statement workflow.
- Owning services/actions: customer actions, customer management actions, customer route access wrapper, module entitlement service, organization settings service.
- Routes/APIs/jobs/events: `/[locale]/dashboard/customers`, `/new`, `/[id]`, `/[id]/edit`, `/[id]/orders`, `/[id]/statement`; Next.js server actions for customer reads and mutations.
- Persistence and read models: Prisma-backed Customer and SalesOrder fixture rows, server-action read models, route capability projection.
- Upstream dependencies: Better Auth session/RBAC, active organization, Sales or Accounting entitlement, organization currency.
- Downstream consumers and handoffs: Customer dashboard, action/profile pages, orders client, statement workflow, Sales route.
- In-scope paths: the six named surfaces, English/French, 1280x720 desktop, 834x1112 tablet, 412x915 mobile, the seven named UI states, create/edit persistence, denial and lock boundaries.
- Explicit exclusions: delete, bulk import/export execution, referral workflows, production deployment, external statement delivery/freeze, accounting posting, payment processing, and legal/accessibility/release certification.

Trace:

`route -> locale normalization -> RBAC -> tenant context -> module entitlement -> tenant-scoped action/read -> customer UI -> screenshot/axe/layout evidence -> fixture cleanup`

## 4. Gate scorecard

| Gate | Status | Evidence grade | Key evidence | Open finding IDs |
| --- | --- | --- | --- | --- |
| G1 Ownership/source of truth | `pass` | `E1 + E2` | Route registry/wrapper inspection; six live surfaces. | None |
| G2 Identity/lifecycle/invariants | `pass` | `E1 + E2` | Stable tenant fixtures; create and persisted edit; 53 focused tests. | None |
| G3 Tenant/auth/RBAC/entitlement | `pass` | `E1 + E2` | Authenticated permitted, denied, and locked states; foreign-tenant degraded state. | None |
| G4 Data integrity/safe mutation | `pass` | `E1 + E2` | Mutation test passed; cleanup verified 0 organizations/users/customers/salesOrders. | None |
| G5 Side effects/integrations/handoffs | `pass` | `E1 + E2` | Orders and statement handoffs/capabilities rendered; external execution explicitly excluded. | None |
| G6 Audit/privacy/recovery | `pass` | `E1 + E2` | Audited entitlement decisions; denied routes disclose no customer data; recoverable states. | None |
| G7 Tests/observability/release evidence | `pass with conditions` | `E1 + E2` | Browser aggregate PASS, 59 focused tests PASS, ESLint PASS; repository `tsc` blocked outside scope. | `CUSTOMER-G7-001` |

## 5. Conditional lens scorecard

| Lens | Status | Reason/evidence | Open finding IDs |
| --- | --- | --- | --- |
| Workflow UX | `pass` | Six surfaces and seven distinct states were exercised; visual spot-checks covered desktop list, mobile orders, tablet French statement, and the state contact sheet. | None |
| Accessibility/localization | `pass` | English/French success matrix complete; zero serious axe violations and zero overflow records; filters and mobile icon actions have accessible names. | None |
| Finance/accounting | `pass with conditions` | Currency and statement access boundaries passed; accounting posting and statement delivery were excluded. | None |
| OHADA/SYSCOHADA/country packs | `not applicable` | No statutory calculation or posting was executed. | None |
| Payments/providers | `not applicable` | No provider or payment mutation is in this surface slice. | None |
| Inventory/POS/offline | `not applicable` | No inventory or offline workflow is in scope. | None |
| HR/payroll/privacy | `not applicable` | No HR/payroll data is in scope. | None |
| Analytics/reporting | `pass with conditions` | Profile analytics and statement presentation rendered; production export correctness was excluded. | None |
| SaaS packaging/billing | `pass` | Sales-entitled/Accounting-unentitled tenant produced the expected statement lock. | None |
| AI/automation | `not applicable` | No AI decision or autonomous mutation is in scope. | None |
| Operations/support | `pass` | Dedicated runtime, deterministic fixtures, evidence aggregation, and zero-residue cleanup are reproducible. | None |

## 6. Findings

### `CUSTOMER-G7-001` — Repository-wide TypeScript gate is blocked outside the customer slice

- Severity: `low`
- Classification: bounded baseline condition
- Gate/lens and status: G7 `pass with conditions`
- Expected behavior and source class: `node node_modules/typescript/bin/tsc --noEmit --pretty false` should finish without diagnostics.
- Actual evidence: exit 1 after 87.3 seconds with only `app/[locale]/(dashboard)/dashboard/purchases/[id]/page.tsx(272,45): TS1005 ':' expected` and `(272,69): TS1381 unexpected token`. No customer diagnostic was emitted.
- Impact and affected actors/data: repository-wide static certification cannot be claimed from this worktree; the customer browser and focused-test conclusions remain directly evidenced.
- Recommendation: the purchases owner should repair line 272 and rerun the repository TypeScript gate.
- Verification method: rerun the exact `tsc` command below, then retain the focused customer Jest/ESLint/browser results.
- Suggested owner: Purchases workflow owner.
- Confidence: high (`E1`).
- Dependencies: concurrent dirty-worktree purchases changes.
- Residual risk: a cross-module type error could remain hidden behind the purchases parse failure, although customer runtime, Jest, ESLint, and Playwright checks pass.

## 7. Verification commands

| Command | Status | Purpose | Result/evidence |
| --- | --- | --- | --- |
| `node -e "const fs=require('fs'),p=require('@playwright/test/package.json'),c=require('playwright-core'); console.log(JSON.stringify({playwright:p.version,chromium:c.chromium.executablePath(),exists:fs.existsSync(c.chromium.executablePath())}))"` | `passed` | Runtime installation proof | Playwright 1.61.1; Chromium 1228 executable exists. |
| `node -e "const {chromium}=require('@playwright/test'); (async()=>{const b=await chromium.launch({headless:true}); const p=await b.newPage({viewport:{width:800,height:600}}); await p.setContent('<title>runtime-restored</title><main>runtime-restored</main>'); console.log(JSON.stringify({browser:await b.version(),title:await p.title(),text:await p.textContent('main')})); await b.close()})().catch(e=>{console.error(e);process.exit(1)})"` | `passed` | Authenticated-runtime prerequisite smoke | Chromium 149.0.7827.55 launched; title/text `runtime-restored`. |
| `node -e 'require("dotenv").config({path:".env.local",quiet:true}); require("dotenv").config({path:".env",quiet:true}); const {PrismaClient}=require("@prisma/client"); const p=new PrismaClient(); p.$queryRawUnsafe("SELECT 1 AS ok").then(r=>console.log(JSON.stringify({database:r[0]?.ok===1}))).finally(()=>p.$disconnect()).catch(e=>{console.error(e);process.exit(1)})'` | `passed` | Local database prerequisite | `{"database":true}`. |
| `$env:PLAYWRIGHT_PORT='3118'; node node_modules/@playwright/test/cli.js test --config=playwright.customer.config.ts --workers=1` | `failed (superseded)` | First authoritative serial matrix | Exposed one mutation-response matcher issue and one unnamed mobile icon button; unaffected desktop/tablet/RBAC/locked projects passed. Both customer failures were fixed and rerun. |
| `$env:PLAYWRIGHT_PORT='3119'; node node_modules/@playwright/test/cli.js test --config=playwright.customer.config.ts --project=customer-authenticated-desktop --grep 'creates a customer'` | `passed for selected test` | Persisted create/edit mutation recheck | Mutation passed in 1.7m; aggregate teardown was incomplete by design for the selected test. |
| `$env:PLAYWRIGHT_PORT='3120'; node node_modules/@playwright/test/cli.js test --config=playwright.customer.config.ts --project=customer-authenticated-desktop` | `passed for project` | Regenerate desktop success and state evidence | Auth setup, 12 localized surfaces, mutation, and loading/empty/error/degraded checks passed; teardown saw the then-stale mobile record. |
| `$env:PLAYWRIGHT_PORT='3121'; node node_modules/@playwright/test/cli.js test --config=playwright.customer.config.ts --project=customer-authenticated-mobile` | `passed` | Mobile rerun and aggregate certification | 3 passed, 2 intentionally skipped by project policy, 8.4m; aggregator became PASS. |
| `$env:PLAYWRIGHT_PORT='3122'; node node_modules/@playwright/test/cli.js test --config=playwright.customer.config.ts --project=customer-locked-state` | `passed` | Refresh localized Accounting lock evidence | 3 passed in 4.9m including auth setup, locked state, aggregate, and cleanup. |
| `node node_modules/@playwright/test/cli.js test --config=playwright.customer.config.ts --list` | `passed` | Harness discovery | 13 tests in 5 files. |
| `node node_modules/jest/bin/jest.js --runTestsByPath "app/[locale]/(dashboard)/dashboard/customers/__tests__/layout.test.tsx" "app/[locale]/(dashboard)/dashboard/customers/__tests__/pages.test.tsx" "app/[locale]/(dashboard)/dashboard/customers/[id]/orders/__tests__/page.test.tsx" "app/[locale]/(dashboard)/dashboard/customers/[id]/statement/__tests__/page.test.tsx" "components/customers/__tests__/CustomerActionPage.test.tsx" "components/customers/__tests__/CustomerStatementWorkflow.test.tsx" "components/customers/__tests__/customer-semantic-colors.test.ts" "actions/customers/__tests__/customer-management-actions.test.ts" --runInBand --silent` | `passed` | Focused customer unit/integration gate | 8 suites, 53 tests passed. |
| `node node_modules/jest/bin/jest.js scripts/__tests__/customer-e2e-fixture.test.js --runInBand --silent` | `passed` | Fixture safety gate | 1 suite, 6 tests passed. |
| `node node_modules/eslint/bin/eslint.js "app/[locale]/(dashboard)/dashboard/customers/customers-route-access.tsx" "app/[locale]/(dashboard)/dashboard/customers/customers-route-data-access.ts" "app/[locale]/(dashboard)/dashboard/customers/__tests__/pages.test.tsx" "app/[locale]/(dashboard)/dashboard/customers/[id]/orders/CustomerOrdersClientPage.tsx" "app/[locale]/(dashboard)/dashboard/customers/[id]/orders/__tests__/page.test.tsx" "app/[locale]/(dashboard)/dashboard/customers/[id]/statement/page.tsx" "app/[locale]/(dashboard)/dashboard/customers/[id]/statement/__tests__/page.test.tsx" components/customers/CustomerManagementDashboard.tsx playwright.customer.config.ts scripts/customer-e2e-fixture.js scripts/__tests__/customer-e2e-fixture.test.js tests/e2e/customer-auth.setup.ts tests/e2e/customer-authenticated-release.spec.ts tests/e2e/customer-rbac-negative.spec.ts tests/e2e/customer-locked-state.spec.ts tests/e2e/customer-cleanup-evidence.setup.ts` | `passed` | Scoped static lint | Exit 0, no diagnostics. |
| `node node_modules/prettier/bin/prettier.cjs --check "app/[locale]/(dashboard)/dashboard/customers/__tests__/pages.test.tsx" "app/[locale]/(dashboard)/dashboard/customers/[id]/orders/__tests__/page.test.tsx" "app/[locale]/(dashboard)/dashboard/customers/[id]/statement/page.tsx" "app/[locale]/(dashboard)/dashboard/customers/[id]/statement/__tests__/page.test.tsx" playwright.customer.config.ts scripts/customer-e2e-fixture.js scripts/__tests__/customer-e2e-fixture.test.js tests/e2e/customer-auth.setup.ts tests/e2e/customer-authenticated-release.spec.ts tests/e2e/customer-rbac-negative.spec.ts tests/e2e/customer-locked-state.spec.ts tests/e2e/customer-cleanup-evidence.setup.ts` | `passed` | Owned-file formatting gate | All matched files use Prettier style. |
| `node node_modules/typescript/bin/tsc --noEmit --pretty false` | `failed outside scope` | Repository TypeScript gate | Only two syntax diagnostics at purchases `[id]/page.tsx:272`; see `CUSTOMER-G7-001`. |
| `node -e "const fs=require('fs'); for(const f of ['messages/en.json','messages/fr.json']) JSON.parse(fs.readFileSync(f,'utf8')); console.log('JSON_PARSE_PASS en.json fr.json')"` | `passed` | Locale JSON integrity | Both locale files parsed strictly. |
| `git diff --check -- "app/[locale]/(dashboard)/dashboard/customers" components/customers/CustomerManagementDashboard.tsx messages/en.json messages/fr.json playwright.customer.config.ts scripts/customer-e2e-fixture.js scripts/__tests__/customer-e2e-fixture.test.js tests/e2e/customer-auth.setup.ts tests/e2e/customer-authenticated-release.spec.ts tests/e2e/customer-rbac-negative.spec.ts tests/e2e/customer-locked-state.spec.ts tests/e2e/customer-cleanup-evidence.setup.ts` | `passed` | Patch whitespace integrity | Exit 0; line-ending conversion warnings only. |
| `node scripts/customer-e2e-fixture.js cleanup` | `passed` | Final residue proof | 0 organizations, 0 users, 0 customers, 0 salesOrders. |

## 8. Remediation record

| File | Change | Invariant restored | Focused verification |
| --- | --- | --- | --- |
| `components/customers/CustomerManagementDashboard.tsx` | Added accessible names to status, activity, and language filters. | Filter controls remain discoverable to assistive technology. | Browser axe checks and scoped ESLint. |
| `app/[locale]/(dashboard)/dashboard/customers/[id]/orders/CustomerOrdersClientPage.tsx` | Added accessible names to order status and the mobile icon-only Sales action. | Mobile orders has no unnamed interactive control. | Mobile Playwright rerun passed; zero serious axe violations. |
| `app/[locale]/(dashboard)/dashboard/customers/[id]/statement/page.tsx` | Applied localized locked copy to both singular `module` and plural `modules` catalog shapes. | French/English statement locks use route-specific copy. | Statement Jest test and locked Playwright refresh passed. |
| `app/[locale]/(dashboard)/dashboard/customers/customers-route-access.tsx` | Normalized allowed locale to the `Locale` contract. | Route callbacks cannot receive unsupported locale strings. | Scoped ESLint, focused pages tests, browser routes. |
| `app/[locale]/(dashboard)/dashboard/customers/customers-route-data-access.ts` | Removed the self-redeclared catalog name and mapped the canonical entries. | Route registry has one source value and valid maps. | Scoped ESLint, route tests, Playwright discovery. |
| Customer route tests | Updated mocks/assertions to the current server RBAC, entitlement, recoverable-state, and dashboard-back contracts. | Tests exercise the implementation boundary instead of loading ESM auth internals. | 8 suites/53 tests passed. |
| `messages/en.json`, `messages/fr.json` | Repaired concurrent delimiter damage without changing customer copy. | Next.js locale files remain parseable. | Strict JSON parse and browser rendering passed. |
| `playwright.customer.config.ts`, `scripts/customer-e2e-fixture.js`, `scripts/__tests__/customer-e2e-fixture.test.js`, `tests/e2e/customer-*.ts` | Added isolated authenticated projects, deterministic tenant fixtures, state/matrix assertions, axe/layout checks, evidence aggregation, and verified cleanup. | Certification is reproducible, tenant-safe, and leaves no synthetic residue. | Final aggregate PASS; fixture tests PASS; project list PASS. |

## 9. Residual risk and blockers

- Residual risk: low; the customer slice is directly verified, but repository-wide TypeScript completion is unavailable until the unrelated purchases syntax error is repaired.
- Evidence gaps: no production environment, external delivery, delete, import/export execution, accounting posting, or payment-provider behavior was exercised.
- Skipped checks and reason: tablet/mobile mutation and non-success state tests are intentionally desktop-owned to avoid duplicate destructive setup; their projects still render all 12 localized success surfaces.
- External/qualified review required: accessibility and accounting conclusions are engineering checks only; specialist review is required for formal certification.
- Rollback or recovery concern: browser fixtures are local-only, guarded against production hosts, and final cleanup proved zero matching rows.

## 10. Prioritized next actions

| Priority | Finding/action | Owner | Effort | Closure evidence |
| --- | --- | --- | --- | --- |
| P1 | Repair the purchases page syntax at line 272 and rerun repository `tsc`. | Purchases owner | Small | `tsc --noEmit --pretty false` exits 0. |
| P2 | Preserve the customer Playwright projects in CI or a release evidence job. | QA/release owner | Medium | One clean serial run publishes the same 42-image/6-JSON PASS bundle. |

## 11. Evidence index

- `what-next/evidence/customer-browser-certification-2026-08-11/certification-summary.json` — aggregate status, state union, matrix completeness, and cleanup.
- `what-next/evidence/customer-browser-certification-2026-08-11/customer-authenticated-{desktop,tablet,mobile}.json` — per-surface route, locale, viewport, axe, and layout records.
- `what-next/evidence/customer-browser-certification-2026-08-11/customer-rbac-negative.json` — authenticated denial evidence across all six routes.
- `what-next/evidence/customer-browser-certification-2026-08-11/customer-locked-state.json` — Accounting-entitlement lock evidence.
- `what-next/evidence/customer-browser-certification-2026-08-11/*.png` — 42 screenshots: 36 success cells and one each for loading, empty, error, degraded, denied, and locked.
- `playwright.customer.config.ts`, `scripts/customer-e2e-fixture.js`, `tests/e2e/customer-*.ts` — executable local verification harness.
- `app/[locale]/(dashboard)/dashboard/customers/customers-route-data-access.ts`, `customers-route-access.tsx` — route/permission/module contract.
- `graphify-out/graph_app.json`, `graph_actions.json`, `graph_components.json`, `graph_hooks.json`, `graph_types.json` — architecture discovery aids only; direct source and runtime evidence govern the conclusions.
