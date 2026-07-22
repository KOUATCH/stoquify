# Stage 05 Workbench UX Contract - Cash Payment

| Field | Value |
| --- | --- |
| Run | `th-cash-payment-security-accounting-remediation-20260717-024` |
| Date | `2026-07-17` |
| Skill | `stoquify-transaction-history-05-workbench-ux-contract` |
| Agent | UX Architect |
| Mode | `implement` |
| Slice | `cash-payment` |
| Verdict | `PASS_FOR_STAGE_06_HANDOFF` |

## Command Brief

| Field | Contract |
| --- | --- |
| Daily role | Cashier for own cash/payment history; finance manager, cashier supervisor, owner/accountant reviewer for all cashiers and payment reconciliation context |
| Job to be done | Explain cash drawer events and captured payments for a trusted tenant, cashier, location, method, status, date range, and as-of cutoff without mixing physical cash and electronic tenders |
| Decision | Decide whether a cash/payment row is normal, needs drawer review, needs payment reconciliation, needs correction, or needs export/evidence review |
| Primary action | Inspect row details, reset/share filters, request server export, open drawer/session/payment/reconciliation source links only when server permissions allow them |
| Canonical route | Stage 06 should add a locale-aware complete-history surface under the dashboard boundary, preferably reusing `components/dashboard/history/TransactionHistoryWorkbenchShell.tsx` with a cash-payment adapter. Candidate route: `/[locale]/dashboard/finance/cash-payment-history`; existing related surfaces are `/dashboard/cashDrawer`, `/dashboard/finance/cash-drawer`, `/dashboard/finance/cash-command`, `/dashboard/finance/payments`, and `/dashboard/finance/reconciliation`. |
| Permission boundary | Own cashier read: `pos.read` or `OPERATE_POS`; manager read: `finance.cash-drawer.read`, `finance.read`, `payments.reconciliation.read`, or `finance.payments.read`; export: `payments.export` or `reports.export` with fresh authentication |
| Truth owner | `services/pos/cash-payment-history.service.ts` owns filters, access mode, organization timezone, stable cursor, recorded-through cutoff, ordering, arithmetic, redaction, completeness, and summaries; `actions/pos/cash-payment-history.actions.ts` owns server access, module enforcement, and export preparation |
| History scope | `Complete history` for the new cash/payment read model; existing cash drawer and payment reconciliation dashboards remain operational overview or action queues, not full transaction history pages |
| Time contract | Use organization timezone from the service result. Display effective time and recorded time separately. Freeze complete-history traversal at `snapshot.recordedThrough`. |
| Language | EN/FR message keys must own all copy, table labels, enum labels, unavailable proof reasons, drawer labels, filter labels, and accessible names |

## Evidence Summary

- Stage 02 now supports tenant/module enforcement, own-vs-manager access mode, redaction, cursor safety, export safety, and fresh-auth export preparation for cash/payment history.
- Stage 03 now supports physical-cash rollforward semantics, electronic tender exclusion from physical cash, counted cash variance, recorded-through cutoff, and reconciliation state separation.
- Stage 04 added `services/pos/cash-payment-history.schemas.ts`, `services/pos/cash-payment-history.service.ts`, and `actions/pos/cash-payment-history.actions.ts` with focused Jest and ESLint verification.
- `components/dashboard/history/TransactionHistoryWorkbenchShell.tsx` already provides a reusable command-header, KPI, filter, table, robust-state, export, mobile-card, and details-drawer shell that Stage 06 can adapt.
- `components/pos/CashDrawerManagementDashboard.tsx` is an operational dashboard with client-managed period/location filters and drawer metrics; it should not be relabeled as complete history.
- `components/finance/PaymentReconciliationWorkbench.tsx` is a reconciliation command center and proof workflow; it should link to or coexist with cash/payment history, not be overloaded as the generic transaction-history table.

## Required Stage 06 Product Contract

### Shell Boundary

Stage 06 should introduce a cash-payment domain adapter that reuses the shared transaction-history shell where possible.

- Shared shell owns page framing, URL parsing, filters, robust states, table controls, export state, pagination, and one page-level drawer.
- Cash/payment adapter owns permissions, action calls, row mapping, KPI labels, drawer sections, enum labels, route-specific source links, and role-safe actions.
- Business arithmetic, filter truth, cursor ordering, access checks, export generation, and redaction must stay server-owned.

### URL State

The Stage 06 URL must preserve:

- `lane`
- `locationId`
- `cashierId`
- `paymentMethod`
- `paymentStatus`
- `cashType`
- `dateFrom`
- `dateTo`
- `effectiveAsOf`
- `pageSize`
- `cursor`
- `selected`

Rules:

- Reset `cursor` when any filter or page size changes.
- Preserve locale and unrelated safe parameters.
- Back, forward, refresh, and copied URL must restore the same visible scope and selected drawer.
- Invalid parameters must be sanitized to server defaults before calling `getCashPaymentHistoryAction`.
- Export must send `appliedFilters` without presentation-only cursor or selected-row state.

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

KPIs, table count language, action queue, drawer subject, and export request must use `appliedFilters`. Any broader-scope metric must be explicitly labeled.

### Page Anatomy

Order the page as:

1. Command header: role outcome, `Complete history`, access mode, organization timezone, `recordedThrough`, and optional `effectiveAsOf`.
2. KPI strip: transaction count, opening float, cash inflows, cash outflows, expected physical cash, counted cash, cash variance, electronic tender total, and unresolved payments when supplied by the service.
3. Action queue: cash variance, unresolved payments, suspense/exception payment rows, partial-source warnings, export status, and proof unavailable state.
4. Server filter bar: lane, location, cashier, payment method, payment status, cash type, date range, effective-as-of, page size, active filter count, reset, share, export.
5. Table: stable cursor paging, complete-history label, row identity, effective time, recorded time, lane, type, direction, amount/currency, location, cashier, drawer/session or payment reference, business status, control status, reconciliation state, redaction/proof status, and inspect action.
6. One page-level drawer keyed by `selected`.

### Row Contract

Each row must expose:

- cash event id or payment number/source id
- lane: cash or payment
- source type and source id
- amount, currency, and direction using neutral inflow/outflow/neutral semantics
- physical cash impact and electronic tender exclusion flag
- effective time and recorded time
- location, cashier, terminal, drawer, and session where available
- payment method, payment status, provider reference redaction state, ledger posting batch id, and reconciliation state where available
- business status, control status, and proof status as separate text states
- one clear action: inspect details

Direction color must not imply risk. Risk/control status needs its own text and badge.

### Drawer Contract

The drawer must:

- be mounted once at page level
- open from a focusable table or mobile-card action
- move focus into the drawer
- close with `Escape`
- restore focus to the opener
- keep `selected` in URL state and clear it on close
- show identity, lane, source, amount, physical/electronic treatment, location, cashier, drawer/session/payment reference, effective/recorded times, lifecycle, reconciliation state, posting batch id, redactions, and source links when available

Do not show a proof grade or proof badge yet. Stage 02 supports access, redaction, cursor, and export boundaries, but it does not define a cash/payment proof-grade subject contract with provenance and freshness semantics.

### Robust States

Stage 06 must implement:

- loading skeleton with status announcement and no false zero values
- empty unfiltered state with role-safe next step
- empty filtered state retaining filters and offering reset
- safe error state with retry and preserved URL scope
- partial state naming affected source and export limitation
- no active organization state with no tenant data fetch
- permission denied state with no protected-data flash
- export preparing/ready/blocked/failed states

### Mobile And Accessibility

At 320px:

- no page-level horizontal overflow
- preserve row identity, amount, direction/status, and inspect action
- allow horizontal table region only when keyboard-reachable and labelled
- provide visible focus for filters, table actions, pagination, export, and drawer controls
- use text status in addition to color

Keyboard and screen reader requirements:

- table caption or accessible name
- result count/status announcement
- drawer focus trap and restoration
- non-disabled focusable proof-unavailable control with associated explanation

### EN/FR And Time

Stage 06 must add message keys for all user-facing text. Dates and filters must use organization timezone. Effective and recorded timestamps must say which timestamp is displayed.

## Gate Results

| Gate | Result | Evidence |
| --- | --- | --- |
| UX-CMD | PASS | Command brief completed above |
| UX-SCOPE | PASS | New read model supports complete history; existing dashboards are classified as overview/action queue |
| UX-DATA | PASS | `readCashPaymentHistory` owns filters, cursor, access mode, summary, snapshot, redaction, and completeness |
| UX-PARITY | PASS | Focused tests cover same-filter summary semantics and service-owned cash/payment treatment |
| UX-URL | GAP | No product cash-payment history URL-state implementation exists yet |
| UX-CURSOR | PASS_FOR_SERVICE | Shared cursor codec and Stage 04 read model own cursor verification; Stage 06 must test URL cursor behavior |
| UX-ROW | PASS_FOR_CONTRACT | Required row anatomy specified; Stage 06 must map real fields |
| UX-PROOF | GAP | Stage 02 supports access/redaction/export boundaries but not proof-grade cash/payment badges |
| UX-STATE | GAP | Product robust states for this new surface are not implemented yet |
| UX-MOBILE | GAP | Product mobile behavior for this new surface is not implemented yet |
| UX-A11Y | GAP | Drawer focus, URL-selected row, and screen-reader result announcements need Stage 06 tests |
| UX-I18N | GAP | EN/FR copy for the cash-payment history workbench is not implemented yet |
| UX-TIME | PASS_FOR_SERVICE | Service owns organization timezone; Stage 06 must render it explicitly |
| UX-EXPORT | PASS_FOR_SERVICE | Export preparation uses server controls; Stage 06 must wire visible export states |

## Downstream Handoff

Likely Stage 06 files:

- `app/[locale]/(dashboard)/dashboard/finance/cash-payment-history/page.tsx` or another approved locale-aware route under the dashboard finance boundary
- `components/dashboard/history/TransactionHistoryWorkbenchShell.tsx` only if the shared shell needs small generalization
- `components/finance/CashPaymentHistoryWorkbench.tsx` or `components/pos/CashPaymentHistoryWorkbench.tsx`
- `components/finance/cashPaymentHistoryAdapter.ts` or equivalent domain adapter
- `hooks/useCashPaymentHistoryWorkbench.ts` or equivalent URL-state hook
- `actions/pos/cash-payment-history.actions.ts`
- `messages/en.json`
- `messages/fr.json`
- focused tests for route permission behavior, URL state, robust states, drawer focus, mobile behavior, EN/FR copy, and export state

Stage 06 should not edit AP, AR, client, supplier, or cashier-specific party history pages. Those remain separate future slices or stages.

## Residual Risk

The UX contract is ready for Stage 06 implementation, but product visibility is still pending because no frontend route, adapter, hook, messages, or component tests for cash/payment history have been added yet. Full `npm run typecheck` also remains blocked by Node heap out-of-memory from Stage 04 verification and must be rerun with an adjusted environment before release signoff.
