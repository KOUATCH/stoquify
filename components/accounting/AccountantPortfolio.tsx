import Link from "next/link"
import { Building2, CalendarClock, ShieldCheck } from "lucide-react"

import type { AccountantPortfolio as AccountantPortfolioData } from "@/services/accounting/accountant-access.service"

export function AccountantPortfolio({
  portfolio,
}: {
  portfolio: AccountantPortfolioData
}) {
  if (portfolio.clients.length === 0) {
    return (
      <div className="rounded-xl border border-dashed p-8 text-center">
        <ShieldCheck className="mx-auto mb-3 h-8 w-8 text-[var(--dash-text-soft)]" />
        <h2 className="font-semibold">No active client mandates</h2>
        <p className="mt-2 text-sm text-[var(--dash-text-soft)]">
          A client must grant explicit, time-bound access before its ledger data appears here.
        </p>
      </div>
    )
  }

  return (
    <div className="grid min-w-0 gap-4 xl:grid-cols-2">
      {portfolio.clients.map(({ client, grant, close }) => (
        <article key={grant.id} className="dashboard-glass-panel min-w-0 rounded-lg p-5">
          <div className="flex items-start justify-between gap-4">
            <div>
              <div className="flex items-center gap-2">
                <Building2 className="h-4 w-4 text-[var(--dash-text-soft)]" />
                <h2 className="break-words font-semibold">{client.name}</h2>
              </div>
              <p className="mt-1 text-sm text-[var(--dash-text-soft)]">
                {client.countryCode || "Country not set"} · {client.currency}
              </p>
            </div>
            <span className="shrink-0 rounded-md border border-[var(--dash-border-subtle)] bg-[var(--dash-brand-soft)] px-2.5 py-1 text-xs font-medium text-[var(--dash-text)]">
              {grant.role.replace("_", " ")}
            </span>
          </div>

          <dl className="mt-5 grid grid-cols-2 gap-3 text-sm">
            <div>
              <dt className="text-[var(--dash-text-soft)]">Close readiness</dt>
              <dd className="font-medium">{close ? `${close.readinessScore}%` : "Not run"}</dd>
            </div>
            <div>
              <dt className="text-[var(--dash-text-soft)]">High/critical blockers</dt>
              <dd className="font-medium">{close?.blockerCount ?? "—"}</dd>
            </div>
            <div className="col-span-2">
              <dt className="flex items-center gap-1 text-[var(--dash-text-soft)]">
                <CalendarClock className="h-3.5 w-3.5" />
                Access expires
              </dt>
              <dd className="font-medium">{new Date(grant.expiresAt).toLocaleDateString()}</dd>
            </div>
          </dl>

          <Link
            className="dashboard-button-primary mt-5 inline-flex min-h-10 items-center rounded-lg px-3 py-2 text-sm font-medium"
            href={`/dashboard/accounting/accountant-portal?clientOrganizationId=${encodeURIComponent(client.organizationId)}`}
          >
            Open ledger evidence
          </Link>
        </article>
      ))}
    </div>
  )
}
