import { BriefcaseBusiness } from "lucide-react"

import { AccountantPortfolioWorkspace } from "@/components/accounting/AccountantPortfolioWorkspace"
import { accountantPortfolioCopy } from "@/components/accounting/accountant-portfolio-copy"
import { checkPermission } from "@/config/useAuth"
import { AccountingPageShell } from "../_components/accounting-ui"
import { routeByKey, withAccountingSurfaceAccess } from "../accounting-route-access"

async function AccountantPortfolioPageImpl(locale: string, query: Record<string, string | string[] | undefined>) {
  await checkPermission("accounting.audit.read")
  const fr = locale === "fr"

  return (
    <AccountingPageShell
      eyebrow={fr ? "Accès délégué" : "Delegated access"}
      title={fr ? "Portefeuille clients du comptable" : "Accountant Client Portfolio"}
      description={fr ? "Seuls les clients avec un mandat de consentement actif et non expiré sont visibles." : "Only clients with active, unexpired consent mandates are visible."}
      icon={BriefcaseBusiness}
    >
      <AccountantPortfolioWorkspace locale={locale} initialInput={{
        search: typeof query.search === "string" ? query.search : "",
        cursor: typeof query.cursor === "string" ? query.cursor : undefined,
        pageSize: typeof query.pageSize === "string" ? Number(query.pageSize) : 10,
      }} />
    </AccountingPageShell>
  )
}



export default async function AccountingRoutePage(props: any = {}) {
  const surface = routeByKey("accounting-accountant-portfolio")

  if (!surface) {
    throw new Error("Missing accounting route surface definition: accounting-accountant-portfolio")
  }

  const params = await ((props as { params?: Promise<{ locale: string }> }).params ?? Promise.resolve({ locale: "en" }))
  const copy = accountantPortfolioCopy[params.locale === "fr" ? "fr" : "en"]
  return withAccountingSurfaceAccess({
    params: Promise.resolve(params),
    surface: { ...surface, module: surface.module ? { ...surface.module,
      moduleLockedTitle: copy.errors.locked_module[0], moduleLockedMessage: copy.errors.locked_module[1],
    } : undefined },
    onAllowed: async (_context, locale) => AccountantPortfolioPageImpl(locale, await props.searchParams ?? {}),
  })
}
