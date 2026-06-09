"use client"

import { useCallback, useMemo, useState, type ReactNode } from "react"
import {
  type ColumnDef,
  type SortingState,
  type VisibilityState,
  flexRender,
  getCoreRowModel,
  getFilteredRowModel,
  getPaginationRowModel,
  getSortedRowModel,
  useReactTable,
} from "@tanstack/react-table"
import {
  AlertCircle,
  Building2,
  CalendarDays,
  CheckCircle2,
  ChevronDown,
  ChevronsUpDown,
  Copy,
  Download,
  Edit3,
  ExternalLink,
  Globe2,
  Loader2,
  MapPin,
  MoreHorizontal,
  Package,
  Plus,
  RefreshCw,
  Search,
  ShieldCheck,
  ShoppingCart,
  SlidersHorizontal,
  Truck,
  Users,
  WalletCards,
  XCircle,
  type LucideIcon,
} from "lucide-react"

import { Link } from "@/i18n/navigation"
import type { Locale } from "@/types/bilingual"
import { cn } from "@/lib/utils"
import { useNotifications } from "@/components/notifications/NotificationProvider"
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
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import { Textarea } from "@/components/ui/textarea"
import type { OrganizationManagementRow } from "@/actions/organization/organization-settings-actions"
import { useCreateOrganizationSettings, useOrganizationManagementRows } from "@/hooks/useOrganizationSettings"

interface OrganizationManagementTableProps {
  organizationId: string
  locale?: Locale
}

type StatusFilter = "all" | "active" | "inactive"

type CreateOrganizationFormState = {
  name: string
  industry: string
  country: string
  state: string
  address: string
  currency: string
  timezone: string
  defaultLocale: Locale
}

const DASHBOARD_SEGMENT = "dashboard"

const dashboardPath = (...segments: string[]) =>
  `/${[DASHBOARD_SEGMENT, ...segments].join("/")}`

const CURRENCIES = ["XAF", "USD", "EUR", "GBP", "CAD", "NGN", "GHS", "ZAR"] as const

const TIMEZONES = [
  "Africa/Douala",
  "Africa/Lagos",
  "Africa/Abidjan",
  "Africa/Nairobi",
  "Europe/Paris",
  "Europe/London",
  "UTC",
  "America/New_York",
] as const

