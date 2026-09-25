"use client"

import { useCallback, useEffect, useId, useMemo, useRef, useState } from "react"
import { Link } from "@/i18n/navigation"
import type { Locale } from "@/types/bilingual"
import { cn } from "@/lib/utils"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Textarea } from "@/components/ui/textarea"
import {
  AlertCircle,
  ArrowLeft,
  ArrowRight,
  Building2,
  CalendarDays,
  Check,
  Clock3,
  FileText,
  Globe2,
  Loader2,
  MapPin,
  ShieldCheck,
  Sparkles,
  Users,
} from "lucide-react"
import type { LucideIcon } from "lucide-react"
import { stepUpWithPasswordAction } from "@/actions/security/step-up-auth.actions"
import {
  useOrganizationSettings,
  useUpdateOrganizationSettings,
  OrganizationSettingsWorkflowError,
  organizationSettingsError,
} from "@/hooks/useOrganizationSettings"

interface OrganizationSettingsFormProps {
  organizationId: string
  locale?: Locale
}

type StepId = "identity" | "regional" | "calendar" | "review"

type FormState = {
  name: string
  industry: string
  country: string
  state: string
  address: string
  currency: string
  timezone: string
  defaultLocale: Locale
  fiscalYearStart: string
  inventoryStartDate: string
}

const TIMEZONES = [
  { value: "Africa/Douala", label: "Africa/Douala" },
  { value: "Africa/Lagos", label: "Africa/Lagos" },
  { value: "Africa/Abidjan", label: "Africa/Abidjan" },
  { value: "Africa/Nairobi", label: "Africa/Nairobi" },
  { value: "Europe/Paris", label: "Europe/Paris" },
  { value: "Europe/London", label: "Europe/London" },
  { value: "UTC", label: "UTC" },
  { value: "America/New_York", label: "America/New_York" },
]

const FISCAL_YEAR_OPTIONS = [
  { value: "01-01", label: "January 1", labelFr: "1er janvier" },
  { value: "04-01", label: "April 1", labelFr: "1er avril" },
  { value: "07-01", label: "July 1", labelFr: "1er juillet" },
  { value: "10-01", label: "October 1", labelFr: "1er octobre" },
]

const dashboardSettingsPath = (segment: "locations" | "users" | "roles") =>
  `/${["dashboard", "settings", segment].join("/")}`

const INDUSTRIES = [
  "Retail",
  "Wholesale",
  "Restaurant",
  "Pharmacy",
  "Manufacturing",
  "Services",
  "Distribution",
]
const industryFrench: Record<string, string> = { Retail: "Commerce de détail", Wholesale: "Commerce de gros", Restaurant: "Restauration", Pharmacy: "Pharmacie", Manufacturing: "Fabrication", Services: "Services", Distribution: "Distribution" }

