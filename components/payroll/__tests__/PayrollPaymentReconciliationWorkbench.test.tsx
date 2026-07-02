import { fireEvent, render, screen, waitFor } from "@testing-library/react";

import { recordPayrollPaymentSettlementEvidenceAction } from "@/actions/payroll/payroll-payment-reconciliation.actions";
import type { PayrollPaymentReconciliationReadModel } from "@/actions/payroll/payroll-payment-reconciliation.actions";
import PayrollPaymentReconciliationWorkbench from "../PayrollPaymentReconciliationWorkbench";

const mockRefresh = jest.fn();

jest.mock("next/navigation", () => ({
  useRouter: () => ({ refresh: mockRefresh }),
}));

jest.mock("@/actions/payroll/payroll-payment-reconciliation.actions", () => ({
  recordPayrollPaymentSettlementEvidenceAction: jest.fn(),
}));

jest.mock("@/i18n/routing", () => ({
  localizePath: (href: string, locale: string) => `/${locale}${href}`,
}));

jest.mock("lucide-react", () => {
  const React = require("react");
  const makeIcon = (name: string) => {
    const MockIcon = (props: React.SVGProps<SVGSVGElement>) =>
      React.createElement("svg", { "data-testid": `icon-${name}`, ...props });
    MockIcon.displayName = `Mock${name}Icon`;
    return MockIcon;
  };

  return new Proxy(
    { __esModule: true },
    {
      get(target, prop) {
        if (prop in target) return target[prop as keyof typeof target];
        return makeIcon(String(prop));
      },
    },
  );
});

const mockRecordSettlement =
  recordPayrollPaymentSettlementEvidenceAction as jest.Mock;

