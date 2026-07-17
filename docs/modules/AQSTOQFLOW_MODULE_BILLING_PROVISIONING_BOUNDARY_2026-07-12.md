# AqStoqFlow Module Billing Provisioning Boundary

Date: 2026-07-12
Skill: `aqstoqflow-module-billing-provisioning-boundary`
Lane: Billing-provider boundary and safe provisioning workflow
Mode: observe/report only

## Executive Verdict

AqStoqFlow should not let a billing provider become the source of runtime module access. Provider events must be treated as signed, idempotent inputs into an internal subscription and entitlement control plane. Runtime access must continue to come from service-owned tenant entitlement state, evaluated by module access guards, with RBAC remaining separate.

The current repository has a credible module foundation: canonical slugs, observe-mode entitlement decisions, dependency gaps, would-block audit evidence, a Module Control Center, package strategy, and Workbench state requirements. It also has payment-provider schemas for reconciliation evidence, including provider accounts, provider events, idempotency keys, payload hashes, signature validity, and redacted payloads. Those payment-provider records are not a module billing system, but they show useful patterns for the billing boundary.

This report defines the missing boundary: provider adapters, provider event inbox, internal subscription reconciliation, idempotent provisioning, dunning, suspension, read-only retention, reactivation, manual override, audit evidence, rollback, and release gates. No hard module enforcement, schema migration, runtime billing integration, or code behavior is enabled in this pass.

## Source Evidence Inspected

- `docs/modules/AQSTOQFLOW_COMPLETE_MODULE_SYSTEM_ENTERPRISE_ROADMAP_2026-07-12.md`
- `docs/modules/AQSTOQFLOW_MODULE_SYSTEM_FULL_ARCHITECTURE_AUDIT_AND_REMEDIATION_REPORT_2026-07-12.md`
- `docs/modules/AQSTOQFLOW_MODULE_ENTITLEMENT_SCHEMA_AND_MIGRATION_PLAN_2026-07-12.md`
- `docs/modules/AQSTOQFLOW_MODULE_PACKAGE_STRATEGY_2026-07-12.md`
- `docs/modules/AQSTOQFLOW_MODULE_WORKBENCH_UX_STATES_2026-07-12.md`
- `docs/architecture/decisions/0004-kontava-module-vocabulary-and-ownership.md`
- `docs/architecture/decisions/0007-kontava-module-entitlement-observe-mode.md`
- `docs/architecture/decisions/0011-kontava-module-ownership-inventory.md`
- `what-next/module-surface-inventory.md`
- `what-next/module-surface-inventory.json`
- `services/modules/module-control-contracts.ts`
- `services/modules/module-catalog.service.ts`
- `services/modules/module-entitlement.service.ts`
- `actions/modules/module-control.actions.ts`
- `services/_shared/protect.ts`
- `lib/security/server-authz.ts`
- `lib/security/auth-session.ts`
- `config/sidebar.ts`
- `prisma/schema.prisma`
- `scripts/module-surface-inventory.js`

## Current State

- `MODULE_CONTROL_MODE` remains `observe`.
- `ModuleControlCenterData.hardEnforcementEnabled` remains `false`.
- `Organization.requestedModules String[] @default([])` remains the only persistent tenant module input in the current Prisma schema.
- `deriveLegacyEntitlements()` can accept explicit in-memory entitlements, but runtime observe access still derives from `requestedModules` or legacy full-suite defaults.
- Current entitlement statuses include `active`, `trial`, `read_only`, `suspended`, `expired`, `unavailable`, `legacy_default`, and `system_default`.
- Current entitlement sources include `requested_modules`, `legacy_default`, `system_default`, `manual_override`, `plan`, and `trial`.
- `recordModuleEntitlementDecision()` writes observe-mode would-block evidence to `AuditLog`.
- The package and entitlement reports already call for internal `ModulePackage`, `TenantSubscription`, `TenantModuleEntitlement`, and entitlement event records.
- Existing payment reconciliation provider models include provider account state, provider event idempotency, raw payload hashes, redacted payloads, signature validity, and reconciliation evidence. These are payment-domain records, not subscription billing records.
- No module billing adapter, subscription reconciliation service, module provisioning service, dunning workflow, or billing-provider webhook boundary currently exists for module entitlements.

## What Is Working

1. The platform has a canonical module vocabulary.

   The 20 catalog slugs give billing, packages, entitlements, Workbench state, and release gates one language.

2. The evaluator already separates module entitlement from RBAC conceptually.

   Wildcard/admin RBAC is tracked as a signal but does not erase module would-block decisions.

