# IA-NOTES.md — Information Architecture for StockFlow Admin Home

The user said "the admin home page looks really generic." That's a design complaint, but the cure is half design and half information architecture — *what* the page shows, in what order, decides whether it feels useful or decorative.

This document answers the skill's 5 IA questions. Anything that doesn't earn its place is cut.

---

## 1. Who opens this at 8am, and what 3 questions need answering in 5 seconds?

**Primary persona: the Owner / Branch Manager.** (Cashiers open the POS, not this page. Accountants open finance reports, not this page. Stock managers open the inventory module. The admin home serves the person responsible for the *whole shop, today*.)

They open StockFlow at 8am and need to answer:

1. **Did yesterday end clean?** Total sales vs. running average, cash drawer reconciled, any POS sessions still open from the night shift.
2. **What needs me today?** Items below reorder point, purchase orders awaiting approval, customer balances overdue, drawers not yet opened.
3. **Is anything broken right now?** Failed sync, terminal offline, low cash float, expired session.

These three questions become the **Hero KPI Strip** (question 1) and the **Alerts / Needs Action zone** (questions 2 and 3 combined). Nothing else gets first-fold real estate.

---

## 2. What requires action today?

This is the alerts/inbox zone. Not vanity counts — actionable items only:

- **Low stock at reorder threshold** — clickable to the reorder workflow
- **Purchase orders awaiting approval** — clickable to the PO detail
- **POS sessions still open from yesterday** — clickable to close-session flow
- **Cash drawer variances over threshold** — clickable to reconciliation
- **Terminals offline** (if any) — clickable to the terminal status

Each row is one fact + one action. No "view details" indirection — direct routes.

**Cut:** generic "you have 47 notifications" — that's the notifications panel's job, not the dashboard's.

---

## 3. What's the one trend the operator should always be watching?

**Daily sales over the last 14 days, with today's running total overlaid on a faint band of "typical" range.**

Not a stacked area of sales + orders (the current dashboard's pattern — two metrics, no insight). Not a pie chart of inventory distribution (that's a reference, not a trend — belongs on the inventory page).

The widget answers one question: *is today tracking with normal, above, or below?* Inline annotations call out today's number and the comparison; no separate legend, no hover-required reveal.

**Cut:** the inventory distribution pie. Pies are decoration here. If the operator wants category breakdown, they go to the inventory module.

---

## 4. What 3-5 actions are they most likely to take from this page?

Ranked by realistic frequency:

1. **Open today's POS session / view active sessions** (the most common reason to log in is to check what the shop is doing right now)
2. **Approve a purchase order** (if there's one waiting — only shows if needed)
3. **Reorder a low-stock item** (the alert row is itself the action — clicking the alert IS the action)
4. **Record a deposit / cash drawer count** (when reconciling the morning)
5. **Open the daily sales report for yesterday** (the "did yesterday end clean" follow-up)

These become the **Shortcuts strip** at the right rail or as a horizontal action band beneath the hero — NOT a six-button grid of "New Order / Add Item / New Customer / Stock Transfer / Process Payment / View Reports" (that's the current dashboard's pattern and most of those actions are mis-located on a dashboard).

**Cut:** "Add Item," "New Customer" — those are the *settings* of the business, not the operations of today. They live in their respective module headers.

---

## 5. What recently happened they should know about?

**Last 6-10 operational events**, in reverse chronological order:

- Big sales (>2× average transaction)
- New customer added (today only)
- Stock received from a PO
- Cash deposit recorded
- User permission changes
- Session opened/closed

Each row: timestamp (mono), actor, event, optional amount, link to the source object.

**Cut:** the current dashboard's "Recent Orders" list of four fake rows. We replace it with a real activity feed scoped to today (or last 24h). One feed, not two.

---

## Final IA decision — what survives, what's cut, what's added

### Survives (in revised form)
- **Hero numbers** — but as ONE strip, not four cards. Today's sales, # transactions, cash on hand, # active sessions. With sparkline next to each.
- **Sales trend chart** — but redesigned per Datawrapper: inline labels, today annotated, 14-day window with typical-range band, no legend below.
- **Low stock alerts** — but as the alerts zone, merged with PO approvals + open sessions, ordered by urgency, each row clickable.

### Cut
- **Inventory distribution pie chart** (vanity, belongs on inventory page)
- **"Recent Orders" fake list** (replaced by real activity feed)
- **6-button Quick Actions grid** (replaced by 3 context-aware shortcuts)
- **Gradient stat card aesthetic** (entire visual approach)
- **"Total Revenue" lifetime number** (vanity — operators care about today, not lifetime)

### Added
- **Live ticker strip** under the page header — 4-5 numbers refreshed every 30-60s
- **Trend band** showing typical range, so today's number reads in context
- **System health row** at the bottom — sync status, terminal connectivity, last data refresh timestamp (operator confidence)
- **`.dashboard-root` wrapper** carrying the landing-page tokens + fonts into the dashboard scope

### Persona scope
**Owner / Branch Manager only.** No role-switched variants in this pass. Cashiers don't land here. Accountants have their own finance home. Admins use the same view as owners. If later we need a Stock-Manager variant, it's a separate route (`/dashboard/stock-overview`), not a toggle.

### Excluded domains (per project memory)
No widgets for Presence/HR, AP/AR, ClientOrder, or commercial agents. The schema doesn't surface them; the dashboard won't either.
