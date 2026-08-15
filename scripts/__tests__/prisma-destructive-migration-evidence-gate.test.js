const fs = require("fs");
const os = require("os");
const path = require("path");

const {
  REQUIRED_ARTIFACT_IDS,
  buildEvidenceReport,
  classifyArtifact,
} = require("../prisma-destructive-migration-evidence-gate");

describe("destructive migration evidence gate", () => {
  it("keeps the current packet blocked while templates and human evidence remain incomplete", () => {
    const root = path.resolve(__dirname, "../..");
    const report = buildEvidenceReport(root);

    expect(REQUIRED_ARTIFACT_IDS).toHaveLength(14);
    expect(report.packetBindings).toMatchObject({
      ready: true,
      operationCount: 13,
      boundFileCount: 24,
    });
    expect(report.manifest.ready).toBe(true);
    expect(report.manifest.completedArtifactCount).toBe(0);
    expect(report.preCheckerReady).toBe(false);
    expect(report.exactHashApprovalRecorded).toBe(false);
    expect(report.productionExecutionAuthorized).toBe(false);
    expect(report.status).toBe("REJECTED_BLOCKED_EVIDENCE_INCOMPLETE");
  });

  it("does not accept a template merely because the manifest claims PRESENT_VALID", () => {
    const root = fs.mkdtempSync(path.join(os.tmpdir(), "migration-evidence-"));
    const target = path.join(root, "maker-attestation.json");
    fs.writeFileSync(
      target,
      JSON.stringify({
        artifactId: "A-01",
        artifactStatus: "TEMPLATE_NOT_EVIDENCE",
      }),
      "utf8",
    );

    const result = classifyArtifact(root, {
      id: "A-01",
      path: "maker-attestation.json",
      status: "PRESENT_VALID",
      sha256: "0".repeat(64),
    });

    expect(result.validation).toBe("PRESENT_INVALID");
    expect(result.reason).toBe("completed_evidence_hash_missing_or_mismatched");
  });
});
