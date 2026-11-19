# Final P04-R01 native qualification — retry02

**Passed: 39/39 tests, zero failed or skipped**, on 3 November 2026, 17:43:23–17:45:15 UTC. This reruns every prior 37-case acceptance against the corrected candidate and adds two delivery-issues consumer checks. [Execution receipt](native-result-retry02.json), [Jest result](native-jest-retry02.json), [observations](native-observations-retry02.json), [reviewed recipe](../independent-review/NATIVE-RETRY02-REVIEW.json).

The new isolated PostgreSQL17 target was `stoquify_local_p04_r01_20261103_r2`, user `p04r01`, 127.0.0.1:53776, cluster `.codex-tmp/p04r01-qualification-20261103-r2/postgres`. All 121 current migrations replayed successfully with exact stored/source checksums. The private Prisma client passed manifest hashes and the pinned installed-Prisma canonical schema proof. All 5,206 captured source/recipe/test files and root/copied migrations remained unchanged during execution. No retained r1 or P03/R02 target was started, reset or changed.

The prior role/member/invitation/access-request, latent-role composition, real-session-row revocation, positive administrator, replay, genuine reactivation, real organization-lock contention and transaction rollback cases all passed again. Their detailed assertions are described in [the prior result](RESULT.md); the final receipts above bind the later corrected source.

New delivery checks passed:

- A legitimate tenant administrator can read the reserved-role invitation's queued delivery row. Removing only the administrator's reserved code hides the row and rejects its cursor while explicit permissions remain. Selected business rows stay unchanged.
- An ordinary legacy invitation with coherent historical payload/outbox evidence remains readable with a masked recipient and accepted fixture state. Removing current stored reviewer permissions returns a restricted empty result, with no business mutation. Raw email and token are absent from the authorized response. Synthetic SENT outbox data is a fixture, not evidence of an actual provider send.

The 38 recorded observations include 35 selected-state before/after pairs. The selected tables and permitted audit/abuse/FAILED-request/race effects remain explicitly scoped as in the prior result; neither 39 tests nor 35 pairs means whole-platform zero-write coverage. Stored authority, native PostgreSQL transactions, services and actual server-action exports were real. Better Auth transport and Next headers/cache invalidation were stubbed. **Signed-cookie, HTTP server-action, browser, provider and hosted qualification remain separate and unrun.**

Cleanup passed: no remaining client sessions, owned PID 38328 checked, fresh cluster stopped, stopped status confirmed and port 53776 released. Both r1 and r2 fixtures/evidence remain retained. No commit, push, production flags/data migration or deployment occurred.

The executed test was archived byte-exactly after completion to [authority-retry02.postgres.test.ts.source.txt](authority-retry02.postgres.test.ts.source.txt) to prevent unrelated default Jest collection. [Relocation receipt](test-source-relocation-retry02.json) binds its SHA-256 `bf743ad8151d37e1c91b6f358c36914ccf54a2985d5bdc5c238085027f141f91`. Original runner/config paths remain historical one-shot recipes; a rerun requires a fresh independently reviewed identity.

Final evidence SHA-256:

- Execution: `1366b12daafb044b186b9cdd8458fa7fa1aefe2a75986fd53511a815795f76cb`
- Jest: `d04ff6c9404cedaaaa8d05e7f3fe7be045da7785221734273d617de07372f74f`
- Observations: `141441a27342415aaee031209049e705ef98e196f2415e764d086f9a245cd089`

Initial failed preflight and passing retry01 remain preserved; this result qualifies the corrected candidate and does not rewrite earlier evidence. Final package/gate advancement belongs to the independent outcome assessment and parent work register.
