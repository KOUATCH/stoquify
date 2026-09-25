# Reviewed original invoice approval — 2026-09-08, source v63

Original invoice approval now has a service-owned candidate list, evidence/configuration review, current-session submission, exact-request replay and durable history. It uses the existing AP kernel and ledger. The new application form and EN/FR browser journey are still unfinished engineering. PA-019 and the platform mission remain incomplete. Selected skill: `011-aqstoqflow-purchasing-ap-controls`; continue this boundary before advancing to the next numbered skill.

## Delivered behavior

`services/purchasing/invoice-approval.service.ts` owns the review and decision. `actions/purchasing/invoice-approval.actions.ts` derives current organization, user and session from authentication and rejects inconsistent identity contexts. Client commands carry only invoice ID, reviewed revision and request key. They cannot supply tenant, approver, amounts, entitlement or session authority.

Approval and recovery reuse the same current invoice-posting authority implementation, with separate operation/surface names. Current organization/account usability, membership/role, permission, session token/expiry and purchasing entitlement are checked within the transaction. Submit requires organization-bound password assurance no older than five minutes, with no future timestamp or active lock. Managed missing, expired, suspended and read-only grants cannot submit. Maker/checker separation applies to original approval even during preview.

The v62 source validator is now shared by preview and the original posting kernel. It recomputes received-goods relationships, reserved quantities, totals/tax and exact-match variance and rejects existing effects before new liabilities. New session-aware preparations also retain a canonical source hash in their applied preparation event. This hash binds maker, invoice/document/date/currency/amounts, line quantities/prices/tax/source references and match evidence. Relation query order and later operational metadata do not change it. It is application integrity evidence, not a verified human signature.

Approval checks the preparation event's organization/source/actor, applied state, event hash, recorded result, document hash, request reference and source hash. A coordinated edit that keeps totals mathematically coherent still fails the maker-source proof. Older preparations without that proof remain visibly in `PREPARATION_REVIEW`; no historical proof or approval was fabricated. The event's document link remains a maker-supplied reference, not an upload or independent authentication of its content.

For disputed invoices, approval checks the active independent exception against the actual variance and policy. It also validates both retained request and approval event bindings, hashes, actors, expiry and decision time. A corrupted exception decision cannot authorize the invoice. This does not complete the separate exception request/review service and browser audit.

The preview revision covers invoice/supplier/source records, preparation and exception events, receipts/orders, current organization configuration, period, country resolution, effective rule, journals and accounts, plus its conditions. Submission re-reads the plan and rejects stale revisions. Serializable transactions retry recognized PostgreSQL serialization/deadlock rollbacks at most twice; exhaustion asks for the same request to be retried.

Approval distinguishes hard source/setup conditions from missing posting rules/journal warnings. An authorized operator can record a valid supplier obligation while the journal remains blocked by missing rules; the returned decision explicitly says `BLOCKED_PENDING_RULES`, with no journal/source-link success. Currency, country, period, invalid rules, ambiguous journals and source-evidence conditions block submission. Country/rule checks are application checks, not professional certification.

The existing AP kernel creates the liability and original approval event. A separate `purchase.supplier_invoice.approval_recorded` event binds the reviewed revision, exact request, preparation event and resulting approval/liability/batch/journal references. Both records and all financial effects share the transaction. Injected decision failure rolls all effects back. Exact committed replay checks current authority and the retained decision without creating another liability. Different requests competing for the same invoice cannot both apply. Cache failure after commit preserves the durable result.

History is tenant-scoped and distinguishes the recorded outcome from the currently observed status of its linked journal. Invalid decision records are shown as unverified, not silently hidden. A blocked historical approval with no linked journal does not imply a later recovery's current journal state. The separate recovery history supplies that operation's records.

The legacy `postSupplierInvoiceAction` still checks its existing authorization/input boundary, then returns `REVIEW_REQUIRED` without posting. It no longer provides an unreviewed bypass around the new command. The trusted internal AP kernel remains available for its existing domain callers; it is not an end-user authorization facade.

## Verification

