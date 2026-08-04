import fs from "fs";
import path from "path";

import { INITIAL_WORKFLOW_ASSURANCE_CHECK_DEFINITIONS } from "@/services/assurance/assurance-registry-contracts";

import {
  composePosCashShortageActivationMarkerActivationEvidence,
  evaluatePosCashShortageActivationMarkerPreflight,
  type PosCashShortageActivationMarkerEvidence,
} from "../pos-cash-shortage-activation-marker-preflight";
import {
  evaluatePosCashShortageProductionActivationPreflight,
  type PosCashShortageProductionActivationEvidence,
} from "../pos-cash-shortage-production-activation-preflight";
import {
  POS_SHIFT_CASH_SHORTAGE_CHECK_KEY,
  POS_SHIFT_CASH_SHORTAGE_DEFINITION_VERSION,
} from "../pos-shift-cash-shortage-contracts";

const ROOT = process.cwd();

describe("POS cash-shortage activation marker preflight", () => {
  it("blocks the current live disabled definition even when marker fixture evidence is supplied", () => {
    const result = evaluatePosCashShortageActivationMarkerPreflight({
      definition: currentDefinition(),
      markerEvidence: validEvidence(),
      registryContractSourceText: registryContractSource(),
      releaseGateSourceText: releaseGateSource(),
    });

    expect(result.status).toBe("blocked");
    expect(result.serviceActivationMarkerCertified).toBe(false);
    expect(result.releaseGateActivationMarkerCertified).toBe(false);
    expect(result.missingRequirements).toContain("definition_marker_consistency");
    expect(result.activationAuthorized).toBe(false);
  });

  it("certifies a fixture definition only when both marker paths are release-bound", () => {
    const result = evaluatePosCashShortageActivationMarkerPreflight({
      definition: markerReadyFixtureDefinition(),
      markerEvidence: validEvidence(),
      registryContractSourceText: registryContractSource(),
      releaseGateSourceText: releaseGateSource(),
    });

    expect(result.status).toBe("certified");
    expect(result.serviceActivationMarkerCertified).toBe(true);
    expect(result.releaseGateActivationMarkerCertified).toBe(true);
    expect(result.activationAuthorized).toBe(false);
    expect(result.missingRequirements).toEqual([]);
  });

  it("blocks missing release-gate marker evidence", () => {
    const evidence = validEvidence();
    evidence.releaseGateActivationMarker = null;

    const result = evaluatePosCashShortageActivationMarkerPreflight({
      definition: markerReadyFixtureDefinition(),
      markerEvidence: evidence,
      registryContractSourceText: registryContractSource(),
      releaseGateSourceText: releaseGateSource(),
    });

    expect(result.status).toBe("blocked");
    expect(result.missingRequirements).toEqual(
      expect.arrayContaining([
        "release_gate_activation_marker_present",
        "certified_marker_decisions",
      ]),
    );
  });

  it("blocks uncertified marker decisions", () => {
    const evidence = validEvidence();
    evidence.serviceActivationMarker!.certified = false;

    const result = evaluatePosCashShortageActivationMarkerPreflight({
      definition: markerReadyFixtureDefinition(),
      markerEvidence: evidence,
      registryContractSourceText: registryContractSource(),
      releaseGateSourceText: releaseGateSource(),
    });

    expect(result.status).toBe("blocked");
    expect(result.missingRequirements).toContain("certified_marker_decisions");
  });

  it("blocks mismatched release binding hashes", () => {
    const evidence = validEvidence();
    evidence.releaseGateActivationMarker!.releaseBindingHash =
      "hash://release/other-pos-cash-shortage";

    const result = evaluatePosCashShortageActivationMarkerPreflight({
      definition: markerReadyFixtureDefinition(),
      markerEvidence: evidence,
      registryContractSourceText: registryContractSource(),
      releaseGateSourceText: releaseGateSource(),
    });

    expect(result.status).toBe("blocked");
    expect(result.missingRequirements).toContain("shared_release_binding");
  });

  it("blocks non-distinct marker references", () => {
    const evidence = validEvidence();
    evidence.releaseGateActivationMarker!.evidenceReference =
      evidence.serviceActivationMarker!.evidenceReference;

    const result = evaluatePosCashShortageActivationMarkerPreflight({
      definition: markerReadyFixtureDefinition(),
      markerEvidence: evidence,
      registryContractSourceText: registryContractSource(),
      releaseGateSourceText: releaseGateSource(),
    });

    expect(result.status).toBe("blocked");
    expect(result.missingRequirements).toContain("distinct_marker_evidence_references");
  });

  it("requires the registry contract and release gate ratchets", () => {
    const result = evaluatePosCashShortageActivationMarkerPreflight({
      definition: markerReadyFixtureDefinition(),
      markerEvidence: validEvidence(),
      registryContractSourceText: "",
      releaseGateSourceText: "",
    });

    expect(result.status).toBe("blocked");
    expect(result.missingRequirements).toEqual(
      expect.arrayContaining(["registry_contract_ratchet", "release_gate_ratchet"]),
    );
  });

  it("composes service and release marker activation evidence only when certified", () => {
    const certified = evaluatePosCashShortageActivationMarkerPreflight({
      definition: markerReadyFixtureDefinition(),
      markerEvidence: validEvidence(),
      registryContractSourceText: registryContractSource(),
      releaseGateSourceText: releaseGateSource(),
    });
    const blocked = evaluatePosCashShortageActivationMarkerPreflight({
      definition: currentDefinition(),
      markerEvidence: validEvidence(),
      registryContractSourceText: registryContractSource(),
      releaseGateSourceText: releaseGateSource(),
    });

    expect(
      composePosCashShortageActivationMarkerActivationEvidence({
        preflight: certified,
      }),
    ).toEqual({
      serviceActivationCertified: true,
      releaseGateActivationCertified: true,
      activationAuthorized: false,
      preflightCertified: true,
      missingRequirements: [],
    });
    expect(
      composePosCashShortageActivationMarkerActivationEvidence({
        preflight: blocked,
      }),
    ).toEqual({
      serviceActivationCertified: false,
      releaseGateActivationCertified: false,
      activationAuthorized: false,
      preflightCertified: false,
      missingRequirements: ["activation_marker_preflight"],
    });
  });

  it("can satisfy only service and release markers in the production activation preflight", () => {
    const preflight = evaluatePosCashShortageActivationMarkerPreflight({
      definition: markerReadyFixtureDefinition(),
      markerEvidence: validEvidence(),
      registryContractSourceText: registryContractSource(),
      releaseGateSourceText: releaseGateSource(),
    });
    const markerEvidence = composePosCashShortageActivationMarkerActivationEvidence({
      preflight,
    });

    const result = evaluatePosCashShortageProductionActivationPreflight({
      definition: markerReadyFixtureDefinition(),
      evidence: {
        ...emptyProductionEvidence(),
        serviceActivationCertified: markerEvidence.serviceActivationCertified,
        releaseGateActivationCertified:
          markerEvidence.releaseGateActivationCertified,
      },
    });

    expect(result.status).toBe("blocked");
    expect(result.satisfiedRequirements).toEqual([
      "definition_identity",
      "service_activation_marker",
      "release_gate_activation_marker",
    ]);
    expect(result.missingRequirements).not.toContain("service_activation_marker");
    expect(result.missingRequirements).not.toContain("release_gate_activation_marker");
    expect(result.canRunWorker).toBe(false);
  });

  it("does not add worker, scheduler, route, action, incident command, or database behavior", () => {
    const source = fs.readFileSync(
      path.join(
        ROOT,
        "services/leakage/pos-cash-shortage-activation-marker-preflight.ts",
      ),
      "utf8",
    );

    expect(source).not.toMatch(/CHECK_RUNNERS|scheduleWorkflow|router|createSafeAction/i);
    expect(source).not.toMatch(/loadPosShiftCashShortageBatch|runDormantPosShiftCashShortage/i);
    expect(source).not.toMatch(/recordWorkflowAssuranceIncident|transitionWorkflowAssuranceIncident/i);
    expect(source).not.toMatch(/db\.|prisma/i);
  });
});

