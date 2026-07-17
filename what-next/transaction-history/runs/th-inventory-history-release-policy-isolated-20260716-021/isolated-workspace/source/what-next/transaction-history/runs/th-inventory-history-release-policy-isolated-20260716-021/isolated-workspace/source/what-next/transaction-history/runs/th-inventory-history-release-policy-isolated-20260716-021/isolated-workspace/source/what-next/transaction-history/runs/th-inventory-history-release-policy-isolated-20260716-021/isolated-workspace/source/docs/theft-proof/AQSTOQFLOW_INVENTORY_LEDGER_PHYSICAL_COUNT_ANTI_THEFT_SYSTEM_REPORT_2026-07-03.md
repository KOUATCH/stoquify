# AqStoqFlow Inventory Ledger And Physical Count Anti-Theft System Report

Original report date: 2026-07-03
Regenerated on: 2026-07-11
Workspace: E:\ohada saas\Focused projects\stoquify
Folder: docs/theft-proof

## Executive Summary

The inventory ledger plus physical count module should be treated as one of the strongest anti-theft controls in the SMB platform.

It does not physically stop every dishonest person from removing goods. What it does is remove the silence that theft depends on.

The control idea is simple:

- The inventory ledger says what stock should exist.
- The physical count says what stock actually exists.
- The variance workflow says who must explain the difference.
- The owner dashboard shows repeated patterns before they become a crisis.

The right product language is:

> The inventory ledger plus physical count module turns stock from a trust-based asset into an evidence-controlled asset. It does not wait for the owner to discover losses months later; it continuously compares what should exist with what physically exists, then forces every difference into an accountable investigation workflow.

## Why This Matters For SMBs

In many OHADA-zone and African SMBs, owners lose stock through small repeated leaks:

- stock leaves without a sale
- goods are transferred but not fully received
- supplier deliveries are recorded as complete even when short
- damaged or expired items are exaggerated
- stock quantities are manually corrected to hide shortages
- high-value items disappear slowly over time
- staff share passwords, making accountability weak

Without strong controls, the owner only discovers the loss late, usually after cash flow, customer service, and margins are already damaged.

## Core Terms

### Inventory Ledger

The inventory ledger is the permanent record of stock movements. It should show every sale, purchase receipt, transfer, write-off, physical count adjustment, damage, expiry, and correction.

It is not just a current stock number. It is the story behind that number.

### Physical Count

A physical count is when staff count the real stock on shelves, in the store, in the warehouse, or in branches.

The system compares that count with the stock it expected to find.

### Variance

A variance is the difference between expected stock and counted stock.

Example: the system expects 100 units, but the count finds 92. The variance is 8 units short.

### Blind Count

Blind count means the counter does not see the expected system quantity before counting.

This prevents staff from simply copying the number the system expects.

### Maker-Checker

Maker-checker means the person who creates or submits a sensitive action cannot approve it alone.

Example: the person responsible for a warehouse should not approve their own shortage adjustment.

## How Theft Is Reduced

### 1. Every Stock Movement Must Be Recorded

No item should enter, leave, transfer, expire, get damaged, or be adjusted without a stock event.

This creates a traceable chain.

### 2. Staff Cannot Quietly Fix Stock

If stock is missing, staff should not simply edit the quantity.

They must create a count variance or stock adjustment, provide a reason, attach evidence where required, and wait for approval.

### 3. Physical Counts Expose Hidden Loss

Even if somebody avoids recording a theft, the physical count reveals that real stock is lower than expected stock.

### 4. Blind Counts Reduce Copying

If counters cannot see the expected number, they are more likely to count the real stock instead of writing what the system wants.

### 5. Recounts Separate Mistakes From Suspicion

Large variances should trigger recounts before approval.

This protects honest staff from simple counting errors and makes suspicious shortages harder to hide.

### 6. Maker-Checker Blocks Self-Approval

The same person should not count, approve, and post the variance.

This closes many quiet abuse paths.

### 7. Patterns Become Visible

One missing item may be a mistake. Repeated shortages for the same item, location, shift, branch, or employee become a fraud signal.

## Best Implementation

The module should include:

- perpetual inventory ledger
- opening baseline stock count
- cycle counts
- blind count mode
- count freeze window
- variance thresholds
- recount workflow
- supervisor approval
- evidence requirements for sensitive losses
- immutable audit trail
- stock adjustment posting
- owner-visible exception dashboard
- ledger posting or explicit accounting blocker

## Owner Dashboard

The owner should see:

- top shortage items
- top risky locations
- repeated variance by user, location, item, or shift
- unapproved stock adjustments
- high-value write-offs
- stale count locations
- transfer leakage
- stock count sessions waiting for approval
- ledger or accounting posting blockers

The owner should not need to read technical reports. The system should show plain business risk.

## Control Blueprint

### State

Current stock is a projection. The ledger and business events explain how that stock number was reached.

### Data

The system should track stock count sessions, count lines, expected quantity, counted quantity, variance, evidence, approval, source adjustment, business event, and ledger posting status.

### Trust Boundary

The client interface should not be the source of stock truth. Server actions and services must enforce tenant scope, permissions, maker-checker, validation, and audit trail.

### Failure Handling

If accounting rules are missing, the system should create an explicit blocker. It should never silently correct stock without clear evidence and approval.

## Tests And Release Gates

Focused tests should prove:

- stock counts freeze expected quantities
- blind count payload hides expected quantity from counters
- submission computes variance server-side
- same actor cannot submit and approve the same count
- sensitive variance requires evidence
- physical count variance creates an approved stock adjustment
- movement after freeze blocks or flags posting
- ledger posting blockers appear when accounting configuration is missing

## Final Recommendation

This module should be presented as a theft-resistant inventory control system.

It does not promise that theft is impossible. It makes stock theft harder to hide, faster to detect, easier to investigate, and more risky for dishonest behavior.
