# AqStoqFlow Module Access Guard Contract

Date: 2026-07-12
Lane: Centralized module access guard contract
Mode: observe/report only; no hard enforcement enabled
Skill: `aqstoqflow-module-access-guard-contract`

## Executive Verdict

AqStoqFlow needs one canonical server-side module access contract before module enforcement can become safe. The current system has useful guard seams, but they are still scattered: pages use `checkPermission()`, `requirePermission()`, `requireAnyPermission()`, `FinanceRouteAccess`, or manual checks; actions use `protect()` or direct RBAC helpers; APIs use `requireApiModuleAccess()` where present; reports, exports, jobs, webhooks, proof surfaces, and BI surfaces are not yet uniformly wrapped.

This document defines the target `requireModuleAccess()` contract and wrappers. It does not change runtime behavior, turn on hard enforcement, edit guard code, or treat sidebar hiding as security.

## Source Evidence

- `MODULE_CONTROL_MODE` is `observe`.
- `ModuleSurfaceType` currently supports `navigation`, `page`, `action`, `api`, `report`, `export`, and `job`.
- `ModuleAccessIntent` currently supports `read`, `write`, `export`, and `job`.
- `evaluateModuleEntitlement()` accepts `explicitEntitlements`, but live `observeModuleAccess()` still loads `Organization.requestedModules`.
- `evaluateModuleEntitlement()` returns `allow`, `would_block`, or `deny`, with observe mode allowing traffic while recording would-block evidence.
- `recordModuleEntitlementDecision()` writes would-block observations to `AuditLog` as `MODULE_ENTITLEMENT_OBSERVED`.
- `protect()` currently runs fresh auth, then RBAC `requirePermission()`, then module observation, then tenant input validation.
- `requireApiModuleAccess()` exists for API routes and calls `observeModuleAccess()` with `mode: "enforce"`, while global observe behavior still prevents broad denials.
- `lib/security/auth-session.ts` still hard-codes `modulesEnabled`, so session module claims are not authoritative.
- Current module surface inventory baseline before this lane: generated `2026-07-12T05:35:22.490Z`, 306 records, 266 mapped, 34 unmapped, 16 missing permission, 26 `guard: none`, and 300 enforcement candidates.
- Current guard distribution: `sidebar-permission-filter` 72, `requirePermission` 76, `checkPermission` 59, `protect` 34, `requireAnyPermission` 22, `FinanceRouteAccess` 13, `requireRbacContext` 2, `module-observe` 1, `delegated-re-export` 1, `none` 26.
- API route guard inventory is separately in fail mode with 10 API routes, 0 issues, and 5 required module-applicability route/evidence records.
- Existing tests cover legacy observe entitlements, wildcard RBAC not bypassing module entitlement, required dependency gaps, read-only behavior in enforce mode, and observe-mode audit logging.

## Target Guard Order

The enterprise guard order is:

1. Authenticated session.
2. Tenant scope and organization membership.
3. Tenant module entitlement.
4. Module dependency state.
5. RBAC permission.
6. Fresh auth for sensitive actions.
7. Maker-checker or separation-of-duties rules where required.
8. Consent where partner, export, or external sharing data is involved.
9. Redaction policy before response.
10. Audit of allow, deny, observe, export, consent, and redaction decisions.

RBAC wildcard can satisfy RBAC permission checks only. It must not bypass tenant module entitlement, dependency state, consent, fresh auth, maker-checker, certification, evidence, redaction, or audit rules.

## Why Current Behavior Must Not Be Hardened Yet

Hard enforcement is not ready because:

- durable tenant entitlements are not implemented;
- current runtime still falls back to `Organization.requestedModules`;
- surface registry is not complete;
- 34 surfaces remain unmapped;
- 16 surfaces still lack permission evidence;
- 26 records still show `guard: none`;
- reports, exports, jobs, webhooks, proof surfaces, BI surfaces, and public token flows are not fully registered;
- Module Workbench unavailable/read-only/suspended states are not implemented;
- rollback evidence and pilot scope are not approved.

Therefore this lane defines the contract and implementation sequence only.

## Canonical Contract

Target service:

```ts
type RequireModuleAccessInput = {
  organizationId: string
  userId: string
  actorPermissions: readonly string[]
  moduleSlug: CommercialModuleSlug
  surfaceType: ModuleSurfaceType
  surface: string
  accessIntent: ModuleAccessIntent
  sourceModules?: readonly CommercialModuleSlug[]
  requiredPermission?: string | readonly string[]
  tenantScope?: {
    source: "rbac_context" | "session" | "route_param" | "handler_derived"
    assertedOrganizationId?: string | null
  }
  dependencyPolicy?: "required_only" | "include_recommended" | "source_modules"
  mode?: "observe" | "enforce"
  audit?: boolean | "always" | "would_block_only"
  freshAuth?: boolean | { maxAgeSeconds?: number }
  redactionPolicy?: string
  consentPolicy?: string
  makerCheckerPolicy?: string
  unavailableBehavior?: "throw" | "return_decision" | "not_found" | "redirect" | "redact"
}

type RequireModuleAccessResult = {
  allowed: boolean
  decision: ModuleEntitlementDecision
  safeError?: {
    status: 403 | 404 | 423
    code:
      | "MODULE_UNAVAILABLE"
      | "MODULE_SUSPENDED"
      | "MODULE_EXPIRED"
      | "MODULE_READ_ONLY"
      | "MODULE_DEPENDENCY_MISSING"
      | "MODULE_RBAC_DENIED"
    message: string
    correlationId: string
  }
}
```

