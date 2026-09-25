# Stoquify dashboard user guide

This guide explains what the current dashboard shows, how to use its controls, and how to turn its signals into completed work. It covers 130 dashboard route patterns, including administrative, hidden, dynamic, shared and legacy entry points. Evidence date: **2026-09-06**.

**Read the verification boundary first:** the inspection browser reached the sign-in page when opening the dashboard. No authenticated dashboard page or business control could be exercised. The instructions are based on current source and focused supporting tests that were read, not run. Partial features and unresolved behavior are identified explicitly.

## Start in ten minutes

1. Open [the dashboard](http://localhost:3000/en/dashboard), sign in through your normal authorized account and confirm the organization and responsibility scope.
2. Read [shared controls](shared-controls.md), especially navigation search, dates, selection/export scope and error recovery.
3. Choose your [role playbook](role-playbooks.md). Follow one daily routine before exploring every module.
4. Use the [metric dictionary](metric-dictionary.md) whenever comparing money, stock or status counts between pages.
5. Follow a [complete workflow](workflows.md). Confirm the resulting record and evidence, rather than stopping at a successful click.

## Important findings for everyday use

- Company **Gross paid payment total** combines paid sales and purchase payments across all dates. It is not revenue or cash balance.
- The current POS offers **Cash** and **No receipt**. Park sale and Override are warning-only controls.
- **Approve Transfer immediately posts stock out and stock in and marks the transfer completed.** There is no separate shipping/receiving sequence here.
- The AP control workbench is read-only. Payroll contract/compensation source workbenches also do not provide full creation/editing flows.
- Invitations are recorded, but email delivery is disabled in this build.
- Cash/payment history Search is not applied; its Export prepares permission/readiness but does not download a CSV.
- Operational finance figures and posted accounting reports have different definitions. Use the metric dictionary before treating a difference as missing money.

## Dashboard map

The sidebar groups work into Command, Operations, Finance & Trust, People and Governance. Links depend on access and module state; the sidebar is not the complete route inventory. Bracketed routes in the chapters represent an existing record opened from its parent page.

- [Accounting, reports and close assurance](modules/accounting.md) ([PDF](modules/accounting.pdf))
- [Analytics, reports and daily sales](modules/analytics-sales.md) ([PDF](modules/analytics-sales.pdf))
- [Command pages and daily management](modules/command-center.md) ([PDF](modules/command-center.pdf))
- [Customers and statements](modules/customers.md) ([PDF](modules/customers.pdf))
- [Finance, cash evidence and reconciliation](modules/finance.md) ([PDF](modules/finance.pdf))
- [Compliance and assurance](modules/governance.md) ([PDF](modules/governance.pdf))
- [Inventory and product setup](modules/inventory.md) ([PDF](modules/inventory.pdf))
- [People, payroll and employee self-service](modules/people-payroll.md) ([PDF](modules/people-payroll.pdf))
- [Point of sale and cash accountability](modules/pos-cash.md) ([PDF](modules/pos-cash.pdf))
- [Suppliers, purchase orders and AP monitoring](modules/purchasing.md) ([PDF](modules/purchasing.pdf))
- [Settings, access and workspace composition](modules/settings.md) ([PDF](modules/settings.pdf))

## Reference and practical guidance

- [Shared navigation, controls and recovery](shared-controls.md)
- [Metric definitions, scope and freshness](metric-dictionary.md)
- [Detailed controls and consequential actions](control-notes.md)
- [Cross-page workflows](workflows.md)
- [Role playbooks: daily, weekly and period end](role-playbooks.md)
- [Limitations and verification blockers](limitations-and-blockers.md)
- [Technical evidence and review method](technical-evidence.md)
- [Coverage register](coverage.csv) and [control register](controls.csv)
- [Complete guide PDF](dashboard-user-guide.pdf) and [complete Markdown edition](dashboard-user-guide.md)

## How to interpret coverage

Source classifications: **108 source-only; 7 redirect; 7 partial; 7 shared implementation; 1 placeholder**. Browser-inspected dashboard pages: **0**. One browser entry attempt was blocked at sign-in; all 130 route patterns remain unverified at runtime. Blocking overlaps the source categories and must not be added to them.

The control register contains **3532 rows**, including reviewed controls and static candidates repeated across routes. This is not a count of unique functioning controls. Unresolved labels, shared exports and dormant branches are marked; the narrative and reviewed-control rows take precedence over raw candidate extraction.

The canonical publication is under docs/dashboard-user-guide with matching Markdown/PDF reports. The requested inspection package is also maintained under what-next/dashboard-user-guide, including the evidence and CSV registers.
