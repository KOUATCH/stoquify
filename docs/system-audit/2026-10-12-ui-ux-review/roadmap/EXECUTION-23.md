# Delivery 23 — Narrow Accountant seed-definition repair

Date: 16 October 2026. Scope: prevent the chart-account lookup gap in the two older development Accountant definitions and continue journal-form acceptance. Source HEAD: `fe540161f9fa53c149cc662759567cacc1dbd136`.

## Change and boundaries

Added `PERMISSIONS.VIEW_CHART_OF_ACCOUNTS` as an exact permission-name term to the Accountant selections in:

- `prisma/comprehensive-seed.ts`
- `prisma/compliance-hris-role-seed.ts`

The existing selection logic now includes the legacy equivalent of `accounting.accounts.read`. The current permission catalog proves that this adds exactly one grant. No broad ACCOUNT keyword, wildcard, runtime alias expansion, role-name bypass, guard removal or automatic stored-role synchronization was introduced. Existing posting, reversal, account-management and permission-administration authority is unchanged.

The seed creation/update rules are unchanged: the compliance seed can update roles that it owns, while preserving other existing role IDs; the systematic reference seed preserves existing roles and reports missing template permissions. **Neither seed was executed.** The previously observed Accountant's stored grants therefore have not been repaired by this source-only change. Existing data requires a separately reviewed administrator decision; reseeding is not a narrow repair.

The comprehensive seed already contained unrelated working-tree edits. [The owned patch](evidence/delivery-23-owned.patch) is relative to the saved pre-edit bytes and contains only the two permission additions. No journal UI code changed in this delivery.

## Verification

| Evidence class | Result |
|---|---|
| Workflow contract | Fresh `npm run agent:workflow:check` passed; 196 commands unclassified |
| Before-fix regression | 4 expected failures, 14 passes: both Accountant definitions failed lookup authorization and the expected single-grant addition |
| After-fix pure/mocked/source tests | **18 passed**, 3 suites, 7.151 seconds |
| Journal component tests | **20 passed**, 1 suite, 10.875 seconds; EN/FR successful fixture rendering, denied/failed/empty setup, accessible region metadata, preserved fields, error focus and duplicate submission controls |
| TypeScript | New pure permission test and its permission-catalog imports passed strict no-emit checking |
| Patch whitespace | `git diff --check` passed for both modified seed files |
| Real database | Not queried or modified in this delivery; Delivery 22 remains the prior read-only diagnosis |
| Live browser | **Blocked by page-control timeouts; no new rendered acceptance claimed** |

The new test reads the seed definitions through the TypeScript AST without importing or executing either seed. It checks effective permission mapping, an exact one-grant delta, retained prior grants, no wildcard, and unchanged authority for posting/reversal/account management/role assignment. A separate test verifies that chart reading alone cannot prepare/post/reverse entries or administer accounts/roles. Existing mocked RBAC tests cover fresh session authority, revoked and unavailable sessions, identity handling and cross-organization denial. These do not establish real database/session invalidation or transaction evidence.

The isolated Jest configuration has bounded roots and no application setup, environment-file loading or database initialization. Initial sandbox Node invocations stalled; one broad-discovery run was interrupted. A bounded sandbox run eventually produced the expected red result. The separately approved Node execution context produced a clean red reproduction and the final green results. No automatic approval rejection occurred.

Commands (all definitions/configuration/import side effects reviewed before execution):

```text
npm run agent:workflow:check
node node_modules/jest/bin/jest.js --config docs/system-audit/2026-10-12-ui-ux-review/roadmap/jest.delivery23.config.cjs --runInBand --no-cache --json --outputFile=docs/system-audit/2026-10-12-ui-ux-review/roadmap/evidence/delivery-23-tests.json
node node_modules/jest/bin/jest.js --config docs/system-audit/2026-10-12-ui-ux-review/roadmap/jest.delivery20.config.cjs --runInBand --no-cache --json --outputFile=docs/system-audit/2026-10-12-ui-ux-review/roadmap/evidence/delivery-23-form-tests.json
node node_modules/typescript/bin/tsc --noEmit --incremental false --skipLibCheck --esModuleInterop --target ES2017 --module commonjs --strict --types node,jest prisma/__tests__/accountant-lookup-permissions.test.ts
git diff --check -- prisma/comprehensive-seed.ts prisma/compliance-hris-role-seed.ts
```

## Authorized fixture and live acceptance gap

The user supplied an existing **Super Admin sign-in in Chrome** for the journal-form checks. Chrome inventory listed the new dashboard tab and the prior portfolio tab. Inspection of the signed-in page timed out, including a fresh tab opened directly to `/en/dashboard/accounting/journals/new`. Edge's existing accounting tab also timed out. Chrome's inventory ID changed after tool resets; discovery used the same extension identity to resolve it. No credential, session storage, hidden application state or alternative browser-control channel was accessed.

