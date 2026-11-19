"use client"
import { PurchaseReceivingWorkbench } from "./PurchaseReceivingWorkbench"
import { PurchaseOrderApprovalDialog } from "./PurchaseOrderApprovalDialog"

import { useNotifications } from "@/components/notifications/NotificationProvider"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Separator } from "@/components/ui/separator"
import { Skeleton } from "@/components/ui/skeleton"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { getLocaleFromPathname, localizePath } from "@/i18n/routing"
import { formatPurchaseOrderMoney } from "./purchase-order-money"
import { DEFAULT_LOCALE } from "@/types/bilingual"
import { format, formatDate } from "date-fns"
import {
  Activity,
  AlertTriangle,
  ArrowLeft,
  Building2,
  Calendar,
  CheckCircle,
  Clock,
  Copy,
  DollarSign,
  Edit,
  FileText,
  History,
  MapPin,
  MessageSquareText,
  Package,
  Phone,
  PlayCircle,
  Printer,
  Receipt,
  RefreshCw,
  Send,
  ShoppingCart,
  Truck,
  User,
  XCircle,
  Zap
} from "lucide-react"
import { usePurchaseOrderClone } from "@/hooks/usePurchaseOrderClone"
import { PurchaseOrderCloneNotice } from "./PurchaseOrderCloneNotice"
import { PurchaseOrderDecisionHistory } from "./PurchaseOrderDecisionHistory"
import { PurchaseOrderLifecycleDialog } from "./PurchaseOrderLifecycleDialog"
import type { PurchaseLifecycleKind } from "@/services/purchase-order/purchase-order-lifecycle-contracts"
import { useTranslations } from "next-intl"
import { useSession } from "@/lib/auth-client"
import Link from "next/link"
import { usePathname, useRouter } from "next/navigation"
import { useCallback, useEffect, useRef, useState } from "react"
import { ModernStatusBadge } from "./ModernStatusBadge"
import { resolveReceiveDeepLink } from "./purchase-order-deep-links"

// Import real hooks
import {

  usePurchaseOrderById,
} from "@/hooks/useRecentPurchaseOrderQueries"

interface ModernPurchaseOrderDetailPageProps {
  id: string
  organizationId?: string
  requestedAction?: "receive"
}

// Status configuration with modern styling
const getStatusConfig = (status: string) => {
  switch (status) {
    case 'DRAFT':
      return {
        color: 'bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-300 border-slate-200 dark:border-slate-700',
        icon: <FileText className="h-4 w-4" />,
        label: 'Draft',
        gradient: 'from-slate-500 to-slate-600'
      }
    case 'SUBMITTED':
      return {
        color: 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-300 border-blue-200 dark:border-blue-700',
        icon: <PlayCircle className="h-4 w-4" />,
        label: 'Submitted',
        gradient: 'from-blue-500 to-cyan-500'
      }
    case 'APPROVED':
      return {
        color: 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-300 border-green-200 dark:border-green-700',
        icon: <CheckCircle className="h-4 w-4" />,
        label: 'Approved',
        gradient: 'from-green-500 to-emerald-500'
      }
    case 'PARTIALLY_RECEIVED':
      return {
        color: 'bg-orange-100 text-orange-700 dark:bg-orange-900/30 dark:text-orange-300 border-orange-200 dark:border-orange-700',
        icon: <Package className="h-4 w-4" />,
        label: 'Partially Received',
        gradient: 'from-orange-500 to-amber-500'
      }
    case 'RECEIVED':
      return {
        color: 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-300 border-emerald-200 dark:border-emerald-700',
        icon: <CheckCircle className="h-4 w-4" />,
        label: 'Received',
        gradient: 'from-emerald-500 to-teal-500'
      }
    case 'CANCELLED':
      return {
        color: 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-300 border-red-200 dark:border-red-700',
        icon: <XCircle className="h-4 w-4" />,
        label: 'Cancelled',
        gradient: 'from-red-500 to-rose-500'
      }
    default:
      return {
        color: 'bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-300 border-slate-200 dark:border-slate-700',
        icon: <AlertTriangle className="h-4 w-4" />,
        label: 'Unknown',
        gradient: 'from-slate-500 to-slate-600'
      }
  }
}

