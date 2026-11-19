# Independent review — HR21 development08

Reviewer: /root/hr09_independent_review. Read-only source and evidence review; no test execution or edits by reviewer.

Preflight identified effective-termination historical input loss: ACTIVE/DRAFT-only handoff sources omit ended approved contracts and compensation. Explicitly tracked for the next dependency slice in NEXT.md; current active-employee fixture does not claim this coverage.

Harness findings fixed before final qualification:

1. Lost-success-response interception lacked bounded/caught failure handling. It now shares transport's caught promise/deadline/finally-unroute path and validates success with no failure before deliberate response loss.
2. Mid-action password recovery tried an original mutation control removed by the denied request. It now clicks Retry exact request and compares the frozen original serialized input.
3. Added independent CSV parser and per-field reconciliation beyond exact bytes and escaping. Standard and assurance-recovered CSV files are checked.

Reviewer verified cleanup: exact URL/environment plus actual database/host/port and this-run tenant ownership, deterministic exclusive table locks, named enabled guard checks, tenant-filtered receipt-first/descending-version package deletion, restore/verify before commit, errors roll back and prevent PASS. No ALL/USER trigger bypass.

Source rereview: PASS_SCOPED after the two recovery fixes.

Fixture correction discovered during exploratory run: requester/applier initially reused the same synthetic identity, so readiness correctly blocked payment-destination proof. Fixture now uses a fourth, separate synthetic applier. Explicit approved-state prerequisites remain distinct from browser/native workflow evidence.

## Product fix and final closure

Actual attempt02 exposed CSV-marker loss between the retained file and browser download. Reviewer approved the boundary-only UTF-8/base64 transport change: raw CSV omitted from server action output, hashes/manifest and authorization unchanged, strict client decode preserves rather than adds a marker. Long Unicode/quotes/CRLF tests cover marker present and absent plus invalid UTF-8. No stale client action mocks found. The precise Flight decoder cause remains provisional; the end-to-end byte mismatch and subsequent corrected download are reproduced.

Additional harness corrections reopen collapsed details without changing the recipient draft and select the product failure alert by its text, excluding hidden accessibility announcers. Failed attempts remain separately archived.

Final evidence consistency review: **PASS_SCOPED**.

Reviewer independently matched all32 source and7 runtime hashes; browser13 stages, failures/pageErrors empty and cleanupComplete true; unit29/4 suites and types0. Independently parsed CSV files begin EF BB BF, contain two rows with100.10/200.20 salary references, and reconcile900 original/870 replacement worked minutes. Manifests link versions1→2 with one exclusion. Original issuer/recipient CSV and JSON hashes match; replacement issuer/recipient manifests match; assurance-recovered CSV equals replacement issuer bytes. Source assertions verify retained original receipt, two events of each kind and no payroll/payment effects. Reviewer inspected EN blocker and FR390px replacement screenshots. No new material finding within this slice.

Review limitation: final shutdown/workflow/register files were not independently reread after the reviewer's shell launcher reported pwsh.dll unavailable. Primary agent separately verified owned-process shutdown/closed ports, final command results and register before sealing. Reviewer ran no tests, browser or database commands. The effective-termination gap remains explicitly tracked in NEXT.md; this does not confer complete HR21 or release readiness.
