import { cleanup, render, screen } from "@testing-library/react";
import { existsSync, readFileSync } from "node:fs";
import path from "node:path";

import { getPayrollCommandReadModelAction } from "@/actions/payroll/payroll-command-read-model.actions";
import { getPaymentEvidenceReadinessAction } from "@/actions/payroll/payroll-payment-evidence.actions";
import { getPayrollPaymentReconciliationAction } from "@/actions/payroll/payroll-payment-reconciliation.actions";
import {
  getPayrollDeclarationWorkbenchAction,
  getPayrollEmployeeBalanceWorkbenchAction,
  getPayrollRunWorkbenchAction,
} from "@/actions/payroll/payroll-control.actions";
import { getCompensationWorkflowAction } from "@/actions/payroll/payroll-compensation.actions";
import { getEmployeeContractWorkflowAction } from "@/actions/payroll/payroll-contract.actions";
import { getPayrollEmployeeSourceDataAction } from "@/actions/payroll/payroll-employee.actions";
import { getMyPayrollPayslipsAction } from "@/actions/payroll/payroll-payslip-self-service.actions";
import { getPayrollRegisterAction } from "@/actions/payroll/payroll-register.actions";
import {
  generatePayrollSeedBackfillDryRunPlanAction,
  getPayrollSetupEvidenceReadModelAction,
  getPayrollSetupReadinessAction,
} from "@/actions/payroll/payroll-setup.actions";
import PayrollWorkbenchPage from "@/app/[locale]/(dashboard)/dashboard/payroll/page";
import PayrollAttendancePage from "@/app/[locale]/(dashboard)/dashboard/payroll/attendance/page";
import PayrollCompensationPage from "@/app/[locale]/(dashboard)/dashboard/payroll/compensation/page";
import PayrollContractsPage from "@/app/[locale]/(dashboard)/dashboard/payroll/contracts/page";
import PayrollDeclarationsPage from "@/app/[locale]/(dashboard)/dashboard/payroll/declarations/page";
import PayrollEmployeesPage from "@/app/[locale]/(dashboard)/dashboard/payroll/employees/page";
import PayrollPaymentsPage from "@/app/[locale]/(dashboard)/dashboard/payroll/payments/page";
import PayrollPayslipsPage from "@/app/[locale]/(dashboard)/dashboard/payroll/payslips/page";
import PayrollRegisterPage from "@/app/[locale]/(dashboard)/dashboard/payroll/register/page";
import PayrollRunsPage from "@/app/[locale]/(dashboard)/dashboard/payroll/runs/page";
import PayrollSetupPage from "@/app/[locale]/(dashboard)/dashboard/payroll/setup/page";
import { requireAnyPermission } from "@/lib/security/rbac";
import { observeModuleAccess } from "@/services/modules/module-entitlement.service";

jest.mock("lucide-react", () => {
  const React = require("react");

  return new Proxy(
    {},
    {
      get: (_target, iconName) => {
        const Icon = (props: Record<string, unknown>) =>
          React.createElement("svg", {
            "aria-hidden": "true",
            "data-icon": String(iconName),
            ...props,
          });
        Icon.displayName = String(iconName);
        return Icon;
      },
    },
  );
});

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
  pickLocale: (locale?: string) => locale || "en",
}));

jest.mock("@/lib/security/rbac", () => {
  class RbacError extends Error {
    code: string;
    status: number;

    constructor(message = "Forbidden", code = "FORBIDDEN", status = 403) {
      super(message);
      this.name = "RbacError";
      this.code = code;
      this.status = status;
    }
  }

  return {
    RbacError,
    requireAnyPermission: jest.fn(),
  };
});

jest.mock("@/services/modules/module-entitlement.service", () => ({
  observeModuleAccess: jest.fn(),
}));

jest.mock("@/actions/payroll/payroll-command-read-model.actions", () => ({
  getPayrollCommandReadModelAction: jest.fn(),
}));
jest.mock("@/actions/payroll/payroll-payment-evidence.actions", () => ({
  getPaymentEvidenceReadinessAction: jest.fn(),
}));
jest.mock("@/actions/payroll/payroll-payment-reconciliation.actions", () => ({
  getPayrollPaymentReconciliationAction: jest.fn(),
}));
jest.mock("@/actions/payroll/payroll-control.actions", () => ({
  getPayrollDeclarationWorkbenchAction: jest.fn(),
  getPayrollEmployeeBalanceWorkbenchAction: jest.fn(),
  getPayrollRunWorkbenchAction: jest.fn(),
}));
jest.mock("@/actions/payroll/payroll-compensation.actions", () => ({
  getCompensationWorkflowAction: jest.fn(),
}));
jest.mock("@/actions/payroll/payroll-contract.actions", () => ({
  getEmployeeContractWorkflowAction: jest.fn(),
}));
jest.mock("@/actions/payroll/payroll-employee.actions", () => ({
  getPayrollEmployeeSourceDataAction: jest.fn(),
}));

jest.mock("@/actions/payroll/payroll-payslip-self-service.actions", () => ({
  getMyPayrollPayslipsAction: jest.fn(),
}));

jest.mock("@/actions/payroll/payroll-register.actions", () => ({
  getPayrollRegisterAction: jest.fn(),
}));

jest.mock("@/actions/payroll/payroll-setup.actions", () => ({
  generatePayrollSeedBackfillDryRunPlanAction: jest.fn(),
  getPayrollSetupEvidenceReadModelAction: jest.fn(),
  getPayrollSetupReadinessAction: jest.fn(),
}));

jest.mock("@/components/payroll/PayrollCommandCenter", () => {
  const React = require("react");

  return {
    __esModule: true,
    default: ({
      data,
      error,
      locale,
    }: {
      data: { marker?: string } | null;
      error: { message?: string } | null;
      locale: string;
    }) =>
      React.createElement(
        "section",
        { "data-testid": "payroll-command-center" },
        React.createElement("h1", null, "Payroll command center smoke"),
        React.createElement("span", null, locale),
        React.createElement(
          "span",
          null,
          data?.marker ?? error?.message ?? "no-data",
        ),
      ),
  };
});

