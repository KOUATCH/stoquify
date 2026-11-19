# P03 — VERIFIED SCOPED

Completed 29 October2026 with independent PASS_SCOPED review. P01, P02 and all four P03 child packages are verified within their recorded technical scope. Production readiness remains unqualified.

## Outcome

The accountant-access password challenge is reachable. A deliberately lost response after a confirmed grant commit can be recovered through an explicit retry of the original command without duplicate consent or notification. A second grant in the same page session completes after fresh password confirmation, and both command pending states settle. An explicit **Refresh current list** action reloads authoritative state without replaying a mutation.

The browser used two distinct fixture accounts and selected **REVIEWER for both grants**. Their names do not establish PREPARER-role coverage.

## Changes

- The grant form uses explicit submission handling. Command and password-confirmation busy state are independent of read-model refresh transitions, with immediate duplicate/retained-command guards.
- Existing-account grants retain the optional command key. A tenant-, actor- and normalized-intent-bound receipt uses the existing business-event transaction and advisory lock. Valid identical retries recover the unchanged grant; changed intent, damaged evidence, revocation and expiry fail closed.
- Confirmed success remains confirmed if refresh fails. Localized guidance offers a guarded document reload; no optimistic grant row is invented.
- The stale portfolio test now checks server-owned scope and rejection of forged caller identity.

## Verification

| Evidence class | Result | Receipt |
|---|---|---|
| Source/independent review | PASS scoped; 10 owned-file hashes stable | [Final review](FINAL-INDEPENDENT-REVIEW.md), [integrity](final-owned-source-integrity.json) |
| Mocked service/action | 50 tests pass, including 26 replay cases; private client and environment-file guards | [Result](isolated-unit-result.json) |
| Mocked UI | 8 tests pass: fresh auth, uncertainty, immediate duplicates, suspended refresh, refresh exception and French guidance | [Result](u02-green-result.json) |
| Real PostgreSQL | 13 cases pass, including concurrency and transactional rollback; unchanged service bytes | [Native result](NATIVE-RESULT.md) |
| Current compiler |PASS, no emit/incremental output; prior input graph differs only in the owned component | [Compiler](u02-compiler-result.json), [input delta](u02-compiler-input-delta.json) |
| Isolated sealed build |PASS; 7,916 source entries and 5,284 runtime entries | [Build](u02-build.json) |
| Authenticated browser |PASS 18 stages, same-session recovery/next command and read-only reload | [Browser](repro-u02-01/result.json), [scope](NATIVE-U02-RESULT.md) |

Artifact BUILD_ID: **Txewjg9meQy10h0DDROu3**. SHA-256: **147c7136b202d0baed804c7c80729c226ad7e7a59dd4c13fbc7c565fe6d1da5a**.

The final reload left the complete grant/event/receipt/outbox snapshot unchanged. It retained three grants including the baseline, four grant/receipt events and two notifications; grant POST count stayed 5. Browser DOM assertions found both new recipient rows. Screenshots support the visible challenge, recovery controls and settled state; the post-reload viewport does not itself show the below-fold rows.

All owned browser/server/proxy/database resources stopped or disconnected, ports were released, and original AF16 artifact, U02 artifact and runtime copy hashes remained unchanged.

## Retained failures and limits

The original reproduction stopped at fresh-auth text without a reachable password input; it was narrower than the historical committed-grant symptom. The first sealed four-delta repair recovered the first grant but left the second command Saving with a stale list. That failed artifact, screenshot and receipt are retained. The real React Suspense regression then reproduced command/refresh coupling. The transport cause of aborted refresh requests is not claimed as proven.

An ENOSPC comparison build, dependency-copy timeout/resume and initial UI-test startup timeout are retained separately. Earlier uninstrumented mocked results are superseded by the documented private-client/environment-guard correction.

This qualifies frozen source plus the reviewed grant repairs. It does not qualify the newer combined release, broader AF16 lifecycle, additional roles, full accessibility/bilingual lifecycle, clean-install reproducibility, hosted providers, statutory admission or production operations. Lint has 24 existing warnings and zero errors; local secret preflight is conditional because live delivery is disabled.

## Rollback and next boundary

Restore only owned source/test hunks from retained before copies, then invalidate affected acceptance evidence and rerun the failed scenarios. Preserve grant consent, events, receipts, historical artifacts and unrelated edits. No schema migration or production data cleanup is required by this repair.

Next technical package: **P04 — Qualify current authority and tenant boundaries**. Its P01/P02 dependencies are satisfied. Record its admitted route/action and tenant/actor scope under D01 and authorize that package before execution; the present request covered P01–P03. See [next action](../NEXT.md).
