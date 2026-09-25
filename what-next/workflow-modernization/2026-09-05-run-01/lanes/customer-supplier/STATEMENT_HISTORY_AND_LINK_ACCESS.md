# Customer statement history and link access

Implementation record, 2026-09-07. Branch `codex/migration-control-plane-release-2026-08-29`, commit `a05a41ef66cd5d98fd69ae3df18225795f912232`, with existing uncommitted work preserved. Final verification is recorded separately; this guide does not certify the full financial workflow.

## What changed

The existing customer statement screen now reads saved statements and delivery history from a tenant/customer-scoped service. It distinguishes the recorded balance, when history was checked, the delivery record, processing queue and current link access. Missing processing evidence remains unavailable; failed queries do not become empty history.

Opening history creates no statement or delivery. An explicit action opens the selected saved statement for a new consented delivery. Reload recovery fetches its server record before resuming the retained delivery request. Operators can revoke an active link using the existing permission and password verification controls. Revocation retains the statement, delivery, audit and customer obligations.

The statement page permits retained history under Accounting read access. Creating statements, requesting deliveries and revoking links still require the existing Accounting export eligibility and fresh authentication. Current server authorization remains mandatory on every action. There is no new entitlement or approval system in this change.

## Where to go

Open Customers, choose a customer and their statement screen:

- `/en/dashboard/customers/<customer-id>/statement`
- `/fr/dashboard/customers/<customer-id>/statement`

Use the actual customer from your organization. An identifier copied from another organization does not grant access.

## Inputs, owners and sources

| Task | Information needed | Who supplies it and where to find it |
| --- | --- | --- |
| Review history | Customer and saved statement | Select the customer in Stoquify, then **Latest statements / Derniers relevés** and **Review / Consulter**. The server supplies the saved period, balance, version and checked time. |
| Resume after reload | Existing statement reference | Choose **Open saved statement / Ouvrir le relevé conservé**, then **Resume this statement / Reprendre ce relevé**. The browser retains the request reference, not proof of success. |
| Request another copy | Channel, recipient, explicit consent, permitted recipient actions | Obtain the destination and approval for this exact statement/channel from the customer. Review earlier deliveries first. The customer record can suggest an email; verify it. |
| Confirm a consequential action | Your current password | Enter your own Stoquify account password. It is checked through the existing authentication service and is never stored in the tab recovery record. |
| Revoke access | The active link and a reason, 3–500 characters | Select the relevant delivery in history. Record the customer's withdrawal or the operator's documented reason; confirm the checkbox and your password. Do not paste credentials or unnecessary personal data into the reason. |
| Resolve missing authority | Authorized account and current permissions | Your workspace administrator verifies `customers.read`, `accounting.exports.create`, module status and organization membership. History does not bypass these controls. |
| Investigate failed processing | Statement/version, checked time, delivery/queue/link status | Read the displayed record, then have the operator inspect existing delivery/outbox evidence. Queued or provider-accepted is not recipient delivery/read confirmation. |

## Recovery

1. If refreshing history fails, previously loaded records remain visible with a warning. New-copy and revoke controls remain disabled until a successful refresh.
2. If current history access is denied, previously shown records are removed. Restore an authorized session or ask the administrator to check current permissions.
3. If a delivery acknowledgement is lost, retain the original request. After reload, reopen and resume the saved statement, then retry the existing delivery request. The same recipient, consent time and command are reused.
4. After closing a tab, open **Latest statements** to inspect durable history. Opening a record does not replay the original creator's command. Request another copy only after reviewing prior deliveries and obtaining the required consent.
5. If a revocation acknowledgement is lost, retry the same link and reason. The server returns the existing result without repeating the business revocation event.
6. Unreadable local recovery data must not be silently discarded. History remains available for inspection, but the current implementation deliberately prevents issuing another request from that tab. A complete controlled resolution workflow is still engineering work; it is not an external approval requirement.

## Design and source relationships

Historical graph node `customers_customerstatementworkflow_tsx`, community 21, led to the existing sender component. Current source verifies the route → protected history actions → history service → existing snapshot/delivery/token/outbox records. The graph predates the new history service and is a discovery aid only.

The screen reuses the dashboard shell, surface/border/text/brand/warning/danger tokens and existing form controls. History is neutral, selection does not imply approval, warnings identify stale evidence, and link state includes explicit text. EN/FR copy and dates, keyboard buttons, named revocation form, a confirmation checkbox and focus return are implemented. There is no new portal or dialog.

## Rollout and recovery instructions

No schema migration or backfill is required. Deploy only through the ordinary authorized release process after remaining release checks. Verify an authorized customer, a denied account and retained read-only access in the rollout cohort. Monitor history failures separately from successful empty responses. Keep workers/provider delivery under their existing controls.

Rollback the history UI/action/service integration together, including the route's read/export split and the historical-reference recovery handling. Retain all statement, delivery, token, audit and outbox records. Do not clear unresolved tab commands or discard historical IDs during rollback; close or resolve affected sessions through a reviewed transition first.

## Review responsibilities

| Responsibility | Engineering assessment |
| --- | --- |
| Architecture | Extends the current statement route; service owns bounded read models; no second shell. |
| Backend/API/distributed systems | Strict scoped input, keyset pagination, separate observed states, existing idempotent mutation services. |
| Database/migration/integrity | Existing records, repeatable-read history transactions, no new schema; retained records are not rewritten. |
| IAM/security/privacy/fraud | Current dual permissions and tenant/object checks; fresh authentication for mutation; safe field allowlist; no raw token/envelope/credentials in history. |
| Frontend/design | Existing semantic tokens and inherited layout; explicit history selection, no automatic delivery. |
| Workflow/accessibility/localization | EN/FR recovery and named controls; native assistive-technology, native zoom and full contrast audit remain open. |
| Product/process/value | Operators can inspect prior outcomes before another copy; tab loss no longer hides the server's history. |
| Finance/reconciliation/internal controls | Recorded snapshot amounts remain immutable; link revocation does not cancel debt or reverse a posting. Populated-source calculations remain unverified by this batch. |
| Statutory/country packs | Not applicable to changed calculation behavior: no country rules or statutory logic changed. No compliance certification. |
| Audit/records | Revocation retains history and existing audit; delivery/queue/link evidence are distinguishable. |
| Quality/release | Focused tests, real owned database and browser evidence; complete release/full-build evidence remains separate. |
| SRE/performance/cost | Bounded queries; local route timings are observations only. No production performance claim. |
| Providers/events | Existing queue and revocation boundaries retained. No external message or worker execution authorized by this batch. |
| POS/offline, purchasing/AP, HRIS/payroll, ledger/close | No direct changes; retained customer obligations and financial invariants remain applicable. Full downstream workflows remain in the register. |
| Analytics/data governance | Checked time and recorded balance time remain separate; no new metrics or data exports. |
| AI/agent governance | Not applicable: no agent action, model or approval behavior changed. |
| SaaS packaging/rollout/support | Read-only retention separated from new work; no price, subscription, provider or live-customer activation change. |

## Remaining verification and engineering work

The final receipt will state actual passed and failed checks. Corrupt-command resolution, populated receivable calculations, provider/worker outcomes, full retained lifecycle, native accessibility and complete platform inventory reconciliation remain open. No release, X1 or professional certification is claimed.


## Published verification

[Source-bound history receipt](../../evidence/statement-history-receipt.json) records 48 focused tests, 29 access regressions, five PostgreSQL checks, two actual EN/FR browser journeys and 32 screenshots. Typecheck and changed-file lint passed. The stated remaining requirements still apply.
