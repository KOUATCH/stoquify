"use client"

import { updateItemFromFormAction } from "@/actions/item/items"
import EnhancedImageUploadButton from "@/components/FormInputs/EnhancedImageUploadButton"
import {
  ItemReferenceSelect,
  itemReferenceLabel,
  type ItemReferenceSource,
} from "@/components/inventory/item-form/ItemReferenceSelect"
import { useNotifications } from "@/components/notifications/NotificationProvider"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Switch } from "@/components/ui/switch"
import { Textarea } from "@/components/ui/textarea"
import {
  type UpdateItemFromFormInput,
  updateItemFromFormSchema,
} from "@/lib/item/schemas"
import type { ItemEditDTO } from "@/services/item/item.service"
import { zodResolver } from "@hookform/resolvers/zod"
import {
  AlertCircle,
  ArrowLeft,
  Boxes,
  CheckCircle2,
  CircleDollarSign,
  ImageIcon,
  Loader2,
  PackageCheck,
  Save,
  ScanBarcode,
  Shapes,
} from "lucide-react"
import Image from "next/image"
import { useEffect, useMemo, useRef, useState } from "react"
import { Controller, type FieldErrors, useForm } from "react-hook-form"

export type ItemEditReference = ItemReferenceSource

interface ModernItemFormForEditingProps {
  itemData: ItemEditDTO
  initialBrandData: ItemEditReference[]
  initialUnitData: ItemEditReference[]
  initialTaxRateData: ItemEditReference[]
  initialCategoryData: ItemEditReference[]
  onCancel: () => void
  onSaved: (item: ItemEditDTO) => void
}

const sections = [
  { id: "basic", label: "Basic information", icon: PackageCheck },
  { id: "identity", label: "Identity", icon: ScanBarcode },
  { id: "pricing", label: "Pricing & tax", icon: CircleDollarSign },
  { id: "classification", label: "Classification", icon: Shapes },
  { id: "inventory", label: "Inventory policy", icon: Boxes },
  { id: "lifecycle", label: "Lifecycle & tracking", icon: CheckCircle2 },
] as const

type SectionId = (typeof sections)[number]["id"]

const formSurfaceClass = "dashboard-glass-panel rounded-lg text-[var(--dash-text)]"
const inputClass =
  "dashboard-control h-11 rounded-lg border-[var(--dash-border-subtle)] text-[var(--dash-text)] shadow-none placeholder:text-[var(--dash-text-faint)] focus:border-[var(--dash-brand)] focus-visible:ring-[var(--dash-brand)]/25"
const textareaClass =
  "dashboard-control min-h-28 rounded-lg border-[var(--dash-border-subtle)] text-[var(--dash-text)] shadow-none placeholder:text-[var(--dash-text-faint)] focus:border-[var(--dash-brand)] focus-visible:ring-[var(--dash-brand)]/25"
const insetClass =
  "rounded-lg border border-[var(--dash-border-subtle)] bg-[rgba(24,38,45,0.68)] text-[var(--dash-text)] shadow-[inset_0_1px_0_rgba(255,255,255,0.055)]"
const primaryButtonClass =
  "!rounded-lg !border !border-[var(--dash-brand)] !bg-[var(--dash-brand)] !text-white shadow-[0_16px_34px_rgba(47,125,246,0.22)] hover:!border-[var(--dash-brand-strong)] hover:!bg-[var(--dash-brand-strong)] hover:!text-white"
const secondaryButtonClass =
  "!rounded-lg !border !border-[var(--dash-border-subtle)] !bg-[rgba(24,38,45,0.66)] !text-[var(--dash-text-muted)] hover:!border-[var(--dash-brand)] hover:!bg-[var(--dash-brand-soft)] hover:!text-[var(--dash-text)]"
const sectionClass = `${formSurfaceClass} scroll-mt-36 overflow-hidden`
const sectionHeaderClass = "border-b border-[var(--dash-border-subtle)] bg-[rgba(37,57,67,0.62)] p-4 sm:p-6"

function optionalNumber(value: unknown) {
  return value === "" || value === null || value === undefined ? null : Number(value)
}

