"use client"

import { useEffect, useRef, useState, type FormEvent, type ReactNode } from "react"
import { useRouter } from "next/navigation"
import {
  AlertTriangle,
  ArrowLeft,
  BadgeCheck,
  CalendarClock,
  CheckCircle2,
  CircleDollarSign,
  Clock3,
  FileCheck2,
  Languages,
  Loader2,
  PencilLine,
  Plus,
  Save,
  ShieldCheck,
  ShoppingCart,
  UserRound,
  Wallet,
  type LucideIcon,
} from "lucide-react"

import type {
  CustomerManagementInput,
  CustomerManagementRow,
} from "@/actions/customers/customer-management-actions"
import {
  CommandBriefHeader,
  RouteStatePanel,
  StatusStrip,
  type StatusStripItem,
  dashboardPanelClass,
  dashboardToneClass,
} from "@/components/dashboard/primitives/command-center-primitives"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { Switch } from "@/components/ui/switch"
import { Textarea } from "@/components/ui/textarea"
import {
  useCreateManagedCustomer,
  useManagedCustomer,
  useUpdateManagedCustomer,
} from "@/hooks/useCustomerManagement"
import type { Locale } from "@/types/bilingual"

type CustomerActionMode = "create" | "edit"
type CustomerLocale = "EN" | "FR"

type CustomerFormState = {
  name: string
  code: string
  email: string
  phone: string
  address: string
  taxId: string
  paymentTerms: string
  creditLimit: string
  preferredLocale: CustomerLocale
  notes: string
  isActive: boolean
}

const customerFormFields: Array<keyof CustomerFormState> = [
  "name",
  "code",
  "email",
  "phone",
  "address",
  "taxId",
  "paymentTerms",
  "creditLimit",
  "preferredLocale",
  "notes",
  "isActive",
]

