"use client"

import { useEffect, useState, type MouseEvent } from "react"
import { ChevronDown } from "lucide-react"
import { useTranslations } from "next-intl"

import { Link } from "@/i18n/navigation"

export const LANDING_SECTION_NAV = [
  { key: "product", id: "product" },
  { key: "workflow", id: "workflow" },
  { key: "platform", id: "modules" },
  { key: "people", id: "people-to-pay" },
  { key: "controls", id: "daily-control" },
  { key: "automation", id: "automation" },
  { key: "trust", id: "trust" },
  { key: "useCases", id: "use-cases" },
  { key: "pricing", id: "pricing" },
] as const

type LandingSectionNavigationProps = {
  variant: "desktop" | "mobile"
}

type SectionId = (typeof LANDING_SECTION_NAV)[number]["id"]

const leadItems = LANDING_SECTION_NAV.slice(0, 3)
const moreItems = LANDING_SECTION_NAV.slice(3, 7)
const tailItems = LANDING_SECTION_NAV.slice(7)

export function LandingSectionNavigation({ variant }: LandingSectionNavigationProps) {
  const t = useTranslations("landing.header")
  const [activeSection, setActiveSection] = useState<SectionId | null>(null)

  useEffect(() => {
    let frame = 0

    const updateActiveSection = () => {
      cancelAnimationFrame(frame)
      frame = requestAnimationFrame(() => {
        let nextSection: SectionId | null = null

        for (const item of LANDING_SECTION_NAV) {
          const section = document.getElementById(item.id)
          if (section && section.getBoundingClientRect().top <= 96) {
            nextSection = item.id
          } else if (section) {
            break
          }
        }

        const pageHeight = document.documentElement.scrollHeight
        if (pageHeight > window.innerHeight + 4 && window.scrollY + window.innerHeight >= pageHeight - 4) {
          nextSection = "pricing"
        }

        setActiveSection(nextSection)
      })
    }

    const resizeObserver = new ResizeObserver(updateActiveSection)
    resizeObserver.observe(document.body)

    updateActiveSection()
    window.addEventListener("load", updateActiveSection)
    window.addEventListener("scroll", updateActiveSection, { passive: true })
    window.addEventListener("resize", updateActiveSection)
    window.addEventListener("hashchange", updateActiveSection)

    return () => {
      cancelAnimationFrame(frame)
      resizeObserver.disconnect()
      window.removeEventListener("load", updateActiveSection)
      window.removeEventListener("scroll", updateActiveSection)
      window.removeEventListener("resize", updateActiveSection)
      window.removeEventListener("hashchange", updateActiveSection)
    }
  }, [])

  function handleNavigate(event: MouseEvent<HTMLAnchorElement>, id: SectionId) {
    setActiveSection(id)
    event.currentTarget.closest("details")?.removeAttribute("open")
  }

  function renderLink(item: (typeof LANDING_SECTION_NAV)[number], mobile = false) {
    const active = activeSection === item.id

    return (
      <Link
        key={item.id}
        href={`/#${item.id}`}
        data-landing-nav-link={item.id}
        aria-current={active ? "location" : undefined}
        onClick={(event) => handleNavigate(event, item.id)}
        className={`body-text text-sm transition ${
          mobile
            ? "rounded-md px-3 py-2.5"
            : "rounded-md px-3 py-2"
        } ${
          active
            ? "bg-[var(--color-brand-action)] text-white"
            : "text-[var(--color-text-secondary)] hover:bg-white/[0.07] hover:text-[var(--color-text-primary)]"
        }`}
      >
        {t(item.key)}
      </Link>
    )
  }

  if (variant === "mobile") {
    return (
      <nav data-landing-nav="mobile" className="grid gap-1" aria-label={t("navAria")}>
        {LANDING_SECTION_NAV.map((item) => renderLink(item, true))}
      </nav>
    )
  }

  const moreActive = moreItems.some((item) => item.id === activeSection)

  return (
    <nav
      data-landing-nav="desktop"
      className="hidden items-center gap-1 rounded-lg border border-[var(--color-border-subtle)] bg-white/[0.035] p-1 xl:flex"
      aria-label={t("navAria")}
    >
      {leadItems.map((item) => renderLink(item))}
      <details data-landing-nav-more className="group relative">
        <summary
          className={`flex cursor-pointer list-none items-center gap-1 rounded-md px-3 py-2 body-text text-sm transition marker:hidden ${
            moreActive
              ? "bg-[var(--color-brand-action)] text-white"
              : "text-[var(--color-text-secondary)] hover:bg-white/[0.07] hover:text-[var(--color-text-primary)]"
          }`}
          aria-label={t("exploreAria")}
        >
          {t("explore")}
          <ChevronDown className="size-3.5 transition group-open:rotate-180" aria-hidden="true" />
        </summary>
        <div className="absolute left-0 top-full z-50 mt-2 grid w-72 gap-1 rounded-lg border border-[var(--color-border-subtle)] bg-[var(--color-surface-panel)] p-2 shadow-2xl shadow-black/30">
          {moreItems.map((item) => renderLink(item, true))}
        </div>
      </details>
      {tailItems.map((item) => renderLink(item))}
    </nav>
  )
}
