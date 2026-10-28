import {
  assertHrisPayrollEmployeeSourceCurrent,
  assertHrisPayrollReadinessExport,
  buildHrisPayrollReadinessExport,
  type HrisPayrollReadinessEmployeeSource,
} from "../payroll-readiness-contract";

function readyEmployeeSource(
  overrides: Partial<HrisPayrollReadinessEmployeeSource> = {},
): HrisPayrollReadinessEmployeeSource {
  const paymentDestinationHash = "sha256:destination";
  const source: HrisPayrollReadinessEmployeeSource = {
    employeeId: "employee-1",
    employeeDisplayName: "Ada Payroll",
    employeeMetadata: {
      hrSourceData: {
        sourceSystem: "hris-core",
        sourceRecordId: "person-1",
        sourceHash: "sha256:identity-source",
        updatedAt: "2026-06-20T10:00:00.000Z",
      },
      approvedPaymentDestinationEvidence: {
        requestId: "destination-request-1",
        paymentDestinationHash,
        evidenceDocumentHash: "sha256:destination-request",
        approvalEvidenceHash: "sha256:destination-approval",
        requestBusinessEventId: "event-destination-request",
        approvalBusinessEventId: "event-destination-approval",
        appliedBusinessEventId: "event-destination-applied",
      },
    },
    contract: {
      id: "contract-1",
      baseSalary: "100000.00",
      currency: "XAF",
      effectiveFrom: "2026-01-01T00:00:00.000Z",
      effectiveTo: null,
      signedDocumentHash: "sha256:signed-contract",
      activatedBusinessEventId: "event-contract-activation",
      metadata: {
        hrisContractApproval: {
          latest: {
            status: "APPROVED",
            requestId: "event-contract-request",
            requestEvidenceHash: "sha256:contract-request",
            approvalEvidenceHash: "sha256:contract-approval",
            activationBusinessEventId: "event-contract-activation",
          },
        },
        hrisDocumentEvidence: {
          current: {
            status: "APPROVED",
            artifactHash: "sha256:signed-contract",
            malwareScanEvidenceHash: "sha256:malware-scan",
            approvalEvidenceHash: "sha256:document-approval",
            approvalBusinessEventId: "event-document-approval",
          },
        },
      },
    },
    compensationAssignments: [
      {
        id: "assignment-1",
        rubriqueId: "rubrique-1",
        amount: "5000.00",
        rateBps: null,
        quantity: null,
        currency: "XAF",
        effectiveFrom: "2026-01-01T00:00:00.000Z",
        effectiveTo: null,
        evidenceDocumentHash: "sha256:compensation-request",
        approvalBusinessEventId: "event-compensation-approval",
        metadata: {
          hrisCompensationApproval: {
            status: "APPROVED",
            requestBusinessEventId: "event-compensation-request",
            approvalEvidenceHash: "sha256:compensation-approval",
            approvalBusinessEventId: "event-compensation-approval",
            activeContractId: "contract-1",
          },
        },
      },
    ],
    paymentDestinationHash,
    paymentDestinationRequest: {
      id: "destination-request-1",
      status: "APPLIED",
      paymentDestinationHash,
      evidenceDocumentHash: "sha256:destination-request",
      approvalEvidenceHash: "sha256:destination-approval",
      requestBusinessEventId: "event-destination-request",
      approvalBusinessEventId: "event-destination-approval",
      appliedBusinessEventId: "event-destination-applied",
      requestedById: "employee-1",
      approvedById: "payroll-approver-1",
      appliedById: "payroll-operator-1",
      appliedAt: "2026-06-20T12:00:00.000Z",
    },
    attendance: {
      snapshotId: "attendance-1",
      sourceHash: "sha256:attendance-source",
      certificationHash: "sha256:attendance-certification",
    },
  };

  return { ...source, ...overrides };
}

function readinessExport(source = readyEmployeeSource()) {
  return buildHrisPayrollReadinessExport({
    organizationId: "org-1",
    payrollPeriodId: "period-1",
    periodStart: "2026-06-01T00:00:00.000Z",
    periodEnd: "2026-06-30T23:59:59.999Z",
    countryCode: "CM",
    employees: [source],
  });
}

describe("HRIS payroll readiness contract", () => {
  it("certifies complete HRIS source proof without exposing salary values", () => {
    const result = readinessExport();

    expect(result.status).toBe("READY");
    expect(result.blockers).toEqual([]);
    expect(result.employeeProofs[0]).toEqual(
      expect.objectContaining({
        employeeId: "employee-1",
        identitySourceHash: "sha256:identity-source",
        contractDocumentHash: "sha256:signed-contract",
        paymentDestinationHash: "sha256:destination",
        attendanceCertificationHash: "sha256:attendance-certification",
      }),
    );
    expect(JSON.stringify(result)).not.toContain("100000.00");
    expect(() => assertHrisPayrollReadinessExport(result)).not.toThrow();
  });

  it("fails closed when required identity and destination proof is missing", () => {
    const base = readyEmployeeSource();
    const result = readinessExport({
      ...base,
      employeeMetadata: {
        ...(base.employeeMetadata as Record<string, unknown>),
        hrSourceData: {},
      },
      paymentDestinationRequest: null,
    });

    expect(result.status).toBe("BLOCKED");
    expect(result.blockerCodes).toEqual(
      expect.arrayContaining([
        "HRIS_PAYROLL_IDENTITY_SOURCE_PROOF_MISSING",
        "HRIS_PAYROLL_PAYMENT_DESTINATION_PROOF_MISSING",
      ]),
    );
    expect(() => assertHrisPayrollReadinessExport(result)).toThrow(
      "HRIS payroll readiness is blocked",
    );
  });

  it("rejects a tampered readiness export", () => {
    const result = readinessExport();
    const tampered = { ...result, countryCode: "GA" };

    expect(() => assertHrisPayrollReadinessExport(tampered)).toThrow(
      "stale or has been tampered",
    );
  });

  it("rejects source drift after certification", () => {
    const source = readyEmployeeSource();
    const result = readinessExport(source);
    const changedSource = {
      ...source,
      contract: source.contract
        ? { ...source.contract, baseSalary: "120000.00" }
        : null,
    };

    expect(() =>
      assertHrisPayrollEmployeeSourceCurrent(result, changedSource),
    ).toThrow("source proof is stale");
  });
});
