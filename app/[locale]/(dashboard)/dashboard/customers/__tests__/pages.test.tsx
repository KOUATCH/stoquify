import { render, screen } from "@testing-library/react";

import CustomerManagementDashboard from "@/components/customers/CustomerManagementDashboard";
import { RbacError, requireAllPermissions } from "@/lib/security/rbac";
import { observeModuleAccess } from "@/services/modules/module-entitlement.service";

import CustomerAnalyticsPage from "../[id]/page";
import EditCustomerPage from "../[id]/edit/page";
import CustomersPage from "../page";
import CreateCustomerPage from "../new/page";

jest.mock("@/lib/security/rbac", () => ({
  RbacError: class RbacError extends Error {
    constructor(
      message: string,
      public readonly code: string,
      public readonly status: number,
    ) {
      super(message);
    }
  },
  requireAllPermissions: jest.fn(),
  requireAnyPermission: jest.fn(),
  requirePermission: jest.fn(),
}));

jest.mock("@/services/modules/module-entitlement.service", () => ({
  observeModuleAccess: jest.fn(),
}));

jest.mock("@/services/organization/organization-settings.service", () => ({
  getOrganizationSettingsForOrg: jest
    .fn()
    .mockResolvedValue({ currency: "XAF" }),
}));

jest.mock("@/i18n/routing", () => ({
  localizePath: (href: string, locale: string) => `/${locale}${href}`,
  pickLocale: (locale: string) => (locale === "fr" ? "fr" : "en"),
}));

jest.mock("@/components/dashboard/DashboardRouteState", () => ({
  DashboardRouteState: ({ kind, title }: { kind: string; title: string }) => (
    <main data-kind={kind}>
      <h1>{title}</h1>
    </main>
  ),
}));

jest.mock("@/components/customers/CustomerManagementDashboard", () =>
  jest.fn(
    ({
      organizationId,
      locale,
      basePath,
      initialAction,
      initialAnalyticsId,
      initialEditId,
    }) => (
      <section>
        <h1>Customer dashboard</h1>
        <p>organization:{organizationId}</p>
        <p>locale:{locale}</p>
        <p>basePath:{basePath}</p>
        {initialAction ? <p>action:{initialAction}</p> : null}
        {initialAnalyticsId ? <p>analytics:{initialAnalyticsId}</p> : null}
        {initialEditId ? <p>edit:{initialEditId}</p> : null}
      </section>
    ),
  ),
);

jest.mock("@/components/customers/CustomerActionPage", () => ({
  CustomerActionPage: jest.fn(
    ({
      mode,
      organizationId,
      locale,
      customerId,
    }: {
      mode: "create" | "edit";
      organizationId: string;
      locale: string;
      customerId?: string;
    }) => {
      const Dashboard = jest.requireMock(
        "@/components/customers/CustomerManagementDashboard",
      ) as jest.Mock;
      return (
        <Dashboard
          organizationId={organizationId}
          locale={locale}
          basePath={`/${locale}/dashboard/customers`}
          {...(mode === "create"
            ? { initialAction: "create" }
            : { initialEditId: customerId })}
        />
      );
    },
  ),
}));

jest.mock("@/components/customers/CustomerProfilePage", () => ({
  CustomerProfilePage: jest.fn(
    ({
      organizationId,
      customerId,
      locale,
    }: {
      organizationId: string;
      customerId: string;
      locale: string;
    }) => {
      const Dashboard = jest.requireMock(
        "@/components/customers/CustomerManagementDashboard",
      ) as jest.Mock;
      return (
        <Dashboard
          organizationId={organizationId}
          locale={locale}
          basePath={`/${locale}/dashboard/customers`}
          initialAnalyticsId={customerId}
        />
      );
    },
  ),
}));

const mockRequireAllPermissions = requireAllPermissions as jest.Mock;
const mockObserveModuleAccess = observeModuleAccess as jest.Mock;
const mockCustomerManagementDashboard =
  CustomerManagementDashboard as jest.Mock;

const allowedContext = {
  orgId: "org-customer",
  userId: "user-customer",
  permissions: [
    "customers.read",
    "customers.create",
    "customers.analytics.read",
    "customers.update",
  ],
};

