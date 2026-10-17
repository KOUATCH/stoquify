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
  const messages = (await import(`@/messages/${locale}.json`)).default

  const paymentRequest = (await import(`@/messages/payment-request/${locale}.json`)).default
  const paymentExecution = (await import(`@/messages/payment-execution/${locale}.json`)).default
  const paymentPostingRecovery = (await import(`@/messages/payment-posting-recovery/${locale}.json`)).default
  return <NextIntlClientProvider locale={locale} messages={{ ...messages, paymentRequest, paymentExecution, paymentPostingRecovery }}><DocumentLanguage locale={locale as Locale} />{children}</NextIntlClientProvider>
}
