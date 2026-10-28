# Stoquify Agent Runtime Human Intervention Plan

**Generated:** 2026-08-03T12:07:46.635Z<br>
**Status:** `EXTERNAL_AND_HUMAN_INTERVENTION_REQUIRED`<br>
**Safeguards intact:** Yes<br>
**Activation authorized by this plan:** No<br>
**Phase 3 authorized by this plan:** No

## Current Position

- 0/9 intervention groups have sufficient evidence.
- Operational release blockers: 152.
- Credential blockers: 31.
- Phase 2B entry blockers: 21.
- Phase 3 entry blockers: 34.

Repository controls can validate evidence, but they cannot truthfully create real approvals, people, infrastructure events, credential ceremonies, or pilot outcomes.

## 1. Immutable release and protected CI evidence

**Status:** `HUMAN_INTERVENTION_REQUIRED`  
**Accountable owners:** ENGINEERING_RELEASE, QA, PLATFORM  
**Segregation:** The release producer must not be the sole independent CI attester.  
**Downstream gate:** Operational release and Phase 2B entry

### Human actions

- Select the reviewer-approved commit and build from a clean checkout.
- Publish an inactive immutable artifact and bind its digest to the commit.
- Run protected CI and enabled-pilot browser certification against that artifact.
- Expose the signed, query-free CI evidence response through the managed evidence endpoint.

### Accepted evidence

Commit SHA, artifact digest/reference, clean-tree result, CI run/reference, browser-report hash, deployment reference, source authority, attestation digest/timestamp, and invalid-auth rejection.

### Evidence application

Run `npm run agent:ci-release:evidence:apply` only after the real-world action and authoritative evidence exist.

### Subsequent interventions

- Capture through the named authoritative collector or signed decision system.
- Bind to the exact release commit, artifact, manifest/evidence bundle, and environment.
- Reject secrets, synthetic identities, self-approval, stale timestamps, hash mismatch, or changed release identity.
- Rerun this intervention's narrow gate, then operational release, Phase 2B entry, and later Phase 3 entry as applicable.
- Recapture expired evidence; retain the superseded reference in the authoritative audit system.

### Current blockers (29)

- `release:PACKAGE_ID_MISSING`
- `release:RELEASE_VERSION_MISSING`
- `release:DEPLOYMENT_REFERENCE_MISSING`
- `release:ARTIFACT_REFERENCE_MISSING`
- `release:PACKAGE_CERTIFICATION_REFERENCE_MISSING`
- `release:PILOT_ALLOWLIST_REFERENCE_MISSING`
- `release:ROLE_ALLOWLIST_REFERENCE_MISSING`
- `release:COMMIT_SHA_INVALID`
- `release:ARTIFACT_DIGEST_INVALID`
- `release:PACKAGE_CERTIFICATION_HASH_INVALID`
- `release:CI_EVIDENCE_HASH_INVALID`
- `release:MANIFEST_HASH_INVALID`
- `release:EVIDENCE_BUNDLE_HASH_INVALID`
- `release:BROWSER_REPORT_HASH_INVALID`
- `ci:STATUS_NOT_PASSED`
- `ci:SOURCE_TREE_NOT_CLEAN`
- `ci:RUN_REFERENCE_MISSING`
- `ci:BRANCH_REFERENCE_MISSING`
- `ci:ARTIFACT_REFERENCE_MISSING`
- `ci:SOURCE_SYSTEM_REFERENCE_MISSING`
- `ci:ATTESTATION_REFERENCE_MISSING`
- `ci:INVALID_AUTH_EVIDENCE_REFERENCE_MISSING`
- `ci:COMMIT_SHA_INVALID`
- `ci:ARTIFACT_DIGEST_INVALID`
- `ci:BROWSER_REPORT_HASH_INVALID`
- `ci:ATTESTATION_DIGEST_INVALID`
- `ci:EVIDENCE_HASH_INVALID`
- `ci:COMPLETED_AT_INVALID`
- `ci:ATTESTED_AT_INVALID`

## 2. Product/security approval and operational ownership

**Status:** `HUMAN_INTERVENTION_REQUIRED`  
**Accountable owners:** PRODUCT, SECURITY, RELEASE_MANAGER  
**Segregation:** Product and security approvers must be distinct real identities; every responsibility needs a different primary and backup.  
**Downstream gate:** Operational release and enterprise gate 017

### Human actions

