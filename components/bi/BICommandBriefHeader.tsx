"use client"

import type { ReactNode } from "react"
import Link from "next/link"
import { ArrowUpRight, CalendarDays, Clock3, GitBranch, ShieldCheck } from "lucide-react"

import { BIEvidenceBadgeRow } from "@/components/bi/BIEvidenceBadgeRow"
import { BICommandModeTabs } from "@/components/bi/BICommandModeTabs"
import { BIStateBadge } from "@/components/bi/BIStateBadge"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import {
  dashboardMutedTextClass,
  dashboardPanelClass,
  dashboardRowClass,
  dashboardToneClass,
} from "@/components/finance/finance-dashboard-theme"
import { cn } from "@/lib/utils"
import type { BICommandBrief, BICommandMode } from "@/services/bi/bi-contracts"

type BICommandBriefHeaderProps = {
  brief: BICommandBrief
  mode?: BICommandMode
  onModeChange?: (mode: BICommandMode) => void
  className?: string
}

export function BICommandBriefHeader({
  brief,
  mode = brief.mode,
  onModeChange,
  className,
}: BICommandBriefHeaderProps) {
  return (
    <section className={cn(dashboardPanelClass, "p-4 md:p-5", className)}>
      <div className="flex flex-col gap-4 xl:flex-row xl:items-start xl:justify-between">
        <div className="min-w-0 max-w-5xl space-y-3">
          <div className="flex flex-wrap items-center gap-2">
            <BIStateBadge state={brief.state} />
            <Badge variant="outline" className={cn("gap-1.5 border", dashboardToneClass("brand"))}>
              <ShieldCheck className="h-3.5 w-3.5" aria-hidden="true" />
              Command brief
            </Badge>
            <Badge variant="outline" className="gap-1.5 rounded-md border-[var(--dash-border-subtle)] text-[var(--dash-text-soft)]">
              <Clock3 className="h-3.5 w-3.5" aria-hidden="true" />
              {brief.freshness.state}
            </Badge>
          </div>

          <div>
            <h1 className="text-2xl font-semibold tracking-normal text-[var(--dash-text)] md:text-3xl">
              {brief.title}
            </h1>
            <p className={cn("mt-2 max-w-4xl text-sm leading-6", dashboardMutedTextClass)}>
              {brief.summary}
            </p>
          </div>

          <div className={cn(dashboardRowClass, "p-3")}>
            <p className="text-sm font-semibold text-[var(--dash-text)]">{brief.conclusion}</p>
            <BIEvidenceBadgeRow
              className="mt-3"
              evidenceGrade={brief.evidenceGrade}
              trustState={brief.trustState}
              freshness={brief.freshness}
              provenance={brief.provenance}
            />
          </div>
        </div>

        <aside className="flex w-full flex-col gap-3 xl:w-[420px]">
          <BICommandModeTabs value={mode} onValueChange={onModeChange} />
          <div className={cn(dashboardRowClass, "space-y-2 p-3 text-xs text-[var(--dash-text-soft)]")}>
            <MetaLine icon={<CalendarDays className="h-3.5 w-3.5" />} label="Period">
              {formatPeriod(brief.periodStart, brief.periodEnd)}
            </MetaLine>
            <MetaLine icon={<Clock3 className="h-3.5 w-3.5" />} label="Generated">
              {formatDateTime(brief.generatedAt)}
            </MetaLine>
            <MetaLine icon={<GitBranch className="h-3.5 w-3.5" />} label="Sources">
              {brief.sourceModules.length ? brief.sourceModules.join(", ") : "No sources"}
            </MetaLine>
            {brief.reviewState ? (
              <MetaLine icon={<ShieldCheck className="h-3.5 w-3.5" />} label="Review">
                {brief.reviewState.state}
              </MetaLine>
            ) : null}
          </div>
          {brief.primaryAction && !brief.primaryAction.disabled ? (
            <Button asChild size="sm" className="dashboard-button-primary h-10 rounded-lg">
              <Link href={brief.primaryAction.href}>
                <ArrowUpRight className="h-4 w-4" aria-hidden="true" />
                {brief.primaryAction.label}
              </Link>
            </Button>
          ) : null}
        </aside>
      </div>
    </section>
  )
}

function MetaLine({ icon, label, children }: { icon: ReactNode; label: string; children: ReactNode }) {
  return (
    <div className="flex min-w-0 items-start gap-2">
      <span className="mt-0.5 shrink-0 text-[var(--dash-text-faint)]">{icon}</span>
      <p className="min-w-0">
        <span className="font-medium text-[var(--dash-text)]">{label}: </span>
        <span className="break-words">{children}</span>
      </p>
    </div>
  )
}

function formatPeriod(start: string | null, end: string | null) {
  if (!start && !end) return "Not set"
  if (!start) return `Until ${formatDate(end)}`
  if (!end) return `From ${formatDate(start)}`
  return `${formatDate(start)} - ${formatDate(end)}`
}

function formatDate(value: string | null) {
  if (!value) return "not set"
  return new Intl.DateTimeFormat("en", { month: "short", day: "numeric" }).format(new Date(value))
}

function formatDateTime(value: string) {
  return new Intl.DateTimeFormat("en", {
    month: "short",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  }).format(new Date(value))
}
