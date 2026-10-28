# Stoquify `Public customer-statement recipient` workflow verification

## 1. Decision summary

- Result: `PASS WITH CONDITIONS`
- Entity key: `PUBLIC_CUSTOMER_STATEMENT_RECIPIENT`
- Mode: `remediate` and `re-verify`
- Scope: Public signed statement read, promise-to-pay and dispute recipient actions, revoked/invalid tokens, loading/error states, and desktop/mobile presentation; authenticated statement creation and broader accounting posting are excluded except for access-control regression.
- Evidence baseline: dirty worktree on `codex/service-boundary-burndown` at `4a6cc16`, verified 2026-08-13 against isolated local database `stoquify_statement_browser_e2e` and ports 3011/3012.
- Highest residual severity: `LOW` (repository baseline only; no open in-scope finding).
- Certification boundary: This is an evidence-scoped engineering verification, not a legal, accounting, security, privacy, accessibility, or release certification.

## 2. Entity correctness contract

| Contract element | Expected rule | Source class | Evidence |
| --- | --- | --- | --- |
| Owner/source of truth | The immutable customer statement snapshot owns recipient-visible balances and document lines. | Direct source/runtime | `customer-statement-access.service.ts`; signed browser statement showed the fixture snapshot and exact content-hash suffix. |
| Identity/uniqueness | Access is bound to organization, statement ID/content hash, token hash, JTI hash, and token permissions. | Direct source/tests | `customer-statement-access.service.ts:325-376`; token/access Jest suites. |
| Lifecycle/transitions | Active signed access may view and create `PROMISE_TO_PAY`/`DISPUTE`; revoked or malformed signatures fail closed. | Runtime/tests | Browser DOM/screenshots; 25 focused tests; isolated ledger inspection. |
| Roles/permissions | Recipient actions are exposed only for lowercase permissions returned by the authoritative access service. | Direct source/runtime | Portal lines 55, 171-172, 293-294; real-browser remediation proof. |
| Tenant/entitlement boundary | Public access never supplies an organization selector; the signed token and stored token row determine tenant and statement. | Direct source/tests | Access service organization/content checks; API and service suites. |
| Data/transaction invariants | Recipient action, business event, initial append-only state, access log, and audit are committed serializably with idempotency and correlation evidence. | Direct source/runtime | Recipient action service lines 155-461; database inspection shows one action/state/audit per browser action. |
| Side effects/handoffs | Promise and dispute become accounting recipient-action records without modifying statement or receivable truth. | Direct source/runtime | Isolated database action/state/audit evidence; immutable snapshot trigger. |
| Audit/provenance | Personal request metadata is hashed; access logs and action evidence are append-only. | Direct source/runtime | External-access migration lines 366-389; browser footer; database inspection. |
| Failure/recovery | Loading is announced; invalid/revoked tokens return the same generic unavailable response and direct the recipient to request a new link. | Runtime/tests | Browser initial DOM and identical 25,573-byte/SHA-256 error screenshots; portal tests. |

## 3. Aggregate and workflow map

- Aggregate root and aliases: immutable `CustomerStatementSnapshot`; public recipient aliases are signed statement, access token, recipient action, and action state.
- Owning services/actions: customer-statement access service, token codec, recipient-action service.
- Routes/APIs/jobs/events: `/customer-statement/[statementId]`, `GET /api/customer-statements/[statementId]`, `POST /api/customer-statements/[statementId]/actions`, business-event and audit writes.
- Persistence and read models: statement snapshot, access token/log, recipient action/state, business event, audit log.
- Upstream dependencies: authenticated statement generation/delivery, local signing secret, immutable receivable evidence.
- Downstream consumers and handoffs: accounting review of promise/dispute records; no payment or ledger posting occurs here.
- In-scope paths: signed read, promise, dispute, revoked token, invalid signature, loading/error, desktop 1440x1000 and mobile 390x844.
- Explicit exclusions: statement generation/delivery UX, recipient-action resolution, payments, customer authentication, accounting posting, production infrastructure, formal WCAG/legal/accounting certification.

Trace:

`public URL -> signed-token verification -> stored token/tenant/content/permission checks -> immutable snapshot read -> recipient validation -> serializable event/action/state/log/audit -> public success/error UI -> accounting handoff`

## 4. Gate scorecard

