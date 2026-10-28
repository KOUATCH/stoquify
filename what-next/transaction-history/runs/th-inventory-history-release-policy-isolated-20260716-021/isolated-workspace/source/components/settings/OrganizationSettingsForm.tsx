"use client"

import { useEffect, useMemo, useState } from "react"
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
import { useNotifications } from "@/components/notifications/NotificationProvider"
import {
  useOrganizationSettings,
  useUpdateOrganizationSettings,
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

const CURRENCIES = [
  { value: "XAF", label: "XAF - Central African CFA franc" },
  { value: "USD", label: "USD - US dollar" },
  { value: "EUR", label: "EUR - Euro" },
  { value: "GBP", label: "GBP - British pound" },
  { value: "CAD", label: "CAD - Canadian dollar" },
  { value: "NGN", label: "NGN - Nigerian naira" },
  { value: "GHS", label: "GHS - Ghanaian cedi" },
  { value: "ZAR", label: "ZAR - South African rand" },
]

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
  { value: "01-01", label: "January 1" },
  { value: "04-01", label: "April 1" },
  { value: "07-01", label: "July 1" },
  { value: "10-01", label: "October 1" },
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

const copy = {
  en: {
    loadingTitle: "Loading organization",
    loadingBody: "Fetching the current operating profile.",
    errorTitle: "Organization unavailable",
    eyebrow: "Organization workflow",
    title: "Company DNA",
    subtitle: "Keep the business identity, locale, calendar, and regional defaults aligned across Stoquify.",
    live: "Live organization",
    updated: "Updated",
    notSet: "Not set",
    profile: "Profile",
    configured: "configured",
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
      industry: "Select or type an industry",
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
    loadingBody: "Recuperation du profil operationnel.",
    errorTitle: "Organisation indisponible",
    eyebrow: "Flux organisation",
    title: "ADN entreprise",
    subtitle: "Gardez l'identite, la langue, le calendrier et les parametres regionaux alignes dans Stoquify.",
    live: "Organisation active",
    updated: "Mis a jour",
    notSet: "Non defini",
    profile: "Profil",
    configured: "configure",
    users: "Utilisateurs",
    locations: "Lieux",
    roles: "Roles",
    open: "Ouvrir",
    previous: "Retour",
    next: "Suivant",
    save: "Enregistrer l'organisation",
    saving: "Enregistrement",
    requiredTitle: "Champ requis",
    requiredBody: "Le nom de l'organisation est requis avant l'enregistrement.",
    steps: {
      identity: {
        title: "Identite",
        description: "Nom legal et categorie d'activite",
      },
      regional: {
        title: "Regional",
        description: "Pays, devise, fuseau horaire et langue",
      },
      calendar: {
        title: "Calendrier",
        description: "Exercice fiscal et point de depart du stock",
      },
      review: {
        title: "Revue",
        description: "Confirmer le dossier operationnel",
      },
    },
    fields: {
      name: "Nom de l'organisation",
      industry: "Secteur",
      country: "Pays",
      state: "Region ou province",
      address: "Adresse professionnelle",
      currency: "Devise par defaut",
      timezone: "Fuseau horaire",
      defaultLocale: "Langue par defaut",
      fiscalYearStart: "Debut d'exercice",
      inventoryStartDate: "Date de depart du stock",
    },
    placeholders: {
      name: "Acme Retail Group",
      industry: "Selectionner ou saisir un secteur",
      country: "Cameroun",
      state: "Centre",
      address: "Rue, ville, code postal",
    },
    sections: {
      identity: "Identite entreprise",
      regional: "Parametres regionaux",
      calendar: "Calendrier operationnel",
      review: "Revue du dossier",
      related: "Configuration connectee",
    },
    review: {
      identity: "Identite",
      region: "Region",
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
  organizationId,
  locale = "en",
}: OrganizationSettingsFormProps) {
  const t = copy[locale]
  const notifications = useNotifications()
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
    error,
  } = useOrganizationSettings(organizationId)

  const updateOrganizationMutation = useUpdateOrganizationSettings(locale)
  const steps = useMemo(
    () => ([
      { id: "identity", icon: Building2, accent: "var(--dash-brand)", soft: "var(--dash-brand-soft)" },
      { id: "regional", icon: Globe2, accent: "var(--dash-spruce)", soft: "var(--dash-spruce-soft)" },
      { id: "calendar", icon: CalendarDays, accent: "var(--dash-gold)", soft: "var(--dash-gold-soft)" },
      { id: "review", icon: ShieldCheck, accent: "var(--dash-success)", soft: "var(--dash-success-soft)" },
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

  useEffect(() => {
    if (!organization) return

    setFormData({
      name: organization.name || "",
      industry: organization.industry || "",
      country: organization.country || "",
      state: organization.state || "",
      address: organization.address || "",
      currency: organization.currency || "XAF",
      timezone: organization.timezone || "Africa/Douala",
      defaultLocale: normalizeLocale(organization.defaultLocale),
      fiscalYearStart: organization.fiscalYearStart || "01-01",
      inventoryStartDate: toDateInput(organization.inventoryStartDate),
    })
  }, [organization])

  const updateField = <K extends keyof FormState>(field: K, value: FormState[K]) => {
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

  const submit = () => {
    if (!formData.name.trim()) {
      notifications.warning(t.requiredTitle, t.requiredBody)
      setActiveStep("identity")
      return
    }

    updateOrganizationMutation.mutate({
      organizationId,
      data: {
        name: formData.name,
        industry: formData.industry,
        country: formData.country,
        state: formData.state,
        address: formData.address,
        currency: formData.currency,
        timezone: formData.timezone,
        defaultLocale: formData.defaultLocale,
        fiscalYearStart: formData.fiscalYearStart,
        inventoryStartDate: formData.inventoryStartDate ? new Date(formData.inventoryStartDate) : null,
      },
    })
  }

  if (isLoading) {
    return (
      <Card className="dashboard-glass-panel rounded-lg text-[var(--dash-text)]">
        <CardContent className="flex items-center justify-center py-16">
          <div className="flex flex-col items-center gap-4 text-center">
            <Loader2 className="h-8 w-8 animate-spin text-[var(--dash-brand-strong)]" />
            <div>
              <p className="font-semibold">{t.loadingTitle}</p>
              <p className="mt-1 text-sm text-[var(--dash-text-soft)]">{t.loadingBody}</p>
            </div>
          </div>
        </CardContent>
      </Card>
    )
  }

  if (isError) {
    return (
      <Card className="dashboard-glass-panel rounded-lg text-[var(--dash-text)]">
        <CardContent className="flex items-start gap-3 p-6">
          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-[var(--dash-danger-soft)] text-[var(--dash-danger)]">
            <AlertCircle className="h-5 w-5" />
          </div>
          <div>
            <p className="font-semibold">{t.errorTitle}</p>
            <p className="mt-1 text-sm text-[var(--dash-text-soft)]">{error?.message}</p>
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
              {steps.map((step, index) => {
                const Icon = step.icon
                const active = step.id === activeStep
                const complete = index < activeIndex
                return (
                  <button
                    key={step.id}
                    type="button"
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
                      {complete ? <Check className="h-4 w-4" /> : <Icon className="h-4 w-4" />}
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
                <span className="dashboard-live-dot" />
                {t.live}
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
          <div className="min-h-[420px]">
            {activeStep === "identity" ? (
              <section className="space-y-5">
                <SectionHeader icon={Building2} title={t.sections.identity} accent="brand" />
                <div className="grid gap-4 lg:grid-cols-2">
                  <Field label={t.fields.name} required>
                    <Input
                      value={formData.name}
                      onChange={(event) => updateField("name", event.target.value)}
                      placeholder={t.placeholders.name}
                      className="dashboard-control h-11 rounded-lg"
                    />
                  </Field>
                  <Field label={t.fields.industry}>
                    <Select
                      value={formData.industry || undefined}
                      onValueChange={(value) => updateField("industry", value)}
                    >
                      <SelectTrigger className="dashboard-control h-11 rounded-lg">
                        <SelectValue placeholder={t.placeholders.industry} />
                      </SelectTrigger>
                      <SelectContent className="border-[var(--dash-border-subtle)] bg-[var(--dash-surface-raised)] text-[var(--dash-text)]">
                        {INDUSTRIES.map((industry) => (
                          <SelectItem key={industry} value={industry}>
                            {industry}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </Field>
                </div>
                <Field label={t.fields.address}>
                  <Textarea
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
                  <Field label={t.fields.country}>
                    <Input
                      value={formData.country}
                      onChange={(event) => updateField("country", event.target.value)}
                      placeholder={t.placeholders.country}
                      className="dashboard-control h-11 rounded-lg"
                    />
                  </Field>
                  <Field label={t.fields.state}>
                    <Input
                      value={formData.state}
                      onChange={(event) => updateField("state", event.target.value)}
                      placeholder={t.placeholders.state}
                      className="dashboard-control h-11 rounded-lg"
                    />
                  </Field>
                  <Field label={t.fields.currency}>
                    <Select value={formData.currency} onValueChange={(value) => updateField("currency", value)}>
                      <SelectTrigger className="dashboard-control h-11 rounded-lg">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent className="border-[var(--dash-border-subtle)] bg-[var(--dash-surface-raised)] text-[var(--dash-text)]">
                        {CURRENCIES.map((currency) => (
                          <SelectItem key={currency.value} value={currency.value}>
                            {currency.label}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </Field>
                  <Field label={t.fields.defaultLocale}>
                    <Select value={formData.defaultLocale} onValueChange={(value) => updateField("defaultLocale", value as Locale)}>
                      <SelectTrigger className="dashboard-control h-11 rounded-lg">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent className="border-[var(--dash-border-subtle)] bg-[var(--dash-surface-raised)] text-[var(--dash-text)]">
                        <SelectItem value="en">English</SelectItem>
                        <SelectItem value="fr">Francais</SelectItem>
                      </SelectContent>
                    </Select>
                  </Field>
                  <Field label={t.fields.timezone}>
                    <Select value={formData.timezone} onValueChange={(value) => updateField("timezone", value)}>
                      <SelectTrigger className="dashboard-control h-11 rounded-lg">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent className="border-[var(--dash-border-subtle)] bg-[var(--dash-surface-raised)] text-[var(--dash-text)]">
                        {TIMEZONES.map((timezone) => (
                          <SelectItem key={timezone.value} value={timezone.value}>
                            {timezone.label}
                          </SelectItem>
                        ))}
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
                  <Field label={t.fields.fiscalYearStart}>
                    <Select value={formData.fiscalYearStart} onValueChange={(value) => updateField("fiscalYearStart", value)}>
                      <SelectTrigger className="dashboard-control h-11 rounded-lg">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent className="border-[var(--dash-border-subtle)] bg-[var(--dash-surface-raised)] text-[var(--dash-text)]">
                        {FISCAL_YEAR_OPTIONS.map((option) => (
                          <SelectItem key={option.value} value={option.value}>
                            {option.label}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </Field>
                  <Field label={t.fields.inventoryStartDate}>
                    <Input
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
                <SectionHeader icon={FileText} title={t.sections.review} accent="success" />
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
          </div>

          <div className="mt-6 flex flex-col gap-3 border-t border-[var(--dash-border-subtle)] pt-5 sm:flex-row sm:items-center sm:justify-between">
            <Button
              type="button"
              variant="outline"
              onClick={goBack}
              disabled={activeIndex === 0 || updateOrganizationMutation.isPending}
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
                  disabled={updateOrganizationMutation.isPending}
                  className="dashboard-button-secondary h-10 rounded-lg"
                >
                  {t.next}
                  <ArrowRight className="h-4 w-4" />
                </Button>
              ) : null}
              <Button
                type="button"
                onClick={submit}
                disabled={updateOrganizationMutation.isPending}
                className="dashboard-button-primary h-10 rounded-lg"
              >
                {updateOrganizationMutation.isPending ? (
                  <>
                    <Loader2 className="h-4 w-4 animate-spin" />
                    {t.saving}
                  </>
                ) : (
                  <>
                    <Check className="h-4 w-4" />
                    {t.save}
                  </>
                )}
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}

function Field({
  label,
  required,
  children,
}: {
  label: string
  required?: boolean
  children: React.ReactNode
}) {
  return (
    <div className="space-y-2">
      <Label className="text-sm font-semibold text-[var(--dash-text-muted)]">
        {label}
        {required ? <span className="ms-1 text-[var(--dash-warning)]">*</span> : null}
      </Label>
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
            <span className="min-w-0 truncate text-[var(--dash-text-soft)]">{label}</span>
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