const copy = {
  en: {
    eyebrow: "Organization directory",
    title: "Organization management table",
    subtitle: "Review the active company record, operational footprint, commercial activity, and related setup routes.",
    search: "Search organization, region, currency, timezone...",
    status: "Status",
    all: "All",
    active: "Active",
    inactive: "Inactive",
    refresh: "Refresh",
    refreshing: "Refreshing",
    export: "Export",
    create: "Create organization",
    creating: "Creating",
    columns: "Columns",
    actions: "Actions",
    editProfile: "Edit profile",
    copyId: "Copy ID",
    openUsers: "Open users",
    openLocations: "Open locations",
    openRoles: "Open roles",
    openItems: "Open items",
    loadingTitle: "Loading organization table",
    loadingBody: "Fetching the company record and related counts.",
    errorTitle: "Organization table unavailable",
    retry: "Try again",
    emptyTitle: "No organization rows found",
    emptyBody: "Adjust filters or refresh the organization settings table.",
    notSet: "Not set",
    page: "Page",
    of: "of",
    previous: "Previous",
    next: "Next",
    rows: "rows",
    selectedView: "Filtered view",
    totalRecords: "Total records",
    activeRecords: "Active records",
    users: "Users",
    items: "Items",
    locations: "Locations",
    partners: "Partners",
    revenue: "Paid revenue",
    currency: "Currency",
    language: "Language",
    timezone: "Timezone",
    fiscal: "Fiscal year",
    inventoryStart: "Inventory start",
    updated: "Updated",
    copiedTitle: "Organization ID copied",
    copiedBody: "The organization identifier is ready to paste.",
    copyFailedTitle: "Copy failed",
    copyFailedBody: "The browser could not copy the organization identifier.",
    exportTitle: "Organization table exported",
    exportBody: "The filtered organization table was exported as CSV.",
    profileFocusTitle: "Profile workflow ready",
    profileFocusBody: "The organization form is in view for editing.",
    createDialogTitle: "Create organization",
    createDialogBody: "Add a new organization record with its regional defaults. The table refreshes as soon as it is saved.",
    requiredTitle: "Organization name required",
    requiredBody: "Enter the organization name before creating it.",
    cancel: "Cancel",
    fields: {
      name: "Organization name",
      industry: "Industry",
      country: "Country",
      state: "State or province",
      address: "Business address",
      currency: "Default currency",
      timezone: "Timezone",
      defaultLocale: "Default language",
    },
    placeholders: {
      name: "Acme Retail Group",
      industry: "Retail",
      country: "Cameroon",
      state: "Centre",
      address: "Street, city, postal code",
    },
    tableColumns: {
      organization: "Organization",
      region: "Region",
      defaults: "Defaults",
      footprint: "Footprint",
      commerce: "Commerce",
      calendar: "Calendar",
      status: "Status",
      actions: "Actions",
    },
  },
  fr: {
    eyebrow: "Repertoire organisation",
    title: "Table de gestion organisation",
    subtitle: "Consultez l'entreprise active, son empreinte operationnelle, son activite commerciale et les routes de configuration liees.",
    search: "Rechercher organisation, region, devise, fuseau...",
    status: "Statut",
    all: "Tous",
    active: "Actif",
    inactive: "Inactif",
    refresh: "Actualiser",
    refreshing: "Actualisation",
    export: "Exporter",
    create: "Creer une organisation",
    creating: "Creation",
    columns: "Colonnes",
    actions: "Actions",
    editProfile: "Modifier le profil",
    copyId: "Copier l'ID",
    openUsers: "Ouvrir utilisateurs",
    openLocations: "Ouvrir lieux",
    openRoles: "Ouvrir roles",
    openItems: "Ouvrir articles",
    loadingTitle: "Chargement de la table organisation",
    loadingBody: "Recuperation du dossier entreprise et des compteurs lies.",
    errorTitle: "Table organisation indisponible",
    retry: "Reessayer",
    emptyTitle: "Aucune ligne d'organisation",
    emptyBody: "Ajustez les filtres ou actualisez la table des parametres.",
    notSet: "Non defini",
    page: "Page",
    of: "sur",
    previous: "Retour",
    next: "Suivant",
    rows: "lignes",
    selectedView: "Vue filtree",
    totalRecords: "Total dossiers",
    activeRecords: "Dossiers actifs",
    users: "Utilisateurs",
    items: "Articles",
    locations: "Lieux",
    partners: "Partenaires",
    revenue: "Revenu paye",
    currency: "Devise",
    language: "Langue",
    timezone: "Fuseau",
    fiscal: "Exercice",
    inventoryStart: "Depart stock",
    updated: "Mis a jour",
    copiedTitle: "ID organisation copie",
    copiedBody: "L'identifiant de l'organisation est pret a coller.",
    copyFailedTitle: "Copie echouee",
    copyFailedBody: "Le navigateur n'a pas pu copier l'identifiant.",
    exportTitle: "Table organisation exportee",
    exportBody: "La vue filtree a ete exportee en CSV.",
    profileFocusTitle: "Flux profil pret",
    profileFocusBody: "Le formulaire organisation est affiche pour modification.",
    createDialogTitle: "Creer une organisation",
    createDialogBody: "Ajoutez une organisation avec ses parametres regionaux. La table se met a jour apres l'enregistrement.",
    requiredTitle: "Nom requis",
    requiredBody: "Saisissez le nom de l'organisation avant la creation.",
    cancel: "Annuler",
    fields: {
      name: "Nom de l'organisation",
      industry: "Secteur",
      country: "Pays",
      state: "Region ou province",
      address: "Adresse professionnelle",
      currency: "Devise par defaut",
      timezone: "Fuseau horaire",
      defaultLocale: "Langue par defaut",
    },
    placeholders: {
      name: "Acme Retail Group",
      industry: "Retail",
      country: "Cameroun",
      state: "Centre",
      address: "Rue, ville, code postal",
    },
    tableColumns: {
      organization: "Organisation",
      region: "Region",
      defaults: "Parametres",
      footprint: "Empreinte",
      commerce: "Commerce",
      calendar: "Calendrier",
      status: "Statut",
      actions: "Actions",
    },
  },
} as const

function formatNumber(value: number, locale: Locale) {
  return new Intl.NumberFormat(locale === "fr" ? "fr-FR" : "en-US").format(value)
}

function formatCurrency(value: number, currency: string, locale: Locale) {
  try {
    return new Intl.NumberFormat(locale === "fr" ? "fr-FR" : "en-US", {
      style: "currency",
      currency,
      maximumFractionDigits: 0,
    }).format(value)
  } catch {
    return `${currency} ${formatNumber(value, locale)}`
  }
}

function formatDate(value: Date | string | null | undefined, locale: Locale, fallback: string) {
  if (!value) return fallback
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return fallback
  return new Intl.DateTimeFormat(locale === "fr" ? "fr-FR" : "en-US", { dateStyle: "medium" }).format(date)
}

function normalizeLocaleLabel(value: OrganizationManagementRow["defaultLocale"], locale: Locale) {
  const normalized = String(value).toLowerCase()
  if (normalized === "fr") {
    return locale === "fr" ? "Francais" : "French"
  }
  return locale === "fr" ? "Anglais" : "English"
}

