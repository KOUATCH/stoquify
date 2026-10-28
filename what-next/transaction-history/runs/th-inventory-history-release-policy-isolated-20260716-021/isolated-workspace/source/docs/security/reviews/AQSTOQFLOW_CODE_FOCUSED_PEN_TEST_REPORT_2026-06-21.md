# AqStoqFlow Code-Focused Penetration Test Report

Date: 2026-06-21
Scope: Local repository only. No live systems were scanned, fuzzed, exploited, brute-forced, or accessed.
Mode: Safe, non-destructive static review of code, configuration, tests, scripts, generated graph report, and local security patterns.

## Executive Summary

This audit found several high-risk authorization and tenant-boundary weaknesses in legacy server actions and selected public/API routes. The strongest issue is a customer action helper that accepts a caller-supplied organization ID before authenticating, then performs direct Prisma reads and writes without service-owned RBAC controls. POS cart/session actions and tax/location/unit management actions are also authenticated but not permission-gated, which is insufficient for a financial OHADA/SYSCOHADA SaaS.

The repo has stronger modern controls in places: `services/_shared/protect.ts`, `lib/security/rbac.ts`, guarded payment reconciliation actions, and the purchase-order receive action now using the canonical `purchases.orders.receive` permission. The main security problem is inconsistent adoption of those controls across older actions and public endpoints.

Priority remediation should start with customer actions, POS session/cart controls, master-data fiscal configuration actions, module entitlement enforcement, public receipt access hardening, and permission gates for item API reads.

## Attack-Surface Map

Reviewed surfaces:

| Surface | Evidence | Notes |
| --- | --- | --- |
| Middleware and routing | `middleware.ts:12`, `middleware.ts:103`, `middleware.ts:121`, `middleware.ts:200` | Security headers exist, but dashboard gating checks only session-cookie presence. |
| App Router API routes | `app/api/v1/organisations/[id]/items/route.ts:6`, `app/api/v1/organisations/[id]/briefItems/route.ts:6`, `app/api/receipts/[receiptId]/route.ts:7`, `app/api/uploadthing/route.ts:6`, `app/api/uploads/[...path]/route.ts:15` | API inventory reads, public receipts, uploads, authenticated file reads. |
| Server actions | `actions/customers/customerAction2.ts:83`, `actions/pos/session.actions.ts:20`, `actions/pos/cart.actions.ts:20`, `actions/taxRate/tax-rate-management-actions.ts:188`, `actions/purchaseOrderWorkflow/purchaseOrderSystemAction.ts:229` | Mixed maturity: some actions use modern RBAC; several legacy paths do not. |
| Services and Prisma access | `services/purchase-order/purchase-order.service.ts:457`, `services/pos/receipt.service.ts:322`, `actions/customers/customerAction2.ts:86` | Services own many workflows, but some action files still query Prisma directly. |
| RBAC/auth controls | `services/_shared/protect.ts:49`, `lib/security/rbac.ts:250`, `lib/security/server-authz.ts:39` | Strong primitives exist; not consistently applied. |
| Module entitlements | `services/modules/module-control-contracts.ts:1`, `services/modules/module-entitlement.service.ts:86` | Entitlement decisions are observe-only. |
| Uploads/downloads | `app/api/uploadthing/core.ts:44`, `app/api/uploadthing/core.ts:70`, `app/api/uploads/[...path]/route.ts:15` | Authenticated upload and org-scoped download paths exist. |
| Graph/architecture evidence | `graphify-out/GRAPH_REPORT.md:176`, `graphify-out/GRAPH_REPORT.md:182`, `graphify-out/GRAPH_REPORT.md:183`, `graphify-out/GRAPH_REPORT.md:188` | Existing graph clusters identify tenant defense, server action security stack, and RBAC control plane as architectural hubs. |

## Findings

