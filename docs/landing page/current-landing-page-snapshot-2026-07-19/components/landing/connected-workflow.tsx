"use client"

import useEmblaCarousel from "embla-carousel-react"
import {
  ArrowLeft,
  ArrowLeftRight,
  ArrowRight,
  BadgeCheck,
  BarChart3,
  BriefcaseBusiness,
  CircleDollarSign,
  ClipboardCheck,
  Landmark,
  MapPin,
  PackageSearch,
  Settings2,
  ShieldCheck,
  ShoppingCart,
  Store,
  Truck,
  UserRoundCheck,
  Users,
  WifiOff,
} from "lucide-react"
import type { LucideIcon } from "lucide-react"
import { useTranslations } from "next-intl"
import { useCallback, useEffect, useState } from "react"

type WorkflowCard = {
  key: string
  Icon: LucideIcon
  tone: string
}

const workflowCards: WorkflowCard[] = [
  { key: "pos", Icon: Store, tone: "text-[var(--signal-up)] bg-[var(--signal-up)]/10" },
  { key: "inventory", Icon: PackageSearch, tone: "text-[var(--color-spruce)] bg-[var(--color-spruce)]/10" },
  { key: "purchasing", Icon: ShoppingCart, tone: "text-[var(--signal-warn)] bg-[var(--signal-warn)]/10" },
  { key: "suppliers", Icon: Truck, tone: "text-[var(--color-warm)] bg-[var(--color-warm)]/10" },
  { key: "customers", Icon: Users, tone: "text-[var(--signal-info)] bg-[var(--signal-info)]/10" },
  { key: "finance", Icon: CircleDollarSign, tone: "text-[var(--accent-hi)] bg-[var(--accent-hi)]/10" },
  { key: "accounting", Icon: Landmark, tone: "text-[var(--editorial)] bg-[var(--editorial)]/10" },
  { key: "compliance", Icon: ClipboardCheck, tone: "text-[var(--signal-down)] bg-[var(--signal-down)]/10" },
  { key: "reconciliation", Icon: BadgeCheck, tone: "text-[var(--signal-info)] bg-[var(--signal-info)]/10" },
  { key: "hris", Icon: BriefcaseBusiness, tone: "text-[var(--signal-up)] bg-[var(--signal-up)]/10" },
  { key: "payroll", Icon: UserRoundCheck, tone: "text-[var(--color-warm)] bg-[var(--color-warm)]/10" },
  { key: "offline", Icon: WifiOff, tone: "text-[var(--color-spruce)] bg-[var(--color-spruce)]/10" },
  { key: "transfers", Icon: ArrowLeftRight, tone: "text-[var(--accent-hi)] bg-[var(--accent-hi)]/10" },
  { key: "locations", Icon: MapPin, tone: "text-[var(--signal-warn)] bg-[var(--signal-warn)]/10" },
  { key: "controls", Icon: ShieldCheck, tone: "text-[var(--signal-up)] bg-[var(--signal-up)]/10" },
  { key: "analytics", Icon: BarChart3, tone: "text-[var(--accent-hi)] bg-[var(--accent-hi)]/10" },
  { key: "administration", Icon: Settings2, tone: "text-[var(--editorial)] bg-[var(--editorial)]/10" },
]

export function ConnectedWorkflow() {
  const t = useTranslations("landing.workflow")
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
    <section id="workflow" className="section-divider relative isolate scroll-mt-20 overflow-hidden bg-[var(--ink-0)] px-6 py-20 lg:px-8">
      <div className="landing-grid-bg absolute inset-0" />
      <div className="relative mx-auto max-w-7xl">
        <div className="flex flex-col gap-6 lg:flex-row lg:items-end lg:justify-between">
          <div>
            <div className="eyebrow mb-4">{t("eyebrow")}</div>
            <h2 className="display max-w-4xl text-4xl text-[var(--text-hi)] sm:text-5xl lg:text-6xl">{t("title")}</h2>
          </div>
          <p className="max-w-2xl body-text text-base leading-8 text-[var(--text-lo)] sm:text-lg">{t("description")}</p>
        </div>

        <div
          className="mt-10"
          data-workflow-carousel
          aria-label={t("carouselLabel")}
          aria-roledescription="carousel"
          role="region"
        >
          <div className="overflow-hidden" ref={emblaRef}>
            <div className="-ml-4 flex touch-pan-y">
              {workflowCards.map(({ key, Icon, tone }, index) => (
                <div
                  key={key}
                  data-workflow-slide={key}
                  className="min-w-0 flex-[0_0_100%] pl-4 sm:flex-[0_0_50%] xl:flex-[0_0_33.333%]"
                  role="group"
                  aria-label={t("slideLabel", { current: index + 1, total: workflowCards.length })}
                  aria-roledescription="slide"
                >
                  <article className="glass-panel flex h-full min-h-[25rem] flex-col rounded-lg p-6 shadow-[0_18px_44px_rgba(0,0,0,0.16)]">
                    <div className="flex items-start justify-between gap-4">
                      <span className={`grid size-11 shrink-0 place-items-center rounded-lg ${tone}`}>
                        <Icon className="size-5" aria-hidden="true" />
                      </span>
                      <span className="data-text text-xs text-[var(--signal-info)]">{t(`cards.${key}.meta`)}</span>
                    </div>
                    <div className="mt-7 flex items-center gap-3">
                      <span className="data-text text-sm text-[var(--accent-hi)]">{String(index + 1).padStart(2, "0")}</span>
                      <span className="h-px flex-1 bg-[var(--rule-1)]" aria-hidden="true" />
                    </div>
                    <h3 className="mt-5 body-text text-2xl font-semibold text-[var(--text-hi)]">{t(`cards.${key}.title`)}</h3>
                    <p className="mt-4 body-text leading-7 text-[var(--text-faint)]">{t(`cards.${key}.copy`)}</p>
                    <div className="mt-auto border-t border-[var(--rule-1)] pt-5">
                      <div className="flex items-start gap-2.5 text-sm leading-6 text-[var(--text-lo)]">
                        <ShieldCheck className="mt-0.5 size-4 shrink-0 text-[var(--signal-up)]" aria-hidden="true" />
                        <span>
                          <span className="font-semibold text-[var(--text-hi)]">{t("proofLabel")}: </span>
                          {t(`cards.${key}.proof`)}
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
                data-workflow-prev
                className="grid size-11 place-items-center rounded-lg border border-[var(--rule-1)] bg-[var(--ink-2)] text-[var(--text-hi)] transition hover:border-[var(--accent-hi)] hover:text-[var(--accent-hi)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--accent-hi)]"
                onClick={() => emblaApi?.scrollPrev()}
                aria-label={t("previous")}
                title={t("previous")}
              >
                <ArrowLeft className="size-5" aria-hidden="true" />
              </button>
              <button
                type="button"
                data-workflow-next
                className="grid size-11 place-items-center rounded-lg border border-[var(--rule-1)] bg-[var(--ink-2)] text-[var(--text-hi)] transition hover:border-[var(--accent-hi)] hover:text-[var(--accent-hi)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--accent-hi)]"
                onClick={() => emblaApi?.scrollNext()}
                aria-label={t("next")}
                title={t("next")}
              >
                <ArrowRight className="size-5" aria-hidden="true" />
              </button>
              <span className="ml-2 data-text text-xs text-[var(--text-lo)]" data-workflow-position aria-live="polite">
                {t("position", { current: selectedIndex + 1, total: workflowCards.length })}
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
      </div>
    </section>
  )
}
