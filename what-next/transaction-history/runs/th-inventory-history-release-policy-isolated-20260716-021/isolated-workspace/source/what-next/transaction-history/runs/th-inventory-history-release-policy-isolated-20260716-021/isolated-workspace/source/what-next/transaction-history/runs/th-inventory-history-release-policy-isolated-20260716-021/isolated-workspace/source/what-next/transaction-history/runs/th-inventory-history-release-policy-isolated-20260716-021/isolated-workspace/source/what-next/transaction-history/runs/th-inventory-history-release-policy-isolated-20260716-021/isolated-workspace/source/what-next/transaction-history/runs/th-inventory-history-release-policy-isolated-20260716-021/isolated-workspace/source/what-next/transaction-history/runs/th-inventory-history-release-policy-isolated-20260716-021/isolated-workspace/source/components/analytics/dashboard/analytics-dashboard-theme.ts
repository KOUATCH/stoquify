import type { CSSProperties } from "react"

export type AnalyticsTone = "brand" | "success" | "info" | "gold" | "danger" | "spruce" | "muted"

const toneTokens: Record<AnalyticsTone, { accent: string; soft: string }> = {
  brand: { accent: "var(--dash-brand)", soft: "var(--dash-brand-soft)" },
  success: { accent: "var(--dash-success)", soft: "var(--dash-success-soft)" },
  info: { accent: "var(--dash-info)", soft: "var(--dash-info-soft)" },
  gold: { accent: "var(--dash-gold)", soft: "var(--dash-gold-soft)" },
  danger: { accent: "var(--dash-danger)", soft: "var(--dash-danger-soft)" },
  spruce: { accent: "var(--dash-spruce)", soft: "var(--dash-spruce-soft)" },
  muted: { accent: "var(--dash-text-soft)", soft: "rgba(37,57,67,0.34)" },
}

const toneClasses: Record<AnalyticsTone, string> = {
  brand: "border-[var(--dash-brand)] bg-[var(--dash-brand-soft)] text-[var(--dash-text)]",
  success: "border-[var(--dash-success)] bg-[var(--dash-success-soft)] text-[var(--dash-text)]",
  info: "border-[var(--dash-info)] bg-[var(--dash-info-soft)] text-[var(--dash-text)]",
  gold: "border-[var(--dash-gold)] bg-[var(--dash-gold-soft)] text-[var(--dash-text)]",
  danger: "border-[var(--dash-danger)] bg-[var(--dash-danger-soft)] text-[var(--dash-text)]",
  spruce: "border-[var(--dash-spruce)] bg-[var(--dash-spruce-soft)] text-[var(--dash-text)]",
  muted: "border-[var(--dash-border-subtle)] bg-[rgba(37,57,67,0.34)] text-[var(--dash-text-soft)]",
}

const toneTextClasses: Record<AnalyticsTone, string> = {
  brand: "text-[var(--dash-brand-strong)]",
  success: "text-[var(--dash-success)]",
  info: "text-[var(--dash-info)]",
  gold: "text-[var(--dash-gold)]",
  danger: "text-[var(--dash-danger)]",
  spruce: "text-[var(--dash-spruce)]",
  muted: "text-[var(--dash-text-soft)]",
}

export const analyticsPageClass = "dashboard-landing-theme dark min-h-screen overflow-x-hidden"
export const analyticsContentClass =
  "dashboard-landing-content mx-auto w-full max-w-[1920px] space-y-6 px-4 py-4 text-[var(--dash-text)] sm:px-6 lg:px-8"
export const analyticsPanelClass = "dashboard-glass-panel rounded-lg text-[var(--dash-text)]"
export const analyticsStatCardClass = "dashboard-stat-card rounded-lg text-[var(--dash-text)]"
export const analyticsRowClass =
  "rounded-lg border border-[var(--dash-border-subtle)] bg-[rgba(37,57,67,0.34)]"
export const analyticsMutedTextClass = "text-[var(--dash-text-soft)]"
export const analyticsFaintTextClass = "text-[var(--dash-text-faint)]"
export const analyticsControlClass = "dashboard-control rounded-lg"
export const analyticsFilterClass = "dashboard-filter-chip rounded-lg"
export const analyticsPrimaryButtonClass = "dashboard-button-primary rounded-lg"

export function analyticsStatStyle(tone: AnalyticsTone): CSSProperties {
  const tokens = toneTokens[tone]
  return {
    "--stat-accent": tokens.accent,
    "--stat-soft": tokens.soft,
  } as CSSProperties
}

export function analyticsToneClass(tone: AnalyticsTone) {
  return toneClasses[tone]
}

export function analyticsToneText(tone: AnalyticsTone) {
  return toneTextClasses[tone]
}

export function analyticsTrendText(isPositive: boolean) {
  return isPositive ? toneTextClasses.success : toneTextClasses.danger
}

export function analyticsAlertTone(type: string): AnalyticsTone {
  if (type === "warning") return "danger"
  if (type === "success") return "success"
  return "info"
}

export function analyticsStockTone(status: string): AnalyticsTone {
  if (status === "in_stock") return "success"
  if (status === "low_stock") return "gold"
  if (status === "out_of_stock") return "danger"
  return "muted"
}
