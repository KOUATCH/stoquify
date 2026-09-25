# Invoice posting recovery interface — 2026-09-08, source v61

The existing AP workspace now links to a working EN/FR recovery journey for previously approved supplier invoices whose ledger posting failed. This completes the tested recovery subjourney of PA-019. Original invoice matching/approval and the full AP/ledger/close lifecycle remain incomplete, as does the platform-wide mission. This record supersedes only the UI-pending statements in the historical v60 service guide; that guide and its evidence remain unchanged.

## Open and use

Open `/en/dashboard/purchases/payables` or `/fr/dashboard/purchases/payables` and choose **Recover invoice posting / Reprendre la comptabilisation des factures**. Direct routes are `/en/dashboard/purchases/payables/recovery` and `/fr/dashboard/purchases/payables/recovery`.

1. Confirm the correct organization in the existing dashboard. Search for the original supplier invoice and select it. Selection survives refresh in the same browser session and organization/user scope.
2. Review the retained approval, invoice date, amount, effective period, posting rule, journal and country configuration. Selection is not approval or posting. Any setup/evidence condition explains the required next action and prevents confirmation.
3. Confirm the reviewed recovery. If requested, verify your own account password through the existing authentication workflow. An incorrect password preserves the request and clears the password field; passwords are never stored with the draft.
4. If configuration changed, review the refreshed evidence before confirming again. If the result is unknown after a connection failure, use the offered recovery action for the existing request. Refresh retains that exact request; do not start a second request to guess the outcome.
5. Inspect the recorded recovery outcome and retained history. A recorded posted result describes that operation. The separately observed journal status can later be reversed. Neither selection nor a historical success proves current health or professional approval.

## Information needed from you

| Situation | Information and owner | Where to obtain it / next action |
| --- | --- | --- |
| Find the invoice | AP operator: original supplier invoice number | Supplier document and Stoquify's retained invoice; search within the current organization. No manually invented record ID is needed. |
| Access denied | Organization administrator: current role with `purchasing.ap.invoice.post`, usable organization/account and purchasing capability | Existing role/membership and module administration. Reading requires current access; recovery requires write eligibility. A signed sample form does not grant it. |
| Verify identity | Operator: their own account password | Normal account credentials; use established account recovery if forgotten. Never put passwords in evidence or a support report. |
| Missing rules, journal, accounts, period or country setup | Authorized accounting owner: actual effective configuration and required expert review | Organization chart, purchase journal, accounting calendar, posting-rule records and applicable country pack. Recovery does not fabricate configuration or its approval. |
| Approval/liability/source conflict | AP/accounting and data owners: original document, approval, match/exception, supplier liability and batch trace | Existing retained records and audit evidence. Reconcile the discrepancy through authorized corrections; do not edit hashes or manufacture source evidence. |
| Stale review | Operator: current authoritative preview | Reopen review after the stated conflict. Confirm the new consequences only after checking them. |
| Interrupted response | Operator: pending request already retained by the interface | Reopen this page in the same session/organization/user and recover the same request. History provides the recorded outcome. If browser session storage has been lost, inspect history and involve the AP operator before initiating another operation. |
| Legacy failed batch without request proof | Accounting/data owner: original posting and approval records | Controlled reconciliation is required. This interface does not backfill missing proof. |
| Journal later reversed | Accounting owner: current journal and reversal/source trail | Use the proper correction workflow; a past recovery is not permission to repost a reversal. |

## Implementation and visual contract

`InvoiceLedgerRecoveryWorkbench` uses the inherited authenticated shell, organization context, dashboard theme/tokens and shared Button, Input, Label and Dialog. The route catalog and `withPurchasesSurfaceAccess` enforce current invoice-posting permission; service checks remain authoritative. The portal dialog explicitly inherits the dashboard theme, scrolls within the viewport and returns keyboard focus to review. No duplicate navigation or second design system was added.

Selection/focus use brand tokens. Neutral text distinguishes draft, evidence and observed history; attention text/icons explain blockers; success appears only after a bound server decision. Mobile actions wrap without horizontal overflow. EN/FR covers search, review, progress, conditions, failures, password assurance, recovery and history. Invoice dates are presented as UTC calendar dates to avoid timezone shifts.

Session storage separates the selected invoice from an exact pending command, scoped by organization and actor. The command is persisted before transport. A returned decision must match organization, actor, invoice, request reference and reviewed revision; a posted outcome also requires journal/source-link references. Mismatched or lost responses remain unknown and retain the pending request. Definitive conflicts preserve selection for a new review. Generation and request counters discard stale reads after context changes. Passwords never enter storage.

