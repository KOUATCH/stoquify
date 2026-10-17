jest.mock("@/services/regulatory/regulatory-capability.service", () => ({
  getCountryPack: jest.fn(),
  resolveRegulatoryParameter: jest.fn(),
}));
jest.mock("../payroll-statutory-scenario-coverage.service", () => ({
  buildPayrollStatutoryScenarioCoverageSummary: jest.fn(),
}));
jest.mock("@/prisma/db", () => ({ db: { $transaction: jest.fn() } }));
jest.mock("@/services/controls/sensitive-action.service", () => ({
  evaluateSensitiveAction: jest.fn(() => ({ allowed: true })),
  auditSensitiveActionDecision: jest.fn(),
  assertSensitiveActionAllowed: jest.fn(),
}));
jest.mock("@/services/accounting/posting.service", () => ({
  createLedgerPostingBatch: jest.fn(),
  linkAccountingSource: jest.fn(),
}));
jest.mock("@/services/accounting/close-assurance-pack.service", () => ({
  recordCloseCertificationInvalidationsForSourceInTx: jest.fn(),
}));
jest.mock("@/services/events/business-event.service", () => ({
  ...jest.requireActual("@/services/events/business-event.service"),
  recordBusinessEventInTx: jest
    .fn()
    .mockResolvedValue({ event: { id: "event-emitted" }, created: true }),
  markBusinessEventAppliedInTx: jest.fn(),
}));

import { hashBusinessPayload } from "@/services/events/business-event.service";
import {
  getCountryPack,
  resolveRegulatoryParameter,
} from "@/services/regulatory/regulatory-capability.service";
import {
  assertPayrollProductionAdmission,
  assertPayrollProductionAdmissionInTx,
  PAYROLL_PRODUCTION_CALCULATOR_CONTRACT,
} from "../payroll-production-admission";
import { buildPayrollStatutoryScenarioCoverageSummary } from "../payroll-statutory-scenario-coverage.service";
import {
  emitPayrollPayslips,
  postPayrollRun,
  approveAndPostPayrollRun,
  requestPayrollPaymentBatch,
  releasePayrollPaymentBatch,
  preparePayrollDeclarations,
} from "../payroll-control.service";
import { recordBusinessEventInTx } from "@/services/events/business-event.service";
import { createLedgerPostingBatch } from "@/services/accounting/posting.service";
import { Prisma } from "@prisma/client";

const paths = {
  pensionRates: "payroll.cnps.pensionRatesBps",
  familyAllowanceRates: "payroll.cnps.familyAllowanceRatesBps",
  occupationalRiskRates: "payroll.cnps.occupationalRiskRatesBps",
  employerRules: "payroll.cnps.employerRules",
  incomeTaxRules: "payroll.irpp.incomeTaxRules",
  productionAdmission: "payroll.productionAdmission",
};
// Synthetic reviewed evidence only; this is not approval of a national pack.
const coveragePayload = {
  status: "READY",
  countryCode: "CM",
  packVersion: "CM-SYNTHETIC",
  executableScenarioCount: 5,
  readyFamilyCount: 5,
  requiredFamilyCount: 5,
  blockerCodes: [],
  reviewEvidence: {
    presentCount: 5,
    missingCount: 0,
    reviewedBy: ["synthetic-reviewer"],
    reviewedOn: ["2026-10-01"],
    legalRefs: ["synthetic-source"],
    sourceEvidenceHashes: ["sha256:synthetic-source"],
  },
};
const coverageHash = `sha256:${hashBusinessPayload(coveragePayload)}`;
function resolution(parameterPath: string) {
  return {
    parameterPath,
    countryCode: "CM",
    packVersion: "CM-SYNTHETIC",
    schemaVersion: "country-pack.v1",
    capabilityStatus: "SUPPORTED",
    verificationStatus: "EXPERT_REVIEWED",
    resolutionHash: `sha256:${parameterPath}`,
    value: {
      productionCalculationSupported: true,
      status: "APPROVED",
      scope: "CM_PRIVATE_SME_MONTHLY_SINGLE_EMPLOYER",
      calculatorContract: PAYROLL_PRODUCTION_CALCULATOR_CONTRACT,
      obligationCatalogueHash: `sha256:${"a".repeat(64)}`,
      releaseEvidenceHash: `sha256:${"b".repeat(64)}`,
    },
  };
}
function runFixture() {
  const identity = {
    countryCode: "CM",
    countryPackVersion: "CM-SYNTHETIC",
    countryPackSchemaVersion: "country-pack.v1",
    countryPackResolutionHash: "sha256:pack",
    countryPackCapabilityStatus: "SUPPORTED",
  };
  return {
    ...identity,
    payrollPeriod: { payDate: new Date("2026-10-31T00:00:00Z"), frequency: "MONTHLY" },
    metadata: {
      countryPackStatus: {
        ...identity,
        ...Object.fromEntries(
          Object.entries(paths).map(([key, path]) => [key, resolution(path)]),
        ),
      },
      hrisPayrollReadinessHash: "sha256:hris",
      payrollInputReadinessHash: "sha256:ready",
      payrollEngineInputHashes: ["sha256:input"],
      payrollEngineInputSnapshotHash: "sha256:inputs",
      payrollInputReadiness: { status: "READY", verdictHash: "sha256:ready" },
      statutoryScenarioCoverage: { ...coveragePayload, coverageHash },
      statutoryScenarioCoverageHash: coverageHash,
    },
    lines: [
      {
        calculationSnapshot: {
          incomeTaxCalculationStatus: "CALCULATED",
          incomeTaxApplied: true,
          incomeTaxWithholdingAmount: "0.00",
          payrollInputReadinessHash: "sha256:ready",
          hrisPayrollReadinessHash: "sha256:hris",
          payrollEngineInputHash: "sha256:input",
          countryPackProvenance: {
            countryCode: "CM",
            packVersion: "CM-SYNTHETIC",
            schemaVersion: "country-pack.v1",
            resolutionHash: "sha256:pack",
            statutoryScenarioCoverageHash: coverageHash,
            capabilityStatus: "SUPPORTED",
          },
        },
      },
    ],
  };
}

