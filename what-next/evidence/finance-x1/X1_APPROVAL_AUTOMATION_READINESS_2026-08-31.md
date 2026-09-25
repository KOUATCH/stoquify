# X1 approval automation readiness

**Generated:** 2026-09-01T15:19:01.274Z  
**Mode:** report  
**Status:** BLOCKED_AWAITING_EXTERNAL_CONFIGURATION_AND_SIGNATURE  
**External records created:** false  
**Stoquify database mutated:** false

## Decision

Repository automation is prepared, but authoritative record creation is blocked.

## Blockers

| Code | Description | Source |
| --- | --- | --- |
| MISSING_APPROVALPLATFORM | approvalPlatform is required. | X1 approval automation configuration |
| MISSING_APPROVALWORKSPACEID | approvalWorkspaceId is required. | X1 approval automation configuration |
| MISSING_APPROVALTEMPLATEID | approvalTemplateId is required. | X1 approval automation configuration |
| MISSING_PROVIDERADAPTERMODULE | providerAdapterModule is required. | X1 approval automation configuration |
| MISSING_IDENTITYPROVIDER | identityProvider is required. | X1 approval automation configuration |
| MISSING_GOVERNANCEREGISTERURI | governanceRegisterUri is required. | X1 approval automation configuration |
| MISSING_SECRETMANAGERREFERENCE | secretManagerReference is required. | X1 approval automation configuration |
| MISSING_CALLBACKURL | callbackUrl is required. | X1 approval automation configuration |
| MISSING_EVIDENCESTOREURI | evidenceStoreUri is required. | X1 approval automation configuration |
| MISSING_RETENTIONPOLICYREFERENCE | retentionPolicyReference is required. | X1 approval automation configuration |
| MISSING_SERVICEPRINCIPALS_APPROVALORCHESTRATION | servicePrincipals.approvalOrchestration is required. | X1 approval automation configuration |
| MISSING_SERVICEPRINCIPALS_EVIDENCECAPTURE | servicePrincipals.evidenceCapture is required. | X1 approval automation configuration |
| MISSING_SERVICEPRINCIPALS_INDEPENDENTVERIFIER | servicePrincipals.independentVerifier is required. | X1 approval automation configuration |
| MISSING_SERVICEPRINCIPALS_IMPLEMENTATIONCI | servicePrincipals.implementationCi is required. | X1 approval automation configuration |
| MISSING_SIGNEDDELEGATION_APPROVALRECORDID | signedDelegation.approvalRecordId is required. | X1 approval automation configuration |
| MISSING_SIGNEDDELEGATION_SIGNATUREREFERENCE | signedDelegation.signatureReference is required. | X1 approval automation configuration |
| MISSING_SIGNEDDELEGATION_SIGNEDARTIFACTURI | signedDelegation.signedArtifactUri is required. | X1 approval automation configuration |
| MISSING_SIGNEDDELEGATION_SIGNEDARTIFACTSHA256 | signedDelegation.signedArtifactSha256 is required. | X1 approval automation configuration |
| MISSING_SIGNEDDELEGATION_SIGNEDAT | signedDelegation.signedAt is required. | X1 approval automation configuration |
| MISSING_SIGNEDDELEGATION_EXPIRESAT | signedDelegation.expiresAt is required. | X1 approval automation configuration |
| MISSING_SIGNEDDELEGATION_SIGNINGMODEL | signedDelegation.signingModel is required. | X1 approval automation configuration |
| DELEGATION_POLICY_NOT_APPROVED | STOQ-X1-POL-004 is not signed and approved in an authoritative system. | Approval/e-signature system |

## Read-only database context

Database status: RETRIEVED_READ_ONLY. Target: stoquify_replay_next_20260830.

| Role | Role ID | Active verified candidates | Permissions |
| --- | --- | --- | ---: |
| external_accountant | rds_org_001_compliance_role_external_accountant | Carine Manga (rds_org_001_compliance_user_external_accountant) | 24 |
| owner | rds_org_001_compliance_role_owner | Mireille Nkoa (rds_org_001_compliance_user_owner) | 217 |
| product_approver | rds_org_001_compliance_role_product_approver | Kouatchoua Mark (rds_org_001_compliance_user_product_approver) | 32 |
| qa_owner | rds_org_001_compliance_role_qa_owner | Sonkeng Steve (rds_org_001_compliance_user_qa_owner) | 27 |
| security_owner | rds_org_001_compliance_role_security_owner | Yonga Springfield (rds_org_001_compliance_user_security_owner) | 5 |
| sre_owner | rds_org_001_compliance_role_sre_owner | Ronald Djakou (rds_org_001_compliance_user_sre_owner) | 20 |

Existing X1 activation packages: 0.

## Artifact integrity

Contract URI: `repository://stoquify/docs/blockers-docs/X1_CONTRACT_ARTIFACT_MANIFEST_2026-08-31.json`  
Contract manifest SHA-256: `cdb16e90a74ea942e204bc8191445041a98102850619363096786768e777c9e4`  
All checked hashes valid: true.

## Safe next action

Complete the non-secret configuration, sign POL-004, and add the approved provider adapter.
