import {
  BadgeCheck,
  Link2,
  MousePointerClick,
  ShieldCheck,
  UserRoundCheck,
} from "lucide-react"

import { dashboardPanelClass } from "@/components/dashboard/primitives"
import { Badge } from "@/components/ui/badge"
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import { cn } from "@/lib/utils"
import type { ReferralFunnelReadModel } from "@/services/referrals/referral-funnel-read-model.service"

type ReferralFunnelDashboardProps = {
  data: ReferralFunnelReadModel
  locale?: "en" | "fr"
}

const copy = {
  en: {
    eyebrow: "Privacy-bounded growth evidence",
    title: "Referral funnel",
    description:
      "Customer-statement deliveries and accountant-client invites, grouped by source and campaign.",
    allTime: "All-time evidence",
    tenantScoped: "Tenant scoped",
    privacyTitle: "Aggregate evidence only",
    privacyDescription:
      "Recipient contacts and raw IP or user-agent data are never included in this dashboard contract.",
    issuedLinks: "Issued links",
    clicks: "Clicks",
    conversions: "Conversions",
    inviteActivations: "Invite activations",
    source: "Source",
    campaign: "Campaign",
    customerStatement: "Customer statement delivery",
    accountantInvite: "Accountant-client invite",
    noEvidence: "No referral evidence has been issued for this tenant yet.",
    updated: "Updated",
  },
  fr: {
    eyebrow: "Preuves de croissance respectueuses de la vie privee",
    title: "Entonnoir de parrainage",
    description:
      "Livraisons de releves clients et invitations comptable-client, regroupees par source et campagne.",
    allTime: "Preuves cumulees",
    tenantScoped: "Limite au tenant",
    privacyTitle: "Preuves agregees uniquement",
    privacyDescription:
      "Les contacts destinataires et les donnees IP ou user-agent brutes ne figurent jamais dans ce contrat de tableau de bord.",
    issuedLinks: "Liens emis",
    clicks: "Clics",
    conversions: "Conversions",
    inviteActivations: "Invitations activees",
    source: "Source",
    campaign: "Campagne",
    customerStatement: "Livraison de releve client",
    accountantInvite: "Invitation comptable-client",
    noEvidence: "Aucune preuve de parrainage n'a encore ete emise pour ce tenant.",
    updated: "Actualise",
  },
} as const

function sourceLabel(
  sourceType: ReferralFunnelReadModel["rows"][number]["sourceType"],
  labels: (typeof copy)[keyof typeof copy],
) {
  return sourceType === "ACCOUNTANT_INVITE"
    ? labels.accountantInvite
    : labels.customerStatement
}

