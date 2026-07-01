import type { PayrollCountryPackReviewIntakeCertificate } from "../payroll-country-pack-review-intake.service";
import {
  approvePayrollCountryPackReviewIntakeCertificate,
  PAYROLL_COUNTRY_PACK_REVIEW_INTAKE_APPROVAL_AUDIT_ACTION,
  PAYROLL_COUNTRY_PACK_REVIEW_INTAKE_APPROVAL_ENTITY_TYPE,
  PAYROLL_COUNTRY_PACK_REVIEW_INTAKE_AUDIT_ACTION,
  PAYROLL_COUNTRY_PACK_REVIEW_INTAKE_ENTITY_TYPE,
  recordPayrollCountryPackReviewIntakeCertificate,
} from "../payroll-country-pack-review-intake-persistence.service";

function readyCertificate(): PayrollCountryPackReviewIntakeCertificate {
  return {
    kind: "AQSTOQFLOW_PAYROLL_COUNTRY_PACK_REVIEW_INTAKE_CERTIFICATE",
    version: 1,
    status: "READY_FOR_LEGAL_OWNER_SIGNOFF",
    generatedAt: "2026-07-01T09:00:00.000Z",
    countryCode: "CM",
    basePackVersion: "CM-2026.1",
    basePackHash: "sha256:base-pack",
    proposedPackVersion: "CM-2026.2",
    proposedPackHash: "sha256:proposed-pack",
    computedProposedPackHash: "sha256:proposed-pack",
    proposedPackHashMatches: true,
    targetFamilies: [
      {
        family: "IRPP_PERIOD",
        status: "READY_FOR_LEGAL_OWNER_SIGNOFF",
        proposedCoverageStatus: "READY",
        proposedCapabilityStatus: "SUPPORTED",
        certificationStatus: "EXPERT_REVIEWED",
        executableScenarioCount: 1,
        passedScenarioCount: 1,
        failedScenarioCount: 0,
        fixtureIds: ["cm-irpp-period-calculation-reviewed-2026"],
        baseRequiredReviewTopics: ["taxableSalaryBase"],
        coveredReviewTopics: ["taxableSalaryBase"],
        missingReviewTopics: [],
        invalidReviewTopics: [],
        reviewEvidenceSourceHashes: ["sha256:taxable-salary-base-review"],
        fixtureEvidence: [
          {
            fixtureId: "cm-irpp-period-calculation-reviewed-2026",
            parameterPath: "payroll.irpp.incomeTaxRules",
            purpose: "PAYROLL_IRPP_PERIOD_CALCULATION",
            fixtureDate: "2026-06-11",
            expectedPackVersion: "CM-2026.2",
            expectedLegalRef: "CM_DGI_CGI_2025",
            reviewStatus: "EXPERT_REVIEWED",
            reviewedBy: "Qualified Cameroon payroll tax reviewer",
            reviewedOn: "2026-06-28",
            legalRef: "CM_DGI_CGI_2025",
            sourceEvidenceHash: "sha256:cm-payroll-expert-reviewed-test-fixture",
            expectedOutputHash: "sha256:fixture-expected-output",
            actualOutputHash: "sha256:fixture-actual-output",
            proposedPackHash: "sha256:proposed-pack",
            computedProposedPackHash: "sha256:proposed-pack",
            evidenceHash: "sha256:fixture-provenance",
          },
        ],
        fixtureEvidenceHashes: ["sha256:fixture-provenance"],
        proposedIssueCodes: [],
        proposedBlockerCode: null,
        proposedBlockerMessage: null,
      },
    ],
    publishValidation: {
      valid: true,
      canPublish: true,
      issueCount: 0,
      issueCodes: [],
      issues: [],
    },
    blockers: [],
    redaction: {
      rawLegalDocumentsIncluded: false,
      rawFormulaSourceDocumentsIncluded: false,
      rawEmployeeDataIncluded: false,
      rawSalaryDataIncluded: false,
    },
    certificateHash: "sha256:intake-certificate",
  };
}

function mockClient() {
  return {
    auditLog: {
      create: jest.fn(),
      findFirst: jest.fn(),
    },
  };
}

