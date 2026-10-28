import fs from "fs";
import path from "path";

import { INITIAL_WORKFLOW_ASSURANCE_CHECK_DEFINITIONS } from "@/services/assurance/assurance-registry-contracts";

import {
  evaluatePosCashShortageProductionActivationPreflight,
  type PosCashShortageProductionActivationEvidence,
} from "../pos-cash-shortage-production-activation-preflight";
import {
  evaluatePosCashShortageCheckpointPersistencePreflight,
  type PosCashShortageCheckpointPersistencePreflightResult,
} from "../pos-cash-shortage-worker-checkpoint-persistence-preflight";
import {
  POS_CASH_SHORTAGE_CHECKPOINT_COMMAND_REQUIREMENTS,
  composePosCashShortageCheckpointPersistenceActivationEvidence,
  evaluatePosCashShortageCheckpointCommandPreflight,
  type PosCashShortageCheckpointCommandPreflightResult,
} from "../pos-cash-shortage-worker-checkpoint-persistence-command-preflight";
import { POS_SHIFT_CASH_SHORTAGE_CHECK_KEY } from "../pos-shift-cash-shortage-contracts";

const ROOT = process.cwd();

describe("POS cash-shortage checkpoint persistence command preflight", () => {
  it("certifies the current service-owned checkpoint persistence command source", () => {
    const result = evaluatePosCashShortageCheckpointCommandPreflight({
      serviceSourceText: currentServiceSource(),
    });

    expect(result).toEqual({
      version: 1,
      status: "certified",
      workerCheckpointPersistenceCommandsCertified: true,
      activationAuthorized: false,
      satisfiedRequirements: [...POS_CASH_SHORTAGE_CHECKPOINT_COMMAND_REQUIREMENTS],
      missingRequirements: [],
    });
  });

  it("blocks command sources missing failure and dead-letter persistence", () => {
    const result = evaluatePosCashShortageCheckpointCommandPreflight({
      serviceSourceText: `
        export async function ensurePosCashShortageWorkerCheckpoint() {
          return db.posCashShortageWorkerCheckpoint.upsert({});
        }
        export async function leaseNextPosCashShortageWorkerCheckpoint() {
          return db.posCashShortageWorkerCheckpoint.updateMany({
            where: { leaseOwnerId: null, leaseToken: null, leaseExpiresAt: null },
            data: { status: "LEASED" },
          });
        }
        export async function advancePersistedPosCashShortageWorkerCheckpoint() {}
        function dbStatusFromTransition() {
          return ["PENDING", "LEASED", "RETRY_SCHEDULED", "COMPLETED"];
        }
      `,
    });

    expect(result.status).toBe("blocked");
    expect(result.workerCheckpointPersistenceCommandsCertified).toBe(false);
    expect(result.missingRequirements).toEqual(
      expect.arrayContaining(["failure_checkpoint_command", "durable_status_mapping"]),
    );
  });

  it("blocks command sources that wire runtime activation behavior", () => {
    const result = evaluatePosCashShortageCheckpointCommandPreflight({
      serviceSourceText: `
        export async function ensurePosCashShortageWorkerCheckpoint() {
          return db.posCashShortageWorkerCheckpoint.upsert({});
        }
        export async function leaseNextPosCashShortageWorkerCheckpoint() {
          return db.posCashShortageWorkerCheckpoint.updateMany({
            where: { leaseOwnerId: null, leaseToken: null, leaseExpiresAt: null },
            data: { status: "LEASED" },
          });
        }
        export async function advancePersistedPosCashShortageWorkerCheckpoint() {}
        export async function recordPersistedPosCashShortageWorkerCheckpointFailure() {}
        function dbStatusFromTransition() {
          return ["PENDING", "LEASED", "RETRY_SCHEDULED", "COMPLETED", "DEAD_LETTERED"];
        }
        CHECK_RUNNERS.set("pos.closed_shift_cash_shortage.review", async () => {});
      `,
    });

    expect(result.status).toBe("blocked");
    expect(result.missingRequirements).toContain("no_runtime_activation");
  });

  it("composes checkpoint persistence activation evidence only when schema and commands certify", () => {
    const schemaPreflight = currentSchemaPreflight();
    const commandPreflight = evaluatePosCashShortageCheckpointCommandPreflight({
      serviceSourceText: currentServiceSource(),
    });

    const evidence = composePosCashShortageCheckpointPersistenceActivationEvidence({
      schemaPreflight,
      commandPreflight,
    });

    expect(evidence).toEqual({
      workerCheckpointPersistenceCertified: true,
      activationAuthorized: false,
      schemaPreflightCertified: true,
      commandPreflightCertified: true,
      missingRequirements: [],
    });
    expect(
      composePosCashShortageCheckpointPersistenceActivationEvidence({
        schemaPreflight: blockedSchemaPreflight(),
        commandPreflight,
      }),
    ).toMatchObject({
      workerCheckpointPersistenceCertified: false,
      activationAuthorized: false,
      missingRequirements: ["schema_preflight"],
    });
    expect(
      composePosCashShortageCheckpointPersistenceActivationEvidence({
        schemaPreflight,
        commandPreflight: blockedCommandPreflight(),
      }),
    ).toMatchObject({
      workerCheckpointPersistenceCertified: false,
      activationAuthorized: false,
      missingRequirements: ["command_preflight"],
    });
  });

  it("satisfies only the production checkpoint-persistence evidence and keeps activation blocked", () => {
    const checkpointEvidence = composePosCashShortageCheckpointPersistenceActivationEvidence({
      schemaPreflight: currentSchemaPreflight(),
      commandPreflight: evaluatePosCashShortageCheckpointCommandPreflight({
        serviceSourceText: currentServiceSource(),
      }),
    });

    const result = evaluatePosCashShortageProductionActivationPreflight({
      definition: currentDefinition(),
      evidence: {
        ...emptyProductionEvidence(),
        workerCheckpointPersistenceCertified:
          checkpointEvidence.workerCheckpointPersistenceCertified,
      },
    });

    expect(result.status).toBe("blocked");
    expect(result.canEnableDefinition).toBe(false);
    expect(result.canRunWorker).toBe(false);
    expect(result.satisfiedRequirements).toContain("worker_checkpoint_persistence");
    expect(result.missingRequirements).not.toContain("worker_checkpoint_persistence");
    expect(result.missingRequirements).toEqual(
      expect.arrayContaining([
        "service_activation_marker",
        "release_gate_activation_marker",
        "scheduler_policy",
        "incident_command_integration",
        "alert_delivery_integration",
        "rollback_plan",
        "observability_runbook",
        "owner_security_approval",
      ]),
    );
  });

  it("does not add worker, scheduler, route, action, incident command, or batch execution", () => {
    const source = fs.readFileSync(
      path.join(
        ROOT,
        "services/leakage/pos-cash-shortage-worker-checkpoint-persistence-command-preflight.ts",
      ),
      "utf8",
    );

    expect(source).not.toMatch(/CHECK_RUNNERS|scheduleWorkflow|router|createSafeAction/i);
    expect(source).not.toMatch(/recordWorkflowAssuranceIncident|transitionWorkflowAssuranceIncident/i);
    expect(source).not.toMatch(/loadPosShiftCashShortageBatch|runDormantPosShiftCashShortage/i);
  });
});

