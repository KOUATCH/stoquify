import { fireEvent, render, screen } from "@testing-library/react";
import {
  PayrollDeclarationEvidenceTransition,
  PayrollDeclarationStatus,
  PayrollPeriodStatus,
  PayrollRunStatus,
  PayrollRunType,
} from "@prisma/client";

import type { PayrollDeclarationWorkbenchResult } from "@/actions/payroll/payroll-control.actions";
import PayrollDeclarationWorkbench from "../PayrollDeclarationWorkbench";

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

function workbenchData(): PayrollDeclarationWorkbenchResult {
  return {
    organizationId: "org-1",
    asOf: "2026-06-30T10:00:00.000Z",
    statusFilter: null,
    redaction: {
      proofIdentifiers: {
        allowed: true,
        mode: "allow",
        reasonCode: "ALLOWED",
        policy: "kontava-proof-hidden-identifier-policy",
        replacement: "[REDACTED:IDENTIFIER]",
        requiredPermissions: ["accounting.close.read"],
      },
    },
    summary: {
      totalDeclarations: 1,
      activeDeclarations: 1,
      rejectedDeclarations: 0,
      returnedDeclarations: 1,
      blockedDeclarations: 0,
      evidenceCount: 1,
      automationBlockedEvidenceCount: 1,
      productionSupportedEvidenceCount: 0,
      missingRegisterProofCount: 0,
      amountInScope: "17150.00",
      coverageComplete: true,
    },
    declarations: [
      {
        id: "declaration-1",
        authority: "CM_CNPS",
        declarationType: "CNPS_EMPLOYER_SOCIAL_CONTRIBUTION",
        status: PayrollDeclarationStatus.PREPARED,
        amount: "17150.00",
        currency: "XAF",
        periodStart: "2026-06-01T00:00:00.000Z",
        periodEnd: "2026-06-30T23:59:59.999Z",
        dueDate: "2026-07-15T00:00:00.000Z",
        country: {
          countryCode: "CM",
          countryPackVersion: "CM-2026.1",
          countryPackSchemaVersion: "country-pack.v1",
          countryPackResolutionHash: "sha256:country-pack",
        },
        payrollRun: {
          id: "run-1",
          runNumber: "RUN-2026-06",
          runType: PayrollRunType.ORDINARY,
          status: PayrollRunStatus.POSTED,
          netPayableAmount: "100000.00",
          grossAmount: "120000.00",
          currency: "XAF",
          ledgerPostingBatchId: "ledger-1",
          journalEntryId: "journal-1",
          accountingSourceLinkId: "source-link-1",
          evidenceHash: "sha256:run-evidence",
          documentHash: "sha256:run-doc",
          period: {
            id: "period-1",
            name: "June 2026",
            status: PayrollPeriodStatus.OPEN,
            periodStart: "2026-06-01T00:00:00.000Z",
            periodEnd: "2026-06-30T23:59:59.999Z",
            payDate: "2026-07-05T00:00:00.000Z",
          },
        },
        proof: {
          payloadHash: "sha256:payload",
          countryPackResolutionHash: "sha256:country-pack",
          latestEvidenceId: "evidence-1",
          latestEvidenceHash: "sha256:evidence",
          latestTransition: PayrollDeclarationEvidenceTransition.SUBMIT,
          latestAuthorityStatus: "SUBMITTED",
          latestAuthorityReference: "CNPS-REF-1",
          latestAuthorityChannel: "CNPS_MANUAL_PORTAL",
          latestAuthorityEnvironment: "MANUAL_PORTAL",
          latestEvidenceCapturedAt: "2026-06-30T10:00:00.000Z",
          submittedPayloadHash: "sha256:submitted",
          authorityResponseHash: null,
          portalReceiptHash: "sha256:receipt",
          supportingFileHash: null,
          sourceRegisterHash: "sha256:register",
          sourceRegisterProofPresent: true,
          evidenceCount: 1,
          history: [
            {
              id: "evidence-1",
              transition: PayrollDeclarationEvidenceTransition.SUBMIT,
              previousStatus: PayrollDeclarationStatus.PREPARED,
              nextStatus: PayrollDeclarationStatus.SUBMITTED,
              authorityStatus: "SUBMITTED",
              evidenceHash: "sha256:evidence",
              sourceRegisterHash: "sha256:register",
              createdAt: "2026-06-30T10:00:00.000Z",
            },
          ],
        },
        automation: {
          automationCapabilityStatus: "AUTOMATION_BLOCKED",
          productionSubmissionSupported: false,
          manualAuthorityWorkflowOnly: true,
        },
        nextActions: [
          {
            id: "submit",
            transition: PayrollDeclarationEvidenceTransition.SUBMIT,
            label: "Record submission evidence",
            requiredPermission: "payroll.declarations.manage",
            requiresFreshAuth: true,
            requiresSeparateApprover: true,
            requiresSubmittedPayloadHash: true,
            requiresAuthorityReference: false,
            nextStatus: PayrollDeclarationStatus.SUBMITTED,
          },
        ],
        blockers: [
          {
            id: "PAYROLL_DECLARATION_AUTOMATION_NOT_CERTIFIED",
            severity: "medium",
            title: "Automation is not certified",
            detail:
              "Latest evidence is AUTOMATION_BLOCKED; manual authority evidence remains required.",
            nextAction:
              "Keep filing manual until reviewed authority adapter mappings and credentials are certified.",
          },
        ],
      },
    ],
    sourceScope: {
      limit: 80,
      returned: 1,
      coverageComplete: true,
      sourceService: "services/payroll/declaration-lifecycle.service.ts",
    },
  };
}

