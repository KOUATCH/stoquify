"use client"

import { useCallback, useEffect, useMemo, useState, type CSSProperties, type ReactNode } from "react"
import {
  type ColumnDef,
  type RowSelectionState,
  type SortingState,
  type VisibilityState,
  flexRender,
  getCoreRowModel,
  getPaginationRowModel,
  getSortedRowModel,
  useReactTable,
} from "@tanstack/react-table"
import {
  AlertCircle,
  Archive,
  ArrowDownUp,
  Boxes,
  Building2,
  CheckCircle2,
  ChevronDown,
  ChevronsUpDown,
  Copy,
  Download,
  Edit3,
  ExternalLink,
  Layers3,
  Loader2,
  Mail,
  MapPin,
  MoreHorizontal,
  Package,
  Phone,
  Plus,
  RefreshCw,
  Search,
  Settings2,
  ShieldAlert,
  SlidersHorizontal,
  Sparkles,
  Store,
  Terminal,
  Truck,
  UserRound,
  WalletCards,
  Warehouse,
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
import { Checkbox } from "@/components/ui/checkbox"
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
  DropdownMenuCheckboxItem,
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
import { Textarea } from "@/components/ui/textarea"
import type { LocationManagementInput, LocationManagementRow } from "@/actions/locations/location-management-actions"
import {
  useArchiveManagedLocation,
  useCreateManagedLocation,
  useLocationManagementData,
  useUpdateManagedLocation,
} from "@/hooks/useLocationManagement"

interface LocationsManagementDashboardProps {
  organizationId: string
  locale?: Locale
  initialAction?: "create"
  initialEditId?: string
}

type StatusFilter = "all" | "active" | "inactive"
type PolicyFilter = "all" | "default" | "approval" | "negative-stock"
type Density = "comfortable" | "compact"
type LocationType = LocationManagementRow["type"]

type LocationFormState = {
  name: string
  code: string
  type: LocationType
  address: string
  phone: string
  email: string
  managerId: string
  isActive: boolean
  isDefault: boolean
  allowNegativeStock: boolean
  requiresApproval: boolean
}

const DASHBOARD_SEGMENT = "dashboard"

const dashboardPath = (...segments: string[]) =>
  `/${[DASHBOARD_SEGMENT, ...segments].join("/")}`

const LOCATION_TYPES = [
  "WAREHOUSE",
  "STORE",
  "DISTRIBUTION_CENTER",
  "SUPPLIER",
  "CUSTOMER",
  "MANUFACTURING",
  "QUARANTINE",
  "DAMAGED",
  "TRANSIT",
  "VIRTUAL",
] as const satisfies readonly LocationType[]

const copy = {
  en: {
    eyebrow: "Location command center",
    title: "Locations dashboard",
    subtitle: "Operational control for warehouses, stores, terminals, stock policies, and movement-heavy sites.",
    tableTitle: "Location registry",
    tableSubtitle: "Search, filter, export, and review operational location records.",
    liveData: "Live Data",
    visibleRecords: "visible",
    configuredSites: "Configured sites",
    activeReady: "Ready for operations",
    inventoryValue: "Inventory value",
    openPOSActivity: "Open POS activity",
    receivingSite: "Receiving site",
    policyChecks: "Policy checks",
    devices: "Devices",
    cashPoints: "Cash points",
    typeMix: "Type mix",
    clearFilters: "Clear",
    search: "Search name, code, manager, address, email...",
    status: "Status",
    type: "Type",
    policy: "Policy",
    all: "All",
    active: "Active",
    inactive: "Inactive",
    default: "Default",
    approval: "Approval",
    negativeStock: "Negative stock",
    create: "Create location",
    edit: "Edit location",
    refresh: "Refresh",
    refreshing: "Refreshing",
    export: "Export",
    exportSelected: "Export selected",
    columns: "Columns",
    density: "Density",
    comfortable: "Comfortable",
    compact: "Compact",
    actions: "Actions",
    viewDetails: "View details",
    copyId: "Copy ID",
    archive: "Archive",
    openInventory: "Inventory",
    openMovements: "Movements",
    openTransfers: "Transfers",
    openPOS: "POS",
    openCash: "Cash drawer",
    loadingTitle: "Loading locations",
    loadingBody: "Collecting location metrics and operational counters.",
    errorTitle: "Locations unavailable",
    editMissingTitle: "Location not found",
    editMissingBody: "The requested location could not be opened for editing.",
    retry: "Try again",
    emptyTitle: "No locations found",
    emptyBody: "Create a location to start routing stock, sales, and POS activity.",
    rows: "rows",
    page: "Page",
    of: "of",
    previous: "Previous",
    next: "Next",
    selected: "selected",
    totalLocations: "Total locations",
    activeLocations: "Active",
    stockValue: "Stock value",
    activeSessions: "Active sessions",
    defaultLocation: "Default location",
    approvalLocations: "Approval required",
    posTerminals: "POS terminals",
    cashDrawers: "Cash drawers",
    stockOnHand: "Stock on hand",
    available: "Available",
    reserved: "Reserved",
    noManager: "No manager",
    noDefault: "No default",
    noData: "No data",
    copiedTitle: "Location ID copied",
    copiedBody: "The location identifier is ready to paste.",
    copyFailedTitle: "Copy failed",
    copyFailedBody: "The browser could not copy this identifier.",
    exportTitle: "Locations exported",
    exportBody: "The current location view was exported as CSV.",
    requiredTitle: "Location name required",
    requiredBody: "Enter a location name before saving.",
    archiveTitle: "Archive location",
    archiveBody: "This removes the location from active management when it has no operational history.",
    confirmArchive: "Archive location",
    cancel: "Cancel",
    saving: "Saving",
    creating: "Creating",
    formDescription: "Location identity, contact, manager, and operating policies.",
    selectAll: "Select all locations",
    selectRow: "Select location",
    sku: "SKU",
    inventoryTx: "Inventory Tx",
    salesOrdersShort: "SO",
    purchaseOrdersShort: "PO",
    incomingShort: "In",
    outgoingShort: "Out",
    fields: {
      name: "Location name",
      code: "Code",
      type: "Type",
      manager: "Manager",
      address: "Address",
      phone: "Phone",
      email: "Email",
      isActive: "Active",
      isDefault: "Default receiving location",
      allowNegativeStock: "Allow negative stock",
      requiresApproval: "Requires approval",
    },
    placeholders: {
      name: "Central Warehouse",
      code: "CENTRAL-WH",
      address: "Street, city, postal code",
      phone: "+237 600 000 000",
      email: "warehouse@company.com",
    },
    tableColumns: {
      location: "Location",
      typePolicy: "Type and policy",
      stock: "Stock",
      operations: "Operations",
      contact: "Contact",
      activity: "Activity",
      status: "Status",
      actions: "Actions",
    },
    types: {
      WAREHOUSE: "Warehouse",
      STORE: "Store",
      DISTRIBUTION_CENTER: "Distribution center",
      SUPPLIER: "Supplier",
      CUSTOMER: "Customer",
      MANUFACTURING: "Manufacturing",
      QUARANTINE: "Quarantine",
      DAMAGED: "Damaged",
      TRANSIT: "Transit",
      VIRTUAL: "Virtual",
    },
  },
  fr: {
    eyebrow: "Centre de commande lieux",
    title: "Tableau des lieux",
    subtitle: "Pilotage des entrepots, boutiques, terminaux, politiques de stock et sites a forte activite.",
    tableTitle: "Registre des lieux",
    tableSubtitle: "Rechercher, filtrer, exporter et revoir les lieux operationnels.",
    liveData: "Donnees live",
    visibleRecords: "visibles",
    configuredSites: "Sites configures",
    activeReady: "Prets pour operations",
    inventoryValue: "Valeur inventaire",
    openPOSActivity: "Activite POS ouverte",
    receivingSite: "Site de reception",
    policyChecks: "Controles politique",
    devices: "Equipements",
    cashPoints: "Points caisse",
    typeMix: "Mix types",
    clearFilters: "Effacer",
    search: "Rechercher nom, code, manager, adresse, email...",
    status: "Statut",
    type: "Type",
    policy: "Politique",
    all: "Tous",
    active: "Actif",
    inactive: "Inactif",
    default: "Par defaut",
    approval: "Approbation",
    negativeStock: "Stock negatif",
    create: "Creer un lieu",
    edit: "Modifier le lieu",
    refresh: "Actualiser",
    refreshing: "Actualisation",
    export: "Exporter",
    exportSelected: "Exporter selection",
    columns: "Colonnes",
    density: "Densite",
    comfortable: "Confort",
    compact: "Compact",
    actions: "Actions",
    viewDetails: "Voir details",
    copyId: "Copier ID",
    archive: "Archiver",
    openInventory: "Inventaire",
    openMovements: "Mouvements",
    openTransfers: "Transferts",
    openPOS: "POS",
    openCash: "Caisse",
    loadingTitle: "Chargement des lieux",
    loadingBody: "Collecte des indicateurs et compteurs operationnels.",
    errorTitle: "Lieux indisponibles",
    editMissingTitle: "Lieu introuvable",
    editMissingBody: "Le lieu demande n'a pas pu etre ouvert pour modification.",
    retry: "Reessayer",
    emptyTitle: "Aucun lieu trouve",
    emptyBody: "Creez un lieu pour router le stock, les ventes et l'activite POS.",
    rows: "lignes",
    page: "Page",
    of: "sur",
    previous: "Retour",
    next: "Suivant",
    selected: "selection",
    totalLocations: "Total lieux",
    activeLocations: "Actifs",
    stockValue: "Valeur stock",
    activeSessions: "Sessions actives",
    defaultLocation: "Lieu par defaut",
    approvalLocations: "Approbation requise",
    posTerminals: "Terminaux POS",
    cashDrawers: "Caisses",
    stockOnHand: "Stock physique",
    available: "Disponible",
    reserved: "Reserve",
    noManager: "Aucun manager",
    noDefault: "Aucun par defaut",
    noData: "Aucune donnee",
    copiedTitle: "ID lieu copie",
    copiedBody: "L'identifiant du lieu est pret a coller.",
    copyFailedTitle: "Copie echouee",
    copyFailedBody: "Le navigateur n'a pas pu copier cet identifiant.",
    exportTitle: "Lieux exportes",
    exportBody: "La vue actuelle des lieux a ete exportee en CSV.",
    requiredTitle: "Nom du lieu requis",
    requiredBody: "Saisissez un nom de lieu avant l'enregistrement.",
    archiveTitle: "Archiver le lieu",
    archiveBody: "Retire le lieu de la gestion active s'il n'a pas d'historique operationnel.",
    confirmArchive: "Archiver le lieu",
    cancel: "Annuler",
    saving: "Enregistrement",
    creating: "Creation",
    formDescription: "Identite, contact, manager et politiques operationnelles du lieu.",
    selectAll: "Selectionner tous les lieux",
    selectRow: "Selectionner le lieu",
    sku: "SKU",
    inventoryTx: "Tx inventaire",
    salesOrdersShort: "CV",
    purchaseOrdersShort: "CA",
    incomingShort: "Entree",
    outgoingShort: "Sortie",
    fields: {
      name: "Nom du lieu",
      code: "Code",
      type: "Type",
      manager: "Manager",
      address: "Adresse",
      phone: "Telephone",
      email: "Email",
      isActive: "Actif",
      isDefault: "Lieu de reception par defaut",
      allowNegativeStock: "Autoriser stock negatif",
      requiresApproval: "Approbation requise",
    },
    placeholders: {
      name: "Entrepot central",
      code: "ENTREPOT-CENTRAL",
      address: "Rue, ville, code postal",
      phone: "+237 600 000 000",
      email: "entrepot@entreprise.com",
    },
    tableColumns: {
      location: "Lieu",
      typePolicy: "Type et politique",
      stock: "Stock",
      operations: "Operations",
      contact: "Contact",
      activity: "Activite",
      status: "Statut",
      actions: "Actions",
    },
    types: {
      WAREHOUSE: "Entrepot",
      STORE: "Boutique",
      DISTRIBUTION_CENTER: "Centre distribution",
      SUPPLIER: "Fournisseur",
      CUSTOMER: "Client",
      MANUFACTURING: "Fabrication",
      QUARANTINE: "Quarantaine",
      DAMAGED: "Endommage",
      TRANSIT: "Transit",
      VIRTUAL: "Virtuel",
    },
  },
} as const

const typeMeta: Record<LocationType, { icon: LucideIcon; tone: "brand" | "spruce" | "gold" | "danger" | "success" }> = {
  WAREHOUSE: { icon: Warehouse, tone: "brand" },
  STORE: { icon: Store, tone: "success" },
  DISTRIBUTION_CENTER: { icon: Truck, tone: "spruce" },
  SUPPLIER: { icon: Truck, tone: "gold" },
  CUSTOMER: { icon: UserRound, tone: "brand" },
  MANUFACTURING: { icon: Building2, tone: "spruce" },
  QUARANTINE: { icon: ShieldAlert, tone: "gold" },
  DAMAGED: { icon: Archive, tone: "danger" },
  TRANSIT: { icon: ArrowDownUp, tone: "spruce" },
  VIRTUAL: { icon: Layers3, tone: "brand" },
}

function getDefaultForm(): LocationFormState {
  return {
    name: "",
    code: "",
    type: "WAREHOUSE",
    address: "",
    phone: "",
    email: "",
    managerId: "none",
    isActive: true,
    isDefault: false,
    allowNegativeStock: false,
    requiresApproval: true,
  }
}

function formFromLocation(location: LocationManagementRow): LocationFormState {
  return {
    name: location.name,
    code: location.code,
    type: location.type,
    address: location.address ?? "",
    phone: location.phone ?? "",
    email: location.email ?? "",
    managerId: location.managerId ?? "none",
    isActive: location.isActive,
    isDefault: location.isDefault,
    allowNegativeStock: location.allowNegativeStock,
    requiresApproval: location.requiresApproval,
  }
}

function formatNumber(value: number, locale: Locale) {
  return new Intl.NumberFormat(locale === "fr" ? "fr-FR" : "en-US", {
    maximumFractionDigits: 1,
  }).format(value)
}

function formatCurrency(value: number, locale: Locale) {
  return new Intl.NumberFormat(locale === "fr" ? "fr-FR" : "en-US", {
    style: "currency",
    currency: "XAF",
    maximumFractionDigits: 0,
  }).format(value)
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

function SortIcon({ sorted }: { sorted: false | "asc" | "desc" }) {
  return (
    <ChevronsUpDown
      className={cn("h-3.5 w-3.5", sorted ? "text-[var(--dash-brand-strong)]" : "text-[var(--dash-text-faint)]")}
    />
  )
}

function toneClass(tone: "brand" | "spruce" | "gold" | "danger" | "success") {
  return {
    brand: "bg-[var(--dash-brand-soft)] text-[var(--dash-brand-strong)] border-[var(--dash-brand)]",
    spruce: "bg-[var(--dash-spruce-soft)] text-[var(--dash-spruce)] border-[var(--dash-spruce)]",
    gold: "bg-[var(--dash-gold-soft)] text-[var(--dash-gold)] border-[var(--dash-gold)]",
    danger: "bg-[var(--dash-danger-soft)] text-[var(--dash-danger)] border-[var(--dash-danger)]",
    success: "bg-[var(--dash-success-soft)] text-[var(--dash-success)] border-[var(--dash-success)]",
  }[tone]
}

export default function LocationsManagementDashboard({
  organizationId,
  locale = "en",
  initialAction,
  initialEditId,
}: LocationsManagementDashboardProps) {
  const t = copy[locale]
  const notifications = useNotifications()
  const [search, setSearch] = useState("")
  const [typeFilter, setTypeFilter] = useState<LocationType | "all">("all")
  const [statusFilter, setStatusFilter] = useState<StatusFilter>("all")
  const [policyFilter, setPolicyFilter] = useState<PolicyFilter>("all")
  const [density, setDensity] = useState<Density>("comfortable")
  const [sorting, setSorting] = useState<SortingState>([])
  const [columnVisibility, setColumnVisibility] = useState<VisibilityState>({})
  const [rowSelection, setRowSelection] = useState<RowSelectionState>({})
  const [formOpen, setFormOpen] = useState(false)
  const [editingLocation, setEditingLocation] = useState<LocationManagementRow | null>(null)
  const [archiveTarget, setArchiveTarget] = useState<LocationManagementRow | null>(null)
  const [formError, setFormError] = useState<string | null>(null)
  const [formState, setFormState] = useState<LocationFormState>(() => getDefaultForm())
  const [initialRequestHandled, setInitialRequestHandled] = useState(false)

  const {
    data,
    isLoading,
    isFetching,
    isError,
    error,
    refetch,
  } = useLocationManagementData(organizationId)
  const createMutation = useCreateManagedLocation(organizationId, locale)
  const updateMutation = useUpdateManagedLocation(organizationId, locale)
  const archiveMutation = useArchiveManagedLocation(organizationId, locale)

  const locations = useMemo(() => data?.locations ?? [], [data?.locations])
  const managers = useMemo(() => data?.managers ?? [], [data?.managers])
  const isSaving = createMutation.isPending || updateMutation.isPending

  const filteredLocations = useMemo(() => {
    const query = search.trim().toLowerCase()

    return locations.filter((location) => {
      if (typeFilter !== "all" && location.type !== typeFilter) return false
      if (statusFilter === "active" && !location.isActive) return false
      if (statusFilter === "inactive" && location.isActive) return false
      if (policyFilter === "default" && !location.isDefault) return false
      if (policyFilter === "approval" && !location.requiresApproval) return false
      if (policyFilter === "negative-stock" && !location.allowNegativeStock) return false

      if (!query) return true

      return [
        location.name,
        location.code,
        location.type,
        location.address,
        location.phone,
        location.email,
        location.managerName,
        location.managerEmail,
      ]
        .filter(Boolean)
        .join(" ")
        .toLowerCase()
        .includes(query)
    })
  }, [locations, policyFilter, search, statusFilter, typeFilter])

  const summary = useMemo(() => {
    const activeLocations = locations.filter((location) => location.isActive).length
    const defaultLocation = locations.find((location) => location.isDefault)?.name
    const stockValue = locations.reduce((sum, location) => sum + location.totalStockValue, 0)
    const activeSessions = locations.reduce((sum, location) => sum + location.activeSessionsCount, 0)
    const approvalLocations = locations.filter((location) => location.requiresApproval).length
    const posTerminals = locations.reduce((sum, location) => sum + location.posTerminalsCount, 0)
    const cashDrawers = locations.reduce((sum, location) => sum + location.cashDrawersCount, 0)
    const stockOnHand = locations.reduce((sum, location) => sum + location.totalStockOnHand, 0)
    const typeCounts = LOCATION_TYPES.map((type) => ({
      type,
      count: locations.filter((location) => location.type === type).length,
    })).filter((item) => item.count > 0)

    return {
      activeLocations,
      defaultLocation,
      stockValue,
      activeSessions,
      approvalLocations,
      posTerminals,
      cashDrawers,
      stockOnHand,
      typeCounts,
    }
  }, [locations])

  const statCards = useMemo(
    () => [
      {
        label: t.totalLocations,
        value: formatNumber(locations.length, locale),
        detail: `${formatNumber(filteredLocations.length, locale)} ${t.visibleRecords}`,
        Icon: MapPin,
        accent: "var(--dash-brand)",
        soft: "var(--dash-brand-soft)",
      },
      {
        label: t.activeLocations,
        value: formatNumber(summary.activeLocations, locale),
        detail: t.activeReady,
        Icon: CheckCircle2,
        accent: "var(--dash-success)",
        soft: "var(--dash-success-soft)",
      },
      {
        label: t.stockValue,
        value: formatCurrency(summary.stockValue, locale),
        detail: t.inventoryValue,
        Icon: Package,
        accent: "var(--dash-gold)",
        soft: "var(--dash-gold-soft)",
        valueClassName: "text-lg sm:text-xl",
      },
      {
        label: t.activeSessions,
        value: formatNumber(summary.activeSessions, locale),
        detail: t.openPOSActivity,
        Icon: Store,
        accent: "var(--dash-spruce)",
        soft: "var(--dash-spruce-soft)",
      },
      {
        label: t.defaultLocation,
        value: summary.defaultLocation || t.noDefault,
        detail: t.receivingSite,
        Icon: Warehouse,
        accent: "var(--dash-brand)",
        soft: "var(--dash-brand-soft)",
        valueClassName: "text-base sm:text-lg",
      },
      {
        label: t.approvalLocations,
        value: formatNumber(summary.approvalLocations, locale),
        detail: t.policyChecks,
        Icon: ShieldAlert,
        accent: "var(--dash-warning)",
        soft: "var(--dash-warning-soft)",
      },
      {
        label: t.posTerminals,
        value: formatNumber(summary.posTerminals, locale),
        detail: t.devices,
        Icon: Terminal,
        accent: "var(--dash-info)",
        soft: "var(--dash-info-soft)",
      },
      {
        label: t.cashDrawers,
        value: formatNumber(summary.cashDrawers, locale),
        detail: t.cashPoints,
        Icon: WalletCards,
        accent: "var(--dash-spruce)",
        soft: "var(--dash-spruce-soft)",
      },
    ],
    [filteredLocations.length, locale, locations.length, summary, t],
  )

  const hasActiveFilters =
    search.trim().length > 0 ||
    typeFilter !== "all" ||
    statusFilter !== "all" ||
    policyFilter !== "all"

  const clearFilters = useCallback(() => {
    setSearch("")
    setTypeFilter("all")
    setStatusFilter("all")
    setPolicyFilter("all")
  }, [])

  const openCreate = useCallback(() => {
    setEditingLocation(null)
    setFormError(null)
    setFormState(getDefaultForm())
    setFormOpen(true)
  }, [])

  const openEdit = useCallback((location: LocationManagementRow) => {
    setEditingLocation(location)
    setFormError(null)
    setFormState(formFromLocation(location))
    setFormOpen(true)
  }, [])

  useEffect(() => {
    if (initialRequestHandled || isLoading) return

    if (initialAction === "create") {
      openCreate()
      setInitialRequestHandled(true)
      return
    }

    if (!initialEditId) return

    const location = locations.find((item) => item.id === initialEditId)

    if (location) {
      openEdit(location)
      setInitialRequestHandled(true)
      return
    }

    if (!isFetching) {
      notifications.error(t.editMissingTitle, t.editMissingBody)
      setInitialRequestHandled(true)
    }
  }, [
    initialAction,
    initialEditId,
    initialRequestHandled,
    isFetching,
    isLoading,
    locations,
    notifications,
    openCreate,
    openEdit,
    t.editMissingBody,
    t.editMissingTitle,
  ])

  const updateFormField = useCallback(<K extends keyof LocationFormState>(field: K, value: LocationFormState[K]) => {
    setFormState((current) => ({ ...current, [field]: value }))
  }, [])

  const submitForm = async () => {
    setFormError(null)

    if (!formState.name.trim()) {
      setFormError(t.requiredBody)
      notifications.warning(t.requiredTitle, t.requiredBody)
      return
    }

    const payload: LocationManagementInput = {
      name: formState.name,
      code: formState.code || undefined,
      type: formState.type,
      address: formState.address,
      phone: formState.phone,
      email: formState.email,
      managerId: formState.managerId === "none" ? null : formState.managerId,
      isActive: formState.isActive,
      isDefault: formState.isDefault,
      allowNegativeStock: formState.allowNegativeStock,
      requiresApproval: formState.requiresApproval,
    }

    try {
      if (editingLocation) {
        await updateMutation.mutateAsync({ id: editingLocation.id, data: payload })
      } else {
        await createMutation.mutateAsync(payload)
      }

      setFormOpen(false)
      setEditingLocation(null)
      setFormError(null)
      setFormState(getDefaultForm())
    } catch (error) {
      setFormError(error instanceof Error ? error.message : t.requiredBody)
    }
  }

  const copyLocationId = useCallback(async (location: LocationManagementRow) => {
    try {
      await navigator.clipboard.writeText(location.id)
      notifications.success(t.copiedTitle, t.copiedBody)
    } catch {
      notifications.error(t.copyFailedTitle, t.copyFailedBody)
    }
  }, [notifications, t.copiedBody, t.copiedTitle, t.copyFailedBody, t.copyFailedTitle])

  const exportRows = useCallback((rows: LocationManagementRow[]) => {
    const headers = [
      "id",
      "name",
      "code",
      "type",
      "address",
      "phone",
      "email",
      "manager",
      "isActive",
      "isDefault",
      "allowNegativeStock",
      "requiresApproval",
      "inventoryItemsCount",
      "totalStockOnHand",
      "totalStockAvailable",
      "totalStockValue",
      "posTerminalsCount",
      "cashDrawersCount",
      "activeSessionsCount",
      "salesOrdersCount",
      "purchaseOrdersCount",
      "updatedAt",
    ]

    const csv = [
      headers.map(escapeCsv).join(","),
      ...rows.map((row) =>
        [
          row.id,
          row.name,
          row.code,
          row.type,
          row.address,
          row.phone,
          row.email,
          row.managerName,
          row.isActive,
          row.isDefault,
          row.allowNegativeStock,
          row.requiresApproval,
          row.inventoryItemsCount,
          row.totalStockOnHand,
          row.totalStockAvailable,
          row.totalStockValue,
          row.posTerminalsCount,
          row.cashDrawersCount,
          row.activeSessionsCount,
          row.salesOrdersCount,
          row.purchaseOrdersCount,
          row.updatedAt instanceof Date ? row.updatedAt.toISOString() : row.updatedAt,
        ].map(escapeCsv).join(","),
      ),
    ].join("\n")

    const blob = new Blob([csv], { type: "text/csv;charset=utf-8" })
    const url = URL.createObjectURL(blob)
    const anchor = document.createElement("a")
    anchor.href = url
    anchor.download = `locations-${new Date().toISOString().slice(0, 10)}.csv`
    anchor.click()
    URL.revokeObjectURL(url)
    notifications.success(t.exportTitle, t.exportBody)
  }, [notifications, t.exportBody, t.exportTitle])

  const columns = useMemo<ColumnDef<LocationManagementRow>[]>(() => [
    {
      id: "select",
      header: ({ table }) => (
        <Checkbox
          checked={table.getIsAllPageRowsSelected()}
          onCheckedChange={(value) => table.toggleAllPageRowsSelected(!!value)}
          aria-label={t.selectAll}
        />
      ),
      cell: ({ row }) => (
        <Checkbox
          checked={row.getIsSelected()}
          onCheckedChange={(value) => row.toggleSelected(!!value)}
          aria-label={t.selectRow}
          onClick={(event) => event.stopPropagation()}
        />
      ),
      enableSorting: false,
      enableHiding: false,
    },
    {
      accessorKey: "name",
      header: ({ column }) => (
        <HeaderButton onClick={() => column.toggleSorting(column.getIsSorted() === "asc")}>
          {t.tableColumns.location}
          <SortIcon sorted={column.getIsSorted()} />
        </HeaderButton>
      ),
      cell: ({ row }) => {
        const location = row.original
        const meta = typeMeta[location.type]
        const Icon = meta.icon

        return (
          <div className="flex min-w-[17rem] items-start gap-3">
            <div className={cn("flex h-10 w-10 shrink-0 items-center justify-center rounded-lg border", toneClass(meta.tone))}>
              <Icon className="h-5 w-5" />
            </div>
            <div className="min-w-0">
              <div className="flex flex-wrap items-center gap-2">
                <p className="truncate font-semibold text-[var(--dash-text)]">{location.name}</p>
                {location.isDefault ? (
                  <Badge variant="outline" className="rounded-lg border-[var(--dash-gold)] bg-[var(--dash-gold-soft)] text-[var(--dash-gold)]">
                    {t.default}
                  </Badge>
                ) : null}
              </div>
              <p className="mt-1 font-mono text-xs text-[var(--dash-text-faint)]">{location.code}</p>
              <p className="mt-2 line-clamp-2 text-xs leading-5 text-[var(--dash-text-soft)]">
                {location.address || t.noData}
              </p>
            </div>
          </div>
        )
      },
    },
    {
      accessorKey: "type",
      header: ({ column }) => (
        <HeaderButton onClick={() => column.toggleSorting(column.getIsSorted() === "asc")}>
          {t.tableColumns.typePolicy}
          <SortIcon sorted={column.getIsSorted()} />
        </HeaderButton>
      ),
      cell: ({ row }) => {
        const location = row.original
        const meta = typeMeta[location.type]

        return (
          <div className="min-w-[13rem] space-y-2">
            <Badge variant="outline" className={cn("rounded-lg", toneClass(meta.tone))}>
              {t.types[location.type]}
            </Badge>
            <div className="flex flex-wrap gap-1.5">
              {location.requiresApproval ? <PolicyBadge label={t.approval} tone="gold" icon={ShieldAlert} /> : null}
              {location.allowNegativeStock ? <PolicyBadge label={t.negativeStock} tone="danger" icon={AlertCircle} /> : null}
              {!location.requiresApproval && !location.allowNegativeStock ? (
                <span className="text-xs text-[var(--dash-text-faint)]">{t.noData}</span>
              ) : null}
            </div>
          </div>
        )
      },
    },
    {
      id: "stock",
      accessorFn: (row) => row.totalStockValue,
      header: ({ column }) => (
        <HeaderButton onClick={() => column.toggleSorting(column.getIsSorted() === "asc")}>
          {t.tableColumns.stock}
          <SortIcon sorted={column.getIsSorted()} />
        </HeaderButton>
      ),
      cell: ({ row }) => {
        const location = row.original

        return (
          <div className="min-w-[12rem] space-y-2">
            <p className="font-semibold text-[var(--dash-text)]">{formatCurrency(location.totalStockValue, locale)}</p>
            <div className="grid grid-cols-2 gap-2">
              <InlineMetric label={t.available} value={formatNumber(location.totalStockAvailable, locale)} />
              <InlineMetric label={t.reserved} value={formatNumber(location.totalStockReserved, locale)} />
            </div>
            <p className="text-xs text-[var(--dash-text-faint)]">
              {formatNumber(location.inventoryItemsCount, locale)} {t.sku}
            </p>
          </div>
        )
      },
    },
    {
      id: "operations",
      accessorFn: (row) => row.posTerminalsCount + row.cashDrawersCount + row.activeSessionsCount,
      header: ({ column }) => (
        <HeaderButton onClick={() => column.toggleSorting(column.getIsSorted() === "asc")}>
          {t.tableColumns.operations}
          <SortIcon sorted={column.getIsSorted()} />
        </HeaderButton>
      ),
      cell: ({ row }) => {
        const location = row.original

        return (
          <div className="min-w-[16rem] space-y-2">
            <div className="grid grid-cols-3 gap-2">
              <CountPill icon={Terminal} label="POS" value={location.posTerminalsCount} locale={locale} />
              <CountPill icon={WalletCards} label={t.cashDrawers} value={location.cashDrawersCount} locale={locale} />
              <CountPill icon={Store} label={t.activeSessions} value={location.activeSessionsCount} locale={locale} />
            </div>
            <div className="flex flex-wrap gap-1.5">
              <MiniBadge label={t.inventoryTx} value={location.inventoryTransactionsCount} locale={locale} />
              <MiniBadge label={t.salesOrdersShort} value={location.salesOrdersCount} locale={locale} />
              <MiniBadge label={t.purchaseOrdersShort} value={location.purchaseOrdersCount} locale={locale} />
              <MiniBadge label={t.incomingShort} value={location.stockTransfersInCount} locale={locale} />
              <MiniBadge label={t.outgoingShort} value={location.stockTransfersOutCount} locale={locale} />
            </div>
            <p className="text-xs text-[var(--dash-text-soft)]">
              {formatDate(location.updatedAt, locale, t.noData)}
            </p>
          </div>
        )
      },
    },
    {
      id: "contact",
      accessorFn: (row) => row.managerName ?? row.email ?? "",
      header: t.tableColumns.contact,
      cell: ({ row }) => {
        const location = row.original

        return (
          <div className="min-w-[13rem] space-y-2 text-xs">
            <ContactLine icon={UserRound} value={location.managerName || t.noManager} strong />
            <ContactLine icon={Mail} value={location.email || location.managerEmail || t.noData} />
            <ContactLine icon={Phone} value={location.phone || t.noData} />
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
        const active = row.original.isActive
        const Icon = active ? CheckCircle2 : XCircle

        return (
          <Badge
            variant="outline"
            className={cn(
              "rounded-lg",
              active
                ? "border-[var(--dash-success)] bg-[var(--dash-success-soft)] text-[var(--dash-success)]"
                : "border-[var(--dash-danger)] bg-[var(--dash-danger-soft)] text-[var(--dash-danger)]",
            )}
          >
            <Icon className="me-1 h-3.5 w-3.5" />
            {active ? t.active : t.inactive}
          </Badge>
        )
      },
    },
    {
      id: "actions",
      enableHiding: false,
      enableSorting: false,
      header: t.tableColumns.actions,
      cell: ({ row }) => {
        const location = row.original

        return (
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" size="icon" className="h-9 w-9 rounded-lg text-[var(--dash-text-soft)] hover:bg-[var(--dash-brand-soft)] hover:text-[var(--dash-brand-strong)]">
                <MoreHorizontal className="h-4 w-4" />
                <span className="sr-only">{t.actions}</span>
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-56 border-[var(--dash-border-subtle)] bg-[var(--dash-surface-raised)] text-[var(--dash-text)]">
              <DropdownMenuLabel>{t.actions}</DropdownMenuLabel>
              <DropdownMenuSeparator />
              <DropdownMenuItem asChild>
                <Link href={dashboardPath("settings", "locations", location.id)} locale={locale}>
                  <MapPin className="h-4 w-4" />
                  {t.viewDetails}
                  <ExternalLink className="ms-auto h-3 w-3" />
                </Link>
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => openEdit(location)}>
                <Edit3 className="h-4 w-4" />
                {t.edit}
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => copyLocationId(location)}>
                <Copy className="h-4 w-4" />
                {t.copyId}
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuItem asChild>
                <Link href={dashboardPath("inventory", "items")} locale={locale}>
                  <Boxes className="h-4 w-4" />
                  {t.openInventory}
                  <ExternalLink className="ms-auto h-3 w-3" />
                </Link>
              </DropdownMenuItem>
              <DropdownMenuItem asChild>
                <Link href={dashboardPath("inventory", "movements")} locale={locale}>
                  <ArrowDownUp className="h-4 w-4" />
                  {t.openMovements}
                  <ExternalLink className="ms-auto h-3 w-3" />
                </Link>
              </DropdownMenuItem>
              <DropdownMenuItem asChild>
                <Link href={dashboardPath("inventory", "transfers")} locale={locale}>
                  <Truck className="h-4 w-4" />
                  {t.openTransfers}
                  <ExternalLink className="ms-auto h-3 w-3" />
                </Link>
              </DropdownMenuItem>
              <DropdownMenuItem asChild>
                <Link href={dashboardPath("pos")} locale={locale}>
                  <Terminal className="h-4 w-4" />
                  {t.openPOS}
                  <ExternalLink className="ms-auto h-3 w-3" />
                </Link>
              </DropdownMenuItem>
              <DropdownMenuItem asChild>
                <Link href={dashboardPath("cashDrawer")} locale={locale}>
                  <WalletCards className="h-4 w-4" />
                  {t.openCash}
                  <ExternalLink className="ms-auto h-3 w-3" />
                </Link>
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuItem
                onClick={() => setArchiveTarget(location)}
                className="text-[var(--dash-danger)] focus:text-[var(--dash-danger)]"
              >
                <Archive className="h-4 w-4" />
                {t.archive}
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        )
      },
    },
  ], [copyLocationId, locale, openEdit, t])

  const table = useReactTable({
    data: filteredLocations,
    columns,
    state: {
      sorting,
      columnVisibility,
      rowSelection,
    },
    enableRowSelection: true,
    onSortingChange: setSorting,
    onColumnVisibilityChange: setColumnVisibility,
    onRowSelectionChange: setRowSelection,
    getCoreRowModel: getCoreRowModel(),
    getSortedRowModel: getSortedRowModel(),
    getPaginationRowModel: getPaginationRowModel(),
    initialState: {
      pagination: {
        pageSize: 10,
      },
    },
  })

  const selectedRows = table.getSelectedRowModel().rows.map((row) => row.original)
  const tableRows = table.getFilteredRowModel().rows.map((row) => row.original)
  const rowPadding = density === "compact" ? "px-3 py-2" : "px-4 py-4"

  if (isLoading) {
    return (
      <section className="dashboard-glass-panel rounded-lg p-6 text-[var(--dash-text)]">
        <div className="flex min-h-72 flex-col items-center justify-center gap-4 text-center">
          <Loader2 className="h-8 w-8 animate-spin text-[var(--dash-brand-strong)]" />
          <div>
            <h2 className="text-lg font-semibold">{t.loadingTitle}</h2>
            <p className="mt-1 text-sm text-[var(--dash-text-soft)]">{t.loadingBody}</p>
          </div>
        </div>
      </section>
    )
  }

  if (isError) {
    return (
      <section className="dashboard-glass-panel rounded-lg p-6 text-[var(--dash-text)]">
        <div className="flex min-h-72 flex-col items-center justify-center gap-4 text-center">
          <div className="flex h-12 w-12 items-center justify-center rounded-lg bg-[var(--dash-danger-soft)] text-[var(--dash-danger)]">
            <AlertCircle className="h-6 w-6" />
          </div>
          <div>
            <h2 className="text-lg font-semibold">{t.errorTitle}</h2>
            <p className="mt-1 text-sm text-[var(--dash-text-soft)]">{error?.message}</p>
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
      <section className="dashboard-glass-panel overflow-hidden rounded-lg text-[var(--dash-text)]">
        <div className="border-b border-[var(--dash-border-subtle)] bg-[rgba(12,20,24,0.58)] px-5 py-4 sm:px-6">
          <div className="flex min-w-0 flex-col gap-5 xl:flex-row xl:items-center xl:justify-between">
            <div className="min-w-0">
              <div className="dashboard-eyebrow mb-4">
                <span className="dashboard-live-dot" />
                {t.eyebrow}
              </div>
              <div className="flex min-w-0 items-start gap-4">
                <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-lg border border-[var(--dash-border-subtle)] bg-[var(--dash-brand-soft)] shadow-[0_16px_34px_rgba(47,125,246,0.18)]">
                  <MapPin className="h-6 w-6 text-[var(--dash-brand-strong)]" />
                </div>
                <div className="min-w-0">
                  <h2 className="text-2xl font-semibold tracking-tight text-[var(--dash-text)] sm:text-3xl">
                    {t.title}
                  </h2>
                  <p className="mt-2 max-w-3xl text-sm leading-6 text-[var(--dash-text-soft)]">
                    {t.subtitle}
                  </p>
                </div>
              </div>
            </div>

            <div className="grid w-full grid-cols-2 gap-2 sm:w-auto sm:flex sm:flex-wrap sm:items-center sm:justify-end">
              <Badge variant="outline" className="dashboard-filter-chip h-9 justify-center rounded-lg">
                <Sparkles className="me-1 h-3.5 w-3.5 text-[var(--dash-spruce)]" />
                {t.liveData}
              </Badge>
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => refetch()}
                disabled={isFetching}
                className="dashboard-button-secondary h-9 justify-center rounded-lg"
              >
                <RefreshCw className={cn("h-4 w-4", isFetching && "animate-spin")} />
                {isFetching ? t.refreshing : t.refresh}
              </Button>
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => exportRows(selectedRows.length ? selectedRows : tableRows)}
                disabled={!tableRows.length}
                className="dashboard-button-secondary h-9 justify-center rounded-lg"
              >
                <Download className="h-4 w-4" />
                {selectedRows.length ? t.exportSelected : t.export}
              </Button>
              <Button type="button" size="sm" onClick={openCreate} className="dashboard-button-create h-9 justify-center rounded-lg">
                <Plus className="h-4 w-4" />
                {t.create}
              </Button>
            </div>
          </div>
        </div>

        <div className="space-y-5 p-5 sm:p-6">
          <div className="grid min-w-0 grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-4 2xl:grid-cols-8">
            {statCards.map(({ label, value, detail, Icon, accent, soft, valueClassName }) => (
              <LocationStatCard
                key={label}
                label={label}
                value={value}
                detail={detail}
                Icon={Icon}
                accent={accent}
                soft={soft}
                valueClassName={valueClassName}
              />
            ))}
          </div>

          <div className="rounded-lg border border-[var(--dash-border-subtle)] bg-[rgba(12,20,24,0.35)] px-4 py-3">
            <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
              <div className="flex min-w-0 items-center gap-3">
                <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-[var(--dash-spruce-soft)] text-[var(--dash-spruce)]">
                  <Warehouse className="h-5 w-5" />
                </div>
                <div className="min-w-0">
                  <h3 className="text-lg font-semibold text-[var(--dash-text)]">{t.tableTitle}</h3>
                  <p className="mt-1 break-words text-sm text-[var(--dash-text-soft)]">
                    {t.tableSubtitle} {formatNumber(filteredLocations.length, locale)} {t.of} {formatNumber(locations.length, locale)} {t.rows}.
                  </p>
                </div>
              </div>
              <div className="flex flex-wrap items-center gap-2 text-sm text-[var(--dash-text-soft)]">
                <span className="rounded-lg border border-[var(--dash-border-subtle)] bg-[rgba(37,57,67,0.58)] px-3 py-2">
                  {t.typeMix}: <span className="font-semibold text-[var(--dash-text)]">{formatNumber(summary.typeCounts.length, locale)}</span>
                </span>
              </div>
            </div>
          </div>

          <div className="space-y-4">
            <div className="rounded-lg border border-[var(--dash-border-subtle)] bg-[rgba(37,57,67,0.34)] p-4">
              <div className="grid gap-3 lg:grid-cols-2 xl:grid-cols-[minmax(18rem,1fr)_11rem_10rem_12rem_10rem_auto]">
                <div className="relative min-w-0">
                  <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-[var(--dash-text-faint)]" />
                  <Input
                    value={search}
                    onChange={(event) => setSearch(event.target.value)}
                    placeholder={t.search}
                    className="dashboard-control h-10 rounded-lg pl-10"
                  />
                </div>
                <Select value={typeFilter} onValueChange={(value) => setTypeFilter(value as LocationType | "all")}>
                  <SelectTrigger className="dashboard-control h-10 rounded-lg">
                    <SelectValue placeholder={t.type} />
                  </SelectTrigger>
                  <SelectContent className="border-[var(--dash-border-subtle)] bg-[var(--dash-surface-raised)] text-[var(--dash-text)]">
                    <SelectItem value="all">{t.all}</SelectItem>
                    {LOCATION_TYPES.map((type) => (
                      <SelectItem key={type} value={type}>{t.types[type]}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <Select value={statusFilter} onValueChange={(value) => setStatusFilter(value as StatusFilter)}>
                  <SelectTrigger className="dashboard-control h-10 rounded-lg">
                    <SelectValue placeholder={t.status} />
                  </SelectTrigger>
                  <SelectContent className="border-[var(--dash-border-subtle)] bg-[var(--dash-surface-raised)] text-[var(--dash-text)]">
                    <SelectItem value="all">{t.all}</SelectItem>
                    <SelectItem value="active">{t.active}</SelectItem>
                    <SelectItem value="inactive">{t.inactive}</SelectItem>
                  </SelectContent>
                </Select>
                <Select value={policyFilter} onValueChange={(value) => setPolicyFilter(value as PolicyFilter)}>
                  <SelectTrigger className="dashboard-control h-10 rounded-lg">
                    <SelectValue placeholder={t.policy} />
                  </SelectTrigger>
                  <SelectContent className="border-[var(--dash-border-subtle)] bg-[var(--dash-surface-raised)] text-[var(--dash-text)]">
                    <SelectItem value="all">{t.all}</SelectItem>
                    <SelectItem value="default">{t.default}</SelectItem>
                    <SelectItem value="approval">{t.approval}</SelectItem>
                    <SelectItem value="negative-stock">{t.negativeStock}</SelectItem>
                  </SelectContent>
                </Select>
                <Select value={density} onValueChange={(value) => setDensity(value as Density)}>
                  <SelectTrigger className="dashboard-control h-10 rounded-lg">
                    <Settings2 className="h-4 w-4" />
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent className="border-[var(--dash-border-subtle)] bg-[var(--dash-surface-raised)] text-[var(--dash-text)]">
                    <SelectItem value="comfortable">{t.comfortable}</SelectItem>
                    <SelectItem value="compact">{t.compact}</SelectItem>
                  </SelectContent>
                </Select>
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button type="button" variant="outline" className="dashboard-button-secondary h-10 justify-center rounded-lg">
                      <SlidersHorizontal className="h-4 w-4" />
                      {t.columns}
                      <ChevronDown className="h-4 w-4" />
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end" className="w-52 border-[var(--dash-border-subtle)] bg-[var(--dash-surface-raised)] text-[var(--dash-text)]">
                    <DropdownMenuLabel>{t.columns}</DropdownMenuLabel>
                    <DropdownMenuSeparator />
                    {table
                      .getAllColumns()
                      .filter((column) => column.getCanHide())
                      .map((column) => (
                        <DropdownMenuCheckboxItem
                          key={column.id}
                          checked={column.getIsVisible()}
                          onCheckedChange={(value) => column.toggleVisibility(!!value)}
                        >
                          {column.id}
                        </DropdownMenuCheckboxItem>
                      ))}
                  </DropdownMenuContent>
                </DropdownMenu>
              </div>

              {hasActiveFilters || selectedRows.length ? (
                <div className="mt-3 flex flex-wrap items-center gap-2">
                  {search.trim() ? (
                    <Badge variant="outline" className="dashboard-filter-chip rounded-lg">
                      {search.trim()}
                    </Badge>
                  ) : null}
                  {typeFilter !== "all" ? (
                    <Badge variant="outline" className="dashboard-filter-chip rounded-lg">
                      {t.types[typeFilter]}
                    </Badge>
                  ) : null}
                  {statusFilter !== "all" ? (
                    <Badge variant="outline" className="dashboard-filter-chip rounded-lg">
                      {statusFilter === "active" ? t.active : t.inactive}
                    </Badge>
                  ) : null}
                  {policyFilter !== "all" ? (
                    <Badge variant="outline" className="dashboard-filter-chip rounded-lg">
                      {policyFilter === "default" ? t.default : policyFilter === "approval" ? t.approval : t.negativeStock}
                    </Badge>
                  ) : null}
                  {selectedRows.length ? (
                    <Badge variant="outline" className="rounded-lg border-[var(--dash-brand)] bg-[var(--dash-brand-soft)] text-[var(--dash-brand-strong)]">
                      {formatNumber(selectedRows.length, locale)} {t.selected}
                    </Badge>
                  ) : null}
                  {hasActiveFilters ? (
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      onClick={clearFilters}
                      className="h-8 rounded-lg text-[var(--dash-text-soft)] hover:bg-[var(--dash-brand-soft)] hover:text-[var(--dash-brand-strong)]"
                    >
                      {t.clearFilters}
                    </Button>
                  ) : null}
                </div>
              ) : null}
            </div>

            <div className="grid gap-3 lg:grid-cols-[18rem_minmax(0,1fr)]">
              <div className="rounded-lg border border-[var(--dash-border-subtle)] bg-[rgba(37,57,67,0.34)] p-4">
                <div className="flex items-center justify-between gap-3">
                  <div>
                    <p className="text-sm font-semibold text-[var(--dash-text)]">{t.stockOnHand}</p>
                    <p className="mt-1 text-2xl font-semibold text-[var(--dash-text)]">{formatNumber(summary.stockOnHand, locale)}</p>
                  </div>
                  <div className="flex h-11 w-11 items-center justify-center rounded-lg bg-[var(--dash-spruce-soft)] text-[var(--dash-spruce)]">
                    <Package className="h-5 w-5" />
                  </div>
                </div>
              </div>

              <div className="rounded-lg border border-[var(--dash-border-subtle)] bg-[rgba(37,57,67,0.34)] p-4">
                <div className="mb-3 flex items-center justify-between gap-3">
                  <p className="text-sm font-semibold text-[var(--dash-text)]">{t.typeMix}</p>
                  <p className="text-xs text-[var(--dash-text-faint)]">{formatNumber(summary.typeCounts.length, locale)} {t.rows}</p>
                </div>
                <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-5">
                  {summary.typeCounts.length ? summary.typeCounts.slice(0, 5).map((item) => (
                    <TypeBar
                      key={item.type}
                      label={t.types[item.type]}
                      count={item.count}
                      total={locations.length}
                      locale={locale}
                    />
                  )) : (
                    <p className="text-sm text-[var(--dash-text-soft)]">{t.noData}</p>
                  )}
                </div>
              </div>
            </div>
          </div>

          <div className="dashboard-table-shell dashboard-data-table min-w-0 overflow-x-auto rounded-lg">
            <Table className="min-w-[82rem]">
              <TableHeader className="sticky top-0 z-10 bg-[rgba(16,27,32,0.94)] backdrop-blur">
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
                    <TableRow
                      key={row.id}
                      data-state={row.getIsSelected() && "selected"}
                      className="border-[var(--dash-border-subtle)] hover:bg-[var(--dash-brand-soft)]"
                    >
                      {row.getVisibleCells().map((cell) => (
                        <TableCell key={cell.id} className={cn(rowPadding, "align-top")}>
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
                          <MapPin className="h-6 w-6" />
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

          <div className="flex flex-col gap-3 text-sm text-[var(--dash-text-soft)] md:flex-row md:items-center md:justify-between">
            <div>
              {t.page} {table.getState().pagination.pageIndex + 1} {t.of} {Math.max(table.getPageCount(), 1)}
              <span className="ms-2">({formatNumber(filteredLocations.length, locale)} {t.rows})</span>
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
            setEditingLocation(null)
            setFormError(null)
            setFormState(getDefaultForm())
          }
        }}
      >
        <DialogContent className="dashboard-glass-panel max-h-[92vh] max-w-3xl overflow-y-auto rounded-lg border-[var(--dash-border-subtle)] text-[var(--dash-text)]">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-[var(--dash-text)]">
              <MapPin className="h-5 w-5 text-[var(--dash-brand-strong)]" />
              {editingLocation ? t.edit : t.create}
            </DialogTitle>
            <DialogDescription className="text-[var(--dash-text-soft)]">
              {t.formDescription}
            </DialogDescription>
          </DialogHeader>

          <form
            className="space-y-4"
            onSubmit={(event) => {
              event.preventDefault()
              submitForm()
            }}
          >
            <div className="grid gap-4 md:grid-cols-2">
              <Field label={t.fields.name} required>
                <Input
                  value={formState.name}
                  onChange={(event) => updateFormField("name", event.target.value)}
                  placeholder={t.placeholders.name}
                  className="dashboard-control h-11 rounded-lg"
                />
              </Field>
              <Field label={t.fields.code}>
                <Input
                  value={formState.code}
                  onChange={(event) => updateFormField("code", event.target.value)}
                  placeholder={t.placeholders.code}
                  className="dashboard-control h-11 rounded-lg font-mono"
                />
              </Field>
              <Field label={t.fields.type}>
                <Select value={formState.type} onValueChange={(value) => updateFormField("type", value as LocationType)}>
                  <SelectTrigger className="dashboard-control h-11 rounded-lg">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent className="border-[var(--dash-border-subtle)] bg-[var(--dash-surface-raised)] text-[var(--dash-text)]">
                    {LOCATION_TYPES.map((type) => (
                      <SelectItem key={type} value={type}>{t.types[type]}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </Field>
              <Field label={t.fields.manager}>
                <Select value={formState.managerId} onValueChange={(value) => updateFormField("managerId", value)}>
                  <SelectTrigger className="dashboard-control h-11 rounded-lg">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent className="border-[var(--dash-border-subtle)] bg-[var(--dash-surface-raised)] text-[var(--dash-text)]">
                    <SelectItem value="none">{t.noManager}</SelectItem>
                    {managers.map((manager) => (
                      <SelectItem key={manager.id} value={manager.id}>
                        {manager.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </Field>
              <Field label={t.fields.phone}>
                <Input
                  value={formState.phone}
                  onChange={(event) => updateFormField("phone", event.target.value)}
                  placeholder={t.placeholders.phone}
                  className="dashboard-control h-11 rounded-lg"
                  autoComplete="tel"
                />
              </Field>
              <Field label={t.fields.email}>
                <Input
                  type="email"
                  value={formState.email}
                  onChange={(event) => updateFormField("email", event.target.value)}
                  placeholder={t.placeholders.email}
                  className="dashboard-control h-11 rounded-lg"
                  autoComplete="email"
                />
              </Field>
            </div>

            <Field label={t.fields.address}>
              <Textarea
                value={formState.address}
                onChange={(event) => updateFormField("address", event.target.value)}
                placeholder={t.placeholders.address}
                className="dashboard-control min-h-24 resize-none rounded-lg"
                autoComplete="street-address"
              />
            </Field>

            <div className="grid gap-3 md:grid-cols-2">
              <SwitchRow
                label={t.fields.isActive}
                checked={formState.isActive}
                onCheckedChange={(checked) => updateFormField("isActive", checked)}
              />
              <SwitchRow
                label={t.fields.isDefault}
                checked={formState.isDefault}
                onCheckedChange={(checked) => updateFormField("isDefault", checked)}
              />
              <SwitchRow
                label={t.fields.allowNegativeStock}
                checked={formState.allowNegativeStock}
                onCheckedChange={(checked) => updateFormField("allowNegativeStock", checked)}
              />
              <SwitchRow
                label={t.fields.requiresApproval}
                checked={formState.requiresApproval}
                onCheckedChange={(checked) => updateFormField("requiresApproval", checked)}
              />
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
                    {editingLocation ? t.saving : t.creating}
                  </>
                ) : (
                  <>
                    <Plus className="h-4 w-4" />
                    {editingLocation ? t.edit : t.create}
                  </>
                )}
              </Button>
            </DialogFooter>
          </form>
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
                await archiveMutation.mutateAsync(archiveTarget.id)
                setArchiveTarget(null)
              }}
            >
              {archiveMutation.isPending ? <Loader2 className="me-2 h-4 w-4 animate-spin" /> : null}
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

function SwitchRow({
  label,
  checked,
  onCheckedChange,
}: {
  label: string
  checked: boolean
  onCheckedChange: (checked: boolean) => void
}) {
  return (
    <div className="flex items-center justify-between gap-3 rounded-lg border border-[var(--dash-border-subtle)] bg-[rgba(37,57,67,0.36)] p-3">
      <Label className="text-sm font-medium text-[var(--dash-text)]">{label}</Label>
      <Switch checked={checked} onCheckedChange={onCheckedChange} />
    </div>
  )
}

function LocationStatCard({
  Icon,
  label,
  value,
  detail,
  accent,
  soft,
  valueClassName,
}: {
  Icon: LucideIcon
  label: string
  value: string
  detail: string
  accent: string
  soft: string
  valueClassName?: string
}) {
  return (
    <div
      className="dashboard-stat-card group relative min-h-[132px] min-w-0 overflow-hidden rounded-lg p-4"
      style={{
        "--stat-accent": accent,
        "--stat-soft": soft,
      } as CSSProperties}
    >
      <div className="absolute inset-x-0 top-0 h-1 bg-[var(--stat-accent)] opacity-80" />
      <div className="absolute end-4 top-4 flex h-9 w-9 items-center justify-center rounded-lg bg-[var(--stat-soft)] text-[var(--stat-accent)] transition-transform duration-200 group-hover:scale-105">
        <Icon className="h-4 w-4" />
      </div>
      <div className="pe-12">
        <p className="text-[0.68rem] font-semibold uppercase leading-4 text-[var(--dash-text-faint)]">
          {label}
        </p>
        <p className={cn("mt-3 truncate text-2xl font-semibold leading-tight text-[var(--dash-text)]", valueClassName)}>
          {value}
        </p>
        <div className="mt-2 flex items-center gap-1.5">
          <span className="h-1.5 w-1.5 shrink-0 rounded-full bg-[var(--stat-accent)]" />
          <p className="truncate text-xs text-[var(--dash-text-soft)]">{detail}</p>
        </div>
      </div>
    </div>
  )
}

function PolicyBadge({
  icon: Icon,
  label,
  tone,
}: {
  icon: LucideIcon
  label: string
  tone: "gold" | "danger"
}) {
  return (
    <Badge variant="outline" className={cn("rounded-lg text-[0.68rem]", toneClass(tone))}>
      <Icon className="me-1 h-3 w-3" />
      {label}
    </Badge>
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

function CountPill({
  icon: Icon,
  label,
  value,
  locale,
}: {
  icon: LucideIcon
  label: string
  value: number
  locale: Locale
}) {
  return (
    <div className="rounded-lg border border-[var(--dash-border-subtle)] bg-[rgba(37,57,67,0.36)] p-2">
      <div className="flex items-center gap-1.5 text-[var(--dash-text-soft)]">
        <Icon className="h-3.5 w-3.5 text-[var(--dash-spruce)]" />
        <span className="truncate text-[0.68rem]">{label}</span>
      </div>
      <p className="mt-1 text-sm font-semibold text-[var(--dash-text)]">{formatNumber(value, locale)}</p>
    </div>
  )
}

function ContactLine({
  icon: Icon,
  value,
  strong,
}: {
  icon: LucideIcon
  value: string
  strong?: boolean
}) {
  return (
    <div className="flex min-w-0 items-center gap-2">
      <Icon className="h-3.5 w-3.5 shrink-0 text-[var(--dash-spruce)]" />
      <span className={cn("truncate", strong ? "font-semibold text-[var(--dash-text)]" : "text-[var(--dash-text-soft)]")}>
        {value}
      </span>
    </div>
  )
}

function MiniBadge({
  label,
  value,
  locale,
}: {
  label: string
  value: number
  locale: Locale
}) {
  return (
    <Badge variant="outline" className="rounded-lg border-[var(--dash-border-subtle)] bg-[rgba(37,57,67,0.34)] text-[var(--dash-text-soft)]">
      {label}: {formatNumber(value, locale)}
    </Badge>
  )
}

function TypeBar({
  label,
  count,
  total,
  locale,
}: {
  label: string
  count: number
  total: number
  locale: Locale
}) {
  const percentage = total ? Math.round((count / total) * 100) : 0

  return (
    <div>
      <div className="flex items-center justify-between gap-2 text-xs">
        <span className="truncate text-[var(--dash-text-soft)]">{label}</span>
        <span className="font-semibold text-[var(--dash-text)]">{formatNumber(count, locale)}</span>
      </div>
      <div className="mt-1 h-2 overflow-hidden rounded-full bg-[rgba(255,255,255,0.08)]">
        <div className="h-full rounded-full bg-[var(--dash-brand)]" style={{ width: `${percentage}%` }} />
      </div>
    </div>
  )
}
