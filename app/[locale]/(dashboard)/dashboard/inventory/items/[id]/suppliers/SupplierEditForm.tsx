"use client"

import { notify } from "@/lib/notifications/notify"
// import { updateItemSupplier } from "@/actions/itemSupplier/updateItemSupplier"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Calendar } from "@/components/ui/calendar"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Form, FormControl, FormDescription, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form"
import { Input } from "@/components/ui/input"
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover"
import { Separator } from "@/components/ui/separator"
import { Switch } from "@/components/ui/switch"
import { Textarea } from "@/components/ui/textarea"
import { useUpdateItemSupplier } from "@/hooks/useAllItemSuppliers"
import { cn } from "@/lib/utils"
import type { ItemSupplierDTO, UpdateItemSupplierDTO } from "@/types/itemSuppliers"
import { zodResolver } from "@hookform/resolvers/zod"
import { format } from "date-fns"
import {
  AlertCircle,
  CalendarIcon,
  CheckCircle,
  Clock,
  DollarSign,
  FileText,
  Hash,
  Loader2,
  Package,
  Save,
  Star,
} from "lucide-react"
import { useCallback, useEffect, useState, useTransition } from "react"
import { useForm } from "react-hook-form"
import * as z from "zod"

interface SupplierEditFormProps {
  itemId: string
  selectedSupplier: ItemSupplierDTO | null
  onUpdate: (updatedSupplier: UpdateItemSupplierDTO) => void
}

// Generate simple SKU function
const generateSimpleSKU = (length: number, prefix: string) => {
  const chars = "ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789"
  let result = prefix + "-"
  for (let i = 0; i < length; i++) {
    result += chars.charAt(Math.floor(Math.random() * chars.length))
  }
  return result
}

// Form validation schema - matches your DTO exactly
const ItemSupplierFormSchema = z.object({
  isPreferred: z.boolean().default(false),
  supplierSku: z.string().nullable().optional(),
  leadTime: z
    .string()
    .optional()
    .refine((val) => {
      if (!val || val === "") return true
      const num = Number(val)
      return !isNaN(num) && num >= 0 && Number.isInteger(num)
    }, "Lead time must be a positive integer"),
  minOrderQty: z
    .string()
    .optional()
    .refine((val) => {
      if (!val || val === "") return true
      const num = Number(val)
      return !isNaN(num) && num >= 0 && Number.isInteger(num)
    }, "Minimum order quantity must be a positive integer"),
  unitCost: z
    .string()
    .optional()
    .refine((val) => {
      if (!val || val === "") return true
      const num = Number(val)
      return !isNaN(num) && num >= 0
    }, "Unit cost must be a positive number"),
  lastPurchaseDate: z.date().optional(),
  notes: z.string().nullable().optional(),
})

type ItemSupplierFormValues = z.infer<typeof ItemSupplierFormSchema>

