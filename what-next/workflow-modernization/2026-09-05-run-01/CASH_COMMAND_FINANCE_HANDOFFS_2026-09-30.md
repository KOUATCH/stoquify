# Cash Command finance handoffs and source evidence

2026-09-30T09:32:33.279Z. FA-CASH-COMMAND remains In progress; no workflow closure is claimed.

## Correction

The previous forecast-card correction did not reach the internal Cash source wrapper: an authoritative empty result still became posted there. The wrapper now identifies no-upcoming-period results as empty/operational, withholds a posted grade for unknown reasons, reserves posted for unblocked source-linked results, and preserves blocked status when authority or required proof is missing. Domain amounts, hashes, query scope and posting requirements remain unchanged. Only the source wrapper and its tests changed.

## Handoff contract

The collected-cash card targets /dashboard/finance/payments using finance.read. That permission is accepted by both the destination route and its dashboard action. The unreconciled-cash card targets /dashboard/finance/reconciliation using payments.reconciliation.read, matching the destination route. No additional permission-map entry was required.

Graph reports were used as a locator only: GRAPH_REPORT_components.md includes inferred CashCommandDashboard connections through generic String calls, which do not establish real handoffs. Current source and actual browser navigation establish these boundaries. Purchasing, close and inventory-loss action-queue routes still require runtime verification.

## Verification

- [Static regression](evidence/cash-navigation-checks-2e532e5f-77e4-4289-9d60-48951f998dd7.json): 214 tests/seven suites, lint and full TypeScript passed with stable source. Six added source-level cases cover empty, source-linked, unknown and contradictory blocked inputs. A source-linked unit fixture is not evidence of actual payroll posting.
- [Owned runtime](lanes/environment/cash-finance-handoff-e82a4910-ebb3-46cb-a43f-668b0d66582c.json): actual payroll reads return empty/operational before a synthetic due period is created; the unposted period then returns blocked/null. Four EN desktop/FR mobile journeys follow the two finance links by keyboard, return through browser Back with locale intact, then withdraw permission while a link is rendered and verify destination denial. Eight screenshots are retained. No captured page errors occurred.
- Balance records, payment counts and journal counts remain unchanged across the navigation reads. Role changes and synthetic fixture setup are intentional test effects. No approval, posting, payment, external message, migration or deployment occurred.
- Development handoff times are recorded as observations, not an approved performance budget or production certification. These journeys prove entry and denial, not the complete downstream payment or reconciliation lifecycle.

## User guidance and review

Open /en/dashboard/finance/cash-command or /fr/dashboard/finance/cash-command. Collected cash opens the payment ledger; unreconciled cash opens the reconciliation workspace. A permission withdrawn after the page loads can still leave a visible link, but the destination must deny the operation. Refresh Cash Command to obtain current permitted indicators. Empty payroll source evidence means no eligible due records in the selected horizon; it never proves that payroll was posted.

Backend/data/finance/audit review: source classifications now agree with the cards without altering financial truth. Security: admission and destination revalidation remain server-owned. UX/localization: EN/FR routing, keyboard entry and recovery through Back exercised; broader source-copy translation and native accessibility remain open. SRE/quality: exact source bindings and isolated regression retained. Statutory, pricing, provider, offline and AI rules: not applicable to this metadata change and read-only handoff verification. These are engineering reviews, not professional approvals.

Recovery requires reverting only the reviewed source-wrapper classification hunk and corresponding tests, then rerunning affected checks; preserve unrelated changes. No schema rollback is needed. Remaining requirements are retained in the workflow register and CURRENT_PROGRESS.md.
