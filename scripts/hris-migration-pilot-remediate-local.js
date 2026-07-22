#!/usr/bin/env node

const { createHash } = require("crypto");
const { existsSync, readFileSync } = require("fs");
const { resolve } = require("path");
const {
  BusinessEventSource,
  BusinessEventStatus,
  Locale,
  PayrollContractStatus,
  PayrollEmployeeStatus,
  PayrollPaymentDestinationChangeStatus,
  PayrollRubriqueAssignmentStatus,
  PrismaClient,
} = require("@prisma/client");

function loadLocalEnv() {
  for (const envPath of [
    resolve(process.cwd(), ".env.local"),
    resolve(process.cwd(), ".env"),
  ]) {
    if (!existsSync(envPath)) continue;

    for (const line of readFileSync(envPath, "utf8").split(/\r?\n/)) {
      const trimmed = line.trim();
      if (!trimmed || trimmed.startsWith("#")) continue;

      const match = trimmed.match(/^([A-Za-z_][A-Za-z0-9_]*)=(.*)$/);
      if (!match || process.env[match[1]] !== undefined) continue;

      let value = match[2].trim();
      if (
        (value.startsWith('"') && value.endsWith('"')) ||
        (value.startsWith("'") && value.endsWith("'"))
      ) {
        value = value.slice(1, -1);
      }
      process.env[match[1]] = value
        .replace(
          /\${([A-Za-z_][A-Za-z0-9_]*)}/g,
          (_, key) => process.env[key] || "",
        )
        .replace(/\\n/g, "\n");
    }
  }
}

function normalizeJson(value) {
  if (value instanceof Date) return value.toISOString();
  if (Array.isArray(value)) return value.map(normalizeJson);
  if (value && typeof value === "object") {
    return Object.keys(value)
      .sort()
      .reduce((acc, key) => {
        acc[key] = normalizeJson(value[key]);
        return acc;
      }, {});
  }
  return value;
}

function hashPayload(value) {
  return createHash("sha256")
    .update(JSON.stringify(normalizeJson(value)))
    .digest("hex");
}

function sha256(value) {
  return `sha256:${createHash("sha256").update(String(value)).digest("hex")}`;
}

function metadataRecord(value) {
  return value && typeof value === "object" && !Array.isArray(value)
    ? value
    : {};
}

function parseArgs(argv) {
  const args = {
    organizationId:
      process.env.AQSTOQFLOW_E2E_ORG_ID || "org_payroll_e2e_local",
    dryRun: true,
  };
  for (let index = 0; index < argv.length; index += 1) {
    const arg = argv[index];
    if (arg === "--organization-id") args.organizationId = argv[++index];
    else if (arg === "--dry-run") args.dryRun = true;
    else if (arg === "--apply") args.dryRun = false;
    else if (
      !arg.startsWith("--") &&
      args.organizationId ===
        (process.env.AQSTOQFLOW_E2E_ORG_ID || "org_payroll_e2e_local")
    )
      args.organizationId = arg;
    else throw new Error(`Unknown argument: ${arg}`);
  }
  return args;
}

function assertLocalOnly(organizationId) {
  const markers = [
    process.env.NODE_ENV,
    process.env.AQSTOQFLOW_ENV,
    process.env.VERCEL_ENV,
  ].map((value) => (value || "").toLowerCase());
  if (markers.includes("production")) {
    throw new Error(
      "Refusing to remediate HRIS migration pilot evidence while an environment marker is production.",
    );
  }
  if (!organizationId.endsWith("_local")) {
    throw new Error(
      "This remediation script is limited to deterministic local pilot tenants.",
    );
  }
}

async function ensureActor(tx, organizationId, actor) {
  return tx.user.upsert({
    where: { email: actor.email },
    update: {
      name: actor.name,
      firstName: actor.firstName,
      lastName: actor.lastName,
      jobTitle: actor.jobTitle,
      isActive: true,
      isVerified: true,
      emailVerified: true,
      organizationId,
    },
    create: {
      id: actor.id,
      organizationId,
      name: actor.name,
      email: actor.email,
      emailVerified: true,
      firstName: actor.firstName,
      lastName: actor.lastName,
      jobTitle: actor.jobTitle,
      isActive: true,
      isVerified: true,
      preferredLocale: Locale.EN,
    },
  });
}

