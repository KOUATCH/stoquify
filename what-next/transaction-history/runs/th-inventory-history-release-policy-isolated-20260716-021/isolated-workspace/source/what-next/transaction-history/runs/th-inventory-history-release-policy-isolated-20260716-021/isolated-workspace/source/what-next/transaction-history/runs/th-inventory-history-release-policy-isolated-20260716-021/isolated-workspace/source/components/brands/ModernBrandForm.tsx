"use client"

import { zodResolver } from "@hookform/resolvers/zod"
import type { CSSProperties } from "react"
import {
  Activity,
  AlertTriangle,
  Archive,
  ArrowLeft,
  Building2,
  CheckCircle,
  Globe2,
  Link2,
  Loader2,
  Package,
  Save,
  Sparkles,
  Star,
  Tags,
} from "lucide-react"
import { useRouter } from "next/navigation"
import { useMemo, useState } from "react"
import { useForm } from "react-hook-form"
import { z } from "zod"

import { BrandCreateSchema } from "@/services/brand/brand.schemas"
import { useCreateBrand, useUpdateBrand } from "@/hooks/useBrands"
import type { BrandDTO } from "@/types/brand"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form"
import { Input } from "@/components/ui/input"
import { Switch } from "@/components/ui/switch"
import { Textarea } from "@/components/ui/textarea"

const brandFormSchema = BrandCreateSchema.extend({
  isActive: z.boolean().default(true),
})

type BrandFormValues = z.infer<typeof brandFormSchema>

type ModernBrandFormProps = {
  mode?: "create" | "edit"
  organizationId: string
  initialData?: BrandDTO | null
  returnHref?: string
}

function initials(name: string) {
  return name
    .split(" ")
    .filter(Boolean)
    .map((part) => part[0])
    .join("")
    .toUpperCase()
    .slice(0, 2)
}

function slugPreview(name: string) {
  return name
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-$)+/g, "")
}