function getInitials(name: string) {
  return name
    .split(/\s+/)
    .filter(Boolean)
    .map((part) => part[0])
    .join("")
    .slice(0, 2)
    .toUpperCase() || "SF"
}

function getDefaultCreateForm(locale: Locale): CreateOrganizationFormState {
  return {
    name: "",
    industry: "",
    country: "",
    state: "",
    address: "",
    currency: "XAF",
    timezone: "Africa/Douala",
    defaultLocale: locale,
  }
}

function escapeCsv(value: string | number | boolean | null | undefined) {
  const text = String(value ?? "")
  return `"${text.replace(/"/g, '""')}"`
}

function SortIcon({ sorted }: { sorted: false | "asc" | "desc" }) {
  return <ChevronsUpDown className={cn("h-3.5 w-3.5", sorted ? "text-[var(--dash-brand-strong)]" : "text-[var(--dash-text-faint)]")} />
}

export default function OrganizationManagementTable({
  organizationId,
  locale = "en",
}: OrganizationManagementTableProps) {
  const t = copy[locale]
  const notifications = useNotifications()
  const [search, setSearch] = useState("")
  const [statusFilter, setStatusFilter] = useState<StatusFilter>("all")
  const [sorting, setSorting] = useState<SortingState>([])
  const [columnVisibility, setColumnVisibility] = useState<VisibilityState>({})
  const [createOpen, setCreateOpen] = useState(false)
  const [createForm, setCreateForm] = useState<CreateOrganizationFormState>(() => getDefaultCreateForm(locale))

  const {
    data = [],
    isLoading,
    isFetching,
    isError,
    error,
    refetch,
  } = useOrganizationManagementRows(organizationId)
  const createOrganizationMutation = useCreateOrganizationSettings(organizationId, locale)

  const filteredData = useMemo(() => {
    const query = search.trim().toLowerCase()

    return data.filter((row) => {
      const matchesStatus =
        statusFilter === "all" ||
        (statusFilter === "active" && row.isActive) ||
        (statusFilter === "inactive" && !row.isActive)

      if (!matchesStatus) return false
      if (!query) return true

      return [
        row.name,
        row.slug,
        row.industry,
        row.country,
        row.state,
        row.address,
        row.currency,
        row.timezone,
        row.defaultLocale,
        row.fiscalYearStart,
      ]
        .filter(Boolean)
        .join(" ")
        .toLowerCase()
        .includes(query)
    })
  }, [data, search, statusFilter])

  const summary = useMemo(() => {
    const activeRecords = data.filter((row) => row.isActive).length
    const usersCount = data.reduce((sum, row) => sum + row.usersCount, 0)
    const itemsCount = data.reduce((sum, row) => sum + row.itemsCount, 0)
    const locationsCount = data.reduce((sum, row) => sum + row.locationsCount, 0)
    const partnersCount = data.reduce((sum, row) => sum + row.customersCount + row.suppliersCount, 0)
    const paidRevenue = data.reduce((sum, row) => sum + row.paidRevenue, 0)
    const currency = data[0]?.currency ?? "XAF"

    return {
      activeRecords,
      usersCount,
      itemsCount,
      locationsCount,
      partnersCount,
      paidRevenue,
      currency,
    }
  }, [data])

  const focusProfile = useCallback(() => {
    document.getElementById("organization-profile")?.scrollIntoView({ behavior: "smooth", block: "start" })
    notifications.info(t.profileFocusTitle, t.profileFocusBody)
  }, [notifications, t.profileFocusBody, t.profileFocusTitle])

  const updateCreateField = <K extends keyof CreateOrganizationFormState>(
    field: K,
    value: CreateOrganizationFormState[K],
  ) => {
    setCreateForm((current) => ({ ...current, [field]: value }))
  }

  const submitCreateOrganization = async () => {
    if (!createForm.name.trim()) {
      notifications.warning(t.requiredTitle, t.requiredBody)
      return
    }

    try {
      await createOrganizationMutation.mutateAsync({
        name: createForm.name,
        industry: createForm.industry,
        country: createForm.country,
        state: createForm.state,
        address: createForm.address,
        currency: createForm.currency,
        timezone: createForm.timezone,
        defaultLocale: createForm.defaultLocale,
      })
      setCreateOpen(false)
      setCreateForm(getDefaultCreateForm(locale))
    } catch {
      // The mutation hook sends the localized notification.
    }
  }

  const copyOrganizationId = useCallback(async (row: OrganizationManagementRow) => {
    try {
      await navigator.clipboard.writeText(row.id)
      notifications.success(t.copiedTitle, t.copiedBody)
    } catch {
      notifications.error(t.copyFailedTitle, t.copyFailedBody)
    }
  }, [notifications, t.copiedBody, t.copiedTitle, t.copyFailedBody, t.copyFailedTitle])

  const exportRows = () => {
    const headers = [
      "id",
      "name",
      "slug",
      "industry",
      "country",
      "state",
      "currency",
      "timezone",
      "defaultLocale",
      "isActive",
      "usersCount",
      "itemsCount",
      "locationsCount",
      "suppliersCount",
      "customersCount",
      "purchaseOrdersCount",
      "salesOrdersCount",
      "paymentsCount",
      "paidRevenue",
      "updatedAt",
    ]

    const csv = [
      headers.map(escapeCsv).join(","),
      ...filteredData.map((row) =>
        [
          row.id,
          row.name,
          row.slug,
          row.industry,
          row.country,
          row.state,
          row.currency,
          row.timezone,
          row.defaultLocale,
          row.isActive,
          row.usersCount,
          row.itemsCount,
          row.locationsCount,
          row.suppliersCount,
          row.customersCount,
          row.purchaseOrdersCount,
          row.salesOrdersCount,
          row.paymentsCount,
          row.paidRevenue,
          row.updatedAt instanceof Date ? row.updatedAt.toISOString() : row.updatedAt,
        ].map(escapeCsv).join(","),
      ),
    ].join("\n")

    const blob = new Blob([csv], { type: "text/csv;charset=utf-8" })
    const url = URL.createObjectURL(blob)
    const anchor = document.createElement("a")
    anchor.href = url
    anchor.download = `organization-management-${new Date().toISOString().slice(0, 10)}.csv`
    anchor.click()
    URL.revokeObjectURL(url)
    notifications.success(t.exportTitle, t.exportBody)
  }

  const columns = useMemo<ColumnDef<OrganizationManagementRow>[]>(() => [
    {
      accessorKey: "name",
      header: ({ column }) => (
        <HeaderButton onClick={() => column.toggleSorting(column.getIsSorted() === "asc")}>
          {t.tableColumns.organization}
          <SortIcon sorted={column.getIsSorted()} />
        </HeaderButton>
      ),
      cell: ({ row }) => {
        const organization = row.original

        return (
          <div className="flex min-w-[16rem] items-center gap-3">
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg border border-[var(--dash-border-subtle)] bg-[var(--dash-brand-soft)] text-sm font-semibold text-[var(--dash-brand-strong)]">
              {getInitials(organization.name)}
            </div>
            <div className="min-w-0">
              <div className="truncate font-semibold text-[var(--dash-text)]">{organization.name}</div>
              <div className="mt-1 flex flex-wrap items-center gap-2 text-xs text-[var(--dash-text-soft)]">
                <span className="max-w-[11rem] truncate">{organization.slug}</span>
                {organization.industry ? (
                  <Badge variant="outline" className="dashboard-filter-chip rounded-lg text-[0.7rem]">
                    {organization.industry}
                  </Badge>
                ) : null}
              </div>
            </div>
          </div>
        )
      },
    },
    {
      id: "region",
      accessorFn: (row) => row.country ?? "",
      header: ({ column }) => (
        <HeaderButton onClick={() => column.toggleSorting(column.getIsSorted() === "asc")}>
          {t.tableColumns.region}
          <SortIcon sorted={column.getIsSorted()} />
        </HeaderButton>
      ),
      cell: ({ row }) => {
        const organization = row.original

        return (
          <div className="min-w-[13rem] space-y-1 text-sm">
            <div className="flex items-center gap-2 font-medium text-[var(--dash-text)]">
              <MapPin className="h-3.5 w-3.5 text-[var(--dash-spruce)]" />
              <span>{[organization.country, organization.state].filter(Boolean).join(", ") || t.notSet}</span>
            </div>
            <div className="line-clamp-2 text-xs leading-5 text-[var(--dash-text-soft)]">
              {organization.address || t.notSet}
            </div>
          </div>
        )
      },
    },
    {
      id: "defaults",
      accessorFn: (row) => row.currency,
      header: ({ column }) => (
        <HeaderButton onClick={() => column.toggleSorting(column.getIsSorted() === "asc")}>
          {t.tableColumns.defaults}
          <SortIcon sorted={column.getIsSorted()} />
        </HeaderButton>
      ),
      cell: ({ row }) => {
        const organization = row.original

        return (
          <div className="min-w-[13rem] space-y-2 text-xs">
            <InlineValue icon={WalletCards} label={t.currency} value={organization.currency} tone="gold" />
            <InlineValue icon={Globe2} label={t.language} value={normalizeLocaleLabel(organization.defaultLocale, locale)} tone="brand" />
            <InlineValue icon={CalendarDays} label={t.timezone} value={organization.timezone} tone="spruce" />
          </div>
        )
      },
    },
    {
      id: "footprint",
      accessorFn: (row) => row.usersCount + row.itemsCount + row.locationsCount,
      header: ({ column }) => (
        <HeaderButton onClick={() => column.toggleSorting(column.getIsSorted() === "asc")}>
          {t.tableColumns.footprint}
          <SortIcon sorted={column.getIsSorted()} />
        </HeaderButton>
      ),
      cell: ({ row }) => {
        const organization = row.original

        return (
          <div className="grid min-w-[12rem] grid-cols-2 gap-2">
            <MetricPill icon={Users} label={t.users} value={organization.usersCount} locale={locale} />
            <MetricPill icon={Package} label={t.items} value={organization.itemsCount} locale={locale} />
            <MetricPill icon={MapPin} label={t.locations} value={organization.locationsCount} locale={locale} />
            <MetricPill icon={Truck} label={t.partners} value={organization.customersCount + organization.suppliersCount} locale={locale} />
          </div>
        )
      },
    },
    {
      id: "commerce",
      accessorFn: (row) => row.paidRevenue,
      header: ({ column }) => (
        <HeaderButton onClick={() => column.toggleSorting(column.getIsSorted() === "asc")}>
          {t.tableColumns.commerce}
          <SortIcon sorted={column.getIsSorted()} />
        </HeaderButton>
      ),
      cell: ({ row }) => {
        const organization = row.original

        return (
          <div className="min-w-[13rem] space-y-2">
            <div className="font-semibold text-[var(--dash-text)]">
              {formatCurrency(organization.paidRevenue, organization.currency, locale)}
            </div>
            <div className="flex flex-wrap gap-2 text-xs">
              <CountBadge icon={ShoppingCart} value={organization.salesOrdersCount} label="SO" locale={locale} />
              <CountBadge icon={Truck} value={organization.purchaseOrdersCount} label="PO" locale={locale} />
              <CountBadge icon={WalletCards} value={organization.paymentsCount} label="Pay" locale={locale} />
            </div>
          </div>
        )
      },
    },
    {
      id: "calendar",
      accessorFn: (row) => row.updatedAt,
      header: ({ column }) => (
        <HeaderButton onClick={() => column.toggleSorting(column.getIsSorted() === "asc")}>
          {t.tableColumns.calendar}
          <SortIcon sorted={column.getIsSorted()} />
        </HeaderButton>
      ),
      cell: ({ row }) => {
        const organization = row.original

        return (
          <div className="min-w-[12rem] space-y-1 text-xs text-[var(--dash-text-soft)]">
            <div className="font-medium text-[var(--dash-text)]">{t.fiscal}: {organization.fiscalYearStart || t.notSet}</div>
            <div>{t.inventoryStart}: {formatDate(organization.inventoryStartDate, locale, t.notSet)}</div>
            <div>{t.updated}: {formatDate(organization.updatedAt, locale, t.notSet)}</div>
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
        const organization = row.original

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
              {organization.id === organizationId ? (
                <DropdownMenuItem onClick={focusProfile}>
                  <Edit3 className="h-4 w-4" />
                  {t.editProfile}
                </DropdownMenuItem>
              ) : null}
              <DropdownMenuItem onClick={() => copyOrganizationId(organization)}>
                <Copy className="h-4 w-4" />
                {t.copyId}
              </DropdownMenuItem>
              {organization.id === organizationId ? (
                <>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem asChild>
                    <Link href={dashboardPath("settings", "users")} locale={locale}>
                      <Users className="h-4 w-4" />
                      {t.openUsers}
                      <ExternalLink className="ms-auto h-3 w-3" />
                    </Link>
                  </DropdownMenuItem>
                  <DropdownMenuItem asChild>
                    <Link href={dashboardPath("settings", "locations")} locale={locale}>
                      <MapPin className="h-4 w-4" />
                      {t.openLocations}
                      <ExternalLink className="ms-auto h-3 w-3" />
                    </Link>
                  </DropdownMenuItem>
                  <DropdownMenuItem asChild>
                    <Link href={dashboardPath("settings", "roles")} locale={locale}>
                      <ShieldCheck className="h-4 w-4" />
                      {t.openRoles}
                      <ExternalLink className="ms-auto h-3 w-3" />
                    </Link>
                  </DropdownMenuItem>
                  <DropdownMenuItem asChild>
                    <Link href={dashboardPath("inventory", "items")} locale={locale}>
                      <Package className="h-4 w-4" />
                      {t.openItems}
                      <ExternalLink className="ms-auto h-3 w-3" />
                    </Link>
                  </DropdownMenuItem>
                </>
              ) : null}
            </DropdownMenuContent>
          </DropdownMenu>
        )
      },
    },
  ], [copyOrganizationId, focusProfile, locale, organizationId, t])

  const table = useReactTable({
    data: filteredData,
    columns,
    state: {
      sorting,
      columnVisibility,
    },
    onSortingChange: setSorting,
    onColumnVisibilityChange: setColumnVisibility,
    getCoreRowModel: getCoreRowModel(),
    getFilteredRowModel: getFilteredRowModel(),
    getSortedRowModel: getSortedRowModel(),
    getPaginationRowModel: getPaginationRowModel(),
    initialState: {
      pagination: {
        pageSize: 5,
      },
    },
  })

  if (isLoading) {
    return (
      <section className="dashboard-glass-panel rounded-lg p-6 text-[var(--dash-text)]">
        <div className="flex min-h-64 flex-col items-center justify-center gap-4 text-center">
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
        <div className="flex min-h-64 flex-col items-center justify-center gap-4 text-center">
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
        <div className="flex min-w-0 flex-col gap-4 xl:flex-row xl:items-start xl:justify-between">
          <div className="min-w-0">
            <div className="dashboard-eyebrow mb-4">
              <span className="dashboard-live-dot" />
              {t.eyebrow}
            </div>
            <div className="flex min-w-0 items-start gap-4">
              <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-lg border border-[var(--dash-border-subtle)] bg-[var(--dash-spruce-soft)] shadow-[0_16px_34px_rgba(20,184,166,0.16)]">
                <Building2 className="h-6 w-6 text-[var(--dash-spruce)]" />
              </div>
              <div className="min-w-0">
                <h2 className="text-2xl font-semibold tracking-tight text-[var(--dash-text)]">
                  {t.title}
                </h2>
                <p className="mt-2 max-w-3xl text-sm leading-6 text-[var(--dash-text-soft)]">
                  {t.subtitle}
                </p>
              </div>
            </div>
          </div>
          <div className="grid grid-cols-2 gap-2 sm:grid-cols-4 xl:min-w-[32rem]">
            <SummaryTile label={t.totalRecords} value={data.length} locale={locale} tone="brand" />
            <SummaryTile label={t.activeRecords} value={summary.activeRecords} locale={locale} tone="success" />
            <SummaryTile label={t.users} value={summary.usersCount} locale={locale} tone="spruce" />
            <SummaryTile
              label={t.revenue}
              value={formatCurrency(summary.paidRevenue, summary.currency, locale)}
              tone="gold"
            />
          </div>
        </div>
      </div>

      <div className="space-y-4 p-5 sm:p-6">
        <div className="grid gap-3 lg:grid-cols-[minmax(0,1fr)_auto]">
          <div className="grid gap-3 sm:grid-cols-[minmax(0,1fr)_13rem]">
            <div className="relative min-w-0">
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
              </SelectContent>
            </Select>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <Button
              type="button"
              onClick={() => setCreateOpen(true)}
              className="dashboard-button-primary h-11 rounded-lg"
            >
              <Plus className="h-4 w-4" />
              {t.create}
            </Button>
            <Button
              type="button"
              variant="outline"
              onClick={() => refetch()}
              disabled={isFetching}
              className="dashboard-button-secondary h-11 rounded-lg"
            >
              <RefreshCw className={cn("h-4 w-4", isFetching && "animate-spin")} />
              {isFetching ? t.refreshing : t.refresh}
            </Button>
            <Button
              type="button"
              variant="outline"
              onClick={exportRows}
              disabled={filteredData.length === 0}
              className="dashboard-button-secondary h-11 rounded-lg"
            >
              <Download className="h-4 w-4" />
              {t.export}
            </Button>
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button type="button" variant="outline" className="dashboard-button-secondary h-11 rounded-lg">
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
        </div>

        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          <MiniMetric icon={Package} label={t.items} value={summary.itemsCount} locale={locale} />
          <MiniMetric icon={MapPin} label={t.locations} value={summary.locationsCount} locale={locale} />
          <MiniMetric icon={Truck} label={t.partners} value={summary.partnersCount} locale={locale} />
          <MiniMetric icon={SlidersHorizontal} label={t.selectedView} value={filteredData.length} locale={locale} />
        </div>

        <div className="overflow-hidden rounded-lg border border-[var(--dash-border-subtle)] bg-[rgba(12,20,24,0.35)]">
          <Table>
            <TableHeader className="bg-[rgba(16,27,32,0.84)]">
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
                    className="border-[var(--dash-border-subtle)] hover:bg-[var(--dash-brand-soft)]"
                  >
                    {row.getVisibleCells().map((cell) => (
                      <TableCell key={cell.id} className="px-4 py-4 align-top">
                        {flexRender(cell.column.columnDef.cell, cell.getContext())}
                      </TableCell>
                    ))}
                  </TableRow>
                ))
              ) : (
                <TableRow>
                  <TableCell colSpan={columns.length} className="h-48 text-center">
                    <div className="mx-auto flex max-w-sm flex-col items-center gap-3 text-[var(--dash-text-soft)]">
                      <div className="flex h-12 w-12 items-center justify-center rounded-lg bg-[var(--dash-brand-soft)] text-[var(--dash-brand-strong)]">
                        <Building2 className="h-6 w-6" />
                      </div>
                      <div>
                        <p className="font-semibold text-[var(--dash-text)]">{t.emptyTitle}</p>
                        <p className="mt-1 text-sm leading-6">{t.emptyBody}</p>
                      </div>
                      <Button
                        type="button"
                        onClick={() => setCreateOpen(true)}
                        className="dashboard-button-primary h-10 rounded-lg"
                      >
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

        <div className="flex flex-col gap-3 text-sm text-[var(--dash-text-soft)] sm:flex-row sm:items-center sm:justify-between">
          <div>
            {t.page} {table.getState().pagination.pageIndex + 1} {t.of} {Math.max(table.getPageCount(), 1)}
            <span className="ms-2">({formatNumber(filteredData.length, locale)} {t.rows})</span>
          </div>
          <div className="flex items-center gap-2">
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
        open={createOpen}
        onOpenChange={(open) => {
          setCreateOpen(open)
          if (!open && !createOrganizationMutation.isPending) {
            setCreateForm(getDefaultCreateForm(locale))
          }
        }}
      >
        <DialogContent className="dashboard-glass-panel max-h-[92vh] max-w-2xl overflow-y-auto rounded-lg border-[var(--dash-border-subtle)] text-[var(--dash-text)]">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-[var(--dash-text)]">
              <Building2 className="h-5 w-5 text-[var(--dash-brand-strong)]" />
              {t.createDialogTitle}
            </DialogTitle>
            <DialogDescription className="text-[var(--dash-text-soft)]">
              {t.createDialogBody}
            </DialogDescription>
          </DialogHeader>

          <form
            className="space-y-4"
            onSubmit={(event) => {
              event.preventDefault()
              submitCreateOrganization()
            }}
          >
            <div className="grid gap-4 sm:grid-cols-2">
              <CreateField label={t.fields.name} required>
                <Input
                  value={createForm.name}
                  onChange={(event) => updateCreateField("name", event.target.value)}
                  placeholder={t.placeholders.name}
                  className="dashboard-control h-11 rounded-lg"
                  autoComplete="organization"
                />
              </CreateField>
              <CreateField label={t.fields.industry}>
                <Input
                  value={createForm.industry}
                  onChange={(event) => updateCreateField("industry", event.target.value)}
                  placeholder={t.placeholders.industry}
                  className="dashboard-control h-11 rounded-lg"
                />
              </CreateField>
              <CreateField label={t.fields.country}>
                <Input
                  value={createForm.country}
                  onChange={(event) => updateCreateField("country", event.target.value)}
                  placeholder={t.placeholders.country}
                  className="dashboard-control h-11 rounded-lg"
                  autoComplete="country-name"
                />
              </CreateField>
              <CreateField label={t.fields.state}>
                <Input
                  value={createForm.state}
                  onChange={(event) => updateCreateField("state", event.target.value)}
                  placeholder={t.placeholders.state}
                  className="dashboard-control h-11 rounded-lg"
                  autoComplete="address-level1"
                />
              </CreateField>
              <CreateField label={t.fields.currency}>
                <Select value={createForm.currency} onValueChange={(value) => updateCreateField("currency", value)}>
                  <SelectTrigger className="dashboard-control h-11 rounded-lg">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent className="border-[var(--dash-border-subtle)] bg-[var(--dash-surface-raised)] text-[var(--dash-text)]">
                    {CURRENCIES.map((currency) => (
                      <SelectItem key={currency} value={currency}>
                        {currency}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </CreateField>
              <CreateField label={t.fields.defaultLocale}>
                <Select value={createForm.defaultLocale} onValueChange={(value) => updateCreateField("defaultLocale", value as Locale)}>
                  <SelectTrigger className="dashboard-control h-11 rounded-lg">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent className="border-[var(--dash-border-subtle)] bg-[var(--dash-surface-raised)] text-[var(--dash-text)]">
                    <SelectItem value="en">English</SelectItem>
                    <SelectItem value="fr">Francais</SelectItem>
                  </SelectContent>
                </Select>
              </CreateField>
            </div>

            <CreateField label={t.fields.timezone}>
              <Select value={createForm.timezone} onValueChange={(value) => updateCreateField("timezone", value)}>
                <SelectTrigger className="dashboard-control h-11 rounded-lg">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent className="border-[var(--dash-border-subtle)] bg-[var(--dash-surface-raised)] text-[var(--dash-text)]">
                  {TIMEZONES.map((timezone) => (
                    <SelectItem key={timezone} value={timezone}>
                      {timezone}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </CreateField>

            <CreateField label={t.fields.address}>
              <Textarea
                value={createForm.address}
                onChange={(event) => updateCreateField("address", event.target.value)}
                placeholder={t.placeholders.address}
                className="dashboard-control min-h-24 resize-none rounded-lg"
                autoComplete="street-address"
              />
            </CreateField>

            <DialogFooter className="gap-2 pt-2">
              <Button
                type="button"
                variant="outline"
                onClick={() => setCreateOpen(false)}
                disabled={createOrganizationMutation.isPending}
                className="dashboard-button-secondary h-10 rounded-lg"
              >
                {t.cancel}
              </Button>
              <Button
                type="submit"
                disabled={createOrganizationMutation.isPending}
                className="dashboard-button-primary h-10 rounded-lg"
              >
                {createOrganizationMutation.isPending ? (
                  <>
                    <Loader2 className="h-4 w-4 animate-spin" />
                    {t.creating}
                  </>
                ) : (
                  <>
                    <Plus className="h-4 w-4" />
                    {t.create}
                  </>
                )}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
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

function CreateField({
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
  label,
  value,
  locale,
  tone,
}: {
  label: string
  value: number | string
  locale?: Locale
  tone: "brand" | "success" | "spruce" | "gold"
}) {
  const color = {
    brand: "text-[var(--dash-brand-strong)] bg-[var(--dash-brand-soft)]",
    success: "text-[var(--dash-success)] bg-[var(--dash-success-soft)]",
    spruce: "text-[var(--dash-spruce)] bg-[var(--dash-spruce-soft)]",
    gold: "text-[var(--dash-gold)] bg-[var(--dash-gold-soft)]",
  }[tone]

  return (
    <div className="rounded-lg border border-[var(--dash-border-subtle)] bg-[rgba(37,57,67,0.46)] p-3">
      <div className={cn("mb-3 h-1 w-10 rounded-full", color)} />
      <p className="text-xs text-[var(--dash-text-faint)]">{label}</p>
      <p className="mt-1 truncate text-xl font-semibold text-[var(--dash-text)]">
        {typeof value === "number" ? formatNumber(value, locale ?? "en") : value}
      </p>
    </div>
  )
}

function MiniMetric({
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
    <div className="flex items-center gap-3 rounded-lg border border-[var(--dash-border-subtle)] bg-[rgba(37,57,67,0.38)] p-3">
      <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-[var(--dash-spruce-soft)] text-[var(--dash-spruce)]">
        <Icon className="h-4 w-4" />
      </div>
      <div className="min-w-0">
        <p className="truncate text-xs text-[var(--dash-text-faint)]">{label}</p>
        <p className="text-lg font-semibold text-[var(--dash-text)]">{formatNumber(value, locale)}</p>
      </div>
    </div>
  )
}

function MetricPill({
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
    <div className="rounded-lg border border-[var(--dash-border-subtle)] bg-[rgba(37,57,67,0.4)] p-2">
      <div className="flex items-center gap-1.5 text-[var(--dash-text-soft)]">
        <Icon className="h-3.5 w-3.5 text-[var(--dash-spruce)]" />
        <span className="truncate text-[0.7rem]">{label}</span>
      </div>
      <div className="mt-1 text-sm font-semibold text-[var(--dash-text)]">{formatNumber(value, locale)}</div>
    </div>
  )
}

function CountBadge({
  icon: Icon,
  value,
  label,
  locale,
}: {
  icon: LucideIcon
  value: number
  label: string
  locale: Locale
}) {
  return (
    <Badge variant="outline" className="rounded-lg border-[var(--dash-border-subtle)] bg-[rgba(37,57,67,0.38)] text-[var(--dash-text-soft)]">
      <Icon className="me-1 h-3 w-3 text-[var(--dash-gold)]" />
      {label}: {formatNumber(value, locale)}
    </Badge>
  )
}

function InlineValue({
  icon: Icon,
  label,
  value,
  tone,
}: {
  icon: LucideIcon
  label: string
  value: string
  tone: "brand" | "spruce" | "gold"
}) {
  const color = {
    brand: "text-[var(--dash-brand-strong)] bg-[var(--dash-brand-soft)]",
    spruce: "text-[var(--dash-spruce)] bg-[var(--dash-spruce-soft)]",
    gold: "text-[var(--dash-gold)] bg-[var(--dash-gold-soft)]",
  }[tone]

  return (
    <div className="flex min-w-0 items-center gap-2">
      <span className={cn("flex h-7 w-7 shrink-0 items-center justify-center rounded-lg", color)}>
        <Icon className="h-3.5 w-3.5" />
      </span>
      <span className="min-w-0">
        <span className="block text-[0.68rem] text-[var(--dash-text-faint)]">{label}</span>
        <span className="block truncate font-medium text-[var(--dash-text)]">{value}</span>
      </span>
    </div>
  )
}
