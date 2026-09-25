# Recipient response verification attempts

All fixtures and browser traffic are confined to the previously owned local test environment. Original payment, journal and role snapshots are compared by hash. Failed evidence is retained; none of these attempts constitutes platform-wide completion.

| Receipt / artifact | Result and correction |
| --- | --- |
| `statement-recipient-before-648e606e-f46.json`, tool `202717` | Three baseline defects reproduced: private headers missing on denial, French link rendered English, and lost response followed by reload/re-entry created two payment promises. Original financial/role snapshots unchanged. |
| Tool `c63940` | 39 tests passed across five suites; portal suite could not load the ESM icon package under Jest. Added the standard icon-only test mock. Evidence-file write failed with filesystem EPERM; no JSON receipt was written for this attempt. This was not an automatic approval-review rejection. |
| Tool `0f41d2` → `a47a1b` | Initial typecheck completed with exit 0. Later final verification must bind the final source. |
| Tool `d52ec3` | Ordinary filesystem write of a fixture correction was denied. The attempted replacement was not applied. No file permissions were changed. |
| `statement-recipient-postgres-1040c419-6bb.json`, tool `1c8d74` | Fixture-only failure: a scenario label was used as a Locale enum. Corrected fixture locale normalization; already-created synthetic rows retained. Original snapshots unchanged. |
| `statement-recipient-postgres-942a13f7-ef8.json`, tool `be0ff7` | Three checks passed, then the evidence reader requested a nonexistent Prisma relation. Corrected the reader to fetch the business event through the stored scoped ID. Original snapshots unchanged. |
| `statement-recipient-tests-02.json`, tool `d6838b` | 51 tests, seven suites passed. Additional copy/layout refinements followed; final results bind their later source. |
| `statement-recipient-postgres-d680177b-97f.json`, tool `f1fffd` | Nine actual PostgreSQL scenarios passed, including duplicate submission, exact replay, revocation race and no partial recipient effects. Original snapshots unchanged. |
| `statement-recipient-browser-e67882f3-882.json`, tool `4ed98c` | Both languages stopped at 320px / 200% CSS text: document width 344px. Five screenshots per language retained. |
| Tool `774e85` → `af9e29` | An ordinary portal patch write failed. Exact scoped elevated write applied the in-flight result reset without changing permissions. |
| `statement-recipient-browser-62dd4a79-34d.json`, tool `81912b` | Overflow reproduced with element evidence and failure screenshots: the form's implicit grid track used intrinsic input width. Added a single explicit flexible column and minimum-width rules; kept narrow padding at 16px. Inspection also found a global native-select light background; applied the established dark context to the public product theme. |

Further final receipts are recorded in the source-bound recipient checkpoint. CSS text resizing is not native zoom or screen-reader certification.

| Subsequent artifact | Result and correction |
| --- | --- |
| `statement-recipient-browser-e7c8de09-c56.json`, tool `fd70fa` | Narrow layouts passed; the test matched unrelated global application/Next alert announcers before the form response. Scoped the locator to the actual recipient form. No product behavior was weakened. |
| `statement-recipient-browser-c4e1e4ba-c7d.json`, tool `637507` | Both languages completed submission, retained replay, keyboard dispute and revocation. The actual response still had the global `strict-origin-when-cross-origin` policy. Added a path-scoped middleware override and regression checks including 429 denials. Other routes retain their existing policy. |
| `statement-recipient-browser-9d8e17db-b92.json`, tool `417150` | Private GET denial passed. The POST test sent null and correctly received 422 validation, rather than the expected token denial. Corrected the test to send the actual retained valid command. |
| `statement-recipient-browser-3749969d-5e4.json`, tool `04dbfc` | Both EN/FR journeys passed: 22 screenshots and 12 viewport/text-size cases. Source stable and original financial/role snapshots unchanged. |
| `statement-recipient-postgres-96e7edbd-777.json`, tool `d434dd` | All nine PostgreSQL scenarios passed against final source; original snapshots unchanged. |
| `statement-recipient-tests-03.json`, tool `639e7c` | 80 tests, ten suites passed, including shared middleware and statement worker/history regressions. |
| Tools `83d197`, `c22a36` | Final typecheck and changed-file lint completed with exit 0. |
