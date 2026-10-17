# Accounting-period creation and physical-count evidence

Primary FA-CASH-COMMAND; supporting FA-CLOSE-PACK. Previous turn: progress, with source-bound existing-period publication ordering verified. This next correction preserves the full 17-family modernization objective and original parent-workflow closure criteria.

## Baseline and pre-edit acceptance

Evidence date 2026-10-01. Branch codex/migration-control-plane-release-2026-08-29; HEAD 62a56036a5ac9b37236a20c9b148052199069479. Baseline checkout had 227 tracked modifications and additional untracked work; shared changes are preserved. Exact pre-edit files and register/progress bytes are retained in evidence/period-catalog-before-ba70a26d-61b4-4771-90aa-744a43178e1e.json. Prior register SHA256 ea86475d5f466c36d6a2c2d87949491fb33c2feb476e48ba920a767eed664b98. Counts: 270 workflows, 17 families, 191 unmapped entries; 264 queued, two in progress and four historical verified closures. Discovery and source reconciliation remain incomplete.

The current count lock set protects existing periods. A concurrently created accounting period can appear after discovery, publish an assessment before count commit and escape invalidation. This is an engineering gap, not missing organizational approval. The current online membership writer is createFiscalYearWithPeriods, reached through accounting setup. Period-close status changes do not change the all-status cumulative evidence set.

Acceptance criteria established before product edits:

1. Coordinate catalog readers and the existing online membership writer with tenant-scoped transaction advisory locks. Count takes shared before any posting-period row lock or period-set discovery; fiscal creation takes exclusive before its first write. No broad global lock or new schema.
2. Preserve current committed visibility: owned count transactions stay Read Committed; incompatible inherited transactions fail before effects. Acquire sorted assessment-period locks after catalog and posting-period selection; hold through commit.
3. Preserve fiscal-year creation, its audit and no-monthly-period behavior. Use the same exclusive boundary for the whole creation operation, including no-monthly requests, to keep a single auditable service contract. No additional business approval or changed overlap policy.
4. Prove the saved predecessor race and both current count/creation commit orders with real separate PostgreSQL connections and observable blocking. Include a period with no prior assessment, retained history, count replay, creation rollback/retry, tenant isolation, compatible shared readers and open-period contention where feasible.
5. Re-run affected inventory, period creation and Close regressions, existing no-emit typecheck and changed-file lint serially. Verify no zero-variance financial effects or outside-fixture changes. Preserve failed attempts and source bindings.
6. Keep current UI and EN/FR wording unchanged. Update this report's recovery/user instructions and the single current progress checkpoint. Do not call either parent workflow complete from this patch.

No migration, seed, deployment, live customer activation, real payment, external message or X1 clearance is authorized by this correction. Direct offline seed/fixture period writers must remain outside concurrent online operation. Future date-edit/delete writers require this membership protocol plus their own evidence invalidation and lock-order design. Period overlap policy, other producers, global journal reversal ordering, outbox delivery and complete Cash lifecycle remain separate unresolved requirements.

## Implementation and review

The new accounting-period-catalog service supplies shared/exclusive transaction locks on the same tenant key. The fiscal-year service takes exclusive before its first write, including no-monthly-period requests. The count service computes its variance before period selection, and only the zero-variance branch checks actual Read Committed isolation and takes shared before the posting-period row lock. It then resolves the affected set and takes the existing sorted assessment locks. The standalone set-lock helper retains its isolation guard.

No business rule or authorization was moved into the lock helper. Existing tenant checks, independent approval, source evidence and exact replay precede lock admission. Nonzero variance retains its domain path; only pure variance calculation moved earlier. Fiscal clipping, audit and response remain unchanged. Independent comparison against the captured baseline found no concrete defect. Current graph communities 3 (period services) and 55 (counts) were used to locate dependencies, then source was revalidated.

The online creation action still requires `accounting.setup.manage` and fresh authentication. Period-close changes status only, so it takes no catalog lock. The posting-period row SHARE and period-close row UPDATE continue to serialize those operations. Arbitrary inherited transactions must acquire this boundary before holding conflicting period/domain locks; Read Committed alone does not prove a safe global lock order. No online supplied-transaction count caller was found in the inspected source.

