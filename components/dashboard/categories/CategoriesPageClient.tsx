"use client"

import EnhancedCategoriesManagement from "@/components/inventory/EnhancedCategoriesManagement"
import type { Locale } from "@/types/bilingual"
import type { CategoryDTO } from "@/types/category"

interface CategoriesPageClientProps {
  initialData: CategoryDTO[]
  organizationId: string
  basePath?: string
  locale?: Locale
}

export default function CategoriesPageClient({
  initialData,
  organizationId,
  basePath = "/dashboard/inventory/categories",
  locale = "en",
}: CategoriesPageClientProps) {
  return (
    <EnhancedCategoriesManagement
      data={initialData}
      organizationId={organizationId}
      basePath={basePath}
      locale={locale}
    />
  )
}
