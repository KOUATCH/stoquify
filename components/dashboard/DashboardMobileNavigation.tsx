"use client"

import Link from "next/link"
import { ChevronRight } from "lucide-react"
import type { getSidebarSections } from "@/config/sidebar"
import { localizePath } from "@/i18n/routing"
import { navigationLabel } from "@/lib/dashboard/presentation"

type Props = {
  sections: ReturnType<typeof getSidebarSections>
  locale: "en" | "fr"
  activeHref?: string
  pathname: string
  searching: boolean
  onNavigate: () => void
}

/** Receives only the shell's already permission/module-filtered navigation. */
export function DashboardMobileNavigation({ sections, locale, activeHref, pathname, searching, onNavigate }: Props) {
  const focus = "outline-none focus-visible:ring-2 focus-visible:ring-[var(--dash-brand-strong)] focus-visible:ring-inset"
  return (
    <nav aria-label={locale === "fr" ? "Navigation mobile du tableau de bord" : "Mobile dashboard navigation"} className="dashboard-sidebar-scroll grid min-h-0 gap-4 overflow-y-auto text-sm font-medium">
      {sections.map(section => (
        <section key={section.key} className="grid gap-1" aria-labelledby={`mobile-sidebar-section-${section.key}`}>
          <p id={`mobile-sidebar-section-${section.key}`} className="px-3 text-xs font-semibold text-[var(--dash-text-soft)]">
            {navigationLabel(section.title, locale)}
          </p>
          {section.links.map(link => {
            const Icon = link.icon
            const destinations = link.dropdown ? link.dropdownMenu ?? [] : []
            const containsActive = destinations.some(item => item.href === activeHref)
            if (!link.dropdown) return link.href ? (
              <Link key={link.href} href={localizePath(link.href, locale)} onClick={onNavigate}
                data-active={link.href === activeHref ? "true" : "false"}
                aria-current={link.href === activeHref ? (pathname === link.href ? "page" : "location") : undefined}
                className={`dashboard-sidebar-module flex min-h-11 items-center gap-3 rounded-lg px-3 py-2 ${focus}`}>
                <Icon className="h-4 w-4 shrink-0 text-[var(--dash-brand-strong)]" aria-hidden="true" />
                <span className="min-w-0 break-words">{link.title}</span>
              </Link>
            ) : null

            return (
              <details key={`${link.title}:${activeHref}:${searching}`} open={searching || containsActive} className="group min-w-0">
                <summary className={`dashboard-sidebar-module flex min-h-11 cursor-pointer list-none items-center gap-3 rounded-lg px-3 py-2 [&::-webkit-details-marker]:hidden ${focus}`} data-child-active={containsActive ? "true" : "false"}>
                  <Icon className="h-4 w-4 shrink-0 text-[var(--dash-brand-strong)]" aria-hidden="true" />
                  <span className="min-w-0 flex-1 break-words">{link.title}</span>
                  <ChevronRight className="h-4 w-4 shrink-0 group-open:rotate-90" aria-hidden="true" />
                </summary>
                <div className="ml-5 border-l border-[var(--dash-border-subtle)] pl-2">
                  {destinations.map(item => (
                    <Link key={item.href} href={localizePath(item.href, locale)} onClick={onNavigate}
                      data-active={item.href === activeHref ? "true" : "false"}
                      aria-current={item.href === activeHref ? (pathname === item.href ? "page" : "location") : undefined}
                      className={`dashboard-sidebar-submenu-item flex min-h-11 items-center rounded-lg px-3 py-2 ${focus}`}>
                      <span className="min-w-0 break-words">{item.title}</span>
                    </Link>
                  ))}
                </div>
              </details>
            )
          })}
        </section>
      ))}
      {sections.length === 0 ? <p role="status" className="px-3 py-4 text-sm text-[var(--dash-text-soft)]">
        {locale === "fr" ? "Aucun module ne correspond à votre recherche." : "No modules match your search."}
      </p> : null}
    </nav>
  )
}
