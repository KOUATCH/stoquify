import type { Metadata } from "next"

export type PublicContact = {
  email: string | null
  bookingUrl: string | null
  company: string | null
  privacyUrl: string | null
  termsUrl: string | null
}

function publicUrl(value: string | undefined): string | null {
  if (!value) return null
  try {
    const url = new URL(value)
    return url.protocol === "https:" && !url.username && !url.password ? url.href : null
  } catch { return null }
}

// Only explicitly approved public information is exposed to the marketing shell.
// Missing configuration must never turn into invented contact or policy details.
export function getPublicContact(): PublicContact {
  const email = process.env.STOQUIFY_PUBLIC_ENQUIRY_EMAIL?.trim()
  return {
    email: email && /^[^\s@<>?]+@[^\s@<>?]+\.[^\s@<>?]+$/.test(email) ? email : null,
    bookingUrl: publicUrl(process.env.STOQUIFY_PUBLIC_BOOKING_URL),
    company: process.env.STOQUIFY_PUBLIC_COMPANY_NAME?.trim() || null,
    privacyUrl: publicUrl(process.env.STOQUIFY_PUBLIC_PRIVACY_URL),
    termsUrl: publicUrl(process.env.STOQUIFY_PUBLIC_TERMS_URL),
  }
}

export function publicMetadata(locale: string, path = "", contact = false, page?: { title: string; description: string }): Metadata {
  const fr = locale === "fr"
  const title = page?.title ?? (contact
    ? (fr ? "Préparer votre projet | Stoquify" : "Plan your workspace | Stoquify")
    : (fr ? "Stoquify | Ventes, stocks, SIRH et comptabilité OHADA" : "Stoquify | Sales, stock, HRIS and OHADA accounting"))
  const description = page?.description ?? (fr
    ? "Reliez ventes, stocks, paiements et dossiers du personnel au travail de votre équipe financière et de votre cabinet comptable. Préparez un déploiement adapté à vos besoins."
    : "Connect sales, stock, payments and people records to your finance team and accounting firm. Plan a workspace around your business needs.")
  const origin = publicUrl(process.env.NEXT_PUBLIC_APP_URL || process.env.NEXT_PUBLIC_BASE_URL)
  return {
    title, description,
    ...(origin ? { alternates: { canonical: new URL(`/${fr ? "fr" : "en"}${path}`, origin).href, languages: { en: new URL(`/en${path}`, origin).href, fr: new URL(`/fr${path}`, origin).href } } } : {}),
    openGraph: { title, description, type: "website", locale: fr ? "fr_FR" : "en_GB", alternateLocale: fr ? "en_GB" : "fr_FR", siteName: "Stoquify" },
    twitter: { card: "summary", title, description },
  }
}
