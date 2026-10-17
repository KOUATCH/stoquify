# Current progress

Updated 2026-10-03T16:40:26.679Z; branch codex/migration-control-plane-release-2026-08-29, HEAD 62a56036a5ac9b37236a20c9b148052199069479. Register SHA256: e0f6c502d1ce2611852c5c3becf552215fa4da9a1bdc1acd9b26e3d7d3129bc2. Shared changes preserved.

**Position:** 270 workflows / 17 families; discovery incomplete, 191 unmapped entries. Queued 264; In progress 2; Complete—verified 4; other statuses zero. No new workflow closure or denominator change. Previous turn was verified progress on cash evidence recovery and EN/FR journeys.

| Priority | Workflow and outcome | Status | Delivered and verified | Remaining closure | Owner/blocker | Next action |
|---|---|---|---|---|---|---|
| Primary | FA-CASH-COMMAND: truthful financial actions | In progress | Cash lifecycle and EN/FR proof; Close recovery panel integrated | Complete user recovery, all producers and authority | Engineering; prior manual-period approval outstanding | Verify new Close panel in browser |
| Supporting | FA-CLOSE-PACK: reliable retained evidence | In progress | Historical recovery read model; 4/4 persisted checks | Expiry/retry, bounded lists, concurrency, original purchase recovery | Engineering | Complete recovery edge cases and browser proof |
| Next 1 | PR-17: reconciliation exceptions | Queued | Prior scoped handoffs | Financial/legacy treatment and complete recovery | Engineering | Reconcile original closure scope |
| Next 2 | ID-04: invitation redemption | Queued | Prior authority/recipient evidence | Accessibility, onboarding and transport | Identity owner | Verify transport |
| Next 3 | MC-11: permitted workspace | Queued | Selected route/action boundaries | Cross-domain transport and scanner gaps | Engineering | Preserve guards; improve diagnostics |

**Since the previous report:** Added the Close period's missing-evidence panel using existing request, response and replacement-acceptance services. Historical missing findings remain visible after newer assessments. Queues and colleague choices use current tenant permissions; private responses require review access. Read-only module access disables writes, including restored commands. Drafts/pending requests are tenant/user/period scoped; password verification never implicitly accepts evidence. The no-period state regression found by testing was corrected.

**Verification:** 58 focused checks across four suites, current no-emit TypeScript and changed-file lint passed. Persisted lifecycle: 4/4 checks passed; overall passed. Sources stable and outside-fixture observations unchanged. New-panel browser verification remains incomplete. [Implementation, failed attempts, operating inputs and exact remaining criteria](CLOSE_EVIDENCE_WORKFLOW_2026-10-03.md). Prior cash proof remains separate: five database checks and two EN/FR browser journeys; it does not establish this new interface's completion.

**Remaining:** Request-expiry retry, full role/session/concurrency proof, bounded-list completion and new-panel accessibility/browser journeys. Bank import/provenance, actual bank finalization, concurrent evidence reuse and the original purchase/Close recovery criteria remain. The all-period manual-posting helper rejected by automatic approval review remains unapplied pending the existing approval request. Other producers, draft freshness, manual-session/legacy-role authority, signing/publication races, delivery, country/payroll evidence and capacity remain required.

All families and queued requirements remain in the [register](WORKFLOW_REGISTER.json): identity/access/modules, finance/ledger/close, sales/POS, inventory/purchasing, payroll, compliance/evidence/reporting, notifications/integrations and AI. No migration, reset, deployment, live activation, real payment, external message or X1 clearance occurred. Full goal remains active; ETA is not reliable.
