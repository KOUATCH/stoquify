import {
  fireEvent,
  render,
  screen,
  waitFor,
  within,
} from "@testing-library/react";

import { recordPayrollPaymentSettlementEvidenceAction } from "@/actions/payroll/payroll-payment-reconciliation.actions";
import type { PayrollPaymentReconciliationReadModel } from "@/actions/payroll/payroll-payment-reconciliation.actions";
import PayrollPaymentReconciliationWorkbench from "../PayrollPaymentReconciliationWorkbench";
import PayrollPaymentSettlementForm from "../PayrollPaymentSettlementForm";
import { stepUpWithPasswordAction } from "@/actions/security/step-up-auth.actions";
jest.mock("@/actions/security/step-up-auth.actions", () => ({stepUpWithPasswordAction:jest.fn()}));

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
const proofOptions = {
  register: { id: "run-1", runNumber: "PAY-2026-06", version: 3, revision: "run-revision" },
  matches: [{ id: "match-1", revision: "match-revision", reference: "PAY-001", kind: "provider_and_statement" as const, amount: "335000.00", currency: "XAF", occurredAt: "2026-06-30T09:00:00Z" }],
};

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
    accountingAuditProof: {
      available: true,
      status: "BLOCKED",
      generatedAt: "2026-06-30T10:00:00.000Z",
      scopeHash: "sha256:audit-scope",
      periodId: "acct-period-1",
      trustLevel: "T2",
      verdict: "PARTIAL",
      exportable: false,
      blockerCount: 1,
      criticalBlockerCount: 1,
      highBlockerCount: 0,
      proofGateCount: 2,
      blockedProofGateCount: 1,
      reviewProofGateCount: 0,
      sourceLinkCount: 1,
      sourceTableCount: 3,
      redactionMode: "HASHES_AND_AGGREGATES_ONLY",
      redactionExcluded: ["employee identifiers", "bank details"],
      sourceTables: [
        "payroll_payment_batches",
        "payment_transactions",
        "accounting_source_links",
      ],
      aggregateEvidence: {
        paymentRegisterProofGaps: 1,
        paymentsMissingLedger: 0,
      },
      proofGates: [
        {
          gate: "payroll.payments.proof",
          status: "BLOCKED",
          blockerCount: 1,
          blockerIds: ["payroll-payment-register-proof-missing"],
          evidence: ["payroll payment settlement source register hash"],
        },
        {
          gate: "payroll.accounting.source-link",
          status: "PASS",
          blockerCount: 0,
          blockerIds: [],
          evidence: ["accounting source link hashes"],
        },
      ],
      blockers: [
        {
          id: "payroll-payment-register-proof-missing",
          severity: "critical",
          gate: "payroll.payments.proof",
          title: "Payment register proof missing",
        },
      ],
      latestSourceLinks: [
        {
          sourceLinkHash: "sha256:source-link-proof",
          sourceType: "PAYROLL_PAYMENT_BATCH",
          sourceNumber: "PB-2026-06-0001",
          sourceRefHash: "sha256:payment-ref",
          journalEntryNumber: "JE-2026-06",
          postingBatchId: "ledger-payment-1",
          postingStatus: "POSTED",
          createdAt: "2026-06-30T09:20:00.000Z",
        },
      ],
    },
    batches: [
      {
        id: "batch-1",
        proofOptions,
        batchNumber: "PAY-BROWSER-PAY-2026-06",
        payrollRunId: "run-1",
        runNumber: "PAY-BROWSER-RUN-2026-06",
        periodName: "June 2026",
        status: "RELEASED",
        reconciliationStatus: "READY_TO_SETTLE",
        amount: "335000.00",
        settlement: {remainingAmount:"335000.00",revision:null,availability:"verified",canRecord:true},
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
          latestSettlementProviderReceiptProofHash:
            "sha256:provider-receipt-proof",
          latestSettlementProviderReceiptProofSource:
            "MATCHED_PROVIDER_EVENT_AND_STATEMENT",
          latestSettlementProviderReceiptProviderPayloadHash:
            "sha256:provider-event",
          latestSettlementProviderReceiptStatementLineHash:
            "sha256:statement-line",
          latestSettlementProviderReceiptStatementFileHash:
            "sha256:statement-file",
          latestSettlementLifecycleContractHash: "sha256:settlement-lifecycle",
          latestSettlementLifecycleStatus: "SETTLED_WITH_PROVIDER_EVIDENCE",
          latestSettlementLifecycleCloseImpact:
            "CLOSE_EVIDENCE_STALE_ON_CHANGE",
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
    sourceScope: {
      limit: 25,
      returned: 1,
      coverageComplete: true,
      sourceService: "services/payroll/payment-reconciliation.service.ts",
      accountingAuditProofAvailable: true,
      accountingAuditProofGateCount: 2,
      accountingAuditProofSourceLinkCount: 1,
      accountingAuditProofPeriodId: "acct-period-1",
      returnedAccountingPeriodIds: ["acct-period-1"],
      accountingAuditProofCoverageComplete: true,
    },
  };
}

