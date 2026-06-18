import { getOrgPurchaseOrderById as getPurchaseOrder } from "@/actions/purchaseOrderWorkflow/newPOActions"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { Separator } from "@/components/ui/separator"
import { pickLocale } from "@/i18n/routing"
import { formatCurrency } from "@/lib/i18n/formatters"
import type { PurchaseOrderStatus } from "@/services/purchase-order/purchase-order.schemas"
import type { Locale } from "@/types/bilingual"
import { format } from "date-fns"
import { ArrowLeft, AtSign, Building2, Calendar, CreditCard, DollarSign, Edit, FileText, Hash, Mail, MapPin, MoreHorizontal, Package, Phone, User } from 'lucide-react'
import { getLocale } from "next-intl/server"
import { Link } from "@/i18n/navigation"
import { notFound } from "next/navigation"
import React from "react"

// Small helpers
function safeDate(d?: string | Date | null) {
  if (!d) return null
  return d instanceof Date ? d : new Date(d)
}

type StatusVariant = "secondary" | "outline" | "default" | "destructive"

// Status component
const StatusBadge = ({ status }: { status: PurchaseOrderStatus }) => {
  const statusConfig: Record<PurchaseOrderStatus, { label: string; variant: StatusVariant }> = {
    DRAFT: { label: "Draft", variant: "secondary" },
    SUBMITTED: { label: "Submitted", variant: "default" },
    APPROVED: { label: "Approved", variant: "default" },
    PARTIALLY_RECEIVED: { label: "Partially Received", variant: "secondary" },
    RECEIVED: { label: "Received", variant: "default" },
    COMPLETED: { label: "Completed", variant: "default" },
    CANCELLED: { label: "Cancelled", variant: "destructive" },
  }
  const config = statusConfig[status] ?? statusConfig.DRAFT
  return <Badge variant={config.variant}>{config.label}</Badge>
}

// Info card
interface InfoCardProps {
  title: string
  icon: React.ReactNode
  children: React.ReactNode
}
const InfoCard = ({ title, icon, children }: InfoCardProps) => (
  <Card>
    <CardHeader className="pb-3">
      <CardTitle className="flex items-center gap-2 text-base font-medium">
        {icon}
        {title}
      </CardTitle>
    </CardHeader>
    <CardContent className="pt-0">{children}</CardContent>
  </Card>
)

// Action buttons (stub routes)
const ActionButtons = () => (
  <div className="flex flex-wrap items-center gap-2">
    <Button variant="outline" size="sm" asChild>
      <Link href="#edit">
        <Edit className="me-2 h-4 w-4" />
        Edit
      </Link>
    </Button>
    <Button variant="outline" size="sm" asChild>
      <Link href="#send-mail">
        <Mail className="me-2 h-4 w-4" />
        Send Mail
      </Link>
    </Button>
    <Button variant="outline" size="sm" asChild>
      <Link href="#pdf">
        <FileText className="me-2 h-4 w-4" />
        PDF/Print
      </Link>
    </Button>
    <Button variant="outline" size="sm" asChild>
      <Link href="#receive">
        <Package className="me-2 h-4 w-4" />
        Receive
      </Link>
    </Button>
    <Button variant="outline" size="sm" asChild>
      <Link href="#convert">
        <CreditCard className="me-2 h-4 w-4" />
        Convert to Bill
      </Link>
    </Button>
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="outline" size="sm">
          <MoreHorizontal className="h-4 w-4" />
          <span className="sr-only">More options</span>
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end">
        <DropdownMenuItem>
          <Edit className="me-2 h-4 w-4" />
          Edit Purchase Order
        </DropdownMenuItem>
        <DropdownMenuItem>
          <Mail className="me-2 h-4 w-4" />
          Send Mail
        </DropdownMenuItem>
        <DropdownMenuItem>
          <FileText className="me-2 h-4 w-4" />
          PDF/Print
        </DropdownMenuItem>
        <DropdownMenuSeparator />
        <DropdownMenuItem>
          <Package className="me-2 h-4 w-4" />
          Duplicate
        </DropdownMenuItem>
        <DropdownMenuItem>
          <CreditCard className="me-2 h-4 w-4" />
          Mark as Approved
        </DropdownMenuItem>
        <DropdownMenuSeparator />
        <DropdownMenuItem className="text-red-600">Cancel Order</DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  </div>
)

