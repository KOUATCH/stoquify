import { localizePath, pickLocale } from "@/i18n/routing"
import { redirect } from "next/navigation"

// The InventoryOverview landing widget was deleted as an orphan (no
// consumers besides this page, no remaining business logic). Redirect
// the inventory root to the canonical items list.
export default async function InventoryPage({
  params,
}: {
  params: Promise<{ locale: string }>
}) {
  const { locale: rawLocale } = await params
  const locale = pickLocale(rawLocale)

  redirect(localizePath("/dashboard/inventory/items", locale))
}