const copy = {
  en: {
    createEyebrow: "Customer creation",
    editEyebrow: "Customer record",
    createTitle: "Create customer",
    editTitle: "Edit customer",
    createSummary: "Create a tenant-scoped customer record for sales, POS, receipts, and receivables.",
    editSummary: "Update customer identity, contact details, commercial terms, language, and operating status.",
    draft: "Draft",
    active: "Active",
    inactive: "Inactive",
    back: "Back to customers",
    viewProfile: "View customer profile",
    trusted: "Protected customer workflow",
    source: "Customer service",
    contact: "Identity and contact",
    contactDetail: "Keep the details used on orders, statements, receipts, and day-to-day communication accurate.",
    commercial: "Commercial controls",
    commercialDetail: "Set payment timing, credit exposure, communication language, and sales availability.",
    notes: "Operational notes",
    notesDetail: "Capture internal context that helps sales and finance serve this customer consistently.",
    formHelp: "Fields are validated again by the protected server action before the service writes the record.",
    formIntro: "Review the operating signals above, then update only the details that should change across customer workflows.",
    codeHint: "A stable internal reference makes the customer easier to find across teams.",
    creditHint: "Leave blank when the customer does not have a managed credit ceiling.",
    activeHint: "Inactive customers stay in history but are unavailable to new downstream sales workflows.",
    requiredTitle: "Customer details required",
    requiredBody: "Enter a customer name before saving.",
    invalidEmail: "Use a valid email address or leave the field blank.",
    invalidTerms: "Payment terms must be a whole number from 0 to 365 days.",
    invalidCredit: "Credit limit must be zero or greater, or left blank.",
    loadErrorTitle: "Customer record unavailable",
    loadErrorBody: "The customer could not be loaded safely. Return to the customer list and try again.",
    missingTitle: "Customer not found",
    missingBody: "This customer is not available in the active organization.",
    cancel: "Cancel",
    create: "Create customer",
    update: "Save changes",
    creating: "Creating customer",
    updating: "Saving changes",
    statusTitle: "Action readiness",
    statusDetail: "Review record quality, credit exposure, sales activity, and pending edits before updating this customer.",
    profileReadiness: "Profile completeness",
    profileReady: "Core customer details are complete.",
    detailsMissing: "recommended details missing",
    creditExposure: "Credit exposure",
    noCreditLimit: "No credit limit",
    balance: "Balance",
    limit: "Limit",
    used: "used",
    salesActivity: "Sales activity",
    open: "open",
    unpaid: "unpaid",
    pendingChanges: "Pending changes",
    noPendingChanges: "No unsaved changes. This record matches the service-owned version.",
    readyToSave: "Review the edits, then save to update downstream workflows.",
    current: "Current",
    change: "change",
    changes: "changes",
    lastUpdated: "Last updated",
    notAvailable: "Not available",
    identityReady: "Identity",
    identityReadyDetail: "Name and contact data are written to the customer record.",
    termsReady: "Commercial terms",
    termsReadyDetail: "Payment terms and credit exposure remain service-owned.",
    languageReady: "Language",
    languageReadyDetail: "Preferred customer communication language.",
    availabilityReady: "Availability",
    availabilityReadyDetail: "Active customers are available to downstream sales workflows.",
    orders: "Sales orders",
    paymentTerms: "Payment terms",
    days: "days",
    placeholders: {
      name: "e.g. Acme Distribution",
      code: "e.g. CUST-0042",
      email: "billing@customer.com",
      phone: "+237 6 00 00 00 00",
      address: "Street, city, country",
      taxId: "Registration or tax reference",
      creditLimit: "No managed limit",
      notes: "Add account context, service preferences, or follow-up information...",
    },
    fields: {
      name: "Customer name",
      code: "Customer code",
      email: "Email",
      phone: "Phone",
      address: "Address",
      taxId: "Tax ID",
      paymentTerms: "Payment terms (days)",
      creditLimit: "Credit limit",
      preferredLocale: "Preferred language",
      isActive: "Active customer",
      notes: "Notes",
    },
  },
  fr: {
    createEyebrow: "Création client",
    editEyebrow: "Fiche client",
    createTitle: "Créer un client",
    editTitle: "Modifier le client",
    createSummary: "Créez une fiche client rattachée à l’organisation pour les ventes, le POS, les reçus et les créances.",
    editSummary: "Mettez à jour l’identité, les contacts, les conditions commerciales, la langue et le statut opérationnel.",
    draft: "Brouillon",
    active: "Actif",
    inactive: "Inactif",
    back: "Retour aux clients",
    viewProfile: "Voir le profil client",
    trusted: "Workflow client protégé",
    source: "Service client",
    contact: "Identité et contact",
    contactDetail: "Tenez à jour les informations utilisées sur les commandes, relevés, reçus et communications quotidiennes.",
    commercial: "Contrôles commerciaux",
    commercialDetail: "Définissez le délai de paiement, l’exposition crédit, la langue et la disponibilité commerciale.",
    notes: "Notes opérationnelles",
    notesDetail: "Conservez le contexte interne qui aide les équipes vente et finance à servir ce client avec cohérence.",
    formHelp: "Les champs sont validés de nouveau par l’action serveur protégée avant l’écriture par le service.",
    formIntro: "Consultez les signaux opérationnels ci-dessus, puis modifiez uniquement les informations à répercuter dans les workflows client.",
    codeHint: "Une référence interne stable facilite la recherche du client entre équipes.",
    creditHint: "Laissez vide si le client n’a pas de plafond de crédit géré.",
    activeHint: "Un client inactif reste dans l’historique mais n’est plus disponible pour les nouvelles ventes.",
    requiredTitle: "Informations client requises",
    requiredBody: "Saisissez un nom de client avant l’enregistrement.",
    invalidEmail: "Utilisez une adresse e-mail valide ou laissez le champ vide.",
    invalidTerms: "Le délai de paiement doit être un entier compris entre 0 et 365 jours.",
    invalidCredit: "La limite de crédit doit être positive ou vide.",
    loadErrorTitle: "Fiche client indisponible",
    loadErrorBody: "Le client n’a pas pu être chargé en toute sécurité. Revenez à la liste puis réessayez.",
    missingTitle: "Client introuvable",
    missingBody: "Ce client n’est pas disponible dans l’organisation active.",
    cancel: "Annuler",
    create: "Créer le client",
    update: "Enregistrer",
    creating: "Création du client",
    updating: "Enregistrement",
    statusTitle: "Préparation de l’action",
    statusDetail: "Vérifiez la qualité de la fiche, l’exposition crédit, l’activité commerciale et les modifications avant l’enregistrement.",
    profileReadiness: "Complétude du profil",
    profileReady: "Les informations client essentielles sont complètes.",
    detailsMissing: "informations recommandées manquantes",
    creditExposure: "Exposition crédit",
    noCreditLimit: "Aucune limite de crédit",
    balance: "Solde",
    limit: "Limite",
    used: "utilisée",
    salesActivity: "Activité commerciale",
    open: "ouvertes",
    unpaid: "impayées",
    pendingChanges: "Modifications en attente",
    noPendingChanges: "Aucune modification non enregistrée. La fiche correspond à la version du service.",
    readyToSave: "Vérifiez les modifications, puis enregistrez-les pour actualiser les workflows en aval.",
    current: "À jour",
    change: "modification",
    changes: "modifications",
    lastUpdated: "Dernière mise à jour",
    notAvailable: "Non disponible",
    identityReady: "Identité",
    identityReadyDetail: "Le nom et les contacts alimentent la fiche client.",
    termsReady: "Conditions commerciales",
    termsReadyDetail: "Le délai de paiement et l’exposition crédit restent sous contrôle du service.",
    languageReady: "Langue",
    languageReadyDetail: "Langue préférée des communications client.",
    availabilityReady: "Disponibilité",
    availabilityReadyDetail: "Les clients actifs sont disponibles dans les workflows de vente.",
    orders: "Commandes",
    paymentTerms: "Délai de paiement",
    days: "jours",
    placeholders: {
      name: "ex. Distribution Acme",
      code: "ex. CLI-0042",
      email: "facturation@client.com",
      phone: "+237 6 00 00 00 00",
      address: "Rue, ville, pays",
      taxId: "Référence fiscale ou d’immatriculation",
      creditLimit: "Aucun plafond géré",
      notes: "Ajoutez le contexte du compte, les préférences ou les informations de suivi...",
    },
    fields: {
      name: "Nom du client",
      code: "Code client",
      email: "E-mail",
      phone: "Téléphone",
      address: "Adresse",
      taxId: "Identifiant fiscal",
      paymentTerms: "Délai de paiement (jours)",
      creditLimit: "Limite de crédit",
      preferredLocale: "Langue préférée",
      isActive: "Client actif",
      notes: "Notes",
    },
  },
} as const