Target function:

```ts
async function requireModuleAccess(
  input: RequireModuleAccessInput,
): Promise<RequireModuleAccessResult>
```

Design requirements:

- Default `mode` must be global observe mode until an explicit bounded pilot changes it.
- The function must load explicit effective entitlements when the tenant entitlement read model exists.
- Until then, it may delegate to `observeModuleAccess()` but must make the legacy fallback visible in decision metadata.
- It must evaluate module entitlement before returning any protected business data.
- It must record would-block/deny decisions through one audit path.
- It must return safe errors without leaking billing/provider internals.
- It must expose the decision to callers for unavailable/read-only UI states.

## Wrapper Contract

| Wrapper | Surface types | Purpose |
|---|---|---|
| `requirePageModuleAccess()` | `page`, `layout` | Server component/page guard before data fetch |
| `protect(..., module)` or `protectModuleAction()` | `action` | Server action guard before handler work |
| `requireApiModuleAccess()` | `api` | API route guard before database/service access |
| `requireReportModuleAccess()` | `report` | Report read guard with source-module filtering |
| `requireExportModuleAccess()` | `export` | Export guard with export intent, fresh auth, redaction, and audit |
| `requireJobModuleAccess()` | `job` | Scheduled/background processor guard |
| `requireWebhookModuleAccess()` | `webhook` | Provider/input handling ownership and tenant scope guard |
| `requireProofModuleAccess()` | `proof_surface` | Evidence/proof pack guard with stale/certification state |
| `requireBiModuleAccess()` | `bi_card` | Analytics/card guard with source-module redaction |
| `requirePublicTokenModuleAccess()` | `public_token_flow` | Signed external access guard with token scope and redaction |

Wrappers may return typed decisions in observe mode. They should not throw broad denials until an approved pilot sets the relevant surface to enforce mode.

## Surface-Specific Rules

Pages:

- Run module access before data fetch.
- Return typed unavailable/read-only/suspended state to the page.
- Never rely on sidebar visibility.

Actions:

- Move toward tenant scope, module access, RBAC, fresh auth, handler.
- Keep safe action errors.
- Preserve `protect()` compatibility while migrating options.

APIs:

- Continue using `requireApiModuleAccess()` as the seam.
- Add source-module and access-intent support.
- Do not return data when module decision would deny in enforce mode.

Reports:

- Require primary module and source modules.
- Missing source access should produce deny, partial report, or redacted report according to registry policy.

Exports:

- Use `export` access intent.
- Require fresh auth for sensitive financial, payroll, compliance, and proof exports.
- Always audit actor, source modules, redaction, generated file id, and retention behavior.

Jobs:

- Use `job` access intent.
- Suspended/expired module jobs must stop, quarantine, or run retention-only tasks explicitly.

Webhooks:

- Treat provider payloads as inputs.
- Require idempotency and signature policy before processing.
- Do not let provider state directly control module entitlement.

Proof surfaces:

- Declare source modules, proof type, certification state, stale policy, retention policy, and redaction.

BI/analytics:

- Use source-module filtering.
- Fall back to aggregate-only or redacted state when source-module access is absent.

Public token flows:

- Require signed, expiring, scoped tokens.
- Redact public payloads by default.
- Classify public/token-bound not-applicable decisions explicitly.

## Safe Error Contract

Safe user-facing messages:

| Reason | Normal user message | Owner/admin message |
|---|---|---|
| Unavailable | This module is not available in this workspace. | This module is not active for the tenant package. |
| Suspended | This module is temporarily unavailable. | This module is suspended. Review billing/support or manual override status. |
| Expired | This module is no longer active. | Trial or subscription has expired. Renewal or read-only retention may be available. |
| Read-only | This module is read-only for this action. | Package state allows historical reads but blocks writes/exports/jobs. |
| Dependency missing | A required module dependency is unavailable. | Activate or resolve the missing dependency before using this workflow. |
| RBAC denied | You do not have permission for this action. | User lacks the required RBAC permission even though tenant module access may exist. |

Never expose provider webhook payloads, billing internals, raw entitlement metadata, or sensitive employee/payment/customer data in module-denial messages.

## Audit Contract

Every module access decision should eventually produce structured evidence when required:

