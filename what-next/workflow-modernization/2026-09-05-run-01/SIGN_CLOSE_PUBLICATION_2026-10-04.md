# Reconciliation signing and Close publication

2026-10-04; branch `codex/migration-control-plane-release-2026-08-29`, HEAD `62a56036a5ac9b37236a20c9b148052199069479`. Shared changes preserved. Primary FA-CASH-COMMAND and supporting FA-CLOSE-PACK remain In progress. The [bounded checklist](SIGN_CLOSE_PUBLICATION_CHECKLIST_2026-10-04.md) retains the original full-workflow scope.

## Demonstrated defects and correction

Two actual database reproductions exposed stale-source evidence. A Serializable signing transaction whose snapshot preceded assessment publication could miss the newly committed RUNNING Close record. Separately, signing invalidated only overlapping periods although Close's payment dashboard reads reconciliation across the organization. A prior-year assessment therefore retained unsigned evidence without a stale marker after the actual signature committed. Both predecessor assessments ultimately reported BLOCKED for other prerequisites: this reproduction proves missing invalidation/source truth, not a falsely successful certification in those two fixtures.

The correction adds 34 lines to [payment-reconciliation-certification.service.ts](../../../services/reconciliation/payment-reconciliation-certification.service.ts). It reuses the existing catalog and ordered-period helpers, retains Serializable isolation, locks the complete tenant-period set before signing, compares snapshot membership with current committed membership, and retries the entire transaction at most three times when that membership changed. The invalidation call receives the same complete set. Authentication age is rechecked after waits. Continuous change returns a conflict; it never continues inside an obsolete snapshot.

The existing helpers are named for journal reversal but already support non-journal source corrections and organization-wide collectors. Reusing them avoids another lock protocol. Signing still requires current service admission, independent signer, reviewed source/evidence revisions and the existing atomic signature/audit/event/outbox transition. No financial posting, module policy, statutory rule, UI, schema or export format changed. The rejected all-period **manual-posting** proposal remains unapplied; this correction addresses the separately reproduced signing defects.

The tradeoff is contention across a tenant's periods during signing, consistent with the current organization-wide collector. Reducing that scope would require a separately designed change to what Close consumes. Serializable freshness comparison uses a separate available database connection. This checkpoint does not establish production pool capacity or latency budgets.

## Verification

| Evidence | Result |
|---|---|
| [Predecessor reproduction](lanes/environment/sign-close-baseline-8acec900-20b0-469c-ae5a-0229498ad150.json) | Both defects reproduced; source and observed outside-fixture fingerprints unchanged; terminal exit 0 means successful defect reproduction. Exact predecessor service/test/fixture copies are retained in `evidence/sign-close-before-20261004-a/`. |
| [Focused regression](evidence/sign-close-jest-817b5f97-59ee-4f46-b491-aab6e266958d.json) | 164 tests across six suites passed, none skipped. Includes existing certificate/retained-signature controls, sorted periods/catalog guards, freshness-read failure, signing scope, stale catalog/publication restart, bounded churn and authentication expiry during waits. |
| [TypeScript](evidence/sign-close-typecheck-d8fde2a3-c743-4a27-a622-59be4449b4fa.json), [changed-file lint](evidence/sign-close-lint-c5294e09-9302-4649-8666-eae4695484f2.json) | Existing no-emit typecheck and two-file lint passed. |
| [Owned PostgreSQL acceptance](lanes/environment/sign-close-acceptance-c5f4d73e-0312-4fea-b1ac-38f1b17e9be6.json) | All five cases passed; terminal exit 0; 238 before/after source bindings stable; outside-fixture and case financial fingerprints unchanged. |
| [Existing service-boundary fail gate](evidence/sign-close-boundary-631fe8fa-33a8-4684-907a-728bc5c60ae6.json) | Failed with one existing medium `PRISMA_CLIENT_BOUNDARY_COUPLING` finding at `app/[locale]/(dashboard)/dashboard/accounting/journals/page.tsx:2`, plus 17 allowed findings. That file was not changed here. All scanned-source hashes remained stable. This is not a passing whole-repository gate. |

The five database cases establish:

1. **Old snapshot/new publication:** the actual signer restarts once, invalidates the in-flight assessment, and its delayed finalizer discards obsolete collected rows. Fresh assessment retains the committed signature hash.
2. **Non-overlapping prior year:** a 2025 assessment consuming the 2026 reconciliation is invalidated. Fresh assessment records the actual signed certificate, proving the organization-wide scope requirement.
3. **Creator first:** PostgreSQL observes waiter 13532 blocked by holder 23356. The committed RUNNING assessment becomes BLOCKED/EVIDENCE_STALE and cannot be overwritten by its collectors.
4. **Signer first:** waiter 26988 is blocked by holder 7640. The later assessment records the committed signature without a false stale marker.
5. **Late failure and retained certification:** an injected failure after the actual signature, signed event/outbox and Close invalidation rolls back every observed source/financial/audit/event/Close/export row. A new transaction succeeds; exact replay has no effects. Earlier genuine certified export bytes, hashes and history survive and receive truthful stale metadata after success.

Passing receipt SHA-256: `83ca49cc8ad39330143da7f6ecad09e5a92c6e851e0c1c339fc657cfd2ba3eaa`. Service SHA-256: `ab85c645d11a78d6ae6882ef2a74382dde88417c0f5f60dd8a02d36f34f67140`; test SHA-256: `3bc52dce4bd8f8412340ee40550c85a05f04764acbc9992d89425feb6dca0a0e`. All fixture prerequisites are synthetic and scoped to the owned loopback database. Actual service calls create signatures and assessments; none is a live bank/payment or professional approval.

Fresh assessments **remain BLOCKED**, despite correct signature evidence. Read-only inspection of the final recovery identified the genuine HIGH finding **Provider statement evidence is missing** ([inspection](lanes/environment/sign-close-evidence-inspection-3f4e3f28-8295-419a-a37e-18da1808a3aa.json)). This milestone verifies invalidation and source recovery, not full readiness or a new certified Close result. The earlier certified artifact in the rollback case was created through actual assessment/export before the new synthetic reconciliation source was introduced.

## Failed verification attempts retained

- [84daa58f](lanes/environment/sign-close-acceptance-84daa58f-7564-4947-a15d-a33673ddd529.json): three checks failed because the copied verifier expected evidence rows after an in-flight assessment had been invalidated. The existing finalizer intentionally persists none in this state. Two checks passed. The corrected verifier requires zero obsolete rows and fresh reassessment.
- [82b9833b](lanes/environment/sign-close-acceptance-82b9833b-98e9-4a9d-b3e1-dda9559aa4bf.json): two checks selected an AUDIT_LOG reference using a broad `findFirst` instead of the separate RECONCILIATION_CERTIFICATE row. Read-only database inspection showed the correct hash alongside null-hash audit references. The query now requires evidence type and source table. Three checks passed. Product code was unchanged between these attempts.

Both failed receipts have stable source and outside-fixture fingerprints and terminal exit 1. Exact verifier copies are retained. These corrections strengthen identification of the intended evidence; they do not waive a readiness or financial control.

## Operating and recovery guidance

After a source change, keep the prior export as historical evidence and rerun assessment. Review the current signed reconciliation certificate and any remaining provider-statement requirement through their owning workflows. Do not overwrite old evidence or set a run to READY. If concurrent changes exhaust signing retries, refresh the signing review and deliberately retry; an expired authentication window requires renewed authentication. A lost signing response can be retried through the existing exact-signature recovery contract without generating a second signature/event.

No migration or deployment is required by this code change. Rollout still needs the normal authorized release process and representative tenant/pool contention checks. Do not revert only the invalidation set while leaving broader collector semantics unchanged; that would restore the demonstrated prior-period defect. The pre-change snapshot exists for diagnosis, not as a recommendation to deploy the vulnerable behavior.

Architecture, backend, database, security/control, finance, audit and SRE reviews are addressed by the exact scope, ordering, rollback, hashes and limitations above. Wider persisted-session/role races remain separate work; this patch does not certify all authority paths. UI/localization/accessibility: unchanged, so no new browser or accessibility claim. Pricing, analytics, AI and new country calculation: not applicable to this boundary. Existing country-treatment warnings and statutory/expert prerequisites remain.

The selected `aqstoqflow-close-invalidation-completion` skill's aggregate `policy:gates` command was inspected and not executed: it includes runtime/PostgreSQL and release checks requiring their own target/evidence controls. Relevant focused checks ran; no full release-gate claim is made. Prior notification delivery and purchase-recovery evidence remain scoped historical results; new source hashes do not silently recertify every old receipt. PR-10's original signature/delivery behavior is retained; this completed boundary belongs to the still-open Cash/Close producer scope.

Next: trace and verify **reconciliation run creation/refresh → retained Close invalidation**, including non-overlapping periods and new publication. Those producers feed the same organization-wide collector, but the signing correction does not cover their transitions. Preserve the bank/statement evidence requirement, manual-posting approval dependency, other producers, native accessibility, production performance and all remaining workflow families.
