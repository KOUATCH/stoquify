# Independent correction: verify-password HTTP admission

The earlier source review incorrectly treated `metadata.scope = "server"` on installed `verifyPassword` as proof that the HTTP route was absent. That interpretation is withdrawn. The retained hashes remain correct; the behavioral interpretation was wrong.

Installed `better-auth/dist/api/routes/password.mjs:167` declares a POST `/verify-password` endpoint with a required string `password` and `sensitiveSessionMiddleware`. Installed `better-call/dist/router.mjs:23` skips endpoints only for `metadata.SERVER_ONLY`; it does not use `metadata.scope`. Stoquify's auth catch-all passes this route to the installed handler. The inventory therefore contains 30 declared HTTP candidate paths. Pathless `setPassword` remains separate.

Actual v4 `auth-method-boundary` reached `/api/auth/verify-password` with POST `{}` and received400, contrary to the authored404 expectation. The redacted response contains no private user/session/token/actor flags or authentication headers, and its native before/after snapshots show no business/account/session/audit mutation. This is an incorrect harness expectation about malformed-input routing, not a confirmed security defect.

Independent recomputation confirmed all three snapshot digests and equality: `snapshot-auth-auth-method-boundary-before-1794247746359-8c66435f-5ab2-45eb-8d34-e34254de2581.json` and `snapshot-auth-auth-method-boundary-after-1794247748852-fc90bcb0-cd6d-42bc-aed3-59ab6e3f3258.json`. Response body length106, SHA256 `67de16be7eed66d0b49dfa305921879cc9f79c91bf08785c74de668e73198adb`; no raw response or credential is reproduced here.

A malformed-body400 does not qualify valid-body authentication, password verification or origin enforcement. The parent authorized a bounded, separately reviewed successor probe after the frozen attempt02 run. Required positive and negative behavior must be evidenced with real sessions and native state comparisons before this route's valid-body qualification can close. Do not edit the active program or overwrite its original failure.
