"use client"

import type { CSSProperties, ReactNode } from "react"
import Link from "next/link"
import type { LucideIcon } from "lucide-react"
import {
  AlertTriangle,
  ArrowUpRight,
  CalendarClock,
  CheckCircle2,
  CircleDot,
  Clock3,
  Database,
  Filter,
  GitBranch,
  LockKeyhole,
  Search,
  ShieldAlert,
  ShieldCheck,
} from "lucide-react"

import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet"
import { cn } from "@/lib/utils"

export type DashboardTone =
  | "brand"
  | "success"
  | "info"
  | "gold"
  | "spruce"
  | "warm"
  | "warning"
  | "danger"
  | "muted"

export type DashboardState =
  | "ready"
  | "success"
  | "info"
  | "pending"
  | "partial"
  | "stale"
  | "warning"
  | "blocked"
  | "danger"
  | "locked"
  | "muted"

type ToneTokens = {
  accent: string
  soft: string
}

const toneTokens: Record<DashboardTone, ToneTokens> = {
  brand: { accent: "var(--dash-brand)", soft: "var(--dash-brand-soft)" },
  success: { accent: "var(--dash-success)", soft: "var(--dash-success-soft)" },
  info: { accent: "var(--dash-info)", soft: "var(--dash-info-soft)" },
  gold: { accent: "var(--dash-gold)", soft: "var(--dash-gold-soft)" },
  spruce: { accent: "var(--dash-spruce)", soft: "var(--dash-spruce-soft)" },
  warm: { accent: "var(--dash-warm)", soft: "var(--dash-warm-soft)" },
  warning: { accent: "var(--dash-warning)", soft: "var(--dash-warning-soft)" },
  danger: { accent: "var(--dash-danger)", soft: "var(--dash-danger-soft)" },
  muted: { accent: "var(--dash-text-soft)", soft: "rgba(37,57,67,0.34)" },
}

const toneClasses: Record<DashboardTone, string> = {
  brand: "border-[var(--dash-brand)] bg-[var(--dash-brand-soft)] text-[var(--dash-text)]",
  success: "border-[var(--dash-success)] bg-[var(--dash-success-soft)] text-[var(--dash-text)]",
  info: "border-[var(--dash-info)] bg-[var(--dash-info-soft)] text-[var(--dash-text)]",
  gold: "border-[var(--dash-gold)] bg-[var(--dash-gold-soft)] text-[var(--dash-text)]",
  spruce: "border-[var(--dash-spruce)] bg-[var(--dash-spruce-soft)] text-[var(--dash-text)]",
  warm: "border-[var(--dash-warm)] bg-[var(--dash-warm-soft)] text-[var(--dash-text)]",
  warning: "border-[var(--dash-warning)] bg-[var(--dash-warning-soft)] text-[var(--dash-text)]",
  danger: "border-[var(--dash-danger)] bg-[var(--dash-danger-soft)] text-[var(--dash-text)]",
  muted: "border-[var(--dash-border-subtle)] bg-[rgba(37,57,67,0.34)] text-[var(--dash-text-soft)]",
}

const toneTextClasses: Record<DashboardTone, string> = {
  brand: "text-[var(--dash-brand-strong)]",
  success: "text-[var(--dash-success)]",
  info: "text-[var(--dash-info)]",
  gold: "text-[var(--dash-gold)]",
  spruce: "text-[var(--dash-spruce)]",
  warm: "text-[var(--dash-warm)]",
  warning: "text-[var(--dash-warning)]",
  danger: "text-[var(--dash-danger)]",
  muted: "text-[var(--dash-text-soft)]",
}

const stateTones: Record<DashboardState, DashboardTone> = {
  ready: "success",
  success: "success",
  info: "info",
  pending: "gold",
  partial: "gold",
  stale: "warning",
  warning: "warning",
  blocked: "danger",
  danger: "danger",
  locked: "muted",
  muted: "muted",
}

const proofStateTones = {
  verified: "success",
  posted: "brand",
  reconciled: "success",
  certified: "spruce",
  operational: "info",
  pending: "gold",
  stale: "warning",
  blocked: "danger",
  redacted: "warm",
  unavailable: "muted",
} satisfies Record<ProofBadgeState, DashboardTone>

