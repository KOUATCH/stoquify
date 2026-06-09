import { notFound } from "next/navigation"

import { getBrandById } from "@/actions/brands/getBrandsAction"
import { ModernBrandForm } from "@/components/brands/ModernBrandForm"
import { checkPermission, getAuthenticatedUser } from "@/config/useAuth"
import { pickLocale } from "@/i18n/routing"
import { PERMISSIONS } from "@/lib/permissions"

interface BrandEditPageProps {
  params: Promise<{ locale: string; id: string }>
}

export default async function BrandEditPage({ params }: BrandEditPageProps) {
  await checkPermission(PERMISSIONS.UPDATE_BRANDS)

  const { locale: rawLocale, id } = await params
  const locale = pickLocale(rawLocale)
  const user = await getAuthenticatedUser()

  if (!user?.organizationId) {
    notFound()
  }

  const brandResult = await getBrandById(id, user.organizationId)

  if (!brandResult.success || !brandResult.data) {
    notFound()
  }

  return (
    <ModernBrandForm
      mode="edit"
      organizationId={user.organizationId}
      initialData={brandResult.data}
      returnHref={`/${locale}/dashboard/inventory/brands`}
    />
  )
}
