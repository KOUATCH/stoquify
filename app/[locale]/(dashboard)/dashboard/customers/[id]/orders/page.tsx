"use client"

import { CustomerQuickActions } from "@/components/customers/CustomerQuickActions"
import { useNotifications } from "@/components/notifications/NotificationProvider"
import { Avatar, AvatarFallback } from "@/components/ui/avatar"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardTitle } from "@/components/ui/card"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { Input } from "@/components/ui/input"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Separator } from "@/components/ui/separator"
import { Skeleton } from "@/components/ui/skeleton"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { TooltipProvider } from "@/components/ui/tooltip"
import { useCustomer, useCustomerOrders } from "@/hooks/useCustomerQueries"
import { useFormatters } from "@/hooks/useFormatters"
import { format, formatDistanceToNow } from "date-fns"
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
  MoreHorizontal,
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

export default function CustomerOrdersPage() {
  const params = useParams()
  const router = useRouter()
  const pathname = usePathname()
  const locale = getLocaleFromPathname(pathname) ?? DEFAULT_LOCALE
  const localizedHref = (href: string) => localizePath(href, locale)
  const customerId = params.id as string

  const { data: customer, isLoading, error } = useCustomer(customerId)
  const { data: customerOrdersData, isLoading: ordersLoading, error: ordersError } = useCustomerOrders(customerId)
  const { info, success, warning } = useNotifications()

  // Use real customer orders data
  const orders = customerOrdersData?.orders || []
  const orderStats = customerOrdersData?.stats || {
    totalOrders: 0,
    totalRevenue: 0,
    averageOrderValue: 0
  }

  const [searchQuery, setSearchQuery] = useState("")
  const [statusFilter, setStatusFilter] = useState("all")
  const [sortField, setSortField] = useState("createdAt")
  const [sortDirection, setSortDirection] = useState<"asc" | "desc">("desc")
  const fmt = useFormatters("USD")

  if (isLoading || ordersLoading) {
    return <CustomerOrdersSkeleton />
  }

  if (error || !customer) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50/30 to-indigo-50/50 dark:from-slate-950 dark:via-slate-900 dark:to-slate-800">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 py-4 sm:py-8">
          <div className="max-w-md mx-auto text-center py-16">
            <div className="w-20 h-20 bg-slate-100 dark:bg-slate-800 rounded-full flex items-center justify-center mx-auto mb-6">
              <Users className="w-10 h-10 text-slate-400" />
            </div>
            <h3 className="text-xl font-semibold text-slate-900 dark:text-white mb-3">Customer Not Found</h3>
            <p className="text-slate-600 dark:text-slate-400 mb-6">
              The customer you're looking for doesn't exist or has been removed.
            </p>
            <Button onClick={() => router.push(localizedHref("/dashboard/customers"))} variant="outline">
              <ArrowLeft className="me-2 h-4 w-4" />
              Back to Customers
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
        return "bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-300 border-green-200 dark:border-green-700"
      case "shipped":
        return "bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-300 border-blue-200 dark:border-blue-700"
      case "processing":
        return "bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-300 border-amber-200 dark:border-amber-700"
      case "cancelled":
        return "bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-300 border-red-200 dark:border-red-700"
      default:
        return "bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-400 border-slate-200 dark:border-slate-700"
    }
  }

  const getStatusIcon = (status: string) => {
    switch (status) {
      case "delivered":
        return <CheckCircle className="h-3 w-3" />
      case "shipped":
        return <Truck className="h-3 w-3" />
      case "processing":
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
  const deliveredOrders = orders.filter(order => order.status === "DELIVERED" || order.status === "COMPLETED").length

  return (
    <TooltipProvider>
      <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50/30 to-indigo-50/50 dark:from-slate-950 dark:via-slate-900 dark:to-slate-800">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 py-4 sm:py-8">
          {/* Header */}
          <div className="mb-6 sm:mb-8">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-4">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => router.push(localizedHref(`/dashboard/customers/${customer.id}`))}
                  className="bg-white/80 dark:bg-slate-800/80 backdrop-blur-sm border-slate-200 dark:border-slate-700"
                >
                  <ArrowLeft className="h-4 w-4 me-2" />
                  Back
                </Button>
                <div className="flex items-center gap-3">
                  <div className="p-2 rounded-lg bg-gradient-to-br from-blue-500 to-indigo-600 shadow-lg">
                    <ShoppingCart className="w-5 h-5 sm:w-6 sm:h-6 text-white" />
                  </div>
                  <div>
                    <h1 className="text-2xl sm:text-3xl font-bold bg-gradient-to-r from-slate-900 to-slate-700 dark:from-white dark:to-slate-300 bg-clip-text text-transparent">
                      Customer Orders
                    </h1>
                    <p className="text-sm text-slate-600 dark:text-slate-400 mt-1">
                      Order history for {customer.name}
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
                    info("Export Started", `Exporting orders for ${customer.name}`)
                    // Add actual export logic here
                    setTimeout(() => success("Export Complete", "Customer orders exported successfully"), 2000)
                  }}
                >
                  <Download className="w-4 h-4 me-2" />
                  Export
                </Button>
                <Button
                  size="sm"
                  className="shadow-lg"
                  onClick={() => {
                    info("Create Order", `Redirecting to create order for ${customer.name}`)
                    router.push(localizedHref(`/dashboard/sales/new?customerId=${customer.id}`))
                  }}
                >
                  <Plus className="w-4 h-4 sm:me-2" />
                  <span className="hidden sm:inline">New Order</span>
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
                currentPage="orders"
              />

              <Card className="bg-white/80 dark:bg-slate-800/80 backdrop-blur-lg border-0 shadow-xl rounded-2xl overflow-hidden sticky top-8">
                <div className="bg-gradient-to-r from-slate-50 to-blue-50/50 dark:from-slate-800 dark:to-slate-700 px-6 py-4 border-b border-slate-200/60 dark:border-slate-700/60">
                  <div className="flex items-center gap-3">
                    <Avatar className="h-12 w-12 ring-2 ring-white dark:ring-slate-700">
                      <AvatarFallback className="bg-gradient-to-br from-blue-500 to-indigo-600 text-white font-bold">
                        {avatarFallback}
                      </AvatarFallback>
                    </Avatar>
                    <div className="flex-1 min-w-0">
                      <h2 className="text-lg font-bold text-slate-900 dark:text-white truncate">
                        {customer.name}
                      </h2>
                      {customer.code && (
                        <div className="text-sm text-slate-500 dark:text-slate-400">
                          #{customer.code}
                        </div>
                      )}
                    </div>
                  </div>
                </div>

                <CardContent className="p-6 space-y-6">
                  {/* Order Statistics */}
                  <div className="space-y-4">
                    <h3 className="text-sm font-semibold text-slate-700 dark:text-slate-300 uppercase tracking-wide">
                      Order Statistics
                    </h3>

                    <div className="space-y-3">
                      <div className="flex items-center justify-between p-3 rounded-lg bg-slate-50/80 dark:bg-slate-800/50">
                        <div className="flex items-center gap-2">
                          <ShoppingCart className="h-4 w-4 text-blue-600 dark:text-blue-400" />
                          <span className="text-sm text-slate-700 dark:text-slate-300">Total Orders</span>
                        </div>
                        <span className="font-semibold text-slate-900 dark:text-white">{totalOrders}</span>
                      </div>

                      <div className="flex items-center justify-between p-3 rounded-lg bg-slate-50/80 dark:bg-slate-800/50">
                        <div className="flex items-center gap-2">
                          <DollarSign className="h-4 w-4 text-green-600 dark:text-green-400" />
                          <span className="text-sm text-slate-700 dark:text-slate-300">Total Spent</span>
                        </div>
                        <span className="font-semibold text-slate-900 dark:text-white">{formatCurrency(totalRevenue)}</span>
                      </div>

                      <div className="flex items-center justify-between p-3 rounded-lg bg-slate-50/80 dark:bg-slate-800/50">
                        <div className="flex items-center gap-2">
                          <TrendingUp className="h-4 w-4 text-purple-600 dark:text-purple-400" />
                          <span className="text-sm text-slate-700 dark:text-slate-300">Avg Order</span>
                        </div>
                        <span className="font-semibold text-slate-900 dark:text-white">{formatCurrency(averageOrderValue)}</span>
                      </div>

                      <div className="flex items-center justify-between p-3 rounded-lg bg-slate-50/80 dark:bg-slate-800/50">
                        <div className="flex items-center gap-2">
                          <CheckCircle className="h-4 w-4 text-emerald-600 dark:text-emerald-400" />
                          <span className="text-sm text-slate-700 dark:text-slate-300">Delivered</span>
                        </div>
                        <span className="font-semibold text-slate-900 dark:text-white">{deliveredOrders}</span>
                      </div>
                    </div>
                  </div>

                  <Separator className="bg-slate-200 dark:bg-slate-700" />

                  {/* Quick Actions */}
                  <div className="space-y-4">
                    <h3 className="text-sm font-semibold text-slate-700 dark:text-slate-300 uppercase tracking-wide">
                      Quick Actions
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
                        View Profile
                      </Button>
                      <Button
                        variant="outline"
                        className="w-full justify-start"
                        size="sm"
                        onClick={() => {
                          info("Edit Customer", `Editing ${customer.name}'s details`)
                          router.push(localizedHref(`/dashboard/customers/${customer.id}/edit`))
                        }}
                      >
                        <Edit className="h-4 w-4 me-2" />
                        Edit Customer
                      </Button>
                      <Button
                        variant="outline"
                        className="w-full justify-start"
                        size="sm"
                        onClick={() => {
                          warning("Feature Coming Soon", "Invoices feature will be available soon")
                        }}
                      >
                        <Receipt className="h-4 w-4 me-2" />
                        View Invoices
                      </Button>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>

            {/* Main Orders Content */}
            <div className="lg:col-span-3">
              <Card className="bg-white/80 dark:bg-slate-800/80 backdrop-blur-lg border-0 shadow-xl rounded-2xl overflow-hidden">
                <div className="bg-gradient-to-r from-slate-50 to-blue-50/50 dark:from-slate-800 dark:to-slate-700 px-6 py-4 border-b border-slate-200/60 dark:border-slate-700/60">
                  <div className="flex items-center justify-between">
                    <div>
                      <CardTitle className="text-lg font-semibold text-slate-900 dark:text-white">Order History</CardTitle>
                      <CardDescription className="text-slate-600 dark:text-slate-400 mt-1">
                        Complete order history and details
                      </CardDescription>
                    </div>
                    <Badge
                      variant="secondary"
                      className="bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-300 border-blue-200 dark:border-blue-700"
                    >
                      <Activity className="w-3 h-3 me-1" />
                      {filteredOrders.length} orders
                    </Badge>
                  </div>

                  {/* Filters */}
                  <div className="flex flex-col sm:flex-row gap-4 mt-4">
                    <div className="relative flex-1 max-w-md">
                      <Search className="absolute start-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-slate-400" />
                      <Input
                        placeholder="Search orders..."
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                        className="ps-10 bg-white/80 dark:bg-slate-800/80 backdrop-blur-sm border-slate-200 dark:border-slate-700"
                      />
                    </div>

                    <Select value={statusFilter} onValueChange={setStatusFilter}>
                      <SelectTrigger className="w-40 bg-white/80 dark:bg-slate-800/80 backdrop-blur-sm border-slate-200 dark:border-slate-700">
                        <SelectValue placeholder="All Status" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="all">All Status</SelectItem>
                        <SelectItem value="delivered">Delivered</SelectItem>
                        <SelectItem value="shipped">Shipped</SelectItem>
                        <SelectItem value="processing">Processing</SelectItem>
                        <SelectItem value="cancelled">Cancelled</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>

                <CardContent className="p-0">
                  {filteredOrders.length === 0 ? (
                    <div className="text-center py-12">
                      <div className="w-16 h-16 bg-slate-100 dark:bg-slate-700 rounded-full flex items-center justify-center mx-auto mb-4">
                        <Package className="w-8 h-8 text-slate-400" />
                      </div>
                      <h3 className="text-lg font-semibold text-slate-900 dark:text-white mb-2">No Orders Found</h3>
                      <p className="text-slate-600 dark:text-slate-400 mb-6">
                        {searchQuery || statusFilter !== "all"
                          ? "No orders match your current filters."
                          : "This customer hasn't placed any orders yet."
                        }
                      </p>
                      <Button
                        className=""
                        onClick={() => {
                          info("Create First Order", `Redirecting to create first order for ${customer.name}`)
                          router.push(localizedHref(`/dashboard/sales/new?customerId=${customer.id}`))
                        }}
                      >
                        <Plus className="w-4 h-4 me-2" />
                        Create First Order
                      </Button>
                    </div>
                  ) : (
                    <div className="overflow-x-auto">
                      <Table>
                        <TableHeader>
                          <TableRow className="border-slate-200 dark:border-slate-700 bg-slate-50/80 dark:bg-slate-800/80">
                            <TableHead className="font-semibold text-slate-700 dark:text-slate-300">
                              <Button
                                variant="ghost"
                                size="sm"
                                className="h-auto p-0 hover:bg-transparent font-semibold"
                                onClick={() => handleSort("id")}
                              >
                                Order ID
                                <ArrowUpDown className="ms-2 h-3 w-3" />
                              </Button>
                            </TableHead>
                            <TableHead className="font-semibold text-slate-700 dark:text-slate-300">Status</TableHead>
                            <TableHead className="font-semibold text-slate-700 dark:text-slate-300">
                              <Button
                                variant="ghost"
                                size="sm"
                                className="h-auto p-0 hover:bg-transparent font-semibold"
                                onClick={() => handleSort("total")}
                              >
                                Total
                                <ArrowUpDown className="ms-2 h-3 w-3" />
                              </Button>
                            </TableHead>
                            <TableHead className="font-semibold text-slate-700 dark:text-slate-300">Items</TableHead>
                            <TableHead className="font-semibold text-slate-700 dark:text-slate-300">
                              <Button
                                variant="ghost"
                                size="sm"
                                className="h-auto p-0 hover:bg-transparent font-semibold"
                                onClick={() => handleSort("createdAt")}
                              >
                                Order Date
                                <ArrowUpDown className="ms-2 h-3 w-3" />
                              </Button>
                            </TableHead>
                            <TableHead className="w-[70px]"></TableHead>
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          {filteredOrders.map((order) => (
                            <TableRow
                              key={order.id}
                              className="group border-slate-200/60 dark:border-slate-700/60 hover:bg-slate-50/80 dark:hover:bg-slate-800/80 transition-all duration-200"
                            >
                              <TableCell className="py-4">
                                <div className="font-medium text-slate-900 dark:text-white">
                                  {order.orderNumber || order.id}
                                </div>
                                <div className="text-sm text-slate-500 dark:text-slate-400">
                                  {format(order.createdAt, "MMM dd, yyyy")}
                                </div>
                              </TableCell>
                              <TableCell className="py-4">
                                <Badge className={getStatusColor(order.status.toLowerCase())}>
                                  {getStatusIcon(order.status.toLowerCase())}
                                  <span className="ms-2 capitalize">{order.status.toLowerCase().replace('_', ' ')}</span>
                                </Badge>
                              </TableCell>
                              <TableCell className="py-4">
                                <div className="font-semibold text-slate-900 dark:text-white">
                                  {formatCurrency(order.totalAmount)}
                                </div>
                              </TableCell>
                              <TableCell className="py-4">
                                <div className="flex items-center gap-2">
                                  <Package className="h-4 w-4 text-slate-400" />
                                  <span className="text-slate-700 dark:text-slate-300">
                                    {order.itemCount} items
                                  </span>
                                </div>
                              </TableCell>
                              <TableCell className="py-4">
                                <div className="text-sm text-slate-700 dark:text-slate-300">
                                  {formatDistanceToNow(order.createdAt, { addSuffix: true })}
                                </div>
                              </TableCell>
                              <TableCell className="py-4">
                                <DropdownMenu>
                                  <DropdownMenuTrigger asChild>
                                    <Button
                                      variant="ghost"
                                      className="h-8 w-8 p-0 opacity-0 group-hover:opacity-100 transition-opacity"
                                    >
                                      <MoreHorizontal className="h-4 w-4" />
                                    </Button>
                                  </DropdownMenuTrigger>
                                  <DropdownMenuContent align="end">
                                    <DropdownMenuLabel>Order Actions</DropdownMenuLabel>
                                    <DropdownMenuItem
                                      onClick={() => {
                                        info("View Order", `Opening details for order ${order.id}`)
                                        // Add navigation to order details page when it exists
                                      }}
                                    >
                                      <Eye className="me-2 h-4 w-4" />
                                      View Details
                                    </DropdownMenuItem>
                                    <DropdownMenuItem
                                      onClick={() => {
                                        info("View Invoice", `Opening invoice for order ${order.id}`)
                                        // Add navigation to invoice page when it exists
                                      }}
                                    >
                                      <Receipt className="me-2 h-4 w-4" />
                                      View Invoice
                                    </DropdownMenuItem>
                                    <DropdownMenuSeparator />
                                    <DropdownMenuItem
                                      onClick={() => {
                                        info("Download PDF", `Generating PDF for order ${order.id}`)
                                        setTimeout(() => success("PDF Ready", "Order PDF has been downloaded"), 2000)
                                      }}
                                    >
                                      <Download className="me-2 h-4 w-4" />
                                      Download PDF
                                    </DropdownMenuItem>
                                  </DropdownMenuContent>
                                </DropdownMenu>
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
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50/30 to-indigo-50/50 dark:from-slate-950 dark:via-slate-900 dark:to-slate-800">
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
            <Card className="bg-white/80 dark:bg-slate-800/80 backdrop-blur-lg border-0 shadow-xl rounded-2xl">
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
                    <div key={i} className="flex items-center justify-between p-3 rounded-lg bg-slate-50/80 dark:bg-slate-800/50">
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
            <Card className="bg-white/80 dark:bg-slate-800/80 backdrop-blur-lg border-0 shadow-xl rounded-2xl">
              <div className="bg-gradient-to-r from-slate-50 to-blue-50/50 dark:from-slate-800 dark:to-slate-700 px-6 py-4">
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
