import { fireEvent, render, screen } from "@testing-library/react";

import type { PayrollPayslipSelfServiceReadModel } from "@/actions/payroll/payroll-payslip-self-service.actions";
import PayrollPayslipSelfService from "../PayrollPayslipSelfService";

jest.mock("next/link", () => {
  const React = require("react");

  return {
    __esModule: true,
    default: ({
      href,
      children,
      ...props
    }: {
      href: string;
      children: React.ReactNode;
    }) => React.createElement("a", { href, ...props }, children),
  };
});

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

function selfServiceData(): PayrollPayslipSelfServiceReadModel {
  return {
    organizationId: "org-1",
    asOf: "2026-06-30T12:00:00.000Z",
    employee: {
      id: "employee-1",
      employeeNumber: "EMP-001",
      displayName: "Ada Payroll",
      status: "ACTIVE",
      countryCode: "CM",
      department: "Operations",
      jobTitle: "Store lead",
      costCenter: "BRANCH-DOUALA",
      userMappingStatus: "linked",
      paymentDestinationApproved: true,
    },
    summary: {
      payslipCount: 1,
      emittedPayslipCount: 1,
      latestIssuedAt: "2026-06-30T10:00:00.000Z",
      redactedPayslips: 0,
    },
    redaction: {
      payrollAmounts: {
        allowed: true,
        mode: "allow",
        reasonCode: "ALLOWED",
        policy: "kontava-payroll-person-redaction-policy",
        requiredPermissions: ["payroll.payslips.self.read"],
      },
    },
    payslips: [
      {
        id: "payslip-1",
        payslipNumber: "PS-2026-06-001",
        status: "EMITTED",
        issuedAt: "2026-06-30T10:00:00.000Z",
        period: {
          id: "period-1",
          name: "June 2026",
          periodStart: "2026-06-01T00:00:00.000Z",
          periodEnd: "2026-06-30T23:59:59.999Z",
          payDate: "2026-07-05T00:00:00.000Z",
        },
        countryPack: {
          countryCode: "CM",
          version: "CM-2026.1",
          schemaVersion: "country-pack.v1",
          resolutionHash: "sha256:country-pack-resolution",
          capabilityStatus: "SUPPORTED",
          supportedScope: ["IRPP", "CNPS", "Leave", "Overtime"],
          unsupportedClaims: [],
        },
        amounts: {
          grossAmount: "150000.00",
          employeeDeductionAmount: "28000.00",
          employerChargeAmount: "21000.00",
          netPayableAmount: "122000.00",
          currency: "XAF",
        },
        lines: [
          {
            id: "line-1",
            lineNumber: 1,
            code: "BASIC",
            label: "Base salary",
            category: "EARNING",
            baseAmount: "150000.00",
            rateBps: null,
            amount: "150000.00",
            currency: "XAF",
            sourceType: "PayrollRunLine",
            sourceId: "run-line-1",
          },
          {
            id: "line-2",
            lineNumber: 2,
            code: "CNPS_EE",
            label: "CNPS employee",
            category: "DEDUCTION",
            baseAmount: "150000.00",
            rateBps: 420,
            amount: "6300.00",
            currency: "XAF",
            sourceType: "PayrollRunLineComponent",
            sourceId: "component-1",
          },
        ],
        proof: {
          immutableStatus: "EMITTED_LOCKED",
          documentHash: "sha256:payslip-document",
          archiveUri: "evidence://payroll/payslip-1.pdf",
          archiveManifestHash: "sha256:archive-manifest",
          sourceLinks: [
            {
              type: "PayrollRun",
              id: "run-1",
              documentHash: "sha256:run-document",
            },
            {
              type: "PayrollDeclaration",
              id: "declaration-1",
              evidenceHash: "sha256:declaration-evidence",
            },
          ],
        },
        tieOut: {
          payrollRunId: "run-1",
          runNumber: "RUN-2026-06",
          runStatus: "POSTED",
          runLineId: "run-line-1",
          payrollRunLineDocumentHash: "sha256:run-line-document",
          calculationHash: "sha256:calculation",
          ledgerPostingBatchId: "ledger-batch-1",
          postedBusinessEventId: "event-payroll-posted-1",
          paymentStatus: "SETTLED_OR_RELEASED",
          paymentEvidenceHashes: ["sha256:payment-evidence"],
          declarationEvidenceHashes: ["sha256:declaration-evidence"],
        },
      },
    ],
  };
}

describe("PayrollPayslipSelfService", () => {
  it("renders employee-scoped payslip proof drawer without unrelated employee data", () => {
    render(<PayrollPayslipSelfService data={selfServiceData()} locale="en" />);

    expect(
      screen.getByRole("heading", { name: "My payslips" }),
    ).toBeInTheDocument();
    expect(screen.getByText("Ada Payroll / EMP-001")).toBeInTheDocument();
    expect(screen.getByText("PS-2026-06-001")).toBeInTheDocument();
    expect(screen.getAllByText("122000.00 XAF").length).toBeGreaterThan(0);
    expect(
      screen.getAllByText("sha256:payslip-document").length,
    ).toBeGreaterThan(0);
    expect(
      screen.getAllByText("sha256:archive-manifest").length,
    ).toBeGreaterThan(0);

    fireEvent.click(screen.getByRole("button", { name: "Proof drawer" }));

    expect(screen.getByRole("dialog")).toBeInTheDocument();
    expect(screen.getByText("Archive manifest")).toBeInTheDocument();
    expect(screen.getByText("Payroll run")).toBeInTheDocument();
    expect(screen.getByText("Calculation hash")).toBeInTheDocument();
    expect(screen.getByText("Source link 1")).toBeInTheDocument();
    expect(
      screen.getByText("payroll.otherEmployeePayslips"),
    ).toBeInTheDocument();
    expect(screen.getByText("payroll.personLevelAmounts")).toBeInTheDocument();
    expect(
      screen.getAllByText("kontava-payroll-person-redaction-policy").length,
    ).toBeGreaterThan(0);

    expect(screen.queryByText("Bob Payroll")).not.toBeInTheDocument();
    expect(screen.queryByText("EMP-999")).not.toBeInTheDocument();
    expect(screen.queryByText("BANK-OTHER-ACCOUNT")).not.toBeInTheDocument();
    expect(screen.queryByText("TAX-ID-OTHER")).not.toBeInTheDocument();
  });

  it("renders a denied state when self-service access is unavailable", () => {
    render(
      <PayrollPayslipSelfService
        data={null}
        error="Access denied"
        locale="en"
      />,
    );

    expect(
      screen.getByRole("heading", { name: "Payslips unavailable" }),
    ).toBeInTheDocument();
    expect(screen.getByText("Access denied")).toBeInTheDocument();
  });
});
