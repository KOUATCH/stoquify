# v103 — resolution core verification

Evidence date: 2026-09-09. Branch `codex/migration-control-plane-release-2026-08-29`, HEAD `a05a41ef66cd5d98fd69ae3df18225795f912232`. Existing shared changes were preserved. Source hashes and final coverage are recorded in `evidence/suspense-resolution-v103.json` and `evidence/source-baseline-v103.json` after publication.

## Executed checks

- Jest: **56 passed, 6 suites**, `evidence/suspense-resolution-v103-tests.json`. Session 80060 completed with exit 0, receipt `38dbc6`; preceding test output `357f9d` reports all passes. Covers strict resolution inputs, active scoped reader permissions, missing terminal evidence, original ledger regressions, generic allocated-journal reversal refusal and reconciliation manifest/certification regressions.
- Typecheck: direct `node_modules/typescript/bin/tsc --noEmit --pretty false`, session 59374, receipt `fafa51`, exit 0.
- Lint: direct `node_modules/eslint/bin/eslint.js` on 11 changed source/test files, receipt `da4be6`, exit 0 without warnings.
- Initial real-service database checks: `suspense-resolution-v103-3ab3d24d-5d6.json` (2 checks), expanded `1d7ea2ca-ad8` (9), then `93b83b9e-711` (9, receipt `deb91c`) including actual manifest and close invalidation. These are historical stages; the final expanded receipt is bound during publication.

The runtime command uses the installed Node executable and `lanes/environment/verify-suspense-resolution-v103.cjs`. It checks ownership of `stoquify_local_registration_20260906_01`, creates only owned synthetic organizations, performs actual original and independently approved manual clearing postings, verifies the resolution services, and compares unrelated rows before/after. A synthetic `CERTIFIED` close fixture is explicitly marked as a fixture, not an issued approval. The test proves invalidation behavior, not professional certification.

Final runtime assertions cover pure preview; missing/wrong journal; balanced partial clearance refusal; expense outcome labeling; tenant/actor/read permission denials; stale preview; independent rejection and exact retry; changed decision conflict; pending correction conflict; fresh reproposal; proposal replay; maker/fresh-auth refusal; injected late-audit rollback; duplicate concurrent approval; close invalidation; original journal retention; no new resolution journal; exact approved retry; generic reversal refusal; actual manifest binding; clearing exchange-rate tamper refusal; and legacy unproven final-state refusal.

## Scope limits

No new browser controls/actions exist, so EN/FR, keyboard, mobile and screenshots for terminal resolution are **not yet implemented/verified**. Prior v102 screenshots verify the currency path only. Source-owned reopening/reversal, durable operator history, cross-item shared clearing races, concurrent generic reversal, actual final sign-off/export journey and larger provider/period/country contexts remain open. Notification event persistence is not proof of provider delivery. No schema migration, full build, production run, legal/accounting/security certification or full workflow completion is claimed.

The current step is concrete engineering progress. It neither closes the platform goal nor replaces outstanding workflow discovery and remediation.


## Final publication

Runtime: lanes/environment/suspense-resolution-v103-44fc8d0a-43b.json, 11 checks passed, receipt e8c39a, exit 0; source stable and unrelated records unchanged. The preceding attempt (session 42668, receipt 4ce805) could not save its JSON due to sandbox EPERM; no pass is inferred from that attempt. Baseline first attempt also failed at output write (2ac07c); the narrowly approved retry succeeded (7bf774). Baseline contains 2808 files, 991 tests and 2411 control candidates. Aggregate: evidence/suspense-resolution-v103.json. No browser results are claimed for this service-only step.
