import { Activity, ArrowRight, BookOpenCheck, ChevronDown, CreditCard, PackageSearch, ShieldCheck, ShoppingCart, Store, Users } from "lucide-react"
import { useLocale } from "next-intl"
import { Link } from "@/i18n/navigation"
import { productCommunicationCopy } from "./public-product-copy"

const icons = [Store, PackageSearch, ShoppingCart, CreditCard, Users, BookOpenCheck, Activity, ShieldCheck]

export function CapabilityOverview() {
  const copy = productCommunicationCopy[useLocale() === "fr" ? "fr" : "en"]
  return (
    <section id="modules" data-capability-overview className="section-divider scroll-mt-24 px-6 py-16 lg:px-8">
      <div className="mx-auto max-w-7xl">
        <div className="grid gap-5 lg:grid-cols-[1.1fr_0.9fr] lg:items-end">
          <div>
            <p className="eyebrow">{copy.eyebrow}</p>
            <h2 className="display mt-4 max-w-3xl text-4xl text-[var(--text-hi)] sm:text-5xl">{copy.title}</h2>
          </div>
          <p className="body-text max-w-xl leading-7 text-[var(--text-lo)]">{copy.intro}</p>
        </div>
        <div className="mt-9 grid items-start gap-3 md:grid-cols-2 lg:gap-4">
          {copy.groups.map((group, index) => {
            const Icon = icons[index]
            return (
              <details key={group.key} className="capability-card group rounded-xl border border-[var(--rule-2)] bg-[var(--color-surface-panel)] open:border-[var(--accent-hi)]" data-capability={group.key}>
                <summary className="flex min-h-28 cursor-pointer list-none items-start gap-4 p-5 [&::-webkit-details-marker]:hidden">
                  <span className="grid size-10 shrink-0 place-items-center rounded-lg bg-[var(--color-brand-soft)] text-[var(--accent-hi)]"><Icon className="size-5" aria-hidden="true" /></span>
                  <span className="min-w-0 flex-1">
                    <span className="body-text block text-base font-semibold text-[var(--text-hi)]">{group.title}</span>
                    <span className="body-text mt-1 block text-sm leading-6 text-[var(--text-lo)]">{group.outcome}</span>
                  </span>
                  <ChevronDown className="mt-2 size-4 shrink-0 text-[var(--accent-hi)] group-open:rotate-180" aria-hidden="true" />
                </summary>
                <div className="border-t border-[var(--rule-1)] px-5 pb-5 pt-4">
                  <p className="body-text text-sm leading-7 text-[var(--text-lo)]">{group.detail}</p>
                  <p className="body-text mt-4 rounded-lg bg-[var(--color-brand-soft)] p-3 text-sm font-semibold leading-6 text-[var(--text-hi)]">{group.flow}</p>
                  <Link href={`/workflows#workflow-${group.workflow}`} className="body-text mt-3 inline-flex min-h-11 items-center gap-2 text-sm font-semibold text-[var(--accent-hi)] underline underline-offset-4">{copy.explore}<ArrowRight className="size-4" aria-hidden="true" /></Link>
                </div>
              </details>
            )
          })}
        </div>
        <p className="body-text mt-6 max-w-4xl text-sm leading-6 text-[var(--text-faint)]">{copy.availability}</p>
      </div>
    </section>
  )
}
