"use client"

import { Link } from "@/i18n/navigation"
import useEmblaCarousel from "embla-carousel-react"
import {
  ArrowLeft,
  ArrowRight,
  BadgeCheck,
  Building2,
  Calculator,
  FileCheck2,
  Gauge,
  Landmark,
  PackageSearch,
  ReceiptText,
  Scale,
  ShieldCheck,
  Store,
  Truck,
  UserRoundCheck,
  WalletCards,
  WifiOff,
} from "lucide-react"
import type { LucideIcon } from "lucide-react"
import { useTranslations } from "next-intl"
import { useCallback, useEffect, useState } from "react"

type UseCase = {
  key: string
  Icon: LucideIcon
  tone: string
}

const useCases: UseCase[] = [
  { key: "branchControl", Icon: Building2, tone: "text-[var(--signal-info)] bg-[var(--signal-info)]/10" },
  { key: "posControl", Icon: Store, tone: "text-[var(--signal-up)] bg-[var(--signal-up)]/10" },
  { key: "offlineContinuity", Icon: WifiOff, tone: "text-[var(--color-spruce)] bg-[var(--color-spruce)]/10" },
  { key: "inventoryTruth", Icon: PackageSearch, tone: "text-[var(--accent-hi)] bg-[var(--accent-hi)]/10" },
  { key: "purchasingPayables", Icon: Truck, tone: "text-[var(--signal-warn)] bg-[var(--signal-warn)]/10" },
  { key: "receivables", Icon: ReceiptText, tone: "text-[var(--color-warm)] bg-[var(--color-warm)]/10" },
  { key: "paymentReconciliation", Icon: WalletCards, tone: "text-[var(--signal-info)] bg-[var(--signal-info)]/10" },
  { key: "accountingClose", Icon: Landmark, tone: "text-[var(--editorial)] bg-[var(--editorial)]/10" },
  { key: "complianceCountry", Icon: Scale, tone: "text-[var(--signal-down)] bg-[var(--signal-down)]/10" },
  { key: "payrollEvidence", Icon: UserRoundCheck, tone: "text-[var(--color-warm)] bg-[var(--color-warm)]/10" },
  { key: "ownerCommand", Icon: Gauge, tone: "text-[var(--accent-hi)] bg-[var(--accent-hi)]/10" },
  { key: "accountantCollaboration", Icon: Calculator, tone: "text-[var(--signal-up)] bg-[var(--signal-up)]/10" },
  { key: "accessApprovals", Icon: ShieldCheck, tone: "text-[var(--signal-warn)] bg-[var(--signal-warn)]/10" },
  { key: "groupOversight", Icon: FileCheck2, tone: "text-[var(--editorial)] bg-[var(--editorial)]/10" },
]

