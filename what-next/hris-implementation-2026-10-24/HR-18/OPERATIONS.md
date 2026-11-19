# HR-18 operations

Route: `/[locale]/dashboard/people/work`, linked beside existing People pages. It is not the default landing page. Source workflows remain authoritative; no new task ledger or completion command exists.

Current actor/account/role checks precede scoped reads in a repeatable-read transaction. Returned details contain no salary amounts, bank details, original document titles/hashes or correction proposals. Exact source routes independently recheck authority. Refresh clears old private content before checking access; failure shows unavailable rather than zero. Any source reaching its bounded capacity produces an explicit partial-coverage notice.

The current-employee detail list is a current snapshot, not historical headcount. Overdue is strictly a past source due/expiry date, with no invented risk threshold. General contract gaps and pending inputs do not certify a payroll period. HR-19 owns selected-period readiness and external handoff. Unassigned anomalies are visible only to HR administrators; resolving and recertifying requires the time-data owner. No hidden global totals are sent to managers.

This read-only queue does not enqueue notifications. Existing notification preferences/delivery mechanisms remain their owners; delivery is never treated as task completion. Automated reminders and qualified delivery integration remain a later, explicitly configured operational extension. No recipients or preferences were invented.

Rollback: remove the People work link and stop using this projection; original source records, exact source routes and all source decisions remain intact. No schema migration or source backfill is required. Pilot alongside source screens and reconcile counts before any default-navigation or production activation decision.

Verification uses synthetic identities and a guarded loopback PostgreSQL instance only. Browser evidence uses actual components and service reads through a synthetic session/HTTP transport; it does not qualify production Next authentication or complete accessibility conformance. No messages, account revocations, payments, declarations or live provider calls were made.
