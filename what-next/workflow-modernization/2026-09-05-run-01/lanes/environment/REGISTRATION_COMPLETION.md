# Registration: explicit submission follow-up

The prior real registration cooldown expired at 2026-09-06T10:25:18.544Z. The current clock was checked at 10:25:29Z before starting the full browser run. No abuse counter, clock, client identity or policy was altered.

`registration-browser-1370a173-fb5.json` passed four actual paths, with unchanged source bindings and original tenant authority:

| Path | Observed outcome | Development route / save observation |
| --- | --- | --- |
| Guided English `/en/register-v2` | Explicit final submission created one unverified owner and credential, one first location and one registration audit. Reaching review did not create the account. | 1,828 / 1,154 ms |
| Guided French `/fr/register-v2` | Same explicit submission and verified persisted effects; intentionally empty requested capability selection stayed empty. | 1,958 / 897 ms |
| Standard English `/en/register` | Explicit submission created one unverified owner and credential, no first location and one registration audit. | 2,968 / 1,391 ms |
| Standard French `/fr/register` | The ordinary fourth-attempt IP limit denied creation. The password/draft remained masked and recoverable; no account was created. | 3,008 ms / no successful save |

Every successful creation had exactly one credential account with the same stored password hash as the user, one password-history record, a tenant-owned role, no authenticated session and no verification-delivery audit. No email was sent. Arrival at the verification route is an unverified handoff, not delivered verification or operational readiness. Viewports 390, 768 and 1440 were checked; these timings are development observations and do not establish a production performance budget.

The subsequent read-only Prisma check at 2026-09-06T10:27:19.930Z observed requestCount 4, windowStartedAt 10:25:47.811Z and blockedUntil **2026-09-06T11:26:17.046Z**. A successful French standard-form creation still needs a later ordinary-policy window. Do not rerun the existing full driver expecting four successes: it deliberately tests three creations followed by denial. Prepare a bounded French-standard positive path after that deadline without resetting counters or changing the client identity.

Prior 201-test / 15-PostgreSQL-case evidence remains relevant to its unchanged registration sources; the new browser receipt supplies the previously missing current guided completion proof. Earlier premature submission failures remain preserved as historical evidence, not silently relabelled as successful journeys.

Current source baseline is v23. `../../evidence/registration-completion-receipt.json` binds the source, screenshots, previous test receipts and current typecheck. The next source mutation checkpoint must use v24. Whole onboarding remains open: email/provider recovery, durable uncertain-result retrieval, accountant mandate and downstream setup, actual screen reader, native zoom and comprehensive contrast. This follow-up does not complete the 206-workflow review or clear X1.
