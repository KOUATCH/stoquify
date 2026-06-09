"use client"

import { notify } from "@/lib/notifications/notify"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Calendar } from "@/components/ui/calendar"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form"
import { Input } from "@/components/ui/input"
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Textarea } from "@/components/ui/textarea"
import { useUpdatePurchaseOrder } from "@/hooks/useRecentPurchaseOrderQueries"
import { getLocaleFromPathname, localizePath } from "@/i18n/routing"
import { cn } from "@/lib/utils"
import { DEFAULT_LOCALE } from "@/types/bilingual"
import { PurchaseOrderWithRelations } from "@/types/purchase-orders-system-types"
import { zodResolver } from "@hookform/resolvers/zod"
import { format } from "date-fns"
import { ArrowLeft, CalendarIcon, CheckCircle, Plus, Save, Trash2 } from "lucide-react"
import { usePathname, useRouter } from "next/navigation"
import { useEffect, useMemo, useState } from "react"
import { useForm } from "react-hook-form"
import { z } from "zod"

const lineItemSchema = z.object({
  id: z.string().optional(),
  itemId: z.string().min(1, "Item is required"),
  itemName: z.string().optional(),
  orderedQuantity: z.number().min(0.01, "Quantity must be greater than 0"),
  unitCost: z.number().min(0, "Unit cost must be 0 or greater"),
  taxAmount: z.number().min(0, "Tax amount must be 0 or greater"),
  discount: z.number().min(0, "Discount must be 0 or greater").default(0),
  lineTotal: z.number().optional(),
})

const purchaseOrderSchema = z.object({
  orderNumber: z.string().min(1, "Order number is required"),
  supplierId: z.string().min(1, "Supplier is required"),
  locationId: z.string().min(1, "Location is required"),
  expectedDeliveryDate: z.date().optional(),
  notes: z.string().optional(),
  internalNotes: z.string().optional(),
  reference: z.string().optional(),
  paymentTerms: z.string().optional(),
  shippingMethod: z.string().optional(),
  shippingCost: z.number().min(0, "Shipping cost must be 0 or greater").default(0),
  discount: z.number().min(0, "Discount must be 0 or greater").default(0),
  lines: z.array(lineItemSchema).min(1, "At least one line item is required"),
})

type PurchaseOrderFormData = z.infer<typeof purchaseOrderSchema>

interface ModernEditPurchaseOrderFormProps {
  purchaseOrder: PurchaseOrderWithRelations
  suppliers: Array<{ id: string; name: string; email?: string }>
  locations: Array<{ id: string; name: string }>
  items: Array<{ id: string; name: string; sku: string; sellingPrice?: number }>
  organizationId: string
}