const proofStateLabels = {
  verified: "Verified",
  posted: "Posted",
  reconciled: "Reconciled",
  certified: "Certified",
  operational: "Operational",
  pending: "Pending proof",
  stale: "Stale proof",
  blocked: "Blocked",
  redacted: "Redacted",
  unavailable: "Proof unavailable",
} satisfies Record<ProofBadgeState, string>

export const dashboardPanelClass = "dashboard-glass-panel rounded-lg text-[var(--dash-text)]"
export const dashboardRowClass =
  "rounded-lg border border-[var(--dash-border-subtle)] bg-[rgba(37,57,67,0.34)]"
export const dashboardEmptyClass =
  "rounded-lg border border-dashed border-[var(--dash-border-subtle)] p-6 text-sm text-[var(--dash-text-soft)]"
export const dashboardMutedTextClass = "text-[var(--dash-text-soft)]"

export function dashboardStatStyle(tone: DashboardTone = "brand"): CSSProperties {
  const tokens = toneTokens[tone]

  return {
    "--stat-accent": tokens.accent,
    "--stat-soft": tokens.soft,
  } as CSSProperties
}

export function dashboardToneClass(tone: DashboardTone) {
  return toneClasses[tone]
}

export function dashboardToneText(tone: DashboardTone) {
  return toneTextClasses[tone]
}

export function dashboardStateTone(state: DashboardState) {
  return stateTones[state]
}

export type CommandCenterAction = {
  label: string
  href?: string
  onClick?: () => void
  icon?: LucideIcon
  disabled?: boolean
  disabledReason?: string
  variant?: "primary" | "secondary" | "create"
  ariaLabel?: string
}

export type CommandMetadataItem = {
  label: string
  value: ReactNode
  icon?: LucideIcon
}

export type CommandBriefHeaderProps = {
  title: string
  summary: string
  eyebrow?: string
  state?: {
    label: string
    tone?: DashboardTone
    icon?: LucideIcon
  }
  metadata?: CommandMetadataItem[]
  actions?: CommandCenterAction[]
  proof?: ProofBadgeProps | ReactNode
  children?: ReactNode
  className?: string
}

export function CommandBriefHeader({
  title,
  summary,
  eyebrow = "Command brief",
  state,
  metadata = [],
  actions = [],
  proof,
  children,
  className,
}: CommandBriefHeaderProps) {
  return (
    <section className={cn(dashboardPanelClass, "p-4 md:p-5", className)}>
      <div className="flex flex-col gap-4 xl:flex-row xl:items-start xl:justify-between">
        <div className="min-w-0 max-w-5xl space-y-3">
          <div className="flex flex-wrap items-center gap-2">
            <Badge variant="outline" className={cn("gap-1.5 rounded-md", dashboardToneClass("brand"))}>
              <ShieldCheck className="h-3.5 w-3.5" aria-hidden="true" />
              {eyebrow}
            </Badge>
            {state ? <StateBadge label={state.label} tone={state.tone ?? "info"} icon={state.icon} /> : null}
          </div>

          <div className="min-w-0">
            <h1 className="text-2xl font-semibold tracking-normal text-[var(--dash-text)] md:text-3xl">
              {title}
            </h1>
            <p className="mt-2 max-w-4xl text-sm leading-6 text-[var(--dash-text-soft)]">{summary}</p>
          </div>

          {proof ? (
            <div className={cn(dashboardRowClass, "flex flex-wrap items-center gap-2 p-3")}>
              {isProofBadgeProps(proof) ? <ProofBadge {...proof} /> : proof}
            </div>
          ) : null}

          {children}
        </div>

        {metadata.length || actions.length ? (
          <aside className="flex w-full flex-col gap-3 xl:w-[420px]">
            {metadata.length ? (
              <dl className={cn(dashboardRowClass, "space-y-2 p-3 text-xs text-[var(--dash-text-soft)]")}>
                {metadata.map((item) => (
                  <MetaLine key={item.label} item={item} />
                ))}
              </dl>
            ) : null}
            {actions.length ? (
              <div className="flex flex-col gap-2 sm:flex-row sm:flex-wrap xl:flex-col">
                {actions.map((action) => (
                  <CommandActionButton key={action.label} action={action} />
                ))}
              </div>
            ) : null}
          </aside>
        ) : null}
      </div>
    </section>
  )
}