export function ModernBrandForm({
  mode = "create",
  organizationId,
  initialData,
  returnHref = "/dashboard/inventory/brands",
}: ModernBrandFormProps) {
  const router = useRouter()
  const createBrand = useCreateBrand()
  const updateBrand = useUpdateBrand()
  const [serverError, setServerError] = useState<string | null>(null)

  const isEdit = mode === "edit" && Boolean(initialData)
  const isSubmitting = createBrand.isPending || updateBrand.isPending

  const form = useForm<BrandFormValues>({
    resolver: zodResolver(brandFormSchema),
    defaultValues: {
      nameEn: initialData?.nameEn ?? "",
      nameFr: initialData?.nameFr ?? "",
      descriptionEn: initialData?.descriptionEn ?? "",
      descriptionFr: initialData?.descriptionFr ?? "",
      logoUrl: initialData?.logoUrl ?? "",
      isActive: initialData?.isActive ?? true,
    },
    mode: "onBlur",
  })

  const watchedName = form.watch("nameEn")
  const watchedNameFr = form.watch("nameFr")
  const watchedLogoUrl = form.watch("logoUrl")
  const watchedDescription = form.watch("descriptionEn")
  const watchedDescriptionFr = form.watch("descriptionFr")
  const watchedStatus = form.watch("isActive")
  const previewSlug = useMemo(() => slugPreview(watchedName || ""), [watchedName])
  const hasName = Boolean(watchedName?.trim())
  const hasFrenchName = Boolean(watchedNameFr?.trim())
  const hasLogo = Boolean(watchedLogoUrl?.trim())
  const hasDescription = Boolean(watchedDescription?.trim())
  const hasFrenchDescription = Boolean(watchedDescriptionFr?.trim())
  const completionCount = [hasName, hasFrenchName, hasLogo, hasDescription, hasFrenchDescription].filter(Boolean).length

  const statsCards = [
    {
      label: "Brand Identity",
      value: hasName ? "Named" : "Draft",
      detail: hasName ? previewSlug || "Catalog label" : "English name required",
      Icon: Package,
      accent: "var(--dash-brand)",
      soft: "var(--dash-brand-soft)",
      valueClassName: "text-xl",
    },
    {
      label: "Catalog Ready",
      value: hasName && watchedStatus ? "Ready" : "Pending",
      detail: watchedStatus ? "Active workflow" : "Inactive workflow",
      Icon: CheckCircle,
      accent: "var(--dash-success)",
      soft: "var(--dash-success-soft)",
      valueClassName: "text-xl",
    },
    {
      label: "Missing French",
      value: hasFrenchName ? "0" : "1",
      detail: hasFrenchName ? "Bilingual label" : "Add French name",
      Icon: AlertTriangle,
      accent: "var(--dash-warning)",
      soft: "var(--dash-warning-soft)",
      valueClassName: "text-2xl",
    },
    {
      label: "Missing Logo",
      value: hasLogo ? "0" : "1",
      detail: hasLogo ? "Logo linked" : "Optional media",
      Icon: Archive,
      accent: "var(--dash-danger)",
      soft: "var(--dash-danger-soft)",
      valueClassName: "text-2xl",
    },
    {
      label: "Active Brand",
      value: watchedStatus ? "Yes" : "No",
      detail: "Catalog visibility",
      Icon: Activity,
      accent: "var(--dash-info)",
      soft: "var(--dash-info-soft)",
      valueClassName: "text-2xl",
    },
    {
      label: "Profile",
      value: `${completionCount}/5`,
      detail: "Fields completed",
      Icon: Sparkles,
      accent: "var(--dash-spruce)",
      soft: "var(--dash-spruce-soft)",
      valueClassName: "text-2xl",
    },
    {
      label: "Brand Link",
      value: previewSlug ? "Ready" : "Pending",
      detail: previewSlug || "Generated from name",
      Icon: Link2,
      accent: "var(--dash-warm)",
      soft: "var(--dash-warm-soft)",
      valueClassName: "text-xl",
    },
    {
      label: "Localization",
      value: hasFrenchName ? "Full" : "Partial",
      detail: hasFrenchName ? "English/French" : "English only",
      Icon: Star,
      accent: "var(--dash-gold)",
      soft: "var(--dash-gold-soft)",
      valueClassName: "text-xl",
    },
  ]

  async function onSubmit(values: BrandFormValues) {
    setServerError(null)

    const payload = {
      organizationId,
      nameEn: values.nameEn,
      nameFr: values.nameFr || null,
      descriptionEn: values.descriptionEn || null,
      descriptionFr: values.descriptionFr || null,
      logoUrl: values.logoUrl || null,
      isActive: values.isActive,
    }

    try {
      if (isEdit && initialData) {
        await updateBrand.mutateAsync({
          id: initialData.id,
          data: payload,
        })
        router.push(`${returnHref}/${initialData.id}`)
      } else {
        await createBrand.mutateAsync(payload)
        form.reset()
        router.push(returnHref)
      }
      router.refresh()
    } catch (error) {
      setServerError(error instanceof Error ? error.message : "The brand could not be saved.")
    }
  }

  return (
    <div className="dashboard-landing-theme dark min-h-screen overflow-x-hidden">
      <div className="dashboard-landing-content mx-auto flex w-full max-w-[88rem] flex-col gap-6 px-4 py-6 sm:px-6 sm:py-8">
        <section className="flex min-w-0 flex-col gap-5 sm:mb-2 xl:flex-row xl:items-end xl:justify-between">
          <div className="min-w-0 max-w-3xl">
            <div className="dashboard-eyebrow mb-4">
              <span className="dashboard-live-dot" />
              Inventory workspace
            </div>
            <div className="flex min-w-0 items-start gap-4">
              <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-lg border border-[var(--dash-border-subtle)] bg-[var(--dash-brand-soft)] shadow-[0_16px_34px_rgba(47,125,246,0.18)]">
                <Building2 className="h-6 w-6 text-[var(--dash-brand-strong)]" />
              </div>
              <div className="min-w-0">
                <h1 className="text-3xl font-semibold tracking-tight text-[var(--dash-text)] sm:text-4xl">
                  {isEdit ? "Edit Brand" : "Create Brand"}
                </h1>
                <p className="mt-2 max-w-2xl text-sm leading-6 text-[var(--dash-text-soft)] sm:text-base">
                  {isEdit
                    ? `Update ${initialData?.nameEn ?? "this brand"} while preserving item assignments and history.`
                    : "Create a bilingual brand record that product, purchasing, and catalog workflows can reuse."}
                </p>
              </div>
            </div>
          </div>
          <div className="flex w-full shrink-0 flex-col gap-2 sm:w-auto sm:flex-row sm:items-center sm:justify-end">
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => router.push(returnHref)}
              className="dashboard-button-secondary h-9 justify-center rounded-lg"
            >
              <ArrowLeft className="h-4 w-4" />
              Back to Brands
            </Button>
            <Badge
              variant="outline"
              className={
                watchedStatus
                  ? "dashboard-filter-chip flex h-9 w-fit items-center rounded-lg border-[var(--dash-success)] bg-[var(--dash-success-soft)] px-3 text-[var(--dash-success)]"
                  : "dashboard-filter-chip flex h-9 w-fit items-center rounded-lg border-[var(--dash-danger)] bg-[var(--dash-danger-soft)] px-3 text-[var(--dash-danger)]"
              }
            >
              <CheckCircle className="me-1 h-3.5 w-3.5" />
              {watchedStatus ? "Active Catalog Brand" : "Inactive Brand"}
            </Badge>
          </div>
        </section>

        <section className="grid min-w-0 grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-4 2xl:grid-cols-8">
          {statsCards.map(({ label, value, detail, Icon, accent, soft, valueClassName }) => (
            <Card
              key={label}
              className="dashboard-stat-card group relative min-h-[132px] min-w-0 overflow-hidden"
              style={{ "--stat-accent": accent, "--stat-soft": soft } as CSSProperties}
            >
              <div className="absolute inset-x-0 top-0 h-1 bg-[var(--stat-accent)] opacity-80" />
              <div className="absolute right-3 top-3 flex h-8 w-8 items-center justify-center rounded-lg bg-[var(--stat-soft)] text-[var(--stat-accent)] transition-transform duration-200 group-hover:scale-105">
                <Icon className="h-4 w-4" />
              </div>
              <CardHeader className="pb-2 pr-12">
                <CardTitle className="text-[0.68rem] font-semibold uppercase leading-4 tracking-[0.12em] text-[var(--dash-text-faint)]">
                  {label}
                </CardTitle>
              </CardHeader>
              <CardContent className="relative z-10">
                <div className={`${valueClassName} mb-1 truncate font-semibold text-[var(--dash-text)]`}>{value}</div>
                <div className="flex items-center gap-1.5">
                  <span className="h-1.5 w-1.5 rounded-full bg-[var(--stat-accent)]" />
                  <p className="truncate text-xs text-[var(--dash-text-soft)]">{detail}</p>
                </div>
              </CardContent>
            </Card>
          ))}
        </section>

        <div className="grid min-w-0 gap-6 lg:grid-cols-[minmax(0,1fr)_360px]">
          <Card className="dashboard-glass-panel min-w-0 overflow-hidden rounded-lg text-[var(--dash-text)]">
            <CardHeader className="p-5 pb-4">
              <div className="flex min-w-0 flex-col justify-between gap-4 lg:flex-row lg:items-center">
                <div className="min-w-0">
                  <CardTitle className="flex items-center gap-2 text-lg font-semibold text-[var(--dash-text)]">
                    <span className="flex h-9 w-9 items-center justify-center rounded-lg bg-[var(--dash-spruce-soft)] text-[var(--dash-spruce)]">
                      <Building2 className="h-4 w-4" />
                    </span>
                    Brand Inventory
                  </CardTitle>
                  <CardDescription className="mt-2 text-sm text-[var(--dash-text-soft)]">
                    Names, descriptions, logo, and catalog visibility.
                  </CardDescription>
                </div>
                <div className="grid w-full grid-cols-2 gap-2 sm:w-auto sm:flex sm:flex-wrap sm:items-center">
                  <Badge variant="outline" className="dashboard-filter-chip flex h-9 items-center justify-center rounded-lg px-3">
                    <Activity className="me-1 h-3 w-3 text-[var(--dash-spruce)]" />
                    Live Preview
                  </Badge>
                  <Badge variant="outline" className="dashboard-filter-chip flex h-9 items-center justify-center rounded-lg px-3">
                    <Sparkles className="me-1 h-3 w-3 text-[var(--dash-gold)]" />
                    {completionCount}/5 Ready
                  </Badge>
                </div>
              </div>
            </CardHeader>
            <CardContent className="p-5 pt-0">
              <Form {...form}>
                <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
                  {serverError ? (
                    <div className="rounded-lg border border-[var(--dash-danger)] bg-[var(--dash-danger-soft)] px-4 py-3 text-sm font-medium text-[var(--dash-danger)]">
                      {serverError}
                    </div>
                  ) : null}

                  <div className="grid gap-4 md:grid-cols-2">
                    <FormField
                      control={form.control}
                      name="nameEn"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel className="flex items-center gap-2 text-sm font-semibold text-[var(--dash-text-muted)]">
                            <Tags className="h-4 w-4 text-[var(--dash-brand-strong)]" />
                            Brand Name (English)
                          </FormLabel>
                          <FormControl>
                            <Input
                              autoComplete="organization"
                              placeholder="Acme Foods"
                              disabled={isSubmitting}
                              className="dashboard-control h-11 rounded-lg"
                              {...field}
                            />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    <FormField
                      control={form.control}
                      name="nameFr"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel className="flex items-center gap-2 text-sm font-semibold text-[var(--dash-text-muted)]">
                            <Globe2 className="h-4 w-4 text-[var(--dash-gold)]" />
                            Brand Name (French)
                          </FormLabel>
                          <FormControl>
                            <Input
                              placeholder="Acme Aliments"
                              disabled={isSubmitting}
                              className="dashboard-control h-11 rounded-lg"
                              {...field}
                              value={field.value ?? ""}
                            />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </div>

                  <div className="grid gap-4 md:grid-cols-2">
                    <FormField
                      control={form.control}
                      name="descriptionEn"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel className="text-sm font-semibold text-[var(--dash-text-muted)]">Description (English)</FormLabel>
                          <FormControl>
                            <Textarea
                              disabled={isSubmitting}
                              className="dashboard-control min-h-[112px] rounded-lg"
                              {...field}
                              value={field.value ?? ""}
                            />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    <FormField
                      control={form.control}
                      name="descriptionFr"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel className="text-sm font-semibold text-[var(--dash-text-muted)]">Description (French)</FormLabel>
                          <FormControl>
                            <Textarea
                              disabled={isSubmitting}
                              className="dashboard-control min-h-[112px] rounded-lg"
                              {...field}
                              value={field.value ?? ""}
                            />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </div>

                  <div className="grid gap-4 md:grid-cols-[minmax(0,1fr)_180px] md:items-end">
                    <FormField
                      control={form.control}
                      name="logoUrl"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel className="flex items-center gap-2 text-sm font-semibold text-[var(--dash-text-muted)]">
                            <Link2 className="h-4 w-4 text-[var(--dash-info)]" />
                            Logo URL
                          </FormLabel>
                          <FormControl>
                            <Input
                              type="url"
                              placeholder="https://example.com/logo.png"
                              disabled={isSubmitting}
                              className="dashboard-control h-11 rounded-lg"
                              {...field}
                              value={field.value ?? ""}
                            />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    <FormField
                      control={form.control}
                      name="isActive"
                      render={({ field }) => (
                        <FormItem className="flex min-h-11 items-center justify-between rounded-lg border border-[var(--dash-border-subtle)] bg-[rgba(37,57,67,0.42)] px-4">
                          <FormLabel className="flex items-center gap-2 text-sm font-semibold text-[var(--dash-text-muted)]">
                            <Activity className="h-4 w-4 text-[var(--dash-success)]" />
                            Active
                          </FormLabel>
                          <FormControl>
                            <Switch checked={Boolean(field.value)} onCheckedChange={field.onChange} disabled={isSubmitting} />
                          </FormControl>
                        </FormItem>
                      )}
                    />
                  </div>

                  <div className="flex flex-col-reverse gap-3 border-t border-[var(--dash-border-subtle)] pt-5 sm:flex-row sm:justify-end">
                    <Button
                      type="button"
                      variant="outline"
                      onClick={() => router.push(returnHref)}
                      disabled={isSubmitting}
                      className="dashboard-button-secondary h-10 rounded-lg"
                    >
                      Cancel
                    </Button>
                    <Button type="submit" disabled={isSubmitting} className="dashboard-button-primary h-10 rounded-lg">
                      {isSubmitting ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Save className="mr-2 h-4 w-4" />}
                      {isEdit ? "Save Changes" : "Create Brand"}
                    </Button>
                  </div>
                </form>
              </Form>
            </CardContent>
          </Card>

          <Card className="dashboard-glass-panel h-fit overflow-hidden rounded-lg text-[var(--dash-text)]">
            <CardHeader className="p-5 pb-4">
              <CardTitle className="flex items-center gap-2 text-lg font-semibold text-[var(--dash-text)]">
                <span className="flex h-9 w-9 items-center justify-center rounded-lg bg-[var(--dash-brand-soft)] text-[var(--dash-brand-strong)]">
                  <Building2 className="h-5 w-5" />
                </span>
                Brand Preview
              </CardTitle>
              <CardDescription className="mt-2 font-mono text-[var(--dash-text-soft)]">
                /brands/{previewSlug || "brand-slug"}
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-5 p-5 pt-0">
              <div className="relative overflow-hidden rounded-lg border border-[var(--dash-border-subtle)] bg-[rgba(12,20,24,0.38)] p-5">
                <div className="absolute inset-x-0 top-0 h-1 bg-[var(--dash-brand)] opacity-80" />
                <div className="flex h-24 w-24 items-center justify-center rounded-lg border border-[var(--dash-border-subtle)] bg-[var(--dash-brand-soft)] text-xl font-semibold text-[var(--dash-brand-strong)] shadow-[0_18px_40px_rgba(47,125,246,0.16)]">
                  {watchedName ? initials(watchedName) : <Building2 className="h-7 w-7" />}
                </div>
                <div className="mt-5">
                  <p className="break-words text-xl font-semibold text-[var(--dash-text)]">{watchedName || "Brand name"}</p>
                  <p className="break-words text-sm text-[var(--dash-text-soft)]">{watchedNameFr || "French name"}</p>
                </div>
              </div>

              <div className="grid gap-3">
                <BrandSignal
                  label="Catalog Status"
                  value={watchedStatus ? "Active" : "Inactive"}
                  accent={watchedStatus ? "var(--dash-success)" : "var(--dash-text-faint)"}
                />
                <BrandSignal
                  label="Localization"
                  value={watchedNameFr ? "English and French" : "English primary"}
                  accent="var(--dash-gold)"
                />
                <BrandSignal
                  label="Logo"
                  value={watchedLogoUrl ? "Linked" : "Not linked"}
                  accent="var(--dash-info)"
                />
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  )
}

function BrandSignal({
  label,
  value,
  accent,
}: {
  label: string
  value: string
  accent: string
}) {
  return (
    <div className="flex items-center justify-between gap-3 rounded-lg border border-[var(--dash-border-subtle)] bg-[rgba(37,57,67,0.42)] px-3 py-2">
      <span className="text-sm text-[var(--dash-text-soft)]">{label}</span>
      <span className="text-sm font-semibold text-[var(--dash-text)]" style={{ color: accent }}>
        {value}
      </span>
    </div>
  )
}