- Approve the same frozen commit, artifact, manifest, evidence bundle, and environment.
- Assign primary and backup owners for rollout, rollback, support, pilot, security incident, and on-call backup.
- Have each owner accept the current runbook and coverage window.
- Publish value-free governance evidence from the authoritative directory/workflow system.

### Accepted evidence

Directory identities, approval references and decisions, binding hashes, acceptance timestamps, coverage windows, escalation references, and independent authority attestation.

### Evidence application

Run `npm run agent:governance:evidence:apply` only after the real-world action and authoritative evidence exist.

### Subsequent interventions

- Capture through the named authoritative collector or signed decision system.
- Bind to the exact release commit, artifact, manifest/evidence bundle, and environment.
- Reject secrets, synthetic identities, self-approval, stale timestamps, hash mismatch, or changed release identity.
- Rerun this intervention's narrow gate, then operational release, Phase 2B entry, and later Phase 3 entry as applicable.
- Recapture expired evidence; retain the superseded reference in the authoritative audit system.

### Current blockers (62)

- `governance:SOURCE_SYSTEM_REFERENCE_MISSING`
- `governance:ATTESTATION_REFERENCE_MISSING`
- `governance:INVALID_AUTH_EVIDENCE_REFERENCE_MISSING`
- `governance:ATTESTATION_DIGEST_INVALID`
- `governance:EVIDENCE_HASH_INVALID`
- `governance:ATTESTED_AT_INVALID`
- `governance:PACKAGE_ID_MISSING`
- `governance:RELEASE_VERSION_MISSING`
- `governance:COMMIT_SHA_INVALID`
- `governance:ARTIFACT_DIGEST_INVALID`
- `governance:MANIFEST_HASH_INVALID`
- `governance:EVIDENCE_BUNDLE_HASH_INVALID`
- `approvals:PRODUCT_NOT_APPROVED`
- `approvals:PRODUCT_ACTOR_INVALID`
- `approvals:PRODUCT_REFERENCE_MISSING`
- `approvals:PRODUCT_WINDOW_INVALID`
- `approvals:PRODUCT_MANIFEST_HASH_INVALID`
- `approvals:PRODUCT_ARTIFACT_DIGEST_INVALID`
- `approvals:PRODUCT_EVIDENCE_BUNDLE_HASH_INVALID`
- `approvals:SECURITY_NOT_APPROVED`
- `approvals:SECURITY_ACTOR_INVALID`
- `approvals:SECURITY_REFERENCE_MISSING`
- `approvals:SECURITY_WINDOW_INVALID`
- `approvals:SECURITY_MANIFEST_HASH_INVALID`
- `approvals:SECURITY_ARTIFACT_DIGEST_INVALID`
- `approvals:SECURITY_EVIDENCE_BUNDLE_HASH_INVALID`
- `owners:ROLLOUT_PRIMARY_INVALID`
- `owners:ROLLOUT_BACKUP_INVALID`
- `owners:ROLLOUT_RUNBOOK_MISSING`
- `owners:ROLLOUT_ESCALATION_REFERENCE_MISSING`
- `owners:ROLLOUT_ACCEPTED_AT_INVALID`
- `owners:ROLLOUT_WINDOW_INVALID`
- `owners:ROLLBACK_PRIMARY_INVALID`
- `owners:ROLLBACK_BACKUP_INVALID`
- `owners:ROLLBACK_RUNBOOK_MISSING`
- `owners:ROLLBACK_ESCALATION_REFERENCE_MISSING`
- `owners:ROLLBACK_ACCEPTED_AT_INVALID`
- `owners:ROLLBACK_WINDOW_INVALID`
- `owners:SUPPORT_PRIMARY_INVALID`
- `owners:SUPPORT_BACKUP_INVALID`
- `owners:SUPPORT_RUNBOOK_MISSING`
- `owners:SUPPORT_ESCALATION_REFERENCE_MISSING`
- `owners:SUPPORT_ACCEPTED_AT_INVALID`
- `owners:SUPPORT_WINDOW_INVALID`
- `owners:PILOT_PRIMARY_INVALID`
- `owners:PILOT_BACKUP_INVALID`
- `owners:PILOT_RUNBOOK_MISSING`
- `owners:PILOT_ESCALATION_REFERENCE_MISSING`
- `owners:PILOT_ACCEPTED_AT_INVALID`
- `owners:PILOT_WINDOW_INVALID`
- `owners:SECURITY_INCIDENT_PRIMARY_INVALID`
- `owners:SECURITY_INCIDENT_BACKUP_INVALID`
- `owners:SECURITY_INCIDENT_RUNBOOK_MISSING`
- `owners:SECURITY_INCIDENT_ESCALATION_REFERENCE_MISSING`
- `owners:SECURITY_INCIDENT_ACCEPTED_AT_INVALID`
- `owners:SECURITY_INCIDENT_WINDOW_INVALID`
- `owners:ON_CALL_BACKUP_PRIMARY_INVALID`
- `owners:ON_CALL_BACKUP_BACKUP_INVALID`
- `owners:ON_CALL_BACKUP_RUNBOOK_MISSING`
- `owners:ON_CALL_BACKUP_ESCALATION_REFERENCE_MISSING`
- `owners:ON_CALL_BACKUP_ACCEPTED_AT_INVALID`
- `owners:ON_CALL_BACKUP_WINDOW_INVALID`

