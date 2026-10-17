"use client"

import { useNotifications } from "@/components/notifications/NotificationProvider"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Calendar } from "@/components/ui/calendar"
import { Card, CardContent, CardDescription, CardTitle } from "@/components/ui/card"
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Form, FormControl, FormDescription, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form"
import { Input } from "@/components/ui/input"
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover"
import { Progress } from "@/components/ui/progress"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Textarea } from "@/components/ui/textarea"
import { TooltipProvider } from "@/components/ui/tooltip"
import { translatePurchaseAuthoringForm, type PurchaseAuthoringFormCopyKey } from "./purchase-authoring-form-copy"
import { usePurchaseAuthoring } from "./use-purchase-authoring"
import { PurchaseAuthoringPanel, purchaseAuthoringCopy } from "./PurchaseAuthoringPanel"
import { cn } from "@/lib/utils"
import { zodResolver } from "@hookform/resolvers/zod"
import { format } from "date-fns"
import { enUS, fr } from "date-fns/locale"
import {
  Activity,
  AlertTriangle,
  ArrowLeft,
  Building2,
  Calendar as CalendarIcon,
  CheckCircle,
  ChevronRight,
  Clock,
  DollarSign,
  FileText,
  Hash,
  Loader2,
  MapPin,
  Package,
  Plus,
  Save,
  Search,
  Trash2,
  TrendingUp,
  Truck,
  User
} from "lucide-react"
import { useRouter } from "next/navigation"
import { useCallback, useEffect, useRef, useState } from "react"
import { useForm } from "react-hook-form"
import { z } from "zod"

// Enhanced validation schema for purchase orders
const purchaseOrderSchema = (locale: string) => {
  const t = (key: PurchaseAuthoringFormCopyKey) => translatePurchaseAuthoringForm(locale, key)
  return z.object({
  supplierId: z.string().min(1, t("Supplier is required")),
  locationId: z.string().min(1, t("Delivery location is required")),
  date: z.date({
    required_error: t("Order date is required"),
  }),
  expectedDeliveryDate: z.date({
    required_error: t("Expected delivery date is required"),
  }),
  paymentTerms: z.string().min(1, t("Payment terms are required")).max(100, t("Payment terms too long")),
  notes: z.string().optional(),
  shippingCost: z.string().max(32),
  organizationId: z.string().min(1, t("Organization ID is required")),
}).refine(
  (data) => data.expectedDeliveryDate >= data.date,
  {
    message: t("Expected delivery date must be on or after the order date"),
    path: ["expectedDeliveryDate"],
  }
)

}

export type PurchaseOrderFormData = z.infer<ReturnType<typeof purchaseOrderSchema>>

interface OrderLine {
  id: string
  itemId: string
  item: {
    id: string
    name: string
    sku: string
    description?: string
    costPrice?: number
    thumbnail?: string
  }
  quantity: string
  unitPrice: string
  taxRate: string
  discount: string
  notes: string
}

interface DurableCreatePurchaseOrderFormProps {
  isLoading?: boolean
  onCancel?: () => void
  suppliers?: Array<{ id: string; name: string; email?: string; phone?: string }>
  locations?: Array<{ id: string; name: string; address?: string; type?: string }>
  items?: Array<{ id: string; name: string; sku: string; description?: string; costPrice?: number; thumbnail?: string }>
  organizationId: string
  actorId: string
  locale: string
  canReadOrders: boolean
}

const FORM_STEPS = [
  { id: 'basic', title: 'Order Info', icon: FileText, description: 'PO number and dates' },
  { id: 'parties', title: 'Parties', icon: Building2, description: 'Supplier and location' },
  { id: 'items', title: 'Items', icon: Package, description: 'Order line items' },
  { id: 'terms', title: 'Terms', icon: Clock, description: 'Payment and shipping' },
] as const

type FormStep = typeof FORM_STEPS[number]['id']
const restoredDate = (value: string) => /^\d{4}-\d{2}-\d{2}$/.test(value) && Number.isFinite(Date.parse(value)) ? new Date(value + "T00:00:00") : undefined

export function DurableCreatePurchaseOrderForm(props: DurableCreatePurchaseOrderFormProps) {
  return <PurchaseOrderAuthoringForm key={`${props.organizationId}:${props.actorId}`} {...props} />
}