beforeEach(() => {
  jest.clearAllMocks();
  (resolveRegulatoryParameter as jest.Mock).mockImplementation(resolution);
  (getCountryPack as jest.Mock).mockReturnValue({
    header: { status: "PUBLISHED" },
  });
  (buildPayrollStatutoryScenarioCoverageSummary as jest.Mock).mockReturnValue({
    ...coveragePayload,
    blockers: [],
  });
});

const previousWriteSwitch = process.env.PAYROLL_TRUST_SPINE_WRITES_ENABLED;
beforeAll(() => {
  process.env.PAYROLL_TRUST_SPINE_WRITES_ENABLED = "true";
});
afterAll(() => {
  if (previousWriteSwitch === undefined)
    delete process.env.PAYROLL_TRUST_SPINE_WRITES_ENABLED;
  else process.env.PAYROLL_TRUST_SPINE_WRITES_ENABLED = previousWriteSwitch;
});

function transitionFixture(status = "APPROVED") {
  const evidence = runFixture();
  const line = {
    id: "line-1",
    employeeId: "employee-1",
    employee: { employeeNumber: "EMP-1" },
    currency: "XAF",
    grossAmount: new Prisma.Decimal(100),
    employeeDeductionAmount: new Prisma.Decimal(0),
    employerChargeAmount: new Prisma.Decimal(0),
    netPayableAmount: new Prisma.Decimal(100),
    calculationSnapshot: evidence.lines[0].calculationSnapshot,
  };
  const run = {
    ...evidence,
    id: "run-1",
    organizationId: "org-1",
    runNumber: "SYNTHETIC",
    runType: "ORDINARY",
    originalRunId: null,
    payrollPeriodId: "period-1",
    status,
    version: 3,
    preparedById: "preparer",
    approvedById: "approver",
    approvedAt: new Date(),
    approvedBusinessEventId: "event-approved",
    emittedById: "approver",
    emittedAt: new Date(),
    emittedBusinessEventId: "event-emitted",
    ledgerPostingBatchId: "ledger-1",
    postedBusinessEventId: "event-posted",
    netPayableAmount: new Prisma.Decimal(100),
    currency: "XAF",
    lines: [line],
    payslips:
      status === "APPROVED"
        ? []
        : [{ status: "EMITTED", emittedBusinessEventId: "event-emitted" }],
    metadata: evidence.metadata,
  };
  const tx = {
    payrollRun: {
      findFirst: jest.fn().mockResolvedValue(run),
      updateMany: jest.fn().mockResolvedValue({ count: 1 }),
    },
    payrollRunTransition: {
      findUnique: jest.fn().mockResolvedValue(null),
      findFirst: jest.fn().mockResolvedValue(null),
      create: jest.fn(),
    },
    payrollPayslip: {
      create: jest.fn().mockResolvedValue({ id: "payslip-1" }),
      update: jest.fn(),
    },
    payrollPaymentBatch: {
      findFirst: jest.fn().mockResolvedValue(null),
      create: jest.fn(),
      update: jest.fn(),
    },
    payrollDeclaration: { create: jest.fn() },
    auditLog: { create: jest.fn() },
  };
  const client = {
    $transaction: jest.fn(async (work: (tx: unknown) => unknown) => work(tx)),
  };
  return { run, tx, client };
}
function transitionInput() {
  return {
    organizationId: "org-1",
    payrollRunId: "run-1",
    actorId: "operator",
    actorPermissions: ["payroll.payslips.emit", "payroll.run.post"],
    expectedVersion: 3,
    idempotencyKey: "command-1",
    now: new Date("2026-10-07T10:00:00Z"),
    lastAuthAt: new Date("2026-10-07T09:59:00Z"),
  };
}

