"use client"

import { getLocaleFromPathname } from "@/i18n/routing"
import { DEFAULT_LOCALE, type Locale } from "@/types/bilingual"
import { usePathname } from "next/navigation"
import { useMemo } from "react"

const intlLocaleByAppLocale: Record<Locale, string> = {
  en: "en-US",
  fr: "fr-FR",
}

export function useFormatters(currency = "USD") {
  const pathname = usePathname()
  const locale = getLocaleFromPathname(pathname) ?? DEFAULT_LOCALE
  const intlLocale = intlLocaleByAppLocale[locale]

  return useMemo(() => {
    const currencyFormatter = new Intl.NumberFormat(intlLocale, {
      style: "currency",
      currency,
    })
    const numberFormatter = new Intl.NumberFormat(intlLocale)
    const dateShortFormatter = new Intl.DateTimeFormat(intlLocale, {
      year: "numeric",
      month: "short",
      day: "numeric",
    })

    return {
      currency: (value: number | null | undefined) => currencyFormatter.format(value ?? 0),
      number: (value: number | null | undefined) => numberFormatter.format(value ?? 0),
      dateShort: (value: Date | string | number) => dateShortFormatter.format(new Date(value)),
    }
  }, [currency, intlLocale])
}
