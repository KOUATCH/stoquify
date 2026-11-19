# AF06 delegated evidence desk: implementation and verification

**Date:** 20 October 2026. **Status:** VERIFIED within AF06's stated synthetic scope.  
**Scope:** AF06 only, reusing AF01–AF05 and the existing Close evidence domain. No schema change, production promotion, deployment, live enrollment or provider delivery was performed.

## Delivered behavior

An eligible firm accountant can open “Request and track evidence” for a client in the existing portfolio work desk, select the client's period and original finding, choose an eligible client response owner, enter a due date and scoped question, and create the existing evidence request. The client responds in their own Close workspace. An independent firm reviewer uses the existing replacement-source preview and fresh-auth acceptance flow.

The desk displays engagement context, current response owner, original reference, retained recipient-change history and bounded continuations. It supports English/French, safe in-memory draft recovery and exact retries. Module read-only state keeps tracking available and disables sending. It does not present a complete firm workload total.

The adjacent case is settlement proof mapped to the existing typed payment collector. Accepting recovered evidence leaves a FAILED reconciliation control unchanged. Financial posting, payment release, signing and certification remain separate domain actions.

## Reuse and change inventory

| Area | Starting condition | AF06 change or reuse |
|---|---|---|
| Portfolio/client visibility | Implemented by AF01/AF02 | Reuse the existing authorized client work desk and its continuations. |
| Engagement restrictions | Implemented by AF04/AF05 | Reuse named-mandate enrollment, current engagement/assignment intersection and retained history. |
| Request writer | Implemented | Reuse `requestMissingCloseEvidence`; add a strict protected UI adapter, not another state machine. |
| Request selection/tracking | Partial firm UI | Add client-period/finding/recipient projection, typed display case, current module-write hint and composer. |
| Client response and recipient recovery | Implemented | Reuse existing Close workspace and writers unchanged. |
| Preview/independent acceptance | Implemented | Reuse current receipt/binding verifier and fresh-auth acceptance unchanged. |
| Session-bound desk reads | Partial | Pass trusted persisted session proof from list/detail actions and recheck it at existing before/after read boundaries. Internal trusted callers retain their prior optional-session signature. |
| Notification/publication | Implemented | Reuse existing outbox, truthful status and publication/history views. No new delivery worker or reminders. |
| Metrics | Missing phase contract | Define request-resolution and coverage metrics; no invented pilot measurements or analytics store. |

Application entry points:

- [Delegated read model](<E:/ohada saas/Focused projects/stoquify/services/accounting/delegated-evidence-desk.service.ts:28>)
- [Protected read/request adapters](<E:/ohada saas/Focused projects/stoquify/actions/accounting/delegated-evidence-desk.actions.ts:10>)
- [Composer and tracking UI](<E:/ohada saas/Focused projects/stoquify/components/accounting/DelegatedEvidenceDesk.tsx:32>)
- [Existing desk integration](<E:/ohada saas/Focused projects/stoquify/components/accounting/AccountantWorkDesk.tsx:191>)
- [Persisted-session read check](<E:/ohada saas/Focused projects/stoquify/services/accounting/accountant-work-desk.service.ts:89>)
- [Reused request writer](<E:/ohada saas/Focused projects/stoquify/services/accounting/close-assurance.service.ts:3739>), [recipient replacement](<E:/ohada saas/Focused projects/stoquify/services/accounting/close-assurance.service.ts:3940>), [response](<E:/ohada saas/Focused projects/stoquify/services/accounting/close-assurance.service.ts:4021>) and [acceptance](<E:/ohada saas/Focused projects/stoquify/services/accounting/close-assurance.service.ts:4204>).

## Acceptance register