function currentServiceSource() {
  return fs.readFileSync(
    path.join(
      ROOT,
      "services/leakage/pos-cash-shortage-worker-checkpoint-persistence.service.ts",
    ),
    "utf8",
  );
}

function currentSchemaPreflight() {
  const schemaText = fs.readFileSync(path.join(ROOT, "prisma/schema.prisma"), "utf8");
  return evaluatePosCashShortageCheckpointPersistencePreflight({ schemaText });
}

function blockedSchemaPreflight(): PosCashShortageCheckpointPersistencePreflightResult {
  return {
    version: 1,
    checkKey: POS_SHIFT_CASH_SHORTAGE_CHECK_KEY,
    workerKey: "pos.cash_shortage.review.checkpoint.v1",
    modelName: "PosCashShortageWorkerCheckpoint",
    status: "blocked",
    workerCheckpointPersistenceCertified: false,
    activationAuthorized: false,
    satisfiedRequirements: [],
    missingRequirements: ["dedicated_checkpoint_model"],
  };
}

function blockedCommandPreflight(): PosCashShortageCheckpointCommandPreflightResult {
  return {
    version: 1,
    status: "blocked",
    workerCheckpointPersistenceCommandsCertified: false,
    activationAuthorized: false,
    satisfiedRequirements: [],
    missingRequirements: ["failure_checkpoint_command"],
  };
}

function currentDefinition() {
  const definition = INITIAL_WORKFLOW_ASSURANCE_CHECK_DEFINITIONS.find(
    (candidate) => candidate.checkKey === POS_SHIFT_CASH_SHORTAGE_CHECK_KEY,
  );
  if (!definition) throw new Error("POS cash-shortage definition fixture missing");
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
