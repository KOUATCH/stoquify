"use client"

import Link from "next/link"
import { useCallback, useEffect, useMemo, useState, type CSSProperties, type ReactNode } from "react"
import type { ColumnDef } from "@tanstack/react-table"
import {
  AlertCircle,
  Archive,
  BarChart3,
  Building2,
  CalendarClock,
  CheckCircle2,
  ChevronsUpDown,
  Copy,
  Download,
  Edit3,
  ExternalLink,
  Languages,
  Loader2,
  Mail,
  MapPin,
  MoreHorizontal,
  PackageCheck,
  Phone,
  Plus,
  RefreshCw,
  ShieldAlert,
  ShoppingCart,
  Sparkles,
  Truck,
  Wallet,
  XCircle,
  type LucideIcon,
} from "lucide-react"

import DataTable from "@/components/DataTableComponents/DataTable"
import { useNotifications } from "@/components/notifications/NotificationProvider"
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Switch } from "@/components/ui/switch"
import { Textarea } from "@/components/ui/textarea"
import { cn } from "@/lib/utils"
import type { Locale } from "@/types/bilingual"
import type { SupplierManagementInput, SupplierManagementRow } from "@/actions/suppliers/supplier-management-actions"
import {
  useCreateManagedSupplier,
  useDeleteManagedSupplier,
  useSupplierAnalyticsData,
  useSupplierManagementData,
  useUpdateManagedSupplier,
} from "@/hooks/useSupplierManagement"

interface SupplierManagementDashboardProps {
  organizationId: string
  locale?: Locale
  basePath?: string
  initialAction?: "create"
  initialEditId?: string
  initialAnalyticsId?: string
}

type StatusFilter = "all" | "active" | "inactive"
type RiskFilter = "all" | "open-orders" | "over-limit" | "linked-items" | "no-links"
type LocaleFilter = "all" | "EN" | "FR"
type SupplierLocale = "EN" | "FR"

type SupplierFormState = {
  name: string
  code: string
  contactPerson: string
  email: string
  phone: string
  address: string
  city: string
  state: string
  zipCode: string
  country: string
  taxId: string
  paymentTerms: string
  creditLimit: string
  preferredLocale: SupplierLocale
  notes: string
  isActive: boolean
}

type StatStyle = CSSProperties & {
  "--stat-accent": string
  "--stat-soft": string
}

const copy = {
  en: {
    eyebrow: "Supplier control",
    title: "Suppliers dashboard",
    subtitle: "Manage supplier identity, purchasing readiness, payment terms, balances, item links, and supplier analytics.",
    create: "Create supplier",
    edit: "Edit supplier",
    analytics: "Supplier analytics",
    refresh: "Refresh",
    refreshing: "Refreshing",
    export: "Export",
    actions: "Actions",
    viewAnalytics: "View analytics",
    editSupplier: "Edit supplier",
    openEditPage: "Open edit page",
    copyId: "Copy ID",
    archive: "Archive",
    loadingTitle: "Loading suppliers",
    loadingBody: "Collecting supplier records, purchase activity, balances, and item links.",
    errorTitle: "Suppliers unavailable",
    retry: "Try again",
    emptyTitle: "No suppliers found",
    emptyBody: "Create suppliers before linking items or preparing purchase orders.",
    search: "Search suppliers, code, contact, email, phone, country...",
    status: "Status",
    risk: "Activity",
    language: "Language",
    all: "All",
    active: "Active",
    inactive: "Inactive",
    openOrders: "Open orders",
    overLimit: "Over limit",
    linkedItems: "Linked items",
    noLinks: "No links",
    totalSuppliers: "Total Suppliers",
    activeSuppliers: "Active",
    linkedItemsCard: "Linked Items",
    openOrdersCard: "Open Orders",
    creditLimit: "Credit Limit",
    balance: "Balance",
    filteredView: "Filtered View",
    preferredLinks: "Preferred links",
    totalPurchases: "Total purchases",
    averageTerms: "Avg terms",
    days: "days",
    liveData: "Live Data",
    tableTitle: "Supplier Management",
    showing: "Showing",
    of: "of",
    suppliers: "suppliers",
    clear: "Clear",
    copiedTitle: "Supplier ID copied",
    copiedBody: "The supplier identifier is ready to paste.",
    copyFailedTitle: "Copy failed",
    copyFailedBody: "The browser could not copy this identifier.",
    exportTitle: "Suppliers exported",
    exportBody: "The current supplier view was exported as CSV.",
    requiredTitle: "Supplier details required",
    requiredBody: "Enter a supplier name before saving.",
    invalidEmailTitle: "Invalid email",
    invalidEmailBody: "Use a valid email address or leave the field blank.",
    invalidTermsTitle: "Invalid payment terms",
    invalidTermsBody: "Payment terms must be a whole number from 0 to 365 days.",
    invalidCreditTitle: "Invalid credit limit",
    invalidCreditBody: "Credit limit must be zero or greater, or left blank.",
    cancel: "Cancel",
    saving: "Saving",
    creating: "Creating",
    formDescription: "Supplier identity, contact, commercial terms, language preference, and active status.",
    archiveTitle: "Archive supplier",
    archiveBody: "Suppliers with history are deactivated. Unused suppliers are archived from active lists.",
    confirmArchive: "Archive supplier",
    noCode: "No code",
    noContact: "No contact",
    noLocation: "No location",
    noEmail: "No email",
    noPhone: "No phone",
    noOrders: "No purchase orders yet",
    noLedger: "No ledger entries yet",
    noItems: "No item links yet",
    contact: "Contact",
    terms: "Terms",
    commercial: "Commercial",
    location: "Location",
    notes: "Notes",
    purchaseActivity: "Purchase activity",
    payableLedger: "Payable ledger",
    itemLinks: "Item links",
    topPurchases: "Top purchase value",
    topBalances: "Highest balances",
    recentOrders: "Recent orders",
    recentLedger: "Recent ledger",
    linkedItemsTitle: "Linked supplier items",
    tableColumns: {
      supplier: "Supplier",
      contact: "Contact",
      commercial: "Commercial",
      activity: "Activity",
      status: "Status",
      updated: "Updated",
      actions: "Actions",
    },
    fields: {
      name: "Supplier name",
      code: "Code",
      contactPerson: "Contact person",
      email: "Email",
      phone: "Phone",
      address: "Address",
      city: "City",
      state: "State",
      zipCode: "Postal code",
      country: "Country",
      taxId: "Tax ID",
      paymentTerms: "Payment terms",
      creditLimit: "Credit limit",
      preferredLocale: "Preferred language",
      isActive: "Active supplier",
      notes: "Notes",
    },
    placeholders: {
      name: "Global Office Supplies",
      code: "SUP-0042",
      contactPerson: "Nadia Bello",
      email: "supplier@example.com",
      phone: "+237 6 70 00 00 00",
      address: "Commercial avenue",
      city: "Douala",
      state: "Littoral",
      zipCode: "00000",
      country: "Cameroon",
      taxId: "M0123456789",
      paymentTerms: "30",
      creditLimit: "500000",
      notes: "Purchasing notes, delivery preferences, or payment instructions.",
    },
  },
  fr: {
    eyebrow: "Controle fournisseur",
    title: "Tableau fournisseurs",
    subtitle: "Gerez identite, achats, conditions de paiement, soldes, liens articles et analyses fournisseur.",
    create: "Creer fournisseur",
    edit: "Modifier fournisseur",
    analytics: "Analyse fournisseur",
    refresh: "Actualiser",
    refreshing: "Actualisation",
    export: "Exporter",
    actions: "Actions",
    viewAnalytics: "Voir analyse",
    editSupplier: "Modifier fournisseur",
    openEditPage: "Ouvrir page modification",
    copyId: "Copier ID",
    archive: "Archiver",
    loadingTitle: "Chargement fournisseurs",
    loadingBody: "Collecte des fiches, achats, soldes et liens articles.",
    errorTitle: "Fournisseurs indisponibles",
    retry: "Reessayer",
    emptyTitle: "Aucun fournisseur trouve",
    emptyBody: "Creez des fournisseurs avant de lier les articles ou preparer les achats.",
    search: "Rechercher fournisseur, code, contact, email, telephone, pays...",
    status: "Statut",
    risk: "Activite",
    language: "Langue",
    all: "Tous",
    active: "Actif",
    inactive: "Inactif",
    openOrders: "Commandes ouvertes",
    overLimit: "Hors limite",
    linkedItems: "Articles lies",
    noLinks: "Sans lien",
    totalSuppliers: "Total fournisseurs",
    activeSuppliers: "Actifs",
    linkedItemsCard: "Articles lies",
    openOrdersCard: "Commandes ouvertes",
    creditLimit: "Limite credit",
    balance: "Solde",
    filteredView: "Vue filtree",
    preferredLinks: "Liens preferes",
    totalPurchases: "Achats totaux",
    averageTerms: "Delai moyen",
    days: "jours",
    liveData: "Donnees live",
    tableTitle: "Gestion fournisseurs",
    showing: "Affichage",
    of: "sur",
    suppliers: "fournisseurs",
    clear: "Effacer",
    copiedTitle: "ID fournisseur copie",
    copiedBody: "L'identifiant fournisseur est pret a coller.",
    copyFailedTitle: "Copie echouee",
    copyFailedBody: "Le navigateur n'a pas pu copier cet identifiant.",
    exportTitle: "Fournisseurs exportes",
    exportBody: "La vue fournisseur actuelle a ete exportee en CSV.",
    requiredTitle: "Details fournisseur requis",
    requiredBody: "Saisissez le nom du fournisseur avant d'enregistrer.",
    invalidEmailTitle: "Email invalide",
    invalidEmailBody: "Utilisez une adresse email valide ou laissez le champ vide.",
    invalidTermsTitle: "Delai de paiement invalide",
    invalidTermsBody: "Le delai doit etre un nombre entier de 0 a 365 jours.",
    invalidCreditTitle: "Limite credit invalide",
    invalidCreditBody: "La limite credit doit etre positive ou vide.",
    cancel: "Annuler",
    saving: "Enregistrement",
    creating: "Creation",
    formDescription: "Identite, contact, conditions commerciales, langue et statut actif.",
    archiveTitle: "Archiver fournisseur",
    archiveBody: "Les fournisseurs avec historique sont desactives. Les fournisseurs inutilises sont archives.",
    confirmArchive: "Archiver fournisseur",
    noCode: "Aucun code",
    noContact: "Aucun contact",
    noLocation: "Aucun lieu",
    noEmail: "Aucun email",
    noPhone: "Aucun telephone",
    noOrders: "Aucune commande d'achat",
    noLedger: "Aucune ecriture fournisseur",
    noItems: "Aucun lien article",
    contact: "Contact",
    terms: "Conditions",
    commercial: "Commercial",
    location: "Localisation",
    notes: "Notes",
    purchaseActivity: "Activite achats",
    payableLedger: "Grand livre fournisseur",
    itemLinks: "Liens articles",
    topPurchases: "Top valeur achats",
    topBalances: "Soldes les plus eleves",
    recentOrders: "Commandes recentes",
    recentLedger: "Ecritures recentes",
    linkedItemsTitle: "Articles fournisseur lies",
    tableColumns: {
      supplier: "Fournisseur",
      contact: "Contact",
      commercial: "Commercial",
      activity: "Activite",
      status: "Statut",
      updated: "Mis a jour",
      actions: "Actions",
    },
    fields: {
      name: "Nom fournisseur",
      code: "Code",
      contactPerson: "Personne contact",
      email: "Email",
      phone: "Telephone",
      address: "Adresse",
      city: "Ville",
      state: "Region",
      zipCode: "Code postal",
      country: "Pays",
      taxId: "ID fiscal",
      paymentTerms: "Delai paiement",
      creditLimit: "Limite credit",
      preferredLocale: "Langue preferee",
      isActive: "Fournisseur actif",
      notes: "Notes",
    },
    placeholders: {
      name: "Global Office Supplies",
      code: "SUP-0042",
      contactPerson: "Nadia Bello",
      email: "supplier@example.com",
      phone: "+237 6 70 00 00 00",
      address: "Avenue commerciale",
      city: "Douala",
      state: "Littoral",
      zipCode: "00000",
      country: "Cameroun",
      taxId: "M0123456789",
      paymentTerms: "30",
      creditLimit: "500000",
      notes: "Notes d'achat, preferences de livraison ou instructions de paiement.",
    },
  },
} as const