| Criterion | Result | Evidence |
|---|---|---|
| AC1 — real typed loop with separate identities | PASS | Real migrated PostgreSQL, AF04 managed assignments, actual payment collector, domain request/client response/independent acceptance; exact accepted replay and unchanged FAILED control. The authenticated browser also completed the real protected actions with separate preparer, client and reviewer sessions. |
| AC2 — revoked assignment/mandate/expired session | PASS | Real SQL tests stop list, detail and pending acceptance after each authority loss. Unit tests additionally reject forged context and authority lost during a read. |
| AC3 — duplicate/change/recipient/stale/notification recovery | PASS | SQL exact request/response/acceptance replay, changed-command rejection, recipient history and old-owner denial, stale receipt rejection, self-review denial and failed outbox remaining pending. Component checks preserve exact retry and unsent text after transport failure, and clear private data on denial. |
| AC4 — paging/reassignment visibility | PASS | Real 101-finding continuation; cross-scope cursor denial in unit coverage; ended staff lose the work while another authorized reviewer retains the same set. Existing queues/tracking/recipient suites remain in the focused lane. |
| AC5 — no unauthorized financial delegation | PASS within declared boundary | Real managed-access resolver denies journal post, reconciliation sign, supplier release, payroll release and certification permissions. Source inspection confirms unchanged tenant-bound protected financial writers. AF06 exposes no such mutation. This does not certify every financial action by a new end-to-end replay. |

## Verification by evidence class

Latest run: [2026-10-20-run-01](2026-10-20-run-01/).

| Evidence class | Actual result | Scope |
|---|---|---|
| Workflow contract | PASS, exit 0 | `npm run agent:workflow:check`; 196 unclassified scripts remain. This check executes no application/database commands. |
| Source inspection | Complete for changed boundaries | Current source and prerequisite outputs; dated graph discovery only. Actions graph community 6 helped locate Close actions; graph evidence dated 9 August 2026 was not treated as current behavior proof. |
| Mocked/pure/action tests | 301 PASS | Focused services, action adapters, queue/tracking/recipient/replacement and notification regressions. |
| Component/jsdom tests | 54 PASS | 29 existing client-workflow, 20 existing firm-desk and 5 new composer checks. These are not rendered browser evidence. |
| Real PostgreSQL | 7 PASS, exit 0 | Isolated synthetic target, real services/locks/domain transactions and collector. |
| Focused TypeScript | PASS, exit 0 | Current isolated generated Prisma client, AF05 scope plus AF06 additions; no whole-repository type claim. |
| Authenticated rendered browser | PASS, exit 0 | Real application copy, Better Auth, protected actions and fresh password acceptance. Four EN/FR 1440px/390px scoped axe scans: zero violations; no horizontal overflow; keyboard refresh returns heading focus; zero page errors. |
| Publication | Separate artifact check | Matching MD/PDF artifacts and final content/layout results are recorded in `accounting-publication-verification.json`; publication does not extend application assurance. |

Exact focused commands:

```powershell
node node_modules/jest/bin/jest.js --config jest.delegated-evidence.config.cjs --runInBand --json --outputFile=docs/accounting-firms/roadmap-2026-10-19/execution/AF06/2026-10-20-run-01/unit-complete.json
node node_modules/typescript/bin/tsc -p tsconfig.delegated-evidence.json --noEmit --incremental false
node node_modules/jest/bin/jest.js --config jest.delegated-evidence-postgres.config.cjs --runInBand --json --outputFile=docs/accounting-firms/roadmap-2026-10-19/execution/AF06/2026-10-20-run-01/postgres-complete.json
node scripts/prepare-delegated-evidence-browser.cjs
node scripts/start-delegated-evidence-browser.cjs
node scripts/verify-delegated-evidence-browser.cjs
```

Definitions/imports and command registry were inspected before execution. New dedicated scripts are not claimed to be registry-certified: their side effects were reviewed directly. Jest is bounded to the relevant directories and excludes real SQL tests from the mocked lane. SQL, browser and local PDF process launches used explicit task-owned targets. No `npm run build`, full repository lane or schema-promotion command ran.

