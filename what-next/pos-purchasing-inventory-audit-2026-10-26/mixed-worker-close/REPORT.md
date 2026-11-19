# Mixed-version delivery recovery and close writes

2026-10-28. Scoped disposable-database verification completed: **18 distinct tests PASS across the initial full run and affected-case rerun; 22 evidence stages; 16 terminal PostgreSQL states reconciled; zero residual fault triggers.** Scoped TypeScript and source-stability checks passed. No new application defect was confirmed. Changes are limited to the verification harness, configurations and evidence; existing rollout controls and application behavior remain unchanged.

The initial full run passed fourteen tests. Review identified three evidence weaknesses, which were corrected: stale acknowledgements now target an active successor lease; close denials assert their specific reasons; readback refuses partial matrices. Eight affected/new tests then passed. Four overlap the initial run, yielding eighteen distinct tests. [Combined tests](combined-results.json), [scenario records](combined-reconciliation.json), [PostgreSQL reconciliation](database-readback.json), [initial full run](initial-full-results.json), [strengthened checks](results.json).

Both close organizations finish CLOSED at control version 3 with CLOSE → REOPEN → CLOSE history, one stale original certificate plus one current certificate, stock 1.000/value 100.00, four balanced journals, one supplier payment, one payment transaction and one purchase return. A separate draft remains retained. Each actual crash/lost-response receiver case preserves one durable effect despite two requests; active lease probes preserve the successor until its own acknowledgement.

## Source, controls and evidence scope

The historical source is commit `9ab93a2a1d81e37ef7e0b10357885b48a3bc5886` in the retained immutable test snapshot. Separate Node processes select historical/current source and their schema-specific Prisma clients. The target remains `localhost / stoquify_pos_audit_20261026_d30f / public`. [Start provenance](start-source.json), [owner comparison](owner-comparison.json), and per-run source receipts bind this evidence to the actual source. The workflow contract passed before tests. No application environment files or provider credentials are loaded by the runner.

The selected old/current outbox, alert delivery, close-pack export, period-close and reopen owner files are byte-identical. The close-assessment service differs. These tests therefore qualify the selected code/schema pair and its connected effects; they do not invent a delivery-key change between these two versions. The older source-key transition described in the release runbook predates this baseline and remains outside this pair.

Both execution receipts report zero drift in captured owner/harness files during their runs: [initial full source](initial-full-source.json), [targeted source](run-source.json). [Final provenance](final-source.json) compares the broader source snapshot and records intentional harness changes separately from the fixed historical snapshot.

The broader final comparison also detects an unrelated `tsconfig.json` edit for public-performance generated types and a command-center browser entry exclusion. It was preserved. The recovery config supplies its own explicit include list, and Jest uses explicit source/client mappings; this change does not alter the tested runtime owner selection. No other captured application source changed during this continuation. The historical snapshot remains unchanged.

Tests reuse the real business-event outbox, assurance webhook dispatcher, close assessment/export owners, period controls, purchasing correction and balance-schedule services. Direct close-service calls receive explicit synthetic actor/permission/fresh-auth controls; they are not authenticated HTTP actions and do not establish session-revocation behavior. No application guard is disabled.

Each worker case creates its own synthetic organization/event. Outbox selection is organization/event scoped. The assurance dispatcher is global, so HTTP cases use an explicit 2001 logical lease clock and refuse to run if any previously retained delivery could be eligible. This changes neither host nor database time. No other delivery is rescheduled or cleared. A uniquely named `audit_mv_receiver_*` table models a receiver's durable unique key; it is test infrastructure retained only in this disposable database. Actual HTTP uses an ephemeral loopback port and a synthetic bearer secret.

Close fixtures earn their evidence through receipt, invoice, independent cash settlement/reconciliation, accounting setup and approved balance schedules. READY/CERTIFIED/CLOSED outcomes are not seeded. Non-exercised setup rules remain explicitly synthetic configuration. Fault injection is confined to the new organization's specific ledger audit action and is removed in `finally`.

## Acceptance matrix

| Area | Required durable behavior | Evidence procedure |
|---|---|---|
| Outbox crash, both directions | Consumer commit survives process exit; retry keeps one effect and one delivery audit | Worker exits 73 after real PostgreSQL consumer commit and before acknowledgement; other source recovers after logical expiry |
| Outbox retry, both directions | Backoff blocks early retry; attempt limit yields dead letter; private errors remain sanitized | Two actual failures with configured maximum two attempts, cross-version retry, retained error/audit state |
| Active outbox lease | Wrong tenant, stale success/failure and changed lease identity cannot consume a live successor lease | Same worker ID reused across versions; inspect live row before correct acknowledgement |
| HTTP unknown outcome, both directions | Lost reply after receiver commit causes two requests but one receiver effect | Receiver commits then destroys first socket; other version retries using the same key |
| Active HTTP lease, both directions and reply types | Old success/failure cannot overwrite a successor still processing | Hold successor response, release predecessor success/503, verify successor's exact active lease, then acknowledge successor |
| Exhausted HTTP lease | No sixth request after an expired fifth attempt | Explicit synthetic exhausted-crash row; old/current dispatcher dead-letters before sending |
| Blocked close handoff | Other version can export a draft but cannot certify missing evidence | Earn BLOCKED assessment through actual owner; inspect draft and denial |
| Certification handoff/race | Independent current evidence only; audit failure rolls back; mixed attempts yield one certificate | Approved schedules, independent review, tenant-scoped audit fault and barrier-started old/current certification |
| Seal/reopen/correction | One seal per version; original reopening identity survives handoff; changed payload fails; old certificate remains historical and stale | Close audit rollback, seal/retry, denied closed-period return, reopen/replay, correction, refreshed schedules, recertification and reseal |
| Explicit close denials | Permission, self-certification, foreign run and stale authentication fail for their intended reasons | Assert specific errors on retained cross-version artifacts, unchanged certificate counts |