jest.mock(
  "@/components/payroll/PayrollPaymentAttendanceReadinessWorkbench",
  () => {
    const React = require("react");

    return {
      __esModule: true,
      default: ({
        data,
        error,
        locale,
      }: {
        data: { marker?: string } | null;
        error: string | null;
        locale: string;
      }) =>
        React.createElement(
          "section",
          { "data-testid": "payroll-payment-attendance-readiness-workbench" },
          React.createElement(
            "h1",
            null,
            "Payroll payment and attendance readiness smoke",
          ),
          React.createElement("span", null, locale),
          React.createElement("span", null, data?.marker ?? error ?? "no-data"),
        ),
    };
  },
);
jest.mock("@/components/payroll/PayrollCompensationWorkbench", () => {
  const React = require("react");

  return {
    __esModule: true,
    default: ({
      data,
      error,
      locale,
    }: {
      data: { marker?: string } | null;
      error: string | null;
      locale: string;
    }) =>
      React.createElement(
        "section",
        { "data-testid": "payroll-compensation-workbench" },
        React.createElement("h1", null, "Payroll compensation workbench smoke"),
        React.createElement("span", null, locale),
        React.createElement("span", null, data?.marker ?? error ?? "no-data"),
      ),
  };
});

jest.mock("@/components/payroll/PayrollContractLifecycleWorkbench", () => {
  const React = require("react");

  return {
    __esModule: true,
    default: ({
      data,
      error,
      locale,
    }: {
      data: { marker?: string } | null;
      error: string | null;
      locale: string;
    }) =>
      React.createElement(
        "section",
        { "data-testid": "payroll-contract-lifecycle-workbench" },
        React.createElement(
          "h1",
          null,
          "Payroll contract lifecycle workbench smoke",
        ),
        React.createElement("span", null, locale),
        React.createElement("span", null, data?.marker ?? error ?? "no-data"),
      ),
  };
});
jest.mock("@/components/payroll/PayrollEmployeeSourceWorkbench", () => {
  const React = require("react");

  return {
    __esModule: true,
    default: ({
      data,
      error,
      locale,
    }: {
      data: { marker?: string } | null;
      error: string | null;
      locale: string;
    }) =>
      React.createElement(
        "section",
        { "data-testid": "payroll-employee-source-workbench" },
        React.createElement(
          "h1",
          null,
          "Payroll employee source workbench smoke",
        ),
        React.createElement("span", null, locale),
        React.createElement("span", null, data?.marker ?? error ?? "no-data"),
      ),
  };
});

jest.mock("@/components/payroll/PayrollDeclarationWorkbench", () => {
  const React = require("react");

  return {
    __esModule: true,
    default: ({
      data,
      error,
      locale,
    }: {
      data: {
        marker?: string;
        redaction?: { proofIdentifiers?: { allowed?: boolean } };
      } | null;
      error: string | null;
      locale: string;
    }) =>
      React.createElement(
        "section",
        { "data-testid": "payroll-declaration-workbench" },
        React.createElement("h1", null, "Payroll declaration workbench smoke"),
        React.createElement("span", null, locale),
        React.createElement("span", null, data?.marker ?? error ?? "no-data"),
        data?.redaction?.proofIdentifiers?.allowed === false
          ? React.createElement("span", null, "declaration-proof-redacted")
          : null,
      ),
  };
});

jest.mock("@/components/payroll/PayrollPaymentReconciliationWorkbench", () => {
  const React = require("react");

  return {
    __esModule: true,
    default: ({
      data,
      error,
      locale,
    }: {
      data: {
        marker?: string;
        redaction?: { proofIdentifiers?: { allowed?: boolean } };
      } | null;
      error: string | null;
      locale: string;
    }) =>
      React.createElement(
        "section",
        { "data-testid": "payroll-payment-reconciliation-workbench" },
        React.createElement(
          "h1",
          null,
          "Payroll payment reconciliation workbench smoke",
        ),
        React.createElement("span", null, locale),
        React.createElement("span", null, data?.marker ?? error ?? "no-data"),
        data?.redaction?.proofIdentifiers?.allowed === false
          ? React.createElement("span", null, "payment-proof-redacted")
          : null,
      ),
  };
});
jest.mock("@/components/payroll/PayrollEmployeeBalanceWorkbench", () => {
  const React = require("react");

  return {
    __esModule: true,
    default: ({
      data,
      error,
      locale,
    }: {
      data: { marker?: string } | null;
      error: string | null;
      locale: string;
    }) =>
      React.createElement(
        "section",
        { "data-testid": "payroll-employee-balance-workbench" },
        React.createElement(
          "h1",
          null,
          "Payroll employee balance workbench smoke",
        ),
        React.createElement("span", null, locale),
        React.createElement("span", null, data?.marker ?? error ?? "no-data"),
      ),
  };
});

jest.mock("@/components/payroll/PayrollRunWorkbench", () => {
  const React = require("react");

  return {
    __esModule: true,
    default: ({
      data,
      error,
      locale,
    }: {
      data: {
        marker?: string;
        redaction?: {
          correctionProofIdentifiers?: { allowed?: boolean };
        };
      } | null;
      error: string | null;
      locale: string;
    }) =>
      React.createElement(
        "section",
        { "data-testid": "payroll-run-workbench" },
        React.createElement("h1", null, "Payroll run workbench smoke"),
        React.createElement("span", null, locale),
        React.createElement("span", null, data?.marker ?? error ?? "no-data"),
        data?.redaction?.correctionProofIdentifiers?.allowed === false
          ? React.createElement("span", null, "correction-proof-redacted")
          : null,
      ),
  };
});

jest.mock("@/components/payroll/PayrollPayslipSelfService", () => {
  const React = require("react");

  return {
    __esModule: true,
    default: ({
      data,
      error,
      locale,
    }: {
      data: { marker?: string } | null;
      error: { message?: string } | null;
      locale: string;
    }) =>
      React.createElement(
        "section",
        { "data-testid": "payroll-payslip-self-service" },
        React.createElement("h1", null, "Payroll payslip self-service smoke"),
        React.createElement("span", null, locale),
        React.createElement(
          "span",
          null,
          data?.marker ?? error?.message ?? "no-data",
        ),
      ),
  };
});

