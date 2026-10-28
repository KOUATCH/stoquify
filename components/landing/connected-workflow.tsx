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

const workflowRouteKeys = ["pos", "inventory", "purchasing", "finance", "accounting"] as const

export function ConnectedWorkflow() {
  const t = useTranslations("landing.workflow")
  const [emblaRef, emblaApi] = useEmblaCarousel({ align: "start", loop: true, slidesToScroll: 1 })
  const [selectedIndex, setSelectedIndex] = useState(0)
  const [scrollSnaps, setScrollSnaps] = useState<number[]>([])
  const activeCard = workflowCards[selectedIndex] ?? workflowCards[0]
  const ActiveIcon = activeCard.Icon
  const routeCards = workflowRouteKeys
    .map((key) => workflowCards.find((card) => card.key === key))
    .filter((card): card is WorkflowCard => Boolean(card))

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
    <section
      id="workflow"
      className="section-divider relative isolate scroll-mt-20 overflow-hidden bg-[#f5f8f2] px-6 py-20 text-[#13231e] lg:px-8"
    >
      <div className="absolute inset-0 bg-[linear-gradient(180deg,#fbfdf8_0%,#eff5ef_52%,#f8faf5_100%)]" />
      <div className="surface-grid absolute inset-0 opacity-[0.72]" />
      <div className="relative mx-auto max-w-7xl">
        <div className="grid gap-6 lg:grid-cols-[0.82fr_1.18fr] lg:items-end">
          <div>
            <div className="eyebrow mb-4 text-[#2362c9]">{t("eyebrow")}</div>
            <h2 className="display max-w-4xl text-4xl text-[#13231e] sm:text-5xl lg:text-6xl">{t("title")}</h2>
          </div>
          <p className="max-w-3xl body-text text-base leading-8 text-[#51655d] sm:text-lg">{t("description")}</p>
        </div>

        <div className="mt-10 grid gap-5 lg:grid-cols-[0.95fr_1.05fr] lg:items-stretch">
          <article
            className="workflow-card workflow-card-light flex min-h-[23rem] flex-col rounded-lg border border-[#d7e2dc] bg-white p-5 shadow-[0_22px_70px_rgba(34,56,46,0.12)]"
            data-workflow-spotlight={activeCard.key}
          >
            <div className="flex items-start justify-between gap-4">
              <span className={`grid size-12 shrink-0 place-items-center rounded-lg ${activeCard.tone}`}>
                <ActiveIcon className="size-5" aria-hidden="true" />
              </span>
              <span className="rounded-full border border-[#dbe6df] bg-[#f7faf5] px-3 py-1 data-text text-[0.68rem] leading-4 text-[#2362c9]">
                {t(`cards.${activeCard.key}.meta`)}
              </span>
            </div>

            <div className="mt-7 flex items-center gap-3">
              <span className="data-text text-xs text-[#2362c9]">{String(selectedIndex + 1).padStart(2, "0")}</span>
              <span className="h-px flex-1 bg-[#d9e4dd]" aria-hidden="true" />
              <span className="data-text text-xs text-[#667970]">{t("position", { current: selectedIndex + 1, total: workflowCards.length })}</span>
            </div>

            <h3 className="mt-5 body-text text-2xl font-semibold leading-8 text-[#13231e]">{t(`cards.${activeCard.key}.title`)}</h3>
            <p className="mt-3 max-w-xl body-text text-base leading-7 text-[#51655d]">{t(`cards.${activeCard.key}.copy`)}</p>

            <div className="mt-auto rounded-lg border border-[#d7e2dc] bg-[#f7faf5] p-4">
              <div className="flex items-start gap-3 text-sm leading-6 text-[#51655d]">
                <ShieldCheck className="mt-0.5 size-4 shrink-0 text-[#16815f]" aria-hidden="true" />
                <span>
                  <span className="font-semibold text-[#13231e]">{t("proofLabel")}: </span>
                  {t(`cards.${activeCard.key}.proof`)}
                </span>
              </div>
            </div>
          </article>

          <div className="grid items-start gap-3 sm:grid-cols-2 lg:grid-cols-5">
            {routeCards.map(({ key, Icon, tone }, index) => (
              <article
                key={key}
                className="workflow-card workflow-card-light flex min-h-[10.75rem] flex-col rounded-lg border border-[#d7e2dc] bg-white/90 p-4 shadow-[0_14px_40px_rgba(34,56,46,0.08)]"
                data-workflow-route-card={key}
              >
                <div className="flex items-start justify-between gap-3">
                  <span className={`grid size-10 shrink-0 place-items-center rounded-lg ${tone}`}>
                    <Icon className="size-4" aria-hidden="true" />
                  </span>
                  <span className="data-text text-[0.68rem] leading-4 text-[#2362c9]">{String(index + 1).padStart(2, "0")}</span>
                </div>
                <div className="mt-5 flex items-center gap-2">
                  <span className="h-px flex-1 bg-[#d9e4dd]" aria-hidden="true" />
                  <span className="size-1.5 rounded-full bg-[#d9ad4f]" aria-hidden="true" />
                </div>
                <h3 className="mt-4 body-text text-sm font-semibold leading-5 text-[#13231e]">{t(`cards.${key}.title`)}</h3>
                <span className="mt-auto w-fit rounded-full border border-[#dbe6df] bg-[#f7faf5] px-2.5 py-1 data-text text-[0.64rem] leading-4 text-[#51655d]">
                  {t(`cards.${key}.meta`)}
                </span>
              </article>
            ))}
          </div>
        </div>

        <div
          className="mt-8"
          data-workflow-carousel
          aria-label={t("carouselLabel")}
          aria-roledescription="carousel"
          role="region"
        >
          <div className="overflow-hidden" ref={emblaRef}>
            <div className="-ml-3 flex touch-pan-y">
              {workflowCards.map(({ key, Icon, tone }, index) => (
                <div
                  key={key}
                  data-workflow-slide={key}
                  className="min-w-0 flex-[0_0_100%] pl-3 sm:flex-[0_0_50%] lg:flex-[0_0_25%]"
                  role="group"
                  aria-label={t("slideLabel", { current: index + 1, total: workflowCards.length })}
                  aria-roledescription="slide"
                >
                  <article
                    className={`workflow-card workflow-card-light flex h-full min-h-[18.5rem] flex-col rounded-lg border bg-white p-4 shadow-[0_14px_40px_rgba(34,56,46,0.08)] ${
                      index === selectedIndex ? "border-[#2362c9]" : "border-[#d7e2dc]"
                    }`}
                  >
                    <div className="flex items-start justify-between gap-3">
                      <span className={`grid size-9 shrink-0 place-items-center rounded-lg ${tone}`}>
                        <Icon className="size-4" aria-hidden="true" />
                      </span>
                      <span className="data-text text-[0.68rem] leading-4 text-[#2362c9]">{t(`cards.${key}.meta`)}</span>
                    </div>
                    <div className="mt-4 flex items-center gap-2.5">
                      <span className="data-text text-xs text-[#2362c9]">{String(index + 1).padStart(2, "0")}</span>
                      <span className="h-px flex-1 bg-[#d9e4dd]" aria-hidden="true" />
                    </div>
                    <h3 className="mt-3 body-text text-lg font-semibold leading-6 text-[#13231e]">{t(`cards.${key}.title`)}</h3>
                    <p className="mt-2 body-text text-sm leading-6 text-[#51655d]">{t(`cards.${key}.copy`)}</p>
                    <div className="mt-auto border-t border-[#d9e4dd] pt-4">
                      <div className="flex items-start gap-2 text-xs leading-5 text-[#51655d]">
                        <ShieldCheck className="mt-0.5 size-3.5 shrink-0 text-[#16815f]" aria-hidden="true" />
                        <span>
                          <span className="font-semibold text-[#13231e]">{t("proofLabel")}: </span>
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
                className="grid size-11 place-items-center rounded-lg border border-[#d7e2dc] bg-white text-[#13231e] shadow-[0_10px_30px_rgba(34,56,46,0.08)] transition hover:border-[#2362c9] hover:text-[#2362c9] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#2362c9]"
                onClick={() => emblaApi?.scrollPrev()}
                aria-label={t("previous")}
                title={t("previous")}
              >
                <ArrowLeft className="size-5" aria-hidden="true" />
              </button>
              <button
                type="button"
                data-workflow-next
                className="grid size-11 place-items-center rounded-lg border border-[#d7e2dc] bg-white text-[#13231e] shadow-[0_10px_30px_rgba(34,56,46,0.08)] transition hover:border-[#2362c9] hover:text-[#2362c9] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#2362c9]"
                onClick={() => emblaApi?.scrollNext()}
                aria-label={t("next")}
                title={t("next")}
              >
                <ArrowRight className="size-5" aria-hidden="true" />
              </button>
              <span className="ml-2 data-text text-xs text-[#51655d]" data-workflow-position aria-live="polite">
                {t("position", { current: selectedIndex + 1, total: workflowCards.length })}
              </span>
            </div>

            <div className="flex max-w-full flex-wrap items-center gap-2" aria-label={t("positionControls")}>
              {scrollSnaps.map((_, index) => (
                <button
                  key={index}
                  type="button"
                  className={`h-2.5 rounded-full transition-[width,background-color] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#2362c9] ${
                    index === selectedIndex ? "w-8 bg-[#2362c9]" : "w-2.5 bg-[#cbd8d1] hover:bg-[#8fa29a]"
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