## Evidence classes and practical limits

- **Source/static:** command controls, source hashes, owner comparisons, scoped TypeScript and targeted diff inspection. No full production artifact build or clean locked dependency installation is claimed.
- **Mocked unit/component:** none added for this continuation. Database and worker behavior are not mocked.
- **Real PostgreSQL:** isolated version-specific clients, retained consumer receipts, lease state/attempts, delivery audits, close records, certificates, period events, stock and balanced journals. Final readback must require the completed test matrix and expected record counts; partial evidence cannot pass it.
- **Real HTTP:** local synthetic receiver only. Its PostgreSQL unique key models consumer deduplication; it does not certify an email, fiscal or payment provider.
- **Browser/authentication/accessibility:** not exercised here. Earlier single-version EN/FR browser evidence remains separate.
- **MTN and operating policy:** excluded as instructed. Rollout flags/defaults, retention, resumption/escalation policy and negative-stock behavior are unchanged.

## Procedures and retained artifacts

From the repository root, after reviewing current definitions and environment controls:

1. `npm run agent:workflow:check` — contract validation only.
2. `node what-next/pos-purchasing-inventory-audit-2026-10-26/mixed-worker-close/provenance.cjs start` — source and historical snapshot hashes.
3. `node .../mixed-worker-close/run.cjs 'recovers a real baseline'` — successful crash/recovery preflight, retained separately.
4. `node .../mixed-worker-close/run.cjs` — full initial matrix. Preserve its results, reconciliation, log and source receipt before targeted reruns.
5. `node .../mixed-worker-close/run.cjs 'fences a late|protects a live|checks explicit close'` — strengthened evidence cases. The exact filter is retained in the run source receipt.
6. `node node_modules/typescript/bin/tsc --project tsconfig.mixed-recovery.json --noEmit --incremental false` — scoped compiler check without incremental output.
7. `node .../mixed-worker-close/combine.cjs` — validates and combines named passing cases; skipped cases do not overwrite earlier results.
8. `node .../mixed-worker-close/readback.cjs` — fixed-target read-only reconciliation; verifies expected terminal states, certificates, seals, journals and absence of fault triggers.
9. `node .../mixed-worker-close/provenance.cjs final` — final source comparison, preserving unrelated changes.

Private child jobs/logs live under ignored `.codex-tmp/mixed-recovery-work`; do not publish them. Exported evidence is scanned against private target/session values. No app server, production mutation, live charge, migration promotion, deployment, commit or push is part of this work.

The final harness is a two-stage procedure against the retained target: exact close-denial cases read `initial-full-reconciliation.json` and its retained certified organizations. For a new replay using the final harness, run the independent matrix first with filter `^(?!.*checks explicit close)`, preserve its four artifacts as `initial-full-*`, then run `checks explicit close` and combine. Do not overwrite the existing evidence to reconstruct this historical run. The actual evidence here comes from the original fourteen-test full run followed by the eight affected cases, not a single eighteen-test invocation or a fresh-database suite.

## Rollback and remaining boundaries

There is **no remaining blocked check in the requested local active-lease, close-denial and reconciliation scope**. Broader certification remains limited as follows:

| Remaining gate | Exact missing evidence or condition |
|---|---|
| Mixed production Next/browser transport | Exact immutable artifact pair and deployment-equivalent routing/runtime configuration; stale tabs/server-action IDs/chunks and authenticated cross-build journeys |
| Hosted worker operation / real receiver | Actual cohort routing and drain configuration, nonproduction receiver receipt access, and demonstrated durable deduplication after accepted-but-unacknowledged deliveries |
| Receiver keys older than selected baseline | The actual legacy worker version and attempted delivery/receiver receipts, followed by the existing reviewed key-mapping/continuation procedure; this pair already shares the newer key scheme |
| Earlier unsupported PO/restoration combinations | Enforced exclusion of unaware PO writers, consistent admission flags, and repaired restoration owners, or a separately qualified compatibility bridge; the preceding MV1–MV3 findings remain valid |

MTN, default authoring/legacy adoption and retention/resumption/escalation policy remain deliberately outside this work. Their exclusion is not a failure of these local checks. Negative-stock certification is also still excluded. This continuation supersedes the earlier "mixed delivery-worker recovery" and "mixed close writes" not-run labels only for the selected local version pair and the exercised owners.

No schema or rollout-default change is proposed. Keep the expanded database schema and retained business receipts. These local probes do not authorize sending PO or restoration writes back to the incompatible historical writers identified in the preceding report. The selected compatible delivery pair does not qualify older source-derived receiver keys: those still require the existing stop/drain/receiver-receipt reconciliation procedure and reviewed key mapping. Do not reset attempts, delete receipts or mass-requeue uncertain deliveries.

Release-specific mixed Next artifact/browser transport, hosted worker routing/drain enforcement, real receiver deduplication and the older key transition still require separate evidence. MTN and open policy decisions remain excluded. System close certification is not statutory certification or deployment approval.
