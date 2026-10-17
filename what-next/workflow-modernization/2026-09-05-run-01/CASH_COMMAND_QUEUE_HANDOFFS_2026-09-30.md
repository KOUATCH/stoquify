# Cash action-queue handoffs

2026-09-30T09:54:52.231Z. FA-CASH-COMMAND remains In progress. The previous turn was progress: source evidence was corrected and finance handoffs verified. This turn completes the remaining named queue-handoff checks; it does not complete their downstream business lifecycles or the Cash workflow.

## Verified boundaries

| Cash action | Destination | Current source/destination permission | Persisted record inspected |
|---|---|---|---|
| Overdue purchase receiving | /dashboard/purchase-orders | purchases.orders.read | Submitted order with past expected delivery |
| Close blocker | /dashboard/accounting/close | accounting.close.read | Blocked close run and its accounting period |
| Recorded inventory loss | /dashboard/inventory/loss-control | inventory.levels.read | Loss item and adjustment details dialog |

The existing mappings are correct. Current service results and actual links were checked separately. Each destination was reached by keyboard in EN desktop and FR mobile. Back returned to the Cash route with locale intact. After withdrawing the domain permission while a link was rendered, each destination displayed denial, concealed the source record, and excluded its reference from a fresh server response. Reloading Cash removed the denied action from both the rendered queue and service result. Read-only close controls remained disabled. Loss details opened and closed by keyboard.

The close handoff exposed a real timestamp hydration defect: the server rendered 10:46 while the New York browser rendered 5:46 for the same evidence timestamp. A repeat with screenshot caret mutation disabled confirmed the date mismatch. CloseAssuranceCenter now renders evidence timestamps explicitly in UTC with a visible UTC suffix and renders accounting-period dates in UTC to avoid shifting calendar boundaries. No authorization, close calculation or persisted record changed.

## Evidence and limits

[Runtime receipt](lanes/environment/cash-queue-87b05b23-b34e-4d06-8fef-c0039c803c7b.json) records six passed journeys, twelve screenshots, exact source hashes, development handoff timings and unchanged purchase-order, close-run and stock-adjustment records plus unchanged payment, journal, business-event and receipt counts. Fixtures are synthetic historical read inputs; creating a completed adjustment fixture is not evidence that the adjustment approval/posting lifecycle passed. No live customer, real payment, external message, migration, deployment or gate clearance was performed.

[Focused regression](evidence/close-timezone-checks-cc89346d-b442-47b4-b310-c7c40f3c0263.json): Tests:       157 passed, 157 total; three suites, changed-file lint and full TypeScript passed. Added EN/FR rendering checks simulate a Honolulu default timezone and assert unchanged UTC instants and accounting-period calendar dates. The actual browser uses New York time and verifies the visible UTC label without captured page errors. The prior Cash-specific evidence remains bound through the preceding finance review. These checks do not prove production performance, full accessibility, translated source copy, genuine posted payroll or all downstream operations.

Five failed attempts are retained. The first direct service invocation omitted the fixture's actual admin role and was correctly rejected. The next two used a partial order-reference match that also matched the signed-in fixture email, causing false data-presence failures on a visibly denied page. The next two exposed and isolated the real close timestamp mismatch. The final verifier uses a distinct order reference and exact order/item matching. It also independently checks a fresh denied server response. Previously delivered browser data is not claimed to have been erased; visibility and new server delivery are the tested controls.

## Review and operating guidance

Architecture/backend/security: reuse existing routes, server permission checks and service-owned action projection. Finance/audit/data: no domain transitions and persisted-record equality across reads. Purchasing/close/inventory: verified entry into the owning workspaces and their permitted records; receiving, certification, adjustment approval and posting remain separate workflows. UX/quality: keyboard navigation, locale-preserving Back and denied recovery exercised. SRE: development measurements only. Statutory rules, billing, provider execution, offline and AI: not applicable to this handoff-only verification. No professional certification is claimed.

From /en/dashboard/finance/cash-command or /fr/dashboard/finance/cash-command, use the action queue to open the owning workspace. Resolve the condition there under its existing controls. A visible link does not preserve permission after revocation; refresh Cash to see current available actions. The operations reviewed here require the permissions in the table and an eligible module. Close evidence timestamps explicitly use UTC. No schema change occurred; rollback only the reviewed formatter and corresponding tests if needed, then rerun the linked checks.

Next: complete source and shared-component EN/FR presentation, remaining proof subjects, genuine posted payroll and outstanding accessibility/performance criteria. The original full-platform objective and unresolved register remain intact.
