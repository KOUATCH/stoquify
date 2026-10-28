import fs from "fs";
import path from "path";

import { hashBusinessPayload } from "@/services/events/business-event.service";

import {
  buildPosCashShortageProductionPolicyReadinessReviewArtifact,
  buildPosCashShortageProductionPolicyReadinessReviewEvidenceRow,
  buildPosCashShortageProductionPolicyReadinessReviewPacket,
  composePosCashShortageProductionPolicyReadinessActivationEvidence,
  describePosCashShortageProductionPolicyReadinessStatusLine,
  describePosCashShortageProductionPolicyReadinessReviewArtifactStatusLine,
  digestPosCashShortageProductionPolicyReadinessReviewArtifact,
  evaluatePosCashShortageProductionPolicyReadinessPreflight,
  fingerprintPosCashShortageProductionPolicyReadinessReviewPacket,
  type PosCashShortageProductionPolicyReadinessEvidence,
} from "../pos-cash-shortage-production-policy-readiness-preflight";
import {
  POS_SHIFT_CASH_SHORTAGE_POLICY_KIND,
  type CashShortagePolicyV1,
} from "../pos-shift-cash-shortage-contracts";

const ROOT = process.cwd();
const EFFECTIVE_AT = "2026-07-28T12:00:00.000Z";