it("emits with the real admission guard and complete synthetic evidence", async () => {
  const { run, tx, client } = transitionFixture();
  tx.payrollRun.findFirst
    .mockResolvedValueOnce(run)
    .mockResolvedValue({
      ...run,
      status: "EMITTED",
      payslips: [{ id: "payslip-1" }],
    });
  await expect(
    emitPayrollPayslips(transitionInput(), client as never),
  ).resolves.toMatchObject({ idempotent: false });
  expect(tx.payrollPayslip.create).toHaveBeenCalledTimes(1);
});

it.each(["emit", "post", "request", "release", "declarations"])(
  "blocks partial promotion at the direct %s service before financial writes",
  async (operation) => {
    const { run, tx, client } = transitionFixture(
      operation === "emit"
        ? "APPROVED"
        : operation === "post"
          ? "EMITTED"
          : "POSTED",
    );
    run.countryPackCapabilityStatus = "REQUIRES_EXPERT_REVIEW";
    const input = transitionInput();
    let promise: Promise<unknown>;
    if (operation === "emit")
      promise = emitPayrollPayslips(input, client as never);
    else if (operation === "post")
      promise = postPayrollRun(input, client as never);
    else if (operation === "request")
      promise = requestPayrollPaymentBatch(
        {
          organizationId: "org-1",
          payrollRunId: "run-1",
          method: "BANK_TRANSFER",
          paymentDate: "2026-10-31",
          requestedById: "operator",
          actorPermissions: ["payroll.payment.request"],
          idempotencyKey: "request-1",
          allocations: [
            { payslipId: "payslip-1", employeeId: "employee-1", amount: "100" },
          ],
        },
        client as never,
      );
    else if (operation === "release") {
      tx.payrollPaymentBatch.findFirst.mockResolvedValue({
        payrollRun: run,
        status: "APPROVED",
        requestedById: "requester",
        approvedById: "approver",
        approvedAt: new Date(),
      });
      promise = releasePayrollPaymentBatch(
        {
          organizationId: "org-1",
          payrollPaymentBatchId: "batch-1",
          releasedById: "operator",
          actorPermissions: ["payroll.payment.release"],
          idempotencyKey: "release-1",
        },
        client as never,
      );
    } else
      promise = preparePayrollDeclarations(
        {
          organizationId: "org-1",
          payrollRunId: "run-1",
          preparedById: "operator",
        },
        client as never,
      );
    await expect(promise).rejects.toThrow(
      "PAYROLL_PRODUCTION_ADMISSION_BLOCKED",
    );
    expect(tx.payrollPayslip.create).not.toHaveBeenCalled();
    expect(tx.payrollRun.updateMany).not.toHaveBeenCalled();
    expect(tx.payrollPaymentBatch.create).not.toHaveBeenCalled();
    expect(tx.payrollDeclaration.create).not.toHaveBeenCalled();
    expect(recordBusinessEventInTx).not.toHaveBeenCalled();
    expect(createLedgerPostingBatch).not.toHaveBeenCalled();
  },
);