function defaultForm(): CustomerFormState {
  return {
    name: "",
    code: "",
    email: "",
    phone: "",
    address: "",
    taxId: "",
    paymentTerms: "30",
    creditLimit: "",
    preferredLocale: "EN",
    notes: "",
    isActive: true,
  }
}

function formFromCustomer(customer: CustomerManagementRow): CustomerFormState {
  return {
    name: customer.name,
    code: customer.code ?? "",
    email: customer.email ?? "",
    phone: customer.phone ?? "",
    address: customer.address ?? "",
    taxId: customer.taxId ?? "",
    paymentTerms: String(customer.paymentTerms ?? 30),
    creditLimit: customer.creditLimit === null ? "" : String(customer.creditLimit),
    preferredLocale: customer.preferredLocale,
    notes: customer.notes ?? "",
    isActive: customer.isActive,
  }
}

export function CustomerActionPage({
  mode,
  organizationId,
  locale,
  customerId,
}: {
  mode: CustomerActionMode
  organizationId: string
  locale: Locale
  customerId?: string
}) {
  const router = useRouter()
  const t = copy[locale]
  const basePath = `/${locale}/dashboard/customers`
  const customerQuery = useManagedCustomer(
    organizationId,
    mode === "edit" ? customerId ?? "" : "",
  )
  const createMutation = useCreateManagedCustomer(organizationId, locale)
  const updateMutation = useUpdateManagedCustomer(organizationId, locale)
  const [form, setForm] = useState<CustomerFormState>(() => defaultForm())
  const [formError, setFormError] = useState<string | null>(null)
  const hydratedCustomerId = useRef<string | null>(null)
  const customer = customerQuery.data ?? null
  const isSaving = createMutation.isPending || updateMutation.isPending

  useEffect(() => {
    if (mode !== "edit" || !customer || hydratedCustomerId.current === customer.id) return
    setForm(formFromCustomer(customer))
    hydratedCustomerId.current = customer.id
  }, [customer, mode])

  const updateField = <K extends keyof CustomerFormState>(
    field: K,
    value: CustomerFormState[K],
  ) => {
    setForm((current) => ({ ...current, [field]: value }))
    setFormError(null)
  }

  const buildInput = (): CustomerManagementInput | null => {
    const name = form.name.trim()
    const email = form.email.trim()
    const paymentTerms = Number(form.paymentTerms.trim() || 0)
    const creditLimitText = form.creditLimit.trim()
    const creditLimit = creditLimitText ? Number(creditLimitText) : null

    if (!name) {
      setFormError(t.requiredBody)
      return null
    }
    if (email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      setFormError(t.invalidEmail)
      return null
    }
    if (!Number.isInteger(paymentTerms) || paymentTerms < 0 || paymentTerms > 365) {
      setFormError(t.invalidTerms)
      return null
    }
    if (creditLimit !== null && (!Number.isFinite(creditLimit) || creditLimit < 0)) {
      setFormError(t.invalidCredit)
      return null
    }

    return {
      name,
      code: form.code.trim() || null,
      email: email || null,
      phone: form.phone.trim() || null,
      address: form.address.trim() || null,
      taxId: form.taxId.trim() || null,
      paymentTerms,
      creditLimit,
      preferredLocale: form.preferredLocale,
      notes: form.notes.trim() || null,
      isActive: form.isActive,
    }
  }

  const submit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    const input = buildInput()
    if (!input) return

    try {
      const savedCustomer =
        mode === "edit" && customerId
          ? await updateMutation.mutateAsync({ id: customerId, data: input })
          : await createMutation.mutateAsync(input)
      if (!savedCustomer) {
        throw new Error(t.loadErrorBody)
      }

      router.push(`${basePath}/${savedCustomer.id}`)
      router.refresh()
    } catch (error) {
      setFormError(error instanceof Error ? error.message : t.loadErrorBody)
    }
  }

  if (mode === "edit" && customerQuery.isLoading) {
    return <CustomerActionState kind="loading" />
  }

  if (mode === "edit" && customerQuery.isError) {
    return (
      <CustomerActionState
        kind="error"
        title={t.loadErrorTitle}
        message={t.loadErrorBody}
        backHref={basePath}
        backLabel={t.back}
      />
    )
  }

  if (mode === "edit" && customerQuery.isSuccess && !customer) {
    return (
      <CustomerActionState
        kind="empty"
        title={t.missingTitle}
        message={t.missingBody}
        backHref={basePath}
        backLabel={t.back}
      />
    )
  }

  const isEdit = mode === "edit"
  const title = isEdit ? customer?.name ?? t.editTitle : t.createTitle
  const baselineForm = customer ? formFromCustomer(customer) : defaultForm()
  const changedFieldCount =
    isEdit && customer
      ? customerFormFields.filter((field) => baselineForm[field] !== form[field]).length
      : 0
  const profileValues = [form.name, form.code, form.email, form.phone, form.address, form.taxId]
  const completedProfileFields = profileValues.filter((value) => value.trim().length > 0).length
  const profileCompletion = Math.round((completedProfileFields / profileValues.length) * 100)
  const missingProfileFields = profileValues.length - completedProfileFields
  const parsedCreditLimit = Number(form.creditLimit)
  const creditLimit =
    form.creditLimit.trim() && Number.isFinite(parsedCreditLimit) && parsedCreditLimit > 0
      ? parsedCreditLimit
      : null
  const currentBalance = customer?.currentBalance ?? 0
  const creditUtilization = creditLimit ? Math.round((currentBalance / creditLimit) * 100) : null
  const isOverCreditLimit = creditLimit !== null && currentBalance > creditLimit
  const numberFormatter = new Intl.NumberFormat(locale === "fr" ? "fr-FR" : "en-US", {
    maximumFractionDigits: 2,
  })
  const dateFormatter = new Intl.DateTimeFormat(locale === "fr" ? "fr-FR" : "en-US", {
    dateStyle: "medium",
  })
  const lastUpdated = customer?.updatedAt
    ? dateFormatter.format(new Date(customer.updatedAt))
    : t.notAvailable
  const changeLabel = `${changedFieldCount} ${changedFieldCount === 1 ? t.change : t.changes}`
  const readinessItems: StatusStripItem[] =
    isEdit && customer
      ? [
          {
            id: "profile",
            label: t.profileReadiness,
            value: `${profileCompletion}%`,
            detail: missingProfileFields === 0 ? t.profileReady : `${missingProfileFields} ${t.detailsMissing}`,
            tone: profileCompletion === 100 ? "success" : profileCompletion >= 67 ? "info" : "gold",
            icon: profileCompletion === 100 ? CheckCircle2 : FileCheck2,
          },
          {
            id: "credit",
            label: t.creditExposure,
            value: creditUtilization === null ? t.noCreditLimit : `${creditUtilization}% ${t.used}`,
            detail: creditLimit
              ? `${t.balance}: ${numberFormatter.format(currentBalance)} · ${t.limit}: ${numberFormatter.format(creditLimit)}`
              : `${t.balance}: ${numberFormatter.format(currentBalance)}`,
            tone: isOverCreditLimit ? "danger" : creditUtilization !== null && creditUtilization >= 80 ? "warning" : creditLimit ? "spruce" : "gold",
            icon: isOverCreditLimit ? AlertTriangle : CircleDollarSign,
          },
          {
            id: "sales",
            label: t.salesActivity,
            value: numberFormatter.format(customer.salesOrdersCount),
            detail: `${customer.openSalesOrdersCount} ${t.open} · ${customer.unpaidSalesOrdersCount} ${t.unpaid}`,
            tone: customer.unpaidSalesOrdersCount > 0 ? "warning" : customer.openSalesOrdersCount > 0 ? "gold" : "success",
            icon: ShoppingCart,
          },
          {
            id: "changes",
            label: t.pendingChanges,
            value: changedFieldCount > 0 ? changeLabel : t.current,
            detail: changedFieldCount > 0 ? t.readyToSave : t.noPendingChanges,
            tone: changedFieldCount > 0 ? "gold" : "success",
            icon: changedFieldCount > 0 ? PencilLine : CheckCircle2,
          },
        ]
      : [
          {
            id: "identity",
            label: t.identityReady,
            value: form.name.trim() || "—",
            detail: t.identityReadyDetail,
            tone: form.name.trim() ? "success" : "gold",
            icon: UserRound,
          },
          {
            id: "terms",
            label: t.termsReady,
            value: form.creditLimit || "—",
            detail: t.termsReadyDetail,
            tone: "info",
            icon: Wallet,
          },
          {
            id: "language",
            label: t.languageReady,
            value: form.preferredLocale,
            detail: t.languageReadyDetail,
            tone: "spruce",
            icon: Languages,
          },
          {
            id: "availability",
            label: t.availabilityReady,
            value: form.isActive ? t.active : t.inactive,
            detail: t.availabilityReadyDetail,
            tone: form.isActive ? "success" : "muted",
            icon: ShieldCheck,
          },
        ]

  return (
    <div className="dashboard-landing-theme min-h-screen overflow-x-hidden text-[var(--dash-text)]">
      <main className="dashboard-landing-content mx-auto flex w-full max-w-7xl flex-col gap-5 px-4 py-6 sm:px-6 sm:py-8">
        <CommandBriefHeader
          eyebrow={isEdit ? t.editEyebrow : t.createEyebrow}
          title={title}
          summary={isEdit ? t.editSummary : t.createSummary}
          state={{
            label: isEdit ? (customer?.isActive ? t.active : t.inactive) : t.draft,
            tone: isEdit ? (customer?.isActive ? "success" : "muted") : "gold",
            icon: isEdit ? BadgeCheck : CalendarClock,
          }}
          metadata={isEdit && customer ? [
            { label: t.fields.code, value: customer.code ?? "—", icon: UserRound },
            { label: t.fields.preferredLocale, value: customer.preferredLocale, icon: Languages },
          ] : []}
          actions={[
            { label: t.back, href: basePath, icon: ArrowLeft, variant: "secondary" },
            ...(isEdit && customerId
              ? [{ label: t.viewProfile, href: `${basePath}/${customerId}`, variant: "primary" as const }]
              : []),
          ]}
          proof={{ state: "operational", label: t.trusted, source: t.source }}
        />

        <StatusStrip
          title={t.statusTitle}
          detail={t.statusDetail}
          items={readinessItems}
          className="overflow-hidden"
        />

        <Card className={`${dashboardPanelClass} min-w-0 overflow-hidden`}>
          <CardHeader className="border-b border-[var(--dash-border-subtle)] bg-[rgba(12,20,24,0.52)] px-4 py-5 sm:px-6">
            <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
              <div className="flex min-w-0 items-start gap-3">
                <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl border border-[var(--dash-brand)] bg-[var(--dash-brand-soft)] text-[var(--dash-brand-strong)]">
                  <FileCheck2 className="h-5 w-5" aria-hidden="true" />
                </span>
                <div className="min-w-0">
                  <CardTitle className="text-lg text-[var(--dash-text)]">
                    {isEdit ? t.editTitle : t.createTitle}
                  </CardTitle>
                  <p className="mt-1 max-w-3xl text-sm leading-6 text-[var(--dash-text-soft)]">
                    {t.formIntro}
                  </p>
                </div>
              </div>

              <div className="flex flex-wrap items-center gap-2" aria-live="polite">
                {isEdit ? (
                  <Badge variant="outline" className="gap-1.5 rounded-md border-[var(--dash-border-subtle)] text-[var(--dash-text-soft)]">
                    <Clock3 className="h-3.5 w-3.5" aria-hidden="true" />
                    {t.lastUpdated}: {lastUpdated}
                  </Badge>
                ) : null}
                <Badge
                  variant="outline"
                  className={`gap-1.5 rounded-md ${dashboardToneClass(changedFieldCount > 0 ? "gold" : isEdit ? "success" : "info")}`}
                >
                  {changedFieldCount > 0 ? <PencilLine className="h-3.5 w-3.5" aria-hidden="true" /> : <CheckCircle2 className="h-3.5 w-3.5" aria-hidden="true" />}
                  {isEdit ? (changedFieldCount > 0 ? changeLabel : t.current) : t.draft}
                </Badge>
              </div>
            </div>
          </CardHeader>

          <CardContent className="p-4 sm:p-6">
            <form className="space-y-5" onSubmit={submit} aria-busy={isSaving}>
              <div className="grid items-start gap-5 xl:grid-cols-[minmax(0,1.35fr)_minmax(320px,0.65fr)]">
                <FormSection title={t.contact} description={t.contactDetail} icon={UserRound}>
                  <div className="grid gap-4 sm:grid-cols-2">
                    <Field id="customer-name" label={t.fields.name} required>
                      <Input
                        id="customer-name"
                        value={form.name}
                        onChange={(event) => updateField("name", event.target.value)}
                        placeholder={t.placeholders.name}
                        className="dashboard-control h-11 rounded-lg"
                        autoComplete="organization"
                      />
                    </Field>
                    <Field id="customer-code" label={t.fields.code} hint={t.codeHint}>
                      <Input
                        id="customer-code"
                        value={form.code}
                        onChange={(event) => updateField("code", event.target.value)}
                        placeholder={t.placeholders.code}
                        className="dashboard-control h-11 rounded-lg font-mono"
                      />
                    </Field>
                    <Field id="customer-email" label={t.fields.email}>
                      <Input
                        id="customer-email"
                        type="email"
                        value={form.email}
                        onChange={(event) => updateField("email", event.target.value)}
                        placeholder={t.placeholders.email}
                        className="dashboard-control h-11 rounded-lg"
                        autoComplete="email"
                      />
                    </Field>
                    <Field id="customer-phone" label={t.fields.phone}>
                      <Input
                        id="customer-phone"
                        type="tel"
                        value={form.phone}
                        onChange={(event) => updateField("phone", event.target.value)}
                        placeholder={t.placeholders.phone}
                        className="dashboard-control h-11 rounded-lg"
                        autoComplete="tel"
                      />
                    </Field>
                    <Field id="customer-address" label={t.fields.address}>
                      <Input
                        id="customer-address"
                        value={form.address}
                        onChange={(event) => updateField("address", event.target.value)}
                        placeholder={t.placeholders.address}
                        className="dashboard-control h-11 rounded-lg"
                        autoComplete="street-address"
                      />
                    </Field>
                    <Field id="customer-tax-id" label={t.fields.taxId}>
                      <Input
                        id="customer-tax-id"
                        value={form.taxId}
                        onChange={(event) => updateField("taxId", event.target.value)}
                        placeholder={t.placeholders.taxId}
                        className="dashboard-control h-11 rounded-lg"
                      />
                    </Field>
                    </div>
                  </FormSection>

                <div className="space-y-5">
                  <FormSection title={t.commercial} description={t.commercialDetail} icon={Wallet}>
                  <div className="grid gap-4">
                    <Field id="customer-terms" label={t.fields.paymentTerms}>
                      <Input
                        id="customer-terms"
                        type="number"
                        min="0"
                        max="365"
                        step="1"
                        value={form.paymentTerms}
                        onChange={(event) => updateField("paymentTerms", event.target.value)}
                        className="dashboard-control h-11 rounded-lg"
                      />
                    </Field>
                    <Field id="customer-credit" label={t.fields.creditLimit} hint={t.creditHint}>
                      <Input
                        id="customer-credit"
                        type="number"
                        min="0"
                        step="1"
                        value={form.creditLimit}
                        onChange={(event) => updateField("creditLimit", event.target.value)}
                        placeholder={t.placeholders.creditLimit}
                        className="dashboard-control h-11 rounded-lg"
                      />
                    </Field>
                    <Field id="customer-language" label={t.fields.preferredLocale}>
                      <Select value={form.preferredLocale} onValueChange={(value) => updateField("preferredLocale", value as CustomerLocale)}>
                        <SelectTrigger id="customer-language" className="dashboard-control h-11 rounded-lg">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent className="border-[var(--dash-border-subtle)] bg-[var(--dash-surface-raised)] text-[var(--dash-text)]">
                          <SelectItem value="EN">English (EN)</SelectItem>
                          <SelectItem value="FR">Français (FR)</SelectItem>
                        </SelectContent>
                      </Select>
                    </Field>
                    <div className="flex min-h-20 items-center justify-between gap-4 rounded-xl border border-[var(--dash-border-subtle)] bg-[rgba(37,57,67,0.32)] p-4">
                      <div className="min-w-0">
                        <Label htmlFor="customer-active" className="text-sm font-semibold text-[var(--dash-text)]">
                          {t.fields.isActive}
                        </Label>
                        <p className="mt-1 text-xs leading-5 text-[var(--dash-text-soft)]">{t.activeHint}</p>
                      </div>
                      <Switch id="customer-active" checked={form.isActive} onCheckedChange={(checked) => updateField("isActive", checked)} />
                    </div>
                  </div>
                  </FormSection>

                  <FormSection title={t.notes} description={t.notesDetail} icon={PencilLine}>
                    <Field id="customer-notes" label={t.fields.notes}>
                      <Textarea
                        id="customer-notes"
                        value={form.notes}
                        onChange={(event) => updateField("notes", event.target.value)}
                        placeholder={t.placeholders.notes}
                        className="dashboard-control min-h-36 resize-y rounded-lg"
                      />
                    </Field>
                  </FormSection>
                </div>
              </div>

              {formError ? (
                <div role="alert" aria-live="polite" className="rounded-xl border border-[var(--dash-danger)] bg-[var(--dash-danger-soft)] px-4 py-3 text-sm font-medium text-[var(--dash-danger)]">
                  {formError}
                </div>
              ) : null}

              <div className="sticky bottom-3 z-10 flex flex-col gap-3 rounded-xl border border-[var(--dash-border-subtle)] bg-[rgba(12,20,24,0.92)] p-3 shadow-2xl backdrop-blur-xl sm:flex-row sm:items-center sm:justify-between">
                <div className="min-w-0" aria-live="polite">
                  <p className="text-sm font-semibold text-[var(--dash-text)]">
                    {isEdit ? (changedFieldCount > 0 ? changeLabel : t.current) : t.draft}
                  </p>
                  <p className="mt-0.5 text-xs leading-5 text-[var(--dash-text-soft)]">
                    {isEdit && changedFieldCount === 0 ? t.noPendingChanges : t.formHelp}
                  </p>
                </div>
                <div className="flex flex-col-reverse gap-2 sm:flex-row">
                  <Button type="button" variant="outline" className="dashboard-button-secondary rounded-lg" disabled={isSaving} onClick={() => router.push(isEdit && customerId ? `${basePath}/${customerId}` : basePath)}>
                    {t.cancel}
                  </Button>
                  <Button type="submit" className="dashboard-button-primary rounded-lg" disabled={isSaving || (isEdit && changedFieldCount === 0)}>
                    {isSaving ? <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" /> : isEdit ? <Save className="h-4 w-4" aria-hidden="true" /> : <Plus className="h-4 w-4" aria-hidden="true" />}
                    {isSaving ? (isEdit ? t.updating : t.creating) : isEdit ? t.update : t.create}
                  </Button>
                </div>
              </div>
            </form>
          </CardContent>
        </Card>
      </main>
    </div>
  )
}

