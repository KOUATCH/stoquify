# Delivery 22 — English recovery acceptance and Accountant permission diagnosis

Date: 16 October 2026. Actual Chrome Accountant session; development application. This delivery adds evidence and a scoped diagnostic, not production UI or authorization changes.

## Completed browser checks

| Route / state | Locale / CSS viewport | Result |
|---|---|---|
| `/en/dashboard/accounting/journals/new`, denied setup lookup | EN / 1707×797 | English title, explanation, administrator guidance and Back to journals rendered; Tab reached the recovery link; document client/scroll widths 1686/1686 |
| Same denied state | EN / 320×844 | Recovery link remained reachable; document client/scroll widths 300/300; no horizontal document overflow |
| `/en/dashboard/accounting/journals`, keyboard recovery | EN / restored 1707×797 | Enter on Back to journals reached the populated queue: 8 books, 1 draft, 80 posted/reversed evidence entries and retained history; no transaction action invoked |
| Posted journal evidence, no matching search | EN / 1707×797 | Clear empty-filter feedback, 0 of 80 loaded records, page 1 of 1 |
| Posted journal evidence, cleared search | EN / 1707×797 | 80 of 80 loaded records and page 1 of 4 restored; search retained focus |
| Final document / viewport | EN / 1707×797 | `lang=en`, one main landmark, client/scroll widths 1686/1686; viewport override reset and dimensions measured |

The desktop recovery screenshot was saved. Phone capture timed out, so the phone result is DOM/dimension/focus evidence, not a saved visual capture. The first Enter attempt timed out while focusing the link; inspection showed the unchanged recovery state. A subsequent Enter succeeded and the populated destination was inspected. These intermittent browser-control failures do not invalidate the later observed outcomes.

## Confirmed reason for denied account reading

The exact observed user and organization were queried through a PostgreSQL **READ ONLY transaction**. The diagnostic selects account-state flags and role grants, never credentials or sessions, and saves only reduced evidence:

- User active, unlocked and verified; organization active and not deleted.
- One `accountant` role in the same organization, with 55 stored permissions.
- Journal grants include `VIEW_GENERAL_LEDGER`, `CREATE_JOURNAL_ENTRIES` and `VIEW_JOURNAL_ENTRIES`.
- No `accounting.accounts.read`, `VIEW_CHART_OF_ACCOUNTS`, `READ_ACCOUNTS` or wildcard grant.

Current source confirms the account lookup in `actions/accounting/accounts.actions.ts:70` requires `accounting.accounts.read`. `lib/security/rbac-permissions.ts:297` maps its legacy alias to `VIEW_CHART_OF_ACCOUNTS`. Journal authority does not imply account-reading authority. `lib/security/rbac.ts` loads current stored role permissions and disables session cookie caching for its session check. The displayed Accountant label is not an authority grant.

The new-journal route can pass its journal create/read checks while the required chart-account lookup is denied. This explains the reachable page and withheld form. The server guard is working as designed; the failure is a permission configuration / workflow prerequisite gap. The Delivery 21 recovery message correctly exposes the problem without bypassing it.

## How the gap can arise and persist

Source evidence:

1. `prisma/comprehensive-seed.ts:636` constructs Accountant grants by permission-name keywords including FINANCE, LEDGER and JOURNAL. None of its terms match `VIEW_CHART_OF_ACCOUNTS`, so that definition omits the required lookup grant.
2. `prisma/compliance-hris-role-seed.ts` uses a similar Accountant keyword selection. Its coverage function reuses an existing organization/code role and updates permissions only for roles with its own compliance-managed ID prefix. The observed role does **not** have that prefix. This source can explain attachment to a preserved role, but does not prove which historical command created the stored role.
3. `prisma/systematic-reseed-reference-data.ts:22` explicitly includes account reading in `financeRead`, used by its Accountant definition. The existing-role branch preserves grants and reports missing template permissions rather than silently broadening them. A newer template therefore does not repair this already-existing role automatically.

The missing stored grant is confirmed. Attribution to a particular historical seed run remains an inference; no historical execution audit was inspected. Existing graph evidence was used only for source discovery; current source governs this diagnosis.

## Safe next acceptance work

| Priority | Work | Acceptance criteria / boundary |
|---|---|---|
| P1 | Review intended journal-preparer permissions for this test role | An authorized organization administrator decides whether chart-account reading belongs to this role. If approved, review only `accounting.accounts.read` / its established legacy equivalent and the affected membership scope; retain tenant scoping, posting/reversal separation and all server guards. No wildcard or whole-template synchronization. No grant was made here. |
| P1 | Prevent future test-fixture prerequisite drift | In a separately reviewed seed-definition change, explicitly define the intended journal-preparer lookup permission and test positive lookup plus negative posting/cross-tenant authority. Preserve existing-role non-expansion behavior. Do not run a reseed to repair the current session. |
| P1 | Complete manual journal form acceptance with an authorized fixture | Check EN/FR labels, account/journal selectors, line-region ArrowLeft/ArrowRight, Tab exits, narrow layout and recovery. Do not submit live drafts as part of presentation acceptance. Current session remains blocked by its legitimate lookup denial. |
| P2 | Remaining role/state matrix | Owner and Cashier sessions; populated delegated-client portfolio; actual screen reader, forced colors, reduced motion and broader theme/state coverage remain open. Earlier Accountant reconciliation, portfolio and overview evidence remains recorded in Deliveries 14–21. |

## Verification and side effects

- **Workflow:** inspected command and current registry; `npm run agent:workflow:check` passed, exit 0; 196 commands unclassified.
- **Source inspection:** current account action, RBAC evaluation/aliases, journal prerequisites and development-role creation/preservation paths reviewed.
- **Mocked/unit tests:** no new tests or rerun in this evidence-only delivery. Delivery 21's 20 mocked component tests remain historical evidence, not a new result.
- **Real database:** one successful exact-user read-only diagnostic; earlier initialization/connectivity attempts failed before useful results. The approved network-enabled rerun succeeded. This is an authorization-data read, not a transactional database test or a certification of all roles.
- **Rendered browser:** checks above use the actual authenticated Accountant session. Ordinary application reads may generate existing audit records.
- **No mutations:** no role grants, seed, migration, business transaction, invitation, export, deployment or production code edits. Viewport restored and temporary search cleared; no theme change.

Evidence: [reduced role diagnosis](evidence/delivery-22-accountant-access.json), [reviewable read-only diagnostic](read-accountant-access.cjs), [English desktop recovery](evidence/delivery-22-journal-en-desktop.png), [browser observations](evidence/delivery-22-browser-observations.json).

Source HEAD at inspection: `fe540161f9fa53c149cc662759567cacc1dbd136`. Unrelated working-tree changes preserved. This delivery closes English denial/recovery acceptance and identifies the permission gap; it does not close full journal-form or program-wide acceptance.
