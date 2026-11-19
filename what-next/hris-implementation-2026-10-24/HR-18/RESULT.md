# HR-18 — Daily HR work queue

Status: **VERIFIED_SCOPED** for the current derived queue and protected source routing. Baseline: `9ab93a2a1d81e37ef7e0b10357885b48a3bc5886` plus preserved shared working-tree changes. Work spans 24–25 October 2026.

One current, scoped queue derives pending time requests, leave cancellations, attendance anomalies, approval blockers, missing active contracts, expired contracts/documents, personal corrections and assigned lifecycle tasks from their existing owners. It stores no duplicate work state. Counts reconcile to the same filtered detail arrays; current roles and team scope precede collection and counting. Source limits are explicit.

Direct links now resolve selected requests, reviews, corrections and documents beyond ordinary history limits. Existing decision controls remain authoritative. EN/FR views support employee/category/overdue filters, current employee details, source responsibility, due dates, waiting dates, partial coverage and access-refresh failure/retry. The queue is an additional People page.

| Acceptance | Outcome and evidence |
|---|---|
| HR-18-AC01 | PASS scoped: unit projection and real-database reconciliation at 200 employees plus manager; detail/count filters and repeatable-read concurrent insertion test. |
| HR-18-AC02 | PASS scoped: stable source IDs, duplicate projection test, lifecycle native rejection, request/cancellation/anomaly source-resolution checks; no persistent residual queue rows. |
| HR-18-AC03 | PASS scoped: manager-only report, cross-tenant/revoked-role denial, no hidden category totals, dual-role hidden-document regression. |
| HR-18-AC04 | PASS scoped: owner/responsibility on every item, exact protected source routing beyond100/200, explicit time-data-owner repair responsibility. |
| HR-18-AC05 | PASS scoped: EN/FR 360/768/1440, 200-person/empty/manager/denied states, refresh hides stale content and retries, explicit partial coverage. |

Separate evidence:

- Source: independent reviewer PASS_SCOPED, findings and fixes in `INDEPENDENT-REVIEW.md`.
- Mocked unit/component/action: final log and exact command retained in evidence manifest; includes correction exact-selection refresh regression.
- Real PostgreSQL: 10 focused tests including snapshot consistency and exact histories. Shared correctness is rerun after an overnight cluster interruption; failed connection log is retained separately from the successful retry.
- Browser: 13 scenario records in `browser/results.json`; actual components/native reads, synthetic authenticated transport; source mutation protocol already belongs to earlier slices. French 360px screenshot visually inspected.
- Performance: `performance.json` records the measured 201-employee/200-request projection, not a production SLA.
- TypeScript: bounded no-emit dependency check. No migration/build/schema promotion was required for this slice.
- Live provider, employer operations, assistive-technology certification and production authentication: NOT_RUN.

Remaining operational scope: no automatic notifications; selected-period readiness and external recipient handoff are HR-19. Current employee counts are not historical headcount. Pilot/default landing activation requires real operator acceptance. No payroll-country compliance or launch certification is claimed.

Review lenses: architecture/data consistency/security/privacy/UX/localization/QA/operations are covered above. Finance/country boundaries remain unchanged and no calculation, payment or declaration effects were added. AI, billing, commercial packaging and external integrations are not applicable to this derived read view. Rollback and operational responsibilities are in `OPERATIONS.md`.

Next eligible slice after evidence closure: HR-19, then HR-21 core-HR synthetic qualification and pilot preparation. HR-20A–D remain conditional on a selected LIVE_PAYROLL envelope.
