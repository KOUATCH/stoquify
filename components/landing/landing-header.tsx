import { Link } from "@/i18n/navigation"
import { ArrowRight, LayoutDashboard, Menu } from "lucide-react"
import { useLocale, useTranslations } from "next-intl"

type LandingHeaderProps = {
  session: unknown | null
}

const navItems = [
  { key: "product", href: "/#product" },
  { key: "modules", href: "/#modules" },
  { key: "trust", href: "/#trust" },
  { key: "pricing", href: "/#pricing" },
]

export function LandingHeader({ session }: LandingHeaderProps) {
  const t = useTranslations("landing.header")
  const locale = useLocale()
  const targetLocale = locale === "fr" ? "en" : "fr"

  return (
    <header className="sticky top-0 z-50 border-b border-[var(--color-border-subtle)] bg-[var(--color-chrome)]/92 text-[var(--color-text-primary)] backdrop-blur-xl">
      <div className="mx-auto flex h-16 max-w-7xl items-center justify-between px-6 lg:px-8">
        <Link href="/" className="group inline-flex items-center gap-3" aria-label={t("homeAria")}>
          <span className="grid size-9 place-items-center rounded-lg bg-[var(--color-brand)] text-sm font-bold text-white shadow-lg shadow-[var(--color-brand-glow)]">
            AQ
          </span>
          <span className="leading-none">
            <span className="body-text block text-base font-semibold tracking-normal">AqStoqFlow</span>
            <span className="data-text mt-1 block text-[0.62rem] uppercase text-[var(--color-text-muted)]">
              {t("subtitle")}
            </span>
          </span>
        </Link>

        <nav className="hidden items-center gap-1 rounded-lg border border-[var(--color-border-subtle)] bg-white/[0.035] p-1 md:flex" aria-label={t("navAria")}>
          {navItems.map((item) => (
            <Link
              key={item.key}
              href={item.href}
              className="rounded-md px-3 py-2 body-text text-sm text-[var(--color-text-secondary)] transition hover:bg-white/[0.07] hover:text-[var(--color-text-primary)]"
            >
              {t(item.key)}
            </Link>
          ))}
        </nav>

        <div className="hidden items-center gap-3 md:flex">
          <Link
            href="/"
            locale={targetLocale}
            aria-label={t("languageAria")}
            className="rounded-lg border border-[var(--color-border-subtle)] px-3 py-2 data-text text-xs font-semibold text-[var(--color-text-secondary)] transition hover:bg-white/[0.07] hover:text-[var(--color-text-primary)]"
          >
            {t("languageLabel")}
          </Link>
          {session ? (
            <Link
              href="/dashboard"
              className="inline-flex items-center gap-2 rounded-lg border border-[var(--color-border-muted)] px-4 py-2 body-text text-sm font-semibold text-[var(--color-text-primary)] transition hover:bg-white/[0.07]"
            >
              <LayoutDashboard className="size-4" aria-hidden="true" />
              {t("dashboard")}
            </Link>
          ) : (
            <>
              <Link href="/login" className="body-text text-sm font-semibold text-[var(--color-text-secondary)] transition hover:text-[var(--color-text-primary)]">
                {t("login")}
              </Link>
              <Link href="/register" className="inline-flex items-center gap-2 rounded-lg bg-[var(--color-brand)] px-4 py-2 body-text text-sm font-semibold text-white transition hover:bg-[var(--color-brand-hover)]">
                {t("startFree")}
                <ArrowRight className="size-4" aria-hidden="true" />
              </Link>
            </>
          )}
        </div>

        <details className="group relative md:hidden">
          <summary className="list-none rounded-lg border border-[var(--color-border-subtle)] p-2 text-[var(--color-text-primary)] marker:hidden">
            <Menu className="size-5" aria-hidden="true" />
            <span className="sr-only">{t("openNavigation")}</span>
          </summary>
          <div className="absolute right-0 mt-3 w-64 rounded-lg border border-[var(--color-border-subtle)] bg-[var(--color-surface-panel)] p-3 shadow-2xl shadow-black/30">
            <div className="grid gap-1">
              {navItems.map((item) => (
                <Link key={item.key} href={item.href} className="rounded-md px-3 py-2 body-text text-sm text-[var(--color-text-secondary)] hover:bg-white/[0.07] hover:text-[var(--color-text-primary)]">
                  {t(item.key)}
                </Link>
              ))}
              <div className="my-2 h-px bg-[var(--color-border-subtle)]" />
              <Link href="/" locale={targetLocale} className="rounded-md px-3 py-2 data-text text-xs font-semibold text-[var(--color-text-secondary)] hover:bg-white/[0.07] hover:text-[var(--color-text-primary)]">
                {t("languageLabel")}
              </Link>
              <Link href={session ? "/dashboard" : "/login"} className="rounded-md px-3 py-2 body-text text-sm text-[var(--color-text-secondary)] hover:bg-white/[0.07] hover:text-[var(--color-text-primary)]">
                {session ? t("dashboard") : t("login")}
              </Link>
              {!session ? (
                <Link href="/register" className="mt-2 rounded-lg bg-[var(--color-brand)] px-3 py-2 text-center body-text text-sm font-semibold text-white">
                  {t("startFree")}
                </Link>
              ) : null}
            </div>
          </div>
        </details>
      </div>
    </header>
  )
}
