"use client"

import { useEffect, useMemo, useRef, useState } from "react"
import { readPendingSale, removePendingSale, savePendingSale, type PendingSale } from "@/lib/pos/pending-sale"
import { usePOSCheckoutLifecycle } from "@/hooks/posHooks/usePOSCheckoutLifecycle"
import { retainLegacyPOSCheckoutAction } from "@/actions/pos/checkout.actions"
import type { getPOSSaleCommitStatus } from "@/services/pos/pos.service"
import { useLocale, useTranslations } from "next-intl"
import { usePermissions } from "@/hooks/usePermissions"
import { DashboardErrorState } from "@/components/dashboard/DashboardErrorState"
import { DashboardRouteState } from "@/components/dashboard/DashboardRouteState"
import {
  AlertTriangle,
  Banknote,
  Barcode,
  Boxes,
  CheckCircle2,
  Clock,
  ClipboardList,
  CreditCard,
  Eye,
  Heart,
  ImageIcon,
  LayoutGrid,
  List,
  Monitor,
  PackageCheck,
  PauseCircle,
  Plus,
  Printer,
  Receipt,
  Search,
  ShieldCheck,
  Smartphone,
  Star,
  Tag,
  Trash2,
  UserRound,
  UsersRound,
  Wallet,
  Wifi,
} from "lucide-react"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import type { ButtonProps } from "@/components/ui/button"
import { Checkbox } from "@/components/ui/checkbox"
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import { Progress } from "@/components/ui/progress"
import { ScrollArea, ScrollBar } from "@/components/ui/scroll-area"
import { Separator } from "@/components/ui/separator"
import { Textarea } from "@/components/ui/textarea"
import { useNotifications } from "@/components/notifications/NotificationProvider"
import { OfflineSyncStatusStrip } from "@/components/pos/offline/OfflineSyncStatusStrip"
import { ReceiptTokenHistoryPanel, type ReceiptTokenSaleSearchItem } from "@/components/pos/ReceiptTokenHistoryPanel"
import { ReceiptTokenControlStrip, type ReceiptTokenControlItem } from "@/components/pos/ReceiptTokenControlStrip"
import { currencyFractionDigits } from "@/lib/i18n/organization-money"
import { cn } from "@/lib/utils"
import {
  receiptChannelRequiresDestination,
  receiptDestinationKind,
  type ReceiptChannel,
} from "@/services/pos/receipt-channels"
import {
  useActivePOSCart,
  useActivePOSShift,
  useAddPOSCartLine,
  useClosePOSShift,
  useCommitPOSSale,
  usePOSSaleCommitStatus,
  useCurrentUserPOSShift,
  useOpenPOSShift,
  usePOSCatalog,
  usePOSCustomers,
  usePOSLocations,
  usePOSTerminals,
  usePublicReceiptAccessTokens,
  usePublicReceiptSalesSearch,
  usePublicReceiptTokenManagementCapability,
  useRemovePOSCartLine,
  useRevokePublicReceiptAccessToken,
  useUpdatePOSCartLine,
} from "@/hooks/posHooks/usePosOperations"

type ActionResponse<T> = { success: true; data: T; error: null } | { success: false; data: null; error: string }

type TenderMethod = "CASH" | "CARD" | "MOBILE_MONEY" | "BANK_TRANSFER" | "STORE_CREDIT" | "ON_ACCOUNT"

type CatalogView = "all" | "favorites" | "recent"

type CommitSaleResult = {
  clientCommitId: string
  resultSchemaVersion: 1
  replayed: boolean
  saleId: string
  orderNumber: string
  status: string
  paymentStatus: string
  total: number
  amountPaid: number
  onAccountAmount: number
  changeDue: number
  accountingMovements?: {
    saleJournalEntry: {
      id: string
      entryNumber: string
      postingBatchId?: string | null
    }
    paymentJournalEntries: Array<{
      id: string
      entryNumber: string
    }>
    entries: Array<{
      account: string
      debit: number
      credit: number
    }>
    totalDebits: number
    totalCredits: number
  }
  fiscalDocument?: {
    id: string
    status: string
    authorityChannel: string | null
  } | null
  receipt?: ({ digitalReceiptUrl?: string | null } & Record<string, unknown>) | null
  receiptStatus?: "READY" | "RETRY_REQUIRED"
  delivery: {
    channel: ReceiptChannel
    status: string
    message: string
    digitalReceiptUrl?: string | null
  } | null
}

type CatalogItem = {
  id: string
  sku: string
  barcode: string | null
  nameEn: string
  nameFr: string | null
  thumbnail: string | null
  sellingPrice: number
  trackInventory: boolean
  brand?: { nameEn: string; nameFr: string | null } | null
  category?: { id: string; titleEn: string; titleFr: string | null } | null
  stock: {
    quantityOnHand: number
    quantityAvailable: number
    reorderPoint: number
    status: string
  }
}

type POSCustomer = {
  id: string
  name: string
  code: string | null
  email: string | null
  phone: string | null
  creditLimit: number | null
  isActive: boolean
  totalOrders: number
  totalRevenue: number
}

type TenderLineState = {
  id: string
  method: TenderMethod
  amount: string
  paymentTransactionId: string
}

type TenderPreview = {
  tenders: Array<{ method: TenderMethod; amount: number; paymentTransactionId?: string }>
  totalTendered: number
  paid: number
  due: number
  change: number
  hasNonCashOverpay: boolean
}

function unwrap<T>(response: ActionResponse<T> | undefined | null, fallback: T): T {
  return response?.success ? response.data : fallback
}

function firstLocationId(locations: Array<{ id: string; isDefault?: boolean }>) {
  return locations.find((location) => location.isDefault)?.id || locations[0]?.id || ""
}

function stockBadgeVariant(status: string) {
  if (status === "out") return "destructive" as const
  if (status === "low") return "secondary" as const
  return "outline" as const
}

function localizedName(entity: { nameEn?: string; nameFr?: string | null; titleEn?: string; titleFr?: string | null }, locale: string) {
  if (locale === "fr") return entity.nameFr || entity.titleFr || entity.nameEn || entity.titleEn || ""
  return entity.nameEn || entity.titleEn || entity.nameFr || entity.titleFr || ""
}

function stockProgress(item: CatalogItem, displayedOnHand: number) {
  if (!item.trackInventory || item.stock.status === "not_tracked") return 100
  const reorderPoint = Math.max(1, Number(item.stock.reorderPoint || 8))
  return Math.min(100, Math.round((Math.max(0, displayedOnHand) / Math.max(reorderPoint * 2, displayedOnHand, 1)) * 100))
}

function customerInitials(name: string) {
  return name
    .split(" ")
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase())
    .join("") || "C"
}

function uniqueTenderAmounts(amounts: number[]) {
  return Array.from(new Set(amounts.map((amount) => Number(amount.toFixed(2))).filter((amount) => Number.isFinite(amount) && amount > 0)))
}

function cashTenderOptions(total: number) {
  if (total <= 0) return []

  return uniqueTenderAmounts([
    total,
    Math.ceil(total / 5) * 5,
    Math.ceil(total / 10) * 10,
    Math.ceil(total / 20) * 20,
    Math.ceil(total / 50) * 50,
  ]).slice(0, 4)
}

