import { useTranslations } from "next-intl"
import { Activity, BadgeCheck, Boxes, CircleDollarSign, FileCheck2, ShieldCheck } from "lucide-react"

const rows = [
  { key: "revenue", tone: "up", Icon: CircleDollarSign },
  { key: "pos", tone: "warn", Icon: Activity },
  { key: "turns", tone: "info", Icon: FileCheck2 },
  { key: "variance", tone: "up", Icon: ShieldCheck },
]

const branches = [
  ["downtown", "97%", "bg-[var(--signal-up)]"],
  ["warehouse", "88%", "bg-[var(--accent)]"],
  ["airport", "74%", "bg-[var(--signal-warn)]"],
]

const activity = [
  ["09:42", "sale", "$812.40"],
  ["09:39", "transfer", "B-03"],
  ["09:31", "po", "SUP-18"],
]

export function HeroDashboard() {
  const t = useTranslations("landing.dashboard")

  return (
    <div className="frame-glow hero-command min-w-0 rounded-lg border border-[var(--color-border-subtle)] bg-[var(--color-surface-panel)]/92 p-3 shadow-2xl shadow-black/30">
      <div className="relative overflow-hidden rounded-lg border border-[var(--color-border-subtle)] bg-[var(--color-surface-deep)] p-4 sm:p-5">
        <div className="command-center-beam" aria-hidden="true" />
        <div className="relative flex items-center justify-between border-b border-[var(--color-border-subtle)] pb-4">
          <div className="min-w-0">
            <div className="data-text text-xs uppercase text-[var(--accent-hi)]">{t("period")}</div>
            <div className="mt-1 body-text text-lg font-semibold text-[var(--color-text-primary)] sm:text-xl">{t("title")}</div>
          </div>
          <div className="inline-flex items-center gap-2 rounded-lg bg-black/[0.15] px-3 py-1 data-text text-xs text-[var(--color-success)]">
            <BadgeCheck className="size-3.5" aria-hidden="true" />
            {t("synced")}
          </div>
        </div>
        <div className="relative mt-5 grid gap-3 sm:grid-cols-2">
          {rows.map(({ key, tone, Icon }) => (
            <div key={key} className="rounded-lg border border-[var(--color-border-subtle)] bg-white/[0.04] p-4 transition hover:border-[var(--color-border-muted)] hover:bg-white/[0.06]">
              <div className="flex items-start justify-between gap-3">
                <div className="body-text text-sm text-[var(--color-text-tertiary)]">{t(`rows.${key}.label`)}</div>
                <Icon className={`size-4 shrink-0 ${tone === "warn" ? "text-[var(--signal-warn)]" : tone === "up" ? "text-[var(--signal-up)]" : "text-[var(--signal-info)]"}`} aria-hidden="true" />
              </div>
              <div className="mt-3 data-text text-2xl font-semibold text-[var(--color-text-primary)]">{t(`rows.${key}.value`)}</div>
              <div className={`mt-2 data-text text-xs ${tone === "warn" ? "text-[var(--signal-warn)]" : tone === "up" ? "text-[var(--signal-up)]" : "text-[var(--signal-info)]"}`}>{t(`rows.${key}.meta`)}</div>
            </div>
          ))}
        </div>
        <div className="relative mt-5 rounded-lg border border-[var(--color-border-subtle)] bg-black/[0.15] p-4">
          <div className="mb-3 flex items-center justify-between data-text text-xs text-[var(--color-text-tertiary)]">
            <span className="inline-flex items-center gap-2">
              <Boxes className="size-3.5 text-[var(--color-spruce)]" aria-hidden="true" />
              {t("inventoryHealth")}
            </span>
            <span>92%</span>
          </div>
          <div className="h-3 overflow-hidden rounded bg-white/10">
            <div className="h-full w-[92%] rounded bg-gradient-to-r from-[var(--color-brand)] via-[var(--color-spruce)] to-[var(--color-success)]" />
          </div>
          <div className="mt-4 space-y-3">
            {branches.map(([name, score, color]) => (
              <div key={name} className="grid grid-cols-[6rem_1fr_3rem] items-center gap-3 data-text text-xs text-[var(--color-text-tertiary)]">
                <span>{t(`branches.${name}`)}</span>
                <span className="h-1.5 rounded bg-white/10">
                  <span className={`block h-full rounded ${color}`} style={{ width: score }} />
                </span>
                <span className="text-right text-[var(--color-text-secondary)]">{score}</span>
              </div>
            ))}
          </div>
        </div>
        <div className="relative mt-5 grid gap-3 sm:grid-cols-[1.2fr_0.8fr]">
          <div className="rounded-lg border border-[var(--color-border-subtle)] bg-white/[0.035] p-4">
            <div className="data-text text-xs uppercase text-[var(--color-text-tertiary)]">{t("nextActionLabel")}</div>
            <div className="mt-3 body-text text-sm font-semibold text-[var(--color-text-primary)]">{t("nextAction")}</div>
            <div className="mt-4 h-2 rounded bg-white/10">
              <div className="h-full w-2/3 rounded bg-[var(--signal-warn)]" />
            </div>
          </div>
          <div className="rounded-lg border border-[var(--color-border-subtle)] bg-[var(--color-brand-soft)] p-4">
            <div className="data-text text-xs text-[var(--accent-hi)]">{t("liveFeed")}</div>
            <div className="mt-3 space-y-2">
              {activity.map(([time, event, value]) => (
                <div key={`${time}-${event}`} className="grid grid-cols-[2.5rem_1fr] gap-2 data-text text-[0.68rem] text-[var(--color-text-tertiary)]">
                  <span>{time}</span>
                  <span>{t(`activity.${event}`)} <span className="text-[var(--color-text-secondary)]">{value}</span></span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
