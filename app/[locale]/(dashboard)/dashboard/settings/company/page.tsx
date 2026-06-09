import { getSession } from "@/lib/auth-server"
import OrganizationManagementTable from "@/components/settings/OrganizationManagementTable"
import OrganizationSettingsForm from "@/components/settings/OrganizationSettingsForm"
import { localizePath, pickLocale } from "@/i18n/routing"
import { redirect } from "next/navigation"

export const metadata = {
  title: "Company DNA | StockFlow",
  description: "Manage organization identity, locale, currency, timezone, and operating calendar.",
}

export default async function CompanySettingsPage({
  params,
}: {
  params: Promise<{ locale: string }>
}) {
  const { locale: rawLocale } = await params
  const locale = pickLocale(rawLocale)
  const session = await getSession()

  if (!session?.user) {
    redirect(localizePath("/login", locale))
  }

  if (!session.user.organizationId) {
    redirect(localizePath("/unauthorized", locale))
  }

  return (
    <div className="dashboard-landing-theme min-h-screen overflow-x-hidden">
      <div className="dashboard-landing-content mx-auto flex w-full max-w-[88rem] min-w-0 flex-col gap-6 px-4 py-6 sm:px-6 sm:py-8">
        <section id="organization-profile" className="scroll-mt-6">
          <OrganizationSettingsForm
            organizationId={session.user.organizationId}
            locale={locale}
          />
        </section>

        <OrganizationManagementTable
          organizationId={session.user.organizationId}
          locale={locale}
        />
      </div>
    </div>
  )
}
