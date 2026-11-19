// Locale-segment layout. The root layout at app/layout.tsx provides <html>,
// <body>, and global providers. This dynamic layout validates the [locale]
// param, loads messages, and provides next-intl context for localized routes.
import { routing } from "@/i18n/routing"
import { NextIntlClientProvider } from "next-intl"
import { notFound } from "next/navigation"
import { setRequestLocale } from "next-intl/server"
import type { Locale } from "@/types/bilingual"
import { DocumentLanguage } from "@/components/i18n/DocumentLanguage"

export const dynamic = "force-dynamic"

export default async function LocaleLayout({
  children,
  params,
}: Readonly<{
  children: React.ReactNode
  params: Promise<{ locale: string }>
}>) {
  const { locale } = await params

  if (!routing.locales.includes(locale as Locale)) {
    notFound()
  }

  setRequestLocale(locale)
  // Route layouts own message delivery so client navigation cannot retain the
  // public bundle when entering authentication or the application workspace.
  return <NextIntlClientProvider locale={locale} messages={{}}><DocumentLanguage locale={locale as Locale} />{children}</NextIntlClientProvider>
}
