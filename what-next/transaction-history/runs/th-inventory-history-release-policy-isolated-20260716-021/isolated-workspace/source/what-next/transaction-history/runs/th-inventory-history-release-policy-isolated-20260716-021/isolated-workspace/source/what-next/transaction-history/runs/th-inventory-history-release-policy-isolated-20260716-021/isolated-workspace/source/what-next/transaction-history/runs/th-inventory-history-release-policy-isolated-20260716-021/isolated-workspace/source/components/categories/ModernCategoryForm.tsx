"use client"

import { zodResolver } from "@hookform/resolvers/zod"
import { ArrowLeft, FolderOpen, Loader2, Save } from "lucide-react"
import { useRouter } from "next/navigation"
import { useMemo, useState } from "react"
import { useForm } from "react-hook-form"
import { z } from "zod"

import { useCreateCategory, useUpdateCategory } from "@/hooks/useCategories"
import { CategoryCreateSchema } from "@/services/category/category.schemas"
import type { CategoryDTO } from "@/types/category"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form"
import { Input } from "@/components/ui/input"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Switch } from "@/components/ui/switch"
import { Textarea } from "@/components/ui/textarea"

const categoryFormSchema = CategoryCreateSchema.extend({
  isActive: z.boolean().default(true),
})

type CategoryFormValues = z.infer<typeof categoryFormSchema>

type CategoryOption = Pick<CategoryDTO, "id" | "titleEn" | "titleFr" | "parentId">

type ModernCategoryFormProps = {
  mode?: "create" | "edit"
  organizationId: string
  initialData?: CategoryDTO | null
  categories?: CategoryOption[]
  returnHref?: string
}

function slugPreview(value: string) {
  return value
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-$)+/g, "")
}

