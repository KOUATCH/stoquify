# Statement history and recovery — next implementation boundary

Current-source trace on 2026-09-06: tool receipts `24a834`, `966f58`. The sender route imports the create/deliver/revoke actions. `customer-statement.actions.ts` has no guarded history read. Searches of current actions/services/customer components found no sender history owner. Snapshot and delivery records already exist; schema invention is not the first step. This is an engineering gap within the active assignment, not an approval blocker.

## Scope to implement after the v40 recovery checkpoint

1. Service-owned, bounded, tenant/customer-scoped snapshot and delivery history using existing records. Return checked time, recorded period/balance, known delivery state and effective token expiry/revocation without raw destination, token, sealed envelope or actor credentials. Unknown/missing states remain explicit; a failed query must never become successful empty history.
2. A guarded read action using current server-derived organization and actor, explicit Accounting/customer access and the correct read/export policy. Verify current source definitions before selecting permission names. User-supplied organization/actor identifiers cannot establish authority.
3. A history view in the current statement screen, including loading, empty, failed-refresh with retained stale rows, permission denial, pagination and localized dates/state. Read-only review must not silently generate a new statement or delivery.
4. An explicit route from a confirmed historical statement to a new reviewed delivery draft. Previous queue records and current token status must be visible before an operator knowingly requests another copy. The old creator's idempotency command must not be replayed as a different actor. Lost or unreadable browser metadata must not be erased merely to bypass unresolved server outcomes.
5. Existing token revocation can be exposed only through its current authorized fresh-auth action, with a reason and confirmation. Keep new-work delivery separate from retained historical access and recipient obligations. Do not invent worker retry/resume capabilities.

## Verification required

- Real records for two organizations, different actors and existing snapshots/deliveries; cross-tenant and foreign-object reads return no private evidence.
- Denied or removed current permission cannot read history or invoke a historical mutation.
- Stable pagination, empty history, malformed/foreign cursor, stale refresh, failed query and absent delivery-state evidence.
- Token status truth: active, expired, revoked and missing evidence; provider accepted versus recipient delivered/read remain distinct.
- Reload/tab loss without duplicate snapshot or delivery, explicit new-copy consent and idempotent revoke/retry if exposed.
- Actual EN/FR desktop/mobile/keyboard visits with before/after records; no external provider send.
- Focused service/action/component tests, typecheck, changed-file lint and a new source baseline after implementation. Do not overwrite v40 or upgrade full-workflow status using its narrower retry evidence.

Populated receivable-source calculations, worker lease/provider outcomes, native assistive technology and the complete platform register remain separate active requirements.