jest.mock("@/components/payroll/PayrollRegisterTieOut", () => {
  const React = require("react");

  return {
    __esModule: true,
    default: ({
      data,
      error,
      locale,
    }: {
      data: { marker?: string } | null;
      error: { message?: string } | null;
      locale: string;
    }) =>
      React.createElement(
        "section",
        { "data-testid": "payroll-register-tie-out" },
        React.createElement("h1", null, "Payroll register tie-out smoke"),
        React.createElement("span", null, locale),
        React.createElement(
          "span",
          null,
          data?.marker ?? error?.message ?? "no-data",
        ),
      ),
  };
});

jest.mock("@/components/payroll/PayrollSetupControlPlane", () => {
  const React = require("react");

  return {
    __esModule: true,
    default: ({
      readiness,
      readinessError,
      plan,
      planError,
      evidence,
      evidenceError,
    }: {
      readiness: { marker?: string } | null;
      readinessError: string | null;
      plan: { marker?: string } | null;
      planError: string | null;
      evidence: { marker?: string } | null;
      evidenceError: string | null;
    }) =>
      React.createElement(
        "section",
        { "data-testid": "payroll-setup-control-plane" },
        React.createElement("h1", null, "Payroll setup control plane smoke"),
        React.createElement(
          "span",
          null,
          readiness?.marker ?? readinessError ?? "no-readiness",
        ),
        React.createElement(
          "span",
          null,
          plan?.marker ?? planError ?? "no-plan",
        ),
        React.createElement(
          "span",
          null,
          evidence?.marker ?? evidenceError ?? "no-evidence",
        ),
      ),
  };
});

const authContext = {
  orgId: "org-1",
  userId: "user-1",
  permissions: [
    "payroll.command.read",
    "payroll.payment_destination.read",
    "payroll.compensation.read",
    "payroll.contracts.read",
    "payroll.employees.read",
    "payroll.payslips.self.read",
    "payroll.reports.read",
    "payroll.runs.calculate",
  ],
};

function mockHappyPath() {
  (requireAnyPermission as jest.Mock).mockResolvedValue(authContext);
  (observeModuleAccess as jest.Mock).mockResolvedValue({
    allowed: true,
    reason: "allowed",
  });
  (getPayrollCommandReadModelAction as jest.Mock).mockResolvedValue({
    success: true,
    data: { marker: "command-data" },
  });
  (getPaymentEvidenceReadinessAction as jest.Mock).mockResolvedValue({
    success: true,
    data: { marker: "payment-attendance-data" },
  });
  (getCompensationWorkflowAction as jest.Mock).mockResolvedValue({
    success: true,
    data: { marker: "compensation-data" },
  });
  (getEmployeeContractWorkflowAction as jest.Mock).mockResolvedValue({
    success: true,
    data: { marker: "contract-data" },
  });
  (getPayrollEmployeeSourceDataAction as jest.Mock).mockResolvedValue({
    success: true,
    data: { marker: "employee-data" },
  });
  (getPayrollDeclarationWorkbenchAction as jest.Mock).mockResolvedValue({
    success: true,
    data: { marker: "declaration-data" },
  });
  (getPayrollPaymentReconciliationAction as jest.Mock).mockResolvedValue({
    success: true,
    data: { marker: "payment-reconciliation-data" },
  });
  (getPayrollEmployeeBalanceWorkbenchAction as jest.Mock).mockResolvedValue({
    success: true,
    data: { marker: "payment-data" },
  });
  (getPayrollRunWorkbenchAction as jest.Mock).mockResolvedValue({
    success: true,
    data: { marker: "run-data" },
  });
  (getMyPayrollPayslipsAction as jest.Mock).mockResolvedValue({
    success: true,
    data: { marker: "payslip-data" },
  });
  (getPayrollRegisterAction as jest.Mock).mockResolvedValue({
    success: true,
    data: { marker: "register-data" },
  });
  (getPayrollSetupReadinessAction as jest.Mock).mockResolvedValue({
    success: true,
    data: { marker: "setup-readiness" },
  });
  (generatePayrollSeedBackfillDryRunPlanAction as jest.Mock).mockResolvedValue({
    success: true,
    data: { marker: "setup-plan" },
  });
  (getPayrollSetupEvidenceReadModelAction as jest.Mock).mockResolvedValue({
    success: true,
    data: { marker: "setup-evidence" },
  });
}

function params(locale = "en") {
  return Promise.resolve({ locale });
}

function searchParams(runId?: string) {
  return Promise.resolve({ runId });
}

function setupSearchParams() {
  return Promise.resolve({});
}

