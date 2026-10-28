import type { CSSProperties, ReactNode } from "react"
import type { LucideIcon } from "lucide-react"

import { Link } from "@/i18n/navigation"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"

export function formatAccountingMoney(value: string | number | null | undefined, currency = "XAF") {
  const amount = Number(value ?? 0)

  return new Intl.NumberFormat("fr-FR", {
    style: "currency",
    currency,
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(Number.isFinite(amount) ? amount : 0)
}

export function accountingDate(value: Date | string | null | undefined) {
  if (!value) return "Not set"
  return new Intl.DateTimeFormat("en", { dateStyle: "medium" }).format(new Date(value))
}

export function AccountingPageShell({
  eyebrow,
  title,
  description,
  icon: Icon,
  actions,
  children,
}: {
  eyebrow: string
  title: string
  description: string
  icon: LucideIcon
  actions?: ReactNode
  children: ReactNode
}) {
  return (
    <div className="dashboard-landing-theme dark min-h-screen overflow-x-hidden">
      <div className="dashboard-landing-content mx-auto w-full max-w-[88rem] min-w-0 px-4 py-6 sm:px-6 sm:py-8">
        <div className="mb-6 flex min-w-0 flex-col gap-5 sm:mb-8 xl:flex-row xl:items-end xl:justify-between">
          <div className="min-w-0 max-w-3xl">
            <div className="dashboard-eyebrow mb-4">
              <span className="dashboard-live-dot" />
              {eyebrow}
            </div>
            <div className="flex min-w-0 items-start gap-4">
              <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-lg border border-[var(--dash-border-subtle)] bg-[var(--dash-brand-soft)] shadow-[0_16px_34px_rgba(47,125,246,0.18)]">
                <Icon className="h-6 w-6 text-[var(--dash-brand-strong)]" />
              </div>
              <div className="min-w-0">
                <h1 className="text-3xl font-semibold tracking-tight text-[var(--dash-text)] sm:text-4xl">
                  {title}
                </h1>
                <p className="mt-2 max-w-2xl text-sm leading-6 text-[var(--dash-text-soft)] sm:text-base">
                  {description}
                </p>
              </div>
            </div>
          </div>
          {actions ? <div className="flex w-full shrink-0 flex-col gap-2 sm:w-auto sm:flex-row sm:items-center">{actions}</div> : null}
        </div>
        {children}
      </div>
    </div>
  )
}

export function AccountingStatCard({
  label,
  value,
  sub,
  icon: Icon,
  accent,
  soft,
}: {
  label: string
  value: string
  sub: string
  icon: LucideIcon
  accent: string
  soft: string
}) {
  return (
    <Card
      className="dashboard-stat-card group relative min-h-[136px] min-w-0 overflow-hidden"
      style={{ "--stat-accent": accent, "--stat-soft": soft } as CSSProperties}
    >
      <div className="absolute inset-x-0 top-0 h-1 bg-[var(--stat-accent)] opacity-80" />
      <div className="absolute end-4 top-4 flex h-9 w-9 items-center justify-center rounded-lg bg-[var(--stat-soft)] text-[var(--stat-accent)] transition-transform duration-200 group-hover:scale-105">
        <Icon className="h-4 w-4" />
      </div>
      <CardHeader className="pb-2 pe-14">
        <CardTitle className="text-[0.7rem] font-semibold uppercase leading-4 text-[var(--dash-text-faint)]">
          {label}
        </CardTitle>
      </CardHeader>
      <CardContent className="relative z-10 pe-4">
        <div className="mb-1 break-words text-2xl font-semibold leading-tight text-[var(--dash-text)]">{value}</div>
        <p className="text-xs leading-5 text-[var(--dash-text-soft)]">{sub}</p>
      </CardContent>
    </Card>
  )
}

export function AccountingPanel({
  title,
  description,
  children,
  actions,
}: {
  title: string
  description?: string
  children: ReactNode
  actions?: ReactNode
}) {
  return (
    <Card className="dashboard-glass-panel min-w-0 overflow-hidden rounded-lg text-[var(--dash-text)]">
      <CardHeader className="flex flex-col gap-3 border-b border-[var(--dash-border-subtle)] sm:flex-row sm:items-center sm:justify-between">
        <div>
          <CardTitle className="text-base font-semibold text-[var(--dash-text)]">{title}</CardTitle>
          {description ? <p className="mt-1 text-sm text-[var(--dash-text-soft)]">{description}</p> : null}
        </div>
        {actions}
      </CardHeader>
      <CardContent className="p-0">{children}</CardContent>
    </Card>
  )
}

export function AccountingMessage({
  error,
  notice,
}: {
  error?: string | string[]
  notice?: string | string[]
}) {
  const errorText = Array.isArray(error) ? error[0] : error
  const noticeText = Array.isArray(notice) ? notice[0] : notice

  if (!errorText && !noticeText) return null

  return (
    <div
      className={`mb-5 rounded-lg border px-4 py-3 text-sm ${
        errorText
          ? "border-[var(--dash-danger)] bg-[var(--dash-danger-soft)] text-[var(--dash-text)]"
          : "border-[var(--dash-success)] bg-[var(--dash-success-soft)] text-[var(--dash-text)]"
      }`}
    >
      {errorText || noticeText}
    </div>
  )
}

export function AccountingLinkButton({
  href,
  children,
  variant = "default",
}: {
  href: string
  children: ReactNode
  variant?: "default" | "outline"
}) {
  return (
    <Button
      asChild
      size="sm"
      variant={variant}
      className={variant === "outline" ? "dashboard-button-secondary h-10 rounded-lg" : "dashboard-button-create h-10 rounded-lg"}
    >
      <Link href={href}>{children}</Link>
    </Button>
  )
}

