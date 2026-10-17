# Suspense resolution → Close publication

2026-10-04; branch `codex/migration-control-plane-release-2026-08-29`, HEAD `62a56036a5ac9b37236a20c9b148052199069479`. Cash remains primary, Close supporting, both In progress. [Bounded checklist](SUSPENSE_RESOLUTION_CLOSE_CHECKLIST_2026-10-04.md); original workflow scope and counts remain unchanged.

## Defect and correction

The [predecessor reproduction](lanes/environment/suspense-resolution-close-baseline-75af51ab-7bf5-435a-899d-ac64ab48fb97.json) used actual reconciliation, suspense posting, an independently posted manual clearing journal, maker proposal and checker decision. Resolution completed, but a prior-year in-flight Close remained unmarked as stale and persisted 17 obsolete evidence rows. Its source evidence is organization-wide: `close-assurance.service.ts` consumes the dashboard's open-suspense count and queue. The producer invalidated only its original/clearing journal periods. The fixture had genuine readiness blockers; this does not claim successful certification of those obsolete rows.

`payment-suspense-resolution.service.ts` now uses the existing catalog/complete ordered-period coordination before locking the suspense item and clearing journal. Serializable membership is compared with current committed observations; only a proven membership change restarts the entire transaction, within three attempts. Approval invalidates the same complete period set once, atomically with the source decision and allocation. Authentication age is rechecked after waits using elapsed request time. This operation links already-posted financial evidence; it does not post another journal or alter period restrictions.

Financial hashes, currency and clearing proof, reviewed revisions, maker/checker exclusions, tenant scope, unique allocation and retained decision verification remain. Rejection takes no new Close coordination locks and retains the unresolved state. Exact replay checks existing evidence and repeats no allocation or invalidation; existing sensitive-action access audit entries are still written. Duplicate callers may receive a recoverable conflict instead of both succeeding.

The change adds per-tenant contention and requires a spare connection for committed membership reads. Production calendar size, pool pressure and latency are unverified. Other suspense correction/recovery commands retain their earlier source-before-assessment lock order; compatibility under conflicting or stale commands remains a targeted follow-up, not a claim of universal producer ordering. No schema, UI, country calculation, pricing or export format changed.

## Evidence and failed attempts

[257 tests in 15 suites](evidence/suspense-resolution-close-jest-3edeece1-7782-4a16-83ba-3243f8bbbc7b.json) passed, with no failed or skipped tests. Coverage includes complete scope/order, bounded retry, post-wait expiry, rejection, exact replay, conflicting decisions, SOD, verified write-off routing, financial proof, retained records/exports, downstream exception evidence and shared Close/signing contracts. [Full no-emit TypeScript](evidence/suspense-resolution-close-typecheck-36053f43-5114-4dbc-85e5-cc79705b6dad.json) and [changed-file lint](evidence/suspense-resolution-close-lint-52055280-ce17-40b1-ae55-0b0d2c224148.json) pass with stable source bindings.

Database proof is intentionally composed from two receipts rather than repeating completed cases:

- [First acceptance run](lanes/environment/suspense-resolution-close-acceptance-c7166888-b5aa-4aee-a804-a7938802d7c7.json): seven of nine cases passed; two verifier failures remain explicitly recorded. Source bindings and outside-fixture fingerprints were stable.
- [Remaining two cases](lanes/environment/suspense-resolution-close-remaining-acceptance-b488b195-7de2-47c0-9a3a-549e64d13e9e.json): both passed after correcting the verifier, with stable source bindings and outside-fixture fingerprints. No product source changed between these receipts.

| Case | Verified observation |
|---|---|
| Prior-period in-flight publication | Approval marks Close stale; delayed collectors persist zero obsolete rows. |
| Exact replay/conflicting command/fresh assessment | Same retained allocation; changed decision refused; a fresh assessment omits the resolved suspense item. |
| Rejection | Open source, existing Close and financial records remain unchanged. |
| Old snapshot/new assessment | Two complete transaction attempts; new observation is invalidated. |
| Creator first | Actual PostgreSQL waiter 4220 blocked on holder 12248; obsolete publication discarded. |
| Producer first | Waiter 14020 blocked on holder 4220; new assessment sees resolved source without a false stale marker. |
| Authority/revision refusals | Maker, foreign tenant, missing permissions, expired authentication and stale revision produce no financial, allocation or source mutation; control audit is retained. |
| Late failure and retry | Injected failure after actual resolution, allocation and Close invalidation rolls back all observed rows. Fresh transaction succeeds; exact replay creates no further allocation. |
| Simultaneous identical decisions | One durable decision and allocation; competing request gets CONFLICT; replay recovers the receipt. Financial records unchanged. |

The [initial acceptance attempt](lanes/environment/suspense-resolution-close-acceptance-e1c23c01-1d53-46ec-9027-bd859841f1ab.json) stopped on an already-used synthetic organization ID before executing any case. Unique fixture IDs fixed that. The later rollback verifier accessed `receiptId` on the transaction's control envelope instead of its `value`; it now inspects the actual decision receipt and stale Close inside the transaction. A long fixture name exceeded the real invoice-number validator; shorter unique names fixed the duplicate fixture. None required product changes.

Two earlier unit attempts are retained: [missing audit-log mock](evidence/suspense-resolution-close-jest-8bf97612-cd78-43cd-9acb-d194eb84996a.json), then [incorrect authentication error-class expectation](evidence/suspense-resolution-close-jest-c17ea488-2260-49c6-ba63-19eb58a0ecfe.json). The final test asserts the established `FRESH_AUTH_REQUIRED` contract and no source/allocation writes; controls were not relaxed.

## Guidance, review and remaining scope

After approved resolution, rerun affected Close assessments. A resolved suspense item leaving the work queue does not resolve its separate payment exception, sign reconciliation, supply missing statements or make Close ready. Retain original posting, clearing, proposal, decision and allocation references. Use the existing controlled recovery procedure to undo financial treatment; never delete the records. After a conflict, refresh the independent review or retry the same exact command when recovering an uncertain response. Authenticate again after expiry.

Architecture/backend/data review covers ordering, transaction restart and atomicity; security review covers existing authority and post-wait expiry, while broader persisted role/session revocation races remain open. Finance/audit review covers independent posted clearing, allocation uniqueness, no extra journal and preserved source history. SRE/operations review records contention, pool and retry limitations. Product/UX review confirms there is no new user step, UI or localization change; no new browser/accessibility result is claimed. Statutory calculation, AI and commercial packaging are not applicable to this correction. No professional or release certification is asserted.

Existing certified-export semantics are unchanged and covered by retained regression tests; this milestone did not create a new fully ready Close certificate. The earlier exception runtime receipt's exact source binding is historical because its financial-resolution prerequisite changed. Current downstream exception tests pass; the earlier eleven exception cases were not all rerun. Previous creation/refresh/preparation runtime bindings remain unchanged. Completed workflows are not reopened solely by a broader fixture dependency hash.

Next inspect provider event capture and statement import → Close publication: current source still invalidates only source-date overlaps while Close uses organization-wide provider/statement availability. Reproduce that before patching. Retain the suspense correction/recovery ordering follow-up and manual allocation review. All other original authority, recovery, provider evidence, native accessibility, capacity and rollout requirements remain open.

The existing static boundary finding, separately scoped aggregate policy/release gates and rejected all-period manual-posting proposal remain recorded and unresolved. Only the registered disposable loopback database was used. No migration/default build, live approval/payment, external message, deployment or X1 clearance occurred. Full workflow modernization remains active.
