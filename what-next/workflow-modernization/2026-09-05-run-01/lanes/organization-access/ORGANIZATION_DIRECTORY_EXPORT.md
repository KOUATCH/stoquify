# Company directory review and controlled export

Evidence date: 2026-09-06. Branch `codex/migration-control-plane-release-2026-08-29`; commit `a05a41ef66cd5d98fd69ae3df18225795f912232`, with preserved existing working changes. Current source checkpoint: v33. This record covers OA-DIRECTORY and its separately inventoried export workflow; the full platform assignment remains active.

## What changed and why

The previous Export button built a CSV directly from cached browser rows. An account with only directory-read access downloaded the file without export authority, password confirmation or a controlled-export audit. The real before reproduction is `../environment/organization-directory-before-95156237-87c.json`, accompanied by its downloaded CSV and screenshot. It records a reproduced defect, not a passed workflow.

The new service builds a current, tenant-scoped preview. Preparing the reviewed file requires both `system.organization.read` and `reports.export`, current usable account/organization authority, and a password-confirmed session no older than five minutes. These controls reuse the existing `report.export` policy. The action derives identity from the server; browser selections cannot authorize an export. The settings module observation behavior is unchanged.

The reviewed hash includes the organization, actor, locale, filters and every exported value. Changed data requires a fresh review. File preparation and its mandatory audit occur in one repeatable-read transaction. A deterministic audit ID serializes identical requests; successful retries retrieve the same retained bytes after rechecking current authority. The CSV carries scope, generation time, watermark, audit ID, reviewed hash, filters and the meaning of its payment aggregate. Formula-like cells are neutralized, quoted values escaped, and UTF-8 bytes with BOM are hashed exactly. Files over the one-megabyte limit fail explicitly without truncation.

The original `paidRevenue` value summed all nondeleted PAID payment amounts, including purchase payments, before refunds. It was not revenue. The internal directory field is now `paidPaymentsAmount`, represented as an exact two-decimal string. The table says “Gross paid payment total” and preserves cents without converting large totals through binary floating-point numbers. Financial source records, posting rules, refunds and statutory calculations are unchanged.

## User procedure and required inputs

1. Open **Settings → Company**, at `/en/dashboard/settings/company` or `/fr/dashboard/settings/company`. The signed-in account determines the organization. To work in another company, use the existing account handoff; there is no cross-company export selector.
2. Search or filter the directory, then choose **Export / Exporter**. Directory-read access alone does not allow export. Ask the administrator responsible for roles to review an export-access request; the application cannot grant it from this screen.
3. Review all twenty listed fields. Filters select rows; hiding table columns does not remove fields from the CSV. The preview states this explicitly. Check the company identity, counts, currency and payment definition against the corresponding company settings and payment records.
4. Choose **Prepare reviewed CSV**. If prompted, enter **your own current account password** and confirm your identity. Then deliberately choose Prepare again. No organizational approval record or another person's password is requested.
5. Check the browser's Downloads folder. “File prepared” confirms the server result, not that a local save completed. **Download prepared file again** retries the same bytes without recording another export.
6. If the connection fails after submission, use **Retry same export request**. Refreshing the same tab retains its request identity for up to 24 hours. Reopen Export and retry; the server either recovers the original file or rejects stale/unavailable authority. The displayed current preview can differ from the recovered original file, and the recovery notice explains this.
7. If data changed before preparation, choose **Reload and review current data**, inspect it again and make a new explicit request. No unseen replacement is exported automatically.

No extra values must be invented. The organization comes from the session, filters from the user's choices, the password from the user's existing account, and record IDs/timestamps/hashes from the server. Share the **export record ID**, time, company and visible error with an authorized operator when recovery needs help. Never send passwords or session tokens.

## Operator procedure, retention and recovery

The existing private AuditLog stores `OrganizationDirectory / CONTROLLED_EXPORT_ALLOWED`, the requesting actor and company, request fingerprint, selected row IDs, exact file receipt, watermark and content hash. No new schema or migration is required. A successful file is retained with its audit so a lost acknowledgement can recover identical bytes. The browser stores only request metadata and filters in actor/company/locale-scoped session storage; it stores no password, session token or CSV bytes there. Storage failure is visible, and same-window retry remains available.

Use an authorized audit/database access process to locate a reported export ID. Recompute SHA-256 over the retained decoded bytes when investigating integrity; do not edit the audit to make a failed integrity check pass. A revoked user cannot replay a file through the export service. This change does not create an approval register or certify evidence as legally retained: organization deletion can still cascade AuditLog records, and formal retention/hold/revocation policy remains separate work.

CSV compatibility: the controlled file now has eight metadata rows, followed by a localized twenty-column header and the current company's row. Consumers expecting the old raw field names on the first line must adapt their import/macro before rollout. The misleading `paidRevenue` header is replaced with a gross paid-payment label. No existing downstream CSV importer was identified or certified by this batch.

