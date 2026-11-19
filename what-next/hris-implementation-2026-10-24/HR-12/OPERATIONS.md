# HR-12 operating and recovery boundary

This is software evidence using synthetic employer policies, not country employment-law approval. No live job, employer policy, migration or production entitlement was activated.

## Policy preparation

Use People setup to prepare a named, dated, versioned policy. Select its employee, exact minute entitlement and credit dates, carryover source/limit and expiry choice. The interface requires acknowledgement of exact whole-minute conversion and no negative balance. Another HR reviewer approves the retained policy facts. The API contract supports an explicit list of up to 200 employees; the guided form enrolls one employee per preparation.

Policy dates are inclusive local work-date labels stored at UTC midnight. Different leave types may be eligible together. Overlapping versions of one leave type for the same employee cannot be approved. Split requests at version boundaries. The shift belongs wholly to its local start date, including overnight and month boundaries.

No unknown legacy JSON is interpreted as an entitlement rule. Review legacy balances and establish an approved opening balance in a declared policy with retained reconciliation evidence. Do not bulk copy balances or edit approved history. Existing open-ended legacy policies need an employer-approved migration decision before replacing their same-code effective interval; this slice does not invent one.

## Daily operation

The employee chooses a policy explicitly. Whole-minute requests support explicit date allocations for partial multi-day leave. Single-date hours/days convert on the server using the reviewed schedule, retain the entered quantity and source schedule, and show the equation. Approval checks available ledger funds and combined approved leave capacity across all leave types. Payroll certification still reconciles actual imported attendance independently.

HR opens an employee's leave workspace from People administration. Current credits minus debits reproduce today's balance; future credits/debits appear separately. Movement IDs and source references remain available. Reviewed manual adjustments require a reason and evidence reference. Identical UI submissions derive the same request key across reloads; for a genuinely distinct adjustment provide its distinct reviewed evidence/reason.

Execute due entitlements through an explicit date no later than today. This is an authorized catch-up command, not an installed recurring scheduler. Credits follow the approved dates/amounts. Automatic rate formulas, prorating, negative balances and implicit rounding are unsupported and blocked. Exact committed retries recover retained events even after retirement; missing new effects still require active eligibility.

Carryover transfers the capped closing balance of the named prior same-type/country policy. The source closes once and the target credit references that settlement. Missing source credits, pending requests/cancellation reviews, and later ledger movements block settlement. Expiry closes the remaining source balance; no historical row is deleted. Only one successor transfer can consume a source policy settlement for an employee.

## Cancellation and recovery

Pending leave may be withdrawn without a credit. Approved leave needs a cancellation request and another HR reviewer. Approval appends one inverse of the exact retained debit, with its original entry ID and evidence. A rejection records a decision audit without refund. Exact retries do not refund again. Settled balances and retained calculated/paid payroll require their controlled adjustment path; they are not reopened by this feature.

Disable or stop calling entitlement execution to halt future automation. Retain approved policy versions, entries, audit events and request history. Do not delete posted events or run generic rollback SQL. Use reviewed compensating adjustments and the payroll correction workflow where consumed payroll is involved.

## Evidence limits

Database cases use only the owned loopback PostgreSQL database and synthetic namespaces, with cleanup. Rendered checks use actual React components and project CSS against real services, with synthetic HTTP roles/action adapters. They do not establish full Next/BetterAuth integration, screen-reader conformance, live provider acceptance, production performance, or legal compliance. Production rollout still requires actual employer rule review and the later release/pilot gates.