The database is `stoquify_local_af06_browser_20261020_r1` on task-owned PostgreSQL at `127.0.0.1:55441`. Its setup verifies the cluster directory, refuses an existing database and applies all 101 existing migrations. AF06 adds none. Fixture credentials remain outside published artifacts. The host runs at `127.0.0.1:3046` from an environment-free source copy with ephemeral authentication configuration.

The SQL test calls the real read-only payment collector, then explicitly publishes its returned summary as a synthetic assessment/checklist receipt. The underlying reconciliation remains unsigned and FAILED. This is not proof of live settlement ingestion or execution of a complete Close assessment.

## Failed attempts and recovery

Initial focused type checking found two inferred Prisma literal types; explicit literals corrected them. The first unit lane used Node for two existing component suites without environment annotations; explicit jsdom/jest-dom setup fixed those tests. The final lane passes all 355.

Initial SQL verification passed six tests and exposed a fixture restoration error: ended assignments retain their version. The next attempt correctly used that version but proposed an overlapping effective date, which the existing AF03 database guard rejected. The fixture now creates the next assignment revision effective after the prior end; business guards were not weakened. The final seven tests pass. Earlier logs remain retained.

Browser preparation initially lacked permission to create its owned dependency junction; preparation succeeded with the reviewed local process permission. An initial browser attempt reached the host before it was ready and failed to connect. A second attempt used an overly exact native-select label locator; the real loaded page was retained in its screenshot and the locator was corrected. The final browser run completed all ten recorded checks with exit 0; earlier attempt JSON is retained.

Visual inspection covered the English request composer and English/French narrow desk screenshots. Native date controls follow the browser's locale. Scoped automated scans and screenshot inspection are not a manual screen-reader or whole-application accessibility certification. The final source-hash record confirms that all six changed application files match the browser host.

## Design and operational review

Architecture/data: reuse domain-owned comments, source receipts, events and outbox; no new schema or lifecycle. IAM/privacy: current named identity and assignment restrictions; private session proof never enters DTOs; no durable browser drafts. UX: explicit client/period scope, bounded continuation, EN/FR labels, keyboard focus, truthful read-only/retry states.

Accounting: a recovered source is not a passed business control. No balances, currencies or financial approvals are written. SRE: bounded queries and existing outbox recovery; no new worker, cron or provider dependency. Product: reduce manual evidence handoffs and surface real response/review work. SaaS: reuse current module entitlements; no new package or billing contract.

Country-law, tax-rate, filing and AI generation changes are **not applicable**: AF06 introduces no jurisdictional rule, authority submission or AI output. Qualified accounting/legal/privacy/security/accessibility or release certification is not claimed.

## Rollout, rollback and remaining limits

Keep the existing AF04 migration and lifecycle requirements. Generate the application's current Prisma client through the normal approved release process; this task reused an isolated current client because the shared workspace client was older. Deploy only through the later release gate with appropriate environment checks.

For UI rollback, remove the AF06 composer entry and adapters while retaining the existing evidence writers, immutable history and AF04 restrictions. Do not delete evidence comments, assignment history or mandate links, and do not downgrade to pre-AF04 authorization.

No live provider, external notification, full production build, load test, comprehensive financial mutation suite, manual screen-reader audit or AF16 pilot ran. Static module/read observations are revalidated on subsequent server actions; the desk does not promise push revocation or continuously refreshed snapshots. Draft recovery is same-screen memory only.

The shared tree remains uncommitted at baseline `6ee84a90c760d2864f6aef672d8b393ac2b65971` with unrelated work preserved. No commit/stage was requested. Owned source hashes and browser parity are recorded with the final run evidence.

Next by roadmap order: AF07 provider-format/account coverage. AF08 may then consume the retained evidence trail for workpapers. Neither phase has been started. See [capabilities](DELEGATED_CAPABILITY_MATRIX.md), [case contract](CASE_CONTRACT.md) and [metrics](REQUEST_RESOLUTION_METRICS.md).
