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

  // Debug image upload state changes
  useEffect(() => {
    console.log('isImageUploading changed:', isImageUploading)
  }, [isImageUploading])

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
  const validateStep = async (step: FormStep, silent = false): Promise<boolean> => {
    const operationId = !silent ? operationStart(`Validating ${FORM_STEPS.find(s => s.id === step)?.title}`) : null

    // 🔍 Debug: Log form values BEFORE validation
    const valuesBefore = form.getValues()
    if (!silent) {
      console.log(`🔍 Form values BEFORE ${step} validation:`, {
        unitId: valuesBefore.unitId,
        taxRateId: valuesBefore.taxRateId,
        costPrice: valuesBefore.costPrice,
        sellingPrice: valuesBefore.sellingPrice
      })
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

    // 🔍 Debug: Log form values AFTER validation
    const valuesAfter = form.getValues()
    if (!silent) {
      console.log(`🔍 Form values AFTER ${step} validation:`, {
        unitId: valuesAfter.unitId,
        taxRateId: valuesAfter.taxRateId,
        costPrice: valuesAfter.costPrice,
        sellingPrice: valuesAfter.sellingPrice
      })
    }

    // Debug logging (only if not silent)
    if (!silent) {
      console.log(`Step validation for ${step}:`, {
        step,
        fieldsToValidate,
        result,
        currentValues: fieldsToValidate.length > 0 ? fieldsToValidate.reduce((acc, field) => {
          acc[field] = form.getValues(field);
          return acc;
        }, {} as any) : 'No fields to validate'
      });
    }

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
  }

  const handleNext = async () => {
    const currentValues = form.getValues()
    console.log('🔍 Current form values before validation:', {
      unitId: currentValues.unitId,
      taxRateId: currentValues.taxRateId,
      barcode: currentValues.barcode,
      costPrice: currentValues.costPrice,
      sellingPrice: currentValues.sellingPrice,
      descriptionEn: currentValues.descriptionEn,
      descriptionFr: currentValues.descriptionFr
    })

    const isValid = await validateStep(currentStep)

    if (isValid && currentStepIndex < FORM_STEPS.length - 1) {
      const nextStep = FORM_STEPS[currentStepIndex + 1]

      // 🔍 Debug: Check values right before step change
      const valuesBeforeStepChange = form.getValues()
      console.log(`🔍 Values right before changing to ${nextStep.title}:`, {
        unitId: valuesBeforeStepChange.unitId,
        taxRateId: valuesBeforeStepChange.taxRateId,
        costPrice: valuesBeforeStepChange.costPrice,
        sellingPrice: valuesBeforeStepChange.sellingPrice
      })

      // 💡 SURGICAL FIX: Preserve critical values before step change
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

      // 💡 SURGICAL FIX: Restore values immediately after step change
      setTimeout(() => {
        const valuesAfterStepChange = form.getValues()
        console.log(`🔍 Values right after changing to ${nextStep.title}:`, {
          unitId: valuesAfterStepChange.unitId,
          taxRateId: valuesAfterStepChange.taxRateId,
          costPrice: valuesAfterStepChange.costPrice,
          sellingPrice: valuesAfterStepChange.sellingPrice
        })

        // Restore any lost values
        let needsRestore = false
        Object.entries(preservedValues).forEach(([key, value]) => {
          const currentValue = form.getValues(key as keyof ItemCreationFormData)
          if (value && (!currentValue || currentValue === "" || currentValue === 0)) {
            console.log(`🔧 Restoring ${key}: ${currentValue} → ${value}`)
            form.setValue(key as keyof ItemCreationFormData, value)
            needsRestore = true
          }
        })

        if (needsRestore) {
          console.log('✅ Values restored after step change')
        }
      }, 50) // Shorter delay for faster restoration

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
    console.log('🔍 Form submission started with data:', data)
    console.log('🔍 Key fields check:', {
      unitId: data.unitId,
      taxRateId: data.taxRateId,
      barcode: data.barcode,
      costPrice: data.costPrice,
      sellingPrice: data.sellingPrice,
      descriptionEn: data.descriptionEn,
      descriptionFr: data.descriptionFr
    })

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

    const operationId = operationStart("Creating Product")

    try {
      const submitData = {
        ...data,
        thumbnail: itemImageUrl || "",
        imageUrls: itemImageUrl || "",
        ...(isEditMode && itemId ? { itemId } : {})
      }

      console.log('🔍 submitData before FormData creation:', submitData)

      // Quick diagnostic for missing values
      const issues = []
      if (!submitData.unitId) issues.push('unitId is falsy')
      if (!submitData.taxRateId) issues.push('taxRateId is falsy')
      if (submitData.costPrice === 0) issues.push('costPrice is 0')
      if (submitData.sellingPrice === 0) issues.push('sellingPrice is 0')

      if (issues.length > 0) {
        console.log('⚠️ Data issues detected:', issues)
      } else {
        console.log('✅ All key fields have values')
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
            const imageUrlValue = value || ""
            formData.append(key, String(imageUrlValue))
            console.log(`Setting imageUrls: ${imageUrlValue}`)
          } else {
            // Always append the field, even if null/undefined - server action will handle
            const formValue = value ? String(value) : ""
            formData.append(key, formValue)
            console.log(`FormData ${key}: ${formValue} (original value: ${value})`)
          }
        })
        console.log('Calling server action with formData')
        const result = await action(formData)
        console.log('Server action completed successfully')

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
    } catch (err) {
      console.log(isEditMode ? "Failed to update item:" : "Failed to create item:", err)
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
  }, [isEditMode, initialData, form])

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

  // Generate preview initials
  const avatarFallback = displayName
    ? displayName.split(' ').map(n => n[0]).join('').slice(0, 2).toUpperCase()
    : "??"

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
              <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-gradient-to-br from-emerald-500 via-teal-600 to-cyan-700 shadow-lg shadow-emerald-500/25 mb-4">
                <Package className="w-8 h-8 text-white" />
              </div>
              <h3 className="text-2xl font-bold text-foreground mb-2">Basic Information</h3>
              <p className="text-muted-foreground">Start with the essential details about your product</p>
            </div>

            <div className="space-y-6">
              <div className="grid gap-6 md:grid-cols-2">
                <FormField
                  control={form.control}
                  name="nameEn"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel className="text-base font-semibold text-foreground flex items-center gap-2">
                        <Sparkles className="h-4 w-4 text-emerald-600" />
                        Product Name (English) *
                      </FormLabel>
                      <FormControl>
                        <Input
                          placeholder="Enter product name"
                          className="h-12 text-lg bg-background border-2 border-border focus:border-emerald-500 rounded-xl shadow-sm"
                          {...field}
                        />
                      </FormControl>
                      <FormDescription className="text-sm text-muted-foreground">
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
                      <FormLabel className="text-base font-semibold text-foreground flex items-center gap-2">
                        <Sparkles className="h-4 w-4 text-emerald-600" />
                        Product Name (French)
                      </FormLabel>
                      <FormControl>
                        <Input
                          placeholder="Nom du produit"
                          className="h-12 text-lg bg-background border-2 border-border focus:border-emerald-500 rounded-xl shadow-sm"
                          {...field}
                          value={field.value || ""}
                        />
                      </FormControl>
                      <FormDescription className="text-sm text-muted-foreground">
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
                      <FormLabel className="text-base font-semibold text-foreground">Description (English)</FormLabel>
                      <FormControl>
                        <Textarea
                          placeholder="Describe the product in English..."
                          className="min-h-[120px] bg-background border-2 border-border focus:border-emerald-500 rounded-xl shadow-sm resize-none"
                          {...field}
                          value={field.value || ""}
                        />
                      </FormControl>
                      <FormDescription className="text-sm text-muted-foreground">
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
                      <FormLabel className="text-base font-semibold text-foreground">Description (French)</FormLabel>
                      <FormControl>
                        <Textarea
                          placeholder="Decrivez le produit en francais..."
                          className="min-h-[120px] bg-background border-2 border-border focus:border-emerald-500 rounded-xl shadow-sm resize-none"
                          {...field}
                          value={field.value || ""}
                        />
                      </FormControl>
                      <FormDescription className="text-sm text-muted-foreground">
                        Used for French locale display when available
                      </FormDescription>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>

              {displayName && (
                <div className="p-4 rounded-xl bg-gradient-to-r from-emerald-50 to-teal-50 dark:from-emerald-900/20 dark:to-teal-900/20 border border-emerald-200 dark:border-emerald-700">
                  <div className="flex items-center gap-3">
                    <CheckCircle className="h-5 w-5 text-emerald-600 dark:text-emerald-400" />
                    <div>
                      <p className="font-medium text-emerald-900 dark:text-emerald-100">Great! Your product name looks good</p>
                      <p className="text-sm text-emerald-700 dark:text-emerald-200">SKU will be auto-generated based on this name</p>
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
              <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-gradient-to-br from-emerald-500 via-teal-600 to-cyan-700 shadow-lg shadow-emerald-500/25 mb-4">
                <Hash className="w-8 h-8 text-white" />
              </div>
              <h3 className="text-2xl font-bold text-foreground mb-2">Product Details</h3>
              <p className="text-muted-foreground">Add unique identifiers and specifications</p>
            </div>

            <div className="grid gap-6 md:grid-cols-2">
              <FormField
                control={form.control}
                name="sku"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel className="text-base font-semibold text-foreground flex items-center gap-2">
                      <Hash className="h-4 w-4 text-emerald-600" />
                      SKU (Stock Keeping Unit) *
                    </FormLabel>
                    <FormControl>
                      <div className="space-y-3">
                        <div className="relative">
                          <Input
                            placeholder="AUTO-GENERATED"
                            className="h-12 bg-background border-2 border-border focus:border-emerald-500 rounded-xl shadow-sm font-mono text-center font-bold tracking-wider"
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
                            className="flex-1 border-emerald-200 hover:border-emerald-300 hover:bg-emerald-50 dark:hover:bg-emerald-900/20"
                          >
                            <Zap className="h-4 w-4 mr-2" />
                            Generate New SKU
                          </Button>
                        </div>
                      </div>
                    </FormControl>
                    <FormDescription className="text-sm text-muted-foreground">
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
                    <FormLabel className="text-base font-semibold text-foreground flex items-center gap-2">
                      <Barcode className="h-4 w-4 text-emerald-600" />
                      Barcode
                    </FormLabel>
                    <FormControl>
                      <Input
                        placeholder="UPC, EAN, or other barcode"
                        className="h-12 bg-background border-2 border-border focus:border-emerald-500 rounded-xl shadow-sm font-mono"
                        {...field}
                        value={field.value ?? ""}
                      />
                    </FormControl>
                    <FormDescription className="text-sm text-muted-foreground">
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
                    <FormLabel className="text-base font-semibold text-foreground flex items-center gap-2">
                      <Tags className="h-4 w-4 text-emerald-600" />
                      Category
                    </FormLabel>
                    <Select onValueChange={field.onChange} value={field.value || undefined}>
                      <FormControl>
                        <SelectTrigger className="h-12 bg-background border-2 border-border focus:border-emerald-500 rounded-xl shadow-sm">
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
                    <FormDescription className="text-sm text-muted-foreground">
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
                    <FormLabel className="text-base font-semibold text-foreground flex items-center gap-2">
                      <Building className="h-4 w-4 text-emerald-600" />
                      Brand
                    </FormLabel>
                    <Select onValueChange={field.onChange} value={field.value || undefined}>
                      <FormControl>
                        <SelectTrigger className="h-12 bg-background border-2 border-border focus:border-emerald-500 rounded-xl shadow-sm">
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
                    <FormDescription className="text-sm text-muted-foreground">
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
              <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-gradient-to-br from-emerald-500 via-teal-600 to-cyan-700 shadow-lg shadow-emerald-500/25 mb-4">
                <DollarSign className="w-8 h-8 text-white" />
              </div>
              <h3 className="text-2xl font-bold text-foreground mb-2">Pricing & Units</h3>
              <p className="text-muted-foreground">Set your costs, prices, and units of measurement</p>
            </div>

            <div className="grid gap-6 md:grid-cols-2">
              <FormField
                control={form.control}
                name="costPrice"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel className="text-base font-semibold text-foreground flex items-center gap-2">
                      <Calculator className="h-4 w-4 text-emerald-600" />
                      Cost Price *
                    </FormLabel>
                    <FormControl>
                      <div className="relative">
                        <DollarSign className="absolute left-4 top-1/2 transform -translate-y-1/2 h-5 w-5 text-muted-foreground" />
                        <Input
                          type="number"
                          placeholder="0.00"
                          min="0"
                          step="0.01"
                          className="pl-12 h-12 text-lg bg-white/80 dark:bg-slate-800/80 backdrop-blur-sm border-2 border-slate-200 dark:border-slate-700 focus:border-emerald-500 dark:focus:border-emerald-400 rounded-xl shadow-sm"
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
                    <FormDescription className="text-sm text-muted-foreground">
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
                    <FormLabel className="text-base font-semibold text-foreground flex items-center gap-2">
                      <ShoppingCart className="h-4 w-4 text-emerald-600" />
                      Selling Price *
                    </FormLabel>
                    <FormControl>
                      <div className="relative">
                        <DollarSign className="absolute left-4 top-1/2 transform -translate-y-1/2 h-5 w-5 text-muted-foreground" />
                        <Input
                          type="number"
                          placeholder="0.00"
                          min="0"
                          step="0.01"
                          className="pl-12 h-12 text-lg bg-white/80 dark:bg-slate-800/80 backdrop-blur-sm border-2 border-slate-200 dark:border-slate-700 focus:border-emerald-500 dark:focus:border-emerald-400 rounded-xl shadow-sm"
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
                    <FormDescription className="text-sm text-muted-foreground">
                      Price customers will pay
                    </FormDescription>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            {/* Profit Analysis */}
            {(costPrice > 0 || sellingPrice > 0) && (
              <div className="p-6 rounded-2xl bg-gradient-to-br from-emerald-50 to-teal-50 dark:from-emerald-900/20 dark:to-teal-900/20 border-2 border-emerald-200 dark:border-emerald-700">
                <div className="flex items-center gap-3 mb-4">
                  <div className="p-3 rounded-xl bg-emerald-100 dark:bg-emerald-900/30">
                    <TrendingUp className="h-6 w-6 text-emerald-600 dark:text-emerald-400" />
                  </div>
                  <h4 className="text-xl font-bold text-emerald-900 dark:text-emerald-100">Profit Analysis</h4>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-6">
                  <div className="text-center">
                    <div className="text-sm text-emerald-600 dark:text-emerald-400 font-medium mb-1">Cost Price</div>
                    <div className="text-2xl font-bold text-emerald-900 dark:text-emerald-100">
                      {formatCurrency(costPrice)}
                    </div>
                  </div>
                  <div className="text-center">
                    <div className="text-sm text-emerald-600 dark:text-emerald-400 font-medium mb-1">Selling Price</div>
                    <div className="text-2xl font-bold text-emerald-900 dark:text-emerald-100">
                      {formatCurrency(sellingPrice)}
                    </div>
                  </div>
                  <div className="text-center">
                    <div className="text-sm text-emerald-600 dark:text-emerald-400 font-medium mb-1 flex items-center justify-center gap-1">
                      <Percent className="h-4 w-4" />
                      Profit Margin
                    </div>
                    <div className={`text-2xl font-bold ${Number(profitMargin) > 0
                      ? 'text-emerald-900 dark:text-emerald-100'
                      : 'text-red-600 dark:text-red-400'
                      }`}>
                      {profitMargin}%
                    </div>
                    <div className="text-sm text-emerald-700 dark:text-emerald-300 mt-1">
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
                    <FormLabel className="text-base font-semibold text-foreground flex items-center gap-2">
                      <Scale className="h-4 w-4 text-emerald-600" />
                      Unit of Measure
                    </FormLabel>
                    <Select onValueChange={field.onChange} value={field.value || undefined}>
                      <FormControl>
                        <SelectTrigger className="h-12 bg-white/80 dark:bg-slate-800/80 backdrop-blur-sm border-2 border-slate-200 dark:border-slate-700 focus:border-emerald-500 dark:focus:border-emerald-400 rounded-xl shadow-sm">
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
                    <FormDescription className="text-sm text-muted-foreground">
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
                    <FormLabel className="text-base font-semibold text-foreground flex items-center gap-2">
                      <Percent className="h-4 w-4 text-emerald-600" />
                      Tax Rate
                    </FormLabel>
                    <Select onValueChange={field.onChange} value={field.value || undefined}>
                      <FormControl>
                        <SelectTrigger className="h-12 bg-white/80 dark:bg-slate-800/80 backdrop-blur-sm border-2 border-slate-200 dark:border-slate-700 focus:border-emerald-500 dark:focus:border-emerald-400 rounded-xl shadow-sm">
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
                    <FormDescription className="text-sm text-muted-foreground">
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
              <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-gradient-to-br from-emerald-500 via-teal-600 to-cyan-700 shadow-lg shadow-emerald-500/25 mb-4">
                <Boxes className="w-8 h-8 text-white" />
              </div>
              <h3 className="text-2xl font-bold text-foreground mb-2">Inventory Settings</h3>
              <p className="text-muted-foreground">Configure stock levels and tracking options</p>
            </div>

            <div className="grid gap-6 md:grid-cols-2">
              <FormField
                control={form.control}
                name="minStockLevel"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel className="text-base font-semibold text-foreground flex items-center gap-2">
                      <AlertTriangle className="h-4 w-4 text-emerald-600" />
                      Minimum Stock Level
                    </FormLabel>
                    <FormControl>
                      <Input
                        type="number"
                        placeholder="0"
                        min="0"
                        className="h-12 bg-background border-2 border-border focus:border-emerald-500 rounded-xl shadow-sm"
                        {...field}
                        value={field.value ?? 0}
                        onChange={(e) => field.onChange(Number(e.target.value) || 0)}
                      />
                    </FormControl>
                    <FormDescription className="text-sm text-muted-foreground">
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
                    <FormLabel className="text-base font-semibold text-foreground flex items-center gap-2">
                      <CheckCircle className="h-4 w-4 text-emerald-600" />
                      Maximum Stock Level
                    </FormLabel>
                    <FormControl>
                      <Input
                        type="number"
                        placeholder="0"
                        min="0"
                        className="h-12 bg-background border-2 border-border focus:border-emerald-500 rounded-xl shadow-sm"
                        {...field}
                        value={field.value ?? 0}
                        onChange={(e) => field.onChange(Number(e.target.value) || 0)}
                      />
                    </FormControl>
                    <FormDescription className="text-sm text-muted-foreground">
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
                    <FormLabel className="text-base font-semibold text-foreground flex items-center gap-2">
                      <Scale className="h-4 w-4 text-emerald-600" />
                      Weight (kg)
                    </FormLabel>
                    <FormControl>
                      <Input
                        type="number"
                        placeholder="0.0"
                        min="0"
                        step="0.1"
                        className="h-12 bg-background border-2 border-border focus:border-emerald-500 rounded-xl shadow-sm"
                        {...field}
                        value={field.value ?? 0}
                        onChange={(e) => field.onChange(Number(e.target.value) || 0)}
                      />
                    </FormControl>
                    <FormDescription className="text-sm text-slate-500 dark:text-slate-400">
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
                    <FormLabel className="text-base font-semibold text-foreground flex items-center gap-2">
                      <Ruler className="h-4 w-4 text-emerald-600" />
                      Dimensions
                    </FormLabel>
                    <FormControl>
                      <Input
                        placeholder="L x W x H (e.g., 10 x 5 x 3 cm)"
                        className="h-12 bg-background border-2 border-border focus:border-emerald-500 rounded-xl shadow-sm"
                        {...field}
                        value={field.value ?? ""}
                      />
                    </FormControl>
                    <FormDescription className="text-sm text-muted-foreground">
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
                  <FormItem className="flex flex-row items-center justify-between rounded-2xl border-2 border-border p-6 bg-card">
                    <div className="space-y-1">
                      <FormLabel className="text-lg text-foreground font-semibold flex items-center gap-2">
                        <Activity className="h-5 w-5 text-emerald-600" />
                        Active Product
                      </FormLabel>
                      <FormDescription className="text-muted-foreground">
                        Enable this product for sales and inventory tracking
                      </FormDescription>
                    </div>
                    <FormControl>
                      <Switch checked={field.value ?? false} onCheckedChange={field.onChange} className="data-[state=checked]:bg-emerald-500" />
                    </FormControl>
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="isSerialTracked"
                render={({ field }) => (
                  <FormItem className="flex flex-row items-center justify-between rounded-2xl border-2 border-border p-6 bg-card">
                    <div className="space-y-1">
                      <FormLabel className="text-lg text-foreground font-semibold flex items-center gap-2">
                        <Hash className="h-5 w-5 text-emerald-600" />
                        Serial Number Tracking
                      </FormLabel>
                      <FormDescription className="text-muted-foreground">
                        Track individual serial numbers for this product
                      </FormDescription>
                    </div>
                    <FormControl>
                      <Switch checked={field.value ?? false} onCheckedChange={field.onChange} className="data-[state=checked]:bg-emerald-500" />
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
              <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-gradient-to-br from-emerald-500 via-teal-600 to-cyan-700 shadow-lg shadow-emerald-500/25 mb-4">
                <ImageIcon className="w-8 h-8 text-white" />
              </div>
              <h3 className="text-2xl font-bold text-foreground mb-2">Product Media</h3>
              <p className="text-muted-foreground">Upload high-quality images to showcase your product</p>
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
                    console.log('Upload started - setting isImageUploading to true')
                    setIsImageUploading(true)
                  }}
                  onUploadComplete={() => {
                    console.log('Upload completed - setting isImageUploading to false')
                    setIsImageUploading(false)
                  }}
                  onUploadError={() => {
                    console.log('Upload error - setting isImageUploading to false')
                    setIsImageUploading(false)
                  }}
                />
              </div>

              <div className="p-6 rounded-2xl bg-gradient-to-r from-emerald-50 to-teal-50 dark:from-emerald-900/20 dark:to-teal-900/20 border-2 border-emerald-200 dark:border-emerald-700">
                <div className="flex items-start gap-3">
                  <Lightbulb className="h-6 w-6 text-emerald-600 dark:text-emerald-400 mt-1 flex-shrink-0" />
                  <div className="text-left">
                    <h4 className="font-semibold text-emerald-900 dark:text-emerald-100 mb-2">Image Tips for Better Sales</h4>
                    <ul className="text-sm text-emerald-800 dark:text-emerald-200 space-y-1">
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
      <div className="min-h-screen bg-gradient-to-br from-slate-50 via-emerald-50 to-teal-50 dark:from-slate-950 dark:via-slate-900 dark:to-slate-800">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 py-4 sm:py-8">
          {/* Header */}
          <div className="mb-8">
            <div className="flex items-center gap-4 mb-6">
              <Button
                onClick={handleCancel}
                variant="ghost"
                size="sm"
                className="text-slate-600 hover:text-slate-900 dark:text-slate-400 dark:hover:text-slate-100"
              >
                <ArrowLeft className="w-4 h-4 mr-2" />
                Back to Items
              </Button>
            </div>

            <div className="flex items-center gap-4">
              <div className="p-3 rounded-xl bg-gradient-to-br from-emerald-500 via-teal-600 to-cyan-700 shadow-lg shadow-emerald-500/25">
                <Package className="w-8 h-8 text-white" />
              </div>
              <div>
                <h1 className="text-3xl sm:text-4xl font-bold bg-gradient-to-r from-emerald-600 via-teal-600 to-cyan-600 bg-clip-text text-transparent">
                  {isEditMode ? 'Edit Product' : 'Create New Product'}
                </h1>
                <p className="text-muted-foreground mt-1">
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
                <span className="text-sm font-medium text-foreground">
                  Step {currentStepIndex + 1} of {FORM_STEPS.length}
                </span>
                <span className="text-sm text-muted-foreground">
                  {Math.round(progressPercentage)}% Complete
                </span>
              </div>
              <div className="w-full bg-muted rounded-full h-2 overflow-hidden">
                <div
                  className="h-full bg-gradient-to-r from-emerald-500 via-teal-600 to-cyan-700 rounded-full transition-all duration-500 ease-out"
                  style={{ width: `${progressPercentage}%` }}
                />
              </div>
            </div>

            {/* Step Navigation */}
            <div className="mt-6 grid grid-cols-5 gap-2">
              {FORM_STEPS.map((step, index) => {
                const isActive = step.id === currentStep
                const isCompleted = completedSteps.has(step.id)
                const isAccessible = index <= currentStepIndex || isCompleted

                return (
                  <button
                    key={step.id}
                    onClick={() => isAccessible && handleStepClick(step.id)}
                    disabled={!isAccessible}
                    className={`p-3 rounded-xl border-2 transition-all duration-200 text-left ${isActive
                      ? 'border-emerald-500 bg-emerald-50 dark:bg-emerald-900/20'
                      : isCompleted
                        ? 'border-emerald-200 bg-emerald-50 dark:bg-emerald-900/20 hover:border-emerald-300'
                        : isAccessible
                          ? 'border-border bg-background hover:border-emerald-300'
                          : 'border-muted bg-muted opacity-50 cursor-not-allowed'
                      }`}
                  >
                    <div className="flex items-center gap-2 mb-1">
                      <div className={`p-1 rounded-lg ${isActive
                        ? 'bg-emerald-500 text-white'
                        : isCompleted
                          ? 'bg-emerald-500 text-white'
                          : 'bg-muted text-muted-foreground'
                        }`}>
                        {isCompleted ? <CheckCheck className="h-3 w-3" /> : <step.icon className="h-3 w-3" />}
                      </div>
                      <span className={`text-xs font-medium ${isActive ? 'text-emerald-700 dark:text-emerald-300' : 'text-foreground'
                        }`}>
                        {step.title}
                      </span>
                    </div>
                    <p className={`text-xs ${isActive ? 'text-emerald-600 dark:text-emerald-400' : 'text-muted-foreground'
                      }`}>
                      {step.description}
                    </p>
                  </button>
                )
              })}
            </div>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-4 gap-8">
            {/* Main Form */}
            <div className="lg:col-span-3">
              <Card className="bg-card backdrop-blur-lg border shadow-2xl rounded-3xl overflow-hidden">
                <CardContent className="p-8">
                  <Form {...form}>
                    <form onSubmit={form.handleSubmit(handleSubmit, (errors) => {
                      console.error('Form validation errors:', errors)
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
                          render={({ field }) => {
                            console.log('🔍 Hidden unitId field render:', field.value)
                            return <input {...field} value={field.value ?? ""} />
                          }}
                        />
                        <FormField
                          control={form.control}
                          name="taxRateId"
                          render={({ field }) => {
                            console.log('🔍 Hidden taxRateId field render:', field.value)
                            return <input {...field} value={field.value ?? ""} />
                          }}
                        />
                        <FormField
                          control={form.control}
                          name="costPrice"
                          render={({ field }) => {
                            console.log('🔍 Hidden costPrice field render:', field.value)
                            return <input type="number" {...field} />
                          }}
                        />
                        <FormField
                          control={form.control}
                          name="sellingPrice"
                          render={({ field }) => {
                            console.log('🔍 Hidden sellingPrice field render:', field.value)
                            return <input type="number" {...field} />
                          }}
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
                      <div className="flex justify-between items-center pt-8 border-t border-slate-200 dark:border-slate-700">
                        <Button
                          type="button"
                          onClick={handlePrevious}
                          disabled={currentStepIndex === 0}
                          variant="outline"
                          className="px-6 py-3"
                        >
                          <ArrowLeft className="w-4 h-4 mr-2" />
                          Previous
                        </Button>

                        {currentStepIndex === FORM_STEPS.length - 1 ? (
                          <Button
                            type="submit"
                            disabled={form.formState.isSubmitting || isLoading || isImageUploading}
                            onClick={async () => {
                              console.log('Create Product button clicked!')
                              console.log('Current form values:', form.getValues())

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
                                const isValid = await form.trigger()
                                console.log('Form validation after auto-fill:', isValid)
                              }
                            }}
                            className="px-8 py-3 bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-700 hover:to-teal-700 text-white shadow-lg"
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
                            className="px-6 py-3 bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-700 hover:to-teal-700 text-white shadow-lg"
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
              <Card className="bg-card backdrop-blur-lg border shadow-2xl rounded-3xl overflow-hidden sticky top-8">
                <div className="bg-gradient-to-r from-emerald-50/50 to-teal-50/50 dark:from-emerald-950/50 dark:to-teal-950/50 px-6 py-4 border-b border-border">
                  <CardTitle className="text-lg font-semibold text-foreground flex items-center gap-2">
                    <Eye className="h-5 w-5 text-emerald-600 dark:text-emerald-400" />
                    Live Preview
                  </CardTitle>
                  <CardDescription className="text-muted-foreground mt-1">
                    See how your product will look
                  </CardDescription>
                </div>
                <CardContent className="p-6 space-y-6">
                  {/* Product Image and Name */}
                  <div className="text-center space-y-4">
                    <div className="relative mx-auto w-32 h-32 rounded-2xl overflow-hidden border-4 border-border shadow-xl">
                      <img
                        src={itemImageUrl || DEFAULT_IMAGE_URL}
                        alt={displayName || "Product preview"}
                        className="w-full h-full object-cover"
                      />
                      <div className="absolute inset-0 bg-gradient-to-t from-black/20 to-transparent" />
                    </div>
                    <div>
                      <h3 className="font-bold text-foreground text-xl mb-1">
                        {displayName || "New Product"}
                      </h3>
                      {sku && (
                        <p className="text-sm text-muted-foreground font-mono bg-muted px-2 py-1 rounded-lg inline-block">
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
                        ? "bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-300 border-emerald-200 dark:border-emerald-700"
                        : "bg-muted text-muted-foreground border-border"
                        }`}
                    >
                      <div className={`w-2 h-2 rounded-full mr-2 ${isActive ? 'bg-emerald-500' : 'bg-muted-foreground'}`}></div>
                      {isActive ? "Active Product" : "Inactive Product"}
                    </Badge>
                  </div>

                  {/* Pricing Preview */}
                  {(costPrice > 0 || sellingPrice > 0) && (
                    <div className="space-y-3">
                      <h4 className="text-sm font-semibold text-foreground uppercase tracking-wide">
                        Pricing Overview
                      </h4>
                      <div className="space-y-3">
                        <div className="flex justify-between items-center p-3 rounded-xl bg-muted/50">
                          <span className="text-sm text-muted-foreground">Cost Price</span>
                          <span className="font-semibold text-foreground">
                            {formatCurrency(costPrice)}
                          </span>
                        </div>
                        <div className="flex justify-between items-center p-3 rounded-xl bg-muted/50">
                          <span className="text-sm text-muted-foreground">Selling Price</span>
                          <span className="font-semibold text-emerald-600 dark:text-emerald-400">
                            {formatCurrency(sellingPrice)}
                          </span>
                        </div>
                        {Number(profitMargin) !== 0 && (
                          <div className="flex justify-between items-center p-3 rounded-xl bg-emerald-50/80 dark:bg-emerald-900/20">
                            <span className="text-sm text-emerald-600 dark:text-emerald-400">Profit Margin</span>
                            <span className={`font-semibold ${Number(profitMargin) > 0
                              ? 'text-emerald-600 dark:text-emerald-400'
                              : 'text-red-600 dark:text-red-400'
                              }`}>
                              {profitMargin}%
                            </span>
                          </div>
                        )}
                      </div>
                    </div>
                  )}

                  {/* Progress Summary */}
                  <div className="pt-4 border-t border-border">
                    <div className="space-y-2">
                      <div className="flex justify-between text-sm">
                        <span className="text-muted-foreground">Completion</span>
                        <span className="font-medium text-foreground">
                          {Math.round(progressPercentage)}%
                        </span>
                      </div>
                      <Progress value={progressPercentage} className="h-2" />
                    </div>
                    <p className="text-xs text-muted-foreground text-center mt-3">
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