- organization id;
- user id;
- module slug;
- source modules;
- surface type;
- surface id/path;
- access intent;
- mode;
- result;
- reason;
- entitlement status and source;
- dependency gaps;
- RBAC permission result;
- wildcard RBAC present;
- fresh-auth result where applicable;
- redaction policy;
- correlation id;
- evaluated timestamp.

Observe mode can audit would-block decisions. Enforce mode must audit denials and high-risk allows.

## Before-Data-Access Tests

Implementation must add tests proving:

- page guard runs before service/data calls;
- action guard runs before handler mutation/data calls;
- API guard runs before database/service calls;
- report/export guard runs before report generation/export file creation;
- job guard runs before processor work;
- webhook guard validates ownership/idempotency before business effects;
- wildcard RBAC does not bypass tenant module entitlement;
- RBAC denial still denies even when module entitlement is active;
- read-only blocks write/export/job intent;
- suspended/expired/unavailable statuses block in enforce mode;
- observe mode records would-block evidence without denying;
- safe errors do not leak provider, billing, or sensitive tenant data.

## Migration Sequence

1. Keep existing behavior in observe/report mode.
2. Add the contract as docs and tests first.
3. Implement `requireModuleAccess()` as a wrapper over `observeModuleAccess()` without changing outcomes.
4. Add source-module and access-intent fields to registry/scanner output.
5. Convert one low-risk page/report surface to call the new wrapper in observe mode.
6. Convert `protect()` to delegate module decisions through `requireModuleAccess()`.
7. Convert `requireApiModuleAccess()` to delegate through `requireModuleAccess()`.
8. Add report/export/job/webhook/proof/BI wrappers.
9. Feed explicit tenant entitlements from the future read model.
10. Remove or derive hard-coded `modulesEnabled` session claims.
11. Run no-new-gap registry ratchet.
12. Only then propose a bounded hard-enforcement pilot.

## Current Non-Goals

- No hard enforcement in this pass.
- No Prisma migration in this pass.
- No edit to `protect()`, `server-authz`, `auth-session`, or module services in this pass.
- No sidebar-based security.
- No reliance on `Organization.requestedModules` as durable access truth.
- No billing-provider-to-runtime access coupling.

## Implementation Readiness Checklist

Before implementing the wrapper:

- durable entitlement schema design accepted;
- surface registry record contract accepted;
- package/dependency policy accepted;
- no-new-gap module surface ratchet designed;
- focused tests drafted for guard order and before-data-access;
- rollback plan preserves observe mode.

Before enforcing any surface:

- explicit tenant entitlements exist;
- the surface is registered;
- source modules are declared;
- RBAC permission is declared;
- unavailable/read-only/suspended UI exists;
- audit event path is tested;
- release gate evidence is saved;
- rollback returns to observe mode without data rollback.

## Verification Result

Baseline verification after saving this report passed:

```powershell
npm run module:surface:inventory
```

The command refreshed `what-next/module-surface-inventory.md` and `what-next/module-surface-inventory.json` at `2026-07-12T05:40:06.795Z` with 20 catalog modules, 306 inventoried surfaces, 266 mapped records, 34 unmapped records, 16 missing-permission records, and 300 enforcement candidates.

Focused Jest and broader gates are not required for this planning artifact because no application code, guard code, schema file, module service, scanner logic, or release-gate code changed.

## Next Handoff

Run `aqstoqflow-module-workbench-ux-states` next. It should specify active, trial, read-only, suspended, expired, unavailable, dependency-missing, owner/admin upgrade, and normal-user safe states for the Module Workbench and shell, while keeping UI subordinate to server-side guards.


## 2026-08-06 Inventory Item Create/Edit Follow-up

Inventory remains a canonical commercial module in the catalog, but live entitlement truth is still legacy-derived from `Organization.requestedModules`; the durable commercial entitlement read model and approved bounded enforcement pilot remain unavailable.

This normalization added observe-mode inventory decisions before create-page reference-data access and before `createItemAction` invokes the create service. Existing RBAC checks remain authoritative and no create allow/deny outcome changed.

The current edit page and canonical edit action already contain explicit `mode: "enforce"` checks. True create/edit enforcement parity was not introduced in this pass because either available change requires explicit approval:

- changing edit to observe would weaken an existing denial;
- changing create to enforce would introduce new hard-denial surfaces backed by legacy entitlement truth.

Therefore the current state is intentionally documented as **instrumented but not enforcement-parity complete**. The next decision owner must approve one bounded direction, tenant cohort, unavailable/read-only UX, audit evidence, and rollback before runtime parity changes.

Verification evidence for the safe observation-only change:

- focused create/edit and legacy-route Jest matrix: 9 suites, 35 tests passed;
- focused ESLint: passed;
- `npx tsc --noEmit --pretty false`: passed;
- `npm run module:surface:inventory`: passed and refreshed 387 records at `2026-08-06T09:43:22.585Z`;
- create page and action tests prove observation occurs before reference-data loading and service mutation.