function validEvidence(): PosCashShortageActivationMarkerEvidence {
  return {
    evidenceVersion: "pos-cash-shortage-activation-marker-v1",
    checkKey: POS_SHIFT_CASH_SHORTAGE_CHECK_KEY,
    definitionVersion: POS_SHIFT_CASH_SHORTAGE_DEFINITION_VERSION,
    generatedAt: "2026-07-28T12:00:00.000Z",
    serviceActivationMarker: {
      certified: true,
      markerReference: "marker://service/pos-cash-shortage-production",
      evidenceReference: "evidence://service/pos-cash-shortage-production",
      actorDirectoryId: "directory://person/product-release-owner",
      certifiedAt: "2026-07-28T12:05:00.000Z",
      releaseBindingHash: "hash://release/pos-cash-shortage-production",
    },
    releaseGateActivationMarker: {
      certified: true,
      markerReference: "marker://release-gate/pos-cash-shortage-production",
      evidenceReference: "evidence://release-gate/pos-cash-shortage-production",
      actorDirectoryId: "directory://person/release-gate-owner",
      certifiedAt: "2026-07-28T12:10:00.000Z",
      releaseBindingHash: "hash://release/pos-cash-shortage-production",
    },
  };
}

function markerReadyFixtureDefinition() {
  return {
    ...currentDefinition(),
    enabled: true,
    metadata: {
      ...currentDefinition().metadata,
      productionActivationCertified: true,
    },
  };
}

function currentDefinition() {
  const definition = INITIAL_WORKFLOW_ASSURANCE_CHECK_DEFINITIONS.find(
    (candidate) => candidate.checkKey === POS_SHIFT_CASH_SHORTAGE_CHECK_KEY,
  );
  if (!definition) throw new Error("POS cash-shortage definition missing.");
  return definition;
}

function registryContractSource() {
  return fs.readFileSync(
    path.join(ROOT, "services/assurance/assurance-registry-contracts.ts"),
    "utf8",
  );
}

function releaseGateSource() {
  return fs.readFileSync(
    path.join(ROOT, "scripts/workflow-assurance-release-gate.js"),
    "utf8",
  );
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
