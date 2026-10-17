# Close certification serialization and current proof

Primary workflow: **FA-CASH-COMMAND**; supporting dependency: **FA-CLOSE-PACK**. The Close destination correction is part of the Cash handoff and is also recorded against its existing FA-CLOSE-READ owner. These delivered corrections do not close those complete workflows or the platform assignment.

Source: `codex/migration-control-plane-release-2026-08-29`, HEAD `62a56036a5ac9b37236a20c9b148052199069479`, 2026-10-01. Shared changes preserved. The final scoped review binds the exact current files and receipts. No migration or deployment was needed.

## What changed and why

Certification previously loaded a close run, read its controls, then unconditionally wrote CERTIFIED using the earlier metadata. An independent invalidation could commit BLOCKED/stale between those operations and be overwritten. The retained predecessor module reproduced that sequence on separate PostgreSQL connections: committed BLOCKED/EVIDENCE_STALE became CERTIFIED without stale metadata.

Certification and invalidation now take the same tenant-scoped `FOR NO KEY UPDATE` lock before reading the run. If invalidation commits first, certification reads the changed state and rejects. If certification commits first, a waiting implicit source invalidation selects the newly retained certified export under the lock and marks it stale. Export hashes and historical certification remain retained; explicit export references, draft behavior, actor controls and audit/event references remain intact. Discovered run IDs are ordered within each invalidation call. This does not establish global ordering across every multi-period producer.

The Close dashboard now derives a current-proof DTO from complete tenant-scoped findings, checklist items, evidence and current certified exports in a RepeatableRead transaction. It reuses the existing evidence grading policy. Current proof is separate from recorded status, readiness and trust. Missing or invalidated evidence shows **Review required / Examen requis** and the corresponding recovery guidance. Failed reads propagate; cached history is retained with current proof marked unavailable and a retry action.

The journey summary and detailed panel now consume the same live query response. Keeping the journey as a server-rendered sibling would have left an old certified summary above a refreshed blocked panel. The route still uses its existing authorization gate. Existing dashboard tokens, badges, panels and navigation are reused: current failures use danger, recorded readiness is informational, and draft export is not presented as certified readiness. Private invalidation metadata is excluded from the new proof DTO.

## Bounded acceptance and verification

| Criterion | Evidence and result |
|---|---|
| Reproduce the lost update and verify both corrected write orderings | Actual services produced READY/T4 in two owned synthetic organizations. PostgreSQL `pg_blocking_pids` confirmed separate connections waiting on the shared run lock. Both corrected orderings passed; the predecessor overwrite reproduced. |
| Retain artifacts and financial integrity | Certification-first retained the new export and its content hash, then marked it stale. Invalidation-first rejected certification and preserved the existing draft unchanged. Eight financial-model hashes stayed unchanged during each operation; outside-fixture records stayed unchanged. |
| Current selected proof agrees with authoritative evidence | Seven owned database cases passed for missing/current/stale exports, unavailable controls/evidence, scoped relations, preserved broader obligations, and failure/retry. |
| Reads stay coherent across invalidation | Both the aggregate snapshot and selected dashboard were paused after real reads while a separate connection committed invalidation. Each returned a complete earlier revision; the next read was blocked. |
| Tenant boundaries remain effective | Foreign-owned checklist/finding/evidence relations were excluded, a foreign certified export could not certify the selected local run, and a foreign period was denied. Deliberately inconsistent relations existed only between newly owned test organizations. |
| Cash-to-Close guidance is usable in EN/FR | Actual EN 1440px and FR 320px application journeys passed. Native disclosure keyboard/focus checks, localized conditions, authorized navigation, current proof versus recorded status, and horizontal reflow passed. Eight screenshots retained; both destination screenshots visually inspected. |
| Focused regression and integration checks | **247 tests across 10 suites**, changed-file lint, TypeScript, service-boundary gate and ledger-to-close truth gate passed with stable source bindings. |

The writer fixtures used actual setup, posting-rule, journal-posting, assessment and export services. Setup created two synthetic balanced journals, four lines, two batches and two source links; those setup effects are separately recorded. They are not actual customer transactions or professional approvals. The invalidation input was synthetic and did not mutate inventory. Empty inventory and no payroll mean nonempty-domain certification prerequisites were not exercised.

