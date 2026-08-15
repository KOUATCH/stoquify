# Stoquify POS location/customer isolation evidence

Date: 2026-08-15  
Status: Implemented and locally verified; not yet classified as production-proven

## Executive result

The POS customer workflow now treats a customer as selectable only when the authenticated organization and the currently selected location both match an explicit customer/location assignment. Changing location clears the selected customer, search text, and chooser state. A cart containing lines prevents a location change so a draft cannot silently cross a stock, terminal, or customer boundary. The atomic sale commit independently revalidates the customer/location relationship before claiming a session, changing stock, recording payment, or posting accounting consequences.

This closes the observed defect where the same organization-wide customer list and selected customer survived a branch change.

## Root cause confirmed

- The POS used the generic organization-wide customer action and a generic customer query key.
- Customer search filtering was performed in the browser after loading the organization-wide list.
- The selected customer state was not reset when the location changed.
- The atomic sale commit checked only customer ID, organization, active state, and deletion state; it did not verify the sale location.
- The legacy customer model had no explicit location relationship.

## Implemented control contract

| Workflow surface | Enforced behavior |
| --- | --- |
| List/search | Requires a location ID and applies organization + active location + explicit customer/location assignment on the server. Search, count, sorting, and limits are server-side. |
| Query/cache | POS customer query keys include location ID and search text, preventing Location A results from being reused for Location B. |
| Selection | Any location transition resets the selected customer to walk-in, clears the search, and closes the chooser. |
| Cart | A location change is blocked while the persisted draft has cart lines; the cashier must finish or clear the location-bound draft first. |
| Sale commit | Customer eligibility is checked again inside the sale transaction before session claim, stock changes, payment persistence, and accounting posting. |
| Walk-in | The organization walk-in customer remains valid across locations as the deliberate counter-sale exception. |
| Historical records | Existing sales are not reassigned or rewritten. Historical customer/location activity remains intact. |
| Offline replay | Existing offline POS events are already organization/device/terminal/location/session scoped and carry no customer selection field, so there is no stale-customer replay surface in the current contract. |

The current POS does not contain an actual create-customer mutation: its "Add customer" control opens the chooser. This change therefore does not introduce a new customer-creation product surface. The data model includes `POS_CREATION` as a future assignment source so a later, authorized POS creation flow can atomically attach the new customer to the active location.

## Data model and migration

Added the explicit many-to-many `CustomerLocation` association rather than a single `Customer.locationId`. This preserves real customers who transact at multiple branches while still making POS visibility explicit.

Migration: `prisma/migrations/20260815143000_pos_customer_location_scope/migration.sql`

The backfill creates assignments only from distinct, non-draft historical sales. It does not guess a location and does not modify customers or historical sales.

Local post-migration reconciliation:

- Active non-walk-in customers: 274
- Active customers without an assignment: 0
- Customer/location assignments: 276
- Assignments sourced from historical sales: 276
- Non-draft attributed sales used by the backfill: 276

The migration was applied successfully to the local PostgreSQL database `stoquify_dev_migrated_20260814`.

## Automated verification

Focused test command result:

```text
Test Suites: 5 passed, 5 total
Tests:       48 passed, 48 total
Snapshots:   0 total
```

Coverage includes:

- Location A and Location B produce different server predicates and results.
- A location from another organization fails before any customer query.
- Cross-location customer use is rejected without logging customer PII.
- Walk-in remains valid.
- Server action RBAC/module enforcement and organization/location input flow.
- Query keys partition by location and search.
- Customer/search/dialog reset on branch change and correct reload when returning.
- Location change is blocked while the draft contains cart lines.
- Atomic sale commit rejects a cross-location customer before session, inventory, payment, or accounting side effects.

Additional gates:

- `npm run typecheck`: passed
- Focused ESLint: passed
- `npx prisma validate`: passed
- `npx prisma generate`: passed
- `npx prisma migrate deploy`: passed
- `git diff --check`: no whitespace errors

The repository-wide migration safety gate remains blocked at 8/9 because the older unrelated migration `20260611130000_accounting_auth_baseline_bridge` contains 13 unapproved drop findings. The new customer/location migration produced no safety finding. This pre-existing repository gate must be cleared before production migration approval.

## Browser evidence

Authenticated browser verification was performed on English and French POS pages.

English:

- `Lake Freemanhaven Kitchen 001` displayed only Dale Boyer 004 and Russ Johnston 001.
- After selecting a Location A customer and changing to `Antoniaport Hub 040`, the chooser closed, the POS returned to walk-in, and Dale Boyer was absent.
- `Antoniaport Hub 040` displayed only Dianna Buckridge 040.

French:

- The chooser rendered `Choisissez parmi 2 clients rattaches a Lake Freemanhaven Kitchen 001.`
- The same location-scoped customer results rendered with French order and currency labels.

![Location B customer isolation](C:/Users/J%20COMPUTER/.codex/visualizations/2026/08/15/01a003ca-aebe-7050-87b5-038a0ff489d1/pos-location-b-customers-after.jpg)

![French Location A customer scope](C:/Users/J%20COMPUTER/.codex/visualizations/2026/08/15/01a003ca-aebe-7050-87b5-038a0ff489d1/pos-location-a-customers-fr-after.jpg)

No pre-change screenshot was manufactured after implementation. The pre-change state is evidenced by the traced generic action/cache path and the regression tests that fail without location scoping and reset behavior.

## Residual risks and release classification

The capability should remain **implemented / locally verified**, not **production-proven**, until all of the following are complete:

1. Resolve the unrelated repository migration safety gate and run the migration in staging with a retained reconciliation artifact.
2. Run the POS sale-completion and cashier-close end-to-end suites against the migrated staging database, verifying receipt, inventory, cash-session, payment, and accounting consequences.
3. Exercise the mismatch rejection under production-like concurrency and confirm monitoring captures the safe error code without customer PII.
4. Add location assignment to any future customer creation/edit workflow before exposing it in POS.
5. Capture production deployment evidence, rollback evidence, and named operational ownership.

During browser verification, the existing development environment also emitted stale Server Action IDs from older open pages after server rebuilds. Fresh POS tabs completed successfully. Turbopack separately exposed pre-existing runtime type-export defects in `actions/pos/sync.actions.ts` and `actions/evidence/proof-trail.actions.ts`; the webpack development server loaded and verified the scoped POS flow. These defects are outside this location/customer change but should be repaired before relying on Turbopack for release evidence.