function defaults(item: ItemEditDTO): UpdateItemFromFormInput {
  return {
    id: item.id,
    updatedAt: item.updatedAt,
    nameEn: item.nameEn,
    nameFr: item.nameFr ?? "",
    descriptionEn: item.descriptionEn ?? "",
    descriptionFr: item.descriptionFr ?? "",
    imageUrls: item.imageUrls,
    retainedImageUrls: item.retainedImageUrls,
    thumbnail: item.imageUrls,
    sku: item.sku,
    barcode: item.barcode ?? "",
    dimensions: item.dimensions ?? "",
    weight: item.weight,
    costPrice: item.costPrice,
    sellingPrice: item.sellingPrice,
    msrp: item.msrp,
    categoryId: item.categoryId,
    brandId: item.brandId,
    unitId: item.unitId,
    taxRateId: item.taxRateId,
    trackInventory: item.trackInventory,
    minStockLevel: item.minStockLevel,
    maxStockLevel: item.maxStockLevel,
    reorderLevel: item.reorderLevel,
    reorderQuantity: item.reorderQuantity,
    isActive: item.isActive,
    isDiscontinued: item.isDiscontinued,
    trackSerialNumbers: item.trackSerialNumbers,
    trackBatches: item.trackBatches,
    trackExpiry: item.trackExpiry,
  }
}

function fieldError(errors: FieldErrors<UpdateItemFromFormInput>, name: keyof UpdateItemFromFormInput) {
  const message = errors[name]?.message
  return typeof message === "string" ? message : null
}

function FormFieldShell({
  id,
  label,
  required,
  hint,
  error,
  children,
}: {
  id: string
  label: string
  required?: boolean
  hint?: string
  error?: string | null
  children: React.ReactNode
}) {
  return (
    <div className="space-y-2">
      <Label htmlFor={id} className="text-sm font-semibold text-[var(--dash-text)]">
        {label}{required ? <span className="ml-1 text-[var(--dash-danger)]">*</span> : null}
      </Label>
      {children}
      {hint && !error ? <p className="text-xs text-[var(--dash-text-soft)]">{hint}</p> : null}
      {error ? <p className="text-sm text-[var(--dash-danger)]" role="alert">{error}</p> : null}
    </div>
  )
}

function ToggleRow({
  id,
  label,
  description,
  checked,
  disabled,
  tone = "brand",
  onCheckedChange,
}: {
  id: string
  label: string
  description: string
  checked: boolean
  disabled?: boolean
  tone?: "brand" | "success" | "warning"
  onCheckedChange: (checked: boolean) => void
}) {
  const checkedClass = checked
    ? tone === "success"
      ? "border-[var(--dash-success)]/40 bg-[var(--dash-success-soft)]"
      : tone === "warning"
        ? "border-[var(--dash-warning)]/40 bg-[var(--dash-warning-soft)]"
        : "border-[var(--dash-brand)]/40 bg-[var(--dash-brand-soft)]"
    : ""
  const switchClass = tone === "success"
    ? "data-[state=checked]:bg-[var(--dash-success)]"
    : tone === "warning"
      ? "data-[state=checked]:bg-[var(--dash-warning)]"
      : "data-[state=checked]:bg-[var(--dash-brand)]"

  return (
    <div className={`${insetClass} ${checkedClass} flex items-start justify-between gap-4 p-4 transition-colors`}>
      <div className="space-y-1">
        <Label htmlFor={id} className="font-semibold text-[var(--dash-text)]">{label}</Label>
        <p className="text-sm text-[var(--dash-text-soft)]">{description}</p>
      </div>
      <Switch className={switchClass} id={id} checked={checked} disabled={disabled} onCheckedChange={onCheckedChange} />
    </div>
  )
}