export type StatusStripItem = {
  id: string
  label: string
  value?: ReactNode
  detail?: ReactNode
  tone?: DashboardTone
  state?: DashboardState
  icon?: LucideIcon
  href?: string
  source?: string
  proof?: ProofBadgeProps
}

export type StatusStripProps = {
  title?: string
  detail?: string
  items: StatusStripItem[]
  emptyMessage?: string
  className?: string
}

export function StatusStrip({
  title,
  detail,
  items,
  emptyMessage = "No status signals are available.",
  className,
}: StatusStripProps) {
  return (
    <section className={cn(dashboardPanelClass, "p-4", className)}>
      {title || detail ? (
        <div className="mb-4 flex flex-col gap-1">
          {title ? <h2 className="text-base font-semibold text-[var(--dash-text)]">{title}</h2> : null}
          {detail ? <p className="text-sm text-[var(--dash-text-soft)]">{detail}</p> : null}
        </div>
      ) : null}

      {items.length ? (
        <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
          {items.map((item) => (
            <StatusStripCard key={item.id} item={item} />
          ))}
        </div>
      ) : (
        <div className={dashboardEmptyClass}>{emptyMessage}</div>
      )}
    </section>
  )
}

export type KpiTileProps = {
  label: string
  value: ReactNode
  detail?: ReactNode
  tone?: DashboardTone
  trend?: {
    label: string
    tone?: DashboardTone
  }
  icon?: LucideIcon
  action?: CommandCenterAction
  proof?: ProofBadgeProps
  className?: string
}

export function KpiTile({
  label,
  value,
  detail,
  tone = "brand",
  trend,
  icon: Icon,
  action,
  proof,
  className,
}: KpiTileProps) {
  return (
    <article
      className={cn("dashboard-stat-card group relative min-h-[132px] min-w-0 overflow-hidden p-4", className)}
      style={dashboardStatStyle(tone)}
    >
      <div className="flex min-w-0 items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="truncate text-xs font-semibold uppercase tracking-normal text-[var(--dash-text-soft)]">
            {label}
          </p>
          <div className="mt-2 break-words text-2xl font-semibold tracking-normal text-[var(--dash-text)]">
            {value}
          </div>
        </div>
        {Icon ? (
          <span
            className={cn(
              "flex h-9 w-9 shrink-0 items-center justify-center rounded-lg border",
              dashboardToneClass(tone),
            )}
          >
            <Icon className="h-4 w-4" aria-hidden="true" />
          </span>
        ) : null}
      </div>
      {detail ? <p className="mt-3 line-clamp-2 text-sm leading-6 text-[var(--dash-text-soft)]">{detail}</p> : null}
      <div className="mt-4 flex flex-wrap items-center justify-between gap-2">
        {trend ? <StateBadge label={trend.label} tone={trend.tone ?? tone} /> : proof ? <ProofBadge {...proof} /> : <span />}
        {action ? <CommandActionButton action={action} size="sm" /> : null}
      </div>
    </article>
  )
}

export type ActionQueueItemData = {
  id: string
  title: string
  summary?: string
  tone?: DashboardTone
  stateLabel?: string
  riskLabel?: string
  owner?: string
  due?: string
  icon?: LucideIcon
  action?: CommandCenterAction
  proof?: ProofBadgeProps
  metadata?: CommandMetadataItem[]
  disabledReason?: string
}

export type ActionQueueProps = {
  items: ActionQueueItemData[]
  title?: string
  detail?: string
  maxItems?: number
  emptyTitle?: string
  emptyMessage?: string
  className?: string
}