it("blocks the legacy combined posting path when its write switch permits it", async () => {
  process.env.PAYROLL_TRUST_SPINE_WRITES_ENABLED = "false";
  try {
    const { run, tx, client } = transitionFixture("CALCULATED");
    run.countryPackCapabilityStatus = "REQUIRES_EXPERT_REVIEW";
    await expect(
      approveAndPostPayrollRun(
        {
          organizationId: "org-1",
          payrollRunId: "run-1",
          approvedById: "operator",
          actorPermissions: ["payroll.runs.approve"],
          idempotencyKey: "legacy-1",
        },
        client as never,
      ),
    ).rejects.toThrow("PAYROLL_PRODUCTION_ADMISSION_BLOCKED");
    expect(tx.payrollPayslip.create).not.toHaveBeenCalled();
    expect(createLedgerPostingBatch).not.toHaveBeenCalled();
  } finally {
    process.env.PAYROLL_TRUST_SPINE_WRITES_ENABLED = "true";
  }
});

it("preserves a completed emission replay after rule changes without creating new effects", async () => {
  const { run, tx, client } = transitionFixture("EMITTED");
  const input = transitionInput();
  const payloadHash = `sha256:${hashBusinessPayload({ operation: "emitPayrollPayslips", payrollRunId: input.payrollRunId, expectedVersion: input.expectedVersion, actorId: input.actorId, documentHash: null })}`;
  tx.payrollRunTransition.findUnique.mockResolvedValue({
    payrollRunId: run.id,
    toStatus: "EMITTED",
    payloadHash,
    businessEventId: "event-emitted",
  });
  await expect(
    emitPayrollPayslips(input, client as never),
  ).resolves.toMatchObject({ idempotent: true });
  (resolveRegulatoryParameter as jest.Mock).mockImplementation((path) => ({
    ...resolution(path),
    resolutionHash: "sha256:changed-after-emission",
  }));
  await expect(
    emitPayrollPayslips(input, client as never),
  ).resolves.toMatchObject({ idempotent: true });
  expect(tx.payrollPayslip.create).not.toHaveBeenCalled();
  expect(resolveRegulatoryParameter).not.toHaveBeenCalled();
});

it("denies a missing full-scope release decision despite supported calculation families", () => {
  const run = runFixture();
  delete (run.metadata.countryPackStatus as Record<string, unknown>)
    .productionAdmission;
  expect(() => assertPayrollProductionAdmission(run)).toThrow(
    "payroll.productionAdmission",
  );
});

it.each([
  "scope",
  "calculatorContract",
  "obligationCatalogueHash",
  "releaseEvidenceHash",
])("denies unaccepted release %s", (field) => {
  (resolveRegulatoryParameter as jest.Mock).mockImplementation((path) => {
    const result = resolution(path);
    return path === paths.productionAdmission
      ? { ...result, value: { ...result.value, [field]: "unreviewed" } }
      : result;
  });
  expect(() => assertPayrollProductionAdmission(runFixture())).toThrow(
    "approved release scope",
  );
});

it("admits complete reviewed synthetic evidence, including reviewed zero withholding", () => {
  expect(() => assertPayrollProductionAdmission(runFixture())).not.toThrow();
  expect(resolveRegulatoryParameter).toHaveBeenCalledWith(
    paths.incomeTaxRules,
    expect.objectContaining({
      pinnedPackVersion: "CM-SYNTHETIC",
      purpose: "PAYROLL_IRPP_INCOME_TAX",
      date: new Date("2026-10-31T00:00:00Z"),
    }),
  );
});

it.each(["WEEKLY", "BIWEEKLY", "DAILY"])("rejects a %s period under monthly release scope", (frequency) => {
  const run = runFixture(); run.payrollPeriod.frequency = frequency;
  expect(() => assertPayrollProductionAdmission(run)).toThrow("monthly payroll period");
});

it("rejects another country instead of reusing Cameroon release approval", () => {
  const run = runFixture(); run.countryCode = "GA";
  expect(() => assertPayrollProductionAdmission(run)).toThrow("requires Cameroon");
});

it.each([
  "SUPPORTED_DRAFT",
  "REQUIRES_EXPERT_REVIEW",
  "PARTIALLY_SUPPORTED",
  "OUT_OF_SCOPE",
])("denies %s instead of treating it as exempt", (status) => {
  const run = runFixture();
  run.countryPackCapabilityStatus = status;
  expect(() => assertPayrollProductionAdmission(run)).toThrow(
    "PAYROLL_PRODUCTION_ADMISSION_BLOCKED",
  );
});

it("denies CNPS-only promotion even if the aggregate header was marked supported", () => {
  const run = runFixture();
  (run.metadata.countryPackStatus as Record<string, unknown>).incomeTaxRules = {
    ...resolution(paths.incomeTaxRules),
    capabilityStatus: "REQUIRES_EXPERT_REVIEW",
  };
  expect(() => assertPayrollProductionAdmission(run)).toThrow(
    paths.incomeTaxRules,
  );
});

