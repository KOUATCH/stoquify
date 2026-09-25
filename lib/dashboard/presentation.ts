import en from "@/messages/dashboard-shared/en.json"
import fr from "@/messages/dashboard-shared/fr.json"
import type { ISidebarLink } from "@/config/sidebar"

export const dashboardSharedCopy = { en, fr }

export function dashboardLocale(href?: string): "en" | "fr" {
  return /^\/fr(?:\/|$|[?#])/.test(href ?? "") ? "fr" : "en"
}

export function recoveryLabel(href: string, locale: "en" | "fr") {
  const pathname = href.split(/[?#]/)[0].replace(/^\/(en|fr)(?=\/)/, "").replace(/\/$/, "")
  const copy = dashboardSharedCopy[locale].recovery
  if (pathname === "/dashboard") return copy.dashboard
  if (pathname === "/dashboard/purchases/payables" || pathname === "/dashboard/finance/payables") return copy.payables
  return copy.other
}

export function navigationLabel(text: string, locale: "en" | "fr") {
  const labels: Record<string, string> = dashboardSharedCopy[locale].navigation
  return labels[text] ?? text
}

// Only presentation changes; routes, permissions and module metadata retain their source values.
export function localizeSidebarLinks(links: ISidebarLink[], locale: "en" | "fr"): ISidebarLink[] {
  if (locale === "en") return links
  const label = (text: string) => navigationLabel(text, locale)
  return links.map(link => ({
    ...link,
    title: label(link.title),
    description: link.description ? label(link.description) : undefined,
    dropdownMenu: link.dropdownMenu?.map(item => ({
      ...item,
      title: label(item.title),
      description: item.description ? label(item.description) : undefined,
    })),
  }))
}
