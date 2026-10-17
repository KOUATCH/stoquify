# P06 — Execution result

> **17 October 2026 operator follow-up: PASS for the bounded authenticated recovery and current-browser queue visibility slice.** The actual POS now discovers local-only retained evidence, offers authenticated original-envelope recovery, preserves the panel during read failures, and checks durable local work before shift-close submission. Final evidence: 64 mocked component/hook checks (11 panel checks repeated after a visual fix), 23 real Chromium storage checks, 16 real PostgreSQL cases, a seven-step authenticated operator journey, server-close denial from an empty-local-queue browser, and French mobile/read-failure checks. See the [complete implementation and verification report](../P06-operator-2026-10-17/RESULT.md). Production offline capture/economic replay remains disabled; no global pre-upload period-close synchronization or production readiness is claimed. Earlier partial records below are retained as history. No later prompt ran.

> **17 October 2026 follow-up: integrated verification slice PASS; overall P06 remains PARTIAL.** Actual PostgreSQL and Chromium queue/ingestion/replay checks now verify response loss, duplicate/concurrent replay, post-ingestion revocation, expiry at ingestion and persisted close blockers. P05's bounded runtime prerequisite passed. See the [dated closure report](../P05-P06-closure-2026-10-17/RESULT.md). The authenticated offline operator path, local-only pending-work visibility and broader authority-change/restart combinations remain open; production replay stays disabled. Earlier findings below are dated history, not the current integrated-test status. P07 and later prompts did not run.

**PARTIAL — independent offline discovery and fixture work; production replay remains disabled and integrated financial/browser proof is outstanding.** Started 16 October 2026; resumed 17 October after test processes ended without results. Only P06 ran; no later prompt was executed.

## Scope and dependency decision

P04's local preparation is recorded as PASS with T01–T08 runtime/trust blockers. P05 remains PARTIAL: real PostgreSQL concurrency/rollback and interrupted-response application-browser evidence are missing. The [common contract](../../implementation-prompts/COMMON_EXECUTION_CONTRACT.md) says, “If a predecessor is partial, perform only demonstrably independent discovery/fixture work”. Accordingly, P06 maps current source and exercises independent synthetic fixtures; it does not implement dependent production behavior or enable offline sales.

The existing queue implementation already has IndexedDB strict transactions, revision-based updates, a two-minute sync lease, attempt-bound acknowledgement and immutable original event identity. The server has ingestion/conflict evidence and a separate sale replay path. Critically, economic replay requires test NODE_ENV plus an explicit test flag. The scoped TS/TSX search found no production caller connecting the local capture/flush hooks to checkout. Server status monitoring exists; a complete supported offline cashier journey is not established.

Delivered [OFFLINE_ENVELOPE](OFFLINE_ENVELOPE.md) defines the bounded fixture, scope, signing/policy/reference limits, unsupported-state wording and operator path. [OFFLINE_FAILURE_MATRIX](OFFLINE_FAILURE_MATRIX.md) maps reconnect, interrupted/lost acknowledgement, duplicate/changed replay, revocation/expiry/staleness, storage denial and readiness to evidence and remaining checks.

## Baseline and exact owned files

HEAD `f41145e431150ec5161aabbfdfe70d392ecbfed1`; branch `codex/migration-control-plane-release-2026-08-29`. Initial observation at `2026-10-16T19:35:20.256929+00:00`: 15,644 dirty/untracked status entries. [Initial baseline](evidence/INITIAL_BASELINE.json) contains raw hashes for selected sources, 106 prior retention artifacts and P04/P05 source drift; [resumption check](evidence/RESUMPTION_CHECK.json) found no subsequent selected unowned source or prior artifact change.

P04/P05 are historical evidence, not current release certificates. Nine P04 manifest paths and twelve P05 paths differ from their captured source, including command controls, protected actions, checkout/UI/service and DB fixture work. Those changes were preserved. Current workflow definitions were reviewed; the P05 retained-operation-ID predicate is still present in `pos.service.ts:2197`. P06 tests mock the real sale-commit dependency, so they do not requalify changed production checkout or deployed authority.

Owned changes only:

1. `services/pos/__tests__/offline-sync.service.test.ts`: seven added cases covering missing replay opt-in, expired policy, policy hash mismatch, source hash mismatch, duplicate evidence after expiry, legacy unsigned enrollment and the absence of a capture-age limit. The duplicate fixture's mocked update was corrected to preserve its expiry field.
2. `lib/pos/__tests__/offline-local-queue.test.ts`: one added real-browser network-transition fixture, preserving the original event as unknown through offline/reconnect/reload and reporting the actual fixture browser envelope.
3. `jest.retention-offline.config.cjs`: exact four-suite runner, no project Next config or dotenv loading. Node service/browser lanes and explicit jsdom hook lane are separate commands.
4. This P06 directory/evidence and only P06's row in `../STATUS.md`.

No production source, schema, signing policy, enrollment, payment, close rule or UI changed. **Data/schema impact: none.** No migration, seed, install, graph regeneration, real database query, provider operation, deployment, customer contact, staging or commit. Original test files were captured before editing; [owned patch](evidence/OWNED_CODE.patch) excludes pre-existing work. [Artifact validation](evidence/VALIDATION.json) reports preservation precisely.

The ECC security-review skill informed scope/authority/evidence review; repository controls override its generic deployment/install recommendations. No new subagents were used for P06. Historical graph nodes were inspected only and checked against current source, with the 9 August refresh explicitly treated as stale.

## Findings and acceptance

| Acceptance criterion | State | Evidence and limitation |
|---|---|---|
| Replay cannot double-post; changed payload/invalid authority denied | PARTIAL | Modeled server cases cover duplicate identity, altered payload, signatures, revoked devices and transition evidence. Real `commitPOSSale`, Prisma and posting effects are mocked. PostgreSQL ingestion/replay races and one actual financial effect set remain unproved. |
| Restart/reconnect preserves pending operations and exposes unknown state on tested device | PARTIAL | All 19 isolated Chromium queue cases passed, including restart and offline/reconnect; hook tests model transport/acknowledgement uncertainty. Application checkout is not wired to a demonstrated local offline flow; rendered unknown-state UX remains unproved. |
| Expired/revoked policy has operator recovery without silent drop or false paid state | PARTIAL | Source and fixtures preserve quarantine/conflicts and separate ingestion acknowledgement from sale finality. Runbook specifies preserving original evidence and authorized review. No generic self-service repair of quarantined/local-only events or integrated resolution path was implemented. |
| Supported envelope and untested combinations documented | PASS — documentation | Exact fixture boundaries and production unsupported state in OFFLINE_ENVELOPE. Browser/device claims are limited to actual recorded execution; no wider device support or legal/tax certification. |

The new characterization cases expose important limits: legacy enrollment can lack a signing key and expiry; reference validation compares hashes but does not enforce a maximum capture age. These are not silently changed into stricter policies. Matching duplicates after expiry acknowledge already-ingested evidence; they do not authorize another sale. A manager's review acknowledgement does not clear close blockers or authorize replay.

Persisted pending/quarantined events and certificates feed checkout readiness through `checkout-state.ts:28`. Server-only counts cannot see unsent local queues. Local pending visibility at shift/period close must be proved before enabling a real offline sales promise.

## Verification

[VERIFICATION.json](evidence/VERIFICATION.json) records exact commands, exits, counts, runtime/configuration identity and failed/interrupted attempts. A test definition, skipped suite, source assertion or process exit without test results is never counted as a pass.

