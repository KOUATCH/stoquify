"use client"

import Link from "next/link"
import { useCallback, useEffect, useMemo, useState, type CSSProperties, type ReactNode } from "react"
import type { ColumnDef } from "@tanstack/react-table"
import {
  AlertCircle,
  Archive,
  BarChart3,
  CalendarClock,
  CheckCircle2,
  ChevronsUpDown,
  Copy,
  CreditCard,
  Download,
  Edit3,
  ExternalLink,
  Languages,
  Loader2,
  Mail,
  MapPin,
  MoreHorizontal,
  Phone,
  Plus,
  ReceiptText,
  RefreshCw,
  ShieldAlert,
  ShoppingCart,
  Sparkles,
  UserCheck,
  Users,
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
import type { CustomerManagementInput, CustomerManagementRow } from "@/actions/customers/customer-management-actions"
import {
  useCreateManagedCustomer,
  useCustomerAnalyticsData,
  useCustomerManagementData,
  useDeleteManagedCustomer,
  useUpdateManagedCustomer,
} from "@/hooks/useCustomerManagement"

interface CustomerManagementDashboardProps {
  organizationId: string
  locale?: Locale
  basePath?: string
  initialAction?: "create"
  initialEditId?: string
  initialAnalyticsId?: string
}

type StatusFilter = "all" | "active" | "inactive"
type ActivityFilter = "all" | "open-orders" | "unpaid" | "over-limit" | "with-orders" | "no-orders"
type LocaleFilter = "all" | "EN" | "FR"
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

type StatStyle = CSSProperties & {
  "--stat-accent": string
  "--stat-soft": string
}

const copy = {
  en: {
    eyebrow: "Customer control",
    title: "Customers dashboard",
    subtitle: "Manage customer identity, sales readiness, credit exposure, receivables, order activity, and customer analytics.",
    create: "Create customer",
    edit: "Edit customer",
    analytics: "Customer analytics",
    refresh: "Refresh",
    refreshing: "Refreshing",
    export: "Export",
    actions: "Actions",
    viewAnalytics: "View analytics",
    editCustomer: "Edit customer",
    openEditPage: "Open edit page",
    copyId: "Copy ID",
    archive: "Archive",
    loadingTitle: "Loading customers",
    loadingBody: "Collecting customer records, sales orders, receivables, and ledger activity.",
    errorTitle: "Customers unavailable",
    retry: "Try again",
    emptyTitle: "No customers found",
    emptyBody: "Create customers before recording POS sales, invoices, or receivable activity.",
    search: "Search customers, code, email, phone, address, tax ID...",
    status: "Status",
    activity: "Activity",
    language: "Language",
    all: "All",
    active: "Active",
    inactive: "Inactive",
    openOrders: "Open orders",
    unpaid: "Unpaid",
    overLimit: "Over limit",
    withOrders: "With orders",
    noOrders: "No orders",
    totalCustomers: "Total Customers",
    activeCustomers: "Active",
    newCustomers: "New 30 Days",
    salesOrders: "Sales Orders",
    openOrdersCard: "Open Orders",
    unpaidOrders: "Unpaid Orders",
    salesValue: "Sales Value",
    creditLimit: "Credit Limit",
    balance: "Receivable",
    averageTerms: "Avg terms",
    days: "days",
    last30Days: "Last 30 days",
    liveData: "Live Data",
    tableTitle: "Customer Management",
    showing: "Showing",
    of: "of",
    customers: "customers",
    clear: "Clear",
    copiedTitle: "Customer ID copied",
    copiedBody: "The customer identifier is ready to paste.",
    copyFailedTitle: "Copy failed",
    copyFailedBody: "The browser could not copy this identifier.",
    exportTitle: "Customers exported",
    exportBody: "The current customer view was exported as CSV.",
    requiredTitle: "Customer details required",
    requiredBody: "Enter a customer name before saving.",
    invalidEmailTitle: "Invalid email",
    invalidEmailBody: "Use a valid email address or leave the field blank.",
    invalidTermsTitle: "Invalid payment terms",
    invalidTermsBody: "Payment terms must be a whole number from 0 to 365 days.",
    invalidCreditTitle: "Invalid credit limit",
    invalidCreditBody: "Credit limit must be zero or greater, or left blank.",
    cancel: "Cancel",
    saving: "Saving",
    creating: "Creating",
    formDescription: "Customer identity, contact details, receivable terms, preferred language, and active status.",
    archiveTitle: "Archive customer",
    archiveBody: "Customers with sales or ledger history are deactivated. Unused customers are archived from active lists.",
    confirmArchive: "Archive customer",
    noCode: "No code",
    noContact: "No contact",
    noEmail: "No email",
    noPhone: "No phone",
    noAddress: "No address",
    noOrdersYet: "No sales orders yet",
    noLedgerYet: "No ledger entries yet",
    noPaymentsYet: "No payments yet",
    contact: "Contact",
    commercial: "Commercial",
    notes: "Notes",
    topSales: "Top sales value",
    topBalances: "Highest receivables",
    recentOrders: "Recent orders",
    recentLedger: "Receivable ledger",
    recentPayments: "Recent payments",
    tableColumns: {
      customer: "Customer",
      contact: "Contact",
      commercial: "Commercial",
      activity: "Activity",
      status: "Status",
      updated: "Updated",
      actions: "Actions",
    },
    fields: {
      name: "Customer name",
      code: "Code",
      email: "Email",
      phone: "Phone",
      address: "Address",
      taxId: "Tax ID",
      paymentTerms: "Payment terms",
      creditLimit: "Credit limit",
      preferredLocale: "Preferred language",
      isActive: "Active customer",
      notes: "Notes",
    },
    placeholders: {
      name: "Maison Retail Client",
      code: "CUST-0042",
      email: "customer@example.com",
      phone: "+237 6 70 00 00 00",
      address: "Commercial avenue, Douala",
      taxId: "M0123456789",
      paymentTerms: "30",
      creditLimit: "500000",
      notes: "Receivable notes, delivery preferences, loyalty details, or account instructions.",
    },
  },
  fr: {
    eyebrow: "Controle client",
    title: "Tableau clients",
    subtitle: "Gerez identite client, ventes, exposition credit, creances, commandes et analyses client.",
    create: "Creer client",
    edit: "Modifier client",
    analytics: "Analyse client",
    refresh: "Actualiser",
    refreshing: "Actualisation",
    export: "Exporter",
    actions: "Actions",
    viewAnalytics: "Voir analyse",
    editCustomer: "Modifier client",
    openEditPage: "Ouvrir page modification",
    copyId: "Copier ID",
    archive: "Archiver",
    loadingTitle: "Chargement clients",
    loadingBody: "Collecte des fiches client, commandes, creances et grand livre.",
    errorTitle: "Clients indisponibles",
    retry: "Reessayer",
    emptyTitle: "Aucun client trouve",
    emptyBody: "Creez des clients avant les ventes POS, factures ou creances.",
    search: "Rechercher client, code, email, telephone, adresse, ID fiscal...",
    status: "Statut",
    activity: "Activite",
    language: "Langue",
    all: "Tous",
    active: "Actif",
    inactive: "Inactif",
    openOrders: "Commandes ouvertes",
    unpaid: "Non paye",
    overLimit: "Hors limite",
    withOrders: "Avec commandes",
    noOrders: "Sans commande",
    totalCustomers: "Total clients",
    activeCustomers: "Actifs",
    newCustomers: "Nouveaux 30 jours",
    salesOrders: "Commandes vente",
    openOrdersCard: "Commandes ouvertes",
    unpaidOrders: "Commandes impayees",
    salesValue: "Valeur ventes",
    creditLimit: "Limite credit",
    balance: "Creance",
    averageTerms: "Delai moyen",
    days: "jours",
    last30Days: "30 derniers jours",
    liveData: "Donnees live",
    tableTitle: "Gestion clients",
    showing: "Affichage",
    of: "sur",
    customers: "clients",
    clear: "Effacer",
    copiedTitle: "ID client copie",
    copiedBody: "L'identifiant client est pret a coller.",
    copyFailedTitle: "Copie echouee",
    copyFailedBody: "Le navigateur n'a pas pu copier cet identifiant.",
    exportTitle: "Clients exportes",
    exportBody: "La vue client actuelle a ete exportee en CSV.",
    requiredTitle: "Details client requis",
    requiredBody: "Saisissez le nom du client avant d'enregistrer.",
    invalidEmailTitle: "Email invalide",
    invalidEmailBody: "Utilisez une adresse email valide ou laissez le champ vide.",
    invalidTermsTitle: "Delai de paiement invalide",
    invalidTermsBody: "Le delai doit etre un nombre entier de 0 a 365 jours.",
    invalidCreditTitle: "Limite credit invalide",
    invalidCreditBody: "La limite credit doit etre positive ou vide.",
    cancel: "Annuler",
    saving: "Enregistrement",
    creating: "Creation",
    formDescription: "Identite, contact, conditions de creance, langue preferee et statut actif.",
    archiveTitle: "Archiver client",
    archiveBody: "Les clients avec historique sont desactives. Les clients inutilises sont archives.",
    confirmArchive: "Archiver client",
    noCode: "Aucun code",
    noContact: "Aucun contact",
    noEmail: "Aucun email",
    noPhone: "Aucun telephone",
    noAddress: "Aucune adresse",
    noOrdersYet: "Aucune commande vente",
    noLedgerYet: "Aucune ecriture client",
    noPaymentsYet: "Aucun paiement",
    contact: "Contact",
    commercial: "Commercial",
    notes: "Notes",
    topSales: "Top valeur ventes",
    topBalances: "Creances les plus elevees",
    recentOrders: "Commandes recentes",
    recentLedger: "Grand livre client",
    recentPayments: "Paiements recents",
    tableColumns: {
      customer: "Client",
      contact: "Contact",
      commercial: "Commercial",
      activity: "Activite",
      status: "Statut",
      updated: "Mis a jour",
      actions: "Actions",
    },
    fields: {
      name: "Nom client",
      code: "Code",
      email: "Email",
      phone: "Telephone",
      address: "Adresse",
      taxId: "ID fiscal",
      paymentTerms: "Delai paiement",
      creditLimit: "Limite credit",
      preferredLocale: "Langue preferee",
      isActive: "Client actif",
      notes: "Notes",
    },
    placeholders: {
      name: "Maison Retail Client",
      code: "CUST-0042",
      email: "customer@example.com",
      phone: "+237 6 70 00 00 00",
      address: "Avenue commerciale, Douala",
      taxId: "M0123456789",
      paymentTerms: "30",
      creditLimit: "500000",
      notes: "Notes de creance, preferences de livraison, fidelite ou instructions compte.",
    },
  },
} as const

function getDefaultForm(): CustomerFormState {
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
    creditLimit: customer.creditLimit !== null ? String(customer.creditLimit) : "",
    preferredLocale: customer.preferredLocale,
    notes: customer.notes ?? "",
    isActive: customer.isActive,
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
    .slice(0, 2) || "CU"
}

function isOverCreditLimit(customer: CustomerManagementRow) {
  return customer.creditLimit !== null && customer.currentBalance > customer.creditLimit
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

export default function CustomerManagementDashboard({
  organizationId,
  locale = "en",
  basePath = "/dashboard/customers",
  initialAction,
  initialEditId,
  initialAnalyticsId,
}: CustomerManagementDashboardProps) {
  const t = copy[locale]
  const notifications = useNotifications()
  const [statusFilter, setStatusFilter] = useState<StatusFilter>("all")
  const [activityFilter, setActivityFilter] = useState<ActivityFilter>("all")
  const [localeFilter, setLocaleFilter] = useState<LocaleFilter>("all")
  const [formOpen, setFormOpen] = useState(false)
  const [editingCustomer, setEditingCustomer] = useState<CustomerManagementRow | null>(null)
  const [archiveTarget, setArchiveTarget] = useState<CustomerManagementRow | null>(null)
  const [analyticsCustomerId, setAnalyticsCustomerId] = useState<string | null>(null)
  const [formState, setFormState] = useState<CustomerFormState>(() => getDefaultForm())
  const [formError, setFormError] = useState<string | null>(null)
  const [initialRequestHandled, setInitialRequestHandled] = useState(false)

  const {
    data,
    isLoading,
    isFetching,
    isError,
    error,
    refetch,
  } = useCustomerManagementData(organizationId)
  const createMutation = useCreateManagedCustomer(organizationId, locale)
  const updateMutation = useUpdateManagedCustomer(organizationId, locale)
  const archiveMutation = useDeleteManagedCustomer(organizationId, locale)
  const analyticsQuery = useCustomerAnalyticsData(organizationId, analyticsCustomerId)

  const customers = useMemo(() => data?.customers ?? [], [data?.customers])
  const isSaving = createMutation.isPending || updateMutation.isPending
  const analyticsCustomer = analyticsQuery.data?.customer ?? customers.find((customer) => customer.id === analyticsCustomerId) ?? null

  const filteredCustomers = useMemo(() => {
    return customers.filter((customer) => {
      if (statusFilter === "active" && !customer.isActive) return false
      if (statusFilter === "inactive" && customer.isActive) return false
      if (localeFilter !== "all" && customer.preferredLocale !== localeFilter) return false
      if (activityFilter === "open-orders" && customer.openSalesOrdersCount === 0) return false
      if (activityFilter === "unpaid" && customer.unpaidSalesOrdersCount === 0) return false
      if (activityFilter === "over-limit" && !isOverCreditLimit(customer)) return false
      if (activityFilter === "with-orders" && customer.salesOrdersCount === 0) return false
      if (activityFilter === "no-orders" && customer.salesOrdersCount > 0) return false

      return true
    })
  }, [activityFilter, customers, localeFilter, statusFilter])

  const openCreate = useCallback(() => {
    setEditingCustomer(null)
    setFormError(null)
    setFormState(getDefaultForm())
    setFormOpen(true)
  }, [])

  const openEdit = useCallback((customer: CustomerManagementRow) => {
    setEditingCustomer(customer)
    setFormError(null)
    setFormState(formFromCustomer(customer))
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
      const customer = customers.find((item) => item.id === initialEditId)

      if (customer) {
        openEdit(customer)
      } else {
        notifications.error(t.errorTitle, "The requested customer could not be opened for editing.")
      }

      setInitialRequestHandled(true)
      return
    }

    if (initialAnalyticsId) {
      setAnalyticsCustomerId(initialAnalyticsId)
      setInitialRequestHandled(true)
    }
  }, [
    customers,
    initialAction,
    initialAnalyticsId,
    initialEditId,
    initialRequestHandled,
    isLoading,
    notifications,
    openCreate,
    openEdit,
    t.errorTitle,
  ])

  const updateFormField = useCallback(<K extends keyof CustomerFormState>(field: K, value: CustomerFormState[K]) => {
    setFormState((current) => ({ ...current, [field]: value }))
    setFormError(null)
  }, [])

  const buildInput = useCallback((): CustomerManagementInput | null => {
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
      email: email || null,
      phone: formState.phone.trim() || null,
      address: formState.address.trim() || null,
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
      if (editingCustomer) {
        await updateMutation.mutateAsync({ id: editingCustomer.id, data: payload })
      } else {
        await createMutation.mutateAsync(payload)
      }

      setFormOpen(false)
      setEditingCustomer(null)
      setFormState(getDefaultForm())
      setFormError(null)
    } catch (mutationError) {
      setFormError(mutationError instanceof Error ? mutationError.message : t.errorTitle)
    }
  }, [buildInput, createMutation, editingCustomer, t.errorTitle, updateMutation])

  const copyCustomerId = useCallback(async (customer: CustomerManagementRow) => {
    try {
      await navigator.clipboard.writeText(customer.id)
      notifications.success(t.copiedTitle, t.copiedBody)
    } catch {
      notifications.error(t.copyFailedTitle, t.copyFailedBody)
    }
  }, [notifications, t.copiedBody, t.copiedTitle, t.copyFailedBody, t.copyFailedTitle])

  const exportCustomers = useCallback(() => {
    const header = [
      "Name",
      "Code",
      "Email",
      "Phone",
      "Payment Terms",
      "Credit Limit",
      "Balance",
      "Active",
      "Orders",
      "Open Orders",
      "Unpaid Orders",
      "Sales Value",
    ]
    const rows = filteredCustomers.map((customer) => [
      customer.name,
      customer.code ?? "",
      customer.email ?? "",
      customer.phone ?? "",
      customer.paymentTerms ?? "",
      customer.creditLimit ?? "",
      customer.currentBalance,
      customer.isActive ? "true" : "false",
      customer.salesOrdersCount,
      customer.openSalesOrdersCount,
      customer.unpaidSalesOrdersCount,
      customer.totalSalesValue,
    ])
    const csv = [header, ...rows]
      .map((row) => row.map((value) => escapeCsv(value)).join(","))
      .join("\n")
    const blob = new Blob([csv], { type: "text/csv;charset=utf-8" })
    const url = URL.createObjectURL(blob)
    const anchor = document.createElement("a")
    anchor.href = url
    anchor.download = "customers.csv"
    anchor.click()
    URL.revokeObjectURL(url)
    notifications.success(t.exportTitle, t.exportBody)
  }, [filteredCustomers, notifications, t.exportBody, t.exportTitle])

  const columns = useMemo<ColumnDef<CustomerManagementRow>[]>(() => [
    {
      accessorKey: "name",
      header: ({ column }) => (
        <HeaderButton onClick={() => column.toggleSorting(column.getIsSorted() === "asc")}>
          {t.tableColumns.customer}
          <SortIcon sorted={column.getIsSorted()} />
        </HeaderButton>
      ),
      cell: ({ row }) => {
        const customer = row.original
        return (
          <div className="flex min-w-[250px] items-center gap-3">
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg border border-[var(--dash-border-subtle)] bg-[var(--dash-brand-soft)] text-sm font-semibold text-[var(--dash-brand-strong)]">
              {initials(customer.name)}
            </div>
            <div className="min-w-0">
              <p className="truncate font-semibold text-[var(--dash-text)]">{customer.name}</p>
              <div className="mt-1 flex min-w-0 flex-wrap items-center gap-1.5">
                <Badge variant="outline" className="rounded-lg border-[var(--dash-border-subtle)] bg-[rgba(24,38,45,0.72)] font-mono text-[var(--dash-text-soft)]">
                  {customer.code || t.noCode}
                </Badge>
                <Badge variant="outline" className={cn("rounded-lg", customer.preferredLocale === "FR" ? toneClass("spruce") : toneClass("brand"))}>
                  <Languages className="me-1 h-3 w-3" />
                  {customer.preferredLocale}
                </Badge>
              </div>
            </div>
          </div>
        )
      },
      filterFn: (row, _id, value) => {
        const searchValue = String(value).toLowerCase()
        const customer = row.original
        return [
          customer.name,
          customer.code,
          customer.email,
          customer.phone,
          customer.address,
          customer.taxId,
        ]
          .filter(Boolean)
          .some((field) => String(field).toLowerCase().includes(searchValue))
      },
    },
    {
      id: "contact",
      header: t.tableColumns.contact,
      cell: ({ row }) => {
        const customer = row.original
        return (
          <div className="min-w-[210px] space-y-1.5 text-sm text-[var(--dash-text-soft)]">
            <p className="flex min-w-0 items-center gap-2">
              <Mail className="h-3.5 w-3.5 shrink-0 text-[var(--dash-info)]" />
              <span className="truncate">{customer.email || t.noEmail}</span>
            </p>
            <p className="flex min-w-0 items-center gap-2">
              <Phone className="h-3.5 w-3.5 shrink-0 text-[var(--dash-spruce)]" />
              <span className="truncate">{customer.phone || t.noPhone}</span>
            </p>
            <p className="flex min-w-0 items-center gap-2">
              <MapPin className="h-3.5 w-3.5 shrink-0 text-[var(--dash-gold)]" />
              <span className="truncate">{customer.address || t.noAddress}</span>
            </p>
          </div>
        )
      },
    },
    {
      id: "commercial",
      header: t.tableColumns.commercial,
      cell: ({ row }) => {
        const customer = row.original
        const overLimit = isOverCreditLimit(customer)
        return (
          <div className="min-w-[210px] space-y-2">
            <InlineMetric label={t.creditLimit} value={customer.creditLimit !== null ? formatCurrency(customer.creditLimit, locale) : "-"} />
            <InlineMetric label={t.balance} value={formatCurrency(customer.currentBalance, locale)} tone={overLimit ? "danger" : "default"} />
            <p className="text-xs text-[var(--dash-text-faint)]">
              {customer.paymentTerms ?? 0} {t.days}
            </p>
          </div>
        )
      },
    },
    {
      id: "activity",
      header: t.tableColumns.activity,
      cell: ({ row }) => {
        const customer = row.original
        return (
          <div className="grid min-w-[230px] grid-cols-2 gap-2 text-sm">
            <InlineMetric label={t.salesOrders} value={formatNumber(customer.salesOrdersCount, locale)} />
            <InlineMetric label={t.openOrdersCard} value={formatNumber(customer.openSalesOrdersCount, locale)} tone={customer.openSalesOrdersCount > 0 ? "gold" : "default"} />
            <InlineMetric label={t.unpaidOrders} value={formatNumber(customer.unpaidSalesOrdersCount, locale)} tone={customer.unpaidSalesOrdersCount > 0 ? "danger" : "default"} />
            <InlineMetric label={t.salesValue} value={formatCurrency(customer.totalSalesValue, locale)} />
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
        const customer = row.original
        const overLimit = isOverCreditLimit(customer)
        return (
          <div className="space-y-2">
            <Badge variant="outline" className={cn("rounded-lg", customer.isActive ? toneClass("success") : "border-[var(--dash-border-subtle)] bg-[rgba(126,145,137,0.14)] text-[var(--dash-text-soft)]")}>
              {customer.isActive ? <CheckCircle2 className="me-1 h-3.5 w-3.5" /> : <XCircle className="me-1 h-3.5 w-3.5" />}
              {customer.isActive ? t.active : t.inactive}
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
        const customer = row.original
        return (
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" size="icon" className="h-9 w-9 rounded-lg text-[var(--dash-text-soft)] hover:bg-[var(--dash-brand-soft)] hover:text-[var(--dash-brand-strong)]">
                <MoreHorizontal className="h-4 w-4" />
                <span className="sr-only">Open customer actions</span>
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-52 border-[var(--dash-border-subtle)] bg-[var(--dash-surface-raised)] text-[var(--dash-text)]">
              <DropdownMenuLabel>{t.actions}</DropdownMenuLabel>
              <DropdownMenuItem onClick={() => copyCustomerId(customer)}>
                <Copy className="me-2 h-4 w-4" />
                {t.copyId}
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuItem onClick={() => setAnalyticsCustomerId(customer.id)}>
                <BarChart3 className="me-2 h-4 w-4" />
                {t.viewAnalytics}
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => openEdit(customer)}>
                <Edit3 className="me-2 h-4 w-4" />
                {t.editCustomer}
              </DropdownMenuItem>
              <DropdownMenuItem asChild>
                <Link href={`${basePath}/${customer.id}/edit`}>
                  <ExternalLink className="me-2 h-4 w-4" />
                  {t.openEditPage}
                </Link>
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuItem className="text-[var(--dash-danger)] focus:text-[var(--dash-danger)]" onClick={() => setArchiveTarget(customer)}>
                <Archive className="me-2 h-4 w-4" />
                {t.archive}
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        )
      },
    },
  ], [basePath, copyCustomerId, locale, openEdit, t])

  const statsCards = useMemo(() => {
    const summary = data?.summary
    return [
      {
        label: t.totalCustomers,
        value: formatNumber(summary?.totalCustomers ?? 0, locale),
        Icon: Users,
        accent: "var(--dash-brand)",
        soft: "var(--dash-brand-soft)",
        sub: t.customers,
      },
      {
        label: t.activeCustomers,
        value: formatNumber(summary?.activeCustomers ?? 0, locale),
        Icon: UserCheck,
        accent: "var(--dash-success)",
        soft: "var(--dash-success-soft)",
        sub: `${formatNumber(summary?.inactiveCustomers ?? 0, locale)} ${t.inactive}`,
      },
      {
        label: t.newCustomers,
        value: formatNumber(summary?.newCustomers30Days ?? 0, locale),
        Icon: CalendarClock,
        accent: "var(--dash-info)",
        soft: "var(--dash-info-soft)",
        sub: t.last30Days,
      },
      {
        label: t.salesOrders,
        value: formatNumber(summary?.salesOrders ?? 0, locale),
        Icon: ShoppingCart,
        accent: "var(--dash-gold)",
        soft: "var(--dash-gold-soft)",
        sub: `${formatNumber(summary?.openSalesOrders ?? 0, locale)} ${t.openOrders}`,
      },
      {
        label: t.salesValue,
        value: formatCurrency(summary?.totalSalesValue ?? 0, locale),
        Icon: ReceiptText,
        accent: "var(--dash-spruce)",
        soft: "var(--dash-spruce-soft)",
        sub: `${formatNumber(summary?.averagePaymentTerms ?? 0, locale)} ${t.days}`,
      },
      {
        label: t.balance,
        value: formatCurrency(summary?.totalBalance ?? 0, locale),
        Icon: Wallet,
        accent: "var(--dash-warm)",
        soft: "var(--dash-warm-soft)",
        sub: `${formatNumber(summary?.overCreditLimitCustomers ?? 0, locale)} ${t.overLimit}`,
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
                <Users className="h-6 w-6 text-[var(--dash-brand-strong)]" />
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
            title={t.topSales}
            icon={BarChart3}
            rows={data?.topBySales ?? []}
            locale={locale}
            valueFor={(customer) => formatCurrency(customer.totalSalesValue, locale)}
            emptyText={t.noOrdersYet}
            onOpen={setAnalyticsCustomerId}
          />
          <AnalyticsListCard
            title={t.topBalances}
            icon={ShieldAlert}
            rows={data?.topByBalance ?? []}
            locale={locale}
            valueFor={(customer) => formatCurrency(customer.currentBalance, locale)}
            emptyText={t.noLedgerYet}
            onOpen={setAnalyticsCustomerId}
          />
        </div>

        <Card className="dashboard-glass-panel min-w-0 overflow-hidden rounded-lg text-[var(--dash-text)]">
          <CardHeader className="border-b border-[var(--dash-border-subtle)] bg-[rgba(12,20,24,0.58)] px-5 py-4 sm:px-6">
            <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
              <div className="flex min-w-0 items-center gap-3">
                <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-[var(--dash-spruce-soft)] text-[var(--dash-spruce)]">
                  <Users className="h-5 w-5" />
                </div>
                <div className="min-w-0">
                  <CardTitle className="text-lg font-semibold text-[var(--dash-text)]">{t.tableTitle}</CardTitle>
                  <p className="mt-1 break-words text-sm text-[var(--dash-text-soft)]">
                    {t.showing} {formatNumber(filteredCustomers.length, locale)} {t.of} {formatNumber(customers.length, locale)} {t.customers}
                  </p>
                </div>
              </div>
              <div className="flex flex-wrap items-center gap-2">
                <Badge variant="outline" className="dashboard-filter-chip h-9 w-fit rounded-lg">
                  <Sparkles className="me-1 h-3 w-3 text-[var(--dash-spruce)]" />
                  {t.liveData}
                </Badge>
                <Button type="button" variant="outline" size="sm" onClick={() => refetch()} disabled={isFetching} className="dashboard-button-secondary h-9 rounded-lg">
                  <RefreshCw className={cn("h-4 w-4", isFetching && "animate-spin")} />
                  {isFetching ? t.refreshing : t.refresh}
                </Button>
                <Button type="button" variant="outline" size="sm" onClick={exportCustomers} className="dashboard-button-secondary h-9 rounded-lg">
                  <Download className="h-4 w-4" />
                  {t.export}
                </Button>
              </div>
            </div>
          </CardHeader>
          <CardContent className="space-y-4 p-3 sm:p-5">
            {(statusFilter !== "all" || activityFilter !== "all" || localeFilter !== "all") && (
              <div className="flex flex-wrap items-center gap-2">
                {statusFilter !== "all" ? <Badge variant="outline" className="dashboard-filter-chip rounded-lg">{statusFilter === "active" ? t.active : t.inactive}</Badge> : null}
                {activityFilter !== "all" ? <Badge variant="outline" className="dashboard-filter-chip rounded-lg">{activityFilter}</Badge> : null}
                {localeFilter !== "all" ? <Badge variant="outline" className="dashboard-filter-chip rounded-lg">{localeFilter}</Badge> : null}
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  className="h-8 rounded-lg text-[var(--dash-text-soft)] hover:bg-[var(--dash-brand-soft)] hover:text-[var(--dash-brand-strong)]"
                  onClick={() => {
                    setStatusFilter("all")
                    setActivityFilter("all")
                    setLocaleFilter("all")
                  }}
                >
                  {t.clear}
                </Button>
              </div>
            )}

            <DataTable
              columns={columns}
              data={filteredCustomers}
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
                    <Select value={activityFilter} onValueChange={(value) => setActivityFilter(value as ActivityFilter)}>
                      <SelectTrigger className="dashboard-control h-9 w-full rounded-lg sm:w-[170px]">
                        <SelectValue placeholder={t.activity} />
                      </SelectTrigger>
                      <SelectContent className="border-[var(--dash-border-subtle)] bg-[var(--dash-surface-raised)] text-[var(--dash-text)]">
                        <SelectItem value="all">{t.all}</SelectItem>
                        <SelectItem value="open-orders">{t.openOrders}</SelectItem>
                        <SelectItem value="unpaid">{t.unpaid}</SelectItem>
                        <SelectItem value="over-limit">{t.overLimit}</SelectItem>
                        <SelectItem value="with-orders">{t.withOrders}</SelectItem>
                        <SelectItem value="no-orders">{t.noOrders}</SelectItem>
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
            setEditingCustomer(null)
            setFormError(null)
            setFormState(getDefaultForm())
          }
        }}
      >
        <DialogContent className="dashboard-glass-panel max-h-[92vh] max-w-4xl overflow-y-auto rounded-lg border-[var(--dash-border-subtle)] text-[var(--dash-text)]">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-[var(--dash-text)]">
              <Users className="h-5 w-5 text-[var(--dash-brand-strong)]" />
              {editingCustomer ? t.edit : t.create}
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
              <FormSection title={t.contact} icon={Mail}>
                <div className="grid gap-4 md:grid-cols-2">
                  <Field id="customer-name" label={t.fields.name} required>
                    <Input id="customer-name" value={formState.name} onChange={(event) => updateFormField("name", event.target.value)} placeholder={t.placeholders.name} className="dashboard-control h-11 rounded-lg" />
                  </Field>
                  <Field id="customer-code" label={t.fields.code}>
                    <Input id="customer-code" value={formState.code} onChange={(event) => updateFormField("code", event.target.value)} placeholder={t.placeholders.code} className="dashboard-control h-11 rounded-lg font-mono" />
                  </Field>
                  <Field id="customer-email" label={t.fields.email}>
                    <Input id="customer-email" type="email" value={formState.email} onChange={(event) => updateFormField("email", event.target.value)} placeholder={t.placeholders.email} className="dashboard-control h-11 rounded-lg" />
                  </Field>
                  <Field id="customer-phone" label={t.fields.phone}>
                    <Input id="customer-phone" value={formState.phone} onChange={(event) => updateFormField("phone", event.target.value)} placeholder={t.placeholders.phone} className="dashboard-control h-11 rounded-lg" />
                  </Field>
                  <div className="md:col-span-2">
                    <Field id="customer-address" label={t.fields.address}>
                      <Input id="customer-address" value={formState.address} onChange={(event) => updateFormField("address", event.target.value)} placeholder={t.placeholders.address} className="dashboard-control h-11 rounded-lg" />
                    </Field>
                  </div>
                  <div className="md:col-span-2">
                    <Field id="customer-tax-id" label={t.fields.taxId}>
                      <Input id="customer-tax-id" value={formState.taxId} onChange={(event) => updateFormField("taxId", event.target.value)} placeholder={t.placeholders.taxId} className="dashboard-control h-11 rounded-lg" />
                    </Field>
                  </div>
                </div>
              </FormSection>

              <div className="space-y-4">
                <FormSection title={t.commercial} icon={Wallet}>
                  <div className="grid gap-4 md:grid-cols-2">
                    <Field id="customer-terms" label={t.fields.paymentTerms}>
                      <Input id="customer-terms" type="number" min="0" max="365" step="1" value={formState.paymentTerms} onChange={(event) => updateFormField("paymentTerms", event.target.value)} placeholder={t.placeholders.paymentTerms} className="dashboard-control h-11 rounded-lg" />
                    </Field>
                    <Field id="customer-credit" label={t.fields.creditLimit}>
                      <Input id="customer-credit" type="number" min="0" step="1" value={formState.creditLimit} onChange={(event) => updateFormField("creditLimit", event.target.value)} placeholder={t.placeholders.creditLimit} className="dashboard-control h-11 rounded-lg" />
                    </Field>
                    <Field id="customer-language" label={t.fields.preferredLocale}>
                      <Select value={formState.preferredLocale} onValueChange={(value) => updateFormField("preferredLocale", value as CustomerLocale)}>
                        <SelectTrigger id="customer-language" className="dashboard-control h-11 rounded-lg">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent className="border-[var(--dash-border-subtle)] bg-[var(--dash-surface-raised)] text-[var(--dash-text)]">
                          <SelectItem value="EN">EN</SelectItem>
                          <SelectItem value="FR">FR</SelectItem>
                        </SelectContent>
                      </Select>
                    </Field>
                    <div className="flex items-center justify-between gap-3 rounded-lg border border-[var(--dash-border-subtle)] bg-[rgba(37,57,67,0.36)] p-3">
                      <Label htmlFor="customer-active" className="text-sm font-medium text-[var(--dash-text)]">{t.fields.isActive}</Label>
                      <Switch id="customer-active" checked={formState.isActive} onCheckedChange={(checked) => updateFormField("isActive", checked)} />
                    </div>
                  </div>
                </FormSection>

                <FormSection title={t.notes} icon={CalendarClock}>
                  <Field id="customer-notes" label={t.fields.notes}>
                    <Textarea id="customer-notes" value={formState.notes} onChange={(event) => updateFormField("notes", event.target.value)} placeholder={t.placeholders.notes} className="dashboard-control min-h-32 rounded-lg" />
                  </Field>
                </FormSection>

                {editingCustomer ? (
                  <FormSection title={t.analytics} icon={BarChart3}>
                    <div className="grid gap-3 sm:grid-cols-2">
                      <InlineMetric label={t.salesOrders} value={formatNumber(editingCustomer.salesOrdersCount, locale)} />
                      <InlineMetric label={t.unpaidOrders} value={formatNumber(editingCustomer.unpaidSalesOrdersCount, locale)} />
                      <InlineMetric label={t.salesValue} value={formatCurrency(editingCustomer.totalSalesValue, locale)} />
                      <InlineMetric label={t.balance} value={formatCurrency(editingCustomer.currentBalance, locale)} tone={isOverCreditLimit(editingCustomer) ? "danger" : "default"} />
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
                    {editingCustomer ? t.saving : t.creating}
                  </>
                ) : (
                  <>
                    <Plus className="h-4 w-4" />
                    {editingCustomer ? t.edit : t.create}
                  </>
                )}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      <Dialog open={!!analyticsCustomerId} onOpenChange={(open) => !open && setAnalyticsCustomerId(null)}>
        <DialogContent className="dashboard-glass-panel max-h-[92vh] max-w-5xl overflow-y-auto rounded-lg border-[var(--dash-border-subtle)] text-[var(--dash-text)]">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-[var(--dash-text)]">
              <BarChart3 className="h-5 w-5 text-[var(--dash-brand-strong)]" />
              {analyticsCustomer?.name ?? t.analytics}
            </DialogTitle>
            <DialogDescription className="text-[var(--dash-text-soft)]">
              {analyticsCustomer ? `${analyticsCustomer.code || t.noCode} | ${analyticsCustomer.email || t.noEmail}` : t.analytics}
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
              {analyticsCustomer ? (
                <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
                  <InlineMetric label={t.salesOrders} value={formatNumber(analyticsCustomer.salesOrdersCount, locale)} />
                  <InlineMetric label={t.unpaidOrders} value={formatNumber(analyticsCustomer.unpaidSalesOrdersCount, locale)} tone={analyticsCustomer.unpaidSalesOrdersCount > 0 ? "danger" : "default"} />
                  <InlineMetric label={t.salesValue} value={formatCurrency(analyticsCustomer.totalSalesValue, locale)} />
                  <InlineMetric label={t.balance} value={formatCurrency(analyticsCustomer.currentBalance, locale)} tone={isOverCreditLimit(analyticsCustomer) ? "danger" : "default"} />
                </div>
              ) : null}

              <div className="grid gap-4 lg:grid-cols-3">
                <DetailList
                  title={t.recentOrders}
                  icon={ShoppingCart}
                  emptyText={t.noOrdersYet}
                  items={(analyticsQuery.data?.salesOrders ?? []).map((order) => ({
                    id: order.id,
                    title: order.orderNumber,
                    meta: `${order.status} | ${order.paymentStatus} | ${formatDate(order.orderDate, locale)}`,
                    value: formatCurrency(order.total, locale),
                  }))}
                />
                <DetailList
                  title={t.recentLedger}
                  icon={Wallet}
                  emptyText={t.noLedgerYet}
                  items={(analyticsQuery.data?.ledgerEntries ?? []).map((entry) => ({
                    id: entry.id,
                    title: entry.type,
                    meta: `${formatDate(entry.entryDate, locale)} | ${entry.description}`,
                    value: formatCurrency(entry.balanceAfter, locale),
                  }))}
                />
                <DetailList
                  title={t.recentPayments}
                  icon={CreditCard}
                  emptyText={t.noPaymentsYet}
                  items={(analyticsQuery.data?.payments ?? []).map((payment) => ({
                    id: payment.id,
                    title: payment.paymentNumber,
                    meta: `${payment.method} | ${payment.status} | ${formatDate(payment.processedAt ?? payment.createdAt, locale)}`,
                    value: formatCurrency(payment.amount, locale),
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
  rows: CustomerManagementRow[]
  locale: Locale
  valueFor: (customer: CustomerManagementRow) => string
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
        {rows.length ? rows.map((customer) => (
          <button
            key={customer.id}
            type="button"
            onClick={() => onOpen(customer.id)}
            className="flex w-full min-w-0 items-center justify-between gap-3 rounded-lg border border-[var(--dash-border-subtle)] bg-[rgba(37,57,67,0.24)] p-3 text-left transition hover:bg-[var(--dash-brand-soft)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--dash-brand)]"
          >
            <div className="min-w-0">
              <p className="truncate text-sm font-semibold text-[var(--dash-text)]">{customer.name}</p>
              <p className="mt-1 text-xs text-[var(--dash-text-faint)]">
                {formatNumber(customer.salesOrdersCount, locale)} orders | {formatNumber(customer.unpaidSalesOrdersCount, locale)} unpaid
              </p>
            </div>
            <span className="shrink-0 text-sm font-semibold text-[var(--dash-brand-strong)]">{valueFor(customer)}</span>
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
