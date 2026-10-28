# Information Architecture — StockFlow Dashboard Redesign

Phase 2. Answer the 5 questions before drawing anything. Decide what existing widgets survive vs. get cut. Pick a persona; do not try to serve all roles from one screen.

## Primary persona

**Branch Manager / Owner-Operator of a single retail location.** They open `/dashboard` at 8:00–8:30am on a phone or a small laptop before opening the shop. They have ~90 seconds before the first customer walks in. They are the same person who closed yesterday's till and who decides today's reorder. They speak French or English depending on the city; the company runs in both.

(StockFlow has other roles — Cashier, Stock Manager, Accountant, Admin — but Cashier opens the POS not this page; Stock Manager opens `/dashboard/inventory`; Accountant opens `/dashboard/finance`; Admin opens `/dashboard/settings`. The dashboard is the Branch Manager / Owner's room. Other roles will hit it occasionally; they get a degraded but functional view via RBAC gates.)

## The 5 questions answered in writing

### 1. What are the 3 questions they need answered in 5 seconds?

1. **"Did yesterday go OK and is today on track?"** — yesterday's revenue closed at $X, today is at $Y so far vs. an expected pace.
2. **"Is anything about to break?"** — open cash drawers, items below reorder point, late purchase orders, failed sync.
3. **"Did the shift close cleanly?"** — was the till reconciled, are there any unprocessed transactions from yesterday?

These three answers become the **hero strip**: one sentence + one number + one signal color. Above the fold, always visible, no scroll.

### 2. What requires action today? → **Alerts inbox**

- Items at or below reorder point (with one-tap "create PO" action)
- Open cash drawer from a previous shift (with "reconcile" action)
- Purchase orders past expected delivery date (with "follow up" action)
- Failed background sync / Sentry-reported errors in the last 24h (with "view details")

Each alert is dismissable and has one clear next action. This is the only widget on the page that the user is expected to interact with — everything else is read-only awareness.

### 3. What's the one trend they should always watch? → **Sales pace, last 14 days**

A single line chart, no second axis, no second series. Just: revenue per day for the last 14 days, with today as a vertical rule (today is a partial day, so it's annotated, not just drawn as a half-day bar). End-of-line direct label. No legend.

Why 14 days and not 30: a branch manager remembers two weeks. They don't have intuitions about day 22 last month.

### 4. What are the 3-5 actions they're most likely to take from here?

In observed order of likelihood for a branch manager at 8am:
1. **Acknowledge / dismiss an alert** (handled inline by Alerts Inbox)
2. **Create a purchase order for a low-stock item** (inline action from Alerts Inbox row)
3. **Open POS** (they're about to start the day)
4. **View today's transactions so far** (drill from hero strip)
5. **Reconcile a leftover open drawer** (inline from Alerts Inbox)

These five intents are all reachable in ≤2 clicks. We do NOT need a "Quick Actions" tile grid for them — the alerts inbox + a single "Open POS" pinned action covers it. The old 6-button quick actions tile is overweight for what it does; we'll keep one pinned action ("Open POS") in the page header and put the rest in a discreet "More actions" overflow menu.

### 5. What recently happened that they should know about? → **Recent activity feed**

Last ~8 events: POS transactions completed, drawer opens/closes, stock movements, purchase orders received. Each event is one line: timestamp (mono), actor (avatar + name), verb, object, amount if relevant. Scrollable, lazy-loaded, low visual weight (no card chrome — it's a list).

## Existing widget triage — stays vs. goes

Cross-reference of every current widget against the 5 questions:

| # | Current widget | Answers a question? | Decision |
|---|---|---|---|
| 1 | Page header (gradient title "Overview") | No — chrome | **REDESIGN** — replace gradient with serif display + mono eyebrow. Add "Open POS" as the pinned page-header action. |
| 2 | KPI: Total Revenue (cumulative all-time) | Partially — but cumulative all-time is a vanity number, not a today number | **REPLACE** — promote to **Hero strip** answering Q1 with today's revenue, today's pace vs. expected, and yesterday's close. Single hero number, asymmetric grid. |
| 3 | KPI: Total Orders | Same as #2 — wrong granularity | **REPLACE** — fold into hero strip as secondary metric ("X transactions so far"). |
| 4 | KPI: Inventory Items (count) | No — pure vanity | **CUT** — knowing you have 2,847 SKUs is never the answer to a real question. |
| 5 | KPI: Active Customers | No — vanity for B2B SaaS, not retail | **CUT** — for a retail branch, "active customers" is not actionable. (Would survive on a marketing dashboard.) |
| 6 | Chart: Sales & Orders Trend (stacked area, 7 mock months) | Yes, weakly | **REPLACE** — single-line, last 14 days, real data. Answers Q3. |
| 7 | Chart: Inventory Distribution (pie, 4 categories) | No — vanity | **CUT** — pie of categories is a classic "looks busy, says nothing" widget. The slot is reclaimed by the promoted **Low Stock** widget. |
| 8 | Card: Recent Orders (4 hardcoded rows) | Yes — answers Q5 partially | **REPLACE** — generalized "Recent Activity" feed sourced from real actions. Mixed event types, not orders-only. |
| 9 | Card: Low Stock Alerts (4 hardcoded rows + progress bars) | **Yes — directly answers Q2** | **PROMOTE** — this becomes a top-half widget as part of the **Alerts Inbox**, sourced from real inventory data. Add inline "Create PO" action. |
| 10 | Card: Quick Actions (6 oversized buttons) | Weakly — Q4 | **DEMOTE** — replaced by a single pinned "Open POS" action in the page header + an overflow menu for the rest. The 6-tile grid is removed entirely. |

## New widgets the IA requires

| Widget | Answers | Data | Notes |
|---|---|---|---|
| **Status strip** (above page header) | Q2 (system health) | Cash drawer count open, active POS sessions, last sync timestamp, locale/branch indicator | One line, mono, low contrast. The "what's true right now" pattern from Vercel. |
| **Hero today panel** | Q1 | `actions/analytics/todaySnapshot` (NEW) | Asymmetric — hero takes 2/3 width on desktop. Hero number is today's revenue. Secondary metrics: transactions, vs. yesterday delta, vs. average pace. |
| **Alerts inbox** | Q2 | Combine `inventory.lowStock`, `cashDrawer.openSessions`, `purchaseOrders.overdue` | List of items with inline actions. Empty state is **calm** ("Nothing needs your attention.") not "No data." |
| **Sales pace, last 14 days** | Q3 | `actions/analytics/salesPace14d` (NEW) | Single-axis line, today annotated. Direct-labeled end-of-line. |
| **Recent activity feed** | Q5 | Generalized over recent POS sessions, stock movements, PO receipts | Lazy-loaded, low-chrome list. |
| **Pinned action: Open POS** | Q4 | Link only | In page header, brand accent button. RBAC-aware (Owner/Manager/Cashier — yes; Accountant/Admin — hidden). |

## What we are explicitly NOT adding

- No "Customers" widget. Branch managers don't think about customer counts at 8am.
- No category pie chart.
- No "AI insights" / "recommendations" panel. Adds visual weight, low signal.
- No widgets for excluded domains: Presence/HR, AP/AR, ClientOrder, commercial agents (per project memory).
- No real-time websocket feeds. Polling at the documented intervals (30s for cash drawer, 60s for low stock) covers it.

## Layout suggestion (Phase 3 will lock it)

```
┌────────────────────────────────────────────────────────────────────┐
│ status strip — open drawers · POS sessions · last sync · branch    │ ← thin, mono, low contrast
├────────────────────────────────────────────────────────────────────┤
│  EYEBROW: 8:14 AM, FRIDAY                              [ Open POS ]│
│  Good morning, Camille — Yesterday closed at $X,XXX.               │ ← serif display sentence
├──────────────────────────────────────┬─────────────────────────────┤
│                                      │                             │
│   HERO TODAY PANEL (8 cols)          │   ALERTS INBOX (4 cols)     │
│   $Y,YYY revenue · N transactions    │   • 3 items below reorder   │
│   pace: +X% vs yesterday             │   • 1 open drawer (Branch 2)│
│   spark of last 6h                   │   • 1 PO overdue            │
│                                      │                             │
├──────────────────────────────────────┴─────────────────────────────┤
│   SALES PACE — LAST 14 DAYS  (12 cols, single line, direct-labeled)│
├────────────────────────────────────────────────────────────────────┤
│   RECENT ACTIVITY (8 cols)           │   MORE ACTIONS (4 cols)     │
│   list of last 8 events              │   compact link list, RBAC   │
└──────────────────────────────────────┴─────────────────────────────┘
```

Mobile: collapse to a single column, hide the status strip into the Navbar dropdown, alerts inbox before sales pace chart. Page is still useful at 360px wide.
