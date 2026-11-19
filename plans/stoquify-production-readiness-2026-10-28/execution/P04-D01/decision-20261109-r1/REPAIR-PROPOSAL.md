# P04-D01 approved policy — bounded implementation handoff

Policy C was approved by Kouatchoua Mark for product/accounting and security on 9 November 2026. Implementation is **not authorized or performed** by this qualification task.

## P04-R05 — Enforce approved finance export-job visibility

Owner: accounting/backend implementer, security reviewer, and database/browser QA. Dependencies: P01, P02, P04-R01 and approved P04-D01. P04-V01 must qualify this repaired family before parent P04 can close. This proposal does not depend on P04-V01 completion, avoiding a dependency cycle.

Bounded entry point: the asynchronous finance export status action, its service/query/response contract, creation-owned actor identity and the smallest grant implementation needed for explicit, revocable same-tenant inspection. Refresh current callers and hashes before changing code. Inspect existing grant controls before adding a schema or service; any necessary schema change needs its own reviewed local migration/recovery recipe.

1. Specify creator and named delegate inspection authority for all 14 approved classes, preserving current actor/session, tenant, class, module and applicable object/location scopes. Creation never substitutes for current permission.
2. Enforce that authority at the server action and shared service boundary used by admitted callers. Reject wrong-tenant, unknown, unowned and revoked references uniformly without provider/key disclosure. An expired artifact may retain independently authorized historical job status, while its locator and bytes remain unavailable. Preserve aggregate queue-summary access under its separate current permission.
3. Support named, revocable inspect grants only within the approved grantor/recipient authority. Bind grants to the job/artifact revision and record approver, reason and validity; no onward delegation or implicit administrator-name bypass. Do not introduce public/bearer delivery or weaken existing guarded paths.
4. Run negative and positive tests with actual independent actors and current database state. Prove denied requests leave business/job/artifact/grant state unchanged; classify permitted audit entries. Test creator permission loss, delegate revoke/expiry, forged job/hash/tenant, refreshed role authority and browser recovery. Obtain independent review.

Acceptance: the current status/locator path follows approved Option C, unauthorized metadata is absent, authorized creator/delegate inspection works, and the aggregate summary retains its own documented scope. Bind evidence to current source and candidate. The approval packet’s D01-T01–T12 cases must be mapped explicitly to implemented metadata, future byte-delivery, or unaffected aggregate-summary proof; do not call future cases passed.

Recovery: revert only the owned repair while retaining a blocking visibility gate; never present the previous broad behavior as approved Option C. If grants cannot be verified, deny access. Preserve original data and audit evidence. No production migration, flags or deployment is authorized.

## File-byte delivery remains a separate commitment

The inspected asynchronous-export path has no established production HTTP byte-download consumer. This handoff does not create or admit one. P27 analytics/export qualification must preserve the approved download policy: creator/named download delegate, current class read and export authority, fresh authentication, exact content hash, expiry and final authority recheck after storage latency. Renderer, private artifact store, retention, restore and hosted-provider acceptance must also be satisfied before delivery is exposed.

Do not mark those byte-delivery cases verified when only status metadata has been repaired. Keep the existing P27/provider/release gates and all unrelated/deferred commitments intact.
