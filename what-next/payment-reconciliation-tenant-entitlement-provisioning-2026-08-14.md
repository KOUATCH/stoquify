# Payment reconciliation tenant entitlement provisioning — 2026-08-14

## Outcome

The Finance Reconciliation route correctly enforced the `payment_reconciliation` entitlement, but the comprehensive registration seed requested Payment Reconciliation and Accounting without the required Finance dependency. That left affected tenants on the locked-module state even though reconciliation had been selected during provisioning.

The implementation now provides a governed recovery path and prevents the same seed drift for newly generated comprehensive demo tenants.

## Changes

- Added `Finance` to `REGISTER_WORKFLOW_MODULES` before `Payment reconciliation`.
- Added tenant-scoped module activation that derives the organization and actor from the authenticated server context.
- Resolves only required catalog dependencies and preserves existing/unknown requested-module values.
- Writes `MODULE_ENTITLEMENT_ACTIVATED` or idempotent `MODULE_ENTITLEMENT_ALREADY_ACTIVE` audit evidence in the same serializable transaction.
- Requires `MANAGE_SYSTEM_SETTINGS` and password assurance no older than ten minutes.
- Added an English/French recovery control to the locked reconciliation state.
- Reuses the existing rate-limited, audited password step-up service when the current session is stale; the password is not retained by the client component.

## Controls preserved

- Tenant isolation: organization ID is derived from RBAC context, not client input.
- RBAC: wildcard permissions do not bypass entitlement evaluation; activation remains an explicit protected action.
- Fresh authentication: enforced before the entitlement transaction.
- Auditability: actor, tenant, requested-module before/after values, added modules, dependencies, and activation time are recorded.
- Accounting truth: no balance, posting, matching, suspense, tax, cash, or reconciliation calculations were changed.
- Localization: recovery and step-up copy is available in English and French.
- Dirty worktree: unrelated changes were not modified.

## Verification

- Focused service/action/page/component tests: 18 assertions across four suites passed in focused runs.
- Targeted ESLint: passed with no diagnostics.
- Focused `git diff --check`: passed. Repository-wide `git diff --check` still reports three unrelated pre-existing blank-line findings outside this change.
- Repository-wide TypeScript check: no diagnostics were emitted before the command exceeded the two-minute execution limit; result is inconclusive.
- Authenticated browser: the authorized activation control rendered for the active super-admin tenant. The original activation attempt was correctly rejected as `FRESH_AUTH_REQUIRED`, confirming the safeguard. The secure password step-up form is implemented and tested; final tenant mutation remains pending user-entered current password.

## Operating step

On `/en/dashboard/finance/reconciliation`, select **Enable reconciliation**, confirm the audited access change, enter the current password when prompted, then select **Verify and enable**. A successful step-up adds only missing required modules and refreshes the route into the reconciliation workbench.
