# P04-R06 observed-run recovery

The immutable main run is runtime-result-attempt02.json: 58 observed logical groups, 53 passed and five failed. The evidence matrix and observed independent review retain that outcome. No product files are changed by this recovery.

The complete build remains accepted for candidate p04-r06-full-4661f767924e and artifact 4cc40546c6caebe2df6b35ff7b1c01f756387199b4530a9a4014bc5f7f70de73.

| Unresolved evidence | Required recovery |
| --- | --- |
| R06-C-login timestamp bound | Retain the failed assertion; use explicit SQL UTC interpretation and raw timestamp evidence, persist exact request bounds, and execute all four credential scenarios, including the scenarios not reached after the original failure. |
| R06-C-origin | Preserve the successful cookie-free valid-credential API request and failed no-write expectation. Probe actual browser cross-site requests, Fetch Metadata, accepted content types and CORS. Reconcile against repository policy and before-repair source before deciding whether the test model or product is at fault. SDK behavior alone cannot waive the failure. |
| EN restored; FR authorized/restored capture errors | Repeat all six EN/FR flows. Record response status/type/redirect metadata before body reads and retain capture errors. Require attributable actual response bytes, including independently captured wire evidence where the browser body API cannot return them. Screenshots alone do not pass these gates. |
| Three inherited expiry preconditions | Separate probes for list-sessions, list-accounts and unlink-account, each with a distinct genuinely issued cache and a still-present expired DB row immediately before the request. These three probes passed independent review; the original post-cleanup replay sequence stays unchanged. |

The main 58-group report must never be rewritten as passed. Any final acceptance across observed runs needs an explicit reconciliation with exact candidate/artifact bindings, case-level raw evidence, independent acceptance of each correction, and an explicit origin-contract disposition if its original test premise is corrected. Missing or unresolved required evidence keeps P04-R06 blocked.

Keep the database available only for these isolated recoveries, then remove owned synthetic sessions, stop exact owned processes, verify retained business/audit state and artifact integrity, and obtain final independent review. No commits, deployment or production changes.