3. Read-only, suspended, expired, and unavailable statuses already exist in contracts.

   That makes billing outcomes expressible without inventing new runtime access language.

4. The package strategy defines commercial shape.

   It already states that billing-provider state must feed internal subscription/package state and must not directly control runtime access.

5. Existing provider-event patterns are useful.

   Payment reconciliation records already model provider ids, idempotency keys, hashes, signature validity, redacted payloads, and tenant-scoped provider accounts. The module billing boundary should reuse those principles, not those domain tables.

## What Is Not Working

1. Billing provider state has no module-specific boundary.

   There is no internal inbox or adapter for subscription provider events that maps them into safe internal commands.

2. There is no durable module subscription truth.

   `TenantSubscription` and durable `TenantModuleEntitlement` are planned but not implemented in the current schema.

3. There is no idempotent provisioning workflow.

   Package creation, upgrade, downgrade, trial activation, suspension, read-only retention, cancellation, and reactivation are not yet represented as safe commands with idempotency keys.

4. Manual overrides are not first-class.

   The contract has a `manual_override` source, but there is no audited, expiring override workflow for owners/support.

5. Dunning and suspension policy is not executable.

   The Workbench can describe suspended/read-only states, but the provider-to-internal-subscription workflow that creates those states is not present.

6. Runtime claims are not authoritative.

   `lib/security/auth-session.ts` still hard-codes `modulesEnabled`, so it must not be used as module access truth.

## Boundary Principles

1. Provider events are evidence, not authority.

   A webhook from Stripe, Flutterwave, Paystack, MTN, Orange, manual invoice tooling, or any later provider is only an input. It may trigger reconciliation, but it does not directly grant or revoke runtime module access.

2. Internal subscription state is authoritative for commercial state.

   `TenantSubscription` should represent the tenant's current package/subscription lifecycle independent of provider internals.

3. Internal entitlement state is authoritative for runtime module access.

   `TenantModuleEntitlement` should be derived from packages, trials, overrides, migration, retention, and subscription state. Runtime guards should evaluate effective entitlements, not provider payloads.

4. Provisioning is idempotent.

   Every provider event and every owner/admin command must be safe to retry without duplicate grants, duplicate suspensions, duplicate invoices, or duplicate audit events.

5. Every state change is auditable.

   Package changes, subscription changes, entitlement grants, suspensions, expiries, read-only retention, reactivations, manual overrides, and provider drift must create evidence.

6. Manual overrides expire.

   Support or owner/admin overrides must require fresh auth, reason, actor, scope, expiry, and review status.

7. Dunning is staged and tenant-safe.

   Payment failures should move through warning, owner/admin notification, dunning, read-only retention, suspension, and cancellation according to policy, not abrupt runtime removal.

8. UI state is subordinate.

   Workbench, shell, and sidebar may display billing/subscription state, but server-side module access remains the security boundary.

## Target Service Boundary

Recommended internal services:

| Service | Responsibility |
|---|---|
| `billing-provider-adapter.service.ts` | Verify provider signatures, normalize event payloads, redact secrets, and emit internal provider-event records. |
| `billing-provider-event-inbox.service.ts` | Store provider events idempotently with provider ids, idempotency keys, payload hashes, signature status, redacted payloads, correlation ids, and processing status. |
| `tenant-subscription.service.ts` | Own internal subscription status, package assignment, billing lifecycle, renewal dates, dunning state, and provider reference metadata. |
| `module-provisioning.service.ts` | Convert subscription/package changes into module entitlement grants, read-only retention, suspension, expiry, or reactivation commands. |
| `tenant-entitlement.service.ts` | Return effective module entitlements for guards and Workbench state. |
| `module-entitlement-event.service.ts` | Append immutable entitlement lifecycle events and audit evidence. |
| `billing-reconciliation.service.ts` | Compare provider state, internal subscription state, entitlement state, and package expectations. |
| `manual-entitlement-override.service.ts` | Create fresh-auth, reasoned, expiring, audited overrides. |

Recommended provider-facing adapter interface:

```ts
type BillingProviderEventEnvelope = {
  providerCode: string
  providerEventId: string
  eventType: string
  receivedAt: string
  occurredAt: string | null
  customerRefHash: string | null
  subscriptionRefHash: string | null
  invoiceRefHash: string | null
  idempotencyKey: string
  signatureValid: boolean
  rawPayloadHash: string
  redactedPayload: Record<string, unknown>
  correlationId: string
}
```

