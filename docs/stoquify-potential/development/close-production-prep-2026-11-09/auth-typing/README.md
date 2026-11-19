# Authentication endpoint typing correction — 10 November 2026

The final close release compiler check found `lib/auth.ts:76` resolving the installed Better Call endpoint as `Response`, which has no `response` field. The hook's incoming `ctx: any` spread caused the entire argument object to become `any`, selecting the first endpoint overload despite the existing explicit `asResponse: false`, `returnHeaders: true` and `returnStatus: false` values.

The only product edit annotates that incoming spread with the installed endpoint input-context type. The security changes already present in the shared working tree are preserved: current-account lookup, cookie-cache bypass, forced no-refresh, store-error propagation, public endpoint exceptions, native nullable responses and response-header forwarding. No runtime setting, branch, return cast or dependency changed.

The [types-only proof](proof-c8b1c6a182/RESULT.json) reproduces the original TS2339 diagnostic, then produces zero diagnostics with the annotation against the installed Better Auth 1.6.14 / Better Call 1.3.5 declarations. The full authentication file transpiles to **byte-identical JavaScript** before and after the type annotation. Exact original and proposed source bytes are retained as `.txt` files beside that receipt.

The [focused auth regression](unit-317902eb0e/RESULT.json) passed **87 tests, 0 failures, 0 skips** across the existing current-authority, session, deactivation and credential-outcome suites. Identity, sessions and persistence are mocked. The explicit isolated runner loads no Next application configuration or environment files and blocks network access. These results do not establish real authentication, PostgreSQL, browser or production artifact qualification.

Source SHA-256 before: `181e15aad556024353b1e988cce6ccb5eb9679dfc50620427b81aa059a8c7064`.

Source SHA-256 after: `c7a1acf7ee8c25682a47a7476feafdaeeb4d55f68fb030f33b76bd95e605bff5`.

Existing P04-R06 source/admission/build records retain their original binding and were not rewritten. Any candidate claiming the new source revision needs a refreshed source snapshot and its own qualification. Whole-tree compilation, actual authenticated application checks and target-platform release qualification remain the parent task's responsibility.
