const crypto = require("crypto");
const fs = require("fs");
const os = require("os");
const path = require("path");

const {
  assessSignatureVerification,
  canonicalJson,
  fixtureTieOutHashes,
  verifyEvidenceIndex,
} = require("../statutory-country-pack-review-package");

const digest = (value) => crypto.createHash("sha256").update(value).digest("hex");

test("evidence index verifies retained artifact bytes and lengths", () => {
  const evidenceDir = fs.mkdtempSync(path.join(os.tmpdir(), "review-package-"));
  const packageDir = path.join(evidenceDir, "review-package");
  fs.mkdirSync(packageDir);
  fs.writeFileSync(path.join(evidenceDir, "source.pdf"), "official");
  fs.writeFileSync(path.join(packageDir, "evidence-index.json"), JSON.stringify({
    sourceArtifacts: [{
      legalRef: "LAW",
      file: "../source.pdf",
      sha256: digest("official"),
      byteLength: Buffer.byteLength("official"),
    }],
  }));

  expect(verifyEvidenceIndex(packageDir).status).toBe("SOURCE_BYTES_VERIFIED");
});

test("evidence index rejects a mutated artifact", () => {
  const evidenceDir = fs.mkdtempSync(path.join(os.tmpdir(), "review-package-"));
  const packageDir = path.join(evidenceDir, "review-package");
  fs.mkdirSync(packageDir);
  fs.writeFileSync(path.join(evidenceDir, "source.pdf"), "mutated");
  fs.writeFileSync(path.join(packageDir, "evidence-index.json"), JSON.stringify({
    sourceArtifacts: [{ legalRef: "LAW", file: "../source.pdf", sha256: digest("official"), byteLength: 8 }],
  }));

  expect(verifyEvidenceIndex(packageDir).status).toBe("SOURCE_VERIFICATION_FAILED");
});

test("fixture hashes are deterministic and blocked while reviewer fields are incomplete", () => {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), "tie-outs-"));
  const workbook = path.join(root, "workbook.json");
  fs.writeFileSync(workbook, JSON.stringify({
    fixtureFamilies: [{ fixtureFamily: "family", independentReview: { decision: null, outputs: [] } }],
  }));
  expect(fixtureTieOutHashes(workbook).status).toBe("BLOCKED_INCOMPLETE_INDEPENDENT_REVIEW");

  fs.writeFileSync(workbook, JSON.stringify({
    fixtureFamilies: [
      { fixtureFamily: "a", independentReview: { decision: "APPROVED", outputs: [{ amount: "1.00" }] } },
      { fixtureFamily: "b", independentReview: { decision: "APPROVED", outputs: [{ amount: "2.00" }] } },
      { fixtureFamily: "c", independentReview: { decision: "APPROVED", outputs: [{ amount: "3.00" }] } },
      { fixtureFamily: "d", independentReview: { decision: "APPROVED", outputs: [{ amount: "4.00" }] } },
    ],
  }));
  const result = fixtureTieOutHashes(workbook);
  expect(result.status).toBe("TIE_OUT_HASHES_READY");
  expect(result.results[0].independentFixtureTieOutHash).toBe(
    `sha256:${digest(canonicalJson({ decision: "APPROVED", outputs: [{ amount: "1.00" }] }))}`,
  );
});

test("signature verification requires a different checker and retained verification evidence", () => {
  const evidenceDir = fs.mkdtempSync(path.join(os.tmpdir(), "signature-review-"));
  fs.writeFileSync(path.join(evidenceDir, "approval.pdf"), "approval");
  fs.writeFileSync(path.join(evidenceDir, "verification.txt"), "verified");
  const decisionFile = path.join(evidenceDir, "review-decision.json");
  const decision = {
    reviewer: { fullName: "Reviewer" },
    signedApprovalArtifact: {
      file: "approval.pdf",
      sha256: digest("approval"),
      signatureMethod: "PADES_SIGNED_PDF",
      signatureVerification: {
        status: "VERIFIED",
        verifiedBy: "Checker",
        verifierRole: "Compliance checker",
        verifiedAt: "2026-07-26T10:00:00Z",
        verificationMethod: "PAdES validation",
        conflictOfInterestDeclaration: "No conflict",
        evidenceFile: "verification.txt",
        evidenceSha256: digest("verified"),
      },
    },
  };
  fs.writeFileSync(decisionFile, JSON.stringify(decision));
  expect(assessSignatureVerification({ evidenceDir, decisionFile }).ready).toBe(true);

  decision.signedApprovalArtifact.signatureVerification.verifiedBy = "Reviewer";
  fs.writeFileSync(decisionFile, JSON.stringify(decision));
  expect(assessSignatureVerification({ evidenceDir, decisionFile }).blockers).toContain(
    "maker_checker_separation_invalid",
  );
});
