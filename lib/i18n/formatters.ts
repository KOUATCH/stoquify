import type { Locale } from "@/types/bilingual"

const intlLocaleByAppLocale: Record<Locale, string> = {
  en: "en-US",
  fr: "fr-FR",
}

export function formatCurrency(amount: number | null | undefined, locale: Locale = "en", currency = "USD") {
  return new Intl.NumberFormat(intlLocaleByAppLocale[locale] ?? "en-US", {
    style: "currency",
    currency,
  }).format(amount ?? 0)
}

export function formatNumber(value: number | null | undefined, locale: Locale = "en") {
  return new Intl.NumberFormat(intlLocaleByAppLocale[locale] ?? "en-US").format(value ?? 0)
}

export function formatDate(value: Date | string | number, locale: Locale = "en") {
  return new Intl.DateTimeFormat(intlLocaleByAppLocale[locale] ?? "en-US", {
    year: "numeric",
    month: "short",
    day: "numeric",
  }).format(new Date(value))
}
