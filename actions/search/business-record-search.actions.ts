"use server"

import { requireRbacContext } from "@/lib/security/rbac"
import { searchBusinessRecords } from "@/services/search/business-record-search.service"
import type { RecordSearchResult } from "@/services/search/business-record-search-contracts"

export async function searchBusinessRecordsAction(query: string, locale: "en" | "fr"): Promise<
  { success: true; data: RecordSearchResult } | { success: false }
> {
  try {
    const context = await requireRbacContext()
    return { success: true, data: await searchBusinessRecords(context, query, locale === "fr" ? "fr" : "en") }
  } catch {
    return { success: false }
  }
}
