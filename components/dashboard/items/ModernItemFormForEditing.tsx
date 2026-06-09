"use client"

import ImageUploadButton from "@/components/FormInputs/ImageUploadButton"
import { useNotifications } from "@/components/notifications/NotificationProvider"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"

import {
  useUpdateItemBasicInfo,
  useUpdateItemDetails,
  useUpdateItemPricing,
  useUpdateItemRelations,
  useUpdateItemStock,
} from "@/hooks/useAllItemQueries"

import { generateSimpleSKU } from "@/lib/generateSKU"
import { type BrandDTO } from "@/types/brand"
import { type CategoryDTO } from "@/types/category"
import { ItemWithInventoryLevelsPayload } from "@/types/itemTypes"
import { type TaxRateDTO } from "@/types/taxRates"
import { type UnitDTO } from "@/types/unit"

import { zodResolver } from "@hookform/resolvers/zod"
import {
  DollarSign,
  Eye,
  Hash,
  Loader2,
  Package,
  Save,
  Settings,
  Sparkles,
  Tags,
  TrendingUp,
  Warehouse,
  Zap
} from 'lucide-react'
import { useEffect, useMemo, useState } from "react"
import { useForm } from "react-hook-form"
import { z } from "zod"


// -------- Enhanced Schemas for Modern UI --------
const basicInfoSchema = z.object({
  nameEn: z.string().min(1, "English name is required").max(100, "Name must be less than 100 characters"),
  nameFr: z.string().optional(),
  descriptionEn: z.string().optional(),
  descriptionFr: z.string().optional(),
  imageUrls: z.string().optional(),
  organizationId: z.string(),
  id: z.string(),
  thumbnail: z.string().optional(),
})

const stockSchema = z.object({
  minStockLevel: z.coerce.number().min(0, "Min stock level must be positive").default(0),
  maxStockLevel: z.coerce.number().min(0, "Max stock level must be >= 0").optional(),
  reorderLevel: z.coerce.number().min(0, "Reorder level must be >= 0").default(0),
  reorderQuantity: z.coerce.number().min(0, "Reorder quantity must be >= 0").optional(),
  organizationId: z.string(),
  id: z.string(),
  trackInventory: z.boolean().default(true),
})

const itemDetailsSchema = z.object({
  sku: z.string().min(1, "SKU is required").max(50, "SKU must be less than 50 characters"),
  barcode: z.string().optional(),
  dimensions: z.string().optional(),
  organizationId: z.string(),
  id: z.string(),
  weight: z.coerce.number().min(0, "Weight must be >= 0").optional(),
})

const pricingSchema = z.object({
  costPrice: z.coerce.number().min(0, "Cost price must be >= 0"),
  sellingPrice: z.coerce.number().min(0, "Selling price must be >= 0"),
  organizationId: z.string(),
  id: z.string(),
}).refine((data) => data.sellingPrice >= data.costPrice, {
  message: "Selling price should be greater than or equal to cost price",
  path: ["sellingPrice"],
})

const relationsSchema = z.object({
  categoryId: z.string(),
  brandId: z.string(),
  unitId: z.string(),
  taxRateId: z.string(),
  organizationId: z.string(),
  id: z.string(),
})

const trackingSchema = z.object({
  isActive: z.boolean().default(true),
  trackSerialNumbers: z.boolean().default(false),
  trackBatches: z.boolean().default(false),
  trackExpiry: z.boolean().default(false),
  organizationId: z.string(),
  id: z.string(),
  slug: z.string().optional(),
})

// -------- Types --------
type BasicInfoFormValues = z.infer<typeof basicInfoSchema>
type StockFormValues = z.infer<typeof stockSchema>
type ItemDetailsFormValues = z.infer<typeof itemDetailsSchema>
type PricingFormValues = z.infer<typeof pricingSchema>
type RelationsFormValues = z.infer<typeof relationsSchema>
type TrackingFormValues = z.infer<typeof trackingSchema>

interface ModernItemFormForEditingProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  itemData?: ItemWithInventoryLevelsPayload | null
  onSuccess?: () => void
  initialBrandData: BrandDTO[]
  initialUnitData: UnitDTO[]
  initialCategoryData: CategoryDTO[]
  initialTaxRateData: TaxRateDTO[]
}