export default function ModernItemFormForEditing({
  itemData,
  initialBrandData,
  initialUnitData,
  initialTaxRateData,
  initialCategoryData,
  onCancel,
  onSaved,
}: ModernItemFormForEditingProps) {
  const { success, error: notifyError } = useNotifications()
  const [isSaving, setIsSaving] = useState(false)
  const [isImageUploading, setIsImageUploading] = useState(false)
  const [stagedImageUrl, setStagedImageUrl] = useState("")
  const [saveError, setSaveError] = useState<string | null>(null)
  const [activeSection, setActiveSection] = useState<SectionId>("basic")
  const saveLock = useRef(false)

  const form = useForm<UpdateItemFromFormInput>({
    resolver: zodResolver(updateItemFromFormSchema),
    defaultValues: defaults(itemData),
    mode: "onBlur",
  })
  const { errors, isDirty } = form.formState
  const effectiveImage = form.watch("imageUrls")
  const trackInventory = form.watch("trackInventory")

  const dirtyMessage = useMemo(
    () => isDirty ? "Unsaved changes" : "All changes saved",
    [isDirty],
  )

  useEffect(() => {
    const subscription = form.watch(() => setSaveError(null))
    return () => subscription.unsubscribe()
  }, [form])

  useEffect(() => {
    const warnBeforeUnload = (event: BeforeUnloadEvent) => {
      if (!form.formState.isDirty) return
      event.preventDefault()
      event.returnValue = ""
    }
    window.addEventListener("beforeunload", warnBeforeUnload)
    return () => window.removeEventListener("beforeunload", warnBeforeUnload)
  }, [form.formState.isDirty])

  useEffect(() => {
    if (typeof IntersectionObserver === "undefined") return

    const sectionElements = sections
      .map(({ id }) => document.getElementById(id))
      .filter((element): element is HTMLElement => element !== null)
    const observer = new IntersectionObserver((entries) => {
      const visibleSection = entries
        .filter((entry) => entry.isIntersecting)
        .sort((left, right) => right.intersectionRatio - left.intersectionRatio)[0]
      if (visibleSection) setActiveSection(visibleSection.target.id as SectionId)
    }, {
      rootMargin: "-18% 0px -65% 0px",
      threshold: [0.1, 0.35, 0.65],
    })

    sectionElements.forEach((element) => observer.observe(element))
    return () => observer.disconnect()
  }, [])

  const navigateAway = () => {
    if (form.formState.isDirty && !window.confirm("Discard your unsaved item changes?")) return
    onCancel()
  }

  const goToSection = (sectionId: SectionId) => {
    setActiveSection(sectionId)
    document.getElementById(sectionId)?.scrollIntoView({ behavior: "smooth", block: "start" })
  }

  const handleInvalid = () => {
    setSaveError("Review the highlighted fields. Nothing has been saved.")
  }

  const handleValid = async (data: UpdateItemFromFormInput) => {
    if (saveLock.current || isSaving || isImageUploading || !form.formState.isDirty) return

    saveLock.current = true
    setIsSaving(true)
    setSaveError(null)
    try {
      const result = await updateItemFromFormAction({
        ...data,
        imageUrls: effectiveImage,
        thumbnail: effectiveImage,
      })
      if (!result.success) {
        setSaveError(result.error)
        notifyError("Item not saved", result.error)
        return
      }

      form.reset(defaults(result.data))
      success("Item updated", "The item-master changes were saved successfully.")
      onSaved(result.data)
    } catch {
      const message = "The item could not be saved. Your changes are still available; try again."
      setSaveError(message)
      notifyError("Item not saved", message)
    } finally {
      saveLock.current = false
      setIsSaving(false)
    }
  }

  const saveChanges = () => {
    void form.handleSubmit(handleValid, handleInvalid)()
  }

  const stageImage = (url: string) => {
    setStagedImageUrl(url)
    const nextImage = url || itemData.imageUrls
    form.setValue("imageUrls", nextImage, { shouldDirty: nextImage !== itemData.imageUrls, shouldValidate: true })
    form.setValue("thumbnail", nextImage, { shouldDirty: nextImage !== itemData.imageUrls })
  }

  return (
    <div className="dashboard-landing-theme dark min-h-screen overflow-x-clip">
    <form
      aria-label="Edit inventory item"
      className="dashboard-landing-content mx-auto w-full max-w-[88rem] min-w-0 space-y-6 px-4 py-6 pb-40 text-[var(--dash-text)] sm:px-6 sm:py-8 sm:pb-28"
      onSubmit={(event) => event.preventDefault()}
      onKeyDown={(event) => {
        if (event.key === "Enter" && event.target instanceof HTMLInputElement) event.preventDefault()
      }}
    >
      <header className={`${formSurfaceClass} p-5 sm:p-7`}>
        <div className="flex flex-col justify-between gap-5 lg:flex-row lg:items-start">
          <div className="flex items-start gap-4">
            <Button type="button" variant="outline" size="icon" className={secondaryButtonClass} aria-label="Back to items" onClick={navigateAway}>
              <ArrowLeft className="h-4 w-4" />
            </Button>
            <div className="space-y-2">
              <div className="flex flex-wrap items-center gap-2">
                <Badge variant="outline" className="border-[var(--dash-brand)]/40 bg-[var(--dash-brand-soft)] text-[var(--dash-brand-strong)]">Item master</Badge>
                <Badge variant="outline" className={isDirty ? "border-[var(--dash-warning)]/40 bg-[var(--dash-warning-soft)] text-[var(--dash-warning)]" : "border-[var(--dash-success)]/40 bg-[var(--dash-success-soft)] text-[var(--dash-success)]"}>{dirtyMessage}</Badge>
              </div>
              <div>
                <h1 className="text-2xl font-bold tracking-tight text-[var(--dash-text)] sm:text-3xl">
                  Edit {itemData.nameEn}
                </h1>
                <p className="mt-1 max-w-2xl text-sm text-[var(--dash-text-soft)] sm:text-base">
                  Update identity, pricing, classification, policies, media, and lifecycle settings. Stock quantities are managed in stock workflows.
                </p>
              </div>
            </div>
          </div>
          <div className={`${insetClass} px-4 py-3 text-sm`}>
            <p className="font-semibold text-[var(--dash-text)]">SKU {itemData.sku}</p>
            <p className="text-[var(--dash-text-soft)]">Nothing persists until Save changes is clicked.</p>
          </div>
        </div>
      </header>

      {saveError ? (
        <div className="flex items-start gap-3 rounded-lg border border-[var(--dash-danger)]/40 bg-[var(--dash-danger-soft)] p-4 text-sm text-[var(--dash-danger)]" role="alert">
          <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" />
          <div>
            <p className="font-semibold">Changes were not saved</p>
            <p>{saveError}</p>
          </div>
        </div>
      ) : null}

      <div className="space-y-6">
        <nav aria-label="Edit item sections" className="sticky top-3 z-20">
          <Card className={`${formSurfaceClass} overflow-hidden`}>
            <CardContent className="p-3 sm:p-4">
              <div className="mb-3 flex items-center justify-between gap-3 px-1">
                <div className="min-w-0">
                  <p className="text-xs font-bold uppercase tracking-[0.14em] text-[var(--dash-text-faint)]">Form sections</p>
                  <p className="truncate text-sm font-semibold text-[var(--dash-text)]">
                    {sections.find(({ id }) => id === activeSection)?.label}
                  </p>
                </div>
                <span className="shrink-0 rounded-md border border-[var(--dash-border-subtle)] bg-[rgba(24,38,45,0.66)] px-2.5 py-1 text-xs font-semibold text-[var(--dash-text-soft)]">
                  {sections.findIndex(({ id }) => id === activeSection) + 1} of {sections.length}
                </span>
              </div>
              <div className="grid grid-cols-2 gap-2 pb-1 md:grid-cols-3 md:pb-0 xl:grid-cols-6">
                {sections.map(({ id, label, icon: Icon }) => (
                  <Button
                    key={id}
                    type="button"
                    variant="ghost"
                    aria-current={activeSection === id ? "step" : undefined}
                    className={`h-auto min-h-12 min-w-0 justify-start gap-2 whitespace-normal border px-3 py-2 text-left ${activeSection === id
                      ? "border-[var(--dash-brand)]/50 bg-[var(--dash-brand-soft)] text-[var(--dash-text)]"
                      : "border-transparent text-[var(--dash-text-soft)] hover:border-[var(--dash-border-subtle)] hover:bg-[var(--dash-brand-soft)] hover:text-[var(--dash-text)]"
                    }`}
                    onClick={() => goToSection(id)}
                  >
                    <Icon className="h-4 w-4 shrink-0 text-[var(--dash-brand-strong)]" />
                    {label}
                  </Button>
                ))}
              </div>
            </CardContent>
          </Card>
        </nav>

        <div className="space-y-6">
          <Card id="basic" className={sectionClass}>
            <CardHeader className={sectionHeaderClass}>
              <h2 className="font-semibold leading-none tracking-tight text-[var(--dash-text)]">Basic information & image</h2>
              <CardDescription className="text-[var(--dash-text-soft)]">Customer-facing names, descriptions, and the staged product image.</CardDescription>
            </CardHeader>
            <CardContent className="p-4 sm:p-6">
              <div
                data-testid="basic-three-column-layout"
                className="grid gap-5 md:grid-cols-2 xl:grid-cols-[minmax(220px,0.75fr)_minmax(240px,0.95fr)_minmax(0,1.45fr)] xl:items-start"
              >
                <section aria-labelledby="basic-preview-heading" className={`${insetClass} min-w-0 space-y-4 p-4`}>
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <h3 id="basic-preview-heading" className="text-base font-semibold text-[var(--dash-text)]">Current item image</h3>
                      <p className="mt-1 text-sm text-[var(--dash-text-soft)]">The image currently selected for this item.</p>
                    </div>
                    <Badge
                      variant="outline"
                      className={stagedImageUrl
                        ? "shrink-0 border-[var(--dash-warning)]/40 bg-[var(--dash-warning-soft)] text-[var(--dash-warning)]"
                        : "shrink-0 border-[var(--dash-success)]/40 bg-[var(--dash-success-soft)] text-[var(--dash-success)]"
                      }
                    >
                      {stagedImageUrl ? "Staged" : "Saved"}
                    </Badge>
                  </div>
                  <div className="relative aspect-square overflow-hidden rounded-lg border border-[var(--dash-border-subtle)] bg-[rgba(12,20,24,0.38)]">
                    {effectiveImage ? (
                      <Image
                        src={effectiveImage}
                        alt={`${form.watch("nameEn") || "Item"} image`}
                        fill
                        sizes="(min-width: 1280px) 280px, (min-width: 768px) 50vw, 100vw"
                        className="object-cover"
                        unoptimized
                      />
                    ) : (
                      <div className="flex h-full items-center justify-center text-[var(--dash-text-faint)]">
                        <ImageIcon className="h-10 w-10" aria-hidden="true" />
                        <span className="sr-only">No product image</span>
                      </div>
                    )}
                  </div>
                </section>

                <section aria-labelledby="basic-upload-heading" className={`${insetClass} min-w-0 space-y-4 p-4`}>
                  <div>
                    <h3 id="basic-upload-heading" className="text-base font-semibold text-[var(--dash-text)]">Replacement image</h3>
                    <p className="mt-1 text-sm text-[var(--dash-text-soft)]">Upload and review a replacement before saving.</p>
                  </div>
                  <EnhancedImageUploadButton
                    title={stagedImageUrl ? "Replacement image ready" : "Replace product image"}
                    imageUrl={stagedImageUrl}
                    setImageUrl={stageImage}
                    organizationId={itemData.organizationId}
                    endpoint="itemImageUpload"
                    onUploadStart={() => {
                      setIsImageUploading(true)
                      setSaveError(null)
                    }}
                    onUploadComplete={() => setIsImageUploading(false)}
                    onUploadError={() => {
                      setIsImageUploading(false)
                      setSaveError("The replacement image upload failed. The current item image is unchanged.")
                    }}
                  />
                  {fieldError(errors, "imageUrls") ? (
                    <p className="text-sm text-[var(--dash-danger)]" role="alert">{fieldError(errors, "imageUrls")}</p>
                  ) : null}
                  <div className="rounded-lg border border-[var(--dash-brand)]/30 bg-[var(--dash-brand-soft)] p-3">
                    <p className="text-xs leading-5 text-[var(--dash-text-soft)]">
                      Uploading only stages the replacement. The saved image changes exclusively when Save changes is clicked.
                    </p>
                  </div>
                </section>

                <section aria-labelledby="basic-fields-heading" className={`${insetClass} min-w-0 space-y-5 p-4 md:col-span-2 xl:col-span-1`}>
                  <div>
                    <h3 id="basic-fields-heading" className="text-base font-semibold text-[var(--dash-text)]">Names and descriptions</h3>
                    <p className="mt-1 text-sm text-[var(--dash-text-soft)]">Maintain the customer-facing item information in each supported language.</p>
                  </div>
                  <div className="grid gap-5 sm:grid-cols-2 xl:grid-cols-1">
                    <FormFieldShell id="nameEn" label="English name" required error={fieldError(errors, "nameEn")}>
                      <Input id="nameEn" className={inputClass} autoComplete="off" {...form.register("nameEn")} />
                    </FormFieldShell>
                    <FormFieldShell id="nameFr" label="French name" error={fieldError(errors, "nameFr")}>
                      <Input id="nameFr" className={inputClass} autoComplete="off" {...form.register("nameFr")} />
                    </FormFieldShell>
                    <FormFieldShell id="descriptionEn" label="English description" error={fieldError(errors, "descriptionEn")}>
                      <Textarea id="descriptionEn" className={textareaClass} {...form.register("descriptionEn")} />
                    </FormFieldShell>
                    <FormFieldShell id="descriptionFr" label="French description" error={fieldError(errors, "descriptionFr")}>
                      <Textarea id="descriptionFr" className={textareaClass} {...form.register("descriptionFr")} />
                    </FormFieldShell>
                  </div>
                </section>
              </div>
            </CardContent>
          </Card>

          <Card id="identity" className={sectionClass}>
            <CardHeader className={sectionHeaderClass}>
              <h2 className="font-semibold leading-none tracking-tight text-[var(--dash-text)]">Identity & physical details</h2>
              <CardDescription className="text-[var(--dash-text-soft)]">Creation-aligned identifiers and physical attributes. SKU must remain unique in your organization.</CardDescription>
            </CardHeader>
            <CardContent data-testid="identity-fields-grid" className="grid gap-5 p-4 sm:grid-cols-2 sm:p-6 lg:grid-cols-4">
              <FormFieldShell id="sku" label="SKU" required error={fieldError(errors, "sku")}>
                <Input id="sku" className={inputClass} autoComplete="off" {...form.register("sku")} />
              </FormFieldShell>
              <FormFieldShell id="barcode" label="Barcode" error={fieldError(errors, "barcode")}>
                <Input id="barcode" className={inputClass} autoComplete="off" {...form.register("barcode")} />
              </FormFieldShell>
              <FormFieldShell id="dimensions" label="Dimensions" hint="For example: 30 × 20 × 10 cm" error={fieldError(errors, "dimensions")}>
                <Input id="dimensions" className={inputClass} autoComplete="off" {...form.register("dimensions")} />
              </FormFieldShell>
              <FormFieldShell id="weight" label="Weight" hint="Use the organization’s standard unit." error={fieldError(errors, "weight")}>
                <Input id="weight" type="number" min="0" step="0.001" className={inputClass} {...form.register("weight", { setValueAs: optionalNumber })} />
              </FormFieldShell>
            </CardContent>
          </Card>

          <Card id="pricing" className={sectionClass}>
            <CardHeader className={sectionHeaderClass}>
              <h2 className="font-semibold leading-none tracking-tight text-[var(--dash-text)]">Pricing & tax</h2>
              <CardDescription className="text-[var(--dash-text-soft)]">Item-master pricing only; this does not create a sale, purchase, or accounting entry.</CardDescription>
            </CardHeader>
            <CardContent className="grid gap-5 p-4 sm:grid-cols-2 sm:p-6 xl:grid-cols-4">
              <FormFieldShell id="costPrice" label="Cost price" required error={fieldError(errors, "costPrice")}>
                <Input id="costPrice" type="number" min="0" step="0.01" className={inputClass} {...form.register("costPrice", { valueAsNumber: true })} />
              </FormFieldShell>
              <FormFieldShell id="sellingPrice" label="Selling price" required error={fieldError(errors, "sellingPrice")}>
                <Input id="sellingPrice" type="number" min="0" step="0.01" className={inputClass} {...form.register("sellingPrice", { valueAsNumber: true })} />
              </FormFieldShell>
              <FormFieldShell id="msrp" label="MSRP" error={fieldError(errors, "msrp")}>
                <Input id="msrp" type="number" min="0" step="0.01" className={inputClass} {...form.register("msrp", { setValueAs: optionalNumber })} />
              </FormFieldShell>
              <FormFieldShell id="taxRateId" label="Tax rate" error={fieldError(errors, "taxRateId")}>
                <Controller
                  control={form.control}
                  name="taxRateId"
                  render={({ field }) => (
                    <ItemReferenceSelect
                      id="taxRateId"
                      value={field.value}
                      onValueChange={field.onChange}
                      options={initialTaxRateData.map((option) => ({ id: option.id, label: itemReferenceLabel(option, "tax") }))}
                      placeholder="No tax rate"
                      noneLabel="No tax rate"
                      className={inputClass}
                    />
                  )}
                />
              </FormFieldShell>
            </CardContent>
          </Card>

          <Card id="classification" className={sectionClass}>
            <CardHeader className={sectionHeaderClass}>
              <h2 className="font-semibold leading-none tracking-tight text-[var(--dash-text)]">Classification</h2>
              <CardDescription className="text-[var(--dash-text-soft)]">Tenant-scoped category, brand, unit, and tax references are validated again on the server.</CardDescription>
            </CardHeader>
            <CardContent className="grid gap-5 p-4 sm:p-6 md:grid-cols-3">
              {([
                ["categoryId", "Category", initialCategoryData, "category"],
                ["brandId", "Brand", initialBrandData, "brand"],
                ["unitId", "Unit", initialUnitData, "unit"],
              ] as const).map(([name, label, options, kind]) => (
                <FormFieldShell key={name} id={name} label={label} error={fieldError(errors, name)}>
                  <Controller
                    control={form.control}
                    name={name}
                    render={({ field }) => (
                      <ItemReferenceSelect
                        id={name}
                        value={field.value}
                        onValueChange={field.onChange}
                        options={options.map((option) => ({ id: option.id, label: itemReferenceLabel(option, kind) }))}
                        placeholder={`No ${label.toLowerCase()}`}
                        noneLabel={`No ${label.toLowerCase()}`}
                        className={inputClass}
                      />
                    )}
                  />
                </FormFieldShell>
              ))}
            </CardContent>
          </Card>

          <Card id="inventory" className={sectionClass}>
            <CardHeader className={sectionHeaderClass}>
              <h2 className="font-semibold leading-none tracking-tight text-[var(--dash-text)]">Inventory policy</h2>
              <CardDescription className="text-[var(--dash-text-soft)]">Configure thresholds and replenishment policy. On-hand quantity cannot be edited here.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-5 p-4 sm:p-6">
              <Controller
                control={form.control}
                name="trackInventory"
                render={({ field }) => (
                  <ToggleRow
                    id="trackInventory"
                    label="Track inventory"
                    description="Use inventory ledgers and stock controls for this item."
                    checked={field.value}
                    onCheckedChange={(checked) => {
                      field.onChange(checked)
                      if (!checked) {
                        form.setValue("trackSerialNumbers", false, { shouldDirty: true, shouldValidate: true })
                        form.setValue("trackBatches", false, { shouldDirty: true, shouldValidate: true })
                        form.setValue("trackExpiry", false, { shouldDirty: true, shouldValidate: true })
                      }
                    }}
                  />
                )}
              />
              {fieldError(errors, "trackInventory") ? <p className="text-sm text-[var(--dash-danger)]" role="alert">{fieldError(errors, "trackInventory")}</p> : null}
              <div className="grid gap-5 sm:grid-cols-2 xl:grid-cols-4">
                <FormFieldShell id="minStockLevel" label="Minimum stock level" required error={fieldError(errors, "minStockLevel")}>
                  <Input id="minStockLevel" type="number" min="0" step="0.001" className={inputClass} disabled={!trackInventory} {...form.register("minStockLevel", { valueAsNumber: true })} />
                </FormFieldShell>
                <FormFieldShell id="maxStockLevel" label="Maximum stock level" error={fieldError(errors, "maxStockLevel")}>
                  <Input id="maxStockLevel" type="number" min="0" step="0.001" className={inputClass} disabled={!trackInventory} {...form.register("maxStockLevel", { setValueAs: optionalNumber })} />
                </FormFieldShell>
                <FormFieldShell id="reorderLevel" label="Reorder level" required error={fieldError(errors, "reorderLevel")}>
                  <Input id="reorderLevel" type="number" min="0" step="0.001" className={inputClass} disabled={!trackInventory} {...form.register("reorderLevel", { valueAsNumber: true })} />
                </FormFieldShell>
                <FormFieldShell id="reorderQuantity" label="Reorder quantity" error={fieldError(errors, "reorderQuantity")}>
                  <Input id="reorderQuantity" type="number" min="0" step="0.001" className={inputClass} disabled={!trackInventory} {...form.register("reorderQuantity", { setValueAs: optionalNumber })} />
                </FormFieldShell>
              </div>
            </CardContent>
          </Card>

          <Card id="lifecycle" className={sectionClass}>
            <CardHeader className={sectionHeaderClass}>
              <h2 className="font-semibold leading-none tracking-tight text-[var(--dash-text)]">Lifecycle & tracking</h2>
              <CardDescription className="text-[var(--dash-text-soft)]">Tracking-policy changes are rejected if existing inventory evidence would make the change unsafe.</CardDescription>
            </CardHeader>
            <CardContent className="grid gap-4 p-4 sm:grid-cols-2 sm:p-6 xl:grid-cols-3">
              <Controller control={form.control} name="isActive" render={({ field }) => (
                <ToggleRow id="isActive" label="Active item" description="Available for supported operational workflows." checked={field.value} tone="success" onCheckedChange={field.onChange} />
              )} />
              <Controller control={form.control} name="isDiscontinued" render={({ field }) => (
                <ToggleRow id="isDiscontinued" label="Discontinued" description="Retain history while preventing normal future use." checked={field.value} tone="warning" onCheckedChange={(checked) => {
                  field.onChange(checked)
                  if (checked) form.setValue("isActive", false, { shouldDirty: true, shouldValidate: true })
                }} />
              )} />
              <Controller control={form.control} name="trackSerialNumbers" render={({ field }) => (
                <ToggleRow id="trackSerialNumbers" label="Serial number tracking" description="Require serial-level evidence in supported stock workflows." checked={field.value} disabled={!trackInventory} onCheckedChange={field.onChange} />
              )} />
              <Controller control={form.control} name="trackBatches" render={({ field }) => (
                <ToggleRow id="trackBatches" label="Batch tracking" description="Capture batch identity in supported stock workflows." checked={field.value} disabled={!trackInventory} onCheckedChange={field.onChange} />
              )} />
              <Controller control={form.control} name="trackExpiry" render={({ field }) => (
                <ToggleRow id="trackExpiry" label="Expiry tracking" description="Capture expiry evidence in supported stock workflows." checked={field.value} disabled={!trackInventory} onCheckedChange={field.onChange} />
              )} />
            </CardContent>
          </Card>
        </div>
      </div>

      <div className="fixed inset-x-0 bottom-0 z-30 border-t border-[var(--dash-border-subtle)] bg-[rgba(24,38,45,0.95)] px-4 py-3 text-[var(--dash-text)] shadow-[0_-18px_50px_rgba(5,12,16,0.32)] backdrop-blur-xl lg:pl-[var(--sidebar-width,0px)]">
        <div className="mx-auto flex w-full max-w-[88rem] flex-col-reverse gap-3 sm:flex-row sm:items-center sm:justify-between">
          <p className="text-sm text-[var(--dash-text-soft)]" aria-live="polite">
            {isImageUploading ? "Uploading replacement image…" : isDirty ? "Changes are staged and recoverable." : "No unsaved changes."}
          </p>
          <div className="flex gap-3">
            <Button type="button" variant="outline" className={`${secondaryButtonClass} flex-1 sm:flex-none`} disabled={isSaving} onClick={navigateAway}>
              Cancel
            </Button>
            <Button
              type="button"
              className={`${primaryButtonClass} flex-1 gap-2 sm:flex-none`}
              disabled={!isDirty || isSaving || isImageUploading}
              onClick={saveChanges}
            >
              {isSaving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
              {isSaving ? "Saving…" : "Save changes"}
            </Button>
          </div>
        </div>
      </div>
    </form>
    </div>
  )
}