Recommended internal provisioning command:

```ts
type ModuleProvisioningCommand = {
  commandId: string
  organizationId: string
  source:
    | "provider_event"
    | "owner_admin_action"
    | "support_override"
    | "migration"
    | "scheduled_reconciliation"
  sourceEventId: string | null
  packageCode: string | null
  moduleSlugs: CommercialModuleSlug[]
  action:
    | "activate_package"
    | "upgrade_package"
    | "add_module"
    | "start_trial"
    | "downgrade_package"
    | "enter_dunning"
    | "suspend"
    | "expire"
    | "grant_read_only_retention"
    | "reactivate"
    | "cancel"
    | "manual_override"
  effectiveAt: string
  effectiveTo: string | null
  reason: string
  actorId: string | null
  requiresFreshAuth: boolean
  idempotencyKey: string
}
```

## Provider Event Workflow

1. Receive provider event.

   The API route verifies tenant/provider scope, provider signature, replay window, request size, and content type before storing anything.

2. Normalize and redact.

   The adapter converts provider-specific fields into `BillingProviderEventEnvelope`. Raw payload is hashed. Redacted payload is stored. Secrets and full payment identifiers are never exposed to Workbench state.

3. Store idempotently.

   Use a unique key such as `organizationId + providerCode + providerEventId` and a second idempotency key when the provider supplies one.

4. Reconcile internal subscription.

   Provider state is compared with the internal subscription. A valid provider event can propose a subscription change, but the internal service decides the final state.

5. Validate package and dependencies.

   The selected package and add-ons must exist, be active, satisfy required dependencies, and be compatible with tenant country, currency, and module risk policy.

6. Provision entitlements transactionally.

   The provisioning service writes subscription changes, entitlement changes, entitlement events, audit logs, and outbox messages in one transaction or with a retry-safe outbox pattern.

7. Publish Workbench state.

   Owners/admins can see subscription/package/entitlement state. Normal users only see safe module availability states.

8. Reconcile drift.

   Scheduled reconciliation compares provider state and internal state. Drift creates exceptions and support tasks; it does not silently grant runtime access.

## Idempotency Model

Required idempotency keys:

| Flow | Key |
|---|---|
| Provider webhook | `providerCode:providerEventId` plus provider idempotency key when present |
| Provider subscription update | `providerCode:subscriptionRefHash:eventType:periodStart:periodEnd` |
| Owner/admin package change | `organizationId:actorId:requestedPackageCode:commandNonce` |
| Manual override | `organizationId:moduleSlug:overrideType:actorId:issuedAt` |
| Scheduled reconciliation | `organizationId:providerCode:subscriptionRefHash:reconciliationDate` |
| Migration/backfill | `organizationId:migrationRunId:moduleSlug` |

Rules:

- retries must return the previous result;
- duplicate events must not create duplicate entitlement events;
- idempotent no-op events should still be visible in provider event processing history;
- idempotency collisions with different payload hashes must become security exceptions;
- every provisioning command should have a stable command id and correlation id.

## Subscription And Entitlement State Mapping

| Provider/internal trigger | Internal subscription state | Module entitlement effect |
|---|---|---|
| New paid package confirmed | `active` | Package modules become `active` after dependency validation. |
| Trial started | `trial` | Trial modules become `trial` with `endsAt`. |
| Trial expired without conversion | `expired` or `read_only_retention` | Module becomes `expired` or `read_only` per package policy. |
| Payment failed | `past_due` | Access remains active during grace period; owner/admin dunning state begins. |
| Dunning grace expired | `dunning` or `suspended` | High-risk writes stop first; policy may move modules to `read_only` or `suspended`. |
| Subscription suspended | `suspended` | Modules become `suspended` except allowed billing/admin support surfaces. |
| Subscription cancelled | `cancelled` | Modules become `expired` or `read_only` according to retention policy. |
| Package downgraded | `active` on lower package | Removed modules become `read_only` or `unavailable` by module policy. |
| Package upgraded | `active` on higher package | Newly included modules become `active` after dependency validation. |
| Manual support grant | unchanged or `override_active` | Specific modules become active/read-only until override expiry. |
| Reactivation after payment | `active` | Suspended modules reactivate; blocked jobs require explicit replay policy. |
| Provider drift detected | `reconciliation_exception` | No automatic grant; support/audit review required. |

## Dunning, Suspension, Read-Only, And Reactivation

Dunning should be staged:

1. `payment_failed_observed`

   Record provider event, notify owners/admins, keep access active during grace.

