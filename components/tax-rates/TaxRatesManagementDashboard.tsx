"use client"

import { useCallback, useEffect, useMemo, useState, type ReactNode } from "react"
import {
  type ColumnDef,
  type SortingState,
  flexRender,
  getCoreRowModel,
  getPaginationRowModel,
  getSortedRowModel,
  useReactTable,
} from "@tanstack/react-table"
import type { TaxType } from "@prisma/client"
import {
  AlertCircle,
  Banknote,
  Calculator,
  CheckCircle2,
  ChevronsUpDown,
  Copy,
  Download,
  Edit3,
  ExternalLink,
  FileText,
  Globe2,
  Loader2,
  MoreHorizontal,
  Percent,
  Plus,
  Power,
  ReceiptText,
  RefreshCw,
  Search,
  ShieldCheck,
  Trash2,
  XCircle,
  type LucideIcon,
} from "lucide-react"

import { Link } from "@/i18n/navigation"
import type { Locale } from "@/types/bilingual"
import { cn } from "@/lib/utils"
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
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import type { TaxRateManagementInput, TaxRateManagementRow } from "@/actions/taxRate/tax-rate-management-actions"
import {
  useCreateManagedTaxRate,
  useDeleteManagedTaxRate,
  useTaxRateManagementData,
  useUpdateManagedTaxRate,
} from "@/hooks/useTaxRateManagement"

interface TaxRatesManagementDashboardProps {
  organizationId: string
  locale?: Locale
  initialAction?: "create"
  initialEditId?: string
}

type StatusFilter = "all" | "active" | "inactive"
type RateFilter = "all" | "zero" | "reduced" | "standard" | "high"
type TaxRateFormState = {
  nameEn: string
  nameFr: string
  rate: string
  type: TaxType
  isActive: boolean
}

const DASHBOARD_SEGMENT = "dashboard"

const dashboardPath = (...segments: string[]) =>
  `/${[DASHBOARD_SEGMENT, ...segments].join("/")}`

const TAX_TYPES = ["SALES", "VAT", "GST", "EXCISE", "IMPORT", "EXPORT"] as const satisfies readonly TaxType[]

