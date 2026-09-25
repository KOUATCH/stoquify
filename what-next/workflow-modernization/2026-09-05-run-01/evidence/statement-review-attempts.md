# Sender response review — attempts retained

## Baseline

- `lanes/environment/statement-review-before-bd170e39-096.json`: fixture failed because the owned account's organization had no location. No baseline checks completed; original records unchanged.
- `lanes/environment/statement-review-before-33b3f4a2-5db.json`: two defects reproduced in current service data and the actual authenticated page. A persisted recipient response had no sender read/review handoff. Source stable and original financial/role records unchanged.

## Implementation and checks

- Typecheck receipts `20bd1d`, `5b719b`, `3e398d`: initial JSX history block failed to parse. The missing conditional closing brace was corrected. `e828a7` and `ad8e43` subsequently passed; final checking is recorded separately.
- `9d1865`: the Windows Python alias was inaccessible; no file was changed by that attempt.
- `55a625`: Windows denied a scoped component file write. The exact write was later accepted through escalation (`49acc9`). This was a filesystem restriction, not a rejected automatic safety review.
- `c068f5`: 19 focused tests passed, but Windows denied writing the JSON receipt. The command therefore exited 1; this is not recorded as a successful evidence-producing command.
- `evidence/statement-review-tests-02.json`: 49 tests in five suites passed with an accepted report write.
- `8501e4`: changed-file lint found the reserved `module` variable in the new service. It was renamed to `moduleAccess`; final lint `e77749` passed with no warnings.
- `lanes/environment/statement-review-postgres-44b81d73-009.json` and `statement-review-postgres-2062c61c-489.json`: zero scenarios completed because the fixture omitted required role fields. Fixture corrected to the current Role schema (`code`, `nameEn`).
- `lanes/environment/statement-review-postgres-3af2f196-786.json`: nine scenarios passed before the test grant's unsupported source value failed its database constraint. The isolated fixture was corrected to the permitted value with `verificationOnly` metadata; the product constraint was not changed.
- `lanes/environment/statement-review-postgres-e080d0da-cef.json`: all eleven scenarios passed; source stable and original financial/role records unchanged.
- `lanes/environment/statement-review-browser-63ed8e45-d8f.json`: nine screenshots and five layout cases captured, but the whole journey failed. The read-only check initially accepted a temporarily disabled loading button. The driver was corrected to await the actual server result and explicit viewing-only explanation.
- `lanes/environment/statement-review-browser-93cec2a3-8dc.json`: ten screenshots and five layout cases captured, but the whole journey failed. Removing all customer permissions correctly replaced the entire route with the existing denial page. The driver had expected an inline response error; it was corrected to assert the observed server-owned route denial and absence of customer evidence.

Failed browser attempts are not counted as passed customer journeys. Final browser results and source binding are recorded in the checkpoint receipt.