export function ModernCategoryForm({
  mode = "create",
  organizationId,
  initialData,
  categories = [],
  returnHref = "/dashboard/inventory/categories",
}: ModernCategoryFormProps) {
  const router = useRouter()
  const createCategory = useCreateCategory()
  const updateCategory = useUpdateCategory()
  const [serverError, setServerError] = useState<string | null>(null)

  const isEdit = mode === "edit" && Boolean(initialData)
  const isSubmitting = createCategory.isPending || updateCategory.isPending

  const parentOptions = useMemo(
    () => categories.filter((category) => category.id !== initialData?.id),
    [categories, initialData?.id],
  )

  const form = useForm<CategoryFormValues>({
    resolver: zodResolver(categoryFormSchema),
    defaultValues: {
      titleEn: initialData?.titleEn ?? "",
      titleFr: initialData?.titleFr ?? "",
      descriptionEn: initialData?.descriptionEn ?? "",
      descriptionFr: initialData?.descriptionFr ?? "",
      imageUrl: initialData?.imageUrl ?? "",
      parentId: initialData?.parentId ?? null,
      isActive: initialData?.isActive ?? true,
    },
    mode: "onBlur",
  })

  const watchedTitle = form.watch("titleEn")
  const watchedStatus = form.watch("isActive")
  const watchedParentId = form.watch("parentId")
  const previewSlug = useMemo(() => slugPreview(watchedTitle || ""), [watchedTitle])
  const parentLabel = parentOptions.find((category) => category.id === watchedParentId)?.titleEn

  async function onSubmit(values: CategoryFormValues) {
    setServerError(null)

    const payload = {
      organizationId,
      titleEn: values.titleEn,
      titleFr: values.titleFr || null,
      descriptionEn: values.descriptionEn || null,
      descriptionFr: values.descriptionFr || null,
      imageUrl: values.imageUrl || null,
      parentId: values.parentId || null,
      isActive: values.isActive,
    }

    try {
      if (isEdit && initialData) {
        await updateCategory.mutateAsync({
          id: initialData.id,
          data: payload,
        })
        router.push(`${returnHref}/${initialData.id}`)
      } else {
        await createCategory.mutateAsync(payload)
        form.reset()
        router.push(returnHref)
      }
      router.refresh()
    } catch (error) {
      setServerError(error instanceof Error ? error.message : "The category could not be saved.")
    }
  }

  return (
    <div className="dashboard-landing-theme dark min-h-screen overflow-x-hidden">
      <div className="dashboard-landing-content mx-auto flex w-full max-w-6xl flex-col gap-6 px-4 py-6 sm:px-6 sm:py-8">
        <section className="dashboard-glass-panel rounded-lg border border-[var(--dash-border-subtle)] p-5 sm:p-6">
          <div className="flex flex-col gap-5 lg:flex-row lg:items-center lg:justify-between">
            <div className="flex min-w-0 items-start gap-4">
              <Button
                type="button"
                variant="ghost"
                size="icon"
                onClick={() => router.push(returnHref)}
                className="dashboard-button-secondary h-10 w-10 shrink-0 rounded-lg"
              >
                <ArrowLeft className="h-4 w-4" />
                <span className="sr-only">Back to categories</span>
              </Button>
              <div className="min-w-0">
                <span className="dashboard-eyebrow mb-3">
                  <span className="dashboard-live-dot" />
                  Category setup
                </span>
                <h1 className="text-3xl font-semibold tracking-normal text-[var(--dash-text)] sm:text-4xl">
                  {isEdit ? "Edit Category" : "Create Category"}
                </h1>
                <p className="mt-2 max-w-2xl text-sm leading-6 text-[var(--dash-text-soft)]">
                  {isEdit
                    ? `Update ${initialData?.titleEn ?? "this category"} without changing the inventory hierarchy around it.`
                    : "Create a bilingual inventory category with hierarchy, image, and operating status."}
                </p>
              </div>
            </div>
            <Badge
              variant="outline"
              className={
                watchedStatus
                  ? "w-fit rounded-lg border-[var(--dash-success)] bg-[var(--dash-success-soft)] px-3 py-1.5 text-[var(--dash-success)]"
                  : "w-fit rounded-lg border-[var(--dash-border-subtle)] bg-[rgba(126,145,137,0.14)] px-3 py-1.5 text-[var(--dash-text-soft)]"
              }
            >
              {watchedStatus ? "Active" : "Inactive"}
            </Badge>
          </div>
        </section>

        <div className="grid min-w-0 gap-6 lg:grid-cols-[minmax(0,1fr)_320px]">
          <Card className="dashboard-glass-panel min-w-0 overflow-hidden rounded-lg text-[var(--dash-text)]">
            <CardHeader className="border-b border-[var(--dash-border-subtle)] bg-[rgba(12,20,24,0.56)] px-5 py-4 sm:px-6">
              <CardTitle className="text-lg font-semibold text-[var(--dash-text)]">Category Details</CardTitle>
              <CardDescription className="text-[var(--dash-text-soft)]">
                Names, descriptions, hierarchy, image, and operating status.
              </CardDescription>
            </CardHeader>
            <CardContent className="p-5 sm:p-6">
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
                      name="titleEn"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel className="text-[var(--dash-text-muted)]">Category Title (English)</FormLabel>
                          <FormControl>
                            <Input
                              autoComplete="off"
                              placeholder="Electronics"
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
                      name="titleFr"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel className="text-[var(--dash-text-muted)]">Category Title (French)</FormLabel>
                          <FormControl>
                            <Input
                              placeholder="Electronique"
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
                          <FormLabel className="text-[var(--dash-text-muted)]">Description (English)</FormLabel>
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
                          <FormLabel className="text-[var(--dash-text-muted)]">Description (French)</FormLabel>
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

                  <div className="grid gap-4 md:grid-cols-[minmax(0,1fr)_220px] md:items-end">
                    <FormField
                      control={form.control}
                      name="imageUrl"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel className="text-[var(--dash-text-muted)]">Image URL</FormLabel>
                          <FormControl>
                            <Input
                              placeholder="https://example.com/category.png"
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
                      name="parentId"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel className="text-[var(--dash-text-muted)]">Parent Category</FormLabel>
                          <Select
                            value={field.value ?? "none"}
                            onValueChange={(value) => field.onChange(value === "none" ? null : value)}
                            disabled={isSubmitting || parentOptions.length === 0}
                          >
                            <FormControl>
                              <SelectTrigger className="dashboard-control h-11 rounded-lg">
                                <SelectValue placeholder="No parent" />
                              </SelectTrigger>
                            </FormControl>
                            <SelectContent className="border-[var(--dash-border-subtle)] bg-[var(--dash-surface-raised)] text-[var(--dash-text)]">
                              <SelectItem value="none">No parent</SelectItem>
                              {parentOptions.map((category) => (
                                <SelectItem key={category.id} value={category.id}>
                                  {category.titleEn}
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
                    name="isActive"
                    render={({ field }) => (
                      <FormItem className="flex min-h-12 items-center justify-between rounded-lg border border-[var(--dash-border-subtle)] bg-[rgba(37,57,67,0.42)] px-4">
                        <FormLabel className="text-sm font-medium text-[var(--dash-text-muted)]">Active</FormLabel>
                        <FormControl>
                          <Switch checked={Boolean(field.value)} onCheckedChange={field.onChange} disabled={isSubmitting} />
                        </FormControl>
                      </FormItem>
                    )}
                  />

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
                      {isEdit ? "Save Changes" : "Create Category"}
                    </Button>
                  </div>
                </form>
              </Form>
            </CardContent>
          </Card>

          <Card className="dashboard-glass-panel h-fit overflow-hidden rounded-lg text-[var(--dash-text)]">
            <CardHeader className="border-b border-[var(--dash-border-subtle)] bg-[rgba(12,20,24,0.56)] px-5 py-4">
              <CardTitle className="text-lg font-semibold text-[var(--dash-text)]">Preview</CardTitle>
              <CardDescription className="font-mono text-[var(--dash-text-soft)]">
                {previewSlug || "category-slug"}
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-5 p-5">
              <div className="flex h-24 w-24 items-center justify-center rounded-lg border border-[var(--dash-border-subtle)] bg-[var(--dash-brand-soft)] text-[var(--dash-brand-strong)] shadow-[0_18px_40px_rgba(47,125,246,0.16)]">
                <FolderOpen className="h-8 w-8" />
              </div>
              <div>
                <p className="break-words text-lg font-semibold text-[var(--dash-text)]">{watchedTitle || "Category title"}</p>
                <p className="break-words text-sm text-[var(--dash-text-soft)]">{form.watch("titleFr") || "French title"}</p>
              </div>
              <div className="rounded-lg border border-[var(--dash-border-subtle)] bg-[rgba(24,38,45,0.72)] px-3 py-2 font-mono text-xs text-[var(--dash-text-soft)]">
                /categories/{previewSlug || "category-slug"}
              </div>
              <div className="rounded-lg border border-[var(--dash-border-subtle)] bg-[rgba(37,57,67,0.42)] px-3 py-2 text-sm text-[var(--dash-text-soft)]">
                Parent: <span className="text-[var(--dash-text)]">{parentLabel || "Root category"}</span>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  )
}
