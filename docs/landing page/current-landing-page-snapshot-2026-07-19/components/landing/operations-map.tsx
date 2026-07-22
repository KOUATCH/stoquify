import { Link } from "@/i18n/navigation"
import {
  BadgeCheck,
  BriefcaseBusiness,
  CircleDollarSign,
  ClipboardCheck,
  Landmark,
  PackageSearch,
  ShoppingCart,
  Store,
  UserRoundCheck,
} from "lucide-react"
import type { LucideIcon } from "lucide-react"
import { useTranslations } from "next-intl"

type OperatingModule = {
  key: string
  href: string
  Icon: LucideIcon
  tone: string
}

const modules: OperatingModule[] = [
  { key: "pos", href: "/dashboard/pos", Icon: Store, tone: "text-[var(--signal-up)] bg-[var(--signal-up)]/10" },
  { key: "inventory", href: "/dashboard/inventory", Icon: PackageSearch, tone: "text-[var(--signal-warn)] bg-[var(--signal-warn)]/10" },
  { key: "purchasing", href: "/dashboard/purchase-orders", Icon: ShoppingCart, tone: "text-[var(--accent-hi)] bg-[var(--accent-hi)]/10" },
  { key: "finance", href: "/dashboard/finance", Icon: CircleDollarSign, tone: "text-[var(--signal-info)] bg-[var(--signal-info)]/10" },
  { key: "reconciliation", href: "/dashboard/finance/reconciliation", Icon: BadgeCheck, tone: "text-[var(--accent-hi)] bg-[var(--accent-hi)]/10" },
  { key: "accounting", href: "/dashboard/accounting", Icon: Landmark, tone: "text-[var(--editorial)] bg-[var(--editorial)]/10" },
  { key: "compliance", href: "/dashboard/compliance", Icon: ClipboardCheck, tone: "text-[var(--signal-down)] bg-[var(--signal-down)]/10" },
  { key: "hris", href: "/dashboard/people", Icon: BriefcaseBusiness, tone: "text-[var(--signal-up)] bg-[var(--signal-up)]/10" },
  { key: "payroll", href: "/dashboard/payroll", Icon: UserRoundCheck, tone: "text-[var(--color-success)] bg-[var(--color-success)]/10" },
]

export function OperationsMap() {
  const t = useTranslations("landing.operations")

  return (
    <section id="modules" className="section-divider scroll-mt-20 bg-[var(--ink-1)] px-6 py-16 lg:px-8">
      <div className="mx-auto max-w-7xl">
        <div className="eyebrow mb-4">{t("eyebrow")}</div>
        <div className="grid gap-6 lg:grid-cols-[0.8fr_1.2fr] lg:items-end">
          <h2 className="display text-4xl text-[var(--text-hi)] sm:text-5xl">{t("title")}</h2>
          <p className="body-text text-lg leading-8 text-[var(--text-lo)]">{t("description")}</p>
        </div>
        <div className="mt-10 grid gap-4 md:grid-cols-3">
          {modules.map(({ key, href, Icon, tone }) => (
            <Link
              key={key}
              href={href}
              data-operations-module={key}
              className="glass-panel group flex min-h-[14.5rem] flex-col rounded-lg p-5 transition hover:-translate-y-1 hover:border-[var(--rule-3)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--accent-hi)]"
            >
              <div className="flex items-center justify-between gap-4">
                <span className={`grid size-10 place-items-center rounded-lg ${tone}`}>
                  <Icon className="size-5" aria-hidden="true" />
                </span>
                <span className="data-text text-xs uppercase tracking-[0.18em] text-[var(--accent-hi)]">{t("moduleLabel")}</span>
              </div>
              <h3 className="mt-5 body-text text-xl font-semibold text-[var(--text-hi)]">{t(`modules.${key}.name`)}</h3>
              <p className="mt-2 body-text text-sm leading-6 text-[var(--text-faint)]">{t(`modules.${key}.description`)}</p>
              <div className="mt-auto border-t border-[var(--rule-1)] pt-4 data-text text-xs text-[var(--signal-info)]">{t(`modules.${key}.meta`)}</div>
            </Link>
          ))}
        </div>
      </div>
    </section>
  )
}
