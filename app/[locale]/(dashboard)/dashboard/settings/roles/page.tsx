import Link from "next/link"

import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import getOrgRoles from "@/actions/roles/getOrgRoles"
import { getAuthenticatedUser } from "@/config/useAuth"
import { requirePermission } from "@/lib/security/rbac"
import { hasRbacPermission } from "@/lib/security/rbac-permissions"
import { DashboardRouteState } from "@/components/dashboard/DashboardRouteState"
import { localizePath, pickLocale } from "@/i18n/routing"
import { LayoutGrid, Plus, ShieldCheck, UsersRound } from "lucide-react"
import { RoleTable } from "./columns"
import { routeByKey, withSettingsSurfaceAccess } from "../settings-route-access"

type RolePageProps = {
  params: Promise<{ locale: string }>
}

const copy = {
  en: {
    loadFailed: "Role catalogue could not load", loadMessage: "The role query failed. No role count or empty result can be confirmed. Refresh to try again.", retry: "Refresh roles",
    title: "Role Management",
    subtitle:
      "Define role names, permissions context, and role-level access boundaries from one central governance surface.",
    metrics: "Role summary",
    totalRoles: "Total roles",
    rolesWithDescription: "Roles with descriptions",
    rolesWithoutDescription: "Roles without descriptions",
    module: "Module",
    tableTitle: "Role catalog",
    tableDescription: "Review role records and open each row for updates and governance actions.",
    addRole: "Add Role",
    organization: "Organization workspace",
    noOrganization: "No organization context found for current user.",
    settings: "Settings",
  },
  fr: {
    loadFailed: "Le catalogue des rôles n’a pas pu être chargé", loadMessage: "La recherche des rôles a échoué. Aucun total ni résultat vide ne peut être confirmé. Actualisez pour réessayer.", retry: "Actualiser les rôles",
    title: "Gestion des rôles",
    subtitle:
      "Définissez les noms, les responsabilités et les autorisations des rôles de votre organisation.",
    metrics: "Résumé des rôles",
    totalRoles: "Rôles au total",
    rolesWithDescription: "Rôles avec description",
    rolesWithoutDescription: "Rôles sans description",
    module: "Module",
    tableTitle: "Catalogue des rôles",
    tableDescription: "Consultez les rôles et ouvrez les actions autorisées sur chaque ligne.",
    addRole: "Ajouter un rôle",
    organization: "Espace organisation",
    noOrganization: "Aucun contexte d'organisation n'est disponible pour cet utilisateur.",
    settings: "Paramètres",
  },
} as const

function MetricCard({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-lg border border-white/10 bg-white/[0.04] p-3">
      <p className="text-[0.68rem] font-bold uppercase tracking-[0.14em] text-[var(--dash-text-faint)]">{label}</p>
      <p className="mt-2 text-lg font-semibold text-[var(--dash-text)]">{value}</p>
    </div>
  )
}

