import fs from "fs";
import path from "path";

import { INITIAL_WORKFLOW_ASSURANCE_CHECK_DEFINITIONS } from "@/services/assurance/assurance-registry-contracts";

import {
  composePosCashShortageIncidentCommandIntegrationActivationEvidence,
  evaluatePosCashShortageIncidentCommandIntegrationPreflight,
  POS_CASH_SHORTAGE_INCIDENT_COMMAND_REQUIREMENTS,
  type PosCashShortageIncidentCommandIntegrationPreflightResult,
} from "../pos-cash-shortage-incident-command-integration-preflight";
import {
  evaluatePosCashShortageProductionActivationPreflight,
  type PosCashShortageProductionActivationEvidence,
} from "../pos-cash-shortage-production-activation-preflight";
import { POS_SHIFT_CASH_SHORTAGE_CHECK_KEY } from "../pos-shift-cash-shortage-contracts";

const ROOT = process.cwd();

describe("POS cash-shortage incident command integration preflight", () => {
  it("certifies the current generic incident command and POS policy representation", () => {
    const result = currentPreflight();

    expect(result).toEqual({
      version: 1,
      status: "certified",
      incidentCommandIntegrationCertified: true,
      activationAuthorized: false,
      satisfiedRequirements: [...POS_CASH_SHORTAGE_INCIDENT_COMMAND_REQUIREMENTS],
      missingRequirements: [],
    });
  });

  it("blocks generic command sources without a current source-hash guard", () => {
    const result = evaluatePosCashShortageIncidentCommandIntegrationPreflight({
      assuranceIncidentContractsSourceText: currentContractsSource().replace(
        /currentSourceHash/g,
        "priorSourceHash",
      ),
      assuranceIncidentServiceSourceText: currentServiceSource().replace(
        /assertCurrentIncidentSourceHash/g,
        "assertPriorIncidentSourceHash",
      ),
      posIncidentPolicySourceText: currentPolicySource(),
    });

    expect(result.status).toBe("blocked");
    expect(result.incidentCommandIntegrationCertified).toBe(false);
    expect(result.missingRequirements).toContain("generic_current_source_hash_guard");
  });

  it("blocks POS policies without independent reviewer and resolution evidence hash guards", () => {
    const result = evaluatePosCashShortageIncidentCommandIntegrationPreflight({
      assuranceIncidentContractsSourceText: currentContractsSource(),
      assuranceIncidentServiceSourceText: currentServiceSource(),
      posIncidentPolicySourceText: currentPolicySource()
        .replace(/actorId === evidence\.cashierId/g, "actorId === evidence.supervisorId")
        .replace(/actorId === evidence\.closerId/g, "actorId === evidence.reviewerId")
        .replace(/resolutionEvidenceHash/g, "reviewPacketHash"),
    });

    expect(result.status).toBe("blocked");
    expect(result.missingRequirements).toEqual(
      expect.arrayContaining([
        "pos_policy_independent_reviewer",
        "pos_policy_resolution_evidence_hash",
      ]),
    );
  });

  it("blocks POS policies that directly invoke generic incident commands", () => {
    const result = evaluatePosCashShortageIncidentCommandIntegrationPreflight({
      assuranceIncidentContractsSourceText: currentContractsSource(),
      assuranceIncidentServiceSourceText: currentServiceSource(),
      posIncidentPolicySourceText: `${currentPolicySource()}
        async function unsafeInvoke(input: unknown) {
          return resolveWorkflowAssuranceIncident(input);
        }
      `,
    });

    expect(result.status).toBe("blocked");
    expect(result.missingRequirements).toContain(
      "no_direct_incident_command_invocation",
    );
  });

  it("composes incident command activation evidence only when the preflight certifies", () => {
    expect(
      composePosCashShortageIncidentCommandIntegrationActivationEvidence({
        preflight: currentPreflight(),
      }),
    ).toEqual({
      incidentCommandIntegrationCertified: true,
      activationAuthorized: false,
      preflightCertified: true,
      missingRequirements: [],
    });

    expect(
      composePosCashShortageIncidentCommandIntegrationActivationEvidence({
        preflight: blockedPreflight(),
      }),
    ).toEqual({
      incidentCommandIntegrationCertified: false,
      activationAuthorized: false,
      preflightCertified: false,
      missingRequirements: ["incident_command_integration_preflight"],
    });
  });

  it("satisfies only production incident-command evidence and keeps activation blocked", () => {
    const incidentEvidence =
      composePosCashShortageIncidentCommandIntegrationActivationEvidence({
        preflight: currentPreflight(),
      });

    const result = evaluatePosCashShortageProductionActivationPreflight({
      definition: currentDefinition(),
      evidence: {
        ...emptyProductionEvidence(),
        incidentCommandIntegrationCertified:
          incidentEvidence.incidentCommandIntegrationCertified,
      },
    });

    expect(result.status).toBe("blocked");
    expect(result.canEnableDefinition).toBe(false);
    expect(result.canRunWorker).toBe(false);
    expect(result.satisfiedRequirements).toContain("incident_command_integration");
    expect(result.missingRequirements).not.toContain("incident_command_integration");
    expect(result.missingRequirements).toEqual(
      expect.arrayContaining([
        "service_activation_marker",
        "release_gate_activation_marker",
        "worker_checkpoint_persistence",
        "scheduler_policy",
        "alert_delivery_integration",
        "rollback_plan",
        "observability_runbook",
        "owner_security_approval",
      ]),
    );
  });

  it("does not add worker, scheduler, route, action, incident command invocation, or batch execution", () => {
    const source = fs.readFileSync(
      path.join(
        ROOT,
        "services/leakage/pos-cash-shortage-incident-command-integration-preflight.ts",
      ),
      "utf8",
    );

    expect(source).not.toMatch(/CHECK_RUNNERS|scheduleWorkflow|router|createSafeAction/i);
    expect(source).not.toMatch(/loadPosShiftCashShortageBatch|runDormantPosShiftCashShortage/i);
    expect(source).not.toMatch(/resolveWorkflowAssuranceIncident\s*\(/i);
    expect(source).not.toMatch(/transitionWorkflowAssuranceIncident\s*\(/i);
  });
});

function currentPreflight() {
  return evaluatePosCashShortageIncidentCommandIntegrationPreflight({
    assuranceIncidentContractsSourceText: currentContractsSource(),
    assuranceIncidentServiceSourceText: currentServiceSource(),
    posIncidentPolicySourceText: currentPolicySource(),
  });
}

function currentContractsSource() {
  return fs.readFileSync(
    path.join(ROOT, "services/assurance/assurance-incident-contracts.ts"),
    "utf8",
  );
}

function currentServiceSource() {
  return fs.readFileSync(
    path.join(ROOT, "services/assurance/assurance-incident.service.ts"),
    "utf8",
  );
}

function currentPolicySource() {
  return fs.readFileSync(
    path.join(ROOT, "services/leakage/pos-cash-shortage-incident-lifecycle-policy.ts"),
    "utf8",
  );
}

function blockedPreflight(): PosCashShortageIncidentCommandIntegrationPreflightResult {
  return {
    version: 1,
    status: "blocked",
    incidentCommandIntegrationCertified: false,
    activationAuthorized: false,
    satisfiedRequirements: [],
    missingRequirements: ["generic_current_source_hash_guard"],
  };
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
