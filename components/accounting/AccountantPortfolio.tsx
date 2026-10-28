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
        <ShieldCheck className="mx-auto mb-3 h-8 w-8 text-muted-foreground" />
        <h2 className="font-semibold">No active client mandates</h2>
        <p className="mt-2 text-sm text-muted-foreground">
          A client must grant explicit, time-bound access before its ledger data appears here.
        </p>
      </div>
    )
  }

  return (
    <div className="grid gap-4 lg:grid-cols-2">
      {portfolio.clients.map(({ client, grant, close }) => (
        <article key={grant.id} className="rounded-xl border bg-card p-5 shadow-sm">
          <div className="flex items-start justify-between gap-4">
            <div>
              <div className="flex items-center gap-2">
                <Building2 className="h-4 w-4 text-muted-foreground" />
                <h2 className="font-semibold">{client.name}</h2>
              </div>
              <p className="mt-1 text-sm text-muted-foreground">
                {client.countryCode || "Country not set"} · {client.currency}
              </p>
            </div>
            <span className="rounded-full bg-emerald-100 px-2.5 py-1 text-xs font-medium text-emerald-800">
              {grant.role.replace("_", " ")}
            </span>
          </div>

          <dl className="mt-5 grid grid-cols-2 gap-3 text-sm">
            <div>
              <dt className="text-muted-foreground">Close readiness</dt>
              <dd className="font-medium">{close ? `${close.readinessScore}%` : "Not run"}</dd>
            </div>
            <div>
              <dt className="text-muted-foreground">High/critical blockers</dt>
              <dd className="font-medium">{close?.blockerCount ?? "—"}</dd>
            </div>
            <div className="col-span-2">
              <dt className="flex items-center gap-1 text-muted-foreground">
                <CalendarClock className="h-3.5 w-3.5" />
                Access expires
              </dt>
              <dd className="font-medium">{new Date(grant.expiresAt).toLocaleDateString()}</dd>
            </div>
          </dl>

          <Link
            className="mt-5 inline-flex rounded-md bg-primary px-3 py-2 text-sm font-medium text-primary-foreground"
            href={`/dashboard/accounting/accountant-portal?clientOrganizationId=${encodeURIComponent(client.organizationId)}`}
          >
            Open ledger evidence
          </Link>
        </article>
      ))}
    </div>
  )
}
