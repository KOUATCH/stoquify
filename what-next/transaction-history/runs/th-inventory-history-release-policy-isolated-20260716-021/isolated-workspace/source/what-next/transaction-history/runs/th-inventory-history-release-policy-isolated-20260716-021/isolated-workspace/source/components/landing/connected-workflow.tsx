import { useTranslations } from "next-intl"
import {
  ArrowLeftRight,
  BadgeCheck,
  BarChart3,
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

type WorkflowCard = {
  key: string
  Icon: LucideIcon
  accent: string
  surface: string
}

const workflowCards: WorkflowCard[] = [
  { key: "pos", Icon: Store, accent: "bg-[var(--signal-up)]", surface: "bg-black/[0.15] text-[var(--signal-up)]" },
  { key: "inventory", Icon: PackageSearch, accent: "bg-[var(--color-spruce)]", surface: "bg-black/[0.15] text-[var(--color-spruce)]" },
  { key: "purchasing", Icon: ShoppingCart, accent: "bg-[var(--signal-warn)]", surface: "bg-black/[0.15] text-[var(--signal-warn)]" },
  { key: "suppliers", Icon: Truck, accent: "bg-[var(--color-warm)]", surface: "bg-black/[0.15] text-[var(--color-warm)]" },
  { key: "customers", Icon: Users, accent: "bg-[var(--signal-info)]", surface: "bg-black/[0.15] text-[var(--signal-info)]" },
  { key: "finance", Icon: CircleDollarSign, accent: "bg-[var(--color-brand)]", surface: "bg-black/[0.15] text-[var(--accent-hi)]" },
  { key: "accounting", Icon: Landmark, accent: "bg-[var(--editorial)]", surface: "bg-black/[0.15] text-[var(--editorial)]" },
  { key: "compliance", Icon: ClipboardCheck, accent: "bg-[var(--signal-down)]", surface: "bg-black/[0.15] text-[var(--signal-down)]" },
  { key: "reconciliation", Icon: BadgeCheck, accent: "bg-[var(--signal-info)]", surface: "bg-black/[0.15] text-[var(--signal-info)]" },
  { key: "payroll", Icon: UserRoundCheck, accent: "bg-[var(--color-warm)]", surface: "bg-black/[0.15] text-[var(--color-warm)]" },
  { key: "offline", Icon: WifiOff, accent: "bg-[var(--color-spruce)]", surface: "bg-black/[0.15] text-[var(--color-spruce)]" },
  { key: "transfers", Icon: ArrowLeftRight, accent: "bg-[var(--accent-hi)]", surface: "bg-black/[0.15] text-[var(--accent-hi)]" },
  { key: "locations", Icon: MapPin, accent: "bg-[var(--signal-warn)]", surface: "bg-black/[0.15] text-[var(--signal-warn)]" },
  { key: "controls", Icon: ShieldCheck, accent: "bg-[var(--signal-up)]", surface: "bg-black/[0.15] text-[var(--signal-up)]" },
  { key: "analytics", Icon: BarChart3, accent: "bg-[var(--color-brand)]", surface: "bg-black/[0.15] text-[var(--accent-hi)]" },
  { key: "administration", Icon: Settings2, accent: "bg-[var(--editorial)]", surface: "bg-black/[0.15] text-[var(--editorial)]" },
]

export function ConnectedWorkflow() {
  const t = useTranslations("landing.workflow")

  return (
    <section id="workflow" className="section-divider relative isolate overflow-hidden bg-[var(--ink-0)] px-6 py-20 lg:px-8">
      <div className="landing-grid-bg absolute inset-0" />
      <div className="relative mx-auto max-w-7xl">
        <div className="flex flex-col gap-6 lg:flex-row lg:items-end lg:justify-between">
          <div>
            <div className="eyebrow mb-4">{t("eyebrow")}</div>
            <h2 className="display max-w-4xl text-4xl text-[var(--text-hi)] sm:text-5xl lg:text-6xl">{t("title")}</h2>
          </div>
          <p className="max-w-2xl body-text text-base leading-8 text-[var(--text-lo)] sm:text-lg">{t("description")}</p>
        </div>
        <div className="relative mt-10">
          <div
            aria-label={t("carouselLabel")}
            className="scroll-fade flex snap-x snap-mandatory gap-4 overflow-x-auto pb-6 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden"
            role="list"
            tabIndex={0}
          >
            {workflowCards.map(({ key, Icon, accent, surface }, index) => (
              <div
                key={key}
                className="workflow-card glass-panel group relative flex min-h-[19rem] w-[18.5rem] flex-none snap-start flex-col justify-between overflow-hidden rounded-lg p-5 sm:w-[20.5rem]"
                role="listitem"
              >
                <div className={`absolute inset-x-5 top-0 h-1 rounded-b ${accent}`} aria-hidden="true" />
                <div>
                  <div className="flex items-start justify-between gap-4">
                    <div className={`grid size-11 place-items-center rounded-lg ${surface}`}>
                      <Icon className="size-5" aria-hidden="true" />
                    </div>
                    <div className="rounded-lg bg-white/[0.06] px-3 py-1 data-text text-[0.65rem] uppercase text-[var(--signal-info)]">
                      {t(`cards.${key}.meta`)}
                    </div>
                  </div>
                  <div className="mt-7 flex items-center gap-3">
                    <div className="data-text text-sm text-[var(--accent-hi)]">
                      {String(index + 1).padStart(2, "0")}
                    </div>
                    <div className="h-px flex-1 bg-[var(--rule-1)]" />
                  </div>
                  <div className="mt-5 body-text text-xl font-semibold text-[var(--text-hi)]">
                    {t(`cards.${key}.title`)}
                  </div>
                  <p className="mt-3 body-text text-sm leading-6 text-[var(--text-faint)]">
                    {t(`cards.${key}.copy`)}
                  </p>
                </div>
                <div className="mt-8 h-1.5 overflow-hidden rounded bg-white/10">
                  <div
                    className={`h-full rounded ${accent}`}
                    style={{ width: `${Math.max(42, 92 - index * 3)}%` }}
                  />
                </div>
              </div>
            ))}
          </div>
          <div className="grid grid-cols-8 gap-2" aria-hidden="true">
            {workflowCards.slice(0, 8).map(({ key, accent }) => (
              <span key={key} className={`h-1.5 rounded ${accent}`} />
            ))}
          </div>
        </div>
      </div>
    </section>
  )
}