function getDefaultForm(): SupplierFormState {
  return {
    name: "",
    code: "",
    contactPerson: "",
    email: "",
    phone: "",
    address: "",
    city: "",
    state: "",
    zipCode: "",
    country: "",
    taxId: "",
    paymentTerms: "30",
    creditLimit: "",
    preferredLocale: "EN",
    notes: "",
    isActive: true,
  }
}

function formFromSupplier(supplier: SupplierManagementRow): SupplierFormState {
  return {
    name: supplier.name,
    code: supplier.code ?? "",
    contactPerson: supplier.contactPerson ?? "",
    email: supplier.email ?? "",
    phone: supplier.phone ?? "",
    address: supplier.address ?? "",
    city: supplier.city ?? "",
    state: supplier.state ?? "",
    zipCode: supplier.zipCode ?? "",
    country: supplier.country ?? "",
    taxId: supplier.taxId ?? "",
    paymentTerms: String(supplier.paymentTerms ?? 30),
    creditLimit: supplier.creditLimit !== null ? String(supplier.creditLimit) : "",
    preferredLocale: supplier.preferredLocale,
    notes: supplier.notes ?? "",
    isActive: supplier.isActive,
  }
}

function formatNumber(value: number, locale: Locale) {
  return new Intl.NumberFormat(locale === "fr" ? "fr-FR" : "en-US", {
    maximumFractionDigits: 2,
  }).format(value)
}

function formatCurrency(value: number, locale: Locale) {
  return new Intl.NumberFormat(locale === "fr" ? "fr-FR" : "en-US", {
    style: "currency",
    currency: "XAF",
    maximumFractionDigits: 0,
  }).format(value)
}

function formatDate(value: Date | string | null | undefined, locale: Locale, fallback = "Never") {
  if (!value) return fallback
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return fallback

  return new Intl.DateTimeFormat(locale === "fr" ? "fr-FR" : "en-US", {
    dateStyle: "medium",
  }).format(date)
}

function escapeCsv(value: string | number | boolean | null | undefined) {
  const text = String(value ?? "")
  return `"${text.replace(/"/g, '""')}"`
}

function initials(name: string) {
  return name
    .split(" ")
    .filter(Boolean)
    .map((word) => word[0])
    .join("")
    .toUpperCase()
    .slice(0, 2) || "SU"
}

function isOverCreditLimit(supplier: SupplierManagementRow) {
  return supplier.creditLimit !== null && supplier.currentBalance > supplier.creditLimit
}

function toneClass(tone: "brand" | "success" | "spruce" | "gold" | "danger" | "info") {
  return {
    brand: "border-[var(--dash-brand)] bg-[var(--dash-brand-soft)] text-[var(--dash-brand-strong)]",
    success: "border-[var(--dash-success)] bg-[var(--dash-success-soft)] text-[var(--dash-success)]",
    spruce: "border-[var(--dash-spruce)] bg-[var(--dash-spruce-soft)] text-[var(--dash-spruce)]",
    gold: "border-[var(--dash-gold)] bg-[var(--dash-gold-soft)] text-[var(--dash-gold)]",
    danger: "border-[var(--dash-danger)] bg-[var(--dash-danger-soft)] text-[var(--dash-danger)]",
    info: "border-[var(--dash-info)] bg-[var(--dash-info-soft)] text-[var(--dash-info)]",
  }[tone]
}

function SortIcon({ sorted }: { sorted: false | "asc" | "desc" }) {
  return (
    <ChevronsUpDown
      className={cn("h-3.5 w-3.5", sorted ? "text-[var(--dash-brand-strong)]" : "text-[var(--dash-text-faint)]")}
    />
  )
}

