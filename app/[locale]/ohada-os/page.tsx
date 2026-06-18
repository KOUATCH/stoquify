import { OhadaOsLanding } from "@/components/marketing/ohada-os-landing"

export const dynamic = "force-dynamic"

type PageProps = {
  params: Promise<{ locale: string }>
}

export default async function Page({ params }: PageProps) {
  const { locale } = await params
  return <OhadaOsLanding locale={locale === "fr" ? "fr" : "en"} />
}
