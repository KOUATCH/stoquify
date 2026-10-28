import fs from "fs";
import path from "path";

import {
  buildPosCashShortageResolutionReadinessReviewArtifact,
  buildPosCashShortageResolutionReadinessReviewEvidenceRow,
  buildPosCashShortageResolutionReadinessReviewPacket,
  composePosCashShortageResolutionReadinessActivationEvidence,
  describePosCashShortageResolutionReadinessStatusLine,
  describePosCashShortageResolutionReadinessReviewArtifactStatusLine,
  digestPosCashShortageResolutionReadinessReviewArtifact,
  evaluatePosCashShortageResolutionReadinessPreflight,
  fingerprintPosCashShortageResolutionReadinessReviewPacket,
  POS_CASH_SHORTAGE_RESOLUTION_READINESS_REQUIREMENTS,
} from "../pos-cash-shortage-resolution-readiness-preflight";

const ROOT = process.cwd();

describe("POS cash-shortage resolution readiness preflight", () => {
  it("blocks the current lifecycle policy because source-owned recheck is not present yet", () => {
    const result = evaluatePosCashShortageResolutionReadinessPreflight({
      posLifecyclePolicySourceText: lifecycleSource(),
      sourceRecheckContractSourceText: null,
    });

    expect(result.status).toBe("blocked");
    expect(result.resolutionReadinessCertified).toBe(false);
    expect(result.activationAuthorized).toBe(false);
    expect(result.satisfiedRequirements).toEqual(
      POS_CASH_SHORTAGE_RESOLUTION_READINESS_REQUIREMENTS.filter(
        (requirement) => requirement !== "source_owned_recheck_contract",
      ),
    );
    expect(result.missingRequirements).toEqual([
      "source_owned_recheck_contract",
    ]);
  });

  it("certifies a fixture only when source-owned recheck semantics are present", () => {
    const result = evaluatePosCashShortageResolutionReadinessPreflight({
      posLifecyclePolicySourceText: lifecycleSource(),
      sourceRecheckContractSourceText: sourceRecheckFixture(),
    });

    expect(result.status).toBe("certified");
    expect(result.resolutionReadinessCertified).toBe(true);
    expect(result.activationAuthorized).toBe(false);
    expect(result.satisfiedRequirements).toEqual([
      ...POS_CASH_SHORTAGE_RESOLUTION_READINESS_REQUIREMENTS,
    ]);
    expect(result.missingRequirements).toEqual([]);
  });

  it("describes blocked source-owned resolution readiness without terminal authority", () => {
    const result = evaluatePosCashShortageResolutionReadinessPreflight({
      posLifecyclePolicySourceText: lifecycleSource(),
      sourceRecheckContractSourceText: null,
    });

    const statusLine =
      describePosCashShortageResolutionReadinessStatusLine(result);

    expect(statusLine.label).toBe("pos_cash_shortage_resolution_readiness");
    expect(statusLine.status).toBe("blocked");
    expect(statusLine.resolutionReadinessCertified).toBe(false);
    expect(statusLine.missingRequirementCount).toBe(
      result.missingRequirements.length,
    );
    expect(statusLine.satisfiedRequirementCount).toBe(
      result.satisfiedRequirements.length,
    );
    expect(statusLine.text).toContain(
      "POS cash-shortage source-owned resolution readiness is blocked",
    );
    expect(statusLine.text).toContain(
      `${result.missingRequirements.length} requirements missing`,
    );
    expect(statusLine.text).toContain("terminal resolution not authorized");
    expect(statusLine.activationAuthorized).toBe(false);
  });

  it("describes certified source-owned resolution readiness without terminal authority", () => {
    const result = evaluatePosCashShortageResolutionReadinessPreflight({
      posLifecyclePolicySourceText: lifecycleSource(),
      sourceRecheckContractSourceText: sourceRecheckFixture(),
    });

    const statusLine =
      describePosCashShortageResolutionReadinessStatusLine(result);

    expect(statusLine.status).toBe("certified");
    expect(statusLine.resolutionReadinessCertified).toBe(true);
    expect(statusLine.missingRequirementCount).toBe(0);
    expect(statusLine.satisfiedRequirementCount).toBe(
      POS_CASH_SHORTAGE_RESOLUTION_READINESS_REQUIREMENTS.length,
    );
    expect(statusLine.text).toContain(
      "POS cash-shortage source-owned resolution readiness is certified",
    );
    expect(statusLine.text).toContain("terminal resolution not authorized");
    expect(statusLine.activationAuthorized).toBe(false);
  });

  it("describes partial source-owned resolution readiness from preflight counts", () => {
    const result = evaluatePosCashShortageResolutionReadinessPreflight({
      posLifecyclePolicySourceText: lifecycleSource().replace(
        /currentSourceHash/g,
        "reviewedSourceHash",
      ),
      sourceRecheckContractSourceText: sourceRecheckFixture(),
    });

    const statusLine =
      describePosCashShortageResolutionReadinessStatusLine(result);

    expect(result.missingRequirements).toContain("current_source_hash_guard");
    expect(statusLine.status).toBe("blocked");
    expect(statusLine.missingRequirementCount).toBe(
      result.missingRequirements.length,
    );
    expect(statusLine.satisfiedRequirementCount).toBe(
      result.satisfiedRequirements.length,
    );
    expect(statusLine.text).toContain(
      `${result.missingRequirements.length} requirements missing`,
    );
    expect(statusLine.activationAuthorized).toBe(false);
  });
  it("builds blocked source-owned resolution readiness review packet without terminal authority", () => {
    const result = evaluatePosCashShortageResolutionReadinessPreflight({
      posLifecyclePolicySourceText: lifecycleSource(),
      sourceRecheckContractSourceText: null,
    });

    const packet = buildPosCashShortageResolutionReadinessReviewPacket(result);

    expect(packet.version).toBe(result.version);
    expect(packet.preflight).toBe(result);
    expect(packet.statusLine.status).toBe("blocked");
    expect(packet.statusLine.missingRequirementCount).toBe(
      result.missingRequirements.length,
    );
    expect(packet.statusLine.activationAuthorized).toBe(false);
    expect(packet.activationAuthorized).toBe(false);
  });

  it("builds certified source-owned resolution readiness review packet without terminal authority", () => {
    const result = evaluatePosCashShortageResolutionReadinessPreflight({
      posLifecyclePolicySourceText: lifecycleSource(),
      sourceRecheckContractSourceText: sourceRecheckFixture(),
    });

    const packet = buildPosCashShortageResolutionReadinessReviewPacket(result);

    expect(packet.preflight.status).toBe("certified");
    expect(packet.statusLine.resolutionReadinessCertified).toBe(true);
    expect(packet.statusLine.missingRequirementCount).toBe(0);
    expect(packet.statusLine.satisfiedRequirementCount).toBe(
      POS_CASH_SHORTAGE_RESOLUTION_READINESS_REQUIREMENTS.length,
    );
    expect(packet.activationAuthorized).toBe(false);
  });

  it("builds partial source-owned resolution readiness review packet from preflight counts", () => {
    const result = evaluatePosCashShortageResolutionReadinessPreflight({
      posLifecyclePolicySourceText: lifecycleSource().replace(
        /currentSourceHash/g,
        "reviewedSourceHash",
      ),
      sourceRecheckContractSourceText: sourceRecheckFixture(),
    });

    const packet = buildPosCashShortageResolutionReadinessReviewPacket(result);

    expect(result.missingRequirements).toContain("current_source_hash_guard");
    expect(packet.statusLine.status).toBe("blocked");
    expect(packet.statusLine.missingRequirementCount).toBe(
      result.missingRequirements.length,
    );
    expect(packet.statusLine.satisfiedRequirementCount).toBe(
      result.satisfiedRequirements.length,
    );
    expect(packet.activationAuthorized).toBe(false);
  });
  it("fingerprints source-owned resolution readiness review packet deterministically", () => {
    const result = evaluatePosCashShortageResolutionReadinessPreflight({
      posLifecyclePolicySourceText: lifecycleSource(),
      sourceRecheckContractSourceText: null,
    });

    const currentFingerprint =
      fingerprintPosCashShortageResolutionReadinessReviewPacket(result);
    const repeatedFingerprint =
      fingerprintPosCashShortageResolutionReadinessReviewPacket(result);

    expect(currentFingerprint).toEqual(repeatedFingerprint);
    expect(currentFingerprint.algorithm).toBe("hashBusinessPayload");
    expect(currentFingerprint.value).toMatch(/^[a-f0-9]{64}$/);
    expect(currentFingerprint.activationAuthorized).toBe(false);
  });

  it("fingerprints certified source-owned resolution readiness without terminal authority", () => {
    const result = evaluatePosCashShortageResolutionReadinessPreflight({
      posLifecyclePolicySourceText: lifecycleSource(),
      sourceRecheckContractSourceText: sourceRecheckFixture(),
    });

    const fingerprint =
      fingerprintPosCashShortageResolutionReadinessReviewPacket(result);

    expect(result.status).toBe("certified");
    expect(fingerprint.value).toMatch(/^[a-f0-9]{64}$/);
    expect(fingerprint.activationAuthorized).toBe(false);
  });

  it("changes source-owned resolution readiness review packet fingerprint when evidence changes", () => {
    const certified = evaluatePosCashShortageResolutionReadinessPreflight({
      posLifecyclePolicySourceText: lifecycleSource(),
      sourceRecheckContractSourceText: sourceRecheckFixture(),
    });
    const invalidCurrentSourceGuard =
      evaluatePosCashShortageResolutionReadinessPreflight({
        posLifecyclePolicySourceText: lifecycleSource().replace(
          /currentSourceHash/g,
          "reviewedSourceHash",
        ),
        sourceRecheckContractSourceText: sourceRecheckFixture(),
      });

    const certifiedFingerprint =
      fingerprintPosCashShortageResolutionReadinessReviewPacket(certified);
    const invalidFingerprint =
      fingerprintPosCashShortageResolutionReadinessReviewPacket(
        invalidCurrentSourceGuard,
      );

    expect(certifiedFingerprint.value).not.toBe(invalidFingerprint.value);
    expect(invalidFingerprint.activationAuthorized).toBe(false);
  });
  it("builds blocked source-owned resolution readiness review artifact without terminal authority", () => {
    const result = evaluatePosCashShortageResolutionReadinessPreflight({
      posLifecyclePolicySourceText: lifecycleSource(),
      sourceRecheckContractSourceText: null,
    });

    const artifact =
      buildPosCashShortageResolutionReadinessReviewArtifact(result);

    expect(artifact.packet).toEqual(
      buildPosCashShortageResolutionReadinessReviewPacket(result),
    );
    expect(artifact.fingerprint).toEqual(
      fingerprintPosCashShortageResolutionReadinessReviewPacket(result),
    );
    expect(artifact.packet.statusLine.status).toBe("blocked");
    expect(artifact.fingerprint.value).toMatch(/^[a-f0-9]{64}$/);
    expect(artifact.activationAuthorized).toBe(false);
  });

  it("builds certified source-owned resolution readiness review artifact without terminal authority", () => {
    const result = evaluatePosCashShortageResolutionReadinessPreflight({
      posLifecyclePolicySourceText: lifecycleSource(),
      sourceRecheckContractSourceText: sourceRecheckFixture(),
    });

    const artifact =
      buildPosCashShortageResolutionReadinessReviewArtifact(result);

    expect(artifact.packet.preflight.status).toBe("certified");
    expect(artifact.packet.statusLine.resolutionReadinessCertified).toBe(true);
    expect(artifact.fingerprint.activationAuthorized).toBe(false);
    expect(artifact.activationAuthorized).toBe(false);
  });

  it("builds partial source-owned resolution readiness review artifact from preflight counts", () => {
    const result = evaluatePosCashShortageResolutionReadinessPreflight({
      posLifecyclePolicySourceText: lifecycleSource().replace(
        /currentSourceHash/g,
        "reviewedSourceHash",
      ),
      sourceRecheckContractSourceText: sourceRecheckFixture(),
    });

    const artifact =
      buildPosCashShortageResolutionReadinessReviewArtifact(result);

    expect(result.missingRequirements).toContain("current_source_hash_guard");
    expect(artifact.packet.statusLine.status).toBe("blocked");
    expect(artifact.packet.statusLine.missingRequirementCount).toBe(
      result.missingRequirements.length,
    );
    expect(artifact.activationAuthorized).toBe(false);
  });
  it("digests blocked source-owned resolution readiness review artifact without terminal authority", () => {
    const result = evaluatePosCashShortageResolutionReadinessPreflight({
      posLifecyclePolicySourceText: lifecycleSource(),
      sourceRecheckContractSourceText: null,
    });

    const digest =
      digestPosCashShortageResolutionReadinessReviewArtifact(result);

    expect(digest.status).toBe("blocked");
    expect(digest.resolutionReadinessCertified).toBe(false);
    expect(digest.fingerprint.value).toMatch(/^[a-f0-9]{64}$/);
    expect(digest.missingRequirementCount).toBe(
      result.missingRequirements.length,
    );
    expect(digest.satisfiedRequirementCount).toBe(
      result.satisfiedRequirements.length,
    );
    expect(digest.activationAuthorized).toBe(false);
  });

  it("digests certified source-owned resolution readiness review artifact without terminal authority", () => {
    const result = evaluatePosCashShortageResolutionReadinessPreflight({
      posLifecyclePolicySourceText: lifecycleSource(),
      sourceRecheckContractSourceText: sourceRecheckFixture(),
    });

    const digest =
      digestPosCashShortageResolutionReadinessReviewArtifact(result);

    expect(digest.status).toBe("certified");
    expect(digest.resolutionReadinessCertified).toBe(true);
    expect(digest.missingRequirementCount).toBe(0);
    expect(digest.satisfiedRequirementCount).toBe(
      POS_CASH_SHORTAGE_RESOLUTION_READINESS_REQUIREMENTS.length,
    );
    expect(digest.fingerprint.activationAuthorized).toBe(false);
    expect(digest.activationAuthorized).toBe(false);
  });

  it("digests partial source-owned resolution readiness review artifact from preflight counts", () => {
    const result = evaluatePosCashShortageResolutionReadinessPreflight({
      posLifecyclePolicySourceText: lifecycleSource().replace(
        /currentSourceHash/g,
        "reviewedSourceHash",
      ),
      sourceRecheckContractSourceText: sourceRecheckFixture(),
    });

    const digest =
      digestPosCashShortageResolutionReadinessReviewArtifact(result);

    expect(result.missingRequirements).toContain("current_source_hash_guard");
    expect(digest.status).toBe("blocked");
    expect(digest.missingRequirementCount).toBe(
      result.missingRequirements.length,
    );
    expect(digest.satisfiedRequirementCount).toBe(
      result.satisfiedRequirements.length,
    );
    expect(digest.activationAuthorized).toBe(false);
  });
  it("describes blocked source-owned resolution readiness review artifact status line without terminal authority", () => {
    const result = evaluatePosCashShortageResolutionReadinessPreflight({
      posLifecyclePolicySourceText: lifecycleSource(),
      sourceRecheckContractSourceText: null,
    });

    const statusLine =
      describePosCashShortageResolutionReadinessReviewArtifactStatusLine(
        result,
      );

    expect(statusLine.label).toBe(
      "pos_cash_shortage_resolution_readiness_review",
    );
    expect(statusLine.status).toBe("blocked");
    expect(statusLine.resolutionReadinessCertified).toBe(false);
    expect(statusLine.missingRequirementCount).toBe(
      result.missingRequirements.length,
    );
    expect(statusLine.satisfiedRequirementCount).toBe(
      result.satisfiedRequirements.length,
    );
    expect(statusLine.fingerprint.value).toMatch(/^[a-f0-9]{64}$/);
    expect(statusLine.text).toContain(
      "POS cash-shortage source-owned resolution readiness review is blocked",
    );
    expect(statusLine.text).toContain(
      `${result.missingRequirements.length} requirements missing`,
    );
    expect(statusLine.text).toContain("terminal resolution not authorized");
    expect(statusLine.activationAuthorized).toBe(false);
  });

  it("describes certified source-owned resolution readiness review artifact status line without terminal authority", () => {
    const result = evaluatePosCashShortageResolutionReadinessPreflight({
      posLifecyclePolicySourceText: lifecycleSource(),
      sourceRecheckContractSourceText: sourceRecheckFixture(),
    });

    const statusLine =
      describePosCashShortageResolutionReadinessReviewArtifactStatusLine(
        result,
      );

    expect(statusLine.status).toBe("certified");
    expect(statusLine.resolutionReadinessCertified).toBe(true);
    expect(statusLine.missingRequirementCount).toBe(0);
    expect(statusLine.satisfiedRequirementCount).toBe(
      POS_CASH_SHORTAGE_RESOLUTION_READINESS_REQUIREMENTS.length,
    );
    expect(statusLine.text).toContain(
      "POS cash-shortage source-owned resolution readiness review is certified",
    );
    expect(statusLine.text).toContain("terminal resolution not authorized");
    expect(statusLine.activationAuthorized).toBe(false);
  });

  it("describes partial source-owned resolution readiness review artifact status line from digest counts", () => {
    const result = evaluatePosCashShortageResolutionReadinessPreflight({
      posLifecyclePolicySourceText: lifecycleSource().replace(
        /currentSourceHash/g,
        "reviewedSourceHash",
      ),
      sourceRecheckContractSourceText: sourceRecheckFixture(),
    });

    const digest =
      digestPosCashShortageResolutionReadinessReviewArtifact(result);
    const statusLine =
      describePosCashShortageResolutionReadinessReviewArtifactStatusLine(
        result,
      );

    expect(statusLine.status).toBe("blocked");
    expect(statusLine.missingRequirementCount).toBe(
      digest.missingRequirementCount,
    );
    expect(statusLine.satisfiedRequirementCount).toBe(
      digest.satisfiedRequirementCount,
    );
    expect(statusLine.fingerprint).toEqual(digest.fingerprint);
    expect(statusLine.text).toContain(
      `${digest.missingRequirementCount} requirements missing`,
    );
    expect(statusLine.activationAuthorized).toBe(false);
  });
  it("builds blocked source-owned resolution readiness review evidence row without terminal authority", () => {
    const result = evaluatePosCashShortageResolutionReadinessPreflight({
      posLifecyclePolicySourceText: lifecycleSource(),
      sourceRecheckContractSourceText: null,
    });

    const statusLine =
      describePosCashShortageResolutionReadinessReviewArtifactStatusLine(
        result,
      );
    const row = buildPosCashShortageResolutionReadinessReviewEvidenceRow(
      result,
    );

    expect(row).toEqual({
      rowId: "pos_cash_shortage_resolution_readiness_review",
      label: statusLine.label,
      status: "blocked",
      outcome: "blocked",
      resolutionReadinessCertified: false,
      fingerprintAlgorithm: statusLine.fingerprint.algorithm,
      fingerprintValue: statusLine.fingerprint.value,
      missingRequirementCount: statusLine.missingRequirementCount,
      satisfiedRequirementCount: statusLine.satisfiedRequirementCount,
      summary: statusLine.text,
      activationAuthorized: false,
    });
    expect(row.summary).toContain("terminal resolution not authorized");
  });

  it("builds certified source-owned resolution readiness review evidence row without terminal authority", () => {
    const result = evaluatePosCashShortageResolutionReadinessPreflight({
      posLifecyclePolicySourceText: lifecycleSource(),
      sourceRecheckContractSourceText: sourceRecheckFixture(),
    });

    const row = buildPosCashShortageResolutionReadinessReviewEvidenceRow(
      result,
    );

    expect(row.status).toBe("certified");
    expect(row.outcome).toBe("ready");
    expect(row.resolutionReadinessCertified).toBe(true);
    expect(row.missingRequirementCount).toBe(0);
    expect(row.satisfiedRequirementCount).toBe(
      POS_CASH_SHORTAGE_RESOLUTION_READINESS_REQUIREMENTS.length,
    );
    expect(row.fingerprintValue).toMatch(/^[a-f0-9]{64}$/);
    expect(row.summary).toContain(
      "POS cash-shortage source-owned resolution readiness review is certified",
    );
    expect(row.activationAuthorized).toBe(false);
  });

  it("builds partial source-owned resolution readiness review evidence row from status-line counts", () => {
    const result = evaluatePosCashShortageResolutionReadinessPreflight({
      posLifecyclePolicySourceText: lifecycleSource().replace(
        /currentSourceHash/g,
        "reviewedSourceHash",
      ),
      sourceRecheckContractSourceText: sourceRecheckFixture(),
    });

    const statusLine =
      describePosCashShortageResolutionReadinessReviewArtifactStatusLine(
        result,
      );
    const row = buildPosCashShortageResolutionReadinessReviewEvidenceRow(
      result,
    );

    expect(result.missingRequirements).toContain("current_source_hash_guard");
    expect(row.status).toBe("blocked");
    expect(row.outcome).toBe("blocked");
    expect(row.missingRequirementCount).toBe(
      statusLine.missingRequirementCount,
    );
    expect(row.satisfiedRequirementCount).toBe(
      statusLine.satisfiedRequirementCount,
    );
    expect(row.fingerprintValue).toBe(statusLine.fingerprint.value);
    expect(row.summary).toBe(statusLine.text);
    expect(row.activationAuthorized).toBe(false);
  });  it("composes production activation evidence only from a certified readiness preflight", () => {
    const preflight = evaluatePosCashShortageResolutionReadinessPreflight({
      posLifecyclePolicySourceText: lifecycleSource(),
      sourceRecheckContractSourceText: sourceRecheckFixture(),
    });

    const evidence =
      composePosCashShortageResolutionReadinessActivationEvidence({
        preflight,
      });

    expect(evidence).toEqual({
      sourceOwnedResolutionReadinessCertified: true,
      activationAuthorized: false,
      preflightCertified: true,
      missingRequirements: [],
    });
  });

  it("keeps production activation evidence blocked when readiness preflight is blocked", () => {
    const preflight = evaluatePosCashShortageResolutionReadinessPreflight({
      posLifecyclePolicySourceText: lifecycleSource(),
      sourceRecheckContractSourceText: null,
    });

    const evidence =
      composePosCashShortageResolutionReadinessActivationEvidence({
        preflight,
      });

    expect(evidence).toEqual({
      sourceOwnedResolutionReadinessCertified: false,
      activationAuthorized: false,
      preflightCertified: false,
      missingRequirements: ["resolution_readiness_preflight"],
    });
  });
  it("blocks lifecycle policies without current source-hash concurrency", () => {
    const result = evaluatePosCashShortageResolutionReadinessPreflight({
      posLifecyclePolicySourceText: lifecycleSource().replace(
        /currentSourceHash/g,
        "reviewedSourceHash",
      ),
      sourceRecheckContractSourceText: sourceRecheckFixture(),
    });

    expect(result.status).toBe("blocked");
    expect(result.missingRequirements).toContain("current_source_hash_guard");
  });

  it("blocks lifecycle policies without independent reviewer enforcement", () => {
    const result = evaluatePosCashShortageResolutionReadinessPreflight({
      posLifecyclePolicySourceText: lifecycleSource()
        .replace("actorId === evidence.cashierId", "false")
        .replace("actorId === evidence.closerId", "false"),
      sourceRecheckContractSourceText: sourceRecheckFixture(),
    });

    expect(result.status).toBe("blocked");
    expect(result.missingRequirements).toContain("independent_reviewer_guard");
  });

  it("blocks lifecycle policies without triggered shortage evidence", () => {
    const result = evaluatePosCashShortageResolutionReadinessPreflight({
      posLifecyclePolicySourceText: lifecycleSource().replace(
        'outcome !== "triggered"',
        "false",
      ),
      sourceRecheckContractSourceText: sourceRecheckFixture(),
    });

    expect(result.status).toBe("blocked");
    expect(result.missingRequirements).toContain("triggered_shortage_evidence");
  });

  it("blocks incomplete source recheck fixtures", () => {
    const result = evaluatePosCashShortageResolutionReadinessPreflight({
      posLifecyclePolicySourceText: lifecycleSource(),
      sourceRecheckContractSourceText: sourceRecheckFixture().replace(
        "evaluationHash",
        "evaluationDigest",
      ),
    });

    expect(result.status).toBe("blocked");
    expect(result.missingRequirements).toContain(
      "source_owned_recheck_contract",
    );
  });

  it("blocks direct terminal incident command invocation", () => {
    const result = evaluatePosCashShortageResolutionReadinessPreflight({
      posLifecyclePolicySourceText: `${lifecycleSource()}\nresolveWorkflowAssuranceIncident({});`,
      sourceRecheckContractSourceText: sourceRecheckFixture(),
    });

    expect(result.status).toBe("blocked");
    expect(result.missingRequirements).toContain("terminal_command_not_active");
  });

  it("does not add incident command invocation, database writes, routes, actions, workers, or schedulers", () => {
    const source = fs.readFileSync(
      path.join(
        ROOT,
        "services/leakage/pos-cash-shortage-resolution-readiness-preflight.ts",
      ),
      "utf8",
    );

    expect(source).not.toMatch(
      /resolveWorkflowAssuranceIncident|transitionWorkflowAssuranceIncident/i,
    );
    expect(source).not.toMatch(
      /recordWorkflowAssuranceIncident|upsertWorkflowAssuranceIncidentFromResult/i,
    );
    expect(source).not.toMatch(/db\.|prisma\.|router|createSafeAction/i);
    expect(source).not.toMatch(
      /CHECK_RUNNERS|scheduleWorkflow|runDormantPosShiftCashShortage/i,
    );
  });
});

function lifecycleSource() {
  return fs.readFileSync(
    path.join(
      ROOT,
      "services/leakage/pos-cash-shortage-incident-lifecycle-policy.ts",
    ),
    "utf8",
  );
}

function sourceRecheckFixture() {
  return `
    export function recheckPosCashShortageResolutionSource(input: {
      sourceType: "POSSession";
      sourceId: string;
      currentSourceHash: string;
      approvedPolicyHash: string;
      evaluationHash: string;
    }) {
      return input;
    }
  `;
}