export default function SupplierManagementDashboard({
  organizationId,
  locale = "en",
  basePath = "/dashboard/purchases/suppliers",
  initialAction,
  initialEditId,
  initialAnalyticsId,
}: SupplierManagementDashboardProps) {
  const t = copy[locale]
  const notifications = useNotifications()
  const [statusFilter, setStatusFilter] = useState<StatusFilter>("all")
  const [riskFilter, setRiskFilter] = useState<RiskFilter>("all")
  const [localeFilter, setLocaleFilter] = useState<LocaleFilter>("all")
  const [formOpen, setFormOpen] = useState(false)
  const [editingSupplier, setEditingSupplier] = useState<SupplierManagementRow | null>(null)
  const [archiveTarget, setArchiveTarget] = useState<SupplierManagementRow | null>(null)
  const [analyticsSupplierId, setAnalyticsSupplierId] = useState<string | null>(null)
  const [formState, setFormState] = useState<SupplierFormState>(() => getDefaultForm())
  const [formError, setFormError] = useState<string | null>(null)
  const [initialRequestHandled, setInitialRequestHandled] = useState(false)

  const {
    data,
    isLoading,
    isFetching,
    isError,
    error,
    refetch,
  } = useSupplierManagementData(organizationId)
  const createMutation = useCreateManagedSupplier(organizationId, locale)
  const updateMutation = useUpdateManagedSupplier(organizationId, locale)
  const archiveMutation = useDeleteManagedSupplier(organizationId, locale)
  const analyticsQuery = useSupplierAnalyticsData(organizationId, analyticsSupplierId)

  const suppliers = useMemo(() => data?.suppliers ?? [], [data?.suppliers])
  const isSaving = createMutation.isPending || updateMutation.isPending
  const analyticsSupplier = analyticsQuery.data?.supplier ?? suppliers.find((supplier) => supplier.id === analyticsSupplierId) ?? null

  const filteredSuppliers = useMemo(() => {
    return suppliers.filter((supplier) => {
      if (statusFilter === "active" && !supplier.isActive) return false
      if (statusFilter === "inactive" && supplier.isActive) return false
      if (localeFilter !== "all" && supplier.preferredLocale !== localeFilter) return false
      if (riskFilter === "open-orders" && supplier.openPurchaseOrdersCount === 0) return false
      if (riskFilter === "over-limit" && !isOverCreditLimit(supplier)) return false
      if (riskFilter === "linked-items" && supplier.supplierItemsCount === 0) return false
      if (riskFilter === "no-links" && supplier.supplierItemsCount > 0) return false

      return true
    })
  }, [localeFilter, riskFilter, statusFilter, suppliers])

  const openCreate = useCallback(() => {
    setEditingSupplier(null)
    setFormError(null)
    setFormState(getDefaultForm())
    setFormOpen(true)
  }, [])

  const openEdit = useCallback((supplier: SupplierManagementRow) => {
    setEditingSupplier(supplier)
    setFormError(null)
    setFormState(formFromSupplier(supplier))
    setFormOpen(true)
  }, [])

  useEffect(() => {
    if (initialRequestHandled || isLoading) return

    if (initialAction === "create") {
      openCreate()
      setInitialRequestHandled(true)
      return
    }

    if (initialEditId) {
      const supplier = suppliers.find((item) => item.id === initialEditId)

      if (supplier) {
        openEdit(supplier)
      } else {
        notifications.error(t.errorTitle, "The requested supplier could not be opened for editing.")
      }

      setInitialRequestHandled(true)
      return
    }

    if (initialAnalyticsId) {
      setAnalyticsSupplierId(initialAnalyticsId)
      setInitialRequestHandled(true)
    }
  }, [
    initialAction,
    initialAnalyticsId,
    initialEditId,
    initialRequestHandled,
    isLoading,
    notifications,
    openCreate,
    openEdit,
    suppliers,
    t.errorTitle,
  ])

  const updateFormField = useCallback(<K extends keyof SupplierFormState>(field: K, value: SupplierFormState[K]) => {
    setFormState((current) => ({ ...current, [field]: value }))
    setFormError(null)
  }, [])

  const buildInput = useCallback((): SupplierManagementInput | null => {
    const name = formState.name.trim()
    const email = formState.email.trim()
    const paymentTerms = Number(formState.paymentTerms.trim() || 0)
    const creditLimitText = formState.creditLimit.trim()
    const creditLimit = creditLimitText ? Number(creditLimitText) : null

    if (!name) {
      notifications.warning(t.requiredTitle, t.requiredBody)
      setFormError(t.requiredBody)
      return null
    }

    if (email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      notifications.warning(t.invalidEmailTitle, t.invalidEmailBody)
      setFormError(t.invalidEmailBody)
      return null
    }

    if (!Number.isInteger(paymentTerms) || paymentTerms < 0 || paymentTerms > 365) {
      notifications.warning(t.invalidTermsTitle, t.invalidTermsBody)
      setFormError(t.invalidTermsBody)
      return null
    }

    if (creditLimit !== null && (!Number.isFinite(creditLimit) || creditLimit < 0)) {
      notifications.warning(t.invalidCreditTitle, t.invalidCreditBody)
      setFormError(t.invalidCreditBody)
      return null
    }

    return {
      name,
      code: formState.code.trim() || null,
      contactPerson: formState.contactPerson.trim() || null,
      email: email || null,
      phone: formState.phone.trim() || null,
      address: formState.address.trim() || null,
      city: formState.city.trim() || null,
      state: formState.state.trim() || null,
      zipCode: formState.zipCode.trim() || null,
      country: formState.country.trim() || null,
      taxId: formState.taxId.trim() || null,
      paymentTerms,
      creditLimit,
      preferredLocale: formState.preferredLocale,
      notes: formState.notes.trim() || null,
      isActive: formState.isActive,
    }
  }, [formState, notifications, t])

  const submitForm = useCallback(async () => {
    const payload = buildInput()
    if (!payload) return

    try {
      if (editingSupplier) {
        await updateMutation.mutateAsync({ id: editingSupplier.id, data: payload })
      } else {
        await createMutation.mutateAsync(payload)
      }

      setFormOpen(false)
      setEditingSupplier(null)
      setFormState(getDefaultForm())
      setFormError(null)
    } catch (mutationError) {
      setFormError(mutationError instanceof Error ? mutationError.message : t.errorTitle)
    }
  }, [buildInput, createMutation, editingSupplier, t.errorTitle, updateMutation])

  const copySupplierId = useCallback(async (supplier: SupplierManagementRow) => {
    try {
      await navigator.clipboard.writeText(supplier.id)
      notifications.success(t.copiedTitle, t.copiedBody)
    } catch {
      notifications.error(t.copyFailedTitle, t.copyFailedBody)
    }
  }, [notifications, t.copiedBody, t.copiedTitle, t.copyFailedBody, t.copyFailedTitle])

  const exportSuppliers = useCallback(() => {
    const header = [
      "Name",
      "Code",
      "Contact",
      "Email",
      "Phone",
      "Country",
      "Payment Terms",
      "Credit Limit",
      "Balance",
      "Active",
      "Linked Items",
      "Open Orders",
    ]
    const rows = filteredSuppliers.map((supplier) => [
      supplier.name,
      supplier.code ?? "",
      supplier.contactPerson ?? "",
      supplier.email ?? "",
      supplier.phone ?? "",
      supplier.country ?? "",
      supplier.paymentTerms ?? "",
      supplier.creditLimit ?? "",
      supplier.currentBalance,
      supplier.isActive ? "true" : "false",
      supplier.supplierItemsCount,
      supplier.openPurchaseOrdersCount,
    ])
    const csv = [header, ...rows]
      .map((row) => row.map((value) => escapeCsv(value)).join(","))
      .join("\n")
    const blob = new Blob([csv], { type: "text/csv;charset=utf-8" })
    const url = URL.createObjectURL(blob)
    const anchor = document.createElement("a")
    anchor.href = url
    anchor.download = "suppliers.csv"
    anchor.click()
    URL.revokeObjectURL(url)
    notifications.success(t.exportTitle, t.exportBody)
  }, [filteredSuppliers, notifications, t.exportBody, t.exportTitle])

  const columns = useMemo<ColumnDef<SupplierManagementRow>[]>(() => [
    {
      accessorKey: "name",
      header: ({ column }) => (
        <HeaderButton onClick={() => column.toggleSorting(column.getIsSorted() === "asc")}>
          {t.tableColumns.supplier}
          <SortIcon sorted={column.getIsSorted()} />
        </HeaderButton>
      ),
      cell: ({ row }) => {
        const supplier = row.original
        return (
          <div className="flex min-w-[250px] items-center gap-3">
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg border border-[var(--dash-border-subtle)] bg-[var(--dash-brand-soft)] text-sm font-semibold text-[var(--dash-brand-strong)]">
              {initials(supplier.name)}
            </div>
            <div className="min-w-0">
              <p className="truncate font-semibold text-[var(--dash-text)]">{supplier.name}</p>
              <div className="mt-1 flex min-w-0 flex-wrap items-center gap-1.5">
                <Badge variant="outline" className="rounded-lg border-[var(--dash-border-subtle)] bg-[rgba(24,38,45,0.72)] font-mono text-[var(--dash-text-soft)]">
                  {supplier.code || t.noCode}
                </Badge>
                <Badge variant="outline" className={cn("rounded-lg", supplier.preferredLocale === "FR" ? toneClass("spruce") : toneClass("brand"))}>
                  <Languages className="me-1 h-3 w-3" />
                  {supplier.preferredLocale}
                </Badge>
              </div>
            </div>
          </div>
        )
      },
      filterFn: (row, _id, value) => {
        const searchValue = String(value).toLowerCase()
        const supplier = row.original
        return [
          supplier.name,
          supplier.code,
          supplier.contactPerson,
          supplier.email,
          supplier.phone,
          supplier.city,
          supplier.country,
          supplier.taxId,
        ]
          .filter(Boolean)
          .some((field) => String(field).toLowerCase().includes(searchValue))
      },
    },
    {
      id: "contact",
      header: t.tableColumns.contact,
      cell: ({ row }) => {
        const supplier = row.original
        return (
          <div className="min-w-[210px] space-y-1.5 text-sm text-[var(--dash-text-soft)]">
            <p className="font-medium text-[var(--dash-text)]">{supplier.contactPerson || t.noContact}</p>
            <p className="flex min-w-0 items-center gap-2">
              <Mail className="h-3.5 w-3.5 shrink-0 text-[var(--dash-info)]" />
              <span className="truncate">{supplier.email || t.noEmail}</span>
            </p>
            <p className="flex min-w-0 items-center gap-2">
              <Phone className="h-3.5 w-3.5 shrink-0 text-[var(--dash-spruce)]" />
              <span className="truncate">{supplier.phone || t.noPhone}</span>
            </p>
          </div>
        )
      },
    },
    {
      id: "commercial",
      header: t.tableColumns.commercial,
      cell: ({ row }) => {
        const supplier = row.original
        const overLimit = isOverCreditLimit(supplier)
        return (
          <div className="min-w-[210px] space-y-2">
            <InlineMetric label={t.creditLimit} value={supplier.creditLimit !== null ? formatCurrency(supplier.creditLimit, locale) : "-"} />
            <InlineMetric label={t.balance} value={formatCurrency(supplier.currentBalance, locale)} tone={overLimit ? "danger" : "default"} />
            <p className="text-xs text-[var(--dash-text-faint)]">
              {supplier.paymentTerms ?? 0} {t.days}
            </p>
          </div>
        )
      },
    },
    {
      id: "activity",
      header: t.tableColumns.activity,
      cell: ({ row }) => {
        const supplier = row.original
        return (
          <div className="grid min-w-[230px] grid-cols-2 gap-2 text-sm">
            <InlineMetric label={t.linkedItemsCard} value={formatNumber(supplier.supplierItemsCount, locale)} />
            <InlineMetric label={t.openOrdersCard} value={formatNumber(supplier.openPurchaseOrdersCount, locale)} tone={supplier.openPurchaseOrdersCount > 0 ? "gold" : "default"} />
            <InlineMetric label={t.totalPurchases} value={formatCurrency(supplier.totalPurchaseValue, locale)} />
            <InlineMetric label={t.preferredLinks} value={formatNumber(supplier.preferredItemsCount, locale)} />
          </div>
        )
      },
    },
    {
      accessorKey: "isActive",
      header: ({ column }) => (
        <HeaderButton onClick={() => column.toggleSorting(column.getIsSorted() === "asc")}>
          {t.tableColumns.status}
          <SortIcon sorted={column.getIsSorted()} />
        </HeaderButton>
      ),
      cell: ({ row }) => {
        const supplier = row.original
        const overLimit = isOverCreditLimit(supplier)
        return (
          <div className="space-y-2">
            <Badge variant="outline" className={cn("rounded-lg", supplier.isActive ? toneClass("success") : "border-[var(--dash-border-subtle)] bg-[rgba(126,145,137,0.14)] text-[var(--dash-text-soft)]")}>
              {supplier.isActive ? <CheckCircle2 className="me-1 h-3.5 w-3.5" /> : <XCircle className="me-1 h-3.5 w-3.5" />}
              {supplier.isActive ? t.active : t.inactive}
            </Badge>
            {overLimit ? (
              <Badge variant="outline" className={cn("rounded-lg", toneClass("danger"))}>
                <ShieldAlert className="me-1 h-3.5 w-3.5" />
                {t.overLimit}
              </Badge>
            ) : null}
          </div>
        )
      },
    },
    {
      accessorKey: "updatedAt",
      header: ({ column }) => (
        <HeaderButton onClick={() => column.toggleSorting(column.getIsSorted() === "asc")}>
          {t.tableColumns.updated}
          <SortIcon sorted={column.getIsSorted()} />
        </HeaderButton>
      ),
      cell: ({ row }) => (
        <div className="min-w-[150px] text-sm text-[var(--dash-text-soft)]">
          {formatDate(row.original.updatedAt, locale)}
        </div>
      ),
    },
    {
      id: "actions",
      header: t.tableColumns.actions,
      enableSorting: false,
      enableHiding: false,
      cell: ({ row }) => {
        const supplier = row.original
        return (
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" size="icon" className="h-9 w-9 rounded-lg text-[var(--dash-text-soft)] hover:bg-[var(--dash-brand-soft)] hover:text-[var(--dash-brand-strong)]">
                <MoreHorizontal className="h-4 w-4" />
                <span className="sr-only">Open supplier actions</span>
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-52 border-[var(--dash-border-subtle)] bg-[var(--dash-surface-raised)] text-[var(--dash-text)]">
              <DropdownMenuLabel>{t.actions}</DropdownMenuLabel>
              <DropdownMenuItem onClick={() => copySupplierId(supplier)}>
                <Copy className="me-2 h-4 w-4" />
                {t.copyId}
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuItem onClick={() => setAnalyticsSupplierId(supplier.id)}>
                <BarChart3 className="me-2 h-4 w-4" />
                {t.viewAnalytics}
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => openEdit(supplier)}>
                <Edit3 className="me-2 h-4 w-4" />
                {t.editSupplier}
              </DropdownMenuItem>
              <DropdownMenuItem asChild>
                <Link href={`${basePath}/${supplier.id}/edit`}>
                  <ExternalLink className="me-2 h-4 w-4" />
                  {t.openEditPage}
                </Link>
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuItem className="text-[var(--dash-danger)] focus:text-[var(--dash-danger)]" onClick={() => setArchiveTarget(supplier)}>
                <Archive className="me-2 h-4 w-4" />
                {t.archive}
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        )
      },
    },
  ], [basePath, copySupplierId, locale, openEdit, t])

  const statsCards = useMemo(() => {
    const summary = data?.summary
    return [
      {
        label: t.totalSuppliers,
        value: formatNumber(summary?.totalSuppliers ?? 0, locale),
        Icon: Truck,
        accent: "var(--dash-brand)",
        soft: "var(--dash-brand-soft)",
        sub: t.suppliers,
      },
      {
        label: t.activeSuppliers,
        value: formatNumber(summary?.activeSuppliers ?? 0, locale),
        Icon: CheckCircle2,
        accent: "var(--dash-success)",
        soft: "var(--dash-success-soft)",
        sub: `${formatNumber(summary?.inactiveSuppliers ?? 0, locale)} ${t.inactive}`,
      },
      {
        label: t.linkedItemsCard,
        value: formatNumber(summary?.linkedItems ?? 0, locale),
        Icon: PackageCheck,
        accent: "var(--dash-info)",
        soft: "var(--dash-info-soft)",
        sub: `${formatNumber(summary?.preferredItemLinks ?? 0, locale)} ${t.preferredLinks}`,
      },
      {
        label: t.openOrdersCard,
        value: formatNumber(summary?.openPurchaseOrders ?? 0, locale),
        Icon: ShoppingCart,
        accent: "var(--dash-gold)",
        soft: "var(--dash-gold-soft)",
        sub: `${formatNumber(summary?.purchaseOrders ?? 0, locale)} ${t.totalPurchases}`,
      },
      {
        label: t.creditLimit,
        value: formatCurrency(summary?.totalCreditLimit ?? 0, locale),
        Icon: Wallet,
        accent: "var(--dash-spruce)",
        soft: "var(--dash-spruce-soft)",
        sub: `${formatNumber(summary?.averagePaymentTerms ?? 0, locale)} ${t.days}`,
      },
      {
        label: t.balance,
        value: formatCurrency(summary?.totalBalance ?? 0, locale),
        Icon: ShieldAlert,
        accent: "var(--dash-warm)",
        soft: "var(--dash-warm-soft)",
        sub: `${formatNumber(summary?.overCreditLimitSuppliers ?? 0, locale)} ${t.overLimit}`,
      },
    ]
  }, [data?.summary, locale, t])

  if (isLoading) {
    return (
      <section className="dashboard-glass-panel flex min-h-[24rem] items-center justify-center rounded-lg border border-[var(--dash-border-subtle)] p-8 text-center">
        <div className="space-y-4">
          <Loader2 className="mx-auto h-8 w-8 animate-spin text-[var(--dash-brand-strong)]" />
          <div>
            <p className="font-semibold text-[var(--dash-text)]">{t.loadingTitle}</p>
            <p className="mt-1 text-sm text-[var(--dash-text-soft)]">{t.loadingBody}</p>
          </div>
        </div>
      </section>
    )
  }

  if (isError) {
    return (
      <section className="dashboard-glass-panel flex min-h-[24rem] items-center justify-center rounded-lg border border-[var(--dash-border-subtle)] p-8 text-center">
        <div className="max-w-md space-y-4">
          <AlertCircle className="mx-auto h-9 w-9 text-[var(--dash-danger)]" />
          <div>
            <p className="font-semibold text-[var(--dash-text)]">{t.errorTitle}</p>
            <p className="mt-1 text-sm text-[var(--dash-text-soft)]">
              {error instanceof Error ? error.message : t.errorTitle}
            </p>
          </div>
          <Button type="button" onClick={() => refetch()} className="dashboard-button-primary h-10 rounded-lg">
            <RefreshCw className="h-4 w-4" />
            {t.retry}
          </Button>
        </div>
      </section>
    )
  }

  return (
    <>
      <section className="space-y-6">
        <div className="flex min-w-0 flex-col gap-5 xl:flex-row xl:items-end xl:justify-between">
          <div className="min-w-0 max-w-3xl">
            <div className="dashboard-eyebrow mb-4">
              <span className="dashboard-live-dot" />
              {t.eyebrow}
            </div>
            <div className="flex min-w-0 items-start gap-4">
              <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-lg border border-[var(--dash-border-subtle)] bg-[var(--dash-brand-soft)] shadow-[0_16px_34px_rgba(47,125,246,0.18)]">
                <Truck className="h-6 w-6 text-[var(--dash-brand-strong)]" />
              </div>
              <div className="min-w-0">
                <h1 className="text-3xl font-semibold tracking-tight text-[var(--dash-text)] sm:text-4xl">{t.title}</h1>
                <p className="mt-2 max-w-2xl text-sm leading-6 text-[var(--dash-text-soft)] sm:text-base">{t.subtitle}</p>
              </div>
            </div>
          </div>
          <div className="flex w-full shrink-0 flex-col gap-2 sm:w-auto sm:flex-row sm:items-center">
            <Button
              type="button"
              variant="outline"
              onClick={() => refetch()}
              disabled={isFetching}
              className="dashboard-button-secondary h-10 w-full rounded-lg sm:w-auto"
            >
              <RefreshCw className={cn("h-4 w-4", isFetching && "animate-spin")} />
              {isFetching ? t.refreshing : t.refresh}
            </Button>
            <Button type="button" onClick={openCreate} className="dashboard-button-create h-10 w-full rounded-lg sm:w-auto">
              <Plus className="h-4 w-4" />
              {t.create}
            </Button>
          </div>
        </div>

        <div className="grid min-w-0 grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3 2xl:grid-cols-6">
          {statsCards.map(({ label, value, Icon, accent, soft, sub }) => (
            <SummaryTile key={label} icon={Icon} label={label} value={value} sub={sub} accent={accent} soft={soft} />
          ))}
        </div>

        <div className="grid min-w-0 grid-cols-1 gap-4 xl:grid-cols-2">
          <AnalyticsListCard
            title={t.topPurchases}
            icon={BarChart3}
            rows={data?.topByPurchases ?? []}
            locale={locale}
            valueFor={(supplier) => formatCurrency(supplier.totalPurchaseValue, locale)}
            emptyText={t.noOrders}
            onOpen={setAnalyticsSupplierId}
          />
          <AnalyticsListCard
            title={t.topBalances}
            icon={ShieldAlert}
            rows={data?.topByBalance ?? []}
            locale={locale}
            valueFor={(supplier) => formatCurrency(supplier.currentBalance, locale)}
            emptyText={t.noLedger}
            onOpen={setAnalyticsSupplierId}
          />
        </div>

        <Card className="dashboard-glass-panel min-w-0 overflow-hidden rounded-lg text-[var(--dash-text)]">
          <CardHeader className="border-b border-[var(--dash-border-subtle)] bg-[rgba(12,20,24,0.58)] px-5 py-4 sm:px-6">
            <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
              <div className="flex min-w-0 items-center gap-3">
                <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-[var(--dash-spruce-soft)] text-[var(--dash-spruce)]">
                  <Building2 className="h-5 w-5" />
                </div>
                <div className="min-w-0">
                  <CardTitle className="text-lg font-semibold text-[var(--dash-text)]">{t.tableTitle}</CardTitle>
                  <p className="mt-1 break-words text-sm text-[var(--dash-text-soft)]">
                    {t.showing} {formatNumber(filteredSuppliers.length, locale)} {t.of} {formatNumber(suppliers.length, locale)} {t.suppliers}
                  </p>
                </div>
              </div>
              <div className="flex flex-wrap items-center gap-2">
                <Badge variant="outline" className="dashboard-filter-chip h-9 w-fit rounded-lg">
                  <Sparkles className="me-1 h-3 w-3 text-[var(--dash-spruce)]" />
                  {t.liveData}
                </Badge>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => refetch()}
                  disabled={isFetching}
                  className="dashboard-button-secondary h-9 rounded-lg"
                >
                  <RefreshCw className={cn("h-4 w-4", isFetching && "animate-spin")} />
                  {isFetching ? t.refreshing : t.refresh}
                </Button>
                <Button type="button" variant="outline" size="sm" onClick={exportSuppliers} className="dashboard-button-secondary h-9 rounded-lg">
                  <Download className="h-4 w-4" />
                  {t.export}
                </Button>
              </div>
            </div>
          </CardHeader>
          <CardContent className="space-y-4 p-3 sm:p-5">
            {(statusFilter !== "all" || riskFilter !== "all" || localeFilter !== "all") && (
              <div className="flex flex-wrap items-center gap-2">
                {statusFilter !== "all" ? <Badge variant="outline" className="dashboard-filter-chip rounded-lg">{statusFilter === "active" ? t.active : t.inactive}</Badge> : null}
                {riskFilter !== "all" ? <Badge variant="outline" className="dashboard-filter-chip rounded-lg">{riskFilter}</Badge> : null}
                {localeFilter !== "all" ? <Badge variant="outline" className="dashboard-filter-chip rounded-lg">{localeFilter}</Badge> : null}
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  className="h-8 rounded-lg text-[var(--dash-text-soft)] hover:bg-[var(--dash-brand-soft)] hover:text-[var(--dash-brand-strong)]"
                  onClick={() => {
                    setStatusFilter("all")
                    setRiskFilter("all")
                    setLocaleFilter("all")
                  }}
                >
                  {t.clear}
                </Button>
              </div>
            )}

            <DataTable
              columns={columns}
              data={filteredSuppliers}
              emptyMessage={`${t.emptyTitle}. ${t.emptyBody}`}
              searchPlaceholder={t.search}
              showToolbar={false}
              variant="landing"
              filters={{
                additionalFilters: (
                  <>
                    <Select value={statusFilter} onValueChange={(value) => setStatusFilter(value as StatusFilter)}>
                      <SelectTrigger className="dashboard-control h-9 w-full rounded-lg sm:w-[150px]">
                        <SelectValue placeholder={t.status} />
                      </SelectTrigger>
                      <SelectContent className="border-[var(--dash-border-subtle)] bg-[var(--dash-surface-raised)] text-[var(--dash-text)]">
                        <SelectItem value="all">{t.all}</SelectItem>
                        <SelectItem value="active">{t.active}</SelectItem>
                        <SelectItem value="inactive">{t.inactive}</SelectItem>
                      </SelectContent>
                    </Select>
                    <Select value={riskFilter} onValueChange={(value) => setRiskFilter(value as RiskFilter)}>
                      <SelectTrigger className="dashboard-control h-9 w-full rounded-lg sm:w-[170px]">
                        <SelectValue placeholder={t.risk} />
                      </SelectTrigger>
                      <SelectContent className="border-[var(--dash-border-subtle)] bg-[var(--dash-surface-raised)] text-[var(--dash-text)]">
                        <SelectItem value="all">{t.all}</SelectItem>
                        <SelectItem value="open-orders">{t.openOrders}</SelectItem>
                        <SelectItem value="over-limit">{t.overLimit}</SelectItem>
                        <SelectItem value="linked-items">{t.linkedItems}</SelectItem>
                        <SelectItem value="no-links">{t.noLinks}</SelectItem>
                      </SelectContent>
                    </Select>
                    <Select value={localeFilter} onValueChange={(value) => setLocaleFilter(value as LocaleFilter)}>
                      <SelectTrigger className="dashboard-control h-9 w-full rounded-lg sm:w-[145px]">
                        <SelectValue placeholder={t.language} />
                      </SelectTrigger>
                      <SelectContent className="border-[var(--dash-border-subtle)] bg-[var(--dash-surface-raised)] text-[var(--dash-text)]">
                        <SelectItem value="all">{t.all}</SelectItem>
                        <SelectItem value="EN">EN</SelectItem>
                        <SelectItem value="FR">FR</SelectItem>
                      </SelectContent>
                    </Select>
                  </>
                ),
              }}
            />
          </CardContent>
        </Card>
      </section>

      <Dialog
        open={formOpen}
        onOpenChange={(open) => {
          setFormOpen(open)
          if (!open && !isSaving) {
            setEditingSupplier(null)
            setFormError(null)
            setFormState(getDefaultForm())
          }
        }}
      >
        <DialogContent className="dashboard-glass-panel max-h-[92vh] max-w-5xl overflow-y-auto rounded-lg border-[var(--dash-border-subtle)] text-[var(--dash-text)]">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-[var(--dash-text)]">
              <Truck className="h-5 w-5 text-[var(--dash-brand-strong)]" />
              {editingSupplier ? t.edit : t.create}
            </DialogTitle>
            <DialogDescription className="text-[var(--dash-text-soft)]">
              {t.formDescription}
            </DialogDescription>
          </DialogHeader>

          <form
            className="space-y-5"
            onSubmit={(event) => {
              event.preventDefault()
              void submitForm()
            }}
          >
            <div className="grid gap-4 lg:grid-cols-[1.05fr_0.95fr]">
              <div className="space-y-4">
                <FormSection title={t.contact} icon={Mail}>
                  <div className="grid gap-4 md:grid-cols-2">
                    <Field id="supplier-name" label={t.fields.name} required>
                      <Input
                        id="supplier-name"
                        value={formState.name}
                        onChange={(event) => updateFormField("name", event.target.value)}
                        placeholder={t.placeholders.name}
                        className="dashboard-control h-11 rounded-lg"
                      />
                    </Field>
                    <Field id="supplier-code" label={t.fields.code}>
                      <Input
                        id="supplier-code"
                        value={formState.code}
                        onChange={(event) => updateFormField("code", event.target.value)}
                        placeholder={t.placeholders.code}
                        className="dashboard-control h-11 rounded-lg font-mono"
                      />
                    </Field>
                    <Field id="supplier-contact" label={t.fields.contactPerson}>
                      <Input
                        id="supplier-contact"
                        value={formState.contactPerson}
                        onChange={(event) => updateFormField("contactPerson", event.target.value)}
                        placeholder={t.placeholders.contactPerson}
                        className="dashboard-control h-11 rounded-lg"
                      />
                    </Field>
                    <Field id="supplier-email" label={t.fields.email}>
                      <Input
                        id="supplier-email"
                        type="email"
                        value={formState.email}
                        onChange={(event) => updateFormField("email", event.target.value)}
                        placeholder={t.placeholders.email}
                        className="dashboard-control h-11 rounded-lg"
                      />
                    </Field>
                    <Field id="supplier-phone" label={t.fields.phone}>
                      <Input
                        id="supplier-phone"
                        value={formState.phone}
                        onChange={(event) => updateFormField("phone", event.target.value)}
                        placeholder={t.placeholders.phone}
                        className="dashboard-control h-11 rounded-lg"
                      />
                    </Field>
                    <Field id="supplier-tax-id" label={t.fields.taxId}>
                      <Input
                        id="supplier-tax-id"
                        value={formState.taxId}
                        onChange={(event) => updateFormField("taxId", event.target.value)}
                        placeholder={t.placeholders.taxId}
                        className="dashboard-control h-11 rounded-lg"
                      />
                    </Field>
                  </div>
                </FormSection>

                <FormSection title={t.location} icon={MapPin}>
                  <div className="grid gap-4 md:grid-cols-2">
                    <Field id="supplier-address" label={t.fields.address}>
                      <Input
                        id="supplier-address"
                        value={formState.address}
                        onChange={(event) => updateFormField("address", event.target.value)}
                        placeholder={t.placeholders.address}
                        className="dashboard-control h-11 rounded-lg"
                      />
                    </Field>
                    <Field id="supplier-city" label={t.fields.city}>
                      <Input
                        id="supplier-city"
                        value={formState.city}
                        onChange={(event) => updateFormField("city", event.target.value)}
                        placeholder={t.placeholders.city}
                        className="dashboard-control h-11 rounded-lg"
                      />
                    </Field>
                    <Field id="supplier-state" label={t.fields.state}>
                      <Input
                        id="supplier-state"
                        value={formState.state}
                        onChange={(event) => updateFormField("state", event.target.value)}
                        placeholder={t.placeholders.state}
                        className="dashboard-control h-11 rounded-lg"
                      />
                    </Field>
                    <Field id="supplier-zip" label={t.fields.zipCode}>
                      <Input
                        id="supplier-zip"
                        value={formState.zipCode}
                        onChange={(event) => updateFormField("zipCode", event.target.value)}
                        placeholder={t.placeholders.zipCode}
                        className="dashboard-control h-11 rounded-lg"
                      />
                    </Field>
                    <div className="md:col-span-2">
                      <Field id="supplier-country" label={t.fields.country}>
                        <Input
                          id="supplier-country"
                          value={formState.country}
                          onChange={(event) => updateFormField("country", event.target.value)}
                          placeholder={t.placeholders.country}
                          className="dashboard-control h-11 rounded-lg"
                        />
                      </Field>
                    </div>
                  </div>
                </FormSection>
              </div>

              <div className="space-y-4">
                <FormSection title={t.commercial} icon={Wallet}>
                  <div className="grid gap-4 md:grid-cols-2">
                    <Field id="supplier-terms" label={t.fields.paymentTerms}>
                      <Input
                        id="supplier-terms"
                        type="number"
                        min="0"
                        max="365"
                        step="1"
                        value={formState.paymentTerms}
                        onChange={(event) => updateFormField("paymentTerms", event.target.value)}
                        placeholder={t.placeholders.paymentTerms}
                        className="dashboard-control h-11 rounded-lg"
                      />
                    </Field>
                    <Field id="supplier-credit" label={t.fields.creditLimit}>
                      <Input
                        id="supplier-credit"
                        type="number"
                        min="0"
                        step="1"
                        value={formState.creditLimit}
                        onChange={(event) => updateFormField("creditLimit", event.target.value)}
                        placeholder={t.placeholders.creditLimit}
                        className="dashboard-control h-11 rounded-lg"
                      />
                    </Field>
                    <Field id="supplier-language" label={t.fields.preferredLocale}>
                      <Select value={formState.preferredLocale} onValueChange={(value) => updateFormField("preferredLocale", value as SupplierLocale)}>
                        <SelectTrigger id="supplier-language" className="dashboard-control h-11 rounded-lg">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent className="border-[var(--dash-border-subtle)] bg-[var(--dash-surface-raised)] text-[var(--dash-text)]">
                          <SelectItem value="EN">EN</SelectItem>
                          <SelectItem value="FR">FR</SelectItem>
                        </SelectContent>
                      </Select>
                    </Field>
                    <div className="flex items-center justify-between gap-3 rounded-lg border border-[var(--dash-border-subtle)] bg-[rgba(37,57,67,0.36)] p-3">
                      <Label htmlFor="supplier-active" className="text-sm font-medium text-[var(--dash-text)]">{t.fields.isActive}</Label>
                      <Switch id="supplier-active" checked={formState.isActive} onCheckedChange={(checked) => updateFormField("isActive", checked)} />
                    </div>
                  </div>
                </FormSection>

                <FormSection title={t.notes} icon={CalendarClock}>
                  <Field id="supplier-notes" label={t.fields.notes}>
                    <Textarea
                      id="supplier-notes"
                      value={formState.notes}
                      onChange={(event) => updateFormField("notes", event.target.value)}
                      placeholder={t.placeholders.notes}
                      className="dashboard-control min-h-32 rounded-lg"
                    />
                  </Field>
                </FormSection>

                {editingSupplier ? (
                  <FormSection title={t.analytics} icon={BarChart3}>
                    <div className="grid gap-3 sm:grid-cols-2">
                      <InlineMetric label={t.linkedItemsCard} value={formatNumber(editingSupplier.supplierItemsCount, locale)} />
                      <InlineMetric label={t.openOrdersCard} value={formatNumber(editingSupplier.openPurchaseOrdersCount, locale)} />
                      <InlineMetric label={t.totalPurchases} value={formatCurrency(editingSupplier.totalPurchaseValue, locale)} />
                      <InlineMetric label={t.balance} value={formatCurrency(editingSupplier.currentBalance, locale)} tone={isOverCreditLimit(editingSupplier) ? "danger" : "default"} />
                    </div>
                  </FormSection>
                ) : null}
              </div>
            </div>

            {formError ? (
              <div className="rounded-lg border border-[var(--dash-danger)] bg-[var(--dash-danger-soft)] px-4 py-3 text-sm font-medium text-[var(--dash-danger)]">
                {formError}
              </div>
            ) : null}

            <DialogFooter className="gap-2 pt-2">
              <Button type="button" variant="outline" onClick={() => setFormOpen(false)} disabled={isSaving} className="dashboard-button-secondary h-10 rounded-lg">
                {t.cancel}
              </Button>
              <Button type="submit" disabled={isSaving} className="dashboard-button-primary h-10 rounded-lg">
                {isSaving ? (
                  <>
                    <Loader2 className="h-4 w-4 animate-spin" />
                    {editingSupplier ? t.saving : t.creating}
                  </>
                ) : (
                  <>
                    <Plus className="h-4 w-4" />
                    {editingSupplier ? t.edit : t.create}
                  </>
                )}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      <Dialog open={!!analyticsSupplierId} onOpenChange={(open) => !open && setAnalyticsSupplierId(null)}>
        <DialogContent className="dashboard-glass-panel max-h-[92vh] max-w-5xl overflow-y-auto rounded-lg border-[var(--dash-border-subtle)] text-[var(--dash-text)]">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-[var(--dash-text)]">
              <BarChart3 className="h-5 w-5 text-[var(--dash-brand-strong)]" />
              {analyticsSupplier?.name ?? t.analytics}
            </DialogTitle>
            <DialogDescription className="text-[var(--dash-text-soft)]">
              {analyticsSupplier ? `${analyticsSupplier.code || t.noCode} | ${analyticsSupplier.contactPerson || t.noContact}` : t.analytics}
            </DialogDescription>
          </DialogHeader>

          {analyticsQuery.isLoading ? (
            <div className="flex min-h-56 items-center justify-center">
              <Loader2 className="h-8 w-8 animate-spin text-[var(--dash-brand-strong)]" />
            </div>
          ) : analyticsQuery.isError ? (
            <div className="rounded-lg border border-[var(--dash-danger)] bg-[var(--dash-danger-soft)] p-4 text-sm text-[var(--dash-danger)]">
              {analyticsQuery.error instanceof Error ? analyticsQuery.error.message : t.errorTitle}
            </div>
          ) : (
            <div className="space-y-4">
              {analyticsSupplier ? (
                <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
                  <InlineMetric label={t.linkedItemsCard} value={formatNumber(analyticsSupplier.supplierItemsCount, locale)} />
                  <InlineMetric label={t.openOrdersCard} value={formatNumber(analyticsSupplier.openPurchaseOrdersCount, locale)} />
                  <InlineMetric label={t.totalPurchases} value={formatCurrency(analyticsSupplier.totalPurchaseValue, locale)} />
                  <InlineMetric label={t.balance} value={formatCurrency(analyticsSupplier.currentBalance, locale)} tone={isOverCreditLimit(analyticsSupplier) ? "danger" : "default"} />
                </div>
              ) : null}

              <div className="grid gap-4 lg:grid-cols-3">
                <DetailList
                  title={t.recentOrders}
                  icon={ShoppingCart}
                  emptyText={t.noOrders}
                  items={(analyticsQuery.data?.purchaseOrders ?? []).map((order) => ({
                    id: order.id,
                    title: order.orderNumber,
                    meta: `${order.status} | ${formatDate(order.orderDate, locale)}`,
                    value: formatCurrency(order.total, locale),
                  }))}
                />
                <DetailList
                  title={t.recentLedger}
                  icon={Wallet}
                  emptyText={t.noLedger}
                  items={(analyticsQuery.data?.ledgerEntries ?? []).map((entry) => ({
                    id: entry.id,
                    title: entry.type,
                    meta: `${formatDate(entry.entryDate, locale)} | ${entry.description}`,
                    value: formatCurrency(entry.balanceAfter, locale),
                  }))}
                />
                <DetailList
                  title={t.linkedItemsTitle}
                  icon={PackageCheck}
                  emptyText={t.noItems}
                  items={(analyticsQuery.data?.linkedItems ?? []).map((item) => ({
                    id: item.id,
                    title: item.itemName,
                    meta: `${item.supplierSku || t.noCode}${item.isPreferred ? " | Preferred" : ""}`,
                    value: item.unitCost !== null ? formatCurrency(item.unitCost, locale) : "-",
                  }))}
                />
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>

      <AlertDialog open={!!archiveTarget} onOpenChange={(open) => !open && setArchiveTarget(null)}>
        <AlertDialogContent className="dashboard-glass-panel border-[var(--dash-border-subtle)] text-[var(--dash-text)]">
          <AlertDialogHeader>
            <AlertDialogTitle>{t.archiveTitle}</AlertDialogTitle>
            <AlertDialogDescription className="text-[var(--dash-text-soft)]">
              {t.archiveBody}
              {archiveTarget ? ` ${archiveTarget.name}` : ""}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel className="dashboard-button-secondary rounded-lg">{t.cancel}</AlertDialogCancel>
            <AlertDialogAction
              className="rounded-lg bg-[var(--dash-danger)] text-white hover:bg-[var(--dash-danger)]/90"
              onClick={async (event) => {
                event.preventDefault()
                if (!archiveTarget) return
                try {
                  await archiveMutation.mutateAsync(archiveTarget.id)
                  setArchiveTarget(null)
                } catch {
                  // Mutation notifications already surface the failure.
                }
              }}
            >
              {archiveMutation.isPending ? <Loader2 className="me-2 h-4 w-4 animate-spin" /> : <Archive className="me-2 h-4 w-4" />}
              {t.confirmArchive}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  )
}

