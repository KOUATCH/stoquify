import { HrisEmployeeImportClient } from "@/components/hris/HrisEmployeeImportClient";
import { DashboardRouteState } from "@/components/dashboard/DashboardRouteState";
import { getEmployeeImportTemplateAction } from "@/actions/hris/employee-import.actions";
import { pickLocale, localizePath } from "@/i18n/routing";
export default async function PeopleImportPage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const locale = pickLocale((await params).locale),
    result = await getEmployeeImportTemplateAction();
  if (!result.success)
    return (
      <DashboardRouteState
        kind="permission_denied"
        locale={locale}
        primaryHref={localizePath("/dashboard/people", locale)}
      />
    );
  return (
    <HrisEmployeeImportClient
      organizationId={result.data.organizationId}
      locale={locale}
    />
  );
}
