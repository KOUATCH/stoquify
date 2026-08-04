import fs from "fs";
import path from "path";

import { INITIAL_WORKFLOW_ASSURANCE_CHECK_DEFINITIONS } from "@/services/assurance/assurance-registry-contracts";

import {
  composePosCashShortageAlertDeliveryIntegrationActivationEvidence,
  evaluatePosCashShortageAlertDeliveryIntegrationPreflight,
  POS_CASH_SHORTAGE_ALERT_DELIVERY_REQUIREMENTS,
  type PosCashShortageAlertDeliveryIntegrationPreflightResult,
} from "../pos-cash-shortage-alert-delivery-integration-preflight";
import {
  evaluatePosCashShortageProductionActivationPreflight,
  type PosCashShortageProductionActivationEvidence,
} from "../pos-cash-shortage-production-activation-preflight";
import { POS_SHIFT_CASH_SHORTAGE_CHECK_KEY } from "../pos-shift-cash-shortage-contracts";

const ROOT = process.cwd();

describe("POS cash-shortage alert delivery integration preflight", () => {
  it("certifies current alert delivery schema and generic assurance alert contracts", () => {
    const result = currentPreflight();

    expect(result).toEqual({
      version: 1,
      status: "certified",
      alertDeliveryIntegrationCertified: true,
      activationAuthorized: false,
      satisfiedRequirements: [...POS_CASH_SHORTAGE_ALERT_DELIVERY_REQUIREMENTS],
      missingRequirements: [],
    });
  });

  it("blocks schemas missing retry and dead-letter delivery fields", () => {
    const result = evaluatePosCashShortageAlertDeliveryIntegrationPreflight({
      ...currentInput(),
      prismaSchemaText: currentSchemaSource()
        .replace(/attemptCount/g, "attemptTotal")
        .replace(/nextAttemptAt/g, "nextRunAt")
        .replace(/DEAD_LETTER/g, "TERMINAL_FAILURE"),
    });

    expect(result.status).toBe("blocked");
    expect(result.alertDeliveryIntegrationCertified).toBe(false);
    expect(result.missingRequirements).toContain("alert_delivery_retry_fields");
  });

  it("blocks incident sources that do not record durable in-app alert events", () => {
    const result = evaluatePosCashShortageAlertDeliveryIntegrationPreflight({
      ...currentInput(),
      assuranceIncidentSourceText: currentIncidentSource()
        .replace(/workflowAssuranceAlertDelivery\.upsert/g, "transientAlertStore.set")
        .replace(/eventType: "alert_recorded"/g, 'eventType: "created"'),
    });

    expect(result.status).toBe("blocked");
    expect(result.missingRequirements).toEqual(
      expect.arrayContaining([
        "incident_in_app_alert_recording",
        "incident_alert_recorded_event",
      ]),
    );
  });

  it("blocks webhook delivery sources without transport readiness and dead-letter controls", () => {
    const result = evaluatePosCashShortageAlertDeliveryIntegrationPreflight({
      ...currentInput(),
      alertDeliverySourceText: currentAlertDeliverySource()
        .replace(/resolveAssuranceAlertTransportReadiness/g, "resolveUnsafeWebhook")
        .replace(/DEAD_LETTER/g, "FAILED_TERMINAL"),
    });

    expect(result.status).toBe("blocked");
    expect(result.missingRequirements).toEqual(
      expect.arrayContaining([
        "transport_readiness_guard",
        "webhook_dispatch_retry_dead_letter",
      ]),
    );
  });

  it("blocks recovery sources that lack idempotent dead-letter recovery audit evidence", () => {
    const result = evaluatePosCashShortageAlertDeliveryIntegrationPreflight({
      ...currentInput(),
      alertRecoverySourceText: currentAlertRecoverySource()
        .replace(/requestHash/g, "requestFingerprint")
        .replace(/auditLog\.create/g, "auditTrail.append"),
    });

    expect(result.status).toBe("blocked");
    expect(result.missingRequirements).toEqual(
      expect.arrayContaining([
        "dead_letter_recovery_command",
        "recovery_audit_and_event_history",
      ]),
    );
  });

  it("blocks POS cash-shortage sources that directly wire alert delivery behavior", () => {
    const result = evaluatePosCashShortageAlertDeliveryIntegrationPreflight({
      ...currentInput(),
      posCashShortageSourceText: `${currentPosCashShortageSources()}
        async function unsafeAlert(incidentId: string) {
          return queueWorkflowAssuranceWebhookDelivery({ incidentId, reason: "created" });
        }
      `,
    });

    expect(result.status).toBe("blocked");
    expect(result.missingRequirements).toContain("no_pos_alert_runtime_activation");
  });

  it("composes alert delivery activation evidence only when the preflight certifies", () => {
    expect(
      composePosCashShortageAlertDeliveryIntegrationActivationEvidence({
        preflight: currentPreflight(),
      }),
    ).toEqual({
      alertDeliveryIntegrationCertified: true,
      activationAuthorized: false,
      preflightCertified: true,
      missingRequirements: [],
    });

    expect(
      composePosCashShortageAlertDeliveryIntegrationActivationEvidence({
        preflight: blockedPreflight(),
      }),
    ).toEqual({
      alertDeliveryIntegrationCertified: false,
      activationAuthorized: false,
      preflightCertified: false,
      missingRequirements: ["alert_delivery_integration_preflight"],
    });
  });

  it("satisfies only production alert-delivery evidence and keeps activation blocked", () => {
    const alertEvidence =
      composePosCashShortageAlertDeliveryIntegrationActivationEvidence({
        preflight: currentPreflight(),
      });

    const result = evaluatePosCashShortageProductionActivationPreflight({
      definition: currentDefinition(),
      evidence: {
        ...emptyProductionEvidence(),
        alertDeliveryIntegrationCertified:
          alertEvidence.alertDeliveryIntegrationCertified,
      },
    });

    expect(result.status).toBe("blocked");
    expect(result.canEnableDefinition).toBe(false);
    expect(result.canRunWorker).toBe(false);
    expect(result.satisfiedRequirements).toContain("alert_delivery_integration");
    expect(result.missingRequirements).not.toContain("alert_delivery_integration");
    expect(result.missingRequirements).toEqual(
      expect.arrayContaining([
        "service_activation_marker",
        "release_gate_activation_marker",
        "worker_checkpoint_persistence",
        "scheduler_policy",
        "incident_command_integration",
        "rollback_plan",
        "observability_runbook",
        "owner_security_approval",
      ]),
    );
  });

  it("does not add worker, scheduler, route, action, dispatch execution, or batch execution", () => {
    const source = fs.readFileSync(
      path.join(
        ROOT,
        "services/leakage/pos-cash-shortage-alert-delivery-integration-preflight.ts",
      ),
      "utf8",
    );

    expect(source).not.toMatch(/CHECK_RUNNERS|scheduleWorkflow|router|createSafeAction/i);
    expect(source).not.toMatch(/loadPosShiftCashShortageBatch|runDormantPosShiftCashShortage/i);
    expect(source).not.toMatch(/queueWorkflowAssuranceWebhookDelivery\s*\(/i);
    expect(source).not.toMatch(/dispatchWorkflowAssuranceWebhookAlerts\s*\(/i);
    expect(source).not.toMatch(/recoverWorkflowAssuranceDeadLetter\s*\(/i);
  });
});

function currentPreflight() {
  return evaluatePosCashShortageAlertDeliveryIntegrationPreflight(currentInput());
}

function currentInput() {
  return {
    prismaSchemaText: currentSchemaSource(),
    assuranceIncidentSourceText: currentIncidentSource(),
    alertDeliverySourceText: currentAlertDeliverySource(),
    alertRecoverySourceText: currentAlertRecoverySource(),
    posCashShortageSourceText: currentPosCashShortageSources(),
  };
}

function currentSchemaSource() {
  return fs.readFileSync(path.join(ROOT, "prisma/schema.prisma"), "utf8");
}

function currentIncidentSource() {
  return fs.readFileSync(
    path.join(ROOT, "services/assurance/assurance-incident.service.ts"),
    "utf8",
  );
}

function currentAlertDeliverySource() {
  return fs.readFileSync(
    path.join(ROOT, "services/assurance/assurance-alert-delivery.service.ts"),
    "utf8",
  );
}

function currentAlertRecoverySource() {
  return fs.readFileSync(
    path.join(ROOT, "services/assurance/assurance-alert-recovery.service.ts"),
    "utf8",
  );
}

function currentPosCashShortageSources() {
  return [
    "services/leakage/pos-cash-shortage-production-activation-preflight.ts",
    "services/leakage/pos-cash-shortage-incident-lifecycle-policy.ts",
    "services/leakage/pos-cash-shortage-incident-command-integration-preflight.ts",
  ]
    .map((relativePath) => fs.readFileSync(path.join(ROOT, relativePath), "utf8"))
    .join("\n");
}

function blockedPreflight(): PosCashShortageAlertDeliveryIntegrationPreflightResult {
  return {
    version: 1,
    status: "blocked",
    alertDeliveryIntegrationCertified: false,
    activationAuthorized: false,
    satisfiedRequirements: [],
    missingRequirements: ["webhook_dispatch_retry_dead_letter"],
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