const copy = {
  en: {
    eyebrow: "Tax configuration",
    title: "Tax rates dashboard",
    subtitle: "Manage reusable tax rates for item pricing, sales orders, purchasing, and reporting.",
    search: "Search name, French name, type, rate...",
    status: "Status",
    type: "Type",
    rateBand: "Rate band",
    all: "All",
    active: "Active",
    inactive: "Inactive",
    zero: "Zero",
    reduced: "Reduced",
    standard: "Standard",
    high: "High",
    create: "Create tax rate",
    edit: "Edit tax rate",
    refresh: "Refresh",
    refreshing: "Refreshing",
    export: "Export",
    actions: "Actions",
    viewDetails: "View details",
    copyId: "Copy ID",
    remove: "Remove",
    loadingTitle: "Loading tax rates",
    loadingBody: "Collecting rates, tax types, and item usage counts.",
    errorTitle: "Tax rates unavailable",
    retry: "Try again",
    emptyTitle: "No tax rates found",
    emptyBody: "Create VAT, sales tax, import duty, or zero-rate definitions before assigning taxes to items.",
    rows: "rows",
    page: "Page",
    of: "of",
    previous: "Previous",
    next: "Next",
    totalRates: "Total rates",
    activeRates: "Active",
    referencedRates: "Used by items",
    averageRate: "Average rate",
    noFrenchName: "No French name",
    copiedTitle: "Tax rate ID copied",
    copiedBody: "The tax rate identifier is ready to paste.",
    copyFailedTitle: "Copy failed",
    copyFailedBody: "The browser could not copy this identifier.",
    exportTitle: "Tax rates exported",
    exportBody: "The current tax rate view was exported as CSV.",
    requiredTitle: "Tax rate details required",
    requiredBody: "Enter an English name and a valid rate before saving.",
    invalidRateTitle: "Invalid tax rate",
    invalidRateBody: "Use a number between 0 and 100.",
    removeTitle: "Remove tax rate",
    removeBody: "Unused tax rates are deleted. Rates attached to items are deactivated to preserve item and sales history.",
    confirmRemove: "Remove tax rate",
    cancel: "Cancel",
    saving: "Saving",
    creating: "Creating",
    formDescription: "Tax identity, type, percentage rate, and active status.",
    fields: {
      nameEn: "English name",
      nameFr: "French name",
      rate: "Rate",
      type: "Type",
      isActive: "Active",
    },
    placeholders: {
      nameEn: "Standard VAT",
      nameFr: "TVA standard",
      rate: "19.25",
    },
    tableColumns: {
      taxRate: "Tax rate",
      type: "Type",
      rate: "Rate",
      usage: "Usage",
      activity: "Activity",
      status: "Status",
      actions: "Actions",
    },
    types: {
      SALES: "Sales tax",
      VAT: "VAT",
      GST: "GST",
      EXCISE: "Excise",
      IMPORT: "Import",
      EXPORT: "Export",
    },
  },
  fr: {
    eyebrow: "Configuration fiscale",
    title: "Tableau des taux de taxe",
    subtitle: "Gerez les taux reutilisables pour les prix articles, ventes, achats et rapports.",
    search: "Rechercher nom, nom francais, type, taux...",
    status: "Statut",
    type: "Type",
    rateBand: "Plage",
    all: "Tous",
    active: "Actif",
    inactive: "Inactif",
    zero: "Zero",
    reduced: "Reduit",
    standard: "Standard",
    high: "Eleve",
    create: "Creer un taux",
    edit: "Modifier le taux",
    refresh: "Actualiser",
    refreshing: "Actualisation",
    export: "Exporter",
    actions: "Actions",
    viewDetails: "Voir details",
    copyId: "Copier ID",
    remove: "Retirer",
    loadingTitle: "Chargement des taux",
    loadingBody: "Collecte des taux, types fiscaux et compteurs articles.",
    errorTitle: "Taux indisponibles",
    retry: "Reessayer",
    emptyTitle: "Aucun taux trouve",
    emptyBody: "Creez TVA, taxe de vente, import ou taux zero avant d'assigner les taxes aux articles.",
    rows: "lignes",
    page: "Page",
    of: "sur",
    previous: "Retour",
    next: "Suivant",
    totalRates: "Total taux",
    activeRates: "Actifs",
    referencedRates: "Utilises",
    averageRate: "Taux moyen",
    noFrenchName: "Pas de nom francais",
    copiedTitle: "ID taux copie",
    copiedBody: "L'identifiant du taux est pret a coller.",
    copyFailedTitle: "Copie echouee",
    copyFailedBody: "Le navigateur n'a pas pu copier cet identifiant.",
    exportTitle: "Taux exportes",
    exportBody: "La vue actuelle des taux a ete exportee en CSV.",
    requiredTitle: "Details fiscaux requis",
    requiredBody: "Saisissez un nom anglais et un taux valide avant l'enregistrement.",
    invalidRateTitle: "Taux invalide",
    invalidRateBody: "Utilisez un nombre entre 0 et 100.",
    removeTitle: "Retirer le taux",
    removeBody: "Les taux inutilises sont supprimes. Ceux attaches aux articles sont desactives pour preserver l'historique.",
    confirmRemove: "Retirer le taux",
    cancel: "Annuler",
    saving: "Enregistrement",
    creating: "Creation",
    formDescription: "Identite fiscale, type, pourcentage et statut actif.",
    fields: {
      nameEn: "Nom anglais",
      nameFr: "Nom francais",
      rate: "Taux",
      type: "Type",
      isActive: "Actif",
    },
    placeholders: {
      nameEn: "Standard VAT",
      nameFr: "TVA standard",
      rate: "19.25",
    },
    tableColumns: {
      taxRate: "Taux",
      type: "Type",
      rate: "Taux",
      usage: "Utilisation",
      activity: "Activite",
      status: "Statut",
      actions: "Actions",
    },
    types: {
      SALES: "Taxe vente",
      VAT: "TVA",
      GST: "GST",
      EXCISE: "Accise",
      IMPORT: "Import",
      EXPORT: "Export",
    },
  },
} as const

const typeMeta: Record<TaxType, { icon: LucideIcon; tone: "brand" | "spruce" | "gold" | "success" }> = {
  SALES: { icon: ReceiptText, tone: "brand" },
  VAT: { icon: Percent, tone: "success" },
  GST: { icon: Calculator, tone: "spruce" },
  EXCISE: { icon: ShieldCheck, tone: "gold" },
  IMPORT: { icon: Globe2, tone: "spruce" },
  EXPORT: { icon: FileText, tone: "brand" },
}

function getDefaultForm(): TaxRateFormState {
  return {
    nameEn: "",
    nameFr: "",
    rate: "",
    type: "SALES",
    isActive: true,
  }
}

function formFromTaxRate(taxRate: TaxRateManagementRow): TaxRateFormState {
  return {
    nameEn: taxRate.nameEn,
    nameFr: taxRate.nameFr ?? "",
    rate: taxRate.rate,
    type: taxRate.type,
    isActive: taxRate.isActive,
  }
}

function formatNumber(value: number, locale: Locale) {
  return new Intl.NumberFormat(locale === "fr" ? "fr-FR" : "en-US", {
    maximumFractionDigits: 2,
  }).format(value)
}

function formatPercent(value: number, locale: Locale) {
  return `${formatNumber(value, locale)}%`
}

function formatDate(value: Date | string | null | undefined, locale: Locale, fallback: string) {
  if (!value) return fallback
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return fallback
  return new Intl.DateTimeFormat(locale === "fr" ? "fr-FR" : "en-US", { dateStyle: "medium" }).format(date)
}

function escapeCsv(value: string | number | boolean | null | undefined) {
  const text = String(value ?? "")
  return `"${text.replace(/"/g, '""')}"`
}

