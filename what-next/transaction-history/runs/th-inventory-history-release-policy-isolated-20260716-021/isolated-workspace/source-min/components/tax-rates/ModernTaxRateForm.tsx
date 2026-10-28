"use client"

import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardTitle } from "@/components/ui/card"
import { Form, FormControl, FormDescription, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form"
import { Input } from "@/components/ui/input"
import { Progress } from "@/components/ui/progress"
import { TooltipProvider } from "@/components/ui/tooltip"
import { zodResolver } from "@hookform/resolvers/zod"
import {
  ArrowLeft,
  Calculator,
  CheckCircle,
  Eye,
  Info,
  Loader2,
  Percent,
  Save,
  Sparkles
} from "lucide-react"
import { useRouter } from "next/navigation"
import { useEffect, useState } from "react"
import { useForm } from "react-hook-form"
import { z } from "zod"
import { useNotifications } from "../notifications/NotificationProvider"

// Enhanced validation schema for tax rates
const taxRateCreationSchema = z.object({
  taxRateName: z.string().min(1, "Tax rate name is required").max(100, "Name must be less than 100 characters").trim(),
  rate: z.number().min(0, "Rate must be 0 or positive").max(100, "Rate cannot exceed 100%"),
})

export type TaxRateCreationFormData = z.infer<typeof taxRateCreationSchema>

interface ModernTaxRateFormProps {
  action?: (formData: FormData) => Promise<void>
  isLoading?: boolean
  onCancel?: () => void
  organizationId: string
}

export function ModernTaxRateForm({
  action,
  isLoading = false,
  onCancel,
  organizationId
}: ModernTaxRateFormProps) {
  const router = useRouter()
  const { info, operationStart, operationComplete } = useNotifications()

  // Welcome notification when component mounts
  useEffect(() => {
    info("Create Tax Rate", "Set up tax rates to ensure compliance with local tax regulations!")
  }, [info])

  const form = useForm<TaxRateCreationFormData>({
    resolver: zodResolver(taxRateCreationSchema),
    defaultValues: {
      taxRateName: "",
      rate: 0,
    },
    mode: "onChange"
  })

  // Watch form values for real-time feedback
  const watchedValues = form.watch()
  const { taxRateName, rate } = watchedValues

  const handleSubmit = async (data: TaxRateCreationFormData) => {
    const operationId = operationStart("Creating Tax Rate")

    try {
      info("Processing Tax Rate", "Creating your new tax rate...")

      if (action) {
        // Server action approach
        const formData = new FormData()
        Object.entries(data).forEach(([key, value]) => {
          if (value !== undefined && value !== null) {
            formData.append(key, String(value))
          }
        })
        await action(formData)
      }

      operationComplete("Tax Rate Created", `${data.taxRateName} (${data.rate}%) has been successfully added!`)
    } catch (error) {
      console.log("Failed to create tax rate:", error)
      operationComplete("Creation Failed", "Failed to create tax rate. Please check your information and try again.")
    }
  }

  const handleCancel = () => {
    if (onCancel) {
      onCancel()
    } else {
      router.back()
    }
  }

  // Calculate completion percentage
  const completionPercentage = (taxRateName && rate >= 0) ? 100 : taxRateName ? 50 : 0

  // Format percentage for display
  const formatPercentage = (value: number) => `${value}%`

  // Get tax rate category for styling
  const getTaxRateCategory = (rate: number) => {
    if (rate === 0) return { name: "Tax-Free", color: "bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-300" }
    if (rate <= 5) return { name: "Low Rate", color: "bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-300" }
    if (rate <= 15) return { name: "Standard Rate", color: "bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-300" }
    if (rate <= 25) return { name: "High Rate", color: "bg-orange-100 text-orange-700 dark:bg-orange-900/30 dark:text-orange-300" }
    return { name: "Premium Rate", color: "bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-300" }
  }

  const taxCategory = getTaxRateCategory(rate)

  return (
    <TooltipProvider>
      <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50/30 to-indigo-50/50 dark:from-slate-950 dark:via-slate-900 dark:to-slate-800">
        <div className="max-w-5xl mx-auto px-4 sm:px-6 py-4 sm:py-8">
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
                Back to Tax Rates
              </Button>
            </div>

            <div className="flex items-center gap-4">
              <div className="p-3 rounded-xl bg-gradient-to-br from-orange-500 to-red-600 shadow-lg">
                <Percent className="w-8 h-8 text-white" />
              </div>
              <div>
                <h1 className="text-3xl sm:text-4xl font-bold bg-gradient-to-r from-slate-900 to-slate-700 dark:from-white dark:to-slate-300 bg-clip-text text-transparent">
                  Create New Tax Rate
                </h1>
                <p className="text-slate-600 dark:text-slate-400 mt-1">
                  Add a tax rate for pricing and compliance
                </p>
              </div>
            </div>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
            {/* Main Form */}
            <div className="lg:col-span-2">
              <Card className="bg-white/80 dark:bg-slate-800/80 backdrop-blur-lg border-0 shadow-2xl rounded-3xl overflow-hidden">
                <CardContent className="p-8">
                  <div className="text-center mb-8">
                    <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-gradient-to-br from-orange-500 to-red-600 shadow-lg mb-4">
                      <Percent className="w-8 h-8 text-white" />
                    </div>
                    <h3 className="text-2xl font-bold text-slate-900 dark:text-white mb-2">Tax Rate Information</h3>
                    <p className="text-slate-600 dark:text-slate-400">Create a tax rate for your products and services</p>
                  </div>

                  <Form {...form}>
                    <form onSubmit={form.handleSubmit(handleSubmit)} className="space-y-8">
                      <div className="grid gap-6 md:grid-cols-2">
                        <FormField
                          control={form.control}
                          name="taxRateName"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel className="text-base font-semibold text-slate-700 dark:text-slate-300 flex items-center gap-2">
                                <Sparkles className="h-4 w-4 text-orange-500" />
                                Tax Rate Name *
                              </FormLabel>
                              <FormControl>
                                <Input
                                  placeholder="Enter tax rate name (e.g., VAT, Sales Tax)"
                                  className="h-12 text-lg bg-white/80 dark:bg-slate-800/80 backdrop-blur-sm border-2 border-slate-200 dark:border-slate-700 focus:border-orange-500 dark:focus:border-orange-400 rounded-xl shadow-sm"
                                  {...field}
                                />
                              </FormControl>
                              <FormDescription className="text-sm text-slate-500 dark:text-slate-400">
                                The name that identifies this tax rate
                              </FormDescription>
                              <FormMessage />
                            </FormItem>
                          )}
                        />

                        <FormField
                          control={form.control}
                          name="rate"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel className="text-base font-semibold text-slate-700 dark:text-slate-300 flex items-center gap-2">
                                <Calculator className="h-4 w-4 text-orange-500" />
                                Tax Rate (%) *
                              </FormLabel>
                              <FormControl>
                                <div className="relative">
                                  <Input
                                    type="number"
                                    placeholder="0.00"
                                    min="0"
                                    max="100"
                                    step="0.01"
                                    className="h-12 text-lg bg-white/80 dark:bg-slate-800/80 backdrop-blur-sm border-2 border-slate-200 dark:border-slate-700 focus:border-orange-500 dark:focus:border-orange-400 rounded-xl shadow-sm pr-12"
                                    {...field}
                                    onChange={(e) => field.onChange(Number(e.target.value) || 0)}
                                  />
                                  <div className="absolute right-4 top-1/2 transform -translate-y-1/2 text-slate-400">
                                    <Percent className="h-5 w-5" />
                                  </div>
                                </div>
                              </FormControl>
                              <FormDescription className="text-sm text-slate-500 dark:text-slate-400">
                                Percentage rate (0-100%)
                              </FormDescription>
                              <FormMessage />
                            </FormItem>
                          )}
                        />
                      </div>

                      {(taxRateName && rate >= 0) && (
                        <div className="p-6 rounded-2xl bg-gradient-to-r from-orange-50 to-red-50 dark:from-orange-900/20 dark:to-red-900/20 border-2 border-orange-200 dark:border-orange-700">
                          <div className="flex items-center gap-3 mb-4">
                            <CheckCircle className="h-6 w-6 text-orange-600 dark:text-orange-400" />
                            <h4 className="text-lg font-semibold text-orange-900 dark:text-orange-100">Tax Rate Preview</h4>
                          </div>
                          <div className="space-y-3">
                            <div className="flex justify-between items-center">
                              <span className="text-sm text-orange-600 dark:text-orange-400">Name:</span>
                              <span className="font-medium text-orange-900 dark:text-orange-100">{taxRateName}</span>
                            </div>
                            <div className="flex justify-between items-center">
                              <span className="text-sm text-orange-600 dark:text-orange-400">Rate:</span>
                              <span className="font-bold text-lg text-orange-800 dark:text-orange-200">
                                {formatPercentage(rate)}
                              </span>
                            </div>
                            <div className="flex justify-between items-center">
                              <span className="text-sm text-orange-600 dark:text-orange-400">Category:</span>
                              <Badge className={`${taxCategory.color} border-0`}>
                                {taxCategory.name}
                              </Badge>
                            </div>
                            <div className="pt-2 border-t border-orange-200 dark:border-orange-700">
                              <span className="text-sm text-orange-600 dark:text-orange-400">Example:</span>
                              <p className="text-sm text-orange-800 dark:text-orange-200 mt-1">
                                $100.00 + {formatPercentage(rate)} tax = ${(100 + rate).toFixed(2)}
                              </p>
                            </div>
                          </div>
                        </div>
                      )}

                      {/* Form Actions */}
                      <div className="flex justify-between items-center pt-8 border-t border-slate-200 dark:border-slate-700">
                        <Button
                          type="button"
                          onClick={handleCancel}
                          variant="outline"
                          className="px-6 py-3 bg-white/80 dark:bg-slate-800/80 backdrop-blur-sm border-2 border-slate-200 dark:border-slate-700 hover:border-slate-300 dark:hover:border-slate-600"
                        >
                          <ArrowLeft className="w-4 h-4 mr-2" />
                          Cancel
                        </Button>

                        <Button
                          type="submit"
                          disabled={form.formState.isSubmitting || isLoading || !taxRateName}
                          className="px-8 py-3 bg-gradient-to-r from-orange-600 to-red-600 hover:from-orange-700 hover:to-red-700 text-white shadow-lg"
                        >
                          {form.formState.isSubmitting || isLoading ? (
                            <>
                              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                              Creating Tax Rate...
                            </>
                          ) : (
                            <>
                              <Save className="mr-2 h-4 w-4" />
                              Create Tax Rate
                            </>
                          )}
                        </Button>
                      </div>
                    </form>
                  </Form>
                </CardContent>
              </Card>
            </div>

            {/* Preview Panel */}
            <div className="lg:col-span-1">
              <Card className="bg-white/80 dark:bg-slate-800/80 backdrop-blur-lg border-0 shadow-2xl rounded-3xl overflow-hidden sticky top-8">
                <div className="bg-gradient-to-r from-slate-50 to-orange-50/50 dark:from-slate-800 dark:to-slate-700 px-6 py-4 border-b border-slate-200/60 dark:border-slate-700/60">
                  <CardTitle className="text-lg font-semibold text-slate-900 dark:text-white flex items-center gap-2">
                    <Eye className="h-5 w-5 text-orange-600 dark:text-orange-400" />
                    Live Preview
                  </CardTitle>
                  <CardDescription className="text-slate-600 dark:text-slate-400 mt-1">
                    See how your tax rate will appear
                  </CardDescription>
                </div>
                <CardContent className="p-6 space-y-6">
                  {/* Tax Rate Preview */}
                  <div className="text-center space-y-4">
                    <div className="relative mx-auto w-20 h-20 rounded-2xl overflow-hidden border-4 border-slate-200 dark:border-slate-700 shadow-xl bg-gradient-to-br from-orange-500 to-red-600 flex items-center justify-center">
                      <Percent className="w-10 h-10 text-white" />
                    </div>
                    <div>
                      <h3 className="font-bold text-slate-900 dark:text-white text-xl mb-1">
                        {taxRateName || "New Tax Rate"}
                      </h3>
                      {rate >= 0 && (
                        <p className="text-2xl font-bold text-orange-600 dark:text-orange-400">
                          {formatPercentage(rate)}
                        </p>
                      )}
                      {rate >= 0 && (
                        <Badge className={`${taxCategory.color} border-0 mt-2`}>
                          {taxCategory.name}
                        </Badge>
                      )}
                    </div>
                  </div>

                  {/* Tax Calculation Example */}
                  {rate >= 0 && (
                    <div className="p-4 rounded-xl bg-slate-50 dark:bg-slate-800/50 border border-slate-200 dark:border-slate-700">
                      <h4 className="text-sm font-medium text-slate-700 dark:text-slate-300 mb-3 flex items-center gap-2">
                        <Calculator className="h-4 w-4" />
                        Tax Calculation
                      </h4>
                      <div className="space-y-2 text-sm">
                        <div className="flex justify-between">
                          <span className="text-slate-600 dark:text-slate-400">Subtotal:</span>
                          <span className="font-medium">$100.00</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-slate-600 dark:text-slate-400">Tax ({formatPercentage(rate)}):</span>
                          <span className="font-medium">${rate.toFixed(2)}</span>
                        </div>
                        <div className="flex justify-between border-t border-slate-200 dark:border-slate-600 pt-2 font-bold">
                          <span>Total:</span>
                          <span>${(100 + rate).toFixed(2)}</span>
                        </div>
                      </div>
                    </div>
                  )}

                  {/* Completion Status */}
                  <div className="pt-4 border-t border-slate-200 dark:border-slate-700">
                    <div className="space-y-2">
                      <div className="flex justify-between text-sm">
                        <span className="text-slate-600 dark:text-slate-400">Completion</span>
                        <span className="font-medium text-slate-900 dark:text-white">
                          {completionPercentage}%
                        </span>
                      </div>
                      <Progress value={completionPercentage} className="h-2" />
                    </div>
                    <p className="text-xs text-slate-500 dark:text-slate-400 text-center mt-3">
                      {(taxRateName && rate >= 0) ? "Ready to create tax rate!" : "Complete both fields to continue"}
                    </p>
                  </div>

                  {/* Tax Rate Information */}
                  <div className="pt-4 border-t border-slate-200 dark:border-slate-700">
                    <div className="flex items-start gap-2 p-3 rounded-lg bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-700">
                      <Info className="h-4 w-4 text-blue-600 dark:text-blue-400 mt-0.5 flex-shrink-0" />
                      <div className="text-xs text-blue-800 dark:text-blue-200">
                        <p className="font-medium mb-1">Tax Rate Tips:</p>
                        <ul className="space-y-1">
                          <li>• Check local tax regulations</li>
                          <li>• Consider product-specific rates</li>
                          <li>• Keep rates up to date</li>
                          <li>• Test calculations before launch</li>
                        </ul>
                      </div>
                    </div>
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
