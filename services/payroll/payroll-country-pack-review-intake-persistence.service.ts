import "server-only";

import { Prisma } from "@prisma/client";

import { db } from "@/prisma/db";
import {
  BusinessRuleError,
  ConflictError,
} from "@/services/_shared/action-errors";
import { computeResolutionHash } from "../regulatory/country-packs/hash";
import type {
  PayrollCountryPackReviewIntakeCertificate,
  PayrollCountryPackReviewIntakeStatus,
} from "./payroll-country-pack-review-intake.service";

type DbClient = typeof db | Prisma.TransactionClient;

export const PAYROLL_COUNTRY_PACK_REVIEW_INTAKE_ENTITY_TYPE =
  "PayrollCountryPackReviewIntakeCertificate";
export const PAYROLL_COUNTRY_PACK_REVIEW_INTAKE_AUDIT_ACTION =
  "PAYROLL_COUNTRY_PACK_REVIEW_INTAKE_CERTIFICATE_RECORDED";
export const PAYROLL_COUNTRY_PACK_REVIEW_INTAKE_APPROVAL_ENTITY_TYPE =
  "PayrollCountryPackReviewIntakeApproval";
export const PAYROLL_COUNTRY_PACK_REVIEW_INTAKE_APPROVAL_AUDIT_ACTION =
  "PAYROLL_COUNTRY_PACK_REVIEW_INTAKE_LEGAL_OWNER_APPROVED";

export type RecordPayrollCountryPackReviewIntakeCertificateInput = {
  organizationId: string;
  actorId?: string | null;
  certificate: PayrollCountryPackReviewIntakeCertificate;
};

export type PayrollCountryPackReviewIntakeRecordedCertificate =
  PayrollCountryPackReviewIntakeCertificate & {
    persistence: {
      requested: true;
      persisted: true;
      auditLogId: string;
      entityType: typeof PAYROLL_COUNTRY_PACK_REVIEW_INTAKE_ENTITY_TYPE;
      auditAction: typeof PAYROLL_COUNTRY_PACK_REVIEW_INTAKE_AUDIT_ACTION;
    };
  };

export type ApprovePayrollCountryPackReviewIntakeCertificateInput = {
  organizationId: string;
  actorId: string;
  expectedCertificateHash: string;
  approvalEvidenceHash: string;
  lastAuthAt: Date | string | number;
  approvedAt?: Date | string | number | null;
  freshAuthMaxAgeSeconds?: number | null;
};

export type PayrollCountryPackReviewIntakeApproval = {
  kind: "AQSTOQFLOW_PAYROLL_COUNTRY_PACK_REVIEW_INTAKE_LEGAL_OWNER_APPROVAL";
  version: 1;
  status: "APPROVED";
  approvedAt: string;
  organizationRef: string;
  actorRef: string;
  sourceCertificate: {
    auditLogRef: string;
    certificateHash: string;
    countryCode: string | null;
    proposedPackVersion: string | null;
    proposedPackHash: string | null;
    status: PayrollCountryPackReviewIntakeStatus | null;
    targetFamilies: string[];
    reviewEvidenceSourceHashes: string[];
    fixtureEvidenceHashes: string[];
  };
  approval: {
    approvalEvidenceHash: string;
    lastAuthAt: string;
    freshAuthMaxAgeSeconds: number;
    freshAuthSatisfied: true;
  };
  redaction: {
    rawLegalDocumentsIncluded: false;
    rawFormulaSourceDocumentsIncluded: false;
    rawEmployeeDataIncluded: false;
    rawSalaryDataIncluded: false;
    approvalNotesIncluded: false;
  };
  approvalHash: string;
  persistence: {
    requested: true;
    persisted: true;
    auditLogId: string;
    entityType: typeof PAYROLL_COUNTRY_PACK_REVIEW_INTAKE_APPROVAL_ENTITY_TYPE;
    auditAction: typeof PAYROLL_COUNTRY_PACK_REVIEW_INTAKE_APPROVAL_AUDIT_ACTION;
  };
};

type ApprovalCore = Omit<
  PayrollCountryPackReviewIntakeApproval,
  "approvalHash" | "persistence"
>;

function safeJson(value: unknown): Prisma.InputJsonValue {
  return JSON.parse(JSON.stringify(value ?? null)) as Prisma.InputJsonValue;
}

function asRecord(value: unknown): Record<string, unknown> {
  return value && typeof value === "object" && !Array.isArray(value)
    ? (value as Record<string, unknown>)
    : {};
}

function stringOrNull(value: unknown) {
  return typeof value === "string" && value.trim().length > 0
    ? value.trim()
    : null;
}

function stringArray(value: unknown) {
  return Array.isArray(value)
    ? value
        .filter((item): item is string => typeof item === "string")
        .map((item) => item.trim())
        .filter(Boolean)
    : [];
}

function uniqueSortedStringArray(values: readonly string[]) {
  return [...new Set(values)].sort();
}

function dateFrom(value: Date | string | number | null | undefined) {
  if (value === null || value === undefined) return null;
  const date = value instanceof Date ? value : new Date(value);
  return Number.isNaN(date.getTime()) ? null : date;
}