export function ActionQueue({
  items,
  title = "What needs action",
  detail = "Permission-filtered work ranked by risk, urgency, and operational impact.",
  maxItems = 8,
  emptyTitle = "No visible action is due",
  emptyMessage = "There is no permission-filtered command action for this user and tenant right now.",
  className,
}: ActionQueueProps) {
  const visibleItems = items.slice(0, maxItems)

  return (
    <section className={cn(dashboardPanelClass, "p-4", className)}>
      <div className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
        <div className="min-w-0">
          <h2 className="text-base font-semibold text-[var(--dash-text)]">{title}</h2>
          <p className="text-sm leading-6 text-[var(--dash-text-soft)]">{detail}</p>
        </div>
        <span className="w-fit rounded-md border border-[var(--dash-border-subtle)] px-2 py-1 text-xs text-[var(--dash-text-soft)]">
          {items.length} action{items.length === 1 ? "" : "s"}
        </span>
      </div>

      {visibleItems.length ? (
        <div className="mt-4 space-y-3">
          {visibleItems.map((item) => (
            <ActionQueueItem key={item.id} item={item} />
          ))}
        </div>
      ) : (
        <RouteStatePanel kind="empty" title={emptyTitle} message={emptyMessage} className="mt-4" />
      )}
    </section>
  )
}

export function ActionQueueItem({ item, className }: { item: ActionQueueItemData; className?: string }) {
  const tone = item.tone ?? "gold"
  const Icon = item.icon ?? CircleDot

  return (
    <article className={cn(dashboardRowClass, "p-3", className)}>
      <div className="flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
        <div className="min-w-0">
          <div className="flex flex-wrap items-center gap-2">
            <StateBadge label={item.riskLabel ?? "Action"} tone={tone} icon={Icon} />
            {item.stateLabel ? <StateBadge label={item.stateLabel} tone="info" /> : null}
            {item.due ? (
              <Badge
                variant="outline"
                className="gap-1.5 rounded-md border-[var(--dash-border-subtle)] text-[var(--dash-text-soft)]"
              >
                <CalendarClock className="h-3.5 w-3.5" aria-hidden="true" />
                {item.due}
              </Badge>
            ) : null}
          </div>
          <h3 className="mt-3 text-sm font-semibold text-[var(--dash-text)]">{item.title}</h3>
          {item.summary ? <p className="mt-1 text-sm leading-6 text-[var(--dash-text-soft)]">{item.summary}</p> : null}
        </div>
        {item.action ? <CommandActionButton action={item.action} size="sm" /> : null}
      </div>

      {item.proof || item.owner || item.disabledReason || item.metadata?.length ? (
        <div className="mt-3 flex flex-wrap items-center gap-2 text-xs">
          {item.proof ? <ProofBadge {...item.proof} /> : null}
          {item.owner ? (
            <Badge variant="outline" className="rounded-md border-[var(--dash-border-subtle)] text-[var(--dash-text-soft)]">
              {item.owner}
            </Badge>
          ) : null}
          {item.disabledReason ? (
            <Badge variant="outline" className={cn("gap-1.5 rounded-md", dashboardToneClass("danger"))}>
              <ShieldAlert className="h-3.5 w-3.5" aria-hidden="true" />
              {item.disabledReason}
            </Badge>
          ) : null}
          {item.metadata?.map((meta) => (
            <Badge key={meta.label} variant="outline" className="rounded-md border-[var(--dash-border-subtle)] text-[var(--dash-text-soft)]">
              {meta.label}: {meta.value}
            </Badge>
          ))}
        </div>
      ) : null}
    </article>
  )
}

export type ProofBadgeState =
  | "verified"
  | "posted"
  | "reconciled"
  | "certified"
  | "operational"
  | "pending"
  | "stale"
  | "blocked"
  | "redacted"
  | "unavailable"

export type ProofBadgeProps = {
  state: ProofBadgeState
  label?: string
  source?: string
  sourceCount?: number
  hashLabel?: string
  href?: string
  onClick?: () => void
  ariaLabel?: string
  className?: string
}

