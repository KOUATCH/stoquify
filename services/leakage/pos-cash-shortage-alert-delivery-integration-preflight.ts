export const POS_CASH_SHORTAGE_ALERT_DELIVERY_PREFLIGHT_VERSION = 1;

export const POS_CASH_SHORTAGE_ALERT_DELIVERY_REQUIREMENTS = [
  "durable_alert_delivery_model",
  "alert_delivery_uniqueness",
  "alert_delivery_retry_fields",
  "incident_in_app_alert_recording",
  "incident_alert_recorded_event",
  "webhook_queue_contract",
  "transport_readiness_guard",
  "webhook_dispatch_retry_dead_letter",
  "dead_letter_recovery_command",
  "recovery_audit_and_event_history",
  "no_pos_alert_runtime_activation",
] as const;

export type PosCashShortageAlertDeliveryRequirement =
  (typeof POS_CASH_SHORTAGE_ALERT_DELIVERY_REQUIREMENTS)[number];

export type PosCashShortageAlertDeliveryIntegrationPreflightInput = {
  prismaSchemaText: string;
  assuranceIncidentSourceText: string;
  alertDeliverySourceText: string;
  alertRecoverySourceText: string;
  posCashShortageSourceText: string;
};

export type PosCashShortageAlertDeliveryIntegrationPreflightResult = {
  version: typeof POS_CASH_SHORTAGE_ALERT_DELIVERY_PREFLIGHT_VERSION;
  status: "certified" | "blocked";
  alertDeliveryIntegrationCertified: boolean;
  activationAuthorized: false;
  satisfiedRequirements: PosCashShortageAlertDeliveryRequirement[];
  missingRequirements: PosCashShortageAlertDeliveryRequirement[];
};

export type PosCashShortageAlertDeliveryIntegrationActivationEvidence = {
  alertDeliveryIntegrationCertified: boolean;
  activationAuthorized: false;
  preflightCertified: boolean;
  missingRequirements: Array<"alert_delivery_integration_preflight">;
};

export function evaluatePosCashShortageAlertDeliveryIntegrationPreflight(
  input: PosCashShortageAlertDeliveryIntegrationPreflightInput,
): PosCashShortageAlertDeliveryIntegrationPreflightResult {
  const satisfiedRequirements: PosCashShortageAlertDeliveryRequirement[] = [];
  const missingRequirements: PosCashShortageAlertDeliveryRequirement[] = [];

  for (const requirement of POS_CASH_SHORTAGE_ALERT_DELIVERY_REQUIREMENTS) {
    if (isRequirementSatisfied(requirement, input)) {
      satisfiedRequirements.push(requirement);
    } else {
      missingRequirements.push(requirement);
    }
  }

  const ready = missingRequirements.length === 0;

  return {
    version: POS_CASH_SHORTAGE_ALERT_DELIVERY_PREFLIGHT_VERSION,
    status: ready ? "certified" : "blocked",
    alertDeliveryIntegrationCertified: ready,
    activationAuthorized: false,
    satisfiedRequirements,
    missingRequirements,
  };
}

export function composePosCashShortageAlertDeliveryIntegrationActivationEvidence(input: {
  preflight: Pick<
    PosCashShortageAlertDeliveryIntegrationPreflightResult,
    "alertDeliveryIntegrationCertified" | "activationAuthorized"
  >;
}): PosCashShortageAlertDeliveryIntegrationActivationEvidence {
  const preflightCertified =
    input.preflight.alertDeliveryIntegrationCertified &&
    input.preflight.activationAuthorized === false;

  return {
    alertDeliveryIntegrationCertified: preflightCertified,
    activationAuthorized: false,
    preflightCertified,
    missingRequirements: preflightCertified
      ? []
      : ["alert_delivery_integration_preflight"],
  };
}