## 3. Managed scheduler and inactive reconciler deployment

**Status:** `HUMAN_INTERVENTION_REQUIRED`  
**Accountable owners:** PLATFORM, SRE, SECURITY  
**Segregation:** The deployment owner supplies infrastructure proof; security independently approves workload identity and secret scope.  
**Downstream gate:** Operational release

### Human actions

- Deploy the inactive reconciler workload at the approved commit and artifact.
- Create a five-minute managed schedule with bounded timeout and single-concurrency or lease protection.
- Attach managed workload identity, readiness, missing-configuration, and failure-alert checks.
- Expose a query-free HTTPS deployment evidence endpoint with invalid-auth rejection.

### Accepted evidence

Provider schedule, workload and managed-secret references, concurrency proof, deployed commit/artifact, deployment attestation, readiness, failure-alert, and invalid-auth evidence.

### Evidence application

Run `npm run agent:scheduler:evidence:apply` only after the real-world action and authoritative evidence exist.

### Subsequent interventions

- Capture through the named authoritative collector or signed decision system.
- Bind to the exact release commit, artifact, manifest/evidence bundle, and environment.
- Reject secrets, synthetic identities, self-approval, stale timestamps, hash mismatch, or changed release identity.
- Rerun this intervention's narrow gate, then operational release, Phase 2B entry, and later Phase 3 entry as applicable.
- Recapture expired evidence; retain the superseded reference in the authoritative audit system.

### Current blockers (39)

- `scheduler:PROVIDER_MISSING`
- `scheduler:SCHEDULE_REFERENCE_MISSING`
- `scheduler:WORKLOAD_REFERENCE_MISSING`
- `scheduler:MANAGED_CREDENTIAL_REFERENCE_MISSING`
- `scheduler:CONCURRENCY_EVIDENCE_REFERENCE_MISSING`
- `scheduler:READINESS_EVIDENCE_REFERENCE_MISSING`
- `scheduler:INVALID_AUTH_EVIDENCE_REFERENCE_MISSING`
- `scheduler:MISSING_CONFIG_EVIDENCE_REFERENCE_MISSING`
- `scheduler:FAILURE_ALERT_REFERENCE_MISSING`
- `scheduler:DEPLOYMENT_SOURCE_SYSTEM_REFERENCE_MISSING`
- `scheduler:DEPLOYMENT_ATTESTATION_REFERENCE_MISSING`
- `scheduler:DEPLOYMENT_AUTHORITY_INVALID_AUTH_EVIDENCE_REFERENCE_MISSING`
- `scheduler:READINESS_EVIDENCE_HASH_INVALID`
- `scheduler:DEPLOYMENT_ATTESTATION_DIGEST_INVALID`
- `scheduler:DEPLOYMENT_EVIDENCE_HASH_INVALID`
- `scheduler:AUTH_TYPE_INVALID`
- `scheduler:DEPLOYED_COMMIT_SHA_INVALID`
- `scheduler:DEPLOYED_ARTIFACT_DIGEST_INVALID`
- `scheduler:DEPLOYED_AT_INVALID`
- `scheduler:DEPLOYMENT_ATTESTED_AT_INVALID`
- `scheduler:READINESS_NOT_HEALTHY`
- `scheduler:READINESS_CHECKED_AT_INVALID`
- `scheduler:HEARTBEAT_NOT_FRESH`
- `scheduler:WINDOW_1_RUN_ID_MISSING`
- `scheduler:WINDOW_1_EVIDENCE_REFERENCE_MISSING`
- `scheduler:WINDOW_1_NOT_COMPLETED`
- `scheduler:WINDOW_1_SCHEDULED_AT_INVALID`
- `scheduler:WINDOW_1_COMPLETED_AT_INVALID`
- `scheduler:WINDOW_2_RUN_ID_MISSING`
- `scheduler:WINDOW_2_EVIDENCE_REFERENCE_MISSING`
- `scheduler:WINDOW_2_NOT_COMPLETED`
- `scheduler:WINDOW_2_SCHEDULED_AT_INVALID`
- `scheduler:WINDOW_2_COMPLETED_AT_INVALID`
- `scheduler:WINDOW_3_RUN_ID_MISSING`
- `scheduler:WINDOW_3_EVIDENCE_REFERENCE_MISSING`
- `scheduler:WINDOW_3_NOT_COMPLETED`
- `scheduler:WINDOW_3_SCHEDULED_AT_INVALID`
- `scheduler:WINDOW_3_COMPLETED_AT_INVALID`
- `scheduler:THREE_SUCCESS_WINDOWS_MISSING`

