import { render, screen } from "@testing-library/react";

import { RbacError, requireAllPermissions } from "@/lib/security/rbac";
import { observeModuleAccess } from "@/services/modules/module-entitlement.service";
import { getOrganizationSettingsForOrg } from "@/services/organization/organization-settings.service";

import CustomerOrdersClientPage from "../CustomerOrdersClientPage";
import CustomerOrdersPage from "../page";

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
  getOrganizationSettingsForOrg: jest.fn(),
}));

jest.mock("next/navigation", () => ({
  notFound: jest.fn(),
}));

jest.mock("@/i18n/routing", () => ({
  localizePath: (href: string, locale: string) => `/${locale}${href}`,
  pickLocale: (locale: string) => (locale === "fr" ? "fr" : "en"),
}));

jest.mock("@/components/dashboard/DashboardRouteState", () => ({
  DashboardRouteState: ({ kind }: { kind: string }) => (
    <main data-kind={kind} />
  ),
}));

jest.mock("../CustomerOrdersClientPage", () =>
  jest.fn(({ currency }: { currency: string }) => (
    <section>
      <h1>Customer orders client</h1>
      <p>currency:{currency}</p>
    </section>
  )),
);

const mockRequireAllPermissions = requireAllPermissions as jest.Mock;
const mockObserveModuleAccess = observeModuleAccess as jest.Mock;
const mockGetOrganizationSettings = getOrganizationSettingsForOrg as jest.Mock;
const mockCustomerOrdersClientPage = CustomerOrdersClientPage as jest.Mock;

const pageProps = {
  params: Promise.resolve({ locale: "en", id: "cust-1" }),
};

describe("CustomerOrdersPage", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockRequireAllPermissions.mockResolvedValue({
      userId: "user-customer",
      orgId: "org-customer",
      permissions: [
        "customers.export",
        "customers.update",
        "sales.read",
        "finance.receivables.read",
      ],
    });
    mockObserveModuleAccess.mockResolvedValue({
      allowed: true,
    });
    mockGetOrganizationSettings.mockResolvedValue({ currency: "XAF" });
  });

  it("requires customer order read permission before rendering the customer orders client", async () => {
    render(await CustomerOrdersPage(pageProps));

    expect(mockRequireAllPermissions).toHaveBeenCalledWith(
      ["customers.read", "customers.orders.read"],
      expect.objectContaining({
        resource: "CustomerManagement",
        resourceId: "cust-1",
      }),
    );
    expect(mockObserveModuleAccess).toHaveBeenCalledWith(
      expect.objectContaining({
        organizationId: "org-customer",
        userId: "user-customer",
        moduleSlug: "sales",
      }),
    );
    expect(mockCustomerOrdersClientPage).toHaveBeenCalledWith(
      expect.objectContaining({
        currency: "XAF",
        capabilities: {
          canCreateStatement: true,
          canExport: true,
          canOpenSales: true,
          canUpdate: true,
          canViewOrders: true,
          canViewReceivables: true,
        },
      }),
      undefined,
    );
    expect(
      screen.getByRole("heading", { name: "Customer orders client" }),
    ).toBeInTheDocument();
    expect(screen.getByText("currency:XAF")).toBeInTheDocument();
  });

  it("stops before tenant lookup and client rendering when order read permission is denied", async () => {
    mockRequireAllPermissions.mockRejectedValue(
      new RbacError("Forbidden", "FORBIDDEN", 403),
    );

    render(await CustomerOrdersPage(pageProps));

    expect(mockRequireAllPermissions).toHaveBeenCalled();
    expect(screen.getByRole("main")).toHaveAttribute(
      "data-kind",
      "permission_denied",
    );
    expect(mockObserveModuleAccess).not.toHaveBeenCalled();
    expect(mockCustomerOrdersClientPage).not.toHaveBeenCalled();
  });

  it("renders a blocked state before client rendering when tenant scope is unavailable", async () => {
    mockRequireAllPermissions.mockRejectedValue(
      new RbacError("No active organization", "NO_ACTIVE_ORG", 401),
    );

    render(await CustomerOrdersPage(pageProps));

    expect(mockRequireAllPermissions).toHaveBeenCalled();
    expect(screen.getByRole("main")).toHaveAttribute(
      "data-kind",
      "no_active_org",
    );
    expect(mockObserveModuleAccess).not.toHaveBeenCalled();
    expect(mockCustomerOrdersClientPage).not.toHaveBeenCalled();
  });

  it("fails closed instead of inventing a currency when organization settings are unavailable", async () => {
    mockGetOrganizationSettings.mockResolvedValue(null);

    await expect(CustomerOrdersPage(pageProps)).rejects.toThrow(
      "Organization currency is unavailable for organization org-customer.",
    );

    expect(mockCustomerOrdersClientPage).not.toHaveBeenCalled();
  });
});