export function UseCases() {
  const t = useTranslations("landing.useCases")
  const [emblaRef, emblaApi] = useEmblaCarousel({ align: "start", loop: true, slidesToScroll: 1 })
  const [selectedIndex, setSelectedIndex] = useState(0)
  const [scrollSnaps, setScrollSnaps] = useState<number[]>([])

  const syncCarousel = useCallback(() => {
    if (!emblaApi) return
    setSelectedIndex(emblaApi.selectedScrollSnap())
    setScrollSnaps(emblaApi.scrollSnapList())
  }, [emblaApi])

  useEffect(() => {
    if (!emblaApi) return
    syncCarousel()
    emblaApi.on("select", syncCarousel)
    emblaApi.on("reInit", syncCarousel)

    return () => {
      emblaApi.off("select", syncCarousel)
      emblaApi.off("reInit", syncCarousel)
    }
  }, [emblaApi, syncCarousel])

  return (
    <section id="use-cases" className="section-divider scroll-mt-20 bg-[var(--ink-1)] px-6 py-20 lg:px-8">
      <div className="mx-auto max-w-7xl">
        <div className="flex flex-col gap-6 lg:flex-row lg:items-end lg:justify-between">
          <div>
            <div className="eyebrow mb-4">{t("eyebrow")}</div>
            <h2 className="display max-w-4xl text-4xl text-[var(--text-hi)] sm:text-5xl">{t("title")}</h2>
          </div>
          <p className="max-w-2xl body-text text-base leading-8 text-[var(--text-lo)] sm:text-lg">{t("description")}</p>
        </div>

        <div className="mt-10" data-use-cases-carousel aria-label={t("carouselLabel")} aria-roledescription="carousel" role="region">
          <div className="overflow-hidden" ref={emblaRef}>
            <div className="-ml-4 flex touch-pan-y">
              {useCases.map(({ key, Icon, tone }, index) => (
                <div
                  key={key}
                  data-use-case-slide={key}
                  className="min-w-0 flex-[0_0_100%] pl-4 sm:flex-[0_0_50%] xl:flex-[0_0_33.333%]"
                  role="group"
                  aria-label={t("slideLabel", { current: index + 1, total: useCases.length })}
                  aria-roledescription="slide"
                >
                  <article className="flex h-full min-h-[25rem] flex-col rounded-lg border border-[var(--rule-1)] bg-[var(--ink-2)] p-6 shadow-[0_18px_44px_rgba(0,0,0,0.16)]">
                    <div className="flex items-start justify-between gap-4">
                      <span className={`grid size-11 shrink-0 place-items-center rounded-lg ${tone}`}>
                        <Icon className="size-5" aria-hidden="true" />
                      </span>
                      <span className="data-text text-xs text-[var(--accent-hi)]">{t(`items.${key}.label`)}</span>
                    </div>
                    <h3 className="mt-7 body-text text-2xl font-semibold text-[var(--text-hi)]">{t(`items.${key}.title`)}</h3>
                    <p className="mt-4 body-text leading-7 text-[var(--text-faint)]">{t(`items.${key}.copy`)}</p>
                    <div className="mt-auto border-t border-[var(--rule-1)] pt-5">
                      <div className="flex items-start gap-2.5 text-sm leading-6 text-[var(--text-lo)]">
                        <BadgeCheck className="mt-0.5 size-4 shrink-0 text-[var(--signal-up)]" aria-hidden="true" />
                        <span>
                          <span className="font-semibold text-[var(--text-hi)]">{t("proofLabel")}: </span>
                          {t(`items.${key}.proof`)}
                        </span>
                      </div>
                    </div>
                  </article>
                </div>
              ))}
            </div>
          </div>

          <div className="mt-6 flex flex-col gap-5 sm:flex-row sm:items-center sm:justify-between">
            <div className="flex items-center gap-2">
              <button
                type="button"
                className="grid size-11 place-items-center rounded-lg border border-[var(--rule-1)] bg-[var(--ink-2)] text-[var(--text-hi)] transition hover:border-[var(--accent-hi)] hover:text-[var(--accent-hi)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--accent-hi)]"
                onClick={() => emblaApi?.scrollPrev()}
                aria-label={t("previous")}
                title={t("previous")}
              >
                <ArrowLeft className="size-5" aria-hidden="true" />
              </button>
              <button
                type="button"
                data-carousel-next
                className="grid size-11 place-items-center rounded-lg border border-[var(--rule-1)] bg-[var(--ink-2)] text-[var(--text-hi)] transition hover:border-[var(--accent-hi)] hover:text-[var(--accent-hi)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--accent-hi)]"
                onClick={() => emblaApi?.scrollNext()}
                aria-label={t("next")}
                title={t("next")}
              >
                <ArrowRight className="size-5" aria-hidden="true" />
              </button>
              <span className="ml-2 data-text text-xs text-[var(--text-lo)]" aria-live="polite">
                {t("position", { current: selectedIndex + 1, total: useCases.length })}
              </span>
            </div>

            <div className="flex max-w-full flex-wrap items-center gap-2" aria-label={t("positionControls")}>
              {scrollSnaps.map((_, index) => (
                <button
                  key={index}
                  type="button"
                  className={`h-2.5 rounded-full transition-[width,background-color] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--accent-hi)] ${
                    index === selectedIndex ? "w-8 bg-[var(--accent-hi)]" : "w-2.5 bg-[var(--rule-1)] hover:bg-[var(--text-faint)]"
                  }`}
                  onClick={() => emblaApi?.scrollTo(index)}
                  aria-current={index === selectedIndex ? "true" : undefined}
                  aria-label={t("goTo", { slide: index + 1 })}
                />
              ))}
            </div>
          </div>
        </div>

        <div className="mt-10 flex flex-col gap-4 border-t border-[var(--rule-1)] pt-7 sm:flex-row sm:items-center sm:justify-between">
          <p className="max-w-2xl body-text text-sm leading-6 text-[var(--text-lo)]">{t("ctaCopy")}</p>
          <Link href="/register" className="inline-flex w-fit items-center gap-2 rounded-lg bg-[var(--color-brand-action)] px-5 py-3 body-text text-sm font-semibold text-white transition hover:bg-[var(--color-brand-hover)]">
            {t("cta")}
            <ArrowRight className="size-4" aria-hidden="true" />
          </Link>
        </div>
      </div>
    </section>
  )
}
