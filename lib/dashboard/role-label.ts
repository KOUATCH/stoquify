import type { Locale } from "@/types/bilingual"

type DisplayRole = { name?: string | null; nameEn?: string | null; nameFr?: string | null; code?: string | null }

// Display only. Never use a translated label to decide access or role identity.
export function dashboardRoleLabel(role: DisplayRole | undefined, locale: Locale): string {
  const localized = locale === "fr" ? role?.nameFr : role?.nameEn
  return localized?.trim() || role?.name?.trim() || role?.code?.trim() || (locale === "fr" ? "Utilisateur" : "User")
}