function reconciliationData(): PayrollPaymentReconciliationReadModel {
  return {
    organizationId: "org-1",
    asOf: "2026-06-30T12:00:00.000Z",
    summary: {
      batchCount: 1,
      awaitingProviderEvidence: 0,
      exceptionOpen: 0,
      readyToSettle: 1,
      partiallySettled: 0,
      settled: 0,
    },
    redaction: {
      amounts: {
        allowed: true,
        mode: "allow",
        reasonCode: "ALLOWED",
        policy: "kontava-payroll-person-redaction-policy",
        replacement: "[REDACTED:PAYROLL]",
        requiredPermissions: ["payroll.payslips.read"],
      },
      providerReferences: {
        allowed: true,
        mode: "allow",
        reasonCode: "ALLOWED",
        policy: "kontava-payment-provider-reference-mask-policy",
        replacement: "[MASKED:PAYMENT]",
        requiredPermissions: ["payments.reconciliation.read"],
      },
      suspenseDetails: {
        allowed: true,
        mode: "allow",
        reasonCode: "ALLOWED",
        policy: "kontava-reconciliation-suspense-redaction-policy",
        replacement: "[REDACTED:SUSPENSE]",
        requiredPermissions: ["payments.reconciliation.exception.resolve"],
      },
      proofIdentifiers: {
        allowed: true,
        mode: "allow",
        reasonCode: "ALLOWED",
        policy: "kontava-proof-hidden-identifier-policy",
        replacement: "[REDACTED:IDENTIFIER]",
        requiredPermissions: ["payments.reconciliation.read"],
      },
    },
    batches: [
      {
        id: "batch-1",
        batchNumber: "PAY-BROWSER-PAY-2026-06",
        payrollRunId: "run-1",
        runNumber: "PAY-BROWSER-RUN-2026-06",
        periodName: "June 2026",
        status: "RELEASED",
        reconciliationStatus: "READY_TO_SETTLE",
        amount: "335000.00",
        currency: "XAF",
        method: "MOBILE_MONEY",
        paymentDate: "2026-06-30T12:00:00.000Z",
        ledgerPostingBatchId: "ledger-payment-1",
        postedBusinessEventId: "event-release-1",
        paymentTransactionId: "payment-tx-1",
        paymentExceptionId: null,
        evidenceHash: "sha256:payment-evidence",
        documentHash: "sha256:payment-document",
        bankFileHash: "sha256:bank-file",
        derivedState: "READY_TO_SETTLE",
        nextAction:
          "Record settlement evidence with fresh authentication and maker-checker control.",
        proof: {
          payrollRegisterSource: "services/payroll/payroll-register.service.ts",
          providerEvidenceRequired: true,
          closeImpactSourceCode: "PAYROLL_PAYMENT_RECONCILED",
          componentRegisterProofHash: "sha256:component-proof",
          componentRegisterProofStatus: "MATCHED",
          payrollComponentMappingHash: "sha256:component-mapping",
          payrollComponentMappingStatus: "MAPPED",
          yearToDatePolicyHash: "sha256:ytd-policy",
          yearToDateAccumulatorHashes: ["sha256:ytd-accumulator"],
          paymentAdapterProofHash: "sha256:payment-adapter-proof",
          paymentProviderAdapterContractHash: "sha256:payment-adapter-contract",
          paymentAdapterStatus: "SUPPORTED_CERTIFIED",
          paymentProviderAdapterKey: "MOMO_PAYROLL_PROVIDER_API",
          adapterChaosReleaseGateHash: "sha256:adapter-chaos-gate",
          productionPaymentAutomationSupported: true,
          latestSettlementEvidenceHash: "sha256:settlement-evidence",
          latestSettlementSourceRegisterHash: "sha256:settlement-register",
          latestSettlementLifecycleContractHash: "sha256:settlement-lifecycle",
          latestSettlementLifecycleStatus: "SETTLED_WITH_PROVIDER_EVIDENCE",
          latestSettlementLifecycleCloseImpact: "CLOSE_EVIDENCE_STALE_ON_CHANGE",
          latestSettlementBusinessEventId: "event-settlement-1",
          latestSettlementAt: "2026-06-30T12:10:00.000Z",
          sourceLinks: [
            {
              type: "PayrollPaymentBatch",
              id: "batch-1",
              evidenceHash: "sha256:payment-evidence",
            },
            {
              type: "PaymentTransaction",
              id: "payment-tx-1",
              payloadHash: "sha256:payment-payload",
            },
          ],
        },
        paymentTransaction: {
          id: "payment-tx-1",
          state: "CONFIRMED",
          providerAccountId: "provider-account-1",
          providerAccountName: "Main Mobile Money",
          providerReference: "PAY-BROWSER-PAY-2026-06",
          providerTransactionId: "MOMO-PAYROLL-2026-06-001",
          payloadHash: "sha256:payment-payload",
          occurredAt: "2026-06-30T12:00:00.000Z",
          confirmedAt: "2026-06-30T12:05:00.000Z",
          settledAt: null,
        },
        matches: [
          {
            id: "match-1",
            status: "APPROVED",
            rule: "EXACT_PROVIDER_REFERENCE",
            confidence: "100.00",
            amountMatched: "335000.00",
            providerEventId: "provider-event-1",
            statementLineId: "statement-line-1",
            statementFileHash: "sha256:statement-file",
            reconciliationRunId: "recon-run-1",
          },
        ],
        exceptions: [],
        suspenseItems: [],
        retry: {
          available: false,
          attempts: 0,
          nextAttemptAt: null,
          lastError: null,
        },
      },
    ],
  };
}

function fillSettlementProof() {
  fireEvent.change(screen.getByLabelText("Source register hash"), {
    target: { value: "sha256:register-proof" },
  });
  fireEvent.change(screen.getByLabelText("Evidence hash"), {
    target: { value: "sha256:settlement-input" },
  });
}

