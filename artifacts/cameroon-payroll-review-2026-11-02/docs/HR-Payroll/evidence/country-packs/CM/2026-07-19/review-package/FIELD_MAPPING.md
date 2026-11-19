# Signed Evidence to Repository Field Mapping

| Returned evidence | Repository destination | Transition condition |
|---|---|---|
| Reviewer name, capacity, organization, qualification, conflict declaration | `review-decision.json.reviewer` | Authentic reviewer return |
| Review start/completion | `review-decision.json.reviewWindow` | Valid chronological timestamps |
| Independently recomputed source hashes | `review-decision.json.sourceArtifacts` | Every primary manifest artifact matches |
| Four decisions, provisions, dates, tie-out hashes | `review-decision.json.fixtureFamilyDecisions` | Exactly four required families |
| Overall approval and effective window | `review-decision.json.finalDecision` | All four families approved |
| Signed artifact metadata | `review-decision.json.signedApprovalArtifact` | Artifact retained and hash-matched |
| Checker signature-verification record | `signedApprovalArtifact.signatureVerification` | Different checker; evidence retained and hash-matched |
| Reviewer identity and review dates | `manifest.json.requiredApproval` | Preflight reaches 12/12 |
| Approved families | `manifest.json.requiredApproval.approvedFixtureFamilies` | Exactly four required families |
| Signed approval filename and hash | `manifest.json.requiredApproval.approvalArtifactFile` and `approvalArtifactHash` | Checker accepts artifact |
| Approval status | `manifest.json.reviewStatus` and artifact statuses | `EXPERT_REVIEWED`, or `REGULATOR_CONFIRMED` only with actual regulator evidence |
| Production authorization | Manifest and artifact `productionUseAllowed` | Explicit approval plus authorized maker–checker transition |
| Decree source binding | Seven calculation fixture `sourceEvidenceHash` fields | Replace with `sha256:1e88f488d96e163ded9e204c100c5bbce9e8d4917e6e72387ec6af52e0c90b61` only after 12/12 preflight |

The employer-rules family is bound through the decision and manifest artifact:

`sha256:bc51f74de8dd3b0c7babd86e8f98d92dbdbece214480f66ac89c42d3e894a868`

Do not add or change an implementation hash field for employer rules without a separate schema change and test.