describe("PayrollDeclarationWorkbench", () => {
  it("renders declaration proof, blockers, next actions, and localized links", () => {
    render(<PayrollDeclarationWorkbench data={workbenchData()} locale="en" />);

    expect(
      screen.getByRole("heading", { name: "Declaration evidence workbench" }),
    ).toBeInTheDocument();
    expect(screen.getByText("CM_CNPS")).toBeInTheDocument();
    expect(
      screen.getByText("CNPS_EMPLOYER_SOCIAL_CONTRIBUTION"),
    ).toBeInTheDocument();
    expect(screen.getAllByText("sha256:register").length).toBeGreaterThan(0);
    expect(screen.getByText("sha256:receipt")).toBeInTheDocument();
    expect(screen.getByText("Automation is not certified")).toBeInTheDocument();
    expect(screen.getByText("Record submission evidence")).toBeInTheDocument();
    expect(screen.getByText("Fresh auth")).toBeInTheDocument();
    expect(screen.getByText("Maker-checker")).toBeInTheDocument();

    fireEvent.click(screen.getByRole("button", { name: "Proof drawer" }));
    expect(screen.getByRole("dialog")).toBeInTheDocument();
    expect(
      screen.getByText(/authority payload bodies stay/i),
    ).toBeInTheDocument();
    expect(screen.getByText("Action 1 fresh auth")).toBeInTheDocument();

    const hrefs = Array.from(document.querySelectorAll("a")).map((link) =>
      link.getAttribute("href"),
    );
    expect(hrefs).toEqual(
      expect.arrayContaining([
        "/en/dashboard/payroll/register",
        "/en/dashboard/payroll/payments",
      ]),
    );
  });

  it("renders service-redacted declaration proof identifiers", () => {
    const data = workbenchData();
    data.redaction.proofIdentifiers = {
      allowed: false,
      mode: "redact",
      reasonCode: "MISSING_PERMISSION",
      policy: "kontava-proof-hidden-identifier-policy",
      replacement: "[REDACTED:IDENTIFIER]",
      requiredPermissions: ["accounting.close.read"],
    };
    const declaration = data.declarations[0];
    declaration.country.countryPackResolutionHash = "[REDACTED:IDENTIFIER]";
    declaration.payrollRun.evidenceHash = "[REDACTED:IDENTIFIER]";
    declaration.payrollRun.documentHash = "[REDACTED:IDENTIFIER]";
    declaration.proof.payloadHash = "[REDACTED:IDENTIFIER]";
    declaration.proof.countryPackResolutionHash = "[REDACTED:IDENTIFIER]";
    declaration.proof.latestEvidenceId = "[REDACTED:IDENTIFIER]";
    declaration.proof.latestEvidenceHash = "[REDACTED:IDENTIFIER]";
    declaration.proof.latestAuthorityReference = "[REDACTED:IDENTIFIER]";
    declaration.proof.submittedPayloadHash = "[REDACTED:IDENTIFIER]";
    declaration.proof.portalReceiptHash = "[REDACTED:IDENTIFIER]";
    declaration.proof.sourceRegisterHash = "[REDACTED:IDENTIFIER]";
    declaration.proof.history = declaration.proof.history.map((entry) => ({
      ...entry,
      evidenceHash: "[REDACTED:IDENTIFIER]",
      sourceRegisterHash: "[REDACTED:IDENTIFIER]",
    }));

    render(<PayrollDeclarationWorkbench data={data} locale="en" />);

    expect(screen.queryByText("sha256:register")).not.toBeInTheDocument();
    expect(screen.queryByText("sha256:receipt")).not.toBeInTheDocument();
    expect(screen.getAllByText("[REDACTED:IDENTIFIER]").length).toBeGreaterThan(
      0,
    );

    fireEvent.click(screen.getByRole("button", { name: "Proof drawer" }));
    expect(
      screen.getByText("declaration.proofIdentifiers"),
    ).toBeInTheDocument();
    expect(
      screen.getByText("kontava-proof-hidden-identifier-policy"),
    ).toBeInTheDocument();
  });

  it("renders a client-safe error state", () => {
    render(
      <PayrollDeclarationWorkbench data={null} error="Forbidden" locale="en" />,
    );

    expect(
      screen.getByRole("heading", { name: "Payroll declarations unavailable" }),
    ).toBeInTheDocument();
    expect(screen.getByText("Forbidden")).toBeInTheDocument();
  });
});