describe("PayrollPaymentReconciliationWorkbench", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockRecordSettlement.mockResolvedValue({
      success: true,
      data: {
        payrollPaymentBatchId: "batch-1",
        payrollRunId: "run-1",
        status: "SETTLED",
        reconciliationStatus: "SETTLED",
        paymentTransactionId: "payment-tx-1",
        businessEventId: "event-settlement-1",
        settlementEvidenceHash: "sha256:settlement-evidence",
        idempotent: false,
      },
      error: null,
      status: 200,
    });
  });

  it("renders payroll payment reconciliation proof and localized links", () => {
    render(
      <PayrollPaymentReconciliationWorkbench
        data={reconciliationData()}
        locale="en"
      />,
    );

    expect(
      screen.getByRole("heading", { name: "Payment reconciliation" }),
    ).toBeInTheDocument();
    expect(
      screen.getAllByText("PAY-BROWSER-PAY-2026-06").length,
    ).toBeGreaterThan(0);
    expect(screen.getAllByText("READY_TO_SETTLE").length).toBeGreaterThan(0);
    expect(
      screen.getAllByText("sha256:payment-evidence").length,
    ).toBeGreaterThan(0);
    expect(
      screen.getAllByText("PAYROLL_PAYMENT_RECONCILED").length,
    ).toBeGreaterThan(0);
    expect(
      screen.getAllByText("sha256:component-proof").length,
    ).toBeGreaterThan(0);
    expect(
      screen.getAllByText("sha256:payment-adapter-proof").length,
    ).toBeGreaterThan(0);
    expect(
      screen.getAllByText("sha256:settlement-lifecycle").length,
    ).toBeGreaterThan(0);
    expect(
      screen.getByRole("button", { name: "Record settlement proof" }),
    ).toBeInTheDocument();

    fireEvent.click(screen.getByRole("button", { name: "Proof drawer" }));
    expect(screen.getByRole("dialog")).toBeInTheDocument();
    expect(screen.getByText("Provider evidence required")).toBeInTheDocument();
    expect(screen.getByText("Provider adapter proof")).toBeInTheDocument();
    expect(screen.getByText("sha256:adapter-chaos-gate")).toBeInTheDocument();
    expect(screen.getByText("Settlement lifecycle status")).toBeInTheDocument();
    expect(
      screen.getAllByText("SETTLED_WITH_PROVIDER_EVIDENCE").length,
    ).toBeGreaterThan(0);
    expect(screen.getByText("Source link 1")).toBeInTheDocument();

    const hrefs = Array.from(document.querySelectorAll("a")).map((link) =>
      link.getAttribute("href"),
    );
    expect(hrefs).toEqual(
      expect.arrayContaining([
        "/en/dashboard/finance/reconciliation",
        "/en/dashboard/payroll/register",
      ]),
    );
  });

  it("renders service-redacted payment proof identifiers", () => {
    const data = reconciliationData();
    data.redaction.proofIdentifiers = {
      allowed: false,
      mode: "redact",
      reasonCode: "MISSING_PERMISSION",
      policy: "kontava-proof-hidden-identifier-policy",
      replacement: "[REDACTED:IDENTIFIER]",
      requiredPermissions: ["payments.reconciliation.read"],
    };
    const batch = data.batches[0];
    batch.paymentTransactionId = "[REDACTED:IDENTIFIER]";
    batch.evidenceHash = "[REDACTED:IDENTIFIER]";
    batch.documentHash = "[REDACTED:IDENTIFIER]";
    batch.bankFileHash = "[REDACTED:IDENTIFIER]";
    batch.proof.componentRegisterProofHash = "[REDACTED:IDENTIFIER]";
    batch.proof.payrollComponentMappingHash = "[REDACTED:IDENTIFIER]";
    batch.proof.yearToDatePolicyHash = "[REDACTED:IDENTIFIER]";
    batch.proof.yearToDateAccumulatorHashes = ["[REDACTED:IDENTIFIER]"];
    batch.proof.paymentAdapterProofHash = "[REDACTED:IDENTIFIER]";
    batch.proof.paymentProviderAdapterContractHash = "[REDACTED:IDENTIFIER]";
    batch.proof.adapterChaosReleaseGateHash = "[REDACTED:IDENTIFIER]";
    batch.proof.latestSettlementEvidenceHash = "[REDACTED:IDENTIFIER]";
    batch.proof.latestSettlementSourceRegisterHash = "[REDACTED:IDENTIFIER]";
    batch.proof.latestSettlementLifecycleContractHash = "[REDACTED:IDENTIFIER]";
    batch.proof.sourceLinks = batch.proof.sourceLinks.map((link) => ({
      ...link,
      documentHash: link.documentHash
        ? "[REDACTED:IDENTIFIER]"
        : link.documentHash,
      evidenceHash: link.evidenceHash
        ? "[REDACTED:IDENTIFIER]"
        : link.evidenceHash,
      payloadHash: link.payloadHash
        ? "[REDACTED:IDENTIFIER]"
        : link.payloadHash,
    }));
    batch.matches = batch.matches.map((match) => ({
      ...match,
      providerEventId: match.providerEventId
        ? "[REDACTED:IDENTIFIER]"
        : match.providerEventId,
      statementLineId: match.statementLineId
        ? "[REDACTED:IDENTIFIER]"
        : match.statementLineId,
      statementFileHash: match.statementFileHash
        ? "[REDACTED:IDENTIFIER]"
        : match.statementFileHash,
    }));
    if (batch.paymentTransaction) {
      batch.paymentTransaction.payloadHash = "[REDACTED:IDENTIFIER]";
    }

    render(<PayrollPaymentReconciliationWorkbench data={data} locale="en" />);

    expect(
      screen.queryByText("sha256:payment-evidence"),
    ).not.toBeInTheDocument();
    expect(
      screen.queryByText("sha256:payment-payload"),
    ).not.toBeInTheDocument();
    expect(
      screen.queryByText("sha256:payment-adapter-proof"),
    ).not.toBeInTheDocument();
    expect(
      screen.queryByText("sha256:settlement-lifecycle"),
    ).not.toBeInTheDocument();
    expect(screen.getAllByText("[REDACTED:IDENTIFIER]").length).toBeGreaterThan(
      0,
    );

    fireEvent.click(screen.getByRole("button", { name: "Proof drawer" }));
    expect(screen.getByText("payment.proofIdentifiers")).toBeInTheDocument();
    expect(
      screen.getByText("kontava-proof-hidden-identifier-policy"),
    ).toBeInTheDocument();
  });

  it("submits settlement evidence without client-supplied tenant or actor context", async () => {
    render(
      <PayrollPaymentReconciliationWorkbench
        data={reconciliationData()}
        locale="en"
      />,
    );

    fillSettlementProof();
    fireEvent.click(
      screen.getByRole("button", { name: "Record settlement proof" }),
    );

    await waitFor(() => {
      expect(mockRecordSettlement).toHaveBeenCalledWith(
        expect.objectContaining({
          payrollPaymentBatchId: "batch-1",
          settlementStatus: "settled",
          settlementAmount: "335000.00",
          evidenceHash: "sha256:settlement-input",
          sourceRegisterHash: "sha256:register-proof",
          matchRecordId: "match-1",
          providerAccountId: "provider-account-1",
          providerTransactionId: "MOMO-PAYROLL-2026-06-001",
          providerReference: "PAY-BROWSER-PAY-2026-06",
          providerEventId: "provider-event-1",
          statementLineId: "statement-line-1",
          statementFileHash: "sha256:statement-file",
          metadata: expect.objectContaining({
            sourceSurface: "/dashboard/payroll/payments",
          }),
        }),
      );
    });
    expect(mockRecordSettlement.mock.calls[0][0]).not.toMatchObject({
      organizationId: expect.any(String),
      actorId: expect.any(String),
      actorPermissions: expect.any(Array),
      lastAuthAt: expect.anything(),
    });
    expect(
      await screen.findByText("Settlement evidence recorded."),
    ).toBeInTheDocument();
    expect(mockRefresh).toHaveBeenCalled();
  });

  it("renders fresh-auth denial returned by settlement action", async () => {
    mockRecordSettlement.mockResolvedValueOnce({
      success: false,
      data: null,
      error: "Fresh authentication required",
      status: 403,
      code: "FRESH_AUTH_REQUIRED",
      correlationId: "act_fresh_payroll_payment",
      category: "AUTHORIZATION",
      severity: "medium",
      retryable: false,
    });
    render(
      <PayrollPaymentReconciliationWorkbench
        data={reconciliationData()}
        locale="en"
      />,
    );

    fillSettlementProof();
    fireEvent.click(
      screen.getByRole("button", { name: "Record settlement proof" }),
    );

    expect(
      await screen.findByText("Fresh authentication required"),
    ).toBeInTheDocument();
    expect(screen.getByText("act_fresh_payroll_payment")).toBeInTheDocument();
    expect(mockRefresh).not.toHaveBeenCalled();
  });
});