| ID | Severity | Area | Finding |
| --- | --- | --- | --- |
| PT-001 | Critical | Customers / tenant isolation / RBAC | Customer actions accept caller-supplied organization scope and perform direct Prisma access without permission gates. |
| PT-002 | High | POS / cash controls | POS session and cart actions require only authentication and organization context, not POS permissions. |
| PT-003 | High | Fiscal master data | Tax rate, location, and unit management actions are tenant-gated but not permission-gated. |
| PT-004 | High | SaaS module entitlement | Module access is observe-only and not enforced by the main RBAC/protect path. |
| PT-005 | High | Public POS receipts | Public receipt lookup uses internal sale ID without auth, signed token, expiry, or organization scope. |
| PT-006 | High | Inventory API reads | Item and brief-item API routes require organization membership but no inventory/item read permission. |
| PT-007 | Medium | Uploads | Broad document/archive upload endpoints require auth but no domain permission, malware scanning, or durable evidence workflow. |
| PT-008 | Medium | Middleware / CSP | Production CSP allows inline scripts; dashboard middleware treats cookie presence as authenticated. |
| PT-009 | Low | Configuration hygiene | `.env` exists locally and is ignored, but tracked-secret status could not be verified because git metadata commands failed in the sandbox. |

### PT-001 - Critical - Customer Actions Allow Tenant-Scope Override And Bypass RBAC

Evidence:

- `actions/customers/customerAction2.ts:64` defines `getUserOrganizationId(organizationId?: string)`.
- `actions/customers/customerAction2.ts:65` returns caller-supplied `organizationId` before authenticating.
- `actions/customers/customerAction2.ts:86`, `actions/customers/customerAction2.ts:130`, `actions/customers/customerAction2.ts:149`, `actions/customers/customerAction2.ts:181`, `actions/customers/customerAction2.ts:228`, and `actions/customers/customerAction2.ts:286` perform direct Prisma customer/order reads and writes.
- `actions/customers/customerActions.ts:40`, `actions/customers/customerActions.ts:48`, `actions/customers/customerActions.ts:60`, `actions/customers/customerActions.ts:74`, `actions/customers/customerActions.ts:88`, and `actions/customers/customerActions.ts:107` wrap these helpers without adding `requirePermission` or `protect`.

Attack path:

An authenticated user can reach customer server actions and trigger customer reads, updates, deletes, or order-history reads without a customer permission check. Any exported or internally reachable helper path that passes `organizationId` into `getCustomer(id, organizationId?)` can scope the query to a caller-selected tenant.

Why current control is insufficient:

Authentication is not authorization. The critical flaw is that tenant scope can be accepted from the caller before the user identity is established. The direct Prisma access also bypasses service-owned DTO and audit patterns.

Recommended fix:

Move customer reads/writes behind a service-owned customer service. Wrap actions with `protect` or `requirePermission` using separate permissions such as `customers.read`, `customers.create`, `customers.update`, `customers.delete`, and `customers.orders.read`. Derive organization ID exclusively from RBAC context, remove optional caller-supplied organization scope, and add audit events for create/update/archive/order-history access.

Suggested regression test:

Add tests proving:

- A user without `customers.read` cannot list or read customers.
- A user without `customers.update` cannot update customers.
- Passing another organization ID never changes scope.
- Customer order history requires `customers.orders.read`.

Verification command:

`npx jest actions/customers --runInBand`

### PT-002 - High - POS Session And Cart Actions Are Authenticated But Not Permission-Gated

Evidence:

- `actions/pos/session.actions.ts:20` exports `openPOSShiftAction`; `actions/pos/session.actions.ts:22` only calls `requireOrg()`.
- `actions/pos/session.actions.ts:35` exports `closePOSShiftAction`; `actions/pos/session.actions.ts:37` only calls `requireOrg()`.
- `actions/pos/cart.actions.ts:20`, `actions/pos/cart.actions.ts:35`, and `actions/pos/cart.actions.ts:49` expose cart mutations that only call `requireOrg()` at `actions/pos/cart.actions.ts:22`, `actions/pos/cart.actions.ts:37`, and `actions/pos/cart.actions.ts:51`.
- `services/_shared/require-org.ts:18` only derives an authenticated user/org context from `getAuthenticatedUser()`.
- By contrast, tender actions use explicit permissions: `actions/pos/tender.actions.ts:18`, `actions/pos/tender.actions.ts:30`, and `actions/pos/tender.actions.ts:45`.