// Narrow type for lines used here
type POLine = {
  id: string
  itemId: string
  notes?: string | null
  orderedQuantity: number
  receivedQuantity?: number | null
  unitCost: number
  taxRate?: number | null
  taxAmount?: number | null
  discount?: number | null
  lineTotal: number
  item?: {
    id: string
    name: string
    sku: string
    costPrice?: number | null
    description?: string | null
  } | null
}

type PurchaseOrderDetails = {
  id: string
  orderNumber: string
  status: PurchaseOrderStatus
  createdAt: string | Date
  orderDate?: string | Date | null
  expectedDeliveryDate?: string | Date | null
  actualDeliveryDate?: string | Date | null
  subtotal: number
  taxAmount: number
  shippingCost: number
  discount: number
  total: number
  supplier: {
    id: string
    name: string
    email?: string | null
    phone?: string | null
    contactPerson?: string | null
    address?: string | null
  }
  location: {
    id: string
    name: string
    address?: string | null
    phone?: string | null
    email?: string | null
  }
  createdBy?: { id: string; name?: string | null; email?: string | null } | null
  approvedBy?: { id: string; name?: string | null; email?: string | null } | null
  lines: POLine[]
}

interface PurchaseOrderDetailsPageProps {
  params: Promise<{ locale: string; id: string }>
}