type CustomerRouteCase = {
  name: string;
  permissions: string[];
  renderPage: () => Promise<React.ReactElement>;
  expectedProps: Record<string, unknown>;
};

const routeCases: CustomerRouteCase[] = [
  {
    name: "customers list",
    permissions: ["customers.read"],
    renderPage: () =>
      CustomersPage({ params: Promise.resolve({ locale: "en" }) }),
    expectedProps: {
      organizationId: "org-customer",
      locale: "en",
      basePath: "/en/dashboard/customers",
    },
  },
  {
    name: "customer create",
    permissions: ["customers.read", "customers.create"],
    renderPage: () =>
      CreateCustomerPage({ params: Promise.resolve({ locale: "en" }) }),
    expectedProps: {
      organizationId: "org-customer",
      locale: "en",
      basePath: "/en/dashboard/customers",
      initialAction: "create",
    },
  },
  {
    name: "customer detail analytics",
    permissions: ["customers.read", "customers.analytics.read"],
    renderPage: () =>
      CustomerAnalyticsPage({
        params: Promise.resolve({ locale: "en", id: "cust-1" }),
      }),
    expectedProps: {
      organizationId: "org-customer",
      locale: "en",
      basePath: "/en/dashboard/customers",
      initialAnalyticsId: "cust-1",
    },
  },
  {
    name: "customer edit",
    permissions: ["customers.read", "customers.update"],
    renderPage: () =>
      EditCustomerPage({
        params: Promise.resolve({ locale: "en", id: "cust-1" }),
      }),
    expectedProps: {
      organizationId: "org-customer",
      locale: "en",
      basePath: "/en/dashboard/customers",
      initialEditId: "cust-1",
    },
  },
];

describe("customer dashboard server pages", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockRequireAllPermissions.mockResolvedValue(allowedContext);
    mockObserveModuleAccess.mockResolvedValue({ allowed: true });
  });

  it.each(routeCases)(
    "requires the complete permission set before rendering the tenant-scoped $name page",
    async ({ permissions, renderPage, expectedProps }) => {
      render(await renderPage());

      expect(mockRequireAllPermissions).toHaveBeenCalledWith(
        permissions,
        expect.objectContaining({ resource: "CustomerManagement" }),
      );
      expect(mockObserveModuleAccess).toHaveBeenCalledWith(
        expect.objectContaining({
          organizationId: "org-customer",
          userId: "user-customer",
          moduleSlug: "sales",
        }),
      );
      expect(mockCustomerManagementDashboard).toHaveBeenCalledWith(
        expect.objectContaining(expectedProps),
        undefined,
      );
      expect(
        screen.getByRole("heading", { name: "Customer dashboard" }),
      ).toBeInTheDocument();
      expect(screen.getByText("organization:org-customer")).toBeInTheDocument();
    },
  );

  it.each(routeCases)(
    "stops before tenant lookup and rendering when $name permission is denied",
    async ({ renderPage }) => {
      const denied = new RbacError("Forbidden", "FORBIDDEN", 403);
      mockRequireAllPermissions.mockRejectedValue(denied);

      render(await renderPage());

      expect(mockRequireAllPermissions).toHaveBeenCalled();
      expect(screen.getByRole("main")).toHaveAttribute(
        "data-kind",
        "permission_denied",
      );
      expect(mockObserveModuleAccess).not.toHaveBeenCalled();
      expect(mockCustomerManagementDashboard).not.toHaveBeenCalled();
    },
  );

  it.each(routeCases)(
    "renders a blocked $name state when tenant scope is unavailable",
    async ({ renderPage }) => {
      const unavailable = new RbacError(
        "No active organization",
        "NO_ACTIVE_ORG",
        401,
      );
      mockRequireAllPermissions.mockRejectedValue(unavailable);

      render(await renderPage());

      expect(mockRequireAllPermissions).toHaveBeenCalled();
      expect(screen.getByRole("main")).toHaveAttribute(
        "data-kind",
        "no_active_org",
      );
      expect(mockObserveModuleAccess).not.toHaveBeenCalled();
      expect(mockCustomerManagementDashboard).not.toHaveBeenCalled();
    },
  );
});
