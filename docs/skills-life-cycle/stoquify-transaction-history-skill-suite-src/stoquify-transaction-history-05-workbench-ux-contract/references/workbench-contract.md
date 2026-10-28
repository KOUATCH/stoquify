# Workbench UX Contract And Verification

Use this reference as the normative Stage 05 checklist. `Must` is a release gate; `should` is a documented UX recommendation.

## 1. Vocabulary

- **Complete history**: the complete server-filtered set, traversable with stable cursor ordering and exportable through the same server filter contract.
- **Recent activity**: a bounded preview. State the row limit or time window and link to complete history when one exists.
- **Action queue**: ordered work requiring a role decision or action. It is not an analytics ranking.
- **Overview**: aggregate context that links to domain-owned operational history; it does not claim ledger completeness.
- **Proof**: Stage 02-supported evidence with subject identity, provenance, freshness, access control, and redaction semantics. Raw IDs, hashes, and confidence scores are metadata, not proof.
- **Partial**: one or more named sources are unavailable or incomplete; totals, rows, and exports must identify the affected scope.

## 2. Command Brief

Record before designing or evaluating a workbench:

| Field | Required semantic |
|---|---|
| Role | Named daily operator, supervisor, accountant, controller, or owner |
| Job | The operational outcome to complete today |
| Decision | What the user must determine from the page |
| Primary action | The safe next action, including permission and approval boundary |
| Route | Canonical locale-aware route and reusable shell owner |
| Truth owner | Service or read model that owns filters, arithmetic, ordering, and export |
| Scope | Complete history, recent activity, action queue, or overview |
| Time | Organization timezone and effective-time field |
| Language | EN and FR copy, formatting, status labels, and accessible names |

Do not approve implementation with an incomplete command brief.

## 3. Server Result And URL Contract

The design artifact must require a server result equivalent to:

```ts
type HistoryResult<Row, Summary> = {
  rows: Row[]
  nextCursor: string | null
  appliedFilters: HistoryFilters
  summary: Summary
  asOf: string
  partialSources: string[]
  completeness: "complete" | "recent" | "partial"
}
```

- Freeze complete-history traversal at `recordedThrough` and order it by `(effectiveAt DESC, recordedAt DESC, id DESC)`.
- Apply search, date range, location, type, status, party, actor, and role-specific filters on the server.
- Derive KPIs and the action queue from the same `appliedFilters`; explicitly label any deliberate scope exception.
- Serialize filters, sort, page size, cursor or page position, and `selected` row in the URL. Preserve locale and unrelated safe parameters.
- Reset the cursor when a filter or sort changes. Sanitize invalid parameters to documented defaults.
- Back, forward, refresh, and a copied URL must restore the same visible scope and selected drawer.
- Generate export on the server from `appliedFilters`, excluding presentation-only cursor and selected-row state. Never export only client-visible rows.
- Perform no business arithmetic in the client. Formatting and non-business presentation grouping are allowed.

## 4. Page And Table Anatomy

Use one reusable shell boundary for page framing, URL/filter orchestration, states, table controls, and the page-level drawer. Keep permissions, columns, row mapping, actions, and service ownership in the domain adapter.

Order the page as follows:

1. Command header: role outcome, scope label, organization timezone, and `as of` time.
2. Same-filter KPI strip: only decision-relevant measures.
3. Action queue: blocked, review-required, due, then informational work; expose owner and next action.
4. Server filter bar: active-filter count, reset, shareable URL, and explicit date/time scope.
5. History table: stable sort and pagination, row count semantics, and complete/recent label.
6. One proof/details drawer: opened from the selected row and reflected in URL state.

Each row must expose, directly or in its drawer:

- Primary business reference and counterparty or item.
- Effective time and, when relevant, recorded time.
- Location, session, source, and actor attribution.
- Type and direction, with neutral direction semantics.
- Amount and currency or quantity and unit of measure.
- Separate business, control, reconciliation/posting, and proof states.
- One clear row action; destructive or approval actions require their normal server permission and freshness controls.