export function ReferralFunnelDashboard({
  data,
  locale = "en",
}: ReferralFunnelDashboardProps) {
  const labels = copy[locale]
  const numberFormatter = new Intl.NumberFormat(locale)
  const dateFormatter = new Intl.DateTimeFormat(locale, {
    dateStyle: "medium",
    timeStyle: "short",
  })
  const metrics = [
    {
      label: labels.issuedLinks,
      value: data.totals.issuedLinks,
      icon: Link2,
      tone: "text-[var(--dash-brand)] bg-[var(--dash-brand-soft)]",
    },
    {
      label: labels.clicks,
      value: data.totals.clicks,
      icon: MousePointerClick,
      tone: "text-[var(--dash-info)] bg-[var(--dash-info-soft)]",
    },
    {
      label: labels.conversions,
      value: data.totals.conversions,
      icon: UserRoundCheck,
      tone: "text-[var(--dash-success)] bg-[var(--dash-success-soft)]",
    },
    {
      label: labels.inviteActivations,
      value: data.totals.inviteActivations,
      icon: BadgeCheck,
      tone: "text-[var(--dash-gold)] bg-[var(--dash-gold-soft)]",
    },
  ]

  return (
    <div className="dashboard-landing-theme min-h-full overflow-x-hidden">
      <main className="dashboard-landing-content mx-auto w-full max-w-[88rem] space-y-6 px-4 py-6 text-[var(--dash-text)] sm:px-6 sm:py-8">
        <section className={cn(dashboardPanelClass, "p-5 sm:p-6")}>
          <div className="flex flex-col gap-5 lg:flex-row lg:items-start lg:justify-between">
            <div className="max-w-3xl">
              <p className="text-xs font-semibold uppercase tracking-[0.12em] text-[var(--dash-brand)]">
                {labels.eyebrow}
              </p>
              <h1 className="mt-2 text-2xl font-semibold tracking-tight sm:text-3xl">
                {labels.title}
              </h1>
              <p className="mt-2 text-sm leading-6 text-[var(--dash-text-soft)] sm:text-base">
                {labels.description}
              </p>
            </div>
            <div className="flex flex-wrap gap-2">
              <Badge variant="outline" className="border-[var(--dash-border)] bg-[var(--dash-surface-raised)] text-[var(--dash-text-soft)]">
                {labels.allTime}
              </Badge>
              <Badge variant="outline" className="border-[var(--dash-success)] bg-[var(--dash-success-soft)] text-[var(--dash-success)]">
                {labels.tenantScoped}
              </Badge>
            </div>
          </div>

          <div className="mt-5 flex items-start gap-3 rounded-lg border border-[var(--dash-info)] bg-[var(--dash-info-soft)] p-4">
            <ShieldCheck className="mt-0.5 h-5 w-5 shrink-0 text-[var(--dash-info)]" aria-hidden="true" />
            <div>
              <h2 className="text-sm font-semibold">{labels.privacyTitle}</h2>
              <p className="mt-1 text-sm leading-6 text-[var(--dash-text-soft)]">
                {labels.privacyDescription}
              </p>
            </div>
          </div>
        </section>

        <section aria-label={labels.title} className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
          {metrics.map((metric) => {
            const Icon = metric.icon
            return (
              <Card key={metric.label} className="dashboard-glass-panel overflow-hidden rounded-lg border-[var(--dash-border-subtle)] text-[var(--dash-text)]">
                <CardHeader className="flex flex-row items-center justify-between gap-3 pb-2">
                  <CardTitle className="text-sm font-medium text-[var(--dash-text-soft)]">
                    {metric.label}
                  </CardTitle>
                  <span className={cn("flex h-9 w-9 items-center justify-center rounded-lg", metric.tone)}>
                    <Icon className="h-4 w-4" aria-hidden="true" />
                  </span>
                </CardHeader>
                <CardContent>
                  <p className="text-3xl font-semibold tracking-tight">
                    {numberFormatter.format(metric.value)}
                  </p>
                </CardContent>
              </Card>
            )
          })}
        </section>

        <section className={cn(dashboardPanelClass, "overflow-hidden")}>
          <div className="flex flex-col gap-1 border-b border-[var(--dash-border-subtle)] px-5 py-4 sm:flex-row sm:items-center sm:justify-between sm:px-6">
            <div>
              <h2 className="text-base font-semibold">{labels.title}</h2>
              <p className="mt-1 text-xs text-[var(--dash-text-faint)]">
                {labels.updated}: {dateFormatter.format(new Date(data.generatedAt))}
              </p>
            </div>
          </div>

          {data.rows.length === 0 ? (
            <p className="m-5 rounded-lg border border-dashed border-[var(--dash-border-subtle)] bg-[var(--dash-surface)] p-8 text-center text-sm text-[var(--dash-text-soft)]">
              {labels.noEvidence}
            </p>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full min-w-[760px] text-sm">
                <thead className="bg-[var(--dash-surface)] text-left text-xs uppercase tracking-wide text-[var(--dash-text-faint)]">
                  <tr>
                    <th className="px-5 py-3 font-semibold sm:px-6">{labels.source}</th>
                    <th className="px-5 py-3 font-semibold">{labels.campaign}</th>
                    <th className="px-5 py-3 text-right font-semibold">{labels.issuedLinks}</th>
                    <th className="px-5 py-3 text-right font-semibold">{labels.clicks}</th>
                    <th className="px-5 py-3 text-right font-semibold">{labels.conversions}</th>
                    <th className="px-5 py-3 text-right font-semibold sm:px-6">{labels.inviteActivations}</th>
                  </tr>
                </thead>
                <tbody>
                  {data.rows.map((row) => (
                    <tr key={`${row.sourceType}:${row.campaign}`} className="border-t border-[var(--dash-border-subtle)]">
                      <td className="px-5 py-4 font-medium sm:px-6">
                        {sourceLabel(row.sourceType, labels)}
                      </td>
                      <td className="px-5 py-4">
                        <code className="rounded-md bg-[var(--dash-surface-raised)] px-2 py-1 text-xs text-[var(--dash-text-soft)]">
                          {row.campaign}
                        </code>
                      </td>
                      <td className="px-5 py-4 text-right tabular-nums">{numberFormatter.format(row.issuedLinks)}</td>
                      <td className="px-5 py-4 text-right tabular-nums">{numberFormatter.format(row.clicks)}</td>
                      <td className="px-5 py-4 text-right tabular-nums">{numberFormatter.format(row.conversions)}</td>
                      <td className="px-5 py-4 text-right tabular-nums sm:px-6">{numberFormatter.format(row.inviteActivations)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </section>
      </main>
    </div>
  )
}
