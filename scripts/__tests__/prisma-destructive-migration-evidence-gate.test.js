const fs = require("fs");
const os = require("os");
const path = require("path");

const {
  REQUIRED_ARTIFACT_IDS,
  buildEvidenceReport,
  classifyArtifact,
  evaluateCandidateFreeze,
} = require("../prisma-destructive-migration-evidence-gate");

describe("destructive migration evidence gate", () => {
  it("keeps the current packet blocked while templates and human evidence remain incomplete", () => {
    const root = path.resolve(__dirname, "../..");
    const report = buildEvidenceReport(root);

    expect(REQUIRED_ARTIFACT_IDS).toHaveLength(14);
    expect(report.packetBindings).toMatchObject({
      ready: true,
      operationCount: 13,
      boundFileCount: 27,
    });
    expect(report.releaseSnapshot).toMatchObject({
      ready: false,
      mutableFilesInvalidateHistoricalApproval: false,
    });
    expect(report.candidateFreeze.ready).toBe(false);
    expect(report.candidateFreeze.mode).toBe("DEVELOPMENT_ROLLING");
    expect(report.manifest.completedArtifactCount).toBe(0);
    expect(report.preCheckerReady).toBe(false);
    expect(report.approvalState).toMatchObject({
      ready: false,
      findingCount: 13,
      approvedFindingCount: 0,
    });
    expect(report.exactHashApprovalRecorded).toBe(false);
    expect(report.historicalApprovalReady).toBe(false);
    expect(report.productionExecutionAuthorized).toBe(false);
    expect(report.status).toBe("REJECTED_BLOCKED_EVIDENCE_INCOMPLETE");
  });

  it("requires a clean unchanged production-frozen candidate", () => {
    const packet = {
      repository: {
        candidateMode: "PRODUCTION_FROZEN",
        sourceDirtyAtRefresh: false,
        head: "a".repeat(40),
        tree: "b".repeat(40),
      },
    };
    const ready = evaluateCandidateFreeze(packet, {
      available: true,
      head: "a".repeat(40),
      tree: "b".repeat(40),
      sourceDirtyPathCount: 0,
    });
    const changed = evaluateCandidateFreeze(packet, {
      available: true,
      head: "c".repeat(40),
      tree: "b".repeat(40),
      sourceDirtyPathCount: 1,
    });

    expect(ready).toMatchObject({ ready: true, errors: [] });
    expect(changed.ready).toBe(false);
    expect(changed.errors).toEqual(
      expect.arrayContaining([
        "candidate_source_worktree_dirty",
        "candidate_head_changed_after_refresh",
      ]),
    );
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
