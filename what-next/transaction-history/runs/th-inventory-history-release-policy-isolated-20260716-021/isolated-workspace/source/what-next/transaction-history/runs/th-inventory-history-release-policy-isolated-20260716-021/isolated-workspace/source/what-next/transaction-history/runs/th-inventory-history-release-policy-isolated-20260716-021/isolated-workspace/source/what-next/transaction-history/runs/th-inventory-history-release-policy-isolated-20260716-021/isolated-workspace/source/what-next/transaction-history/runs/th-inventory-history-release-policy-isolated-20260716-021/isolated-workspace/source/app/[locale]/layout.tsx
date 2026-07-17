// Locale-segment layout. The root layout at app/layout.tsx provides <html>,
// <body>, and global providers. This dynamic layout validates the [locale]
// param, loads messages, and provides next-intl context for localized routes.
import { routing } from "@/i18n/routing"
import { NextIntlClientProvider } from "next-intl"
import { notFound } from "next/navigation"
import { setRequestLocale } from "next-intl/server"
import type { Locale } from "@/types/bilingual"

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
  const messages = (await import(`@/messages/${locale}.json`)).default

  return <NextIntlClientProvider locale={locale} messages={messages}>{children}</NextIntlClientProvider>
}
