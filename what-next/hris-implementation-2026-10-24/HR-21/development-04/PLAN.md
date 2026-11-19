# HR21 development04 — password assurance and protected HR actions

Continue development independently of hosting details. Reuse the native BetterAuth/Argon2/cookie/PostgreSQL harness from development03 with only guarded database and request-context adapters. No application environment files, external providers or real employee data. Preserve historical evidence and unrelated working-tree changes.

The existing contract is reusable recent password authentication (default 300 seconds), bound to the current session and organization; it is not a single-use approval token. Test correct and incorrect passwords, expiry/future evidence, session and tenant changes, disabled/locked users, failure throttling, and protected action permission/module/tenant denial. Native calls must exercise current product owners. Record adaptations separately from full Next/browser checks.

Own this evidence directory, narrowly reproduced necessary security fixes and focused regressions, and an execution-register append. Use an independent read-only reviewer. Preserve baseline source before changes. PASS requires exact expected denial/success outcomes, synthetic fixture cleanup, meaningful affected checks and review closure. Browser journeys remain the next dependent development slice, not a deployment prerequisite.
