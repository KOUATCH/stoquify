"use client"

import EnhancedImageUploadButton from "@/components/FormInputs/EnhancedImageUploadButton"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardTitle } from "@/components/ui/card"
import { Form, FormControl, FormDescription, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form"
import { Input } from "@/components/ui/input"
import { Progress } from "@/components/ui/progress"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Switch } from "@/components/ui/switch"
import { Textarea } from "@/components/ui/textarea"
import { TooltipProvider } from "@/components/ui/tooltip"
import { generateSimpleSKU } from "@/lib/generateSKU"
import { cn } from "@/lib/utils"
import { zodResolver } from "@hookform/resolvers/zod"
import {
  Activity,
  AlertTriangle,
  ArrowLeft,
  Barcode,
  Boxes,
  Building,
  Calculator,
  CheckCheck,
  CheckCircle,
  ChevronRight,
  Copy,
  DollarSign,
  Eye,
  Hash,
  ImageIcon,
  Lightbulb,
  Loader2,
  Package,
  Percent,
  Ruler,
  Save,
  Scale,
  ShoppingCart,
  Sparkles,
  Tags,
  TrendingUp,
  Zap
} from "lucide-react"
import { useRouter } from "next/navigation"
import { useCallback, useEffect, useState } from "react"
import { useForm } from "react-hook-form"
import { z } from "zod"
import { useNotifications } from "../notifications/NotificationProvider"

// Enhanced validation schema for items - matches backend schema exactly
const itemCreationSchema = z.object({
  organizationId: z.string().min(1, 'Organization ID is required'),
  // Core
  nameEn: z.string().min(1, 'English name is required').max(255),
  nameFr: z.string().transform((val) => val === "" ? null : val).nullable().optional(),
  sku: z.string().min(1, 'SKU is required').max(128),

  // Optionals
  descriptionEn: z.string().transform((val) => val === "" ? null : val).nullable().optional(),
  descriptionFr: z.string().transform((val) => val === "" ? null : val).nullable().optional(),
  imageUrls: z.string().transform((val) => val === "" ? null : val).nullable().optional(),
  thumbnail: z.string().transform((val) => val === "" ? null : val).nullable().optional(),
  barcode: z.string().transform((val) => val === "" ? null : val).nullable().optional(),
  dimensions: z.string().transform((val) => val === "" ? null : val).nullable().optional(),
  weight: z.coerce.number().min(0).nullable().optional(),

  // Optional item codes - removed as not supported by current schema

  // Pricing
  costPrice: z.coerce.number().min(0).default(0),
  sellingPrice: z.coerce.number().min(0).default(0),
  tax: z.coerce.number().min(0).nullable().optional(),

  // Relations
  categoryId: z.string().transform((val) => val === "" ? null : val).nullable().optional(),
  brandId: z.string().transform((val) => val === "" ? null : val).nullable().optional(),
  unitId: z.string().transform((val) => val === "" ? null : val).nullable().optional(),
  taxRateId: z.string().transform((val) => val === "" ? null : val).nullable().optional(),

  // Stock policy stored at item-level
  minStockLevel: z.coerce.number().min(0).default(0),
  maxStockLevel: z.coerce.number().min(0).nullable().optional(),
  unitOfMeasure: z.string().transform((val) => val === "" ? null : val).nullable().optional(),

  // Tracking
  isActive: z.coerce.boolean().nullable().optional(),
  isSerialTracked: z.coerce.boolean().nullable().optional(),
  slug: z.string().transform((val) => val === "" ? null : val).nullable().optional(),

  // Optional initial inventory to seed a location
  initialInventory: z
    .object({
      locationId: z.string().min(1),
      quantity: z.coerce.number().int().min(0),
      unitCost: z.coerce.number().min(0).default(0),
      notes: z.string().optional(),
      createdById: z.string().optional(),
      batchNumber: z.string().optional(),
      serialNumbers: z.array(z.string()).optional(),
      expiryDate: z.coerce.date().optional(),
      referenceNumber: z.string().optional(),
    })
    .optional(),
}).refine((data) => data.sellingPrice >= data.costPrice, {
  message: "Selling price should be greater than or equal to cost price",
  path: ["sellingPrice"],
}).refine((data) => {
  if (data.maxStockLevel && data.minStockLevel) {
    return data.maxStockLevel >= data.minStockLevel
  }
  return true
}, {
  message: "Maximum stock level should be greater than minimum stock level",
  path: ["maxStockLevel"],
})

export type ItemCreationFormData = z.infer<typeof itemCreationSchema>
type ItemCreationInitialData = Partial<ItemCreationFormData>

interface ModernCreateItemFormProps {
  onSubmit?: (data: ItemCreationFormData) => Promise<void>
  action?: (formData: FormData) => Promise<void | { success: boolean; error?: string; redirect?: string }>
  isLoading?: boolean
  categories?: Array<{ id: string; titleEn: string; titleFr?: string | null }>
  brands?: Array<{ id: string; brandName: string }>
  units?: Array<{ id: string; nameEn: string; nameFr?: string | null; symbol: string }>
  taxRate?: Array<{ id: string; rate: number; nameEn: string; nameFr?: string | null }>
  organizationId: string
  // Edit mode props
  initialData?: ItemCreationInitialData
  isEditMode?: boolean
  itemId?: string
}

const DEFAULT_IMAGE_URL = "/placeholder.png"

const formSurfaceClass = "dashboard-glass-panel rounded-lg text-[var(--dash-text)]"
const formFieldClass =
  "dashboard-control h-11 rounded-lg border-[var(--dash-border-subtle)] text-[var(--dash-text)] shadow-none placeholder:text-[var(--dash-text-faint)] focus:border-[var(--dash-brand)] focus-visible:ring-[var(--dash-brand)]/25"
const formTextareaClass =
  "dashboard-control min-h-[120px] rounded-lg border-[var(--dash-border-subtle)] text-[var(--dash-text)] shadow-none placeholder:text-[var(--dash-text-faint)] focus:border-[var(--dash-brand)] focus-visible:ring-[var(--dash-brand)]/25"
const formLabelClass = "flex items-center gap-2 text-sm font-semibold text-[var(--dash-text)]"
const formDescriptionClass = "text-sm text-[var(--dash-text-soft)]"
const formStepIconClass =
  "inline-flex h-14 w-14 items-center justify-center rounded-lg border border-[var(--dash-border-subtle)] bg-[var(--dash-brand-soft)] text-[var(--dash-brand-strong)] shadow-[0_16px_34px_rgba(47,125,246,0.18)]"
const formInsetClass =
  "rounded-lg border border-[var(--dash-border-subtle)] bg-[rgba(24,38,45,0.68)] text-[var(--dash-text)] shadow-[inset_0_1px_0_rgba(255,255,255,0.055)]"