export function ProofBadge({
  state,
  label,
  source,
  sourceCount,
  hashLabel,
  href,
  onClick,
  ariaLabel,
  className,
}: ProofBadgeProps) {
  const tone = proofStateTones[state]
  const badgeClassName = cn(
    "inline-flex min-h-7 max-w-full items-center gap-1.5 rounded-md border px-2.5 py-1 text-xs font-semibold",
    "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--dash-brand)]",
    dashboardToneClass(tone),
    className,
  )
  const content = (
    <>
      <ShieldCheck className="h-3.5 w-3.5 shrink-0" aria-hidden="true" />
      <span className="truncate">{label ?? proofStateLabels[state]}</span>
      {source ? <span className="truncate text-[var(--dash-text-soft)]">/ {source}</span> : null}
      {typeof sourceCount === "number" ? (
        <span className="whitespace-nowrap text-[var(--dash-text-soft)]">
          / {sourceCount} source{sourceCount === 1 ? "" : "s"}
        </span>
      ) : null}
      {hashLabel ? (
        <span className="inline-flex items-center gap-1 whitespace-nowrap text-[var(--dash-text-soft)]">
          <Database className="h-3 w-3" aria-hidden="true" />
          {hashLabel}
        </span>
      ) : null}
    </>
  )

  if (href) {
    return (
      <Link href={href} aria-label={ariaLabel} className={badgeClassName}>
        {content}
      </Link>
    )
  }

  if (onClick) {
    return (
      <button type="button" aria-label={ariaLabel} onClick={onClick} className={badgeClassName}>
        {content}
      </button>
    )
  }

  return (
    <Badge variant="outline" aria-label={ariaLabel} className={badgeClassName}>
      {content}
    </Badge>
  )
}

export type EvidenceTimelineEvent = {
  id: string
  title: string
  summary?: string
  timestamp?: string
  actor?: string
  source?: string
  stateLabel?: string
  tone?: DashboardTone
  proof?: ProofBadgeProps
  href?: string
}

export type EvidenceTimelineProps = {
  events: EvidenceTimelineEvent[]
  title?: string
  detail?: string
  emptyMessage?: string
  className?: string
}

export function EvidenceTimeline({
  events,
  title = "Evidence timeline",
  detail = "Recent trusted events and source updates for this command surface.",
  emptyMessage = "No evidence events are available yet.",
  className,
}: EvidenceTimelineProps) {
  return (
    <section className={cn(dashboardPanelClass, "p-4", className)}>
      <div className="flex flex-col gap-1">
        <h2 className="text-base font-semibold text-[var(--dash-text)]">{title}</h2>
        <p className="text-sm text-[var(--dash-text-soft)]">{detail}</p>
      </div>

      {events.length ? (
        <ol className="mt-4 space-y-3">
          {events.map((event) => (
            <EvidenceTimelineItem key={event.id} event={event} />
          ))}
        </ol>
      ) : (
        <div className={cn(dashboardEmptyClass, "mt-4")}>{emptyMessage}</div>
      )}
    </section>
  )
}

export type FilterChip = {
  id: string
  label: string
  value?: string
  active?: boolean
  href?: string
  onClick?: () => void
}

export type FilterBarProps = {
  title?: string
  detail?: string
  search?: {
    value?: string
    defaultValue?: string
    onChange?: (value: string) => void
    placeholder?: string
    label?: string
  }
  filters?: FilterChip[]
  actions?: CommandCenterAction[]
  children?: ReactNode
  className?: string
}

export function FilterBar({
  title,
  detail,
  search,
  filters = [],
  actions = [],
  children,
  className,
}: FilterBarProps) {
  return (
    <section className={cn(dashboardPanelClass, "p-3", className)}>
      {title || detail ? (
        <div className="mb-3 flex flex-col gap-1">
          {title ? (
            <h2 className="inline-flex items-center gap-2 text-sm font-semibold text-[var(--dash-text)]">
              <Filter className="h-4 w-4 text-[var(--dash-text-soft)]" aria-hidden="true" />
              {title}
            </h2>
          ) : null}
          {detail ? <p className="text-xs text-[var(--dash-text-soft)]">{detail}</p> : null}
        </div>
      ) : null}

      <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
        <div className="flex min-w-0 flex-1 flex-col gap-2 sm:flex-row sm:flex-wrap sm:items-center">
          {search ? (
            <label className="relative min-w-[min(100%,18rem)] flex-1 sm:max-w-xs">
              <span className="sr-only">{search.label ?? "Search command surface"}</span>
              <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-[var(--dash-text-faint)]" aria-hidden="true" />
              <Input
                value={search.value}
                defaultValue={search.defaultValue}
                readOnly={search.value !== undefined && !search.onChange}
                onChange={(event) => search.onChange?.(event.target.value)}
                placeholder={search.placeholder ?? "Search"}
                className="dashboard-control h-10 rounded-lg pl-9"
              />
            </label>
          ) : null}

          {filters.map((filter) => (
            <FilterChipButton key={filter.id} filter={filter} />
          ))}

          {children}
        </div>

        {actions.length ? (
          <div className="flex flex-wrap items-center gap-2">
            {actions.map((action) => (
              <CommandActionButton key={action.label} action={action} size="sm" />
            ))}
          </div>
        ) : null}
      </div>
    </section>
  )
}

