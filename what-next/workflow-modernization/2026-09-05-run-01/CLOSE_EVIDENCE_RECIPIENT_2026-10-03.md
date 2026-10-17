# Close evidence recipient eligibility and replay

Primary FA-CASH-COMMAND; supporting FA-CLOSE-PACK. Previous turn: progress through transaction-bound writer authority, two revocation races and current EN/FR journeys. This continuation completes the selected recipient eligibility criterion; it does not close either parent workflow or narrow the full modernization objective.

Baseline register SHA256 `9678caf2ac5c64b558b2ca1e2db06320e66ea27e4d62785a67f32afb8b36b223`; branch `codex/migration-control-plane-release-2026-08-29`, HEAD `62a56036a5ac9b37236a20c9b148052199069479`. 270 workflows /17 families, four Complete—verified, two In progress, 264 Queued, 191 unmapped entries. Discovery incomplete; unrelated changes and the rejected manual-posting proposal remain preserved.

## Correction and decisions

The interface previously checked recipient eligibility before the request transaction. The domain service checked only active tenant membership. A later account lock or recipient role/membership removal could therefore leave a new assignment with someone unable to read/respond.

New requests now lock the recipient's scoped account, tenant roles and memberships inside the existing organization/module/writer-authority transaction. The recipient must be active, verified by the system's existing account policy, unlocked, and currently permitted to read Close and comment. Recipient eligibility is checked again before publication. The recipient does not need an online session. Existing tenant-wide module checks remain effective; RBAC wildcard permissions do not bypass module eligibility.

Exact saved replays create no new assignment and are resolved before recipient eligibility. The action's preliminary recipient check was moved into the new-request domain path so a requester can recover their original result after a recipient loses access. Current requester/session/module/consent authority still applies. Neither the recipient's account nor their rights is automatically restored by a replay.

No schema, migration, financial posting, statutory rule or commercial change. Platform/backend/data, IAM/privacy, workflow, accounting/audit, quality and operations reviews apply. New inventory, payroll, AI and statutory calculations are not applicable. Engineering evidence is not professional certification.

## Verification

Initial focused tests: 311 passed in `evidence/close-evidence-recovery-jest-6e3825d8-570e-4819-9f98-c62741f0b8fb.json`. Final focused verification includes delegated REVIEWER/PREPARER requests and refusal of delegated response ownership: **314 passed, eight suites, zero failed/skipped** in `evidence/close-evidence-recovery-jest-344db7f8-fe26-4364-ac6e-1ece7bd0921a.json`.

No-emit TypeScript passed in `evidence/close-evidence-recovery-typecheck-9141f05c-9339-43b6-ba32-51cc2c65a73f.json`; changed-file lint passed in `evidence/close-evidence-recovery-lint-d26b50d7-c6b1-483c-b661-9c39ff0fce0c.json`. All three final receipts bind unchanged source before/after execution.

Both actual application journeys passed in `lanes/environment/close-evidence-browser-a406f57b-e8db-4904-9e80-3d8eafbf0cd9.json`: EN at 1440px and FR at 320px, retained draft after reload, authorized assignment/response, independent review, expired authentication refusal with no acceptance, password verification with no implicit acceptance, and explicit retry. Final states reflowed at 1440/768/320px with reduced motion and no horizontal overflow. Keyboard activation and feedback focus checks passed; no page errors. Fourteen screenshots are listed in the receipt; EN/FR final mobile screenshots were visually inspected. This is scoped browser evidence, not full accessibility certification. Source/build, financial and outside-fixture bindings passed.

Observed development route-to-ready time was 36.721s for the first EN request and 5.768–6.570s for the other five persona loads. These include local development/runtime overhead; no production performance budget or certification is inferred. Routes: `/en/dashboard/accounting/close` and `/fr/dashboard/accounting/close`.

Actual database: all nine checks passed in `lanes/environment/close-evidence-workflow-runtime-67c3b462-d933-4975-ae5f-d130876d5d6c.json`. The runtime observed real blocked connections for recipient account locking and membership removal before denying new assignment. It also paused a real request after acquiring recipient locks, observed the account revocation waiting, then let the request commit exactly once. After revocation, exact replay returned that retained record while a new assignment was denied. Existing requester-role/session races, elapsed-deadline replay, assigned response, independent acceptance and historical evidence retention passed. Source bindings and outside-fixture observations stayed stable; financial records remained unchanged.

The pause is explicit scheduling instrumentation around the actual lock helper. It does not replace a database decision or bypass an authority check. Test sessions, accounts, roles and accounting setup are synthetic and restricted to the owned loopback database. No migrations, seeds, reset, production deployment, live activation, external message, real payment or X1 clearance.

## User guidance and remaining work

Choose a response owner who has an active verified account and Close read/comment permissions. The access administrator can inspect those permissions in the organization's existing user/role controls. If access changes during a new request, refresh and select an eligible colleague; do not repeatedly grant extra permissions merely to bypass the refusal. If the request's result was uncertain, retry the saved command exactly: a retained successful request remains recoverable after the recipient's access changes. A retained result does not mean the recipient is currently able to act.

Remaining: complete period/cursor access beyond bounded lists, historical finding localization and assessment context, requester tracking and recipient replacement, full accessibility/zoom, applicable remaining authority interleavings and original cash/purchase/Close handoffs. Precise queue analysis is retained in the prior authority record. Full goal remains active; no additional workflow closure is claimed.