const formPrimaryButtonClass =
  "!rounded-lg !border !border-[var(--dash-brand)] !bg-[var(--dash-brand)] !text-white shadow-[0_16px_34px_rgba(47,125,246,0.22)] hover:!border-[var(--dash-brand-strong)] hover:!bg-[var(--dash-brand-strong)] hover:!text-white"
const formSecondaryButtonClass =
  "!rounded-lg !border !border-[var(--dash-border-subtle)] !bg-[rgba(24,38,45,0.66)] !text-[var(--dash-text-muted)] hover:!border-[var(--dash-brand)] hover:!bg-[var(--dash-brand-soft)] hover:!text-[var(--dash-text)]"

const FORM_STEPS = [
  { id: 'basic', title: 'Basic Info', icon: Package, description: 'Product name and description' },
  { id: 'details', title: 'Details', icon: Hash, description: 'SKU, barcode, and specs' },
  { id: 'pricing', title: 'Pricing', icon: DollarSign, description: 'Cost and selling prices' },
  { id: 'inventory', title: 'Inventory', icon: Boxes, description: 'Stock levels and tracking' },
  { id: 'media', title: 'Media', icon: ImageIcon, description: 'Product images' },
] as const

type FormStep = typeof FORM_STEPS[number]['id']

export function ModernCreateItemForm({
  onSubmit,
  action,
  isLoading = false,
  categories = [],
  brands = [],
  units = [],
  taxRate = [],
  organizationId,
  initialData,
  isEditMode = false,
  itemId
}: ModernCreateItemFormProps) {
  const router = useRouter()
  const [itemImageUrl, setItemImageUrl] = useState("")
  const [currentStep, setCurrentStep] = useState<FormStep>('basic')
  const [completedSteps, setCompletedSteps] = useState<Set<FormStep>>(new Set())
  const [isImageUploading, setIsImageUploading] = useState(false)
  const { success, error, warning, info, operationStart, operationComplete } = useNotifications()

  // Welcome notification when component mounts (only for create mode)
  useEffect(() => {
    if (!isEditMode) {
      info("Get Started", "Complete each step to create your new product. Start with the basic information and work your way through!")
    }
  }, [info, isEditMode])

  const form = useForm<ItemCreationFormData>({
    resolver: zodResolver(itemCreationSchema),
    defaultValues: initialData ? {
      nameEn: initialData.nameEn || "",
      nameFr: initialData.nameFr || "",
      descriptionEn: initialData.descriptionEn || "",
      descriptionFr: initialData.descriptionFr || "",
      sku: initialData.sku || "",
      barcode: initialData.barcode || "",
      costPrice: initialData.costPrice || 0,
      sellingPrice: initialData.sellingPrice || 0,
      categoryId: initialData.categoryId || "",
      brandId: initialData.brandId || "",
      unitId: initialData.unitId || "",
      taxRateId: initialData.taxRateId || "",
      minStockLevel: initialData.minStockLevel || 0,
      maxStockLevel: initialData.maxStockLevel || 0,
      weight: initialData.weight || 0,
      dimensions: initialData.dimensions || "",
      isActive: initialData.isActive ?? true,
      isSerialTracked: initialData.isSerialTracked ?? false,
      thumbnail: initialData.thumbnail || "",
      imageUrls: initialData.imageUrls || "",
      organizationId: initialData.organizationId || organizationId,
    } : {
      organizationId,
      nameEn: "",
      nameFr: "",
      sku: "",
      descriptionEn: "",
      descriptionFr: "",
      imageUrls: "",
      thumbnail: "",
      barcode: "",
      dimensions: "",
      weight: 0,
      costPrice: 0,
      sellingPrice: 0,
      tax: 0,
      categoryId: "",
      brandId: "",
      unitId: "",
      taxRateId: "",
      minStockLevel: 0,
      maxStockLevel: 0,
      unitOfMeasure: "",
      isActive: true,
      isSerialTracked: false,
      slug: "",
      initialInventory: undefined,
    },
    mode: "onChange"
  })

  const currentStepIndex = FORM_STEPS.findIndex(step => step.id === currentStep)
  const progressPercentage = ((currentStepIndex + 1) / FORM_STEPS.length) * 100

  // Watch form values for real-time calculations
  const watchedValues = form.watch()
  const { costPrice, sellingPrice, nameEn, sku, isActive } = watchedValues
  const displayName = nameEn || watchedValues.nameFr || ""

  // Calculate profit margin
  const profitMargin = sellingPrice && costPrice
    ? ((sellingPrice - costPrice) / sellingPrice * 100).toFixed(1)
    : "0"

  const profitAmount = sellingPrice && costPrice ? sellingPrice - costPrice : 0

  // Form validation by step
  const validateStep = useCallback(async (step: FormStep, silent = false): Promise<boolean> => {
    if (!silent) {
      operationStart(`Validating ${FORM_STEPS.find(s => s.id === step)?.title}`)
    }

    const fieldsByStep: Record<FormStep, (keyof ItemCreationFormData)[]> = {
      basic: ['nameEn'],
      details: ['sku'],
      pricing: ['costPrice', 'sellingPrice'],
      inventory: [], // No required fields in inventory step - all are optional
      media: [] // Image is optional
    }

    const fieldsToValidate = fieldsByStep[step]

    // If no fields to validate, consider step valid (avoid form.trigger)
    const result = fieldsToValidate.length === 0 ? true : await form.trigger(fieldsToValidate)

    if (result) {
      setCompletedSteps(prev => new Set(prev).add(step))
      if (!silent) {
        operationComplete("Step Validated", `${FORM_STEPS.find(s => s.id === step)?.title} section completed successfully`)
      }
    } else {
      if (!silent) {
        warning("Validation Required", `Please complete all required fields in the ${FORM_STEPS.find(s => s.id === step)?.title} section`)
      }
    }

    return result
  }, [form, operationComplete, operationStart, warning])

  const handleNext = async () => {
    const isValid = await validateStep(currentStep)

    if (isValid && currentStepIndex < FORM_STEPS.length - 1) {
      const nextStep = FORM_STEPS[currentStepIndex + 1]

      const valuesBeforeStepChange = form.getValues()
      const preservedValues = {
        unitId: valuesBeforeStepChange.unitId,
        taxRateId: valuesBeforeStepChange.taxRateId,
        costPrice: valuesBeforeStepChange.costPrice,
        sellingPrice: valuesBeforeStepChange.sellingPrice,
        barcode: valuesBeforeStepChange.barcode,
        descriptionEn: valuesBeforeStepChange.descriptionEn,
        descriptionFr: valuesBeforeStepChange.descriptionFr
      }

      setCurrentStep(nextStep.id)

      setTimeout(() => {
        Object.entries(preservedValues).forEach(([key, value]) => {
          const currentValue = form.getValues(key as keyof ItemCreationFormData)
          if (value && (!currentValue || currentValue === "" || currentValue === 0)) {
            form.setValue(key as keyof ItemCreationFormData, value)
          }
        })
      }, 50)

      info("Step Progress", `Moving to ${nextStep.title} - ${nextStep.description}`)
    }
  }

  const handlePrevious = () => {
    if (currentStepIndex > 0) {
      setCurrentStep(FORM_STEPS[currentStepIndex - 1].id)
    }
  }

  const handleStepClick = async (stepId: FormStep) => {
    const stepIndex = FORM_STEPS.findIndex(step => step.id === stepId)
    const currentIndex = FORM_STEPS.findIndex(step => step.id === currentStep)
    const targetStep = FORM_STEPS.find(step => step.id === stepId)

    // In edit mode, allow free navigation between any steps
    // In create mode, only allow forward navigation if current step is valid
    if (!isEditMode && stepIndex > currentIndex) {
      const isValid = await validateStep(currentStep)
      if (!isValid) return
    }

    setCurrentStep(stepId)
    if (targetStep) {
      info("Step Navigation", `Switched to ${targetStep.title} section`)
    }
  }

  const handleSubmit = async (data: ItemCreationFormData) => {
    // Auto-generate missing required fields
    // Note: Product name auto-generation removed - user must provide name

    if (!data.sku || data.sku.trim() === '') {
      const autoSku = generateSimpleSKU(9, "ITEM")
      form.setValue('sku', autoSku, { shouldValidate: true })
      data.sku = autoSku
      info("Auto-Generated", `SKU set to: ${autoSku}`)
    }

    // Check if image is still uploading
    if (isImageUploading) {
      warning("Upload in Progress", "Please wait for the image upload to complete before creating the product.")
      return
    }

    operationStart("Creating Product")

    try {
      const submitData = {
        ...data,
        thumbnail: itemImageUrl || "",
        imageUrls: itemImageUrl || "",
        ...(isEditMode && itemId ? { itemId } : {})
      }

      info("Processing Product", "Validating product information and saving to inventory...")

      if (action) {
        // Server action approach
        const formData = new FormData()

        // Add itemId for edit mode
        if (isEditMode && itemId) {
          formData.append('itemId', itemId)
        }

        Object.entries(submitData).forEach(([key, value]) => {
          // Special handling for imageUrls
          if (key === 'imageUrls') {
            const imageUrlValue = value === null || value === undefined ? "" : String(value)
            formData.append(key, String(imageUrlValue))
          } else {
            // Always append the field, even if null/undefined - server action will handle
            const formValue = value === null || value === undefined ? "" : String(value)
            formData.append(key, formValue)
          }
        })
        const result = await action(formData)

        // Handle server action response
        if (result && !result.success) {
          throw new Error(result.error ?? "Product save failed")
        }

        // Handle redirect if provided
        const redirectPath = result?.redirect
        if (redirectPath) {
          operationComplete(
            isEditMode ? "Product Updated" : "Product Created",
            isEditMode
              ? `${data.nameEn} has been successfully updated in your inventory`
              : `${data.nameEn} has been successfully added to your inventory with SKU: ${data.sku}`
          )
          // Use router.push instead of immediate redirect to allow notification to show
          setTimeout(() => router.push(redirectPath), 1500)
          return
        }
      } else if (onSubmit) {
        // Traditional callback approach
        await onSubmit(submitData)
      }

      operationComplete(
        isEditMode ? "Product Updated" : "Product Created",
        isEditMode
          ? `${data.nameEn} has been successfully updated in your inventory`
          : `${data.nameEn} has been successfully added to your inventory with SKU: ${data.sku}`
      )
    } catch {
      error(
        isEditMode ? "Update Failed" : "Creation Failed",
        isEditMode
          ? "Failed to update product. Please check your information and try again."
          : "Failed to create product. Please check your information and try again."
      )
    }
  }

  const handleCancel = () => {
    router.back()
  }

  // Generate SKU functionality
  const generateSKU = useCallback(() => {
    const newSku = generateSimpleSKU(9, "ITEM")
    form.setValue("sku", newSku, { shouldValidate: true })
    success("SKU Generated", `New SKU created: ${newSku}`)
  }, [form, success])

  // Auto-generate SKU when name changes
  useEffect(() => {
    if (nameEn && !sku) {
      const autoSku = nameEn
        .toUpperCase()
        .replace(/[^A-Z0-9]/g, '')
        .slice(0, 6) + Math.random().toString(36).substr(2, 3).toUpperCase()
      form.setValue("sku", autoSku, { shouldValidate: true })
      info("Auto-Generated SKU", `SKU automatically created from product name: ${autoSku}`)
    }
  }, [nameEn, sku, form, info])

  // Auto-generate default name if completely empty on form mount
  // Note: Auto product name generation removed - user must provide name

  // Provide helpful notifications based on form progress
  useEffect(() => {
    const subscription = form.watch((value, { name, type }) => {
      if (name === "costPrice" || name === "sellingPrice") {
        const costPrice = value.costPrice || 0
        const sellingPrice = value.sellingPrice || 0

        if (costPrice > 0 && sellingPrice > 0) {
          const margin = ((sellingPrice - costPrice) / sellingPrice * 100)
          if (margin < 0) {
            warning("Selling Below Cost", "Your selling price is lower than cost price. This will result in a loss.")
          } else if (margin < 10) {
            warning("Low Profit Margin", `Current profit margin is ${margin.toFixed(1)}%. Consider reviewing your pricing strategy.`)
          } else if (margin > 50) {
            success("Excellent Margin", `Great profit margin of ${margin.toFixed(1)}%! This should be profitable.`)
          }
        }
      }

      if (name === "minStockLevel" && value.minStockLevel && value.minStockLevel > 0) {
        info("Stock Alert Set", `You'll be notified when stock falls below ${value.minStockLevel} units`)
      }
    })

    return () => subscription.unsubscribe()
  }, [form, warning, success, info])

  // Form completion notification
  useEffect(() => {
    if (completedSteps.size === FORM_STEPS.length - 1 && currentStep === 'media') {
      if (isEditMode) {
        success("Ready to Update!", "Review your changes and update the product when ready!")
      } else {
        success("Almost Done!", "You've completed all required sections. Add an image and you're ready to create the product!")
      }
    }
  }, [completedSteps.size, currentStep, success, isEditMode])

  // Initialize edit mode: set image and silently validate completed steps
  useEffect(() => {
    if (isEditMode && initialData) {
      // Set image URL if available
      if (initialData.thumbnail || initialData.imageUrls) {
        const imageUrl = initialData.thumbnail || initialData.imageUrls || ""
        setItemImageUrl(imageUrl)
        // Also update the form field to ensure consistency
        form.setValue('imageUrls', imageUrl, { shouldValidate: true })
        form.setValue('thumbnail', imageUrl, { shouldValidate: true })
      }

      // Silently validate and mark completed steps without notifications
      const initializeEditMode = async () => {
        const completedStepsList: FormStep[] = []

        // Check each step silently
        for (const step of FORM_STEPS.slice(0, -1)) { // Exclude media step
          const isValid = await validateStep(step.id, true) // silent = true
          if (isValid) {
            completedStepsList.push(step.id)
          }
        }

        // If we have an image, mark media step as completed too
        if (initialData.thumbnail || initialData.imageUrls) {
          const mediaStepValid = await validateStep('media', true)
          if (mediaStepValid) {
            completedStepsList.push('media')
          }
        }

        // Update completed steps without triggering notifications
        if (completedStepsList.length > 0) {
          setCompletedSteps(new Set(completedStepsList))
        }
      }

      // Small delay to ensure form is mounted
      const timeoutId = setTimeout(initializeEditMode, 50)
      return () => clearTimeout(timeoutId)
    }
  }, [isEditMode, initialData, form, validateStep])

  // Copy SKU to clipboard
  const copySKU = useCallback(async () => {
    const currentSku = form.getValues("sku")
    if (currentSku) {
      try {
        await navigator.clipboard.writeText(currentSku)
        success("Copied to Clipboard", `SKU "${currentSku}" has been copied to your clipboard`)
      } catch (err) {
        error("Copy Failed", "Failed to copy SKU to clipboard. Please try selecting and copying manually.")
      }
    }
  }, [form, success, error])

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat("en-US", {
      style: "currency",
      currency: "USD",
      minimumFractionDigits: 2,
    }).format(amount)
  }

  const getCurrentStepComponent = () => {
    switch (currentStep) {
      case 'basic':
        return (
          <div className="space-y-6">
            <div className="text-center mb-8">
              <div className={cn(formStepIconClass, "mb-4")}>
                <Package className="h-7 w-7" />
              </div>
              <h3 className="mb-2 text-2xl font-semibold text-[var(--dash-text)]">Basic Information</h3>
              <p className="text-[var(--dash-text-soft)]">Start with the essential details about your product</p>
            </div>

            <div className="space-y-6">
              <div className="grid gap-6 md:grid-cols-2">
                <FormField
                  control={form.control}
                  name="nameEn"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel className={formLabelClass}>
                        <Sparkles className="h-4 w-4 text-[var(--dash-brand-strong)]" />
                        Product Name (English) *
                      </FormLabel>
                      <FormControl>
                        <Input
                          placeholder="Enter product name"
                          className={cn(formFieldClass, "text-base")}
                          {...field}
                        />
                      </FormControl>
                      <FormDescription className={formDescriptionClass}>
                        Stored as the English product name
                      </FormDescription>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="nameFr"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel className={formLabelClass}>
                        <Sparkles className="h-4 w-4 text-[var(--dash-brand-strong)]" />
                        Product Name (French)
                      </FormLabel>
                      <FormControl>
                        <Input
                          placeholder="Nom du produit"
                          className={cn(formFieldClass, "text-base")}
                          {...field}
                          value={field.value || ""}
                        />
                      </FormControl>
                      <FormDescription className={formDescriptionClass}>
                        Used for French locale display when available
                      </FormDescription>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>

              <div className="grid gap-6 md:grid-cols-2">
                <FormField
                  control={form.control}
                  name="descriptionEn"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel className="text-sm font-semibold text-[var(--dash-text)]">Description (English)</FormLabel>
                      <FormControl>
                        <Textarea
                          placeholder="Describe the product in English..."
                          className={cn(formTextareaClass, "resize-none")}
                          {...field}
                          value={field.value || ""}
                        />
                      </FormControl>
                      <FormDescription className={formDescriptionClass}>
                        Stored as the English product description
                      </FormDescription>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="descriptionFr"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel className="text-sm font-semibold text-[var(--dash-text)]">Description (French)</FormLabel>
                      <FormControl>
                        <Textarea
                          placeholder="Decrivez le produit en francais..."
                          className={cn(formTextareaClass, "resize-none")}
                          {...field}
                          value={field.value || ""}
                        />
                      </FormControl>
                      <FormDescription className={formDescriptionClass}>
                        Used for French locale display when available
                      </FormDescription>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>

              {displayName && (
                <div className={cn(formInsetClass, "p-4")}>
                  <div className="flex items-center gap-3">
                    <CheckCircle className="h-5 w-5 text-[var(--dash-success)]" />
                    <div>
                      <p className="font-medium text-[var(--dash-text)]">Great! Your product name looks good</p>
                      <p className="text-sm text-[var(--dash-text-soft)]">SKU will be auto-generated based on this name</p>
                    </div>
                  </div>
                </div>
              )}
            </div>
          </div>
        )

      case 'details':
        return (
          <div className="space-y-6">
            <div className="text-center mb-8">
              <div className={cn(formStepIconClass, "mb-4")}>
                <Hash className="h-7 w-7" />
              </div>
              <h3 className="mb-2 text-2xl font-semibold text-[var(--dash-text)]">Product Details</h3>
              <p className="text-[var(--dash-text-soft)]">Add unique identifiers and specifications</p>
            </div>

            <div className="grid gap-6 md:grid-cols-2">
              <FormField
                control={form.control}
                name="sku"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel className={formLabelClass}>
                      <Hash className="h-4 w-4 text-[var(--dash-brand-strong)]" />
                      SKU (Stock Keeping Unit) *
                    </FormLabel>
                    <FormControl>
                      <div className="space-y-3">
                        <div className="relative">
                          <Input
                            placeholder="AUTO-GENERATED"
                            className={cn(formFieldClass, "font-mono text-center font-semibold tracking-wider")}
                            {...field}
                            value={field.value || ""}
                          />
                          {field.value && (
                            <Button
                              type="button"
                              onClick={copySKU}
                              variant="ghost"
                              size="sm"
                              className="absolute right-2 top-1/2 -translate-y-1/2 h-8 w-8 p-0"
                            >
                              <Copy className="h-4 w-4" />
                            </Button>
                          )}
                        </div>
                        <div className="flex gap-2">
                          <Button
                            type="button"
                            onClick={generateSKU}
                            variant="outline"
                            size="sm"
                            className={cn(formSecondaryButtonClass, "flex-1")}
                          >
                            <Zap className="h-4 w-4 mr-2" />
                            Generate New SKU
                          </Button>
                        </div>
                      </div>
                    </FormControl>
                    <FormDescription className={formDescriptionClass}>
                      Unique identifier for inventory tracking
                    </FormDescription>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="barcode"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel className={formLabelClass}>
                      <Barcode className="h-4 w-4 text-[var(--dash-brand-strong)]" />
                      Barcode
                    </FormLabel>
                    <FormControl>
                      <Input
                        placeholder="UPC, EAN, or other barcode"
                        className={cn(formFieldClass, "font-mono")}
                        {...field}
                        value={field.value ?? ""}
                      />
                    </FormControl>
                    <FormDescription className={formDescriptionClass}>
                      Optional - for scanning and POS systems
                    </FormDescription>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            <div className="grid gap-6 md:grid-cols-2">
              <FormField
                control={form.control}
                name="categoryId"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel className={formLabelClass}>
                      <Tags className="h-4 w-4 text-[var(--dash-brand-strong)]" />
                      Category
                    </FormLabel>
                    <Select onValueChange={field.onChange} value={field.value || undefined}>
                      <FormControl>
                        <SelectTrigger className={formFieldClass}>
                          <SelectValue placeholder="Choose a category" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        {categories.map((category) => (
                          <SelectItem key={category.id} value={category.id}>
                            {category.titleEn}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <FormDescription className={formDescriptionClass}>
                      Helps organize your inventory
                    </FormDescription>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="brandId"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel className={formLabelClass}>
                      <Building className="h-4 w-4 text-[var(--dash-brand-strong)]" />
                      Brand
                    </FormLabel>
                    <Select onValueChange={field.onChange} value={field.value || undefined}>
                      <FormControl>
                        <SelectTrigger className={formFieldClass}>
                          <SelectValue placeholder="Select a brand" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        {brands.map((brand) => (
                          <SelectItem key={brand.id} value={brand.id}>
                            {brand.brandName}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <FormDescription className={formDescriptionClass}>
                      Product manufacturer or brand
                    </FormDescription>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>
          </div>
        )

      case 'pricing':
        return (
          <div className="space-y-6">
            <div className="text-center mb-8">
              <div className={cn(formStepIconClass, "mb-4")}>
                <DollarSign className="h-7 w-7" />
              </div>
              <h3 className="mb-2 text-2xl font-semibold text-[var(--dash-text)]">Pricing & Units</h3>
              <p className="text-[var(--dash-text-soft)]">Set your costs, prices, and units of measurement</p>
            </div>

            <div className="grid gap-6 md:grid-cols-2">
              <FormField
                control={form.control}
                name="costPrice"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel className={formLabelClass}>
                      <Calculator className="h-4 w-4 text-[var(--dash-brand-strong)]" />
                      Cost Price *
                    </FormLabel>
                    <FormControl>
                      <div className="relative">
                        <DollarSign className="absolute left-4 top-1/2 h-5 w-5 -translate-y-1/2 text-[var(--dash-text-soft)]" />
                        <Input
                          type="number"
                          placeholder="0.00"
                          min="0"
                          step="0.01"
                          className={cn(formFieldClass, "pl-12 text-base")}
                          value={field.value}
                          onChange={(e) => {
                            const value = e.target.value
                            field.onChange(value === '' ? 0 : parseFloat(value) || 0)
                          }}
                          onBlur={field.onBlur}
                          name={field.name}
                        />
                      </div>
                    </FormControl>
                    <FormDescription className={formDescriptionClass}>
                      Your cost to acquire this item
                    </FormDescription>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="sellingPrice"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel className={formLabelClass}>
                      <ShoppingCart className="h-4 w-4 text-[var(--dash-brand-strong)]" />
                      Selling Price *
                    </FormLabel>
                    <FormControl>
                      <div className="relative">
                        <DollarSign className="absolute left-4 top-1/2 h-5 w-5 -translate-y-1/2 text-[var(--dash-text-soft)]" />
                        <Input
                          type="number"
                          placeholder="0.00"
                          min="0"
                          step="0.01"
                          className={cn(formFieldClass, "pl-12 text-base")}
                          value={field.value}
                          onChange={(e) => {
                            const value = e.target.value
                            field.onChange(value === '' ? 0 : parseFloat(value) || 0)
                          }}
                          onBlur={field.onBlur}
                          name={field.name}
                        />
                      </div>
                    </FormControl>
                    <FormDescription className={formDescriptionClass}>
                      Price customers will pay
                    </FormDescription>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            {/* Profit Analysis */}
            {(costPrice > 0 || sellingPrice > 0) && (
              <div className={cn(formInsetClass, "p-6")}>
                <div className="flex items-center gap-3 mb-4">
                  <div className="rounded-lg border border-[var(--dash-border-subtle)] bg-[var(--dash-success-soft)] p-3">
                    <TrendingUp className="h-6 w-6 text-[var(--dash-success)]" />
                  </div>
                  <h4 className="text-xl font-semibold text-[var(--dash-text)]">Profit Analysis</h4>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-6">
                  <div className="text-center">
                    <div className="mb-1 text-sm font-medium text-[var(--dash-text-soft)]">Cost Price</div>
                    <div className="text-2xl font-semibold text-[var(--dash-text)]">
                      {formatCurrency(costPrice)}
                    </div>
                  </div>
                  <div className="text-center">
                    <div className="mb-1 text-sm font-medium text-[var(--dash-text-soft)]">Selling Price</div>
                    <div className="text-2xl font-semibold text-[var(--dash-text)]">
                      {formatCurrency(sellingPrice)}
                    </div>
                  </div>
                  <div className="text-center">
                    <div className="mb-1 flex items-center justify-center gap-1 text-sm font-medium text-[var(--dash-text-soft)]">
                      <Percent className="h-4 w-4" />
                      Profit Margin
                    </div>
                    <div className={`text-2xl font-semibold ${Number(profitMargin) > 0
                      ? 'text-[var(--dash-success)]'
                      : 'text-[var(--dash-danger)]'
                      }`}>
                      {profitMargin}%
                    </div>
                    <div className="mt-1 text-sm text-[var(--dash-text-soft)]">
                      {formatCurrency(profitAmount)} profit per unit
                    </div>
                  </div>
                </div>
              </div>
            )}

            <div className="grid gap-6 md:grid-cols-2">
              <FormField
                control={form.control}
                name="unitId"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel className={formLabelClass}>
                      <Scale className="h-4 w-4 text-[var(--dash-brand-strong)]" />
                      Unit of Measure
                    </FormLabel>
                    <Select onValueChange={field.onChange} value={field.value || undefined}>
                      <FormControl>
                        <SelectTrigger className={formFieldClass}>
                          <SelectValue placeholder="Select unit" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        {units.map((unit) => (
                          <SelectItem key={unit.id} value={unit.id}>
                            {unit.nameEn} ({unit.symbol})
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <FormDescription className={formDescriptionClass}>
                      How this product is counted/measured
                    </FormDescription>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="taxRateId"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel className={formLabelClass}>
                      <Percent className="h-4 w-4 text-[var(--dash-brand-strong)]" />
                      Tax Rate
                    </FormLabel>
                    <Select onValueChange={field.onChange} value={field.value || undefined}>
                      <FormControl>
                        <SelectTrigger className={formFieldClass}>
                          <SelectValue placeholder="Select tax rate" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        {taxRate.map((rate) => (
                          <SelectItem key={rate.id} value={rate.id}>
                            {rate.nameEn} ({rate.rate}%)
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <FormDescription className={formDescriptionClass}>
                      Applicable tax rate for this product
                    </FormDescription>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>
          </div>
        )

      case 'inventory':
        return (
          <div className="space-y-6">
            <div className="text-center mb-8">
              <div className={cn(formStepIconClass, "mb-4")}>
                <Boxes className="h-7 w-7" />
              </div>
              <h3 className="mb-2 text-2xl font-semibold text-[var(--dash-text)]">Inventory Settings</h3>
              <p className="text-[var(--dash-text-soft)]">Configure stock levels and tracking options</p>
            </div>

            <div className="grid gap-6 md:grid-cols-2">
              <FormField
                control={form.control}
                name="minStockLevel"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel className={formLabelClass}>
                      <AlertTriangle className="h-4 w-4 text-[var(--dash-warning)]" />
                      Minimum Stock Level
                    </FormLabel>
                    <FormControl>
                      <Input
                        type="number"
                        placeholder="0"
                        min="0"
                        className={formFieldClass}
                        {...field}
                        value={field.value ?? 0}
                        onChange={(e) => field.onChange(Number(e.target.value) || 0)}
                      />
                    </FormControl>
                    <FormDescription className={formDescriptionClass}>
                      Alert when stock falls below this level
                    </FormDescription>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="maxStockLevel"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel className={formLabelClass}>
                      <CheckCircle className="h-4 w-4 text-[var(--dash-success)]" />
                      Maximum Stock Level
                    </FormLabel>
                    <FormControl>
                      <Input
                        type="number"
                        placeholder="0"
                        min="0"
                        className={formFieldClass}
                        {...field}
                        value={field.value ?? 0}
                        onChange={(e) => field.onChange(Number(e.target.value) || 0)}
                      />
                    </FormControl>
                    <FormDescription className={formDescriptionClass}>
                      Maximum stock to maintain
                    </FormDescription>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            <div className="grid gap-6 md:grid-cols-2">
              <FormField
                control={form.control}
                name="weight"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel className={formLabelClass}>
                      <Scale className="h-4 w-4 text-[var(--dash-brand-strong)]" />
                      Weight (kg)
                    </FormLabel>
                    <FormControl>
                      <Input
                        type="number"
                        placeholder="0.0"
                        min="0"
                        step="0.1"
                        className={formFieldClass}
                        {...field}
                        value={field.value ?? 0}
                        onChange={(e) => field.onChange(Number(e.target.value) || 0)}
                      />
                    </FormControl>
                    <FormDescription className={formDescriptionClass}>
                      For shipping calculations
                    </FormDescription>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="dimensions"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel className={formLabelClass}>
                      <Ruler className="h-4 w-4 text-[var(--dash-brand-strong)]" />
                      Dimensions
                    </FormLabel>
                    <FormControl>
                      <Input
                        placeholder="L x W x H (e.g., 10 x 5 x 3 cm)"
                        className={formFieldClass}
                        {...field}
                        value={field.value ?? ""}
                      />
                    </FormControl>
                    <FormDescription className={formDescriptionClass}>
                      Physical dimensions of the item
                    </FormDescription>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            <div className="space-y-4">
              <FormField
                control={form.control}
                name="isActive"
                render={({ field }) => (
                  <FormItem className={cn(formInsetClass, "flex flex-row items-center justify-between gap-4 p-5")}>
                    <div className="space-y-1">
                      <FormLabel className="flex items-center gap-2 text-base font-semibold text-[var(--dash-text)]">
                        <Activity className="h-5 w-5 text-[var(--dash-success)]" />
                        Active Product
                      </FormLabel>
                      <FormDescription className={formDescriptionClass}>
                        Enable this product for sales and inventory tracking
                      </FormDescription>
                    </div>
                    <FormControl>
                      <Switch checked={field.value ?? false} onCheckedChange={field.onChange} className="data-[state=checked]:bg-[var(--dash-success)]" />
                    </FormControl>
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="isSerialTracked"
                render={({ field }) => (
                  <FormItem className={cn(formInsetClass, "flex flex-row items-center justify-between gap-4 p-5")}>
                    <div className="space-y-1">
                      <FormLabel className="flex items-center gap-2 text-base font-semibold text-[var(--dash-text)]">
                        <Hash className="h-5 w-5 text-[var(--dash-brand-strong)]" />
                        Serial Number Tracking
                      </FormLabel>
                      <FormDescription className={formDescriptionClass}>
                        Track individual serial numbers for this product
                      </FormDescription>
                    </div>
                    <FormControl>
                      <Switch checked={field.value ?? false} onCheckedChange={field.onChange} className="data-[state=checked]:bg-[var(--dash-brand)]" />
                    </FormControl>
                  </FormItem>
                )}
              />
            </div>
          </div>
        )

      case 'media':
        return (
          <div className="space-y-6">
            <div className="text-center mb-8">
              <div className={cn(formStepIconClass, "mb-4")}>
                <ImageIcon className="h-7 w-7" />
              </div>
              <h3 className="mb-2 text-2xl font-semibold text-[var(--dash-text)]">Product Media</h3>
              <p className="text-[var(--dash-text-soft)]">Upload high-quality images to showcase your product</p>
            </div>

            <div className="text-center space-y-6">
              <div className="mx-auto max-w-md">
                <EnhancedImageUploadButton
                  title="Upload Product Image"
                  imageUrl={itemImageUrl}
                  setImageUrl={(url: string) => {
                    setItemImageUrl(url)
                    // Update form fields when image is uploaded
                    form.setValue('imageUrls', url, { shouldValidate: true })
                    form.setValue('thumbnail', url, { shouldValidate: true })
                    if (url) {
                      success("Image Uploaded", "Product image has been successfully uploaded and will be used for your product listing")
                    }
                  }}
                  organizationId={organizationId}
                  endpoint="itemImageUpload"
                  onUploadStart={() => {
                    setIsImageUploading(true)
                  }}
                  onUploadComplete={() => {
                    setIsImageUploading(false)
                  }}
                  onUploadError={() => {
                    setIsImageUploading(false)
                  }}
                />
              </div>

              <div className={cn(formInsetClass, "p-6")}>
                <div className="flex items-start gap-3">
                  <Lightbulb className="mt-1 h-6 w-6 flex-shrink-0 text-[var(--dash-brand-strong)]" />
                  <div className="text-left">
                    <h4 className="mb-2 font-semibold text-[var(--dash-text)]">Image Tips for Better Sales</h4>
                    <ul className="space-y-1 text-sm text-[var(--dash-text-soft)]">
                      <li>• Use high-resolution images (1024x1024px or larger)</li>
                      <li>• Ensure good lighting and clear product visibility</li>
                      <li>• Show the product from multiple angles if possible</li>
                      <li>• Use a clean, neutral background</li>
                      <li>• JPG or PNG formats work best</li>
                    </ul>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )

      default:
        return null
    }
  }

  return (
    <TooltipProvider>
      <div className="dashboard-landing-theme dark min-h-screen overflow-x-hidden">
        <div className="dashboard-landing-content mx-auto w-full max-w-[88rem] min-w-0 px-4 py-6 sm:px-6 sm:py-8">
          {/* Header */}
          <div className={cn(formSurfaceClass, "mb-6 p-4 sm:mb-8 sm:p-5")}>
            <div className="mb-5 flex items-center gap-4">
              <Button
                onClick={handleCancel}
                variant="outline"
                size="sm"
                className={formSecondaryButtonClass}
              >
                <ArrowLeft className="w-4 h-4 mr-2" />
                Back to Items
              </Button>
            </div>

            <div className="flex min-w-0 items-start gap-4">
              <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-lg border border-[var(--dash-border-subtle)] bg-[var(--dash-brand-soft)] shadow-[0_16px_34px_rgba(47,125,246,0.18)]">
                <Package className="h-6 w-6 text-[var(--dash-brand-strong)]" />
              </div>
              <div className="min-w-0">
                <div className="dashboard-eyebrow mb-3">
                  <span className="dashboard-live-dot" />
                  Inventory item workflow
                </div>
                <h1 className="text-3xl font-semibold tracking-tight text-[var(--dash-text)] sm:text-4xl">
                  {isEditMode ? 'Edit Product' : 'Create New Product'}
                </h1>
                <p className="mt-2 max-w-2xl text-sm leading-6 text-[var(--dash-text-soft)] sm:text-base">
                  {isEditMode
                    ? 'Update the product details and save your changes'
                    : 'Add a new product to your inventory with comprehensive details'
                  }
                </p>
              </div>
            </div>

            {/* Progress Bar */}
            <div className="mt-8">
              <div className="flex items-center justify-between mb-4">
                <span className="text-sm font-medium text-[var(--dash-text)]">
                  Step {currentStepIndex + 1} of {FORM_STEPS.length}
                </span>
                <span className="text-sm text-[var(--dash-text-soft)]">
                  {Math.round(progressPercentage)}% Complete
                </span>
              </div>
              <div className="h-2 w-full overflow-hidden rounded-full border border-[var(--dash-border-subtle)] bg-[rgba(24,38,45,0.7)]">
                <div
                  className="h-full rounded-full bg-[var(--dash-brand)] transition-all duration-500 ease-out"
                  style={{ width: `${progressPercentage}%` }}
                />
              </div>
            </div>

            {/* Step Navigation */}
            <div className="mt-6 grid grid-cols-1 gap-2 sm:grid-cols-2 lg:grid-cols-5">
              {FORM_STEPS.map((step, index) => {
                const isActive = step.id === currentStep
                const isCompleted = completedSteps.has(step.id)
                const isAccessible = index <= currentStepIndex || isCompleted

                return (
                  <button
                    key={step.id}
                    onClick={() => isAccessible && handleStepClick(step.id)}
                    disabled={!isAccessible}
                    className={`rounded-lg border p-3 text-left transition-all duration-200 ${isActive
                      ? 'border-[var(--dash-brand)] bg-[var(--dash-brand-soft)]'
                      : isCompleted
                        ? 'border-[var(--dash-success)] bg-[var(--dash-success-soft)] hover:border-[var(--dash-success)]'
                        : isAccessible
                          ? 'border-[var(--dash-border-subtle)] bg-[rgba(24,38,45,0.62)] hover:border-[var(--dash-brand)]'
                          : 'cursor-not-allowed border-[var(--dash-border-subtle)] bg-[rgba(24,38,45,0.38)] opacity-50'
                      }`}
                  >
                    <div className="flex items-center gap-2 mb-1">
                      <div className={`rounded-md p-1 ${isActive
                        ? 'bg-[var(--dash-brand)] text-white'
                        : isCompleted
                          ? 'bg-[var(--dash-success)] text-[#06130d]'
                          : 'bg-[rgba(37,57,67,0.82)] text-[var(--dash-text-soft)]'
                        }`}>
                        {isCompleted ? <CheckCheck className="h-3 w-3" /> : <step.icon className="h-3 w-3" />}
                      </div>
                      <span className={`text-xs font-semibold ${isActive ? 'text-[var(--dash-text)]' : 'text-[var(--dash-text-muted)]'
                        }`}>
                        {step.title}
                      </span>
                    </div>
                    <p className={`text-xs ${isActive ? 'text-[var(--dash-text-muted)]' : 'text-[var(--dash-text-soft)]'
                      }`}>
                      {step.description}
                    </p>
                  </button>
                )
              })}
            </div>
          </div>

          <div className="grid grid-cols-1 gap-6 lg:grid-cols-4">
            {/* Main Form */}
            <div className="lg:col-span-3">
              <Card className={cn(formSurfaceClass, "overflow-hidden")}>
                <CardContent className="p-4 sm:p-6 lg:p-8">
                  <Form {...form}>
                    <form onSubmit={form.handleSubmit(handleSubmit, (errors) => {
                      const errorFields = Object.keys(errors)
                      if (errorFields.includes('nameEn')) {
                        error('Missing Information', 'Product name is required. Please provide a product name.')
                      } else if (errorFields.includes('sku')) {
                        warning('Missing Information', 'SKU is being auto-generated. Please try submitting again.')
                      } else {
                        error('Form Validation Error', `Please fix the following: ${errorFields.join(', ')}`)
                      }
                    })} className="space-y-8">

                      {/* Hidden fields to maintain form registrations across steps */}
                      <div style={{ display: 'none' }}>
                        <FormField
                          control={form.control}
                          name="unitId"
                          render={({ field }) => <input {...field} value={field.value ?? ""} />}
                        />
                        <FormField
                          control={form.control}
                          name="taxRateId"
                          render={({ field }) => <input {...field} value={field.value ?? ""} />}
                        />
                        <FormField
                          control={form.control}
                          name="costPrice"
                          render={({ field }) => <input type="number" {...field} />}
                        />
                        <FormField
                          control={form.control}
                          name="sellingPrice"
                          render={({ field }) => <input type="number" {...field} />}
                        />
                        <FormField
                          control={form.control}
                          name="barcode"
                          render={({ field }) => <input {...field} value={field.value ?? ""} />}
                        />
                        <FormField
                          control={form.control}
                          name="descriptionEn"
                          render={({ field }) => <textarea {...field} value={field.value || ""} />}
                        />
                        <FormField
                          control={form.control}
                          name="descriptionFr"
                          render={({ field }) => <textarea {...field} value={field.value || ""} />}
                        />
                      </div>

                      {getCurrentStepComponent()}

                      {/* Form Navigation */}
                      <div className="flex flex-col gap-3 border-t border-[var(--dash-border-subtle)] pt-6 sm:flex-row sm:items-center sm:justify-between">
                        <Button
                          type="button"
                          onClick={handlePrevious}
                          disabled={currentStepIndex === 0}
                          variant="outline"
                          className={cn(formSecondaryButtonClass, "h-11 w-full sm:w-auto")}
                        >
                          <ArrowLeft className="w-4 h-4 mr-2" />
                          Previous
                        </Button>

                        {currentStepIndex === FORM_STEPS.length - 1 ? (
                          <Button
                            type="submit"
                            disabled={form.formState.isSubmitting || isLoading || isImageUploading}
                            onClick={async () => {
                              // Auto-fill required fields if empty
                              const currentValues = form.getValues()
                              let needsUpdate = false

                              // Note: Product name auto-generation removed - user must provide name

                              if (!currentValues.sku || currentValues.sku.trim() === '') {
                                const autoSku = generateSimpleSKU(9, "ITEM")
                                form.setValue('sku', autoSku, { shouldValidate: true })
                                needsUpdate = true
                                info("Auto-Generated", `SKU set to: ${autoSku}`)
                              }

                              // If we updated fields, re-validate
                              if (needsUpdate) {
                                await new Promise(resolve => setTimeout(resolve, 100)) // Small delay for form to update
                                await form.trigger()
                              }
                            }}
                            className={cn(formPrimaryButtonClass, "h-11 w-full px-8 sm:w-auto")}
                          >
                            {form.formState.isSubmitting || isLoading ? (
                              <>
                                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                                {isEditMode ? 'Updating Product...' : 'Creating Product...'}
                              </>
                            ) : isImageUploading ? (
                              <>
                                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                                Uploading Image...
                              </>
                            ) : (
                              <>
                                <Save className="mr-2 h-4 w-4" />
                                {isEditMode ? 'Update Product' : 'Create Product'}
                              </>
                            )}
                          </Button>
                        ) : (
                          <Button
                            type="button"
                            onClick={handleNext}
                            className={cn(formPrimaryButtonClass, "h-11 w-full px-6 sm:w-auto")}
                          >
                            Next Step
                            <ChevronRight className="w-4 h-4 ml-2" />
                          </Button>
                        )}
                      </div>
                    </form>
                  </Form>
                </CardContent>
              </Card>
            </div>

            {/* Preview Panel */}
            <div className="lg:col-span-1">
              <Card className={cn(formSurfaceClass, "sticky top-6 overflow-hidden")}>
                <div className="border-b border-[var(--dash-border-subtle)] bg-[rgba(37,57,67,0.62)] px-5 py-4">
                  <CardTitle className="flex items-center gap-2 text-lg font-semibold text-[var(--dash-text)]">
                    <Eye className="h-5 w-5 text-[var(--dash-brand-strong)]" />
                    Live Preview
                  </CardTitle>
                  <CardDescription className="mt-1 text-[var(--dash-text-soft)]">
                    See how your product will look
                  </CardDescription>
                </div>
                <CardContent className="space-y-6 p-5">
                  {/* Product Image and Name */}
                  <div className="text-center space-y-4">
                    <div className="relative mx-auto h-32 w-32 overflow-hidden rounded-lg border border-[var(--dash-border-subtle)] bg-[rgba(24,38,45,0.68)] shadow-xl">
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img
                        src={itemImageUrl || DEFAULT_IMAGE_URL}
                        alt={displayName || "Product preview"}
                        className="w-full h-full object-cover"
                      />
                      <div className="absolute inset-0 bg-gradient-to-t from-black/20 to-transparent" />
                    </div>
                    <div>
                      <h3 className="mb-1 text-xl font-semibold text-[var(--dash-text)]">
                        {displayName || "New Product"}
                      </h3>
                      {sku && (
                        <p className="dashboard-filter-chip inline-block rounded-lg px-2 py-1 font-mono text-sm">
                          SKU: {sku}
                        </p>
                      )}
                    </div>
                  </div>

                  {/* Status Badge */}
                  <div className="flex justify-center">
                    <Badge
                      variant={isActive ? "default" : "secondary"}
                      className={`px-3 py-1 ${isActive
                        ? "border-[var(--dash-success)] bg-[var(--dash-success-soft)] text-[var(--dash-text)]"
                        : "border-[var(--dash-border-subtle)] bg-[rgba(37,57,67,0.74)] text-[var(--dash-text-soft)]"
                        }`}
                    >
                      <div className={`mr-2 h-2 w-2 rounded-full ${isActive ? 'bg-[var(--dash-success)]' : 'bg-[var(--dash-text-faint)]'}`}></div>
                      {isActive ? "Active Product" : "Inactive Product"}
                    </Badge>
                  </div>

                  {/* Pricing Preview */}
                  {(costPrice > 0 || sellingPrice > 0) && (
                    <div className="space-y-3">
                      <h4 className="text-sm font-semibold uppercase tracking-wide text-[var(--dash-text-faint)]">
                        Pricing Overview
                      </h4>
                      <div className="space-y-3">
                        <div className={cn(formInsetClass, "flex items-center justify-between p-3")}>
                          <span className="text-sm text-[var(--dash-text-soft)]">Cost Price</span>
                          <span className="font-semibold text-[var(--dash-text)]">
                            {formatCurrency(costPrice)}
                          </span>
                        </div>
                        <div className={cn(formInsetClass, "flex items-center justify-between p-3")}>
                          <span className="text-sm text-[var(--dash-text-soft)]">Selling Price</span>
                          <span className="font-semibold text-[var(--dash-success)]">
                            {formatCurrency(sellingPrice)}
                          </span>
                        </div>
                        {Number(profitMargin) !== 0 && (
                          <div className={cn(formInsetClass, "flex items-center justify-between p-3")}>
                            <span className="text-sm text-[var(--dash-text-soft)]">Profit Margin</span>
                            <span className={`font-semibold ${Number(profitMargin) > 0
                              ? 'text-[var(--dash-success)]'
                              : 'text-[var(--dash-danger)]'
                              }`}>
                              {profitMargin}%
                            </span>
                          </div>
                        )}
                      </div>
                    </div>
                  )}

                  {/* Progress Summary */}
                  <div className="border-t border-[var(--dash-border-subtle)] pt-4">
                    <div className="space-y-2">
                      <div className="flex justify-between text-sm">
                        <span className="text-[var(--dash-text-soft)]">Completion</span>
                        <span className="font-medium text-[var(--dash-text)]">
                          {Math.round(progressPercentage)}%
                        </span>
                      </div>
                      <Progress value={progressPercentage} className="h-2" />
                    </div>
                    <p className="mt-3 text-center text-xs text-[var(--dash-text-soft)]">
                      Complete all steps to create your product
                    </p>
                  </div>
                </CardContent>
              </Card>
            </div>
          </div>
        </div>
      </div>
    </TooltipProvider>
  )
}
