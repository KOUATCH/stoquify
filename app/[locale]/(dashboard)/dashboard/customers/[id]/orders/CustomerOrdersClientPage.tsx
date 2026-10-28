"use client"

import { CustomerQuickActions } from "@/components/customers/CustomerQuickActions"
import { useNotifications } from "@/components/notifications/NotificationProvider"
import { Avatar, AvatarFallback } from "@/components/ui/avatar"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Separator } from "@/components/ui/separator"
import { Skeleton } from "@/components/ui/skeleton"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { TooltipProvider } from "@/components/ui/tooltip"
import { useCustomer, useCustomerOrders } from "@/hooks/useCustomerQueries"
import { useCustomerExport } from "@/hooks/useCustomerManagement"
import { useFormatters } from "@/hooks/useFormatters"
import {
  Activity,
  AlertCircle,
  ArrowLeft,
  ArrowUpDown,
  CheckCircle,
  Clock,
  DollarSign,
  Download,
  Edit,
  Eye,
  Loader2,
  Package,
  Plus,
  Receipt,
  Search,
  ShoppingCart,
  TrendingUp,
  Truck,
  Users,
  XCircle
} from "lucide-react"
import { getLocaleFromPathname, localizePath } from "@/i18n/routing"
import { DEFAULT_LOCALE } from "@/types/bilingual"
import { useParams, usePathname, useRouter } from "next/navigation"
import { useState } from "react"

const ORDER_STATUS_EXPORT = {
  all: "all",
  draft: "DRAFT",
  confirmed: "CONFIRMED",
  processing: "PROCESSING",
  shipped: "SHIPPED",
  delivered: "DELIVERED",
  cancelled: "CANCELLED",
} as const

type OrderStatusFilter = keyof typeof ORDER_STATUS_EXPORT