## 4. Three consecutive reconciliation windows

**Status:** `HUMAN_INTERVENTION_REQUIRED`  
**Accountable owners:** SRE, RECONCILIATION_OWNER  
**Segregation:** The operator runs the workload; the reconciliation owner reviews the resulting evidence.  
**Downstream gate:** Operational release

### Human actions

- Observe at least three unique consecutive five-minute production-like windows.
- Confirm successful completion, fresh readiness and heartbeat, lease/concurrency safety, and invalid-auth rejection.
- Publish only value-free run and evidence references.

### Accepted evidence

Unique run IDs, schedule/completion timestamps, completed status, evidence references, readiness hash, heartbeat validity, and invalid-auth proof.

### Evidence application

Run `npm run agent:reconciler:evidence:apply` only after the real-world action and authoritative evidence exist.

### Subsequent interventions

- Capture through the named authoritative collector or signed decision system.
- Bind to the exact release commit, artifact, manifest/evidence bundle, and environment.
- Reject secrets, synthetic identities, self-approval, stale timestamps, hash mismatch, or changed release identity.
- Rerun this intervention's narrow gate, then operational release, Phase 2B entry, and later Phase 3 entry as applicable.
- Recapture expired evidence; retain the superseded reference in the authoritative audit system.

### Current blockers (20)

- `scheduler:READINESS_EVIDENCE_REFERENCE_MISSING`
- `scheduler:READINESS_EVIDENCE_HASH_INVALID`
- `scheduler:READINESS_NOT_HEALTHY`
- `scheduler:READINESS_CHECKED_AT_INVALID`
- `scheduler:HEARTBEAT_NOT_FRESH`
- `scheduler:WINDOW_1_RUN_ID_MISSING`
- `scheduler:WINDOW_1_EVIDENCE_REFERENCE_MISSING`
- `scheduler:WINDOW_1_NOT_COMPLETED`
- `scheduler:WINDOW_1_SCHEDULED_AT_INVALID`
- `scheduler:WINDOW_1_COMPLETED_AT_INVALID`
- `scheduler:WINDOW_2_RUN_ID_MISSING`
- `scheduler:WINDOW_2_EVIDENCE_REFERENCE_MISSING`
- `scheduler:WINDOW_2_NOT_COMPLETED`
- `scheduler:WINDOW_2_SCHEDULED_AT_INVALID`
- `scheduler:WINDOW_2_COMPLETED_AT_INVALID`
- `scheduler:WINDOW_3_RUN_ID_MISSING`
- `scheduler:WINDOW_3_EVIDENCE_REFERENCE_MISSING`
- `scheduler:WINDOW_3_NOT_COMPLETED`
- `scheduler:WINDOW_3_SCHEDULED_AT_INVALID`
- `scheduler:WINDOW_3_COMPLETED_AT_INVALID`

## 5. Production-like alert lifecycle

**Status:** `HUMAN_INTERVENTION_REQUIRED`  
**Accountable owners:** SRE, SECURITY_INCIDENT, ON_CALL_BACKUP  
**Segregation:** The primary incident owner acknowledges; the named backup receives the independently tested escalation.  
**Downstream gate:** Operational release

### Human actions

