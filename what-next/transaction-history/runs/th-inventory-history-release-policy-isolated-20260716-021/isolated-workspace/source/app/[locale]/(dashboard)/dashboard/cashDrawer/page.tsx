import { redirect } from "next/navigation"

import { requireAnyPermission } from "@/lib/security/rbac"

type LegacyLocaleCashDrawerPageProps = {
  params: Promise<{ locale: string }>
}

export default async function LegacyLocaleCashDrawerPage({ params }: LegacyLocaleCashDrawerPageProps) {
  const { locale } = await params

  await requireAnyPermission(["finance.cash-drawer.read", "finance.read"], {
    resource: "LegacyCashDrawerRedirect",
  })

  redirect(`/${locale}/dashboard/finance/cash-drawer`)
}
