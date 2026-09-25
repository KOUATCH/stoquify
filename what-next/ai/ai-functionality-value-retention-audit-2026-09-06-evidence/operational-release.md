# Stoquify Agent Runtime Operational Release Evidence

**Register:** `stoquify-agent-runtime-operational-release-2026-07-25`  
**Gate status:** `BLOCKED`  
**Current blockers:** 152  
**Independent release review ready:** No  
**Activation authorized:** No  
**Secret or credential values retained:** No

This register binds repository, governance, scheduler, alerting, and credential-rotation evidence for independent review. A passing result does not activate an agent package and does not replace the enterprise release decision.

## Bound Release

| Field | Value |
|---|---|
| Environment | `INTERNAL_PILOT` |
| Package | `unresolved` |
| Release version | `unresolved` |
| Package state | `PILOT_CERTIFIED` |
| Commit | `unresolved` |
| Artifact digest | `unresolved` |
| Manifest hash | `unresolved` |

## Evidence Summary

| Control | Result |
|---|---|
| Real owner responsibilities present | 6/6 |
| Consecutive completed scheduler windows supplied | 0 |
| Credential-rotation gate | `BLOCKED` |
| Governance capture | Bound to authoritative attestation and frozen release or blocked below |
| Product and security approvals | Bound to release identity or blocked below |
| Alert delivery, acknowledgement, escalation, and recovery | Bound to named owners or blocked below |

## Completion Procedure

1. Freeze a clean reviewed commit, certified inactive package, immutable artifact, deployment, and browser report; then run `npm run agent:ci-release:evidence:apply` to capture the release and CI attestation.
2. Bind the release package, manifest, evidence bundle, deployment, pilot-tenant allowlist, and role allowlist to the same commit and artifact.
3. Expose an authoritative identity/governance attestation bound to the frozen release, then run `npm run agent:governance:evidence:apply` to capture real approvals and owner coverage without using local E2E records.
4. Record real primary and backup identities, accepted runbook version, current coverage, and escalation reference for all six owner responsibilities.
5. Deploy the five-minute reconciler with managed authentication, bounded timeout, and concurrency control; then run `npm run agent:scheduler:evidence:apply` to capture independent control-plane deployment, missing-configuration, and failure-alert proof.
6. Observe three consecutive completed windows, then run `npm run agent:reconciler:evidence:apply` to capture hash-bound readiness, heartbeat, window, and invalid-auth proof.
7. Prove HTTPS alert delivery, external request identity, acknowledgement within SLO, retry, dead-letter, protected recovery, backup escalation, and alert-secret rotation; then run `npm run agent:alert:evidence:apply` to capture and hash-bind the live evidence.
8. Complete the separate credential-rotation register, run its fail-closed gate, and bind the exact register SHA-256 and security approval reference here.
9. Set `declaredStatus` to `READY_FOR_INDEPENDENT_REVIEW` only after every blocker is resolved, then run `npm run agent:operational-release:gate`.
10. Submit the frozen evidence bundle to `017-aqstoqflow-enterprise-release-gate`; keep activation as a later protected ceremony.

References must use value-free URI-style identifiers such as `evidence://`, `approval://`, `directory://`, `secret-manager://`, or controlled HTTPS URLs without query strings. Never paste a secret, token, password, authorization header, database URL, signed URL, request body, or environment snapshot into this register.

## Current Blockers

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
- `credentialRotation:REGISTER_HASH_INVALID`
- `credentialRotation:SECURITY_APPROVAL_REFERENCE_MISSING`
- `credentialRotation:EVIDENCE_HASH_INVALID`
- `credentialRotation:ATTESTATION_REFERENCE_MISSING`
- `credentialRotation:CREDENTIAL_REGISTER_BLOCKED`

## Decision

The operational release package remains blocked. Complete the referenced real-world evidence without storing secret values, then rerun the fail-closed gate.

The agent cannot approve, activate, or promote itself.
