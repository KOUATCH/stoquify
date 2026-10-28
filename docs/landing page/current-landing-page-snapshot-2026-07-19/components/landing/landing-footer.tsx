import { Link } from "@/i18n/navigation"
import StoquifyLogo from "@/components/global/kit-logo"
import { useTranslations } from "next-intl"

const footerLinks = [
  { key: "product", href: "/#modules" },
  { key: "workflow", href: "/#workflow" },
  { key: "trust", href: "/#trust" },
  { key: "pricing", href: "/#pricing" },
]

export function LandingFooter() {
  const t = useTranslations("landing")
  const footer = useTranslations("landing.footer")

  return (
    <footer className="border-t border-[var(--color-border-subtle)] bg-[var(--color-canvas)] px-6 py-12 text-[var(--color-text-secondary)] lg:px-8">
      <div className="mx-auto grid max-w-7xl gap-10 md:grid-cols-[1.1fr_0.9fr] md:items-end">
        <div>
          <Link href="/" className="inline-flex items-center gap-3" aria-label={footer("homeAria")}>
            <StoquifyLogo theme="dark" width={212} height={48} tagline={footer("subtitle")} />
          </Link>
          <p className="mt-5 max-w-xl body-text text-sm leading-6">
            {footer("copy")}
          </p>
        </div>
        <div className="flex flex-col gap-5 md:items-end">
          <nav className="flex flex-wrap gap-3" aria-label={footer("navAria")}>
            {footerLinks.map((item) => (
              <Link key={item.key} href={item.href} className="rounded-md px-2 py-1 body-text text-sm transition hover:bg-white/[0.06] hover:text-[var(--color-text-primary)]">
                {t(`header.${item.key}`)}
              </Link>
            ))}
          </nav>
          <div className="data-text text-xs text-[var(--color-text-muted)]">
            © {new Date().getFullYear()} {footer("copyright")}
          </div>
        </div>
      </div>
    </footer>
  )
}