export type DetailDrawerProps = {
  title: string
  description?: string
  open?: boolean
  onOpenChange?: (open: boolean) => void
  trigger?: ReactNode
  metadata?: CommandMetadataItem[]
  actions?: CommandCenterAction[]
  children: ReactNode
  className?: string
}

export function DetailDrawer({
  title,
  description,
  open,
  onOpenChange,
  trigger,
  metadata = [],
  actions = [],
  children,
  className,
}: DetailDrawerProps) {
  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      {trigger ? <SheetTrigger asChild>{trigger}</SheetTrigger> : null}
      <SheetContent
        side="right"
        className={cn(
          "enterprise-floating-surface flex h-full w-[min(92vw,42rem)] flex-col overflow-y-auto border-[var(--dash-border-subtle)] bg-[var(--dash-surface)] p-5 text-[var(--dash-text)] sm:max-w-xl",
          className,
        )}
      >
        <SheetHeader className="space-y-2 pr-8 text-left">
          <SheetTitle className="text-lg font-semibold text-[var(--dash-text)]">{title}</SheetTitle>
          {description ? <SheetDescription className="text-sm leading-6 text-[var(--dash-text-soft)]">{description}</SheetDescription> : null}
        </SheetHeader>

        {metadata.length ? (
          <dl className={cn(dashboardRowClass, "mt-4 grid gap-2 p-3 text-xs text-[var(--dash-text-soft)] sm:grid-cols-2")}>
            {metadata.map((item) => (
              <MetaLine key={item.label} item={item} />
            ))}
          </dl>
        ) : null}

        <div className="mt-4 min-h-0 flex-1 space-y-3">{children}</div>

        {actions.length ? (
          <div className="mt-4 flex flex-wrap items-center justify-end gap-2 border-t border-[var(--dash-border-subtle)] pt-4">
            {actions.map((action) => (
              <CommandActionButton key={action.label} action={action} size="sm" />
            ))}
          </div>
        ) : null}
      </SheetContent>
    </Sheet>
  )
}

export type RouteStateKind =
  | "loading"
  | "empty"
  | "error"
  | "partial"
  | "permission_denied"
  | "locked_module"
  | "no_active_org"
  | "stale_session"

export type RouteStatePanelProps = {
  kind: RouteStateKind
  title?: string
  message?: string
  action?: CommandCenterAction
  className?: string
}

const routeStateCopy: Record<RouteStateKind, { title: string; message: string; tone: DashboardTone; icon: LucideIcon }> = {
  loading: {
    title: "Command surface is loading",
    message: "Trusted source data is being prepared.",
    tone: "info",
    icon: Clock3,
  },
  empty: {
    title: "No command data yet",
    message: "This surface needs trusted source activity before it can produce a command view.",
    tone: "info",
    icon: CircleDot,
  },
  error: {
    title: "Command surface could not load",
    message: "The read-only view failed safely. Retry without exposing internal details.",
    tone: "danger",
    icon: AlertTriangle,
  },
  partial: {
    title: "Command data is partial",
    message: "Some source modules are available, but the command view is missing enough proof to be complete.",
    tone: "gold",
    icon: AlertTriangle,
  },
  permission_denied: {
    title: "Permission required",
    message: "The current user does not have the server-side permission required for this command surface.",
    tone: "danger",
    icon: LockKeyhole,
  },
  locked_module: {
    title: "Module unavailable",
    message: "This command surface depends on a module that is not available for the current tenant.",
    tone: "muted",
    icon: LockKeyhole,
  },
  no_active_org: {
    title: "Organization required",
    message: "Choose an active organization before loading this command surface.",
    tone: "gold",
    icon: GitBranch,
  },
  stale_session: {
    title: "Session needs refresh",
    message: "The current session context is stale. Refresh the session before relying on this view.",
    tone: "warning",
    icon: Clock3,
  },
}