function requireFreshAuth(input: {
  lastAuthAt: Date | string | number;
  now: Date;
  freshAuthMaxAgeSeconds: number;
}) {
  const lastAuthAt = dateFrom(input.lastAuthAt);
  if (!lastAuthAt) {
    throw new BusinessRuleError("Fresh authentication required.", "FRESH_AUTH_REQUIRED");
  }

  const ageMs = input.now.getTime() - lastAuthAt.getTime();
  if (ageMs < 0 || ageMs > input.freshAuthMaxAgeSeconds * 1000) {
    throw new BusinessRuleError("Fresh authentication required.", "FRESH_AUTH_REQUIRED");
  }

  return lastAuthAt;
}

function auditPayload(certificate: PayrollCountryPackReviewIntakeCertificate) {
  return {
    before: null,
    after: certificate,
  };
}

function persistedCertificateFromAuditLog(auditLog: {
  changes: Prisma.JsonValue | null;
}) {
  const changes = asRecord(auditLog.changes);
  return asRecord(changes.after);
}

function approvalCoreHash(core: ApprovalCore) {
  return computeResolutionHash(core);
}

function approvalFromAuditLog(auditLog: {
  id: string;
  changes: Prisma.JsonValue | null;
}): PayrollCountryPackReviewIntakeApproval | null {
  const changes = asRecord(auditLog.changes);
  const after = asRecord(changes.after);
  if (
    after.kind !==
      "AQSTOQFLOW_PAYROLL_COUNTRY_PACK_REVIEW_INTAKE_LEGAL_OWNER_APPROVAL" ||
    after.status !== "APPROVED"
  ) {
    return null;
  }

  return {
    ...(after as Omit<PayrollCountryPackReviewIntakeApproval, "persistence">),
    persistence: {
      requested: true,
      persisted: true,
      auditLogId: auditLog.id,
      entityType: PAYROLL_COUNTRY_PACK_REVIEW_INTAKE_APPROVAL_ENTITY_TYPE,
      auditAction: PAYROLL_COUNTRY_PACK_REVIEW_INTAKE_APPROVAL_AUDIT_ACTION,
    },
  };
}

export async function recordPayrollCountryPackReviewIntakeCertificate(
  input: RecordPayrollCountryPackReviewIntakeCertificateInput,
  client: DbClient = db,
): Promise<PayrollCountryPackReviewIntakeRecordedCertificate> {
  const organizationId = input.organizationId.trim();
  if (!organizationId) {
    throw new BusinessRuleError("Organization is required to record country-pack review intake evidence.");
  }

  const audit = await client.auditLog.create({
    data: {
      entityType: PAYROLL_COUNTRY_PACK_REVIEW_INTAKE_ENTITY_TYPE,
      entityId: input.certificate.certificateHash,
      action: PAYROLL_COUNTRY_PACK_REVIEW_INTAKE_AUDIT_ACTION,
      userId: input.actorId?.trim() || null,
      organizationId,
      changes: safeJson(auditPayload(input.certificate)),
    },
  });

  return {
    ...input.certificate,
    persistence: {
      requested: true,
      persisted: true,
      auditLogId: audit.id,
      entityType: PAYROLL_COUNTRY_PACK_REVIEW_INTAKE_ENTITY_TYPE,
      auditAction: PAYROLL_COUNTRY_PACK_REVIEW_INTAKE_AUDIT_ACTION,
    },
  };
}

