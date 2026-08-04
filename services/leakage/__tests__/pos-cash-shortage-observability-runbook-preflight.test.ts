import fs from "fs";
import path from "path";

import { INITIAL_WORKFLOW_ASSURANCE_CHECK_DEFINITIONS } from "@/services/assurance/assurance-registry-contracts";

import {
  composePosCashShortageObservabilityRunbookActivationEvidence,
  evaluatePosCashShortageObservabilityRunbookPreflight,
  POS_CASH_SHORTAGE_OBSERVABILITY_RUNBOOK_REQUIREMENTS,
  type PosCashShortageObservabilityRunbookPreflightResult,
} from "../pos-cash-shortage-observability-runbook-preflight";
import {
  evaluatePosCashShortageProductionActivationPreflight,
  type PosCashShortageProductionActivationEvidence,
} from "../pos-cash-shortage-production-activation-preflight";
import { POS_SHIFT_CASH_SHORTAGE_CHECK_KEY } from "../pos-shift-cash-shortage-contracts";

const ROOT = process.cwd();

describe("POS cash-shortage observability runbook preflight", () => {
  it("certifies the current observability runbook and source health signals", () => {
    const result = currentPreflight();

    expect(result).toEqual({
      version: 1,
      status: "certified",
      observabilityRunbookCertified: true,
      activationAuthorized: false,
      satisfiedRequirements: [...POS_CASH_SHORTAGE_OBSERVABILITY_RUNBOOK_REQUIREMENTS],
      missingRequirements: [],
    });
  });

  it("blocks runbooks that omit engine health signals", () => {
    const result = evaluatePosCashShortageObservabilityRunbookPreflight({
      ...currentInput(),
      observabilityRunbookText: currentRunbook()
        .replace(/staleRunningCount/g, "oldRunningCount")
        .replace(/failedAlertCount/g, "badAlertCount"),
    });

    expect(result.status).toBe("blocked");
    expect(result.observabilityRunbookCertified).toBe(false);
    expect(result.missingRequirements).toContain("engine_health_signals");
  });

  it("blocks runbooks that omit checkpoint and stop-condition signals", () => {
    const result = evaluatePosCashShortageObservabilityRunbookPreflight({
      ...currentInput(),
      observabilityRunbookText: currentRunbook()
        .replace(/DEAD_LETTERED/g, "TERMINAL_FAILURE")
        .replace(/Checkpoint leases expire repeatedly/g, "Checkpoint leases are ignored"),
    });

    expect(result.status).toBe("blocked");
    expect(result.missingRequirements).toEqual(
      expect.arrayContaining(["checkpoint_health_signals", "stop_conditions"]),
    );
  });

  it("blocks source contracts missing control-tower engine health counters", () => {
    const result = evaluatePosCashShortageObservabilityRunbookPreflight({
      ...currentInput(),
      controlTowerSourceText: currentControlTowerSource()
        .replace(/staleRunningCount/g, "oldRunningCount")
        .replace(/failedAlertCount/g, "badAlertCount"),
    });

    expect(result.status).toBe("blocked");
    expect(result.missingRequirements).toContain("source_control_tower_health");
  });

  it("blocks source contracts missing alert-delivery retry and dead-letter counters", () => {
    const result = evaluatePosCashShortageObservabilityRunbookPreflight({
      ...currentInput(),
      alertDeliverySourceText: currentAlertDeliverySource()
        .replace(/deadLettered/g, "terminalFailures")
        .replace(/workflowAssuranceRetryDelayMs/g, "retryLater"),
    });

    expect(result.status).toBe("blocked");
    expect(result.missingRequirements).toContain("source_alert_delivery_health");
  });

  it("composes observability activation evidence only when the preflight certifies", () => {
    expect(
      composePosCashShortageObservabilityRunbookActivationEvidence({
        preflight: currentPreflight(),
      }),
    ).toEqual({
      observabilityRunbookCertified: true,
      activationAuthorized: false,
      preflightCertified: true,
      missingRequirements: [],
    });

    expect(
      composePosCashShortageObservabilityRunbookActivationEvidence({
        preflight: blockedPreflight(),
      }),
    ).toEqual({
      observabilityRunbookCertified: false,
      activationAuthorized: false,
      preflightCertified: false,
      missingRequirements: ["observability_runbook_preflight"],
    });
  });

  it("satisfies only production observability evidence and keeps activation blocked", () => {
    const observabilityEvidence =
      composePosCashShortageObservabilityRunbookActivationEvidence({
        preflight: currentPreflight(),
      });

    const result = evaluatePosCashShortageProductionActivationPreflight({
      definition: currentDefinition(),
      evidence: {
        ...emptyProductionEvidence(),
        observabilityRunbookCertified:
          observabilityEvidence.observabilityRunbookCertified,
      },
    });

    expect(result.status).toBe("blocked");
    expect(result.canEnableDefinition).toBe(false);
    expect(result.canRunWorker).toBe(false);
    expect(result.satisfiedRequirements).toContain("observability_runbook");
    expect(result.missingRequirements).not.toContain("observability_runbook");
    expect(result.missingRequirements).toEqual(
      expect.arrayContaining([
        "service_activation_marker",
        "release_gate_activation_marker",
        "worker_checkpoint_persistence",
        "scheduler_policy",
        "incident_command_integration",
        "alert_delivery_integration",
        "rollback_plan",
        "owner_security_approval",
      ]),
    );
  });

  it("does not add worker, scheduler, route, action, dispatch, or incident command behavior", () => {
    const source = fs.readFileSync(
      path.join(
        ROOT,
        "services/leakage/pos-cash-shortage-observability-runbook-preflight.ts",
      ),
      "utf8",
    );

    expect(source).not.toMatch(/CHECK_RUNNERS|scheduleWorkflow|router|createSafeAction/i);
    expect(source).not.toMatch(/loadPosShiftCashShortageBatch|runDormantPosShiftCashShortage/i);
    expect(source).not.toMatch(/queueWorkflowAssuranceWebhookDelivery\s*\(/i);
    expect(source).not.toMatch(/dispatchWorkflowAssuranceWebhookAlerts\s*\(/i);
    expect(source).not.toMatch(/resolveWorkflowAssuranceIncident\s*\(/i);
    expect(source).not.toMatch(/db\.|prisma/i);
  });
});

function currentPreflight() {
  return evaluatePosCashShortageObservabilityRunbookPreflight(currentInput());
}

function currentInput() {
  return {
    observabilityRunbookText: currentRunbook(),
    controlTowerSourceText: currentControlTowerSource(),
    alertDeliverySourceText: currentAlertDeliverySource(),
    checkpointPersistenceSourceText: currentCheckpointPersistenceSource(),
    schedulerPolicySourceText: currentSchedulerPolicySource(),
    productionActivationPreflightSourceText: currentProductionPreflightSource(),
  };
}

function currentRunbook() {
  return fs.readFileSync(
    path.join(
      ROOT,
      "what-next/referrals/POS_CASH_SHORTAGE_OBSERVABILITY_RUNBOOK_2026-07-28.md",
    ),
    "utf8",
  );
}

function currentControlTowerSource() {
  return fs.readFileSync(
    path.join(ROOT, "services/assurance/assurance-control-tower.service.ts"),
    "utf8",
  );
}

function currentAlertDeliverySource() {
  return fs.readFileSync(
    path.join(ROOT, "services/assurance/assurance-alert-delivery.service.ts"),
    "utf8",
  );
}

function currentCheckpointPersistenceSource() {
  return fs.readFileSync(
    path.join(
      ROOT,
      "services/leakage/pos-cash-shortage-worker-checkpoint-persistence.service.ts",
    ),
    "utf8",
  );
}

function currentSchedulerPolicySource() {
  return fs.readFileSync(
    path.join(ROOT, "services/leakage/pos-cash-shortage-scheduler-policy-preflight.ts"),
    "utf8",
  );
}

function currentProductionPreflightSource() {
  return fs.readFileSync(
    path.join(ROOT, "services/leakage/pos-cash-shortage-production-activation-preflight.ts"),
    "utf8",
  );
}

function blockedPreflight(): PosCashShortageObservabilityRunbookPreflightResult {
  return {
    version: 1,
    status: "blocked",
    observabilityRunbookCertified: false,
    activationAuthorized: false,
    satisfiedRequirements: [],
    missingRequirements: ["engine_health_signals"],
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
