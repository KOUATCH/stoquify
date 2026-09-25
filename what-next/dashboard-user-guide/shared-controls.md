# Shared navigation, controls and recovery

[Guide home](README.md)

## Organization and navigation

Before viewing balances or making a change, confirm the active organization and permitted location. The top organization banner shows identity/role context; its **Live** badge is a static label, not a successful-refresh signal. The separate account menu currently contains hardcoded **User**, **Stoquify** and **Pro** display text. Do not infer subscription or authority from those labels.

The sidebar exposes permitted destinations by group. Expand a module to find its children; use the mobile navigation drawer where appropriate. Top search searches **navigation destinations**, matching titles, parents, sections and module slugs. It returns up to seven results; Enter opens the first. It does not search customers, orders or stock records. Search inside the relevant directory to find those records.

Open website navigates to the public site. The language switch selects EN/FR routes. Theme and sound controls change presentation/preferences. Sign out terminates the session. Account-menu Profile, Settings and Billing & Plans links currently point to dashboard paths with no page route in this inventory; use the specific working settings links instead. Help & Support is outside this dashboard inspection.

[Source: components/dashboard/Navbar.tsx:107](<E:/ohada saas/Focused projects/stoquify/components/dashboard/Navbar.tsx:107>); [Source: components/UserDropdownMenu.tsx:183](<E:/ohada saas/Focused projects/stoquify/components/UserDropdownMenu.tsx:183>).

## Shared table controls

| Control family | Use it for | Scope and outcome |
|---|---|---|
| Search | Find matching records by the fields advertised on that table. | Search fields differ by page; top navigation search is unrelated. Cash/payment history search is currently incomplete. |
| Date range / period / location | Narrow a query or report to the desired business scope. | Check both endpoints, timezone, date basis and selected location. Some headline balances stay current or organization-wide. |
| Status/type/category filters | Separate work states or classifications. | An empty filtered list is not proof the organization has no records. Clear filters and inspect scope. |
| Column heading / sort menu | Rank by date, amount, name or another supported column. | Usually changes row order, not source records. A report may retain full-report headline totals. |
| Columns / density / Grid / List | Change readability. | Presentation only where implemented. Theme and table settings do not change business permission. |
| Page size / Previous / Next | Inspect another portion of results. | A visible row count, loaded result count and organization total may differ. Some queries cap the entire returned dataset. |
| Row checkbox / Select all | Build a selection for an offered bulk action/export. | Do not assume Select all means every database record across unvisited pages. Check the selection count. |
| Row menu / Details / View | Inspect a record or navigate to its owning page. | Menus vary by permission and current record state. Missing actions may be intentionally blocked. |
| Refresh / Retry | Fetch current evidence or repeat the specific failed request. | A same-request command retry may repeat a protected write; inspect its wording and receipt. Refresh does not repair the source record. |
| Export / Print / Copy ID | Produce/share a file or copy an identifier where implemented. | Export scope is page-specific; Print invokes the browser print dialog where used. Copying an ID does not export the record. |

The inventory/history workbenches and HR/payroll tables reuse presentation components. The guide documents shared patterns once and calls out exceptions at the page level. Not every control in this table exists on every page.

## Forms, drafts and confirmation

Read required-field markers, units and validation feedback before submitting. Monetary amounts must be interpreted in the displayed organization currency. A percentage is not a currency amount. Date ranges and quantities have workflow-specific constraints; receiving, for example, requires positive integer quantities.

Previous/Next inside a wizard usually changes the step, but **Save draft can persist a record**. POS cart additions and quantity edits also persist before Charge. A drawer is a presentation container; its buttons can calculate payroll, approve access or post stock. Opening a view is not authorization to submit its form.

When a review is offered, compare the exact before/after state, reason and evidence revision. Identity confirmation proves the current actor; it does not grant missing permissions or satisfy a required independent reviewer. Some forms require a second explicit submit after confirming the password. Use the specific control notes rather than assuming every page behaves identically.

## Evidence and status language

| Label/concept | Practical interpretation |
|---|---|
| Draft / requested | A proposal or request exists; it may not be active or approved. |
| Approved | The relevant decision was recorded; posting, delivery or settlement may still remain. |
| Posted | The specific accounting/stock effect was recorded through its owning service. Check the source link. |
| Queued / preparing | Work was requested; completion and external response are still separate evidence. |
| Released payment | A controlled release state; inspect settlement/reconciliation proof separately. |
| Ready | The represented readiness checks passed. It is not a guarantee of every omitted domain or professional certification. |
| Unavailable / unknown / redacted | The value cannot be asserted from your evidence. Do not replace it with zero. |
| Zero | A numeric result in its stated source/filter scope; confirm source completeness first. |
| As of / recorded through / generated | Business effective time, latest included recording and snapshot-generation time can differ. |

## Recovery without duplicating work

1. **Sign-in or denied access:** use normal sign-in and ask the organization administrator to check role/module/location authority. A hidden menu does not establish missing business records. Do not bypass the guard with a guessed URL.
2. **Empty results:** inspect period, location, status and search; clear filters. Look for no-setup, no-location or no-mandate states before interpreting zero activity.
3. **Loading or read failure:** wait for the stated loading state; use Retry/Refresh. Preserve a displayed correlation/reference ID for support. Do not keep submitting a business action to solve a read failure.
4. **Stale evidence or conflict:** load the current record for comparison. Preserve the intended draft where offered, resolve differences, and obtain a new review of the latest evidence.
5. **Uncertain write outcome:** inspect current state, history and receipt. Use the explicitly offered Retry same request rather than creating a new request that could duplicate the change.
6. **Pending external work:** inspect the queue, attempts, provider/authority response and blockers. Queued is not delivered, settled or accepted.

## Notifications and language

Settings Notifications tests the current in-app queue: Send test, Security alert and Payment update create synthetic entries. Mark all read, Mark read, Dismiss and Clear queue affect that session-memory list; only sound preference persists in browser storage. The separate legacy sidebar **Mark it Read** handler only emits a success toast because its server update is commented out. These two mechanisms should not be confused.

English is the guide's reference language. French changes route labels, translated names, formatting and some wording; mixed/untranslated technical text remains in several workbenches. No distinct French permission or business-state rule was established. A language switch does not change organization currency. Dates and number separators must be read from the actual locale and the report's source contract.

[Source: components/NotificationMenu.tsx:35](<E:/ohada saas/Focused projects/stoquify/components/NotificationMenu.tsx:35>); [Source: app/[locale]/(dashboard)/dashboard/settings/notifications/NotificationsSettingsClient.tsx:62](<E:/ohada saas/Focused projects/stoquify/app/[locale]/(dashboard)/dashboard/settings/notifications/NotificationsSettingsClient.tsx:62>).
