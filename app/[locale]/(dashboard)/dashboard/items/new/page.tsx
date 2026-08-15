import { pickLocale } from "@/i18n/routing"
import { localizePath } from "@/i18n/routing"
import { routeByKey, withItemsSurfaceAccess } from "../items-route-access"
import { redirect } from "next/navigation"

export default async function NewItemPage({
  params,
}: {
  params: Promise<{ locale: string }>
}) {
  const surface = routeByKey("items-new")

  if (!surface) {
    throw new Error("Missing items route surface definition: items-new")
  }

  return withItemsSurfaceAccess({
    params,
    surface,
    onAllowed: async () => {
      const { locale: rawLocale } = await params
      const locale = pickLocale(rawLocale)
      redirect(localizePath("/dashboard/inventory/items/create", locale))
      return null
    },
  })
}
