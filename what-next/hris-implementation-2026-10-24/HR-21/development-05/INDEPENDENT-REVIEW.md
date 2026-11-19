# Independent review — HR21 development05

Reviewer: `/root/hr09_independent_review`, independent read-only agent. No implementation, application, database or test execution was delegated to this reviewer.

Final verdict: PASS_SCOPED — source review. All reported recovery findings are resolved. Confirmed writes remain visible when refresh fails, authority denials hide private data, and uncertain retries retain their exact envelope without automatic resubmission. No new material findings.

## Findings and disposition

1. Initial fresh-auth read failures had no recovery. Added an explicit password gate followed by a server-authorized refresh; no private initial data is supplied to the gate.
2. HR mutation clients lacked recovery, and handoff conversion discarded error codes. Connected structured failures to the shared password dialog before error conversion. Business actions require explicit retry.
3. Delayed overlapping denials could reopen a dismissed or completed password challenge. Added a challenge epoch alongside the route/scope generation; cancellation and verification regressions cover both sequences.
4. New buttons referenced undefined classes. Replaced them with existing `dashboard-button-primary/secondary` styles.
5. Authoring used initial selection rather than live employee/navigation state. Moved recovery into the state-owning authoring component and added deferred-save/employee-switch coverage.
6. Controlled review retained private facts after authority denial. Hide them and require renewed authority. Preserve a separate non-rendered frozen decision when an earlier outcome is uncertain, so an explicit retry can recover its original receipt.
7. Correction/task handlers discarded uncertain envelopes for freshness-related HTTP403 responses. Preserve the original command/key during password confirmation. Hard authority failures hide private content while preserving explicit original-result recovery.
8. Correction/task post-commit refresh catches swallowed authority denial or hid a confirmed outcome. Classify denied reads, hide the old private list and retain the confirmed notice. Regressions cover direct success followed by403 and recovered receipts followed by refresh failure.

The reviewer examined the final production changes and the added regression cases. The reviewer did not execute or independently attest the final test results; those are separately retained in evidence.json. Broader actual business journeys, statutory correctness, external providers, human acceptance and production release remain outside this verdict.
