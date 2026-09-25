# Commercial access at POS shift opening

Evidence date: 2026-09-13. Source and dirty-tree binding: `evidence/source-baseline-v129.json`. Policy: `pos.shift.open`, version `2026-09-13.1`. This fixes the reproduced shift-opening defect from v128, not the entire POS or platform workflow.

## Delivered behavior

New shift creation requires writable POS eligibility and its required sales dependency, evaluated inside the same transaction before session, station or drawer mutation. The existing `evaluateModuleAccessInTx` reads and locks current organization/configuration/grant authority and evaluates validity windows and dependencies. Legacy unmanaged access follows the unchanged canonical legacy evaluator. Explicit empty grants do not restore legacy access.

The existing stop-new-work check runs first and remains separate. An unavailable commercial decision raises a specific domain error. After rollback, the service retains a tenant/actor/terminal-scoped `POS_SHIFT_OPEN_ENTITLEMENT_DENIED` audit with policy ID/version and safe reason. If authority or audit persistence fails, it does not create a shift or report a confirmed commercial denial to the client. The action still derives identity and tenant from current `pos.session.start` authorization; client-supplied tenant fields are stripped by the existing schema.

The client distinguishes a commercial denial from a stop-policy denial and an unconfirmed operation. EN/FR inline guidance retains the opening amount, requests administrator review of actual access and requires explicit retry. It does not grant access, reactivate a subscription, submit on refresh or automatically open a shift after a configuration change.

Existing shift reads and closure keep their existing tenant/cashier/permission/count/domain checks. They do not call the new opening guard. Closing a retained shift after commercial restriction is explicitly verified. This is not permission to refund/void or replay a financial operation; those boundaries remain open work.

## Policy registration and authorization

The production policy constant is `services/pos/shift-opening-access.ts:POS_SHIFT_OPEN_ACCESS_POLICY`. Owner: POS domain services. Entry action: `actions/pos/session.actions.ts:openPOSShiftAction`; service: `services/pos/pos.service.ts:openPOSShift`. Required action permission: `pos.session.start`. Intent: new shift write. Effective mode for this boundary: enforce. Scope: every call to this service, using the existing tenant authority evaluator. Unavailable behavior: rollback/no new shift or drawer, retained denial audit, localized explicit recovery. Companion registration and evidence are in `evidence/pos-shift-access-policy-v129.json`.

The enforcement-truth skill limits new enforcement during reconnaissance. The user's implementation assignment explicitly directs correction of demonstrated module-eligibility/access defects; that authorization is used here for this bounded correction. Shared wrapper/API defaults, other observe callers, commercial grants, pilot cohorts and POS stop-support flags are unchanged. This does not claim that global enforcement policy, scanner coverage, kill-switch governance or release certification is complete. The existing scanner does not prove this service-level boundary by itself; the production policy constant, call site, denial audit and direct runtime proof are the binding evidence.

## Correction to v128 operating guidance

Current `services/modules/module-stop-policy.service.ts` marks POS and sales stopping unsupported pending offline-continuation work. v128 stop tests directly created isolated policy fixtures. They do not establish that an administrator can enable or clear a POS/sales stop through the production workbench. The v128 guide's suggestion to review those controls must be read with this limitation. Do not edit production database flags to copy the fixture procedure. This batch changes commercial admission and does not enable unsupported stop controls.

## Verification

| Check | Evidence/result |
| --- | --- |
| Reproduction | v128 real-service matrix: empty/read-only/expired/suspended-dependency grants admitted shift opening. Historical report retained. |
| PostgreSQL after | Eight scenarios: legacy and active admitted; empty/read-only/expired/not-started/suspended-dependency/revoked-before-admission denied without session or drawer and with one denial audit. Every scenario retained closure of a previously opened shift. Cross-tenant opening denied. Receipt `69a88b`; `lanes/environment/shift-entitlement-v129-c7e4b062-8ca3-453b-a794-a8d3848a58e8.json`. |
| Focused service/action | 47 tests / four suites, receipt `02b1a1`. Includes helper denial/read-failure contract, existing POS financial/terminal-race regressions and action failure discrimination. |
| Module regressions | 14 tests / two suites, receipt `b2f4fc`: module entitlement and control actions. |
| Real browser | EN read-only POS and FR suspended sales fixtures, actual credentials/actions, denial with retained amount, no automatic submission after fixture grant restoration, one explicit keyboard opening, service closure after renewed read-only access. Six screenshots at 1440/768/320px, no page errors. Receipt `e919b3`; `lanes/environment/shift-access-browser-v129-44c4ba16-dd94-4a4d-90bf-5156575fcdd8.json`. |
| Lint | Seven changed TypeScript files, receipt `9e99c8`, passed. |
| Typecheck/source | Final receipts and binding in `evidence/pos-shift-access-v129.json`. |

