# P06 authenticated operator recovery — 17 October 2026

**PASS — the bounded authenticated retained-evidence operator flow and current-browser queue visibility are implemented and verified.** Production offline sale capture/economic replay remains disabled. This is P06 only; no later prompt ran. HEAD `b044764248f1ac47705371c235c2ba273dd973a7`, dirty working tree; 948 selected baseline fingerprints captured before edits.

## Implemented scope

- The actual authenticated POS mounts `LocalOfflineRecovery` alongside server monitoring and outside remote-read loading/error returns. It discovers this browser's queues independently of the server's device list, including never-uploaded evidence. Counts remain separate from server counts; acknowledged evidence is explicitly not a paid sale.
- The existing `useFlushOfflinePOSQueue` sends the original immutable envelope through `syncOfflineEventsAction`. The existing protected action derives actor/organization and checks permission and tenant input; ingestion owns station/session/device/signature/policy checks. No new endpoint or client-granted authority.
- UI sending requires current transaction-read/use access, connectivity and the original active session. Expired/revoked/conflicted evidence stays retained with manager instructions; it is not silently rewritten or deleted. EN/FR recovery copy and keyboard-operable existing buttons are used.
- Shift close performs a fresh durable-local read immediately before submission, independent of stale UI/server counts. Pending or unverifiable local evidence blocks submission. Persisted server event/certificate checks continue to govern server readiness after upload.
- **Production offline capture/economic replay remains disabled.** This is the existing pilot's retained-evidence recovery flow, not a new supported offline-sales product. No schema change, dependency installation, graph regeneration, deployment, provider operation or later prompt.

## Current evidence

| Class | Current result | Limit |
|---|---|---|
| S — source/contract | Workflow check PASS; queue-only TypeScript check exit 0; source and stale graph navigation reviewed | No full build/typecheck/release certification |
| M — mocked components/hooks | **64/64 PASS**, 3 suites: [results](ui-1792236995592.results.json). Final panel-only recheck **11/11 PASS** after theme correction: [results](panel-final.results.json); these 11 repeat a subset, not additional coverage | Initial 60 pass/3 observation timeouts retained. Harness observation timeout increased from 1 to 10 seconds; application deadlines unchanged. |
| D — real database | **16/16 PASS**, real POS transaction/replay suite: [results](full-commit.results.json), [execution](full-commit.execution.json). Synthetic authenticated fixture **1/1 PASS** separately: [setup](browser-fixture.results.json) | Real PostgreSQL 17.5; zero-tax synthetic accounting mappings, no provider settlement. Fixture setup is not an extra economic workflow test. |
| B — storage | **23/23 PASS**, isolated real Chromium: [results](storage-1792236525804.results.json), [execution](storage-1792236525804.execution.json) | Includes multi-tab visibility, corrupted/lost-marker blocking, reconnect, quota/abort and persistent-profile restart. Not power-loss or deployed browser certification. |
| B/D — authenticated operator | **PASS, 7 steps**: [complete run](browser-1792237177752.json); real credential sign-in, signed ingestion, lost acknowledgement, reload and keyboard retry, unauthenticated login redirect, spoofed tenant denial, expired/revoked conflict retention, French presentation | Actual Next actions and PostgreSQL; original event stored once, local bytes unchanged, zero sale/payment/stock/journal/posting effects. Ingestion acknowledgement is not economic replay. |
| B/D — server close | **PASS**: [new-browser run](server-close-1792237271521.json); empty local queue, 3 persisted blockers, one actual close submission rejected, shift ACTIVE, zero financial commits | Demonstrates the existing server guard after upload; cannot discover another browser's never-uploaded work. |
| B — loading/error/mobile | **PASS**: [read-state run](read-states-1792237326100.json), [reviewed French screenshot](LOCAL_FR_READ_FAILURE.png). Actual failed reads and browser offline transition; retained local count, disabled unverified-session send, dark tokens at 390 px | Final theme fix was necessary: earlier [mobile screenshot](LOCAL_FR_MOBILE.png) exposed missing scoped tokens during loading and is superseded as visual evidence. No screen-reader audit. |
| P / C / E | NOT_RUN | No provider operations, customer outcomes or qualified review |
| O — operational | App stopped; owned PostgreSQL stop and port-closure evidence in [CLEANUP](CLEANUP.json) | Local disposable target only; no deployed restore/load proof. Data/build output retained, not deleted. |

