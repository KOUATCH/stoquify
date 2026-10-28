import { BriefcaseBusiness } from "lucide-react"

import { getAccountantPortfolioAction } from "@/actions/accounting/accountant-access.actions"
import { AccountantPortfolio } from "@/components/accounting/AccountantPortfolio"
import { checkPermission } from "@/config/useAuth"
import { AccountingPageShell } from "../_components/accounting-ui"
import { routeByKey, withAccountingSurfaceAccess } from "../accounting-route-access"

async function AccountantPortfolioPageImpl() {
  await checkPermission("accounting.audit.read")
  const response = await getAccountantPortfolioAction()

  return (
    <AccountingPageShell
      eyebrow="Delegated access"
      title="Accountant Client Portfolio"
      description="Only clients with active, unexpired consent mandates are visible."
      icon={BriefcaseBusiness}
    >
      {response.success ? (
        <AccountantPortfolio portfolio={response.data} />
      ) : (
        <div className="rounded-xl border border-destructive/30 p-5 text-sm text-destructive">
          {response.error}
        </div>
      )}
    </AccountingPageShell>
  )
}



export default async function AccountingRoutePage(props: any = {}) {
  const surface = routeByKey("accounting-accountant-portfolio")

  if (!surface) {
    throw new Error("Missing accounting route surface definition: accounting-accountant-portfolio")
  }

  return withAccountingSurfaceAccess({
    params: (props as { params?: Promise<{ locale: string }> }).params ?? Promise.resolve({ locale: "en" }),
    surface,
    onAllowed: async () => AccountantPortfolioPageImpl(),
  })
}