const EDIT_TABS = [
  { id: 'overview', title: 'Overview', icon: Eye, description: 'Item summary and quick actions' },
  { id: 'basic', title: 'Basic Info', icon: Package, description: 'Name, description, and images' },
  { id: 'details', title: 'Details', icon: Hash, description: 'SKU, barcode, and specifications' },
  { id: 'pricing', title: 'Pricing', icon: DollarSign, description: 'Cost and selling prices' },
  { id: 'inventory', title: 'Inventory', icon: Warehouse, description: 'Stock levels and tracking' },
  { id: 'relations', title: 'Categorization', icon: Tags, description: 'Category, brand, and units' },
  { id: 'advanced', title: 'Advanced', icon: Settings, description: 'Tracking and settings' },
] as const

type EditTab = typeof EDIT_TABS[number]['id']

export default function ModernItemFormForEditing({
  open,
  onOpenChange,
  itemData,
  onSuccess,
  initialBrandData,
  initialUnitData,
  initialCategoryData,
  initialTaxRateData,
}: ModernItemFormForEditingProps) {
  const [activeTab, setActiveTab] = useState<EditTab>("overview")
  const [currentImageUrl, setCurrentImageUrl] = useState("")
  const [isSubmittingBasic, setIsSubmittingBasic] = useState(false)
  const [isSubmittingStock, setIsSubmittingStock] = useState(false)
  const [isSubmittingDetails, setIsSubmittingDetails] = useState(false)
  const [isSubmittingPricing, setIsSubmittingPricing] = useState(false)
  const [isSubmittingRelations, setIsSubmittingRelations] = useState(false)
  const [isSubmittingTracking, setIsSubmittingTracking] = useState(false)

  // Notifications
  const { success, error, warning, info, operationStart, operationComplete } = useNotifications()

  // Welcome notification for editing
  useEffect(() => {
    if (open && itemData) {
      info("Edit Mode", `Editing ${itemData.nameEn}. Use the tabs to update different sections of your product.`)
    }
  }, [open, itemData, info])

  // Mutations
  const updateItemMutation = useUpdateItemBasicInfo()
  const updateItemStockMutation = useUpdateItemStock()
  const updateItemPricingMutation = useUpdateItemPricing()
  const updateItemDetailsMutation = useUpdateItemDetails()
  const updateItemRelationsMutation = useUpdateItemRelations()

  // Option lists
  const brandOptions = useMemo(
    () => (initialBrandData || []).map((b) => ({ label: b.brandName, value: b.id })),
    [initialBrandData]
  )
  const taxRateOptions = useMemo(
    () => (initialTaxRateData || []).map((t) => ({ label: t.taxRateName, value: t.id })),
    [initialTaxRateData]
  )
  const unitOptions = useMemo(
    () => (initialUnitData || []).map((u) => ({ label: u.name, value: u.id })),
    [initialUnitData]
  )
  const categoryOptions = useMemo(
    () => (initialCategoryData || []).map((c) => ({ label: c.title, value: c.id })),
    [initialCategoryData]
  )

  // Helpers
  const getItemValue = (key: string, fallback: any = ""): any => {
    if (!itemData) return fallback
    const v = (itemData as any)?.[key]
    return v ?? fallback
  }

  // Forms with enhanced validation
  const basicInfoForm = useForm<BasicInfoFormValues>({
    resolver: zodResolver(basicInfoSchema),
    defaultValues: {
      nameEn: "",
      nameFr: "",
      descriptionEn: "",
      descriptionFr: "",
      imageUrls: "",
      thumbnail: "",
      organizationId: "",
      id: "",
    },
    mode: "onChange"
  })

  const stockForm = useForm<StockFormValues>({
    resolver: zodResolver(stockSchema),
    defaultValues: {
      trackInventory: true,
      minStockLevel: 0,
      maxStockLevel: 0,
      reorderLevel: 0,
      reorderQuantity: 0,
      organizationId: "",
      id: "",
    },
    mode: "onChange"
  })

  const itemDetailsForm = useForm<ItemDetailsFormValues>({
    resolver: zodResolver(itemDetailsSchema),
    defaultValues: {
      sku: "",
      barcode: "",
      dimensions: "",
      weight: 0,
      organizationId: "",
      id: "",
    },
    mode: "onChange"
  })

  const pricingForm = useForm<PricingFormValues>({
    resolver: zodResolver(pricingSchema),
    defaultValues: {
      costPrice: 0,
      sellingPrice: 0,
      organizationId: "",
      id: "",
    },
    mode: "onChange"
  })

  const relationsForm = useForm<RelationsFormValues>({
    resolver: zodResolver(relationsSchema),
    defaultValues: {
      categoryId: "",
      brandId: "",
      unitId: "",
      taxRateId: "",
      organizationId: "",
      id: "",
    },
    mode: "onChange"
  })

  const trackingForm = useForm<TrackingFormValues>({
    resolver: zodResolver(trackingSchema),
    defaultValues: {
      isActive: true,
      trackSerialNumbers: false,
      trackBatches: false,
      trackExpiry: false,
      slug: "",
      organizationId: "",
      id: "",
    },
    mode: "onChange"
  })

  // Populate forms when dialog opens or item changes
  useEffect(() => {
    if (!open || !itemData) return

    basicInfoForm.reset({
      nameEn: getItemValue("nameEn", ""),
      nameFr: getItemValue("nameFr", ""),
      descriptionEn: getItemValue("descriptionEn", ""),
      descriptionFr: getItemValue("descriptionFr", ""),
      imageUrls: String(getItemValue("imageUrls", "")),
      thumbnail: getItemValue("thumbnail", ""),
      organizationId: itemData.organizationId || "",
      id: itemData.id,
    })

    stockForm.reset({
      trackInventory: Boolean(getItemValue("trackInventory", true)),
      minStockLevel: Number(getItemValue("minStockLevel", 0)),
      maxStockLevel: Number(getItemValue("maxStockLevel", 0)),
      reorderLevel: Number(getItemValue("reorderLevel", 0)),
      reorderQuantity: Number(getItemValue("reorderQuantity", 0)),
      organizationId: itemData.organizationId || "",
      id: itemData.id,
    })

    itemDetailsForm.reset({
      sku: getItemValue("sku", ""),
      barcode: getItemValue("barcode", ""),
      dimensions: getItemValue("dimensions", ""),
      weight: Number(getItemValue("weight", 0)),
      organizationId: itemData.organizationId || "",
      id: itemData.id,
    })

    pricingForm.reset({
      costPrice: Number(getItemValue("costPrice", 0)),
      sellingPrice: Number(getItemValue("sellingPrice", 0)),
      organizationId: itemData.organizationId || "",
      id: itemData.id,
    })

    relationsForm.reset({
      categoryId: getItemValue("categoryId", ""),
      brandId: getItemValue("brandId", ""),
      unitId: getItemValue("unitId", ""),
      taxRateId: getItemValue("taxRateId", ""),
      organizationId: itemData.organizationId || "",
      id: itemData.id,
    })

    trackingForm.reset({
      isActive: Boolean(getItemValue("isActive", true)),
      trackSerialNumbers: Boolean(getItemValue("trackSerialNumbers", getItemValue("isSerialTracked" as any, false))),
      trackBatches: Boolean(getItemValue("trackBatches", false)),
      trackExpiry: Boolean(getItemValue("trackExpiry", false)),
      slug: getItemValue("slug", ""),
      organizationId: itemData.organizationId || "",
      id: itemData.id,
    })

    setCurrentImageUrl(String(getItemValue("imageUrls", "")))
  }, [open, itemData]) // eslint-disable-line react-hooks/exhaustive-deps

  // Watch form values for calculations
  const watchedPricing = pricingForm.watch()
  const profitMargin = watchedPricing.sellingPrice && watchedPricing.costPrice
    ? ((watchedPricing.sellingPrice - watchedPricing.costPrice) / watchedPricing.sellingPrice * 100).toFixed(1)
    : "0"

  const profitAmount = watchedPricing.sellingPrice && watchedPricing.costPrice
    ? watchedPricing.sellingPrice - watchedPricing.costPrice
    : 0

  // Submit Handlers with enhanced notifications
  const guardItem = () => {
    if (!itemData?.id) {
      error("Update Failed", "Item data is missing. Cannot update item.")
      return false
    }
    return true
  }

  const handleBasicInfoSubmit = async (data: BasicInfoFormValues) => {
    if (!guardItem()) return
    setIsSubmittingBasic(true)
    const operationId = operationStart("Updating Basic Information")

    try {
      await updateItemMutation.mutateAsync({ id: itemData!.id, data })
      operationComplete("Basic Information Updated", `"${data.nameEn}" details have been successfully updated`)
      onSuccess?.()
    } catch (err: any) {
      error("Update Failed", "Failed to update basic information", err?.message || "An unexpected error occurred")
    } finally {
      setIsSubmittingBasic(false)
    }
  }

  const handleItemDetailsSubmit = async (data: ItemDetailsFormValues) => {
    if (!guardItem()) return
    setIsSubmittingDetails(true)
    const operationId = operationStart("Updating Item Details")

    try {
      await updateItemDetailsMutation.mutateAsync({ id: itemData!.id, data })
      operationComplete("Item Details Updated", `SKU "${data.sku}" and specifications have been successfully updated`)
      onSuccess?.()
    } catch (err: any) {
      error("Update Failed", "Failed to update item details", err?.message || "An unexpected error occurred")
    } finally {
      setIsSubmittingDetails(false)
    }
  }

  const handleItemStockSubmit = async (data: StockFormValues) => {
    if (!guardItem()) return
    setIsSubmittingStock(true)
    const operationId = operationStart("Updating Inventory Settings")

    try {
      const updateData = {
        trackInventory: data.trackInventory,
        minStockLevel: data.minStockLevel ?? 0,
        organizationId: data.organizationId ?? "",
        id: data.id ?? "",
        maxStockLevel: data.maxStockLevel ?? 0,
        reorderLevel: data.reorderLevel ?? 0,
        reorderQuantity: data.reorderQuantity ?? 0,
      }
      await updateItemStockMutation.mutateAsync({ id: itemData!.id, data: updateData })
      operationComplete("Inventory Settings Updated", `Stock levels updated - Min: ${data.minStockLevel}, Reorder: ${data.reorderLevel}`)
      onSuccess?.()
    } catch (err: any) {
      error("Update Failed", "Failed to update inventory settings", err?.message || "An unexpected error occurred")
    } finally {
      setIsSubmittingStock(false)
    }
  }

  const handleItemPricingSubmit = async (data: PricingFormValues) => {
    if (!guardItem()) return
    setIsSubmittingPricing(true)
    const operationId = operationStart("Updating Pricing")

    try {
      const updateData = {
        costPrice: data.costPrice,
        sellingPrice: data.sellingPrice,
        organizationId: data.organizationId,
        id: data.id,
      }
      await updateItemPricingMutation.mutateAsync({ id: itemData!.id, data: updateData })
      const margin = data.sellingPrice > 0 ? ((data.sellingPrice - data.costPrice) / data.sellingPrice * 100).toFixed(1) : 0
      operationComplete("Pricing Updated", `Cost: $${data.costPrice}, Selling: $${data.sellingPrice} (${margin}% margin)`)
      onSuccess?.()
    } catch (err: any) {
      error("Update Failed", "Failed to update pricing", err?.message || "An unexpected error occurred")
    } finally {
      setIsSubmittingPricing(false)
    }
  }

  const handleRelationsSubmit = async (data: RelationsFormValues) => {
    if (!guardItem()) return
    setIsSubmittingRelations(true)
    const operationId = operationStart("Updating Item Relations")

    try {
      await updateItemRelationsMutation.mutateAsync({ id: itemData!.id, data })
      const category = categoryOptions.find(c => c.value === data.categoryId)?.label || 'Unknown'
      const brand = brandOptions.find(b => b.value === data.brandId)?.label || 'Unknown'
      operationComplete("Relations Updated", `Category: ${category}, Brand: ${brand} relationships updated`)
      onSuccess?.()
    } catch (err: any) {
      error("Update Failed", "Failed to update item relations", err?.message || "An unexpected error occurred")
    } finally {
      setIsSubmittingRelations(false)
    }
  }

  const handleTrackingSubmit = async (data: TrackingFormValues) => {
    if (!guardItem()) return
    setIsSubmittingTracking(true)
    const operationId = operationStart("Updating Tracking Settings")

    try {
      const updateData = {
        isActive: data.isActive,
        trackSerialNumbers: data.trackSerialNumbers,
        trackBatches: data.trackBatches,
        trackExpiry: data.trackExpiry,
        organizationId: data.organizationId,
        id: data.id,
        slug: data.slug ?? "",
      }
      await updateItemMutation.mutateAsync({ id: itemData!.id, data: updateData })
      const features = []
      if (data.trackSerialNumbers) features.push('Serial')
      if (data.trackBatches) features.push('Batches')
      if (data.trackExpiry) features.push('Expiry')
      const status = data.isActive ? 'Active' : 'Inactive'
      operationComplete("Tracking Settings Updated", `Status: ${status}${features.length ? `, Tracking: ${features.join(', ')}` : ''}`)
      onSuccess?.()
    } catch (err: any) {
      error("Update Failed", "Failed to update tracking settings", err?.message || "An unexpected error occurred")
    } finally {
      setIsSubmittingTracking(false)
    }
  }

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat("en-US", {
      style: "currency",
      currency: "USD",
      minimumFractionDigits: 2,
    }).format(amount)
  }

  // Generate SKU
  const generateSKU = () => {
    const newSku = generateSimpleSKU(9, "ITEM")
    itemDetailsForm.setValue("sku", newSku, { shouldValidate: true })
    success("SKU Generated", `New SKU created: ${newSku}`)
  }

  const getCurrentTabComponent = () => {
    switch (activeTab) {
      case 'overview':
        return (
          <div className="space-y-6">
            {/* Item Overview Header */}
            <div className="text-center space-y-4 mb-8">
              <div className="relative mx-auto w-32 h-32 rounded-2xl overflow-hidden border-4 border-slate-200 dark:border-slate-700 shadow-xl">
                <img
                  src={currentImageUrl || "/placeholder.png"}
                  alt={getItemValue("nameEn", "Item")}
                  className="w-full h-full object-cover"
                />
                <div className="absolute inset-0 bg-gradient-to-t from-black/20 to-transparent" />
              </div>
              <div>
                <h2 className="text-3xl font-bold text-slate-900 dark:text-white">
                  {getItemValue("nameEn", "Unknown Item")}
                </h2>
                <p className="text-slate-600 dark:text-slate-400 mt-1">
                  SKU: {getItemValue("sku", "N/A")}
                </p>
                <div className="flex justify-center mt-3">
                  <Badge
                    variant={getItemValue("isActive", true) ? "default" : "secondary"}
                    className={
                      getItemValue("isActive", true)
                        ? "bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-300 border-green-200 dark:border-green-700"
                        : "bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-400 border-slate-200 dark:border-slate-700"
                    }
                  >
                    <div className={`w-2 h-2 rounded-full mr-2 ${getItemValue("isActive", true) ? 'bg-green-500' : 'bg-slate-400'}`}></div>
                    {getItemValue("isActive", true) ? "Active" : "Inactive"}
                  </Badge>
                </div>
              </div>
            </div>

            {/* Quick Stats */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <Card className="bg-gradient-to-br from-emerald-50 to-teal-50 dark:from-emerald-900/20 dark:to-teal-900/20 border-emerald-200 dark:border-emerald-700">
                <CardContent className="p-4">
                  <div className="flex items-center gap-3">
                    <div className="p-2 rounded-lg bg-emerald-100 dark:bg-emerald-900/30">
                      <DollarSign className="h-5 w-5 text-emerald-600 dark:text-emerald-400" />
                    </div>
                    <div>
                      <p className="text-sm text-emerald-600 dark:text-emerald-400 font-medium">Selling Price</p>
                      <p className="text-xl font-bold text-emerald-900 dark:text-emerald-100">
                        {formatCurrency(Number(getItemValue("sellingPrice", 0)))}
                      </p>
                    </div>
                  </div>
                </CardContent>
              </Card>

              <Card className="bg-gradient-to-br from-blue-50 to-indigo-50 dark:from-blue-900/20 dark:to-indigo-900/20 border-blue-200 dark:border-blue-700">
                <CardContent className="p-4">
                  <div className="flex items-center gap-3">
                    <div className="p-2 rounded-lg bg-blue-100 dark:bg-blue-900/30">
                      <Warehouse className="h-5 w-5 text-blue-600 dark:text-blue-400" />
                    </div>
                    <div>
                      <p className="text-sm text-blue-600 dark:text-blue-400 font-medium">Stock Level</p>
                      <p className="text-xl font-bold text-blue-900 dark:text-blue-100">
                        {Number(getItemValue("inventoryLevels", [{}])[0]?.quantityOnHand || 0)}
                      </p>
                    </div>
                  </div>
                </CardContent>
              </Card>

              <Card className="bg-gradient-to-br from-amber-50 to-orange-50 dark:from-amber-900/20 dark:to-orange-900/20 border-amber-200 dark:border-amber-700">
                <CardContent className="p-4">
                  <div className="flex items-center gap-3">
                    <div className="p-2 rounded-lg bg-amber-100 dark:bg-amber-900/30">
                      <TrendingUp className="h-5 w-5 text-amber-600 dark:text-amber-400" />
                    </div>
                    <div>
                      <p className="text-sm text-amber-600 dark:text-amber-400 font-medium">Category</p>
                      <p className="text-xl font-bold text-amber-900 dark:text-amber-100">
                        {categoryOptions.find(c => c.value === getItemValue("categoryId"))?.label || "Uncategorized"}
                      </p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>

            {/* Quick Actions */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Zap className="h-5 w-5 text-blue-600" />
                  Quick Actions
                </CardTitle>
                <CardDescription>Commonly used actions for this item</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                  <Button
                    variant="outline"
                    onClick={() => setActiveTab('basic')}
                    className="h-auto flex-col gap-2 p-4"
                  >
                    <Package className="h-5 w-5" />
                    <span className="text-xs">Edit Basic Info</span>
                  </Button>
                  <Button
                    variant="outline"
                    onClick={() => setActiveTab('pricing')}
                    className="h-auto flex-col gap-2 p-4"
                  >
                    <DollarSign className="h-5 w-5" />
                    <span className="text-xs">Update Pricing</span>
                  </Button>
                  <Button
                    variant="outline"
                    onClick={() => setActiveTab('inventory')}
                    className="h-auto flex-col gap-2 p-4"
                  >
                    <Warehouse className="h-5 w-5" />
                    <span className="text-xs">Adjust Stock</span>
                  </Button>
                  <Button
                    variant="outline"
                    onClick={() => setActiveTab('advanced')}
                    className="h-auto flex-col gap-2 p-4"
                  >
                    <Settings className="h-5 w-5" />
                    <span className="text-xs">Settings</span>
                  </Button>
                </div>
              </CardContent>
            </Card>
          </div>
        )

      case 'basic':
        return (
          <div className="space-y-6">
            <Card className="bg-white/80 dark:bg-slate-800/80 backdrop-blur-lg border-0 shadow-xl">
              <CardHeader className="bg-gradient-to-r from-blue-50 to-indigo-50 dark:from-blue-900/20 dark:to-indigo-900/20 border-b border-blue-200/60 dark:border-blue-700/60">
                <CardTitle className="flex items-center gap-2">
                  <Package className="h-5 w-5 text-blue-600 dark:text-blue-400" />
                  Basic Information
                </CardTitle>
                <CardDescription>Update essential item details and visual identity</CardDescription>
              </CardHeader>
              <CardContent className="p-6">
                <Form {...basicInfoForm}>
                  <form onSubmit={basicInfoForm.handleSubmit(handleBasicInfoSubmit)} className="space-y-6">
                    <input type="hidden" {...basicInfoForm.register("organizationId")} />
                    <input type="hidden" {...basicInfoForm.register("id")} />

                    <FormField
                      control={basicInfoForm.control}
                      name="nameEn"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel className="text-base font-semibold text-slate-700 dark:text-slate-300 flex items-center gap-2">
                            <Sparkles className="h-4 w-4 text-blue-500" />
                            English Item Name *
                          </FormLabel>
                          <FormControl>
                            <Input
                              placeholder="Enter item name"
                              className="h-12 text-lg bg-white/80 dark:bg-slate-800/80 backdrop-blur-sm border-2 border-slate-200 dark:border-slate-700 focus:border-blue-500 dark:focus:border-blue-400 rounded-xl"
                              {...field}
                            />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    <FormField
                      control={basicInfoForm.control}
                      name="nameFr"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel className="text-base font-semibold text-slate-700 dark:text-slate-300">French Item Name</FormLabel>
                          <FormControl>
                            <Input
                              placeholder="Enter French item name"
                              className="h-12 bg-white/80 dark:bg-slate-800/80 backdrop-blur-sm border-2 border-slate-200 dark:border-slate-700 focus:border-blue-500 dark:focus:border-blue-400 rounded-xl"
                              {...field}
                            />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    <FormField
                      control={basicInfoForm.control}
                      name="descriptionEn"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel className="text-base font-semibold text-slate-700 dark:text-slate-300">English Description</FormLabel>
                          <FormControl>
                            <Textarea
                              placeholder="Enter item description"
                              className="min-h-[120px] bg-white/80 dark:bg-slate-800/80 backdrop-blur-sm border-2 border-slate-200 dark:border-slate-700 focus:border-blue-500 dark:focus:border-blue-400 rounded-xl resize-none"
                              {...field}
                            />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    <FormField
                      control={basicInfoForm.control}
                      name="descriptionFr"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel className="text-base font-semibold text-slate-700 dark:text-slate-300">French Description</FormLabel>
                          <FormControl>
                            <Textarea
                              placeholder="Enter French item description"
                              className="min-h-[120px] bg-white/80 dark:bg-slate-800/80 backdrop-blur-sm border-2 border-slate-200 dark:border-slate-700 focus:border-blue-500 dark:focus:border-blue-400 rounded-xl resize-none"
                              {...field}
                            />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    <div className="space-y-2">
                      <label className="text-base font-semibold text-slate-700 dark:text-slate-300">
                        Item Image
                      </label>
                      <ImageUploadButton
                        title="Update Item Image"
                        imageUrl={currentImageUrl}
                        setImageUrl={(url: string) => {
                          setCurrentImageUrl(url)
                          basicInfoForm.setValue("imageUrls", url)
                        }}
                        endpoint="itemImageUpload"
                      />
                      <div className="text-sm text-slate-500 dark:text-slate-400">
                        {currentImageUrl ? "Current item image loaded" : "No image for this item"}
                      </div>
                    </div>

                    <Button
                      type="submit"
                      disabled={isSubmittingBasic}
                      className="w-full h-12 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white shadow-lg"
                    >
                      {isSubmittingBasic ? (
                        <>
                          <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                          Updating...
                        </>
                      ) : (
                        <>
                          <Save className="mr-2 h-4 w-4" />
                          Update Basic Info
                        </>
                      )}
                    </Button>
                  </form>
                </Form>
              </CardContent>
            </Card>
          </div>
        )

      default:
        return <div>Tab content for {activeTab}</div>
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-7xl max-h-[95vh] overflow-y-auto">
        <DialogHeader className="border-b border-slate-200 dark:border-slate-700 pb-4">
          <DialogTitle className="text-2xl font-bold bg-gradient-to-r from-slate-900 to-slate-700 dark:from-white dark:to-slate-300 bg-clip-text text-transparent">
            Edit Item: {String(getItemValue("nameEn", "Unknown Item"))}
          </DialogTitle>
        </DialogHeader>

        <div className="py-6">
          {/* Tab Navigation */}
          <div className="mb-6">
            <div className="grid grid-cols-3 lg:grid-cols-7 gap-2">
              {EDIT_TABS.map((tab) => {
                const isActive = tab.id === activeTab
                return (
                  <button
                    key={tab.id}
                    onClick={() => setActiveTab(tab.id)}
                    className={`p-3 rounded-xl border-2 transition-all duration-200 text-left ${isActive
                      ? 'border-blue-500 bg-blue-50 dark:bg-blue-900/20'
                      : 'border-slate-200 bg-white dark:bg-slate-800 hover:border-slate-300 dark:border-slate-700'
                      }`}
                  >
                    <div className="flex items-center gap-2 mb-1">
                      <div className={`p-1 rounded-lg ${isActive
                        ? 'bg-blue-500 text-white'
                        : 'bg-slate-200 text-slate-600 dark:bg-slate-700 dark:text-slate-400'
                        }`}>
                        <tab.icon className="h-3 w-3" />
                      </div>
                      <span className={`text-xs font-medium ${isActive ? 'text-blue-700 dark:text-blue-300' : 'text-slate-700 dark:text-slate-300'
                        }`}>
                        {tab.title}
                      </span>
                    </div>
                    <p className={`text-xs ${isActive ? 'text-blue-600 dark:text-blue-400' : 'text-slate-500 dark:text-slate-400'
                      }`}>
                      {tab.description}
                    </p>
                  </button>
                )
              })}
            </div>
          </div>

          {/* Tab Content */}
          <div className="min-h-[400px]">
            {getCurrentTabComponent()}
          </div>
        </div>
      </DialogContent>
    </Dialog>
  )
}