function fillSettlementProof() {
  fireEvent.change(screen.getByLabelText("Approved reconciliation"), { target: { value: "match-1" } });
}

describe("PayrollPaymentReconciliationWorkbench", () => {
  it("requires eligible stored proof and never offers manual hash fields", () => {
    render(<PayrollPaymentSettlementForm payrollPaymentBatchId="batch" batchNumber="B" amount="100.00" currency="XAF" />);
    expect(screen.getByRole("button", { name: "Record settlement proof" })).toBeDisabled();
    expect(screen.queryByLabelText("Evidence hash")).not.toBeInTheDocument();
    expect(screen.queryByLabelText("Source register hash")).not.toBeInTheDocument();
    expect(screen.getByText(/No eligible unused approved match/)).toBeVisible();
  });
  it("requires selecting proof again when the source revision changes", () => {
    const props = { payrollPaymentBatchId: "batch", batchNumber: "B", amount: "100.00", currency: "XAF", proofOptions };
    const view = render(<PayrollPaymentSettlementForm {...props} />);
    fillSettlementProof();
    view.rerender(<PayrollPaymentSettlementForm {...props} proofOptions={{ ...proofOptions, register: { ...proofOptions.register, revision: "new-run" } }} />);
    expect(screen.getByRole("button", { name: "Record settlement proof" })).toBeDisabled();
    expect(screen.getByRole("alert")).toHaveTextContent("proof changed");
    fillSettlementProof();
    expect(screen.getByRole("button", { name: "Record settlement proof" })).toBeEnabled();
  });
  it("uses the verified remainder and never prefills an already consumed partial match", () => {
    const data=reconciliationData();data.batches[0].status="PARTIALLY_SETTLED";data.batches[0].derivedState="PARTIALLY_SETTLED";
    data.batches[0].settlement={remainingAmount:"500.00",revision:"event-1",availability:"verified",canRecord:true};
    render(<PayrollPaymentReconciliationWorkbench data={data} locale="en"/>);
    expect(screen.getByLabelText("Settlement amount")).toHaveValue("500.00");
    expect(screen.getByLabelText("Approved reconciliation")).toHaveValue("");
  });
  it("keeps drafts until a changed balance is explicitly reviewed", () => {
    const props={payrollPaymentBatchId:"batch",batchNumber:"B",amount:"100.00",currency:"XAF",balanceRevision:null,proofOptions};
    const view=render(<PayrollPaymentSettlementForm {...props}/>);
    fillSettlementProof();
    view.rerender(<PayrollPaymentSettlementForm {...props} amount="60.00" balanceRevision="event1"/>);
    expect(screen.getByRole("button",{name:"Record settlement proof"})).toBeDisabled();
    expect(screen.getByLabelText("Approved reconciliation")).toHaveValue("match-1");
    fireEvent.click(screen.getByRole("button",{name:"Review and use refreshed balance"}));
    expect(screen.getByLabelText("Settlement amount")).toHaveValue("60.00");
    expect(screen.getByLabelText("Approved reconciliation")).toHaveValue("");
  });
  it("locks uncertain entries and retries the identical command after transport failure", async () => {
    mockRecordSettlement.mockRejectedValueOnce(new Error("connection lost"));
    render(<PayrollPaymentReconciliationWorkbench data={reconciliationData()} locale="en"/>);
    fillSettlementProof();fireEvent.click(screen.getByRole("button",{name:"Record settlement proof"}));
    const retry=await screen.findByRole("button",{name:"Retry the same request"});
    expect(screen.getByLabelText("Settlement amount")).toBeDisabled();
    expect(screen.getByLabelText("Approved reconciliation")).toHaveValue("match-1");
    fireEvent.click(retry);await screen.findByText("Settlement evidence recorded.");
    expect(mockRecordSettlement.mock.calls[1][0]).toEqual(mockRecordSettlement.mock.calls[0][0]);
    expect(await screen.findByRole("button",{name:"Record settlement proof"})).toBeDisabled();
  });
  it("localizes French validation and preserves input", async () => {
    mockRecordSettlement.mockResolvedValueOnce({success:false,status:422,code:"BUSINESS_RULE_VIOLATION",error:"English server validation"});
    render(<PayrollPaymentSettlementForm payrollPaymentBatchId="batch" batchNumber="B" amount="100.00" currency="XAF" locale="fr" proofOptions={proofOptions}/>);
    fireEvent.change(screen.getByLabelText("Rapprochement approuvé"),{target:{value:"match-1"}});
    fireEvent.click(screen.getByRole("button",{name:"Enregistrer la preuve de règlement"}));
    expect(await screen.findByRole("alert")).toHaveTextContent("Vérifiez le montant");
    expect(screen.queryByText("English server validation")).not.toBeInTheDocument();
    expect(screen.getByLabelText("Rapprochement approuvé")).toHaveValue("match-1");
  });
  it("restores the invoking settlement button when a pending request loses keyboard focus", async () => {
    mockRecordSettlement.mockImplementationOnce(async () => {
      (document.activeElement as HTMLElement).blur();
      throw new Error("lost response");
    });
    render(<PayrollPaymentSettlementForm payrollPaymentBatchId="batch" batchNumber="B" amount="100.00" currency="XAF" proofOptions={proofOptions}/>);
    fillSettlementProof();
    const submit=screen.getByRole("button",{name:"Record settlement proof"});submit.focus();fireEvent.click(submit);
    await waitFor(()=>expect(screen.getByRole("button",{name:"Retry the same request"})).toHaveFocus());
  });
  it("does not steal focus when the operator moved to another control during submission", async () => {
    mockRecordSettlement.mockImplementationOnce(async () => {
      screen.getByRole("button",{name:"Other control"}).focus();
      throw new Error("lost response");
    });
    render(<><button>Other control</button><PayrollPaymentSettlementForm payrollPaymentBatchId="batch" batchNumber="B" amount="100.00" currency="XAF" proofOptions={proofOptions}/></>);
    fillSettlementProof();
    const submit=screen.getByRole("button",{name:"Record settlement proof"});submit.focus();fireEvent.click(submit);
    await screen.findByRole("button",{name:"Retry the same request"});
    expect(screen.getByRole("button",{name:"Other control"})).toHaveFocus();
  });
  it("does not offer recording for an unverified balance", () => {
    const data=reconciliationData();data.batches[0].settlement={remainingAmount:null,revision:null,availability:"unavailable",canRecord:false};
    render(<PayrollPaymentReconciliationWorkbench data={data} locale="fr"/>);
    expect(screen.queryByRole("form")).not.toBeInTheDocument();
    expect(screen.getByText(/Le solde restant n’est pas vérifié/)).toBeVisible();
  });
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
      screen.getAllByText("sha256:provider-receipt-proof").length,
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
    expect(screen.getByText("Provider receipt proof")).toBeInTheDocument();
    expect(screen.getByText("Provider receipt source")).toBeInTheDocument();
    expect(screen.getByText("sha256:provider-event")).toBeInTheDocument();
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

  it("renders route-level accounting auditor proof drawer", () => {
    render(
      <PayrollPaymentReconciliationWorkbench
        data={reconciliationData()}
        locale="en"
      />,
    );

    expect(screen.getByText("Auditor proof")).toBeInTheDocument();
    expect(screen.getByText("acct-period-1")).toBeInTheDocument();
    fireEvent.click(
      screen.getByRole("button", { name: "Auditor proof drawer" }),
    );

    const dialog = screen.getByRole("dialog");
    expect(
      within(dialog).getByText("Payroll payment auditor proof pack"),
    ).toBeInTheDocument();
    expect(within(dialog).getByText("sha256:audit-scope")).toBeInTheDocument();
    expect(
      within(dialog).getByText(/payroll\.payments\.proof:BLOCKED/),
    ).toBeInTheDocument();
    expect(
      within(dialog).getByText("sha256:source-link-proof"),
    ).toBeInTheDocument();
    expect(
      within(dialog).getByText("paymentRegisterProofGaps:1"),
    ).toBeInTheDocument();
    expect(within(dialog).queryByText("Alice Ngono")).not.toBeInTheDocument();
    expect(
      within(dialog).queryByText("MOMO-PAYROLL-2026-06-001"),
    ).not.toBeInTheDocument();
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
    batch.proof.latestSettlementProviderReceiptProofHash =
      "[REDACTED:IDENTIFIER]";
    batch.proof.latestSettlementProviderReceiptProviderPayloadHash =
      "[REDACTED:IDENTIFIER]";
    batch.proof.latestSettlementProviderReceiptStatementLineHash =
      "[REDACTED:IDENTIFIER]";
    batch.proof.latestSettlementProviderReceiptStatementFileHash =
      "[REDACTED:IDENTIFIER]";
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
      screen.queryByText("sha256:provider-receipt-proof"),
    ).not.toBeInTheDocument();
    expect(screen.queryByText("sha256:provider-event")).not.toBeInTheDocument();
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
          proofSelection: { payrollRunId: "run-1", runVersion: 3, runRevision: "run-revision", matchRecordId: "match-1", matchRevision: "match-revision" },
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
    expect(mockRecordSettlement.mock.calls[0][0]).not.toHaveProperty("evidenceHash");
    expect(mockRecordSettlement.mock.calls[0][0]).not.toHaveProperty("sourceRegisterHash");
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
  it("authenticates without submitting the preserved settlement draft", async () => {
    mockRecordSettlement.mockResolvedValueOnce({ success: false, code: "FRESH_AUTH_REQUIRED", status: 403 });
    (stepUpWithPasswordAction as jest.Mock).mockResolvedValueOnce({ success: true });
    render(<PayrollPaymentReconciliationWorkbench data={reconciliationData()} locale="en" />);
    fillSettlementProof();
    fireEvent.click(screen.getByRole("button", { name: "Record settlement proof" }));
    const password = await screen.findByLabelText("Current password");
    fireEvent.change(password, { target: { value: "test-password" } });
    fireEvent.click(screen.getByRole("button", { name: "Authenticate", exact: true }));
    expect(await screen.findByText("Authentication confirmed. Review and submit the settlement separately.")).toBeVisible();
    expect(stepUpWithPasswordAction).toHaveBeenCalledWith({ password: "test-password" });
    expect(screen.queryByLabelText("Current password")).not.toBeInTheDocument();
    expect(mockRecordSettlement).toHaveBeenCalledTimes(1);
    expect(screen.getByLabelText("Approved reconciliation")).toHaveValue("match-1");
    fireEvent.click(await screen.findByRole("button", { name: "Record settlement proof" }));
    await waitFor(() => expect(mockRecordSettlement).toHaveBeenCalledTimes(2));
    expect(mockRecordSettlement.mock.calls[1][0]).toEqual(mockRecordSettlement.mock.calls[0][0]);
  });
});


it("renders French destination headings without mutating source evidence", () => {
  const data = reconciliationData()
  const original = JSON.stringify(data)
  render(<PayrollPaymentReconciliationWorkbench data={data} locale="fr" />)
  expect(screen.getByRole("heading", { name: "Rapprochement des paiements" })).toBeInTheDocument()
  expect(screen.getByRole("heading", { name: "Lots de paiements" })).toBeInTheDocument()
  expect(JSON.stringify(data)).toBe(original)
})
