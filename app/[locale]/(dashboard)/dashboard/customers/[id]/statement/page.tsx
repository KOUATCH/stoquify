import { notFound } from "next/navigation";

import { getCustomerAction } from "@/actions/customers/customerActions";
import { CustomerStatementWorkflow } from "@/components/customers/CustomerStatementWorkflow";
import {
  createOrganizationMoneyFormatter,
  OrganizationCurrencyUnavailableError,
} from "@/lib/i18n/organization-money";
import { getOrganizationSettingsForOrg } from "@/services/organization/organization-settings.service";

import {
  routeByKey,
  withCustomersSurfaceAccess,
} from "../../customers-route-access";

export const metadata = {
  title: "Customer statement | Stoquify",
  description: "Generate, freeze, and securely share a customer statement.",
};

const routeCopy = {
  en: {
    noOrgTitle: "Customer statements are not enabled for this organization",
    noOrgMessage:
      "Enable the Accounting module before generating or sharing immutable customer statements. The entitlement denial was audited.",
    deniedTitle: "Customer statements are not available for this role",
    deniedMessage:
      "Customer statements require accounting export access. The denial was recorded by the RBAC guard.",
    back: "Back to customer",
  },
  fr: {
    noOrgTitle:
      "Les relevés client ne sont pas activés pour cette organisation",
    noOrgMessage:
      "Activez le module Comptabilité avant de générer ou partager des relevés client immuables. Le refus d’accès a été audité.",
    deniedTitle: "Les relevés client ne sont pas disponibles pour ce rôle",
    deniedMessage:
      "Les relevés client nécessitent l'accès à l'export comptable. Le refus a été enregistré par le contrôle RBAC.",
    back: "Retour au client",
  },
} as const;

export default async function CustomerStatementWorkflowPage({
  params,
}: {
  params: Promise<{ locale: string; id: string }>;
}) {
  const { locale: rawLocale, id } = await params;
  const surface = routeByKey("customers-statement");

  if (!surface) {
    throw new Error(
      "Missing customers route surface definition: customers-statement",
    );
  }

  const t = routeCopy[rawLocale === "fr" ? "fr" : "en"];

  if (!id) {
    notFound();
  }

  const statementSurface = {
    ...surface,
    module: surface.module
      ? {
          ...surface.module,
          moduleLockedTitle: t.noOrgTitle,
          moduleLockedMessage: t.noOrgMessage,
        }
      : undefined,
    modules: surface.modules?.map((item) => ({
      ...item,
      moduleLockedTitle: t.noOrgTitle,
      moduleLockedMessage: t.noOrgMessage,
    })),
  };

  return withCustomersSurfaceAccess({
    params: Promise.resolve({ locale: rawLocale }),
    surface: statementSurface,
    permissionOptions: {
      resourceId: id,
    },
    onAllowed: async (context, locale) => {
      const [result, organization] = await Promise.all([
        getCustomerAction(id),
        getOrganizationSettingsForOrg(context.orgId),
      ]);
      if (!result.success || !result.data) notFound();

      const currency = organization?.currency.trim().toUpperCase();
      if (!currency) {
        throw new OrganizationCurrencyUnavailableError(context.orgId);
      }
      createOrganizationMoneyFormatter({
        organizationId: context.orgId,
        locale,
        currency,
      });

      return (
        <div className="dashboard-landing-theme min-h-screen overflow-x-hidden">
          <div className="dashboard-landing-content mx-auto w-full max-w-6xl px-4 py-6 sm:px-6 sm:py-8">
            <CustomerStatementWorkflow
              currency={currency}
              customer={{
                id: result.data.id,
                name: result.data.name,
                code: result.data.code,
                email: result.data.email,
              }}
              locale={locale}
            />
          </div>
        </div>
      );
    },
  });
}