describe("POS cash-shortage production policy readiness preflight", () => {
  it("blocks when live approved policy evidence is absent", () => {
    const result = evaluatePosCashShortageProductionPolicyReadinessPreflight({
      evidence: null,
      policyServiceSourceText: policyServiceSource(),
      batchServiceSourceText: batchServiceSource(),
      runnerInputSourceText: runnerInputSource(),
    });

    expect(result.status).toBe("blocked");
    expect(result.productionPolicyReadinessCertified).toBe(false);
    expect(result.activationAuthorized).toBe(false);
    expect(result.missingRequirements).toEqual(
      expect.arrayContaining([
        "approved_policy_evidence_present",
        "approved_policy_contract",
        "policy_hash_matches",
        "approval_event_binding",
      ]),
    );
  });

  it("certifies a hash-bound approved observe-only policy fixture", () => {
    const result = evaluatePosCashShortageProductionPolicyReadinessPreflight({
      evidence: validEvidence(),
      policyServiceSourceText: policyServiceSource(),
      batchServiceSourceText: batchServiceSource(),
      runnerInputSourceText: runnerInputSource(),
    });

    expect(result.status).toBe("certified");
    expect(result.productionPolicyReadinessCertified).toBe(true);
    expect(result.activationAuthorized).toBe(false);
    expect(result.missingRequirements).toEqual([]);
  });

  it("composes production activation evidence only from a certified policy-readiness preflight", () => {
    const preflight = evaluatePosCashShortageProductionPolicyReadinessPreflight(
      {
        evidence: validEvidence(),
        policyServiceSourceText: policyServiceSource(),
        batchServiceSourceText: batchServiceSource(),
        runnerInputSourceText: runnerInputSource(),
      },
    );

    const evidence =
      composePosCashShortageProductionPolicyReadinessActivationEvidence({
        preflight,
      });

    expect(evidence).toEqual({
      productionPolicyReadinessCertified: true,
      activationAuthorized: false,
      preflightCertified: true,
      missingRequirements: [],
    });
  });

  it("keeps production activation evidence blocked when policy-readiness preflight is blocked", () => {
    const preflight = evaluatePosCashShortageProductionPolicyReadinessPreflight(
      {
        evidence: null,
        policyServiceSourceText: policyServiceSource(),
        batchServiceSourceText: batchServiceSource(),
        runnerInputSourceText: runnerInputSource(),
      },
    );

    const evidence =
      composePosCashShortageProductionPolicyReadinessActivationEvidence({
        preflight,
      });

    expect(evidence).toEqual({
      productionPolicyReadinessCertified: false,
      activationAuthorized: false,
      preflightCertified: false,
      missingRequirements: ["production_policy_readiness_preflight"],
    });
  });

  it("describes blocked production policy readiness without activation authority", () => {
    const result = evaluatePosCashShortageProductionPolicyReadinessPreflight({
      evidence: null,
      policyServiceSourceText: policyServiceSource(),
      batchServiceSourceText: batchServiceSource(),
      runnerInputSourceText: runnerInputSource(),
    });

    const statusLine =
      describePosCashShortageProductionPolicyReadinessStatusLine(result);

    expect(statusLine.label).toBe(
      "pos_cash_shortage_production_policy_readiness",
    );
    expect(statusLine.status).toBe("blocked");
    expect(statusLine.productionPolicyReadinessCertified).toBe(false);
    expect(statusLine.missingRequirementCount).toBe(
      result.missingRequirements.length,
    );
    expect(statusLine.satisfiedRequirementCount).toBe(
      result.satisfiedRequirements.length,
    );
    expect(statusLine.text).toContain(
      "POS cash-shortage production policy readiness is blocked",
    );
    expect(statusLine.text).toContain("activation not authorized");
    expect(statusLine.activationAuthorized).toBe(false);
  });

  it("describes certified production policy readiness without granting authority", () => {
    const result = evaluatePosCashShortageProductionPolicyReadinessPreflight({
      evidence: validEvidence(),
      policyServiceSourceText: policyServiceSource(),
      batchServiceSourceText: batchServiceSource(),
      runnerInputSourceText: runnerInputSource(),
    });

    const statusLine =
      describePosCashShortageProductionPolicyReadinessStatusLine(result);

    expect(statusLine.status).toBe("certified");
    expect(statusLine.productionPolicyReadinessCertified).toBe(true);
    expect(statusLine.missingRequirementCount).toBe(0);
    expect(statusLine.satisfiedRequirementCount).toBe(
      result.satisfiedRequirements.length,
    );
    expect(statusLine.text).toContain(
      "POS cash-shortage production policy readiness is certified",
    );
    expect(statusLine.text).toContain("activation not authorized");
    expect(statusLine.activationAuthorized).toBe(false);
  });

  it("describes partial production policy readiness from missing requirements", () => {
    const result = evaluatePosCashShortageProductionPolicyReadinessPreflight({
      evidence: validEvidence({
        reviewThreshold: "10000",
        highThreshold: "2000",
      }),
      policyServiceSourceText: policyServiceSource(),
      batchServiceSourceText: batchServiceSource(),
      runnerInputSourceText: runnerInputSource(),
    });

    const statusLine =
      describePosCashShortageProductionPolicyReadinessStatusLine(result);

    expect(statusLine.status).toBe("blocked");
    expect(result.missingRequirements).toContain("threshold_ordering_valid");
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

  it("builds blocked production policy readiness review packet without authority", () => {
    const result = evaluatePosCashShortageProductionPolicyReadinessPreflight({
      evidence: null,
      policyServiceSourceText: policyServiceSource(),
      batchServiceSourceText: batchServiceSource(),
      runnerInputSourceText: runnerInputSource(),
    });

    const packet =
      buildPosCashShortageProductionPolicyReadinessReviewPacket(result);

    expect(packet.version).toBe(1);
    expect(packet.preflight).toEqual(result);
    expect(packet.statusLine.status).toBe("blocked");
    expect(packet.statusLine.missingRequirementCount).toBe(
      result.missingRequirements.length,
    );
    expect(packet.statusLine.activationAuthorized).toBe(false);
    expect(packet.activationAuthorized).toBe(false);
  });

  it("builds certified production policy readiness review packet without granting authority", () => {
    const result = evaluatePosCashShortageProductionPolicyReadinessPreflight({
      evidence: validEvidence(),
      policyServiceSourceText: policyServiceSource(),
      batchServiceSourceText: batchServiceSource(),
      runnerInputSourceText: runnerInputSource(),
    });

    const packet =
      buildPosCashShortageProductionPolicyReadinessReviewPacket(result);

    expect(packet.preflight.status).toBe("certified");
    expect(packet.statusLine.status).toBe("certified");
    expect(packet.statusLine.productionPolicyReadinessCertified).toBe(true);
    expect(packet.statusLine.missingRequirementCount).toBe(0);
    expect(packet.activationAuthorized).toBe(false);
  });

  it("builds partial production policy readiness review packet from preflight counts", () => {
    const result = evaluatePosCashShortageProductionPolicyReadinessPreflight({
      evidence: validEvidence({
        reviewThreshold: "10000",
        highThreshold: "2000",
      }),
      policyServiceSourceText: policyServiceSource(),
      batchServiceSourceText: batchServiceSource(),
      runnerInputSourceText: runnerInputSource(),
    });

    const packet =
      buildPosCashShortageProductionPolicyReadinessReviewPacket(result);

    expect(result.missingRequirements).toContain("threshold_ordering_valid");
    expect(packet.preflight).toEqual(result);
    expect(packet.statusLine.status).toBe("blocked");
    expect(packet.statusLine.missingRequirementCount).toBe(
      result.missingRequirements.length,
    );
    expect(packet.statusLine.satisfiedRequirementCount).toBe(
      result.satisfiedRequirements.length,
    );
    expect(packet.activationAuthorized).toBe(false);
  });

  it("fingerprints blocked production policy readiness review packet deterministically", () => {
    const result = evaluatePosCashShortageProductionPolicyReadinessPreflight({
      evidence: null,
      policyServiceSourceText: policyServiceSource(),
      batchServiceSourceText: batchServiceSource(),
      runnerInputSourceText: runnerInputSource(),
    });

    const fingerprint =
      fingerprintPosCashShortageProductionPolicyReadinessReviewPacket(result);
    const repeated =
      fingerprintPosCashShortageProductionPolicyReadinessReviewPacket(result);

    expect(fingerprint).toEqual(repeated);
    expect(fingerprint.algorithm).toBe("hashBusinessPayload");
    expect(fingerprint.value).toMatch(/^[a-f0-9]{64}$/);
    expect(fingerprint.activationAuthorized).toBe(false);
  });

  it("fingerprints certified production policy readiness review packet without granting authority", () => {
    const result = evaluatePosCashShortageProductionPolicyReadinessPreflight({
      evidence: validEvidence(),
      policyServiceSourceText: policyServiceSource(),
      batchServiceSourceText: batchServiceSource(),
      runnerInputSourceText: runnerInputSource(),
    });

    const fingerprint =
      fingerprintPosCashShortageProductionPolicyReadinessReviewPacket(result);

    expect(result.status).toBe("certified");
    expect(fingerprint.value).toMatch(/^[a-f0-9]{64}$/);
    expect(fingerprint.activationAuthorized).toBe(false);
  });

  it("changes policy readiness review packet fingerprint when readiness evidence changes", () => {
    const certified = evaluatePosCashShortageProductionPolicyReadinessPreflight(
      {
        evidence: validEvidence(),
        policyServiceSourceText: policyServiceSource(),
        batchServiceSourceText: batchServiceSource(),
        runnerInputSourceText: runnerInputSource(),
      },
    );
    const invalidThreshold =
      evaluatePosCashShortageProductionPolicyReadinessPreflight({
        evidence: validEvidence({
          reviewThreshold: "10000",
          highThreshold: "2000",
        }),
        policyServiceSourceText: policyServiceSource(),
        batchServiceSourceText: batchServiceSource(),
        runnerInputSourceText: runnerInputSource(),
      });

    const certifiedFingerprint =
      fingerprintPosCashShortageProductionPolicyReadinessReviewPacket(
        certified,
      );
    const invalidThresholdFingerprint =
      fingerprintPosCashShortageProductionPolicyReadinessReviewPacket(
        invalidThreshold,
      );

    expect(certified.status).toBe("certified");
    expect(invalidThreshold.status).toBe("blocked");
    expect(certifiedFingerprint.value).not.toBe(
      invalidThresholdFingerprint.value,
    );
    expect(invalidThresholdFingerprint.activationAuthorized).toBe(false);
  });

  it("builds blocked production policy readiness review artifact with matching fingerprint", () => {
    const result = evaluatePosCashShortageProductionPolicyReadinessPreflight({
      evidence: null,
      policyServiceSourceText: policyServiceSource(),
      batchServiceSourceText: batchServiceSource(),
      runnerInputSourceText: runnerInputSource(),
    });

    const artifact =
      buildPosCashShortageProductionPolicyReadinessReviewArtifact(result);

    expect(artifact.packet).toEqual(
      buildPosCashShortageProductionPolicyReadinessReviewPacket(result),
    );
    expect(artifact.fingerprint).toEqual(
      fingerprintPosCashShortageProductionPolicyReadinessReviewPacket(result),
    );
    expect(artifact.packet.preflight.status).toBe("blocked");
    expect(artifact.activationAuthorized).toBe(false);
  });

  it("builds certified production policy readiness review artifact without granting authority", () => {
    const result = evaluatePosCashShortageProductionPolicyReadinessPreflight({
      evidence: validEvidence(),
      policyServiceSourceText: policyServiceSource(),
      batchServiceSourceText: batchServiceSource(),
      runnerInputSourceText: runnerInputSource(),
    });

    const artifact =
      buildPosCashShortageProductionPolicyReadinessReviewArtifact(result);

    expect(artifact.packet.preflight.status).toBe("certified");
    expect(artifact.packet.statusLine.productionPolicyReadinessCertified).toBe(
      true,
    );
    expect(artifact.fingerprint.value).toMatch(/^[a-f0-9]{64}$/);
    expect(artifact.fingerprint.activationAuthorized).toBe(false);
    expect(artifact.activationAuthorized).toBe(false);
  });

  it("builds partial production policy readiness review artifact from preflight evidence", () => {
    const result = evaluatePosCashShortageProductionPolicyReadinessPreflight({
      evidence: validEvidence({
        reviewThreshold: "10000",
        highThreshold: "2000",
      }),
      policyServiceSourceText: policyServiceSource(),
      batchServiceSourceText: batchServiceSource(),
      runnerInputSourceText: runnerInputSource(),
    });

    const artifact =
      buildPosCashShortageProductionPolicyReadinessReviewArtifact(result);

    expect(result.missingRequirements).toContain("threshold_ordering_valid");
    expect(artifact.packet.preflight).toEqual(result);
    expect(artifact.packet.statusLine.status).toBe("blocked");
    expect(artifact.fingerprint.value).toMatch(/^[a-f0-9]{64}$/);
    expect(artifact.activationAuthorized).toBe(false);
  });

  it("digests blocked production policy readiness review artifact without authority", () => {
    const result = evaluatePosCashShortageProductionPolicyReadinessPreflight({
      evidence: null,
      policyServiceSourceText: policyServiceSource(),
      batchServiceSourceText: batchServiceSource(),
      runnerInputSourceText: runnerInputSource(),
    });

    const digest =
      digestPosCashShortageProductionPolicyReadinessReviewArtifact(result);

    expect(digest.status).toBe("blocked");
    expect(digest.productionPolicyReadinessCertified).toBe(false);
    expect(digest.fingerprint.value).toMatch(/^[a-f0-9]{64}$/);
    expect(digest.missingRequirementCount).toBe(
      result.missingRequirements.length,
    );
    expect(digest.satisfiedRequirementCount).toBe(
      result.satisfiedRequirements.length,
    );
    expect(digest.activationAuthorized).toBe(false);
  });

  it("digests certified production policy readiness review artifact without granting authority", () => {
    const result = evaluatePosCashShortageProductionPolicyReadinessPreflight({
      evidence: validEvidence(),
      policyServiceSourceText: policyServiceSource(),
      batchServiceSourceText: batchServiceSource(),
      runnerInputSourceText: runnerInputSource(),
    });

    const digest =
      digestPosCashShortageProductionPolicyReadinessReviewArtifact(result);

    expect(digest.status).toBe("certified");
    expect(digest.productionPolicyReadinessCertified).toBe(true);
    expect(digest.missingRequirementCount).toBe(0);
    expect(digest.satisfiedRequirementCount).toBe(
      result.satisfiedRequirements.length,
    );
    expect(digest.fingerprint.activationAuthorized).toBe(false);
    expect(digest.activationAuthorized).toBe(false);
  });

  it("digests partial production policy readiness review artifact from preflight counts", () => {
    const result = evaluatePosCashShortageProductionPolicyReadinessPreflight({
      evidence: validEvidence({
        reviewThreshold: "10000",
        highThreshold: "2000",
      }),
      policyServiceSourceText: policyServiceSource(),
      batchServiceSourceText: batchServiceSource(),
      runnerInputSourceText: runnerInputSource(),
    });

    const digest =
      digestPosCashShortageProductionPolicyReadinessReviewArtifact(result);

    expect(result.missingRequirements).toContain("threshold_ordering_valid");
    expect(digest.status).toBe("blocked");
    expect(digest.missingRequirementCount).toBe(
      result.missingRequirements.length,
    );
    expect(digest.satisfiedRequirementCount).toBe(
      result.satisfiedRequirements.length,
    );
    expect(digest.activationAuthorized).toBe(false);
  });

  it("describes blocked production policy readiness review artifact status line without authority", () => {
    const result = evaluatePosCashShortageProductionPolicyReadinessPreflight({
      evidence: null,
      policyServiceSourceText: policyServiceSource(),
      batchServiceSourceText: batchServiceSource(),
      runnerInputSourceText: runnerInputSource(),
    });

    const statusLine =
      describePosCashShortageProductionPolicyReadinessReviewArtifactStatusLine(
        result,
      );

    expect(statusLine.label).toBe(
      "pos_cash_shortage_production_policy_readiness_review",
    );
    expect(statusLine.status).toBe("blocked");
    expect(statusLine.productionPolicyReadinessCertified).toBe(false);
    expect(statusLine.missingRequirementCount).toBe(
      result.missingRequirements.length,
    );
    expect(statusLine.satisfiedRequirementCount).toBe(
      result.satisfiedRequirements.length,
    );
    expect(statusLine.fingerprint.value).toMatch(/^[a-f0-9]{64}$/);
    expect(statusLine.text).toContain(
      "POS cash-shortage production policy readiness review is blocked",
    );
    expect(statusLine.text).toContain(
      `${result.missingRequirements.length} requirements missing`,
    );
    expect(statusLine.text).toContain("activation not authorized");
    expect(statusLine.activationAuthorized).toBe(false);
  });

  it("describes certified production policy readiness review artifact status line without granting authority", () => {
    const result = evaluatePosCashShortageProductionPolicyReadinessPreflight({
      evidence: validEvidence(),
      policyServiceSourceText: policyServiceSource(),
      batchServiceSourceText: batchServiceSource(),
      runnerInputSourceText: runnerInputSource(),
    });

    const statusLine =
      describePosCashShortageProductionPolicyReadinessReviewArtifactStatusLine(
        result,
      );

    expect(statusLine.status).toBe("certified");
    expect(statusLine.productionPolicyReadinessCertified).toBe(true);
    expect(statusLine.missingRequirementCount).toBe(0);
    expect(statusLine.satisfiedRequirementCount).toBe(
      result.satisfiedRequirements.length,
    );
    expect(statusLine.text).toContain(
      "POS cash-shortage production policy readiness review is certified",
    );
    expect(statusLine.text).toContain("activation not authorized");
    expect(statusLine.activationAuthorized).toBe(false);
  });

  it("describes partial production policy readiness review artifact status line from digest counts", () => {
    const result = evaluatePosCashShortageProductionPolicyReadinessPreflight({
      evidence: validEvidence({
        reviewThreshold: "10000",
        highThreshold: "2000",
      }),
      policyServiceSourceText: policyServiceSource(),
      batchServiceSourceText: batchServiceSource(),
      runnerInputSourceText: runnerInputSource(),
    });

    const digest =
      digestPosCashShortageProductionPolicyReadinessReviewArtifact(result);
    const statusLine =
      describePosCashShortageProductionPolicyReadinessReviewArtifactStatusLine(
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
  it("builds blocked production policy readiness review evidence row without authority", () => {
    const result = evaluatePosCashShortageProductionPolicyReadinessPreflight({
      evidence: null,
      policyServiceSourceText: policyServiceSource(),
      batchServiceSourceText: batchServiceSource(),
      runnerInputSourceText: runnerInputSource(),
    });

    const statusLine =
      describePosCashShortageProductionPolicyReadinessReviewArtifactStatusLine(
        result,
      );
    const row =
      buildPosCashShortageProductionPolicyReadinessReviewEvidenceRow(result);

    expect(row).toEqual({
      rowId: "pos_cash_shortage_production_policy_readiness_review",
      label: statusLine.label,
      status: "blocked",
      outcome: "blocked",
      productionPolicyReadinessCertified: false,
      fingerprintAlgorithm: statusLine.fingerprint.algorithm,
      fingerprintValue: statusLine.fingerprint.value,
      missingRequirementCount: statusLine.missingRequirementCount,
      satisfiedRequirementCount: statusLine.satisfiedRequirementCount,
      summary: statusLine.text,
      activationAuthorized: false,
    });
    expect(row.summary).toContain("activation not authorized");
  });

  it("builds certified production policy readiness review evidence row without granting authority", () => {
    const result = evaluatePosCashShortageProductionPolicyReadinessPreflight({
      evidence: validEvidence(),
      policyServiceSourceText: policyServiceSource(),
      batchServiceSourceText: batchServiceSource(),
      runnerInputSourceText: runnerInputSource(),
    });

    const row =
      buildPosCashShortageProductionPolicyReadinessReviewEvidenceRow(result);

    expect(row.status).toBe("certified");
    expect(row.outcome).toBe("ready");
    expect(row.productionPolicyReadinessCertified).toBe(true);
    expect(row.missingRequirementCount).toBe(0);
    expect(row.satisfiedRequirementCount).toBe(
      result.satisfiedRequirements.length,
    );
    expect(row.fingerprintValue).toMatch(/^[a-f0-9]{64}$/);
    expect(row.summary).toContain(
      "POS cash-shortage production policy readiness review is certified",
    );
    expect(row.activationAuthorized).toBe(false);
  });

  it("builds partial production policy readiness review evidence row from status-line counts", () => {
    const result = evaluatePosCashShortageProductionPolicyReadinessPreflight({
      evidence: validEvidence({
        reviewThreshold: "10000",
        highThreshold: "2000",
      }),
      policyServiceSourceText: policyServiceSource(),
      batchServiceSourceText: batchServiceSource(),
      runnerInputSourceText: runnerInputSource(),
    });

    const statusLine =
      describePosCashShortageProductionPolicyReadinessReviewArtifactStatusLine(
        result,
      );
    const row =
      buildPosCashShortageProductionPolicyReadinessReviewEvidenceRow(result);

    expect(result.missingRequirements).toContain("threshold_ordering_valid");
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
  });
  it("blocks draft or enforce-mode policy evidence", () => {
    const draft = validEvidence({
      approvalStatus: "draft",
      approvedAt: null,
      approvedById: null,
    });
    const enforce = validEvidence({ mode: "enforce" as "observe" });

    expect(
      evaluatePosCashShortageProductionPolicyReadinessPreflight({
        evidence: draft,
        policyServiceSourceText: policyServiceSource(),
        batchServiceSourceText: batchServiceSource(),
        runnerInputSourceText: runnerInputSource(),
      }).missingRequirements,
    ).toEqual(expect.arrayContaining(["approved_policy_contract"]));
    expect(
      evaluatePosCashShortageProductionPolicyReadinessPreflight({
        evidence: enforce,
        policyServiceSourceText: policyServiceSource(),
        batchServiceSourceText: batchServiceSource(),
        runnerInputSourceText: runnerInputSource(),
      }).missingRequirements,
    ).toEqual(expect.arrayContaining(["observe_only_mode"]));
  });

  it("blocks ineffective or expired policy evidence", () => {
    const future = validEvidence({
      effectiveFrom: "2026-07-29T00:00:00.000Z",
      effectiveTo: null,
    });
    const expired = validEvidence({
      effectiveFrom: "2026-07-01T00:00:00.000Z",
      effectiveTo: "2026-07-28T12:00:00.000Z",
    });

    for (const evidence of [future, expired]) {
      const result = evaluatePosCashShortageProductionPolicyReadinessPreflight({
        evidence,
        policyServiceSourceText: policyServiceSource(),
        batchServiceSourceText: batchServiceSource(),
        runnerInputSourceText: runnerInputSource(),
      });

      expect(result.status).toBe("blocked");
      expect(result.missingRequirements).toContain(
        "effective_window_covers_check_time",
      );
    }
  });

  it("blocks invalid threshold ordering", () => {
    const result = evaluatePosCashShortageProductionPolicyReadinessPreflight({
      evidence: validEvidence({
        reviewThreshold: "10000",
        highThreshold: "2000",
      }),
      policyServiceSourceText: policyServiceSource(),
      batchServiceSourceText: batchServiceSource(),
      runnerInputSourceText: runnerInputSource(),
    });

    expect(result.status).toBe("blocked");
    expect(result.missingRequirements).toContain("threshold_ordering_valid");
  });

  it("blocks policy hash drift", () => {
    const evidence = validEvidence();
    evidence.policyHash = "sha256:wrong";
    evidence.approvalEvent.documentHash = "sha256:wrong";
    evidence.approvalEvent.payload.policyHash = "sha256:wrong";

    const result = evaluatePosCashShortageProductionPolicyReadinessPreflight({
      evidence,
      policyServiceSourceText: policyServiceSource(),
      batchServiceSourceText: batchServiceSource(),
      runnerInputSourceText: runnerInputSource(),
    });

    expect(result.status).toBe("blocked");
    expect(result.missingRequirements).toEqual(
      expect.arrayContaining(["policy_hash_matches", "approval_event_binding"]),
    );
  });

  it("blocks approval events not bound to the approved policy", () => {
    const evidence = validEvidence();
    evidence.approvalEvent.sourceId = "other-policy";

    const result = evaluatePosCashShortageProductionPolicyReadinessPreflight({
      evidence,
      policyServiceSourceText: policyServiceSource(),
      batchServiceSourceText: batchServiceSource(),
      runnerInputSourceText: runnerInputSource(),
    });

    expect(result.status).toBe("blocked");
    expect(result.missingRequirements).toContain("approval_event_binding");
  });

  it("requires source guards for resolver, batch policy resolution, and runner prerequisite", () => {
    const result = evaluatePosCashShortageProductionPolicyReadinessPreflight({
      evidence: validEvidence(),
      policyServiceSourceText: "",
      batchServiceSourceText: "",
      runnerInputSourceText: "",
    });

    expect(result.status).toBe("blocked");
    expect(result.missingRequirements).toEqual(
      expect.arrayContaining([
        "resolver_verifies_policy_hash",
        "resolver_verifies_approval_event",
        "batch_resolves_policy_before_evaluation",
        "runner_requires_policy_prerequisite",
      ]),
    );
  });

  it("does not add default policy, worker, scheduler, route, action, incident command, or database behavior", () => {
    const source = fs.readFileSync(
      path.join(
        ROOT,
        "services/leakage/pos-cash-shortage-production-policy-readiness-preflight.ts",
      ),
      "utf8",
    );

    expect(source).not.toMatch(
      /CHECK_RUNNERS|scheduleWorkflow|router|createSafeAction/i,
    );
    expect(source).not.toMatch(
      /loadPosShiftCashShortageBatch|runDormantPosShiftCashShortage/i,
    );
    expect(source).not.toMatch(
      /recordWorkflowAssuranceIncident|transitionWorkflowAssuranceIncident/i,
    );
    expect(source).not.toMatch(/db\.|prisma|createMany|upsert|seed/i);
  });
});

function validEvidence(
  overrides: Partial<CashShortagePolicyV1> = {},
): PosCashShortageProductionPolicyReadinessEvidence {
  const policy: CashShortagePolicyV1 = {
    kind: POS_SHIFT_CASH_SHORTAGE_POLICY_KIND,
    policyId: "policy-1",
    version: 1,
    currency: "XAF",
    reviewThreshold: "2000",
    highThreshold: "10000",
    minorUnitScale: 0,
    roundingMode: "HALF_UP",
    effectiveFrom: "2026-07-01T00:00:00.000Z",
    effectiveTo: null,
    approvalStatus: "approved",
    approvedAt: "2026-07-27T10:00:00.000Z",
    approvedById: "checker-1",
    mode: "observe",
    ...overrides,
  };
  const policyHash = hashBusinessPayload(policy);
  const payload = {
    evidenceVersion: 1 as const,
    organizationId: "org-1",
    policy,
    policyHash,
  };

  return {
    policy,
    policyHash,
    effectiveAt: EFFECTIVE_AT,
    approvalEvent: {
      eventType: "cash_shortage.policy.approved",
      schemaVersion: 1,
      status: "APPLIED",
      sourceType: "MANUAL",
      sourceId: policy.policyId,
      actorId: policy.approvedById ?? "checker-1",
      documentHash: policyHash,
      payload,
      payloadHash: hashBusinessPayload(payload),
    },
  };
}

function policyServiceSource() {
  return fs.readFileSync(
    path.join(ROOT, "services/leakage/cash-shortage-policy.service.ts"),
    "utf8",
  );
}

function batchServiceSource() {
  return fs.readFileSync(
    path.join(
      ROOT,
      "services/leakage/pos-shift-cash-shortage-batch.service.ts",
    ),
    "utf8",
  );
}

function runnerInputSource() {
  return fs.readFileSync(
    path.join(ROOT, "services/leakage/pos-shift-cash-shortage-runner-input.ts"),
    "utf8",
  );
}
