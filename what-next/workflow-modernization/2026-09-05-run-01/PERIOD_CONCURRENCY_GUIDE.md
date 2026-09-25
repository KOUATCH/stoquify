# Accounting period closure and concurrent work

The shared accounting period check now coordinates transactional writers with period closure. A writer holds a shared period lock until its transaction ends. Closing takes the conflicting exclusive lock before its preflight, then retains it through the close decision and commit.

If a writer starts first, close waits and checks the writer's committed results. If close starts first, the writer waits and must validate the period's new state. A second close does not create a duplicate close audit. Independent writers can share a period, and different tenants remain independent.

Manual journal posting also uses this locked, current period rather than trusting the period relation loaded with the draft. It rejects a draft whose assigned period no longer matches its accounting date. Existing permissions, fresh authentication, balancing and independent approval remain required.

```mermaid
sequenceDiagram
  participant W as Posting transaction
  participant P as Accounting period
  participant C as Close transaction
  W->>P: Read and hold shared lock
  W->>W: Record permitted effects
  C->>P: Request exclusive lock
  Note over C,P: Wait while writer is active
  W->>P: Commit and release lock
  P->>C: Grant exclusive lock
  C->>C: Run fresh preflight and controls
  C->>P: Close or reject; release lock
```

## Operator guidance and required information

The existing accounting setup route is `/en/dashboard/accounting/setup` or `/fr/dashboard/accounting/setup`. This batch changes the service controls; it does not establish a newly verified browser workflow. Continue through the existing authorized interface.

| Situation / information | Owner and source | Action |
| --- | --- | --- |
| Which period to close | Accounting owner; tenant fiscal-year and period register | Select the actual period. Period closure and close-pack certification remain separate operations. |
| Permission and fresh authentication | Signed-in operator and organization access administrator; current role/session | Existing `accounting.period.close` authority and fresh authentication are required. |
| Close waits for active work | Operator; current application response and operational logs | Let the existing transaction finish. Do not repeatedly submit new commands to defeat the wait. |
| Preflight now reports a pending/failed posting | Accounting/AP/inventory owner; retained source record and ledger batch | Review and resolve the actual posting obligation, then run close again. A previous clean preview may have preceded that transaction. |
| Posting reports a closed period | Accounting owner; actual document date and period state | Determine the proper correction date or period treatment. Do not change a date solely to bypass the gate. |
| Manual journal period mismatch | Journal preparer and accounting reviewer; draft date and assigned period | Review and correct the draft through its existing controls before posting. |
| Timeout or unknown response | Operator and support; retained request ID and resulting record | Check the actual outcome before retrying. Existing idempotency applies; a timeout does not prove rollback. |
| Suspected long lock wait | Support/engineering; transaction logs, period ID and organization scope | Identify the active transaction and its legitimate work. Do not remove financial controls or terminate database activity without an incident decision. |

No new organizational approval is required to finish the remaining software integration. Real period treatment, operator authority and accounting decisions remain organizational responsibilities.

## Implementation and rollout

Production changes are limited to `services/accounting/periods.service.ts` and `services/accounting/posting.service.ts`. Transactional `getOpenPeriodForDate` uses one parameterized PostgreSQL `SELECT … FOR SHARE`; it validates the returned row after any wait. Root-client calls remain read-only checks and cannot hold a transaction lock. Writers must pass their transaction. Close locks the tenant-scoped period row with `FOR UPDATE` before preflight. There is no schema migration or new ledger.

Release both files together through the existing process. Monitor transaction failures and lock-wait duration using actual operational evidence; this batch introduces no approved production latency budget. Keep transactions short and retain existing retry/error handling. A serializable transaction may report a concurrency conflict instead of waiting to completion; it must not fabricate success.

No production deployment, live payment, external message, database reset or X1 clearance occurred. A code rollback reintroduces the demonstrated race; pausing affected commands during incident review is safer than treating the older behavior as equivalent. Preserve all committed postings, reversals, audits and period records.

## Coverage and remaining boundaries

Five deterministic owned-database interleavings and 17 actual AP/stock reversal checks passed. The final regression suite covers accounting, customer settlement, POS postings, purchasing, inventory and payroll boundaries. See `PERIOD_CONCURRENCY_VERIFICATION_V86.md` and `evidence/period-concurrency-v86.json` for exact source bindings and limits.

This is not a claim that every writer is now coordinated. Source review found these immediate remaining paths:

- `payment-suspense-workflow.service.ts` resolves an open period with its own unlocked query; its suspense-ledger writer must join the protocol.
- `payment-reconciliation-certification.service.ts` can use the period relation cached on a run or another unlocked query before sign-off. It needs a locked current period check.
- Low-level posting-batch creation, other direct period readers, null-period obligations and any writes outside the shared helper require caller-by-caller verification.

The source census records these boundaries without calling them verified workflows. Overlapping period setup, full authorization/session and UI journeys, missing AP reversal forms, historical invoice-status repair, notification delivery and broader platform workflows remain open. Existing period/date selection semantics are preserved; no statutory interpretation or certification is supplied.

## Review responsibilities

| Responsibility | Engineering assessment |
| --- | --- |
| Architecture/backend/database | Shared/exclusive row-lock protocol; same-transaction validation and close preflight; no schema change. Actual wait ordering and outcomes tested. |
| Security/IAM/privacy | Tenant-scoped locks and cross-tenant denial; current action protection remains. Full session, role and module runtime matrix is not certified. |
| Finance/ledger/close | Pending work committed before close is visible to preflight; manual journal period checked afresh; outstanding independent writers identified. |
| Inventory/AP/POS/customer settlement/payroll | Shared helper consumers covered by focused regressions; actual AP/stock reversal effects revalidated. Entire domain lifecycles remain incomplete. |
| Audit/events/operations | Concurrent close produces one retained close audit; new posting blockers prevent close. No notification dispatch tested. |
| QA/SRE/release | Negative pre-change tests, deterministic database waits, cross-domain regressions and source bindings. No production performance certification. |
| UI/accessibility/EN-FR | No UI changes or new browser pass claimed. Existing setup and manual-journal journeys require their complete workflow visits. |
| Statutory/country compliance | Existing engineering period controls only. Actual accounting treatment requires the appropriate expert/organization decision. |
| Analytics/product/support | Current state and clear recovery guidance; no new KPI or commercial promise. |
| SaaS packaging, AI/agents, offline transport | Not applicable: no packaging, agent authority or offline transport changes. |

Selected skill remains `011-aqstoqflow-purchasing-ap-controls` for the AP/close dependency. Next numbered skill is `012-aqstoqflow-payroll-presence-engine` after outstanding AP work. These reviews are not independent professional approvals.