Database interleaving revokes the actual grant after initial terminal availability lookup and before transaction admission, using a controlled Prisma query extension. This proves a fresh admission decision after the stale preliminary read; it is not a claim that every distributed race was exercised. Shared authority-lock behavior is inherited from the existing evaluator. No checkout, payment, journal, provider or notification delivery was executed. Shift closure creates local event/outbox/audit records; delivery remains unverified.

Final browser navigation-to-field observations: EN 12,051 ms; FR 12,928 ms. These are development measurements, not approved budgets or production performance claims. French 320px screenshot was visually inspected. Horizontal bounds, reduced-motion screenshots, accessible field/error association and keyboard retry are covered; complete assistive-technology, zoom and focus-return testing remains open.

Commands used the bundled Node runtime with inspected direct entry points: Jest `--runInBand --runTestsByPath` for `services/pos/__tests__/shift-opening-access.test.ts`, `services/pos/__tests__/pos.service.test.ts`, `actions/pos/__tests__/shift-open-policy.actions.test.ts`, `actions/pos/__tests__/session.actions.test.ts`; a second call for the two module tests specified above; `node_modules/typescript/bin/tsc --noEmit --pretty false`; and seven-file eslint. Exact commands and receipts are in the aggregate. The owned DB verifier is `lanes/environment/verify-shift-entitlement-v129.cjs`; browser verifier is `lanes/environment/verify-shift-access-browser-v129.cjs`, prepared separately from the inspected v128 journey with asserted fixture substitutions.

## User procedure, rollout and recovery

Open `/en/dashboard/pos` or `/fr/dashboard/pos`. On a commercial-access denial, retain the opening float and have an authorized administrator review the organization's current POS and required sales grants, validity windows and read-only status through the recognized module-management process. The necessary facts come from actual tenant grant records and their authorized provenance, not from a fabricated approval or this test fixture. The message does not establish prices, subscription terms or permission for a live activation. Once actual access is restored, explicitly retry. Existing shifts use their normal closing workflow and required cashier permission.

No user input is needed to continue local engineering. No migration, live deployment, subscription change or X1 clearance occurred. Release the helper/service/action/UI/messages as a coupled change through existing controls. Follow the existing module rollout instruction to prefer forward correction or presentation rollback retaining durable authority checks. Reverting the guard reintroduces the proven defect and is not a safe routine rollback. No silent kill switch that permits denied opening was added. If a release cannot preserve admission safely, halt rollout and use the authorized consistent application/database recovery process; do not erase grants or history. Production rollback rehearsal remains a release requirement, not a passed check in this batch.

## Review responsibilities and remaining work

Architecture/backend: bounded domain policy, current shared evaluator, transactional admission. Database/migration: no schema change; grant locks reused, denial rollback and retained audit verified. IAM/privacy: server-derived identity and tenant, no wildcard bypass, cross-tenant check, no exposed grant details. Finance/controls: no new drawer/session on denial, retained counted closure, no payment/journal effects. Frontend/UX/localization: clear EN/FR error, retained input, explicit recovery, existing tokens. QA/SRE/release: source-bound tests/browser/DB, observed latency, no certification. API/events: action discriminator and post-rollback audit, closure outbox retained but delivery unverified. SaaS/product/support: eligibility distinct from stop policy and subscription activation, truthful unsupported-stop guidance, ordinary authorized local implementation continues.

Statutory/country-pack, HRIS/payroll, purchasing/AP, analytics, AI/agents and external providers: not applicable to this patch because their rules, records and transports are unchanged; they remain in the overall review. These are engineering responsibilities, not professional approvals.

Still open: existing cart edits and terminal administration under restricted grants, sale commit/refund/void/replay across grant changes, global enforcement truth/registry/rollback, opening amount validation and unknown-outcome recovery, complete terminal lifecycle, accessibility and all other platform workflows. Do not promote the whole POS workflow or platform to complete from this slice.
