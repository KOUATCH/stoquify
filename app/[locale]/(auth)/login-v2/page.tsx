import { AuthV2Shell } from "@/components/auth/v2/AuthV2Shell"
import { LoginV2Form } from "@/components/auth/v2/LoginV2Form"
import { pickLocale } from "@/i18n/routing"
import { getTranslations } from "next-intl/server"

export const dynamic = "force-dynamic"
export const metadata = { referrer: "no-referrer" as const, robots: { index: false, follow: false } }

type PageProps = {
  params: Promise<{ locale: string }>
  searchParams?: Promise<{ notice?: string }>
}

export default async function Page({ params, searchParams }: PageProps) {
  const { locale } = await params
  const resolvedLocale = pickLocale(locale)
  const showPasswordGuidance = (await searchParams)?.notice === "password-change"
  const t = await getTranslations({ locale: resolvedLocale, namespace: "passwordChange" })

  return (
    <AuthV2Shell locale={resolvedLocale} variant="login">
      {showPasswordGuidance ? <div className="w-full max-w-[560px] space-y-4">
        <p role="note" className="rounded-lg border border-[#178e83]/30 bg-[#edf5f2] p-4 text-sm text-[#253943]">{t("signInAfterChange")}</p>
        <LoginV2Form locale={resolvedLocale} />
      </div> : <LoginV2Form locale={resolvedLocale} />}
    </AuthV2Shell>
  )
}