| Evidence | Result / limit |
| --- | --- |
| `../environment/invoice-approval-service-940c0d7b-06a.json` | First actual service run: 20 groups passed, including normal session-aware preparation, blocked/posted approval, authority, maker boundary, source proof, stale review, concurrency, rollback, replay and history. |
| `../environment/invoice-approval-service-a01ace79-07f.json` | Final expanded run: all 21 groups passed, including corrupted exception approval evidence. Source hashes stayed unchanged during execution. |
| `../environment/invoice-ledger-recovery-52b9a15e-f60.json` | All 20 existing recovery groups passed after sharing authority and extracting the validator, including one real journal, preserved liability, concurrency, denial, stale preview, rollback and history. |
| `../../evidence/invoice-approval-service-tests-initial.json` | Despite its filename, this is the final focused test receipt: all 96 tests in seven suites passed on its first execution. It covers new action identity/error/cache semantics, strict commands/results, source-hash sensitivity/order stability, and existing AP/preparation/recovery behavior. |
| Typecheck / ESLint | Final TypeScript check and 11-file changed-code ESLint passed. |

All final database groups used new synthetic organizations in the verified owned local PostgreSQL database. Actual receiving and session-aware preparation preceded original approval; accounting rules/accounts were explicitly test-only. Existing records were compared excluding only organizations created by the current verifier. Original records remained unchanged. No worker was asked to send notifications; no external transmission or real payment was issued.

The first typecheck rejected an invented error-code literal. The implementation now uses the existing `SOD_VIOLATION` code. A scoped Node extraction write returned an operating-system `UNKNOWN` file-open error; inspection confirmed the source was intact and the generated surgical patch then succeeded. This was not an automatic approval-review rejection. No migration, deployment, production build, new browser screenshot or performance-budget pass is claimed.

## Operator inputs and where to get them

| Situation | Needed information / owner | Source and next action |
| --- | --- | --- |
| Prepare a new invoice | Maker: original supplier document, retained link, file hash, receipt quantities/prices/tax | Existing `/en|fr/dashboard/purchases/payables/prepare` workflow and supplier/receiving records. New preparations automatically retain the source proof; the operator does not enter a hash of internal database rows. |
| Review original approval | Independent AP approver: current invoice and consequences | The new service read model supplies the invoice, source evidence, amount, period/rule/journal/country and warnings. Application form integration is still pending; do not use the old action to bypass review. |
| Access/fresh authentication | Administrator and approver: current posting role, purchasing write eligibility, normal session and own password | Existing organization role/module administration and account authentication. Never put credentials into evidence or support reports. |
| Missing/changed preparation proof | AP/accounting/data owners: original maker/document and retained preparation/source records | Current invoice and event history. A controlled legacy re-attestation/reconciliation implementation is still needed; a manually added hash is not an acceptable substitute. |
| Match exception | Maker and independent reviewer: variance reason, actual supporting reference, valid decision/expiry | Retained match-exception records and decision events. The request/review workflow still needs its full current-session/revision and UI audit. |
| Posting warnings | Accounting owner: actual effective posting rules and journal configuration | Organization accounting setup. Approval records the payable while clearly reporting the missing journal; use posting recovery once setup is valid. |
| Stale/unknown submission | Approver: current preview or the exact pending request | Re-review after a definitive conflict. For an unknown transport result, retain and retry the same key after reauthentication, then inspect durable history. The upcoming interface must persist that command before transport. |

No new route is added in this checkpoint. Existing preparation and recovery routes remain available; their historical browser evidence does not verify original approval. Next implement an EN/FR review form in the current AP shell, password step-up, pending-request persistence, exact-response bindings, history, mobile/keyboard/reflow and actual browser transport. Then implement the controlled legacy-preparation path and complete the match-exception and connected AP/ledger/close lifecycle.

## Rollout and review accountability

No schema change or backfill is required. Deploy only through the normal reviewed release process after interface integration and its release checks. Preserve preparation, approval and decision events through rollback. Do not erase liabilities or re-enable the unreviewed action as a recovery shortcut. Existing prepared invoices lacking the new proof need the explicit unfinished reconciliation path; this is engineering work, not a missing commercial subscription or user approval to invent evidence.

Architecture/backend/data: shared source/authority contracts, existing domain owners, serializable review and atomic effects; no second ledger. IAM/security/privacy: server identity, current role/session/module/fresh-auth and maker boundary; no credentials in artifacts. Finance/audit/close: distinct payable/journal states, source and exception provenance, one-liability behavior and injected rollback; full close handoff open. Country/statutory: required real setup retained; no expert/legal/accounting certification. API/events: strict command, separate applied decision and safe post-commit cache behavior; legacy unreviewed action disabled. UX/localization/accessibility: read model ready; actual approval form and EN/FR browser verification pending. QA/SRE/operations: source-bound actual PostgreSQL, concurrency, corruption and recovery evidence, bounded retries; no production performance claim. Product/support: precise conditions and operator inputs; legacy path unfinished. POS/offline, HRIS/payroll, analytics, AI and commercial packaging: not applicable to this bounded approval service; retained in the wider mission.
