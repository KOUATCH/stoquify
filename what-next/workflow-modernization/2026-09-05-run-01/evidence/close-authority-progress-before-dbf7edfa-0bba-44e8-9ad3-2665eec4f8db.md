# Current progress

Updated 2026-10-01T04:48:30.111Z; HEAD 62a56036a5ac9b37236a20c9b148052199069479, branch codex/migration-control-plane-release-2026-08-29. Shared changes preserved. Register SHA256: 7644d66803417742e9ef2b668b7b1fa7c2dd794da94588bdec9058381cdea616. Full-register source reconciliation remains incomplete.

**Position:** 270 workflows discovered; discovery incomplete; 191 unmapped entries. Queued 264, In progress 2, Complete—verified 4; other statuses zero. Historical closures have not all been revalidated. No workflow closed this turn.

| Priority | Workflow and outcome | Status | Delivered and verified | Remaining criteria | Owner | Next action |
|---|---|---|---|---|---|---|
| Primary | FA-CASH-COMMAND: truthful finance actions | In progress | Reviewed replacement reduces retained missing-evidence count without rewriting history | Whole source/authority lifecycle | Engineering | Revalidate current authority across waits |
| Supporting | FA-CLOSE-PACK: controlled certification | In progress | Collection receipts, preview binding and publication/review ordering | Producer discovery, multi-period ordering, delivery/recovery | Accounting engineering | Coordinate producer period locks |
| Next 1 | PR-17: reconciliation exceptions | Queued | Prior correction handoffs | Financial/legacy treatment and recovery | Engineering | Reconcile original closure scope |
| Next 2 | ID-04: invitation redemption | Queued | Prior authority/recipient evidence | Accessibility, onboarding, transport | Identity owner | Verify transport boundary |
| Next 3 | MC-11: permitted workspace | Queued | Selected route/action boundaries | Cross-domain transport/scanner gaps | Engineering | Preserve guards; improve diagnostics |

**Delivered:** Successful collectors persist an integrity receipt binding the complete recorded observation, including honest empty results. Failed queries cannot produce that receipt. Acceptance requires explicit review of a newer matching collector and its exact preview digest. Altered, unavailable or stale previews reject. Exact retries retain one acceptance. Only verified original-obligation/replacement chains reduce historical missing-evidence counts; original runs, evidence and exports stay unchanged. A recovered source does not clear failed business controls or certify the close.

**Verification:** 371 tests across nine suites, TypeScript, changed-file lint, six actual PostgreSQL checks and EN1440/FR320 browser recovery passed. Actual publication/review blocking and concurrent exact retries were verified. Browser identity, stale conflict, note preservation and deliberate refreshed review matched persisted acceptance; historical proof stayed adverse. Source, outside-fixture and operation-financial hashes remained stable. The initial browser harness failure was corrected and retained. [Detailed evidence, instructions and recovery](CLOSE_EVIDENCE_REPLACEMENT_2026-10-01.md). No customer, statutory or release approval is established.

**Remaining:** Home-role permissions and complete account/organization/module authority must be revalidated across waits; current checks reread active identity, delegated access and authentication age. Source-writer discovery can still miss new assessments; participating producers need period locks and global multi-period ordering. Other producers, future-period recovery, interrupted processing/outbox delivery, whole Cash lifecycle, authentic country/payroll prerequisites, full accessibility and production performance remain open. Legacy receipt/invoice and carrying-value conflicts remain retained.

All 17 original families remain in the [register](WORKFLOW_REGISTER.json): identity, organization/access, modules, master data, sales, POS/offline, inventory, purchasing/AP, payments, finance/close, HRIS/payroll, compliance, analytics, evidence/governance, notifications, integrations and AI. Unrelated 268 workflow rows, all families and all workflow statuses are unchanged. No migration, deployment, live activation, payment, external message or X1 clearance occurred. No user input blocks the next local implementation. ETA remains unreliable.