it.each(["SOURCE_CHECKED", "REQUIRES_EXPERT_REVIEW"])(
  "denies unapproved provenance %s",
  (verificationStatus) => {
    (resolveRegulatoryParameter as jest.Mock).mockImplementation((path) => ({
      ...resolution(path),
      verificationStatus,
    }));
    expect(() => assertPayrollProductionAdmission(runFixture())).toThrow(
      "no longer current",
    );
  },
);

it("denies stale rule evidence on a later invocation", () => {
  const run = runFixture();
  assertPayrollProductionAdmission(run);
  (resolveRegulatoryParameter as jest.Mock).mockImplementation((path) => ({
    ...resolution(path),
    resolutionHash: "sha256:revised",
  }));
  expect(() => assertPayrollProductionAdmission(run)).toThrow(
    "recalculate and review",
  );
});

it("denies a production-disabled tax rule despite supported capability", () => {
  (resolveRegulatoryParameter as jest.Mock).mockImplementation((path) => ({
    ...resolution(path),
    value: { productionCalculationSupported: false },
  }));
  expect(() => assertPayrollProductionAdmission(runFixture())).toThrow(
    "income-tax calculation is unavailable",
  );
});

it("denies unavailable or retired packs", () => {
  (getCountryPack as jest.Mock).mockReturnValue({
    header: { status: "RETIRED" },
  });
  expect(() => assertPayrollProductionAdmission(runFixture())).toThrow(
    "pinned country pack is unavailable",
  );
});

it.each(["blocked", "missing", "stale"])(
  "denies %s scenario evidence",
  (variant) => {
    const run = runFixture();
    if (variant === "blocked")
      (
        buildPayrollStatutoryScenarioCoverageSummary as jest.Mock
      ).mockReturnValue({
        ...coveragePayload,
        status: "BLOCKED",
        blockers: [{ code: "MISSING_REVIEW" }],
      });
    if (variant === "missing") run.metadata.statutoryScenarioCoverageHash = "";
    if (variant === "stale")
      run.metadata.statutoryScenarioCoverage.coverageHash = "sha256:old";
    expect(() => assertPayrollProductionAdmission(run)).toThrow(
      "scenario evidence is incomplete or stale",
    );
  },
);

it.each([
  "blocked-tax",
  "unapplied-tax",
  "missing-tax",
  "stale-input",
  "foreign-line",
])("denies employee evidence: %s", (variant) => {
  const run = runFixture();
  const snapshot = run.lines[0].calculationSnapshot;
  if (variant === "blocked-tax")
    snapshot.incomeTaxCalculationStatus = "BLOCKED_REQUIRES_EXPERT_REVIEW";
  if (variant === "unapplied-tax") snapshot.incomeTaxApplied = false;
  if (variant === "missing-tax")
    delete (snapshot as Record<string, unknown>).incomeTaxWithholdingAmount;
  if (variant === "stale-input")
    snapshot.payrollInputReadinessHash = "sha256:old";
  if (variant === "foreign-line")
    snapshot.payrollEngineInputHash = "sha256:foreign";
  expect(() => assertPayrollProductionAdmission(run)).toThrow(
    "PAYROLL_PRODUCTION_ADMISSION_BLOCKED",
  );
});

it("does not accept bypasses in requested metadata", () => {
  const run = runFixture();
  run.countryPackCapabilityStatus = "REQUIRES_EXPERT_REVIEW";
  (run.metadata as Record<string, unknown>).requestedMetadata = {
    productionAdmission: true,
    exempt: true,
  };
  expect(() => assertPayrollProductionAdmission(run)).toThrow(
    "not production supported",
  );
});

it("loads the run by tenant and excludes deleted records", async () => {
  const tx = {
    payrollRun: { findFirst: jest.fn().mockResolvedValue(runFixture()) },
  };
  await assertPayrollProductionAdmissionInTx(tx as never, "org-1", "run-1");
  expect(tx.payrollRun.findFirst).toHaveBeenCalledWith({
    where: { id: "run-1", organizationId: "org-1", deletedAt: null },
    include: { payrollPeriod: true, lines: true },
  });
  tx.payrollRun.findFirst.mockResolvedValue(null);
  await expect(
    assertPayrollProductionAdmissionInTx(tx as never, "org-2", "run-1"),
  ).rejects.toThrow("Payroll run not found");
});
