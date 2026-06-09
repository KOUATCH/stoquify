"use client"

import { useNotifications } from "@/components/notifications/NotificationProvider"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog"
import { Separator } from "@/components/ui/separator"
import { Skeleton } from "@/components/ui/skeleton"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Textarea } from "@/components/ui/textarea"
import { getLocaleFromPathname, localizePath } from "@/i18n/routing"
import { formatCurrency } from "@/lib/formatCurrency"
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
  Download,
  Edit,
  FileText,
  History,
  MapPin,
  Package,
  Phone,
  PlayCircle,
  Receipt,
  RefreshCw,
  Send,
  ShoppingCart,
  Truck,
  User,
  XCircle,
  Zap
} from "lucide-react"
import { useSession } from "@/lib/auth-client"
import Link from "next/link"
import { usePathname, useRouter } from "next/navigation"
import { useCallback, useMemo, useState } from "react"
import { ModernStatusBadge } from "./ModernStatusBadge"

// Import real hooks
import {
  useApprovePurchaseOrder,
  useCancelPurchaseOrder,
  useClosePurchaseOrder,
  useDeletePurchaseOrder,
  useGoodsReceiptsForPurchaseOrder,
  usePurchaseOrderById,
  useReceiveItems,
  useSubmitPurchaseOrder
} from "@/hooks/useRecentPurchaseOrderQueries"

