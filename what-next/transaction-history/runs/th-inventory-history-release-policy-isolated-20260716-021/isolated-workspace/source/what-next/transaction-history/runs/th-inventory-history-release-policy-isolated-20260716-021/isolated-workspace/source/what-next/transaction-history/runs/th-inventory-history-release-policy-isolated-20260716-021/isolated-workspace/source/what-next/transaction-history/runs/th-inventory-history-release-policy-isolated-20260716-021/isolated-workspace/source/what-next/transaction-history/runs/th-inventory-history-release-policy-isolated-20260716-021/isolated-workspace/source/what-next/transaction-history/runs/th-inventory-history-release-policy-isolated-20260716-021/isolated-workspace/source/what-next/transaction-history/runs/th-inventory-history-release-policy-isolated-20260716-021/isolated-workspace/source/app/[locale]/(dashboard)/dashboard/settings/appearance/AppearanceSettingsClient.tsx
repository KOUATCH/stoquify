"use client"

import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import type { Locale } from "@/types/bilingual"
import { CheckCircle2, Monitor, Moon, Palette, Sun } from "lucide-react"
import type { LucideIcon } from "lucide-react"
import { useTheme } from "next-themes"
import { useEffect, useMemo, useState } from "react"

type ThemeMode = "system" | "light" | "dark"

const copy = {
  en: {
    title: "Appearance",
    subtitle: "Theme mode reflects the current next-themes provider configuration.",
    mode: "Theme mode",
    active: "Active",
    resolved: "Resolved theme",
    provider: "Provider",
    strategy: "Class strategy",
    system: "System preference",
    systemEnabled: "Enabled",
    stored: "Stored preference",
    browserLocal: "Browser local storage",
    light: "Light",
    dark: "Dark",
    systemMode: "System",
    availableNow: "Available now",
    notConfigured: "Not configured",
    paletteState: "Custom palettes, density, and layout presets do not have a persisted settings model yet.",
  },
  fr: {
    title: "Apparence",
    subtitle: "Le mode theme reflete la configuration actuelle du provider next-themes.",
    mode: "Mode theme",
    active: "Actif",
    resolved: "Theme resolu",
    provider: "Provider",
    strategy: "Strategie class",
    system: "Preference systeme",
    systemEnabled: "Activee",
    stored: "Preference stockee",
    browserLocal: "Stockage local navigateur",
    light: "Clair",
    dark: "Sombre",
    systemMode: "Systeme",
    availableNow: "Disponible maintenant",
    notConfigured: "Non configure",
    paletteState: "Les palettes personnalisees, la densite et les presets layout n'ont pas encore de modele persistant.",
  },
} as const

function labels(locale: Locale) {
  return copy[locale]
}

const modes: Array<{ value: ThemeMode; icon: LucideIcon; color: string }> = [
  { value: "light", icon: Sun, color: "text-[#ffd89a]" },
  { value: "dark", icon: Moon, color: "text-[#8fb7ff]" },
  { value: "system", icon: Monitor, color: "text-[#7de8dc]" },
]

export default function AppearanceSettingsClient({ locale }: { locale: Locale }) {
  const t = labels(locale)
  const { theme, resolvedTheme, systemTheme, setTheme } = useTheme()
  const [mounted, setMounted] = useState(false)

  useEffect(() => {
    setMounted(true)
  }, [])

  const activeTheme = useMemo<ThemeMode>(() => {
    if (!mounted) return "system"
    if (theme === "light" || theme === "dark" || theme === "system") return theme
    return "system"
  }, [mounted, theme])

  const resolved = mounted ? resolvedTheme ?? systemTheme ?? "system" : "system"

  return (
    <div className="grid gap-6 lg:grid-cols-[minmax(0,1.15fr)_minmax(20rem,0.85fr)]">
      <section className="rounded-lg border border-[var(--dash-border-subtle)] bg-[var(--dash-surface)] p-5 shadow-[0_18px_45px_rgba(5,12,16,0.18)]">
        <div className="flex items-start gap-3">
          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-[rgba(47,125,246,0.16)] text-[#8fb7ff]">
            <Palette className="h-5 w-5" />
          </div>
          <div className="min-w-0">
            <div className="text-xs font-bold uppercase tracking-[0.18em] text-[var(--dash-text-soft)]">
              {t.availableNow}
            </div>
            <h1 className="mt-2 text-2xl font-semibold text-[var(--dash-text)] sm:text-3xl">{t.title}</h1>
            <p className="mt-2 text-sm leading-6 text-[var(--dash-text-soft)]">{t.subtitle}</p>
          </div>
        </div>

        <div className="mt-6">
          <p className="text-sm font-semibold text-[var(--dash-text)]">{t.mode}</p>
          <div className="mt-3 grid gap-3 sm:grid-cols-3">
            {modes.map((mode) => {
              const Icon = mode.icon
              const isActive = activeTheme === mode.value
              const label =
                mode.value === "light" ? t.light : mode.value === "dark" ? t.dark : t.systemMode

              return (
                <Button
                  key={mode.value}
                  type="button"
                  variant="outline"
                  aria-pressed={isActive}
                  onClick={() => setTheme(mode.value)}
                  className={
                    isActive
                      ? "h-24 rounded-lg border-[#2dd4bf]/40 bg-[rgba(45,212,191,0.14)] text-[#d9fffb] hover:bg-[rgba(45,212,191,0.18)]"
                      : "h-24 rounded-lg border-white/10 bg-white/[0.04] text-[var(--dash-text)] hover:bg-white/[0.075]"
                  }
                >
                  <span className="flex flex-col items-center gap-2">
                    <Icon className={`h-5 w-5 ${mode.color}`} />
                    <span className="font-semibold">{label}</span>
                    {isActive ? <CheckCircle2 className="h-4 w-4 text-[#2dd4bf]" /> : null}
                  </span>
                </Button>
              )
            })}
          </div>
        </div>
      </section>

      <section className="rounded-lg border border-[var(--dash-border-subtle)] bg-[var(--dash-surface)] p-5">
        <div className="flex items-center justify-between gap-3">
          <h2 className="text-lg font-semibold text-[var(--dash-text)]">{t.active}</h2>
          <Badge variant="outline" className="border-[#2dd4bf]/35 bg-[rgba(45,212,191,0.12)] text-[#b5f5ee]">
            {activeTheme === "light" ? t.light : activeTheme === "dark" ? t.dark : t.systemMode}
          </Badge>
        </div>

        <div className="mt-5 grid gap-3">
          <StateRow label={t.resolved} value={resolved} />
          <StateRow label={t.provider} value="next-themes" />
          <StateRow label={t.strategy} value="class" />
          <StateRow label={t.system} value={t.systemEnabled} />
          <StateRow label={t.stored} value={t.browserLocal} />
        </div>

        <div className="mt-5 rounded-lg border border-white/10 bg-white/[0.04] p-4">
          <div className="flex items-center gap-2">
            <Badge variant="outline" className="border-[#f59e0b]/35 bg-[rgba(245,158,11,0.12)] text-[#ffd89a]">
              {t.notConfigured}
            </Badge>
          </div>
          <p className="mt-3 text-sm leading-6 text-[var(--dash-text-soft)]">{t.paletteState}</p>
        </div>
      </section>
    </div>
  )
}

function StateRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-center justify-between gap-4 rounded-lg border border-white/10 bg-white/[0.04] px-3 py-2.5">
      <span className="text-sm text-[var(--dash-text-soft)]">{label}</span>
      <span className="text-right text-sm font-semibold capitalize text-[var(--dash-text)]">{value}</span>
    </div>
  )
}