export function RouteStatePanel({ kind, title, message, action, className }: RouteStatePanelProps) {
  const state = routeStateCopy[kind]
  const Icon = state.icon

  return (
    <section className={cn(dashboardEmptyClass, "flex flex-col items-center gap-3 text-center", className)}>
      <span className={cn("flex h-12 w-12 items-center justify-center rounded-lg border", dashboardToneClass(state.tone))}>
        <Icon className="h-5 w-5" aria-hidden="true" />
      </span>
      <div className="max-w-xl space-y-1">
        <h2 className="text-sm font-semibold text-[var(--dash-text)]">{title ?? state.title}</h2>
        <p className="text-sm leading-6 text-[var(--dash-text-soft)]">{message ?? state.message}</p>
      </div>
      {action ? <CommandActionButton action={action} size="sm" /> : null}
    </section>
  )
}

export type PermissionLockedStateProps = {
  permission?: string
  moduleLabel?: string
  title?: string
  message?: string
  action?: CommandCenterAction
  className?: string
}

export function PermissionLockedState({
  permission,
  moduleLabel,
  title = "Permission required",
  message,
  action,
  className,
}: PermissionLockedStateProps) {
  const resolvedMessage =
    message ??
    [
      moduleLabel ? `${moduleLabel} is hidden for this permission set.` : "This command surface is hidden for this permission set.",
      permission ? `Required permission: ${permission}.` : null,
    ]
      .filter(Boolean)
      .join(" ")

  return (
    <RouteStatePanel
      kind="permission_denied"
      title={title}
      message={resolvedMessage}
      action={action}
      className={className}
    />
  )
}

function StatusStripCard({ item }: { item: StatusStripItem }) {
  const tone = item.tone ?? (item.state ? dashboardStateTone(item.state) : "info")
  const Icon = item.icon ?? CheckCircle2
  const content = (
    <>
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="truncate text-xs font-semibold uppercase tracking-normal text-[var(--dash-text-soft)]">
            {item.label}
          </p>
          {item.value ? (
            <div className="mt-1 break-words text-lg font-semibold text-[var(--dash-text)]">{item.value}</div>
          ) : null}
        </div>
        <span className={cn("flex h-9 w-9 shrink-0 items-center justify-center rounded-lg border", dashboardToneClass(tone))}>
          <Icon className="h-4 w-4" aria-hidden="true" />
        </span>
      </div>
      {item.detail ? <p className="mt-3 line-clamp-2 text-sm leading-6 text-[var(--dash-text-soft)]">{item.detail}</p> : null}
      {item.source || item.proof ? (
        <div className="mt-3 flex flex-wrap items-center gap-2">
          {item.source ? (
            <Badge variant="outline" className="gap-1.5 rounded-md border-[var(--dash-border-subtle)] text-[var(--dash-text-soft)]">
              <GitBranch className="h-3.5 w-3.5" aria-hidden="true" />
              {item.source}
            </Badge>
          ) : null}
          {item.proof ? <ProofBadge {...item.proof} /> : null}
        </div>
      ) : null}
    </>
  )

  if (item.href) {
    return (
      <Link
        href={item.href}
        className={cn(
          dashboardRowClass,
          "block min-h-[118px] p-3 transition hover:border-[var(--dash-brand)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--dash-brand)]",
        )}
      >
        {content}
      </Link>
    )
  }

  return <article className={cn(dashboardRowClass, "min-h-[118px] p-3")}>{content}</article>
}

