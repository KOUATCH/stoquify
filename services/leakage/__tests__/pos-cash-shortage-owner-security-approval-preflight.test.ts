import fs from "fs";
import path from "path";

import { INITIAL_WORKFLOW_ASSURANCE_CHECK_DEFINITIONS } from "@/services/assurance/assurance-registry-contracts";

import {
  composePosCashShortageOwnerSecurityApprovalActivationEvidence,
  evaluatePosCashShortageOwnerSecurityApprovalPreflight,
  type PosCashShortageOwnerSecurityApprovalEvidence,
} from "../pos-cash-shortage-owner-security-approval-preflight";
import {
  evaluatePosCashShortageProductionActivationPreflight,
  type PosCashShortageProductionActivationEvidence,
} from "../pos-cash-shortage-production-activation-preflight";
import {
  POS_SHIFT_CASH_SHORTAGE_CHECK_KEY,
  POS_SHIFT_CASH_SHORTAGE_DEFINITION_VERSION,
} from "../pos-shift-cash-shortage-contracts";

const ROOT = process.cwd();
const NOW = "2026-07-28T12:00:00.000Z";

describe("POS cash-shortage owner/security approval preflight", () => {
  it("certifies valid distinct, current, release-bound owner and security approvals", () => {
    const result = evaluatePosCashShortageOwnerSecurityApprovalPreflight({
      approvalEvidence: validEvidence(),
      productionActivationPreflightSourceText: productionPreflightSource(),
      now: NOW,
    });

    expect(result.status).toBe("certified");
    expect(result.ownerSecurityApprovalCertified).toBe(true);
    expect(result.activationAuthorized).toBe(false);
    expect(result.missingRequirements).toEqual([]);
  });

  it("blocks absent live approval evidence", () => {
    const result = evaluatePosCashShortageOwnerSecurityApprovalPreflight({
      approvalEvidence: null,
      productionActivationPreflightSourceText: productionPreflightSource(),
      now: NOW,
    });

    expect(result.status).toBe("blocked");
    expect(result.ownerSecurityApprovalCertified).toBe(false);
    expect(result.missingRequirements).toEqual(
      expect.arrayContaining([
        "approval_evidence_identity",
        "product_approval_present",
        "security_approval_present",
        "approved_decisions",
      ]),
    );
  });

  it("blocks rejected approvals", () => {
    const evidence = validEvidence();
    evidence.securityApproval!.decision = "REJECTED";

    const result = evaluatePosCashShortageOwnerSecurityApprovalPreflight({
      approvalEvidence: evidence,
      productionActivationPreflightSourceText: productionPreflightSource(),
      now: NOW,
    });

    expect(result.status).toBe("blocked");
    expect(result.missingRequirements).toContain("approved_decisions");
  });

  it("blocks product and security approvals from the same actor", () => {
    const evidence = validEvidence();
    evidence.securityApproval!.actorDirectoryId =
      evidence.productApproval!.actorDirectoryId;

    const result = evaluatePosCashShortageOwnerSecurityApprovalPreflight({
      approvalEvidence: evidence,
      productionActivationPreflightSourceText: productionPreflightSource(),
      now: NOW,
    });

    expect(result.status).toBe("blocked");
    expect(result.missingRequirements).toContain("distinct_product_security_actors");
  });

  it("blocks expired approvals", () => {
    const evidence = validEvidence();
    evidence.productApproval!.expiresAt = "2026-07-28T11:59:59.000Z";

    const result = evaluatePosCashShortageOwnerSecurityApprovalPreflight({
      approvalEvidence: evidence,
      productionActivationPreflightSourceText: productionPreflightSource(),
      now: NOW,
    });

    expect(result.status).toBe("blocked");
    expect(result.missingRequirements).toContain("bounded_validity_window");
  });

  it("blocks synthetic or test-only identities", () => {
    const evidence = validEvidence();
    evidence.productApproval!.actorDirectoryId = "directory://person/test-owner";

    const result = evaluatePosCashShortageOwnerSecurityApprovalPreflight({
      approvalEvidence: evidence,
      productionActivationPreflightSourceText: productionPreflightSource(),
      now: NOW,
    });

    expect(result.status).toBe("blocked");
    expect(result.missingRequirements).toContain("no_synthetic_or_test_only_identity");
  });

  it("blocks mismatched release binding hashes", () => {
    const evidence = validEvidence();
    evidence.securityApproval!.releaseBindingHash = "hash://release/other";

    const result = evaluatePosCashShortageOwnerSecurityApprovalPreflight({
      approvalEvidence: evidence,
      productionActivationPreflightSourceText: productionPreflightSource(),
      now: NOW,
    });

    expect(result.status).toBe("blocked");
    expect(result.missingRequirements).toContain("release_binding");
  });

  it("composes activation evidence only when the preflight certifies", () => {
    const certified = evaluatePosCashShortageOwnerSecurityApprovalPreflight({
      approvalEvidence: validEvidence(),
      productionActivationPreflightSourceText: productionPreflightSource(),
      now: NOW,
    });
    const blocked = evaluatePosCashShortageOwnerSecurityApprovalPreflight({
      approvalEvidence: null,
      productionActivationPreflightSourceText: productionPreflightSource(),
      now: NOW,
    });

    expect(
      composePosCashShortageOwnerSecurityApprovalActivationEvidence({
        preflight: certified,
      }),
    ).toEqual({
      ownerSecurityApprovalCertified: true,
      activationAuthorized: false,
      preflightCertified: true,
      missingRequirements: [],
    });
    expect(
      composePosCashShortageOwnerSecurityApprovalActivationEvidence({
        preflight: blocked,
      }),
    ).toEqual({
      ownerSecurityApprovalCertified: false,
      activationAuthorized: false,
      preflightCertified: false,
      missingRequirements: ["owner_security_approval_preflight"],
    });
  });

  it("can satisfy only owner/security approval in the production activation preflight", () => {
    const certified = evaluatePosCashShortageOwnerSecurityApprovalPreflight({
      approvalEvidence: validEvidence(),
      productionActivationPreflightSourceText: productionPreflightSource(),
      now: NOW,
    });
    const composed = composePosCashShortageOwnerSecurityApprovalActivationEvidence({
      preflight: certified,
    });

    const result = evaluatePosCashShortageProductionActivationPreflight({
      definition: currentDefinition(),
      evidence: {
        ...emptyProductionEvidence(),
        ownerSecurityApprovalCertified: composed.ownerSecurityApprovalCertified,
      },
    });

    expect(result.status).toBe("blocked");
    expect(result.satisfiedRequirements).toEqual([
      "definition_identity",
      "owner_security_approval",
    ]);
    expect(result.missingRequirements).not.toContain("owner_security_approval");
    expect(result.canRunWorker).toBe(false);
  });

  it("does not add worker, scheduler, route, action, incident command, or database behavior", () => {
    const source = fs.readFileSync(
      path.join(
        ROOT,
        "services/leakage/pos-cash-shortage-owner-security-approval-preflight.ts",
      ),
      "utf8",
    );

    expect(source).not.toMatch(/CHECK_RUNNERS|scheduleWorkflow|router|createSafeAction/i);
    expect(source).not.toMatch(/loadPosShiftCashShortageBatch|runDormantPosShiftCashShortage/i);
    expect(source).not.toMatch(/recordWorkflowAssuranceIncident|transitionWorkflowAssuranceIncident/i);
    expect(source).not.toMatch(/db\.|prisma/i);
  });
});

