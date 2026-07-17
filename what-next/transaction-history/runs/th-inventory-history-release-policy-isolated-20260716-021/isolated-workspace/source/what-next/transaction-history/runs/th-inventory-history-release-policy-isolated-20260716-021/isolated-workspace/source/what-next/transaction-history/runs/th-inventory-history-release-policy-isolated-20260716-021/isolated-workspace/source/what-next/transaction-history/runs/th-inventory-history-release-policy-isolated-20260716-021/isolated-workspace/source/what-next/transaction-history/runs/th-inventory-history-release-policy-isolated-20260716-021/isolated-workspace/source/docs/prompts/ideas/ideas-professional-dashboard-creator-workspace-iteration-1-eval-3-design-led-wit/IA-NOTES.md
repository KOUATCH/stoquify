# Information Architecture — Stats Page

This is the IA notes document for `/dashboard/stats` (and `/fr/dashboard/stats`). It answers the Phase 2 questions before any contract or code is written.

The user asked for a "beautiful stats page" — not an operator cockpit. That subtle framing matters: a **stats page is trend-heavy and reflective**, while the operator dashboard is alert-heavy and action-oriented. They serve different moments. We design accordingly.

---

## 1. Primary persona

**The Owner / General Manager** of a small-to-mid retail business running on StockFlow.

- Opens the stats page **on Monday morning at 8am** or after closing on Sunday.
- Mood: reflective, not reactive. Not putting out fires — *understanding the business*.
- Goal: answer the question "how are we doing?" with enough nuance to make weekly decisions (staffing, restock, marketing push).
- Device: 13–15" laptop primarily; occasional phone glances. **Not** a tablet wall display.
- Tolerates 0 jargon. Tolerates *some* density if it earns its place with clarity.

A secondary persona — Branch Manager — gets the same page but scoped to their branch. The IA does not change; only the `locationId` filter does. Cashiers do not use this page.

## 2. The three 8am questions

The hero KPI strip must answer these in **5 seconds**:

1. **"Is revenue up or down vs. the comparable prior period?"** → Revenue KPI with a delta vs. previous period of equal length.
2. **"Are we making money on what we're selling?"** → Gross margin % with a delta.
3. **"How many baskets did we ring up, and what's the average?"** → Transactions count + AOV (average order value), with deltas.

Three KPIs, not four, not six. The default range is **last 7 days vs. previous 7 days**. The range selector offers 24h / 7d / 30d / 90d / YTD.

## 3. The one trend to always watch

**Daily revenue series for the selected range, with a 7-day moving average overlay.** This is the centerpiece chart. Everything else on the page is in service of explaining what this line is doing.

The chart includes:
- The raw daily line (slightly muted)
- The 7-day moving average (bolder, the protagonist)
- A shaded comparison range showing prior period (faint band)
- An *editorial italic caption* below the title: "Revenue is up 14% vs. prior 7 days, driven mostly by weekend volume." (Auto-generated from a tiny rule-based summarizer in the action — not AI, just an `if (delta > 5 && weekendShare > 0.55) ...` shaped helper.)

## 4. What requires action today?

The stats page is **not** the alerts inbox — that lives on the operator dashboard. But the stats page *does* include a small "Watchlist" zone for **anomalies the operator should investigate**:

- Items whose sales velocity dropped >40% week-over-week
- Categories whose margin compressed >5pp week-over-week
- A single best-day callout ("Best day this week: Saturday, $4,210")

This is short — 3 to 5 items, never a wall of warnings. Click-through goes to the relevant item / category page.

## 5. The 3–5 most likely actions from here

These become the "next step" affordances, placed in the page header next to the range selector:

1. **Export PDF report** (the most-requested action for an owner)
2. **Compare branches** (toggles a per-branch breakdown view)
3. **Open finance reports** (drill into `/dashboard/finance`)
4. **Schedule weekly email** (a "send me this every Monday" toggle)

We do *not* include "create order" / "add item" — those belong on the operator dashboard.

## 6. What recently happened?

Not a live feed. Instead: **a 7-day mini-calendar heatmap of revenue by hour-of-day × day-of-week** — the "when does this business pulse" visualization. Each cell is a hour, color-intensity is revenue, hover reveals the exact number. This is the page's signature visual — pure Datawrapper / Pudding inspiration.

## 7. Vanity metrics we deliberately exclude

- "All-time revenue" — not a stats-page question
- "Total customers" (lifetime) — irrelevant unless segmented
- "Total items in catalog" — belongs on items page
- Any presence/HR widget (excluded domain)
- Any AP/AR widget (excluded domain)
- Any commercial-agent leaderboard (excluded domain)

## 8. Page layout in priority order (top → bottom)

```
┌──────────────────────────────────────────────────────────────┐
│ Page header: title + range selector + actions (Export, etc.) │
├──────────────────────────────────────────────────────────────┤
│ HERO KPI STRIP — 3 tiles, each with sparkline               │
│   Revenue · Margin · Transactions+AOV                        │
├──────────────────────────────────────────────────────────────┤
│ REVENUE TREND CHART — full-bleed, with italic takeaway      │
│   Daily line + 7-day MA + prior-period band                  │
├──────────────────────────────────────────────────────────────┤
│ TWO-UP ROW:                                                  │
│   ┌──── Hour×Day Heatmap ────┐  ┌──── Top 5 Items ────┐    │
│   │ When does this pulse?    │  │ revenue + qty + Δ%   │    │
│   └──────────────────────────┘  └──────────────────────┘    │
├──────────────────────────────────────────────────────────────┤
│ WATCHLIST — anomalies worth investigating (3–5 rows)        │
│                                                              │
├──────────────────────────────────────────────────────────────┤
│ CATEGORY MIX — small stacked bar, secondary                 │
└──────────────────────────────────────────────────────────────┘
```

Two viewport heights at desktop. Mobile collapses two-up to stack and hides the hour×day heatmap behind a "View hourly pattern" disclosure (it's a desk-class viz).

## 9. Empty-state semantics

This is a **new** business state. If a brand-new tenant opens the stats page with 0 transactions:

- KPI strip shows zeros with a *muted* delta arrow and the message "No comparable period yet — come back after your first week of sales."
- Trend chart shows the empty illustration (a single muted hairline + the message) with a CTA: "Open the POS to ring your first sale."
- Watchlist shows a calm "Nothing to investigate. Add your first inventory item to get started."

Empty states use the operator's voice — calm, never apologetic, never "Oops!".

## 10. Permissions

Server-side gate using `actions/roles/`. Visibility:

- **Owner / Admin:** sees the full page, all branches.
- **Branch Manager:** sees the page scoped to their branch; the "Compare branches" action is hidden.
- **Stock Manager / Accountant:** sees the page but only their relevant widgets (stock manager: hour×day heatmap + watchlist for inventory; accountant: KPIs + revenue trend, no watchlist).
- **Cashier:** redirect to `/dashboard` operator view. Cashiers do not see stats.

Permissions are checked in the page server component before any widget renders — no client-side hiding (would leak shape).

---

## Open questions for the user before contract

1. Default range — **7d** (chosen) — confirm or override?
2. Best-day callout: include in hero or move into watchlist?
3. PDF export: is `actions/analytics/requestDailySalesReport.ts` the right home for the new "stats range PDF" action, or do we add `actions/analytics/exportStatsPDF.ts`?
4. Italic auto-takeaway: ship in v1 or defer? (Adds ~30 min of action work.)

If no answer, the contract assumes the defaults bolded above.
