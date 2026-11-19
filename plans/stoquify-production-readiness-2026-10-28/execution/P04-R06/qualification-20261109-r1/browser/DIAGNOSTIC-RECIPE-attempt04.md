# P04-R06 browser observer attempt04

Prepared 2026-11-10 by `/root/r06_source_resume`. Primary independent reviewer must admit exact source before the runtime owner executes it. No product, previous harness, configuration or production changes.

- Observer: `run-browser-diagnostic-attempt04.cjs`.
- SHA256: `a23bbe9ead520d0c0b359fd04907f017e4e7281115743ebbc14f56d7fd0ea0fe`.
- Exports and injected helper/control interface are unchanged from admitted attempt03.
- New exclusive output directory: `browser-diagnostic-attempt04`; refuses overwrite.
- Runtime owner controls the existing accepted artifact, local servers, bridge, real credentials and native database controls. This module starts no server, browser, compiler or database connection.

## Preserved assertions

All six EN/FR authorized, exact-session externally revoked reload and fresh authorized recovery cases remain. Each observation requires its own complete native before/after comparison, including all business-table digests and full session/audit/user/account rows. Positive views require the actor's visible email and an actual current-subject session response. Revoked views require a concrete login/unavailable state, no private actor bytes in every selected response and no unauthorized writes. No response is discarded for being an RSC prefetch, action response or cancellation.

The revoked-state wait now safely handles the transient absence of `document.body`; it continues waiting for the same concrete login/denial predicate. Attempt03's null-body error remains preserved.

## New passive browser protocol evidence

Before each navigation, attach a Chrome DevTools Protocol session and subscribe to `Network.requestWillBeSent`, `Network.responseReceived`, `Network.dataReceived`, `Network.loadingFinished` and `Network.loadingFailed`, then enable Network observation. This does not disable caches, intercept requests, replay responses, alter the app or inject request headers.

Each original response must bind its bridge-injected response ID unambiguously to one CDP request ID/hop and the exact method, origin, full URL hash, path and status. Query text, request bodies and unsafe headers are not persisted. Safe headers, resource type, initiator type, cache/service-worker flags and terminal metadata are retained.

`loadingFinished` establishes browser network completion. A bounded Playwright `response.finished()` observer timeout can be resolved by that independently observed exact terminal event while retaining the timeout and body error. An actual Playwright network failure, CDP `loadingFailed`, cancellation, missing/duplicate terminal, ambiguous ID, reused request ID, redirect hop or cached/service-worker response remains failed. Every selected CDP request must have its exact response row and successful terminal; missing Playwright rows cannot disappear from coverage.

CDP `Network.getResponseBody` is attempted only after its original response finishes. If retrievable, decoded bytes, SHA256 and actor flags must exactly equal the independent bridge capture. Otherwise its error is retained, and completion plus the independently captured original bytes remain separately attributed. Original bridge completeness, downstream finish, no abort/early close, decoding, hashes and actor flags remain mandatory. No claim is made that application JavaScript consumed every byte merely because the browser network transfer completed.

CDP `encodedDataLength`, `dataLength` and encoded data-event totals are recorded. Encoded wire lengths are not compared with decoded body length, nor is terminal encoded length treated as body-only length. Any direct decoded-body hash or actor mismatch fails.

## Validation before execution

- `node --check`: exit 0.
- 35 pure synthetic evidence-classifier cases: 35 passed, 0 failed. Includes exact success, retained-observer-timeout recovery and rejection of wrong correlation, absent/failed/ambiguous terminal, stale delivery, native transport failure, mismatched bytes/actor flags and incomplete original response capture.
- This is syntax and pure observer-logic evidence only. No actual browser, application or database execution by the observer author.

Primary reviewer owns exact source and actual outcome admission. The author may inspect screenshots but must disclose authorship. Attempt02/03 failures and the separate origin-policy/denial-bookkeeping defect remain unchanged.