// Loading skeleton
const LoadingSkeleton = () => (
  <div className="dashboard-landing-theme dark min-h-screen overflow-x-hidden">
    <div className="dashboard-landing-content mx-auto w-full max-w-[88rem] px-4 py-6 sm:px-6 sm:py-8">
      <div className="space-y-6">
        {/* Header Skeleton */}
        <div className="flex items-center justify-between">
          <div className="space-y-2">
            <Skeleton className="h-8 w-64" />
            <Skeleton className="h-4 w-96" />
          </div>
          <div className="flex gap-2">
            <Skeleton className="h-10 w-24" />
            <Skeleton className="h-10 w-24" />
            <Skeleton className="h-10 w-24" />
          </div>
        </div>

        {/* Stats Skeleton */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          {[...Array(4)].map((_, i) => (
            <Skeleton key={i} className="h-24" />
          ))}
        </div>

        {/* Content Skeleton */}
        <div className="grid lg:grid-cols-3 gap-6">
          <div className="lg:col-span-2 space-y-6">
            <Skeleton className="h-96" />
            <Skeleton className="h-64" />
          </div>
          <div className="space-y-6">
            <Skeleton className="h-48" />
            <Skeleton className="h-32" />
          </div>
        </div>
      </div>
    </div>
  </div>
)

type NumericLike = number | string | { toNumber?: () => number; toString: () => string } | null | undefined

type ReceiveItemDraft = {
  quantity: number
  received: number
  batchNumber?: string
  expiryDate?: string
}

const toNumber = (value: NumericLike): number => {
  if (value == null) return 0
  if (typeof value === "number") return value
  if (typeof value === "string") return Number(value) || 0
  if (typeof value.toNumber === "function") return value.toNumber()
  return Number(value.toString()) || 0
}

export default function ModernPurchaseOrderDetailPage({
  id,
  organizationId,
  requestedAction,
}: ModernPurchaseOrderDetailPageProps) {
  const router = useRouter()
  const pathname = usePathname()
  const locale = getLocaleFromPathname(pathname) ?? DEFAULT_LOCALE
  const localizedHref = useCallback((href: string) => localizePath(href, locale), [locale])
  const { data: session } = useSession()
  const currentUserId = session?.user?.id ?? ""
  const { info } = useNotifications()
  const [activeTab, setActiveTab] = useState("overview")
  const [showApproveDialog, setShowApproveDialog] = useState(false)
  const [showReceiveDialog, setShowReceiveDialog] = useState(false)
  // Hooks for data and mutations
  const { data: purchaseOrder, isLoading, error, refetch } = usePurchaseOrderById(id, organizationId)
  const [lifecycleKind, setLifecycleKind] = useState<PurchaseLifecycleKind | null>(null)
  const lifecycleText = useTranslations("purchaseOrderLifecycle")
  const approvalText = useTranslations("purchaseOrderApproval")
  const cloneText = useTranslations("purchaseOrderClone")
  const receivingText = useTranslations("purchaseReceiving")
  const cloneController = usePurchaseOrderClone({ id, organizationId: organizationId ?? "", locale, allowed: Boolean(purchaseOrder?.capabilities.clone.allowed && organizationId) })

  const receiveDeepLinkHandledRef = useRef(false)
  const receiveDeepLink = purchaseOrder
    ? resolveReceiveDeepLink(requestedAction, purchaseOrder.capabilities.receive)
    : null


  useEffect(() => {
    if (!receiveDeepLink || receiveDeepLinkHandledRef.current) return
    receiveDeepLinkHandledRef.current = true
    if (receiveDeepLink.open) setShowReceiveDialog(true)
  }, [receiveDeepLink])

  const formatCurrency = useCallback((amount: number) => {
    if (!purchaseOrder?.currency) return "—"
    return formatPurchaseOrderMoney(amount, locale, purchaseOrder.currency)
  }, [locale, purchaseOrder?.currency])

  // Action handlers
  const handleDownloadPDF = useCallback(() => {
    if (!purchaseOrder) return
    window.print()
    info(
      "Print Purchase Order",
      "Use your browser print dialog to save this purchase order as a PDF.",
      { duration: 3000, sound: false }
    )
  }, [info, purchaseOrder])

  if (isLoading) {
    return <LoadingSkeleton />
  }

  if (error || !purchaseOrder) {
    return (
      <div className="dashboard-landing-theme dark min-h-screen overflow-x-hidden">
        <div className="dashboard-landing-content mx-auto w-full max-w-[88rem] px-4 py-6 sm:px-6 sm:py-8">
          <Card className="dashboard-glass-panel mx-auto max-w-md rounded-lg p-8 text-center text-[var(--dash-text)]">
            <div className="mx-auto mb-6 flex h-20 w-20 items-center justify-center rounded-full bg-[var(--dash-danger-soft)]">
              <XCircle className="h-10 w-10 text-[var(--dash-danger)]" />
            </div>
            <h3 className="mb-3 text-xl font-semibold text-[var(--dash-text)]">Purchase Order Not Found</h3>
            <p className="mb-6 text-[var(--dash-text-soft)]">
              The purchase order you&apos;re looking for could not be found or may have been deleted.
            </p>
            <Button onClick={() => router.back()} variant="outline" className="dashboard-button-secondary rounded-lg">
              <ArrowLeft className="mr-2 h-4 w-4" />
              Go Back
            </Button>
          </Card>
        </div>
      </div>
    )
  }

  const statusConfig = getStatusConfig(purchaseOrder.status)
  const isOverdue = purchaseOrder.expectedDeliveryDate &&
    new Date(purchaseOrder.expectedDeliveryDate) < new Date() &&
    !['RECEIVED', 'COMPLETED', 'CANCELLED'].includes(purchaseOrder.status)

  return (
    <div className="dashboard-landing-theme dark min-h-screen overflow-x-hidden">
      <div className="dashboard-landing-content mx-auto w-full max-w-[88rem] space-y-6 px-4 py-6 text-[var(--dash-text)] sm:px-6 sm:py-8">
        {purchaseOrder.capabilities.clone.allowed || cloneController.failure ? <PurchaseOrderCloneNotice pending={cloneController.pending} failure={cloneController.failure} ordersHref={localizedHref("/dashboard/purchase-orders")} /> : null}
        <div className="dashboard-glass-panel mb-6 rounded-lg p-5 sm:mb-8 sm:p-6">
          <div className="flex items-center justify-between flex-wrap gap-4 w-full">
            <div className="flex items-center gap-4">
              <Button
                variant="outline"
                size="sm"
                onClick={() => router.back()}
                className="dashboard-button-secondary rounded-lg"
              >
                <ArrowLeft className="w-4 h-4 mr-2" />
                Back
              </Button>
              <div>
                <div className="flex items-center gap-3">
                  <div className="rounded-lg border border-[var(--dash-border-subtle)] bg-[var(--dash-brand-soft)] p-2 text-[var(--dash-brand-strong)] shadow-[0_16px_34px_rgba(47,125,246,0.18)]">
                    <ShoppingCart className="w-5 h-5" />
                  </div>
                  <div>
                    <h1 className="text-2xl font-semibold tracking-tight text-[var(--dash-text)] sm:text-3xl">
                      {purchaseOrder.orderNumber}
                    </h1>
                    <div className="flex items-center gap-4 mt-1">
                      <ModernStatusBadge status={purchaseOrder.status} />
                      {isOverdue && (
                        <Badge className="rounded-lg border border-[var(--dash-danger)]/35 bg-[var(--dash-danger-soft)] text-[var(--dash-text)]">
                          <AlertTriangle className="w-3 h-3 mr-1" />
                          Overdue
                        </Badge>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* Action Buttons */}
            <div className="flex items-center gap-2 flex-wrap">
              <Button
                variant="outline"
                size="sm"
                onClick={handleDownloadPDF}
                className="dashboard-button-secondary rounded-lg"
              >
                <Printer className="w-4 h-4 mr-2" />
                Print
              </Button>

              {purchaseOrder.capabilities.clone.allowed ? (
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => { void cloneController.clone() }}
                  disabled={cloneController.pending || cloneController.retryBlocked}
                  className="dashboard-button-secondary rounded-lg"
                >
                  <Copy className="w-4 h-4 mr-2" />
                  {cloneController.pending ? cloneText("pending") : cloneText("button")}
                </Button>
              ) : null}

              {purchaseOrder.status === 'APPROVED' && (
                <Link href={localizedHref(`/dashboard/purchase-orders/${purchaseOrder.id}/supplier-acknowledgement`)}>
                  <Button
                    variant="outline"
                    size="sm"
                    className="dashboard-button-secondary rounded-lg"
                  >
                    <MessageSquareText className="w-4 h-4 mr-2" />
                    Supplier acknowledgement
                  </Button>
                </Link>
              )}

              {purchaseOrder.capabilities.edit.allowed && (
                <Link href={localizedHref(`/dashboard/purchase-orders/${purchaseOrder.id}/edit`)}>
                  <Button
                    size="sm"
                    className="dashboard-button-primary rounded-lg"
                  >
                    <Edit className="w-4 h-4 mr-2" />
                    Edit
                  </Button>
                </Link>
              )}

              {purchaseOrder.capabilities.approve.allowed && <Button size="sm" className="dashboard-button-primary rounded-lg" onClick={() => setShowApproveDialog(true)}>{approvalText("open")}</Button>}
              {organizationId && currentUserId && <PurchaseOrderLifecycleDialog orderId={lifecycleKind ? id : null} kind={lifecycleKind ?? "submit"} organizationId={organizationId} actorId={currentUserId} onClose={() => setLifecycleKind(null)} onConfirmed={() => { void refetch() }} />}
      {organizationId && currentUserId && <PurchaseOrderApprovalDialog orderId={showApproveDialog ? purchaseOrder.id : null} organizationId={organizationId} actorId={currentUserId} onClose={() => setShowApproveDialog(false)} onConfirmed={() => { void refetch() }} />}

              {/* Submit Button - Only for DRAFT status */}
              {purchaseOrder.capabilities.submit.allowed && (
                <Button size="sm" className="dashboard-button-primary" onClick={() => setLifecycleKind("submit")}>{lifecycleText("confirm.submit")}</Button>
              )}

              {/* Receive Items Button - For APPROVED and PARTIALLY_RECEIVED status */}
              {purchaseOrder.capabilities.receive.allowed && <Button size="sm" className="dashboard-button-primary rounded-lg" onClick={() => setShowReceiveDialog(true)}><Truck aria-hidden className="mr-2 h-4 w-4"/>{receivingText("open")}</Button>}

              {/* Short-close is intentionally unavailable until its control contract exists. */}
              {purchaseOrder.status === 'PARTIALLY_RECEIVED' && (
                <p
                  role="status"
                  className="max-w-md rounded-lg border border-[var(--dash-warning)]/35 bg-[var(--dash-warning-soft)] px-3 py-2 text-xs text-[var(--dash-text-soft)]"
                >
                  {purchaseOrder.capabilities.complete.reason}
                </p>
              )}

              {/* Complete Order Button - Only for RECEIVED status */}
              {purchaseOrder.capabilities.complete.allowed && (
                <Button size="sm" className="dashboard-button-primary" onClick={() => setLifecycleKind("complete")}>{lifecycleText("confirm.complete")}</Button>
              )}

              {purchaseOrder.capabilities.cancel.allowed && (
                <Button size="sm" className="dashboard-button-secondary text-[var(--dash-danger)]" onClick={() => setLifecycleKind("cancel")}>{lifecycleText("confirm.cancel")}</Button>
              )}
            </div>
          </div>
        </div>

        {receiveDeepLink?.explanation ? (
          <div
            role="alert"
            className="rounded-lg border border-[var(--dash-warning)]/35 bg-[var(--dash-warning-soft)] px-4 py-3 text-sm text-[var(--dash-text-soft)]"
          >
            Receiving is unavailable: {receiveDeepLink.explanation}
          </div>
        ) : null}

        {/* Stats Overview */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 sm:gap-4 mb-6 sm:mb-8">
          <Card className="dashboard-stat-card group relative overflow-hidden rounded-lg">
            <div className="absolute inset-0 bg-gradient-to-br from-blue-500/10 to-cyan-500/10 dark:from-blue-400/20 dark:to-cyan-400/20"></div>
            <div className="absolute top-3 right-3 p-2 rounded-full bg-blue-500/10 group-hover:bg-blue-500/20 transition-colors">
              <DollarSign className="w-4 h-4 text-blue-600 dark:text-blue-400" />
            </div>
            <CardHeader className="pb-2">
              <div className="text-xs font-medium text-slate-600 dark:text-slate-400 uppercase tracking-wide">
                Total Amount
              </div>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-slate-900 dark:text-white mb-1">
                {formatCurrency(toNumber(purchaseOrder.total))}
              </div>
              <div className="flex items-center gap-1">
                <Activity className="w-3 h-3 text-blue-500" />
                <p className="text-xs text-slate-600 dark:text-slate-400">Order value</p>
              </div>
            </CardContent>
          </Card>

          <Card className="dashboard-stat-card group relative overflow-hidden rounded-lg">
            <div className="absolute inset-0 bg-gradient-to-br from-purple-500/10 to-violet-500/10 dark:from-purple-400/20 dark:to-violet-400/20"></div>
            <div className="absolute top-3 right-3 p-2 rounded-full bg-purple-500/10 group-hover:bg-purple-500/20 transition-colors">
              <Package className="w-4 h-4 text-purple-600 dark:text-purple-400" />
            </div>
            <CardHeader className="pb-2">
              <div className="text-xs font-medium text-slate-600 dark:text-slate-400 uppercase tracking-wide">
                Line Items
              </div>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-slate-900 dark:text-white mb-1">
                {purchaseOrder.lines?.length || 0}
              </div>
              <div className="flex items-center gap-1">
                <Package className="w-3 h-3 text-purple-500" />
                <p className="text-xs text-slate-600 dark:text-slate-400">Products ordered</p>
              </div>
            </CardContent>
          </Card>

          <Card className="dashboard-stat-card group relative overflow-hidden rounded-lg">
            <div className="absolute inset-0 bg-gradient-to-br from-emerald-500/10 to-teal-500/10 dark:from-emerald-400/20 dark:to-teal-400/20"></div>
            <div className="absolute top-3 right-3 p-2 rounded-full bg-emerald-500/10 group-hover:bg-emerald-500/20 transition-colors">
              <Truck className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
            </div>
            <CardHeader className="pb-2">
              <div className="text-xs font-medium text-slate-600 dark:text-slate-400 uppercase tracking-wide">
                Expected Delivery
              </div>
            </CardHeader>
            <CardContent>
              <div className="text-sm font-bold text-slate-900 dark:text-white mb-1">
                {purchaseOrder.expectedDeliveryDate
                  ? format(new Date(purchaseOrder.expectedDeliveryDate), 'MMM dd, yyyy')
                  : 'Not set'
                }
              </div>
              <div className="flex items-center gap-1">
                {isOverdue ? (
                  <>
                    <AlertTriangle className="w-3 h-3 text-red-500" />
                    <p className="text-xs text-red-600 dark:text-red-400">Overdue</p>
                  </>
                ) : (
                  <>
                    <Clock className="w-3 h-3 text-emerald-500" />
                    <p className="text-xs text-slate-600 dark:text-slate-400">On schedule</p>
                  </>
                )}
              </div>
            </CardContent>
          </Card>

          <Card className="dashboard-stat-card group relative overflow-hidden rounded-lg">
            <div className="absolute inset-0 bg-gradient-to-br from-amber-500/10 to-orange-500/10 dark:from-amber-400/20 dark:to-orange-400/20"></div>
            <div className="absolute top-3 right-3 p-2 rounded-full bg-amber-500/10 group-hover:bg-amber-500/20 transition-colors">
              <Calendar className="w-4 h-4 text-amber-600 dark:text-amber-400" />
            </div>
            <CardHeader className="pb-2">
              <div className="text-xs font-medium text-slate-600 dark:text-slate-400 uppercase tracking-wide">
                Order Date
              </div>
            </CardHeader>
            <CardContent>
              <div className="text-sm font-bold text-slate-900 dark:text-white mb-1">
                {format(new Date(purchaseOrder.orderDate), 'MMM dd, yyyy')}
              </div>
              <div className="flex items-center gap-1">
                <Calendar className="w-3 h-3 text-amber-500" />
                <p className="text-xs text-slate-600 dark:text-slate-400">Created</p>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Enhanced Main Content with POSTerminal styling */}
        <Card className="dashboard-glass-panel overflow-hidden rounded-lg text-[var(--dash-text)]">
          <div className="border-b border-[var(--dash-border-subtle)] bg-[rgba(12,20,24,0.58)] px-6 py-5">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="p-2 rounded-lg bg-gradient-to-br from-emerald-500 to-teal-600 shadow-sm">
                  <ShoppingCart className="w-5 h-5 text-white" />
                </div>
                <div>
                  <h3 className="text-lg font-semibold text-[var(--dash-text)]">Purchase Order Details</h3>
                  <p className="text-sm text-slate-600 dark:text-slate-400">
                    {purchaseOrder.orderNumber} • {formatCurrency(toNumber(purchaseOrder.total))} • {purchaseOrder.lines?.length || 0} items
                  </p>
                </div>
              </div>
            </div>
          </div>

        <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
          <div className="px-6 py-4 border-b border-emerald-200/60 dark:border-slate-700/60">
              <TabsList className="bg-transparent p-0 h-auto">
                <TabsTrigger
                  value="overview"
                  className="rounded-lg px-4 py-2 data-[state=active]:bg-[var(--dash-brand-soft)] data-[state=active]:text-[var(--dash-brand-strong)]"
                >
                  <Package className="w-4 h-4 mr-2" />
                  Overview
                </TabsTrigger>
                <TabsTrigger
                  value="items"
                  className="rounded-lg px-4 py-2 data-[state=active]:bg-[var(--dash-brand-soft)] data-[state=active]:text-[var(--dash-brand-strong)]"
                >
                  <ShoppingCart className="w-4 h-4 mr-2" />
                  Line Items
                </TabsTrigger>
                <TabsTrigger
                  value="receipts"
                  className="rounded-lg px-4 py-2 data-[state=active]:bg-[var(--dash-brand-soft)] data-[state=active]:text-[var(--dash-brand-strong)]"
                >
                  <Receipt className="w-4 h-4 mr-2" />
                  {receivingText("history")}
                </TabsTrigger>
                <TabsTrigger
                  value="inventory"
                  className="rounded-lg px-4 py-2 data-[state=active]:bg-[var(--dash-brand-soft)] data-[state=active]:text-[var(--dash-brand-strong)]"
                >
                  <Package className="w-4 h-4 mr-2" />
                  Inventory
                </TabsTrigger>
                <TabsTrigger
                  value="history"
                  className="rounded-lg px-4 py-2 data-[state=active]:bg-[var(--dash-brand-soft)] data-[state=active]:text-[var(--dash-brand-strong)]"
                >
                  <History className="w-4 h-4 mr-2" />
                  {lifecycleText("history.title")}
                </TabsTrigger>
              </TabsList>
          </div>

            <div className="p-6">
              {/* Overview Tab */}
              <TabsContent value="overview" className="mt-0">
                <div className="grid lg:grid-cols-3 gap-6">
                  {/* Order Details */}
                  <div className="lg:col-span-2 space-y-6">
                    {/* Supplier and Location Info */}
                    <Card className="dashboard-glass-panel rounded-lg text-[var(--dash-text)]">
                      <CardHeader>
                        <CardTitle className="flex items-center gap-2">
                          <Building2 className="w-5 h-5" />
                          Supplier & Delivery Details
                        </CardTitle>
                      </CardHeader>
                      <CardContent>
                        <div className="grid md:grid-cols-2 gap-6">
                          <div>
                            <h4 className="text-sm font-medium text-slate-600 dark:text-slate-400 uppercase tracking-wide mb-3">
                              Supplier
                            </h4>
                            <div className="space-y-2">
                              <div className="flex items-center gap-2">
                                <User className="w-4 h-4 text-slate-400" />
                                <span className="font-medium">{purchaseOrder.supplier?.name || 'Unknown Supplier'}</span>
                              </div>
                              {purchaseOrder.supplier?.email && (
                                <div className="flex items-center gap-2">
                                  <FileText className="w-4 h-4 text-slate-400" />
                                  <span className="text-sm text-slate-600 dark:text-slate-400">{purchaseOrder.supplier.email}</span>
                                </div>
                              )}
                              {purchaseOrder.supplier?.phone && (
                                <div className="flex items-center gap-2">
                                  <Phone className="w-4 h-4 text-slate-400" />
                                  <span className="text-sm text-slate-600 dark:text-slate-400">{purchaseOrder.supplier.phone}</span>
                                </div>
                              )}
                            </div>
                          </div>
                          <div>
                            <h4 className="text-sm font-medium text-slate-600 dark:text-slate-400 uppercase tracking-wide mb-3">
                              Delivery Location
                            </h4>
                            <div className="space-y-2">
                              <div className="flex items-center gap-2">
                                <MapPin className="w-4 h-4 text-slate-400" />
                                <span className="font-medium">{purchaseOrder.location?.name || 'Unknown Location'}</span>
                              </div>
                              {purchaseOrder.location?.address && (
                                <div className="flex items-start gap-2">
                                  <Building2 className="w-4 h-4 text-slate-400 mt-0.5" />
                                  <span className="text-sm text-slate-600 dark:text-slate-400">{purchaseOrder.location.address}</span>
                                </div>
                              )}
                            </div>
                          </div>
                        </div>
                      </CardContent>
                    </Card>

                    {/* Additional Details */}
                    <Card className="dashboard-glass-panel rounded-lg text-[var(--dash-text)]">
                      <CardHeader>
                        <CardTitle className="flex items-center gap-2">
                          <FileText className="w-5 h-5" />
                          Order Information
                        </CardTitle>
                      </CardHeader>
                      <CardContent>
                        <div className="space-y-4">
                          {purchaseOrder?.expectedDeliveryDate && (
                            <div>
                              <label className="text-sm font-medium text-slate-600 dark:text-slate-400">Expected Delivery Date</label>
                              <p className="text-slate-900 dark:text-white">{formatDate(purchaseOrder.expectedDeliveryDate, "dd/MM/yyyy")}</p>
                            </div>
                          )}
                          {purchaseOrder.notes && (
                            <div>
                              <label className="text-sm font-medium text-slate-600 dark:text-slate-400">Notes</label>
                              <p className="text-slate-900 dark:text-white whitespace-pre-wrap">{purchaseOrder.notes}</p>
                            </div>
                          )}
                          {purchaseOrder.createdBy && (
                            <div>
                              <label className="text-sm font-medium text-slate-600 dark:text-slate-400">Created By</label>
                              <p className="text-slate-900 dark:text-white">{purchaseOrder.createdBy.name}</p>
                            </div>
                          )}
                        </div>
                      </CardContent>
                    </Card>
                  </div>

                  {/* Summary Sidebar */}
                  <div className="space-y-6">
                    {/* Financial Summary */}
                    <Card className="dashboard-glass-panel rounded-lg text-[var(--dash-text)]">
                      <CardHeader>
                        <CardTitle className="flex items-center gap-2">
                          <DollarSign className="w-5 h-5" />
                          Financial Summary
                        </CardTitle>
                      </CardHeader>
                      <CardContent>
                        <div className="space-y-3">
                          <div className="flex justify-between">
                            <span className="text-slate-600 dark:text-slate-400">Subtotal</span>
                            <span className="font-medium">{formatCurrency(toNumber(purchaseOrder.subtotal))}</span>
                          </div>
                          <div className="flex justify-between">
                            <span className="text-slate-600 dark:text-slate-400">Tax</span>
                            <span className="font-medium">{formatCurrency(toNumber(purchaseOrder.taxAmount))}</span>
                          </div>
                          <div className="flex justify-between">
                            <span className="text-slate-600 dark:text-slate-400">Shipping</span>
                            <span className="font-medium">{formatCurrency(toNumber(purchaseOrder.shippingCost))}</span>
                          </div>
                          {purchaseOrder.discount > 0 && (
                            <div className="flex justify-between">
                              <span className="text-slate-600 dark:text-slate-400">Discount</span>
                              <span className="font-medium text-green-600">-{formatCurrency(toNumber(purchaseOrder.discount))}</span>
                            </div>
                          )}
                          <Separator />
                          <div className="flex justify-between text-lg font-semibold">
                            <span>Total</span>
                            <span>{formatCurrency(toNumber(purchaseOrder.total))}</span>
                          </div>
                        </div>
                      </CardContent>
                    </Card>

                    {/* Quick Actions */}
                    <Card className="dashboard-glass-panel rounded-lg text-[var(--dash-text)]">
                      <CardHeader>
                        <CardTitle className="flex items-center gap-2">
                          <Zap className="w-5 h-5" />
                          Quick Actions
                        </CardTitle>
                      </CardHeader>
                      <CardContent>
                        <div className="space-y-2">
                          <Button
                            variant="outline"
                            className="w-full justify-start"
                            onClick={handleDownloadPDF}
                          >
                            <Printer className="w-4 h-4 mr-2" />
                            Print Order
                          </Button>
                          {purchaseOrder.capabilities.clone.allowed ? (
                          <Button
                            variant="outline"
                            className="w-full justify-start"
                            onClick={() => { void cloneController.clone() }}
                            disabled={cloneController.pending || cloneController.retryBlocked}
                          >
                            <Copy className="w-4 h-4 mr-2" />
                            {cloneController.pending ? cloneText("pending") : cloneText("button")}
                          </Button>
                          ) : null}
                          <Button
                            variant="outline"
                            className="w-full justify-start"
                            onClick={() => refetch()}
                          >
                            <RefreshCw className="w-4 h-4 mr-2" />
                            Refresh Data
                          </Button>
                        </div>
                      </CardContent>
                    </Card>
                  </div>
                </div>
              </TabsContent>

              {/* Line Items Tab */}
              <TabsContent value="items" className="mt-0">
                <Card className="dashboard-glass-panel rounded-lg text-[var(--dash-text)]">
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <ShoppingCart className="w-5 h-5" />
                      Order Line Items
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="overflow-x-auto">
                      <Table>
                        <TableHeader>
                          <TableRow className="border-slate-200 dark:border-slate-700">
                            <TableHead className="font-semibold">Item</TableHead>
                            <TableHead className="font-semibold">Ordered</TableHead>
                            <TableHead className="font-semibold">Received</TableHead>
                            <TableHead className="font-semibold">Unit Cost</TableHead>
                            <TableHead className="font-semibold">Tax</TableHead>
                            <TableHead className="font-semibold text-right">Line Total</TableHead>
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          {purchaseOrder.lines?.map((line) => (
                            <TableRow key={line.id} className="border-slate-200 dark:border-slate-700">
                              <TableCell>
                                <div>
                                  <div className="font-medium">{line.item?.name || 'Unknown Item'}</div>
                                  <div className="text-sm text-slate-600 dark:text-slate-400">
                                    SKU: {line.item?.sku || 'N/A'}
                                  </div>
                                </div>
                              </TableCell>
                              <TableCell className="font-medium">{toNumber(line.orderedQuantity)}</TableCell>
                              <TableCell className="font-medium">{toNumber(line.receivedQuantity)}</TableCell>
                              <TableCell className="font-medium">{formatCurrency(toNumber(line.unitCost))}</TableCell>
                              <TableCell className="font-medium">{formatCurrency(toNumber(line.taxAmount))}</TableCell>
                              <TableCell className="font-medium text-right">{formatCurrency(toNumber(line.lineTotal))}</TableCell>
                            </TableRow>
                          ))}
                          {(!purchaseOrder.lines || purchaseOrder.lines.length === 0) && (
                            <TableRow>
                              <TableCell colSpan={6} className="text-center py-8 text-slate-500 dark:text-slate-400">
                                No line items found
                              </TableCell>
                            </TableRow>
                          )}
                        </TableBody>
                      </Table>
                    </div>
                  </CardContent>
                </Card>
              </TabsContent>

              {/* Keep the receiving controller mounted so pending requests survive tab changes. */}
              <TabsContent value="receipts" forceMount className={activeTab === "receipts" ? "mt-0" : "hidden"}>
                {organizationId && currentUserId && <PurchaseReceivingWorkbench orderId={id} organizationId={organizationId} actorId={currentUserId} open={showReceiveDialog} onOpenChange={setShowReceiveDialog} onChanged={() => { void refetch() }} />}
              </TabsContent>

              {/* Inventory Tab */}
              <TabsContent value="inventory" className="mt-0">
                <Card className="dashboard-glass-panel rounded-lg text-[var(--dash-text)]">
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <Package className="w-5 h-5" />
                      Inventory Impact
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-4">
                      {purchaseOrder.lines?.map((line) => (
                        <div key={line.id} className="border rounded-lg p-4 bg-white/30">
                          <div className="flex justify-between items-start mb-3">
                            <div>
                              <h4 className="font-semibold">{line.item?.name || `Item ${line.itemId}`}</h4>
                              {line.item?.sku && (
                                <p className="text-sm text-muted-foreground">SKU: {line.item.sku}</p>
                              )}
                            </div>
                          </div>

                          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
                            <div className="text-center p-3 bg-blue-50 rounded">
                              <div className="font-semibold text-blue-700">{toNumber(line.orderedQuantity)}</div>
                              <div className="text-blue-600">Ordered</div>
                            </div>

                            <div className="text-center p-3 bg-green-50 rounded">
                              <div className="font-semibold text-green-700">{toNumber(line.receivedQuantity)}</div>
                              <div className="text-green-600">Received</div>
                            </div>

                            <div className="text-center p-3 bg-orange-50 rounded">
                              <div className="font-semibold text-orange-700">
                                {toNumber(line.orderedQuantity) - toNumber(line.receivedQuantity)}
                              </div>
                              <div className="text-orange-600">Pending</div>
                            </div>

                            <div className="text-center p-3 bg-slate-50 rounded">
                              <div className="font-semibold text-slate-700">
                                {formatCurrency(toNumber(line.unitCost) * toNumber(line.receivedQuantity))}
                              </div>
                              <div className="text-slate-600">Value Received</div>
                            </div>
                          </div>

                          {toNumber(line.receivedQuantity) > 0 && (
                            <div className="mt-3 pt-3 border-t">
                              <p className="text-xs text-muted-foreground">
                                {receivingText("inventoryEvidence")}
                              </p>
                            </div>
                          )}
                        </div>
                      ))}

                      {/* Summary */}
                      <div className="border-t pt-4">
                        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-center">
                          <div className="p-4 bg-blue-50 rounded-lg">
                            <div className="text-2xl font-bold text-blue-700">
                              {purchaseOrder.lines?.reduce((sum, line) => sum + toNumber(line.orderedQuantity), 0) || 0}
                            </div>
                            <div className="text-sm text-blue-600">Total Units Ordered</div>
                          </div>

                          <div className="p-4 bg-green-50 rounded-lg">
                            <div className="text-2xl font-bold text-green-700">
                              {purchaseOrder.lines?.reduce((sum, line) => sum + toNumber(line.receivedQuantity), 0) || 0}
                            </div>
                            <div className="text-sm text-green-600">Total Units Received</div>
                          </div>

                          <div className="p-4 bg-orange-50 rounded-lg">
                            <div className="text-2xl font-bold text-orange-700">
                              {purchaseOrder.lines?.reduce((sum, line) => sum + (toNumber(line.orderedQuantity) - toNumber(line.receivedQuantity)), 0) || 0}
                            </div>
                            <div className="text-sm text-orange-600">Units Pending</div>
                          </div>

                          <div className="p-4 bg-slate-50 rounded-lg">
                            <div className="text-2xl font-bold text-slate-700">
                              {formatCurrency(purchaseOrder.lines?.reduce((sum, line) => sum + (toNumber(line.unitCost) * toNumber(line.receivedQuantity)), 0) || 0)}
                            </div>
                            <div className="text-sm text-slate-600">Inventory Value Added</div>
                          </div>
                        </div>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </TabsContent>

              {/* History Tab */}
              <TabsContent value="history" className="mt-0">
                <Card className="dashboard-glass-panel rounded-lg text-[var(--dash-text)]"><CardHeader><CardTitle>{lifecycleText("history.title")}</CardTitle></CardHeader><CardContent>{organizationId && currentUserId && activeTab === "history" && <PurchaseOrderDecisionHistory orderId={id} organizationId={organizationId} actorId={currentUserId} />}</CardContent></Card>
              </TabsContent>
            </div>
            </Tabs>
        </Card>
      </div>
    </div>
  )
}
