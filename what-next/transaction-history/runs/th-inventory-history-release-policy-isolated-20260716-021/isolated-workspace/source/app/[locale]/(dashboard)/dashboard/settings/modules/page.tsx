import { Badge } from "@/components/ui/badge"
import { pickLocale } from "@/i18n/routing"
import { requirePermission } from "@/lib/security/rbac"
import { getModuleControlCenterData } from "@/services/modules/module-entitlement.service"
import type { Locale } from "@/types/bilingual"
import { AlertTriangle, Boxes, LockKeyhole, Network, ShieldCheck } from "lucide-react"

export const metadata = {
  title: "Module Control Center | Kontava",
  description: "Observe-mode module entitlement visibility for Kontava owners and administrators.",
}

type PageProps = {
  params: Promise<{ locale: string }>
}

const copy = {
  en: {
    title: "Module Control Center",
    subtitle:
      "Observe-mode module entitlement visibility. Nothing is hard-blocked yet; this page shows what would be hidden or blocked after commercial enforcement is approved.",
    mode: "Observe mode",
    noHardEnforcement: "Hard enforcement off",
    requested: "Registration intent",
    unknown: "Unknown requested modules",
    catalog: "Catalog",
    entitled: "Entitled",
    wouldBlock: "Would block",
    dependencies: "Dependency gaps",
    source: "Source",
    status: "Status",
    owner: "Owner",
    risk: "Risk",
    dependenciesTitle: "Dependencies",
    noDependencies: "No required dependency gaps",
    reason: "Decision",
    emptyRequested: "No requested modules were captured, so existing tenants receive legacy full-suite observe access.",
  },
  fr: {
    title: "Centre de controle modules",
    subtitle:
      "Visibilite des droits modules en mode observation. Rien n'est bloque pour l'instant; cette page montre ce qui serait masque ou bloque apres validation commerciale.",
    mode: "Mode observation",
    noHardEnforcement: "Blocage dur desactive",
    requested: "Intention d'inscription",
    unknown: "Modules demandes inconnus",
    catalog: "Catalogue",
    entitled: "Autorises",
    wouldBlock: "Serait bloque",
    dependencies: "Ecarts dependances",
    source: "Source",
    status: "Statut",
    owner: "Responsable",
    risk: "Risque",
    dependenciesTitle: "Dependances",
    noDependencies: "Aucun ecart de dependance requis",
    reason: "Decision",
    emptyRequested: "Aucun module demande n'a ete capture, donc les tenants existants recoivent un acces observe legacy full-suite.",
  },
} as const

function t(locale: Locale) {
  return copy[locale]
}

function statusClass(status: string | null | undefined) {
  if (status === "active" || status === "legacy_default" || status === "system_default") {
    return "border-[#2dd4bf]/35 bg-[rgba(45,212,191,0.12)] text-[#b5f5ee]"
  }
  if (status === "trial" || status === "read_only") {
    return "border-[#49c6e5]/35 bg-[rgba(73,198,229,0.12)] text-[#bdefff]"
  }
  if (status === "suspended" || status === "expired") {
    return "border-[#ef6a6a]/35 bg-[rgba(239,106,106,0.12)] text-[#ffc6c6]"
  }
  return "border-[#f59e0b]/35 bg-[rgba(245,158,11,0.12)] text-[#ffd89a]"
}

function riskClass(risk: string) {
  if (risk === "critical") return "border-[#ef6a6a]/35 bg-[rgba(239,106,106,0.12)] text-[#ffc6c6]"
  if (risk === "high") return "border-[#f59e0b]/35 bg-[rgba(245,158,11,0.12)] text-[#ffd89a]"
  if (risk === "medium") return "border-[#49c6e5]/35 bg-[rgba(73,198,229,0.12)] text-[#bdefff]"
  return "border-[#2dd4bf]/35 bg-[rgba(45,212,191,0.12)] text-[#b5f5ee]"
}