export default function CustomerOrdersClientPage({
  capabilities,
  currency,
}: {
  capabilities: {
    canCreateStatement: boolean
    canExport: boolean
    canOpenSales: boolean
    canUpdate: boolean
    canViewOrders: boolean
    canViewReceivables: boolean
  }
  currency: string
}) {
  const params = useParams()
  const router = useRouter()
  const pathname = usePathname()
  const locale = getLocaleFromPathname(pathname) ?? DEFAULT_LOCALE
  const tr = (english: string, french: string) => locale === "fr" ? french : english
  const formatDate = (value: Date) => new Intl.DateTimeFormat(
    locale === "fr" ? "fr-FR" : "en-US",
    { dateStyle: "medium" },
  ).format(new Date(value))
  const statusLabel = (status: string) => {
    switch (status.toUpperCase()) {
      case "DRAFT": return tr("Draft", "Brouillon")
      case "CONFIRMED": return tr("Confirmed", "Confirmée")
      case "PROCESSING": return tr("Processing", "En traitement")
      case "SHIPPED": return tr("Shipped", "Expédiée")
      case "DELIVERED": return tr("Delivered", "Livrée")
      case "COMPLETED": return tr("Completed", "Terminée")
      case "CANCELLED": return tr("Cancelled", "Annulée")
      default: return status
    }
  }
  const localizedHref = (href: string) => localizePath(href, locale)
  const customerId = params.id as string

  const { data: customer, isLoading, error } = useCustomer(customerId)
  const { data: customerOrdersData, isLoading: ordersLoading, error: ordersError } = useCustomerOrders(customerId)
  const { info } = useNotifications()
  const exportMutation = useCustomerExport(locale)

  // Use real customer orders data
  const orders = customerOrdersData?.orders || []
  const orderStats = customerOrdersData?.stats || {
    totalOrders: 0,
    totalRevenue: 0,
    averageOrderValue: 0,
    deliveredOrders: 0,
  }

  const [searchQuery, setSearchQuery] = useState("")
  const [statusFilter, setStatusFilter] = useState<OrderStatusFilter>("all")
  const [sortField, setSortField] = useState("createdAt")
  const [sortDirection, setSortDirection] = useState<"asc" | "desc">("desc")
  const fmt = useFormatters(currency)

  if (isLoading || ordersLoading) {
    return <CustomerOrdersSkeleton />
  }

  if (error || !customer) {
    return (
      <div className="dashboard-landing-theme min-h-screen overflow-x-hidden text-[var(--dash-text)]">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 py-4 sm:py-8">
          <div className="max-w-md mx-auto text-center py-16">
            <div className="w-20 h-20 bg-[var(--dash-surface)] rounded-full flex items-center justify-center mx-auto mb-6">
              <Users className="w-10 h-10 text-[var(--dash-text-faint)]" />
            </div>
            <h3 className="text-xl font-semibold text-[var(--dash-text)] mb-3">{tr("Customer not found", "Client introuvable")}</h3>
            <p className="text-[var(--dash-text-soft)] mb-6">
              {tr("The customer does not exist or is not available in this organization.", "Le client n’existe pas ou n’est pas disponible dans cette organisation.")}
            </p>
            <Button onClick={() => router.push(localizedHref("/dashboard/customers"))} variant="outline">
              <ArrowLeft className="me-2 h-4 w-4" />
              {tr("Back to customers", "Retour aux clients")}
            </Button>
          </div>
        </div>
      </div>
    )
  }

  const avatarFallback = customer.name
    .split(' ')
    .map(n => n[0])
    .join('')
    .slice(0, 2)
    .toUpperCase()

  const formatCurrency = (amount: number) => fmt.currency(amount)

  const getStatusColor = (status: string) => {
    switch (status) {
      case "delivered":
      case "completed":
        return "border-[var(--dash-success)] bg-[var(--dash-success-soft)] text-[var(--dash-success)]"
      case "shipped":
      case "confirmed":
        return "border-[var(--dash-info)] bg-[var(--dash-info-soft)] text-[var(--dash-info)]"
      case "processing":
      case "draft":
        return "border-[var(--dash-warning)] bg-[var(--dash-warning-soft)] text-[var(--dash-warning)]"
      case "cancelled":
        return "border-[var(--dash-danger)] bg-[var(--dash-danger-soft)] text-[var(--dash-danger)]"
      default:
        return "border-[var(--dash-border-subtle)] bg-[var(--dash-surface)] text-[var(--dash-text-soft)]"
    }
  }

  const getStatusIcon = (status: string) => {
    switch (status) {
      case "delivered":
      case "completed":
        return <CheckCircle className="h-3 w-3" />
      case "shipped":
      case "confirmed":
        return <Truck className="h-3 w-3" />
      case "processing":
      case "draft":
        return <AlertCircle className="h-3 w-3" />
      case "cancelled":
        return <XCircle className="h-3 w-3" />
      default:
        return <Clock className="h-3 w-3" />
    }
  }

  // Filter and sort orders
  const filteredOrders = orders
    .filter(order => {
      const matchesSearch = (order.orderNumber || order.id).toLowerCase().includes(searchQuery.toLowerCase())
      const matchesStatus = statusFilter === "all" || order.status.toLowerCase() === statusFilter.toLowerCase()
      return matchesSearch && matchesStatus
    })
    .sort((a, b) => {
      const aValue = a[sortField as keyof typeof a]
      const bValue = b[sortField as keyof typeof b]

      if (sortDirection === "asc") {
        if (aValue == null && bValue == null) return 0
        if (aValue == null) return -1
        if (bValue == null) return 1
        return aValue < bValue ? -1 : aValue > bValue ? 1 : 0
      } else {
        if (aValue == null && bValue == null) return 0
        if (aValue == null) return 1
        if (bValue == null) return -1
        return aValue > bValue ? -1 : aValue < bValue ? 1 : 0
      }
    })

  const handleSort = (field: string) => {
    if (field === sortField) {
      setSortDirection(sortDirection === "asc" ? "desc" : "asc")
    } else {
      setSortField(field)
      setSortDirection("desc")
    }
  }

  // Calculate order statistics from real data
  const totalOrders = orderStats.totalOrders
  const totalRevenue = orderStats.totalRevenue
  const averageOrderValue = orderStats.averageOrderValue
  const deliveredOrders = orderStats.deliveredOrders

  return (
    <TooltipProvider>
      <div className="dashboard-landing-theme min-h-screen overflow-x-hidden text-[var(--dash-text)]">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 py-4 sm:py-8">
          {/* Header */}
          <div className="mb-6 sm:mb-8">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-4">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => router.push(localizedHref(`/dashboard/customers/${customer.id}`))}
                  className="dashboard-button-secondary border-[var(--dash-border-subtle)]"
                >
                  <ArrowLeft className="h-4 w-4 me-2" />
                  {tr("Back", "Retour")}
                </Button>
                <div className="flex items-center gap-3">
                  <div className="p-2 rounded-lg bg-[var(--dash-brand)] shadow-lg">
                    <ShoppingCart className="w-5 h-5 sm:w-6 sm:h-6 text-white" />
                  </div>
                  <div>
                    <h1 className="text-2xl sm:text-3xl font-bold text-[var(--dash-text)]">
                      {tr("Customer orders", "Commandes client")}
                    </h1>
                    <p className="text-sm text-[var(--dash-text-soft)] mt-1">
                      {tr("Order history for", "Historique des commandes de")} {customer.name}
                    </p>
                  </div>
                </div>
              </div>

              <div className="flex items-center gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  className="hidden sm:inline-flex"
                  onClick={() => {
                    exportMutation.mutate({
                      scope: "customer-orders",
                      customerId: customer.id,
                      purpose: "CUSTOMER_ORDER_HISTORY_EXPORT",
                      filters: {
                        search: searchQuery,
                        orderStatus: ORDER_STATUS_EXPORT[statusFilter],
                      },
                    })
                  }}
                  disabled={!capabilities.canExport || exportMutation.isPending}
                >
                  {exportMutation.isPending ? (
                    <Loader2 className="w-4 h-4 me-2 animate-spin" />
                  ) : (
                    <Download className="w-4 h-4 me-2" />
                  )}
                  {tr("Export", "Exporter")}
                </Button>
                <Button
                  aria-label={tr("Open sales", "Ouvrir les ventes")}
                  size="sm"
                  className="shadow-lg"
                  disabled={!capabilities.canOpenSales}
                  onClick={() => {
                    info("Create Order", `Redirecting to create order for ${customer.name}`)
                    router.push(localizedHref(`/dashboard/sales`))
                  }}
                >
                  <Plus className="w-4 h-4 sm:me-2" />
                  <span className="hidden sm:inline">{tr("Open sales", "Ouvrir les ventes")}</span>
                </Button>
              </div>
            </div>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
            {/* Customer Info Sidebar */}
            <div className="lg:col-span-1 space-y-6">
              <CustomerQuickActions
                customer={{
                  id: customer.id,
                  name: customer.name,
                  email: customer.email ?? undefined,
                  phone: customer.phone ?? undefined,
                  isActive: customer.isActive,
                  totalOrders: totalOrders
                }}
                capabilities={{
                  canCreateStatement: capabilities.canCreateStatement,
                  canExport: capabilities.canExport,
                  canOpenSales: capabilities.canOpenSales,
                  canUpdate: capabilities.canUpdate,
                  canViewOrders: capabilities.canViewOrders,
                }}
                currentPage="orders"
              />

              <Card className="dashboard-glass-panel border-[var(--dash-border-subtle)] shadow-sm sticky top-8">
                <div className="bg-[var(--dash-brand-soft)] px-6 py-4 border-b border-[var(--dash-border-subtle)]">
                  <div className="flex items-center gap-3">
                    <Avatar className="h-12 w-12 ring-2 ring-[var(--dash-border)]">
                      <AvatarFallback className="bg-[var(--dash-brand)] text-white font-bold">
                        {avatarFallback}
                      </AvatarFallback>
                    </Avatar>
                    <div className="flex-1 min-w-0">
                      <h2 className="text-lg font-bold text-[var(--dash-text)] truncate">
                        {customer.name}
                      </h2>
                      {customer.code && (
                        <div className="text-sm text-[var(--dash-text-faint)]">
                          #{customer.code}
                        </div>
                      )}
                    </div>
                  </div>
                </div>

                <CardContent className="p-6 space-y-6">
                  {/* Order Statistics */}
                  <div className="space-y-4">
                    <h3 className="text-sm font-semibold text-[var(--dash-text-muted)] uppercase tracking-wide">
                      {tr("Order statistics", "Statistiques des commandes")}
                    </h3>

                    <div className="space-y-3">
                      <div className="flex items-center justify-between p-3 rounded-lg bg-[var(--dash-surface)]">
                        <div className="flex items-center gap-2">
                          <ShoppingCart className="h-4 w-4 text-[var(--dash-info)]" />
                          <span className="text-sm text-[var(--dash-text-muted)]">{tr("Total orders", "Total commandes")}</span>
                        </div>
                        <span className="font-semibold text-[var(--dash-text)]">{totalOrders}</span>
                      </div>

                      <div className="flex items-center justify-between p-3 rounded-lg bg-[var(--dash-surface)]">
                        <div className="flex items-center gap-2">
                          <DollarSign className="h-4 w-4 text-[var(--dash-success)]" />
                          <span className="text-sm text-[var(--dash-text-muted)]">{tr("Total spent", "Total dépensé")}</span>
                        </div>
                        <span className="font-semibold text-[var(--dash-text)]">{formatCurrency(totalRevenue)}</span>
                      </div>

                      <div className="flex items-center justify-between p-3 rounded-lg bg-[var(--dash-surface)]">
                        <div className="flex items-center gap-2">
                          <TrendingUp className="h-4 w-4 text-[var(--dash-info)]" />
                          <span className="text-sm text-[var(--dash-text-muted)]">{tr("Average order", "Commande moyenne")}</span>
                        </div>
                        <span className="font-semibold text-[var(--dash-text)]">{formatCurrency(averageOrderValue)}</span>
                      </div>

                      <div className="flex items-center justify-between p-3 rounded-lg bg-[var(--dash-surface)]">
                        <div className="flex items-center gap-2">
                          <CheckCircle className="h-4 w-4 text-[var(--dash-success)]" />
                          <span className="text-sm text-[var(--dash-text-muted)]">{tr("Delivered", "Livrées")}</span>
                        </div>
                        <span className="font-semibold text-[var(--dash-text)]">{deliveredOrders}</span>
                      </div>
                    </div>
                  </div>

                  <Separator className="bg-[var(--dash-border-subtle)]" />

                  {/* Quick Actions */}
                  <div className="space-y-4">
                    <h3 className="text-sm font-semibold text-[var(--dash-text-muted)] uppercase tracking-wide">
                      {tr("Quick actions", "Actions rapides")}
                    </h3>
                    <div className="space-y-2">
                      <Button
                        variant="outline"
                        className="w-full justify-start"
                        size="sm"
                        onClick={() => {
                          info("Navigate to Profile", `Viewing ${customer.name}'s profile`)
                          router.push(localizedHref(`/dashboard/customers/${customer.id}`))
                        }}
                      >
                        <Eye className="h-4 w-4 me-2" />
                        {tr("View profile", "Voir le profil")}
                      </Button>
                      <Button
                        variant="outline"
                        className="w-full justify-start"
                        size="sm"
                        disabled={!capabilities.canUpdate}
                        onClick={() => {
                          info("Edit Customer", `Editing ${customer.name}'s details`)
                          router.push(localizedHref(`/dashboard/customers/${customer.id}/edit`))
                        }}
                      >
                        <Edit className="h-4 w-4 me-2" />
                        {tr("Edit customer", "Modifier le client")}
                      </Button>
                      <Button
                        variant="outline"
                        className="w-full justify-start"
                        size="sm"
                        disabled={!capabilities.canViewReceivables}
                        onClick={() => {
                          info("Open Receivables", "Opening the finance receivables workspace")
                          router.push(localizedHref("/dashboard/finance/receivables"))
                        }}
                      >
                        <Receipt className="h-4 w-4 me-2" />
                        {tr("Open receivables", "Ouvrir les créances")}
                      </Button>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>

            {/* Main Orders Content */}
            <div className="lg:col-span-3">
              <Card className="dashboard-glass-panel border-[var(--dash-border-subtle)] shadow-sm">
                <div className="bg-[var(--dash-brand-soft)] px-6 py-4 border-b border-[var(--dash-border-subtle)]">
                  <div className="flex items-center justify-between">
                    <div>
                      <CardTitle className="text-lg font-semibold text-[var(--dash-text)]">{tr("Order history", "Historique des commandes")}</CardTitle>
                      <CardDescription className="text-[var(--dash-text-soft)] mt-1">
                        {tr("Filter and export this customer’s order history.", "Filtrez et exportez l’historique des commandes de ce client.")}
                      </CardDescription>
                    </div>
                    <Badge
                      variant="secondary"
                      className="border-[var(--dash-info)] bg-[var(--dash-info-soft)] text-[var(--dash-info)]"
                    >
                      <Activity className="w-3 h-3 me-1" />
                      {filteredOrders.length} {tr("orders", "commandes")}
                    </Badge>
                  </div>

                  {/* Filters */}
                  <div className="dashboard-table-toolbar mt-4 flex flex-col gap-4 sm:flex-row">
                    <div className="relative flex-1 max-w-md">
                      <Search className="absolute start-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-[var(--dash-text-faint)]" />
                      <Input
                        placeholder={tr("Search orders…", "Rechercher des commandes…")}
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                        className="ps-10 dashboard-button-secondary border-[var(--dash-border-subtle)]"
                      />
                    </div>

                    <Select
                      value={statusFilter}
                      onValueChange={(value) => setStatusFilter(value as OrderStatusFilter)}
                    >
                      <SelectTrigger
                        aria-label={tr("Order status", "Statut de la commande")}
                        className="w-40 dashboard-button-secondary border-[var(--dash-border-subtle)]"
                      >
                        <SelectValue placeholder={tr("All statuses", "Tous les statuts")} />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="all">{tr("All statuses", "Tous les statuts")}</SelectItem>
                        <SelectItem value="draft">{tr("Draft", "Brouillon")}</SelectItem>
                        <SelectItem value="confirmed">{tr("Confirmed", "Confirmée")}</SelectItem>
                        <SelectItem value="delivered">{tr("Delivered", "Livrée")}</SelectItem>
                        <SelectItem value="shipped">{tr("Shipped", "Expédiée")}</SelectItem>
                        <SelectItem value="processing">{tr("Processing", "En traitement")}</SelectItem>
                        <SelectItem value="cancelled">{tr("Cancelled", "Annulée")}</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>

                <CardContent className="p-0">
                  {filteredOrders.length === 0 ? (
                    <div className="text-center py-12">
                      <div className="w-16 h-16 bg-[var(--dash-surface)] rounded-full flex items-center justify-center mx-auto mb-4">
                        <Package className="w-8 h-8 text-[var(--dash-text-faint)]" />
                      </div>
                      <h3 className="text-lg font-semibold text-[var(--dash-text)] mb-2">{tr("No orders found", "Aucune commande")}</h3>
                      <p className="text-[var(--dash-text-soft)] mb-6">
                        {searchQuery || statusFilter !== "all"
                          ? tr("No orders match the current filters.", "Aucune commande ne correspond aux filtres actuels.")
                          : tr("This customer has not placed an order yet.", "Ce client n’a encore passé aucune commande.")
                        }
                      </p>
                      <Button
                        className=""
                        disabled={!capabilities.canOpenSales}
                        onClick={() => {
                          info("Open Sales", `Redirecting to create first order for ${customer.name}`)
                          router.push(localizedHref(`/dashboard/sales`))
                        }}
                      >
                        <Plus className="w-4 h-4 me-2" />
                        {tr("Open sales", "Ouvrir les ventes")}
                      </Button>
                    </div>
                  ) : (
                    <div className="overflow-x-auto">
                      <Table>
                        <TableHeader>
                          <TableRow className="border-[var(--dash-border-subtle)] bg-[var(--dash-surface)]">
                            <TableHead className="font-semibold text-[var(--dash-text-muted)]">
                              <Button
                                variant="ghost"
                                size="sm"
                                className="h-auto p-0 hover:bg-transparent font-semibold"
                                onClick={() => handleSort("id")}
                              >
                                {tr("Order", "Commande")}
                                <ArrowUpDown className="ms-2 h-3 w-3" />
                              </Button>
                            </TableHead>
                            <TableHead className="font-semibold text-[var(--dash-text-muted)]">{tr("Status", "Statut")}</TableHead>
                            <TableHead className="font-semibold text-[var(--dash-text-muted)]">
                              <Button
                                variant="ghost"
                                size="sm"
                                className="h-auto p-0 hover:bg-transparent font-semibold"
                                onClick={() => handleSort("totalAmount")}
                              >
                                {tr("Total", "Total")}
                                <ArrowUpDown className="ms-2 h-3 w-3" />
                              </Button>
                            </TableHead>
                            <TableHead className="font-semibold text-[var(--dash-text-muted)]">{tr("Items", "Articles")}</TableHead>
                            <TableHead className="font-semibold text-[var(--dash-text-muted)]">
                              <Button
                                variant="ghost"
                                size="sm"
                                className="h-auto p-0 hover:bg-transparent font-semibold"
                                onClick={() => handleSort("createdAt")}
                              >
                                {tr("Order date", "Date de commande")}
                                <ArrowUpDown className="ms-2 h-3 w-3" />
                              </Button>
                            </TableHead>
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          {filteredOrders.map((order) => (
                            <TableRow
                              key={order.id}
                              className="group border-[var(--dash-border-subtle)] hover:bg-[var(--dash-brand-soft)] transition-all duration-200"
                            >
                              <TableCell className="py-4">
                                <div className="font-medium text-[var(--dash-text)]">
                                  {order.orderNumber || order.id}
                                </div>
                                <div className="text-sm text-[var(--dash-text-faint)]">
                                  {formatDate(order.createdAt)}
                                </div>
                              </TableCell>
                              <TableCell className="py-4">
                                <Badge className={getStatusColor(order.status.toLowerCase())}>
                                  {getStatusIcon(order.status.toLowerCase())}
                                  <span className="ms-2">{statusLabel(order.status)}</span>
                                </Badge>
                              </TableCell>
                              <TableCell className="py-4">
                                <div className="font-semibold text-[var(--dash-text)]">
                                  {formatCurrency(order.totalAmount)}
                                </div>
                              </TableCell>
                              <TableCell className="py-4">
                                <div className="flex items-center gap-2">
                                  <Package className="h-4 w-4 text-[var(--dash-text-faint)]" />
                                  <span className="text-[var(--dash-text-muted)]">
                                    {order.itemCount} {tr("items", "articles")}
                                  </span>
                                </div>
                              </TableCell>
                              <TableCell className="py-4">
                                <div className="text-sm text-[var(--dash-text-muted)]">
                                  {formatDate(order.createdAt)}
                                </div>
                              </TableCell>
                            </TableRow>
                          ))}
                        </TableBody>
                      </Table>
                    </div>
                  )}
                </CardContent>
              </Card>
            </div>
          </div>
        </div>
      </div>
    </TooltipProvider>
  )
}