- Trigger a controlled failure through the real HTTPS alert transport.
- Acknowledge within the declared SLO and prove retry, dead-letter, recovery, and escalation.
- Rotate the alert secret and prove old-version rejection.

### Accepted evidence

Transport and managed-secret references, delivery/request identity, acknowledgement identity/timestamp, retry, dead-letter, recovery, escalation, and rotation references.

### Evidence application

Run `npm run agent:alert:evidence:apply` only after the real-world action and authoritative evidence exist.

### Subsequent interventions

- Capture through the named authoritative collector or signed decision system.
- Bind to the exact release commit, artifact, manifest/evidence bundle, and environment.
- Reject secrets, synthetic identities, self-approval, stale timestamps, hash mismatch, or changed release identity.
- Rerun this intervention's narrow gate, then operational release, Phase 2B entry, and later Phase 3 entry as applicable.
- Recapture expired evidence; retain the superseded reference in the authoritative audit system.

### Current blockers (17)

- `alerting:TRANSPORT_NOT_HEALTHY`
- `alerting:EVIDENCE_HASH_INVALID`
- `alerting:TRANSPORT_REFERENCE_MISSING`
- `alerting:MANAGED_SECRET_REFERENCE_MISSING`
- `alerting:HTTPS_DELIVERY_REFERENCE_MISSING`
- `alerting:EXTERNAL_REQUEST_REFERENCE_MISSING`
- `alerting:ACKNOWLEDGEMENT_REFERENCE_MISSING`
- `alerting:RETRY_EVIDENCE_REFERENCE_MISSING`
- `alerting:DEAD_LETTER_EVIDENCE_REFERENCE_MISSING`
- `alerting:RECOVERY_EVIDENCE_REFERENCE_MISSING`
- `alerting:ESCALATION_EVIDENCE_REFERENCE_MISSING`
- `alerting:SECRET_ROTATION_EVIDENCE_REFERENCE_MISSING`
- `alerting:DELIVERED_AT_INVALID`
- `alerting:ACKNOWLEDGED_AT_INVALID`
- `alerting:ESCALATION_TESTED_AT_INVALID`
- `alerting:ACKNOWLEDGER_IDENTITY_INVALID`
- `alerting:ESCALATION_IDENTITY_INVALID`

## 6. Credential classification, rotation, and revocation

**Status:** `HUMAN_INTERVENTION_REQUIRED`  
**Accountable owners:** SECURITY, PLATFORM, WORKLOAD_OWNERS  
**Segregation:** A real security owner approves the ceremony; workload owners verify restart and new-version behavior.  
**Downstream gate:** Operational release and Phase 2B entry

### Human actions

- Classify all 15 credential classes as rotated/revoked, test-only, or confirmed absent.
- For present credentials, rotate in the managed secret store, restart dependants, verify the new version, revoke the old version, and prove rejection.
- Publish a release-bound security attestation without credential values.

### Accepted evidence

Disposition, secret-manager reference, owner identity, ordered rotation/restart/verification/revocation timestamps, evidence reference, security approval, and authority attestation.

### Evidence application

Run `npm run agent:credential-rotation:evidence:apply && npm run agent:credential-rotation:gate` only after the real-world action and authoritative evidence exist.

### Subsequent interventions

- Capture through the named authoritative collector or signed decision system.
- Bind to the exact release commit, artifact, manifest/evidence bundle, and environment.
- Reject secrets, synthetic identities, self-approval, stale timestamps, hash mismatch, or changed release identity.
- Rerun this intervention's narrow gate, then operational release, Phase 2B entry, and later Phase 3 entry as applicable.
- Recapture expired evidence; retain the superseded reference in the authoritative audit system.

### Current blockers (31)