export function ModernEditPurchaseOrderForm({
  purchaseOrder,
  suppliers,
  locations,
  items,
  organizationId
}: ModernEditPurchaseOrderFormProps) {
  const router = useRouter()
  const pathname = usePathname()
  const locale = getLocaleFromPathname(pathname) ?? DEFAULT_LOCALE
  const localizedHref = (href: string) => localizePath(href, locale)
  const { mutate: updatePurchaseOrder, isPending } = useUpdatePurchaseOrder()
  const [currentStep, setCurrentStep] = useState(0)

  const steps = [
    { title: "Order Details", description: "Basic purchase order information" },
    { title: "Supplier & Location", description: "Select supplier and delivery location" },
    { title: "Line Items", description: "Add items to your purchase order" },
    { title: "Additional Info", description: "Shipping, payment terms, and notes" }
  ]

  const form = useForm<PurchaseOrderFormData>({
    resolver: zodResolver(purchaseOrderSchema),
    defaultValues: {
      orderNumber: purchaseOrder.orderNumber,
      supplierId: purchaseOrder.supplier?.id || "",
      locationId: purchaseOrder.locationId || "",
      expectedDeliveryDate: purchaseOrder.expectedDeliveryDate ? new Date(purchaseOrder.expectedDeliveryDate) : undefined,
      notes: purchaseOrder.notes || "",
      internalNotes: "", // This field might not exist in the type
      reference: "", // This field might not exist in the type
      paymentTerms: purchaseOrder.paymentTerms || "",
      shippingMethod: "", // This field might not exist in the type
      shippingCost: purchaseOrder.shippingCost || 0,
      discount: purchaseOrder.discount || 0,
      lines: purchaseOrder.lines.map(line => ({
        id: line.id,
        itemId: line.itemId || "",
        itemName: line.item?.name || "",
        orderedQuantity: line.orderedQuantity || 0,
        unitCost: line.unitCost || 0,
        taxAmount: line.taxAmount || 0,
        discount: line.discount || 0,
        lineTotal: line.lineTotal || 0,
      }))
    }
  })

  const { watch, setValue, getValues } = form
  const watchedLines = watch("lines")
  const watchedShippingCost = watch("shippingCost")
  const watchedDiscount = watch("discount")

  // Calculate totals
  const { subtotal, taxTotal, total } = useMemo(() => {
    const lineSubtotal = watchedLines.reduce((sum, line) => sum + (line.orderedQuantity * line.unitCost), 0)
    const lineTaxTotal = watchedLines.reduce((sum, line) => sum + line.taxAmount, 0)
    const lineDiscount = watchedLines.reduce((sum, line) => sum + (line.discount || 0), 0)

    const subtotal = lineSubtotal - lineDiscount
    const taxTotal = lineTaxTotal
    const total = subtotal + taxTotal + (watchedShippingCost || 0) - (watchedDiscount || 0)

    return { subtotal, taxTotal, total }
  }, [watchedLines, watchedShippingCost, watchedDiscount])

  // Update line totals when quantities or costs change
  useEffect(() => {
    const lines = getValues("lines")
    lines.forEach((line, index) => {
      const lineTotal = (line.orderedQuantity * line.unitCost) - (line.discount || 0) + line.taxAmount
      setValue(`lines.${index}.lineTotal`, lineTotal)
    })
  }, [watchedLines, setValue, getValues])

  const addLineItem = () => {
    const currentLines = getValues("lines")
    setValue("lines", [...currentLines, {
      itemId: "",
      orderedQuantity: 1,
      unitCost: 0,
      taxAmount: 0,
      discount: 0,
    }])
  }

  const removeLineItem = (index: number) => {
    const currentLines = getValues("lines")
    if (currentLines.length > 1) {
      setValue("lines", currentLines.filter((_, i) => i !== index))
    }
  }

  const onSubmit = (data: PurchaseOrderFormData) => {
    const updateData = {
      id: purchaseOrder.id,
      organizationId,
      supplierId: data.supplierId,
      locationId: data.locationId,
      date: typeof purchaseOrder.orderDate === "string"
        ? purchaseOrder.orderDate
        : (purchaseOrder.orderDate instanceof Date
          ? purchaseOrder.orderDate.toISOString()
          : new Date().toISOString()),
      expectedDeliveryDate: data.expectedDeliveryDate?.toISOString() || "",
      paymentTerms: data.paymentTerms,
      notes: data.notes,
      shippingCost: data.shippingCost,
      orderLines: data.lines.map(line => ({
        itemId: line.itemId,
        quantity: line.orderedQuantity,
        unitPrice: line.unitCost,
        discount: line.discount,
        taxRate: line.taxAmount / (line.orderedQuantity * line.unitCost) || 0,
        notes: line.itemName
      }))
    }

    updatePurchaseOrder(updateData, {
      onSuccess: () => {
        notify.success("Purchase order updated successfully!")
        router.push(localizedHref(`/dashboard/purchase-orders/${purchaseOrder.id}`))
      },
      onError: (error: any) => {
        if (error?.message?.includes("NEXT_REDIRECT")) {
          notify.success("Purchase order updated successfully!")
          router.push(localizedHref(`/dashboard/purchase-orders/${purchaseOrder.id}`))
        } else {
          notify.error(error?.message || "Failed to update purchase order")
        }
      }
    })
  }

  const nextStep = () => {
    if (currentStep < steps.length - 1) {
      setCurrentStep(currentStep + 1)
    }
  }

  const prevStep = () => {
    if (currentStep > 0) {
      setCurrentStep(currentStep - 1)
    }
  }

  const selectedSupplier = suppliers.find(s => s.id === watch("supplierId"))
  const selectedLocation = locations.find(l => l.id === watch("locationId"))

  return (
    <div className="dashboard-landing-theme dark min-h-screen overflow-x-hidden">
      <div className="dashboard-landing-content mx-auto w-full max-w-[72rem] px-4 py-6 text-[var(--dash-text)] sm:px-6 sm:py-8">
        <div className="dashboard-glass-panel mb-8 flex items-center justify-between rounded-lg p-6">
          <div className="flex items-center gap-4">
            <div className="rounded-lg border border-[var(--dash-border-subtle)] bg-[var(--dash-brand-soft)] p-3 text-[var(--dash-brand-strong)] shadow-[0_16px_34px_rgba(47,125,246,0.18)]">
              <Save className="h-8 w-8" />
            </div>
            <div>
              <h1 className="flex items-center gap-3 text-2xl font-semibold tracking-normal text-[var(--dash-text)]">
                Edit Purchase Order
              </h1>
              <p className="mt-1 text-sm text-[var(--dash-text-soft)]">
                Modify your purchase order with modern efficiency
              </p>
              <div className="flex items-center gap-4 mt-3">
                <Badge variant="outline" className="dashboard-filter-chip flex items-center gap-2 rounded-lg px-3 py-1">
                  <CheckCircle className="h-4 w-4 text-[var(--dash-info)]" />
                  {purchaseOrder.orderNumber}
                </Badge>
                <Badge variant={purchaseOrder.status === 'DRAFT' ? 'secondary' : 'default'} className="dashboard-filter-chip rounded-lg px-3 py-1 font-medium">
                  {purchaseOrder.status}
                </Badge>
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
              Back
            </Button>
          </div>
        </div>

        {/* Progress Steps */}
        <div className="mb-8">
          <div className="flex items-center justify-between">
            {steps.map((step, index) => (
              <div key={index} className="flex items-center">
                <div className={cn(
                  "flex h-10 w-10 items-center justify-center rounded-md border text-sm font-medium transition-colors",
                  index === currentStep
                    ? "border-[var(--dash-brand)] bg-[var(--dash-brand)] text-white"
                    : index < currentStep
                      ? "border-[var(--dash-success)] bg-[var(--dash-success)] text-white"
                      : "border-[var(--dash-border-subtle)] bg-[rgba(37,57,67,0.74)] text-[var(--dash-text-soft)]"
                )}>
                  {index < currentStep ? (
                    <CheckCircle className="h-5 w-5" />
                  ) : (
                    index + 1
                  )}
                </div>
                {index < steps.length - 1 && (
                  <div className={cn(
                    "ml-4 h-1 w-20 rounded-md",
                    index < currentStep ? "bg-[var(--dash-success)]" : "bg-[var(--dash-border-subtle)]"
                  )} />
                )}
              </div>
            ))}
          </div>
          <div className="mt-4">
            <h3 className="font-semibold text-[var(--dash-text)]">{steps[currentStep].title}</h3>
            <p className="text-sm text-[var(--dash-text-soft)]">{steps[currentStep].description}</p>
          </div>
        </div>

        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
            <Card className="dashboard-glass-panel rounded-lg text-[var(--dash-text)]">
              <CardContent className="p-8">
                {/* Step 1: Order Details */}
                {currentStep === 0 && (
                  <div className="space-y-6">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                      <FormField
                        control={form.control}
                        name="orderNumber"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel className="font-medium text-[var(--dash-text-muted)]">Order Number</FormLabel>
                            <FormControl>
                              <Input
                                {...field}
                                className="dashboard-control rounded-lg"
                                placeholder="PO-001"
                                disabled={purchaseOrder.status !== 'DRAFT'}
                              />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                      <FormField
                        control={form.control}
                        name="reference"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel className="font-medium text-[var(--dash-text-muted)]">Reference</FormLabel>
                            <FormControl>
                              <Input
                                {...field}
                                className="dashboard-control rounded-lg"
                                placeholder="External reference"
                              />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                    </div>
                    <FormField
                      control={form.control}
                      name="expectedDeliveryDate"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel className="font-medium text-[var(--dash-text-muted)]">Expected Delivery Date</FormLabel>
                          <Popover>
                            <PopoverTrigger asChild>
                              <FormControl>
                                <Button
                                  variant="outline"
                                  className={cn(
                                    "dashboard-button-secondary w-full rounded-lg pl-3 text-left font-normal",
                                    !field.value && "text-muted-foreground"
                                  )}
                                >
                                  {field.value ? (
                                    format(field.value, "PPP")
                                  ) : (
                                    <span>Pick a date</span>
                                  )}
                                  <CalendarIcon className="ml-auto h-4 w-4 opacity-50" />
                                </Button>
                              </FormControl>
                            </PopoverTrigger>
                            <PopoverContent className="w-auto p-0" align="start">
                              <Calendar
                                mode="single"
                                selected={field.value}
                                onSelect={field.onChange}
                                disabled={(date) =>
                                  date < new Date() || date < new Date("1900-01-01")
                                }
                                initialFocus
                              />
                            </PopoverContent>
                          </Popover>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </div>
                )}

                {/* Step 2: Supplier & Location */}
                {currentStep === 1 && (
                  <div className="space-y-6">
                    <FormField
                      control={form.control}
                      name="supplierId"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel className="font-medium text-[var(--dash-text-muted)]">Supplier</FormLabel>
                          <Select onValueChange={field.onChange} value={field.value}>
                            <FormControl>
                              <SelectTrigger className="dashboard-control rounded-lg">
                                <SelectValue placeholder="Select a supplier" />
                              </SelectTrigger>
                            </FormControl>
                            <SelectContent>
                              {suppliers.map((supplier) => (
                                <SelectItem key={supplier.id} value={supplier.id}>
                                  <div className="flex flex-col">
                                    <span className="font-medium">{supplier.name}</span>
                                    {supplier.email && (
                                      <span className="text-sm text-slate-500">{supplier.email}</span>
                                    )}
                                  </div>
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    <FormField
                      control={form.control}
                      name="locationId"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel className="font-medium text-[var(--dash-text-muted)]">Delivery Location</FormLabel>
                          <Select onValueChange={field.onChange} value={field.value}>
                            <FormControl>
                              <SelectTrigger className="dashboard-control rounded-lg">
                                <SelectValue placeholder="Select a location" />
                              </SelectTrigger>
                            </FormControl>
                            <SelectContent>
                              {locations.map((location) => (
                                <SelectItem key={location.id} value={location.id}>
                                  {location.name}
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    {(selectedSupplier || selectedLocation) && (
                      <div className="mt-6 rounded-lg border border-[var(--dash-border-subtle)] bg-[rgba(24,38,45,0.58)] p-4">
                        <h4 className="mb-2 font-medium text-[var(--dash-text)]">Selection Summary</h4>
                        {selectedSupplier && (
                          <p className="text-sm text-[var(--dash-text-soft)]">
                            <span className="font-medium">Supplier:</span> {selectedSupplier.name}
                          </p>
                        )}
                        {selectedLocation && (
                          <p className="text-sm text-[var(--dash-text-soft)]">
                            <span className="font-medium">Location:</span> {selectedLocation.name}
                          </p>
                        )}
                      </div>
                    )}
                  </div>
                )}

                {/* Step 3: Line Items */}
                {currentStep === 2 && (
                  <div className="space-y-6">
                    <div className="flex items-center justify-between">
                      <h3 className="text-lg font-semibold text-[var(--dash-text)]">Line Items</h3>
                      <Button
                        type="button"
                        onClick={addLineItem}
                        variant="outline"
                        size="sm"
                        className="dashboard-button-secondary rounded-lg"
                      >
                        <Plus className="h-4 w-4 mr-2" />
                        Add Item
                      </Button>
                    </div>

                    <div className="space-y-4">
                      {watchedLines.map((line, index) => (
                        <Card key={index} className="rounded-lg border border-[var(--dash-border-subtle)] bg-[rgba(24,38,45,0.5)]">
                          <CardContent className="p-4">
                            <div className="grid grid-cols-1 md:grid-cols-6 gap-4">
                              <div className="md:col-span-2">
                                <FormField
                                  control={form.control}
                                  name={`lines.${index}.itemId`}
                                  render={({ field }) => (
                                    <FormItem>
                                      <FormLabel className="text-sm text-[var(--dash-text-muted)]">Item</FormLabel>
                                      <Select
                                        onValueChange={(value) => {
                                          field.onChange(value)
                                          const selectedItem = items.find(item => item.id === value)
                                          if (selectedItem) {
                                            setValue(`lines.${index}.itemName`, selectedItem.name)
                                            if (selectedItem.sellingPrice) {
                                              setValue(`lines.${index}.unitCost`, selectedItem.sellingPrice)
                                            }
                                          }
                                        }}
                                        value={field.value}
                                      >
                                        <FormControl>
                                          <SelectTrigger className="dashboard-control rounded-lg text-sm">
                                            <SelectValue placeholder="Select item" />
                                          </SelectTrigger>
                                        </FormControl>
                                        <SelectContent>
                                          {items.map((item) => (
                                            <SelectItem key={item.id} value={item.id}>
                                              <div className="flex flex-col">
                                                <span className="font-medium">{item.name}</span>
                                                <span className="text-xs text-slate-500">{item.sku}</span>
                                              </div>
                                            </SelectItem>
                                          ))}
                                        </SelectContent>
                                      </Select>
                                      <FormMessage />
                                    </FormItem>
                                  )}
                                />
                              </div>
                              <FormField
                                control={form.control}
                                name={`lines.${index}.orderedQuantity`}
                                render={({ field }) => (
                                  <FormItem>
                                    <FormLabel className="text-sm text-[var(--dash-text-muted)]">Quantity</FormLabel>
                                    <FormControl>
                                      <Input
                                        type="number"
                                        step="0.01"
                                        {...field}
                                        onChange={(e) => field.onChange(parseFloat(e.target.value) || 0)}
                                        className="dashboard-control rounded-lg text-sm"
                                      />
                                    </FormControl>
                                    <FormMessage />
                                  </FormItem>
                                )}
                              />
                              <FormField
                                control={form.control}
                                name={`lines.${index}.unitCost`}
                                render={({ field }) => (
                                  <FormItem>
                                    <FormLabel className="text-sm text-[var(--dash-text-muted)]">Unit Cost</FormLabel>
                                    <FormControl>
                                      <Input
                                        type="number"
                                        step="0.01"
                                        {...field}
                                        onChange={(e) => field.onChange(parseFloat(e.target.value) || 0)}
                                        className="dashboard-control rounded-lg text-sm"
                                      />
                                    </FormControl>
                                    <FormMessage />
                                  </FormItem>
                                )}
                              />
                              <FormField
                                control={form.control}
                                name={`lines.${index}.taxAmount`}
                                render={({ field }) => (
                                  <FormItem>
                                    <FormLabel className="text-sm text-[var(--dash-text-muted)]">Tax</FormLabel>
                                    <FormControl>
                                      <Input
                                        type="number"
                                        step="0.01"
                                        {...field}
                                        onChange={(e) => field.onChange(parseFloat(e.target.value) || 0)}
                                        className="dashboard-control rounded-lg text-sm"
                                      />
                                    </FormControl>
                                    <FormMessage />
                                  </FormItem>
                                )}
                              />
                              <div className="flex items-end gap-2">
                                <div className="flex-1">
                                  <FormLabel className="text-sm text-[var(--dash-text-muted)]">Line Total</FormLabel>
                                  <div className="mt-2 text-sm font-medium text-[var(--dash-text)]">
                                    ${((line.orderedQuantity * line.unitCost) - (line.discount || 0) + line.taxAmount).toFixed(2)}
                                  </div>
                                </div>
                                {watchedLines.length > 1 && (
                                  <Button
                                    type="button"
                                    onClick={() => removeLineItem(index)}
                                    variant="ghost"
                                    size="sm"
                                    className="rounded-md text-rose-600 hover:bg-rose-50 dark:text-rose-400 dark:hover:bg-rose-950/40"
                                  >
                                    <Trash2 className="h-4 w-4" />
                                  </Button>
                                )}
                              </div>
                            </div>
                          </CardContent>
                        </Card>
                      ))}
                    </div>

                    {/* Summary */}
                    <Card className="rounded-lg border border-[var(--dash-border-subtle)] bg-[rgba(24,38,45,0.58)]">
                      <CardContent className="p-4">
                        <div className="grid grid-cols-3 gap-4 text-sm">
                          <div>
                            <div className="text-[var(--dash-text-soft)]">Subtotal</div>
                            <div className="font-semibold text-[var(--dash-text)]">${subtotal.toFixed(2)}</div>
                          </div>
                          <div>
                            <div className="text-[var(--dash-text-soft)]">Tax Total</div>
                            <div className="font-semibold text-[var(--dash-text)]">${taxTotal.toFixed(2)}</div>
                          </div>
                          <div>
                            <div className="text-[var(--dash-text-soft)]">Total</div>
                            <div className="text-lg font-semibold text-[var(--dash-info)]">${total.toFixed(2)}</div>
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  </div>
                )}

                {/* Step 4: Additional Info */}
                {currentStep === 3 && (
                  <div className="space-y-6">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                      <FormField
                        control={form.control}
                        name="shippingMethod"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel className="font-medium text-[var(--dash-text-muted)]">Shipping Method</FormLabel>
                            <FormControl>
                              <Input
                                {...field}
                                className="dashboard-control rounded-lg"
                                placeholder="e.g., Standard, Express"
                              />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                      <FormField
                        control={form.control}
                        name="shippingCost"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel className="font-medium text-[var(--dash-text-muted)]">Shipping Cost</FormLabel>
                            <FormControl>
                              <Input
                                type="number"
                                step="0.01"
                                {...field}
                                onChange={(e) => field.onChange(parseFloat(e.target.value) || 0)}
                                className="dashboard-control rounded-lg"
                              />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                    </div>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                      <FormField
                        control={form.control}
                        name="paymentTerms"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel className="font-medium text-[var(--dash-text-muted)]">Payment Terms</FormLabel>
                            <FormControl>
                              <Input
                                {...field}
                                className="dashboard-control rounded-lg"
                                placeholder="e.g., Net 30"
                              />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                      <FormField
                        control={form.control}
                        name="discount"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel className="font-medium text-[var(--dash-text-muted)]">Order Discount</FormLabel>
                            <FormControl>
                              <Input
                                type="number"
                                step="0.01"
                                {...field}
                                onChange={(e) => field.onChange(parseFloat(e.target.value) || 0)}
                                className="dashboard-control rounded-lg"
                              />
                            </FormControl>
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
                          <FormLabel className="font-medium text-[var(--dash-text-muted)]">Notes</FormLabel>
                          <FormControl>
                            <Textarea
                              {...field}
                              className="dashboard-control rounded-lg"
                              placeholder="Public notes visible to supplier"
                              rows={3}
                            />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    <FormField
                      control={form.control}
                      name="internalNotes"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel className="font-medium text-[var(--dash-text-muted)]">Internal Notes</FormLabel>
                          <FormControl>
                            <Textarea
                              {...field}
                              className="dashboard-control rounded-lg"
                              placeholder="Internal notes (not visible to supplier)"
                              rows={3}
                            />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    {/* Final Summary */}
                    <Card className="rounded-lg border border-[var(--dash-border-subtle)] bg-[rgba(24,38,45,0.58)]">
                      <CardHeader>
                        <CardTitle className="text-[var(--dash-text)]">Order Summary</CardTitle>
                      </CardHeader>
                      <CardContent>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
                          <div>
                            <div className="space-y-2">
                              <div className="flex justify-between">
                                <span className="text-[var(--dash-text-soft)]">Subtotal:</span>
                                <span className="font-medium">${subtotal.toFixed(2)}</span>
                              </div>
                              <div className="flex justify-between">
                                <span className="text-[var(--dash-text-soft)]">Tax:</span>
                                <span className="font-medium">${taxTotal.toFixed(2)}</span>
                              </div>
                              <div className="flex justify-between">
                                <span className="text-[var(--dash-text-soft)]">Shipping:</span>
                                <span className="font-medium">${(watchedShippingCost || 0).toFixed(2)}</span>
                              </div>
                              <div className="flex justify-between">
                                <span className="text-[var(--dash-text-soft)]">Discount:</span>
                                <span className="font-medium">-${(watchedDiscount || 0).toFixed(2)}</span>
                              </div>
                              <div className="flex justify-between border-t pt-2">
                                <span className="font-semibold text-[var(--dash-text)]">Total:</span>
                                <span className="text-lg font-bold text-[var(--dash-success)]">${total.toFixed(2)}</span>
                              </div>
                            </div>
                          </div>
                          <div>
                            <div className="space-y-1 text-xs text-[var(--dash-text-soft)]">
                              <div><span className="font-medium">Items:</span> {watchedLines.length}</div>
                              <div><span className="font-medium">Supplier:</span> {selectedSupplier?.name}</div>
                              <div><span className="font-medium">Location:</span> {selectedLocation?.name}</div>
                            </div>
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  </div>
                )}

                {/* Navigation Buttons */}
                <div className="flex justify-between border-t border-[var(--dash-border-subtle)] pt-6">
                  <Button
                    type="button"
                    variant="outline"
                    onClick={prevStep}
                    disabled={currentStep === 0}
                    className="dashboard-button-secondary min-w-24 rounded-lg"
                  >
                    Previous
                  </Button>

                  <div className="flex gap-3">
                    {currentStep < steps.length - 1 ? (
                      <Button
                        type="button"
                        onClick={nextStep}
                        className="dashboard-button-primary min-w-24 rounded-lg"
                      >
                        Next
                      </Button>
                    ) : (
                      <Button
                        type="submit"
                        disabled={isPending}
                        className="dashboard-button-primary min-w-32 rounded-lg"
                      >
                        {isPending ? (
                          <div className="flex items-center gap-2">
                            <div className="h-4 w-4 animate-spin rounded-full border-2 border-white border-t-transparent"></div>
                            Updating...
                          </div>
                        ) : (
                          <div className="flex items-center gap-2">
                            <Save className="h-4 w-4" />
                            Update Purchase Order
                          </div>
                        )}
                      </Button>
                    )}
                  </div>
                </div>
              </CardContent>
            </Card>
          </form>
        </Form>
      </div>
    </div>
  )
}
