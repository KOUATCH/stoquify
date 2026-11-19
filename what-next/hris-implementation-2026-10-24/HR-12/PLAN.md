# HR-12 — Operational leave

One active slice, split into ordered child deliverables because this is M–L work.

1. HR-12A: explicit approved employee/policy eligibility, policy choice, as-of balance reconciliation, linked request cancellation and retained payroll boundary. Reuse existing policy JSON, employee lock, ledger and request status; no schema migration.
2. HR-12B: explicitly approved scheduled credits and end-of-policy carryover/expiry, deterministic execution keys, linked compensations, HR adjustment reasons. No inferred statutory rates. Undefined or unsupported policy facts block calculations.
3. HR-12C: integrate EN/FR employee and manager journeys, focused units, isolated PostgreSQL concurrency/replay/rollback, browser checks, independent review, evidence and register closure.

Baseline: 9ab93a2a1d81e37ef7e0b10357885b48a3bc5886 plus inherited shared changes. HR-10/11 scoped evidence is retained. Existing HR-01 atomic minimum-balance checks and HR-03 work-date allocations remain authoritative. Overnight shifts belong wholly to their local start date.

Narrow ownership: new leave-policy contract and entitlement service/tests; leave-balance and operational-time owners; existing operational-time actions/request/approval panels and self-service projection; focused test fixtures and HR-12 evidence. Add only the manager leave entry surface required for this workflow. No changes to employee/payroll payment owners or unrelated files.

Current gaps reproduced by source: request UI picks balances[0]; request owner only checks policy effective dates, not employee eligibility; own-balance sums future movements; CANCELLED enum exists without a cancellation command. Existing JSON accrualRule has no required operational contract. Existing prepare/independent approval of time foundation will own reviewed rules; no new approval engine.

Policy contract will explicitly declare employee IDs, exact integer-minute quantities, negative-balance prohibition, scheduled credits, and expiry/carryover facts. Effective versions are selected explicitly; crossing versions requires split requests. Unknown legacy policy rules remain visible as unresolved but cannot authorize new effects. Exact committed replay stays recoverable. Employer approval for live rules remains external; synthetic fixtures only establish software behavior.

Writes: employee lock before policy/ledger checks; ledger/audit/request transition in one Read Committed transaction; retained payroll runs prevent retrospective cancellation. Reads: current authorization, effective-date facts, separate current/future amounts and immutable movement references. No production data, deployments, live scheduler activation or statutory certification.

Verification commands are inspected before use. PostgreSQL remains the owned loopback database on 55464 with bounded synthetic fixtures and cleanup assertions. Browser harness evidence is distinct from full application authentication or accessibility certification. Rollback stops new scheduled execution and retains all posted history; corrections use linked entries.