## Acceptance decision

| Criterion | Decision and evidence |
|---|---|
| Replay cannot double-post; changed payload/invalid authority denied | PASS for the named synthetic envelope: 16 real database cases cover concurrent original-event replay, post-commit acknowledgement recovery, payload conflict, revocation/expiry and financial rollback. Authenticated operator additionally proves no financial effect from evidence upload. |
| Restart/reconnect retains pending work and displays uncertainty | PASS: authenticated response loss → UNCERTAIN → online reload → original-event duplicate acknowledgement; 23 storage cases separately include actual persistent-profile close/reopen. Full authenticated app boot while offline is unsupported. |
| Expired/revoked evidence has a defined operator path | PASS for fail-closed retained-evidence recovery: actual server conflicts, original local evidence retained, retry disabled, manager/policy/original-session guidance shown. No automatic policy renewal or conflict-to-paid correction is claimed. |
| Local-only work is visible and affects current-browser shift close | PASS: queue discovery independent of server enrollment; real UI blocks before any close POST; unit tests also cover unreadable storage. Cross-tab reads use the shared durable store and a fresh command-boundary read. |
| Supported/untested combinations are explicit | PASS: named envelope and exclusions below; no broad offline-sales support promise. |

## Exact commands and environment

Run from repository root after the command/source review in [RUN_PLAN](RUN_PLAN.md):

```text
npm run agent:workflow:check
node docs/retention/execution/P06-operator-2026-10-17/run-check.cjs ui
node docs/retention/execution/P06-operator-2026-10-17/run-check.cjs storage
node docs/retention/execution/P06-operator-2026-10-17/database.cjs create
node docs/retention/execution/P06-operator-2026-10-17/database.cjs browser-fixture
node docs/retention/execution/P06-operator-2026-10-17/application.cjs
node docs/retention/execution/P06-operator-2026-10-17/browser-operator.cjs
node docs/retention/execution/P06-operator-2026-10-17/browser-server-close.cjs
node docs/retention/execution/P06-operator-2026-10-17/browser-read-states.cjs
node docs/retention/execution/P06-operator-2026-10-17/database.cjs full-commit
node docs/retention/execution/P06-operator-2026-10-17/database.cjs stop
node docs/retention/execution/P06-operator-2026-10-17/check-cleanup.cjs
```

The app was stopped by Ctrl+C before the final full-commit suite. Target: `localhost:62693/stoquify_pos_audit_20261017_344e01c0f0`, loopback-only new cluster; [target identity](DATABASE_TARGET.json), [schema provenance](SCHEMA_PROVENANCE.json), [application identity](APPLICATION_TARGET.json), [synthetic fixture](BROWSER_FIXTURE.json). Next 15.5.27, Chromium 149.0.7827.55, Windows, English desktop 1366×768 and French 390×844. Ambient environment values were cleared/blocked; no inferred application DB. Datamodel bootstrap is not migration-history/custom-trigger certification.

Additional exact checks: `node node_modules/typescript/bin/tsc lib/pos/offline-local-queue.ts --noEmit --strict --skipLibCheck --target ES2022 --module esnext --moduleResolution node --types node` (exit 0; [log](queue-typecheck-strict.log)); final panel-only Jest uses `--config docs/retention/execution/P06-operator-2026-10-17/jest.ui.cjs --runInBand --runTestsByPath components/pos/__tests__/LocalOfflineRecovery.test.tsx --json --outputFile docs/retention/execution/P06-operator-2026-10-17/panel-final.results.json` (exit 0). No full build, broad test suite, repository-wide typecheck, migration promotion, live backup restore, provider/customer operation or expert certification.

All failed/partial browser attempts are retained in [attempt notes](BROWSER_ATTEMPTS.md) and timestamped outputs. The anonymous boundary is specifically a verified **307 login redirect before action execution**; the separate authenticated spoofed-tenant request reaches the protected-action boundary. App output excerpts are incomplete diagnostic extracts, not a complete server log. Expected response aborts and the corrected test redirect failure remain recorded.

