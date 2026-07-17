"use client"

import { useCallback, useEffect, useMemo, useState, type ReactNode } from "react"
import {
  type ColumnDef,
  type RowSelectionState,
  type SortingState,
  flexRender,
  getCoreRowModel,
  getPaginationRowModel,
  getSortedRowModel,
  useReactTable,
} from "@tanstack/react-table"
import {
  Activity,
  AlertCircle,
  CalendarDays,
  CheckCircle2,
  ChevronsUpDown,
  Copy,
  Edit3,
  ExternalLink,
  Loader2,
  MapPin,
  Monitor,
  MoreHorizontal,
  Plus,
  Power,
  RefreshCw,
  Search,
  Settings2,
  Terminal,
  WalletCards,
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
import type { TerminalManagementInput, TerminalManagementRow } from "@/actions/pos/terminal-management.actions"
import {
  useArchiveManagedTerminal,
  useCreateManagedTerminal,
  useTerminalManagementData,
  useUpdateManagedTerminal,
} from "@/hooks/posHooks/useTerminalManagement"

type StatusFilter = "all" | "active" | "inactive" | "in-session" | "idle"
type DrawerFilter = "all" | "cash-drawer" | "no-cash-drawer" | "open-drawer"
type Density = "comfortable" | "compact"

type TerminalFormState = {
  terminalNumber: string
  name: string
  locationId: string
  isActive: boolean
  hasCashDrawer: boolean
}

interface TerminalManagementDashboardProps {
  organizationId: string
  locale?: Locale
}

const copy = {
  en: {
    eyebrow: "POS terminal control",
    title: "Terminal management",
    subtitle: "Configure cashier workstations, assign locations, and keep POS session status visible.",
    search: "Search terminal, number, location, cashier...",
    status: "Status",
    drawer: "Drawer",
    location: "Location",
    all: "All",
    active: "Active",
    inactive: "Inactive",
    inSession: "In session",
    idle: "Idle",
    cashDrawer: "Cash drawer",
    noCashDrawer: "No drawer",
    openDrawer: "Open drawer",
    create: "Create terminal",
    edit: "Edit terminal",
    refresh: "Refresh",
    refreshing: "Refreshing",
    columns: "Columns",
    actions: "Actions",
    copyId: "Copy ID",
    openPOS: "Open POS",
    openCash: "Cash drawer",
    deactivate: "Deactivate",
    loadingTitle: "Loading terminals",
    loadingBody: "Collecting terminal configuration, sessions, and drawer status.",
    errorTitle: "Terminals unavailable",
    retry: "Try again",
    emptyTitle: "No terminals found",
    emptyBody: "Create a terminal before opening cashier sessions at a location.",
    rows: "rows",
    page: "Page",
    of: "of",
    previous: "Previous",
    next: "Next",
    selected: "selected",
    noSession: "No active session",
    noData: "No data",
    totalTerminals: "Total terminals",
    activeTerminals: "Active",
    activeSessions: "Active sessions",
    drawerCount: "Cash drawers",
    openDrawers: "Open drawers",
    totalSales: "Session sales",
    transactions: "Transactions",
    copiedTitle: "Terminal ID copied",
    copiedBody: "The terminal identifier is ready to paste.",
    copyFailedTitle: "Copy failed",
    copyFailedBody: "The browser could not copy this identifier.",
    requiredTitle: "Terminal details required",
    requiredBody: "Enter a terminal name and location before saving.",
    deactivateTitle: "Deactivate terminal",
    deactivateBody: "This keeps terminal history but removes it from active POS selection. Active sessions must be closed first.",
    confirmDeactivate: "Deactivate terminal",
    cancel: "Cancel",
    saving: "Saving",
    creating: "Creating",
    formDescription: "Terminal identity, location assignment, and attached drawer configuration.",
    selectAll: "Select all terminals",
    selectRow: "Select terminal",
    fields: {
      terminalNumber: "Terminal number",
      name: "Terminal name",
      location: "Location",
      isActive: "Active for POS selection",
      hasCashDrawer: "Cash drawer attached",
    },
    placeholders: {
      terminalNumber: "Auto-generated when empty",
      name: "Front Counter 01",
    },
    tableColumns: {
      terminal: "Terminal",
      location: "Location",
      status: "Status",
      hardware: "Hardware",
      session: "Session",
      activity: "Activity",
      actions: "Actions",
    },
  },
  fr: {
    eyebrow: "Controle terminaux POS",
    title: "Gestion des terminaux",
    subtitle: "Configurez les postes caisse, affectez les lieux et gardez le statut des sessions visible.",
    search: "Rechercher terminal, numero, lieu, caissier...",
    status: "Statut",
    drawer: "Caisse",
    location: "Lieu",
    all: "Tous",
    active: "Actif",
    inactive: "Inactif",
    inSession: "En session",
    idle: "Libre",
    cashDrawer: "Caisse",
    noCashDrawer: "Sans caisse",
    openDrawer: "Caisse ouverte",
    create: "Creer terminal",
    edit: "Modifier terminal",
    refresh: "Actualiser",
    refreshing: "Actualisation",
    columns: "Colonnes",
    actions: "Actions",
    copyId: "Copier ID",
    openPOS: "Ouvrir POS",
    openCash: "Caisse",
    deactivate: "Desactiver",
    loadingTitle: "Chargement des terminaux",
    loadingBody: "Collecte de la configuration, des sessions et du statut caisse.",
    errorTitle: "Terminaux indisponibles",
    retry: "Reessayer",
    emptyTitle: "Aucun terminal trouve",
    emptyBody: "Creez un terminal avant d'ouvrir des sessions caisse dans un lieu.",
    rows: "lignes",
    page: "Page",
    of: "sur",
    previous: "Retour",
    next: "Suivant",
    selected: "selection",
    noSession: "Aucune session active",
    noData: "Aucune donnee",
    totalTerminals: "Total terminaux",
    activeTerminals: "Actifs",
    activeSessions: "Sessions actives",
    drawerCount: "Caisses",
    openDrawers: "Caisses ouvertes",
    totalSales: "Ventes session",
    transactions: "Transactions",
    copiedTitle: "ID terminal copie",
    copiedBody: "L'identifiant du terminal est pret a coller.",
    copyFailedTitle: "Copie echouee",
    copyFailedBody: "Le navigateur n'a pas pu copier cet identifiant.",
    requiredTitle: "Details terminal requis",
    requiredBody: "Saisissez un nom de terminal et un lieu avant l'enregistrement.",
    deactivateTitle: "Desactiver le terminal",
    deactivateBody: "Conserve l'historique mais retire le terminal de la selection POS active. Les sessions actives doivent etre fermees.",
    confirmDeactivate: "Desactiver terminal",
    cancel: "Annuler",
    saving: "Enregistrement",
    creating: "Creation",
    formDescription: "Identite du terminal, affectation au lieu et configuration de caisse.",
    selectAll: "Selectionner tous les terminaux",
    selectRow: "Selectionner terminal",
    fields: {
      terminalNumber: "Numero terminal",
      name: "Nom terminal",
      location: "Lieu",
      isActive: "Actif pour selection POS",
      hasCashDrawer: "Caisse rattachee",
    },
    placeholders: {
      terminalNumber: "Genere automatiquement si vide",
      name: "Caisse principale 01",
    },
    tableColumns: {
      terminal: "Terminal",
      location: "Lieu",
      status: "Statut",
      hardware: "Materiel",
      session: "Session",
      activity: "Activite",
      actions: "Actions",
    },
  },
} as const

function getDefaultForm(locationId?: string): TerminalFormState {
  return {
    terminalNumber: "",
    name: "",
    locationId: locationId ?? "",
    isActive: true,
    hasCashDrawer: true,
  }
}

function formFromTerminal(terminal: TerminalManagementRow): TerminalFormState {
  return {
    terminalNumber: terminal.terminalNumber,
    name: terminal.name,
    locationId: terminal.locationId,
    isActive: terminal.isActive,
    hasCashDrawer: terminal.hasCashDrawer,
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
  return new Intl.DateTimeFormat(locale === "fr" ? "fr-FR" : "en-US", {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(date)
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
    brand: "border-[var(--dash-brand)] bg-[var(--dash-brand-soft)] text-[var(--dash-brand-strong)]",
    spruce: "border-[var(--dash-spruce)] bg-[var(--dash-spruce-soft)] text-[var(--dash-spruce)]",
    gold: "border-[var(--dash-gold)] bg-[var(--dash-gold-soft)] text-[var(--dash-gold)]",
    danger: "border-[var(--dash-danger)] bg-[var(--dash-danger-soft)] text-[var(--dash-danger)]",
    success: "border-[var(--dash-success)] bg-[var(--dash-success-soft)] text-[var(--dash-success)]",
  }[tone]
}

export default function TerminalManagementDashboard({
  organizationId,
  locale = "en",
}: TerminalManagementDashboardProps) {
  const t = copy[locale]
  const notifications = useNotifications()
  const [search, setSearch] = useState("")
  const [statusFilter, setStatusFilter] = useState<StatusFilter>("all")
  const [drawerFilter, setDrawerFilter] = useState<DrawerFilter>("all")
  const [locationFilter, setLocationFilter] = useState("all")
  const [density, setDensity] = useState<Density>("comfortable")
  const [sorting, setSorting] = useState<SortingState>([])
  const [rowSelection, setRowSelection] = useState<RowSelectionState>({})
  const [formOpen, setFormOpen] = useState(false)
  const [editingTerminal, setEditingTerminal] = useState<TerminalManagementRow | null>(null)
  const [archiveTarget, setArchiveTarget] = useState<TerminalManagementRow | null>(null)
  const [formError, setFormError] = useState<string | null>(null)
  const [formState, setFormState] = useState<TerminalFormState>(() => getDefaultForm())

  const { data, isLoading, isFetching, isError, error, refetch } = useTerminalManagementData(organizationId)
  const createMutation = useCreateManagedTerminal(organizationId, locale)
  const updateMutation = useUpdateManagedTerminal(organizationId, locale)
  const archiveMutation = useArchiveManagedTerminal(organizationId, locale)

  const terminals = useMemo(() => data?.terminals ?? [], [data?.terminals])
  const locations = useMemo(() => data?.locations ?? [], [data?.locations])
  const isSaving = createMutation.isPending || updateMutation.isPending

  useEffect(() => {
    if (!formState.locationId && locations[0]?.id && !editingTerminal) {
      setFormState((current) => ({ ...current, locationId: locations[0].id }))
    }
  }, [editingTerminal, formState.locationId, locations])

  const filteredTerminals = useMemo(() => {
    const query = search.trim().toLowerCase()

    return terminals.filter((terminal) => {
      if (locationFilter !== "all" && terminal.locationId !== locationFilter) return false
      if (statusFilter === "active" && !terminal.isActive) return false
      if (statusFilter === "inactive" && terminal.isActive) return false
      if (statusFilter === "in-session" && !terminal.currentSession) return false
      if (statusFilter === "idle" && terminal.currentSession) return false
      if (drawerFilter === "cash-drawer" && !terminal.hasCashDrawer) return false
      if (drawerFilter === "no-cash-drawer" && terminal.hasCashDrawer) return false
      if (drawerFilter === "open-drawer" && terminal.openCashDrawersCount === 0) return false

      if (!query) return true

      return [
        terminal.name,
        terminal.terminalNumber,
        terminal.locationName,
        terminal.locationCode,
        terminal.currentSession?.sessionNumber,
        terminal.currentSession?.cashierName,
        terminal.currentSession?.cashierEmail,
      ]
        .filter(Boolean)
        .join(" ")
        .toLowerCase()
        .includes(query)
    })
  }, [drawerFilter, locationFilter, search, statusFilter, terminals])

  const summary = useMemo(() => {
    return {
      activeTerminals: terminals.filter((terminal) => terminal.isActive).length,
      activeSessions: terminals.filter((terminal) => terminal.currentSession).length,
      drawerCount: terminals.reduce((sum, terminal) => sum + terminal.cashDrawersCount, 0),
      openDrawers: terminals.reduce((sum, terminal) => sum + terminal.openCashDrawersCount, 0),
      totalSales: terminals.reduce((sum, terminal) => sum + (terminal.currentSession?.totalSales ?? 0), 0),
      transactions: terminals.reduce((sum, terminal) => sum + (terminal.currentSession?.transactionCount ?? 0), 0),
    }
  }, [terminals])

  const openCreate = useCallback(() => {
    setEditingTerminal(null)
    setFormError(null)
    setFormState(getDefaultForm(locations[0]?.id))
    setFormOpen(true)
  }, [locations])

  const openEdit = useCallback((terminal: TerminalManagementRow) => {
    setEditingTerminal(terminal)
    setFormError(null)
    setFormState(formFromTerminal(terminal))
    setFormOpen(true)
  }, [])

  const updateFormField = useCallback(<K extends keyof TerminalFormState>(field: K, value: TerminalFormState[K]) => {
    setFormState((current) => ({
      ...current,
      [field]: value,
    }))
  }, [])

  const submitForm = useCallback(async () => {
    if (!formState.name.trim() || !formState.locationId) {
      setFormError(t.requiredBody)
      notifications.warning(t.requiredTitle, t.requiredBody)
      return
    }

    const payload: TerminalManagementInput = {
      terminalNumber: formState.terminalNumber.trim() || null,
      name: formState.name,
      locationId: formState.locationId,
      isActive: formState.isActive,
      hasCashDrawer: formState.hasCashDrawer,
    }

    try {
      if (editingTerminal) {
        await updateMutation.mutateAsync({ id: editingTerminal.id, data: payload })
      } else {
        await createMutation.mutateAsync(payload)
      }

      setFormOpen(false)
      setEditingTerminal(null)
      setFormError(null)
      setFormState(getDefaultForm(locations[0]?.id))
    } catch (mutationError) {
      setFormError(mutationError instanceof Error ? mutationError.message : t.requiredBody)
    }
  }, [createMutation, editingTerminal, formState, locations, notifications, t, updateMutation])

  const copyTerminalId = useCallback(async (terminal: TerminalManagementRow) => {
    try {
      await navigator.clipboard.writeText(terminal.id)
      notifications.success(t.copiedTitle, t.copiedBody)
    } catch {
      notifications.error(t.copyFailedTitle, t.copyFailedBody)
    }
  }, [notifications, t])

  const columns = useMemo<ColumnDef<TerminalManagementRow>[]>(() => [
    {
      id: "select",
      header: ({ table }) => (
        <Checkbox
          checked={table.getIsAllPageRowsSelected() || (table.getIsSomePageRowsSelected() && "indeterminate")}
          onCheckedChange={(value) => table.toggleAllPageRowsSelected(!!value)}
          aria-label={t.selectAll}
        />
      ),
      cell: ({ row }) => (
        <Checkbox
          checked={row.getIsSelected()}
          onCheckedChange={(value) => row.toggleSelected(!!value)}
          aria-label={t.selectRow}
        />
      ),
      enableSorting: false,
      enableHiding: false,
    },
    {
      accessorKey: "terminalNumber",
      header: ({ column }) => (
        <HeaderButton onClick={() => column.toggleSorting(column.getIsSorted() === "asc")}>
          {t.tableColumns.terminal}
          <SortIcon sorted={column.getIsSorted()} />
        </HeaderButton>
      ),
      cell: ({ row }) => {
        const terminal = row.original
        return (
          <div className="flex min-w-[16rem] items-start gap-3">
            <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg border border-[var(--dash-border-subtle)] bg-[var(--dash-brand-soft)] text-[var(--dash-brand-strong)]">
              <Terminal className="h-5 w-5" />
            </span>
            <div className="min-w-0">
              <p className="truncate font-semibold text-[var(--dash-text)]">{terminal.name}</p>
              <p className="mt-1 truncate font-mono text-xs text-[var(--dash-text-faint)]">{terminal.terminalNumber}</p>
              <Badge variant="outline" className="mt-2 rounded-lg border-[var(--dash-border-subtle)] bg-[rgba(37,57,67,0.34)] text-[var(--dash-text-soft)]">
                {terminal.id.slice(0, 8)}
              </Badge>
            </div>
          </div>
        )
      },
    },
    {
      accessorKey: "locationName",
      header: ({ column }) => (
        <HeaderButton onClick={() => column.toggleSorting(column.getIsSorted() === "asc")}>
          {t.tableColumns.location}
          <SortIcon sorted={column.getIsSorted()} />
        </HeaderButton>
      ),
      cell: ({ row }) => {
        const terminal = row.original
        return (
          <div className="min-w-[12rem] space-y-1">
            <div className="flex min-w-0 items-center gap-2">
              <MapPin className="h-4 w-4 shrink-0 text-[var(--dash-spruce)]" />
              <span className="truncate font-medium text-[var(--dash-text)]">{terminal.locationName}</span>
            </div>
            <p className="font-mono text-xs text-[var(--dash-text-faint)]">{terminal.locationCode}</p>
            <Badge variant="outline" className="rounded-lg border-[var(--dash-border-subtle)] bg-[rgba(37,57,67,0.34)] text-[var(--dash-text-soft)]">
              {terminal.locationType.replace(/_/g, " ")}
            </Badge>
          </div>
        )
      },
    },
    {
      accessorKey: "isActive",
      header: t.tableColumns.status,
      cell: ({ row }) => {
        const terminal = row.original
        return (
          <div className="min-w-[9rem] space-y-2">
            <Badge
              variant="outline"
              className={cn("rounded-lg", terminal.isActive ? toneClass("success") : toneClass("danger"))}
            >
              {terminal.isActive ? <CheckCircle2 className="me-1 h-3 w-3" /> : <XCircle className="me-1 h-3 w-3" />}
              {terminal.isActive ? t.active : t.inactive}
            </Badge>
            <Badge
              variant="outline"
              className={cn("rounded-lg", terminal.currentSession ? toneClass("brand") : toneClass("gold"))}
            >
              <Activity className="me-1 h-3 w-3" />
              {terminal.currentSession ? t.inSession : t.idle}
            </Badge>
          </div>
        )
      },
    },
    {
      accessorKey: "hasCashDrawer",
      header: t.tableColumns.hardware,
      cell: ({ row }) => {
        const terminal = row.original
        return (
          <div className="min-w-[10rem] space-y-2">
            <Badge
              variant="outline"
              className={cn("rounded-lg", terminal.hasCashDrawer ? toneClass("spruce") : "border-[var(--dash-border-subtle)] bg-[rgba(37,57,67,0.34)] text-[var(--dash-text-soft)]")}
            >
              <WalletCards className="me-1 h-3 w-3" />
              {terminal.hasCashDrawer ? t.cashDrawer : t.noCashDrawer}
            </Badge>
            <div className="grid grid-cols-2 gap-2">
              <InlineMetric label={t.drawerCount} value={formatNumber(terminal.cashDrawersCount, locale)} />
              <InlineMetric label={t.openDrawers} value={formatNumber(terminal.openCashDrawersCount, locale)} />
            </div>
          </div>
        )
      },
    },
    {
      id: "session",
      header: t.tableColumns.session,
      cell: ({ row }) => {
        const session = row.original.currentSession

        if (!session) {
          return <span className="text-sm text-[var(--dash-text-soft)]">{t.noSession}</span>
        }

        return (
          <div className="min-w-[15rem] space-y-2">
            <div>
              <p className="truncate font-semibold text-[var(--dash-text)]">{session.sessionNumber}</p>
              <p className="truncate text-xs text-[var(--dash-text-soft)]">{session.cashierName}</p>
            </div>
            <div className="grid grid-cols-2 gap-2">
              <InlineMetric label={t.totalSales} value={formatCurrency(session.totalSales, locale)} />
              <InlineMetric label={t.transactions} value={formatNumber(session.transactionCount, locale)} />
            </div>
          </div>
        )
      },
    },
    {
      accessorKey: "updatedAt",
      header: ({ column }) => (
        <HeaderButton onClick={() => column.toggleSorting(column.getIsSorted() === "asc")}>
          {t.tableColumns.activity}
          <SortIcon sorted={column.getIsSorted()} />
        </HeaderButton>
      ),
      cell: ({ row }) => {
        const terminal = row.original
        return (
          <div className="min-w-[13rem] space-y-2">
            <div className="grid grid-cols-3 gap-2">
              <InlineMetric label="Sessions" value={formatNumber(terminal.sessionsCount, locale)} />
              <InlineMetric label="Sales" value={formatNumber(terminal.salesOrdersCount, locale)} />
              <InlineMetric label="Drawers" value={formatNumber(terminal.cashDrawersCount, locale)} />
            </div>
            <div className="flex items-center gap-2 text-xs text-[var(--dash-text-faint)]">
              <CalendarDays className="h-3.5 w-3.5" />
              <span>{formatDate(terminal.updatedAt, locale, t.noData)}</span>
            </div>
          </div>
        )
      },
    },
    {
      id: "actions",
      header: t.tableColumns.actions,
      cell: ({ row }) => {
        const terminal = row.original
        return (
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" size="icon" className="h-9 w-9 rounded-lg text-[var(--dash-text-soft)] hover:bg-[var(--dash-brand-soft)] hover:text-[var(--dash-brand-strong)]">
                <MoreHorizontal className="h-4 w-4" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-56 border-[var(--dash-border-subtle)] bg-[var(--dash-surface-raised)] text-[var(--dash-text)]">
              <DropdownMenuLabel>{t.actions}</DropdownMenuLabel>
              <DropdownMenuSeparator className="bg-[var(--dash-border-subtle)]" />
              <DropdownMenuItem onClick={() => openEdit(terminal)}>
                <Edit3 className="me-2 h-4 w-4" />
                {t.edit}
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => copyTerminalId(terminal)}>
                <Copy className="me-2 h-4 w-4" />
                {t.copyId}
              </DropdownMenuItem>
              <DropdownMenuItem asChild>
                <Link href="/dashboard/pos" className="flex items-center">
                  <Monitor className="me-2 h-4 w-4" />
                  {t.openPOS}
                  <ExternalLink className="ms-auto h-3.5 w-3.5" />
                </Link>
              </DropdownMenuItem>
              <DropdownMenuItem asChild>
                <Link href="/dashboard/cashDrawer" className="flex items-center">
                  <WalletCards className="me-2 h-4 w-4" />
                  {t.openCash}
                  <ExternalLink className="ms-auto h-3.5 w-3.5" />
                </Link>
              </DropdownMenuItem>
              <DropdownMenuSeparator className="bg-[var(--dash-border-subtle)]" />
              <DropdownMenuItem
                className="text-[var(--dash-danger)] focus:text-[var(--dash-danger)]"
                disabled={!terminal.isActive || !!terminal.currentSession}
                onClick={() => setArchiveTarget(terminal)}
              >
                <Power className="me-2 h-4 w-4" />
                {t.deactivate}
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        )
      },
      enableSorting: false,
    },
  ], [copyTerminalId, locale, openEdit, t])

  const table = useReactTable({
    data: filteredTerminals,
    columns,
    state: {
      sorting,
      rowSelection,
    },
    onSortingChange: setSorting,
    onRowSelectionChange: setRowSelection,
    getCoreRowModel: getCoreRowModel(),
    getSortedRowModel: getSortedRowModel(),
    getPaginationRowModel: getPaginationRowModel(),
  })

  const rowPadding = density === "compact" ? "py-2" : "py-4"

  if (isLoading) {
    return (
      <section className="dashboard-glass-panel rounded-lg p-6 text-[var(--dash-text)]">
        <div className="flex min-h-[18rem] flex-col items-center justify-center text-center">
          <Loader2 className="h-8 w-8 animate-spin text-[var(--dash-brand-strong)]" />
          <div className="mt-4">
            <p className="font-semibold text-[var(--dash-text)]">{t.loadingTitle}</p>
            <p className="mt-1 text-sm text-[var(--dash-text-soft)]">{t.loadingBody}</p>
          </div>
        </div>
      </section>
    )
  }

  if (isError) {
    return (
      <section className="dashboard-glass-panel rounded-lg p-6 text-[var(--dash-text)]">
        <div className="flex min-h-[18rem] flex-col items-center justify-center text-center">
          <div className="flex h-12 w-12 items-center justify-center rounded-lg bg-[var(--dash-danger-soft)] text-[var(--dash-danger)]">
            <AlertCircle className="h-6 w-6" />
          </div>
          <div className="mt-4">
            <p className="font-semibold text-[var(--dash-text)]">{t.errorTitle}</p>
            <p className="mt-1 text-sm text-[var(--dash-text-soft)]">{error?.message}</p>
          </div>
          <Button type="button" onClick={() => refetch()} className="mt-5 dashboard-button-primary h-10 rounded-lg">
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
          <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
            <div className="flex min-w-0 items-start gap-3">
              <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-lg border border-[var(--dash-border-subtle)] bg-[var(--dash-brand-soft)] shadow-[0_16px_34px_rgba(47,125,246,0.18)]">
                <Terminal className="h-6 w-6 text-[var(--dash-brand-strong)]" />
              </div>
              <div className="min-w-0">
                <p className="text-xs font-semibold uppercase tracking-[0.18em] text-[var(--dash-brand-strong)]">{t.eyebrow}</p>
                <h2 className="mt-1 text-2xl font-semibold tracking-tight text-[var(--dash-text)] sm:text-3xl">{t.title}</h2>
                <p className="mt-2 max-w-3xl text-sm leading-6 text-[var(--dash-text-soft)]">{t.subtitle}</p>
              </div>
            </div>
            <div className="flex flex-wrap items-center gap-2">
              <Button type="button" variant="outline" onClick={() => refetch()} disabled={isFetching} className="dashboard-button-secondary h-10 rounded-lg">
                {isFetching ? <Loader2 className="h-4 w-4 animate-spin" /> : <RefreshCw className="h-4 w-4" />}
                {isFetching ? t.refreshing : t.refresh}
              </Button>
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button type="button" variant="outline" className="dashboard-button-secondary h-10 rounded-lg">
                    <Settings2 className="h-4 w-4" />
                    {t.columns}
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end" className="w-56 border-[var(--dash-border-subtle)] bg-[var(--dash-surface-raised)] text-[var(--dash-text)]">
                  {table.getAllLeafColumns().filter((column) => column.getCanHide()).map((column) => (
                    <DropdownMenuItem key={column.id} onSelect={(event) => event.preventDefault()}>
                      <Checkbox
                        checked={column.getIsVisible()}
                        onCheckedChange={(value) => column.toggleVisibility(!!value)}
                        className="me-2"
                      />
                      {column.id}
                    </DropdownMenuItem>
                  ))}
                </DropdownMenuContent>
              </DropdownMenu>
              <Button type="button" onClick={openCreate} disabled={!locations.length} className="dashboard-button-primary h-10 rounded-lg">
                <Plus className="h-4 w-4" />
                {t.create}
              </Button>
            </div>
          </div>
        </div>

        <div className="space-y-5 p-5 sm:p-6">
          <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-6">
            <SummaryTile icon={Terminal} label={t.totalTerminals} value={terminals.length} locale={locale} tone="brand" />
            <SummaryTile icon={CheckCircle2} label={t.activeTerminals} value={summary.activeTerminals} locale={locale} tone="success" />
            <SummaryTile icon={Activity} label={t.activeSessions} value={summary.activeSessions} locale={locale} tone="spruce" />
            <SummaryTile icon={WalletCards} label={t.drawerCount} value={summary.drawerCount} locale={locale} tone="gold" />
            <SummaryTile icon={Power} label={t.openDrawers} value={summary.openDrawers} locale={locale} tone="spruce" />
            <SummaryTile icon={Monitor} label={t.transactions} value={summary.transactions} locale={locale} tone="brand" />
          </div>

          <div className="rounded-lg border border-[var(--dash-border-subtle)] bg-[rgba(37,57,67,0.34)] p-4">
            <div className="grid gap-3 lg:grid-cols-[minmax(0,1fr)_12rem_12rem_14rem_11rem]">
              <div className="relative">
                <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-[var(--dash-text-faint)]" />
                <Input
                  value={search}
                  onChange={(event) => setSearch(event.target.value)}
                  placeholder={t.search}
                  className="dashboard-control h-11 rounded-lg pl-10"
                />
              </div>
              <Select value={statusFilter} onValueChange={(value) => setStatusFilter(value as StatusFilter)}>
                <SelectTrigger className="dashboard-control h-11 rounded-lg">
                  <SelectValue placeholder={t.status} />
                </SelectTrigger>
                <SelectContent className="border-[var(--dash-border-subtle)] bg-[var(--dash-surface-raised)] text-[var(--dash-text)]">
                  <SelectItem value="all">{t.all}</SelectItem>
                  <SelectItem value="active">{t.active}</SelectItem>
                  <SelectItem value="inactive">{t.inactive}</SelectItem>
                  <SelectItem value="in-session">{t.inSession}</SelectItem>
                  <SelectItem value="idle">{t.idle}</SelectItem>
                </SelectContent>
              </Select>
              <Select value={drawerFilter} onValueChange={(value) => setDrawerFilter(value as DrawerFilter)}>
                <SelectTrigger className="dashboard-control h-11 rounded-lg">
                  <SelectValue placeholder={t.drawer} />
                </SelectTrigger>
                <SelectContent className="border-[var(--dash-border-subtle)] bg-[var(--dash-surface-raised)] text-[var(--dash-text)]">
                  <SelectItem value="all">{t.all}</SelectItem>
                  <SelectItem value="cash-drawer">{t.cashDrawer}</SelectItem>
                  <SelectItem value="no-cash-drawer">{t.noCashDrawer}</SelectItem>
                  <SelectItem value="open-drawer">{t.openDrawer}</SelectItem>
                </SelectContent>
              </Select>
              <Select value={locationFilter} onValueChange={setLocationFilter}>
                <SelectTrigger className="dashboard-control h-11 rounded-lg">
                  <SelectValue placeholder={t.location} />
                </SelectTrigger>
                <SelectContent className="border-[var(--dash-border-subtle)] bg-[var(--dash-surface-raised)] text-[var(--dash-text)]">
                  <SelectItem value="all">{t.all}</SelectItem>
                  {locations.map((location) => (
                    <SelectItem key={location.id} value={location.id}>{location.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <Select value={density} onValueChange={(value) => setDensity(value as Density)}>
                <SelectTrigger className="dashboard-control h-11 rounded-lg">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent className="border-[var(--dash-border-subtle)] bg-[var(--dash-surface-raised)] text-[var(--dash-text)]">
                  <SelectItem value="comfortable">Comfort</SelectItem>
                  <SelectItem value="compact">Compact</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="overflow-hidden rounded-lg border border-[var(--dash-border-subtle)] bg-[rgba(12,20,24,0.35)]">
            <Table className="min-w-[92rem]">
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
                          <Terminal className="h-6 w-6" />
                        </div>
                        <div>
                          <p className="font-semibold text-[var(--dash-text)]">{t.emptyTitle}</p>
                          <p className="mt-1 text-sm leading-6">{t.emptyBody}</p>
                        </div>
                        <Button type="button" onClick={openCreate} disabled={!locations.length} className="dashboard-button-primary h-10 rounded-lg">
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
              <span className="ms-2">({formatNumber(filteredTerminals.length, locale)} {t.rows})</span>
              {Object.keys(rowSelection).length ? (
                <span className="ms-2">({formatNumber(Object.keys(rowSelection).length, locale)} {t.selected})</span>
              ) : null}
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
            setEditingTerminal(null)
            setFormError(null)
            setFormState(getDefaultForm(locations[0]?.id))
          }
        }}
      >
        <DialogContent className="dashboard-glass-panel max-h-[92vh] max-w-2xl overflow-y-auto rounded-lg border-[var(--dash-border-subtle)] text-[var(--dash-text)]">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-[var(--dash-text)]">
              <Terminal className="h-5 w-5 text-[var(--dash-brand-strong)]" />
              {editingTerminal ? t.edit : t.create}
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
              <Field label={t.fields.terminalNumber}>
                <Input
                  value={formState.terminalNumber}
                  onChange={(event) => updateFormField("terminalNumber", event.target.value)}
                  placeholder={t.placeholders.terminalNumber}
                  className="dashboard-control h-11 rounded-lg font-mono"
                />
              </Field>
            </div>

            <Field label={t.fields.location} required>
              <Select value={formState.locationId} onValueChange={(value) => updateFormField("locationId", value)}>
                <SelectTrigger className="dashboard-control h-11 rounded-lg">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent className="border-[var(--dash-border-subtle)] bg-[var(--dash-surface-raised)] text-[var(--dash-text)]">
                  {locations.map((location) => (
                    <SelectItem key={location.id} value={location.id}>
                      {location.name} ({location.code})
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </Field>

            <div className="grid gap-3 md:grid-cols-2">
              <SwitchRow
                label={t.fields.isActive}
                checked={formState.isActive}
                onCheckedChange={(checked) => updateFormField("isActive", checked)}
              />
              <SwitchRow
                label={t.fields.hasCashDrawer}
                checked={formState.hasCashDrawer}
                onCheckedChange={(checked) => updateFormField("hasCashDrawer", checked)}
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
              <Button type="submit" disabled={isSaving || !locations.length} className="dashboard-button-primary h-10 rounded-lg">
                {isSaving ? (
                  <>
                    <Loader2 className="h-4 w-4 animate-spin" />
                    {editingTerminal ? t.saving : t.creating}
                  </>
                ) : (
                  <>
                    <Plus className="h-4 w-4" />
                    {editingTerminal ? t.edit : t.create}
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
            <AlertDialogTitle>{t.deactivateTitle}</AlertDialogTitle>
            <AlertDialogDescription className="text-[var(--dash-text-soft)]">
              {t.deactivateBody}
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
              {t.confirmDeactivate}
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
  locale: Locale
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
        {typeof value === "number" ? formatNumber(value, locale) : value}
      </p>
    </div>
  )
}

function InlineMetric({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-lg border border-[var(--dash-border-subtle)] bg-[rgba(37,57,67,0.32)] p-2">
      <p className="text-[0.68rem] text-[var(--dash-text-faint)]">{label}</p>
      <p className="mt-1 truncate font-semibold text-[var(--dash-text)]">{value}</p>
    </div>
  )
}