function validEvidence(): PosCashShortageOwnerSecurityApprovalEvidence {
  return {
    evidenceVersion: "pos-cash-shortage-owner-security-approval-v1",
    checkKey: POS_SHIFT_CASH_SHORTAGE_CHECK_KEY,
    definitionVersion: POS_SHIFT_CASH_SHORTAGE_DEFINITION_VERSION,
    generatedAt: NOW,
    releaseBinding: {
      checkKey: POS_SHIFT_CASH_SHORTAGE_CHECK_KEY,
      definitionVersion: POS_SHIFT_CASH_SHORTAGE_DEFINITION_VERSION,
      activationRunbookReference: "runbook://pos-cash-shortage/activation",
      rollbackRunbookReference: "runbook://pos-cash-shortage/rollback",
      observabilityRunbookReference: "runbook://pos-cash-shortage/observability",
    },
    productApproval: {
      decision: "APPROVED",
      actorDirectoryId: "directory://person/product-owner",
      approvalReference: "approval://product/pos-cash-shortage-2026-07-28",
      decidedAt: "2026-07-28T10:00:00.000Z",
      expiresAt: "2026-08-04T10:00:00.000Z",
      evidenceReference: "evidence://approval/product/pos-cash-shortage",
      releaseBindingHash: "hash://release/pos-cash-shortage-owner-security",
    },
    securityApproval: {
      decision: "APPROVED",
      actorDirectoryId: "directory://person/security-owner",
      approvalReference: "approval://security/pos-cash-shortage-2026-07-28",
      decidedAt: "2026-07-28T10:15:00.000Z",
      expiresAt: "2026-08-04T10:15:00.000Z",
      evidenceReference: "evidence://approval/security/pos-cash-shortage",
      releaseBindingHash: "hash://release/pos-cash-shortage-owner-security",
    },
  };
}

function productionPreflightSource() {
  return fs.readFileSync(
    path.join(ROOT, "services/leakage/pos-cash-shortage-production-activation-preflight.ts"),
    "utf8",
  );
}

function currentDefinition() {
  const definition = INITIAL_WORKFLOW_ASSURANCE_CHECK_DEFINITIONS.find(
    (candidate) => candidate.checkKey === POS_SHIFT_CASH_SHORTAGE_CHECK_KEY,
  );
  if (!definition) throw new Error("POS cash-shortage definition missing.");
  return definition;
}

function emptyProductionEvidence(): PosCashShortageProductionActivationEvidence {
  return {
    serviceActivationCertified: false,
    releaseGateActivationCertified: false,
    workerCheckpointPersistenceCertified: false,
    schedulerPolicyCertified: false,
    incidentCommandIntegrationCertified: false,
    alertDeliveryIntegrationCertified: false,
    rollbackPlanCertified: false,
    observabilityRunbookCertified: false,
    ownerSecurityApprovalCertified: false,
    browserCertificationGateCertified: false,
    productionPolicyReadinessCertified: false,
    sourceOwnedResolutionReadinessCertified: false,
  };
}