function createTenderLine(method: TenderMethod = "CASH", amount = ""): TenderLineState {
  return {
    id: `tender-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
    method,
    amount,
    paymentTransactionId: "",
  }
}

function isElectronicTenderMethod(method: TenderMethod) {
  return method === "CARD" || method === "MOBILE_MONEY" || method === "BANK_TRANSFER"
}

function parseTenderAmount(value: string) {
  const parsed = Number(value)
  return Number.isFinite(parsed) && parsed > 0 ? parsed : 0
}

function previewTenders(lines: TenderLineState[], total: number): TenderPreview {
  const normalizedLines = lines
    .map((line) => ({
      method: line.method,
      amount: lines.length === 1 && line.amount.trim() === "" ? total : parseTenderAmount(line.amount),
      paymentTransactionId: line.paymentTransactionId.trim() || undefined,
    }))
    .filter((line) => line.amount > 0)

  let remaining = total
  let change = 0
  let paid = 0
  let hasNonCashOverpay = false

  for (const line of normalizedLines) {
    if (remaining <= 0) {
      if (line.method !== "CASH") hasNonCashOverpay = true
      change += line.method === "CASH" ? line.amount : 0
      continue
    }

    if (line.method === "CASH") {
      const applied = Math.min(line.amount, remaining)
      paid += applied
      change += Math.max(0, line.amount - remaining)
      remaining = Math.max(0, remaining - applied)
      continue
    }

    if (line.amount > remaining) {
      hasNonCashOverpay = true
    }

    paid += Math.min(line.amount, remaining)
    remaining = Math.max(0, remaining - line.amount)
  }

  return {
    tenders: normalizedLines.map((line) => ({
      method: line.method,
      amount: line.amount,
      paymentTransactionId: line.paymentTransactionId,
    })),
    totalTendered: normalizedLines.reduce((sum, line) => sum + line.amount, 0),
    paid: Math.min(paid, total),
    due: Math.max(0, total - paid),
    change,
    hasNonCashOverpay,
  }
}

function actionError(response: unknown) {
  if (typeof response === "object" && response !== null && "success" in response && response.success === false) {
    return String((response as { error?: unknown }).error || "Unknown error")
  }

  return null
}

function toErrorMessage(error: unknown, fallback: string) {
  if (error instanceof Error) return error.message
  if (typeof error === "string") return error
  return fallback
}

const tenderMethods: TenderMethod[] = ["CASH"]
const receiptChannels: ReceiptChannel[] = ["NONE"]
const posSurfaceClass =
  "dashboard-glass-panel overflow-hidden rounded-lg text-[var(--dash-text)]"
const posPanelClass =
  "rounded-lg border border-[var(--dash-border-subtle)] bg-[rgba(24,38,45,0.68)] text-[var(--dash-text)] shadow-[inset_0_1px_0_rgba(255,255,255,0.055)]"
const posInsetClass =
  "rounded-lg border border-[var(--dash-border-subtle)] bg-[rgba(37,57,67,0.54)] text-[var(--dash-text)] shadow-sm"
const posFieldClass =
  "dashboard-control rounded-lg placeholder:text-[var(--dash-text-faint)] focus-visible:ring-[var(--dash-brand)]/25 disabled:cursor-not-allowed disabled:opacity-60"
const posSelectClass =
  "mt-1 h-10 w-full rounded-lg border border-[var(--dash-border-subtle)] bg-[rgba(24,38,45,0.92)] px-3 text-sm text-[var(--dash-text)] shadow-sm outline-none transition [color-scheme:dark] focus:border-[var(--dash-brand)] focus:ring-2 focus:ring-[var(--dash-brand)]/20 disabled:cursor-not-allowed disabled:opacity-60 [&>option]:bg-[#1f3139] [&>option]:text-[#f7faf8]"
const posLabelClass = "block text-xs font-semibold uppercase tracking-[0.08em] text-[var(--dash-text-soft)]"
const posMutedTextClass = "text-[var(--dash-text-soft)]"
const posDividerClass = "border-[var(--dash-border-subtle)]"
const posDialogClass = "enterprise-floating-surface border-[var(--dash-border-subtle)] text-[var(--dash-text)] shadow-[0_28px_80px_rgba(5,12,16,0.38)]"
const posDialogHeaderClass = "border-b border-[var(--dash-border-subtle)] bg-[rgba(12,20,24,0.58)] px-5 py-4"
const posButtonBaseClass = "font-semibold tracking-normal disabled:cursor-not-allowed disabled:opacity-60"
const posButtonClass =
  "dashboard-button-secondary rounded-lg shadow-sm transition focus-visible:!ring-[var(--dash-brand)]/30 disabled:!border-[var(--dash-border-subtle)] disabled:!bg-[rgba(24,38,45,0.62)] disabled:!text-[var(--dash-text-faint)]"
const posButtonActiveClass =
  "rounded-lg border !border-[var(--dash-spruce)]/70 !bg-[rgba(45,212,191,0.18)] !text-white shadow-[0_14px_32px_rgba(45,212,191,0.16)] ring-2 ring-[var(--dash-spruce)]/20 hover:!border-[var(--dash-spruce)] hover:!bg-[rgba(45,212,191,0.24)] hover:!text-white"
const posButtonDangerClass =
  "rounded-lg border !border-[var(--dash-danger)]/45 !bg-[var(--dash-danger-soft)] !text-[#ffd4db] shadow-sm hover:!border-[var(--dash-danger)]/65 hover:!bg-[rgba(239,106,106,0.22)] hover:!text-white"
const posButtonPrimaryClass =
  "dashboard-button-primary rounded-lg !text-white shadow-[0_18px_42px_rgba(47,125,246,0.28)] hover:!text-white disabled:!bg-none disabled:!border-[var(--dash-border-subtle)] disabled:!bg-[rgba(24,38,45,0.72)] disabled:!text-[var(--dash-text-faint)]"
const posChipClass =
  "dashboard-filter-chip !border-[var(--dash-spruce)]/35 !bg-[var(--dash-spruce-soft)] !text-[#d9fffb]"
const posCountChipClass =
  "dashboard-filter-chip !text-[var(--dash-text-muted)]"
const posIconBrandClass = "text-[var(--dash-brand-strong)]"
const posIconSpruceClass = "text-[var(--dash-spruce)]"
const posInfoPillClass = "rounded-lg bg-[var(--dash-brand-soft)] px-2 py-1 text-[#cfe8ff]"
const posSuccessPillClass = "rounded-lg bg-[var(--dash-spruce-soft)] px-2 py-1 text-[#d9fffb]"
const posWarningPillClass = "rounded-lg bg-[var(--dash-warning-soft)] px-2 py-1 text-[#ffe4a8]"
const posEmptyClass = "rounded-lg border border-dashed border-[var(--dash-border-subtle)] bg-[rgba(37,57,67,0.36)] p-8 text-center text-[var(--dash-text-soft)] shadow-sm"
const posProductCardClass =
  "group relative overflow-hidden rounded-lg border border-[var(--dash-border-subtle)] bg-[rgba(29,45,53,0.72)] p-3 text-[var(--dash-text)] shadow-[0_18px_48px_rgba(5,12,16,0.20)] transition hover:-translate-y-0.5 hover:border-[var(--dash-border)] hover:bg-[rgba(37,57,67,0.86)]"
const posProductSelectedClass =
  "border-[var(--dash-spruce)]/70 bg-[rgba(45,212,191,0.12)] ring-1 ring-[var(--dash-spruce)]/25"
const posMetricSpruceClass = "rounded-lg border border-[var(--dash-spruce)]/25 bg-[var(--dash-spruce-soft)] px-2 py-1.5"
const posMetricBrandClass = "rounded-lg border border-[var(--dash-brand)]/25 bg-[var(--dash-brand-soft)] px-2 py-1.5"
const posMetricGoldClass = "rounded-lg border border-[var(--dash-gold)]/25 bg-[var(--dash-gold-soft)] px-2 py-1.5"
const posMetricRowClass = "flex min-w-0 items-center justify-between gap-2"
const posMetricLabelClass = "min-w-0 truncate text-[10px] font-medium leading-none"
const posMetricValueClass = "shrink-0 text-base font-bold leading-none tabular-nums"

function POSButton({ className, variant: _variant, ...buttonProps }: ButtonProps) {
  void _variant

  return <Button {...buttonProps} variant={null as ButtonProps["variant"]} className={cn(posButtonBaseClass, className)} />
}

export default function ProfessionalPOSSystem() {
  const { user, organizationId } = usePermissions()
  const scope = useRef({ actorId: user?.id, organizationId })
  if (scope.current.actorId !== user?.id || organizationId) scope.current = { actorId: user?.id, organizationId }
  return <POSWorkspace key={`${scope.current.actorId ?? "signed-out"}:${scope.current.organizationId ?? "unknown"}`} />
}

function POSWorkspace() {
  const t = useTranslations("pos")
  const { user, organizationId, hasPermission } = usePermissions()
  const locale = useLocale()
  const notifications = useNotifications()
  const searchRef = useRef<HTMLInputElement>(null)
  const customerSearchRef = useRef<HTMLInputElement>(null)
  const tenderAmountRef = useRef<HTMLInputElement>(null)
  const currentShiftDefaultAppliedRef = useRef(false)
  const previousCustomerLocationIdRef = useRef("")
  const [pendingCommit, setPendingCommit] = useState<PendingSale | null>(null)
  const [pendingLoaded, setPendingLoaded] = useState(false)
  const [pendingStorageError, setPendingStorageError] = useState(false)
  const [commitRecovery, setCommitRecovery] = useState<Awaited<ReturnType<typeof getPOSSaleCommitStatus>> | null>(null)
  const [commitRecoveryError, setCommitRecoveryError] = useState<"failed" | "cartMismatch" | null>(null)
  const submissionInFlight = useRef(false)
  const recoveryPanelRef = useRef<HTMLElement>(null)
  const pendingCommitId = pendingCommit?.request.clientCommitId
  const [reviewingChangedCart, setReviewingChangedCart] = useState(false)
  const settledCommitIds = useRef(new Set<string>())
  useEffect(() => {
    if (!pendingLoaded || !pendingCommitId) return
    recoveryPanelRef.current?.focus({ preventScroll: true })
    recoveryPanelRef.current?.scrollIntoView?.({ block: "start", behavior: "instant" })
  }, [pendingLoaded, pendingCommitId])
  const [selectedLocationId, setSelectedLocationId] = useState("")
  const [selectedTerminalId, setSelectedTerminalId] = useState("")
  const [selectedCategoryId, setSelectedCategoryId] = useState("")
  const [selectedCustomerId, setSelectedCustomerId] = useState("")
  const [selectedProductId, setSelectedProductId] = useState("")
  const [catalogView, setCatalogView] = useState<CatalogView>("all")
  const [search, setSearch] = useState("")
  const [customerSearch, setCustomerSearch] = useState("")
  const [openingBalance, setOpeningBalance] = useState("0")
  const [openShiftError, setOpenShiftError] = useState<string | null>(null)
  const [closingBalance, setClosingBalance] = useState("")
  const [varianceExplanation, setVarianceExplanation] = useState("")
  const [closeShiftError, setCloseShiftError] = useState<string | null>(null)
  const [tenderLines, setTenderLines] = useState<TenderLineState[]>(() => [createTenderLine()])
  const [receiptChannel, setReceiptChannel] = useState<ReceiptChannel>("NONE")
  const [receiptDestination, setReceiptDestination] = useState("")
  const [whatsAppCustomerOptInConfirmed, setWhatsAppCustomerOptInConfirmed] = useState(false)
  const [lastSale, setLastSale] = useState<CommitSaleResult | null>(null)
  const [receiptHistorySearchDraft, setReceiptHistorySearchDraft] = useState("")
  const [receiptHistorySearchQuery, setReceiptHistorySearchQuery] = useState<string | null>(null)
  const [receiptHistorySaleId, setReceiptHistorySaleId] = useState("")
  const [favoriteItemIds, setFavoriteItemIds] = useState<string[]>([])
  const [recentItemIds, setRecentItemIds] = useState<string[]>([])
  const [isCustomerDialogOpen, setIsCustomerDialogOpen] = useState(false)
  const [isEndShiftDialogOpen, setIsEndShiftDialogOpen] = useState(false)
  const [touchMode, setTouchMode] = useState(false)
  const [gridMode, setGridMode] = useState<"grid" | "list">("grid")
  const [quantityDrafts, setQuantityDrafts] = useState<Record<string, string>>({})
  const [quantityErrors, setQuantityErrors] = useState<Record<string, boolean>>({})
  const [cartAccessError, setCartAccessError] = useState(false)
  const [saleAccessError, setSaleAccessError] = useState(false)
  const previousCartQuantities = useRef<Record<string, string>>({})

  const locationsQuery = usePOSLocations()
  const locations = unwrap(locationsQuery.data, [])
  const terminalsQuery = usePOSTerminals(selectedLocationId || undefined)
  const terminals = unwrap(terminalsQuery.data, [])
  const currentUserShiftQuery = useCurrentUserPOSShift()
  const currentUserShift = unwrap(currentUserShiftQuery.data, null)
  const activeShiftQuery = useActivePOSShift(selectedTerminalId || undefined)
  const activeShift = unwrap(activeShiftQuery.data, null)
  const customersQuery = usePOSCustomers({
    locationId: selectedLocationId || undefined,
    search: customerSearch,
  })
  const customerResult = useMemo(
    () => customersQuery.data?.success
      ? customersQuery.data.data
      : { customers: [] as POSCustomer[], total: 0 },
    [customersQuery.data],
  )
  const customers = customerResult.customers as POSCustomer[]
  const customerTotal = customerResult.total
  const customersQueryErrorCode = actionError(customersQuery.data)
  const customersQueryError = customersQueryErrorCode === "POS_LOCATION_UNAVAILABLE"
    ? t("customers.locationUnavailable")
    : customersQuery.isError ? t("readState.failedMessage") : customersQueryErrorCode
  const catalogQuery = usePOSCatalog({
    locationId: selectedLocationId || undefined,
    search,
    categoryId: selectedCategoryId || undefined,
  })
  const catalog = unwrap(catalogQuery.data, { categories: [], items: [] })
  const cartQuery = useActivePOSCart({
    locationId: selectedLocationId || undefined,
    terminalId: selectedTerminalId || undefined,
    sessionId: activeShift?.id,
  })
  const cart = unwrap(cartQuery.data, null)
  const checkout = usePOSCheckoutLifecycle({ organizationId, actorId: user?.id, locationId: selectedLocationId, terminalId: selectedTerminalId, sessionId: activeShift?.id })
  const pendingAffectsRegister = Boolean(pendingCommit && pendingCommit.request.terminalId === selectedTerminalId)
  const needsResume = Boolean(cart?.lines.length && checkout.acceptedCartId !== cart.id && !pendingAffectsRegister)
  const canEditCart = checkout.ready && !checkout.busy && !needsResume && (!pendingAffectsRegister || (reviewingChangedCart && pendingCommit?.request.salesOrderId === cart?.id))
  const cartLineQuantitySnapshot = useMemo(
    () => cart?.lines.map((line) => `${line.id}:${line.quantity}:${line.stock?.quantityOnHand ?? ""}`).join("|") ?? "",
    [cart?.lines],
  )

  const openShift = useOpenPOSShift()
  const closeShift = useClosePOSShift()
  const addLine = useAddPOSCartLine()
  const updateLine = useUpdatePOSCartLine()
  const removeLine = useRemovePOSCartLine()
  const commitSale = useCommitPOSSale()
  const recoverCommit = usePOSSaleCommitStatus()
  useEffect(() => {
    if (!organizationId || !user?.id) return
    let alive = true
    void (async () => {
      try {
        const retained = readPendingSale(sessionStorage, organizationId, user.id)
        if (alive) setPendingCommit(retained)
        if (retained) {
          const persisted = await retainLegacyPOSCheckoutAction(retained.request)
          if (!persisted.success) throw new Error("Retained checkout could not be verified")
        }
        if (alive) setPendingStorageError(false)
      } catch { if (alive) setPendingStorageError(true) }
      finally { if (alive) setPendingLoaded(true) }
    })()
    return () => { alive = false }
  }, [organizationId, user?.id])
  useEffect(() => {
    const request = checkout.snapshot?.pendingRequest
    if (!request || !organizationId || !user?.id || settledCommitIds.current.has(request.clientCommitId)) return
    setPendingCommit(current => current?.request.terminalId === selectedTerminalId ? current : { version: 1, organizationId, actorId: user.id, request })
    setPendingStorageError(false)
  }, [checkout.snapshot?.pendingRequest, organizationId, user?.id, selectedTerminalId])
  useEffect(() => {
    if (!pendingLoaded || !checkout.ready || !pendingCommit || submissionInFlight.current) return
    let alive = true
    void recoverCommit.mutateAsync(pendingCommit.request).then(response => {
      if (!alive || !response?.success) return
      setCommitRecovery(response.data)
      if (response.data.kind === "NOT_COMMITTED" && organizationId && user?.id) {
        removePendingSale(sessionStorage, organizationId, user.id)
        settledCommitIds.current.add(pendingCommit.request.clientCommitId)
        setPendingCommit(null); setPendingStorageError(false)
      }
    }).catch(() => { if (alive) setCommitRecoveryError("failed") })
    return () => { alive = false }
    // Check once when an attempt becomes recoverable, including reconnect.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [pendingLoaded, checkout.ready, pendingCommitId, checkout.snapshot?.settled])
  const receiptTokenCapabilityQuery = usePublicReceiptTokenManagementCapability()
  const receiptTokenCapabilityError = actionError(receiptTokenCapabilityQuery.data)
  const receiptTokenCapabilityUnavailableError = receiptTokenCapabilityQuery.isError
    ? toErrorMessage(receiptTokenCapabilityQuery.error, t("receipt.tokens.historyCapabilityUnavailable"))
    : null
  const canManageReceiptTokens =
    !receiptTokenCapabilityQuery.isError && !receiptTokenCapabilityQuery.isLoading && receiptTokenCapabilityQuery.data?.success === true && receiptTokenCapabilityQuery.data.data.canManageReceiptTokens
  const receiptTokensQuery = usePublicReceiptAccessTokens(canManageReceiptTokens ? lastSale?.saleId : undefined)
  const receiptTokens = unwrap<ReceiptTokenControlItem[]>(receiptTokensQuery.data, [])
  const receiptHistorySalesQuery = usePublicReceiptSalesSearch(canManageReceiptTokens ? receiptHistorySearchQuery : null)
  const receiptHistorySales = unwrap<ReceiptTokenSaleSearchItem[]>(receiptHistorySalesQuery.data, [])
  const receiptHistorySalesError = receiptHistorySalesQuery.isError ? t("readState.failedMessage") : actionError(receiptHistorySalesQuery.data)
  const receiptHistoryTokensQuery = usePublicReceiptAccessTokens(
    canManageReceiptTokens ? receiptHistorySaleId || undefined : undefined,
  )
  const receiptHistoryTokens = unwrap<ReceiptTokenControlItem[]>(receiptHistoryTokensQuery.data, [])
  const revokeReceiptToken = useRevokePublicReceiptAccessToken()
  const revokePendingTokenId = (revokeReceiptToken.variables as { tokenId?: string } | undefined)?.tokenId ?? null
  const receiptHistoryError = receiptHistoryTokensQuery.isError ? t("readState.failedMessage") : actionError(receiptHistoryTokensQuery.data)

  const selectedLocation = locations.find((location) => location.id === selectedLocationId)
  const selectedTerminal = terminals.find((terminal) => terminal.id === selectedTerminalId)
  const selectedTerminalOccupied = !activeShift && Boolean(selectedTerminal?.currentSessionId)
  const selectedCustomer = customers.find((customer) => customer.id === selectedCustomerId)
  const selectedProduct = (catalog.items as CatalogItem[]).find((item) => item.id === selectedProductId) || null
  const currency = selectedLocation?.organization?.currency || "USD"
  const money = useMemo(
    () => new Intl.NumberFormat(locale, { style: "currency", currency }),
    [currency, locale],
  )
  const cashFractionDigits = useMemo(() => currencyFractionDigits(currency), [currency])
  const receiptTokenLabels = useMemo(() => ({
    title: t("receipt.tokens.title"),
    loading: t("receipt.tokens.loading"),
    empty: t("receipt.tokens.empty"),
    active: t("receipt.tokens.active"),
    revoked: t("receipt.tokens.revoked"),
    expired: t("receipt.tokens.expired"),
    accessed: (count: number) => t("receipt.tokens.accessed", { count }),
    expires: (date: string) => t("receipt.tokens.expires", { date }),
    revoke: t("receipt.tokens.revoke"),
  }), [t])
  const receiptTokenHistoryLabels = useMemo(() => ({
    title: t("receipt.tokens.historyTitle"),
    saleLabel: t("receipt.tokens.historySaleLabel"),
    salePlaceholder: t("receipt.tokens.historySalePlaceholder"),
    lookup: t("receipt.tokens.historyLookup"),
    selectedSale: (salesOrderId: string) => t("receipt.tokens.historySelectedSale", { salesOrderId }),
    noSale: t("receipt.tokens.historyNoSale"),
    denied: t("receipt.tokens.historyDenied"),
    capabilityLoading: t("receipt.tokens.historyCapabilityLoading"),
    capabilityDenied: t("receipt.tokens.historyCapabilityDenied"),
    capabilityUnavailable: t("receipt.tokens.historyCapabilityUnavailable"),
    loadingSales: t("receipt.tokens.historyLoadingSales"),
    emptySales: t("receipt.tokens.historyEmptySales"),
    selectSale: t("receipt.tokens.historySelectSale"),
    completed: (date: string) => t("receipt.tokens.historyCompleted", { date }),
    total: (amount: string) => t("receipt.tokens.historyTotal", { amount }),
    tokenSummary: (count: number, active: number) => t("receipt.tokens.historyTokenSummary", { count, active }),
  }), [t])

  const cartQuantitiesByItemId = useMemo(() => {
    const quantities = new Map<string, number>()
    cart?.lines.forEach((line) => {
      quantities.set(line.itemId, (quantities.get(line.itemId) ?? 0) + line.quantity)
    })
    return quantities
  }, [cart?.lines])

  const catalogItemsById = useMemo(() => {
    const itemsById = new Map<string, CatalogItem>()
    const catalogItems = catalog.items as CatalogItem[]
    catalogItems.forEach((item) => {
      itemsById.set(item.id, item)
    })
    return itemsById
  }, [catalog.items])

  const visibleCatalogItems = useMemo(() => {
    const items = catalog.items as CatalogItem[]
    if (catalogView === "favorites") return items.filter((item) => favoriteItemIds.includes(item.id))
    if (catalogView === "recent") return items.filter((item) => recentItemIds.includes(item.id))
    return items
  }, [catalog.items, catalogView, favoriteItemIds, recentItemIds])

  const visibleCustomers = useMemo(() => {
    return customers
      .filter((customer) => customer.isActive && customer.code !== "WALK_IN")
  }, [customers])

  useEffect(() => {
    if (!selectedLocationId && locations.length > 0) {
      setSelectedLocationId(firstLocationId(locations))
    }
  }, [locations, selectedLocationId])

  useEffect(() => {
    const previousLocationId = previousCustomerLocationIdRef.current
    previousCustomerLocationIdRef.current = selectedLocationId

    if (!previousLocationId || previousLocationId === selectedLocationId) return

    setSelectedCustomerId("")
    setCustomerSearch("")
    setIsCustomerDialogOpen(false)
  }, [selectedLocationId])

  useEffect(() => {
    if (terminals.length > 0 && !terminals.some((terminal) => terminal.id === selectedTerminalId)) {
      const availableTerminal = terminals.find((terminal) => !terminal.currentSessionId)
      setSelectedTerminalId((availableTerminal ?? terminals[0]).id)
    }
  }, [selectedTerminalId, terminals])

  useEffect(() => {
    if (!currentUserShift || currentShiftDefaultAppliedRef.current) return

    currentShiftDefaultAppliedRef.current = true
    setSelectedLocationId(currentUserShift.locationId)
    setSelectedTerminalId(currentUserShift.terminalId)
  }, [currentUserShift])

  useEffect(() => {
    setClosingBalance("")
    setVarianceExplanation("")
    setCloseShiftError(null)
    setIsEndShiftDialogOpen(false)
  }, [activeShift?.id])

  useEffect(() => {
    searchRef.current?.focus()
  }, [cart?.lines.length, selectedLocationId, selectedTerminalId])

  useEffect(() => {
    const persisted = Object.fromEntries((cart?.lines ?? []).map(line => [line.id, String(line.quantity)]))
    const previous = previousCartQuantities.current
    setQuantityDrafts(current => Object.fromEntries(Object.entries(persisted).map(([id, value]) => [
      id, current[id] !== undefined && current[id] !== previous[id] ? current[id] : value,
    ])))
    previousCartQuantities.current = persisted
  }, [cart?.lines, cartLineQuantitySnapshot])

  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      if ((event.ctrlKey || event.metaKey) && event.key.toLowerCase() === "k") {
        event.preventDefault()
        searchRef.current?.focus()
      }
      if (event.key === "Escape") {
        setSearch("")
        setCustomerSearch("")
        searchRef.current?.focus()
      }
      if (event.key === "F4") {
        event.preventDefault()
        if (selectedLocationId) setIsCustomerDialogOpen(true)
      }
      if (event.key === "F8") {
        event.preventDefault()
        tenderAmountRef.current?.focus()
      }
    }

    window.addEventListener("keydown", onKeyDown)
    return () => window.removeEventListener("keydown", onKeyDown)
  }, [selectedLocationId])

  useEffect(() => {
    if (!isCustomerDialogOpen) return

    const focusTimer = window.setTimeout(() => customerSearchRef.current?.focus(), 0)
    return () => window.clearTimeout(focusTimer)
  }, [isCustomerDialogOpen])

  const canSell = !!selectedLocationId && !!selectedTerminalId && !!activeShift
  const cartTotal = cart?.total ?? 0
  const cartLineCount = cart?.lines.reduce((total, line) => total + line.quantity, 0) ?? 0
  const hasCartLines = (cart?.lines.length ?? 0) > 0
  const tenderPreview = useMemo(() => previewTenders(tenderLines, cartTotal), [cartTotal, tenderLines])
  const primaryTenderMethod = tenderLines[0]?.method ?? "CASH"
  const activeTenderCount = tenderPreview.tenders.length
  const changePreview = tenderPreview.change
  const balancePreview = tenderPreview.due
  const paidPreview = tenderPreview.paid
  const quickCashAmounts = useMemo(() => cashTenderOptions(cartTotal), [cartTotal])
  const isTenderShort = hasCartLines && balancePreview > 0
  const isAccountTenderMissingCustomer = tenderLines.some((line) => line.method === "ON_ACCOUNT") && !selectedCustomer
  const isElectronicTenderEvidenceMissing = tenderLines.some(
    (line) => isElectronicTenderMethod(line.method) && !line.paymentTransactionId.trim(),
  )
  const isWhatsAppReceiptChannel = receiptChannel === "WHATSAPP"
  const receiptDestinationRequired = receiptChannelRequiresDestination(receiptChannel)
  const receiptDestinationPlaceholder = receiptDestinationRequired
    ? t(`receipt.destinationPlaceholders.${isWhatsAppReceiptChannel ? "whatsapp" : receiptDestinationKind(receiptChannel)}`)
    : ""
  const receiptBlocker = receiptDestinationRequired && receiptDestination.trim().length === 0
    ? t("receipt.destinationRequired")
    : isWhatsAppReceiptChannel && !whatsAppCustomerOptInConfirmed
      ? t("receipt.whatsAppConsentRequired")
      : null
  let tenderBlocker: string | null = null
  if (isAccountTenderMissingCustomer) {
    tenderBlocker = t("tender.customerRequired")
  } else if (isElectronicTenderEvidenceMissing) {
    tenderBlocker = t("tender.providerEvidenceRequired")
  } else if (tenderPreview.hasNonCashOverpay) {
    tenderBlocker = t("tender.nonCashOverpay")
  } else if (isTenderShort) {
    tenderBlocker = t("tender.shortPayment", { amount: money.format(balancePreview) })
  }
  const hasUnconfirmedQuantity = (cart?.lines ?? []).some(line =>
    quantityErrors[line.id] || (quantityDrafts[line.id] !== undefined && (quantityDrafts[line.id].trim() === "" || Number(quantityDrafts[line.id]) !== line.quantity)),
  )
  const saleBlocker = hasUnconfirmedQuantity ? t("notifications.quantityPendingMessage") : tenderBlocker || receiptBlocker
  const needsSaleRecovery = pendingStorageError || Boolean(pendingAffectsRegister && !(reviewingChangedCart && cart?.id === pendingCommit?.request.salesOrderId))
  const canCommitSale = canSell && checkout.ready && !checkout.busy && !needsResume && pendingLoaded && !pendingStorageError && (!pendingAffectsRegister || (reviewingChangedCart && cart?.id === pendingCommit?.request.salesOrderId)) && hasCartLines && !commitSale.isPending && !updateLine.isPending && !addLine.isPending && !removeLine.isPending && !hasUnconfirmedQuantity && tenderPreview.totalTendered > 0 && !saleBlocker
  const lifecycleError = checkout.error ? t(`lifecycle.errors.${["POS_CHECKOUT_OWNED_ELSEWHERE", "POS_CHECKOUT_OWNERSHIP_REQUIRED", "POS_CHECKOUT_RECOVERY_REQUIRED", "POS_CHECKOUT_OFFLINE_PENDING", "POS_CHECKOUT_SHIFT_UNAVAILABLE", "POS_CHECKOUT_STOCK_CHANGED", "POS_CHECKOUT_PARK_FIRST", "POS_CHECKOUT_BROWSER_UNSUPPORTED"].includes(checkout.error) ? checkout.error : "POS_CHECKOUT_CONNECTION_LOST"}`) : null
  const chargeBlocker = !canSell ? t("notifications.openShiftRequiredMessage") : lifecycleError || (!checkout.ready ? t("lifecycle.connecting") : needsResume ? t("lifecycle.resumeRequired") : saleBlocker || (!hasCartLines ? t("lifecycle.empty") : !canCommitSale && !needsSaleRecovery ? t("lifecycle.saving") : null))
  const currentCustomerLabel = selectedCustomer?.name || cart?.customer?.name || t("cart.walkIn")
  const onAccountAmountPreview = tenderPreview.tenders
    .filter((line) => line.method === "ON_ACCOUNT")
    .reduce((sum, line) => sum + line.amount, 0)
  const customerCreditLimit = selectedCustomer?.creditLimit ?? cart?.customer?.creditLimit ?? null
  const customerCurrentBalance = cart?.customer?.id === selectedCustomer?.id ? cart?.customer?.currentBalance ?? 0 : 0
  const projectedCustomerBalance = customerCurrentBalance + onAccountAmountPreview
  const isCustomerCreditRisk = customerCreditLimit !== null && projectedCustomerBalance > customerCreditLimit
  const expectedCloseBalance = activeShift?.cashDrawer?.currentBalance ?? activeShift?.expectedBalance ?? 0
  const closingBalanceInput = closingBalance.trim()
  const hasValidCloseBalance = /^\d{1,12}(?:\.\d{1,2})?$/.test(closingBalanceInput)
  const parsedCloseBalance = hasValidCloseBalance ? Number(closingBalanceInput) : null
  const closeVariance = parsedCloseBalance === null
    ? null
    : Number(parsedCloseBalance.toFixed(cashFractionDigits)) - Number(expectedCloseBalance.toFixed(cashFractionDigits))
  const needsVarianceExplanation = closeVariance !== null && closeVariance !== 0
  const canSubmitCloseShift = hasValidCloseBalance && (!needsVarianceExplanation || varianceExplanation.trim().length > 0)
  const hardwareStatuses = [
    { label: t("hardware.scanner"), value: canSell ? t("hardware.ready") : t("hardware.waiting"), ready: canSell },
    { label: t("hardware.drawer"), value: activeShift?.cashDrawer?.isOpen ? t("hardware.open") : t("hardware.closed"), ready: !!activeShift?.cashDrawer?.isOpen },
    { label: t("hardware.printer"), value: receiptChannel === "PRINT" ? t("hardware.selected") : t("hardware.standby"), ready: true },
    { label: t("hardware.network"), value: t("hardware.online"), ready: true },
  ]

  async function handleOpenShift() {
    if (openShift.isPending) return
    setOpenShiftError(null)
    if (!selectedLocationId || !selectedTerminalId) {
      notifications.warning(t("notifications.setupRequiredTitle"), t("notifications.setupRequiredMessage"), { category: "pos" })
      return
    }
    if (selectedTerminalOccupied) {
      notifications.warning(t("shift.occupied"), t("shift.occupiedDescription", {
        number: selectedTerminal?.currentSession?.sessionNumber ?? selectedTerminal?.terminalNumber ?? "",
      }), { category: "pos" })
      return
    }

    const pendingId = notifications.info(t("notifications.openShiftPendingTitle"), t("notifications.openShiftPendingMessage"), {
      category: "pos",
      duration: 0,
      showProgress: true,
    })

    try {
      const response = await openShift.mutateAsync({
        locationId: selectedLocationId,
        terminalId: selectedTerminalId,
        openingBalance,
      })
      const error = actionError(response)

      notifications.removeNotification(pendingId)
      if (error) {
        const message = "code" in response && response.code === "MODULE_NEW_WORK_STOPPED"
          ? t("notifications.openShiftStopped")
          : "code" in response && response.code === "POS_SHIFT_ENTITLEMENT_UNAVAILABLE"
            ? t("notifications.openShiftEntitlementUnavailable") : t("notifications.openShiftUnconfirmed")
        setOpenShiftError(message)
        return
      }

      setOpeningBalance("0")
      notifications.success(
        t("notifications.openShiftSuccessTitle"),
        t("notifications.openShiftSuccessMessage", {
          terminal: selectedTerminal?.name || t("setup.terminal"),
          amount: money.format(Number(openingBalance || 0)),
        }),
        { category: "pos" },
      )
    } catch (error) {
      notifications.removeNotification(pendingId)
      const message = t("notifications.openShiftUnconfirmed")
      setOpenShiftError(message)
    }
  }

  async function handleCloseShift() {
    if (!activeShift || !canSubmitCloseShift || parsedCloseBalance === null) return false

    setCloseShiftError(null)
    const pendingId = notifications.info(t("notifications.closeShiftPendingTitle"), t("notifications.closeShiftPendingMessage"), {
      category: "pos",
      duration: 0,
      showProgress: true,
    })

    try {
      const response = await closeShift.mutateAsync({
        sessionId: activeShift.id,
        actualBalance: closingBalanceInput,
        notes: needsVarianceExplanation ? varianceExplanation.trim() : undefined,
      })
      const error = actionError(response)

      notifications.removeNotification(pendingId)
      if (error) {
        setCloseShiftError(error)
        notifications.error(t("notifications.closeShiftErrorTitle"), error, { category: "pos", priority: "high" })
        return false
      }

      setClosingBalance("")
      setVarianceExplanation("")
      notifications.success(
        t("notifications.closeShiftSuccessTitle"),
        t("notifications.closeShiftSuccessMessage", {
          number: activeShift.sessionNumber,
          amount: money.format(parsedCloseBalance),
        }),
        { category: "pos" },
      )
      return true
    } catch (error) {
      const message = toErrorMessage(error, t("notifications.genericError"))
      notifications.removeNotification(pendingId)
      setCloseShiftError(message)
      notifications.error(
        t("notifications.closeShiftErrorTitle"),
        message,
        { category: "pos", priority: "high" },
      )
      return false
    }
  }

  async function handleAddItem(itemId: string) {
    if (!canEditCart) return
    const item = (catalog.items as CatalogItem[]).find((catalogItem) => catalogItem.id === itemId)
    const itemName = item ? localizedName(item, locale) : t("catalog.item")

    if (!canSell) {
      notifications.warning(t("notifications.openShiftRequiredTitle"), t("notifications.openShiftRequiredMessage"), { category: "pos" })
      return
    }

    try {
      const response = await addLine.mutateAsync({
        checkoutLeaseId: checkout.leaseId,
        locationId: selectedLocationId,
        terminalId: selectedTerminalId,
        sessionId: activeShift.id,
        itemId,
        quantity: 1,
      })
      const error = actionError(response)

      if (error) {
        if ("code" in response && response.code === "POS_CART_WRITE_UNAVAILABLE") { setCartAccessError(true); return }
        notifications.error(t("notifications.addItemErrorTitle"), error, { category: "inventory", priority: "high" })
        return
      }

      setRecentItemIds((current) => [itemId, ...current.filter((id) => id !== itemId)].slice(0, 12))
      if (response.success && response.data) checkout.acceptCart(response.data.id)
      setCartAccessError(false)
      notifications.success(t("notifications.addItemSuccessTitle"), t("notifications.addItemSuccessMessage", { item: itemName }), {
        category: "pos",
        duration: 2500,
      })
      searchRef.current?.focus()
    } catch (error) {
      notifications.error(
        t("notifications.addItemErrorTitle"),
        toErrorMessage(error, t("notifications.genericError")),
        { category: "inventory", priority: "high" },
      )
    }
  }

  function getCartLineAvailableQuantity(line: {
    itemId: string
    stock?: { trackInventory?: boolean | null; quantityAvailable?: number | null }
  }) {
    const catalogItem = catalogItemsById.get(line.itemId)
    if (line.stock?.trackInventory === false || catalogItem?.trackInventory === false) return null

    const cartLineOnHand = Number(line.stock?.quantityAvailable)
    if (Number.isFinite(cartLineOnHand)) return Math.max(0, cartLineOnHand)

    const catalogOnHand = Number(catalogItem?.stock.quantityAvailable)
    return Number.isFinite(catalogOnHand) ? Math.max(0, catalogOnHand) : null
  }

  async function handleQuantity(lineId: string, quantity: number) {
    if (!canEditCart) return
    if (!cart) return
    const line = cart.lines.find((cartLine) => cartLine.id === lineId)
    const nextQuantity = quantity
    if (line && line.quantity === nextQuantity) {
      setQuantityErrors(current => ({ ...current, [lineId]: false }))
      setQuantityDrafts((current) => ({ ...current, [lineId]: String(nextQuantity) }))
      return
    }

    try {
      const response = await updateLine.mutateAsync({
        checkoutLeaseId: checkout.leaseId,
        salesOrderId: cart.id,
        lineId,
        quantity: nextQuantity,
      })
      const error = actionError(response)

      if (error) {
        setQuantityErrors(current => ({ ...current, [lineId]: true }))
        if ("code" in response && response.code === "POS_CART_WRITE_UNAVAILABLE") { setCartAccessError(true); return }
        notifications.error(t("notifications.quantityErrorTitle"), t("notifications.quantityNotSavedMessage"), { category: "pos", priority: "high" })
        return
      }

      const updatedLine = response.success
        ? response.data?.lines.find((cartLine) => cartLine.id === lineId)
        : null
      const persistedQuantity = Number(updatedLine?.quantity ?? nextQuantity)

      setQuantityErrors(current => ({ ...current, [lineId]: false }))
      setCartAccessError(false)
      setQuantityDrafts((current) => ({ ...current, [lineId]: String(persistedQuantity) }))
      notifications.info(
        t("notifications.quantitySuccessTitle"),
        t("notifications.quantitySuccessMessage", {
          item: line ? (locale === "fr" ? line.nameFr || line.nameEn : line.nameEn) : t("catalog.item"),
          count: persistedQuantity,
        }),
        { category: "pos", duration: 2200 },
      )
    } catch (error) {
      notifications.error(
        t("notifications.quantityErrorTitle"),
        t("notifications.quantityNotSavedMessage"),
        { category: "pos", priority: "high" },
      )
      setQuantityErrors(current => ({ ...current, [lineId]: true }))
    }
  }

  async function commitQuantityDraft(lineId: string) {
    if (!cart) return
    const line = cart.lines.find((cartLine) => cartLine.id === lineId)
    if (!line) return

    const draftValue = quantityDrafts[lineId] ?? String(line.quantity)
    const parsedQuantity = Number(draftValue)

    if (draftValue.trim() === "" || !Number.isFinite(parsedQuantity) || parsedQuantity < 0) {
      setQuantityErrors(current => ({ ...current, [lineId]: true }))
      return
    }

    await handleQuantity(lineId, parsedQuantity)
  }

  async function handleRemove(lineId: string) {
    if (!canEditCart) return
    if (!cart) return
    const line = cart.lines.find((cartLine) => cartLine.id === lineId)
    const itemName = line ? (locale === "fr" ? line.nameFr || line.nameEn : line.nameEn) : t("catalog.item")

    try {
      const response = await removeLine.mutateAsync({
        checkoutLeaseId: checkout.leaseId,
        salesOrderId: cart.id,
        lineId,
      })
      const error = actionError(response)

      if (error) {
        if ("code" in response && response.code === "POS_CART_WRITE_UNAVAILABLE") { setCartAccessError(true); return }
        notifications.error(t("notifications.removeItemErrorTitle"), error, { category: "pos", priority: "high" })
        return
      }

      setCartAccessError(false)
      notifications.info(t("notifications.removeItemSuccessTitle"), t("notifications.removeItemSuccessMessage", { item: itemName }), {
        category: "pos",
        duration: 2500,
      })
    } catch (error) {
      notifications.error(
        t("notifications.removeItemErrorTitle"),
        toErrorMessage(error, t("notifications.genericError")),
        { category: "pos", priority: "high" },
      )
    }
  }

  function selectReceiptChannel(channel: ReceiptChannel) {
    if (receiptDestinationKind(channel) !== receiptDestinationKind(receiptChannel)) {
      setReceiptDestination("")
    }
    if (channel !== "WHATSAPP") {
      setWhatsAppCustomerOptInConfirmed(false)
    }
    setReceiptChannel(channel)
  }

  async function handleRecoverCommit() {
    if (!pendingCommit || recoverCommit.isPending || commitSale.isPending) return
    setCommitRecoveryError(null)
    setCommitRecovery(null)
    setReviewingChangedCart(false)
    try {
      const response = await recoverCommit.mutateAsync(pendingCommit.request)
      if (!response.success) { setCommitRecoveryError("failed"); return }
      setCommitRecovery(response.data)
    } catch { setCommitRecoveryError("failed") }
  }

  async function reviewChangedCart() {
    if (!pendingCommit || !["NOT_FOUND", "CART_CHANGED", "CART_REVIEW_REQUIRED"].includes(commitRecovery?.kind ?? "") || commitSale.isPending) return
    setCommitRecoveryError(null)
    try {
      const resumed = await checkout.command("RESUME", pendingCommit.request.salesOrderId)
      if (!resumed) { setCommitRecoveryError("failed"); return }
      const result = await cartQuery.refetch()
      const refreshed = unwrap(result.data, null)
      if (result.isError || !refreshed) { setCommitRecoveryError("failed"); return }
      if (refreshed.id !== pendingCommit.request.salesOrderId) { setCommitRecoveryError("cartMismatch"); return }
      setReviewingChangedCart(true)
    } catch { setCommitRecoveryError("failed") }
  }

  function clearPendingCommit() {
    if (!organizationId || !user?.id) return
    try {
      removePendingSale(sessionStorage, organizationId, user.id)
      if (pendingCommit) settledCommitIds.current.add(pendingCommit.request.clientCommitId)
      setPendingCommit(null); setCommitRecovery(null); setPendingStorageError(false); setSaleAccessError(false)
      setReviewingChangedCart(false)
      void checkout.refresh()
    } catch { setPendingStorageError(true) }
  }

  async function handleCartLifecycle(command: "RESUME" | "PARK", salesOrderId: string) {
    const result = await checkout.command(command, salesOrderId)
    if (!result) return
    setTenderLines([createTenderLine()]); setSelectedCustomerId(""); setReceiptChannel("NONE")
    setReceiptDestination(""); setWhatsAppCustomerOptInConfirmed(false)
    setQuantityDrafts({}); setQuantityErrors({})
  }

  async function handleCommitSale(retryPending = false) {
    if (!checkout.ready || checkout.busy) return
    if (submissionInFlight.current || commitSale.isPending || recoverCommit.isPending || pendingStorageError) return
    if (retryPending ? !pendingCommit || commitRecovery?.kind !== "NOT_FOUND" : !cart || !activeShift || !canCommitSale) {
      notifications.warning(t("notifications.saleBlockedTitle"), saleBlocker || t("notifications.saleBlockedMessage"), { category: "pos" })
      return
    }

    submissionInFlight.current = true
    const pendingId = notifications.info(
      t("notifications.salePendingTitle"),
      t("notifications.salePendingMessage", {
        amount: money.format(cartTotal),
        customer: currentCustomerLabel,
      }),
      {
        category: "pos",
        duration: 0,
        showProgress: true,
      },
    )

    try {
      if (!organizationId || !user?.id) throw new Error("Current cashier scope is unavailable")
      const request = retryPending && pendingCommit ? pendingCommit.request : {
        clientCommitId: reviewingChangedCart && pendingCommit ? pendingCommit.request.clientCommitId : `pos:${globalThis.crypto.randomUUID()}`,
        salesOrderId: cart!.id,
        expectedCartRevision: cart!.revision,
        locationId: selectedLocationId,
        terminalId: selectedTerminalId,
        sessionId: activeShift!.id,
        customerId: selectedCustomer?.id || undefined,
        tenders: tenderPreview.tenders,
        receipt: {
          channel: "NONE" as const,
          locale: locale === "fr" ? "FR" as const : "EN" as const,
        },
      }
      let retained: PendingSale
      try { retained = savePendingSale(sessionStorage, { version: 1, organizationId, actorId: user.id, request }) }
      catch { setPendingStorageError(true); notifications.removeNotification(pendingId); return }
      setPendingCommit(retained); setCommitRecovery(null); setSaleAccessError(false)
      setReviewingChangedCart(false)
      const response = await commitSale.mutateAsync({ ...retained.request, checkoutLeaseId: checkout.leaseId })
      const error = actionError(response)
      const localizedError = error === "Review the current cart before confirming this sale"
        ? t("recovery.reviewRequired")
        : error === "POS_CHECKOUT_PRICES_CHANGED"
        ? t("lifecycle.pricesChanged")
        : error === "POS_CUSTOMER_LOCATION_MISMATCH"
        ? t("customers.locationMismatch")
        : error

      notifications.removeNotification(pendingId)
      if (!response.success && response.code === "FORBIDDEN") {
        setSaleAccessError(true)
        return
      }
      if (localizedError || !response.success) {
        notifications.error(t("notifications.saleErrorTitle"), localizedError || t("notifications.genericError"), { category: "sales", priority: "high" })
        return
      }

      setLastSale(response.data)
      clearPendingCommit()
      setTenderLines([createTenderLine()])
      setReceiptChannel("NONE")
      setReceiptDestination("")
      setWhatsAppCustomerOptInConfirmed(false)
      setSelectedCustomerId("")
      searchRef.current?.focus()
      notifications.success(
        t("notifications.saleSuccessTitle"),
        t("notifications.saleSuccessMessage", {
          number: response.data.orderNumber,
          total: money.format(response.data.total),
          tender: activeTenderCount > 1 ? t("tender.splitTender", { count: activeTenderCount }) : t(`tender.methods.${primaryTenderMethod}`),
        }),
        { category: "sales", priority: "high", duration: 9000 },
      )
      if (response.data.receiptStatus === "RETRY_REQUIRED") {
        notifications.warning(
          t("notifications.receiptTitle"),
          t("notifications.receiptMessage", {
            channel: t("receipt.channels.NONE"),
            status: response.data.receiptStatus,
          }),
          { category: "receipt", priority: "high", duration: 9000 },
        )
      }
      notifications.info(
        t("notifications.salePostedTitle"),
        t("notifications.salePostedMessage", {
          inventory: t("notifications.inventoryPosted"),
          finance: t("notifications.financePosted"),
          drawer: t("notifications.drawerPosted"),
          customer: selectedCustomer ? t("notifications.customerPosted") : t("notifications.walkInPosted"),
        }),
        { category: "financial", duration: 9000 },
      )
      if (response.data.delivery) {
        notifications.info(
          t("notifications.receiptTitle"),
          t("notifications.receiptMessage", {
            channel: t(`receipt.channels.${response.data.delivery.channel}`),
            status: response.data.delivery.status,
          }),
          { category: "receipt", duration: 7000 },
        )
      }
    } catch (error) {
      notifications.removeNotification(pendingId)
      notifications.error(
        t("notifications.saleErrorTitle"),
        toErrorMessage(error, t("notifications.genericError")),
        { category: "sales", priority: "high" },
      )
    } finally {
      submissionInFlight.current = false
    }
  }

  async function revokeReceiptTokenForSale(tokenId: string, salesOrderId: string, reason: string) {
    try {
      const response = await revokeReceiptToken.mutateAsync({
        tokenId,
        salesOrderId,
        reason,
      })
      const error = actionError(response)

      if (error || !response.success) {
        notifications.error(t("notifications.receiptRevokeErrorTitle"), error || t("notifications.genericError"), {
          category: "receipt",
          priority: "high",
        })
        return
      }

      notifications.success(
        t("notifications.receiptRevokeSuccessTitle"),
        t("notifications.receiptRevokeSuccessMessage"),
        { category: "receipt", duration: 5000 },
      )
    } catch (error) {
      notifications.error(
        t("notifications.receiptRevokeErrorTitle"),
        toErrorMessage(error, t("notifications.genericError")),
        { category: "receipt", priority: "high" },
      )
    }
  }

  async function handleRevokeReceiptToken(tokenId: string) {
    if (!lastSale) return
    await revokeReceiptTokenForSale(tokenId, lastSale.saleId, "operator-revoked-from-pos")
  }

  function handleReceiptHistoryLookup() {
    setReceiptHistorySearchQuery(receiptHistorySearchDraft.trim())
    setReceiptHistorySaleId("")
  }

  async function handleRevokeHistoricalReceiptToken(tokenId: string, salesOrderId: string) {
    await revokeReceiptTokenForSale(tokenId, salesOrderId, "operator-revoked-from-pos-history")
  }

  function toggleFavorite(itemId: string) {
    setFavoriteItemIds((current) =>
      current.includes(itemId) ? current.filter((id) => id !== itemId) : [itemId, ...current],
    )
  }

  function chooseCatalogView(view: CatalogView) {
    setCatalogView(view)
    setSelectedCategoryId("")
  }

  function chooseCategory(categoryId: string) {
    setCatalogView("all")
    setSelectedCategoryId(categoryId)
  }

  function selectCustomer(customerId: string) {
    setSelectedCustomerId(customerId)
    setIsCustomerDialogOpen(false)
    setCustomerSearch("")
  }

  function selectWalkInCustomer() {
    setSelectedCustomerId("")
    setIsCustomerDialogOpen(false)
    setCustomerSearch("")
  }

  function changeLocation(nextLocationId: string) {
    if (nextLocationId === selectedLocationId) return

    if (hasCartLines) {
      notifications.warning(
        t("notifications.locationChangeBlockedTitle"),
        t("notifications.locationChangeBlockedMessage"),
        { category: "pos", priority: "high" },
      )
      return
    }

    const customerWasSelected = selectedCustomerId.length > 0
    setSelectedCustomerId("")
    setCustomerSearch("")
    setIsCustomerDialogOpen(false)
    setSelectedTerminalId("")
    setSelectedLocationId(nextLocationId)

    if (customerWasSelected) {
      notifications.info(
        t("notifications.customerResetTitle"),
        t("notifications.customerResetMessage"),
        { category: "pos" },
      )
    }
  }

  function updateTenderLine(id: string, patch: Partial<TenderLineState>) {
    setTenderLines((current) => current.map((line) => (line.id === id ? { ...line, ...patch } : line)))
  }

  function addTenderLine() {
    setTenderLines((current) => [...current, createTenderLine("CASH")])
  }

  function removeTenderLine(id: string) {
    setTenderLines((current) => (current.length <= 1 ? current : current.filter((line) => line.id !== id)))
  }

  function setExactCash() {
    setTenderLines([createTenderLine("CASH", String(cartTotal))])
    window.setTimeout(() => tenderAmountRef.current?.focus(), 0)
  }

  function handleBackendGatedFeature(feature: string) {
    notifications.warning(t("featureGates.title"), t("featureGates.message", { feature }), { category: "pos", duration: 7000 })
  }

  const requiredReads = [locationsQuery, currentUserShiftQuery,
    ...(selectedLocationId ? [terminalsQuery, catalogQuery] : []),
    ...(selectedTerminalId ? [activeShiftQuery, cartQuery] : []),
  ]
  const failedReads = requiredReads.filter(query => query.isError)
  if (failedReads.length) return <DashboardErrorState
    locale={locale === "fr" ? "fr" : "en"}
    title={t("readState.failedTitle")}
    message={t("readState.failedMessage")}
    reset={() => { void Promise.all(failedReads.map(query => query.retryRead())) }}
  />
  if (requiredReads.some(query => query.isLoading)) return <DashboardRouteState
    kind="loading" locale={locale === "fr" ? "fr" : "en"}
    title={t("readState.loadingTitle")} message={t("readState.loadingMessage")}
    primaryHref={`/${locale}/dashboard`}
  />

  return (
    <div className={cn("dashboard-landing-theme dark min-h-screen overflow-x-hidden text-[var(--dash-text)]", touchMode && "text-base")}>
      <header className="dashboard-landing-content sticky top-16 z-20 border-b border-[var(--dash-border-subtle)] bg-[rgba(20,33,41,0.92)] px-4 py-3 text-white shadow-[0_18px_42px_rgba(5,12,16,0.22)] backdrop-blur-xl lg:top-[68px]">
        <div className="mx-auto flex w-full max-w-[112rem] flex-wrap items-center gap-3">
          <div className="min-w-0 flex-1">
            <div className="flex flex-wrap items-center gap-2">
              <span className="relative flex h-11 w-11 shrink-0 items-center justify-center rounded-xl border border-white/10 bg-[rgba(47,125,246,0.18)] text-[#8fb7ff] shadow-[0_16px_36px_rgba(47,125,246,0.18)] ring-1 ring-white/10">
                <Monitor className="h-5 w-5" />
                <span className="absolute -right-0.5 -top-0.5 h-2.5 w-2.5 rounded-full bg-[var(--dash-spruce)] shadow-[0_0_0_4px_rgba(45,212,191,0.14)]" />
              </span>
              <div className="min-w-0">
                <h1 className="truncate text-xl font-bold tracking-tight text-[var(--dash-text)]">{t("shell.title")}</h1>
                <p className="truncate text-sm text-[var(--dash-text-soft)]">{t("shell.subtitle")}</p>
              </div>
              {activeShift ? (
                <Badge variant="outline" className={posChipClass}>
                  {t("shift.open", { number: activeShift.sessionNumber })}
                </Badge>
              ) : (
                <Badge variant="outline" className={posCountChipClass}>{t("shift.closed")}</Badge>
              )}
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <Badge variant="outline" className="hidden gap-1.5 rounded-lg border-[var(--dash-info)]/35 bg-[var(--dash-info-soft)] px-3 py-2 text-[#cfe8ff] md:flex">
              <Barcode className="h-4 w-4" />
              {t("shell.scannerReady")}
            </Badge>
            <POSButton
              type="button"
              variant="outline"
              size="icon"
              className={cn(gridMode === "grid" ? posButtonActiveClass : posButtonClass)}
              onClick={() => setGridMode("grid")}
              title={t("view.grid")}
            >
              <LayoutGrid className="h-4 w-4" />
            </POSButton>
            <POSButton
              type="button"
              variant="outline"
              size="icon"
              className={cn(gridMode === "list" ? posButtonActiveClass : posButtonClass)}
              onClick={() => setGridMode("list")}
              title={t("view.list")}
            >
              <List className="h-4 w-4" />
            </POSButton>
            <POSButton
              type="button"
              variant="outline"
              onClick={() => setTouchMode((value) => !value)}
              className={cn(touchMode ? posButtonActiveClass : posButtonClass, touchMode && "h-14 px-5")}
            >
              <Smartphone className="h-4 w-4" />
              {t("shell.touchMode")}
            </POSButton>
          </div>
        </div>
      </header>
      {activeShift && (!checkout.ready || checkout.error || needsResume || checkout.snapshot?.settled || (!pendingCommit && commitRecovery?.kind === "NOT_COMMITTED") || checkout.snapshot?.parked.length || checkout.snapshot?.historicalRequests?.length || checkout.snapshot?.recoveredSales?.length) ? <section aria-label={t("lifecycle.title")} className="mx-4 mb-3 mt-20 space-y-2 rounded-lg border border-[var(--dash-border-subtle)] bg-[var(--dash-surface)] p-3 text-sm">
        <h2 className="font-semibold">{t("lifecycle.title")}</h2>
        {lifecycleError ? <p role="alert">{lifecycleError}</p> : !checkout.ready ? <p role="status">{t("lifecycle.connecting")}</p> : null}
        {checkout.snapshot?.settled || (!pendingCommit && commitRecovery?.kind === "NOT_COMMITTED") ? <p role="status">{t("lifecycle.settled")}</p> : null}
        {checkout.snapshot?.recoveredSales?.map(sale => <p key={sale.salesOrderId} role="status">{t("lifecycle.recorded", { number: sale.orderNumber, amount: money.format(sale.total) })}</p>)}
        {needsResume ? <p>{t("lifecycle.resumeRequired")}</p> : null}
        <div className="flex flex-wrap gap-2">
          {needsResume && cart ? <>
            <POSButton className={posButtonClass} disabled={!checkout.ready || checkout.busy} onClick={() => handleCartLifecycle("RESUME", cart.id)}>{t("lifecycle.resume")}</POSButton>
            <POSButton className={posButtonClass} disabled={!checkout.ready || checkout.busy} onClick={() => handleCartLifecycle("PARK", cart.id)}>{t("lifecycle.startNew")}</POSButton>
          </> : null}
          {checkout.error ? <POSButton className={posButtonClass} onClick={() => checkout.refresh()}>{t("lifecycle.retry")}</POSButton> : null}
          {checkout.snapshot?.parked.map(parked => <POSButton key={parked.id} className={posButtonClass} disabled={!checkout.ready || checkout.busy || hasCartLines || pendingAffectsRegister} onClick={() => handleCartLifecycle("RESUME", parked.id)}>{t("lifecycle.resumeParked", { number: parked.orderNumber })}</POSButton>)}
          {checkout.snapshot?.historicalRequests?.map(request => <POSButton key={request.clientCommitId} className={posButtonClass} disabled={commitSale.isPending || pendingAffectsRegister} onClick={() => organizationId && user?.id && setPendingCommit({ version: 1, organizationId, actorId: user.id, request })}>{t("lifecycle.checkEarlier")}</POSButton>)}
        </div>
        {checkout.snapshot?.parked.length ? <p className="text-xs">{t("lifecycle.parkedPolicy")}</p> : null}
      </section> : null}
      {pendingCommit || pendingStorageError ? (
        <section ref={recoveryPanelRef} tabIndex={-1} data-testid="pos-commit-recovery" aria-label={t("recovery.title")} className="mx-4 mb-3 mt-20 scroll-mt-72 space-y-3 rounded-lg border border-[var(--dash-warning)] bg-[var(--dash-warning-soft)] p-4 text-[var(--dash-text)] outline-offset-4 focus-visible:outline focus-visible:outline-[var(--dash-brand)] md:scroll-mt-48">
          <h2 className="font-semibold">{t("recovery.title")}</h2>
          <p className="text-sm">{t("recovery.explanation")}</p>
          {pendingStorageError ? <p role="alert">{t("recovery.storageError")}</p> : null}
          {pendingCommit ? <p className="break-all text-xs">{t("recovery.reference", { reference: pendingCommit.request.clientCommitId })}</p> : null}
          {commitRecoveryError ? <p role="alert">{t(`recovery.${commitRecoveryError}`)}</p> : null}
          <div role="status" aria-live="polite">
            {recoverCommit.isPending ? t("recovery.checking") : null}
            {commitRecovery?.kind === "NOT_FOUND" ? t("recovery.notFound") : null}
            {commitRecovery?.kind === "PENDING" ? t("recovery.pending") : null}
            {commitRecovery?.kind === "NOT_COMMITTED" ? t("recovery.notCommitted") : null}
            {commitRecovery?.kind === "CART_CHANGED" ? t(reviewingChangedCart ? "recovery.reviewReady" : "recovery.cartChanged") : null}
            {commitRecovery?.kind === "CART_REVIEW_REQUIRED" ? t(reviewingChangedCart ? "recovery.reviewReady" : "recovery.legacyReview") : null}
            {commitRecovery?.kind === "RECORDED" ? (
              <p>{t("recovery.recorded", { number: commitRecovery.orderNumber, amount: money.format(commitRecovery.total), status: t(`recovery.status.${commitRecovery.currentStatus}`) })}</p>
            ) : null}
          </div>
          <div className="flex flex-wrap gap-2">
            <POSButton className={posButtonClass} disabled={!pendingCommit || recoverCommit.isPending || commitSale.isPending} onClick={handleRecoverCommit}>{t("recovery.check")}</POSButton>
            {commitRecovery?.kind === "NOT_FOUND" ? <POSButton className={posButtonClass} disabled={commitSale.isPending || recoverCommit.isPending || pendingStorageError} onClick={() => handleCommitSale(true)}>{t("recovery.retryOriginal")}</POSButton> : null}
            {commitRecovery?.kind === "NOT_FOUND" && pendingCommit?.request.salesOrderId === cart?.id ? <POSButton className={posButtonClass} disabled={!checkout.ready || checkout.busy || commitSale.isPending} onClick={reviewChangedCart}>{t("recovery.reviewCurrent")}</POSButton> : null}
            {commitRecovery?.kind === "CART_CHANGED" ? <POSButton className={posButtonClass} disabled={commitSale.isPending || recoverCommit.isPending || cartQuery.isFetching || pendingStorageError} onClick={reviewChangedCart}>{t("recovery.reviewChanged")}</POSButton> : null}
            {commitRecovery?.kind === "CART_REVIEW_REQUIRED" ? <POSButton className={posButtonClass} disabled={commitSale.isPending || recoverCommit.isPending || cartQuery.isFetching || pendingStorageError} onClick={reviewChangedCart}>{t("recovery.reviewCurrent")}</POSButton> : null}
            {commitRecovery?.kind === "RECORDED" || commitRecovery?.kind === "NOT_COMMITTED" ? <POSButton className={posButtonClass} disabled={recoverCommit.isPending || commitSale.isPending} onClick={clearPendingCommit}>{t("recovery.acknowledge")}</POSButton> : null}
          </div>
        </section>
      ) : null}

      <main className="dashboard-landing-content mx-auto flex min-h-[calc(100vh-132px)] w-full max-w-[112rem] flex-col gap-4 px-3 py-4 pb-12 sm:px-4 lg:px-5">
        <OfflineSyncStatusStrip
          className="mt-20 scroll-mt-48"
          access={{ organizationId, userId: user?.id, canRead: hasPermission("pos.transactions.read"), canReview: hasPermission("controls.manage") }}
          locationId={selectedLocationId || undefined}
          terminalId={selectedTerminalId || undefined}
          sessionId={activeShift?.id}
          locale={locale === "fr" ? "fr" : "en"}
        />

        <div className="grid min-h-0 flex-1 gap-3 xl:grid-cols-[minmax(0,1fr)_420px] xl:items-start">
          <div className="min-w-0 space-y-3">
            <section className={cn("p-4", posSurfaceClass)}>
              <div className="grid gap-3 lg:grid-cols-2">
            <div className={cn("p-3", posPanelClass)}>
              <div className="mb-3 flex flex-wrap items-center gap-2">
                <Monitor className={cn("h-4 w-4", posIconBrandClass)} />
                <h2 className="text-sm font-semibold">{t("setup.title")}</h2>
                {activeShift ? (
                  <Badge variant="outline" className={cn("ml-auto", posChipClass)}>
                    {t("setup.activeRegister")}
                  </Badge>
                ) : null}
              </div>
              <div className="grid gap-3">
                <label className={posLabelClass}>
                  {t("setup.location")}
                  <select
                    className={posSelectClass}
                    value={selectedLocationId}
                    disabled={locationsQuery.isLoading}
                    onChange={(event) => changeLocation(event.target.value)}
                  >
                    <option value="">{t("setup.chooseLocation")}</option>
                    {locations.map((location) => (
                      <option key={location.id} value={location.id}>
                        {location.name}
                      </option>
                    ))}
                  </select>
                </label>

                <label className={posLabelClass}>
                  {t("setup.terminal")}
                  <select
                    className={posSelectClass}
                    value={selectedTerminalId}
                    disabled={!selectedLocationId || terminalsQuery.isLoading}
                    onChange={(event) => setSelectedTerminalId(event.target.value)}
                  >
                    <option value="">{t("setup.chooseTerminal")}</option>
                    {terminals.map((terminal) => (
                      <option key={terminal.id} value={terminal.id}>
                        {terminal.terminalNumber} - {terminal.name}
                        {terminal.currentSessionId ? ` - ${t("setup.terminalOccupied")}` : ""}
                      </option>
                    ))}
                  </select>
                </label>
              </div>
            </div>

            <div className={cn("p-3", posPanelClass)}>
              <div className="mb-3 flex items-start justify-between gap-3">
                <div>
                  <div className="flex items-center gap-2">
                    <Wallet className={cn("h-4 w-4", posIconSpruceClass)} />
                    <h2 className="text-sm font-semibold">{t("shift.title")}</h2>
                  </div>
                  <p className={cn("mt-1 text-xs", posMutedTextClass)}>
                    {selectedLocation?.name || t("setup.noLocation")} / {selectedTerminal?.name || t("setup.noTerminal")}
                  </p>
                </div>
                <Badge variant={activeShift ? "outline" : "secondary"}>
                  {activeShift ? t("shift.active") : selectedTerminalOccupied ? t("shift.occupied") : t("shift.notOpen")}
                </Badge>
              </div>

              {activeShift ? (
                <div className="space-y-3">
                  <div className="grid grid-cols-3 gap-2 text-sm">
                    <div className={cn("p-2", posInsetClass)}>
                      <div className={cn("flex items-center gap-1.5 text-xs", posMutedTextClass)}>
                        <Banknote className="h-3.5 w-3.5" />
                        {t("metrics.sessionSales")}
                      </div>
                      <div className="mt-1 font-semibold tabular-nums">{money.format(activeShift.totalSales)}</div>
                    </div>
                    <div className={cn("p-2", posInsetClass)}>
                      <div className={cn("flex items-center gap-1.5 text-xs", posMutedTextClass)}>
                        <Receipt className="h-3.5 w-3.5" />
                        {t("metrics.transactions")}
                      </div>
                      <div className="mt-1 font-semibold tabular-nums">{activeShift.transactionCount}</div>
                    </div>
                    <div className={cn("p-2", posInsetClass)}>
                      <div className={cn("flex items-center gap-1.5 text-xs", posMutedTextClass)}>
                        <Wallet className="h-3.5 w-3.5" />
                        {t("metrics.cashDrawer")}
                      </div>
                      <div className="mt-1 font-semibold tabular-nums">
                        {money.format(activeShift.cashDrawer?.currentBalance ?? activeShift.expectedBalance)}
                      </div>
                    </div>
                  </div>
                  <div className="flex gap-2">
                    <Input
                      value={closingBalance}
                      type="number"
                      inputMode="decimal"
                      min="0"
                      max="999999999999.99"
                      step={cashFractionDigits === 0 ? "1" : "0.01"}
                      aria-label={t("shift.countedCash")}
                      aria-invalid={closingBalanceInput !== "" && !hasValidCloseBalance}
                      onChange={(event) => {
                        setClosingBalance(event.target.value)
                        setCloseShiftError(null)
                      }}
                      placeholder={t("shift.closingPlaceholder")}
                      className={posFieldClass}
                    />
                    <POSButton
                      type="button"
                      variant="outline"
                      className={posButtonClass}
                      onClick={() => setIsEndShiftDialogOpen(true)}
                      disabled={closeShift.isPending}
                    >
                      {t("shift.close")}
                    </POSButton>
                  </div>
                </div>
              ) : selectedTerminalOccupied ? (
                <div role="status" className={cn("rounded-md border border-amber-300 bg-amber-50 p-3 text-sm text-amber-900", "dark:border-amber-800 dark:bg-amber-950/30 dark:text-amber-100")}>
                  {t("shift.occupiedDescription", {
                    number: selectedTerminal?.currentSession?.sessionNumber ?? selectedTerminal?.terminalNumber ?? "",
                  })}
                </div>
              ) : (
                <div className="space-y-2">
                <div className="flex flex-wrap gap-2">
                  <Input
                    value={openingBalance}
                    type="number"
                    aria-label={t("shift.openingPlaceholder")}
                    aria-describedby={openShiftError ? "pos-open-shift-error" : undefined}
                    disabled={openShift.isPending}
                    min="0"
                    step="0.01"
                    onChange={(event) => setOpeningBalance(event.target.value)}
                    placeholder={t("shift.openingPlaceholder")}
                    className={posFieldClass}
                  />
                  <POSButton
                    type="button"
                    className={posButtonPrimaryClass}
                    onClick={handleOpenShift}
                    disabled={!selectedTerminalId || selectedTerminalOccupied || openShift.isPending}
                  >
                    {t("shift.openCta")}
                  </POSButton>
                </div>
                {openShiftError ? <p id="pos-open-shift-error" role="alert" className="text-sm text-[var(--dash-danger)]">{openShiftError}</p> : null}
                </div>
              )}
            </div>

          </div>
            </section>

            <section className="min-w-0">
            <div className={cn("mb-3 p-4", posSurfaceClass)}>
              <div className="flex flex-wrap items-center gap-2">
                <div className="relative min-w-[260px] flex-1">
                  <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-[var(--dash-text-faint)]" />
                  <Input
                    ref={searchRef}
                    value={search}
                    onChange={(event) => setSearch(event.target.value)}
                    placeholder={t("search.placeholder")}
                    className={cn(posFieldClass, "pl-9", touchMode && "h-14 text-base")}
                  />
                </div>
                <Badge variant="outline" className={cn("px-3 py-2", posChipClass)}>
                  {t("catalog.showing", { count: visibleCatalogItems.length })}
                </Badge>
              </div>

              <div className="mt-3 grid gap-2 md:grid-cols-3 xl:grid-cols-6">
                <POSButton
                  type="button"
                  variant="outline"
                  className={posButtonClass}
                  disabled={!selectedLocationId}
                  onClick={() => setIsCustomerDialogOpen(true)}
                >
                  <UsersRound className="h-4 w-4" />
                  {selectedCustomer ? t("smart.changeCustomer") : t("smart.addCustomer")}
                </POSButton>
                <POSButton type="button" variant="outline" className={posButtonClass} disabled={!hasCartLines} onClick={setExactCash}>
                  <Banknote className="h-4 w-4" />
                  {t("smart.exactCash")}
                </POSButton>
                <POSButton
                  type="button"
                  variant="outline"
                  className={posButtonClass}
                  disabled={!lastSale}
                  onClick={() => lastSale?.delivery && notifications.info(t("notifications.receiptTitle"), lastSale.delivery.message, { category: "receipt" })}
                >
                  <Printer className="h-4 w-4" />
                  {t("smart.receiptStatus")}
                </POSButton>
                <POSButton type="button" variant="outline" className={posButtonClass} disabled={!cart || !checkout.ready || checkout.busy || pendingAffectsRegister} onClick={() => cart && handleCartLifecycle("PARK", cart.id)}>
                  <PauseCircle className="h-4 w-4" />
                  {t("smart.parkSale")}
                </POSButton>
                <POSButton type="button" variant="outline" className={posButtonClass} onClick={() => handleBackendGatedFeature(t("smart.managerOverride"))}>
                  <ShieldCheck className="h-4 w-4" />
                  {t("smart.managerOverride")}
                </POSButton>
                <POSButton type="button" variant="outline" className={posButtonClass} disabled={!activeShift} onClick={() => setIsEndShiftDialogOpen(true)}>
                  <ClipboardList className="h-4 w-4" />
                  {t("smart.endShift")}
                </POSButton>
              </div>

              <div className="mt-3 grid gap-2 md:grid-cols-4">
                {hardwareStatuses.map((status) => (
                  <div
                    key={status.label}
                    className={cn(
                      "flex items-center gap-2 rounded-md border px-2 py-1.5 text-xs",
                      status.ready
                        ? "border-[var(--dash-spruce)]/25 bg-[var(--dash-spruce-soft)] text-[#d9fffb]"
                        : "border-[var(--dash-warning)]/25 bg-[var(--dash-warning-soft)] text-[#ffe4a8]",
                    )}
                  >
                    <Wifi className="h-3.5 w-3.5" />
                    <span className="font-medium">{status.label}</span>
                    <span className="ml-auto">{status.value}</span>
                  </div>
                ))}
              </div>

              <ScrollArea className="mt-3 w-full whitespace-nowrap">
                <div className="flex gap-2 pb-2">
                  <POSButton
                    type="button"
                    variant="outline"
                    size="sm"
                    className={cn(catalogView === "all" && !selectedCategoryId ? posButtonActiveClass : posButtonClass)}
                    onClick={() => chooseCatalogView("all")}
                  >
                    <Boxes className="h-4 w-4" />
                    {t("categories.all")}
                  </POSButton>
                  <POSButton
                    type="button"
                    variant="outline"
                    size="sm"
                    className={cn(catalogView === "favorites" ? posButtonActiveClass : posButtonClass)}
                    onClick={() => chooseCatalogView("favorites")}
                  >
                    <Star className="h-4 w-4" />
                    {t("categories.favorites")}
                    <Badge variant="outline" className={cn("ml-1 h-5 px-1.5", posCountChipClass)}>
                      {favoriteItemIds.length}
                    </Badge>
                  </POSButton>
                  <POSButton
                    type="button"
                    variant="outline"
                    size="sm"
                    className={cn(catalogView === "recent" ? posButtonActiveClass : posButtonClass)}
                    onClick={() => chooseCatalogView("recent")}
                  >
                    <Clock className="h-4 w-4" />
                    {t("categories.recent")}
                    <Badge variant="outline" className={cn("ml-1 h-5 px-1.5", posCountChipClass)}>
                      {recentItemIds.length}
                    </Badge>
                  </POSButton>
                  <Separator orientation="vertical" className="h-8" />
                  {catalog.categories.map((category) => (
                    <POSButton
                      key={category.id}
                      type="button"
                      variant="outline"
                      size="sm"
                      className={cn(selectedCategoryId === category.id ? posButtonActiveClass : posButtonClass)}
                      onClick={() => chooseCategory(category.id)}
                    >
                      {localizedName(category, locale)}
                    </POSButton>
                  ))}
                </div>
                <ScrollBar orientation="horizontal" />
              </ScrollArea>
            </div>

            {!canSell ? (
              <div className={posEmptyClass}>
                <Barcode className={cn("mx-auto mb-3 h-10 w-10", posIconBrandClass)} />
                <h2 className="text-lg font-semibold">{t("empty.openShiftTitle")}</h2>
                <p className={cn("mx-auto mt-2 max-w-md text-sm", posMutedTextClass)}>{t("empty.openShiftDescription")}</p>
              </div>
            ) : catalogQuery.isLoading ? (
              <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-4">
                {Array.from({ length: 12 }).map((_, index) => (
                  <div key={index} className="h-56 animate-pulse rounded-lg border border-[var(--dash-border-subtle)] bg-[rgba(37,57,67,0.54)]" />
                ))}
              </div>
            ) : visibleCatalogItems.length === 0 ? (
              <div className={posEmptyClass}>
                {t("empty.noItems")}
              </div>
            ) : (
              <div className={cn(gridMode === "grid" ? "grid gap-3 md:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-4" : "space-y-2")}>
                {visibleCatalogItems.map((item) => {
                  const itemLabel = localizedName(item, locale)
                  const isFavorite = favoriteItemIds.includes(item.id)
                  const outOfStock = item.stock.status === "out"
                  const inCartQuantity = cartQuantitiesByItemId.get(item.id) ?? 0
                  const displayedOnHand = Number(item.stock.quantityOnHand || 0)
                  const categoryLabel = item.category ? localizedName(item.category, locale) : t("catalog.noCategory")
                  const brandLabel = item.brand ? localizedName(item.brand, locale) : t("catalog.noBrand")

                  return (
                    <div
                      key={item.id}
                      className={cn(
                        posProductCardClass,
                        touchMode && "p-4",
                        outOfStock && "opacity-65",
                        inCartQuantity > 0 && posProductSelectedClass,
                        gridMode === "list" && "grid items-center gap-3 lg:grid-cols-[minmax(0,1fr)_280px]",
                      )}
                    >
                      <button
                        type="button"
                        aria-label={`${t("catalog.add")} ${itemLabel}`}
                        title={outOfStock ? t("stock.out") : t("catalog.add")}
                        className="absolute inset-0 z-0 rounded-lg bg-transparent focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-[var(--dash-brand)] disabled:cursor-not-allowed"
                        onClick={() => handleAddItem(item.id)}
                        disabled={!canEditCart || outOfStock || addLine.isPending}
                      />
                      <div className={cn("pointer-events-none relative z-[1]", gridMode === "grid" ? "space-y-3" : "flex min-w-0 gap-3")}>
                        <div
                          className={cn(
                            "flex shrink-0 items-center justify-center overflow-hidden rounded-lg border border-[var(--dash-border-subtle)] bg-[rgba(12,20,24,0.58)] text-[var(--dash-text-faint)] shadow-[inset_0_1px_0_rgba(255,255,255,0.045)]",
                            gridMode === "grid" ? "h-36 w-full" : "h-24 w-24",
                          )}
                        >
                          {item.thumbnail ? (
                            // eslint-disable-next-line @next/next/no-img-element
                            <img src={item.thumbnail} alt={itemLabel} className="h-full w-full object-cover" />
                          ) : (
                            <ImageIcon className="h-8 w-8" />
                          )}
                        </div>
                        <div className="min-w-0 flex-1">
                          <div className="min-w-0">
                            <div className={cn("text-sm font-semibold leading-snug text-[var(--dash-text)]", gridMode === "list" ? "line-clamp-2" : "break-words")}>
                              {itemLabel}
                            </div>
                            <div className="mt-1 text-base font-bold tabular-nums text-[var(--dash-text)]">
                              {money.format(item.sellingPrice)}
                            </div>
                            <div className="mt-1 flex flex-wrap items-center gap-1.5">
                              <Badge variant={stockBadgeVariant(item.stock.status)}>
                                {t(`stock.${item.stock.status}`, { count: item.stock.quantityAvailable })}
                              </Badge>
                              {inCartQuantity > 0 ? (
                                <Badge variant="outline" className={posChipClass}>
                                  {t("stock.inCartCount", { count: inCartQuantity })}
                                </Badge>
                              ) : null}
                            </div>
                          </div>

                          <div className="mt-3 overflow-x-auto rounded-lg border border-[var(--dash-border-subtle)] bg-[rgba(12,20,24,0.48)]">
                            <div className="flex min-w-max items-center gap-2 px-2 py-1.5 text-[10px] leading-none">
                              <span className={cn("shrink-0 font-semibold uppercase tracking-normal", posMutedTextClass)}>
                                {t("catalog.sku")}
                              </span>
                              <span className="font-mono font-semibold text-[#7de8dc]">{item.sku}</span>
                              <span className="h-3 w-px shrink-0 bg-[var(--dash-border-subtle)]" />
                              <span className={cn("shrink-0 font-semibold uppercase tracking-normal", posMutedTextClass)}>
                                {t("catalog.barcode")}
                              </span>
                              <span className="font-mono font-semibold text-[#8fb7ff]">
                                {item.barcode || t("catalog.noBarcode")}
                              </span>
                            </div>
                          </div>

                          <div className={cn("mt-2 flex flex-wrap gap-1.5 text-xs", posMutedTextClass)}>
                            <span className="inline-flex max-w-full items-center gap-1 rounded-lg bg-[rgba(37,57,67,0.74)] px-2 py-1">
                              <Tag className="h-3 w-3 shrink-0" />
                              <span className={cn(gridMode === "list" ? "truncate" : "whitespace-normal break-words")}>
                                {categoryLabel}
                              </span>
                            </span>
                            <span className="inline-flex max-w-full items-center gap-1 rounded-lg bg-[var(--dash-brand-soft)] px-2 py-1">
                              <PackageCheck className="h-3 w-3 shrink-0" />
                              <span className={cn(gridMode === "list" ? "truncate" : "whitespace-normal break-words")}>
                                {brandLabel}
                              </span>
                            </span>
                          </div>
                        </div>
                      </div>

                      <div className={cn("pointer-events-none relative z-10 mt-3 space-y-3", gridMode === "list" && "mt-0")}>
                        <div className="grid gap-1.5">
                          <div className={cn(posMetricSpruceClass, posMetricRowClass)}>
                            <div className={cn(posMetricLabelClass, posMutedTextClass)}>{t("stock.onHand")}</div>
                            <div className={cn(posMetricValueClass, "text-[#7de8dc]")}>{displayedOnHand}</div>
                          </div>
                          <div className={cn(posMetricBrandClass, posMetricRowClass)}>
                            <div className={cn(posMetricLabelClass, posMutedTextClass)}>{t("stock.availableLabel")}</div>
                            <div className={cn(posMetricValueClass, "text-[#8fb7ff]")}>{item.stock.quantityAvailable}</div>
                          </div>
                          <div className={cn(posMetricGoldClass, posMetricRowClass)}>
                            <div className={cn(posMetricLabelClass, posMutedTextClass)}>{t("stock.inCart")}</div>
                            <div className={cn(posMetricValueClass, "text-[#f1d28a]")}>{inCartQuantity}</div>
                          </div>
                        </div>
                        <Progress value={stockProgress(item, displayedOnHand)} className="h-1.5 bg-[rgba(84,112,122,0.36)]" />
                        <div className="flex min-w-0 items-center gap-2">
                          <POSButton
                            type="button"
                            variant="outline"
                            size="icon"
                            className={cn("pointer-events-auto shrink-0", posButtonClass)}
                            onClick={() => setSelectedProductId(item.id)}
                            title={t("catalog.details")}
                          >
                            <Eye className="h-4 w-4" />
                          </POSButton>
                          <POSButton
                            type="button"
                            variant="outline"
                            size="icon"
                            className={cn("pointer-events-auto shrink-0", isFavorite ? posButtonActiveClass : posButtonClass)}
                            onClick={() => toggleFavorite(item.id)}
                            title={isFavorite ? t("catalog.removeFavorite") : t("catalog.addFavorite")}
                          >
                            <Heart className={cn("h-4 w-4", isFavorite && "fill-current")} />
                          </POSButton>
                          <POSButton
                            type="button"
                            onClick={() => handleAddItem(item.id)}
                            disabled={!canEditCart || outOfStock || addLine.isPending}
                            title={outOfStock ? t("stock.out") : t("catalog.add")}
                            className={cn(
                              "pointer-events-auto min-w-0 flex-1 overflow-hidden px-3",
                              posButtonPrimaryClass,
                              outOfStock && "px-2 text-xs",
                              touchMode && (outOfStock ? "h-12 px-2" : "h-12 px-5"),
                            )}
                          >
                            <Plus className="h-4 w-4" />
                            <span className="min-w-0 truncate">
                              {outOfStock ? t("stock.out") : t("catalog.add")}
                            </span>
                          </POSButton>
                        </div>
                      </div>
                    </div>
                  )
                })}
              </div>
            )}
            </section>
          </div>

          <aside className="min-h-0 min-w-0 xl:sticky xl:top-16 xl:h-[calc(100dvh-3.5rem)]">
            <div className={cn("flex flex-col overflow-hidden xl:h-full xl:min-h-0", posSurfaceClass)}>
              <div className={cn("shrink-0 p-1.5", posPanelClass)}>
                <div className="mb-1 flex flex-wrap items-center gap-2">
                  <UsersRound className={cn("h-4 w-4", posIconBrandClass)} />
                  <h2 className="text-sm font-semibold">{t("customers.title")}</h2>
                  {selectedCustomer ? (
                    <Badge variant="outline" className={cn("ml-auto", posChipClass)}>
                      {t("customers.locked")}
                    </Badge>
                  ) : null}
                </div>
                <div className={cn("p-1.5", posInsetClass)}>
                  <div className="flex items-start gap-2">
                    <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border border-white/10 bg-[rgba(47,125,246,0.18)] text-sm font-semibold text-[#d9fffb] shadow-[0_14px_28px_rgba(47,125,246,0.15)]">
                      {selectedCustomer ? customerInitials(selectedCustomer.name) : "WI"}
                    </span>
                    <div className="min-w-0 flex-1">
                      <div className="truncate text-sm font-semibold">{currentCustomerLabel}</div>
                      <div className={cn("mt-0.5 truncate text-xs", posMutedTextClass)}>
                        {selectedCustomer
                          ? selectedCustomer.phone || selectedCustomer.email || selectedCustomer.code || t("customers.noContact")
                          : t("customers.walkInMeta")}
                      </div>
                      <div className={cn("mt-1 flex flex-wrap gap-2 text-xs", posMutedTextClass)}>
                        <span className={posSuccessPillClass}>
                          {selectedCustomer ? t("customers.selected") : t("customers.walkIn")}
                        </span>
                        {selectedCustomer ? (
                          <span className={posInfoPillClass}>
                            {t("customers.orders", { count: selectedCustomer.totalOrders })}
                          </span>
                        ) : null}
                        {selectedCustomer ? (
                          <span
                            className={cn(
                              "rounded-lg px-2 py-1",
                              isCustomerCreditRisk
                                ? posWarningPillClass
                                : posInfoPillClass,
                            )}
                          >
                            {customerCreditLimit ? t("customers.creditLimit", { amount: money.format(customerCreditLimit) }) : t("customers.noCreditLimit")}
                          </span>
                        ) : null}
                      </div>
                      {selectedCustomer && isCustomerCreditRisk ? (
                        <div className="mt-2 flex items-center gap-1.5 rounded-lg border border-[var(--dash-warning)]/25 bg-[var(--dash-warning-soft)] px-2 py-1 text-xs text-[#ffe4a8]">
                          <AlertTriangle className="h-3.5 w-3.5" />
                          {t("customers.creditWarning")}
                        </div>
                      ) : null}
                    </div>
                  </div>
                  <div className="mt-1 grid grid-cols-2 gap-2">
                    <POSButton
                      type="button"
                      variant="outline"
                      disabled={!selectedLocationId}
                      onClick={() => setIsCustomerDialogOpen(true)}
                      className={posButtonClass}
                    >
                      <UsersRound className="h-4 w-4" />
                      {selectedCustomer ? t("customers.change") : t("customers.choose")}
                    </POSButton>
                    <POSButton
                      type="button"
                      variant="outline"
                      disabled={!selectedCustomerId}
                      onClick={selectWalkInCustomer}
                      className={posButtonClass}
                    >
                      <UserRound className="h-4 w-4" />
                      {t("customers.walkIn")}
                    </POSButton>
                  </div>
                </div>
              </div>
              <div className={cn("shrink-0 border-b bg-[rgba(12,20,24,0.42)] p-2", posDividerClass)}>
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <h2 className="text-lg font-semibold text-[var(--dash-text)]">{t("cart.title")}</h2>
                    <div className={cn("mt-1 flex items-center gap-2 text-sm", posMutedTextClass)}>
                      <UserRound className="h-4 w-4" />
                      <span>{currentCustomerLabel}</span>
                    </div>
                  </div>
                  <div className="text-right">
                    {cart ? (
                      <Badge variant="outline" className={posCountChipClass}>
                        {cart.orderNumber}
                      </Badge>
                    ) : null}
                    <div className={cn("mt-2 text-xs", posMutedTextClass)}>
                      {t("cart.lines", { count: cartLineCount })}
                    </div>
                  </div>
                </div>
              </div>

              {cartAccessError ? <p role="alert" data-testid="pos-cart-access-error" className="mb-3 rounded-lg border border-[var(--dash-danger)] p-3 text-sm text-[var(--dash-danger)]">{t("notifications.cartWriteUnavailable")}</p> : null}
              <ScrollArea
                data-testid="pos-cart-lines"
                className="min-h-[18rem] xl:min-h-0 xl:flex-[3_1_20rem]"
              >
                <div className="p-2 pr-3">
                  {!cart || cart.lines.length === 0 ? (
                    <div className="rounded-lg border border-dashed border-[var(--dash-border-subtle)] bg-[rgba(37,57,67,0.36)] p-6 text-center text-sm text-[var(--dash-text-soft)]">
                      {t("cart.empty")}
                    </div>
                  ) : (
                    <div className="space-y-0.5">
                      {cart.lines.map((line) => {
                        const quantityOnHand = getCartLineAvailableQuantity(line)

                        return (
                        <div
                          key={line.id}
                          data-testid="pos-cart-line"
                          className={cn(
                            "px-2 py-0.5 transition-colors hover:border-[var(--dash-border)] hover:bg-[rgba(37,57,67,0.82)]",
                            touchMode && "py-2",
                            posPanelClass,
                          )}
                        >
                          <div className="flex items-start justify-between gap-2">
                            <div className="min-w-0 flex-1">
                              <div
                                className="truncate text-sm font-semibold"
                                title={locale === "fr" ? line.nameFr || line.nameEn : line.nameEn}
                              >
                                {locale === "fr" ? line.nameFr || line.nameEn : line.nameEn}
                              </div>
                              <div className={cn("mt-0.5 text-xs", posMutedTextClass)}>
                                {line.sku} - {money.format(line.unitPrice)}
                              </div>
                            </div>
                            <div className="flex shrink-0 items-start gap-1.5">
                              <div className="pt-0.5 text-right text-sm font-bold tabular-nums">{money.format(line.lineTotal)}</div>
                              <POSButton
                                type="button"
                                variant="ghost"
                                size="icon"
                                className={cn("h-7 w-7", touchMode && "h-10 w-10", posButtonDangerClass)}
                                aria-label={t("cart.removeLine", {
                                  item: locale === "fr" ? line.nameFr || line.nameEn : line.nameEn,
                                })}
                                disabled={!canEditCart || removeLine.isPending}
                                onClick={() => handleRemove(line.id)}
                              >
                                <Trash2 className="h-4 w-4" />
                              </POSButton>
                            </div>
                          </div>
                          <div
                            className={cn(
                              "mt-1 flex min-h-7 items-center justify-between gap-3 rounded-md border bg-[rgba(12,20,24,0.28)] px-2 py-0",
                              touchMode && "mt-2 min-h-10 py-1.5",
                              posDividerClass,
                            )}
                          >
                            <label className="flex min-w-0 items-center gap-2 text-xs font-semibold uppercase tracking-[0.08em] text-[var(--dash-text-soft)]">
                              <span className="shrink-0">{t("stock.inCart")}</span>
                              <Input
                                type="number"
                                inputMode="decimal"
                                min="0"
                                max={quantityOnHand ?? undefined}
                                step="1"
                                value={quantityDrafts[line.id] ?? String(line.quantity)}
                                disabled={!canEditCart || updateLine.isPending || commitSale.isPending}
                                aria-invalid={quantityErrors[line.id] || undefined}
                                aria-describedby={quantityErrors[line.id] ? `pos-quantity-error-${line.id}` : undefined}
                                onChange={(event) => {
                                  const { value } = event.target
                                  setQuantityDrafts((current) => ({ ...current, [line.id]: value }))
                                }}
                                onBlur={() => {
                                  void commitQuantityDraft(line.id)
                                }}
                                onKeyDown={(event) => {
                                  if (event.key === "Enter") {
                                    event.preventDefault()
                                    event.currentTarget.blur()
                                  }
                                }}
                                className={cn(
                                  touchMode ? "h-10 w-24 text-base" : "h-7 w-20",
                                  "text-center font-semibold tabular-nums",
                                  posFieldClass,
                                )}
                              />
                            </label>
                            {quantityOnHand !== null ? (
                              <div className={cn("shrink-0 text-right text-[11px]", posMutedTextClass)}>
                                {t("stock.available", { count: quantityOnHand })}
                              </div>
                            ) : null}
                          </div>
                          {quantityErrors[line.id] ? <p id={`pos-quantity-error-${line.id}`} role="alert" className="mt-1 text-xs text-[var(--dash-warning)]">{t(cartAccessError ? "notifications.cartWriteDeniedLine" : "notifications.quantityNotSavedMessage")}</p> : null}
                        </div>
                        )
                      })}
                    </div>
                  )}
                </div>
              </ScrollArea>

              <div
                data-testid="pos-payment-panel"
                className={cn(
                  "flex flex-col border-t bg-[rgba(12,20,24,0.36)] xl:min-h-[20rem] xl:flex-[2_1_24rem] xl:overflow-hidden",
                  posDividerClass,
                )}
              >
                <div data-testid="pos-totals-summary" className="grid grid-cols-2 gap-2 px-3 py-1 text-xs tabular-nums xl:gap-1.5">
                    <div className={cn("rounded-md border bg-[rgba(37,57,67,0.42)] px-2 py-1", posDividerClass)}>
                      <div className={posMutedTextClass}>{t("totals.subtotal")}</div>
                      <div className="mt-0.5 truncate font-semibold">{money.format(cart?.subtotal ?? 0)}</div>
                    </div>
                    <div className={cn("rounded-md border bg-[rgba(37,57,67,0.42)] px-2 py-1", posDividerClass)}>
                      <div className={posMutedTextClass}>{t("totals.discount")}</div>
                      <div className="mt-0.5 truncate font-semibold">{money.format(cart?.discount ?? 0)}</div>
                    </div>
                    <div className={cn("rounded-md border bg-[rgba(37,57,67,0.42)] px-2 py-1", posDividerClass)}>
                      <div className={posMutedTextClass}>{t("totals.tax")}</div>
                      <div className="mt-0.5 truncate font-semibold">{money.format(cart?.taxAmount ?? 0)}</div>
                    </div>
                  <div className={cn("rounded-md border bg-[rgba(37,57,67,0.58)] px-2 py-1", posDividerClass)}>
                    <div className={posMutedTextClass}>{t("totals.total")}</div>
                    <div className="mt-0.5 truncate text-base font-bold text-[#8fb7ff]">{money.format(cart?.total ?? 0)}</div>
                  </div>
                </div>

                <div
                  data-testid="pos-tender-scroll-region"
                  className={cn("flex-1 border-t px-3 py-2 xl:min-h-0 xl:overflow-y-auto", posDividerClass)}
                >
                  {lastSale ? (
                  <div className="mb-3 rounded-lg border border-[var(--dash-spruce)]/25 bg-[var(--dash-spruce-soft)] p-3 text-sm text-[#d9fffb]">
                    <div className="flex items-start justify-between gap-3">
                      <div>
                        <div className="flex items-center gap-2 font-semibold">
                          <CheckCircle2 className="h-4 w-4" />
                          {t("sale.committed", { number: lastSale.orderNumber })}
                        </div>
                        <div className="mt-1">
                          {t("sale.summary", {
                            total: money.format(lastSale.total),
                            change: money.format(lastSale.changeDue),
                          })}
                        </div>
                      </div>
                      <Badge variant="outline" className={posChipClass}>
                        {lastSale.paymentStatus}
                      </Badge>
                    </div>

                    <div className="mt-3 grid gap-1.5">
                      {[
                        t("timeline.saleCreated"),
                        t("timeline.inventoryUpdated"),
                        t("timeline.financePosted"),
                        t("timeline.drawerUpdated"),
                        lastSale.onAccountAmount > 0 ? t("timeline.customerLedgerUpdated") : t("timeline.walkInRecorded"),
                        lastSale.delivery
                          ? t("timeline.receiptStatus", {
                              channel: t(`receipt.channels.${lastSale.delivery.channel}`),
                              status: lastSale.delivery.status,
                            })
                          : t("timeline.noReceipt"),
                      ].map((entry) => (
                        <div key={entry} className="flex items-center gap-2 text-xs">
                          <CheckCircle2 className="h-3.5 w-3.5 shrink-0" />
                          <span>{entry}</span>
                        </div>
                      ))}
                    </div>
                    {lastSale.accountingMovements ? (
                      <div className="mt-3 rounded-lg border border-[var(--dash-spruce)]/30 bg-[rgba(12,20,24,0.28)] p-2">
                        <div className="text-xs font-semibold uppercase tracking-[0.08em] text-[#d9fffb]">
                          {t("timeline.accountingMovements")}
                        </div>
                        <div className="mt-2 grid gap-1 text-xs">
                          <div className="flex items-center justify-between gap-3">
                            <span className="truncate">{t("timeline.saleJournalEntry")}</span>
                            <span className="shrink-0 font-mono">{lastSale.accountingMovements.saleJournalEntry.entryNumber}</span>
                          </div>
                          {lastSale.accountingMovements.paymentJournalEntries.map((entry) => (
                            <div key={entry.id} className="flex items-center justify-between gap-3">
                              <span className="truncate">{t("timeline.paymentJournalEntry")}</span>
                              <span className="shrink-0 font-mono">{entry.entryNumber}</span>
                            </div>
                          ))}
                          <div className="flex items-center justify-between gap-3 border-t border-[var(--dash-spruce)]/20 pt-1.5">
                            <span className="truncate">{t("timeline.balancedJournal")}</span>
                            <span className="shrink-0 font-mono">
                              {money.format(lastSale.accountingMovements.totalDebits)}
                            </span>
                          </div>
                        </div>
                      </div>
                    ) : null}
                    {lastSale.receipt?.digitalReceiptUrl ? (
                      <div className={cn("mt-2 truncate text-xs", posMutedTextClass)}>
                        {lastSale.receipt.digitalReceiptUrl}
                      </div>
                    ) : null}
                    {canManageReceiptTokens && receiptTokensQuery.isError ? (
                      <div role="alert" className="mt-2 text-sm text-[var(--dash-warning)]">
                        {t("readState.failedMessage")}
                        <POSButton type="button" variant="outline" onClick={() => { void receiptTokensQuery.retryRead() }}>{t("readState.retry")}</POSButton>
                      </div>
                    ) : canManageReceiptTokens ? (
                      <ReceiptTokenControlStrip
                        tokens={receiptTokens}
                        isLoading={receiptTokensQuery.isFetching}
                        revokePendingTokenId={revokePendingTokenId}
                        labels={receiptTokenLabels}
                        onRevoke={handleRevokeReceiptToken}
                      />
                    ) : null}
                  </div>
                  ) : null}

                  <div data-testid="pos-tender-controls" className={cn("space-y-1 p-1.5", posPanelClass)}>
                  <div className="flex items-center justify-between gap-2">
                    <div>
                      <div className="text-sm font-semibold">{t("tender.panelTitle")}</div>
                      <div className={cn("text-xs", posMutedTextClass)}>
                        {t("tender.splitSummary", { count: tenderLines.length })}
                      </div>
                    </div>
                    <POSButton type="button" variant="outline" size="sm" className={posButtonClass} onClick={addTenderLine}>
                      <Plus className="h-4 w-4" />
                      {t("tender.addTender")}
                    </POSButton>
                  </div>

                  <div className="space-y-2">
                    {tenderLines.map((line, index) => (
                      <div key={line.id} className={cn("p-2", posInsetClass)}>
                        <div className="grid gap-2 lg:grid-cols-[1fr_1fr_auto]">
                          <label className={posLabelClass}>
                            {t("tender.method")}
                            <select
                              className={posSelectClass}
                              value={line.method}
                              onChange={(event) => {
                                const method = event.target.value as TenderMethod
                                updateTenderLine(line.id, {
                                  method,
                                  paymentTransactionId: isElectronicTenderMethod(method)
                                    ? line.paymentTransactionId
                                    : "",
                                })
                              }}
                            >
                              {tenderMethods.map((method) => (
                                <option key={method} value={method}>
                                  {t(`tender.methods.${method}`)}
                                </option>
                              ))}
                            </select>
                          </label>

                          <label className={posLabelClass}>
                            {t("tender.amount")}
                            <Input
                              ref={index === 0 ? tenderAmountRef : undefined}
                              value={line.amount}
                              type="number"
                              min="0"
                              step="0.01"
                              onChange={(event) => updateTenderLine(line.id, { amount: event.target.value })}
                              placeholder={index === 0 && tenderLines.length === 1 ? money.format(cartTotal) : "0.00"}
                              className={cn("mt-1", posFieldClass)}
                            />
                          </label>

                          <POSButton
                            type="button"
                            variant="ghost"
                            size="icon"
                            className={cn("mt-5", posButtonDangerClass)}
                            disabled={tenderLines.length <= 1}
                            onClick={() => removeTenderLine(line.id)}
                            title={t("tender.removeTender")}
                          >
                            <Trash2 className="h-4 w-4" />
                          </POSButton>
                        </div>

                        {isElectronicTenderMethod(line.method) ? (
                          <label className={cn("mt-2", posLabelClass)}>
                            {t("tender.providerEvidence")}
                            <Input
                              value={line.paymentTransactionId}
                              onChange={(event) => updateTenderLine(line.id, { paymentTransactionId: event.target.value })}
                              placeholder={t("tender.providerEvidencePlaceholder")}
                              autoComplete="off"
                              className={cn("mt-1", posFieldClass)}
                            />
                            <span className={cn("mt-1 block text-xs", posMutedTextClass)}>
                              {t("tender.providerEvidenceHelp")}
                            </span>
                          </label>
                        ) : null}
                      </div>
                    ))}
                  </div>

                  {primaryTenderMethod === "CASH" && quickCashAmounts.length > 0 ? (
                    <div className="grid grid-cols-2 gap-2">
                      {quickCashAmounts.map((amount, index) => (
                        <POSButton
                          key={amount}
                          type="button"
                          variant="outline"
                          size="sm"
                          className={cn(
                            "w-full justify-center px-3 text-sm tabular-nums",
                            index > 1 && "col-span-2",
                            tenderPreview.totalTendered === amount ? posButtonActiveClass : posButtonClass,
                          )}
                          onClick={() => updateTenderLine(tenderLines[0].id, { amount: String(amount), method: "CASH" })}
                        >
                          <span className="min-w-0 truncate">
                            {index === 0 ? t("tender.exact") : money.format(amount)}
                          </span>
                        </POSButton>
                      ))}
                    </div>
                  ) : null}

                  <div>
                    <div className={cn("mb-1 text-xs font-medium", posMutedTextClass)}>{t("receipt.options")}</div>
                    <div className="grid grid-cols-5 gap-1">
                      {receiptChannels.map((channel) => (
                        <POSButton
                          key={channel}
                          type="button"
                          variant="outline"
                          size="sm"
                          className={cn("min-w-0 px-2", receiptChannel === channel ? posButtonActiveClass : posButtonClass)}
                          onClick={() => selectReceiptChannel(channel)}
                          title={t(`receipt.channels.${channel}`)}
                        >
                          <span className="truncate">{t(`receipt.channels.${channel}`)}</span>
                        </POSButton>
                      ))}
                    </div>
                    {receiptDestinationRequired ? (
                      <label className={cn("mt-2", posLabelClass)}>
                        {t("receipt.destination")}
                        <Input
                          value={receiptDestination}
                          onChange={(event) => setReceiptDestination(event.target.value)}
                          placeholder={receiptDestinationPlaceholder}
                          aria-invalid={Boolean(receiptBlocker)}
                          className={cn("mt-1", posFieldClass)}
                        />
                      </label>
                    ) : null}
                    {isWhatsAppReceiptChannel ? (
                      <label className="mt-2 flex items-start gap-2 rounded-lg border border-[var(--dash-border-subtle)] bg-[rgba(37,57,67,0.36)] px-3 py-2 text-xs leading-5 text-[var(--dash-text-soft)]">
                        <Checkbox
                          checked={whatsAppCustomerOptInConfirmed}
                          onCheckedChange={(checked) => setWhatsAppCustomerOptInConfirmed(checked === true)}
                          aria-label={t("receipt.whatsAppConsent")}
                          className="mt-0.5"
                        />
                        <span>{t("receipt.whatsAppConsent")}</span>
                      </label>
                    ) : null}
                    {receiptBlocker ? (
                      <div role="alert" className="mt-2 rounded-lg border border-[var(--dash-warning)]/25 bg-[var(--dash-warning-soft)] px-3 py-2 text-xs font-medium text-[#ffe4a8]">
                        {receiptBlocker}
                      </div>
                    ) : null}
                  </div>

                  {saleBlocker ? (
                    <div className="rounded-lg border border-[var(--dash-warning)]/25 bg-[var(--dash-warning-soft)] px-3 py-2 text-xs font-medium text-[#ffe4a8]">
                      {saleBlocker}
                    </div>
                  ) : null}
                  {saleAccessError ? (
                    <p role="alert" data-testid="pos-sale-access-error" className="rounded-lg border border-[var(--dash-danger)] px-3 py-2 text-sm text-[var(--dash-danger)]">
                      {t("notifications.saleAccessUnavailable")}
                    </p>
                  ) : null}
                  </div>

                  <ReceiptTokenHistoryPanel
                    searchDraft={receiptHistorySearchDraft}
                    hasSearched={receiptHistorySearchQuery !== null}
                    selectedSaleId={receiptHistorySaleId}
                    saleResults={receiptHistorySales}
                    tokens={receiptHistoryTokens}
                    canManage={canManageReceiptTokens}
                    capabilityLoading={receiptTokenCapabilityQuery.isLoading}
                    capabilityUnavailable={receiptTokenCapabilityQuery.isError && receiptTokenCapabilityQuery.readState !== "denied"}
                    capabilityErrorMessage={receiptTokenCapabilityError || receiptTokenCapabilityUnavailableError}
                    salesLoading={receiptHistorySalesQuery.isFetching}
                    isLoading={receiptHistoryTokensQuery.isFetching}
                    salesErrorMessage={receiptHistorySalesError}
                    errorMessage={receiptHistoryError}
                    revokePendingTokenId={revokePendingTokenId}
                    controlLabels={receiptTokenLabels}
                    labels={receiptTokenHistoryLabels}
                    formatTotal={(amount) => money.format(amount)}
                    onSearchDraftChange={setReceiptHistorySearchDraft}
                    onLookup={handleReceiptHistoryLookup}
                    onSelectSale={setReceiptHistorySaleId}
                    onRevoke={handleRevokeHistoricalReceiptToken}
                  />
                </div>

                <div data-testid="pos-charge-footer" className={cn("shrink-0 border-t px-3 py-1", posDividerClass)}>
                  {chargeBlocker && !needsSaleRecovery ? <p id="pos-lifecycle-blocker" role="status" className="mb-2 text-sm">{chargeBlocker}</p> : null}
                  {needsSaleRecovery ? (
                    <div className="mb-2 rounded-md border border-[var(--dash-warning)] bg-[var(--dash-warning-soft)] p-2 text-sm">
                      <p id="pos-charge-blocker" role="status">{t("recovery.chargePaused")}</p>
                      <POSButton
                        type="button"
                        className={cn(posButtonClass, "mt-2 w-full")}
                        onClick={() => {
                          recoveryPanelRef.current?.focus({ preventScroll: true })
                          recoveryPanelRef.current?.scrollIntoView?.({ block: "start", behavior: "instant" })
                        }}
                      >
                        {t("recovery.open")}
                      </POSButton>
                    </div>
                  ) : null}
                  <div data-testid="pos-charge-summary" className="grid grid-cols-2 items-center gap-2 text-center text-xs tabular-nums">
                    <div className={cn("rounded-md border bg-[rgba(37,57,67,0.42)] px-2 py-1", posDividerClass)}>
                      <div className={posMutedTextClass}>{t("tender.paid")}</div>
                      <div className="mt-0.5 font-semibold">{money.format(paidPreview)}</div>
                    </div>
                    <div className={cn("rounded-md border bg-[rgba(37,57,67,0.42)] px-2 py-1", posDividerClass)}>
                      <div className={posMutedTextClass}>{t("tender.due")}</div>
                      <div className="mt-0.5 font-semibold">{money.format(balancePreview)}</div>
                    </div>
                    <div className={cn("rounded-md border bg-[rgba(37,57,67,0.42)] px-2 py-1", posDividerClass)}>
                      <div className={posMutedTextClass}>{t("tender.change")}</div>
                      <div className="mt-0.5 font-semibold">{money.format(changePreview)}</div>
                    </div>
                    <POSButton
                      type="button"
                      className={cn(posButtonPrimaryClass, "h-11 w-full justify-center rounded-md border text-base", posDividerClass, touchMode && "h-14")}
                      disabled={!canCommitSale}
                      aria-describedby={needsSaleRecovery ? "pos-charge-blocker" : chargeBlocker ? "pos-lifecycle-blocker" : undefined}
                      onClick={() => handleCommitSale()}
                    >
                      <CreditCard className="h-4 w-4" />
                      {t("charge.cta", { amount: money.format(cart?.total ?? 0) })}
                    </POSButton>
                  </div>
                </div>
              </div>
            </div>
          </aside>
        </div>
      </main>

      <Dialog open={!!selectedProduct} onOpenChange={(open) => !open && setSelectedProductId("")}>
        <DialogContent className={cn("max-w-2xl", posDialogClass)}>
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <PackageCheck className={cn("h-5 w-5", posIconBrandClass)} />
              {selectedProduct ? localizedName(selectedProduct, locale) : t("catalog.details")}
            </DialogTitle>
            <DialogDescription className={posMutedTextClass}>
              {t("catalog.detailDescription")}
            </DialogDescription>
          </DialogHeader>

          {selectedProduct ? (
            <div className="grid gap-3 md:grid-cols-[160px_1fr]">
              <div className="flex h-40 items-center justify-center overflow-hidden rounded-lg border border-[var(--dash-border-subtle)] bg-[rgba(12,20,24,0.58)] text-[var(--dash-text-faint)]">
                {selectedProduct.thumbnail ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={selectedProduct.thumbnail} alt={localizedName(selectedProduct, locale)} className="h-full w-full object-cover" />
                ) : (
                  <ImageIcon className="h-8 w-8" />
                )}
              </div>
              <div className="grid gap-2 text-sm">
                <div className="text-2xl font-semibold tabular-nums">{money.format(selectedProduct.sellingPrice)}</div>
                <div className="grid grid-cols-2 gap-2">
                  <div className={cn("p-2", posInsetClass)}>
                    <div className={cn("text-xs", posMutedTextClass)}>{t("catalog.sku")}</div>
                    <div className="font-mono font-semibold">{selectedProduct.sku}</div>
                  </div>
                  <div className={cn("p-2", posInsetClass)}>
                    <div className={cn("text-xs", posMutedTextClass)}>{t("catalog.barcode")}</div>
                    <div className="font-mono font-semibold">{selectedProduct.barcode || t("catalog.noBarcode")}</div>
                  </div>
                  <div className={cn("p-2", posInsetClass)}>
                    <div className={cn("text-xs", posMutedTextClass)}>{t("stock.onHand")}</div>
                    <div className="font-semibold">{selectedProduct.stock.quantityOnHand}</div>
                  </div>
                  <div className={cn("p-2", posInsetClass)}>
                    <div className={cn("text-xs", posMutedTextClass)}>{t("stock.availableLabel")}</div>
                    <div className="font-semibold">{selectedProduct.stock.quantityAvailable}</div>
                  </div>
                </div>
                <div className="rounded-lg border border-[var(--dash-warning)]/25 bg-[var(--dash-warning-soft)] p-2 text-xs text-[#ffe4a8]">
                  {t("catalog.detailBackendNote")}
                </div>
              </div>
            </div>
          ) : null}
        </DialogContent>
      </Dialog>

      <Dialog open={isEndShiftDialogOpen} onOpenChange={setIsEndShiftDialogOpen}>
        <DialogContent className={cn("max-h-[90vh] max-w-2xl overflow-y-auto", posDialogClass)}>
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <ClipboardList className={cn("h-5 w-5", posIconBrandClass)} />
              {t("shift.closeWizardTitle")}
            </DialogTitle>
            <DialogDescription className={posMutedTextClass}>
              {t("shift.closeWizardDescription")}
            </DialogDescription>
          </DialogHeader>

          {activeShift ? (
            <div className="space-y-4">
              <div className="grid gap-2 md:grid-cols-4">
                {[
                  [t("metrics.sessionSales"), money.format(activeShift.totalSales)],
                  [t("metrics.transactions"), activeShift.transactionCount],
                  [t("shift.expectedCash"), money.format(expectedCloseBalance)],
                  [t("shift.variance"), closeVariance === null ? "-" : money.format(closeVariance)],
                ].map(([label, value]) => (
                  <div key={label} className={cn("p-2", posInsetClass)}>
                    <div className={cn("text-xs", posMutedTextClass)}>{label}</div>
                    <div className="mt-1 font-semibold tabular-nums">{value}</div>
                  </div>
                ))}
              </div>

              <div className="grid gap-2 md:grid-cols-5">
                {[
                  [t("tender.methods.CASH"), activeShift.cashTotal],
                  [t("tender.methods.CARD"), activeShift.cardTotal],
                  [t("tender.methods.MOBILE_MONEY"), activeShift.mobileMoneyTotal],
                  [t("tender.methods.BANK_TRANSFER"), activeShift.bankTransferTotal],
                  [t("tender.methods.ON_ACCOUNT"), activeShift.creditTotal],
                ].map(([label, value]) => (
                  <div key={label} className={cn("p-2", posInsetClass)}>
                    <div className={cn("text-xs", posMutedTextClass)}>{label}</div>
                    <div className="mt-1 font-semibold tabular-nums">{money.format(Number(value))}</div>
                  </div>
                ))}
              </div>

              <p className="text-xs">{t("lifecycle.closePolicy")}</p>
              <label className={posLabelClass}>
                {t("shift.countedCash")}
                <Input
                  value={closingBalance}
                  type="number"
                  inputMode="decimal"
                  min="0"
                  max="999999999999.99"
                  step={cashFractionDigits === 0 ? "1" : "0.01"}
                  aria-invalid={closingBalanceInput !== "" && !hasValidCloseBalance}
                  onChange={(event) => {
                    setClosingBalance(event.target.value)
                    setCloseShiftError(null)
                  }}
                  placeholder={money.format(expectedCloseBalance)}
                  required
                  className={cn("mt-1", posFieldClass)}
                />
              </label>

              {needsVarianceExplanation && closeVariance !== null ? (
                <div
                  role="status"
                  aria-live="polite"
                  className="flex items-center gap-2 rounded-lg border border-[var(--dash-warning)]/25 bg-[var(--dash-warning-soft)] px-3 py-2 text-sm text-[#ffe4a8]"
                >
                  <AlertTriangle className="h-4 w-4" />
                  {t("shift.varianceWarning", { amount: money.format(closeVariance) })}
                </div>
              ) : null}

              {needsVarianceExplanation ? (
                <label className={posLabelClass}>
                  {t("shift.varianceExplanation")}
                  <Textarea
                    value={varianceExplanation}
                    onChange={(event) => {
                      setVarianceExplanation(event.target.value)
                      setCloseShiftError(null)
                    }}
                    placeholder={t("shift.varianceExplanationPlaceholder")}
                    required
                    maxLength={500}
                    className={cn("mt-1 min-h-20", posFieldClass)}
                  />
                </label>
              ) : null}

              {closeShiftError ? (
                <div role="alert" className="rounded-lg border border-[var(--dash-danger)]/35 bg-[var(--dash-danger-soft)] px-3 py-2 text-sm text-[#ffd4db]">
                  {closeShiftError}
                </div>
              ) : null}

              <div className="flex justify-end gap-2">
                <POSButton type="button" variant="outline" className={posButtonClass} onClick={() => setIsEndShiftDialogOpen(false)}>
                  {t("common.cancel")}
                </POSButton>
                <POSButton
                  type="button"
                  className={posButtonPrimaryClass}
                  disabled={closeShift.isPending || !canSubmitCloseShift}
                  onClick={async () => {
                    if (await handleCloseShift()) {
                      setIsEndShiftDialogOpen(false)
                    }
                  }}
                >
                  {t("shift.close")}
                </POSButton>
              </div>
            </div>
          ) : null}
        </DialogContent>
      </Dialog>

      <Dialog open={isCustomerDialogOpen} onOpenChange={setIsCustomerDialogOpen}>
        <DialogContent className={cn("max-h-[86vh] max-w-3xl overflow-hidden p-0", posDialogClass)}>
          <DialogHeader className={posDialogHeaderClass}>
            <DialogTitle className="flex items-center gap-2">
              <UsersRound className={cn("h-5 w-5", posIconBrandClass)} />
              {t("customers.choose")}
            </DialogTitle>
            <DialogDescription className={posMutedTextClass}>
              {selectedLocation
                ? t("customers.descriptionForLocation", { location: selectedLocation.name, count: customerTotal })
                : t("customers.locationRequired")}
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 p-5">
            <div className="relative">
              <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-[var(--dash-text-faint)]" />
              <Input
                ref={customerSearchRef}
                value={customerSearch}
                onChange={(event) => setCustomerSearch(event.target.value)}
                placeholder={t("customers.searchPlaceholder")}
                disabled={!selectedLocationId}
                className={cn(posFieldClass, "pl-9")}
              />
            </div>

            {customersQueryError ? (
              <div role="alert" className="rounded-lg border border-[var(--dash-danger)]/35 bg-[var(--dash-danger-soft)] px-3 py-2 text-sm text-[#ffd4db]">
                {customersQueryError}
                <POSButton type="button" variant="outline" onClick={() => { void customersQuery.retryRead() }}>{t("readState.retry")}</POSButton>
              </div>
            ) : null}

            <POSButton
              type="button"
              variant="outline"
              disabled={!selectedCustomerId}
              className={cn("h-auto w-full justify-start gap-3 rounded-lg p-3 disabled:cursor-default disabled:opacity-100", !selectedCustomerId ? posButtonActiveClass : posButtonClass)}
              onClick={selectWalkInCustomer}
            >
              <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-[var(--dash-brand-soft)] text-sm font-semibold text-[#cfe8ff]">
                WI
              </span>
              <span className="min-w-0 flex-1 text-left">
                <span className="block truncate text-sm font-semibold">{t("customers.walkIn")}</span>
                <span className={cn("block text-xs", posMutedTextClass)}>{t("customers.walkInMeta")}</span>
              </span>
              {!selectedCustomerId ? (
                <Badge variant="outline" className={posChipClass}>
                  {t("customers.selected")}
                </Badge>
              ) : null}
            </POSButton>

            <ScrollArea className="h-[420px] pr-3">
              <div className="grid gap-2 md:grid-cols-2">
                {visibleCustomers.map((customer) => {
                  const isSelected = selectedCustomerId === customer.id

                  return (
                    <POSButton
                      key={customer.id}
                      type="button"
                      variant="outline"
                      disabled={isSelected}
                      className={cn("h-auto justify-start gap-3 rounded-lg p-3 text-left disabled:cursor-default disabled:opacity-100", isSelected ? posButtonActiveClass : posButtonClass)}
                      onClick={() => selectCustomer(customer.id)}
                    >
                      <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-[var(--dash-spruce-soft)] text-sm font-semibold text-[#d9fffb]">
                        {customerInitials(customer.name)}
                      </span>
                      <span className="min-w-0 flex-1">
                        <span className="block truncate text-sm font-semibold">{customer.name}</span>
                        <span className={cn("block truncate text-xs", posMutedTextClass)}>
                          {customer.phone || customer.email || customer.code || t("customers.noContact")}
                        </span>
                        <span className={cn("block text-xs", posMutedTextClass)}>
                          {t("customers.orders", { count: customer.totalOrders })} / {money.format(customer.totalRevenue)}
                        </span>
                      </span>
                      {isSelected ? (
                        <Badge variant="outline" className={posChipClass}>
                          {t("customers.selected")}
                        </Badge>
                      ) : null}
                    </POSButton>
                  )
                })}
                {visibleCustomers.length === 0 ? (
                  <div className="col-span-full rounded-lg border border-dashed border-[var(--dash-border-subtle)] bg-[rgba(37,57,67,0.36)] px-4 py-8 text-center text-sm text-[var(--dash-text-soft)]">
                    {customersQuery.isLoading ? t("customers.loading") : t("customers.empty")}
                  </div>
                ) : null}
              </div>
            </ScrollArea>
          </div>
        </DialogContent>
      </Dialog>

      <div className="fixed bottom-0 left-0 right-0 z-30 hidden border-t border-[var(--dash-border-subtle)] bg-[rgba(20,33,41,0.94)] px-4 py-2 text-xs text-[var(--dash-text-soft)] backdrop-blur-xl lg:block">
        {t("hotkeys")}
      </div>
    </div>
  )
}