describe("payroll dashboard route smoke", () => {
  afterEach(() => {
    cleanup();
    jest.clearAllMocks();
  });

  it("loads implemented payroll routes through RBAC, module entitlement, and protected payroll actions", async () => {
    mockHappyPath();

    render(await PayrollWorkbenchPage({ params: params() }));

    expect(
      screen.getByRole("heading", { name: "Payroll command center smoke" }),
    ).toBeInTheDocument();
    expect(requireAnyPermission).toHaveBeenCalledWith(
      ["payroll.command.read"],
      {
        resource: "PayrollCommandReadModel",
      },
    );
    expect(observeModuleAccess).toHaveBeenCalledWith(
      expect.objectContaining({
        accessIntent: "read",
        mode: "enforce",
        moduleSlug: "payroll",
        surface: "/dashboard/payroll",
        surfaceType: "page",
      }),
    );
    expect(getPayrollCommandReadModelAction).toHaveBeenCalledWith({
      limit: 25,
    });
    cleanup();
    jest.clearAllMocks();
    mockHappyPath();

    render(await PayrollAttendancePage({ params: params() }));

    expect(
      screen.getByRole("heading", {
        name: "Payroll payment and attendance readiness smoke",
      }),
    ).toBeInTheDocument();
    expect(requireAnyPermission).toHaveBeenCalledWith(
      ["payroll.payment_destination.read"],
      {
        resource: "PayrollPaymentEvidenceReadiness",
      },
    );
    expect(observeModuleAccess).toHaveBeenCalledWith(
      expect.objectContaining({
        accessIntent: "read",
        mode: "enforce",
        moduleSlug: "payroll",
        surface: "/dashboard/payroll/attendance",
        surfaceType: "page",
      }),
    );
    expect(getPaymentEvidenceReadinessAction).toHaveBeenCalledWith({
      limit: 80,
    });
    cleanup();
    jest.clearAllMocks();
    mockHappyPath();

    render(await PayrollCompensationPage({ params: params() }));

    expect(
      screen.getByRole("heading", {
        name: "Payroll compensation workbench smoke",
      }),
    ).toBeInTheDocument();
    expect(requireAnyPermission).toHaveBeenCalledWith(
      ["payroll.compensation.read"],
      {
        resource: "PayrollCompensation",
      },
    );
    expect(observeModuleAccess).toHaveBeenCalledWith(
      expect.objectContaining({
        accessIntent: "read",
        mode: "enforce",
        moduleSlug: "payroll",
        surface: "/dashboard/payroll/compensation",
        surfaceType: "page",
      }),
    );
    expect(getCompensationWorkflowAction).toHaveBeenCalledWith({});
    cleanup();
    jest.clearAllMocks();
    mockHappyPath();

    render(await PayrollContractsPage({ params: params() }));

    expect(
      screen.getByRole("heading", {
        name: "Payroll contract lifecycle workbench smoke",
      }),
    ).toBeInTheDocument();
    expect(requireAnyPermission).toHaveBeenCalledWith(
      ["payroll.contracts.read"],
      {
        resource: "PayrollContract",
      },
    );
    expect(observeModuleAccess).toHaveBeenCalledWith(
      expect.objectContaining({
        accessIntent: "read",
        mode: "enforce",
        moduleSlug: "payroll",
        surface: "/dashboard/payroll/contracts",
        surfaceType: "page",
      }),
    );
    expect(getEmployeeContractWorkflowAction).toHaveBeenCalledWith({});

    cleanup();
    jest.clearAllMocks();
    mockHappyPath();

    render(await PayrollEmployeesPage({ params: params() }));

    expect(
      screen.getByRole("heading", {
        name: "Payroll employee source workbench smoke",
      }),
    ).toBeInTheDocument();
    expect(requireAnyPermission).toHaveBeenCalledWith(
      ["payroll.employees.read"],
      {
        resource: "PayrollEmployee",
      },
    );
    expect(observeModuleAccess).toHaveBeenCalledWith(
      expect.objectContaining({
        accessIntent: "read",
        mode: "enforce",
        moduleSlug: "payroll",
        surface: "/dashboard/payroll/employees",
        surfaceType: "page",
      }),
    );
    expect(getPayrollEmployeeSourceDataAction).toHaveBeenCalledWith({
      limit: 80,
    });

    cleanup();
    jest.clearAllMocks();
    mockHappyPath();

    render(await PayrollDeclarationsPage({ params: params() }));

    expect(
      screen.getByRole("heading", {
        name: "Payroll declaration workbench smoke",
      }),
    ).toBeInTheDocument();
    expect(requireAnyPermission).toHaveBeenCalledWith(
      ["payroll.command.read"],
      {
        resource: "PayrollDeclarationWorkbench",
      },
    );
    expect(observeModuleAccess).toHaveBeenCalledWith(
      expect.objectContaining({
        accessIntent: "read",
        mode: "enforce",
        moduleSlug: "payroll",
        surface: "/dashboard/payroll/declarations",
        surfaceType: "page",
      }),
    );
    expect(getPayrollDeclarationWorkbenchAction).toHaveBeenCalledWith({
      limit: 80,
    });

    cleanup();
    jest.clearAllMocks();
    mockHappyPath();

    render(await PayrollPaymentsPage({ params: params() }));

    expect(
      screen.getByRole("heading", {
        name: "Payroll payment reconciliation workbench smoke",
      }),
    ).toBeInTheDocument();
    expect(
      screen.getByRole("heading", {
        name: "Payroll employee balance workbench smoke",
      }),
    ).toBeInTheDocument();
    expect(requireAnyPermission).toHaveBeenCalledWith(
      ["payments.reconciliation.read"],
      {
        resource: "PayrollPaymentReconciliationWorkbench",
      },
    );
    expect(observeModuleAccess).toHaveBeenCalledWith(
      expect.objectContaining({
        accessIntent: "read",
        mode: "enforce",
        moduleSlug: "payroll",
        surface: "/dashboard/payroll/payments",
        surfaceType: "page",
      }),
    );
    expect(getPayrollPaymentReconciliationAction).toHaveBeenCalledWith({
      limit: 80,
    });
    expect(getPayrollEmployeeBalanceWorkbenchAction).toHaveBeenCalledWith({
      limit: 80,
    });

    cleanup();
    jest.clearAllMocks();
    mockHappyPath();

    render(await PayrollRunsPage({ params: params() }));

    expect(
      screen.getByRole("heading", {
        name: "Payroll run workbench smoke",
      }),
    ).toBeInTheDocument();
    expect(requireAnyPermission).toHaveBeenCalledWith(
      ["payroll.command.read"],
      {
        resource: "PayrollRunWorkbench",
      },
    );
    expect(observeModuleAccess).toHaveBeenCalledWith(
      expect.objectContaining({
        accessIntent: "read",
        mode: "enforce",
        moduleSlug: "payroll",
        surface: "/dashboard/payroll/runs",
        surfaceType: "page",
      }),
    );
    expect(getPayrollRunWorkbenchAction).toHaveBeenCalledWith({
      limit: 80,
    });

    cleanup();
    jest.clearAllMocks();
    mockHappyPath();

    render(await PayrollPayslipsPage({ params: params() }));

    expect(
      screen.getByRole("heading", {
        name: "Payroll payslip self-service smoke",
      }),
    ).toBeInTheDocument();
    expect(requireAnyPermission).toHaveBeenCalledWith(
      ["payroll.payslips.self.read"],
      {
        resource: "PayrollPayslip",
      },
    );
    expect(observeModuleAccess).toHaveBeenCalledWith(
      expect.objectContaining({
        accessIntent: "read",
        mode: "enforce",
        moduleSlug: "payroll",
        surface: "/dashboard/payroll/payslips",
        surfaceType: "page",
      }),
    );
    expect(getMyPayrollPayslipsAction).toHaveBeenCalledWith({ limit: 18 });

    cleanup();
    jest.clearAllMocks();
    mockHappyPath();

    render(
      await PayrollRegisterPage({
        params: params(),
        searchParams: searchParams("payroll-run-1"),
      }),
    );

    expect(
      screen.getByRole("heading", { name: "Payroll register tie-out smoke" }),
    ).toBeInTheDocument();
    expect(requireAnyPermission).toHaveBeenCalledWith(
      ["payroll.reports.read"],
      {
        resource: "PayrollRegister",
      },
    );
    expect(observeModuleAccess).toHaveBeenCalledWith(
      expect.objectContaining({
        accessIntent: "read",
        mode: "enforce",
        moduleSlug: "payroll",
        surface: "/dashboard/payroll/register",
        surfaceType: "page",
      }),
    );
    expect(getPayrollRegisterAction).toHaveBeenCalledWith({
      payrollRunId: "payroll-run-1",
      limit: 100,
    });

    cleanup();
    jest.clearAllMocks();
    mockHappyPath();

    render(
      await PayrollSetupPage({
        params: params(),
        searchParams: setupSearchParams(),
      }),
    );

    expect(
      screen.getByRole("heading", {
        name: "Payroll setup control plane smoke",
      }),
    ).toBeInTheDocument();
    expect(requireAnyPermission).toHaveBeenCalledWith(
      ["payroll.runs.calculate"],
      {
        resource: "PayrollSetupReadiness",
      },
    );
    expect(observeModuleAccess).toHaveBeenCalledWith(
      expect.objectContaining({
        accessIntent: "read",
        mode: "enforce",
        moduleSlug: "payroll",
        surface: "/dashboard/payroll/setup",
        surfaceType: "page",
      }),
    );
    expect(getPayrollSetupReadinessAction).toHaveBeenCalledWith({});
    expect(generatePayrollSeedBackfillDryRunPlanAction).toHaveBeenCalledWith({
      dryRun: true,
    });
    expect(getPayrollSetupEvidenceReadModelAction).toHaveBeenCalledWith({});
    expect(screen.getByText("setup-evidence")).toBeInTheDocument();
  });

  it("passes correction proof redaction state through the payroll runs route", async () => {
    mockHappyPath();
    (getPayrollRunWorkbenchAction as jest.Mock).mockResolvedValue({
      success: true,
      data: {
        marker: "run-data",
        redaction: {
          correctionProofIdentifiers: {
            allowed: false,
            mode: "redact",
            reasonCode: "MISSING_PERMISSION",
            policy: "kontava-proof-hidden-identifier-policy",
            replacement: "[REDACTED:IDENTIFIER]",
            requiredPermissions: [
              "accounting.journal.read",
              "payments.reconciliation.read",
              "accounting.close.read",
            ],
          },
        },
      },
    });

    render(await PayrollRunsPage({ params: params() }));

    expect(
      screen.getByRole("heading", { name: "Payroll run workbench smoke" }),
    ).toBeInTheDocument();
    expect(screen.getByText("correction-proof-redacted")).toBeInTheDocument();
    expect(getPayrollRunWorkbenchAction).toHaveBeenCalledWith({ limit: 80 });
  });

  it("passes declaration proof redaction state through the payroll declarations route", async () => {
    mockHappyPath();
    (getPayrollDeclarationWorkbenchAction as jest.Mock).mockResolvedValue({
      success: true,
      data: {
        marker: "declaration-data",
        redaction: {
          proofIdentifiers: {
            allowed: false,
            mode: "redact",
            reasonCode: "MISSING_PERMISSION",
            policy: "kontava-proof-hidden-identifier-policy",
            replacement: "[REDACTED:IDENTIFIER]",
            requiredPermissions: [
              "accounting.journal.read",
              "payments.reconciliation.read",
              "accounting.close.read",
            ],
          },
        },
      },
    });

    render(await PayrollDeclarationsPage({ params: params() }));

    expect(
      screen.getByRole("heading", {
        name: "Payroll declaration workbench smoke",
      }),
    ).toBeInTheDocument();
    expect(screen.getByText("declaration-proof-redacted")).toBeInTheDocument();
    expect(getPayrollDeclarationWorkbenchAction).toHaveBeenCalledWith({
      limit: 80,
    });
  });

  it("passes payment proof redaction state through the payroll payments route", async () => {
    mockHappyPath();
    (getPayrollPaymentReconciliationAction as jest.Mock).mockResolvedValue({
      success: true,
      data: {
        marker: "payment-reconciliation-data",
        redaction: {
          proofIdentifiers: {
            allowed: false,
            mode: "redact",
            reasonCode: "MISSING_PERMISSION",
            policy: "kontava-proof-hidden-identifier-policy",
            replacement: "[REDACTED:IDENTIFIER]",
            requiredPermissions: [
              "accounting.journal.read",
              "payments.reconciliation.read",
              "accounting.close.read",
            ],
          },
        },
      },
    });

    render(await PayrollPaymentsPage({ params: params() }));

    expect(
      screen.getByRole("heading", {
        name: "Payroll payment reconciliation workbench smoke",
      }),
    ).toBeInTheDocument();
    expect(screen.getByText("payment-proof-redacted")).toBeInTheDocument();
    expect(getPayrollPaymentReconciliationAction).toHaveBeenCalledWith({
      limit: 80,
    });
  });

  it("stops payroll route execution before protected actions when module entitlement denies access", async () => {
    mockHappyPath();
    (observeModuleAccess as jest.Mock).mockResolvedValue({
      allowed: false,
      reason: "module_not_enabled",
    });

    render(await PayrollWorkbenchPage({ params: params() }));
    expect(
      screen.getByRole("heading", {
        name: "HR and Payroll is not enabled for this organization",
      }),
    ).toBeInTheDocument();
    expect(getPayrollCommandReadModelAction).not.toHaveBeenCalled();
    cleanup();
    jest.clearAllMocks();
    mockHappyPath();
    (observeModuleAccess as jest.Mock).mockResolvedValue({
      allowed: false,
      reason: "module_not_enabled",
    });

    render(await PayrollAttendancePage({ params: params() }));
    expect(
      screen.getByRole("heading", {
        name: "Payroll attendance readiness is not enabled for this organization",
      }),
    ).toBeInTheDocument();
    expect(getPaymentEvidenceReadinessAction).not.toHaveBeenCalled();
    cleanup();
    jest.clearAllMocks();
    mockHappyPath();
    (observeModuleAccess as jest.Mock).mockResolvedValue({
      allowed: false,
      reason: "module_not_enabled",
    });

    render(await PayrollCompensationPage({ params: params() }));
    expect(
      screen.getByRole("heading", {
        name: "Payroll compensation is not enabled for this organization",
      }),
    ).toBeInTheDocument();
    expect(getCompensationWorkflowAction).not.toHaveBeenCalled();
    cleanup();
    jest.clearAllMocks();
    mockHappyPath();
    (observeModuleAccess as jest.Mock).mockResolvedValue({
      allowed: false,
      reason: "module_not_enabled",
    });

    render(await PayrollContractsPage({ params: params() }));
    expect(
      screen.getByRole("heading", {
        name: "Payroll contracts are not enabled for this organization",
      }),
    ).toBeInTheDocument();
    expect(getEmployeeContractWorkflowAction).not.toHaveBeenCalled();

    cleanup();
    jest.clearAllMocks();
    mockHappyPath();
    (observeModuleAccess as jest.Mock).mockResolvedValue({
      allowed: false,
      reason: "module_not_enabled",
    });

    render(await PayrollEmployeesPage({ params: params() }));
    expect(
      screen.getByRole("heading", {
        name: "Payroll employees are not enabled for this organization",
      }),
    ).toBeInTheDocument();
    expect(getPayrollEmployeeSourceDataAction).not.toHaveBeenCalled();

    cleanup();
    jest.clearAllMocks();
    mockHappyPath();
    (observeModuleAccess as jest.Mock).mockResolvedValue({
      allowed: false,
      reason: "module_not_enabled",
    });

    render(await PayrollDeclarationsPage({ params: params() }));
    expect(
      screen.getByRole("heading", {
        name: "Payroll declarations are not enabled for this organization",
      }),
    ).toBeInTheDocument();
    expect(getPayrollDeclarationWorkbenchAction).not.toHaveBeenCalled();

    cleanup();
    jest.clearAllMocks();
    mockHappyPath();
    (observeModuleAccess as jest.Mock).mockResolvedValue({
      allowed: false,
      reason: "module_not_enabled",
    });

    render(await PayrollPaymentsPage({ params: params() }));
    expect(
      screen.getByRole("heading", {
        name: "Payroll payments are not enabled for this organization",
      }),
    ).toBeInTheDocument();
    expect(getPayrollPaymentReconciliationAction).not.toHaveBeenCalled();
    expect(getPayrollEmployeeBalanceWorkbenchAction).not.toHaveBeenCalled();

    cleanup();
    jest.clearAllMocks();
    mockHappyPath();
    (observeModuleAccess as jest.Mock).mockResolvedValue({
      allowed: false,
      reason: "module_not_enabled",
    });

    render(await PayrollRunsPage({ params: params() }));
    expect(
      screen.getByRole("heading", {
        name: "Payroll runs are not enabled for this organization",
      }),
    ).toBeInTheDocument();
    expect(getPayrollRunWorkbenchAction).not.toHaveBeenCalled();

    cleanup();
    jest.clearAllMocks();
    mockHappyPath();
    (observeModuleAccess as jest.Mock).mockResolvedValue({
      allowed: false,
      reason: "module_not_enabled",
    });

    render(await PayrollPayslipsPage({ params: params() }));
    expect(
      screen.getByRole("heading", {
        name: "Payslips are not enabled for this organization",
      }),
    ).toBeInTheDocument();
    expect(getMyPayrollPayslipsAction).not.toHaveBeenCalled();

    cleanup();
    jest.clearAllMocks();
    mockHappyPath();
    (observeModuleAccess as jest.Mock).mockResolvedValue({
      allowed: false,
      reason: "module_not_enabled",
    });

    render(
      await PayrollRegisterPage({
        params: params(),
        searchParams: searchParams("payroll-run-1"),
      }),
    );
    expect(
      screen.getByRole("heading", {
        name: "Payroll register is not enabled for this organization",
      }),
    ).toBeInTheDocument();
    expect(getPayrollRegisterAction).not.toHaveBeenCalled();

    cleanup();
    jest.clearAllMocks();
    mockHappyPath();
    (observeModuleAccess as jest.Mock).mockResolvedValue({
      allowed: false,
      reason: "module_not_enabled",
    });

    render(
      await PayrollSetupPage({
        params: params(),
        searchParams: setupSearchParams(),
      }),
    );
    expect(
      screen.getByRole("heading", {
        name: "Payroll setup is not enabled for this organization",
      }),
    ).toBeInTheDocument();
    expect(getPayrollSetupReadinessAction).not.toHaveBeenCalled();
    expect(generatePayrollSeedBackfillDryRunPlanAction).not.toHaveBeenCalled();
    expect(getPayrollSetupEvidenceReadModelAction).not.toHaveBeenCalled();
  });

  it("renders safe RBAC denial states without calling payroll actions", async () => {
    const { RbacError } = jest.requireMock("@/lib/security/rbac");

    (requireAnyPermission as jest.Mock).mockRejectedValue(
      new RbacError("Forbidden", "FORBIDDEN", 403),
    );

    render(await PayrollWorkbenchPage({ params: params() }));
    expect(
      screen.getByRole("heading", {
        name: "HR and Payroll is not available for this role",
      }),
    ).toBeInTheDocument();
    expect(getPayrollCommandReadModelAction).not.toHaveBeenCalled();
    cleanup();
    jest.clearAllMocks();
    (requireAnyPermission as jest.Mock).mockRejectedValue(
      new RbacError("Forbidden", "FORBIDDEN", 403),
    );

    render(await PayrollAttendancePage({ params: params() }));
    expect(
      screen.getByRole("heading", {
        name: "Payroll attendance readiness is not available for this role",
      }),
    ).toBeInTheDocument();
    expect(getPaymentEvidenceReadinessAction).not.toHaveBeenCalled();
    cleanup();
    jest.clearAllMocks();
    (requireAnyPermission as jest.Mock).mockRejectedValue(
      new RbacError("Forbidden", "FORBIDDEN", 403),
    );

    render(await PayrollCompensationPage({ params: params() }));
    expect(
      screen.getByRole("heading", {
        name: "Payroll compensation is not available for this role",
      }),
    ).toBeInTheDocument();
    expect(getCompensationWorkflowAction).not.toHaveBeenCalled();
    cleanup();
    jest.clearAllMocks();
    (requireAnyPermission as jest.Mock).mockRejectedValue(
      new RbacError("Forbidden", "FORBIDDEN", 403),
    );

    render(await PayrollContractsPage({ params: params() }));
    expect(
      screen.getByRole("heading", {
        name: "Payroll contracts are not available for this role",
      }),
    ).toBeInTheDocument();
    expect(getEmployeeContractWorkflowAction).not.toHaveBeenCalled();

    cleanup();
    jest.clearAllMocks();
    (requireAnyPermission as jest.Mock).mockRejectedValue(
      new RbacError("Forbidden", "FORBIDDEN", 403),
    );

    render(await PayrollEmployeesPage({ params: params() }));
    expect(
      screen.getByRole("heading", {
        name: "Payroll employees are not available for this role",
      }),
    ).toBeInTheDocument();
    expect(getPayrollEmployeeSourceDataAction).not.toHaveBeenCalled();

    cleanup();
    jest.clearAllMocks();
    (requireAnyPermission as jest.Mock).mockRejectedValue(
      new RbacError("Forbidden", "FORBIDDEN", 403),
    );

    render(await PayrollDeclarationsPage({ params: params() }));
    expect(
      screen.getByRole("heading", {
        name: "Payroll declarations are not available for this role",
      }),
    ).toBeInTheDocument();
    expect(getPayrollDeclarationWorkbenchAction).not.toHaveBeenCalled();

    cleanup();
    jest.clearAllMocks();
    (requireAnyPermission as jest.Mock).mockRejectedValue(
      new RbacError("Forbidden", "FORBIDDEN", 403),
    );

    render(await PayrollPaymentsPage({ params: params() }));
    expect(
      screen.getByRole("heading", {
        name: "Payroll payments are not available for this role",
      }),
    ).toBeInTheDocument();
    expect(getPayrollPaymentReconciliationAction).not.toHaveBeenCalled();
    expect(getPayrollEmployeeBalanceWorkbenchAction).not.toHaveBeenCalled();

    cleanup();
    jest.clearAllMocks();
    (requireAnyPermission as jest.Mock).mockRejectedValue(
      new RbacError("Forbidden", "FORBIDDEN", 403),
    );

    render(await PayrollRunsPage({ params: params() }));
    expect(
      screen.getByRole("heading", {
        name: "Payroll runs are not available for this role",
      }),
    ).toBeInTheDocument();
    expect(getPayrollRunWorkbenchAction).not.toHaveBeenCalled();

    cleanup();
    jest.clearAllMocks();
    (requireAnyPermission as jest.Mock).mockRejectedValue(
      new RbacError("Forbidden", "FORBIDDEN", 403),
    );

    render(await PayrollPayslipsPage({ params: params() }));
    expect(
      screen.getByRole("heading", {
        name: "Payslips are not available for this role",
      }),
    ).toBeInTheDocument();
    expect(getMyPayrollPayslipsAction).not.toHaveBeenCalled();

    cleanup();
    jest.clearAllMocks();
    (requireAnyPermission as jest.Mock).mockRejectedValue(
      new RbacError("Forbidden", "FORBIDDEN", 403),
    );

    render(
      await PayrollRegisterPage({
        params: params(),
        searchParams: searchParams("payroll-run-1"),
      }),
    );
    expect(
      screen.getByRole("heading", {
        name: "Payroll register is not available for this role",
      }),
    ).toBeInTheDocument();
    expect(getPayrollRegisterAction).not.toHaveBeenCalled();

    cleanup();
    jest.clearAllMocks();
    (requireAnyPermission as jest.Mock).mockRejectedValue(
      new RbacError("Forbidden", "FORBIDDEN", 403),
    );

    render(
      await PayrollSetupPage({
        params: params(),
        searchParams: setupSearchParams(),
      }),
    );
    expect(
      screen.getByRole("heading", {
        name: "Payroll setup is not available for this role",
      }),
    ).toBeInTheDocument();
    expect(getPayrollSetupReadinessAction).not.toHaveBeenCalled();
    expect(generatePayrollSeedBackfillDryRunPlanAction).not.toHaveBeenCalled();
    expect(getPayrollSetupEvidenceReadModelAction).not.toHaveBeenCalled();
  });

  it("keeps the payroll dashboard surface limited to implemented service-backed routes", () => {
    const routeContracts = [
      {
        file: "app/[locale]/(dashboard)/dashboard/payroll/page.tsx",
        action: "getPayrollCommandReadModelAction",
        component: "PayrollCommandCenter",
      },
      {
        file: "app/[locale]/(dashboard)/dashboard/payroll/attendance/page.tsx",
        action: "getPaymentEvidenceReadinessAction",
        component: "PayrollPaymentAttendanceReadinessWorkbench",
      },
      {
        file: "app/[locale]/(dashboard)/dashboard/payroll/compensation/page.tsx",
        action: "getCompensationWorkflowAction",
        component: "PayrollCompensationWorkbench",
      },
      {
        file: "app/[locale]/(dashboard)/dashboard/payroll/contracts/page.tsx",
        action: "getEmployeeContractWorkflowAction",
        component: "PayrollContractLifecycleWorkbench",
      },
      {
        file: "app/[locale]/(dashboard)/dashboard/payroll/employees/page.tsx",
        action: "getPayrollEmployeeSourceDataAction",
        component: "PayrollEmployeeSourceWorkbench",
      },
      {
        file: "app/[locale]/(dashboard)/dashboard/payroll/declarations/page.tsx",
        action: "getPayrollDeclarationWorkbenchAction",
        component: "PayrollDeclarationWorkbench",
      },
      {
        file: "app/[locale]/(dashboard)/dashboard/payroll/payments/page.tsx",
        action: "getPayrollPaymentReconciliationAction",
        component: "PayrollPaymentReconciliationWorkbench",
      },
      {
        file: "app/[locale]/(dashboard)/dashboard/payroll/runs/page.tsx",
        action: "getPayrollRunWorkbenchAction",
        component: "PayrollRunWorkbench",
      },
      {
        file: "app/[locale]/(dashboard)/dashboard/payroll/payslips/page.tsx",
        action: "getMyPayrollPayslipsAction",
        component: "PayrollPayslipSelfService",
      },
      {
        file: "app/[locale]/(dashboard)/dashboard/payroll/register/page.tsx",
        action: "getPayrollRegisterAction",
        component: "PayrollRegisterTieOut",
      },
      {
        file: "app/[locale]/(dashboard)/dashboard/payroll/setup/page.tsx",
        action: "getPayrollSetupReadinessAction",
        component: "PayrollSetupControlPlane",
      },
    ];

    for (const contract of routeContracts) {
      const absolutePath = path.join(process.cwd(), contract.file);
      expect(existsSync(absolutePath)).toBe(true);

      const source = readFileSync(absolutePath, "utf8");
      expect(source).toContain(contract.action);
      expect(source).toContain(contract.component);
      expect(source).toContain("requireAnyPermission");
      expect(source).toContain("observeModuleAccess");
      expect(source).toContain("overflow-x-hidden");
      expect(source).toContain("min-w-0");
      expect(source).toContain("max-w-[1920px]");
    }

    const uiSurfaceFiles = [
      "app/[locale]/(dashboard)/dashboard/payroll/page.tsx",
      "app/[locale]/(dashboard)/dashboard/payroll/attendance/page.tsx",
      "app/[locale]/(dashboard)/dashboard/payroll/compensation/page.tsx",
      "app/[locale]/(dashboard)/dashboard/payroll/contracts/page.tsx",
      "app/[locale]/(dashboard)/dashboard/payroll/declarations/page.tsx",
      "app/[locale]/(dashboard)/dashboard/payroll/employees/page.tsx",
      "app/[locale]/(dashboard)/dashboard/payroll/payments/page.tsx",
      "app/[locale]/(dashboard)/dashboard/payroll/runs/page.tsx",
      "app/[locale]/(dashboard)/dashboard/payroll/payslips/page.tsx",
      "app/[locale]/(dashboard)/dashboard/payroll/register/page.tsx",
      "app/[locale]/(dashboard)/dashboard/payroll/setup/page.tsx",
      "components/dashboard/todays-operating-truth.ts",
      "components/payroll/PayrollCommandCenter.tsx",
      "components/payroll/PayrollPaymentAttendanceReadinessWorkbench.tsx",
      "components/payroll/PayrollCompensationWorkbench.tsx",
      "components/payroll/PayrollContractLifecycleWorkbench.tsx",
      "components/payroll/PayrollDeclarationWorkbench.tsx",
      "components/payroll/PayrollEmployeeSourceWorkbench.tsx",
      "components/payroll/PayrollPaymentReconciliationWorkbench.tsx",
      "components/payroll/PayrollEmployeeBalanceWorkbench.tsx",
      "components/payroll/PayrollRunWorkbench.tsx",
      "components/payroll/PayrollPayslipSelfService.tsx",
      "components/payroll/PayrollRegisterTieOut.tsx",
      "components/payroll/PayrollSetupControlPlane.tsx",
    ];

    const uiSurfaceSource = uiSurfaceFiles
      .map((file) => readFileSync(path.join(process.cwd(), file), "utf8"))
      .join("\n");
    const unsupportedRoutes = ["/dashboard/presence"];

    for (const unsupportedRoute of unsupportedRoutes) {
      expect(uiSurfaceSource).not.toContain(unsupportedRoute);
    }
  });

  it("keeps the payroll browser smoke script limited to implemented payroll routes", () => {
    const smokeScript = readFileSync(
      path.join(process.cwd(), "scripts/ui-route-smoke-gate.js"),
      "utf8",
    );
    const packageJson = JSON.parse(
      readFileSync(path.join(process.cwd(), "package.json"), "utf8"),
    ) as {
      scripts?: Record<string, string>;
    };
    const payrollSmokeCommand = packageJson.scripts?.["ui:smoke:payroll"] ?? "";
    const implementedRouteIds = [
      "payroll",
      "payroll-attendance",
      "payroll-compensation",
      "payroll-contracts",
      "payroll-employees",
      "payroll-declarations",
      "payroll-payments",
      "payroll-runs",
      "payroll-payslips",
      "payroll-register",
      "payroll-setup",
    ];

    for (const routeId of implementedRouteIds) {
      expect(smokeScript).toContain(`id: "${routeId}"`);
      expect(payrollSmokeCommand).toContain(`--route ${routeId}`);
    }

    const unsupportedRouteIds = ["payroll-presence"];
    const unsupportedPaths = ["/en/dashboard/presence"];

    for (const routeId of unsupportedRouteIds) {
      expect(payrollSmokeCommand).not.toContain(`--route ${routeId}`);
      expect(smokeScript).not.toContain(`id: "${routeId}"`);
    }

    for (const unsupportedPath of unsupportedPaths) {
      expect(smokeScript).not.toContain(`path: "${unsupportedPath}"`);
    }
  });

  it("keeps authenticated payroll browser smoke coverage aligned with implemented routes", () => {
    const authenticatedSmokeSpec = readFileSync(
      path.join(process.cwd(), "tests/e2e/payroll-authenticated-smoke.spec.ts"),
      "utf8",
    );
    const implementedRoutes = [
      { id: "payroll", path: "/en/dashboard/payroll" },
      { id: "payroll-attendance", path: "/en/dashboard/payroll/attendance" },
      { id: "payroll-compensation", path: "/en/dashboard/payroll/compensation" },
      { id: "payroll-contracts", path: "/en/dashboard/payroll/contracts" },
      { id: "payroll-employees", path: "/en/dashboard/payroll/employees" },
      { id: "payroll-declarations", path: "/en/dashboard/payroll/declarations" },
      { id: "payroll-payments", path: "/en/dashboard/payroll/payments" },
      { id: "payroll-runs", path: "/en/dashboard/payroll/runs" },
      { id: "payroll-payslips", path: "/en/dashboard/payroll/payslips" },
      { id: "payroll-register", path: "/en/dashboard/payroll/register" },
      { id: "payroll-setup", path: "/en/dashboard/payroll/setup" },
    ];

    for (const route of implementedRoutes) {
      expect(authenticatedSmokeSpec).toContain(`path: "${route.path}"`);
    }

    const proofCriticalRouteIds = [
      "payroll-declarations",
      "payroll-payments",
      "payroll-runs",
    ];

    for (const routeId of proofCriticalRouteIds) {
      expect(authenticatedSmokeSpec).toContain(`id: "${routeId}"`);
    }

    expect(authenticatedSmokeSpec).not.toContain(`id: "payroll-presence"`);
    expect(authenticatedSmokeSpec).not.toContain(
      `path: "/en/dashboard/presence"`,
    );
  });
});