"use client"

import { useEffect, useState } from "react"
import Link from "next/link"
import { usePathname, useSearchParams } from "next/navigation"
import { Globe2 } from "lucide-react"

/** Changes only the locale; the destination remains responsible for validating its scope. */
export function DashboardLanguageLink({ locale }: { locale: "en" | "fr" }) {
  const pathname = usePathname()
  const searchParams = useSearchParams()
  const query = searchParams.toString()
  const [hash, setHash] = useState("")
  const targetLocale = locale === "fr" ? "en" : "fr"
  const label = locale === "fr" ? "Switch to English" : "Passer en français"
  const path = pathname.replace(/^\/(en|fr)(?=\/|$)/, "") || "/dashboard"

  useEffect(() => {
    const syncHash = () => setHash(window.location.hash)
    syncHash()
    window.addEventListener("hashchange", syncHash)
    window.addEventListener("popstate", syncHash)
    return () => {
      window.removeEventListener("hashchange", syncHash)
      window.removeEventListener("popstate", syncHash)
    }
  }, [pathname, query])

  return (
    <Link
      href={`/${targetLocale}${path}${query ? `?${query}` : ""}${hash}`}
      className="dashboard-top-button flex h-10 w-10 shrink-0 items-center justify-center gap-2 rounded-lg px-0 text-sm font-semibold uppercase transition-colors focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--product-brand-strong)] sm:w-auto sm:px-3"
      aria-label={label}
      title={label}
      hrefLang={targetLocale}
    >
      <Globe2 className="h-4 w-4 text-[var(--product-brand-strong)]" aria-hidden="true" />
      <span className="hidden sm:inline">{targetLocale}</span>
    </Link>
  )
}
