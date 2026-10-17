# Current progress

Updated 2026-10-01T04:08:08.902Z; HEAD 62a56036a5ac9b37236a20c9b148052199069479, branch codex/migration-control-plane-release-2026-08-29. Shared changes preserved. Register SHA256: 02afd47642018205fde079950fd68266c765d63a7faf45aeeaf72a209d88e511. Full-register source reconciliation remains incomplete.

**Position:** 270 workflows discovered; discovery incomplete; 191 unmapped entries. Queued 264, In progress 2, Complete—verified 4; other statuses zero. Historical closures have not all been revalidated. No workflow closed this turn.

| Priority | Workflow and outcome | Status | Delivered and verified | Remaining criteria | Owner | Next action |
|---|---|---|---|---|---|---|
| Primary | FA-CASH-COMMAND: truthful finance actions | In progress | Current/historical Close proof agrees with admission | Source-bound missing-evidence replacement; full source/authority lifecycle | Engineering | Link authoritative replacement evidence |
| Supporting | FA-CLOSE-PACK: controlled certification | In progress | Unique-current publication/certification ordering and stale-submit recovery | Producer discovery, multi-period ordering, delivery/recovery | Accounting engineering | Coordinate producer period locks |
| Next 1 | PR-17: reconciliation exceptions | Queued | Prior correction handoffs | Financial/legacy treatment and recovery | Engineering | Reconcile original closure scope |
| Next 2 | ID-04: invitation redemption | Queued | Prior authority/recipient evidence | Accessibility, onboarding, transport | Identity owner | Verify transport boundary |
| Next 3 | MC-11: permitted workspace | Queued | Selected route/action boundaries | Cross-domain transport/scanner gaps | Engineering | Preserve guards; improve diagnostics |

**Delivered:** Assessment publication and certification now serialize per tenant/period. The database supplies strictly increasing publication times; ties or clock regression cannot silently select a winner. Certification requires the unique latest, non-voided assessment. Related-period ownership is checked. Historical assessment status, drafts and recorded exports remain available. Dashboard/proof reads share coherent selection; EN/FR messages explain historical, tied and voided states. Already-recorded certification has accurate guidance.

**Verification:** 352 tests across 11 suites, 10 actual PostgreSQL checks, EN1440/FR320 browser recovery, changed-file lint, TypeScript and focused static gates passed. Both browser journeys preserved notes, refused the old assessment, refreshed current evidence and required an explicit retry before a verified download. Source, outside-fixture and operation-financial hashes remained stable. Failed harness attempts were diagnosed, corrected and retained without weakening acceptance. [Detailed evidence and operating guidance](CLOSE_ASSESSMENT_ORDER_2026-10-01.md). No customer, statutory or release approval is established.

**Remaining:** A source writer can discover old run IDs before a new assessment is published; all participating producers need verified period locking and global multi-period order. Historical unavailable evidence needs replacement ID/hash binding. Other producers, future-period recovery, interrupted processing/outbox delivery, whole Cash lifecycle, authentic country/payroll prerequisites, full accessibility/hydration and production performance remain open. Receipt/invoice legacy and carrying-value conflicts remain retained.

All 17 original families remain in the [register](WORKFLOW_REGISTER.json): identity, organization/access, modules, master data, sales, POS/offline, inventory, purchasing/AP, payments, finance/close, HRIS/payroll, compliance, analytics, evidence/governance, notifications, integrations and AI. Unrelated 268 workflow rows, all families and all workflow statuses are unchanged. No migration, deployment, live activation, payment, external message or X1 clearance occurred. No user input blocks the next local implementation. ETA remains unreliable.
