import { UserRoundCog } from "lucide-react"

import { getAccountantAccessRegisterAction } from "@/actions/accounting/accountant-access.actions"
import { AccountantAccessManager } from "@/components/accounting/AccountantAccessManager"
import { checkPermission } from "@/config/useAuth"
import { AccountingPageShell } from "../_components/accounting-ui"

export default async function AccountantAccessPage() {
  await checkPermission("accounting.close.accountant.invite")
  const response = await getAccountantAccessRegisterAction()

  return (
    <AccountingPageShell
      eyebrow="Client consent"
      title="Accountant Access"
      description="Manage explicit accountant mandates, roles, expiry, evidence, and revocation."
      icon={UserRoundCog}
    >
      {response.success ? (
        <AccountantAccessManager initialGrants={response.data} />
      ) : (
        <div className="rounded-xl border border-destructive/30 p-5 text-sm text-destructive">
          {response.error}
        </div>
      )}
    </AccountingPageShell>
  )
}
