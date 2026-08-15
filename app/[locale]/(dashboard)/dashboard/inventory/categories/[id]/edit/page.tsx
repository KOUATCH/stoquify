import { notFound } from "next/navigation"

import { getCategoryById, getOrgCategories } from "@/actions/categories/getCategoriesAction"
import { ModernCategoryForm } from "@/components/categories/ModernCategoryForm"
import { getAuthenticatedUser, checkPermission } from "@/config/useAuth"
import { pickLocale } from "@/i18n/routing"
import { routeByKey, withInventorySurfaceAccess } from "../../../inventory-route-access"

interface CategoryEditPageProps {
  params: Promise<{ locale: string; id: string }>
}

async function CategoryEditPageImpl({ params }: CategoryEditPageProps) {
  await checkPermission("inventory.categories.update")

  const { locale: rawLocale, id } = await params
  const locale = pickLocale(rawLocale)
  const user = await getAuthenticatedUser()

  if (!user?.organizationId) {
    notFound()
  }

  const [categoryResult, categoriesResult] = await Promise.all([
    getCategoryById(id, user.organizationId),
    getOrgCategories(user.organizationId),
  ])

  if (!categoryResult.success || !categoryResult.data) {
    notFound()
  }

  return (
    <ModernCategoryForm
      mode="edit"
      organizationId={user.organizationId}
      initialData={categoryResult.data}
      categories={categoriesResult.data ?? []}
      returnHref={`/${locale}/dashboard/inventory/categories`}
    />
  )
}



export default async function InventoryRoutePage(props: any = {}) {
  const surface = routeByKey("inventory-categories-edit")

  if (!surface) {
    throw new Error("Missing inventory route surface definition: inventory-categories-edit")
  }

  return withInventorySurfaceAccess({
    params: (props as { params?: Promise<{ locale: string }> }).params ?? Promise.resolve({ locale: "en" }),
    surface,
    onAllowed: async () => CategoryEditPageImpl(props),
  })
}