async function recordEvent(tx, input) {
  const payloadHash = hashPayload(input.payload);
  const where = {
    organizationId_eventSource_idempotencyKey: {
      organizationId: input.organizationId,
      eventSource: BusinessEventSource.INTERNAL,
      idempotencyKey: input.idempotencyKey,
    },
  };
  const existing = await tx.businessEvent.findUnique({ where });
  if (existing) {
    if (existing.payloadHash !== payloadHash) {
      throw new Error(
        `Business event idempotency conflict for ${input.idempotencyKey}`,
      );
    }
    return existing;
  }
  return tx.businessEvent.create({
    data: {
      organizationId: input.organizationId,
      eventType: input.eventType,
      eventSource: BusinessEventSource.INTERNAL,
      schemaVersion: 1,
      status: BusinessEventStatus.APPLIED,
      idempotencyKey: input.idempotencyKey,
      payloadHash,
      payload: input.payload,
      occurredAt: input.occurredAt,
      processedAt: input.occurredAt,
      actorId: input.actorId,
      sourceId: input.sourceId,
      documentHash: input.documentHash,
      metadata: {
        gate: "stoquify-hris-18-migration-backfill-pilot",
        correctionOnly: true,
        localPilot: true,
      },
    },
  });
}

async function audit(
  tx,
  organizationId,
  actorId,
  entityType,
  entityId,
  action,
  changes,
) {
  await tx.auditLog.create({
    data: {
      organizationId,
      userId: actorId,
      entityType,
      entityId,
      action,
      changes,
    },
  });
}