function HeaderButton({
  children,
  onClick,
}: {
  children: ReactNode
  onClick: () => void
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="flex min-w-0 items-center gap-2 text-left text-xs font-semibold text-[var(--dash-text-muted)] transition hover:text-[var(--dash-text)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--dash-brand)]"
    >
      {children}
    </button>
  )
}

function Field({
  id,
  label,
  required,
  children,
}: {
  id: string
  label: string
  required?: boolean
  children: ReactNode
}) {
  return (
    <div className="space-y-2">
      <Label htmlFor={id} className="text-sm font-semibold text-[var(--dash-text-muted)]">
        {label}
        {required ? <span className="ms-1 text-[var(--dash-warning)]">*</span> : null}
      </Label>
      {children}
    </div>
  )
}

function FormSection({
  title,
  icon: Icon,
  children,
}: {
  title: string
  icon: LucideIcon
  children: ReactNode
}) {
  return (
    <section className="rounded-lg border border-[var(--dash-border-subtle)] bg-[rgba(37,57,67,0.24)] p-4">
      <div className="mb-4 flex items-center gap-2">
        <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-[var(--dash-brand-soft)] text-[var(--dash-brand-strong)]">
          <Icon className="h-4 w-4" />
        </span>
        <h3 className="text-sm font-semibold text-[var(--dash-text)]">{title}</h3>
      </div>
      {children}
    </section>
  )
}