Attack path:

Any authenticated organization user can attempt to open or close POS shifts and mutate POS carts/session state if they can call the server action and provide valid terminal/session/cart identifiers.

Why current control is insufficient:

POS session state and cart contents are cash-control surfaces. Tenant membership alone does not prove cashier, supervisor, or manager authority. UI-only hiding is not sufficient because server actions must enforce RBAC.

Recommended fix:

Wrap these actions with `protect`. Require `pos.use` for cart reads/mutations and shift opening. Require a stronger permission such as `pos.cashDrawer.close` or `pos.sessions.close` for close actions, with fresh auth and audit evidence for variance-bearing closes.

Suggested regression test:

Add action tests proving users without POS permissions cannot open/close shifts or mutate carts, and that refund/void/close paths require fresh auth where configured.

Verification command:

`npx jest actions/pos services/pos --runInBand`

### PT-003 - High - Tax, Location, And Unit Management Actions Lack Same-Tenant Permission Checks

Evidence:

- `actions/taxRate/tax-rate-management-actions.ts:99` defines `assertOrganizationAccess`; `actions/taxRate/tax-rate-management-actions.ts:131` builds permissions but `actions/taxRate/tax-rate-management-actions.ts:136` uses them only for cross-organization wildcard access.
- Tax writes are exposed at `actions/taxRate/tax-rate-management-actions.ts:188`, `actions/taxRate/tax-rate-management-actions.ts:217`, and `actions/taxRate/tax-rate-management-actions.ts:253`.
- Location writes are exposed at `actions/locations/location-management-actions.ts:174`, `actions/locations/location-management-actions.ts:203`, and `actions/locations/location-management-actions.ts:239`.
- Unit writes are exposed at `actions/units/unit-management-actions.ts:191`, `actions/units/unit-management-actions.ts:220`, and `actions/units/unit-management-actions.ts:256`.

Attack path:

Any authenticated same-tenant user can attempt to create, update, or archive tax rates, locations, or units through the actions, even if they do not hold master-data or fiscal configuration permissions.

Why current control is insufficient:

Same-tenant access is not enough for OHADA/SYSCOHADA fiscal configuration. Tax rates can alter VAT/tax calculations; locations and units affect inventory valuation, purchasing, POS stock movement, and reporting.

Recommended fix:

Replace `assertOrganizationAccess` with `protect` or a shared service-owned authorization wrapper. Require `taxes.read/create/update/delete`, `locations.read/create/update/archive`, and `units.read/create/update/delete` permissions. Emit audit events for all fiscal/master-data mutations.

Suggested regression test:

Add action tests for non-admin same-tenant users being denied each write path, and for authorized users receiving scoped results only for their organization.

Verification command:

`npx jest actions/taxRate actions/locations actions/units --runInBand`

### PT-004 - High - Module Entitlement Is Observe-Only And Not A Hard Authorization Gate

Evidence:

- `services/modules/module-control-contracts.ts:1` sets `MODULE_CONTROL_MODE = "observe"`.
- `services/modules/module-entitlement.service.ts:86` sets `allowed = mode === "observe" ? true : !wouldBlock`.
- `services/modules/module-entitlement.service.ts:87` reports `would_block` while still allowing access in observe mode.
- `services/modules/module-entitlement.service.ts:111` and `services/modules/module-entitlement.service.ts:175` set `hardEnforcementEnabled: false`.
- The central wrappers observed at `services/_shared/protect.ts:49` and `lib/security/rbac.ts:250` call permission checks, but the evidence reviewed did not show module entitlement enforced inside the main authorization path.

Attack path:

A tenant whose module is suspended, unlicensed, out of plan, or dependency-blocked can still exercise server actions if the user has the relevant RBAC permission.

Why current control is insufficient:

RBAC answers "can this actor do this?" Module entitlement answers "is this tenant allowed to use this module now?" Both are required. Observe-only decisions are useful for rollout, but they are not a release-grade SaaS control.

Recommended fix:

Add a permission-to-module map and enforce module entitlement inside `protect` or immediately before `requirePermission` returns success. Preserve observe mode for dry runs only, and add a hard-gate mode for release. Ensure wildcard permissions cannot bypass suspended modules.

Suggested regression test:

Add tests proving module-disabled tenants receive denial for POS, inventory, purchasing, payroll, payments, reports, and compliance actions even when the user has wildcard or domain permissions.

Verification command:

`npx jest services/modules lib/security services/_shared --runInBand`

### PT-005 - High - Public Receipt Route Uses Internal Sale ID As Public Lookup Key

Evidence:

- `app/api/receipts/[receiptId]/route.ts:7` exposes an unauthenticated GET route.
- `app/api/receipts/[receiptId]/route.ts:13` calls `getPublicSalesReceipt({ salesOrderId: receiptId })`.
- `services/pos/receipt.service.ts:322` defines `findSalesReceipt(salesOrderId, organizationId?)`.
- `services/pos/receipt.service.ts:325` queries by `id: salesOrderId`; `services/pos/receipt.service.ts:327` only adds `organizationId` when it is provided.
- `services/pos/receipt.service.ts:522` defines `getPublicSalesReceipt`; `services/pos/receipt.service.ts:524` calls `findSalesReceipt(input.salesOrderId)` without organization scope.
- `services/pos/receipt.service.ts:530` and `services/pos/receipt.service.ts:531` redact customer email/phone, but the payload still includes order totals, item lines, payment method/status, cashier, terminal, business, and certification details.

Attack path:

Anyone with a leaked, logged, shared, or guessable internal sale/order ID can request the public receipt endpoint and retrieve operational receipt data without tenant authorization.

Why current control is insufficient:

Redacting phone/email helps privacy, but it does not turn an internal database ID into a safe public bearer token. Public receipt access should be intentionally tokenized, rate-limited, and scoped.

Recommended fix:

Create a distinct `publicReceiptToken` or `publicReceiptId` generated with high entropy and stored separately from internal sales IDs. Sign receipt URLs, consider expiry or revocation, rate-limit the route, and audit public receipt access. Never use internal order IDs as public lookup keys.

Suggested regression test:

Add tests proving internal sale IDs are rejected by the public endpoint, signed/valid public tokens work, expired/revoked tokens fail, and public payloads remain redacted.

Verification command:

`npx jest services/pos/__tests__/receipt-public.test.ts --runInBand`

### PT-006 - High - Inventory Item APIs Are Tenant-Gated But Not Permission-Gated

Evidence:

- `app/api/v1/organisations/[id]/items/route.ts:12` calls `requireApiSessionForOrg(orgId)`.
- `app/api/v1/organisations/[id]/items/route.ts:20` returns `listItemApiDTOs(orgId, { page, limit })`.
- `app/api/v1/organisations/[id]/briefItems/route.ts:12` calls the same helper.
- `app/api/v1/organisations/[id]/briefItems/route.ts:20` returns `listBriefItemApiDTOs(orgId, { page, limit })`.
- `lib/security/server-authz.ts:39` defines `requireApiSessionForOrg`; `lib/security/server-authz.ts:47` only asserts organization access.

Attack path:

Any authenticated member of an organization can enumerate item DTOs through these APIs, even without inventory or item read permissions.

Why current control is insufficient:

Inventory item data can expose pricing, SKUs, supply-chain details, margin-sensitive data, and stock movement context. Organization membership does not equal inventory read authority.

Recommended fix:

Extend API auth helpers to accept a required permission, or wrap each API route with a permission-specific check such as `inventory.items.read`. Keep the existing tenant check, but add route-specific authorization.

Suggested regression test:

Add route-level tests proving an authenticated same-tenant user without `inventory.items.read` gets 403 and an authorized user receives only scoped DTOs.

Verification command:

`npx jest app/api/v1/organisations --runInBand`

### PT-007 - Medium - UploadThing Endpoints Lack Domain Permissions And Evidence Workflow

Evidence:

- `app/api/uploadthing/core.ts:9` reads organization ID from session.
- `app/api/uploadthing/core.ts:24`, `app/api/uploadthing/core.ts:31`, `app/api/uploadthing/core.ts:38`, `app/api/uploadthing/core.ts:66`, and `app/api/uploadthing/core.ts:92` use the same auth-only middleware.
- `app/api/uploadthing/core.ts:44` and `app/api/uploadthing/core.ts:70` expose generic file upload and mail attachment endpoints.
- `app/api/uploadthing/core.ts:46` through `app/api/uploadthing/core.ts:64` and `app/api/uploadthing/core.ts:72` through `app/api/uploadthing/core.ts:90` allow PDFs, Office documents, text, gzip, and zip files.

Attack path:

Any authenticated organization user can upload broad document/archive content if they can reach the endpoint. The reviewed code did not show domain permissions, malware scanning hooks, retention policy, or immutable upload evidence.

Why current control is insufficient:

File upload is a common abuse surface for malware, phishing attachments, compliance leaks, and storage misuse. Auth-only upload is too broad for financial/compliance workflows.

Recommended fix:

Add endpoint-specific permissions, content scanning or quarantine integration, durable upload evidence, retention classification, and attachment ownership links to the business object that requested the upload.

Suggested regression test:

Add tests proving unauthorized users cannot upload mail attachments or business files, disallowed MIME types are rejected, and upload completion records an audit/evidence object.

Verification command:

`npx jest app/api/uploadthing services --runInBand`

### PT-008 - Medium - Middleware CSP Allows Inline Scripts And Cookie-Presence Dashboard Gate

Evidence:

- `middleware.ts:12` sets production `script-src 'self' 'unsafe-inline'`.
- `middleware.ts:13` also allows `'unsafe-eval'` outside production.
- `middleware.ts:103` defines `isAuthenticated`.
- `middleware.ts:104` treats the presence of `better-auth.session_token` as authenticated.
- `middleware.ts:121` uses this to gate dashboard routes.

Attack path:

If an XSS injection lands elsewhere, `unsafe-inline` weakens browser-level mitigation. Cookie-presence gating can also produce misleading access decisions if a stale, malformed, or revoked cookie exists, although server actions and APIs must still do real auth.

Why current control is insufficient:

CSP should reduce the impact of injection. Middleware should be viewed only as UX routing, not an authorization boundary. The code should make that distinction explicit.

Recommended fix:

Move production CSP toward nonces/hashes and remove inline script allowances where feasible. Keep all sensitive route/API/action authorization in server-side RBAC. Consider renaming or commenting the middleware check as "has session cookie" rather than "authenticated" to prevent future misuse.

Suggested regression test:

Add middleware tests for stale cookie behavior and a security-header snapshot asserting production CSP does not include avoidable inline/eval allowances once migration is complete.

Verification command:

`npx jest middleware --runInBand`

### PT-009 - Low - Local Env File Exists; Tracked Secret Status Not Verified

Evidence:

- `rg --files -g ".env*"` found `.env` and `.env.example`.
- `.gitignore:38` ignores `.env*`; `.gitignore:46` ignores `.env`.
- Git metadata commands for tracked status failed in the sandbox, so whether `.env` was ever tracked was not verified.
- `lib/auth.ts:6`, `services/users/user-identity.service.ts:685`, and `services/users/user-identity.service.ts:966` fall back to `http://localhost:3000` for base URLs.

Attack path:

If real env files are accidentally tracked or copied into artifacts, secrets may leak. Incorrect production base URL fallbacks can also produce broken or unsafe links in auth and invitation workflows.

Why current control is insufficient:

Ignore rules are necessary but do not prove secrets were never committed. Production deployments should fail closed when required public/auth URLs or secrets are missing.

Recommended fix:

Verify with git history tooling outside this sandbox. Add a startup/deploy validation that requires production `AUTH_SECRET`, app URL, auth URL, email provider credentials, and upload credentials where used.

Suggested regression test:

Add config validation tests for production mode requiring all critical env variables and refusing localhost fallbacks.

Verification command:

`npm run typecheck && npm run lint`

## Quick Wins

