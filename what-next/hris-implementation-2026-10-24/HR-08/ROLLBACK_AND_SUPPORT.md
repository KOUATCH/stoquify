# Correctness recovery and support rehearsal

This is a synthetic engineering rehearsal. No customer payroll, provider, tenant settings or release configuration was changed.

## Rehearsed recovery

1. HR-02 correction transaction deliberately aborts after attempted changes. The PostgreSQL test verifies no new committed correction/snapshot/event outcome, then retries successfully. The original import and original snapshot totals/hashes remain retained.
2. HR-01 contenders share a start barrier. Only the valid debit wins; the losing approval/debit/event cannot partially commit. Exact replay returns the original outcome, changed semantic identity conflicts, and later-effective commitments cannot make the running balance negative.
3. HR-07 actual emission with unsupported evidence reaches the real admission guard after authorization. The failed transaction restores the previous audit count, run status/version and event count; no payslip, transition or payment batch is created. This proves transaction rollback, not a production schema rollback.
4. HR-07 seeds an explicitly synthetic retained emission. Repeated exact recovery after its pack becomes unavailable returns the retained result. Changed payload conflicts, and payslip/transition counts remain one.
5. HR-05/06 revoked manager, own-only and unauthorized role fixtures lose team access; a failed People API response renders unavailable/retry without a zero count. The six browser cases retain filters through back navigation. The local harness uses synthetic identities, not production session cookies.
6. Every database suite deletes only its generated namespace and asserts organization cleanup. The server/cluster is task-owned and is stopped after final verification; evidence is retained.
7. Independent review added the reverse lifecycle sequence: an existing frozen snapshot prevents a new conflicting lifecycle request before effects. A legacy approved but unapplied proposal can be independently rejected, with approval history preserved in audit. Its earlier snapshot is unchanged and a later supported proposal can proceed.
8. Payroll replay requires current sensitive permission and fresh authentication. Exact retained declaration evidence remains recoverable after its state/time advance and after adapter retirement; a new effect still fails current adapter/admission checks. The worker requires explicit trusted actor authority before leasing or submission.
9. The payroll source projection rechecks operational schedules, policies, imports, balances, requests and totals before consumption. Unchanged or freshly recertified proof passes; changed inputs and open anomalies block. The new anomaly test initially exposed cleanup ordering; the failed run is retained and exact-namespace cleanup was repaired and verified in cleanup-recovery.json.

## Operational rollback decision

If certification invariants fail, stop new certification for the affected source/allocation version. Preserve imports, requests, reviews, supersession links and historical payroll. Resolve through the existing correction/adjustment path; do not edit paid history. A pending employment change affecting the target period now blocks early certification, avoiding a frozen snapshot that could prevent the due lifecycle change.

If manager discovery fails, restrict the affected People/team capability through existing authorization controls. Never recover by granting tenant-wide access. Restore compatible API and People UI together; a capped legacy list must be labeled incomplete or unavailable. The saved before-files and HR-00 inherited diff are evidence for a scoped revert review, not permission to reset this shared dirty checkout.

If admission fails, retain the closed gate for new financial/external effects. Continue authorized retrieval and settlement/reversal recovery. Do not promote rules, forge review hashes or disable admission to unblock an operator. Live provider failures require their separate provider runbook; the fixture adapter is not bank acceptance evidence.

## Support diagnosis

| Symptom / safe code | Diagnose | Recovery |
|---|---|---|
| Leave balance/debit conflict | Employee, explicit policy, effective date, idempotency key and later commitments | Review ledger evidence; retry only the same intended command or submit a separately reviewed correction. |
| HRIS_CORRECTION_STALE | Target entry plus expected current hash versus retained approved overlay | Refresh the target and request a new independent review. |
| HRIS_TIME_FRESH_APPROVAL_REQUIRED | Source/request/schedule/policy evidence changed since frozen snapshot | Review the changed inputs and issue a fresh approval; preserve the earlier snapshot. |
| HRIS_TIME_INPUT_UNAPPROVED | Open anomaly or pending request in the complete allocation interval | Resolve through the owning workflow before certification. |
| HRIS_TIME_EMPLOYMENT_CHANGE_PENDING | Requested/approved lifecycle effective date intersects or predates the target period | Resolve the lifecycle at its permitted effective time, then recertify current inputs. No early application. |
| Lifecycle overlaps certified input | New request or approval overlaps retained attendance/payroll | Reject an unapplied proposal through independent review. Do not change the factual employment date to bypass the guard; retrospective employment corrections need a separately supported process. |
| HRIS_OPERATIONAL_ATTENDANCE_STALE | Current policy, schedule, import, balance or approved time-request proof differs from frozen source | Obtain fresh independent review and a linked certification revision; preserve original evidence. Sealed payroll requires the retained adjustment path. |
| FRESH_AUTH_REQUIRED / permission denial on retry or worker | Current trusted actor context at the service boundary | Refresh legitimate authentication/permission. Never restore by synthesizing worker permissions or reusing stale context. |
| Missing scheduled date / contradictory minutes | Local start-date label, reviewed schedule/calendar, employment interval, worked/absence/leave conservation | Complete or correct source evidence. Do not clamp totals or guess holiday/eligibility rules. |
| Manager scope denied | Current actor identity; tenant target; relationship/assignment/unit/delegation valid now and at as-of date | Restore a legitimately reviewed grant if appropriate; former authority alone is insufficient. |
| People unavailable | Correlation/error category and server availability; retain current URL filters | Retry after recovery. Absence of a result is not zero employees. |
| PAYROLL_PRODUCTION_ADMISSION_BLOCKED | CM/monthly scope; current reviewed families, input hashes, scenario and release evidence | Recalculate/review through existing controls. Historical exact recovery remains separate. |

Record IDs, correlation and safe error category. Do not collect salary, bank details, document contents or secrets in support logs. Independent review is recorded in INDEPENDENT_REVIEW.md and independent-review.json. Legal eligibility, production migration replay and full authenticated-session tests remain separate acceptance obligations.