| Gate | Status | Evidence grade | Key evidence | Open finding IDs |
| --- | --- | --- | --- | --- |
| G1 Ownership/source of truth | `pass` | `E1 + E2` | Immutable snapshot source and signed browser content. | None |
| G2 Identity/lifecycle/invariants | `pass` | `E1 + E2` | Active, revoked, and malformed tokens plus action-state inspection. | None |
| G3 Tenant/auth/RBAC/entitlement | `pass` | `E1 + E2` | Token-bound tenant/content/permission checks and 25 focused tests. | None |
| G4 Data integrity/safe mutation | `pass` | `E1 + E2` | Serializable action service; append-only triggers; two isolated browser writes. | None |
| G5 Side effects/integrations/handoffs | `pass` | `E1 + E2` | Business-event/action/state/audit pairs exist for promise and dispute. | None |
| G6 Audit/privacy/recovery | `pass` | `E1 + E2` | Hashed metadata statement; generic error parity; append-only logs. | None |
| G7 Tests/observability/release evidence | `pass with conditions` | `E1 + E2` | Browser evidence, database trace, 25 tests, scoped lint; repository `tsc` has unrelated dirty-worktree failures. | `PUBLIC_CUSTOMER_STATEMENT_RECIPIENT-G7-001` |

## 5. Conditional lens scorecard

| Lens | Status | Reason/evidence | Open finding IDs |
| --- | --- | --- | --- |
| Workflow UX | `pass` | Signed data and both recipient actions completed; loading and recoverable error copy were visible. | None |
| Accessibility/localization | `pass with conditions` | Semantic status/alert/headings and label-driven form automation passed; English only and no full WCAG audit. | None |
| Finance/accounting | `pass` | Actions preserve statement/receivable truth and create separate append-only accounting evidence. | None |
| OHADA/SYSCOHADA/country packs | `not applicable` | No statutory calculation or posting is performed by the recipient flow. | None |
| Payments/providers | `not applicable` | Promise-to-pay records intent only; no provider call or payment mutation. | None |
| Inventory/POS/offline | `not applicable` | No inventory/offline path is in scope. | None |
| HR/payroll/privacy | `not applicable` | No HR/payroll data is in scope; request metadata is hashed. | None |
| Analytics/reporting | `pass with conditions` | Statement presentation was checked; formal report/export correctness was excluded. | None |
| SaaS packaging/billing | `not applicable` | Recipient authorization is token permission based, not package configuration. | None |
| AI/automation | `not applicable` | No AI decision or autonomous mutation is present. | None |
| Operations/support | `pass with conditions` | Reproducible local fixture and evidence exist; isolated database is retained for audit, and the two fixture servers were stopped. | None |

## 6. Findings

### `PUBLIC_CUSTOMER_STATEMENT_RECIPIENT-G3-001` — Recipient actions hidden by permission vocabulary mismatch

- Severity: `medium`
- Classification: functional access-presentation defect, remediated and closed
- Gate/lens and status: G3 / Workflow UX, `closed`
- Expected behavior and source class: The portal must consume the authoritative lowercase permissions (`view`, `dispute`, `promise_to_pay`) returned by the access service.
- Actual evidence: Pre-fix Edge rendering showed the verified statement but no response panel; the portal typed and checked uppercase permission values while the service returned lowercase values.
- Impact and affected actors/data: A valid recipient could read the statement but could not reach authorized promise/dispute actions; no unauthorized capability was granted and accounting controls remained intact.
- Recommendation: Consume the service vocabulary exactly and pin it with focused portal tests.
- Verification method: Real-browser hot reload exposed the action form; promise and dispute then wrote production-path evidence. Focused Jest and ESLint passed.
- Suggested owner: Public statement UI owner.
- Confidence: high (`E1 + E2`).
- Dependencies: none.
- Residual risk: none in the verified permission matrix.

### `PUBLIC_CUSTOMER_STATEMENT_RECIPIENT-G7-001` — Repository-wide TypeScript gate is red outside this slice

- Severity: `low`
- Classification: dirty-worktree baseline condition
- Gate/lens and status: G7 `pass with conditions`
- Expected behavior and source class: `npm run typecheck` should exit 0.
- Actual evidence: The 240.5-second run emitted diagnostics in unrelated dashboard, assurance, inventory, notifications, settings, inventory export, and supplier E2E files; it emitted no diagnostic for the public statement portal or its fixture support.
- Impact and affected actors/data: Repository-wide static certification cannot be claimed from this worktree. The scoped browser, test, database, and lint conclusions remain directly evidenced.
- Recommendation: Owners of the listed concurrent changes should clear the baseline and rerun `npm run typecheck`.
- Verification method: exact typecheck command in section 7, followed by the focused statement gate.
- Suggested owner: affected worktree owners/release owner.
- Confidence: high (`E1`).
- Dependencies: concurrent dirty-worktree changes.
- Residual risk: unrelated type failures can mask later global diagnostics.