function SummaryTile({
  icon: Icon,
  label,
  value,
  sub,
  accent,
  soft,
}: {
  icon: LucideIcon
  label: string
  value: string
  sub: string
  accent: string
  soft: string
}) {
  const style: StatStyle = {
    "--stat-accent": accent,
    "--stat-soft": soft,
  }

  return (
    <Card className="dashboard-stat-card group relative min-h-[146px] min-w-0 overflow-hidden" style={style}>
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

function InlineMetric({
  label,
  value,
  tone = "default",
}: {
  label: string
  value: string
  tone?: "default" | "danger" | "gold"
}) {
  return (
    <div
      className={cn(
        "rounded-lg border border-[var(--dash-border-subtle)] bg-[rgba(37,57,67,0.32)] p-2",
        tone === "danger" && "border-[var(--dash-danger)] bg-[var(--dash-danger-soft)]",
        tone === "gold" && "border-[var(--dash-gold)] bg-[var(--dash-gold-soft)]",
      )}
    >
      <p className="text-[0.68rem] text-[var(--dash-text-faint)]">{label}</p>
      <p className={cn("mt-1 font-semibold text-[var(--dash-text)]", tone === "danger" && "text-[var(--dash-danger)]", tone === "gold" && "text-[var(--dash-gold)]")}>{value}</p>
    </div>
  )
}

function AnalyticsListCard({
  title,
  icon: Icon,
  rows,
  locale,
  valueFor,
  emptyText,
  onOpen,
}: {
  title: string
  icon: LucideIcon
  rows: SupplierManagementRow[]
  locale: Locale
  valueFor: (supplier: SupplierManagementRow) => string
  emptyText: string
  onOpen: (id: string) => void
}) {
  return (
    <Card className="dashboard-glass-panel min-w-0 overflow-hidden rounded-lg text-[var(--dash-text)]">
      <CardHeader className="border-b border-[var(--dash-border-subtle)] bg-[rgba(12,20,24,0.48)] px-5 py-4">
        <CardTitle className="flex items-center gap-2 text-base font-semibold text-[var(--dash-text)]">
          <Icon className="h-4 w-4 text-[var(--dash-brand-strong)]" />
          {title}
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-2 p-4">
        {rows.length ? rows.map((supplier) => (
          <button
            key={supplier.id}
            type="button"
            onClick={() => onOpen(supplier.id)}
            className="flex w-full min-w-0 items-center justify-between gap-3 rounded-lg border border-[var(--dash-border-subtle)] bg-[rgba(37,57,67,0.24)] p-3 text-left transition hover:bg-[var(--dash-brand-soft)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--dash-brand)]"
          >
            <div className="min-w-0">
              <p className="truncate text-sm font-semibold text-[var(--dash-text)]">{supplier.name}</p>
              <p className="mt-1 text-xs text-[var(--dash-text-faint)]">
                {formatNumber(supplier.purchaseOrdersCount, locale)} orders | {formatNumber(supplier.supplierItemsCount, locale)} items
              </p>
            </div>
            <span className="shrink-0 text-sm font-semibold text-[var(--dash-brand-strong)]">{valueFor(supplier)}</span>
          </button>
        )) : (
          <p className="rounded-lg border border-[var(--dash-border-subtle)] bg-[rgba(37,57,67,0.24)] p-4 text-sm text-[var(--dash-text-soft)]">
            {emptyText}
          </p>
        )}
      </CardContent>
    </Card>
  )
}

function DetailList({
  title,
  icon: Icon,
  emptyText,
  items,
}: {
  title: string
  icon: LucideIcon
  emptyText: string
  items: Array<{ id: string; title: string; meta: string; value: string }>
}) {
  return (
    <Card className="dashboard-glass-panel min-w-0 overflow-hidden rounded-lg text-[var(--dash-text)]">
      <CardHeader className="border-b border-[var(--dash-border-subtle)] bg-[rgba(12,20,24,0.48)] px-4 py-3">
        <CardTitle className="flex items-center gap-2 text-sm font-semibold text-[var(--dash-text)]">
          <Icon className="h-4 w-4 text-[var(--dash-brand-strong)]" />
          {title}
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-2 p-3">
        {items.length ? items.map((item) => (
          <div key={item.id} className="rounded-lg border border-[var(--dash-border-subtle)] bg-[rgba(37,57,67,0.24)] p-3">
            <div className="flex min-w-0 items-start justify-between gap-3">
              <div className="min-w-0">
                <p className="truncate text-sm font-semibold text-[var(--dash-text)]">{item.title}</p>
                <p className="mt-1 line-clamp-2 text-xs text-[var(--dash-text-faint)]">{item.meta}</p>
              </div>
              <span className="shrink-0 text-sm font-semibold text-[var(--dash-brand-strong)]">{item.value}</span>
            </div>
          </div>
        )) : (
          <p className="rounded-lg border border-[var(--dash-border-subtle)] bg-[rgba(37,57,67,0.24)] p-4 text-sm text-[var(--dash-text-soft)]">
            {emptyText}
          </p>
        )}
      </CardContent>
    </Card>
  )
}
