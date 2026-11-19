# AF13 practice metric contract

**Implemented:** 25 October 2026, synthetic development scope. See [result](RESULT.md) and [scope authorization](SYNTHETIC_DEVELOPMENT_SCOPE.md). Live firm validation remains deferred.

## Identity and retained inputs

Every revision belongs to one existing firm, engagement, client and accounting period. Staff are existing firm users with effective assignments. Assignment alone never grants client access. The current named mandate, enrollment, engagement restrictions, module access, usable account and permissions remain mandatory.

FirmPracticeRevision stores append-only PLAN, EFFORT or FEE versions with original recorder, current actor, independent reviewer where applicable, reason, payload hash and idempotency key. Corrections create new versions; UPDATE and DELETE are rejected. Review creates another version of the same payload. Current figures use the latest revision of each logical record, never the sum of corrections.

| Input | Meaning and limits |
|---|---|
| PLAN | Explicit estimated minutes for one assignee or unassigned work in one engagement-period; integer 0–1,000,000. One logical plan per assignee. Not available capacity. |
| EFFORT | Manual declaration by the signed-in person; integer 0–1,440 per record. Work date must exist, be nonfuture and fall within the accounting period, using UTC. Multiple declarations may exist; completeness is never assumed. |
| FEE | Confidential estimate, one logical record per currency. Decimal string with two fractional digits and at most 12 integer digits. Development currencies: XAF, XOF, EUR and USD. Storage precision is not a statutory invoicing rule. |
| References | Optional AF12 advisory revision and existing workpaper review decision IDs, validated in the same scope. No evidence body, advisory private note or payroll field is copied. |
| Reason | Required 10–500 character explanation. UI instructs users not to enter client evidence/private documents. Retained as private firm history. |

## Calculations and missingness

| Metric | Contract |
|---|---|
| Planned minutes | Latest PLAN for the assignee; null if absent. Explicit zero stays zero. |
| Recorded minutes | Sum of latest EFFORT declarations for the assignee; null when none exist. Partial manual declarations, not total actual work. |
| Effort variance | Recorded minus planned minutes; null if either is absent. Negative variance does not prove spare capacity. |
| Planned subtotal | Sum of supplied latest plans, including unassigned. Missing-plan count retained. |
| Unassigned work | Explicit PLAN with null assignee; never silently allocated. |
| Corrections | SAVE revisions beyond version 1; REVIEW revisions excluded. |
| Review state | Latest revision's independent reviewer. A later correction becomes unreviewed. |
| Fee per planned hour | Fee cents × 60 ÷ supplied planned-minute subtotal, rounded half-up to cents using integer arithmetic. Null if subtotal is absent/zero. Separate calculation per currency; incomplete plans make the ratio incomplete. |
| Realized fee variance/profitability | Unknown (null). No invoices, receipts or cost basis are inferred from budgets. |

The synthetic scenario preserves 1,140 planned minutes when reallocating 120 unassigned minutes. Corrected effort is 180, not 120 + 180. XAF 90,000.00 and EUR 150.00 budgets remain separate. The browser adds USD 30.00; no FX total is produced.

## Coverage and access

The UI selects one engagement-period. The service accepts 1–10 explicit authorized client-period scopes, rejects duplicate client-period attribution and fails the complete request when any selected scope is unauthorized. It never claims a whole-firm census. Reads carry observation time, scope, mode and economics-inclusion status.

Per scope: at most 500 retained revisions and 100 assignees. Exceeding a bound fails explicitly rather than returning truncated subtotals. Reference choices show the latest 20 advisory versions and 20 review decisions with a partial-choice indicator. These are development limits to validate in a later pilot.

Own mode includes only the current person's effort/plans. Management mode requires existing firm-management authority. Fees additionally require current finance.profitability.read. AF12 elapsed review/client time remains context, never labor time; its live baseline is still unestablished.

## Export and interpretation

The JSON snapshot exports the authorized selected scope, revision history, observation time, content hash and existing watermark/audit controls. Export requires current export permission and fresh authentication. Fees require the same economics permission as reads. Firm snapshots are not stored in client close deliverables.

Downloads reflect estimates and declarations at their observation time. Later corrections produce a new current snapshot. AF13 calls no payroll, billing, subscription, ledger, payment or tax writer.

