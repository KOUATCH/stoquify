# Command Center Phase 3 — context and recovery

24 October 2026. Implemented within the existing page contracts, preserving Phases 1–2 and unrelated local edits. No database changes, migrations, seeds, schema promotion, deployment, staging or commit were performed. Full source-copy review (CC-03.4) and the Phase 4 release gate remain open.

## Delivered behavior

- Manager tenant priorities now explain their actual ranking: severity, source-owned deadline, risk score, stable action identity. Digest, Owner and location signal queues use risk score with stable identity ties. Owner’s existing cash/close/payroll recommendation and its permission gates remain separate from queue priority.
- Real assurance/request deadlines remain source-owned. Signal evidence expiry, incident detection, response submission, generated-source failures and reconciliation period end have distinct labels. They no longer create false overdue/due-today work. An absent source expiry is unavailable. The generic ActionQueue helper and unrelated consumers were not changed.
- UTC period/deadline semantics are explicit. Manager and Owner pin one request clock before source loading, as Digest/location loading already did. Headers use explicit UTC periods; Digest may still show generation time in the organization timezone.
- English/French ranking, recovery, date meanings, role/status labels, canonical signal messages and Manager generated copy are localized. Digest source links normalize to the selected language. Exact canonical translations preserve custom/source-authored text, amounts, access decisions and provenance.
- All four dashboard variants share a refresh control. It hides private descendants while checking access and prevents duplicate requests. Success requires a newly committed payload, not the void return value from router.refresh(). Unconfirmed refresh becomes a failure after 20 seconds; retry/full reload remain available. Success explicitly does not certify source freshness or resolve work.
- Replacement payloads remount private descendants even when timestamps match. Owner proof reads clear previous evidence and ignore superseded/closed requests; delayed results cannot repopulate a replaced page. Owner mode state now restores from validated URL state. Digest agent state also resets when access/proposal gates change.
- Native source links, modifier-click and browser Back preserve safe context. Existing allowlists accept only authorized source/role/location choices and valid modes/urgency/page values. No returnTo or arbitrary redirect destination is consumed. Recovery/error copy does not expose internal exception details.

## Acceptance record

The [shared checklist](../phase-0-2026-10-24/ACCEPTANCE_CHECKLIST.md) records CC-03.1–03.3 and CC-03.5–03.9 as implemented with bounded evidence. These checkmarks do not certify live authorization, database isolation or deployment readiness.

CC-03.4 remains open for a complete inventory/review of upstream generated copy and accessible names. Owned copy and canonical signal families have EN/FR coverage; synthetic fixtures intentionally retain some authored English evidence and cannot establish exhaustive localization. No automatic translation of customer evidence was introduced. Phase 4 still requires full authenticated journeys and accessibility/release checks. Phase 2’s human productivity trial remains pending.

## Verification, separated by evidence type

**Source inspection:** reviewed page contracts, source adapters, ranking/date paths, existing scope checks, refresh/error handling and async proof behavior. The workflow gate passed (`npm run agent:workflow:check`; 196 unclassified package commands reported). Its current runner, registry and lifecycle definitions were inspected before execution. No package verification script outside the reviewed lane was implicitly trusted. Direct local commands below were separately reviewed.

**Mocked/pure tests:** [full lane output](mocked-tests.txt): 16 suites, 295 tests passed. After the final request-clock fix, the two affected service suites passed all 64 tests, including two new midnight cases; see [boundary output](midnight-tests.txt). Together these runs cover 297 distinct current tests. The other 14 suites were unchanged after their passing run. Coverage includes sorting/expiry/deadline semantics, UTC offsets, locale/custom-copy preservation, invalid navigation inputs, scope denial, refresh success/failure/timeout, stale private responses, mode restoration and source-action restrictions. Prisma/source boundaries are mocked; these are not real database tests.

Commands:

```powershell
node node_modules/jest/bin/jest.js --config components/daily-habit/__tests__/jest.phase3.config.cjs --runInBand
node node_modules/jest/bin/jest.js --config components/daily-habit/__tests__/jest.phase3.config.cjs --runInBand services/manager-action-center/__tests__/manager-action-center.service.test.ts services/owner-war-room/__tests__/owner-war-room.service.test.ts
node node_modules/typescript/bin/tsc --noEmit -p components/daily-habit/__tests__/tsconfig.phase3.json
node docs/command-center/phase-3-2026-10-24/verify-browser.cjs
```

The isolated Jest configuration invokes next/jest without an application directory, uses its explicit setup/mocks and bounds suite roots. It does not load application configuration or environment files. TypeScript emits no application/build files and disables incremental output. Browser bundling writes only its owned `.codex-tmp/manager-phase3` fixtures/report artifacts and does not run Next or source services.

**Static checks:** scoped UTF-8 validation and `git diff --check` passed. Focused TypeScript result is recorded separately in [static-checks.json](static-checks.json).

**Rendered/browser checks:** [runner](verify-browser.cjs), [results](browser-results.json). All eight EN/FR journeys passed in headless Edge: Daily Digest, Owner War Room, Manager tenant, Manager locations. Each exercised 375×1000, 768×1000 and 1440×1000 widths with reduced motion; no horizontal overflow or page errors. Assertions cover pending/confirmed/failure/retry, private-content clearing, retained mode, locale-correct source handoff, native new tab, Back restoration, and zero business-action calls. Manager details were opened by keyboard. [French Manager mobile](manager-action-center-fr-375.png) and [English Owner desktop](owner-war-room-en-1440.png) were visually inspected. Screenshots show synthetic evidence, not customer records. The fixture route `/locations` represents the branch variant of the existing Manager page; no production route was added.

Router refresh/commits and actions are mocked in the browser fixtures. This verifies rendered behavior, not real Next routing or reauthorization. No live authenticated session, real source integration, database test, screen-reader audit, browser zoom audit or release build was run. The 20-second recovery threshold is a UI fallback, not a server latency guarantee.

## Preservation and rollout boundaries

Baseline HEAD: `9ab93a2a1d81e37ef7e0b10357885b48a3bc5886`, with existing uncommitted work. [Before hashes](before-files.json) cover 125 scoped files. [Preservation record](preservation.json) identifies 23 owned baseline files changed and 102 unchanged, plus additional owned helpers/contracts. Schema, package metadata, command registry and captured business-action files remain byte-identical to the pre-turn baseline. Per-file backup/diff review used `.codex-tmp/manager-phase3-before` and `.codex-tmp/phase3-review`; the whole dirty tree was not reset.

The shared Work & Follow-up integration across all three centers remains explicitly planned for Phases 5–6. This phase adds no fourth center, assignment persistence, durable review receipt or generic completion action.

Rollback should reverse only the Phase 3 hunks/new files after inspecting subsequent edits. Do not restore an entire component or reset the working tree: the same files contain earlier authorized work. Retain existing authorization, Finance reconciliation signing and contextual branch-close controls.