The first cleanup probe returned sandbox `EACCES`, which could not determine port state. Its result is archived. The reviewed loopback probe then returned `ECONNREFUSED` for both ports; `CLEANUP.json` records the successful final check. No automatic approval rejection occurred.

## Boundaries and risks

Browser-local visibility applies to the current browser profile and authenticated organization/station, including other sessions' pending queues at that station. It cannot prove another browser/device is empty, nor create a server-global period-close barrier before upload. A direct server call from another browser cannot inspect never-uploaded local storage; this is not a distributed close synchronization protocol. The UI explicitly says other browsers and server readiness require their own checks. Storage denied/corrupt/lost-marker conditions fail closed, which can prevent shift close until the original evidence is recovered. Do not clear browser data as recovery.

The named test envelope is already-loaded desktop Chromium on this Windows host, synthetic verified cashier, loopback Next application and disposable PostgreSQL. Signed retained events are fixture-generated; this does not establish production browser key enrollment, capture signing, policy renewal, automatic conflict correction or offline application boot. Those remain separate production-enablement prerequisites.

## Ownership and preservation

See [RUN_PLAN](RUN_PLAN.md), [BASELINE](BASELINE.json), and final `VALIDATION.json`. Changes are limited to the queue inventory/close helper and its focused tests, the new recovery panel and tests, surgical POS mounting/close checks, a synthetic operator fixture, this evidence packet and dated P06 artifacts/status. P01–P05 evidence and P07+ rows must remain intact. No staging or commit.

Exact executable source/test ownership: `lib/pos/offline-local-queue.ts`; `lib/pos/__tests__/offline-local-queue.test.ts`; `components/pos/offline/LocalOfflineRecovery.tsx`; `components/pos/__tests__/LocalOfflineRecovery.test.tsx`; `components/pos/ProfessionalPOSSystem.tsx`; `components/pos/__tests__/ProfessionalPOSSystem.shift-close.test.tsx`; `services/pos/__tests__/retention-offline-operator.browser-fixture.test.ts`. The existing sync hook/action and economic services were reused unchanged. **Application schema/data-model impact: none.** Runtime writes were synthetic records in the explicitly owned disposable target only.

One unrelated concurrent change was observed in `scripts/verify-calendar-browser.cjs`; it was not edited or reverted here. Final validation records any further drift instead of claiming the whole dirty tree is unchanged. Source patches are against captured working-tree baselines, preserving earlier P05/P06 work. [Ownership check](OWNERSHIP_CHECK.json) verifies original queue/test content, unchanged authority/schema sources and that only the P06 execution-register row changed.

## Recovery and handoff

Rolling back this UI integration must retain IndexedDB/localStorage evidence and the existing server close blockers. Do not delete/prune queues to restore usability. Service/schema behavior is unchanged. A manager can review persisted conflict history; review acknowledgement does not authorize payment/replay or clear unresolved local work. If the original cashier/session/policy is no longer valid, retain evidence for authorized domain recovery.

No new commercial retention metrics are claimed. Operational signals exposed: local non-acknowledged count (all statuses except SYNCED), uncertain attempt count (SYNCING/UNCERTAIN), conflict count and acknowledged-evidence count. These are per-browser observations, not tenant-wide reconciliation or financial totals.

Handoff: P06's bounded operator recovery slice is ready for later checkpoint consumers to inspect. Before any production offline-sales enablement, separately establish signed capture/key enrollment, policy/reference-age and renewal rules, reviewed conflict correction, multi-device period-close coordination, and deployed durability/restore evidence. No later prompt is executed or implicitly approved by this result.

Applied lenses: platform/backend/data (existing durability and transaction owners); IAM/privacy (server authority and count-only local view); frontend/workflow/accessibility/localization (recoverable states and EN/FR); QA/operations (synthetic isolated execution and cleanup); product/support (truthful pilot limits). Finance/audit/POS are relevant to immutable evidence and no false paid state. New statutory/country rules, AP/payroll, AI, pricing/billing and marketing are not applicable: none changes in this bounded recovery path.
