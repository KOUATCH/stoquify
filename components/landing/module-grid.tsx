import { Link } from "@/i18n/navigation"
import { useTranslations } from "next-intl"

const modules = [
  ["pos", "lg:col-span-3"],
  ["inventory", "lg:col-span-5"],
  ["purchasing", "lg:col-span-4"],
  ["suppliers", "lg:col-span-4"],
  ["customers", "lg:col-span-4"],
  ["finance", "lg:col-span-4"],
  ["accounting", "lg:col-span-4"],
  ["compliance", "lg:col-span-4"],
  ["reconciliation", "lg:col-span-4"],
  ["payroll", "lg:col-span-4"],
  ["transfers", "lg:col-span-4"],
  ["locations", "lg:col-span-4"],
  ["security", "lg:col-span-5"],
  ["analytics", "lg:col-span-7"],
]

export function ModuleGrid() {
  const t = useTranslations("landing.modules")

  return (
    <section id="modules" className="section-divider bg-[var(--ink-1)] px-6 py-20 lg:px-8">
      <div className="mx-auto max-w-7xl">
        <div className="eyebrow mb-4">{t("eyebrow")}</div>
        <div className="flex flex-col gap-5 lg:flex-row lg:items-end lg:justify-between">
          <h2 className="display max-w-3xl text-4xl text-[var(--text-hi)] sm:text-5xl">{t("titleStart")} <span className="display-italic text-[var(--editorial)]">{t("titleEmphasis")}</span></h2>
          <div className="flex gap-3">
            <Link href="/#workflow" className="rounded-lg border border-[var(--rule-2)] px-4 py-2 body-text text-sm text-[var(--text-hi)] transition hover:bg-white/5">{t("workflowCta")}</Link>
            <Link href="/register" className="rounded-lg bg-[var(--accent)] px-4 py-2 body-text text-sm font-semibold text-white transition hover:bg-[var(--accent-hi)]">{t("tryCta")}</Link>
          </div>
        </div>
        <div className="mt-10 grid gap-4 lg:grid-cols-12">
          {modules.map(([module, span], index) => (
            <div key={module} className={`${span} rounded-lg border border-[var(--rule-1)] bg-[var(--ink-2)] p-6 shadow-xl shadow-black/10 transition hover:-translate-y-1 hover:border-[var(--rule-3)]`}>
              <div className="data-text text-xs text-[var(--accent-hi)]">{String(index + 1).padStart(2, "0")}</div>
              <div className="mt-8 body-text text-2xl font-semibold text-[var(--text-hi)]">{t(`items.${module}.title`)}</div>
              <p className="mt-3 body-text text-sm leading-6 text-[var(--text-faint)]">{t(`items.${module}.copy`)}</p>
              <div className="mt-6 data-text text-xs text-[var(--signal-info)]">{t(`items.${module}.metric`)}</div>
            </div>
          ))}
        </div>
      </div>
    </section>
  )
}