function getRateBand(rate: number): RateFilter {
  if (rate === 0) return "zero"
  if (rate <= 5) return "reduced"
  if (rate <= 20) return "standard"
  return "high"
}

function toneClass(tone: "brand" | "spruce" | "gold" | "success" | "danger") {
  return {
    brand: "border-[var(--dash-brand)] bg-[var(--dash-brand-soft)] text-[var(--dash-brand-strong)]",
    spruce: "border-[var(--dash-spruce)] bg-[var(--dash-spruce-soft)] text-[var(--dash-spruce)]",
    gold: "border-[var(--dash-gold)] bg-[var(--dash-gold-soft)] text-[var(--dash-gold)]",
    success: "border-[var(--dash-success)] bg-[var(--dash-success-soft)] text-[var(--dash-success)]",
    danger: "border-[var(--dash-danger)] bg-[var(--dash-danger-soft)] text-[var(--dash-danger)]",
  }[tone]
}

function SortIcon({ sorted }: { sorted: false | "asc" | "desc" }) {
  return (
    <ChevronsUpDown
      className={cn("h-3.5 w-3.5", sorted ? "text-[var(--dash-brand-strong)]" : "text-[var(--dash-text-faint)]")}
    />
  )
}

export default function TaxRatesManagementDashboard({
  organizationId,
  locale = "en",
  initialAction,
  initialEditId,
}: TaxRatesManagementDashboardProps) {
  const t = copy[locale]
  const notifications = useNotifications()
  const [search, setSearch] = useState("")
  const [typeFilter, setTypeFilter] = useState<TaxType | "all">("all")
  const [statusFilter, setStatusFilter] = useState<StatusFilter>("all")
  const [rateFilter, setRateFilter] = useState<RateFilter>("all")
  const [sorting, setSorting] = useState<SortingState>([])
  const [formOpen, setFormOpen] = useState(false)
  const [editingTaxRate, setEditingTaxRate] = useState<TaxRateManagementRow | null>(null)
  const [removeTarget, setRemoveTarget] = useState<TaxRateManagementRow | null>(null)
  const [formError, setFormError] = useState<string | null>(null)
  const [formState, setFormState] = useState<TaxRateFormState>(() => getDefaultForm())
  const [initialRequestHandled, setInitialRequestHandled] = useState(false)

  const {
    data,
    isLoading,
    isFetching,
    isError,
    error,
    refetch,
  } = useTaxRateManagementData(organizationId)
  const createMutation = useCreateManagedTaxRate(organizationId, locale)
  const updateMutation = useUpdateManagedTaxRate(organizationId, locale)
  const deleteMutation = useDeleteManagedTaxRate(organizationId, locale)

  const taxRates = useMemo(() => data?.taxRates ?? [], [data?.taxRates])
  const isSaving = createMutation.isPending || updateMutation.isPending

  const filteredTaxRates = useMemo(() => {
    const query = search.trim().toLowerCase()

    return taxRates.filter((taxRate) => {
      if (typeFilter !== "all" && taxRate.type !== typeFilter) return false
      if (statusFilter === "active" && !taxRate.isActive) return false
      if (statusFilter === "inactive" && taxRate.isActive) return false
      if (rateFilter !== "all" && getRateBand(taxRate.rateNumber) !== rateFilter) return false

      if (!query) return true

      return [
        taxRate.nameEn,
        taxRate.nameFr,
        taxRate.type,
        taxRate.rate,
      ]
        .filter(Boolean)
        .join(" ")
        .toLowerCase()
        .includes(query)
    })
  }, [rateFilter, search, statusFilter, taxRates, typeFilter])

  const summary = useMemo(() => {
    const activeRates = taxRates.filter((taxRate) => taxRate.isActive).length
    const referencedRates = taxRates.filter((taxRate) => taxRate.itemsCount > 0).length
    const averageRate = taxRates.length
      ? taxRates.reduce((sum, taxRate) => sum + taxRate.rateNumber, 0) / taxRates.length
      : 0
    const typeCounts = TAX_TYPES.map((type) => ({
      type,
      count: taxRates.filter((taxRate) => taxRate.type === type).length,
    })).filter((item) => item.count > 0)

    return {
      activeRates,
      referencedRates,
      averageRate,
      typeCounts,
    }
  }, [taxRates])

  const openCreate = useCallback(() => {
    setEditingTaxRate(null)
    setFormError(null)
    setFormState(getDefaultForm())
    setFormOpen(true)
  }, [])

  const openEdit = useCallback((taxRate: TaxRateManagementRow) => {
    setEditingTaxRate(taxRate)
    setFormError(null)
    setFormState(formFromTaxRate(taxRate))
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
      const taxRate = taxRates.find((item) => item.id === initialEditId)

      if (taxRate) {
        openEdit(taxRate)
      } else {
        notifications.error(t.errorTitle, "The requested tax rate could not be opened for editing.")
      }

      setInitialRequestHandled(true)
    }
  }, [initialAction, initialEditId, initialRequestHandled, isLoading, notifications, openCreate, openEdit, t.errorTitle, taxRates])

  const updateFormField = useCallback(<K extends keyof TaxRateFormState>(field: K, value: TaxRateFormState[K]) => {
    setFormState((current) => ({ ...current, [field]: value }))
    setFormError(null)
  }, [])

  const buildInput = useCallback((): TaxRateManagementInput | null => {
    const nameEn = formState.nameEn.trim()
    const rateText = formState.rate.trim()
    const rate = rateText ? Number(rateText) : Number.NaN

    if (!nameEn || !Number.isFinite(rate)) {
      notifications.warning(t.requiredTitle, t.requiredBody)
      setFormError(t.requiredBody)
      return null
    }

    if (rate < 0 || rate > 100) {
      notifications.warning(t.invalidRateTitle, t.invalidRateBody)
      setFormError(t.invalidRateBody)
      return null
    }

    return {
      nameEn,
      nameFr: formState.nameFr.trim() || null,
      rate,
      type: formState.type,
      isActive: formState.isActive,
    }
  }, [formState, notifications, t.invalidRateBody, t.invalidRateTitle, t.requiredBody, t.requiredTitle])

  const submitForm = useCallback(async () => {
    const payload = buildInput()
    if (!payload) return

    try {
      if (editingTaxRate) {
        await updateMutation.mutateAsync({ id: editingTaxRate.id, data: payload })
      } else {
        await createMutation.mutateAsync(payload)
      }

      setFormOpen(false)
      setEditingTaxRate(null)
      setFormState(getDefaultForm())
      setFormError(null)
    } catch (mutationError) {
      setFormError(mutationError instanceof Error ? mutationError.message : t.errorTitle)
    }
  }, [buildInput, createMutation, editingTaxRate, t.errorTitle, updateMutation])

  const copyTaxRateId = useCallback(async (taxRate: TaxRateManagementRow) => {
    try {
      await navigator.clipboard.writeText(taxRate.id)
      notifications.success(t.copiedTitle, t.copiedBody)
    } catch {
      notifications.error(t.copyFailedTitle, t.copyFailedBody)
    }
  }, [notifications, t.copiedBody, t.copiedTitle, t.copyFailedBody, t.copyFailedTitle])

  const exportTaxRates = useCallback(() => {
    const header = ["Name EN", "Name FR", "Rate", "Type", "Active", "Items"]
    const rows = filteredTaxRates.map((taxRate) => [
      taxRate.nameEn,
      taxRate.nameFr ?? "",
      taxRate.rate,
      taxRate.type,
      taxRate.isActive ? "true" : "false",
      taxRate.itemsCount,
    ])
    const csv = [header, ...rows]
      .map((row) => row.map((value) => escapeCsv(value)).join(","))
      .join("\n")
    const blob = new Blob([csv], { type: "text/csv;charset=utf-8" })
    const url = URL.createObjectURL(blob)
    const anchor = document.createElement("a")
    anchor.href = url
    anchor.download = "tax-rates.csv"
    anchor.click()
    URL.revokeObjectURL(url)
    notifications.success(t.exportTitle, t.exportBody)
  }, [filteredTaxRates, notifications, t.exportBody, t.exportTitle])

  const columns = useMemo<ColumnDef<TaxRateManagementRow>[]>(() => [
    {
      accessorKey: "nameEn",
      header: ({ column }) => (
        <HeaderButton onClick={() => column.toggleSorting(column.getIsSorted() === "asc")}>
          {t.tableColumns.taxRate}
          <SortIcon sorted={column.getIsSorted()} />
        </HeaderButton>
      ),
      cell: ({ row }) => {
        const taxRate = row.original
        return (
          <div className="min-w-0">
            <div className="flex items-center gap-2">
              <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg border border-[var(--dash-border-subtle)] bg-[var(--dash-brand-soft)] text-[var(--dash-brand-strong)]">
                <Percent className="h-4 w-4" />
              </span>
              <div className="min-w-0">
                <p className="truncate font-semibold text-[var(--dash-text)]">{taxRate.nameEn}</p>
                <p className="truncate text-xs text-[var(--dash-text-soft)]">{taxRate.nameFr || t.noFrenchName}</p>
              </div>
            </div>
          </div>
        )
      },
    },
    {
      accessorKey: "type",
      header: ({ column }) => (
        <HeaderButton onClick={() => column.toggleSorting(column.getIsSorted() === "asc")}>
          {t.tableColumns.type}
          <SortIcon sorted={column.getIsSorted()} />
        </HeaderButton>
      ),
      cell: ({ row }) => {
        const type = row.original.type
        const meta = typeMeta[type]
        const Icon = meta.icon
        return (
          <Badge variant="outline" className={cn("rounded-lg", toneClass(meta.tone))}>
            <Icon className="me-1.5 h-3.5 w-3.5" />
            {t.types[type]}
          </Badge>
        )
      },
    },
    {
      accessorKey: "rateNumber",
      header: ({ column }) => (
        <HeaderButton onClick={() => column.toggleSorting(column.getIsSorted() === "asc")}>
          {t.tableColumns.rate}
          <SortIcon sorted={column.getIsSorted()} />
        </HeaderButton>
      ),
      cell: ({ row }) => {
        const band = getRateBand(row.original.rateNumber)
        const tone = band === "high" ? "danger" : band === "standard" ? "gold" : band === "reduced" ? "spruce" : "success"
        return (
          <Badge variant="outline" className={cn("rounded-lg text-sm", toneClass(tone))}>
            <Percent className="me-1.5 h-3.5 w-3.5" />
            {formatPercent(row.original.rateNumber, locale)}
          </Badge>
        )
      },
    },
    {
      accessorKey: "itemsCount",
      header: ({ column }) => (
        <HeaderButton onClick={() => column.toggleSorting(column.getIsSorted() === "asc")}>
          {t.tableColumns.usage}
          <SortIcon sorted={column.getIsSorted()} />
        </HeaderButton>
      ),
      cell: ({ row }) => (
        <div className="grid min-w-36 grid-cols-2 gap-2 text-sm">
          <InlineMetric label="Items" value={formatNumber(row.original.itemsCount, locale)} />
          <InlineMetric label="Active" value={formatNumber(row.original.activeItemsCount, locale)} />
        </div>
      ),
    },
    {
      accessorKey: "updatedAt",
      header: ({ column }) => (
        <HeaderButton onClick={() => column.toggleSorting(column.getIsSorted() === "asc")}>
          {t.tableColumns.activity}
          <SortIcon sorted={column.getIsSorted()} />
        </HeaderButton>
      ),
      cell: ({ row }) => (
        <div className="text-sm text-[var(--dash-text-soft)]">
          {formatDate(row.original.updatedAt, locale, "-")}
        </div>
      ),
    },
    {
      accessorKey: "isActive",
      header: t.tableColumns.status,
      cell: ({ row }) => (
        row.original.isActive ? (
          <Badge variant="outline" className={cn("rounded-lg", toneClass("success"))}>
            <CheckCircle2 className="me-1 h-3.5 w-3.5" />
            {t.active}
          </Badge>
        ) : (
          <Badge variant="outline" className={cn("rounded-lg", toneClass("danger"))}>
            <XCircle className="me-1 h-3.5 w-3.5" />
            {t.inactive}
          </Badge>
        )
      ),
    },
    {
      id: "actions",
      header: t.tableColumns.actions,
      enableSorting: false,
      cell: ({ row }) => {
        const taxRate = row.original
        return (
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" size="icon" className="h-9 w-9 rounded-lg text-[var(--dash-text-soft)] hover:bg-[var(--dash-brand-soft)] hover:text-[var(--dash-brand-strong)]">
                <MoreHorizontal className="h-4 w-4" />
                <span className="sr-only">{t.actions}</span>
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-52 border-[var(--dash-border-subtle)] bg-[var(--dash-surface-raised)] text-[var(--dash-text)]">
              <DropdownMenuLabel>{t.actions}</DropdownMenuLabel>
              <DropdownMenuSeparator className="bg-[var(--dash-border-subtle)]" />
              <DropdownMenuItem asChild>
                <Link href={dashboardPath("settings", "tax-rates", taxRate.id)}>
                  <ExternalLink className="me-2 h-4 w-4" />
                  {t.viewDetails}
                </Link>
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => openEdit(taxRate)}>
                <Edit3 className="me-2 h-4 w-4" />
                {t.edit}
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => copyTaxRateId(taxRate)}>
                <Copy className="me-2 h-4 w-4" />
                {t.copyId}
              </DropdownMenuItem>
              <DropdownMenuSeparator className="bg-[var(--dash-border-subtle)]" />
              <DropdownMenuItem className="text-[var(--dash-danger)] focus:text-[var(--dash-danger)]" onClick={() => setRemoveTarget(taxRate)}>
                {taxRate.itemsCount > 0 ? <Power className="me-2 h-4 w-4" /> : <Trash2 className="me-2 h-4 w-4" />}
                {t.remove}
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        )
      },
    },
  ], [copyTaxRateId, locale, openEdit, t])

  const table = useReactTable({
    data: filteredTaxRates,
    columns,
    state: { sorting },
    onSortingChange: setSorting,
    getCoreRowModel: getCoreRowModel(),
    getSortedRowModel: getSortedRowModel(),
    getPaginationRowModel: getPaginationRowModel(),
    initialState: {
      pagination: { pageSize: 10 },
    },
  })

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
        <div className="dashboard-glass-panel rounded-lg border border-[var(--dash-border-subtle)] p-5">
          <div className="flex flex-col gap-5 lg:flex-row lg:items-start lg:justify-between">
            <div className="min-w-0">
              <p className="text-xs font-semibold uppercase tracking-[0.18em] text-[var(--dash-brand-strong)]">{t.eyebrow}</p>
              <div className="mt-3 flex items-start gap-3">
                <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-lg border border-[var(--dash-border-subtle)] bg-[var(--dash-brand-soft)]">
                  <Percent className="h-6 w-6 text-[var(--dash-brand-strong)]" />
                </div>
                <div className="min-w-0">
                  <h1 className="text-2xl font-semibold text-[var(--dash-text)] md:text-3xl">{t.title}</h1>
                  <p className="mt-2 max-w-3xl text-sm leading-6 text-[var(--dash-text-soft)]">{t.subtitle}</p>
                </div>
              </div>
            </div>
            <div className="flex flex-wrap gap-2">
              <Button
                type="button"
                variant="outline"
                onClick={() => refetch()}
                disabled={isFetching}
                className="dashboard-button-secondary h-10 rounded-lg"
              >
                <RefreshCw className={cn("h-4 w-4", isFetching && "animate-spin")} />
                {isFetching ? t.refreshing : t.refresh}
              </Button>
              <Button type="button" onClick={openCreate} className="dashboard-button-create h-10 rounded-lg">
                <Plus className="h-4 w-4" />
                {t.create}
              </Button>
            </div>
          </div>

          <div className="mt-6 grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
            <SummaryTile icon={Percent} label={t.totalRates} value={taxRates.length} locale={locale} tone="brand" />
            <SummaryTile icon={CheckCircle2} label={t.activeRates} value={summary.activeRates} locale={locale} tone="success" />
            <SummaryTile icon={Banknote} label={t.referencedRates} value={summary.referencedRates} locale={locale} tone="spruce" />
            <SummaryTile icon={Calculator} label={t.averageRate} value={formatPercent(summary.averageRate, locale)} tone="gold" />
          </div>
        </div>

        <div className="dashboard-glass-panel rounded-lg border border-[var(--dash-border-subtle)] p-4">
          <div className="mb-4 grid gap-3 xl:grid-cols-[minmax(0,1fr)_10rem_10rem_10rem_auto]">
            <div className="relative">
              <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-[var(--dash-text-faint)]" />
              <Input
                value={search}
                onChange={(event) => setSearch(event.target.value)}
                placeholder={t.search}
                className="dashboard-control h-11 rounded-lg pl-10"
              />
            </div>
            <Select value={typeFilter} onValueChange={(value) => setTypeFilter(value as TaxType | "all")}>
              <SelectTrigger className="dashboard-control h-11 rounded-lg">
                <SelectValue placeholder={t.type} />
              </SelectTrigger>
              <SelectContent className="border-[var(--dash-border-subtle)] bg-[var(--dash-surface-raised)] text-[var(--dash-text)]">
                <SelectItem value="all">{t.all}</SelectItem>
                {TAX_TYPES.map((type) => (
                  <SelectItem key={type} value={type}>{t.types[type]}</SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Select value={rateFilter} onValueChange={(value) => setRateFilter(value as RateFilter)}>
              <SelectTrigger className="dashboard-control h-11 rounded-lg">
                <SelectValue placeholder={t.rateBand} />
              </SelectTrigger>
              <SelectContent className="border-[var(--dash-border-subtle)] bg-[var(--dash-surface-raised)] text-[var(--dash-text)]">
                <SelectItem value="all">{t.all}</SelectItem>
                <SelectItem value="zero">{t.zero}</SelectItem>
                <SelectItem value="reduced">{t.reduced}</SelectItem>
                <SelectItem value="standard">{t.standard}</SelectItem>
                <SelectItem value="high">{t.high}</SelectItem>
              </SelectContent>
            </Select>
            <Select value={statusFilter} onValueChange={(value) => setStatusFilter(value as StatusFilter)}>
              <SelectTrigger className="dashboard-control h-11 rounded-lg">
                <SelectValue placeholder={t.status} />
              </SelectTrigger>
              <SelectContent className="border-[var(--dash-border-subtle)] bg-[var(--dash-surface-raised)] text-[var(--dash-text)]">
                <SelectItem value="all">{t.all}</SelectItem>
                <SelectItem value="active">{t.active}</SelectItem>
                <SelectItem value="inactive">{t.inactive}</SelectItem>
              </SelectContent>
            </Select>
            <Button type="button" variant="outline" onClick={exportTaxRates} className="dashboard-button-secondary h-11 rounded-lg">
              <Download className="h-4 w-4" />
              {t.export}
            </Button>
          </div>

          {summary.typeCounts.length ? (
            <div className="mb-4 flex flex-wrap gap-2">
              {summary.typeCounts.map((item) => {
                const meta = typeMeta[item.type]
                const Icon = meta.icon
                return (
                  <Badge key={item.type} variant="outline" className={cn("rounded-lg", toneClass(meta.tone))}>
                    <Icon className="me-1.5 h-3.5 w-3.5" />
                    {t.types[item.type]}: {formatNumber(item.count, locale)}
                  </Badge>
                )
              })}
            </div>
          ) : null}

          <div className="overflow-hidden rounded-lg border border-[var(--dash-border-subtle)] bg-[rgba(12,20,24,0.35)]">
            <div className="overflow-x-auto">
              <Table className="min-w-[72rem]">
                <TableHeader className="bg-[rgba(16,27,32,0.94)]">
                  {table.getHeaderGroups().map((headerGroup) => (
                    <TableRow key={headerGroup.id} className="border-[var(--dash-border-subtle)] hover:bg-transparent">
                      {headerGroup.headers.map((header) => (
                        <TableHead key={header.id} className="h-12 px-4 text-xs font-semibold text-[var(--dash-text-muted)]">
                          {header.isPlaceholder ? null : flexRender(header.column.columnDef.header, header.getContext())}
                        </TableHead>
                      ))}
                    </TableRow>
                  ))}
                </TableHeader>
                <TableBody>
                  {table.getRowModel().rows.length ? (
                    table.getRowModel().rows.map((row) => (
                      <TableRow key={row.id} className="border-[var(--dash-border-subtle)] hover:bg-[var(--dash-brand-soft)]">
                        {row.getVisibleCells().map((cell) => (
                          <TableCell key={cell.id} className="px-4 py-4 align-top">
                            {flexRender(cell.column.columnDef.cell, cell.getContext())}
                          </TableCell>
                        ))}
                      </TableRow>
                    ))
                  ) : (
                    <TableRow>
                      <TableCell colSpan={table.getVisibleLeafColumns().length} className="h-48 text-center">
                        <div className="mx-auto flex max-w-sm flex-col items-center gap-3 text-[var(--dash-text-soft)]">
                          <div className="flex h-12 w-12 items-center justify-center rounded-lg bg-[var(--dash-brand-soft)] text-[var(--dash-brand-strong)]">
                            <Percent className="h-6 w-6" />
                          </div>
                          <div>
                            <p className="font-semibold text-[var(--dash-text)]">{t.emptyTitle}</p>
                            <p className="mt-1 text-sm leading-6">{t.emptyBody}</p>
                          </div>
                          <Button type="button" onClick={openCreate} className="dashboard-button-create h-10 rounded-lg">
                            <Plus className="h-4 w-4" />
                            {t.create}
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  )}
                </TableBody>
              </Table>
            </div>
          </div>

          <div className="mt-4 flex flex-col gap-3 text-sm text-[var(--dash-text-soft)] md:flex-row md:items-center md:justify-between">
            <div>
              {t.page} {table.getState().pagination.pageIndex + 1} {t.of} {Math.max(table.getPageCount(), 1)}
              <span className="ms-2">({formatNumber(filteredTaxRates.length, locale)} {t.rows})</span>
            </div>
            <div className="flex flex-wrap items-center gap-2">
              <Select
                value={String(table.getState().pagination.pageSize)}
                onValueChange={(value) => table.setPageSize(Number(value))}
              >
                <SelectTrigger className="dashboard-control h-10 w-24 rounded-lg">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent className="border-[var(--dash-border-subtle)] bg-[var(--dash-surface-raised)] text-[var(--dash-text)]">
                  {[5, 10, 20, 50].map((size) => (
                    <SelectItem key={size} value={String(size)}>{size}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <Button
                type="button"
                variant="outline"
                onClick={() => table.previousPage()}
                disabled={!table.getCanPreviousPage()}
                className="dashboard-button-secondary h-10 rounded-lg"
              >
                {t.previous}
              </Button>
              <Button
                type="button"
                variant="outline"
                onClick={() => table.nextPage()}
                disabled={!table.getCanNextPage()}
                className="dashboard-button-secondary h-10 rounded-lg"
              >
                {t.next}
              </Button>
            </div>
          </div>
        </div>
      </section>

      <Dialog
        open={formOpen}
        onOpenChange={(open) => {
          setFormOpen(open)
          if (!open && !isSaving) {
            setEditingTaxRate(null)
            setFormError(null)
            setFormState(getDefaultForm())
          }
        }}
      >
        <DialogContent className="dashboard-glass-panel max-h-[92vh] max-w-2xl overflow-y-auto rounded-lg border-[var(--dash-border-subtle)] text-[var(--dash-text)]">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-[var(--dash-text)]">
              <Percent className="h-5 w-5 text-[var(--dash-brand-strong)]" />
              {editingTaxRate ? t.edit : t.create}
            </DialogTitle>
            <DialogDescription className="text-[var(--dash-text-soft)]">
              {t.formDescription}
            </DialogDescription>
          </DialogHeader>

          <form
            className="space-y-4"
            onSubmit={(event) => {
              event.preventDefault()
              void submitForm()
            }}
          >
            <div className="grid gap-4 md:grid-cols-2">
              <Field label={t.fields.nameEn} required>
                <Input
                  value={formState.nameEn}
                  onChange={(event) => updateFormField("nameEn", event.target.value)}
                  placeholder={t.placeholders.nameEn}
                  className="dashboard-control h-11 rounded-lg"
                />
              </Field>
              <Field label={t.fields.nameFr}>
                <Input
                  value={formState.nameFr}
                  onChange={(event) => updateFormField("nameFr", event.target.value)}
                  placeholder={t.placeholders.nameFr}
                  className="dashboard-control h-11 rounded-lg"
                />
              </Field>
              <Field label={t.fields.rate} required>
                <Input
                  type="number"
                  min="0"
                  max="100"
                  step="0.001"
                  value={formState.rate}
                  onChange={(event) => updateFormField("rate", event.target.value)}
                  placeholder={t.placeholders.rate}
                  className="dashboard-control h-11 rounded-lg"
                />
              </Field>
              <Field label={t.fields.type}>
                <Select value={formState.type} onValueChange={(value) => updateFormField("type", value as TaxType)}>
                  <SelectTrigger className="dashboard-control h-11 rounded-lg">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent className="border-[var(--dash-border-subtle)] bg-[var(--dash-surface-raised)] text-[var(--dash-text)]">
                    {TAX_TYPES.map((type) => (
                      <SelectItem key={type} value={type}>{t.types[type]}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </Field>
            </div>

            <div className="flex items-center justify-between gap-3 rounded-lg border border-[var(--dash-border-subtle)] bg-[rgba(37,57,67,0.36)] p-3">
              <Label className="text-sm font-medium text-[var(--dash-text)]">{t.fields.isActive}</Label>
              <Switch checked={formState.isActive} onCheckedChange={(checked) => updateFormField("isActive", checked)} />
            </div>

            {formError ? (
              <div className="rounded-lg border border-[var(--dash-danger)] bg-[var(--dash-danger-soft)] px-4 py-3 text-sm font-medium text-[var(--dash-danger)]">
                {formError}
              </div>
            ) : null}

            <DialogFooter className="gap-2 pt-2">
              <Button
                type="button"
                variant="outline"
                onClick={() => setFormOpen(false)}
                disabled={isSaving}
                className="dashboard-button-secondary h-10 rounded-lg"
              >
                {t.cancel}
              </Button>
              <Button type="submit" disabled={isSaving} className="dashboard-button-primary h-10 rounded-lg">
                {isSaving ? (
                  <>
                    <Loader2 className="h-4 w-4 animate-spin" />
                    {editingTaxRate ? t.saving : t.creating}
                  </>
                ) : (
                  <>
                    <Plus className="h-4 w-4" />
                    {editingTaxRate ? t.edit : t.create}
                  </>
                )}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      <AlertDialog open={!!removeTarget} onOpenChange={(open) => !open && setRemoveTarget(null)}>
        <AlertDialogContent className="dashboard-glass-panel border-[var(--dash-border-subtle)] text-[var(--dash-text)]">
          <AlertDialogHeader>
            <AlertDialogTitle>{t.removeTitle}</AlertDialogTitle>
            <AlertDialogDescription className="text-[var(--dash-text-soft)]">
              {t.removeBody}
              {removeTarget ? ` ${removeTarget.nameEn} (${formatPercent(removeTarget.rateNumber, locale)})` : ""}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel className="dashboard-button-secondary rounded-lg">{t.cancel}</AlertDialogCancel>
            <AlertDialogAction
              className="rounded-lg bg-[var(--dash-danger)] text-white hover:bg-[var(--dash-danger)]/90"
              onClick={async (event) => {
                event.preventDefault()
                if (!removeTarget) return
                try {
                  await deleteMutation.mutateAsync(removeTarget.id)
                  setRemoveTarget(null)
                } catch {
                  // The mutation hook already surfaces provider notifications.
                }
              }}
            >
              {deleteMutation.isPending ? <Loader2 className="me-2 h-4 w-4 animate-spin" /> : null}
              {t.confirmRemove}
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
      className="flex min-w-0 items-center gap-2 text-left text-xs font-semibold text-[var(--dash-text-muted)] transition hover:text-[var(--dash-text)]"
    >
      {children}
    </button>
  )
}

function Field({
  label,
  required,
  children,
}: {
  label: string
  required?: boolean
  children: ReactNode
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

function SummaryTile({
  icon: Icon,
  label,
  value,
  locale,
  tone,
}: {
  icon: LucideIcon
  label: string
  value: number | string
  locale?: Locale
  tone: "brand" | "success" | "spruce" | "gold"
}) {
  return (
    <div className="rounded-lg border border-[var(--dash-border-subtle)] bg-[rgba(37,57,67,0.46)] p-3">
      <div className="mb-3 flex items-center justify-between gap-3">
        <span className={cn("flex h-8 w-8 items-center justify-center rounded-lg border", toneClass(tone))}>
          <Icon className="h-4 w-4" />
        </span>
      </div>
      <p className="text-xs text-[var(--dash-text-faint)]">{label}</p>
      <p className="mt-1 truncate text-xl font-semibold text-[var(--dash-text)]">
        {typeof value === "number" ? formatNumber(value, locale ?? "en") : value}
      </p>
    </div>
  )
}

function InlineMetric({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-lg border border-[var(--dash-border-subtle)] bg-[rgba(37,57,67,0.32)] p-2">
      <p className="text-[0.68rem] text-[var(--dash-text-faint)]">{label}</p>
      <p className="mt-1 font-semibold text-[var(--dash-text)]">{value}</p>
    </div>
  )
}
