import { fireEvent, render, screen } from "@testing-library/react";

import type { PaymentEvidenceReadinessResult } from "@/actions/payroll/payroll-payment-evidence.actions";
import PayrollPaymentAttendanceReadinessWorkbench from "../PayrollPaymentAttendanceReadinessWorkbench";

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

function readinessData(): PaymentEvidenceReadinessResult {
  return {
    organizationId: "org-1",
    asOf: "2026-06-30T12:00:00.000Z",
    summary: {
      employeeCount: 1,
      approvedPaymentDestinationCount: 1,
      pendingPaymentDestinationCount: 0,
      missingPaymentDestinationCount: 0,
      attendanceReadyCount: 0,
      attendanceDriftCount: 1,
      blockerCount: 1,
    },
    employees: [
      {
        id: "employee-1",
        employeeNumber: "EMP-001",
        displayName: "Ada Payroll",
        status: "ACTIVE",
        paymentDestination: {
          state: "APPROVED",
          method: "BANK_TRANSFER",
          maskedDestination: "***1234",
          approvedEvidenceHashPresent: true,
          paymentDestinationHashPresent: true,
          latestChange: {
            id: "dest-change-1",
            status: "APPLIED",
            paymentMethod: "BANK_TRANSFER",
            maskedDestination: "***1234",
            requestedById: "hr-1",
            approvedById: "finance-1",
            rejectedById: null,
            appliedById: "payroll-ops-1",
            requestedAt: "2026-06-26T00:00:00.000Z",
            approvedAt: "2026-06-27T00:00:00.000Z",
            appliedAt: "2026-06-28T00:00:00.000Z",
            requestReason: "Bank account update",
            decisionReason: "Approved with evidence",
            evidenceDocumentHash: "sha256:request-evidence",
            approvalEvidenceHashPresent: true,
            paymentDestinationHashPresent: true,
            redactions: ["PAYMENT_DETAILS_REDACTED", "DESTINATION_HASH_HIDDEN"],
          },
        },
        evidence: {
          contractEvidenceHashes: ["sha256:contract", "event-contract"],
          salaryChangeEvidenceHashes: [
            "sha256:salary-request",
            "sha256:salary-approval",
          ],
          identifierHashTypes: ["TAX", "SOCIAL"],
          paymentEvidenceHashes: [
            "sha256:request-evidence",
            "sha256:approval-evidence",
          ],
          totalReferenceCount: 8,
        },
        attendanceReadiness: {
          status: "DRIFT_DETECTED",
          snapshotId: "attendance-1",
          snapshotStatus: "FROZEN",
          periodStart: "2026-06-01T00:00:00.000Z",
          periodEnd: "2026-06-30T23:59:59.999Z",
          sourceHashPresent: true,
          expectedSourceHashPresent: true,
          driftDetected: true,
          frozenAt: "2026-06-25T00:00:00.000Z",
          blocker: "ATTENDANCE_SOURCE_DRIFT_DETECTED",
        },
        blockers: ["ATTENDANCE_SOURCE_DRIFT_DETECTED"],
      },
    ],
  };
}

describe("PayrollPaymentAttendanceReadinessWorkbench", () => {
  it("renders payment and attendance proof drawer with redacted destination details", () => {
    render(
      <PayrollPaymentAttendanceReadinessWorkbench
        data={readinessData()}
        locale="en"
      />,
    );

    expect(
      screen.getByRole("heading", { name: "Payment and attendance readiness" }),
    ).toBeInTheDocument();
    expect(screen.getByText("EMP-001")).toBeInTheDocument();
    expect(
      screen.getAllByText(/BANK_TRANSFER \/ \*\*\*1234/).length,
    ).toBeGreaterThan(0);
    expect(screen.getAllByText("DRIFT_DETECTED").length).toBeGreaterThan(0);

    fireEvent.click(screen.getByRole("button", { name: "Proof drawer" }));

    expect(screen.getByRole("dialog")).toBeInTheDocument();
    expect(screen.getByText("Attendance snapshot")).toBeInTheDocument();
    expect(screen.getByText("attendance-1")).toBeInTheDocument();
    expect(
      screen.getAllByText("ATTENDANCE_SOURCE_DRIFT_DETECTED").length,
    ).toBeGreaterThan(1);
    expect(screen.getByText("Contract evidence")).toBeInTheDocument();
    expect(screen.getByText(/sha256:contract/)).toBeInTheDocument();
    expect(screen.getByText("Change redactions")).toBeInTheDocument();
    expect(screen.getByText(/PAYMENT_DETAILS_REDACTED/)).toBeInTheDocument();
    expect(
      screen.getByText("payroll.paymentDestination.rawDetails"),
    ).toBeInTheDocument();
    expect(
      screen.getByText("payroll.employeeIdentifiers.rawValues"),
    ).toBeInTheDocument();
    expect(
      screen.getByText("kontava-payment-destination-redaction-policy"),
    ).toBeInTheDocument();

    expect(screen.queryByText("1234567890121234")).not.toBeInTheDocument();
    expect(screen.queryByText("699001122")).not.toBeInTheDocument();
    expect(screen.queryByText("sha256:destination")).not.toBeInTheDocument();
  });

  it("renders unavailable state when readiness access is denied", () => {
    render(
      <PayrollPaymentAttendanceReadinessWorkbench
        data={null}
        error="Access denied"
        locale="en"
      />,
    );

    expect(
      screen.getByRole("heading", {
        name: "Payroll payment and attendance readiness unavailable",
      }),
    ).toBeInTheDocument();
    expect(screen.getByText("Access denied")).toBeInTheDocument();
  });
});
