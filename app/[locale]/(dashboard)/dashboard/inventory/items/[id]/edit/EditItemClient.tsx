"use client"

import ModernItemFormForEditing, {
  type ItemEditReference,
} from "@/components/dashboard/items/ModernItemFormForEditing"
import { getLocaleFromPathname, localizePath } from "@/i18n/routing"
import type { ItemEditDTO } from "@/services/item/item.service"
import { DEFAULT_LOCALE } from "@/types/bilingual"
import { usePathname, useRouter } from "next/navigation"

interface EditItemClientProps {
  itemData: ItemEditDTO
  initialBrandData: ItemEditReference[]
  initialUnitData: ItemEditReference[]
  initialTaxRateData: ItemEditReference[]
  initialCategoryData: ItemEditReference[]
}

export default function EditItemClient({
  itemData,
  initialBrandData,
  initialUnitData,
  initialTaxRateData,
  initialCategoryData,
}: EditItemClientProps) {
  const router = useRouter()
  const pathname = usePathname()
  const locale = getLocaleFromPathname(pathname) ?? DEFAULT_LOCALE
  const itemsHref = localizePath("/dashboard/inventory/items", locale)

  return (
    <ModernItemFormForEditing
      itemData={itemData}
      onCancel={() => router.push(itemsHref)}
      onSaved={() => {
        router.push(itemsHref)
      }}
      initialBrandData={initialBrandData}
      initialUnitData={initialUnitData}
      initialCategoryData={initialCategoryData}
      initialTaxRateData={initialTaxRateData}
    />
  )
}