## 7. Verification commands

| Command | Status | Purpose | Result/evidence |
| --- | --- | --- | --- |
| `npx ts-node --transpile-only --compiler-options '{"module":"CommonJS","moduleResolution":"node","jsx":"react-jsx"}' -r tsconfig-paths/register scripts/customer-statement-browser-fixture.ts prepare` | `passed` | Create/migrate minimal isolated fixture | Fresh local database, 62 migrations, namespaced organization/customer/receivable/statement/active+revoked tokens. |
| `node scripts/customer-statement-browser-server.js` | `passed` | Run production Next route/service stack locally | Served isolated database on port 3012 with `.next-customer-statement-browser`; later stopped. |
| `curl.exe --max-time 10 --silent --show-error --include http://127.0.0.1:3012/customer-statement/customer_statement_browser_statement` | `passed with timeout after response` | Live route/SSR loading proof | `HTTP/1.1 200 OK`; SSR contained `<p role="status">Verifying your secure statement…</p>`. |
| Real-browser session against signed/revoked/invalid fixture URLs at 1440x1000 and 390x844 | `passed` | End-to-end recipient and presentation proof | Signed data/actions visible; promise/dispute success; generic revoked/invalid error; mobile `innerWidth=390`, `scrollWidth=375`. Raw tokens are intentionally omitted. |
| `npx jest --runTestsByPath "app/customer-statement/[statementId]/__tests__/CustomerStatementPortal.test.tsx" "services/accounting/__tests__/customer-statement-token.test.ts" "services/accounting/__tests__/customer-statement-access.service.test.ts" "services/accounting/__tests__/customer-statement-recipient-action.service.test.ts" "app/api/customer-statements/[statementId]/__tests__/route.test.ts" "app/api/customer-statements/[statementId]/actions/__tests__/route.test.ts" --runInBand` | `passed` | Focused access/service/API/UI gate | 6 suites, 25 tests passed in 4.912s. |
| `npx ts-node --transpile-only --compiler-options '{"module":"CommonJS","moduleResolution":"node","jsx":"react-jsx"}' -r tsconfig-paths/register scripts/customer-statement-browser-fixture.ts inspect` | `passed` | Persisted control evidence | Active access count 6; revoked count 0; 4 granted views; one granted promise and dispute; two `OPEN` v1 states and matching audits. |
| `npx eslint "app/customer-statement/[statementId]/CustomerStatementPortal.tsx" "app/customer-statement/[statementId]/__tests__/CustomerStatementPortal.test.tsx" "scripts/customer-statement-browser-fixture.ts" "scripts/customer-statement-browser-server.js"` | `passed` | Scoped static lint | Exit 0, no diagnostics (rerun after final fixture-port alignment). |
| `git diff --check -- "app/customer-statement/[statementId]/CustomerStatementPortal.tsx" "app/customer-statement/[statementId]/__tests__/CustomerStatementPortal.test.tsx" "scripts/customer-statement-browser-fixture.ts" "scripts/customer-statement-browser-server.js"` | `passed` | Patch whitespace integrity | Exit 0. |
| `npm run typecheck` | `failed outside scope` | Repository TypeScript gate | Exit 1 after 240.5s; unrelated diagnostics only; see `PUBLIC_CUSTOMER_STATEMENT_RECIPIENT-G7-001`. |
| `npx prisma migrate deploy` against the ordinary configured development database | `failed outside fixture scope` | Initial environment prerequisite attempt | Existing schema drift: migration `20260528124341_refine_item_barcode`, PostgreSQL `42710`, enum `Locale` already exists. The isolated fixture database then migrated cleanly. |
| `npx prisma db seed` during initial setup | `failed and superseded` | Evaluate existing fixture reuse | Broad seed attempted to write `public/seed-images/manifest.json` and hit `EPERM`; replaced by minimal namespaced fixture records only. |

## 8. Remediation record