function PurchaseOrderAuthoringForm({
  isLoading = false,
  onCancel,
  suppliers = [],
  locations = [],
  items = [],
  organizationId,
  locale,
  canReadOrders,
}: DurableCreatePurchaseOrderFormProps) {
  const router = useRouter()
  const t = useCallback((key: PurchaseAuthoringFormCopyKey) => translatePurchaseAuthoringForm(locale, key), [locale])
  const dateLocale = locale === "fr" ? fr : enUS
  // This DayPicker version names day grid cells from their content, not labelDay.
  const calendarFormatters = { formatDay: (date: Date) => <><span aria-hidden="true">{format(date, "d")}</span><span className="sr-only">{format(date, "PPPP", { locale: dateLocale })}</span></> }
  const formatCurrency = (amount: number) => new Intl.NumberFormat(locale === "fr" ? "fr-FR" : "en-US", { style: "currency", currency: "XAF", minimumFractionDigits: 0 }).format(amount)
  const authoringText = purchaseAuthoringCopy[locale === "fr" ? "fr" : "en"]
  const [currentStep, setCurrentStep] = useState<FormStep>('basic')
  const stepContent = useRef<HTMLDivElement>(null)
  const previousStep = useRef(currentStep)
  useEffect(() => {
    if (previousStep.current !== currentStep) stepContent.current?.focus()
    previousStep.current = currentStep
  }, [currentStep])
  const [completedSteps, setCompletedSteps] = useState<Set<FormStep>>(new Set())
  const [orderLines, setOrderLines] = useState<OrderLine[]>([])
  const [showItemSearch, setShowItemSearch] = useState(false)
  const [itemSearchTerm, setItemSearchTerm] = useState("")
  const [showConfirmDialog, setShowConfirmDialog] = useState(false)
  const { success, error, warning } = useNotifications()

  const form = useForm<PurchaseOrderFormData>({
    resolver: zodResolver(purchaseOrderSchema(locale)),
    defaultValues: {
      supplierId: "",
      locationId: "",
      date: new Date(),
      expectedDeliveryDate: undefined,
      paymentTerms: t("Net 30 days"),
      notes: "",
      shippingCost: "",
      organizationId
    },
  })

  const authoring = usePurchaseAuthoring(() => {
    const values = form.getValues()
    return { supplierId: values.supplierId, locationId: values.locationId, date: values.date ? format(values.date, "yyyy-MM-dd") : "",
      expectedDeliveryDate: values.expectedDeliveryDate ? format(values.expectedDeliveryDate, "yyyy-MM-dd") : "", paymentTerms: values.paymentTerms,
      notes: values.notes ?? "", shippingCost: values.shippingCost, orderLines: orderLines.map(({ itemId, quantity, unitPrice, taxRate, discount, notes }) => ({ itemId, quantity, unitPrice, taxRate, discount, notes })) }
  }, content => {
    form.reset({ organizationId, supplierId: content.supplierId, locationId: content.locationId,
      date: restoredDate(content.date), expectedDeliveryDate: restoredDate(content.expectedDeliveryDate),
      paymentTerms: content.paymentTerms, notes: content.notes, shippingCost: content.shippingCost })
    setOrderLines(content.orderLines.map((line, index) => ({ ...line, id: `restored-${index}`, item: items.find(item => item.id === line.itemId) ?? { id: line.itemId, name: locale === "fr" ? "Article indisponible — remplacez-le" : "Item unavailable — replace it", sku: line.itemId } })))
    setCompletedSteps(new Set()); setCurrentStep("basic"); setShowItemSearch(false); setShowConfirmDialog(false)
  })
  const isSaving = authoring.busy

  // Calculate progress based on completed steps and form validity
  const calculateProgress = useCallback(() => {
    let progress = 0
    const stepProgress = 100 / FORM_STEPS.length

    FORM_STEPS.forEach((step) => {
      if (completedSteps.has(step.id)) {
        progress += stepProgress
      }
    })

    return Math.min(progress, 100)
  }, [completedSteps])

  // Validate current step
  const validateCurrentStep = useCallback(async () => {
    const values = form.getValues()
    let isValid = false

    switch (currentStep) {
      case 'basic':
        isValid = !!values.date && !!values.expectedDeliveryDate
        if (!isValid) {
          if (!values.date) warning(t("Missing Order Date"), t("Please select an order date"))
          if (!values.expectedDeliveryDate) warning(t("Missing Delivery Date"), t("Please select an expected delivery date"))
        }
        break
      case 'parties':
        isValid = !!values.supplierId && !!values.locationId
        if (!isValid) {
          if (!values.supplierId) warning(t("Missing Supplier"), t("Please select a supplier"))
          if (!values.locationId) warning(t("Missing Location"), t("Please select a delivery location"))
        }
        break
      case 'items':
        isValid = orderLines.length > 0
        if (!isValid) {
          warning(t("No Items Added"), t("Please add at least one item to the purchase order"))
        }
        break
      case 'terms':
        isValid = !!values.paymentTerms
        if (!isValid) {
          warning(t("Missing Payment Terms"), t("Please enter payment terms"))
        }
        break
    }

    if (isValid && !completedSteps.has(currentStep)) {
      setCompletedSteps(prev => new Set([...prev, currentStep]))
      success(t("Step Completed"), t(FORM_STEPS.find(s => s.id === currentStep)!.title))
    }

    return isValid
  }, [currentStep, form, orderLines.length, completedSteps, success, warning, t])

  // Navigation handlers
  const handleNext = useCallback(async () => {
    const isValid = await validateCurrentStep()
    if (!isValid) {
      warning(t("Incomplete Step"), t("Please complete all required fields before proceeding."))
      return
    }

    const currentIndex = FORM_STEPS.findIndex(step => step.id === currentStep)
    if (currentIndex < FORM_STEPS.length - 1) {
      setCurrentStep(FORM_STEPS[currentIndex + 1].id)
    }
  }, [currentStep, validateCurrentStep, warning, t])

  const handlePrevious = useCallback(() => {
    const currentIndex = FORM_STEPS.findIndex(step => step.id === currentStep)
    if (currentIndex > 0) {
      setCurrentStep(FORM_STEPS[currentIndex - 1].id)
    }
  }, [currentStep])

  const handleStepClick = useCallback(async (stepId: FormStep) => {
    if (stepId === currentStep) return

    const currentIndex = FORM_STEPS.findIndex(step => step.id === currentStep)
    const targetIndex = FORM_STEPS.findIndex(step => step.id === stepId)

    if (targetIndex < currentIndex || completedSteps.has(stepId)) {
      setCurrentStep(stepId)
    } else {
      const isValid = await validateCurrentStep()
      if (isValid) {
        setCurrentStep(stepId)
      } else {
        warning(t("Complete Current Step"), t("Please complete the current step before jumping ahead."))
      }
    }
  }, [currentStep, completedSteps, validateCurrentStep, warning, t])

  // Order line management
  const addOrderLine = useCallback((item: typeof items[0]) => {
    const newLine: OrderLine = {
      id: `line_${Date.now()}_${Math.random()}`,
      itemId: item.id,
      item,
      quantity: "1",
      unitPrice: String(item.costPrice ?? 0),
      taxRate: "0",
      discount: "0",
      notes: ""
    }
    setOrderLines(prev => [...prev, newLine])
    setShowItemSearch(false)
    success(t("Item Added"), item.name)
  }, [success, t])

  const updateOrderLine = useCallback((lineId: string, field: keyof OrderLine, value: any) => {
    setOrderLines(prev => prev.map(line =>
      line.id === lineId ? { ...line, [field]: value } : line
    ))
  }, [])

  const removeOrderLine = useCallback((lineId: string) => {
    const line = orderLines.find(l => l.id === lineId)
    setOrderLines(prev => prev.filter(line => line.id !== lineId))
    if (line) {
      warning(t("Item Removed"), line.item.name)
    }
  }, [orderLines, warning, t])

  // Calculate totals
  const calculateTotals = useCallback(() => {
    let subtotal = 0
    let totalTax = 0
    let totalDiscount = 0

    orderLines.forEach(line => {
      const lineTotal = Number(line.quantity || NaN) * Number(line.unitPrice || NaN)
      const tax = lineTotal * (Number(line.taxRate) / 100)
      subtotal += lineTotal
      totalTax += tax
      totalDiscount += Number(line.discount)
    })

    const shippingCost = Number(form.getValues("shippingCost"))
    const total = subtotal + totalTax + shippingCost - totalDiscount

    return { subtotal, totalTax, totalDiscount, shippingCost, total, valid: Number.isFinite(total) }
  }, [orderLines, form])

  // Filter items for search
  const filteredItems = items.filter(item =>
    !itemSearchTerm ||
    item.name.toLowerCase().includes(itemSearchTerm.toLowerCase()) ||
    item.sku.toLowerCase().includes(itemSearchTerm.toLowerCase())
  )

  // Handle create button click - show confirmation dialog
  const handleCreateClick = (e: React.MouseEvent) => {
    e.preventDefault()

    if (orderLines.length === 0) {
      error(t("No Items"), t("Please add at least one item to the purchase order"))
      return
    }

    if (!isFormReadyToSubmit()) {
      error(t("Form Incomplete"), t("Please complete all required fields before creating the purchase order"))
      return
    }

    setShowConfirmDialog(true)
  }

  // Actual form submission after confirmation
  const handleConfirmedSubmit = async () => {
    setShowConfirmDialog(false)
    await authoring.create()
  }

  const totals = calculateTotals()
  const progress = calculateProgress()

  // Check if form is ready to submit
  const isFormReadyToSubmit = () => {
    const values = form.getValues()
    return !!(
      values.supplierId &&
      values.locationId &&
      values.date &&
      values.expectedDeliveryDate &&
      values.paymentTerms &&
      orderLines.length > 0
    )
  }

  return (
    <TooltipProvider>
      <div className="dashboard-landing-theme dark min-h-screen overflow-x-hidden">
        <div className="dashboard-landing-content mx-auto w-full max-w-[88rem] px-4 py-6 text-[var(--dash-text)] sm:px-6 sm:py-8">
          <div className="dashboard-glass-panel sticky top-4 z-40 mb-6 flex items-center justify-between rounded-lg p-4">
          <div className="flex items-center gap-4">
            <div className="flex h-10 w-10 items-center justify-center rounded-lg border border-[var(--dash-border-subtle)] bg-[var(--dash-brand-soft)] text-[var(--dash-brand-strong)]">
              <Plus className="h-5 w-5" />
            </div>
            <div>
              <h1 className="text-2xl font-semibold tracking-normal">
                {t("Create Purchase Order")}
              </h1>
              <p className="mt-1 text-sm text-slate-600 dark:text-slate-400">
                {t("Create a new purchase order with modern efficiency")}
              </p>
              <div className="flex items-center gap-4 mt-3">
                <Badge variant="outline" className="dashboard-filter-chip flex items-center gap-2 rounded-lg px-3 py-1">
                  <Activity className="h-4 w-4 text-[var(--dash-info)]" />
                  {Math.round(progress)}% {t("Complete")}
                </Badge>
                <Badge variant="secondary" className="dashboard-filter-chip rounded-lg px-3 py-1 font-medium">
                  {orderLines.length} {t("Items")}
                </Badge>
                {totals.total > 0 && (
                  <Badge variant="secondary" className="dashboard-filter-chip rounded-lg px-3 py-1 font-medium">
                    {t("Total")}: {totals.valid ? formatCurrency(totals.total) : "—"}
                  </Badge>
                )}
              </div>
            </div>
          </div>

          <div className="flex items-center gap-3">
            <Button
              variant="outline"
              size="sm"
              onClick={() => router.back()}
              className="dashboard-button-secondary flex items-center gap-2 rounded-lg"
            >
              <ArrowLeft className="w-4 h-4" />
              {t("Back")}
            </Button>
          </div>
        </div>

        <div className="mx-auto max-w-7xl py-4 sm:py-6">
          {/* Progress and Steps */}
          <div className="mb-8">
            <div className="mb-6">
              <div className="flex justify-between items-center mb-2">
                <span className="text-sm font-medium text-[var(--dash-text-muted)]">{t("Overall Progress")}</span>
                <span className="text-sm text-[var(--dash-text-soft)]">{Math.round(progress)}%</span>
              </div>
              <Progress aria-label={t("Overall Progress")} aria-valuenow={progress} value={progress} className="h-2" />
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
              {FORM_STEPS.map((step, index) => {
                const Icon = step.icon
                const isActive = currentStep === step.id
                const isCompleted = completedSteps.has(step.id)
                const isAccessible = index === 0 || completedSteps.has(FORM_STEPS[index - 1].id)

                return (
                  <button
                    key={step.id}
                    aria-current={isActive ? "step" : undefined}
                    onClick={() => handleStepClick(step.id)}
                    disabled={!isAccessible && !isCompleted}
                    className={cn(
                      "rounded-lg border p-4 text-left transition-colors",
                      "focus:outline-none focus:ring-2 focus:ring-[var(--dash-brand)]/30",
                      isActive && "border-[var(--dash-brand)] bg-[var(--dash-brand-soft)] shadow-sm",
                      isCompleted && !isActive && "border-[var(--dash-success)]/60 bg-[var(--dash-success-soft)]",
                      !isActive && !isCompleted && isAccessible && "border-[var(--dash-border-subtle)] bg-[rgba(37,57,67,0.74)] hover:border-[var(--dash-border)]",
                      !isAccessible && !isCompleted && "cursor-not-allowed border-[var(--dash-border-subtle)] bg-[rgba(24,38,45,0.45)] opacity-50"
                    )}
                  >
                    <div className="flex items-center gap-3 mb-2">
                      <div className={cn(
                        "flex items-center justify-center w-8 h-8 rounded-lg shadow-sm",
                        isActive && "bg-[var(--dash-brand)] text-white",
                        isCompleted && !isActive && "bg-[var(--dash-success)] text-white",
                        !isActive && !isCompleted && "bg-[var(--dash-surface-raised)] text-[var(--dash-text-soft)]"
                      )}>
                        {isCompleted ? <CheckCircle className="w-4 h-4" /> : <Icon className="w-4 h-4" />}
                      </div>
                      <div>
                        <h3 className={cn(
                          "font-semibold text-sm",
                          isActive && "text-[var(--dash-brand-strong)]",
                          isCompleted && !isActive && "text-[var(--dash-success)]",
                          !isActive && !isCompleted && "text-[var(--dash-text-muted)]"
                        )}>
                          {t(step.title)}
                        </h3>
                      </div>
                    </div>
                    <p className="text-xs text-slate-600 dark:text-slate-400">{t(step.description)}</p>
                  </button>
                )
              })}
            </div>
          </div>

          <PurchaseAuthoringPanel controller={authoring} locale={locale} canReadOrders={canReadOrders} />
          {form.watch("supplierId") && !suppliers.some(supplier => supplier.id === form.getValues("supplierId")) && <p role="alert">{locale === "fr" ? "Fournisseur indisponible : sélectionnez un fournisseur actuel." : "Supplier unavailable: select a current supplier."}</p>}
          {form.watch("locationId") && !locations.some(location => location.id === form.getValues("locationId")) && <p role="alert">{locale === "fr" ? "Lieu indisponible : sélectionnez un lieu actuel." : "Location unavailable: select a current location."}</p>}
          <Form {...form}>
            <form className="space-y-8" onSubmit={event => event.preventDefault()}>
              <fieldset disabled={authoring.locked} className="min-w-0">
              <div className="grid lg:grid-cols-3 gap-8">
                <div ref={stepContent} tabIndex={-1} role="region" aria-label={t(FORM_STEPS.find(step => step.id === currentStep)!.title)} className="lg:col-span-2">
                  {/* Step Content */}
                  {currentStep === 'basic' && (
                    <Card className="dashboard-glass-panel rounded-lg text-[var(--dash-text)]">
                      <CardContent className="p-6 sm:p-8">
                        <div className="flex items-center gap-3 mb-6">
                          <div className="rounded-lg border border-[var(--dash-border-subtle)] bg-[var(--dash-brand-soft)] p-2 text-[var(--dash-brand-strong)]">
                            <FileText className="h-5 w-5" />
                          </div>
                          <div>
                            <CardTitle className="text-xl">{t("Order Information")}</CardTitle>
                            <CardDescription>{t("Basic purchase order details and dates")}</CardDescription>
                          </div>
                        </div>

                        <div className="grid md:grid-cols-2 gap-6">
                          <div><p className="flex items-center gap-2"><Hash className="h-4 w-4" />{authoringText.order}</p><p>{authoring.current?.receipt?.orderNumber ?? authoringText.pending}</p></div>

                          <FormField
                            control={form.control}
                            name="date"
                            render={({ field }) => (
                              <FormItem>
                                <FormLabel className="flex items-center gap-2">
                                  <CalendarIcon className="h-4 w-4" />
                                  {t("Order Date")}
                                </FormLabel>
                                <Popover>
                                  <PopoverTrigger asChild>
                                    <FormControl>
                                      <Button
                                        variant="outline"
                                        className={cn(
                                          "w-full pl-3 text-left font-normal",
                                          !field.value && "text-muted-foreground"
                                        )}
                                      >
                                        {field.value ? (
                                          format(field.value, "PPP", { locale: dateLocale })
                                        ) : (
                                          <span>{t("Pick a date")}</span>
                                        )}
                                        <CalendarIcon className="ml-auto h-4 w-4 opacity-50" />
                                      </Button>
                                    </FormControl>
                                  </PopoverTrigger>
                                  <PopoverContent className="w-auto p-0" align="start">
                                    <Calendar
                                      locale={dateLocale}
                                      labels={{ labelPrevious: () => t("Previous month"), labelNext: () => t("Next month") }}
                                      formatters={calendarFormatters}
                                      mode="single"
                                      selected={field.value}
                                      onSelect={field.onChange}
                                      disabled={(date) =>
                                        date > new Date() || date < new Date("1900-01-01")
                                      }
                                      initialFocus
                                    />
                                  </PopoverContent>
                                </Popover>
                                <FormDescription>
                                  {t("When this order was created")}
                                </FormDescription>
                                <FormMessage />
                              </FormItem>
                            )}
                          />

                          <FormField
                            control={form.control}
                            name="expectedDeliveryDate"
                            render={({ field }) => (
                              <FormItem>
                                <FormLabel className="flex items-center gap-2">
                                  <Truck className="h-4 w-4" />
                                  {t("Expected Delivery")}
                                </FormLabel>
                                <Popover>
                                  <PopoverTrigger asChild>
                                    <FormControl>
                                      <Button
                                        variant="outline"
                                        className={cn(
                                          "w-full pl-3 text-left font-normal",
                                          !field.value && "text-muted-foreground"
                                        )}
                                      >
                                        {field.value ? (
                                          format(field.value, "PPP", { locale: dateLocale })
                                        ) : (
                                          <span>{t("Pick expected delivery date")}</span>
                                        )}
                                        <CalendarIcon className="ml-auto h-4 w-4 opacity-50" />
                                      </Button>
                                    </FormControl>
                                  </PopoverTrigger>
                                  <PopoverContent className="w-auto p-0" align="start">
                                    <Calendar
                                      locale={dateLocale}
                                      labels={{ labelPrevious: () => t("Previous month"), labelNext: () => t("Next month") }}
                                      formatters={calendarFormatters}
                                      mode="single"
                                      selected={field.value}
                                      onSelect={field.onChange}
                                      disabled={(date) => date < new Date()}
                                      initialFocus
                                    />
                                  </PopoverContent>
                                </Popover>
                                <FormDescription>
                                  {t("When you expect to receive the items")}
                                </FormDescription>
                                <FormMessage />
                              </FormItem>
                            )}
                          />
                        </div>
                      </CardContent>
                    </Card>
                  )}

                  {currentStep === 'parties' && (
                    <Card className="dashboard-glass-panel rounded-lg text-[var(--dash-text)]">
                      <CardContent className="p-6 sm:p-8">
                        <div className="flex items-center gap-3 mb-6">
                          <div className="rounded-lg border border-[var(--dash-border-subtle)] bg-[var(--dash-brand-soft)] p-2 text-[var(--dash-brand-strong)]">
                            <Building2 className="h-5 w-5" />
                          </div>
                          <div>
                            <CardTitle className="text-xl">{t("Parties")}</CardTitle>
                            <CardDescription>{t("Select supplier and delivery location")}</CardDescription>
                          </div>
                        </div>

                        <div className="grid md:grid-cols-2 gap-6">
                          <FormField
                            control={form.control}
                            name="supplierId"
                            render={({ field }) => (
                              <FormItem>
                                <FormLabel className="flex items-center gap-2">
                                  <User className="h-4 w-4" />
                                  {t("Supplier")}
                                </FormLabel>
                                <Select onValueChange={field.onChange} value={field.value}>
                                  <FormControl>
                                    <SelectTrigger>
                                      <SelectValue placeholder={t("Select a supplier")} />
                                    </SelectTrigger>
                                  </FormControl>
                                  <SelectContent>
                                    {suppliers.map((supplier) => (
                                      <SelectItem key={supplier.id} value={supplier.id}>
                                        <div className="flex items-center gap-2">
                                          <div className="flex h-8 w-8 items-center justify-center rounded-lg border border-[var(--dash-border-subtle)] bg-[var(--dash-brand-soft)] text-[var(--dash-brand-strong)]">
                                            <span className="text-xs font-bold">
                                              {supplier.name.charAt(0)}
                                            </span>
                                          </div>
                                          <div>
                                            <div className="font-medium">{supplier.name}</div>
                                            {supplier.email && (
                                              <div className="text-xs text-muted-foreground">{supplier.email}</div>
                                            )}
                                          </div>
                                        </div>
                                      </SelectItem>
                                    ))}
                                  </SelectContent>
                                </Select>
                                <FormDescription>
                                  {t("Choose the supplier for this order")}
                                </FormDescription>
                                <FormMessage />
                              </FormItem>
                            )}
                          />

                          <FormField
                            control={form.control}
                            name="locationId"
                            render={({ field }) => (
                              <FormItem>
                                <FormLabel className="flex items-center gap-2">
                                  <MapPin className="h-4 w-4" />
                                  {t("Delivery Location")}
                                </FormLabel>
                                <Select onValueChange={field.onChange} value={field.value}>
                                  <FormControl>
                                    <SelectTrigger>
                                      <SelectValue placeholder={t("Select delivery location")} />
                                    </SelectTrigger>
                                  </FormControl>
                                  <SelectContent>
                                    {locations.map((location) => (
                                      <SelectItem key={location.id} value={location.id}>
                                        <div className="flex items-center gap-2">
                                          <MapPin className="h-4 w-4 text-blue-600" />
                                          <div>
                                            <div className="font-medium">{location.name}</div>
                                            {location.address && (
                                              <div className="text-xs text-muted-foreground">{location.address}</div>
                                            )}
                                          </div>
                                        </div>
                                      </SelectItem>
                                    ))}
                                  </SelectContent>
                                </Select>
                                <FormDescription>
                                  {t("Where items should be delivered")}
                                </FormDescription>
                                <FormMessage />
                              </FormItem>
                            )}
                          />
                        </div>
                      </CardContent>
                    </Card>
                  )}

                  {currentStep === 'items' && (
                    <Card className="dashboard-glass-panel rounded-lg text-[var(--dash-text)]">
                      <CardContent className="p-6 sm:p-8">
                        <div className="flex items-center justify-between mb-6">
                          <div className="flex items-center gap-3">
                            <div className="rounded-lg border border-[var(--dash-border-subtle)] bg-[var(--dash-spruce-soft)] p-2 text-[var(--dash-spruce)]">
                              <Package className="h-5 w-5" />
                            </div>
                            <div>
                              <CardTitle className="text-xl">{t("Order Items")}</CardTitle>
                              <CardDescription>{t("Add items to your purchase order")}</CardDescription>
                            </div>
                          </div>
                          <Button
                            type="button"
                            onClick={() => setShowItemSearch(true)}
                            className="dashboard-button-primary gap-2 rounded-lg"
                          >
                            <Plus className="h-4 w-4" />
                            {t("Add Item")}
                          </Button>
                        </div>

                        {orderLines.length === 0 ? (
                          <div className="text-center py-12">
                            <div className="mx-auto mb-4 flex h-20 w-20 items-center justify-center rounded-full bg-[var(--dash-surface-raised)]">
                              <Package className="w-10 h-10 text-[var(--dash-text-faint)]" />
                            </div>
                            <h3 className="mb-2 text-lg font-semibold text-[var(--dash-text)]">{t("No items added")}</h3>
                            <p className="mb-6 text-[var(--dash-text-soft)]">
                              {t("Add items to this purchase order to get started.")}
                            </p>
                            <Button
                              type="button"
                              onClick={() => setShowItemSearch(true)}
                              className="dashboard-button-primary gap-2 rounded-lg"
                            >
                              <Plus className="h-4 w-4" />
                              {t("Add First Item")}
                            </Button>
                          </div>
                        ) : (
                          <div className="dashboard-table-shell dashboard-data-table overflow-x-auto rounded-lg">
                            <Table>
                              <TableHeader>
                                <TableRow>
                                  <TableHead>{t("Item")}</TableHead>
                                  <TableHead className="text-center w-24">{t("Qty")}</TableHead>
                                  <TableHead className="text-right w-32">{t("Unit Price")}</TableHead>
                                  <TableHead className="text-center w-20">{t("Tax %")}</TableHead>
                                  <TableHead className="text-right w-24">{t("Discount")}</TableHead>
                                  <TableHead className="text-right w-32">{t("Total")}</TableHead>
                                  <TableHead className="text-center w-20">{t("Actions")}</TableHead>
                                </TableRow>
                              </TableHeader>
                              <TableBody>
                                {orderLines.map((line) => {
                                  const lineTotal = Number(line.quantity || NaN) * Number(line.unitPrice || NaN)
                                  const tax = lineTotal * (Number(line.taxRate) / 100)
                                  const total = lineTotal + tax - Number(line.discount)
                                  return (
                                    <TableRow key={line.id}>
                                      <TableCell>
                                        <div className="flex items-center gap-3">
                                          <div className="w-10 h-10 bg-slate-100 dark:bg-slate-800 rounded-lg flex items-center justify-center">
                                            <Package className="w-5 h-5 text-slate-400" />
                                          </div>
                                          <div>
                                            <div className="font-medium">{line.item.name}</div>
                                            <div className="text-sm text-muted-foreground">{line.item.sku}</div>
                                          </div>
                                        </div>
                                      </TableCell>
                                      <TableCell>
                                        <Input
                                          type="text"
                                          inputMode="decimal"
                                          aria-label={`${t("Quantity")} — ${line.item.name}`}
                                          value={line.quantity}
                                          onChange={(e) =>
                                            updateOrderLine(line.id, "quantity", e.target.value)
                                          }
                                          className="text-center"
                                        />
                                      </TableCell>
                                      <TableCell>
                                        <Input
                                          type="text"
                                          inputMode="decimal"
                                          aria-label={`${t("Unit Price")} — ${line.item.name}`}
                                          value={line.unitPrice}
                                          onChange={(e) =>
                                            updateOrderLine(line.id, "unitPrice", e.target.value)
                                          }
                                          className="text-right"
                                        />
                                      </TableCell>
                                      <TableCell>
                                        <Input
                                          type="text"
                                          inputMode="decimal"
                                          aria-label={`${t("Tax %")} — ${line.item.name}`}
                                          value={line.taxRate}
                                          onChange={(e) =>
                                            updateOrderLine(line.id, "taxRate", e.target.value)
                                          }
                                          className="text-center"
                                        />
                                      </TableCell>
                                      <TableCell>
                                        <Input
                                          type="text"
                                          inputMode="decimal"
                                          aria-label={`${t("Discount")} — ${line.item.name}`}
                                          value={line.discount}
                                          onChange={(e) =>
                                            updateOrderLine(line.id, "discount", e.target.value)
                                          }
                                          className="text-right"
                                        />
                                      </TableCell>
                                      <TableCell className="text-right font-medium">
                                        {Number.isFinite(total) ? formatCurrency(total) : "—"}
                                      </TableCell>
                                      <TableCell className="text-center">
                                        <Button
                                          type="button"
                                          variant="ghost"
                                          size="sm"
                                          aria-label={`${t("Remove item")} — ${line.item.name}`}
                                          onClick={() => removeOrderLine(line.id)}
                                          className="text-destructive hover:text-destructive hover:bg-destructive/10"
                                        >
                                          <Trash2 className="h-4 w-4" />
                                        </Button>
                                      </TableCell>
                                    </TableRow>
                                  )
                                })}
                              </TableBody>
                            </Table>
                          </div>
                        )}
                      </CardContent>
                    </Card>
                  )}

                  {currentStep === 'terms' && (
                    <Card className="dashboard-glass-panel rounded-lg text-[var(--dash-text)]">
                      <CardContent className="p-6 sm:p-8">
                        <div className="flex items-center gap-3 mb-6">
                          <div className="rounded-lg border border-[var(--dash-warning)]/30 bg-[var(--dash-warning-soft)] p-2 text-[var(--dash-warning)]">
                            <Clock className="h-5 w-5" />
                          </div>
                          <div>
                            <CardTitle className="text-xl">{t("Terms & Conditions")}</CardTitle>
                            <CardDescription>{t("Payment terms and additional information")}</CardDescription>
                          </div>
                        </div>

                        <div className="space-y-6">
                          <div className="grid md:grid-cols-2 gap-6">
                            <FormField
                              control={form.control}
                              name="paymentTerms"
                              render={({ field }) => (
                                <FormItem>
                                  <FormLabel className="flex items-center gap-2">
                                    <DollarSign className="h-4 w-4" />
                                    {t("Payment Terms")}
                                  </FormLabel>
                                  <FormControl>
                                    <Input {...field} placeholder={t("Net 30 days")} />
                                  </FormControl>
                                  <FormDescription>
                                    {t("Payment conditions for this order")}
                                  </FormDescription>
                                  <FormMessage />
                                </FormItem>
                              )}
                            />

                            <FormField
                              control={form.control}
                              name="shippingCost"
                              render={({ field }) => (
                                <FormItem>
                                  <FormLabel className="flex items-center gap-2">
                                    <Truck className="h-4 w-4" />
                                    {t("Shipping Cost")}
                                  </FormLabel>
                                  <FormControl>
                                    <Input
                                      type="text"
                                      inputMode="decimal"
                                      {...field}
                                      onChange={(e) => field.onChange(e.target.value)}
                                      placeholder="0.00"
                                    />
                                  </FormControl>
                                  <FormDescription>
                                    {t("Additional shipping charges")}
                                  </FormDescription>
                                  <FormMessage />
                                </FormItem>
                              )}
                            />
                          </div>

                          <FormField
                            control={form.control}
                            name="notes"
                            render={({ field }) => (
                              <FormItem>
                                <FormLabel className="flex items-center gap-2">
                                  <FileText className="h-4 w-4" />
                                  {t("Additional Notes")}
                                </FormLabel>
                                <FormControl>
                                  <Textarea
                                    {...field}
                                    placeholder={t("Any special instructions or notes for this order...")}
                                    className="min-h-[100px] resize-none"
                                  />
                                </FormControl>
                                <FormDescription>
                                  {t("Optional notes for the supplier or internal use")}
                                </FormDescription>
                                <FormMessage />
                              </FormItem>
                            )}
                          />
                        </div>
                      </CardContent>
                    </Card>
                  )}
                </div>

                {/* Summary Sidebar */}
                <div className="space-y-6">
                  {/* Order Summary */}
                  <Card className="dashboard-glass-panel sticky top-24 rounded-lg text-[var(--dash-text)]">
                    <CardContent className="p-6">
                      <div className="flex items-center gap-3 mb-4">
                        <div className="rounded-lg border border-[var(--dash-success)]/30 bg-[var(--dash-success-soft)] p-2 text-[var(--dash-success)]">
                          <TrendingUp className="h-4 w-4" />
                        </div>
                        <div>
                          <h3 className="font-semibold">{t("Order Summary")}</h3>
                          <p className="text-sm text-muted-foreground">{orderLines.length} {t("Items")}</p>
                        </div>
                      </div>

                      <div className="space-y-3">
                        <div className="flex justify-between text-sm">
                          <span className="text-muted-foreground">{t("Subtotal")}</span>
                          <span className="font-medium">{totals.valid ? formatCurrency(totals.subtotal) : "—"}</span>
                        </div>
                        <div className="flex justify-between text-sm">
                          <span className="text-muted-foreground">{t("Tax")}</span>
                          <span className="font-medium">{totals.valid ? formatCurrency(totals.totalTax) : "—"}</span>
                        </div>
                        <div className="flex justify-between text-sm">
                          <span className="text-muted-foreground">{t("Shipping")}</span>
                          <span className="font-medium">{Number.isFinite(totals.shippingCost) ? formatCurrency(totals.shippingCost) : "—"}</span>
                        </div>
                        {totals.totalDiscount > 0 && (
                          <div className="flex justify-between text-sm">
                            <span className="text-muted-foreground">{t("Discount")}</span>
                            <span className="font-medium text-rose-600">-{formatCurrency(totals.totalDiscount)}</span>
                          </div>
                        )}
                        <div className="border-t pt-3">
                          <div className="flex justify-between font-semibold">
                            <span>{t("Total")}</span>
                            <span className="text-lg text-emerald-600">{totals.valid ? formatCurrency(totals.total) : "—"}</span>
                          </div>
                        </div>

                        {/* Form Status Indicator */}
                        <div className="mt-4 pt-3 border-t">
                          <div className="flex items-center justify-between text-sm">
                            <span className="text-muted-foreground">{t("Form Status:")}</span>
                            {isFormReadyToSubmit() ? (
                              <Badge variant="outline" className="rounded-lg border-[var(--dash-success)]/35 bg-[var(--dash-success-soft)] text-[var(--dash-text)]">
                                <CheckCircle className="w-3 h-3 mr-1" />
                                {t("Ready to Submit")}
                              </Badge>
                            ) : (
                              <Badge variant="outline" className="rounded-lg border-[var(--dash-warning)]/35 bg-[var(--dash-warning-soft)] text-[var(--dash-text)]">
                                <AlertTriangle className="w-3 h-3 mr-1" />
                                {t("Incomplete")}
                              </Badge>
                            )}
                          </div>
                        </div>
                      </div>
                    </CardContent>
                  </Card>

                  {/* Navigation */}
                  <Card className="dashboard-glass-panel rounded-lg text-[var(--dash-text)]">
                    <CardContent className="p-6">
                      <div className="flex gap-3">
                        {currentStep !== 'basic' && (
                          <Button
                            type="button"
                            variant="outline"
                            onClick={handlePrevious}
                            className="dashboard-button-secondary flex-1 rounded-lg"
                          >
                            {t("Previous")}
                          </Button>
                        )}
                        {currentStep !== 'terms' ? (
                          <Button
                            type="button"
                            onClick={handleNext}
                            className="dashboard-button-primary flex-1 rounded-lg"
                          >
                            {t("Next")}
                            <ChevronRight className="ml-2 h-4 w-4" />
                          </Button>
                        ) : (
                          <Button
                            type="button"
                            disabled={isSaving || !isFormReadyToSubmit() || !authoring.canSave || authoring.uncertain}
                            className="dashboard-button-primary flex-1 rounded-lg disabled:opacity-50"
                            onClick={handleCreateClick}
                          >
                            {isSaving ? (
                              <>
                                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                                {t("Creating...")}
                              </>
                            ) : (
                              <>
                                <Save className="mr-2 h-4 w-4" />
                                {t("Create Order")}
                              </>
                            )}
                          </Button>
                        )}
                      </div>
                    </CardContent>
                  </Card>
                </div>
              </div>
              </fieldset>
            </form>
          </Form>

          {/* Item Search Dialog */}
          <Dialog open={showItemSearch} onOpenChange={setShowItemSearch}>
            <DialogContent closeLabel={t("Close")} className="dashboard-glass-panel flex max-h-[82vh] max-w-4xl flex-col rounded-lg border-[var(--dash-border-subtle)] text-[var(--dash-text)]">
              <DialogHeader>
                <DialogTitle className="flex items-center gap-2">
                  <Search className="h-5 w-5" />
                  {t("Add Items")}
                </DialogTitle>
                <DialogDescription className="text-[var(--dash-text-soft)]">
                  {t("Search and select items to add to your purchase order")}
                </DialogDescription>
              </DialogHeader>
              <div className="flex-1 flex flex-col space-y-4 min-h-0">
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-[var(--dash-text-faint)]" />
                  <Input
                    aria-label={t("Search items")}
                    placeholder={t("Search items by name or SKU...")}
                    value={itemSearchTerm}
                    onChange={(e) => setItemSearchTerm(e.target.value)}
                    className="dashboard-control pl-10"
                  />
                </div>
                <div className="flex-1 overflow-y-auto space-y-2 min-h-0">
                  {filteredItems.length === 0 ? (
                    <div className="text-center py-8 text-muted-foreground">
                      {itemSearchTerm ? t("No items found matching your search") : t("No items available")}
                    </div>
                  ) : (
                    filteredItems.map((item) => {
                      const isAlreadyAdded = orderLines.some((line) => line.itemId === item.id)
                      return (
                        <div
                          key={item.id}
                          className={cn(
                            "flex items-center justify-between p-4 border rounded-lg hover:bg-muted/50 transition-colors",
                            "border-[var(--dash-border-subtle)] bg-[rgba(24,38,45,0.5)] hover:bg-[rgba(73,198,229,0.1)]",
                            isAlreadyAdded && "opacity-50"
                          )}
                        >
                          <div className="flex items-center gap-3 flex-1">
                            <div className="flex h-12 w-12 items-center justify-center rounded-lg bg-[var(--dash-spruce-soft)]">
                              <Package className="w-6 h-6 text-[var(--dash-spruce)]" />
                            </div>
                            <div className="flex-1 min-w-0">
                              <h4 className="font-medium truncate">{item.name}</h4>
                              <p className="text-sm text-muted-foreground">{item.sku}</p>
                              {item.description && (
                                <p className="text-xs text-muted-foreground truncate mt-1">{item.description}</p>
                              )}
                            </div>
                            <div className="text-right">
                              <div className="font-medium">{formatCurrency(item.costPrice || 0)}</div>
                              <div className="text-xs text-muted-foreground">{t("Cost Price")}</div>
                            </div>
                          </div>
                          <div className="ml-4">
                            {isAlreadyAdded ? (
                              <Badge variant="secondary" className="rounded-md bg-emerald-100 text-emerald-800 dark:bg-emerald-950/40 dark:text-emerald-100">
                                <CheckCircle className="w-3 h-3 mr-1" />
                                {t("Added")}
                              </Badge>
                            ) : (
                              <Button aria-label={`${t("Add")} — ${item.name}`} onClick={() => addOrderLine(item)} size="sm" className="dashboard-button-primary rounded-lg">
                                <Plus className="w-3 h-3 mr-1" />
                                {t("Add")}
                              </Button>
                            )}
                          </div>
                        </div>
                      )
                    })
                  )}
                </div>
              </div>
            </DialogContent>
          </Dialog>

          {/* Confirmation Dialog */}
          <Dialog open={showConfirmDialog} onOpenChange={setShowConfirmDialog}>
            <DialogContent closeLabel={t("Close")} className="dashboard-glass-panel rounded-lg border-[var(--dash-border-subtle)] text-[var(--dash-text)]">
              <DialogHeader>
                <DialogTitle className="flex items-center gap-2">
                  <Save className="h-5 w-5" />
                  {t("Create Purchase Order")}
                </DialogTitle>
                <DialogDescription className="text-[var(--dash-text-soft)]">
                  {t("Are you sure you want to create this purchase order? Please review the details before proceeding.")}
                </DialogDescription>
              </DialogHeader>

              <div className="space-y-4">
                <div className="rounded-lg border border-[var(--dash-border-subtle)] bg-[rgba(24,38,45,0.58)] p-4">
                  <div className="grid grid-cols-2 gap-4 text-sm">
                    <div>
                      <span className="font-medium text-[var(--dash-text-soft)]">{t("PO Number:")}</span>
                      <div className="font-semibold">{authoringText.pending}</div>
                    </div>
                    <div>
                      <span className="font-medium text-[var(--dash-text-soft)]">{t("Total Amount:")}</span>
                      <div className="font-semibold text-[var(--dash-success)]">{totals.valid ? formatCurrency(totals.total) : "—"}</div>
                    </div>
                    <div>
                      <span className="font-medium text-[var(--dash-text-soft)]">{t("Items:")}</span>
                      <div className="font-semibold">{orderLines.length} {t("Items")}</div>
                    </div>
                    <div>
                      <span className="font-medium text-[var(--dash-text-soft)]">{t("Expected Delivery:")}</span>
                      <div className="font-semibold">
                        {form.getValues("expectedDeliveryDate")
                          ? format(form.getValues("expectedDeliveryDate"), "PPP", { locale: dateLocale })
                          : t("Not set")
                        }
                      </div>
                    </div>
                  </div>
                </div>

                <div className="flex gap-3 justify-end">
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => setShowConfirmDialog(false)}
                    disabled={isSaving}
                    className="dashboard-button-secondary rounded-lg"
                  >
                    {t("Cancel")}
                  </Button>
                  <Button
                    type="button"
                    onClick={handleConfirmedSubmit}
                    disabled={isSaving}
                    className="dashboard-button-primary rounded-lg"
                  >
                    {isSaving ? (
                      <>
                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                        {t("Creating...")}
                      </>
                    ) : (
                      <>
                        <Save className="mr-2 h-4 w-4" />
                        {t("Confirm & Create")}
                      </>
                    )}
                  </Button>
                </div>
              </div>
            </DialogContent>
          </Dialog>
          </div>
        </div>
      </div>
    </TooltipProvider>
  )
}