const copy = {
  en: {
    loadingTitle: "Loading organization",
    loadingBody: "Fetching the current operating profile.",
    errorTitle: "Organization unavailable",
    eyebrow: "Organization workflow",
    title: "Company DNA",
    subtitle: "Keep the business identity, locale, calendar, and regional defaults aligned across Stoquify.",
    live: "Saved organization profile",
    draft: "Unsaved draft",
    readOnly: "You can view this profile. Updating it requires organization settings permission.",
    retry: "Try loading again",
    stale: "A newer saved version is available. Your entries have been kept.",
    loadLatest: "Load latest for comparison",
    savedValue: "Saved value",
    draftValue: "Your draft",
    keepDraft: "Keep my edits and review",
    useSaved: "Use the saved version",
    password: "Current password",
    verify: "Confirm identity",
    verified: "Identity confirmed. Review your changes and save again.",
    verifyFailed: "Your identity could not be confirmed. Check your password and try again.",
    rateLimited: "Too many attempts. Wait before trying again.",
    saved: "The organization profile was saved.",
    calendarHelp: "These are operating defaults. They do not create or reopen an accounting period, verify country setup, or convert existing amounts.",
    currencyHelp: "Currency was set when this organization was created. Changing it requires a controlled currency migration to protect existing amounts and records.",
    updated: "Updated",
    notSet: "Not set",
    profile: "Profile",
    configured: "Profile fields filled",
    users: "Users",
    locations: "Locations",
    roles: "Roles",
    open: "Open",
    previous: "Previous",
    next: "Next",
    save: "Save organization",
    saving: "Saving",
    requiredTitle: "Required field",
    requiredBody: "Organization name is required before this workflow can be saved.",
    steps: {
      identity: {
        title: "Identity",
        description: "Legal name and operating category",
      },
      regional: {
        title: "Regional",
        description: "Country, currency, timezone, and language",
      },
      calendar: {
        title: "Calendar",
        description: "Fiscal year and stock opening point",
      },
      review: {
        title: "Review",
        description: "Confirm the operating record",
      },
    },
    fields: {
      name: "Organization name",
      industry: "Industry",
      country: "Country",
      state: "State or province",
      address: "Business address",
      currency: "Default currency",
      timezone: "Timezone",
      defaultLocale: "Default language",
      fiscalYearStart: "Fiscal year start",
      inventoryStartDate: "Inventory start date",
    },
    placeholders: {
      name: "Acme Retail Group",
      industry: "Select an industry",
      country: "Cameroon",
      state: "Centre",
      address: "Street, city, postal code",
    },
    sections: {
      identity: "Business identity",
      regional: "Regional defaults",
      calendar: "Operating calendar",
      review: "Review record",
      related: "Connected setup",
    },
    review: {
      identity: "Identity",
      region: "Region",
      finance: "Finance",
      calendar: "Calendar",
    },
  },
  fr: {
    loadingTitle: "Chargement de l'organisation",
    loadingBody: "Récupération du profil opérationnel.",
    errorTitle: "Organisation indisponible",
    eyebrow: "Flux organisation",
    title: "ADN entreprise",
    subtitle: "Gardez l’identité, la langue, le calendrier et les paramètres régionaux alignés dans Stoquify.",
    live: "Profil enregistré",
    draft: "Brouillon non enregistré",
    readOnly: "Vous pouvez consulter ce profil. Sa modification nécessite le droit de gérer les paramètres de l’organisation.",
    retry: "Réessayer le chargement",
    stale: "Une version enregistrée plus récente est disponible. Vos saisies sont conservées.",
    loadLatest: "Charger la dernière version pour comparer",
    savedValue: "Valeur enregistrée",
    draftValue: "Votre brouillon",
    keepDraft: "Conserver mes modifications et vérifier",
    useSaved: "Utiliser la version enregistrée",
    password: "Mot de passe actuel",
    verify: "Confirmer mon identité",
    verified: "Identité confirmée. Vérifiez vos modifications et enregistrez à nouveau.",
    verifyFailed: "Votre identité n’a pas pu être confirmée. Vérifiez votre mot de passe et réessayez.",
    rateLimited: "Trop de tentatives. Patientez avant de réessayer.",
    saved: "Le profil de l’organisation a été enregistré.",
    calendarHelp: "Ces paramètres sont des valeurs opérationnelles. Ils ne créent ni ne rouvrent une période comptable, ne valident pas la configuration du pays et ne convertissent pas les montants existants.",
    currencyHelp: "La devise a été définie lors de la création de l’organisation. Sa modification nécessite une migration contrôlée pour préserver les montants et les pièces existants.",
    updated: "Mis à jour",
    notSet: "Non défini",
    profile: "Profil",
    configured: "Champs du profil remplis",
    users: "Utilisateurs",
    locations: "Lieux",
    roles: "Rôles",
    open: "Ouvrir",
    previous: "Retour",
    next: "Suivant",
    save: "Enregistrer l'organisation",
    saving: "Enregistrement",
    requiredTitle: "Champ requis",
    requiredBody: "Le nom de l'organisation est requis avant l'enregistrement.",
    steps: {
      identity: {
        title: "Identité",
        description: "Nom légal et catégorie d’activité",
      },
      regional: {
        title: "Régional",
        description: "Pays, devise, fuseau horaire et langue",
      },
      calendar: {
        title: "Calendrier",
        description: "Exercice fiscal et point de départ du stock",
      },
      review: {
        title: "Revue",
        description: "Confirmer le dossier opérationnel",
      },
    },
    fields: {
      name: "Nom de l'organisation",
      industry: "Secteur",
      country: "Pays",
      state: "Région ou province",
      address: "Adresse professionnelle",
      currency: "Devise par défaut",
      timezone: "Fuseau horaire",
      defaultLocale: "Langue par défaut",
      fiscalYearStart: "Début d’exercice",
      inventoryStartDate: "Date de départ du stock",
    },
    placeholders: {
      name: "Acme Retail Group",
      industry: "Sélectionner un secteur",
      country: "Cameroun",
      state: "Centre",
      address: "Rue, ville, code postal",
    },
    sections: {
      identity: "Identité de l’entreprise",
      regional: "Paramètres régionaux",
      calendar: "Calendrier opérationnel",
      review: "Revue du dossier",
      related: "Configuration associée",
    },
    review: {
      identity: "Identité",
      region: "Région",
      finance: "Finance",
      calendar: "Calendrier",
    },
  },
} as const

function toDateInput(value: Date | string | null | undefined) {
  if (!value) return ""
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return ""
  return date.toISOString().slice(0, 10)
}