function CustomerOrdersSkeleton() {
  return (
    <div className="dashboard-landing-theme min-h-screen overflow-x-hidden text-[var(--dash-text)]">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 py-4 sm:py-8">
        <div className="mb-6 sm:mb-8">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <Skeleton className="h-10 w-20" />
              <div className="flex items-center gap-3">
                <Skeleton className="h-12 w-12 rounded-lg" />
                <div>
                  <Skeleton className="h-8 w-48 mb-2" />
                  <Skeleton className="h-4 w-64" />
                </div>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <Skeleton className="h-9 w-24" />
              <Skeleton className="h-9 w-28" />
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
          <div className="lg:col-span-1">
            <Card className="dashboard-glass-panel border-[var(--dash-border-subtle)] shadow-sm">
              <CardContent className="p-6">
                <div className="flex items-center gap-3 mb-6">
                  <Skeleton className="h-12 w-12 rounded-full" />
                  <div className="flex-1">
                    <Skeleton className="h-5 w-24 mb-2" />
                    <Skeleton className="h-4 w-16" />
                  </div>
                </div>
                <div className="space-y-4">
                  {[1, 2, 3, 4].map((i) => (
                    <div key={i} className="flex items-center justify-between p-3 rounded-lg bg-[var(--dash-surface)]">
                      <div className="flex items-center gap-2">
                        <Skeleton className="h-4 w-4" />
                        <Skeleton className="h-4 w-20" />
                      </div>
                      <Skeleton className="h-4 w-12" />
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </div>

          <div className="lg:col-span-3">
            <Card className="dashboard-glass-panel border-[var(--dash-border-subtle)] shadow-sm">
              <div className="bg-[var(--dash-brand-soft)] px-6 py-4">
                <Skeleton className="h-6 w-48 mb-2" />
                <Skeleton className="h-4 w-64" />
              </div>
              <CardContent className="p-6">
                <Skeleton className="h-64 w-full" />
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </div>
  )
}