The implementation deliberately makes a request that creates only a fiscal-year record wait too. This gives the creation service one transaction-order contract and avoids a branch-specific lock rule. No period is inserted when monthly periods are disabled. Separate tenants use separate keys; shared readers remain compatible, while counts may still contend on their overlapping assessment-period locks.

## User and operator guide

Use the existing accounting setup screen (`/en/dashboard/accounting/setup`, or `/fr/`) to create the fiscal year. Enter the real fiscal-year name and start/end dates from your organization's approved accounting calendar, and choose whether monthly periods are required. This patch creates no new approval form or configuration switch.

Use `/en/dashboard/inventory/loss-control` or its French equivalent to complete and independently approve the count. Use `/en/dashboard/accounting/close` or `/fr/` to review the resulting evidence and run a new assessment when needed. If count posting overlaps calendar creation, one operation waits until the other transaction finishes. A waiting indicator or network timeout is not confirmation of completion.

After an uncertain count response, reload the existing count and reuse its established retry flow; do not create another count to work around a timeout. After uncertain fiscal creation, inspect the fiscal-year list and the actual year/period records before creating again: this correction guarantees transaction rollback, not idempotency for a second fiscal-year request after a lost successful response. Existing overlaps and duplicate fiscal-year policy are not silently changed.

| Situation | Information needed and source | Owner / next action |
|---|---|---|
| Calendar and count overlap | Organization, fiscal-year dates/name, count-session reference and time of operation, from the setup and count screens | Support correlates waits/timeouts; engineering inspects database contention. No credentials or raw lock keys are required from the user. |
| Period closed while posting | Count date and selected posting date, from the count record | Authorized accounting operator reviews the actual period status. Retry only through a legitimately open period; do not reopen or relabel records automatically. |
| Close evidence stale after a completed count | Count and assessment references from Loss Control and Close | Accountant reviews the completed observation and runs a current assessment. Retain prior exports as historical records. |
| Technical creation/count failure | Displayed error/correlation reference and current year/count state | Engineering resolves the cause. A failed creation transaction leaves no partial year/period/audit; an uncertain committed response still requires inspection before retry. |

## Rollout and recovery

No schema migration or backfill is needed. Release the catalog helper, fiscal-year writer and inventory reader changes together. Direct scripts that insert accounting periods remain offline tools and must not run concurrently with affected online operations unless they join the same reviewed contract. Future period date/deletion writers need evidence invalidation as well as catalog locking.

Monitor transaction waits, timeouts and conflicts using existing operational facilities. The correctness tradeoff is that fiscal creation waits for active catalog readers, and zero-variance counts wait for in-flight creation. Production latency and lock-duration budgets have not been measured. Do not shorten waits by bypassing source invalidation or approval checks.

On a defect, preserve records and exports, suspend the affected operation through the existing approved process, and repair or restore a compatible implementation. Reverting only one participating side removes the coordination guarantee. Reverting both returns the known new-period discovery race; any potentially affected assessments need genuine reassessment. No feature flag, automatic deployment or safe production rollback is claimed.

## Review responsibilities

Architecture/backend/database: the complete online period-membership writer and count reader now share a transaction boundary before row locks; no migration. Finance/audit: zero variance still changes evidence while leaving financial value unchanged, and exports remain retained. Security/IAM/privacy: existing tenant, permission, fresh-auth and independent-approval checks are preserved. Quality/SRE: actual database blocking, failures and source-bound regressions are required below; arbitrary callers, offline scripts and production contention remain limited. Product/support: the benefit is accurate Close evidence despite calendar/count overlap, with explicit uncertain-outcome recovery.

Frontend/design-system/accessibility/localization are not applicable to new UI: no component or translated copy changed, and no fresh screenshot or complete accessibility claim is made. Statutory/country/payroll policy is not applicable to this correction: no fiscal policy, genuine approval or statutory certification is supplied. Provider/offline/AI/billing/growth changes are not applicable: no provider protocol, offline operation, autonomous authority, subscription or external outreach changes. Their broader original workflow responsibilities remain in the register.

## Verification

All checks completed successfully against stable product source. Heavy commands ran serially through the inspected local wrappers; exact static commands and logs are in their receipts.

