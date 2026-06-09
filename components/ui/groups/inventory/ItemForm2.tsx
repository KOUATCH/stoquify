"use client"

import { notify } from "@/lib/notifications/notify"
import { DollarSign, Package } from "lucide-react"
import { useCallback } from "react"
import type { UseFormReturn } from "react-hook-form"
import { Button } from "@/components/ui/button"
import { FormControl, FormDescription, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form"
import { Input } from "@/components/ui/input"
// import { ImageUploadButton } from "@/components/FormInputs/ImageUploadButton"
import { generateSimpleSKU } from "@/lib/generateSKU"

import EnhancedImageUploadButton from "@/components/FormInputs/EnhancedImageUploadButton"
import type { ItemFormValues } from "./ItemManagement"

interface ItemFormProps {
  form: UseFormReturn<ItemFormValues>
  itemImageUrl: string
  setItemImageUrl: (url: string) => void
  organizationId: string
}

export const ItemForm2 = ({ form, itemImageUrl, setItemImageUrl, organizationId }: ItemFormProps) => {
  const copyToClipboard = useCallback(async (): Promise<void> => {
    const currentSku = form.getValues("sku")
    if (currentSku) {
      try {
        await navigator.clipboard.writeText(currentSku)
        notify.success("SKU copied to clipboard!")
      } catch (err) {
        console.error("Failed to copy SKU:", err)
        notify.error("Failed to copy SKU to clipboard")
      }
    }
  }, [form])

  const generateSKU = useCallback(() => {
    const newSku = generateSimpleSKU(9, "DBAKES")
    form.setValue("sku", newSku, { shouldValidate: true })
  }, [form])

  return (
    <div className="space-y-2">
      {/* Basic Information */}

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pb-6">
        <FormField
          control={form.control}
          name="name"
          render={({ field }) => (
            <FormItem>
              <FormLabel className="flex items-center gap-2">
                <Package className="h-4 w-4" />
                Item Name *
              </FormLabel>
              <FormControl>
                <Input placeholder="Enter item name" {...field} className="transition-colors mb-4" />
              </FormControl>
              <FormDescription>Enter a descriptive name for the item</FormDescription>
              <FormMessage />
            </FormItem>
          )}
        />

        {/* SKU Generation */}
        <FormField
          control={form.control}
          name="sku"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Product SKU *</FormLabel>
              <FormControl>
                <div className="space-y-1">
                  <Input
                    type="text"
                    placeholder="Generated SKU will appear here..."
                    className="font-mono transition-colors"
                    {...field}
                  />

                  <div className="flex gap-2">
                    <Button type="button" onClick={generateSKU} variant="outline" className="flex-1 bg-transparent">
                      Generate SKU
                    </Button>

                    {field.value && (
                      <Button
                        type="button"
                        onClick={copyToClipboard}
                        variant="outline"
                        size="icon"
                        title="Copy to clipboard"
                      >
                        📋
                      </Button>
                    )}
                  </div>

                  {field.value && (
                    <div className="p-1 bg-green-50 dark:bg-green-950 border border-green-200 dark:border-green-800 rounded-md">
                      <p className="text-sm text-green-800 dark:text-green-200">
                        <strong>Generated SKU:</strong> <code className="font-mono">{field.value}</code>
                      </p>
                    </div>
                  )}
                </div>
              </FormControl>
              <FormDescription>Unique identifier for this item</FormDescription>
              <FormMessage />
            </FormItem>
          )}
        />




      </div>


      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <FormField
          control={form.control}
          name="costPrice"
          render={({ field }) => (
            <FormItem>
              <FormLabel className="flex items-center gap-2">
                <DollarSign className="h-4 w-4" />
                Cost Price *
              </FormLabel>
              <FormControl>
                <div className="relative">
                  <DollarSign className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
                  <Input
                    type="number"
                    placeholder="0.00"
                    min="0"
                    step="0.01"
                    className="pl-8 transition-colors"
                    {...field}
                    onChange={(e) => field.onChange(Number(e.target.value) || 0)}
                  />
                </div>
              </FormControl>
              <FormDescription>Purchase or production cost in XAF</FormDescription>
              <FormMessage />
            </FormItem>
          )}
        />

        <FormField
          control={form.control}
          name="sellingPrice"
          render={({ field }) => (
            <FormItem>
              <FormLabel className="flex items-center gap-2">
                <DollarSign className="h-4 w-4" />
                Selling Price *
              </FormLabel>
              <FormControl>
                <div className="relative">
                  <DollarSign className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
                  <Input
                    type="number"
                    placeholder="0.00"
                    min="0"
                    step="0.01"
                    className="pl-8 transition-colors"
                    {...field}
                    onChange={(e) => field.onChange(Number(e.target.value) || 0)}
                  />
                </div>
              </FormControl>
              <FormDescription>Retail selling price in XAF</FormDescription>
              <FormMessage />
            </FormItem>
          )}
        />
      </div>

      <div className="grid grid-cols-1 ">
        {/* Image Upload */}
        <div className="space-y-2">
          <FormLabel>Item Image</FormLabel>
          <EnhancedImageUploadButton
            title="Upload Item Image"
            imageUrl={itemImageUrl}
            setImageUrl={setItemImageUrl}
            organizationId={organizationId}
            endpoint="itemImageUpload"
          />
          <FormDescription>Upload an image to help identify this item</FormDescription>
        </div>

      </div>
      {/* </CardContent>
      </Card> */}
    </div>
  )
}