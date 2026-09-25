import { z } from "zod"

export const directoryFilters = z.object({ search: z.string().trim().max(200).default(""), status: z.enum(["all", "active", "inactive"]).default("all") }).strict()
export const directoryPreviewInput = z.object({ locale: z.enum(["en", "fr"]), filters: directoryFilters }).strict()
export const directoryExportInput = directoryPreviewInput.extend({ expectedHash: z.string().regex(/^[a-f0-9]{64}$/), requestId: z.string().uuid() }).strict()
export type DirectoryFilters = z.infer<typeof directoryFilters>
export type DirectoryPreviewInput = z.infer<typeof directoryPreviewInput>
export type DirectoryExportInput = z.infer<typeof directoryExportInput>

type SearchableOrganization = { isActive: boolean; name: string; slug: string; industry: string | null; country: string | null; state: string | null; address: string | null; currency: string; timezone: string; defaultLocale: string; fiscalYearStart: string | null }
export function matchesDirectoryFilters(row: SearchableOrganization, filters: DirectoryFilters) {
  if (filters.status !== "all" && row.isActive !== (filters.status === "active")) return false
  const query = filters.search.trim().toLowerCase()
  return !query || [row.name, row.slug, row.industry, row.country, row.state, row.address, row.currency, row.timezone, row.defaultLocale, row.fiscalYearStart].filter(Boolean).join(" ").toLowerCase().includes(query)
}

// Keep the database's decimal cents intact; no binary-number conversion of totals.
export function formatDirectoryPaymentTotal(value: string, currency: string, locale: "en" | "fr") {
  const parts = /^(-?)(\d+)\.(\d{2})$/.exec(value)
  if (!parts) return locale === "fr" ? "Indisponible" : "Unavailable"
  const integer = BigInt(parts[2]), formatted = new Intl.NumberFormat(locale, { maximumFractionDigits: 0 }).format(integer)
  return `${parts[1]}${formatted}${locale === "fr" ? "," : "."}${parts[3]} ${currency}`
}