function isRequirementSatisfied(
  requirement: PosCashShortageAlertDeliveryRequirement,
  input: PosCashShortageAlertDeliveryIntegrationPreflightInput,
) {
  switch (requirement) {
    case "durable_alert_delivery_model":
      return [
        "model WorkflowAssuranceAlertDelivery",
        "organizationId String",
        "incidentId String",
        "channel   WorkflowAssuranceAlertChannel",
        "status    WorkflowAssuranceAlertDeliveryStatus",
        "dedupeKey String",
      ].every((marker) => input.prismaSchemaText.includes(marker));
    case "alert_delivery_uniqueness":
      return [
        "@@unique([organizationId, incidentId, channel, dedupeKey])",
        "@@index([organizationId, channel, status])",
        "@@index([channel, status, nextAttemptAt])",
      ].every((marker) => input.prismaSchemaText.includes(marker));
    case "alert_delivery_retry_fields":
      return [
        "attemptCount",
        "nextAttemptAt",
        "lockedAt",
        "lockedBy",
        "failureCode",
        "failureReason",
        "externalReference",
        "DEAD_LETTER",
      ].every((marker) => input.prismaSchemaText.includes(marker));
    case "incident_in_app_alert_recording":
      return [
        "recordIncidentAlert",
        "workflowAssuranceAlertDelivery.upsert",
        "ALERT_CHANNEL_TO_PRISMA.in_app",
        "ALERT_STATUS_TO_PRISMA.pending",
        "safeAlertMessage",
        "actionRoute",
      ].every((marker) => input.assuranceIncidentSourceText.includes(marker));
    case "incident_alert_recorded_event":
      return [
        'eventType: "alert_recorded"',
        "Workflow assurance alert delivery recorded",
        'channel: "in_app"',
      ].every((marker) => input.assuranceIncidentSourceText.includes(marker));
    case "webhook_queue_contract":
      return [
        "export async function queueWorkflowAssuranceWebhookDelivery",
        "workflowAssuranceIncident.findUnique",
        'channel: "WEBHOOK"',
        'status: "PENDING"',
        "dedupeKey",
        "actionRoute",
        "sourceHash",
      ].every((marker) => input.alertDeliverySourceText.includes(marker));
    case "transport_readiness_guard":
      return [
        "resolveAssuranceAlertTransportReadiness",
        "STOQUIFY_ASSURANCE_ALERT_WEBHOOK_URL",
        "STOQUIFY_ASSURANCE_ALERT_WEBHOOK_SECRET",
        "webhook_https_required",
        "webhook_secret_missing_or_weak",
      ].every((marker) => input.alertDeliverySourceText.includes(marker));
    case "webhook_dispatch_retry_dead_letter":
      return [
        "export async function dispatchWorkflowAssuranceWebhookAlerts",
        "LOCK_TIMEOUT_MS",
        "PROCESSING",
        "lockedAt",
        "lockedBy",
        "fetchImpl",
        "DELIVERED",
        "workflowAssuranceRetryDelayMs",
        "DEAD_LETTER",
      ].every((marker) => input.alertDeliverySourceText.includes(marker));
    case "dead_letter_recovery_command":
      return [
        "export async function recoverWorkflowAssuranceDeadLetter",
        "idempotencyKey",
        "requestHash",
        'source.status !== "DEAD_LETTER"',
        "active tenant operator",
        'channel: "WEBHOOK"',
        'status: "PENDING"',
      ].every((marker) => input.alertRecoverySourceText.includes(marker));
    case "recovery_audit_and_event_history":
      return [
        "workflowAssuranceIncidentEvent.create",
        "auditLog.create",
        "WORKFLOW_ASSURANCE_ALERT_RECOVERY_QUEUED",
        "Workflow assurance dead-letter recovery queued",
      ].every((marker) => input.alertRecoverySourceText.includes(marker));
    case "no_pos_alert_runtime_activation":
      return !posRuntimeActivationPattern().test(input.posCashShortageSourceText);
  }
}

function posRuntimeActivationPattern() {
  return new RegExp(
    [
      "queue" + "WorkflowAssuranceWebhookDelivery\\s*\\(",
      "dispatch" + "WorkflowAssuranceWebhookAlerts\\s*\\(",
      "recover" + "WorkflowAssuranceDeadLetter\\s*\\(",
      "record" + "IncidentAlert\\s*\\(",
      "notification",
      "outbox",
      "webhook",
    ].join("|"),
    "i",
  );
}