| File | Change | Invariant restored | Focused verification |
| --- | --- | --- | --- |
| `app/customer-statement/[statementId]/CustomerStatementPortal.tsx` | Changed permission type/checks from uppercase UI aliases to authoritative lowercase service values. | Authorized actions render without weakening token, tenant, content-hash, or accounting checks. | Real browser; 25 tests; scoped ESLint. |
| `app/customer-statement/[statementId]/__tests__/CustomerStatementPortal.test.tsx` | Aligned permission fixture and added loading/generic-error assertions. | Regression suite matches production response vocabulary and state semantics. | Focused Jest passed. |
| `scripts/customer-statement-browser-fixture.ts` | Added local-host-only, isolated, namespaced minimal statement fixture and inspection mode. | Browser certification exercises production services without touching normal tenant fixtures. | Migrations, browser paths, and persisted evidence passed. |
| `scripts/customer-statement-browser-server.js` | Added local-host-only server wrapper with isolated database, signing secret, port, and build directory. | Runtime uses the same API/service path while avoiding the dirty default Next build directory. | Real browser and live SSR passed; server stopped. |

No accounting service, API route, token codec, tenant boundary, entitlement, migration, or posting code was changed.

## 9. Residual risk and blockers

- Residual risk: low; no in-scope defect remains, but the dirty repository-wide typecheck is not green.
- Evidence gaps: no production deployment, formal accessibility audit, recipient-action resolution, localization, statement delivery, payment, or accounting posting was exercised.
- Skipped checks and reason: in-app browser initially failed to attach; a connected real Edge session and then the in-app browser were used to finish equivalent DOM/visual evidence. No standalone/headless browser substituted for the user-visible runtime.
- External/qualified review required: formal accounting, privacy, security, accessibility, and release certification remain specialist responsibilities.
- Rollback or recovery concern: product change is three permission literals plus tests; fixture database `stoquify_statement_browser_e2e` is isolated and intentionally retained for audit. Fixture server/build cache were stopped/removed.

## 10. Prioritized next actions

| Priority | Finding/action | Owner | Effort | Closure evidence |
| --- | --- | --- | --- | --- |
| P1 | Clear the unrelated TypeScript baseline and rerun `npm run typecheck`. | Affected module owners/release owner | Medium | Repository typecheck exits 0. |
| P2 | Add the isolated browser fixture/flow to a serial release-evidence job if this public route becomes release-critical. | QA/release owner | Medium | Repeatable signed/action/revoked/invalid desktop+mobile evidence bundle. |

## 11. Evidence index

- `app/customer-statement/[statementId]/CustomerStatementPortal.tsx:55,171-172,239-240,262,275,293-294,392-393` — permission remediation and user-visible states.
- `app/customer-statement/[statementId]/__tests__/CustomerStatementPortal.test.tsx:22,92-122` — vocabulary, loading, and generic-error regression.
- `services/accounting/customer-statement-access.service.ts:325-376,395-410` — signed/stored token, tenant/content/permission checks and hashed access evidence.
- `services/accounting/customer-statement-recipient-action.service.ts:155-461` — validation, idempotency/correlation, event/action/state/audit, serializable transaction.
- `app/api/customer-statements/[statementId]/route.ts:18-32` and `actions/route.ts:38-73` — not-found behavior and no-store/no-referrer/nosniff response headers.
- `prisma/migrations/20260809113000_customer_statement_snapshot_foundation/migration.sql:140-151` — immutable snapshot trigger.
- `prisma/migrations/20260809130000_customer_statement_external_access/migration.sql:366-389` — append-only access/action/state triggers.
- `scripts/customer-statement-browser-fixture.ts`, `scripts/customer-statement-browser-server.js` — minimal local certification support.
- `C:/Users/J COMPUTER/.codex/visualizations/2026/08/13/019ffbd6-9c60-79d1-b77e-cfad5bfa942d/customer-statement/01-desktop-signed-actions.png` — signed desktop action presentation.
- `.../02-dispute-recorded.png` — browser dispute confirmation.
- `.../03-revoked-token.png` and `.../04-invalid-token.png` — identical generic failure presentation (both SHA-256 `3d433b53e8f38983ea77cfb3a325ae7d19d17a70311bba4b214ae6e43bad4fb2`).
- `.../05-mobile-signed-actions.png` — 390x844 presentation; DOM metrics proved no document-level horizontal overflow.
- `graphify-out/` and `app/graphify-out/graph.json` — architecture discovery aids only; direct source/runtime evidence governs the decision.
