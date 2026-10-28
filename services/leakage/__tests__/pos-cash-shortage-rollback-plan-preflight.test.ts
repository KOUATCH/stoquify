import fs from "fs";
import path from "path";

import { INITIAL_WORKFLOW_ASSURANCE_CHECK_DEFINITIONS } from "@/services/assurance/assurance-registry-contracts";

import {
  composePosCashShortageRollbackPlanActivationEvidence,
  evaluatePosCashShortageRollbackPlanPreflight,
  POS_CASH_SHORTAGE_ROLLBACK_PLAN_REQUIREMENTS,
  type PosCashShortageRollbackPlanPreflightResult,
} from "../pos-cash-shortage-rollback-plan-preflight";
import {
  evaluatePosCashShortageProductionActivationPreflight,
  type PosCashShortageProductionActivationEvidence,
} from "../pos-cash-shortage-production-activation-preflight";
import { POS_SHIFT_CASH_SHORTAGE_CHECK_KEY } from "../pos-shift-cash-shortage-contracts";

const ROOT = process.cwd();

describe("POS cash-shortage rollback plan preflight", () => {
  it("certifies the current rollback runbook and source rollback controls", () => {
    const result = currentPreflight();

    expect(result).toEqual({
      version: 1,
      status: "certified",
      rollbackPlanCertified: true,
      activationAuthorized: false,
      satisfiedRequirements: [...POS_CASH_SHORTAGE_ROLLBACK_PLAN_REQUIREMENTS],
      missingRequirements: [],
    });
  });

  it("blocks runbooks that omit activation-disable instructions", () => {
    const result = evaluatePosCashShortageRollbackPlanPreflight({
      ...currentInput(),
      rollbackRunbookText: currentRunbook()
        .replace(/enabled: false/g, "enabled: true")
        .replace(/metadata\.productionActivationCertified: false/g, "metadata.productionActivationCertified: true"),
    });

    expect(result.status).toBe("blocked");
    expect(result.rollbackPlanCertified).toBe(false);
    expect(result.missingRequirements).toContain("activation_disable_path");
  });

  it("blocks runbooks that allow evidence cleanup or silent incident handling", () => {
    const result = evaluatePosCashShortageRollbackPlanPreflight({
      ...currentInput(),
      rollbackRunbookText: currentRunbook()
        .replace(/Do not delete or rewrite `BusinessEvent`/g, "Archive `BusinessEvent`")
        .replace(/Open incidents remain reviewable evidence/g, "Close incidents after rollback"),
    });

    expect(result.status).toBe("blocked");
    expect(result.missingRequirements).toEqual(
      expect.arrayContaining([
        "evidence_preservation_path",
        "incident_alert_handling_path",
      ]),
    );
  });

  it("blocks source contracts that do not retain the activation-hold ratchet", () => {
    const result = evaluatePosCashShortageRollbackPlanPreflight({
      ...currentInput(),
      registryContractsSourceText: currentRegistryContractsSource()
        .replace(/activationHold/g, "activationMemo")
        .replace(/definition\.metadata\.productionActivationCertified !== true/g, "false"),
    });

    expect(result.status).toBe("blocked");
    expect(result.missingRequirements).toContain("source_activation_hold_ratchet");
  });

  it("blocks checkpoint sources without lease and dead-letter recovery evidence", () => {
    const result = evaluatePosCashShortageRollbackPlanPreflight({
      ...currentInput(),
      checkpointPersistenceSourceText: currentCheckpointPersistenceSource()
        .replace(/leaseToken/g, "workerToken")
        .replace(/DEAD_LETTERED/g, "FAILED_TERMINAL")
        .replace(/deadLetterReason/g, "failureSummary"),
    });

    expect(result.status).toBe("blocked");
    expect(result.missingRequirements).toContain(
      "source_checkpoint_recovery_controls",
    );
  });

  it("composes rollback activation evidence only when the preflight certifies", () => {
    expect(
      composePosCashShortageRollbackPlanActivationEvidence({
        preflight: currentPreflight(),
      }),
    ).toEqual({
      rollbackPlanCertified: true,
      activationAuthorized: false,
      preflightCertified: true,
      missingRequirements: [],
    });

    expect(
      composePosCashShortageRollbackPlanActivationEvidence({
        preflight: blockedPreflight(),
      }),
    ).toEqual({
      rollbackPlanCertified: false,
      activationAuthorized: false,
      preflightCertified: false,
      missingRequirements: ["rollback_plan_preflight"],
    });
  });

  it("satisfies only production rollback evidence and keeps activation blocked", () => {
    const rollbackEvidence = composePosCashShortageRollbackPlanActivationEvidence({
      preflight: currentPreflight(),
    });

    const result = evaluatePosCashShortageProductionActivationPreflight({
      definition: currentDefinition(),
      evidence: {
        ...emptyProductionEvidence(),
        rollbackPlanCertified: rollbackEvidence.rollbackPlanCertified,
      },
    });

    expect(result.status).toBe("blocked");
    expect(result.canEnableDefinition).toBe(false);
    expect(result.canRunWorker).toBe(false);
    expect(result.satisfiedRequirements).toContain("rollback_plan");
    expect(result.missingRequirements).not.toContain("rollback_plan");
    expect(result.missingRequirements).toEqual(
      expect.arrayContaining([
        "service_activation_marker",
        "release_gate_activation_marker",
        "worker_checkpoint_persistence",
        "scheduler_policy",
        "incident_command_integration",
        "alert_delivery_integration",
        "observability_runbook",
        "owner_security_approval",
      ]),
    );
  });

  it("does not add worker, scheduler, route, action, dispatch, or incident command behavior", () => {
    const source = fs.readFileSync(
      path.join(ROOT, "services/leakage/pos-cash-shortage-rollback-plan-preflight.ts"),
      "utf8",
    );

    expect(source).not.toMatch(/CHECK_RUNNERS|scheduleWorkflow|router|createSafeAction/i);
    expect(source).not.toMatch(/loadPosShiftCashShortageBatch|runDormantPosShiftCashShortage/i);
    expect(source).not.toMatch(/queueWorkflowAssuranceWebhookDelivery\s*\(/i);
    expect(source).not.toMatch(/resolveWorkflowAssuranceIncident\s*\(/i);
    expect(source).not.toMatch(/db\.|prisma/i);
  });
});

function currentPreflight() {
  return evaluatePosCashShortageRollbackPlanPreflight(currentInput());
}

function currentInput() {
  return {
    rollbackRunbookText: currentRunbook(),
    registryContractsSourceText: currentRegistryContractsSource(),
    schedulerPolicySourceText: currentSchedulerPolicySource(),
    checkpointPersistenceSourceText: currentCheckpointPersistenceSource(),
    productionActivationPreflightSourceText: currentProductionPreflightSource(),
  };
}

function currentRunbook() {
  return fs.readFileSync(
    path.join(ROOT, "what-next/referrals/POS_CASH_SHORTAGE_ROLLBACK_RUNBOOK_2026-07-28.md"),
    "utf8",
  );
}

function currentRegistryContractsSource() {
  return fs.readFileSync(
    path.join(ROOT, "services/assurance/assurance-registry-contracts.ts"),
    "utf8",
  );
}

function currentSchedulerPolicySource() {
  return fs.readFileSync(
    path.join(ROOT, "services/leakage/pos-cash-shortage-scheduler-policy-preflight.ts"),
    "utf8",
  );
}

function currentCheckpointPersistenceSource() {
  return fs.readFileSync(
    path.join(ROOT, "services/leakage/pos-cash-shortage-worker-checkpoint-persistence.service.ts"),
    "utf8",
  );
}

function currentProductionPreflightSource() {
  return fs.readFileSync(
    path.join(ROOT, "services/leakage/pos-cash-shortage-production-activation-preflight.ts"),
    "utf8",
  );
}

function blockedPreflight(): PosCashShortageRollbackPlanPreflightResult {
  return {
    version: 1,
    status: "blocked",
    rollbackPlanCertified: false,
    activationAuthorized: false,
    satisfiedRequirements: [],
    missingRequirements: ["activation_disable_path"],
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
