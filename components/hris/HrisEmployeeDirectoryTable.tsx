"use client"

import Link from "next/link"
import { localizePath } from "@/i18n/routing"
import { peopleDirectoryHref, type PeopleDirectoryQuery } from "@/services/hris/people-directory-query"
import type { HrisEmployeeDirectoryResult } from "@/services/hris/employee.service"
import type { Locale } from "@/types/bilingual"

const copy = {
  en: {search: "Search employees or jobs", department: "Department", status: "Status", all: "All statuses", apply: "Apply filters", clear: "Clear filters", employee: "Employee", job: "Job", mapping: "User mapping", readiness: "Readiness", ready: "Ready", blockers: "blockers", none: "Not assigned", open: "Open profile", empty: "No employees match these filters.", previous: "Previous", next: "Next", page: "Page", of: "of", results: "matching employees", authorized: "authorized employees", table: "Employee directory, scroll horizontally for all columns", states: {DRAFT: "Draft", ACTIVE: "Active", SUSPENDED: "Suspended", TERMINATED: "Terminated", ARCHIVED: "Archived", LINKED: "Linked", UNMAPPED: "Unmapped", ORPHANED: "Mapping needs review"}},
  fr: {search: "Rechercher un employé ou un poste", department: "Service", status: "Statut", all: "Tous les statuts", apply: "Appliquer les filtres", clear: "Effacer les filtres", employee: "Employé", job: "Poste", mapping: "Compte utilisateur", readiness: "Préparation", ready: "Prêt", blockers: "points bloquants", none: "Non affecté", open: "Ouvrir le profil", empty: "Aucun employé ne correspond à ces filtres.", previous: "Précédent", next: "Suivant", page: "Page", of: "sur", results: "employés correspondants", authorized: "employés autorisés", table: "Annuaire du personnel, défilement horizontal pour toutes les colonnes", states: {DRAFT: "Brouillon", ACTIVE: "Actif", SUSPENDED: "Suspendu", TERMINATED: "Terminé", ARCHIVED: "Archivé", LINKED: "Lié", UNMAPPED: "Non lié", ORPHANED: "Lien à vérifier"}},
}

export function HrisEmployeeDirectoryTable({employees, locale, pagination, query}: {
  employees: HrisEmployeeDirectoryResult["employees"]
  locale: Locale
  pagination: NonNullable<HrisEmployeeDirectoryResult["pagination"]>
  query: PeopleDirectoryQuery
}) {
  const c = copy[locale]
  const path = localizePath("/dashboard/people", locale)
  const control = "min-h-10 rounded-md border border-white/20 bg-slate-950 px-3 py-2 text-sm text-white focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-blue-400"
  return <div className="min-w-0 overflow-hidden rounded-lg border border-white/10">
    <form key={JSON.stringify(query)} action={path} method="get" className="flex flex-wrap items-end gap-3 p-4">
      <label className="flex min-w-0 flex-1 basis-60 flex-col gap-1 text-sm text-slate-300">{c.search}<input name="search" defaultValue={query.search} maxLength={120} className={control} /></label>
      <label className="flex min-w-0 flex-1 basis-40 flex-col gap-1 text-sm text-slate-300">{c.department}<input name="department" defaultValue={query.department} maxLength={120} className={control} /></label>
      <label className="flex min-w-0 flex-1 basis-40 flex-col gap-1 text-sm text-slate-300">{c.status}<select name="status" defaultValue={query.status ?? ""} className={control}><option value="">{c.all}</option>{(["DRAFT", "ACTIVE", "SUSPENDED", "TERMINATED", "ARCHIVED"] as const).map(value => <option key={value} value={value}>{c.states[value]}</option>)}</select></label>
      <button type="submit" className={control}>{c.apply}</button>
      <Link href={path} className={control}>{c.clear}</Link>
    </form>
    <p role="status" className="px-4 pb-3 text-sm text-slate-300">{pagination.total} {c.results} · {pagination.authorizedTotal} {c.authorized}</p>
    <div role="region" aria-label={c.table} tabIndex={0} className="dashboard-data-table dashboard-table-shell overflow-x-auto focus-visible:outline focus-visible:outline-blue-400">
      <table className="w-full min-w-[760px] border-collapse text-left text-sm">
        <thead className="bg-slate-950 text-slate-400"><tr>{[c.employee,c.status,c.job,c.department,c.mapping,c.readiness,c.open].map(label => <th scope="col" key={label} className="px-4 py-3 font-medium">{label}</th>)}</tr></thead>
        <tbody className="divide-y divide-white/10 bg-slate-950/70 text-slate-200">
          {employees.map(employee => <tr key={employee.id}>
            <td className="px-4 py-3 font-medium text-white">{employee.displayName}</td>
            <td className="px-4 py-3">{c.states[employee.status]}</td>
            <td className="px-4 py-3">{employee.employment.jobTitle ?? c.none}</td>
            <td className="px-4 py-3">{employee.employment.department ?? c.none}</td>
            <td className="px-4 py-3">{c.states[employee.userMapping.state]}</td>
            <td className="px-4 py-3">{employee.blockers.length ? `${employee.blockers.length} ${c.blockers}` : c.ready}</td>
            <td className="px-4 py-3"><Link href={localizePath(`/dashboard/people/${employee.id}`,locale)} className={control} aria-label={`${c.open}: ${employee.displayName}`}>{c.open}</Link></td>
          </tr>)}
          {!employees.length && <tr><td colSpan={7} className="px-4 py-8 text-center">{c.empty}</td></tr>}
        </tbody>
      </table>
    </div>
    <nav aria-label={locale === "fr" ? "Pagination du personnel" : "Employee pagination"} className="flex flex-wrap items-center justify-between gap-3 p-4 text-sm text-slate-300">
      {pagination.page > 1 ? <Link className={control} href={peopleDirectoryHref(path,query,pagination.page-1)}>{c.previous}</Link> : <span aria-disabled="true">{c.previous}</span>}
      <span>{c.page} {pagination.page} {c.of} {pagination.totalPages}</span>
      {pagination.page < pagination.totalPages ? <Link className={control} href={peopleDirectoryHref(path,query,pagination.page+1)}>{c.next}</Link> : <span aria-disabled="true">{c.next}</span>}
    </nav>
  </div>
}
