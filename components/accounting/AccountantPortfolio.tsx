"use client"

import Link from "next/link"
import { Building2 } from "lucide-react"
import { ProofBadge, RouteStatePanel } from "@/components/dashboard/primitives/command-center-primitives"
import type { AccountantPortfolio as AccountantPortfolioData } from "@/services/accounting/accountant-access.service"
import { accountantPortfolioCopy, portfolioBlockerFrench } from "./accountant-portfolio-copy"

export const portfolioButton = "dashboard-button-primary inline-flex min-h-11 max-w-full items-center justify-center whitespace-normal break-words rounded-lg px-3 py-2 text-sm font-medium focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--dash-brand)] disabled:opacity-50"

export function AccountantPortfolio({ portfolio, locale = "en", onPage }: {
  portfolio: AccountantPortfolioData; locale?: string; onPage?: (cursor?: string) => void
}) {
  const language = locale === "fr" ? "fr" : "en"
  const copy = accountantPortfolioCopy[language]
  const route = `/${language}/dashboard/accounting/accountant-portfolio`
  const date = (value?: string | null) => value && Number.isFinite(Date.parse(value))
    ? new Intl.DateTimeFormat(language === "fr" ? "fr-FR" : "en-GB", { dateStyle: "medium", timeStyle: "short", timeZone: "UTC" }).format(new Date(value)) : copy.unavailable
  const pageHref = (cursor?: string) => {
    const query = new URLSearchParams({ search: portfolio.page.search, pageSize: String(portfolio.page.pageSize) })
    if (cursor) query.set("cursor", cursor)
    return `${route}?${query}`
  }
  return <>
    <p className="text-sm">{portfolio.page.loadedCount} {copy.scope}</p>
    <p className="mb-3 text-sm text-[var(--dash-text-soft)]">{portfolio.page.hasMore ? copy.partial : copy.end}</p>
    <p className="mb-4 text-sm text-[var(--dash-text-soft)]">{copy.changed}</p>
    {portfolio.clients.length === 0 ? <RouteStatePanel kind="empty" title={copy.empty} message={copy.emptyHelp} /> :
      <div className="grid min-w-0 gap-4 xl:grid-cols-2">
        {portfolio.clients.map(({ client, grant, close, selectedPeriod, assessmentAsOf, checkedAt, proofState, currentProof }) => {
          const query = new URLSearchParams({ clientOrganizationId: client.organizationId })
          if (selectedPeriod) query.set("periodId", selectedPeriod.id)
          return <article key={grant.id} className="dashboard-glass-panel min-w-0 rounded-lg p-5">
            <div className="flex flex-wrap items-start justify-between gap-3">
              <div className="min-w-0 flex-1">
                <h3 className="flex items-start gap-2 break-words font-semibold [overflow-wrap:anywhere]"><Building2 aria-hidden="true" className="mt-1 h-4 w-4 shrink-0" />{client.name}</h3>
                <p className="mt-1 text-sm text-[var(--dash-text-soft)]">{client.countryCode || copy.country} · {client.currency}</p>
              </div>
              <span className="rounded-md border border-[var(--dash-border-subtle)] px-2 py-1 text-xs">{copy.roles[grant.role]}</span>
            </div>
            <dl className="mt-4 grid grid-cols-1 gap-3 text-sm sm:grid-cols-2">
              <div className="sm:col-span-2"><dt className="text-[var(--dash-text-soft)]">{copy.period}</dt><dd className="break-words">{selectedPeriod?.name ?? copy.unavailable}</dd></div>
              <div className="sm:col-span-2"><dt className="mb-1 text-[var(--dash-text-soft)]">{copy.proof}</dt><dd><ProofBadge wrap state={proofState === "STALE" ? "stale" : proofState === "CURRENT" ? "operational" : "unavailable"} label={copy.states[proofState] ?? copy.unavailable} /></dd></div>
              <div><dt className="text-[var(--dash-text-soft)]">{copy.grade}</dt><dd>{currentProof ? copy.grades[currentProof.grade] : copy.unavailable}</dd></div>
              <div><dt className="text-[var(--dash-text-soft)]">{copy.checked}</dt><dd>{date(checkedAt)}</dd></div>
              <div><dt className="text-[var(--dash-text-soft)]">{copy.score}</dt><dd className="font-medium tabular-nums">{close?.readinessScore != null ? `${close.readinessScore}%` : copy.unavailable}</dd></div>
              <div><dt className="text-[var(--dash-text-soft)]">{copy.oldBlockers}</dt><dd className="tabular-nums">{close?.blockerCount ?? copy.unavailable}</dd></div>
              <div><dt className="text-[var(--dash-text-soft)]">{copy.asOf}</dt><dd>{date(assessmentAsOf)}</dd></div>
              <div><dt className="text-[var(--dash-text-soft)]">{copy.expires}</dt><dd>{date(grant.expiresAt)}</dd></div>
            </dl>
            <p className="mt-3 text-xs text-[var(--dash-text-soft)]">{copy.historical}</p>
            <h4 className="mt-4 text-sm font-semibold">{copy.blockers}</h4>
            {!currentProof ? <p className="text-sm">{copy.unavailable}</p> : currentProof.blockers.length === 0 ? <p className="text-sm">{copy.noBlockers}</p> :
              <ul className="mt-2 list-disc space-y-2 pl-5 text-sm">{currentProof.blockers.map(blocker => <li key={blocker.id}>
                {language === "fr" ? portfolioBlockerFrench[blocker.id] ?? "Blocage à examiner dans les justificatifs comptables." : `${blocker.title}. ${blocker.nextAction}`}
              </li>)}</ul>}
            <Link prefetch={false} className={`${portfolioButton} mt-5`} aria-label={`${copy.evidence}: ${client.name}${selectedPeriod ? `, ${selectedPeriod.name}` : ""}`} href={`/${language}/dashboard/accounting/accountant-portal?${query}`}>{copy.evidence}</Link>
            <Link prefetch={false} className={`${portfolioButton} mt-3`} href={`/${language}/dashboard/accounting/opening-position?clientOrganizationId=${encodeURIComponent(client.organizationId)}`}>{language === "fr" ? "Aperçu de la situation d’ouverture" : "Opening position preview"}</Link>
          </article>
        })}
      </div>}
    <nav aria-label={copy.pages} className="mt-4 flex flex-wrap gap-3">
      <Link prefetch={false} className={portfolioButton} href={pageHref()} onClick={onPage ? e => { e.preventDefault(); onPage() } : undefined}>{copy.restart}</Link>
      {portfolio.page.nextCursor && <Link prefetch={false} className={portfolioButton} href={pageHref(portfolio.page.nextCursor)} onClick={onPage ? e => { e.preventDefault(); onPage(portfolio.page.nextCursor!) } : undefined}>{copy.next}</Link>}
    </nav>
  </>
}
