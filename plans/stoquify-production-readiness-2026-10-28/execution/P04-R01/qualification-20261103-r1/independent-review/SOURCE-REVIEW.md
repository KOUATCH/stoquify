# P04-R01 independent source review

3 November 2026. No remaining blocking defect identified in the bounded implementation reviewed against the preserved pre-repair bytes. `SOURCE-REVIEW.json` binds the exact 17 product files reviewed. Execution outcomes and source stability during qualification remain separate acceptance requirements.

The new shared operating grant policy reuses the actual scope resolver, recognizes persisted wildcard only, and requires effective `dashboard.read` authority. Existing explicit permission-grant controls still apply. Role creation and permission additions check latent reserved-code authority; shared-role edits also evaluate affected recipients' combined roles. Member assignment and reactivation enforce the same ceiling from locked current actor data. Metadata-only edits and authorized reductions remain permitted.

Role replay records whether tenant operating authority was granted; member replay uses its original role set and a role-code-bound revision. Access-request preview and decision check the same combined ceiling, and application—including already-applied replay—composes the locked member grant service. Role editing, member removal and deactivation preserve a usable tenant-wide custodian when one existed. These changes address the recovery/replay issues raised during review.

Invitation issuance, replacement, review, cancellation, delivery and redemption now project current role codes. Issuance records actor/target codes from stored authority. Delivery and both redemption checks reject code drift; the locked redemption path reads actor role codes and memberships under its existing locks. Historical reserved-role receipts cannot acquire inferred authority from the issuer's current status. Historical ordinary-role receipts remain compatible under their existing checks. The change does not enable a provider adapter or alter email rendering.

The reviewed delta preserves existing organization/account/session/freshness guards and current transaction boundaries. No production role rewrite, schema change or broad permission-policy replacement is introduced. Fresh-organization bootstrap remains a separately inventoried authority boundary.

Qualification must still demonstrate legitimate positives, denied business-state preservation, expired/revoked/changed authority, replay, rollback and contention on the hash-bound source. Native tests that stub Better Auth transport and Next request context must not be reported as actual cookie, HTTP-routing or rendered browser proof. This review does not advance parent P04 or production readiness.

## Local advancement interpretation

The R01 register requires current native transaction/concurrency and actual action/HTTP negatives. Its actual production action exports can be qualified through native composition with real RBAC, persisted fresh-session checks and database transactions, while explicitly stubbing transport. The original P04 result separately assigns signed-cookie transport and private browser restoration to P04-V02, and compiled/admitted surface qualification to P04-V01. Therefore passing, source-bound native action evidence can close the bounded implementation repair as `verified_local_native_actions`; it cannot close P04-V01, P04-V02, parent P04 or any production gate. This is the reviewer's reading of the existing package boundaries, not a claim that HTTP was executed or a waiver of those later gates.

Production reserved-role and pending-invitation inventory remains necessary before separately authorized data remediation or release cutover. The current repair performs no production census, rewrite or automatic reissue.