2. `dunning_open`

   Workbench shows owner/admin action. Normal users see no billing detail.

3. `dunning_final_notice`

   Owners/admins see date of pending suspension. High-risk new writes may require additional warning depending on policy.

4. `suspended`

   Module entitlements become `suspended` or `read_only` according to package policy. Normal users see safe unavailable/read-only states.

5. `read_only_retention`

   Historical records remain available when policy requires trust and compliance continuity. Writes, exports, jobs, and new postings are blocked unless specifically allowed.

6. `reactivated`

   Entitlements are restored by an internal provisioning command. Jobs, exports, and queued operations do not blindly replay; each module defines safe reactivation behavior.

## Manual Override Policy

Manual overrides are powerful and must be constrained:

- require fresh auth;
- require `MANAGE_SYSTEM_SETTINGS` plus a future billing/module administration permission;
- require actor id, reason, ticket/reference, affected modules, effective dates, expiry date, and support owner;
- cannot be indefinite by default;
- cannot bypass tenant isolation, RBAC, redaction, certification, maker-checker, legal hold, or audit rules;
- must create entitlement events and audit logs;
- must appear in Workbench owner/admin diagnostics;
- must be included in scheduled reconciliation review.

## Billing Provider Boundary Data Model

Additive future models should be separate from payment reconciliation tables:

| Model | Purpose |
|---|---|
| `BillingProviderAccount` | Tenant billing relationship with provider, provider customer refs, redacted references, status, currency, and region. |
| `BillingProviderEvent` | Idempotent provider event inbox with payload hash, redacted payload, signature status, processing status, and correlation id. |
| `TenantSubscription` | Internal subscription/package state independent of provider internals. |
| `TenantSubscriptionEvent` | Subscription lifecycle evidence. |
| `TenantModuleEntitlement` | Effective or source entitlement rows for modules. |
| `TenantModuleEntitlementEvent` | Immutable entitlement grant/change/suspend/expire/read-only/reactivate/revoke/override evidence. |
| `ModuleProvisioningCommand` | Idempotent command log for package and entitlement provisioning. |
| `ModuleProvisioningOutbox` | Retry-safe outbox for Workbench refresh, notifications, audit fanout, and reconciliation jobs. |
| `BillingReconciliationRun` | Scheduled reconciliation evidence between provider, subscription, package, and entitlement state. |
| `BillingReconciliationException` | Drift, duplicate, missing event, failed signature, or conflicting subscription state. |

## Security And Redaction Controls

- Provider webhook routes must validate signature before processing.
- Raw provider payloads should be hashed and stored only where policy permits.
- Workbench state must use redacted payloads and masked provider references.
- Billing provider secrets must remain server-only and never enter client bundles.
- Provider event processing must be tenant-scoped by organization and provider account.
- Module access guards must never call provider APIs during request-time authorization.
- Billing reconciliation must not print secrets, full customer references, full card/account identifiers, or raw provider payloads.
- Billing failures must return safe errors.
- Suspended states must not shame normal users or expose billing internals.
- Manual overrides require fresh auth and full audit.

## Release Gates And Tests

Future implementation should add focused tests before any hard enforcement:

- adapter rejects invalid signatures and stores redacted payload only;
- duplicate provider events are idempotent;
- same idempotency key with different payload hash becomes an exception;
- provider event cannot directly grant runtime access;
- internal subscription change creates expected entitlement events;
- package upgrade activates only valid package modules;
- package downgrade creates read-only retention where policy requires it;
- payment failure opens dunning without immediate unsafe access loss;
- suspension blocks write/export/job intents and preserves allowed support/billing/admin surfaces;
- reactivation does not blindly replay queued jobs;
- manual override requires fresh auth, reason, expiry, actor, and audit event;
- provider drift opens a reconciliation exception instead of silently changing access;
- wildcard/admin RBAC cannot bypass module entitlement;
- normal users never receive billing internals in Workbench state.

Release gates should ratchet toward:

- no provider webhook without signature verification and idempotency;
- no provider event path that writes runtime entitlements directly;
- no module provisioning command without audit evidence;
- no indefinite manual override without review;
- no subscription state change without entitlement-event evidence;
- no report/export/job leakage when billing state moves a module to read-only, suspended, expired, or unavailable.

## Implementation Sequence

1. Define additive contracts only.

   Add provider envelope, internal subscription state, provisioning command, and reconciliation result types. Keep observe/report mode.

2. Add provider event inbox.

   Store normalized billing events idempotently with redaction, hashes, signature status, tenant scope, processing status, and correlation ids.