describe("payroll country-pack review intake persistence", () => {
  it("records redacted intake certificates in the audit log", async () => {
    const client = mockClient();
    client.auditLog.create.mockResolvedValue({ id: "audit-intake-1" });

    const result = await recordPayrollCountryPackReviewIntakeCertificate(
      {
        organizationId: "org-1",
        actorId: "legal-reviewer-1",
        certificate: readyCertificate(),
      },
      client as any,
    );

    expect(result.persistence).toEqual({
      requested: true,
      persisted: true,
      auditLogId: "audit-intake-1",
      entityType: PAYROLL_COUNTRY_PACK_REVIEW_INTAKE_ENTITY_TYPE,
      auditAction: PAYROLL_COUNTRY_PACK_REVIEW_INTAKE_AUDIT_ACTION,
    });
    expect(client.auditLog.create).toHaveBeenCalledWith({
      data: expect.objectContaining({
        entityType: PAYROLL_COUNTRY_PACK_REVIEW_INTAKE_ENTITY_TYPE,
        entityId: "sha256:intake-certificate",
        action: PAYROLL_COUNTRY_PACK_REVIEW_INTAKE_AUDIT_ACTION,
        userId: "legal-reviewer-1",
        organizationId: "org-1",
      }),
    });
    const changes = client.auditLog.create.mock.calls[0][0].data.changes;
    expect(changes.after.redaction.rawLegalDocumentsIncluded).toBe(false);
    expect(changes.after.certificateHash).toBe("sha256:intake-certificate");
  });

  it("approves a ready certificate with fresh auth and approval evidence", async () => {
    const client = mockClient();
    client.auditLog.findFirst
      .mockResolvedValueOnce({
        id: "audit-intake-1",
        changes: { after: readyCertificate() },
      })
      .mockResolvedValueOnce(null);
    client.auditLog.create.mockResolvedValue({ id: "audit-approval-1" });

    const approval = await approvePayrollCountryPackReviewIntakeCertificate(
      {
        organizationId: "org-1",
        actorId: "legal-owner-1",
        expectedCertificateHash: "sha256:intake-certificate",
        approvalEvidenceHash: "sha256:legal-owner-approval",
        lastAuthAt: "2026-07-01T09:59:00.000Z",
        approvedAt: "2026-07-01T10:00:00.000Z",
      },
      client as any,
    );

    expect(approval).toMatchObject({
      status: "APPROVED",
      organizationRef: "org-1",
      actorRef: "legal-owner-1",
      sourceCertificate: {
        auditLogRef: "audit-intake-1",
        certificateHash: "sha256:intake-certificate",
        countryCode: "CM",
        proposedPackVersion: "CM-2026.2",
        targetFamilies: ["IRPP_PERIOD"],
        reviewEvidenceSourceHashes: ["sha256:taxable-salary-base-review"],
        fixtureEvidenceHashes: ["sha256:fixture-provenance"],
      },
      approval: {
        approvalEvidenceHash: "sha256:legal-owner-approval",
        freshAuthSatisfied: true,
        freshAuthMaxAgeSeconds: 300,
      },
      redaction: {
        rawLegalDocumentsIncluded: false,
        rawFormulaSourceDocumentsIncluded: false,
        rawEmployeeDataIncluded: false,
        rawSalaryDataIncluded: false,
        approvalNotesIncluded: false,
      },
      persistence: {
        auditLogId: "audit-approval-1",
        entityType: PAYROLL_COUNTRY_PACK_REVIEW_INTAKE_APPROVAL_ENTITY_TYPE,
        auditAction: PAYROLL_COUNTRY_PACK_REVIEW_INTAKE_APPROVAL_AUDIT_ACTION,
      },
    });
    expect(approval.approvalHash).toMatch(/^sha256:/);
    expect(client.auditLog.create).toHaveBeenCalledWith({
      data: expect.objectContaining({
        entityType: PAYROLL_COUNTRY_PACK_REVIEW_INTAKE_APPROVAL_ENTITY_TYPE,
        entityId: "sha256:intake-certificate",
        action: PAYROLL_COUNTRY_PACK_REVIEW_INTAKE_APPROVAL_AUDIT_ACTION,
        userId: "legal-owner-1",
        organizationId: "org-1",
      }),
    });
  });

  it("blocks stale fresh auth before loading or writing approval evidence", async () => {
    const client = mockClient();

    await expect(
      approvePayrollCountryPackReviewIntakeCertificate(
        {
          organizationId: "org-1",
          actorId: "legal-owner-1",
          expectedCertificateHash: "sha256:intake-certificate",
          approvalEvidenceHash: "sha256:legal-owner-approval",
          lastAuthAt: "2026-07-01T09:50:00.000Z",
          approvedAt: "2026-07-01T10:00:00.000Z",
        },
        client as any,
      ),
    ).rejects.toMatchObject({
      code: "FRESH_AUTH_REQUIRED",
    });
    expect(client.auditLog.findFirst).not.toHaveBeenCalled();
    expect(client.auditLog.create).not.toHaveBeenCalled();
  });

  it("blocks legal-owner approval when reviewed fixture provenance is missing", async () => {
    const client = mockClient();
    const certificate = readyCertificate();
    certificate.targetFamilies[0].fixtureEvidence = [];
    certificate.targetFamilies[0].fixtureEvidenceHashes = [];
    client.auditLog.findFirst.mockResolvedValueOnce({
      id: "audit-intake-1",
      changes: { after: certificate },
    });

    await expect(
      approvePayrollCountryPackReviewIntakeCertificate(
        {
          organizationId: "org-1",
          actorId: "legal-owner-1",
          expectedCertificateHash: "sha256:intake-certificate",
          approvalEvidenceHash: "sha256:legal-owner-approval",
          lastAuthAt: "2026-07-01T09:59:00.000Z",
          approvedAt: "2026-07-01T10:00:00.000Z",
        },
        client as any,
      ),
    ).rejects.toThrow(
      "Country-pack review intake certificate is missing reviewed fixture provenance evidence.",
    );
    expect(client.auditLog.create).not.toHaveBeenCalled();
  });

  it("blocks legal-owner approval when the intake certificate is not ready", async () => {
    const client = mockClient();
    client.auditLog.findFirst.mockResolvedValueOnce({
      id: "audit-intake-1",
      changes: {
        after: {
          ...readyCertificate(),
          status: "BLOCKED",
        },
      },
    });

    await expect(
      approvePayrollCountryPackReviewIntakeCertificate(
        {
          organizationId: "org-1",
          actorId: "legal-owner-1",
          expectedCertificateHash: "sha256:intake-certificate",
          approvalEvidenceHash: "sha256:legal-owner-approval",
          lastAuthAt: "2026-07-01T09:59:00.000Z",
          approvedAt: "2026-07-01T10:00:00.000Z",
        },
        client as any,
      ),
    ).rejects.toThrow(
      "Country-pack review intake certificate is not ready for legal-owner approval.",
    );
    expect(client.auditLog.create).not.toHaveBeenCalled();
  });
});
