import Link from "next/link"
import { DashboardRouteState } from "@/components/dashboard/DashboardRouteState"
import { HrisEmployeeDirectoryTable } from "@/components/hris/HrisEmployeeDirectoryTable"
import { localizePath, pickLocale } from "@/i18n/routing"
import { ForbiddenError } from "@/services/_shared/action-errors"
import { getHrisEmployeeDirectory } from "@/services/hris/employee.service"
import { peopleDirectoryQuerySchema } from "@/services/hris/people-directory-query"
import { routeByKey, withPeopleSurfaceAccess } from "./people-route-access"

export const metadata = { title: "People | Stoquify" }

export default async function PeopleWorkspacePage({params, searchParams}: {
  params: Promise<{locale: string}>
  searchParams?: Promise<Record<string, string | string[] | undefined>>
}) {
  const locale = pickLocale((await params).locale)
  const fr = locale === "fr"
  const query = peopleDirectoryQuerySchema.parse(await searchParams ?? {})
  const surface = routeByKey("people-workspace")
  if (!surface) throw new Error("Missing people route surface definition")
  const title = fr ? "Annuaire du personnel" : "Employee directory"
  const deniedTitle = fr ? "Accès au personnel non autorisé" : "People access is not authorized"
  const deniedMessage = fr ? "Votre rôle ou votre périmètre actuel ne permet pas cet accès. Contactez votre administrateur." : "Your current role or scope does not allow this access. Contact your administrator."
  return withPeopleSurfaceAccess({params: Promise.resolve({locale}), surface: {
    ...surface, permissionDeniedTitle: deniedTitle, permissionDeniedMessage: deniedMessage,
    noActiveOrgTitle: fr ? "Sélectionnez une organisation" : "Select an organization",
    noActiveOrgMessage: fr ? "Une organisation active est nécessaire pour consulter le personnel." : "An active organization is required to view people.",
  }, onAllowed: async ctx => {
    let directory
    try {
      directory = await getHrisEmployeeDirectory({organizationId: ctx.orgId, actorId: ctx.userId, actorPermissions: ctx.permissions, limit: 25, ...query})
    } catch (error) {
      if (error instanceof ForbiddenError) return <DashboardRouteState kind="permission_denied" locale={locale} title={deniedTitle} message={deniedMessage} primaryHref={localizePath("/dashboard",locale)} />
      throw error
    }
    if (!directory.pagination) throw new Error("Missing directory pagination contract")
    const scope = directory.accessScope.authority.kind
    const scopeLabel = scope === "TENANT_HRIS_ADMIN" ? (fr ? "Personnel de votre organisation" : "People in your organization")
      : scope === "LOCATION_RESPONSIBILITY_COMPATIBILITY" ? (fr ? "Personnel des sites sous votre responsabilité" : "People at your managed locations")
      : (fr ? "Personnel couvert par votre autorité actuelle" : "People covered by your current authority")
    return <main className="dashboard-landing-theme dark min-h-screen overflow-x-hidden">
      <div className="dashboard-landing-content mx-auto flex w-full max-w-[1440px] min-w-0 flex-col gap-5 px-4 py-5 sm:px-6 sm:py-6">
        <header className="flex flex-wrap items-end justify-between gap-4 border-b border-white/10 pb-5">
          <div><h1 className="text-2xl font-semibold text-white">{title}</h1><p className="mt-2 text-sm text-slate-300">{scopeLabel}</p><p className="mt-1 text-xs text-slate-400">{fr ? "Consulté le" : "As of"} {new Date(directory.asOf).toLocaleDateString(locale)}</p></div>
          <nav aria-label={fr ? "Gestion du personnel" : "People management"} className="flex flex-wrap gap-3 text-sm text-slate-200">
            <Link className="rounded-md border border-white/20 px-3 py-2" href={localizePath("/dashboard/people/manage",locale)}>{fr ? "Administrer le personnel" : "Manage employees"}</Link>
            <Link className="rounded-md border border-white/20 px-3 py-2" href={localizePath("/dashboard/people/import",locale)}>{fr ? "Importer des employés" : "Import employees"}</Link>
            <Link className="rounded-md border border-white/20 px-3 py-2" href={localizePath("/dashboard/people/setup",locale)}>{fr ? "Configuration RH" : "HR setup"}</Link>
            <Link className="rounded-md border border-white/20 px-3 py-2" href={localizePath("/dashboard/people/work",locale)}>{fr ? "Travail RH quotidien" : "Daily HR work"}</Link>
            <Link className="rounded-md border border-white/20 px-3 py-2" href={localizePath("/dashboard/people/history",locale)}>{fr ? "Historique" : "History"}</Link>
            <Link className="rounded-md border border-white/20 px-3 py-2" href={localizePath("/dashboard/people/approvals",locale)}>{fr ? "Approbations" : "Approvals"}</Link>
          </nav>
        </header>
        <section aria-label={fr ? "Résumé du personnel" : "People summary"} className="grid gap-px overflow-hidden rounded-lg border border-white/10 bg-white/10 sm:grid-cols-3">
          {[
            [fr ? "Employés correspondant aux filtres" : "Employees matching filters", directory.pagination.total],
            [fr ? "Comptes liés sur cette page" : "Linked users on this page", directory.summary.linkedUsers],
            [fr ? "Dossiers prêts sur cette page" : "Ready candidates on this page", directory.summary.payrollReadyCandidates],
          ].map(([label,value]) => <div key={String(label)} className="bg-slate-950/90 p-4"><p className="text-xs text-slate-400">{label}</p><p className="mt-1 text-2xl font-semibold text-white">{value}</p></div>)}
        </section>
        <HrisEmployeeDirectoryTable employees={directory.employees} locale={locale} pagination={directory.pagination} query={query} />
      </div>
    </main>
  }})
}