- `authority:ENVIRONMENT_MISSING`
- `authority:SOURCE_SYSTEM_REFERENCE_MISSING`
- `authority:ATTESTATION_REFERENCE_MISSING`
- `authority:ATTESTATION_DIGEST_MISSING`
- `authority:ATTESTED_AT_MISSING`
- `authority:EVIDENCE_SHA256_MISSING`
- `authority:INVALID_AUTH_EVIDENCE_REFERENCE_MISSING`
- `authority:ATTESTED_AT_INVALID_OR_STALE`
- `releaseBinding:ENVIRONMENT_MISSING`
- `releaseBinding:PACKAGE_ID_MISSING`
- `releaseBinding:RELEASE_VERSION_MISSING`
- `releaseBinding:COMMIT_SHA_MISSING`
- `releaseBinding:ARTIFACT_DIGEST_MISSING`
- `releaseBinding:DEPLOYMENT_REFERENCE_MISSING`
- `primary-database-credential:SECURITY_CLASSIFICATION_UNRESOLVED`
- `payroll-immutability-database-credential:SECURITY_CLASSIFICATION_UNRESOLVED`
- `application-auth-signing-secret:SECURITY_CLASSIFICATION_UNRESOLVED`
- `legacy-nextauth-signing-secret:SECURITY_CLASSIFICATION_UNRESOLVED`
- `google-oauth-client-secret:SECURITY_CLASSIFICATION_UNRESOLVED`
- `email-server-credential:SECURITY_CLASSIFICATION_UNRESOLVED`
- `redis-connection-credential:SECURITY_CLASSIFICATION_UNRESOLVED`
- `public-identity-hmac-secret:SECURITY_CLASSIFICATION_UNRESOLVED`
- `public-receipt-signing-secret:SECURITY_CLASSIFICATION_UNRESOLVED`
- `history-cursor-signing-secret:SECURITY_CLASSIFICATION_UNRESOLVED`
- `payroll-destination-hmac-secret:SECURITY_CLASSIFICATION_UNRESOLVED`
- `upload-provider-secret:SECURITY_CLASSIFICATION_UNRESOLVED`
- `error-monitoring-dsn:SECURITY_CLASSIFICATION_UNRESOLVED`
- `agent-reconciler-credential:SECURITY_CLASSIFICATION_UNRESOLVED`
- `workflow-assurance-webhook-secret:SECURITY_CLASSIFICATION_UNRESOLVED`
- `register:SECURITY_OWNER_MISSING`
- `register:SECURITY_APPROVAL_REFERENCE_MISSING`

## 7. Statutory authority and global release preflight

**Status:** `HUMAN_INTERVENTION_REQUIRED`  
**Accountable owners:** OHADA_DOMAIN_REVIEWER, DATABASE_OWNER, SECURITY, RELEASE_MANAGER  
**Segregation:** Qualified statutory approval must be independent of the code author; production target and secret readiness require their designated owners.  
**Downstream gate:** Phase 2B entry and enterprise gate 017

### Human actions

- Verify the statutory source artifact hash and obtain qualified expert approval.
- Provision the non-local migration target and production-purpose secret references.
- Resolve the global release evidence index without replacing external proof with local fixtures.

### Accepted evidence

Verified source hash, signed expert approval, migration target evidence, managed-secret preflight, and release evidence index with zero blockers.

### Evidence application

Run `npm run statutory:country-pack:gate && npm run prisma:migration:release:preflight && npm run release:secrets:preflight:release && npm run release:evidence:gate:release` only after the real-world action and authoritative evidence exist.

### Subsequent interventions

- Capture through the named authoritative collector or signed decision system.
- Bind to the exact release commit, artifact, manifest/evidence bundle, and environment.
- Reject secrets, synthetic identities, self-approval, stale timestamps, hash mismatch, or changed release identity.
- Rerun this intervention's narrow gate, then operational release, Phase 2B entry, and later Phase 3 entry as applicable.
- Recapture expired evidence; retain the superseded reference in the authoritative audit system.

### Current blockers (4)

- `GLOBAL_RELEASE_READY`
- `PRODUCTION_SECRETS_READY`
- `MIGRATION_TARGET_READY`
- `STATUTORY_AUTHORITY_READY`

## 8. Independent enterprise release decision

**Status:** `HUMAN_INTERVENTION_REQUIRED`  
**Accountable owners:** ENTERPRISE_RELEASE_AUTHORITY  
**Segregation:** The reviewing authority must be independent from agent execution and cannot waive missing critical evidence silently.  
**Downstream gate:** Phase 2B activation review

### Human actions

- Review one immutable evidence bundle after all narrow gates pass.
- Record APPROVED_GO or REJECTED_NO_GO with release binding, conditions, and expiry.
- Keep activation as a separate protected ceremony.

### Accepted evidence

Signed release-bound gate-017 decision, reviewer identity, timestamp, conditions, and immutable evidence-bundle reference.

### Evidence application

Run `Rerun 017-aqstoqflow-enterprise-release-gate` only after the real-world action and authoritative evidence exist.

### Subsequent interventions

