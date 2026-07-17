import { AuthV2Shell } from "@/components/auth/v2/AuthV2Shell"
import { VerifyV2Form } from "@/components/auth/v2/VerifyV2Form"
import { pickLocale } from "@/i18n/routing"

export const dynamic = "force-dynamic"

type VerifyPageProps = {
  params: Promise<{
    locale: string
    userId: string
  }>
  searchParams: Promise<{
    email?: string | string[]
  }>
}

export default async function VerifyPage({ params, searchParams }: VerifyPageProps) {
  const { locale, userId } = await params
  const resolvedLocale = pickLocale(locale)
  const query = await searchParams
  const emailValue = Array.isArray(query.email) ? query.email[0] : query.email
  const alternatePath = `/verify/${userId}${emailValue ? `?email=${encodeURIComponent(emailValue)}` : ""}`

  return (
    <AuthV2Shell locale={resolvedLocale} variant="verify" alternatePath={alternatePath}>
      <VerifyV2Form locale={resolvedLocale} userId={userId} email={emailValue ?? ""} />
    </AuthV2Shell>
  )
}