function FormSection({
  title,
  description,
  icon: Icon,
  children,
}: {
  title: string
  description: string
  icon: LucideIcon
  children: ReactNode
}) {
  return (
    <section className="overflow-hidden rounded-xl border border-[var(--dash-border-subtle)] bg-[rgba(37,57,67,0.24)]">
      <div className="flex items-start gap-3 border-b border-[var(--dash-border-subtle)] bg-[rgba(12,20,24,0.3)] p-4">
        <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg border border-[var(--dash-border-subtle)] bg-[var(--dash-brand-soft)] text-[var(--dash-brand-strong)]">
          <Icon className="h-4 w-4" aria-hidden="true" />
        </span>
        <div className="min-w-0">
          <h2 className="text-sm font-semibold text-[var(--dash-text)]">{title}</h2>
          <p className="mt-1 text-xs leading-5 text-[var(--dash-text-soft)]">{description}</p>
        </div>
      </div>
      <div className="p-4">{children}</div>
    </section>
  )
}

function Field({
  id,
  label,
  hint,
  required,
  children,
}: {
  id: string
  label: string
  hint?: string
  required?: boolean
  children: ReactNode
}) {
  return (
    <div className="space-y-2">
      <Label htmlFor={id} className="text-sm font-semibold text-[var(--dash-text)]">
        {label}
        {required ? <span className="ms-1 text-[var(--dash-danger)]">*</span> : null}
      </Label>
      {children}
      {hint ? <p className="text-xs leading-5 text-[var(--dash-text-soft)]">{hint}</p> : null}
    </div>
  )
}

function CustomerActionState({
  kind,
  title,
  message,
  backHref,
  backLabel,
}: {
  kind: "loading" | "error" | "empty"
  title?: string
  message?: string
  backHref?: string
  backLabel?: string
}) {
  return (
    <div className="dashboard-landing-theme min-h-screen overflow-x-hidden text-[var(--dash-text)]">
      <main className="dashboard-landing-content mx-auto w-full max-w-4xl px-4 py-8 sm:px-6">
        <RouteStatePanel
          kind={kind}
          title={title}
          message={message}
          action={backHref && backLabel ? { label: backLabel, href: backHref, icon: ArrowLeft } : undefined}
        />
      </main>
    </div>
  )
}
