import { redirect } from "next/navigation"

type LegacyLocaleCashDrawerPageProps = {
  params: Promise<{ locale: string }>
}

export default async function LegacyLocaleCashDrawerPage({ params }: LegacyLocaleCashDrawerPageProps) {
  const { locale } = await params
  redirect(`/${locale}/dashboard/finance/cash-drawer`)
}