async function RolesPageImpl({ params }: RolePageProps) {
  const { locale: rawLocale } = await params
  const locale = pickLocale(rawLocale)
  const labels = copy[locale]

  const ctx = await requirePermission("roles.read")
  const user = await getAuthenticatedUser()
  const organizationId = user?.organizationId ?? ""
  const organizationName = user?.organizationName ?? ""

  if (!organizationId) {
    return (
      <div className="dashboard-landing-theme dark min-h-screen overflow-x-hidden">
        <div className="dashboard-landing-content mx-auto flex w-full max-w-[88rem] min-w-0 px-4 py-8 sm:px-6">
          <div className="dashboard-glass-panel mx-auto mt-4 max-w-xl rounded-lg px-6 py-10 text-center">
            <div className="mb-4 inline-flex items-center rounded-lg border border-[#ef6a6a]/30 bg-[rgba(239,106,106,0.12)] px-4 py-2 text-sm font-semibold text-[#ffc6c6]">
              {labels.noOrganization}
            </div>
          </div>
        </div>
      </div>
    )
  }

  const res = await getOrgRoles(organizationId)
  if (!res.success) return <DashboardRouteState kind="error" eyebrow={labels.tableTitle} title={labels.loadFailed} message={labels.loadMessage} primaryHref={localizePath("/dashboard/settings/roles", locale)} primaryLabel={labels.retry} />
  const roles = res.data
  const rolesWithDescription = roles.filter((role) => (role.description ?? "").trim().length > 0).length

  return (
    <div className="dashboard-landing-theme min-h-screen overflow-x-hidden">
      <div className="dashboard-landing-content mx-auto flex w-full max-w-[88rem] min-w-0 flex-col gap-6 px-4 py-6 text-[var(--dash-text)] sm:px-6 sm:py-8">
        <section className="grid gap-4 lg:grid-cols-[minmax(0,1.55fr)_minmax(18rem,0.9fr)]">
          <div className="rounded-lg border border-[var(--dash-border-subtle)] bg-[var(--dash-surface)] p-5 shadow-[0_18px_45px_rgba(5,12,16,0.18)]">
            <div className="flex flex-wrap items-start justify-between gap-4">
              <div className="min-w-0">
                <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-[0.18em] text-[var(--dash-text-soft)]">
                  <UsersRound className="h-4 w-4 text-[var(--dash-brand-strong)]" />
                  {labels.module}
                </div>
                <h1 className="mt-3 text-2xl font-semibold text-[var(--dash-text)] sm:text-3xl">{labels.title}</h1>
                <p className="mt-2 max-w-3xl text-sm leading-6 text-[var(--dash-text-soft)]">{labels.subtitle}</p>
              </div>
              <div className="flex flex-wrap gap-2">
                <Badge variant="outline" className="border-[#49c6e5]/35 bg-[rgba(73,198,229,0.12)] text-[#bdefff]">
                  <ShieldCheck className="mr-1 h-3.5 w-3.5" />
                  {labels.metrics}
                </Badge>
              </div>
            </div>
            <div className="mt-5 grid gap-2 sm:grid-cols-3">
              <MetricCard label={labels.totalRoles} value={String(roles.length)} />
              <MetricCard label={labels.rolesWithDescription} value={String(rolesWithDescription)} />
              <MetricCard label={labels.rolesWithoutDescription} value={String(roles.length - rolesWithDescription)} />
            </div>
          </div>

          <div className="rounded-lg border border-[var(--dash-border-subtle)] bg-[var(--dash-surface)] p-5">
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-[rgba(47,125,246,0.16)] text-[#8fb7ff]">
                <LayoutGrid className="h-5 w-5" />
              </div>
              <div className="min-w-0">
                <p className="truncate text-sm font-semibold text-[var(--dash-text)]">{labels.organization}</p>
                <p className="text-xs text-[var(--dash-text-soft)]">{organizationName || organizationId}</p>
              </div>
            </div>
            <div className="mt-4 grid grid-cols-1 gap-3">
              <Button asChild className="h-10 rounded-lg bg-[#2563eb] text-white hover:bg-[#1f6feb]">
                <Link href={localizePath("/dashboard/settings", locale)}>
                  <span>{labels.settings}</span>
                </Link>
              </Button>
            </div>
          </div>
        </section>

        <section className="rounded-lg border border-[var(--dash-border-subtle)] bg-[var(--dash-surface)] p-5">
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div className="min-w-0">
              <h2 className="text-lg font-semibold text-[var(--dash-text)]">{labels.tableTitle}</h2>
              <p className="mt-1 text-sm leading-6 text-[var(--dash-text-soft)]">{labels.tableDescription}</p>
            </div>
            {hasRbacPermission(ctx.permissions, "roles.create") && <Button
              asChild
              className="h-10 rounded-lg bg-[var(--dash-brand-strong)] text-white hover:brightness-110"
              size="sm"
            >
              <Link href={localizePath("/dashboard/settings/roles/new", locale)}>
                <Plus className="mr-1 h-4 w-4" />
                {labels.addRole}
              </Link>
            </Button>}
          </div>
          <div className="mt-5 rounded-lg border border-white/10 bg-white/[0.03] p-4">
            <RoleTable
              data={roles}
              locale={locale}
              canUpdate={hasRbacPermission(ctx.permissions, "roles.update")}
            />
          </div>
        </section>
      </div>
    </div>
  )
}



export default async function SettingsRoutePage(props: any = {}) {
  const surface = routeByKey("settings-roles")

  if (!surface) {
    throw new Error("Missing settings route surface definition: settings-roles")
  }

  return withSettingsSurfaceAccess({
    params: (props as { params?: Promise<{ locale: string }> }).params ?? Promise.resolve({ locale: "en" }),
    surface,
    onAllowed: async () => RolesPageImpl(props),
  })
}
