# Reviewed lifecycle attempts

Earlier results are retained as historical evidence and must not be substituted for the final source-bound receipt.

- Baseline first attempt could not write its report under the workspace sandbox. A scoped elevated retry was allowed. No approval-review rejection occurred.
- `purchase-lifecycle-before-a3fccf13-d4c.json` reproduced the four revoked-authority defects, then failed because the retry fixture reused an organization ID. Distinct fixture identifiers corrected the driver.
- `purchase-lifecycle-before-74dcaf6f-08e.json` completed baseline reproduction and preserved original financial/role invariants.
- `purchase-lifecycle-tests-01.json`: 17 tests failed / 66 passed across the initial changed boundaries. Older fixtures lacked reviewed requests or the new parent lock; the register test also needed to isolate the newly imported dialog.
- `purchase-lifecycle-checks-5dc30f98-7fb.json`: 143 tests passed / 11 failed. Remaining failures were the AP test transaction's missing lock method and the completion hook's old argument assertion.
- `purchase-lifecycle-checks-c850e22b-b7f.json`: 154 tests in 12 suites, typecheck and 18-file lint passed before the decision-history addition.
- `purchase-lifecycle-after-a04dbb88-081.json`: 20 PostgreSQL groups passed before the history and AP integration checks.
- `purchase-lifecycle-after-6d6e6cc3-be4.json`: 21 groups passed; invoice preparation then correctly required an accounting period absent from the synthetic tenant. The fixture now creates that isolated period through the existing fiscal-year service; the application prerequisite was preserved.
- `purchase-lifecycle-after-6c31cbb0-b7e.json`: 22 PostgreSQL groups passed, including archived read-only history and cancelled-order invoice preparation without posting.
- `purchase-lifecycle-browser-b01fff4b-7e8.json`: EN/FR application journeys and 36 screenshots passed before the final danger-button styling and displayed-reference revision extension. Original financial/role invariants and source stability passed; no page errors were recorded.
- `purchase-lifecycle-checks-8cbd25d2-0d9.json`: 158 tests in 13 suites, typecheck and changed-file lint passed before the displayed-reference revision extension.
- A later multi-file patch encountered a temporary write failure at the purchase-order action file. Reads confirmed that patch had not applied; an inspected scoped file update was allowed. This was not an automatic approval-review rejection.

- `purchase-lifecycle-checks-75c54bc8-aec.json`: 158 tests passed; typecheck found two errors caused by representing the module stop-new-work reason as a response code. The action now retains the existing `FORBIDDEN` code and supplies the established reason field; a focused UI regression verifies its explanation.
- `purchase-lifecycle-checks-5abdd130-abf.json`: 159 tests in 13 suites, typecheck and 21-file lint passed on the final source; source hashes remained stable.
- The unprivileged PostgreSQL attempt `dd9b2f47-11c` could not save its result because of workspace write permissions; no outcome is inferred from the missing report. The inspected scoped retry was allowed.
- `purchase-lifecycle-after-ad7b102e-576.json`: 24 PostgreSQL groups passed on the final source, including partial batch replay and cross-tenant rejection. Original financial records and unrelated role permissions remained unchanged.

Final results, commands, exact source hashes and screenshots are listed in `purchase-reviewed-lifecycle-receipt.json`. Test preparation used synthetic receiving records explicitly labeled as lifecycle fixtures; no stock-posting certification is inferred from them.
