const crypto = require("crypto");
const fs = require("fs");
const os = require("os");
const path = require("path");
const { assessPacket } = require("../statutory-country-pack-review-preflight");

const families = ["pension", "family", "risk", "rules"];
const digest = (value) => crypto.createHash("sha256").update(value).digest("hex");
const temporaryDirectories = [];
afterEach(() => {
  // Only directories created by this suite are removed.
  for (const directory of temporaryDirectories.splice(0)) fs.rmSync(directory, { recursive: true, force: true });
});

function packet() {
  const evidenceDir = fs.mkdtempSync(path.join(os.tmpdir(), "country-pack-review-"));
  temporaryDirectories.push(evidenceDir);
  const source = "official source";
  const approval = "signed approval";
  fs.writeFileSync(path.join(evidenceDir, "source.pdf"), source);
  fs.writeFileSync(path.join(evidenceDir, "approval.pdf"), approval);
  fs.writeFileSync(path.join(evidenceDir, "verification.txt"), "synthetic checker evidence");
  const manifest = {
    countryCode: "CM", reviewStatus: "PENDING_EXPERT_REVIEW", productionUseAllowed: false,
    artifacts: [{ legalRef: "LAW", file: "source.pdf", byteLength: Buffer.byteLength(source), sha256: digest(source) }],
    requiredApproval: { fixtureFamilies: families }
  };
  const decision = {
    countryCode: "CM", countryPackVersion: "CM-test", decisionStatus: "APPROVED", productionUseAllowed: true,
    reviewer: { fullName: "Reviewer", professionalCapacity: "Counsel", organization: "Firm", qualificationReference: "BAR-1", conflictOfInterestDeclaration: "No conflict" },
    reviewWindow: { startedAt: "2026-07-01T00:00:00Z", completedAt: "2026-07-02T00:00:00Z" },
    sourceArtifacts: [{ legalRef: "LAW", file: "source.pdf", sha256: digest(source), digestRecomputedByReviewer: true }],
    fixtureFamilyDecisions: families.map((fixtureFamily) => ({ fixtureFamily, decision: "APPROVED", sourceProvision: "section 1", effectiveFrom: "2026-01-01", effectiveTo: null, independentFixtureTieOutHash: `sha256:${digest(fixtureFamily)}` })),
    finalDecision: { decision: "APPROVED", approvedFixtureFamilies: families, excludedFixtureFamilies: [], effectiveFrom: "2026-01-01", effectiveTo: null },
    // Synthetic structural proof only: these fixtures do not authenticate a real signature.
    signedApprovalArtifact: { file: "approval.pdf", sha256: digest(approval), signedAt: "2026-07-02T00:00:00Z", signatureMethod: "QUALIFIED_ELECTRONIC_SIGNATURE",
      signatureVerification: { status: "VERIFIED", verifiedBy: "Independent checker", verifierRole: "Compliance checker", verifiedAt: "2026-07-03T00:00:00Z", verificationMethod: "Synthetic fixture validation", conflictOfInterestDeclaration: "No conflict", evidenceFile: "verification.txt", evidenceSha256: digest("synthetic checker evidence") }
    }
  };
  const decisionFile = path.join(evidenceDir, "review-decision.json");
  fs.writeFileSync(path.join(evidenceDir, "manifest.json"), JSON.stringify(manifest));
  fs.writeFileSync(decisionFile, JSON.stringify(decision));
  return { evidenceDir, decisionFile, manifest, decision };
}

function save(subject) {
  fs.writeFileSync(path.join(subject.evidenceDir, "manifest.json"), JSON.stringify(subject.manifest));
  fs.writeFileSync(subject.decisionFile, JSON.stringify(subject.decision));
}

test("complete evidence is ready only for an authorized manifest transition", () => {
  const subject = packet();
  const result = assessPacket(subject);
  expect(result.status).toBe("READY_FOR_AUTHORIZED_MANIFEST_TRANSITION");
  expect(result.operatorUpdatesAllowed).toBe(true);
  expect(result.productionUseAllowed).toBe(false);
});

test("blank reviewer decision remains blocked", () => {
  const subject = packet();
  subject.decision.reviewer.fullName = null;
  subject.decision.fixtureFamilyDecisions[0].decision = null;
  subject.decision.signedApprovalArtifact = { file: null, sha256: null, signedAt: null, signatureMethod: null };
  save(subject);
  const result = assessPacket(subject);
  expect(result.status).toBe("BLOCKED_PENDING_QUALIFIED_REVIEW");
  expect(result.blockers).toEqual(expect.arrayContaining(["reviewer_identity_complete", "fixture_family_decisions_complete", "signed_approval_metadata_complete"]));
});

test("source mutation fails integrity", () => {
  const subject = packet();
  fs.appendFileSync(path.join(subject.evidenceDir, "source.pdf"), "tampered");
  expect(assessPacket(subject).blockers).toContain("source_artifact_integrity");
});

test("signed approval hash mismatch is blocked", () => {
  const subject = packet();
  subject.decision.signedApprovalArtifact.sha256 = digest("different");
  save(subject);
  expect(assessPacket(subject).blockers).toContain("signed_approval_artifact_verified");
});