The service from v60 owns revisions, current role/session/module/fresh-auth checks, separation of duties, original approval/liability proof, posting, atomic recovery evidence and history. Posting preserves the original approval and supplier liability. History binding checks are application checks, not verification of a human signature or all current journal lines. `ALREADY_POSTED` describes batch state and blocks redundant recovery; it is not certification.

## Verification and limits

Final browser receipt: `../environment/invoice-recovery-browser-fbb752c0-451.json`. Both languages passed six stages each, with 22 actual screenshots, no page errors, stable source hashes and unchanged pre-existing financial records. Screenshots are copied without changes to `../../evidence/invoice-recovery-screenshots/` with hashes in the v61 receipt.

The browser visited the existing AP entry, persisted selection through refresh, contained dialog focus and returned it with Escape, checked widths 320/390/768/1440, exercised incorrect and correct password step-up, rejected a rule changed after review, lost a committed action response and recovered the same command after reload with exactly one journal, inspected history and denied a revoked role. Mobile, 200% text reflow and reduced-motion preference were exercised. This is bounded keyboard/responsive evidence, not a screen-reader or accessibility certification.

Synthetic setup used actual receiving/preparation and independent AP kernel approval followed by synthetic rules/accounts. It did not exercise original approval UI. The later reversal observation was created directly in the fresh fixture; it does not verify the reversal workflow. Only newly enumerated run organizations were excluded from the pre-existing financial-record invariant. No supplier payment or external message was issued.

Final regression receipt `../../evidence/invoice-recovery-ui-tests-final.json`: 67 tests across eight suites passed. The eight UI tests cover both languages, exact pending recovery, mismatched results, stale draft preservation, setup blockers, query failure and password exclusion. Other suites cover contracts, actions, route/AP entry and posting/approval regressions. Typecheck and five-file changed-code ESLint passed. No schema change, migration, deployment or production build was performed.

The first UI test attempt (`invoice-recovery-ui-tests-initial.json`) failed all eight tests because `resetAllMocks` erased the shared IntersectionObserver implementation used by Next Link. Replacing that reset with clear calls and explicit action mock setup fixed the harness; the second UI-only run passed, then the final eight-suite run passed. The earlier successful browser receipt `invoice-recovery-browser-ca7a236e-b10.json` predates exact response-reference and UTC-date improvements; the final receipt is authoritative for current UI source. Backend v60 PostgreSQL evidence remains applicable only to matching unchanged service hashes, verified by the v61 publisher.

The report-only module scanner inspected 451 records and retains findings for delegated action/service enforcement and the route-catalog wrapper. Runtime role denial and route tests passed, but scanner reconciliation remains engineering work. No scanner baseline was cleared. Development AP-to-recovery measurements were EN 11,861 ms and FR 14,940 ms: observations in a development server, not a controlled comparison, approved budget pass or production performance claim.

## Rollout, recovery and review responsibilities

No migration is required. Roll out these code changes through normal reviewed release controls and verify the actual target's access/configuration before customer use. Reverting the UI must preserve recovery events, approvals, supplier liabilities, journals and source links; do not re-enable unreviewed posting as a rollback shortcut. Resolve pending outcomes from durable history. Existing blockers requiring genuine accounting configuration or source reconciliation remain effective.

Architecture/backend/data: existing service owners and durable state, no second ledger. IAM/privacy/security: server scope, current authority and exact response binding; password secrecy and revoked-role runtime proof. Finance/audit/close: one journal, unchanged approval/liability and honest history; full close handoff remains open. Country/statutory: actual setup required; no accounting/legal approval claimed. UX/accessibility/localization: inherited design system, EN/FR recovery and bounded keyboard/reflow proof. API/events: actual server-action transport and retained recovery event; no provider integration added. QA/SRE/operations: lost committed response, safe retry, preserved financial rows, explicit development timings and scanner limitations. Product/support: discoverable recovery and actionable owner guidance. POS/offline, HRIS/payroll, analytics, AI and commercial packaging: not applicable to this bounded UI change; their workflows remain in the platform inventory.

Next engineering work: reconcile scanner delegation metadata and complete reviewed original invoice matching/approval, followed by connected inventory/AP/ledger/close checks. PA-019 must not be marked as a fully verified workflow on this recovery evidence alone.