The Super Admin role is **user-reported and not independently rendered-confirmed in this delivery**. It is suitable for authorized form-presentation checks once the connection works, but would not prove restricted Accountant authorization. No new viewport override, theme preference, form input or submission was applied. No current screenshot could be captured; earlier delivery screenshots remain historical evidence only.

## Remaining checks, in order

1. Inspect the supplied Chrome Super Admin session and confirm the new-journal form loads accounts/journals through its ordinary guards.
2. Verify EN/FR desktop, tablet and 320px form layout; labels and select options; Tab/Shift+Tab entry/exit; ArrowRight/ArrowLeft in the line region; visible focus; final viewport restoration. Inspect without submitting a journal.
3. Verify the same workflow under a separately authorized restricted Accountant fixture. The stored Accountant role reviewed in Delivery 22 still lacks chart reading; this code change deliberately does not alter it.
4. Continue Owner/Cashier role journeys, populated delegated-client portfolio, screen reader, forced colors, reduced motion and broader theme/state checks. A Super Admin session cannot close these role-specific gaps.

Rollback: remove only the added `PERMISSIONS.VIEW_CHART_OF_ACCOUNTS` terms using the [owned patch](evidence/delivery-23-owned.patch), accounting for later edits. The [baseline](evidence/delivery-23-baseline.json) retains pre-edit bytes. New test/config/report files are separately owned. No commit, grant, migration, seed, financial action, invitation, deployment or live-business-data mutation was performed.

Evidence: [red reproduction](evidence/delivery-23-before-tests.json), [permission/boundary results](evidence/delivery-23-tests.json), [form component results](evidence/delivery-23-form-tests.json), [isolated test config](jest.delivery23.config.cjs).

## Live retry — 16 October 2026, after Delivery 23

The next requested live verification attempt reached the same Chrome extension and listed the dashboard, POS and portfolio tabs. Reading the dashboard banner failed with a page-command deadline before dispatch; a screenshot attempt also timed out. Inventory connectivity therefore does not establish working page control. No new role, form, locale, viewport or keyboard result is claimed.

Reviewed the repository browser-maintenance guidance and exposed recovery capabilities. No supported programmatic extension reconnect control was available. Requested browser-side recovery: close any DevTools attached to Stoquify, reconnect the Codex extension and open `/en/dashboard/accounting/journals/new` in the existing signed-in Chrome session. This is a connection prerequisite, not a request to sign out or broaden account permissions.

Current source inspection reconfirmed EN/FR labels, the named focusable line region, native field labels, hydration/pending submission lock, failure focus and draft retention. No additional production change was justified by that inspection. The previous 38 passing tests remain dated Delivery 23 results; they were not rerun or relabelled as browser evidence. No application command, database query, permission change, viewport override or form submission occurred during this retry. The acceptance order above remains open pending working page control.

### Retry after the user confirmed Chrome was ready

On 16 October 2026, Chrome inventory again succeeded and included the exact requested `/en/dashboard/accounting/journals/new` tab. A targeted read of its main region failed before CDP command dispatch. A separate screenshot attempt reached the 25-second tool deadline and reset the browser runtime. Neither operation produced rendered form evidence, so Super Admin identity, loaded lookup options, EN/FR layout and keyboard behavior remain unverified in this session. No screenshot was saved.

Local host diagnostics, after the sandbox denied listener inspection, confirmed an IPv6 listener on port 3000 (PID 29160). This establishes that a process is listening; it does not establish HTTP health or successful journal rendering. The browser connection failure persists despite the user-side reconnect. No server or browser process was restarted or terminated, and no browser profile/configuration was altered.

Fresh `npm run agent:workflow:check` passed with 196 unclassified scripts after its definition and registry entry were reviewed. No component tests were rerun, no database was queried, and no production code, stored permission, form value, viewport or theme was changed. Repeating the same reconnect request has not resolved the blocker; the next connection recovery step is a desktop-app/extension restart by the user, followed by one bounded page-read check before resuming the acceptance sequence above.

### Retry after the Codex restart and Chrome reconnect

The user confirmed both recovery actions. Chrome inventory listed the exact journal URL with the Stoquify title, but full DOM inspection timed out. A targeted main-region read then failed before command dispatch. The documented screenshot alternative returned **Debugger unattached**, providing a more specific connection symptom. Explicitly claiming the existing journal tab succeeded, but its subsequent DOM read returned the same unattached-debugger error. Creating a fresh Chrome tab succeeded; navigating it to the journal URL timed out after 25 seconds. This does not establish an application or authorization defect.

No rendered role, lookup options, layout, focus, horizontal scrolling or screenshot was obtained. No viewport override, field input, submission, stored permission change or database operation was performed. No additional application-code change or test rerun was justified by this connection-only evidence. Requested the exact status/error displayed in the browser extension instead of repeating restart instructions. Live acceptance remains open.
