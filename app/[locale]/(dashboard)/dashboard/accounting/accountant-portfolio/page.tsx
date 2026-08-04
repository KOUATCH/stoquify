import { BriefcaseBusiness } from "lucide-react"

import { getAccountantPortfolioAction } from "@/actions/accounting/accountant-access.actions"
import { AccountantPortfolio } from "@/components/accounting/AccountantPortfolio"
import { checkPermission } from "@/config/useAuth"
import { AccountingPageShell } from "../_components/accounting-ui"

export default async function AccountantPortfolioPage() {
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