- Capture through the named authoritative collector or signed decision system.
- Bind to the exact release commit, artifact, manifest/evidence bundle, and environment.
- Reject secrets, synthetic identities, self-approval, stale timestamps, hash mismatch, or changed release identity.
- Rerun this intervention's narrow gate, then operational release, Phase 2B entry, and later Phase 3 entry as applicable.
- Recapture expired evidence; retain the superseded reference in the authoritative audit system.

### Current blockers (1)

- `ENTERPRISE_GATE_017_GO`

## 9. Controlled Phase 2B pilot and exit certification

**Status:** `HUMAN_INTERVENTION_REQUIRED`  
**Accountable owners:** PILOT, PRODUCT, SECURITY, FINANCE_DOMAIN, RELEASE  
**Segregation:** Activation needs separate authorization; the four exit approvers must be distinct identities.  
**Downstream gate:** Phase 3 read-and-draft eligibility

### Human actions

- After gate-017 GO, conduct the protected activation ceremony for allowlisted tenants and roles only.
- Observe a bounded pilot with monitoring, support, rollback exercise, and incident handling.
- Record safety counters and obtain four distinct pilot-exit approvals.

### Accepted evidence

Activation decision, hashed tenant/role scopes, observation window, run counts, zero prohibited authority/tenant/secret violations, operations evidence, incidents, and four approvals.

### Evidence application

Run `npm run agent:phase3:entry:report` only after the real-world action and authoritative evidence exist.

### Subsequent interventions

- Capture through the named authoritative collector or signed decision system.
- Bind to the exact release commit, artifact, manifest/evidence bundle, and environment.
- Reject secrets, synthetic identities, self-approval, stale timestamps, hash mismatch, or changed release identity.
- Rerun this intervention's narrow gate, then operational release, Phase 2B entry, and later Phase 3 entry as applicable.
- Recapture expired evidence; retain the superseded reference in the authoritative audit system.

### Current blockers (34)

- `AUTHORIZED_SCOPE_COMPLETE`
- `FROZEN_COMMIT_VERIFIED`
- `CLEAN_RELEASE_READY`
- `GLOBAL_RELEASE_READY`
- `PRODUCTION_SECRETS_READY`
- `MIGRATION_TARGET_READY`
- `STATUTORY_AUTHORITY_READY`
- `CREDENTIAL_ROTATION_READY`
- `OPERATIONAL_RELEASE_READY`
- `PROMOTION_POINT_1_REVIEW_ACCEPTED`
- `PROMOTION_POINT_2_COMPLETED`
- `PROMOTION_POINT_3_COMPLETED`
- `PROMOTION_POINT_4_COMPLETED`
- `PROMOTION_POINT_5_COMPLETED`
- `PROMOTION_POINT_6_COMPLETED`
- `PROMOTION_POINT_7_COMPLETED`
- `PROMOTION_POINT_8_COMPLETED`
- `PROMOTION_POINT_9_COMPLETED`
- `PROMOTION_POINT_10_COMPLETED`
- `PROMOTION_POINT_11_APPROVED_GO`
- `ENTERPRISE_GATE_017_GO`
- `PILOT_EXIT_STATUS_READY`
- `PILOT_RELEASE_BINDING`
- `PILOT_SCOPE_AND_ACTIVATION_EVIDENCE`
- `PILOT_OBSERVATION_COMPLETE`
- `PILOT_SAFETY_CLEAN`
- `PILOT_OPERATIONS_EVIDENCE`
- `PILOT_INCIDENTS_CLEAN`
- `PILOT_EXIT_APPROVALS`
- `PILOT_APPROVER_SEGREGATION`
- `PILOT_PHASE3_RECOMMENDATION`
- `PHASE2B_PILOT_COMPLETED`
- `PHASE3_GO_APPROVED`
- `PHASE3_AUTHORITY_RECORDED`

## Gate-Lifting Sequence

1. Capture immutable release and CI evidence.
2. Capture governance approvals and six-role owner coverage.
3. Capture scheduler deployment, three reconciler windows, and the alert lifecycle.
4. Complete credential rotation and statutory/release preflights.
5. Run `npm run agent:credential-rotation:gate` and `npm run agent:operational-release:gate`.
6. Run `npm run agent:phase2b:entry:gate`, then obtain an independent gate-017 decision.
7. Conduct a separately authorized Phase 2B pilot.
8. Capture pilot exit evidence and run `npm run agent:phase3:entry:gate`.

At every stage, activation and Phase 3 authority remain separate human decisions.