const EditSupplierForm = ({ itemId, selectedSupplier, onUpdate }: SupplierEditFormProps) => {
  const [isPending, startTransition] = useTransition()
  const [saveSuccess, setSaveSuccess] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const updateItemSupplierMutation = useUpdateItemSupplier()

  const form = useForm<ItemSupplierFormValues>({
    resolver: zodResolver(ItemSupplierFormSchema),
    defaultValues: {
      isPreferred: false,
      supplierSku: "",
      leadTime: "",
      minOrderQty: "",
      unitCost: "",
      lastPurchaseDate: undefined,
      notes: "",
    },
  })

  // Reset form when supplier changes
  useEffect(() => {
    if (selectedSupplier) {
      form.reset({
        isPreferred: selectedSupplier.isPreferred ?? false,
        supplierSku: selectedSupplier.supplierSku || "",
        leadTime: selectedSupplier.leadTime?.toString() || "",
        minOrderQty: selectedSupplier.minOrderQty?.toString() || "",
        unitCost: selectedSupplier.unitCost?.toString() || "",
        lastPurchaseDate: selectedSupplier.lastPurchaseDate,
        notes: selectedSupplier.notes || "",
      })
    }
  }, [selectedSupplier, form])

  // Clear success message after 3 seconds
  useEffect(() => {
    if (saveSuccess) {
      const timer = setTimeout(() => setSaveSuccess(false), 3000)
      return () => clearTimeout(timer)
    }
  }, [saveSuccess])

  // Clear error after 5 seconds
  useEffect(() => {
    if (error) {
      const timer = setTimeout(() => setError(null), 5000)
      return () => clearTimeout(timer)
    }
  }, [error])

  // Form submission

  const onSubmit = useCallback(
    async (values: ItemSupplierFormValues) => {
      if (!selectedSupplier) {
        notify.error("No supplier selected")
        return
      }

      try {
        // Transform form values to match UpdateItemSupplierDTO
        const updateData: UpdateItemSupplierDTO = {
          id: selectedSupplier.id,
          itemId: selectedSupplier.itemId,
          supplierId: selectedSupplier.supplierId,
          isPreferred: values.isPreferred,
          supplierSku: values.supplierSku || null,
          leadTime: values.leadTime ? Number.parseInt(values.leadTime) : undefined,
          minOrderQty: values.minOrderQty ? Number.parseInt(values.minOrderQty) : undefined,
          unitCost: values.unitCost ? Number.parseFloat(values.unitCost) : undefined,
          lastPurchaseDate: values.lastPurchaseDate,
          notes: values.notes || null,
          updatedAt: new Date(),
          createdAt: new Date(selectedSupplier.createdAt),
        }

        await updateItemSupplierMutation.mutateAsync({ data: updateData })

        notify.success("Item Supplier updated successfully", {
          description: `Supplier information has been updated`,
        })

        // await refetch()/
      } catch (error) {
        console.error("Submit error:", error)
        notify.error("Failed to update supplier", {
          description: error instanceof Error ? error.message : "Unknown error occurred",
        })
      }
    },
    [selectedSupplier, updateItemSupplierMutation],
  )

  const handleGenerateSKU = () => {
    const newSKU = generateSimpleSKU(12, "SUP")
    form.setValue("supplierSku", newSKU, { shouldDirty: true })
  }

  const handleReset = () => {
    if (selectedSupplier) {
      form.reset({
        isPreferred: selectedSupplier.isPreferred ?? false,
        supplierSku: selectedSupplier.supplierSku || "",
        leadTime: selectedSupplier.leadTime?.toString() || "",
        minOrderQty: selectedSupplier.minOrderQty?.toString() || "",
        unitCost: selectedSupplier.unitCost?.toString() || "",
        lastPurchaseDate: selectedSupplier.lastPurchaseDate,
        notes: selectedSupplier.notes || "",
      })
    }
  }

  if (!selectedSupplier) {
    return (
      <div className="flex flex-col items-center justify-center h-full p-8 text-center">
        <div className="rounded-full bg-muted p-6 mb-4">
          <Star className="h-12 w-12 text-muted-foreground" />
        </div>
        <h3 className="text-lg font-semibold mb-2">No Supplier Selected</h3>
        <p className="text-muted-foreground max-w-sm">
          Select a supplier from the list to view and edit their details for this item.
        </p>
      </div>
    )
  }

  return (
    <div className="flex flex-col h-full">
      {/* Header */}
      <div className="p-6 border-b bg-gradient-to-r from-background to-muted/20">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-xl font-semibold mb-1">Edit Supplier Details</h2>
            <div className="flex items-center gap-2">
              <p className="text-2xl font-bold text-primary">{selectedSupplier.supplier?.name || "Unknown Supplier"}</p>
              {selectedSupplier.isPreferred && (
                <Badge variant="secondary" className="gap-1">
                  <Star className="h-3 w-3 fill-current" />
                  Preferred
                </Badge>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Form Content */}
      <div className="flex-1 overflow-auto p-6">
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
            {/* Success Alert */}
            {saveSuccess && (
              <Alert className="border-green-200 bg-green-50">
                <CheckCircle className="h-4 w-4 text-green-600" />
                <AlertDescription className="text-green-800">Supplier details updated successfully!</AlertDescription>
              </Alert>
            )}

            {/* Error Alert */}
            {error && (
              <Alert variant="destructive">
                <AlertCircle className="h-4 w-4" />
                <AlertDescription>{error}</AlertDescription>
              </Alert>
            )}

            {/* Supplier Preferences */}
            <Card>
              <CardHeader className="pb-4">
                <CardTitle className="flex items-center gap-2 text-base">
                  <Star className="h-4 w-4" />
                  Supplier Preferences
                </CardTitle>
                <CardDescription>Configure your preferences for this supplier relationship</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <FormField
                  control={form.control}
                  name="isPreferred"
                  render={({ field }) => (
                    <FormItem className="flex flex-row items-center justify-between rounded-lg border p-4">
                      <div className="space-y-0.5">
                        <FormLabel className="text-base font-medium">Preferred Supplier</FormLabel>
                        <FormDescription>Mark this supplier as preferred for this item</FormDescription>
                      </div>
                      <FormControl>
                        <Switch checked={field.value} onCheckedChange={field.onChange} />
                      </FormControl>
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="supplierSku"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Supplier SKU</FormLabel>
                      <FormControl>
                        <div className="flex gap-2">
                          <Input placeholder="Enter supplier's SKU for this item" {...field} value={field.value ?? ""} />
                          <Button type="button" variant="outline" onClick={handleGenerateSKU} disabled={isPending}>
                            <Hash className="h-4 w-4" />
                          </Button>
                        </div>
                      </FormControl>
                      <FormDescription>The SKU or part number used by this supplier</FormDescription>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </CardContent>
            </Card>

            {/* Order Details */}
            <Card>
              <CardHeader className="pb-4">
                <CardTitle className="flex items-center gap-2 text-base">
                  <Package className="h-4 w-4" />
                  Order Details
                </CardTitle>
                <CardDescription>Configure ordering parameters and pricing information</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <FormField
                    control={form.control}
                    name="leadTime"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel className="flex items-center gap-2">
                          <Clock className="h-4 w-4" />
                          Lead Time (days)
                        </FormLabel>
                        <FormControl>
                          <Input type="number" min="0" step="1" placeholder="0" {...field} />
                        </FormControl>
                        <FormDescription>Expected delivery time in days</FormDescription>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="minOrderQty"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel className="flex items-center gap-2">
                          <Package className="h-4 w-4" />
                          Min Order Quantity
                        </FormLabel>
                        <FormControl>
                          <Input type="number" min="0" step="1" placeholder="0" {...field} />
                        </FormControl>
                        <FormDescription>Minimum quantity per order</FormDescription>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>

                <FormField
                  control={form.control}
                  name="unitCost"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel className="flex items-center gap-2">
                        <DollarSign className="h-4 w-4" />
                        Unit Cost
                      </FormLabel>
                      <FormControl>
                        <div className="relative">
                          <DollarSign className="absolute start-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                          <Input type="number" step="0.01" min="0" placeholder="0.00" className="ps-10" {...field} />
                        </div>
                      </FormControl>
                      <FormDescription>Cost per unit in your base currency</FormDescription>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="lastPurchaseDate"
                  render={({ field }) => (
                    <FormItem className="flex flex-col">
                      <FormLabel>Last Purchase Date</FormLabel>
                      <Popover>
                        <PopoverTrigger asChild>
                          <FormControl>
                            <Button
                              variant="outline"
                              className={cn(
                                "w-full ps-3 text-start font-normal",
                                field.value ? "text-muted-foreground" : "",
                              )}
                            >
                              {field.value ? format(field.value, "PPP") : <span>Pick a date</span>}
                              <CalendarIcon className="ms-auto h-4 w-4 opacity-50" />
                            </Button>
                          </FormControl>
                        </PopoverTrigger>
                        <PopoverContent className="w-auto p-0" align="start">
                          <Calendar
                            mode="single"
                            selected={field.value}
                            onSelect={field.onChange}
                            disabled={(date) => date > new Date() || date < new Date("1900-01-01")}
                            initialFocus
                          />
                        </PopoverContent>
                      </Popover>
                      <FormDescription>When did you last purchase from this supplier?</FormDescription>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </CardContent>
            </Card>

            {/* Additional Notes */}
            <Card>
              <CardHeader className="pb-4">
                <CardTitle className="flex items-center gap-2 text-base">
                  <FileText className="h-4 w-4" />
                  Additional Notes
                </CardTitle>
                <CardDescription>Add any additional information about this supplier relationship</CardDescription>
              </CardHeader>
              <CardContent>
                <FormField
                  control={form.control}
                  name="notes"
                  render={({ field }) => (
                    <FormItem>
                      <FormControl>
                        <Textarea
                          placeholder="Add any additional notes about this supplier, special terms, contact preferences, etc..."
                          className="min-h-[100px] resize-none"
                          {...field}
                          value={field.value ?? ""}
                        />
                      </FormControl>
                      <FormDescription>These notes are private and only visible to your team</FormDescription>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </CardContent>
            </Card>

            <Separator />

            {/* Action Buttons */}
            <div className="flex justify-between pt-4">
              <Button
                type="button"
                variant="outline"
                onClick={handleReset}
                disabled={isPending || !form.formState.isDirty}
              >
                Reset Changes
              </Button>

              <div className="flex gap-2">
                <Button type="submit" disabled={isPending || !form.formState.isDirty} className="min-w-[140px]">
                  {isPending ? (
                    <>
                      <Loader2 className="h-4 w-4 me-2 animate-spin" />
                      Saving...
                    </>
                  ) : (
                    <>
                      <Save className="h-4 w-4 me-2" />
                      Save Changes
                    </>
                  )}
                </Button>
              </div>
            </div>
          </form>
        </Form>
      </div>
    </div>
  )
}

export default EditSupplierForm
