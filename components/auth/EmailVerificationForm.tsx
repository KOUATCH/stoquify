"use client"

import { getLocaleFromPathname } from "@/i18n/routing"
import { DEFAULT_LOCALE } from "@/types/bilingual"
import { usePathname, useSearchParams } from "next/navigation"
import { VerifyV2Form } from "./v2/VerifyV2Form"

// Preserve the legacy exported entry point while using the real verification workflow.
export default function EmailVerificationForm() {
  const query = useSearchParams()
  const locale = getLocaleFromPathname(usePathname()) ?? DEFAULT_LOCALE
  return <VerifyV2Form locale={locale} userId={query.get("id") ?? ""} email={query.get("email") ?? ""} />
}
