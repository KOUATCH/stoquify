import { UserRoundCog } from "lucide-react"

import { getAccountantAccessRegisterAction } from "@/actions/accounting/accountant-access.actions"
import { AccountantAccessManager } from "@/components/accounting/AccountantAccessManager"
import { checkPermission } from "@/config/useAuth"
import { AccountingPageShell } from "../_components/accounting-ui"
import { routeByKey, withAccountingSurfaceAccess } from "../accounting-route-access"

async function AccountantAccessPageImpl() {
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



export default async function AccountingRoutePage(props: any = {}) {
  const surface = routeByKey("accounting-accountant-access")

  if (!surface) {
    throw new Error("Missing accounting route surface definition: accounting-accountant-access")
  }

  return withAccountingSurfaceAccess({
    params: (props as { params?: Promise<{ locale: string }> }).params ?? Promise.resolve({ locale: "en" }),
    surface,
    onAllowed: async () => AccountantAccessPageImpl(),
  })
}