| Class | Actual execution | Limit |
|---|---|---|
| S — source inspection | Current workflow/registry/hooks, P04/P05 artifacts and manifests, local persistence, flush hooks, ingestion/replay, review/resolution, protected actions, schema and readiness relationships. | [Source manifest](evidence/SOURCE_MANIFEST.json); scoped current inspection, not a platform security or production audit. |
| Workflow control | `npm run agent:workflow:check` passed on initial execution and resumption, exit 0; 196 scripts unclassified. Runner imports fs/path/crypto and executes no application command. | Current package definition, absent lifecycle hooks, runner, manifest, setup and selected test imports reviewed before execution. |
| M — service and hooks | PASS: 41 service tests and 17 hook tests; 58 tests across 3 suites, no skips, exit 0 on 17 October. | Service uses mocked Prisma, sale commit/recovery and receipt; hook transport/query/queue collaborators mocked. Actual Node crypto fixtures do not make this a DB test. |
| B — isolated browser storage | PASS: 19 tests, 1 suite, no skips, exit 0 on 17 October; Chromium 149.0.7827.55, Windows, headless, 1280 × 720. | Only queue helper on ephemeral localhost HTML fixture. No Next/auth/tenant UI, server ingestion, payment or application accessibility evidence. |
| D — real database | NOT_RUN. No disposable target selected or connected. | P05 prerequisite plus real ingestion/commit/acknowledgement concurrency remain open. No guessed offline DB runner supplied. |
| B — application/browser journey | NOT_RUN. | No authenticated checkout, rendered FR/EN recovery, manager resolution or local queue close-blocker journey. |
| P — provider/authority | NOT_RUN. | No settlement, receipt delivery, authority or device-administration operations. |
| C — customer outcomes | NOT_RUN. | No observed adoption, churn, satisfaction or support outcome. |
| E — qualified expert | NOT_RUN. | No accounting, tax, OHADA, legal or security certification. |
| O — operations | NOT_RUN. | No power-loss, load, deployed restore, RPO/RTO or incident recovery proof. |

The 16 October service/hook/browser processes ended with code `1073807364` and no test JSON; cause was not established. A resumed PowerShell service invocation also produced no result before being interrupted, exit 1. A direct cmd-shell run then completed with 40 passes and one new-fixture failure: the shared mocked update replaced expired-device settings with the default device. The fixture was corrected within the added test; no application behavior was changed. The failed JSON is retained separately from final results.

Browser retries initially failed during shared setup: the default sandbox cache lacked Chromium, a cmd environment override was ineffective, and a direct PowerShell attempt was interrupted without results. A reviewed Python subprocess wrapper selected the already-installed Chromium cache; Chromium then launched but localhost navigation failed with `ERR_NETWORK_ACCESS_DENIED`. Those 19 setup failures are retained separately and do not establish queue behavior or 19 product defects. The same isolated fixture was retried outside the sandbox after the tool's escalation review; no browser installation, application database, user browser profile or external server was involved. Final results and the actually observed runtime are recorded in VERIFICATION.json and BROWSER_RUN_LOG.txt.

Discovery corrections: the initial predecessor-manifest reader expected a dictionary but P04 used a list; it was corrected before baseline capture. Guessed close-service/schema paths were absent; actual owners were located. A tasklist diagnostic failed argument parsing. None is treated as application verification. No broad build, lint, typecheck or unrelated test suite was used.

## Continuation and recovery

The next dependency work is **P05 verification closure**, followed by the missing P06 integration checks—not automatic execution of P07. Revalidate changed P05/P04 source, establish an explicitly owned disposable DB and app fixture, and run their relevant real financial/browser cases. Then execute the P06 integration fixture in OFFLINE_FAILURE_MATRIX: real lost acknowledgement after commit, concurrent same-ID replay, revocation/expiry races, truthful operator UI and local-only pending work at close. Keep production replay disabled until separately authorized scope and evidence justify changing it.

No migration rollback is needed. If reverting this slice, remove only the captured added tests, owned config and P06 artifacts/status change; preserve all original and concurrent content. Do not erase actual customer queues, rewrite signed payloads, regenerate IDs, take another payment or force-close a shift as a recovery shortcut.

No product telemetry was added. Test counts, result classifications and persistence assertions are engineering evidence only. Future measures should distinguish local pending count/age, unknown-attempt duration, ingestion acknowledgement, economic replay, quarantined work and final operator resolution. No current performance or retention benefit is inferred.

Review lenses: architecture/domain/data ownership, IAM/privacy and financial/audit integrity traced; QA/SRE covered by evidence separation and failure fixtures; product/support by explicit unsupported-state and recovery guidance. UI/design/localization/accessibility are source/runbook-only with no product edits. Country/tax, new payment integration, AP/payroll, AI autonomy, packaging/pricing and rollout implementation are not applicable because none was changed or executed.