function EvidenceTimelineItem({ event }: { event: EvidenceTimelineEvent }) {
  const tone = event.tone ?? "info"
  const content = (
    <div className={cn(dashboardRowClass, "relative p-3 pl-10")}>
      <span className={cn("absolute left-3 top-4 flex h-5 w-5 items-center justify-center rounded-full border", dashboardToneClass(tone))}>
        <span className="h-1.5 w-1.5 rounded-full bg-current" />
      </span>
      <div className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
        <div className="min-w-0">
          <h3 className="text-sm font-semibold text-[var(--dash-text)]">{event.title}</h3>
          {event.summary ? <p className="mt-1 text-sm leading-6 text-[var(--dash-text-soft)]">{event.summary}</p> : null}
        </div>
        {event.stateLabel ? <StateBadge label={event.stateLabel} tone={tone} /> : null}
      </div>
      <div className="mt-3 flex flex-wrap items-center gap-2 text-xs text-[var(--dash-text-soft)]">
        {event.timestamp ? (
          <span className="inline-flex items-center gap-1.5">
            <Clock3 className="h-3.5 w-3.5" aria-hidden="true" />
            {event.timestamp}
          </span>
        ) : null}
        {event.actor ? <span>{event.actor}</span> : null}
        {event.source ? <span>{event.source}</span> : null}
        {event.proof ? <ProofBadge {...event.proof} /> : null}
      </div>
    </div>
  )

  if (event.href) {
    return (
      <li>
        <Link href={event.href} className="block focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--dash-brand)]">
          {content}
        </Link>
      </li>
    )
  }

  return <li>{content}</li>
}

function StateBadge({ label, tone, icon: Icon }: { label: string; tone: DashboardTone; icon?: LucideIcon }) {
  const ResolvedIcon = Icon

  return (
    <Badge variant="outline" className={cn("gap-1.5 rounded-md", dashboardToneClass(tone))}>
      {ResolvedIcon ? <ResolvedIcon className="h-3.5 w-3.5" aria-hidden="true" /> : null}
      {label}
    </Badge>
  )
}

function CommandActionButton({
  action,
  size = "default",
}: {
  action: CommandCenterAction
  size?: "default" | "sm"
}) {
  const Icon = action.icon ?? (action.href ? ArrowUpRight : undefined)
  const className = cn(
    action.variant === "primary"
      ? "dashboard-button-primary"
      : action.variant === "create"
        ? "dashboard-button-create"
        : "dashboard-button-secondary",
    "rounded-lg",
    size === "sm" ? "h-9 px-3 text-xs" : "h-10 px-4",
  )
  const content = (
    <>
      {Icon ? <Icon className="h-4 w-4" aria-hidden="true" /> : null}
      <span className="truncate">{action.label}</span>
    </>
  )

  if (action.href && !action.disabled) {
    return (
      <Button asChild size={size} className={className} aria-label={action.ariaLabel}>
        <Link href={action.href}>{content}</Link>
      </Button>
    )
  }

  return (
    <Button
      type="button"
      size={size}
      disabled={action.disabled || !action.onClick}
      title={action.disabledReason}
      aria-label={action.ariaLabel}
      onClick={action.onClick}
      className={className}
    >
      {content}
    </Button>
  )
}

function MetaLine({ item }: { item: CommandMetadataItem }) {
  const Icon = item.icon

  return (
    <div className="min-w-0">
      <dt className="flex min-w-0 items-center gap-2 font-medium text-[var(--dash-text)]">
        {Icon ? <Icon className="h-3.5 w-3.5 shrink-0 text-[var(--dash-text-faint)]" aria-hidden="true" /> : null}
        <span className="min-w-0 truncate">{item.label}</span>
      </dt>
      <dd className="break-words text-[var(--dash-text-soft)]">{item.value}</dd>
    </div>
  )
}

function FilterChipButton({ filter }: { filter: FilterChip }) {
  const className = cn(
    "dashboard-filter-chip inline-flex h-9 items-center gap-1.5 rounded-lg border px-3 text-xs font-semibold",
    "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--dash-brand)]",
    filter.active && "border-[var(--dash-brand)] bg-[var(--dash-brand-soft)] text-[var(--dash-text)]",
  )
  const content = (
    <>
      <span className="truncate">{filter.label}</span>
      {filter.value ? <span className="text-[var(--dash-text-soft)]">{filter.value}</span> : null}
    </>
  )

  if (filter.href) {
    return (
      <Link href={filter.href} className={className}>
        {content}
      </Link>
    )
  }

  if (filter.onClick) {
    return (
      <button type="button" onClick={filter.onClick} aria-pressed={filter.active || undefined} className={className}>
        {content}
      </button>
    )
  }

  return <span className={className}>{content}</span>
}

function isProofBadgeProps(value: ProofBadgeProps | ReactNode): value is ProofBadgeProps {
  return Boolean(value && typeof value === "object" && "state" in value)
}
