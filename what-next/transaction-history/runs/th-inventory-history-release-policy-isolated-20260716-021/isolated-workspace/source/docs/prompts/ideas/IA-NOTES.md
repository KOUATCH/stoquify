# Information Architecture Notes

Phase 2 — answers the 5 IA questions before any design contract is drafted.

## Primary persona

**Branch Manager / Owner-operator of a small-to-mid retail store using StockFlow.** Opens the dashboard at 8am from their phone or office laptop. Has a coffee, has 30-90 seconds. Wants to know if yesterday was good, if today is starting normally, and if anything is on fire. Will then either go to POS (rare — that's the cashier's job), purchase orders (today's reorders), or inventory (resolve a low-stock alert).

Secondary personas — explicitly NOT served on this screen:

- **Cashier:** does not open a dashboard. They open `/dashboard/pos`. If we eventually build a cashier surface, it's a *shift summary*, not an operations console — separate screen.
- **Accountant:** needs P&L and cash-flow reports, not at-a-glance. They go to `/dashboard/finance/profit-loss`. Don't try to serve them here.
- **Stock manager:** overlaps heavily with branch manager — same dashboard is fine for them.

## Q1 — The 3 questions the operator needs answered in 5 seconds at 8am

These become the **Hero KPI band**:

1. **"How did yesterday close, and how is today starting?"** → Today's net sales (with delta vs yesterday-same-time and a 7-day sparkline).
2. **"Is anything blocking sales right now?"** → Active POS sessions count + any open cash drawer at another terminal (a "drawer left open overnight" is a real incident).
3. **"How much stock pain do I have today?"** → Count of items below reorder point + critical (out-of-stock) count, with one-tap drill-in.

**Cuts that were tempting:** total-revenue-this-month, total-customers-ever, total-items-ever. Vanity. They go on `/dashboard/analytics`, not here.

## Q2 — What requires action today?

Becomes the **Alerts & Inbox zone** (single column, scrollable list, max 8 visible, "view all" link):

- Items below reorder point (with branch, suggested order qty, last supplier).
- Pending purchase orders awaiting approval (count + drill-in).
- Open cash drawers > 30 min unattended.
- Failed inbound stock movements (transfer in pending receipt).

Each alert has: severity dot (amber/red), one-line description, timestamp, primary CTA button. Dismissable where reasonable; persistent where it represents real work to be done.

## Q3 — The one trend they should always be watching

Becomes the **Trend strip** (single chart, full row width, ~180px tall):

**Net sales over the last 30 days**, with branch picker (if multi-branch), annotated with **today's running total vs same-day-of-week average**. One sentence callout above the chart: *"Today is tracking 12% ahead of the average Monday."* (Pudding-style annotation — the sentence is the actual takeaway; the chart is the proof.)

Optional toggle: switch between Net sales / Transactions count / Average ticket.

## Q4 — The 3-5 most likely actions from here

Becomes the **Quick Actions** strip (top-right of hero band, persistent on mobile as a sticky FAB stack):

1. **New purchase order** — most common reorder flow.
2. **Receive shipment** — second most common (PO marked received).
3. **Open POS** — for the rare cases the owner backs up a cashier.
4. **New stock transfer** — between branches.
5. **Create item** — onboarding a new SKU.

Gated by RBAC: cashier-only roles never see "Create item." Use the existing role-checking pattern in `actions/roles/`.

## Q5 — What recently happened they should know about

Becomes the **Recent Activity feed** (right column on desktop, bottom row on mobile, max 10 visible, "view all"):

- Sales completed (timestamp, branch, cashier, amount).
- Purchase orders created/received/approved.
- Stock transfers initiated/received.
- User invitations accepted (rare but useful).
- Inventory adjustments (write-offs, count corrections — sensitive, flag in audit log).

Each row: mono timestamp on the left, sentence with bold entity in the middle, optional drill-in chevron on the right. Mono everywhere a number, date, or branch code appears (per landing's typography rule).

---

## Layout consequence — the bento shape

```
+---------------------------------------------------------------+
| GREETING + QUICK ACTIONS strip                                |
+---------------------------------------------------------------+
| LEAD KPI (large, sparkline inside)  | KPI 2     | KPI 3      |
|   today's net sales                 | sessions  | stock pain |
+---------------------------------------------------------------+
| TREND STRIP — net sales 30 days + annotated callout sentence  |
+-----------------------------------+---------------------------+
| ALERTS INBOX (left, 2/3 width)    | RECENT ACTIVITY FEED      |
|   items needing action            | (right, 1/3 width)        |
|   (max 8, scrollable, view all)   | (max 10, scrollable)      |
+-----------------------------------+---------------------------+
| SYSTEM HEALTH STRIP — branches online, last sync, drawer state |
+---------------------------------------------------------------+
```

Mobile: stacks top-to-bottom in the same order. Quick actions collapse into a FAB. Trend strip becomes a swipe-tab (chart 1: sales, chart 2: transactions, chart 3: ticket). Alerts and Activity stack instead of side-by-side.

## Cuts intentionally not on this screen

- **Top products** — useful but belongs on `/dashboard/analytics`. Not a daily question.
- **Cashier performance** — Owner cares weekly, not daily. Goes to analytics.
- **Customer leaderboard** — vanity. Belongs on customers detail page.
- **Anything from excluded domains** (HR/presence, AP/AR, ClientOrder, commercial agents — explicitly out per project memory).
- **Total-revenue-all-time** — meaningless metric. Operators care about *today vs yesterday*, not lifetime.

## Operator question test

> "If I am the branch manager at 8am and I have 30 seconds, can I answer: did yesterday close OK, am I starting today OK, is anything broken, what should I do first?"

The proposed layout answers all four within the first viewport (above the trend strip). The trend strip explains the "why" of the lead KPI. The alerts inbox tells them what to do first. The activity feed is the "did anything happen overnight" answer.

If we can't honestly say yes to that, the IA is wrong and we go back.
