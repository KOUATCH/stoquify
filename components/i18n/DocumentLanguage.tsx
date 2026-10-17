"use client"

import { useEffect } from "react"
import type { Locale } from "@/types/bilingual"

/** The root layout persists when client navigation changes the locale segment. */
export function DocumentLanguage({ locale }: { locale: Locale }) {
  useEffect(() => {
    document.documentElement.lang = locale
  }, [locale])

  return null
}