export default async function ModuleSettingsPage({ params }: PageProps) {
  const { locale: rawLocale } = await params
  const locale = pickLocale(rawLocale)
  const labels = t(locale)
  const ctx = await requirePermission("MANAGE_SYSTEM_SETTINGS", {
    resource: "ModuleControlCenter",
    auditAllowed: true,
  })
  const data = await getModuleControlCenterData({
    organizationId: ctx.orgId,
    actorId: ctx.userId,
    actorPermissions: ctx.permissions,
  })

  return (
    <div className="dashboard-landing-theme min-h-screen overflow-x-hidden">
      <div className="dashboard-landing-content mx-auto flex w-full max-w-[88rem] min-w-0 flex-col gap-6 px-4 py-6 text-[var(--dash-text)] sm:px-6 sm:py-8">
        <section className="grid gap-4 lg:grid-cols-[minmax(0,1.45fr)_minmax(20rem,0.75fr)]">
          <div className="rounded-lg border border-[var(--dash-border-subtle)] bg-[var(--dash-surface)] p-5 shadow-[0_18px_45px_rgba(5,12,16,0.18)]">
            <div className="flex flex-wrap items-start justify-between gap-4">
              <div className="min-w-0">
                <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-[0.18em] text-[var(--dash-text-soft)]">
                  <Boxes className="h-4 w-4 text-[var(--dash-brand-strong)]" />
                  Kontava
                </div>
                <h1 className="mt-3 text-2xl font-semibold text-[var(--dash-text)] sm:text-3xl">{labels.title}</h1>
                <p className="mt-2 max-w-3xl text-sm leading-6 text-[var(--dash-text-soft)]">{labels.subtitle}</p>
              </div>
              <div className="flex flex-wrap gap-2">
                <Badge variant="outline" className="border-[#49c6e5]/35 bg-[rgba(73,198,229,0.12)] text-[#bdefff]">
                  <Network className="mr-1 h-3.5 w-3.5" />
                  {labels.mode}
                </Badge>
                <Badge variant="outline" className="border-[#2dd4bf]/35 bg-[rgba(45,212,191,0.12)] text-[#b5f5ee]">
                  <ShieldCheck className="mr-1 h-3.5 w-3.5" />
                  {labels.noHardEnforcement}
                </Badge>
              </div>
            </div>
          </div>

          <div className="rounded-lg border border-[var(--dash-border-subtle)] bg-[var(--dash-surface)] p-5">
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-[rgba(47,125,246,0.16)] text-[#8fb7ff]">
                <LockKeyhole className="h-5 w-5" />
              </div>
              <div className="min-w-0">
                <p className="truncate text-sm font-semibold text-[var(--dash-text)]">{data.organizationName ?? data.organizationId}</p>
                <p className="text-xs text-[var(--dash-text-soft)]">{data.generatedAt}</p>
              </div>
            </div>
            <div className="mt-4 grid grid-cols-2 gap-3 text-sm">
              <Metric label={labels.catalog} value={String(data.summary.catalogCount)} />
              <Metric label={labels.entitled} value={String(data.summary.entitledCount)} />
              <Metric label={labels.wouldBlock} value={String(data.summary.wouldBlockCount)} />
              <Metric label={labels.dependencies} value={String(data.summary.dependencyGapCount)} />
            </div>
          </div>
        </section>

        <section className="grid gap-4 lg:grid-cols-[minmax(0,0.7fr)_minmax(0,1.3fr)]">
          <div className="rounded-lg border border-[var(--dash-border-subtle)] bg-[var(--dash-surface)] p-5">
            <h2 className="text-sm font-semibold uppercase tracking-[0.16em] text-[var(--dash-text-soft)]">{labels.requested}</h2>
            {data.requestedModules.length > 0 ? (
              <div className="mt-4 flex flex-wrap gap-2">
                {data.requestedModules.map((module) => (
                  <Badge key={module} variant="outline" className="border-white/10 bg-white/[0.055] text-[var(--dash-text-soft)]">
                    {module}
                  </Badge>
                ))}
              </div>
            ) : (
              <p className="mt-4 text-sm leading-6 text-[var(--dash-text-soft)]">{labels.emptyRequested}</p>
            )}
            {data.unknownRequestedModules.length > 0 ? (
              <div className="mt-5 rounded-lg border border-[#f59e0b]/30 bg-[rgba(245,158,11,0.1)] p-4 text-sm text-[#ffd89a]">
                <div className="mb-2 flex items-center gap-2 font-semibold">
                  <AlertTriangle className="h-4 w-4" />
                  {labels.unknown}
                </div>
                <p>{data.unknownRequestedModules.join(", ")}</p>
              </div>
            ) : null}
          </div>

          <div className="grid gap-3">
            {data.items.map((item) => (
              <article key={item.module.slug} className="rounded-lg border border-[var(--dash-border-subtle)] bg-[var(--dash-surface)] p-4">
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div className="min-w-0">
                    <h2 className="text-base font-semibold text-[var(--dash-text)]">{item.module.name}</h2>
                    <p className="mt-1 max-w-3xl text-sm leading-6 text-[var(--dash-text-soft)]">{item.module.description}</p>
                  </div>
                  <div className="flex flex-wrap gap-2">
                    <Badge variant="outline" className={statusClass(item.entitlement?.status)}>
                      {item.entitlement?.status ?? "unavailable"}
                    </Badge>
                    <Badge variant="outline" className={riskClass(item.module.riskLevel)}>
                      {labels.risk}: {item.module.riskLevel}
                    </Badge>
                    {item.decision.wouldBlock ? (
                      <Badge variant="outline" className="border-[#f59e0b]/35 bg-[rgba(245,158,11,0.12)] text-[#ffd89a]">
                        {labels.wouldBlock}
                      </Badge>
                    ) : null}
                  </div>
                </div>
                <div className="mt-4 grid gap-3 text-sm sm:grid-cols-3">
                  <Metric label={labels.owner} value={item.module.owner} />
                  <Metric label={labels.source} value={item.entitlement?.source ?? "none"} />
                  <Metric label={labels.status} value={item.decision.result} />
                </div>
                <div className="mt-4 rounded-lg border border-white/10 bg-white/[0.035] p-3">
                  <p className="text-xs font-bold uppercase tracking-[0.14em] text-[var(--dash-text-faint)]">{labels.reason}</p>
                  <p className="mt-2 text-sm leading-6 text-[var(--dash-text-soft)]">{item.decision.reason}</p>
                  <p className="mt-2 text-xs text-[var(--dash-text-faint)]">
                    {labels.dependenciesTitle}:{" "}
                    {item.decision.missingDependencies.length > 0
                      ? item.decision.missingDependencies.map((dependency) => dependency.dependsOnSlug).join(", ")
                      : labels.noDependencies}
                  </p>
                </div>
              </article>
            ))}
          </div>
        </section>
      </div>
    </div>
  )
}

function Metric({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-lg border border-white/10 bg-white/[0.04] p-3">
      <p className="text-[0.68rem] font-bold uppercase tracking-[0.14em] text-[var(--dash-text-faint)]">{label}</p>
      <p className="mt-2 truncate text-sm font-semibold text-[var(--dash-text)]">{value}</p>
    </div>
  )
}

