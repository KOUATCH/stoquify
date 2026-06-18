import { localizePath, pickLocale } from "@/i18n/routing"
import { redirect } from "next/navigation"

// Legacy item-create alias. The canonical create page is
// at /dashboard/inventory/items/create (uses ModernCreateItemForm with the
// bilingual EN/FR inputs). Forward here so we don't maintain two parallel
// item-create UIs.
export default async function NewItemPage({
  params,
}: {
  params: Promise<{ locale: string }>
}) {
  const { locale: rawLocale } = await params
  const locale = pickLocale(rawLocale)

  redirect(localizePath("/dashboard/inventory/items/create", locale))
}
