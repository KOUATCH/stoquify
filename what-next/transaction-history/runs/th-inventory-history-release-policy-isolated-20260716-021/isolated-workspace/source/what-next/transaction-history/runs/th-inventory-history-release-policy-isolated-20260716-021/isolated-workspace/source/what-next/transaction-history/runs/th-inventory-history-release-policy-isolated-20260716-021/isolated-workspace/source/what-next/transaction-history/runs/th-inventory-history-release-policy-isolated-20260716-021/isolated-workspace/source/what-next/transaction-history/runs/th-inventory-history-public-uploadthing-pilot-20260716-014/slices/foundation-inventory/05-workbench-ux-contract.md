# Stage 05 Workbench UX Contract

| Field | Value |
| --- | --- |
| Run | `th-inventory-history-public-uploadthing-pilot-20260716-014` |
| Date | `2026-07-16` |
| Skill | `stoquify-transaction-history-05-workbench-ux-contract` |
| Agent | UX Architect |
| Mode | `implement` |
| Slice | `foundation-inventory` |
| Verdict | `PASS_FOR_STAGE_06_HANDOFF` |

## Command Brief

| Field | Contract |
| --- | --- |
| Daily role | Warehouse manager, inventory controller, owner/accountant reviewer |
| Job to be done | Explain, reconcile, and export inventory movement history for an item, location, transaction type, date range, and trusted effective-as-of cutoff |
| Decision | Decide whether the selected stock movement is normal, needs explanation, needs correction/reversal, or needs downstream proof review |
| Primary action | Inspect row details, reset/share filters, request export, open source/correction/reversal entry points only when server permissions allow them |
| Canonical route | `/[locale]/dashboard/inventory/movements` for the current pilot; Stage 06 may introduce a dedicated reusable history shell under the same dashboard locale boundary |
| Permission boundary | Read: `inventory.levels.read`; export/background export/download grant: `reports.export` with fresh authentication where the action contract requires it |
| Truth owner | `services/inventory/inventory-read.service.ts` owns filters, ordering, summary arithmetic, timezone, cursor, snapshot, completeness, and export stream |
| History scope | `Complete history` for the new movement-history action/read model; the legacy `StockMovementDashboard` list remains `Recent activity` because it uses a fixed client request limit |
| Time contract | Use organization timezone from the service result, not browser timezone; show `snapshot.recordedThrough`, optional `snapshot.effectiveAsOf`, and generated/as-of time distinctly |
| Language | EN/FR message keys must own all visible copy, table labels, status text, unavailable reasons, drawer labels, and accessible names |

## Evidence Summary

- The current route gates `/dashboard/inventory/movements` with `inventory.levels.read`, then renders `StockMovementDashboard`.
- The current dashboard keeps filters in client state, requests `limit: 100`, and renders hardcoded English copy. That surface should be treated as a visual reference and recent-activity baseline, not the final complete-history workbench.
- The new action `getInventoryMovementHistoryAction` delegates tenant identity to `protect`, accepts only server-validated filters, and calls `readInventoryMovementHistory`.
- The new export actions require `reports.export`; direct export and background export require fresh authentication.
- The read model validates `pageSize` as 25/50/100, derives organization timezone, freezes `recordedThrough`, orders by `(effectiveAt desc, recordedAt desc, id desc)`, returns `pageInfo`, `appliedFilters`, `summary`, `snapshot`, and `completeness`, and streams export pages from the same read model.
- Stage 02 evidence supports internal RBAC/fresh-auth/no-external-exposure boundaries, but does not provide a user-facing inventory movement proof-grade badge. Stage 06 must therefore show neutral proof/detail status until a subject-specific proof contract exists.

## Required Stage 06 Product Contract

### Shell Boundary

Stage 06 should introduce a shared history shell for inventory movement history:

- Page framing, URL parsing, filter orchestration, robust states, table controls, export state, and one page-level drawer belong in the shared shell.
- Inventory-specific permissions, columns, row mapping, row actions, labels, and service calls belong in an inventory domain adapter.
- Do not put business arithmetic, cursor ordering, export assembly, permission checks, or proof semantics in the component.

### URL State

The workbench URL must preserve:

- `itemId`
- `locationId`
- `type`
- `dateFrom`
- `dateTo`
- `effectiveAsOf`
- `pageSize`
- `cursor`
- `selected`
- active tab or view, if retained

Rules:

- Reset `cursor` when any filter, sort, or page size changes.
- Preserve locale and unrelated safe parameters.
- Back, forward, refresh, and copied URL must restore the same visible filter scope and selected drawer.
- Invalid parameters must be sanitized to documented defaults before calling the server.

### Server Result Contract

Stage 06 must consume the service result as authoritative:

- `rows`
- `pageInfo.nextCursor`
- `pageInfo.hasMore`
- `appliedFilters`
- `summary`
- `snapshot.recordedThrough`
- `snapshot.effectiveAsOf`
- `snapshot.generatedAt`
- `snapshot.timezone`
- `completeness`

KPIs, table count language, action queue, drawer subject, and export request must use `appliedFilters`. If a metric intentionally uses a broader scope, the label must say so.

### Page Anatomy

Order the page as:

1. Command header: role outcome, `Complete history` scope label, organization timezone, `recordedThrough`, and optional `effectiveAsOf`.
2. KPI strip: transaction count, inbound quantity, outbound quantity, net quantity, value impact, and affected item/location count only when the service supplies them.
3. Action queue: partial-source warning, export pending/failed/ready, correction/reversal-needed status, and unavailable proof state. Do not invent business risk from direction alone.
4. Server filter bar: item, location, type, date range, effective-as-of, page size, active filter count, reset, share, export.
5. Table: stable cursor paging, complete-history label, primary identity, effective time, recorded time, item, location, type, direction, quantity/unit, value/currency, source reference, business/control/proof status, and row action.
6. One page-level drawer keyed by `selected`.

### Row Contract

Each row must expose:

- movement reference or fallback human reference
- item name and SKU
- location
- transaction type
- neutral direction: inbound, outbound, transfer, adjustment, reservation, or correction
- effective time and recorded time
- quantity and unit
- value and currency, if present
- actor/source attribution where available
- business status, control status, and proof status as separate text states
- one clear action: inspect details

Direction color must not imply risk. Risk/control status needs its own text and badge.

### Drawer Contract

The drawer must:

- be mounted once at page level
- open from a focusable table action
- move focus into the drawer
- close with `Escape`
- restore focus to the opener
- keep `selected` in URL state and clear it on close
- show identity, item, location, effective/recorded times, quantity, value, type, direction, actor, source reference, correction/reversal links when supported, export inclusion status, and unavailable proof reason

Do not show a proof grade or proof badge yet. Stage 02 currently supports access/fresh-auth/no-exposure boundaries, not an inventory movement proof-grade subject with provenance/freshness/redaction semantics.

### Robust States

Stage 06 must implement:

- loading skeleton with status announcement and no false zero values
- empty unfiltered state with role-safe next step
- empty filtered state retaining filters and offering reset
- safe error state with retry and preserved URL scope
- partial state naming affected source and export limitation
- no active organization state with no tenant data fetch
- permission denied state with no protected-data flash
- export queued/running/ready/failed/expired states

### Mobile And Accessibility

At 320px:

- no page-level horizontal overflow
- preserve row identity, quantity/value, status, and inspect action
- allow horizontal table region only when keyboard-reachable and labelled
- provide visible focus for filters, table actions, pagination, export, and drawer controls
- use text status in addition to color

Keyboard and screen reader requirements:

- table caption or accessible name
- sortable header state if sorting is exposed
- result count/status announcement
- drawer focus trap and restoration
- non-disabled focusable proof-unavailable control with associated explanation

### EN/FR And Time

Stage 06 must add message keys for all user-facing text. Do not keep the current hardcoded English labels from `StockMovementDashboard`.

Dates:

- Filter date boundaries use organization timezone.
- Effective and recorded timestamps must say which timestamp is displayed.
- Use active locale formatting with organization timezone applied.

## Gate Results

| Gate | Result | Evidence |
| --- | --- | --- |
| UX-CMD | PASS | Command brief completed above |
| UX-SCOPE | PASS | New action/read model supports complete history; legacy component is explicitly classified as recent activity |
| UX-DATA | PASS | `readInventoryMovementHistory` owns filters, cursor, summary, snapshot, completeness, and export stream |
| UX-PARITY | PASS | Tests cover same tenant-timezone predicate across rows and exact summary |
| UX-URL | GAP | No product workbench URL-state implementation exists yet |
| UX-CURSOR | PASS | Tests cover frozen cutoff and strict tuple cursor across equal-time pages |
| UX-ROW | PASS_FOR_CONTRACT | Required row anatomy specified; Stage 06 must map real fields |
| UX-PROOF | GAP | Stage 02 supports access/fresh-auth boundaries but not inventory movement proof-grade badges |
| UX-STATE | GAP | Current product states are incomplete for partial, denied, no-org, export lifecycle, and drawer proof-unavailable behavior |
| UX-MOBILE | GAP | Existing table uses horizontal overflow; 320px priority-row behavior still needs Stage 06 implementation |
| UX-A11Y | GAP | Drawer, focus restoration, URL-selected row, and screen-reader result announcements are not implemented |
| UX-I18N | GAP | Existing dashboard contains hardcoded English strings |
| UX-TIME | PASS_FOR_SERVICE | Service owns organization timezone; Stage 06 must render it explicitly |
| UX-EXPORT | PASS_FOR_SERVICE | Direct/background export use server-owned filters; Stage 06 must wire UX states |

## Downstream Handoff

Likely Stage 06 files:

- `app/[locale]/(dashboard)/dashboard/inventory/movements/page.tsx`
- `components/inventory/movements/StockMovementDashboard.tsx` or replacement adapter/shell files under `components/dashboard/history/`
- `actions/inventory/inventoryMovementHistoryActions.ts`
- `actions/inventory/inventoryMovementHistoryBackgroundExportActions.ts`
- `messages/en.json`
- `messages/fr.json`
- focused component/action tests for URL state, robust states, drawer focus, mobile behavior, EN/FR copy, and export lifecycle

Stage 06 should not show a proof badge until a later Stage 02-style inventory proof-subject contract exists.

## Residual Risk

The UX contract is ready for Stage 06 implementation, but production release still has three explicit risks:

1. Public UploadThing storage is a pilot exception and remains a go-live blocker from Stage 04.
2. Inventory movement proof badges are not supported yet.
3. The visible product page still uses the older client-local recent-activity dashboard until Stage 06 replaces or wraps it.