const PurchaseOrderPage = async ({ params }: PurchaseOrderDetailsPageProps) => {
  const { id: orderId } = await params
  const locale: Locale = pickLocale(await getLocale())

  let purchaseOrderDetailsData: PurchaseOrderDetails | null = null
  try {
    const response = await getPurchaseOrder(orderId)
    purchaseOrderDetailsData = (response ?? null) as PurchaseOrderDetails | null
  } catch (e) {
    // handled below
  }

  if (!purchaseOrderDetailsData) {
    notFound()
  }

  const {
    supplier,
    lines,
    id,
    createdAt,
    status,
    orderNumber,
    location,
    createdBy,
    approvedBy,
    subtotal,
    taxAmount,
    shippingCost,
    discount,
    total,
  } = purchaseOrderDetailsData!

  // Fallback totals if needed
  const computedTotalAmount =
    Array.isArray(lines) && lines.length > 0
      ? lines.reduce((acc, line) => acc + (Number(line.lineTotal) || 0), 0)
      : 0

  const displaySubtotal = Number.isFinite(subtotal) ? subtotal : computedTotalAmount
  const displayTax = Number.isFinite(taxAmount) ? taxAmount : 0
  const displayShipping = Number.isFinite(shippingCost) ? shippingCost : 0
  const displayDiscount = Number.isFinite(discount) ? discount : 0
  const displayGrandTotal =
    Number.isFinite(total) && total > 0
      ? total
      : displaySubtotal + displayTax + displayShipping - displayDiscount

  return (
    <div className="min-h-screen bg-gray-50/30">
      <div className="container mx-auto py-6 px-4 sm:px-6 lg:px-8">
        {/* Header */}
        <div className="mb-6">
          <div className="flex items-center justify-between mb-4">
            <Button variant="ghost" size="sm" asChild>
              <Link href="/dashboard/purchase-orders" className="text-muted-foreground hover:text-foreground">
                <ArrowLeft className="me-2 h-4 w-4" />
                Back to Purchase Orders
              </Link>
            </Button>
          </div>

          <div className="flex flex-col lg:flex-row lg:items-start lg:justify-between gap-6">
            {/* Title and Status */}
            <div className="space-y-1">
              <h1 className="text-3xl font-bold tracking-tight">
                {orderNumber ? `Purchase Order ${orderNumber}` : `Purchase Order ${id.slice(-8).toUpperCase()}`}
              </h1>
              <div className="flex flex-wrap items-center gap-4 text-sm text-muted-foreground">
                <div className="flex items-center gap-2">
                  <StatusBadge status={status} />
                </div>
                <div className="flex items-center gap-1">
                  <Calendar className="h-4 w-4" />
                  <span>
                    Created{" "}
                    {(() => {
                      const d = safeDate(createdAt)
                      return d ? format(d, "PPP") : "—"
                    })()}
                  </span>
                </div>
                <div className="flex items-center gap-1">
                  <Hash className="h-4 w-4" />
                  {id.slice(-8).toUpperCase()}
                </div>
                {orderNumber && (
                  <div className="flex items-center gap-1">
                    <FileText className="h-4 w-4" />
                    {orderNumber}
                  </div>
                )}
              </div>
            </div>

            {/* Action Buttons */}
            <ActionButtons />
          </div>
        </div>

        <Separator className="mb-6" />

        {/* Content Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-6">
          {/* Supplier Information */}
          <InfoCard title="Supplier Information" icon={<Building2 className="h-4 w-4" />}>
            <div className="space-y-2">
              <div className="flex items-center gap-2">
                <Building2 className="h-4 w-4 text-muted-foreground" />
                <span className="font-medium">{supplier?.name ?? "Unknown supplier"}</span>
              </div>
              {supplier?.email && (
                <div className="flex items-center gap-2">
                  <AtSign className="h-4 w-4 text-muted-foreground" />
                  <span className="text-sm">{supplier.email}</span>
                </div>
              )}
              {supplier?.phone && (
                <div className="flex items-center gap-2">
                  <Phone className="h-4 w-4 text-muted-foreground" />
                  <span className="text-sm">{supplier.phone}</span>
                </div>
              )}
              {supplier?.contactPerson && (
                <div className="flex items-center gap-2">
                  <User className="h-4 w-4 text-muted-foreground" />
                  <span className="text-sm">{supplier.contactPerson}</span>
                </div>
              )}
              {supplier?.address && (
                <div className="flex items-start gap-2">
                  <MapPin className="h-4 w-4 text-muted-foreground mt-0.5" />
                  <span className="text-sm">{supplier.address}</span>
                </div>
              )}
            </div>
          </InfoCard>

          {/* Delivery Location */}
          <InfoCard title="Delivery Location" icon={<MapPin className="h-4 w-4" />}>
            <div className="space-y-2">
              <div className="flex items-center gap-2">
                <MapPin className="h-4 w-4 text-muted-foreground" />
                <span className="font-medium">{location?.name ?? "Unknown location"}</span>
              </div>
              {location?.address && <div className="text-sm text-muted-foreground">{location.address}</div>}
              {location?.phone && (
                <div className="flex items-center gap-2">
                  <Phone className="h-4 w-4 text-muted-foreground" />
                  <span className="text-sm">{location.phone}</span>
                </div>
              )}
              {location?.email && (
                <div className="flex items-center gap-2">
                  <AtSign className="h-4 w-4 text-muted-foreground" />
                  <span className="text-sm">{location.email}</span>
                </div>
              )}
            </div>
          </InfoCard>

          {/* Order Details */}
          <InfoCard title="Order Details" icon={<DollarSign className="h-4 w-4" />}>
            <div className="space-y-2">
              <div className="flex justify-between items-center">
                <span className="text-sm text-muted-foreground">Total Items:</span>
                <span className="font-medium">{lines?.length ?? 0}</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-sm text-muted-foreground">Total Quantity (Ordered):</span>
                <span className="font-medium">
                  {Array.isArray(lines) ? lines.reduce((acc, line) => acc + (line.orderedQuantity || 0), 0) : 0}
                </span>
              </div>
              <Separator />
              <div className="flex justify-between items-center">
                <span className="font-medium">Total Amount:</span>
                <span className="text-lg font-bold text-primary">{formatCurrency(displayGrandTotal, locale, "USD")}</span>
              </div>
            </div>
          </InfoCard>
        </div>

        {/* Additional Information Row */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
          {/* Created By */}
          <InfoCard title="Created By" icon={<User className="h-4 w-4" />}>
            <div className="space-y-2">
              {createdBy ? (
                <>
                  <div className="flex items-center gap-2">
                    <User className="h-4 w-4 text-muted-foreground" />
                    <span className="font-medium">{createdBy.name ?? "Unknown"}</span>
                  </div>
                  {createdBy.email && (
                    <div className="flex items-center gap-2">
                      <AtSign className="h-4 w-4 text-muted-foreground" />
                      <span className="text-sm">{createdBy.email}</span>
                    </div>
                  )}
                </>
              ) : (
                <div className="text-sm text-muted-foreground">Unknown</div>
              )}
            </div>
          </InfoCard>

          {/* Approved By */}
          {approvedBy && (
            <InfoCard title="Approved By" icon={<User className="h-4 w-4" />}>
              <div className="space-y-2">
                <div className="flex items-center gap-2">
                  <User className="h-4 w-4 text-muted-foreground" />
                  <span className="font-medium">{approvedBy.name ?? "Unknown"}</span>
                </div>
                {approvedBy.email && (
                  <div className="flex items-center gap-2">
                    <AtSign className="h-4 w-4 text-muted-foreground" />
                    <span className="text-sm">{approvedBy.email}</span>
                  </div>
                )}
              </div>
            </InfoCard>
          )}
        </div>

        {/* Order Lines Table */}
        <Card className="mb-6">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Package className="h-4 w-4" />
              Order Items
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="overflow-x-auto rounded-md border bg-white">
              <table className="w-full">
                <thead>
                  <tr className="border-b bg-muted/40">
                    <th className="text-start py-2 px-4">Item</th>
                    <th className="text-start py-2 px-4">SKU</th>
                    <th className="text-end py-2 px-4">Quantity</th>
                    <th className="text-end py-2 px-4">Unit Cost</th>
                    <th className="text-end py-2 px-4">Line Total</th>
                  </tr>
                </thead>
                <tbody>
                  {Array.isArray(lines) && lines.length > 0 ? (
                    lines.map((line, index) => {
                      const itemName = line.item?.name ?? "Unknown Item"
                      const sku = line.item?.sku ?? "N/A"
                      const qty = line.orderedQuantity ?? 0
                      const unitCost = Number(line.unitCost) || 0
                      const lineTotal = Number(line.lineTotal) || unitCost * qty
                      return (
                        <tr key={line.id} className={index % 2 === 0 ? "bg-gray-50/50" : ""}>
                          <td className="py-3 px-4">
                            <div>
                              <div className="font-medium">{itemName}</div>
                              {line.notes && <div className="text-sm text-muted-foreground">{line.notes}</div>}
                            </div>
                          </td>
                          <td className="py-3 px-4 text-sm text-muted-foreground">{sku}</td>
                          <td className="py-3 px-4 text-end font-medium">{qty}</td>
                          <td className="py-3 px-4 text-end">{formatCurrency(unitCost, locale, "USD")}</td>
                          <td className="py-3 px-4 text-end font-medium">{formatCurrency(lineTotal, locale, "USD")}</td>
                        </tr>
                      )
                    })
                  ) : (
                    <tr>
                      <td colSpan={5} className="py-6 px-4 text-center text-muted-foreground">
                        No line items
                      </td>
                    </tr>
                  )}
                </tbody>
                <tfoot>
                  <tr className="border-t-2 font-bold">
                    <td colSpan={4} className="py-3 px-4 text-end">
                      Total:
                    </td>
                    <td className="py-3 px-4 text-end text-lg">{formatCurrency(displayGrandTotal, locale, "USD")}</td>
                  </tr>
                </tfoot>
              </table>
            </div>
          </CardContent>
        </Card>

        {/* Summary */}
        <div className="flex items-center justify-end">
          <div className="w-full max-w-xs">
            <div className="rounded-lg bg-muted/40 p-4 shadow-sm">
              <div className="space-y-2">
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Subtotal:</span>
                  <span className="text-muted-foreground">{formatCurrency(displaySubtotal, locale, "USD")}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Tax Amount:</span>
                  <span className="text-muted-foreground">{formatCurrency(displayTax, locale, "USD")}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Shipping:</span>
                  <span className="text-muted-foreground">{formatCurrency(displayShipping, locale, "USD")}</span>
                </div>
                {displayDiscount > 0 && (
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Discount:</span>
                    <span className="text-destructive">-{formatCurrency(displayDiscount, locale, "USD")}</span>
                  </div>
                )}
                <Separator />
                <div className="flex justify-between font-bold">
                  <span>Total Amount:</span>
                  <span className="text-primary">{formatCurrency(displayGrandTotal, locale, "USD")}</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

export default PurchaseOrderPage