| Verification | Result |
|---|---|
| Focused Jest | **338 passed across 11 suites, zero failed/pending.** Inventory count/invalidation/adjustment, catalog/period services, assessment ordering/Close pack/readiness, inventory actions and accounting settings actions. [Receipt](evidence/period-catalog-jest-f333ea31-ca50-4a68-bf37-87988638b900.json). |
| Existing TypeScript | **Passed** `tsc --noEmit --pretty false`. [Receipt](evidence/period-catalog-typecheck-1a5a9298-0f51-4bc4-9c04-5e6af34fa2d6.json). |
| Changed-file lint | **Passed** across eight files. [Receipt](evidence/period-catalog-lint-c92e9fb3-c328-46c6-a0dc-7d28d4859538.json). |
| Actual PostgreSQL | **Seven scenarios passed**, stable source and unchanged outside-fixture/operation financial fingerprints. [Receipt](lanes/environment/period-catalog-runtime-ee99cc13-372b-4c55-ba1d-0e623fbc4688.json). |

The runtime command was bundled Node running `lanes/environment/period-catalog-runtime.cjs --run`. It used the existing `stoquify_local_registration_20260906_01` loopback database with exact target, connected identity and ownership guards. Synthetic tenant setup used real services and independent test actors; posted balanced fixture journals preceded the financial baseline. External fetch was disabled. There was no migration, seed, response substitution or manufactured readiness. Actual new-period assessments reported T3 because they had no posted activity; no T4, customer or statutory certification is inferred.

| Scenario | Actual observation |
|---|---|
| Saved predecessor | The exact saved pre-edit count module, loaded privately with current collaborators, missed the new period/assessment after discovery. Its assessment remained READY/T3 with the old inventory hash and zero invalidation events after count commit. This reproduces the original source-freshness defect. |
| Count first | Period creation PID 16408 waited on count PID 22800. No fiscal-year write occurred while blocked. Creation then committed, and its first assessment used the post-count inventory hash (actual READY/T3). |
| Creation first | Count PID 24204 waited on creator PID 11864 before attempting its posting-period row lock. Its subsequent scope included the newly committed period. A real assessment published before count completion was invalidated once to BLOCKED with stale metadata. |
| Creation failure | A clearly labeled verifier fault after actual fiscal-year and monthly-period writes caused complete observed rollback, including audit state. PID 30532 retried from an independent connection after failed PID 16408; one year, one period and one creation audit remained. |
| Shared readers, tenant independence and no-monthly | Two shared catalog readers completed compatibly; another tenant created periods while the first tenant's shared lock was held. A same-tenant no-monthly request waited (PID 31020 on 9496), then created its year with zero periods. |
| Period close first | Count PID 9348 waited for closer PID 16408, then rejected the now-closed period. The count stayed SUBMITTED and retained exports were unchanged. |
| Count first, period close second | Closer PID 16408 waited for count PID 7348, then rejected closure because the completed count had invalidated current assurance. The period stayed OPEN. |

Draft/certified export contents and hashes were retained; existing certified metadata became stale where required. Count replay produced no duplicate effects. Financial fingerprints remained unchanged after all fixture setup, and outside-fixture records were unchanged. The intentional fault is a successful rollback check, not a failed verifier. All test/typecheck/lint/runtime attempts passed on their first execution. `git diff --check` passed; only existing line-ending normalization warnings appeared.

No UI or route behavior changed, so no browser or build rerun was needed for this service-only correction. Earlier EN/FR/accessibility evidence remains historical. No production latency/throughput budget was tested. Compatible-reader proof exercises the shared catalog helper directly; overlapping counts can still serialize on their later assessment locks. Actual period closure service checks were exercised using explicit synthetic control context, not new browser authentication proof.

The delegated runtime-authoring turn failed before writing a file. The coordinator prepared the local database verifier and obtained independent review before execution. No approval or environment restriction was changed.

Independent review of the completed verifier found no concrete blocker before it ran. The next engineering criterion is a nonempty financial correction through immediate Cash/Close state, reassessment and recovery. Source review identified the unsorted original/reversal period set in `journal-close-invalidation.service.ts`, used after writes by both journal posting reversal and customer-settlement reversal. Both callers need a complete lock-order audit before changing the shared helper; adding locks late would not establish safe ordering. This remains within the existing primary/supporting workflow scope, and no organizational input prevents that work.