1. Replace `actions/customers/customerAction2.ts` with a service-backed, permission-protected customer action layer.
2. Wrap POS cart/session actions with `protect` and add focused RBAC tests.
3. Replace tenant-only `assertOrganizationAccess` in tax, location, and unit actions with permission-aware guards.
4. Add permission checks to item API routes by extending `requireApiSessionForOrg` or replacing it with a permission-aware helper.
5. Change public receipts to high-entropy public receipt tokens instead of internal sales order IDs.
6. Add upload permissions and audit evidence before broad file upload endpoints are production trusted.

## Structural Remediation Plan

### Slice 1 - Customer Boundary Fix

Goal: remove the critical tenant/RBAC bypass.

Acceptance criteria:

- No caller-supplied organization ID is trusted in customer actions.
- All customer reads/writes use service-owned DTO/read/write methods.
- RBAC permissions are enforced server-side.
- Direct Prisma usage is removed from customer actions.
- Tests prove cross-tenant attempts and missing permissions are denied.

### Slice 2 - POS Control Hardening

Goal: make POS session/cart/cash drawer actions match tender/refund/void authorization quality.

Acceptance criteria:

- `openPOSShiftAction`, `closePOSShiftAction`, and cart mutation actions use `protect`.
- Close/variance paths require high-risk permission and fresh auth.
- Audit evidence records actor, terminal, session, organization, and outcome.

### Slice 3 - Fiscal Master Data Hardening

Goal: prevent unauthorized manipulation of tax, unit, and location settings.

Acceptance criteria:

- Tax/location/unit actions require domain permissions.
- Mutations emit immutable audit evidence.
- Tests cover same-tenant unauthorized users, cross-tenant denial, and authorized success.

### Slice 4 - Entitlement Enforcement

Goal: make module subscription/control decisions enforceable.

Acceptance criteria:

- Main authorization path checks module entitlement before action success.
- Observe mode remains available for dry-run reports.
- Enforcement mode denies disabled/suspended modules even with wildcard permissions.

### Slice 5 - Public And File Surface Hardening

Goal: reduce unauthenticated and content-upload risk.

Acceptance criteria:

- Public receipts use signed/high-entropy tokens.
- Item APIs require inventory read permissions.
- Upload endpoints require domain permissions and durable evidence records.
- Production CSP migration plan removes avoidable inline script allowance.

## Commands And Evidence Collection Run

Commands run were static, local-only, and non-destructive:

- `rg --files` for API routes, actions, services, tests, Prisma, and scripts.
- `rg -n` targeted searches for auth/RBAC, Prisma access, tenant scope, POS, purchasing, inventory APIs, public receipts, uploads, middleware, env usage, and graph report evidence.
- Skill/reference reads for repo review, RBAC, and OHADA compliance audit methodology.
- No live external target was scanned, fuzzed, exploited, brute-forced, or accessed.
- No application code was modified by this audit. This report file is the only artifact added.

Commands not run:

- Full `npm run verify:repo`, `npm run service:boundary:ratchet`, `npm run lint`, and focused Jest suites were not run during this audit turn. The recommended remediation slices above include verification commands for each finding.

## Residual Risk

This was a static code-focused penetration test, not a dynamic exploit exercise. Runtime behavior, database contents, deployed middleware, Better Auth session revocation behavior, UploadThing provider-side controls, and production environment settings were not exercised. Git secret history was not verified because git metadata commands failed in the sandbox.

Residual high-risk areas worth auditing next:

- Remaining direct Prisma actions identified by service-boundary tooling.
- Payroll salary workflows and payrun authorization.
- Accounting exports, close certification invalidation, and immutable audit event coverage.
- Offline POS replay/idempotency and fiscal-document eligibility checks.
- API/webhook endpoints once external provider adapters are added.

## Next Recommended Slice

Start with PT-001. It combines direct Prisma access, missing RBAC, and a tenant-scope override pattern in a customer/order data surface. Fixing it will also provide the template for the POS and master-data migrations: service-owned DTOs, `protect`/`requirePermission`, tenant scope from RBAC context, durable audit evidence, and regression tests that prove bypasses are blocked.
