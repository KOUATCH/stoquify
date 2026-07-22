const crypto = require("crypto");
const fs = require("fs");
const os = require("os");
const path = require("path");
const { assessPacket } = require("../statutory-country-pack-review-preflight");

const families = ["pension", "family", "risk", "rules"];
const digest = (value) => crypto.createHash("sha256").update(value).digest("hex");

function packet() {
  const evidenceDir = fs.mkdtempSync(path.join(os.tmpdir(), "country-pack-review-"));
  const source = "official source";
  const approval = "signed approval";
  fs.writeFileSync(path.join(evidenceDir, "source.pdf"), source);
  fs.writeFileSync(path.join(evidenceDir, "approval.pdf"), approval);
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
    signedApprovalArtifact: { file: "approval.pdf", sha256: digest(approval), signedAt: "2026-07-02T00:00:00Z", signatureMethod: "qualified electronic signature" }
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
