"use client"

import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Card, CardContent } from "@/components/ui/card"
import { useNotifications } from "@/components/notifications/NotificationProvider"
import { getLocaleFromPathname, localizePath } from "@/i18n/routing"
import { DEFAULT_LOCALE } from "@/types/bilingual"
import { useRouter, usePathname } from "next/navigation"
import {
  User,
  Edit,
  ShoppingCart,
  ArrowLeft,
  MessageCircle,
  Download,
  Phone,
  Mail,
  Plus
} from "lucide-react"

interface CustomerQuickActionsProps {
  customer: {
    id: string
    name: string
    email?: string
    phone?: string
    isActive: boolean
    totalOrders?: number
  }
  currentPage?: "profile" | "edit" | "orders"
}

export function CustomerQuickActions({ customer, currentPage }: CustomerQuickActionsProps) {
  const router = useRouter()
  const pathname = usePathname()
  const locale = getLocaleFromPathname(pathname) ?? DEFAULT_LOCALE
  const localizedHref = (href: string) => localizePath(href, locale)
  const { info, success, warning } = useNotifications()

  const handleNavigation = (page: string, pageName: string) => {
    if (pathname.includes(page)) return // Already on this page

    info(`Navigate to ${pageName}`, `Opening ${customer.name}'s ${pageName.toLowerCase()}`)
    router.push(localizedHref(`/dashboard/customers/${customer.id}${page === 'profile' ? '' : `/${page}`}`))
  }

  const handleContact = (type: 'email' | 'phone') => {
    if (type === 'email') {
      if (customer.email) {
        info("Contact via Email", `Opening email client for ${customer.email}`)
        window.open(`mailto:${customer.email}`)
      } else {
        warning("No Email", "This customer doesn't have an email address on file")
      }
    } else if (type === 'phone') {
      if (customer.phone) {
        info("Contact via Phone", `Opening phone dialer for ${customer.phone}`)
        window.open(`tel:${customer.phone}`)
      } else {
        warning("No Phone", "This customer doesn't have a phone number on file")
      }
    }
  }

  const handleExport = () => {
    info("Export Started", `Exporting ${customer.name}'s data`)
    // Simulate export process
    setTimeout(() => success("Export Complete", "Customer data exported successfully"), 2000)
  }

  const handleCreateOrder = () => {
    info("Create Order", `Redirecting to create order for ${customer.name}`)
    router.push(localizedHref(`/dashboard/sales/new?customerId=${customer.id}`))
  }

  return (
    <Card className="bg-white/80 dark:bg-slate-800/80 backdrop-blur-lg border-0 shadow-lg">
      <CardContent className="p-4">
        <div className="space-y-4">
          {/* Back Button */}
          <Button
            variant="outline"
            size="sm"
            onClick={() => {
              info("Back to Customers", "Returning to customer list")
              router.push(localizedHref("/dashboard/customers"))
            }}
            className="w-full justify-start bg-white/80 dark:bg-slate-800/80 backdrop-blur-sm border-slate-200 dark:border-slate-700"
          >
            <ArrowLeft className="h-4 w-4 mr-2" />
            Back to Customers
          </Button>

          {/* Customer Status */}
          <div className="flex items-center justify-between">
            <Badge
              variant={customer.isActive ? "default" : "secondary"}
              className={
                customer.isActive
                  ? "bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-300 border-green-200 dark:border-green-700"
                  : "bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-400 border-slate-200 dark:border-slate-700"
              }
            >
              <div className={`w-2 h-2 rounded-full mr-2 ${customer.isActive ? 'bg-green-500' : 'bg-slate-400'}`}></div>
              {customer.isActive ? "Active" : "Inactive"}
            </Badge>
            {(customer.totalOrders ?? 0) > 0 && (
              <Badge variant="secondary" className="text-xs">
                {customer.totalOrders} {customer.totalOrders === 1 ? 'order' : 'orders'}
              </Badge>
            )}
          </div>

          {/* Navigation Buttons */}
          <div className="space-y-2">
            <h4 className="text-sm font-semibold text-slate-700 dark:text-slate-300 uppercase tracking-wide">
              Navigation
            </h4>

            <Button
              variant={currentPage === "profile" ? "default" : "outline"}
              size="sm"
              onClick={() => handleNavigation('profile', 'Profile')}
              className="w-full justify-start"
              disabled={currentPage === "profile"}
            >
              <User className="h-4 w-4 mr-2" />
              View Profile
            </Button>

            <Button
              variant={currentPage === "edit" ? "default" : "outline"}
              size="sm"
              onClick={() => handleNavigation('edit', 'Edit')}
              className="w-full justify-start"
              disabled={currentPage === "edit"}
            >
              <Edit className="h-4 w-4 mr-2" />
              Edit Details
            </Button>

            <Button
              variant={currentPage === "orders" ? "default" : "outline"}
              size="sm"
              onClick={() => handleNavigation('orders', 'Orders')}
              className="w-full justify-start"
              disabled={currentPage === "orders"}
            >
              <ShoppingCart className="h-4 w-4 mr-2" />
              View Orders
            </Button>
          </div>

          {/* Quick Actions */}
          <div className="space-y-2">
            <h4 className="text-sm font-semibold text-slate-700 dark:text-slate-300 uppercase tracking-wide">
              Quick Actions
            </h4>

            <Button
              variant="outline"
              size="sm"
              onClick={handleCreateOrder}
              className="w-full justify-start bg-gradient-to-r from-blue-50 to-indigo-50 dark:from-blue-900/20 dark:to-indigo-900/20 border-blue-200 dark:border-blue-700 hover:from-blue-100 hover:to-indigo-100 dark:hover:from-blue-900/30 dark:hover:to-indigo-900/30"
            >
              <Plus className="h-4 w-4 mr-2" />
              Create Order
            </Button>

            {customer.email && (
              <Button
                variant="outline"
                size="sm"
                onClick={() => handleContact('email')}
                className="w-full justify-start"
              >
                <Mail className="h-4 w-4 mr-2" />
                Send Email
              </Button>
            )}

            {customer.phone && (
              <Button
                variant="outline"
                size="sm"
                onClick={() => handleContact('phone')}
                className="w-full justify-start"
              >
                <Phone className="h-4 w-4 mr-2" />
                Call Customer
              </Button>
            )}

            <Button
              variant="outline"
              size="sm"
              onClick={handleExport}
              className="w-full justify-start"
            >
              <Download className="h-4 w-4 mr-2" />
              Export Data
            </Button>
          </div>
        </div>
      </CardContent>
    </Card>
  )
}