async function remediate(input) {
  assertLocalOnly(input.organizationId);
  const prisma = new PrismaClient();
  const now = new Date();

  try {
    const result = await prisma.$transaction(async (tx) => {
      const organization = await tx.organization.findUnique({
        where: { id: input.organizationId },
        select: { id: true },
      });
      if (!organization)
        throw new Error(`Organization not found: ${input.organizationId}`);

      const employee = await tx.payrollEmployee.findFirst({
        where: {
          organizationId: input.organizationId,
          status: PayrollEmployeeStatus.ACTIVE,
          deletedAt: null,
        },
        orderBy: { id: "asc" },
      });
      if (!employee)
        throw new Error("No active local pilot payroll employee found.");

      const contract = await tx.payrollContract.findFirst({
        where: {
          organizationId: input.organizationId,
          employeeId: employee.id,
          status: PayrollContractStatus.ACTIVE,
          deletedAt: null,
        },
        orderBy: { effectiveFrom: "asc" },
      });
      if (!contract) throw new Error("No active local pilot contract found.");

      const assignment = await tx.payrollEmployeeRubriqueAssignment.findFirst({
        where: {
          organizationId: input.organizationId,
          employeeId: employee.id,
          status: PayrollRubriqueAssignmentStatus.ACTIVE,
          deletedAt: null,
        },
        orderBy: { effectiveFrom: "asc" },
      });
      if (!assignment)
        throw new Error("No active local pilot compensation assignment found.");

      const paymentRequest =
        await tx.payrollPaymentDestinationChangeRequest.findFirst({
          where: {
            organizationId: input.organizationId,
            employeeId: employee.id,
            status: PayrollPaymentDestinationChangeStatus.APPLIED,
            paymentDestinationHash: employee.paymentDestinationHash,
            deletedAt: null,
          },
          orderBy: { requestedAt: "desc" },
        });
      if (!paymentRequest)
        throw new Error(
          "No applied local pilot payment-destination request found.",
        );

      if (input.dryRun) {
        return {
          mode: "dry-run",
          organizationId: input.organizationId,
          employeeId: employee.id,
          contractId: contract.id,
          assignmentId: assignment.id,
          paymentDestinationRequestId: paymentRequest.id,
          plannedCorrections: [
            "EMPLOYEE_SOURCE_PROOF_MISSING",
            "ACTIVE_CONTRACT_DOCUMENT_PROOF_MISSING",
            "ACTIVE_CONTRACT_APPROVAL_PROOF_MISSING",
            "ACTIVE_COMPENSATION_APPROVAL_PROOF_MISSING",
            "PAYMENT_DESTINATION_APPLIED_PROOF_MISSING",
            "PAYMENT_DESTINATION_SOD_INVALID",
          ],
        };
      }

      const privacyActor = await ensureActor(tx, input.organizationId, {
        id: "usr_payroll_e2e_privacy_local",
        email: "payroll.privacy@stockflow.test",
        name: "Payroll Privacy Reviewer",
        firstName: "Payroll",
        lastName: "Privacy",
        jobTitle: "Local Pilot Privacy Reviewer",
      });
      const opsActor = await ensureActor(tx, input.organizationId, {
        id: "usr_payroll_e2e_operations_local",
        email: "payroll.operations@stockflow.test",
        name: "Payroll Operations Applier",
        firstName: "Payroll",
        lastName: "Operations",
        jobTitle: "Local Pilot Operations Applier",
      });
      const requestedById = employee.userId || paymentRequest.requestedById;
      if (!requestedById)
        throw new Error("Pilot employee has no requester actor.");

      const employeeSourceHash = sha256(
        `hris-source:${input.organizationId}:${employee.id}:${employee.employeeNumber}`,
      );
      const employeeSourceEvent = await recordEvent(tx, {
        organizationId: input.organizationId,
        eventType: "hris.migration.employee_source_proof_corrected",
        idempotencyKey: `hris-migration-pilot:${input.organizationId}:${employee.id}:employee-source-proof`,
        payload: {
          employeeId: employee.id,
          sourceSystem: "local-pilot-hris-source-register",
          sourceRecordId: employee.employeeNumber,
          sourceHash: employeeSourceHash,
          blockerCode: "EMPLOYEE_SOURCE_PROOF_MISSING",
        },
        occurredAt: now,
        actorId: privacyActor.id,
        sourceId: employee.id,
        documentHash: employeeSourceHash,
      });

      const contractDocumentHash =
        contract.signedDocumentHash ||
        sha256(`contract-document:${contract.id}`);
      const contractDocumentEvent = await recordEvent(tx, {
        organizationId: input.organizationId,
        eventType: "hris.contract.document_evidence_approved",
        idempotencyKey: `hris-migration-pilot:${input.organizationId}:${contract.id}:contract-document-proof`,
        payload: {
          employeeId: employee.id,
          contractId: contract.id,
          artifactHash: contractDocumentHash,
          blockerCode: "ACTIVE_CONTRACT_DOCUMENT_PROOF_MISSING",
        },
        occurredAt: now,
        actorId: privacyActor.id,
        sourceId: contract.id,
        documentHash: contractDocumentHash,
      });

      const contractActivationEvent = await recordEvent(tx, {
        organizationId: input.organizationId,
        eventType: "hris.contract.activation_approved",
        idempotencyKey: `hris-migration-pilot:${input.organizationId}:${contract.id}:contract-activation-proof`,
        payload: {
          employeeId: employee.id,
          contractId: contract.id,
          blockerCode: "ACTIVE_CONTRACT_APPROVAL_PROOF_MISSING",
        },
        occurredAt: now,
        actorId: privacyActor.id,
        sourceId: contract.id,
        documentHash: contractDocumentHash,
      });

      const compensationDocumentHash =
        assignment.evidenceDocumentHash ||
        sha256(`compensation-document:${assignment.id}`);
      const compensationEvent = await recordEvent(tx, {
        organizationId: input.organizationId,
        eventType: "hris.compensation.assignment_approved",
        idempotencyKey: `hris-migration-pilot:${input.organizationId}:${assignment.id}:compensation-approval-proof`,
        payload: {
          employeeId: employee.id,
          assignmentId: assignment.id,
          evidenceDocumentHash: compensationDocumentHash,
          blockerCode: "ACTIVE_COMPENSATION_APPROVAL_PROOF_MISSING",
        },
        occurredAt: now,
        actorId: privacyActor.id,
        sourceId: assignment.id,
        documentHash: compensationDocumentHash,
      });

      const paymentEvent = await recordEvent(tx, {
        organizationId: input.organizationId,
        eventType: "hris.payment_destination.applied_approved",
        idempotencyKey: `hris-migration-pilot:${input.organizationId}:${paymentRequest.id}:payment-destination-applied-proof`,
        payload: {
          employeeId: employee.id,
          paymentDestinationRequestId: paymentRequest.id,
          paymentDestinationHash: paymentRequest.paymentDestinationHash,
          blockerCode: "PAYMENT_DESTINATION_APPLIED_PROOF_MISSING",
          separationOfDuties: {
            requestedById,
            approvedById: privacyActor.id,
            appliedById: opsActor.id,
          },
        },
        occurredAt: now,
        actorId: opsActor.id,
        sourceId: paymentRequest.id,
        documentHash:
          paymentRequest.approvalEvidenceHash ||
          paymentRequest.evidenceDocumentHash,
      });
      const employeeMetadata = metadataRecord(employee.metadata);
      const contractMetadata = metadataRecord(contract.metadata);
      const assignmentMetadata = metadataRecord(assignment.metadata);
      const paymentMetadata = metadataRecord(paymentRequest.metadata);

      await tx.payrollEmployee.update({
        where: { id: employee.id },
        data: {
          metadata: {
            ...employeeMetadata,
            hrSourceData: {
              ...metadataRecord(employeeMetadata.hrSourceData),
              sourceSystem: "local-pilot-hris-source-register",
              sourceRecordId: employee.employeeNumber,
              sourceHash: employeeSourceHash,
              correctedAt: now.toISOString(),
              correctedById: privacyActor.id,
              correctionBusinessEventId: employeeSourceEvent.id,
              gate: "stoquify-hris-18-migration-backfill-pilot",
            },
          },
        },
      });
      await tx.payrollContract.update({
        where: { id: contract.id },
        data: {
          signedDocumentHash: contractDocumentHash,
          activatedBusinessEventId: contractActivationEvent.id,
          metadata: {
            ...contractMetadata,
            hrisDocumentEvidence: {
              ...metadataRecord(contractMetadata.hrisDocumentEvidence),
              current: {
                status: "APPROVED",
                artifactHash: contractDocumentHash,
                approvalBusinessEventId: contractDocumentEvent.id,
                approvedAt: now.toISOString(),
                approvedById: privacyActor.id,
                gate: "stoquify-hris-18-migration-backfill-pilot",
              },
            },
            hrisContractApproval: {
              ...metadataRecord(contractMetadata.hrisContractApproval),
              latest: {
                status: "APPROVED",
                businessEventId: contractActivationEvent.id,
                approvedAt: now.toISOString(),
                approvedById: privacyActor.id,
                gate: "stoquify-hris-18-migration-backfill-pilot",
              },
            },
          },
        },
      });
      await tx.payrollEmployeeRubriqueAssignment.update({
        where: { id: assignment.id },
        data: {
          evidenceDocumentHash: compensationDocumentHash,
          approvalBusinessEventId: compensationEvent.id,
          metadata: {
            ...assignmentMetadata,
            hrisCompensationApproval: {
              ...metadataRecord(assignmentMetadata.hrisCompensationApproval),
              latest: {
                status: "APPROVED",
                businessEventId: compensationEvent.id,
                approvedAt: now.toISOString(),
                approvedById: privacyActor.id,
                gate: "stoquify-hris-18-migration-backfill-pilot",
              },
            },
          },
        },
      });
      await tx.payrollPaymentDestinationChangeRequest.update({
        where: { id: paymentRequest.id },
        data: {
          requestedById,
          approvedById: privacyActor.id,
          appliedById: opsActor.id,
          approvedAt: paymentRequest.approvedAt || now,
          appliedAt: paymentRequest.appliedAt || now,
          approvalBusinessEventId:
            paymentRequest.approvalBusinessEventId || paymentEvent.id,
          appliedBusinessEventId: paymentEvent.id,
          metadata: {
            ...paymentMetadata,
            hrisPaymentDestinationApproval: {
              ...metadataRecord(paymentMetadata.hrisPaymentDestinationApproval),
              latest: {
                status: "APPLIED",
                businessEventId: paymentEvent.id,
                approvedById: privacyActor.id,
                appliedById: opsActor.id,
                appliedAt: now.toISOString(),
                gate: "stoquify-hris-18-migration-backfill-pilot",
              },
            },
          },
        },
      });

      await audit(
        tx,
        input.organizationId,
        privacyActor.id,
        "PayrollEmployee",
        employee.id,
        "HRIS_MIGRATION_SOURCE_PROOF_CORRECTED",
        {
          after: {
            eventId: employeeSourceEvent.id,
            sourceHash: employeeSourceHash,
          },
        },
      );
      await audit(
        tx,
        input.organizationId,
        privacyActor.id,
        "PayrollContract",
        contract.id,
        "HRIS_MIGRATION_CONTRACT_PROOF_CORRECTED",
        {
          after: {
            documentEventId: contractDocumentEvent.id,
            activationEventId: contractActivationEvent.id,
          },
        },
      );
      await audit(
        tx,
        input.organizationId,
        privacyActor.id,
        "PayrollEmployeeRubriqueAssignment",
        assignment.id,
        "HRIS_MIGRATION_COMPENSATION_PROOF_CORRECTED",
        {
          after: { approvalEventId: compensationEvent.id },
        },
      );
      await audit(
        tx,
        input.organizationId,
        opsActor.id,
        "PayrollPaymentDestinationChangeRequest",
        paymentRequest.id,
        "HRIS_MIGRATION_PAYMENT_DESTINATION_PROOF_CORRECTED",
        {
          after: {
            appliedEventId: paymentEvent.id,
            requestedById,
            approvedById: privacyActor.id,
            appliedById: opsActor.id,
          },
        },
      );

      return {
        mode: "apply",
        employeeId: employee.id,
        contractId: contract.id,
        assignmentId: assignment.id,
        paymentDestinationRequestId: paymentRequest.id,
        eventIds: [
          employeeSourceEvent.id,
          contractDocumentEvent.id,
          contractActivationEvent.id,
          compensationEvent.id,
          paymentEvent.id,
        ],
      };
    });

    console.log(JSON.stringify(result, null, 2));
  } finally {
    await prisma.$disconnect();
  }
}

loadLocalEnv();
remediate(parseArgs(process.argv.slice(2))).catch((error) => {
  console.error(error);
  process.exit(1);
});