Do not make a whole row the only interactive target. Use semantic links or buttons, visible focus, sortable-header state, a table name or caption, text status in addition to color, and a keyboard-reachable overflow region when horizontal scrolling is retained.

## 5. Proof Drawer

- Use one page-level drawer rather than one mounted drawer per row.
- Open from a focusable control, move focus into the drawer, close with `Escape`, and restore focus to the trigger.
- Keep the selected subject in URL state and clear it on close.
- Lead with business identity, amount or quantity, effective and recorded times, lifecycle, actor, and source links.
- Show posting, reconciliation, corrections, evidence provenance, freshness, blockers, and redactions only when supported.
- Translate headings, states, close labels, and unavailable reasons in EN and FR.
- Make an unavailable reason visible or programmatically associated with a focusable control; do not rely on a disabled control's `title`.
- Do not render a proof badge or grade unless Stage 02 explicitly supports that subject and semantic. When unsupported, show a neutral `Proof unavailable` explanation without implying assurance.

## 6. Robust States

| State | Required behavior |
|---|---|
| Loading | Stable skeleton, `aria-busy` or status announcement, no false zero values |
| Empty, no activity | Explain what creates the first transaction and offer a role-safe next step |
| Empty, filtered | State that no rows match, retain filters, and offer reset |
| Error | Safe message, retry, no raw internal detail, preserve URL scope |
| Partial | Name unavailable sources, affected totals or rows, `as of` time, and export limitation |
| No organization | Server-gated organization selection or refresh path; do not fetch tenant data |
| Permission denied | Server-gated denial with safe navigation; do not fetch or flash protected data |

## 7. Mobile, Accessibility, Language, And Time

- At 320px, prevent page-level horizontal overflow. Preserve primary identity, amount or quantity, status, and action through priority columns or a semantic row-card adaptation.
- Keep targets at least 44px where practical and do not require hover. Verify zoom and long EN/FR strings.
- Support logical tab order, visible focus, keyboard filter operation, table action access, drawer focus trap and restoration, and screen-reader announcements for loading and results.
- Source all user-facing copy and accessible names from EN/FR messages. Translate enums; use parameterized sentences; preserve French diacritics.
- Format numbers, currency, and dates with the active locale while applying organization timezone to period boundaries and effective timestamps.
- Test UTC-midnight boundaries and daylight-saving transitions where the configured organization timezone observes them.

## 8. Verification Gates

| Gate | Passing evidence |
|---|---|
| UX-CMD | Complete command brief and canonical route/shell owner |
| UX-SCOPE | Every list labeled complete, recent with bound, queue, or overview |
| UX-DATA | Server owns filters, stable ordering, arithmetic, summaries, and export |
| UX-PARITY | KPI, queue, table, and export tests use identical applied filters or an explicit exception |
| UX-URL | Back/forward/refresh/share tests restore filters, sort, position, locale, and selected row |
| UX-CURSOR | Multi-page test proves no duplicate or missing rows under equal effective timestamps |
| UX-ROW | Row-role and column audit covers identity, time, attribution, value, states, and action |
| UX-PROOF | Stage 02 support is cited; focus, URL selection, redaction, unavailable, and error paths pass |
| UX-STATE | Focused tests cover loading, both empty states, error, partial, no-org, and denied |
| UX-MOBILE | 320px EN and FR checks show no page overflow or loss of primary action/context |
| UX-A11Y | Keyboard-only and automated accessibility checks pass; drawer focus returns to trigger |
| UX-I18N | EN/FR copy and enum checks pass with no hardcoded user-facing fallback |
| UX-TIME | Organization-timezone boundary tests pass for filter range and displayed effective time |
| UX-EXPORT | Server export count and totals match the full filtered result, not the rendered page |

## 9. Stage Handoff

Stage 05 consumes service/read-model contracts and Stage 02 proof support; it does not invent either. Handoff downstream with:

1. Command brief and canonical shell/domain-adapter boundary.
2. URL and server-result contract.
3. Column, action-queue, drawer, state, EN/FR, mobile, and timezone specifications.
4. Gate table with evidence, failures, and exact product files likely to change.
5. Explicit upstream blockers, especially absent Stage 02 proof support or incomplete server truth.