3. Add internal subscription read/write service.

   Make internal subscription state the only commercial state consumed by entitlement provisioning.

4. Add module provisioning service in dry-run mode.

   Compute package-to-entitlement diffs without writing runtime-changing entitlements.

5. Add entitlement event writer.

   Every computed grant, suspension, expiry, read-only retention, and reactivation must produce evidence.

6. Add Workbench diagnostics.

   Owners/admins see package source, billing state, provider event status, dunning state, and safe next actions. Normal users do not.

7. Add reconciliation job in report mode.

   Compare provider state, internal subscription, package mapping, and entitlement state. Produce exceptions only.

8. Pilot one provider and one low-risk module path.

   Do not enable broad hard enforcement. Start with report-only provisioning diffs and one bounded owner/admin flow.

9. Add release-gate ratchets.

   Fail new provider webhook paths without signature/idempotency/redaction. Fail new provisioning paths without audit evidence.

10. Enable bounded enforcement only after explicit approval.

   Use one package/module workflow, rollback plan, audit evidence, and Workbench state coverage.

## Risks And Blockers

| Risk | Severity | Mitigation |
|---|---:|---|
| Provider directly grants runtime access | Critical | Provider events feed internal subscription reconciliation only. |
| Duplicate webhook grants duplicate modules | Critical | Provider event inbox and provisioning command idempotency. |
| Billing drift silently changes access | Critical | Reconciliation exceptions require review before access changes. |
| `requestedModules` remains live commercial truth | Critical | Migrate to durable subscriptions and entitlements. |
| Manual overrides become permanent | High | Fresh auth, expiry, reason, actor, and audit review. |
| Normal users see billing internals | High | Role-filter Workbench state and safe copy. |
| Suspension breaks audit/compliance history | High | Read-only retention policy per module. |
| Reactivation replays unsafe jobs | High | Explicit module reactivation policies. |
| Raw provider data leaks | High | Redaction, hashing, masked references, server-only secrets. |
| Package dependencies are bypassed | High | Provisioning validates package dependencies before entitlement grants. |

## Completion Criteria

- Billing provider events are stored idempotently and redacted.
- Internal subscription state is provider-independent.
- Entitlements are derived from internal subscription/package/override/migration state.
- Provider drift creates exceptions, not silent access changes.
- Dunning, suspension, read-only retention, cancellation, and reactivation are typed.
- Manual overrides are expiring and audited.
- Runtime guards read effective entitlements, not provider payloads.
- Workbench exposes owner/admin diagnostics and hides billing internals from normal users.
- Release gates catch unsafe provider/provisioning paths.

## Verification Result

Before this lane:

```powershell
npm run module:surface:inventory
```

Inventory evidence from `what-next/module-surface-inventory.md` before this report:

- Generated at: `2026-07-12T05:46:00.882Z`
- Catalog modules: 20
- Surfaces inventoried: 306
- Mapped: 266
- Unmapped: 34
- Missing permission: 16
- Enforcement candidates: 300
- Report mode: inventory is read-only and does not enforce module entitlements.

After this lane:

- Command: `npm run module:surface:inventory`
- Result: passed. The report-mode inventory rewrote 306 records to `what-next/module-surface-inventory.json`.
- Generated at: `2026-07-12T07:51:21.727Z`
- Catalog modules: 20
- Surfaces inventoried: 306
- Mapped: 266
- Unmapped: 34
- Missing permission: 16
- Enforcement candidates: 300
- Source coverage remained `sidebar=present`, `moduleCatalog=present`, `dashboardRoot=present`, and `actionsRoot=present`.

## Decisions Made In This Lane

- Billing provider events must be evidence inputs, not runtime entitlement truth.
- Module subscriptions and module entitlements need internal service-owned records.
- Provisioning must be idempotent, auditable, tenant-scoped, and retry-safe.
- Dunning/suspension/reactivation must produce Workbench states without exposing billing internals to normal users.
- Manual overrides require fresh auth, reason, expiry, and audit evidence.
- Existing payment provider tables are a useful pattern but should not be reused as module billing subscription truth.

## Next Handoff

Return to `aqstoqflow-module-control-plane-orchestrator`.

Recommended next lane: `aqstoqflow-module-leakage-prevention`.

Reason: after the billing/provisioning boundary is specified, the next control-plane risk is report, export, job, webhook, proof-surface, and cross-module data leakage when a module becomes read-only, suspended, expired, unavailable, or dependency-missing.
