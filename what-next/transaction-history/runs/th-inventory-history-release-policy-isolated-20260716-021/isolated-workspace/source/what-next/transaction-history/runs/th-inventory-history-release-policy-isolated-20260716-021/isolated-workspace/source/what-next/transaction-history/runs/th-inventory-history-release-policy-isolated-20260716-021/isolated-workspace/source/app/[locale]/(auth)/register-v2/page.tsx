import { AuthV2Shell } from "@/components/auth/v2/AuthV2Shell"
import { RegisterV2Form } from "@/components/auth/v2/RegisterV2Form"
import { pickLocale } from "@/i18n/routing"

export const dynamic = "force-dynamic"

type PageProps = {
  params: Promise<{ locale: string }>
}

export default async function Page({ params }: PageProps) {
  const { locale } = await params
  const resolvedLocale = pickLocale(locale)

  return (
    <AuthV2Shell locale={resolvedLocale} variant="register">
      <RegisterV2Form locale={resolvedLocale} />
    </AuthV2Shell>
  )
}