function normalizeLocale(value: unknown): Locale {
  return value === "FR" || value === "fr" ? "fr" : "en"
}

function formatDate(value: Date | string | null | undefined, locale: Locale) {
  if (!value) return copy[locale].notSet
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return copy[locale].notSet
  return new Intl.DateTimeFormat(locale, { dateStyle: "medium", timeStyle: "short" }).format(date)
}

export default function OrganizationSettingsForm({
  organizationId, locale = "en",
}: OrganizationSettingsFormProps) {
  return <OrganizationProfileEditor key={organizationId} organizationId={organizationId} locale={locale} />
}

function OrganizationProfileEditor({
  organizationId,
  locale = "en",
}: OrganizationSettingsFormProps) {
  const t = copy[locale]
  const id = useId()
  const busy = useRef(false)
  const feedback = useRef<HTMLDivElement>(null)
  const [baseline, setBaseline] = useState<{ revision: string; data: FormState } | null>(null)
  const [comparison, setComparison] = useState<{ revision: string; data: FormState } | null>(null)
  const [message, setMessage] = useState<string | null>(null)
  const [failureCode, setFailureCode] = useState<string | null>(null)
  const [needsVerification, setNeedsVerification] = useState(false)
  const [password, setPassword] = useState("")
  const [verifying, setVerifying] = useState(false)
  const [activeStep, setActiveStep] = useState<StepId>("identity")
  const [formData, setFormData] = useState<FormState>({
    name: "",
    industry: "",
    country: "",
    state: "",
    address: "",
    currency: "XAF",
    timezone: "Africa/Douala",
    defaultLocale: locale,
    fiscalYearStart: "01-01",
    inventoryStartDate: "",
  })

  const {
    data: organization,
    isLoading,
    isError,
    refetch,
    isFetching,
  } = useOrganizationSettings(organizationId)

  const updateOrganizationMutation = useUpdateOrganizationSettings(locale)
  const steps = useMemo(
    () => ([
      { id: "identity", icon: Building2, accent: "var(--dash-brand)", soft: "var(--dash-brand-soft)" },
      { id: "regional", icon: Globe2, accent: "var(--dash-spruce)", soft: "var(--dash-spruce-soft)" },
      { id: "calendar", icon: CalendarDays, accent: "var(--dash-gold)", soft: "var(--dash-gold-soft)" },
      { id: "review", icon: FileText, accent: "var(--dash-gold)", soft: "var(--dash-gold-soft)" },
    ] as const),
    [],
  )

  const activeIndex = steps.findIndex((step) => step.id === activeStep)
  const completedFields = [
    formData.name,
    formData.industry,
    formData.country,
    formData.address,
    formData.currency,
    formData.timezone,
    formData.defaultLocale,
    formData.fiscalYearStart,
  ].filter(Boolean).length
  const profileScore = Math.round((completedFields / 8) * 100)

  const dirty = baseline !== null && JSON.stringify(formData) !== JSON.stringify(baseline.data)
  const canUpdate = organization?.canUpdate === true
  const pending = updateOrganizationMutation.isPending || verifying
  const stale = Boolean(baseline && organization && new Date(organization.updatedAt).toISOString() !== baseline.revision)
  const changedFields = baseline ? (Object.keys(formData) as Array<keyof FormState>).filter(key => formData[key] !== baseline.data[key]) : []

  const profile = useCallback((record: NonNullable<typeof organization>) => ({
    revision: new Date(record.updatedAt).toISOString(),
    data: {
      name: record.name || "", industry: record.industry || "", country: record.country || "",
      state: record.state || "", address: record.address || "", currency: record.currency,
      timezone: record.timezone, defaultLocale: normalizeLocale(record.defaultLocale),
      fiscalYearStart: record.fiscalYearStart || "", inventoryStartDate: toDateInput(record.inventoryStartDate),
    },
  }), [])

  useEffect(() => {
    if (!organization || (baseline && dirty)) return
    const next = profile(organization)
    if (next.revision !== baseline?.revision) { setBaseline(next); setFormData(next.data) }
  }, [organization, baseline, dirty, profile])

  useEffect(() => { if (message) feedback.current?.focus() }, [message])

  const updateField = <K extends keyof FormState>(field: K, value: FormState[K]) => {
    if (pending || !canUpdate) return
    setMessage(null)
    setFormData((current) => ({ ...current, [field]: value }))
  }

  const goNext = () => {
    if (activeIndex < steps.length - 1) {
      setActiveStep(steps[activeIndex + 1].id)
    }
  }

  const goBack = () => {
    if (activeIndex > 0) {
      setActiveStep(steps[activeIndex - 1].id)
    }
  }

  const submit = async () => {
    if (busy.current || !baseline || !canUpdate || !dirty || stale || comparison || needsVerification) return
    if (!formData.name.trim()) {
      setMessage(t.requiredBody); setFailureCode("VALIDATION_ERROR")
      setActiveStep("identity")
      return
    }

    busy.current = true; setMessage(null); setFailureCode(null)
    try {
    const saved = await updateOrganizationMutation.mutateAsync({
      organizationId,
      expectedUpdatedAt: baseline.revision,
      data: Object.fromEntries(changedFields.map(key => [key, key === "inventoryStartDate" ? (formData.inventoryStartDate ? new Date(formData.inventoryStartDate) : null) : formData[key]])),
    })
    const next = profile({ ...saved, canUpdate })
    setBaseline(next); setFormData(next.data); setMessage(t.saved)
    } catch (error) {
      const code = error instanceof OrganizationSettingsWorkflowError ? error.code : "UNCERTAIN"
      setFailureCode(code); setMessage(organizationSettingsError(code, locale))
      if (code === "FRESH_AUTH_REQUIRED") setNeedsVerification(true)
    } finally { busy.current = false }
  }

  async function loadLatest() {
    if (busy.current) return
    busy.current = true
    try {
      const result = await refetch()
      if (!result.data || result.isError) { setFailureCode("UNCERTAIN"); setMessage(t.errorTitle); return }
      setComparison(profile(result.data)); setMessage(null)
    } finally { busy.current = false }
  }

  function resolveComparison(keepEdits: boolean) {
    if (!comparison) return
    const next = { ...comparison.data }
    if (keepEdits) for (const field of changedFields) Object.assign(next, { [field]: formData[field] })
    setBaseline(comparison); setFormData(next); setComparison(null); setFailureCode(null); setMessage(null); setActiveStep("review")
  }

  async function confirmIdentity() {
    if (busy.current || !password) return
    busy.current = true; setVerifying(true); setMessage(null)
    try {
      const result = await stepUpWithPasswordAction({ password })
      if (result.success) { setNeedsVerification(false); setFailureCode(null); setMessage(t.verified) }
      else { setFailureCode(result.code); setMessage(result.code === "RATE_LIMITED" ? t.rateLimited : t.verifyFailed) }
    } catch { setFailureCode("UNCERTAIN"); setMessage(t.verifyFailed) }
    finally { setPassword(""); busy.current = false; setVerifying(false) }
  }

  if (isLoading) {
    return (
      <Card className="dashboard-glass-panel rounded-lg text-[var(--dash-text)]">
        <CardContent className="flex items-center justify-center py-16">
          <div className="flex flex-col items-center gap-4 text-center">
            <Loader2 className="h-8 w-8 animate-spin motion-reduce:animate-none text-[var(--dash-brand-strong)]" aria-hidden="true" />
            <div>
              <p className="font-semibold">{t.loadingTitle}</p>
              <p className="mt-1 text-sm text-[var(--dash-text-soft)]">{t.loadingBody}</p>
            </div>
          </div>
        </CardContent>
      </Card>
    )
  }

  if ((!organization || !baseline) && !isLoading) {
    return (
      <Card className="dashboard-glass-panel rounded-lg text-[var(--dash-text)]">
        <CardContent className="flex items-start gap-3 p-6">
          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-[var(--dash-danger-soft)] text-[var(--dash-danger)]">
            <AlertCircle className="h-5 w-5" />
          </div>
          <div>
            <p className="font-semibold">{t.errorTitle}</p>
            <p role="alert" className="mt-1 text-sm text-[var(--dash-text-soft)]">{t.loadingBody}</p>
            <Button type="button" onClick={() => refetch()} disabled={isFetching} className="dashboard-button-secondary mt-3">{t.retry}</Button>
          </div>
        </CardContent>
      </Card>
    )
  }

  return (
    <div className="grid min-w-0 gap-5 xl:grid-cols-[280px_minmax(0,1fr)]">
      <aside className="space-y-4">
        <Card className="dashboard-glass-panel overflow-hidden rounded-lg text-[var(--dash-text)]">
          <CardHeader className="border-b border-[var(--dash-border-subtle)] pb-4">
            <CardTitle className="flex items-center gap-2 text-base">
              <Sparkles className="h-4 w-4 text-[var(--dash-gold)]" />
              {t.profile}
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4 p-4">
            <div className="dashboard-stat-card relative min-h-28 overflow-hidden rounded-lg p-4">
              <div className="absolute inset-x-0 top-0 h-1 bg-[var(--dash-spruce)]" />
              <p className="text-xs font-semibold uppercase tracking-[0.12em] text-[var(--dash-text-faint)]">
                {t.configured}
              </p>
              <p className="mt-3 text-3xl font-semibold text-[var(--dash-text)]">{profileScore}%</p>
              <div className="mt-3 h-2 overflow-hidden rounded-full bg-[rgba(255,255,255,0.08)]">
                <div
                  className="h-full rounded-full bg-gradient-to-r from-[var(--dash-brand)] via-[var(--dash-spruce)] to-[var(--dash-gold)]"
                  style={{ width: `${profileScore}%` }}
                />
              </div>
            </div>

            <div className="space-y-2">
              {steps.map((step) => {
                const Icon = step.icon
                const active = step.id === activeStep
                return (
                  <button
                    key={step.id}
                    type="button"
                    aria-current={active ? "step" : undefined}
                    disabled={pending}
                    onClick={() => setActiveStep(step.id)}
                    className={cn(
                      "flex w-full min-w-0 items-start gap-3 rounded-lg border px-3 py-3 text-left transition",
                      active
                        ? "border-[var(--dash-brand)] bg-[var(--dash-brand-soft)]"
                        : "border-[var(--dash-border-subtle)] bg-[rgba(37,57,67,0.42)] hover:border-[var(--dash-border)] hover:bg-[rgba(45,68,77,0.64)]",
                    )}
                  >
                    <span
                      className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg"
                      style={{ background: step.soft, color: step.accent }}
                    >
                      <Icon className="h-4 w-4" aria-hidden="true" />
                    </span>
                    <span className="min-w-0">
                      <span className="block text-sm font-semibold text-[var(--dash-text)]">
                        {t.steps[step.id].title}
                      </span>
                      <span className="mt-1 block text-xs leading-5 text-[var(--dash-text-soft)]">
                        {t.steps[step.id].description}
                      </span>
                    </span>
                  </button>
                )
              })}
            </div>
          </CardContent>
        </Card>

        <Card className="dashboard-glass-panel rounded-lg text-[var(--dash-text)]">
          <CardHeader className="pb-3">
            <CardTitle className="text-sm">{t.sections.related}</CardTitle>
          </CardHeader>
          <CardContent className="grid gap-2 p-4 pt-0">
            <RelatedLink href={dashboardSettingsPath("locations")} label={t.locations} icon={MapPin} locale={locale} />
            <RelatedLink href={dashboardSettingsPath("users")} label={t.users} icon={Users} locale={locale} />
            <RelatedLink href={dashboardSettingsPath("roles")} label={t.roles} icon={ShieldCheck} locale={locale} />
          </CardContent>
        </Card>
      </aside>

      <Card className="dashboard-glass-panel min-w-0 overflow-hidden rounded-lg text-[var(--dash-text)]">
        <div className="border-b border-[var(--dash-border-subtle)] bg-[rgba(12,20,24,0.58)] px-5 py-4 sm:px-6">
          <div className="flex min-w-0 flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
            <div className="min-w-0">
              <div className="dashboard-eyebrow mb-4">
                <FileText className="h-4 w-4" aria-hidden="true" />
                {dirty ? t.draft : t.live}
              </div>
              <div className="flex min-w-0 items-start gap-4">
                <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-lg border border-[var(--dash-border-subtle)] bg-[var(--dash-brand-soft)] shadow-[0_16px_34px_rgba(47,125,246,0.18)]">
                  <Building2 className="h-6 w-6 text-[var(--dash-brand-strong)]" />
                </div>
                <div className="min-w-0">
                  <h2 className="text-2xl font-semibold tracking-tight text-[var(--dash-text)] sm:text-3xl">
                    {t.title}
                  </h2>
                  <p className="mt-2 max-w-2xl text-sm leading-6 text-[var(--dash-text-soft)]">
                    {t.subtitle}
                  </p>
                </div>
              </div>
            </div>
            <Badge variant="outline" className="dashboard-filter-chip w-fit rounded-lg">
              <Clock3 className="me-1 h-3 w-3 text-[var(--dash-spruce)]" />
              {t.updated}: {formatDate(organization?.updatedAt, locale)}
            </Badge>
          </div>
        </div>

        <CardContent className="p-5 sm:p-6">
          {!canUpdate && <p role="status" className="mb-4 text-sm text-[var(--dash-text-soft)]">{t.readOnly}</p>}
          {(stale || isError || failureCode === "CONFLICT" || failureCode === "UNCERTAIN") && <div className="mb-4 space-y-3 rounded-lg border border-[var(--dash-gold)] bg-[var(--dash-gold-soft)] p-4">
            <p role="status">{isError ? t.errorTitle : t.stale}</p>
            <Button type="button" onClick={loadLatest} disabled={pending || isFetching} className="dashboard-button-secondary h-auto min-h-10 whitespace-normal">{t.loadLatest}</Button>
          </div>}
          {message && <div ref={feedback} tabIndex={-1} role={failureCode ? "alert" : "status"} className={cn("mb-4 rounded-lg border p-4 text-sm outline-offset-4", failureCode ? "border-[var(--dash-danger)] bg-[var(--dash-danger-soft)]" : message === t.saved ? "border-[var(--dash-success)] bg-[var(--dash-success-soft)]" : "border-[var(--dash-info)] bg-[var(--dash-info-soft)]")}>{message}</div>}
          {comparison && <section className="mb-5 space-y-3 rounded-lg border border-[var(--dash-gold)] p-4" aria-label={t.loadLatest}>
            {changedFields.map(field => <div key={field} className="space-y-1 break-words text-sm">
              <p className="font-semibold">{t.fields[field]}</p>
              <p>{t.savedValue}: {comparison.data[field] || t.notSet}</p>
              <p>{t.draftValue}: {formData[field] || t.notSet}</p>
            </div>)}
            <div className="flex flex-wrap gap-3">
              <Button type="button" onClick={() => resolveComparison(true)} disabled={pending || !canUpdate} className="dashboard-button-secondary h-auto min-h-10 whitespace-normal">{t.keepDraft}</Button>
              <Button type="button" onClick={() => resolveComparison(false)} disabled={pending} className="dashboard-button-secondary h-auto min-h-10 whitespace-normal">{t.useSaved}</Button>
            </div>
          </section>}
          {needsVerification && canUpdate && <section className="mb-5 space-y-3 rounded-lg border border-[var(--dash-gold)] p-4">
            <Label htmlFor={`${id}-password`}>{t.password}</Label>
            <Input id={`${id}-password`} type="password" autoComplete="current-password" value={password} maxLength={128} disabled={pending} onChange={event => setPassword(event.target.value)} onKeyDown={event => { if (event.key === "Enter") { event.preventDefault(); void confirmIdentity() } }} className="dashboard-control" />
            <Button type="button" disabled={pending || !password} onClick={confirmIdentity} className="dashboard-button-secondary">{t.verify}</Button>
          </section>}
          <fieldset disabled={pending || !canUpdate || !!comparison} className="min-w-0 min-h-[420px]" aria-label={t.steps[activeStep].title}>
            {activeStep === "identity" ? (
              <section className="space-y-5">
                <SectionHeader icon={Building2} title={t.sections.identity} accent="brand" />
                <div className="grid gap-4 lg:grid-cols-2">
                  <Field htmlFor={`${id}-name`} label={t.fields.name} required>
                    <Input
                      id={`${id}-name`}
                      required
                      maxLength={200}
                      value={formData.name}
                      onChange={(event) => updateField("name", event.target.value)}
                      placeholder={t.placeholders.name}
                      className="dashboard-control h-11 rounded-lg"
                    />
                  </Field>
                  <Field htmlFor={`${id}-industry`} label={t.fields.industry}>
                    <Select
                      value={formData.industry || undefined}
                      onValueChange={(value) => updateField("industry", value)}
                    >
                      <SelectTrigger id={`${id}-industry`} className="dashboard-control h-11 rounded-lg">
                        <SelectValue placeholder={t.placeholders.industry} />
                      </SelectTrigger>
                      <SelectContent className="border-[var(--dash-border-subtle)] bg-[var(--dash-surface-raised)] text-[var(--dash-text)]">
                        {INDUSTRIES.map((industry) => (
                          <SelectItem key={industry} value={industry}>
                            {locale === "fr" ? industryFrench[industry] : industry}
                          </SelectItem>
                        ))}
                        {formData.industry && !INDUSTRIES.includes(formData.industry) && <SelectItem value={formData.industry}>{formData.industry}</SelectItem>}
                      </SelectContent>
                    </Select>
                  </Field>
                </div>
                <Field htmlFor={`${id}-address`} label={t.fields.address}>
                  <Textarea
                    id={`${id}-address`}
                    maxLength={500}
                    value={formData.address}
                    onChange={(event) => updateField("address", event.target.value)}
                    placeholder={t.placeholders.address}
                    className="dashboard-control min-h-28 resize-none rounded-lg"
                  />
                </Field>
              </section>
            ) : null}

            {activeStep === "regional" ? (
              <section className="space-y-5">
                <SectionHeader icon={Globe2} title={t.sections.regional} accent="spruce" />
                <div className="grid gap-4 lg:grid-cols-2">
                  <Field htmlFor={`${id}-country`} label={t.fields.country}>
                    <Input
                      id={`${id}-country`}
                      maxLength={100}
                      value={formData.country}
                      onChange={(event) => updateField("country", event.target.value)}
                      placeholder={t.placeholders.country}
                      className="dashboard-control h-11 rounded-lg"
                    />
                  </Field>
                  <Field htmlFor={`${id}-state`} label={t.fields.state}>
                    <Input
                      id={`${id}-state`}
                      maxLength={100}
                      value={formData.state}
                      onChange={(event) => updateField("state", event.target.value)}
                      placeholder={t.placeholders.state}
                      className="dashboard-control h-11 rounded-lg"
                    />
                  </Field>
                  <Field htmlFor={`${id}-currency`} label={t.fields.currency}>
                    <Input id={`${id}-currency`} value={formData.currency} readOnly aria-describedby={`${id}-currency-help`} className="dashboard-control h-11 rounded-lg" />
                    <p id={`${id}-currency-help`} className="text-sm text-[var(--dash-text-soft)]">{t.currencyHelp}</p>
                  </Field>
                  <Field htmlFor={`${id}-defaultLocale`} label={t.fields.defaultLocale}>
                    <Select value={formData.defaultLocale} onValueChange={(value) => updateField("defaultLocale", value as Locale)}>
                      <SelectTrigger id={`${id}-defaultLocale`} className="dashboard-control h-11 rounded-lg">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent className="border-[var(--dash-border-subtle)] bg-[var(--dash-surface-raised)] text-[var(--dash-text)]">
                        <SelectItem value="en">English</SelectItem>
                        <SelectItem value="fr">Français</SelectItem>
                      </SelectContent>
                    </Select>
                  </Field>
                  <Field htmlFor={`${id}-timezone`} label={t.fields.timezone}>
                    <Select value={formData.timezone} onValueChange={(value) => updateField("timezone", value)}>
                      <SelectTrigger id={`${id}-timezone`} className="dashboard-control h-11 rounded-lg">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent className="border-[var(--dash-border-subtle)] bg-[var(--dash-surface-raised)] text-[var(--dash-text)]">
                        {TIMEZONES.map((timezone) => (
                          <SelectItem key={timezone.value} value={timezone.value}>
                            {timezone.label}
                          </SelectItem>
                        ))}
                        {!TIMEZONES.some(option => option.value === formData.timezone) && <SelectItem value={formData.timezone}>{formData.timezone}</SelectItem>}
                      </SelectContent>
                    </Select>
                  </Field>
                </div>
              </section>
            ) : null}

            {activeStep === "calendar" ? (
              <section className="space-y-5">
                <SectionHeader icon={CalendarDays} title={t.sections.calendar} accent="gold" />
                <div className="grid gap-4 lg:grid-cols-2">
                  <Field htmlFor={`${id}-fiscalYearStart`} label={t.fields.fiscalYearStart}>
                    <Select value={formData.fiscalYearStart || "not-set"} onValueChange={(value) => updateField("fiscalYearStart", value === "not-set" ? "" : value)}>
                      <SelectTrigger id={`${id}-fiscalYearStart`} className="dashboard-control h-11 rounded-lg">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent className="border-[var(--dash-border-subtle)] bg-[var(--dash-surface-raised)] text-[var(--dash-text)]">
                        <SelectItem value="not-set">{t.notSet}</SelectItem>
                        {FISCAL_YEAR_OPTIONS.map((option) => (
                          <SelectItem key={option.value} value={option.value}>
                            {locale === "fr" ? option.labelFr : option.label}
                          </SelectItem>
                        ))}
                        {formData.fiscalYearStart && !FISCAL_YEAR_OPTIONS.some(option => option.value === formData.fiscalYearStart) && <SelectItem value={formData.fiscalYearStart}>{formData.fiscalYearStart}</SelectItem>}
                      </SelectContent>
                    </Select>
                  </Field>
                  <Field htmlFor={`${id}-inventoryStartDate`} label={t.fields.inventoryStartDate}>
                    <Input
                      id={`${id}-inventoryStartDate`}
                      type="date"
                      value={formData.inventoryStartDate}
                      onChange={(event) => updateField("inventoryStartDate", event.target.value)}
                      className="dashboard-control h-11 rounded-lg"
                    />
                  </Field>
                </div>
              </section>
            ) : null}

            {activeStep === "review" ? (
              <section className="space-y-5">
                <SectionHeader icon={FileText} title={t.sections.review} accent="gold" />
                <p className="text-sm text-[var(--dash-text-soft)]">{t.calendarHelp}</p>
                <div className="grid gap-3 lg:grid-cols-2">
                  <ReviewPanel title={t.review.identity} rows={[
                    [t.fields.name, formData.name],
                    [t.fields.industry, formData.industry],
                    [t.fields.address, formData.address],
                  ]} />
                  <ReviewPanel title={t.review.region} rows={[
                    [t.fields.country, formData.country],
                    [t.fields.state, formData.state],
                    [t.fields.defaultLocale, formData.defaultLocale.toUpperCase()],
                  ]} />
                  <ReviewPanel title={t.review.finance} rows={[
                    [t.fields.currency, formData.currency],
                    [t.fields.timezone, formData.timezone],
                  ]} />
                  <ReviewPanel title={t.review.calendar} rows={[
                    [t.fields.fiscalYearStart, formData.fiscalYearStart],
                    [t.fields.inventoryStartDate, formData.inventoryStartDate],
                  ]} />
                </div>
              </section>
            ) : null}
          </fieldset>

          <div className="mt-6 flex flex-col gap-3 border-t border-[var(--dash-border-subtle)] pt-5 sm:flex-row sm:items-center sm:justify-between">
            <Button
              type="button"
              variant="outline"
              onClick={goBack}
              disabled={activeIndex === 0 || pending}
              className="dashboard-button-secondary h-10 rounded-lg"
            >
              <ArrowLeft className="h-4 w-4" />
              {t.previous}
            </Button>

            <div className="flex flex-col gap-3 sm:flex-row">
              {activeStep !== "review" ? (
                <Button
                  type="button"
                  onClick={goNext}
                  disabled={pending}
                  className="dashboard-button-secondary h-10 rounded-lg"
                >
                  {t.next}
                  <ArrowRight className="h-4 w-4" />
                </Button>
              ) : null}
              {activeStep === "review" && canUpdate && <Button
                type="button"
                onClick={submit}
                disabled={pending || !dirty || stale || isError || !!comparison || needsVerification || failureCode === "UNCERTAIN" || failureCode === "CONFLICT"}
                className="dashboard-button-primary h-10 rounded-lg"
              >
                {updateOrganizationMutation.isPending ? (
                  <>
                    <Loader2 className="h-4 w-4 animate-spin motion-reduce:animate-none" aria-hidden="true" />
                    {t.saving}
                  </>
                ) : (
                  <>
                    <Check className="h-4 w-4" />
                    {t.save}
                  </>
                )}
              </Button>}
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}

function Field({
  htmlFor,
  label,
  required,
  children,
}: {
  htmlFor: string
  label: string
  required?: boolean
  children: React.ReactNode
}) {
  return (
    <div className="space-y-2">
      <Label htmlFor={htmlFor} className="text-sm font-semibold text-[var(--dash-text-muted)]">
        {label}
      </Label>
      {required ? <span aria-hidden="true" className="ms-1 text-[var(--dash-warning)]">*</span> : null}
      {children}
    </div>
  )
}

function SectionHeader({
  icon: Icon,
  title,
  accent,
}: {
  icon: LucideIcon
  title: string
  accent: "brand" | "spruce" | "gold" | "success"
}) {
  const color = {
    brand: "text-[var(--dash-brand-strong)] bg-[var(--dash-brand-soft)]",
    spruce: "text-[var(--dash-spruce)] bg-[var(--dash-spruce-soft)]",
    gold: "text-[var(--dash-gold)] bg-[var(--dash-gold-soft)]",
    success: "text-[var(--dash-success)] bg-[var(--dash-success-soft)]",
  }[accent]

  return (
    <div className="flex items-center gap-3">
      <span className={cn("flex h-10 w-10 items-center justify-center rounded-lg", color)}>
        <Icon className="h-5 w-5" />
      </span>
      <h3 className="text-lg font-semibold text-[var(--dash-text)]">{title}</h3>
    </div>
  )
}

function ReviewPanel({
  title,
  rows,
}: {
  title: string
  rows: Array<[string, string | null | undefined]>
}) {
  return (
    <div className="rounded-lg border border-[var(--dash-border-subtle)] bg-[rgba(37,57,67,0.46)] p-4">
      <h4 className="mb-3 text-sm font-semibold uppercase tracking-[0.12em] text-[var(--dash-text-faint)]">
        {title}
      </h4>
      <div className="space-y-2">
        {rows.map(([label, value]) => (
          <div key={label} className="grid grid-cols-[minmax(0,0.85fr)_minmax(0,1.15fr)] gap-3 text-sm">
            <span className="min-w-0 break-words text-[var(--dash-text-soft)]">{label}</span>
            <span className="min-w-0 break-words font-medium text-[var(--dash-text)]">{value || "-"}</span>
          </div>
        ))}
      </div>
    </div>
  )
}

function RelatedLink({
  href,
  label,
  icon: Icon,
  locale,
}: {
  href: string
  label: string
  icon: LucideIcon
  locale: Locale
}) {
  return (
    <Button asChild variant="outline" className="dashboard-button-secondary h-10 justify-start rounded-lg">
      <Link href={href} locale={locale}>
        <Icon className="h-4 w-4 text-[var(--dash-spruce)]" />
        {label}
      </Link>
    </Button>
  )
}