Detailed receipts, recorded once:

- `evidence/close-write-current-jest-8825965a-f8f0-474e-af39-4ea783d0e0dc.json`
- `evidence/close-write-current-lint-566488b9-5fd5-4074-9088-b3f2a105fe23.json`
- `evidence/close-write-current-typecheck-0aedf6d6-3cef-44f7-82eb-5f7f503c53c9.json`
- `evidence/close-write-current-boundary-c1bac904-da65-46d1-9b69-5d5bc2f479e5.json`
- `evidence/close-write-current-ledger-c9cc3ed1-aab1-4157-9e09-f91c377b3d84.json`
- `lanes/environment/close-pack-write-race-runtime-407b83ef-adb2-4415-8474-c6b19fd4836a.json`
- `lanes/environment/close-current-proof-runtime-a4c26f9c-4ae4-49c0-923f-34a0d273a9ad.json`
- `lanes/environment/close-current-proof-browser-b2471a0c-712f-4566-b23f-623836a0472c.json`

The initial aggregate retained **240 passed / 1 failed** in `close-write-current-jest-8a2ad8f7-41ec-490a-9286-0f5624982b09.json`: two empty-state details still claimed no blockers. Both messages were corrected. Independent review also found and corrected the static journey-summary problem before the final aggregate. A workspace shell copy was denied; the authorized file-tool write succeeded. No approval-review rejection or outstanding verification process remains.

Observed development Cash page-ready times were **8,691ms EN / 7,023ms FR**, with compilation/cache/environment effects; these are not a production budget or proof of a speedup. No full migration-bearing build or broad release-policy chain was run. The two selected gates are source contract checks, not certification.

## How to use and recover

Open `/{locale}/dashboard/finance/cash-command`, expand the close review conditions, and follow the permitted Close action. At `/{locale}/dashboard/accounting/close`, inspect **Current close evidence / Preuves actuelles de clôture**. The recorded CERTIFIED label or 100% score describes saved history and cannot override a current blocker. Select the relevant period; Cash's organization-wide obligations can include other periods and intentionally differ from one selected run.

For missing evidence, the accounting reviewer needs the correct organization/period, a current assessment, completed controls and a retained certified export obtained through the application's existing authorized process. For invalidated evidence, review the source change and run a new assessment before requesting certification. For a read failure, retry; do not edit status fields or treat absent data as zero. No additional information from the user is required to use this correction locally. Genuine country/expert approvals remain the responsibility of the relevant authorized professional where applicable.

## Rollout, recovery and remaining scope

No schema/backfill change. Release through the existing approved process. Observe transaction timeouts and close-read latency for representative tenants: certification/invalidation now contend on the same run, and selected proof uses one database snapshot. A reverted lock or current-proof change would reintroduce the documented defect; keep that risk with any rollback decision. Never delete retained packs or stale evidence to recover.

Remaining engineering includes new-run discovery and assessment races, global multi-period lock ordering, interrupted processing, complete producer invocation coverage, and whether invalidation evidence inside a denied export rolls back with that denial. Whole-page Cash source/authority consistency, full workflow lifecycle reconciliation, native screen reader, actual browser zoom, comprehensive contrast/hydration and production performance remain open. Inherited French page copy still contains untranslated counters outside the new proof guidance; the entire Close page is not claimed fully localized. The predecessor comparison loads only captured pack-module bytes in memory against current dependencies, not a complete historical build.

Architecture/backend/data, IAM/tenant privacy, frontend/design system, workflow/localization, product, quality and SRE responsibilities were applied. Independent review found no remaining material issue within the changed contract after the journey correction. Finance/audit/event review covers evidence truth, retained records and transactional behavior; outbox delivery was not exercised. OHADA/statutory approval is neither supplied nor claimed. Pricing/billing, provider execution, offline/POS, payroll calculation and AI behavior are not applicable to this correction because those operations are unchanged; their original workflows remain in the register. No live approval, payment, external message, deployment, X1 clearance or platform completion is claimed.
