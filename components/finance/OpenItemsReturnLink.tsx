"use client"
import Link from "next/link"
import { useSearchParams } from "next/navigation"
import { safeOpenItemsReturn } from "@/lib/finance/open-items-navigation"

export function OpenItemsReturnLink({ locale }: { locale: "en" | "fr" }) {
  const params = useSearchParams()
  const href = safeOpenItemsReturn(params.get("returnTo"), locale)
  return href ? <p className="p-4"><Link className="underline focus-visible:outline" href={href}>{locale === "fr" ? "Revenir au tableau de bord et à ses filtres" : "Return to dashboard and its filters"}</Link></p> : null
}
