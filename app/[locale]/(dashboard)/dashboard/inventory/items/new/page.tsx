import { checkPermission } from "@/config/useAuth"
import { localizePath, pickLocale } from "@/i18n/routing"
import { redirect } from "next/navigation"

// Legacy alias retained for saved links. The canonical create workflow lives at /create.
export default async function ItemsNewPage({
  params,
}: {
  params: Promise<{ locale: string }>
}) {
  await checkPermission("inventory.items.create")

  const { locale: rawLocale } = await params
  const locale = pickLocale(rawLocale)

  redirect(localizePath("/dashboard/inventory/items/create", locale))
}