test("premature production manifest is blocked", () => {
  const subject = packet();
  subject.decision.reviewer.fullName = null;
  subject.manifest.productionUseAllowed = true;
  subject.manifest.reviewStatus = "APPROVED";
  save(subject);
  expect(assessPacket(subject).blockers).toContain("manifest_transition_not_premature");
});

test("a rejected fixture family blocks final acceptance", () => {
  const subject = packet();
  subject.decision.fixtureFamilyDecisions[0].decision = "REJECTED";
  save(subject);
  expect(assessPacket(subject).blockers).toContain("all_required_fixture_families_approved");
});

test.each(["REJECTED", "CHANGES_REQUIRED", "MORE_EVIDENCE_REQUIRED"])("%s is a valid completed response but cannot authorize transition", (decision) => {
  const subject = packet();
  subject.decision.fixtureFamilyDecisions[0].decision = decision;
  save(subject);
  const result = assessPacket(subject);
  expect(result.blockers).not.toContain("fixture_family_decisions_complete");
  expect(result.blockers).toContain("all_required_fixture_families_approved");
  expect(result.operatorUpdatesAllowed).toBe(false);
});

function transition(subject, status) {
  subject.manifest.reviewStatus = status;
  subject.manifest.productionUseAllowed = true;
  for (const artifact of subject.manifest.artifacts) Object.assign(artifact, { reviewStatus: status, productionUseAllowed: true });
  Object.assign(subject.manifest.requiredApproval, {
    reviewerIdentity: subject.decision.reviewer.fullName,
    reviewedAt: subject.decision.reviewWindow.completedAt,
    effectiveFrom: subject.decision.finalDecision.effectiveFrom,
    effectiveTo: subject.decision.finalDecision.effectiveTo,
    approvalArtifactFile: subject.decision.signedApprovalArtifact.file,
    approvalArtifactHash: subject.decision.signedApprovalArtifact.sha256,
    approvedFixtureFamilies: [...families],
  });
}

test.each(["EXPERT_REVIEWED", "REGULATOR_CONFIRMED"])("accepts a consistently bound %s manifest after transition", (status) => {
  const subject = packet();
  transition(subject, status);
  save(subject);
  expect(assessPacket(subject).operatorUpdatesAllowed).toBe(true);
  expect(assessPacket(subject).checks).toHaveLength(12);
});

test.each(["reviewerIdentity", "reviewedAt", "effectiveFrom", "effectiveTo", "approvalArtifactFile", "approvalArtifactHash", "approvedFixtureFamilies"])("rejects transitioned manifest with stale %s binding", (field) => {
  const subject = packet();
  transition(subject, "EXPERT_REVIEWED");
  subject.manifest.requiredApproval[field] = field === "approvedFixtureFamilies" ? ["other"] : "different";
  save(subject);
  expect(assessPacket(subject).blockers).toContain("manifest_transition_not_premature");
});

test("rejects legacy APPROVED manifest and incomplete artifact transition", () => {
  const subject = packet();
  transition(subject, "APPROVED");
  save(subject);
  expect(assessPacket(subject).operatorUpdatesAllowed).toBe(false);
  transition(subject, "EXPERT_REVIEWED");
  subject.manifest.artifacts[0].productionUseAllowed = false;
  save(subject);
  expect(assessPacket(subject).blockers).toContain("manifest_transition_not_premature");
});

test.each(["missing", "same-checker", "tampered-evidence", "unsupported-method"])("signature/checker failure %s blocks preflight even with matching approval bytes", (failure) => {
  const subject = packet();
  if (failure === "missing") delete subject.decision.signedApprovalArtifact.signatureVerification;
  if (failure === "same-checker") subject.decision.signedApprovalArtifact.signatureVerification.verifiedBy = " reviewer ";
  if (failure === "tampered-evidence") fs.writeFileSync(path.join(subject.evidenceDir, "verification.txt"), "tampered");
  if (failure === "unsupported-method") subject.decision.signedApprovalArtifact.signatureMethod = "typed name";
  save(subject);
  const result = assessPacket(subject);
  expect(result.operatorUpdatesAllowed).toBe(false);
  expect(result.blockers).toContain("signed_approval_artifact_verified");
});

test.each(["reversed-family", "invalid-final", "earlier-final", "open-ended-final"])("rejects %s approval interval", (failure) => {
  const subject = packet();
  if (failure === "reversed-family") subject.decision.fixtureFamilyDecisions[0].effectiveTo = "2025-12-31";
  if (failure === "invalid-final") subject.decision.finalDecision.effectiveTo = "invalid";
  if (failure === "earlier-final") subject.decision.finalDecision.effectiveFrom = "2025-01-01";
  if (failure === "open-ended-final") subject.decision.fixtureFamilyDecisions[0].effectiveTo = "2026-12-31";
  save(subject);
  expect(assessPacket(subject).operatorUpdatesAllowed).toBe(false);
});

test("pending manifest cannot contain a production-enabled source", () => {
  const subject = packet();
  subject.manifest.artifacts[0].productionUseAllowed = true;
  save(subject);
  expect(assessPacket(subject).blockers).toContain("manifest_transition_not_premature");
});