export async function approvePayrollCountryPackReviewIntakeCertificate(
  input: ApprovePayrollCountryPackReviewIntakeCertificateInput,
  client: DbClient = db,
): Promise<PayrollCountryPackReviewIntakeApproval> {
  const organizationId = input.organizationId.trim();
  const actorId = input.actorId.trim();
  const certificateHash = input.expectedCertificateHash.trim();
  const approvalEvidenceHash = input.approvalEvidenceHash.trim();
  const approvedAt = dateFrom(input.approvedAt) ?? new Date();
  const freshAuthMaxAgeSeconds = input.freshAuthMaxAgeSeconds ?? 300;
  const lastAuthAt = requireFreshAuth({
    lastAuthAt: input.lastAuthAt,
    now: approvedAt,
    freshAuthMaxAgeSeconds,
  });

  if (!organizationId || !actorId || !certificateHash || !approvalEvidenceHash) {
    throw new BusinessRuleError(
      "Country-pack review intake approval requires tenant, actor, certificate hash, and approval evidence hash.",
    );
  }

  const certificateAudit = await client.auditLog.findFirst({
    where: {
      entityType: PAYROLL_COUNTRY_PACK_REVIEW_INTAKE_ENTITY_TYPE,
      entityId: certificateHash,
      action: PAYROLL_COUNTRY_PACK_REVIEW_INTAKE_AUDIT_ACTION,
      organizationId,
    },
    orderBy: { createdAt: "desc" },
  });

  if (!certificateAudit) {
    throw new BusinessRuleError(
      "Persisted country-pack review intake certificate was not found for this tenant.",
    );
  }

  const sourceCertificate = persistedCertificateFromAuditLog(certificateAudit);
  const sourceStatus = stringOrNull(sourceCertificate.status);
  const sourceCertificateHash = stringOrNull(sourceCertificate.certificateHash);
  if (sourceCertificateHash !== certificateHash) {
    throw new BusinessRuleError(
      "Persisted country-pack review intake certificate hash does not match the approval request.",
    );
  }
  if (sourceStatus !== "READY_FOR_LEGAL_OWNER_SIGNOFF") {
    throw new BusinessRuleError(
      "Country-pack review intake certificate is not ready for legal-owner approval.",
    );
  }

  const sourceFamilies = Array.isArray(sourceCertificate.targetFamilies)
    ? sourceCertificate.targetFamilies.map((entry) => asRecord(entry))
    : [];
  const targetFamilies = sourceFamilies
    .map((entry) => entry.family)
    .filter((family): family is string => typeof family === "string");
  const reviewEvidenceSourceHashes = uniqueSortedStringArray(
    stringArray(
      sourceFamilies.flatMap((family) =>
        stringArray(family.reviewEvidenceSourceHashes),
      ),
    ),
  );
  const fixtureEvidenceHashes = uniqueSortedStringArray(
    stringArray(
      sourceFamilies.flatMap((family) => stringArray(family.fixtureEvidenceHashes)),
    ),
  );

  if (
    targetFamilies.length === 0 ||
    reviewEvidenceSourceHashes.length === 0 ||
    fixtureEvidenceHashes.length === 0
  ) {
    throw new BusinessRuleError(
      "Country-pack review intake certificate is missing reviewed fixture provenance evidence.",
    );
  }

  const existingApprovalAudit = await client.auditLog.findFirst({
    where: {
      entityType: PAYROLL_COUNTRY_PACK_REVIEW_INTAKE_APPROVAL_ENTITY_TYPE,
      entityId: certificateHash,
      action: PAYROLL_COUNTRY_PACK_REVIEW_INTAKE_APPROVAL_AUDIT_ACTION,
      organizationId,
    },
    orderBy: { createdAt: "desc" },
  });

  if (existingApprovalAudit) {
    const existingApproval = approvalFromAuditLog(existingApprovalAudit);
    const existingEvidenceHash = existingApproval?.approval.approvalEvidenceHash;
    if (existingApproval && existingEvidenceHash === approvalEvidenceHash) {
      return existingApproval;
    }
    throw new ConflictError(
      "Country-pack review intake certificate already has legal-owner approval evidence.",
    );
  }

  const core: ApprovalCore = {
    kind: "AQSTOQFLOW_PAYROLL_COUNTRY_PACK_REVIEW_INTAKE_LEGAL_OWNER_APPROVAL",
    version: 1,
    status: "APPROVED",
    approvedAt: approvedAt.toISOString(),
    organizationRef: organizationId,
    actorRef: actorId,
    sourceCertificate: {
      auditLogRef: certificateAudit.id,
      certificateHash,
      countryCode: stringOrNull(sourceCertificate.countryCode),
      proposedPackVersion: stringOrNull(sourceCertificate.proposedPackVersion),
      proposedPackHash: stringOrNull(sourceCertificate.proposedPackHash),
      status: sourceStatus as PayrollCountryPackReviewIntakeStatus,
      targetFamilies: uniqueSortedStringArray(stringArray(targetFamilies)),
      reviewEvidenceSourceHashes,
      fixtureEvidenceHashes,
    },
    approval: {
      approvalEvidenceHash,
      lastAuthAt: lastAuthAt.toISOString(),
      freshAuthMaxAgeSeconds,
      freshAuthSatisfied: true,
    },
    redaction: {
      rawLegalDocumentsIncluded: false,
      rawFormulaSourceDocumentsIncluded: false,
      rawEmployeeDataIncluded: false,
      rawSalaryDataIncluded: false,
      approvalNotesIncluded: false,
    },
  };
  const approval = {
    ...core,
    approvalHash: approvalCoreHash(core),
  };
  const audit = await client.auditLog.create({
    data: {
      entityType: PAYROLL_COUNTRY_PACK_REVIEW_INTAKE_APPROVAL_ENTITY_TYPE,
      entityId: certificateHash,
      action: PAYROLL_COUNTRY_PACK_REVIEW_INTAKE_APPROVAL_AUDIT_ACTION,
      userId: actorId,
      organizationId,
      changes: safeJson({
        before: {
          certificateHash,
          status: sourceStatus,
        },
        after: approval,
      }),
    },
  });

  return {
    ...approval,
    persistence: {
      requested: true,
      persisted: true,
      auditLogId: audit.id,
      entityType: PAYROLL_COUNTRY_PACK_REVIEW_INTAKE_APPROVAL_ENTITY_TYPE,
      auditAction: PAYROLL_COUNTRY_PACK_REVIEW_INTAKE_APPROVAL_AUDIT_ACTION,
    },
  };
}