Roll out first to a reviewed internal cohort with directory and export permissions. Verify both authorized and read-only users, a fresh-password prompt, failed-preview recovery and matching download hashes. Observe preparation failures, audit failures and oversized-record errors. Preserve issued audit rows when rolling code back. Roll back the table, new export component/hook/action/service and internal DTO together; reverting only the exact-decimal DTO breaks callers. The original browser-only export bypass must not be re-enabled as a recovery shortcut. No deployment or live cohort activation was performed.

## Verification and interpretation

- Seven real PostgreSQL cases passed: exact totals/CSV/audit; three simultaneous requests with one audit; stale rejection plus retained-file replay; cross-company/read-only denial; revoked-permission denial on replay; audit-sink rollback; expired password proof.
- Actual EN and FR browser journeys passed at 390, 768 and 1440 pixels, with real password confirmation, downloaded-byte comparisons, keyboard dialog containment/return, repeat download, lost-response recovery after refresh, and failed-preview recovery. Sixteen screenshots and six downloaded fixture files are retained. The response-loss/HTTP 503 cases are explicit browser fault injection; the actions, transactions, audits and downloads are real.
- The synthetic payment fixture totals 150.25 + 49.99 = 200.24. Its 10.00 refund is deliberately not deducted by this gross aggregate. Pending and deleted payments are excluded. These are precreated isolated data, not evidence that real payment processing or refunds were executed.
- The browser observed 8,409 ms (EN) and 9,794 ms (FR) from route opening to the enabled export entry. These local development measurements are not an approved production performance budget or a comparable before/after benchmark.
- Original nonfixture organizations, selected identity/role state, payments and all journal entries remained unchanged in the recorded database/browser runs. Authentication and export evidence changed only as explicitly described.
- Final focused test, typecheck, lint, source and service-boundary receipts are bound in `../../evidence/directory-export-receipt.json`. Earlier passing tests whose JSON output was blocked by filesystem restrictions are recorded separately from successful persisted receipts. The initial UI-test parser failure concerned the icon package's ESM test import; the test now stubs decorative icons while retaining the real dialog behavior.

## Review accountability

These are engineering reviews, not independent professional approvals.

| Responsibility | Finding, treatment and evidence |
| --- | --- |
| Architecture / backend / API | Service owns preview, authority and durable outcome; thin actions use server identity. Existing settings route and shell reused. Cross-company denial and failed read tests pass. |
| Database / migration / integrity | Repeatable-read snapshot, current-authority locks, deterministic audit key and one retry for database conflicts; actual concurrent requests produce one record. No schema change. |
| Security / IAM / privacy / fraud | Current report-export permission plus five-minute password proof, same tenant/actor, authority recheck on replay, formula neutralization, scoped private receipt. No new global authentication hooks. |
| Frontend / design system | Existing buttons, dialog, input, label, dashboard tokens and reduced-motion support. No global component or shell redesign. Brand action buttons indicate selection/action, not approval or health. |
| Workflow / accessibility / EN–FR | Explicit preview, unavailable reason, password confirmation, prepared-file receipt, failure/retry and interrupted request recovery; actual keyboard/dialog/reflow checks. Native screen-reader and full contrast/zoom verification remain open. |
| Product / operations / SaaS packaging | Existing company directory purpose preserved; permitted export is separate from read. No price, subscription, product activation or commercial commitment changed. |
| Finance / reconciliation / analytics | Misleading revenue label corrected; exact stored amounts and gross-sum scope explained. No balance, journal, reconciliation or refund operation added. |
| Audit / records | Mandatory evidence and exact file hash; durable same-request retrieval. Formal retention/hold controls and organization-delete cascade remain open. |
| Quality / release | Real before defect, focused regressions, isolated database and browser evidence. Full build, production rollout and full-platform completion are not claimed. |
| SRE / performance / cost / rollout | Bounded one-row/one-megabyte preparation, transaction timeouts, explicit failure and durable retry; observed development timings and recovery procedure. Production load/budget evidence remains open. |
| OHADA / country rules / statutory | Not applicable to changed calculations: no statutory formula, country pack or posting rule changes; gross diagnostic total is explicitly distinguished from revenue/cash. |
| POS / offline / purchasing / payroll | Not applicable to writes: this batch reads existing scoped aggregate/counts only and introduces no domain transition, payroll record or offline replay change. |
| Providers / events / integrations | No provider call or new event transport; existing settings module observation retained. HTTP/response-loss behavior and transactional retry are in scope and tested. |
| AI / agents | Not applicable: no agent tool, autonomous decision or approval capability changed. |

## Remaining scope

This batch does not complete all organization/access workflows. Full shell permission refresh and continuously active cross-tab propagation, personal-account administration, native screen-reader/zoom/contrast review, tab-close recovery, formal retention and the remaining platform workflows are still open. Prior rejected global authentication/provider changes and live invitation-delivery adapter remain unapplied. X1 and release approval are unchanged. The next engineering work requires no fabricated approval and remains authorized within isolated verification.
