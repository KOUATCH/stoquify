import type { CSSProperties } from "react"

export type DashboardTone = "brand" | "success" | "info" | "gold" | "danger" | "spruce" | "muted"
export type DashboardSeverity = "success" | "info" | "warning" | "critical"

const toneTokens: Record<DashboardTone, { accent: string; soft: string }> = {
  brand: { accent: "var(--dash-brand)", soft: "var(--dash-brand-soft)" },
  success: { accent: "var(--dash-success)", soft: "var(--dash-success-soft)" },
  info: { accent: "var(--dash-info)", soft: "var(--dash-info-soft)" },
  gold: { accent: "var(--dash-gold)", soft: "var(--dash-gold-soft)" },
  danger: { accent: "var(--dash-danger)", soft: "var(--dash-danger-soft)" },
  spruce: { accent: "var(--dash-spruce)", soft: "var(--dash-spruce-soft)" },
  muted: { accent: "var(--dash-text-soft)", soft: "rgba(37,57,67,0.34)" },
}

const severityTone: Record<DashboardSeverity, DashboardTone> = {
  success: "success",
  info: "info",
  warning: "gold",
  critical: "danger",
}

const toneClasses: Record<DashboardTone, string> = {
  brand: "border-[var(--dash-brand)] bg-[var(--dash-brand-soft)] text-[var(--dash-text)]",
  success: "border-[var(--dash-success)] bg-[var(--dash-success-soft)] text-[var(--dash-text)]",
  info: "border-[var(--dash-info)] bg-[var(--dash-info-soft)] text-[var(--dash-text)]",
  gold: "border-[var(--dash-gold)] bg-[var(--dash-gold-soft)] text-[var(--dash-text)]",
  danger: "border-[var(--dash-danger)] bg-[var(--dash-danger-soft)] text-[var(--dash-text)]",
  spruce: "border-[var(--dash-spruce)] bg-[var(--dash-spruce-soft)] text-[var(--dash-text)]",
  muted: "border-[var(--dash-border-subtle)] bg-[rgba(37,57,67,0.34)] text-[var(--dash-text-soft)]",
}

const toneTextClasses: Record<DashboardTone, string> = {
  brand: "text-[var(--dash-brand-strong)]",
  success: "text-[var(--dash-success)]",
  info: "text-[var(--dash-info)]",
  gold: "text-[var(--dash-gold)]",
  danger: "text-[var(--dash-danger)]",
  spruce: "text-[var(--dash-spruce)]",
  muted: "text-[var(--dash-text-soft)]",
}

const toneBgClasses: Record<DashboardTone, string> = {
  brand: "bg-[var(--dash-brand)]",
  success: "bg-[var(--dash-success)]",
  info: "bg-[var(--dash-info)]",
  gold: "bg-[var(--dash-gold)]",
  danger: "bg-[var(--dash-danger)]",
  spruce: "bg-[var(--dash-spruce)]",
  muted: "bg-[var(--dash-text-soft)]",
}

export const dashboardPanelClass = "dashboard-glass-panel rounded-lg text-[var(--dash-text)]"
export const dashboardFilterClass = "dashboard-filter-chip rounded-lg"
export const dashboardControlClass = "dashboard-control h-10 rounded-lg"
export const dashboardMutedTextClass = "text-[var(--dash-text-soft)]"
export const dashboardFaintTextClass = "text-[var(--dash-text-faint)]"
export const dashboardRowClass = "rounded-lg border border-[var(--dash-border-subtle)] bg-[rgba(37,57,67,0.34)]"
export const dashboardEmptyClass = "rounded-lg border border-dashed border-[var(--dash-border-subtle)] p-8 text-center text-sm text-[var(--dash-text-soft)]"

export function dashboardStatStyle(tone: DashboardTone): CSSProperties {
  const tokens = toneTokens[tone]
  return {
    "--stat-accent": tokens.accent,
    "--stat-soft": tokens.soft,
  } as CSSProperties
}

export function dashboardToneClass(tone: DashboardTone) {
  return toneClasses[tone]
}

export function dashboardSeverityClass(severity: DashboardSeverity) {
  return dashboardToneClass(severityTone[severity])
}

export function dashboardValueTone(value: number) {
  if (value < 0) return "text-[var(--dash-danger)]"
  if (value > 0) return "text-[var(--dash-success)]"
  return "text-[var(--dash-text-soft)]"
}

export function dashboardToneText(tone: DashboardTone) {
  return toneTextClasses[tone]
}

export function dashboardToneBg(tone: DashboardTone) {
  return toneBgClasses[tone]
}