interface ModernPurchaseOrderDetailPageProps {
  id: string
  organizationId?: string
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
  organizationId
}: ModernPurchaseOrderDetailPageProps) {
  const router = useRouter()
  const pathname = usePathname()
  const locale = getLocaleFromPathname(pathname) ?? DEFAULT_LOCALE
  const localizedHref = useCallback((href: string) => localizePath(href, locale), [locale])
  const { data: session } = useSession()
  const currentUserId = session?.user?.id ?? ""
  const { success, error: notifyError, info, warning } = useNotifications()
  const [activeTab, setActiveTab] = useState("overview")
  const [showApproveDialog, setShowApproveDialog] = useState(false)
  const [showCancelDialog, setShowCancelDialog] = useState(false)
  const [showSubmitDialog, setShowSubmitDialog] = useState(false)
  const [showReceiveDialog, setShowReceiveDialog] = useState(false)
  const [showCompleteDialog, setShowCompleteDialog] = useState(false)
  const [cancelReason, setCancelReason] = useState("")
  const [receiveItems, setReceiveItems] = useState<Record<string, ReceiveItemDraft>>({})

  // Hooks for data and mutations
  const { data: purchaseOrder, isLoading, error, refetch } = usePurchaseOrderById(id, organizationId)
  const { data: goodsReceipts, isLoading: receiptsLoading } = useGoodsReceiptsForPurchaseOrder(id, organizationId)
  const approveMutation = useApprovePurchaseOrder()
  const cancelMutation = useCancelPurchaseOrder()
  const deleteMutation = useDeletePurchaseOrder()
  const submitMutation = useSubmitPurchaseOrder()
  const receiveItemsMutation = useReceiveItems()
  const completeMutation = useClosePurchaseOrder()

  // Action handlers
  const handleApprove = useCallback(async () => {
    if (!purchaseOrder || !organizationId) return

    try {
      await approveMutation.mutateAsync({
        id: purchaseOrder.id,
        organizationId,
        approvedBy: currentUserId || null
      })
      setShowApproveDialog(false)
      success(
        "Order Approved",
        `Purchase order ${purchaseOrder.orderNumber} has been approved successfully`,
        { duration: 4000, sound: true }
      )
    } catch (error) {
      notifyError(
        "Approval Failed",
        "Failed to approve purchase order. Please try again.",
        { duration: 6000, sound: true }
      )
    }
  }, [approveMutation, currentUserId, notifyError, organizationId, purchaseOrder, success])

  const handleCancel = useCallback(async () => {
    if (!purchaseOrder || !organizationId) return

    try {
      await cancelMutation.mutateAsync({
        id: purchaseOrder.id,
        organizationId,
        reason: cancelReason || 'Cancelled by user'
      })
      setShowCancelDialog(false)
      setCancelReason("")
      warning(
        "Order Cancelled",
        `Purchase order ${purchaseOrder.orderNumber} has been cancelled`,
        { duration: 4000, sound: true }
      )
    } catch (error) {
      notifyError(
        "Cancellation Failed",
        "Failed to cancel purchase order. Please try again.",
        { duration: 6000, sound: true }
      )
    }
  }, [cancelMutation, cancelReason, notifyError, organizationId, purchaseOrder, warning])

  const handleDownloadPDF = useCallback(() => {
    if (!purchaseOrder) return
    window.open(`/api/purchase-orders/${purchaseOrder.id}/pdf?organizationId=${organizationId}`, '_blank')
    info(
      "PDF Download",
      "PDF download has been initiated",
      { duration: 3000, sound: false }
    )
  }, [info, organizationId, purchaseOrder])

  const handleSubmit = useCallback(async () => {
    if (!purchaseOrder || !organizationId) return

    try {
      await submitMutation.mutateAsync({
        id: purchaseOrder.id,
        organizationId
      })
      setShowSubmitDialog(false)
      success(
        "Order Submitted",
        `Purchase order ${purchaseOrder.orderNumber} has been submitted for approval`,
        { duration: 4000, sound: true }
      )
    } catch (error) {
      notifyError(
        "Submission Failed",
        "Failed to submit purchase order. Please check your data and try again.",
        { duration: 6000, sound: true }
      )
    }
  }, [notifyError, organizationId, purchaseOrder, submitMutation, success])

  // Calculate receiving totals
  const receivingTotals = useMemo(() => {
    const totalUnits = Object.values(receiveItems).reduce((sum, item) => sum + item.received, 0)
    const totalValue = Object.entries(receiveItems).reduce((sum, [lineId, data]) => {
      const line = purchaseOrder?.lines?.find(l => l.id === lineId)
      return sum + toNumber(line?.unitCost) * data.received
    }, 0)
    const linesWithItems = Object.values(receiveItems).filter(item => item.received > 0).length

    return {
      totalUnits,
      totalValue,
      linesWithItems
    }
  }, [receiveItems, purchaseOrder?.lines])

  const handleReceive = useCallback(async () => {
    if (!purchaseOrder || !organizationId) return

    try {
      const itemsToReceive = Object.entries(receiveItems)
        .filter(([, data]) => data.received > 0)
        .map(([lineId, data]) => ({
          lineId,
          receivedQuantity: data.received,
          batchNumber: data.batchNumber?.trim() || undefined,
          expiryDate: data.expiryDate || undefined,
        }))

      if (!itemsToReceive.length) {
        warning("No Quantities Entered", "Enter at least one received quantity before submitting.", {
          duration: 4000,
          sound: false,
        })
        return
      }

      await receiveItemsMutation.mutateAsync({
        id: purchaseOrder.id,
        organizationId,
        receivedBy: currentUserId,
        notes: 'Items received via workflow',
        items: itemsToReceive
      })
      setShowReceiveDialog(false)
      setReceiveItems({})
      success(
        "Items Received",
        `Items for purchase order ${purchaseOrder.orderNumber} have been received successfully`,
        { duration: 4000, sound: true }
      )
    } catch (error) {
      notifyError(
        "Receiving Failed",
        error instanceof Error ? error.message : "Failed to receive items. Please verify quantities and try again.",
        { duration: 6000, sound: true }
      )
    }
  }, [currentUserId, notifyError, organizationId, purchaseOrder, receiveItems, receiveItemsMutation, success, warning])

  const handleComplete = useCallback(async () => {
    if (!purchaseOrder || !organizationId) return

    try {
      await completeMutation.mutateAsync({
        id: purchaseOrder.id,
        organizationId
      })
      setShowCompleteDialog(false)
      success(
        "Order Completed",
        `Purchase order ${purchaseOrder.orderNumber} has been marked as completed`,
        { duration: 4000, sound: true }
      )
    } catch (error) {
      notifyError(
        "Completion Failed",
        "Failed to complete purchase order. Please try again.",
        { duration: 6000, sound: true }
      )
    }
  }, [completeMutation, notifyError, organizationId, purchaseOrder, success])

  const handleClone = useCallback(() => {
    if (!purchaseOrder) return
    router.push(localizedHref(`/dashboard/purchase-orders/new?clone=${purchaseOrder.id}`))
    info(
      "Cloning Order",
      "Redirecting to create a new order based on this one",
      { duration: 3000, sound: false }
    )
  }, [info, localizedHref, purchaseOrder, router])

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
                <Download className="w-4 h-4 mr-2" />
                PDF
              </Button>

              <Button
                variant="outline"
                size="sm"
                onClick={handleClone}
                className="dashboard-button-secondary rounded-lg"
              >
                <Copy className="w-4 h-4 mr-2" />
                Clone
              </Button>

              {purchaseOrder.status === 'DRAFT' && (
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

              {purchaseOrder.status === 'SUBMITTED' && (
                <Dialog open={showApproveDialog} onOpenChange={setShowApproveDialog}>
                  <DialogTrigger asChild>
                    <Button
                      size="sm"
                      className="dashboard-button-primary rounded-lg"
                    >
                      <CheckCircle className="w-4 h-4 mr-2" />
                      Approve
                    </Button>
                  </DialogTrigger>
                  <DialogContent className="dashboard-glass-panel rounded-lg border-[var(--dash-border-subtle)] text-[var(--dash-text)]">
                    <DialogHeader>
                      <DialogTitle>Approve Purchase Order</DialogTitle>
                      <DialogDescription>
                        Are you sure you want to approve purchase order {purchaseOrder.orderNumber}?
                        This action will move the order to approved status.
                      </DialogDescription>
                    </DialogHeader>
                    <div className="flex justify-end gap-2 mt-4">
                      <Button variant="outline" onClick={() => setShowApproveDialog(false)} className="dashboard-button-secondary rounded-lg">
                        Cancel
                      </Button>
                      <Button
                        onClick={handleApprove}
                        disabled={approveMutation.isPending}
                        className="dashboard-button-primary rounded-lg"
                      >
                        {approveMutation.isPending ? "Approving..." : "Approve"}
                      </Button>
                    </div>
                  </DialogContent>
                </Dialog>
              )}

              {/* Submit Button - Only for DRAFT status */}
              {purchaseOrder.status === 'DRAFT' && (
                <Dialog open={showSubmitDialog} onOpenChange={setShowSubmitDialog}>
                  <DialogTrigger asChild>
                    <Button
                      size="sm"
                      className="dashboard-button-primary rounded-lg"
                    >
                      <Send className="w-4 h-4 mr-2" />
                      Submit
                    </Button>
                  </DialogTrigger>
                  <DialogContent className="dashboard-glass-panel rounded-lg border-[var(--dash-border-subtle)] text-[var(--dash-text)]">
                    <DialogHeader>
                      <DialogTitle>Submit Purchase Order</DialogTitle>
                      <DialogDescription>
                        Are you sure you want to submit purchase order {purchaseOrder.orderNumber}?
                        This will send the order for approval.
                      </DialogDescription>
                    </DialogHeader>
                    <div className="flex justify-end gap-2 mt-4">
                      <Button variant="outline" onClick={() => setShowSubmitDialog(false)} className="dashboard-button-secondary rounded-lg">
                        Cancel
                      </Button>
                      <Button
                        onClick={handleSubmit}
                        disabled={submitMutation.isPending}
                        className="dashboard-button-primary rounded-lg"
                      >
                        {submitMutation.isPending ? "Submitting..." : "Submit Order"}
                      </Button>
                    </div>
                  </DialogContent>
                </Dialog>
              )}

              {/* Receive Items Button - For APPROVED and PARTIALLY_RECEIVED status */}
              {(purchaseOrder.status === 'APPROVED' || purchaseOrder.status === 'PARTIALLY_RECEIVED') && (
                <Dialog open={showReceiveDialog} onOpenChange={setShowReceiveDialog}>
                  <DialogTrigger asChild>
                    <Button
                      size="sm"
                      className="dashboard-button-primary rounded-lg"
                    >
                      <Package className="w-4 h-4 mr-2" />
                      Receive Items
                    </Button>
                  </DialogTrigger>
                  <DialogContent className="dashboard-glass-panel max-h-[82vh] max-w-5xl overflow-y-auto rounded-lg border-[var(--dash-border-subtle)] text-[var(--dash-text)]">
                    <DialogHeader>
                      <DialogTitle className="text-[var(--dash-text)]">Receive Items - {purchaseOrder.orderNumber}</DialogTitle>
                      <DialogDescription className="text-[var(--dash-text-soft)]">
                        Enter the quantity received for each item. You can receive items partially.
                      </DialogDescription>
                      {/* Bulk Actions */}
                      <div className="flex gap-2 pt-2">
                        <Button
                          type="button"
                          size="sm"
                          onClick={() => {
                            const newReceiveItems: Record<string, ReceiveItemDraft> = {}
                            purchaseOrder.lines?.forEach(line => {
                              const orderedQuantity = toNumber(line.orderedQuantity)
                              const maxAllowed = orderedQuantity - toNumber(line.receivedQuantity)
                              if (maxAllowed > 0) {
                                newReceiveItems[line.id] = {
                                  ...receiveItems[line.id],
                                  quantity: orderedQuantity,
                                  received: maxAllowed
                                }
                              }
                            })
                            setReceiveItems(newReceiveItems)
                            success(
                              "All Items Selected",
                              "All available quantities have been set for receiving",
                              { duration: 3000, sound: false }
                            )
                          }}
                          className="dashboard-button-primary h-9 rounded-lg"
                        >
                          Receive All Available
                        </Button>
                        <Button
                          type="button"
                          size="sm"
                          variant="outline"
                          onClick={() => {
                            setReceiveItems({})
                            info(
                              "Quantities Cleared",
                              "All receive quantities have been reset to zero",
                              { duration: 3000, sound: false }
                            )
                          }}
                          className="dashboard-button-secondary h-9 rounded-lg"
                        >
                          Clear All
                        </Button>
                      </div>
                    </DialogHeader>
                    <div className="space-y-4 mt-4">
                      {purchaseOrder.lines && purchaseOrder.lines.length > 0 ? (
                        <>
                          {/* Items Table */}
                          <div className="dashboard-table-shell dashboard-data-table overflow-x-auto rounded-lg">
                          <Table>
                            <TableHeader>
                              <TableRow>
                                <TableHead>Item</TableHead>
                                <TableHead>Ordered Qty</TableHead>
                                <TableHead>Already Received</TableHead>
                                <TableHead>Receiving Now</TableHead>
                                <TableHead>Unit Cost</TableHead>
                                <TableHead>Line Total</TableHead>
                              </TableRow>
                            </TableHeader>
                            <TableBody>
                              {purchaseOrder.lines.map((line) => (
                                <TableRow key={line.id}>
                                  <TableCell>
                                    <div className="font-medium">
                                      {line.item?.name || `Item ${line.itemId}`}
                                    </div>
                                    {line.item?.sku && (
                                      <div className="text-sm text-muted-foreground">
                                        SKU: {line.item.sku}
                                      </div>
                                    )}
                                  </TableCell>
                                  <TableCell className="font-medium">{toNumber(line.orderedQuantity)}</TableCell>
                                  <TableCell className="text-muted-foreground">{toNumber(line.receivedQuantity)}</TableCell>
                                  <TableCell>
                                    <div className="space-y-1">
                                      <div className="relative">
                                        <input
                                          type="number"
                                          min="0"
                                          max={toNumber(line.orderedQuantity) - toNumber(line.receivedQuantity)}
                                          className={`dashboard-control h-9 w-20 rounded-lg px-2 py-1 text-center ${receiveItems[line.id]?.received > (toNumber(line.orderedQuantity) - toNumber(line.receivedQuantity))
                                              ? 'border-[var(--dash-danger)]'
                                              : ''
                                            }`}
                                          value={receiveItems[line.id]?.received || 0}
                                          onChange={(e) => {
                                            const inputValue = parseInt(e.target.value) || 0
                                            const orderedQuantity = toNumber(line.orderedQuantity)
                                            const maxAllowed = orderedQuantity - toNumber(line.receivedQuantity)

                                            // Hard limit enforcement
                                            const finalValue = Math.min(Math.max(0, inputValue), maxAllowed)

                                            // Show notification if user tried to exceed limit
                                            if (inputValue > maxAllowed && inputValue > 0) {
                                              warning(
                                                "Quantity Limited",
                                                `Maximum ${maxAllowed} units can be received for ${line.item?.name || 'this item'}. Input automatically adjusted.`,
                                                { duration: 5000, sound: true }
                                              )
                                            }

                                            setReceiveItems(prev => ({
                                              ...prev,
                                              [line.id]: {
                                                ...prev[line.id],
                                                quantity: orderedQuantity,
                                                received: finalValue
                                              }
                                            }))
                                          }}
                                          onKeyDown={(e) => {
                                            // Allow: backspace, delete, tab, escape, enter
                                            if ([8, 9, 27, 13, 46].indexOf(e.keyCode) !== -1 ||
                                              // Allow: Ctrl+A, Ctrl+C, Ctrl+V, Ctrl+X
                                              (e.keyCode === 65 && e.ctrlKey === true) ||
                                              (e.keyCode === 67 && e.ctrlKey === true) ||
                                              (e.keyCode === 86 && e.ctrlKey === true) ||
                                              (e.keyCode === 88 && e.ctrlKey === true) ||
                                              // Allow: home, end, left, right
                                              (e.keyCode >= 35 && e.keyCode <= 39)) {
                                              return
                                            }
                                            // Ensure that it is a number and stop the keypress
                                            if ((e.shiftKey || (e.keyCode < 48 || e.keyCode > 57)) && (e.keyCode < 96 || e.keyCode > 105)) {
                                              e.preventDefault()
                                              info(
                                                "Numbers Only",
                                                "Please enter numeric values only",
                                                { duration: 2000, sound: false }
                                              )
                                            }
                                          }}
                                          onBlur={(e) => {
                                            // Additional validation on blur to ensure clean state
                                            const inputValue = parseInt(e.target.value) || 0
                                            const orderedQuantity = toNumber(line.orderedQuantity)
                                            const maxAllowed = orderedQuantity - toNumber(line.receivedQuantity)
                                            const finalValue = Math.min(Math.max(0, inputValue), maxAllowed)

                                            if (inputValue !== finalValue) {
                                              setReceiveItems(prev => ({
                                                ...prev,
                                                [line.id]: {
                                                  ...prev[line.id],
                                                  quantity: orderedQuantity,
                                                  received: finalValue
                                                }
                                              }))
                                            }
                                          }}
                                        />
                                        {/* Max quantity indicator */}
                                        <div className="absolute -right-16 top-1 text-xs text-[var(--dash-text-faint)] whitespace-nowrap">
                                          max: {toNumber(line.orderedQuantity) - toNumber(line.receivedQuantity)}
                                        </div>
                                      </div>
                                      {/* Quick action buttons */}
                                      <div className="flex gap-1 mt-1">
                                        <Button
                                          type="button"
                                          size="sm"
                                          variant="outline"
                                          onClick={() => {
                                            const orderedQuantity = toNumber(line.orderedQuantity)
                                            const maxAllowed = orderedQuantity - toNumber(line.receivedQuantity)
                                            setReceiveItems(prev => ({
                                              ...prev,
                                              [line.id]: {
                                                ...prev[line.id],
                                                quantity: orderedQuantity,
                                                received: maxAllowed
                                              }
                                            }))
                                          }}
                                          className="dashboard-button-secondary h-7 rounded-md px-2 text-xs"
                                          disabled={(toNumber(line.orderedQuantity) - toNumber(line.receivedQuantity)) === 0}
                                        >
                                          All
                                        </Button>
                                        <Button
                                          type="button"
                                          size="sm"
                                          variant="outline"
                                          onClick={() => {
                                            setReceiveItems(prev => ({
                                              ...prev,
                                              [line.id]: {
                                                ...prev[line.id],
                                                quantity: toNumber(line.orderedQuantity),
                                                received: 0
                                              }
                                            }))
                                          }}
                                          className="dashboard-button-secondary h-7 rounded-md px-2 text-xs"
                                        >
                                          Clear
                                        </Button>
                                      </div>
                                      {/* Validation message */}
                                      {receiveItems[line.id]?.received > (toNumber(line.orderedQuantity) - toNumber(line.receivedQuantity)) && (
                                        <div className="text-xs text-[var(--dash-danger)]">
                                          Exceeds maximum ({toNumber(line.orderedQuantity) - toNumber(line.receivedQuantity)})
                                        </div>
                                      )}
                                      {(line.item?.trackBatches || line.item?.trackExpiry || line.item?.trackSerialNumbers) && (
                                        <div className="mt-3 space-y-2 rounded-lg border border-[var(--dash-border-subtle)] bg-[rgba(24,38,45,0.58)] p-3">
                                          {line.item?.trackBatches && (
                                            <label className="block text-xs font-medium text-[var(--dash-text-soft)]">
                                              Batch number
                                              <input
                                                type="text"
                                                value={receiveItems[line.id]?.batchNumber || ""}
                                                onChange={(event) =>
                                                  setReceiveItems((prev) => ({
                                                    ...prev,
                                                    [line.id]: {
                                                      ...prev[line.id],
                                                      quantity: toNumber(line.orderedQuantity),
                                                      received: prev[line.id]?.received || 0,
                                                      batchNumber: event.target.value,
                                                    },
                                                  }))
                                                }
                                                className="dashboard-control mt-1 w-full rounded-lg px-2 py-1 text-xs"
                                                placeholder="Batch / lot number"
                                              />
                                            </label>
                                          )}
                                          {line.item?.trackExpiry && (
                                            <label className="block text-xs font-medium text-[var(--dash-text-soft)]">
                                              Expiry date
                                              <input
                                                type="date"
                                                value={receiveItems[line.id]?.expiryDate || ""}
                                                onChange={(event) =>
                                                  setReceiveItems((prev) => ({
                                                    ...prev,
                                                    [line.id]: {
                                                      ...prev[line.id],
                                                      quantity: toNumber(line.orderedQuantity),
                                                      received: prev[line.id]?.received || 0,
                                                      expiryDate: event.target.value,
                                                    },
                                                  }))
                                                }
                                                className="dashboard-control mt-1 w-full rounded-lg px-2 py-1 text-xs"
                                              />
                                            </label>
                                          )}
                                          {line.item?.trackSerialNumbers && (
                                            <div className="rounded-md border border-[var(--dash-info)]/30 bg-[var(--dash-info-soft)] px-3 py-2 text-xs text-[var(--dash-text-muted)]">
                                              Serial-tracked item. Serial numbers will be generated automatically for the received quantity.
                                            </div>
                                          )}
                                        </div>
                                      )}
                                    </div>
                                  </TableCell>
                                  <TableCell>
                                    <div className="font-medium text-green-600">
                                      {formatCurrency(toNumber(line.unitCost))}
                                    </div>
                                  </TableCell>
                                  <TableCell>
                                    <div className="font-semibold">
                                      {formatCurrency(toNumber(line.lineTotal) || (toNumber(line.unitCost) * toNumber(line.orderedQuantity)))}
                                    </div>
                                    {receiveItems[line.id]?.received > 0 && (
                                      <div className="text-sm text-muted-foreground">
                                        Receiving: {formatCurrency(toNumber(line.unitCost) * (receiveItems[line.id]?.received || 0))}
                                      </div>
                                    )}
                                  </TableCell>
                                </TableRow>
                              ))}
                            </TableBody>
                          </Table>
                          </div>

                          {/* Summary Section */}
                          <div className="mt-6 rounded-lg border border-[var(--dash-border-subtle)] bg-[rgba(24,38,45,0.58)] p-4">
                            <h4 className="font-semibold mb-3">Receiving Summary</h4>
                            <div className="grid grid-cols-2 gap-4 text-sm">
                              <div>
                                <div className="flex justify-between">
                                  <span>Total Order Value:</span>
                                  <span className="font-medium">{formatCurrency(toNumber(purchaseOrder.total))}</span>
                                </div>
                                <div className="flex justify-between">
                                  <span>Items to Receive:</span>
                                  <span className="font-medium">
                                    {receivingTotals.totalUnits} units
                                  </span>
                                </div>
                              </div>
                              <div>
                                <div className="flex justify-between">
                                  <span>Value Receiving:</span>
                                  <span className="font-semibold text-[var(--dash-warning)]">
                                    {formatCurrency(receivingTotals.totalValue)}
                                  </span>
                                </div>
                                <div className="flex justify-between">
                                  <span>Lines with Items:</span>
                                  <span className="font-medium">
                                    {receivingTotals.linesWithItems} of {purchaseOrder.lines?.length || 0}
                                  </span>
                                </div>
                              </div>
                            </div>
                          </div>
                        </>
                      ) : (
                        <div className="text-center py-8 text-muted-foreground">
                          <Package className="mx-auto h-12 w-12 mb-4 opacity-50" />
                          <p>No items found in this purchase order</p>
                        </div>
                      )}
                    </div>
                    <div className="space-y-2 mt-4">
                      {Object.values(receiveItems).every(item => item.received === 0) && (
                        <p className="text-center text-sm text-[var(--dash-text-soft)]">
                          Enter quantities above to enable receiving
                        </p>
                      )}
                      <div className="flex justify-end gap-2">
                        <Button variant="outline" onClick={() => setShowReceiveDialog(false)} className="dashboard-button-secondary rounded-lg">
                          Cancel
                        </Button>
                        <Button
                          onClick={handleReceive}
                          disabled={
                            receiveItemsMutation.isPending ||
                            Object.values(receiveItems).every(item => item.received === 0)
                          }
                          className="dashboard-button-primary rounded-lg disabled:opacity-50"
                        >
                          {receiveItemsMutation.isPending ? "Receiving..." : "Receive Items"}
                        </Button>
                      </div>
                    </div>
                  </DialogContent>
                </Dialog>
              )}

              {/* Force Complete Button - For PARTIALLY_RECEIVED status */}
              {purchaseOrder.status === 'PARTIALLY_RECEIVED' && (
                <Dialog open={showCompleteDialog} onOpenChange={setShowCompleteDialog}>
                  <DialogTrigger asChild>
                    <Button
                      size="sm"
                      variant="outline"
                      className="dashboard-button-secondary rounded-lg text-[var(--dash-warning)]"
                    >
                      <CheckCircle className="w-4 h-4 mr-2" />
                      Force Complete
                    </Button>
                  </DialogTrigger>
                  <DialogContent className="dashboard-glass-panel rounded-lg border-[var(--dash-border-subtle)] text-[var(--dash-text)]">
                    <DialogHeader>
                      <DialogTitle>Force Complete Purchase Order</DialogTitle>
                      <DialogDescription>
                        This order is only partially received. Are you sure you want to mark it as completed?
                        This will close the order and prevent further receiving.
                      </DialogDescription>
                    </DialogHeader>
                    <div className="flex justify-end gap-2 mt-4">
                      <Button variant="outline" onClick={() => setShowCompleteDialog(false)} className="dashboard-button-secondary rounded-lg">
                        Cancel
                      </Button>
                      <Button
                        onClick={handleComplete}
                        disabled={completeMutation.isPending}
                        className="dashboard-button-primary rounded-lg"
                      >
                        {completeMutation.isPending ? "Completing..." : "Force Complete"}
                      </Button>
                    </div>
                  </DialogContent>
                </Dialog>
              )}

              {/* Complete Order Button - Only for RECEIVED status */}
              {purchaseOrder.status === 'RECEIVED' && (
                <Dialog open={showCompleteDialog} onOpenChange={setShowCompleteDialog}>
                  <DialogTrigger asChild>
                    <Button
                      size="sm"
                      className="dashboard-button-primary rounded-lg"
                    >
                      <CheckCircle className="w-4 h-4 mr-2" />
                      Complete Order
                    </Button>
                  </DialogTrigger>
                  <DialogContent className="dashboard-glass-panel rounded-lg border-[var(--dash-border-subtle)] text-[var(--dash-text)]">
                    <DialogHeader>
                      <DialogTitle>Complete Purchase Order</DialogTitle>
                      <DialogDescription>
                        Are you sure you want to mark purchase order {purchaseOrder.orderNumber} as completed?
                        This will finalize the order and close it.
                      </DialogDescription>
                    </DialogHeader>
                    <div className="flex justify-end gap-2 mt-4">
                      <Button variant="outline" onClick={() => setShowCompleteDialog(false)} className="dashboard-button-secondary rounded-lg">
                        Cancel
                      </Button>
                      <Button
                        onClick={handleComplete}
                        disabled={completeMutation.isPending}
                        className="dashboard-button-primary rounded-lg"
                      >
                        {completeMutation.isPending ? "Completing..." : "Complete Order"}
                      </Button>
                    </div>
                  </DialogContent>
                </Dialog>
              )}

              {!['RECEIVED', 'COMPLETED', 'CANCELLED'].includes(purchaseOrder.status) && (
                <Dialog open={showCancelDialog} onOpenChange={setShowCancelDialog}>
                  <DialogTrigger asChild>
                    <Button
                      variant="outline"
                      size="sm"
                      className="dashboard-button-secondary rounded-lg text-[var(--dash-danger)]"
                    >
                      <XCircle className="w-4 h-4 mr-2" />
                      Cancel
                    </Button>
                  </DialogTrigger>
                  <DialogContent className="dashboard-glass-panel rounded-lg border-[var(--dash-border-subtle)] text-[var(--dash-text)]">
                    <DialogHeader>
                      <DialogTitle>Cancel Purchase Order</DialogTitle>
                      <DialogDescription>
                        Are you sure you want to cancel purchase order {purchaseOrder.orderNumber}?
                        This action cannot be undone.
                      </DialogDescription>
                    </DialogHeader>
                    <div className="space-y-4 mt-4">
                      <div>
                        <label className="text-sm font-medium text-[var(--dash-text-muted)]">Reason for cancellation (optional)</label>
                        <Textarea
                          value={cancelReason}
                          onChange={(e) => setCancelReason(e.target.value)}
                          placeholder="Enter reason for cancellation..."
                          className="dashboard-control mt-1 min-h-24 rounded-lg"
                        />
                      </div>
                      <div className="flex justify-end gap-2">
                        <Button variant="outline" onClick={() => setShowCancelDialog(false)} className="dashboard-button-secondary rounded-lg">
                          Keep Order
                        </Button>
                        <Button
                          onClick={handleCancel}
                          disabled={cancelMutation.isPending}
                          className="rounded-lg bg-[var(--dash-danger)] text-white hover:bg-[var(--dash-danger)]/90"
                        >
                          {cancelMutation.isPending ? "Cancelling..." : "Cancel Order"}
                        </Button>
                      </div>
                    </div>
                  </DialogContent>
                </Dialog>
              )}
            </div>
          </div>
        </div>

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
                  Receipts
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
                  History
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
                            <Download className="w-4 h-4 mr-2" />
                            Download PDF
                          </Button>
                          <Button
                            variant="outline"
                            className="w-full justify-start"
                            onClick={handleClone}
                          >
                            <Copy className="w-4 h-4 mr-2" />
                            Clone Order
                          </Button>
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

              {/* Receipts Tab */}
              <TabsContent value="receipts" className="mt-0">
                <Card className="dashboard-glass-panel rounded-lg text-[var(--dash-text)]">
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <Receipt className="w-5 h-5" />
                      Goods Receipts
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    {receiptsLoading ? (
                      <div className="space-y-4">
                        {[...Array(3)].map((_, i) => (
                          <Skeleton key={i} className="h-16" />
                        ))}
                      </div>
                    ) : goodsReceipts && goodsReceipts.length > 0 ? (
                      <div className="space-y-4">
                        {goodsReceipts.map((receipt) => (
                          <div key={receipt.id} className="border rounded-lg p-4 bg-white/30">
                            <div className="flex justify-between items-start mb-3">
                              <div>
                                <h4 className="font-semibold">Receipt #{receipt.receiptNumber || receipt.id}</h4>
                                <p className="text-sm text-muted-foreground">
                                  Received on {formatDate(new Date(receipt.createdAt), 'PPP')} at {format(new Date(receipt.createdAt), 'p')}
                                </p>
                                {receipt.receivedBy && (
                                  <p className="text-sm text-muted-foreground">
                                    Received by: {receipt.receivedBy.name || receipt.receivedBy.email}
                                  </p>
                                )}
                              </div>
                              <Badge variant="outline" className="bg-green-50 text-green-700 border-green-200">
                                <CheckCircle className="w-3 h-3 mr-1" />
                                Received
                              </Badge>
                            </div>
                            {receipt.notes && (
                              <p className="text-sm text-muted-foreground mb-3">
                                <strong>Notes:</strong> {receipt.notes}
                              </p>
                            )}
                            <div className="space-y-2">
                              <h5 className="font-medium text-sm">Items Received:</h5>
                              {receipt.lines?.map((line) => (
                                <div key={line.id} className="flex justify-between items-center py-1 px-3 bg-slate-50 rounded text-sm">
                                  <span className="font-medium">{line.item?.name || `Item ${line.itemId}`}</span>
                                  <span className="text-muted-foreground">
                                    Qty: {toNumber(line.receivedQuantity)}
                                    {toNumber(line.unitCost) > 0 && (
                                      <span className="ml-2">
                                        @ {formatCurrency(toNumber(line.unitCost))} = {formatCurrency(toNumber(line.unitCost) * toNumber(line.receivedQuantity))}
                                      </span>
                                    )}
                                  </span>
                                </div>
                              ))}
                            </div>
                          </div>
                        ))}
                      </div>
                    ) : (
                      <div className="text-center py-8 text-slate-500 dark:text-slate-400">
                        <Receipt className="w-12 h-12 mx-auto mb-4 opacity-50" />
                        <p>No goods receipts found</p>
                        <p className="text-sm">Receipts will appear here when items are received</p>
                      </div>
                    )}
                  </CardContent>
                </Card>
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
                                <strong>Inventory Updated:</strong> Added {toNumber(line.receivedQuantity)} units to inventory at {formatCurrency(toNumber(line.unitCost))} each
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
                <Card className="dashboard-glass-panel rounded-lg text-[var(--dash-text)]">
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <History className="w-5 h-5" />
                      Status History
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-4">
                      <div className="flex items-center gap-3 p-3 rounded-lg bg-slate-50 dark:bg-slate-800">
                        <div className="w-8 h-8 rounded-full bg-emerald-100 dark:bg-emerald-900/30 flex items-center justify-center">
                          <CheckCircle className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
                        </div>
                        <div className="flex-1">
                          <div className="font-medium">Order Created</div>
                          <div className="text-sm text-slate-600 dark:text-slate-400">
                            {purchaseOrder?.createdAt
                              ? format(new Date(purchaseOrder.createdAt), 'MMM dd, yyyy at h:mm a')
                              : 'Date not available'}
                          </div>
                        </div>
                      </div>
                      {purchaseOrder.status !== 'DRAFT' && (
                        <div className="flex items-center gap-3 p-3 rounded-lg bg-slate-50 dark:bg-slate-800">
                          <div className="w-8 h-8 rounded-full bg-blue-100 dark:bg-blue-900/30 flex items-center justify-center">
                            <Send className="w-4 h-4 text-blue-600 dark:text-blue-400" />
                          </div>
                          <div className="flex-1">
                            <div className="font-medium">Status: {statusConfig.label}</div>
                            <div className="text-sm text-slate-600 dark:text-slate-400">Current status</div>
                          </div>
                        </div>
                      )}
                    </div>
                  </CardContent>
                </Card>
              </TabsContent>
            </div>
            </Tabs>
        </Card>
      </div>
    </div>
  )
}
