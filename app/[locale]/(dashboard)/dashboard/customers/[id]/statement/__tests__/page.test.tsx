import { render, screen } from "@testing-library/react";

import { getCustomerAction } from "@/actions/customers/customerActions";
import { requireAllPermissions } from "@/lib/security/rbac";
import { observeModuleAccess } from "@/services/modules/module-entitlement.service";
import { getOrganizationSettingsForOrg } from "@/services/organization/organization-settings.service";

import CustomerStatementWorkflowPage from "../page";

jest.mock("next/navigation", () => ({
  notFound: jest.fn(),
  redirect: jest.fn(),
}));

jest.mock("@/actions/customers/customerActions", () => ({
  getCustomerAction: jest.fn(),
}));

jest.mock("@/lib/security/rbac", () => ({
  RbacError: class RbacError extends Error {},
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

jest.mock("@/i18n/routing", () => ({
  localizePath: (href: string, locale: string) => `/${locale}${href}`,
  pickLocale: (locale: string) => (locale === "fr" ? "fr" : "en"),
}));

jest.mock("@/components/dashboard/DashboardRouteState", () => ({
  DashboardRouteState: ({
    kind,
    title,
    message,
    primaryHref,
  }: {
    kind: string;
    title: string;
    message: string;
    primaryHref: string;
  }) => (
    <main data-kind={kind}>
      <h1>{title}</h1>
      <p>{message}</p>
      <a href={primaryHref}>Back to customer</a>
    </main>
  ),
}));

jest.mock("@/components/customers/CustomerStatementWorkflow", () => ({
  CustomerStatementWorkflow: ({
    currency,
    customer,
  }: {
    currency: string;
    customer: { id: string; name: string };
  }) => (
    <section aria-label="customer-statement-workflow">
      {customer.id}:{customer.name}:{currency}
    </section>
  ),
}));

const mockGetCustomerAction = getCustomerAction as jest.Mock;
const mockRequireAllPermissions = requireAllPermissions as jest.Mock;
const mockObserveModuleAccess = observeModuleAccess as jest.Mock;
const mockGetOrganizationSettingsForOrg =
  getOrganizationSettingsForOrg as jest.Mock;

describe("Customer statement route entitlement", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockRequireAllPermissions.mockResolvedValue({
      userId: "user-1",
      orgId: "org-1",
      permissions: ["customers.read", "accounting.exports.create"],
    });
    mockObserveModuleAccess.mockResolvedValue({
      allowed: true,
      wouldBlock: false,
      result: "allow",
      mode: "enforce",
      moduleSlug: "accounting",
    });
    mockGetOrganizationSettingsForOrg.mockResolvedValue({ currency: "XAF" });
    mockGetCustomerAction.mockResolvedValue({
      success: true,
      data: {
        id: "customer-1",
        name: "Pilot Customer",
        code: "CUS-001",
        email: "customer@example.test",
      },
    });
  });

  it("enforces Accounting export entitlement before loading the customer", async () => {
    render(
      await CustomerStatementWorkflowPage({
        params: Promise.resolve({
          locale: "en",
          id: "customer-1",
        }),
      }),
    );

    expect(mockRequireAllPermissions).toHaveBeenCalledWith(
      ["customers.read", "accounting.exports.create"],
      expect.objectContaining({
        resource: "CustomerManagement",
        resourceId: "customer-1",
      }),
    );
    expect(mockObserveModuleAccess).toHaveBeenCalledWith({
      organizationId: "org-1",
      userId: "user-1",
      actorPermissions: ["customers.read", "accounting.exports.create"],
      moduleSlug: "accounting",
      surfaceType: "page",
      surface: "/dashboard/customers/[id]/statement",
      accessIntent: "export",
      mode: "enforce",
      audit: true,
    });
    expect(mockGetCustomerAction).toHaveBeenCalledWith("customer-1");
    expect(
      screen.getByLabelText("customer-statement-workflow"),
    ).toHaveTextContent("customer-1:Pilot Customer:XAF");
  });

  it("does not enumerate customer data when Accounting is not entitled", async () => {
    mockObserveModuleAccess.mockResolvedValue({
      allowed: false,
      wouldBlock: true,
      result: "deny",
      mode: "enforce",
      moduleSlug: "accounting",
    });

    render(
      await CustomerStatementWorkflowPage({
        params: Promise.resolve({
          locale: "fr",
          id: "customer-1",
        }),
      }),
    );

    expect(mockGetCustomerAction).not.toHaveBeenCalled();
    expect(screen.getByRole("main")).toHaveAttribute(
      "data-kind",
      "locked_module",
    );
    expect(
      screen.getByRole("heading", {
        name: "Les relevés client ne sont pas activés pour cette organisation",
      }),
    ).toBeInTheDocument();
    expect(
      screen.getByRole("link", { name: "Back to customer" }),
    ).toHaveAttribute("href", "/fr/dashboard");
  });
});
