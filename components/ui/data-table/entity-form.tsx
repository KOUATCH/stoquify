// components/ui/data-table/entity-form.tsx
"use client";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Form } from "@/components/ui/form";
import { Loader2, Save, Sparkles, X, XCircle } from "lucide-react";
import { ReactNode } from "react";
import { FieldValues, UseFormReturn } from "react-hook-form";

interface EntityFormProps<TFormValues extends FieldValues> {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  title: string;
  description?: string;
  form: UseFormReturn<TFormValues>;
  onSubmit?: ((values: TFormValues) => void | Promise<void>) | false;
  children: ReactNode;
  isSubmitting?: boolean;
  submitLabel?: string;
  cancelLabel?: string;
  size?: "sm" | "md" | "lg" | "xl";
  disableWhenSubmitting?: boolean;
  hideSubmitButton?: boolean;
  className?: string;
  variant?: "default" | "success" | "warning" | "info";
}

export default function EntityForm<TFormValues extends FieldValues>({
  open,
  onOpenChange,
  title,
  description,
  form,
  onSubmit,
  children,
  isSubmitting = false,
  submitLabel = "Save Changes",
  cancelLabel = "Cancel",
  size = "sm",
  className = "",
  disableWhenSubmitting = true,
  hideSubmitButton = false,
  variant = "default",
}: EntityFormProps<TFormValues>) {
  // Map size string to actual width class
  const sizeClasses = {
    sm: "sm:max-w-[425px]",
    md: "sm:max-w-[600px]",
    lg: "sm:max-w-[750px]",
    xl: "sm:max-w-[900px]",
  };

  const variantStyles = {
    default: {
      headerBg: "bg-gradient-to-r from-blue-50 via-indigo-50 to-purple-50",
      headerBorder: "border-blue-200",
      iconBg: "bg-gradient-to-r from-blue-500 to-indigo-500",
      submitBg: "bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700",
    },
    success: {
      headerBg: "bg-gradient-to-r from-green-50 via-emerald-50 to-teal-50",
      headerBorder: "border-green-200",
      iconBg: "bg-gradient-to-r from-green-500 to-emerald-500",
      submitBg: "bg-gradient-to-r from-green-600 to-emerald-600 hover:from-green-700 hover:to-emerald-700",
    },
    warning: {
      headerBg: "bg-gradient-to-r from-orange-50 via-amber-50 to-yellow-50",
      headerBorder: "border-orange-200",
      iconBg: "bg-gradient-to-r from-orange-500 to-amber-500",
      submitBg: "bg-gradient-to-r from-orange-600 to-amber-600 hover:from-orange-700 hover:to-amber-700",
    },
    info: {
      headerBg: "bg-gradient-to-r from-cyan-50 via-sky-50 to-blue-50",
      headerBorder: "border-cyan-200",
      iconBg: "bg-gradient-to-r from-cyan-500 to-sky-500",
      submitBg: "bg-gradient-to-r from-cyan-600 to-sky-600 hover:from-cyan-700 hover:to-sky-700",
    },
  };

  const currentVariant = variantStyles[variant];
  const widthClass = sizeClasses[size];

  return (
    <Dialog
      open={open}
      onOpenChange={(newOpen) => {
        if (isSubmitting && disableWhenSubmitting) return;
        onOpenChange(newOpen);
      }}
    >
      <DialogContent className={`${widthClass} p-0 gap-0 bg-white/95 backdrop-blur-sm border-0 shadow-2xl overflow-hidden ${className}`}>
        {/* Enhanced Header with Gradient Background */}
        <div className={`relative ${currentVariant.headerBg} ${currentVariant.headerBorder} border-b px-6 py-4`}>
          {/* Decorative Pattern */}
          <div className="absolute top-0 right-0 w-32 h-32 opacity-10">
            <div className="absolute inset-0 bg-gradient-to-br from-white/30 to-transparent rounded-bl-full"></div>
          </div>

          <DialogHeader className="space-y-3 relative">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className={`inline-flex items-center justify-center w-10 h-10 ${currentVariant.iconBg} rounded-xl shadow-lg`}>
                  <Sparkles className="w-5 h-5 text-white" />
                </div>
                <div>
                  <DialogTitle className="text-xl font-bold text-gray-900 flex items-center gap-2">
                    {title}
                    <Badge variant="outline" className="bg-white/80 text-xs">
                      Form
                    </Badge>
                  </DialogTitle>
                  {description && (
                    <p className="text-sm text-gray-600 mt-1">{description}</p>
                  )}
                </div>
              </div>

              <DialogClose asChild>
                <Button
                  variant="ghost"
                  size="sm"
                  className="h-8 w-8 p-0 hover:bg-white/80 rounded-full"
                  disabled={isSubmitting && disableWhenSubmitting}
                >
                  <X className="h-4 w-4" />
                </Button>
              </DialogClose>
            </div>

            {/* Progress indicator when submitting */}
            {isSubmitting && (
              <div className="flex items-center gap-2 text-sm text-gray-600">
                <div className="w-2 h-2 bg-blue-500 rounded-full animate-pulse"></div>
                <span>Processing your request...</span>
              </div>
            )}
          </DialogHeader>
        </div>

        {/* Form Content with Enhanced Styling */}
        <div className="bg-gradient-to-b from-white to-gray-50/30 px-6 py-6">
          <Form {...form}>
            <form
              onSubmit={form.handleSubmit((values) => {
                if (onSubmit) {
                  return onSubmit(values)
                }
              })}
              className="space-y-6"
            >
              <div className="space-y-4">
                {children}
              </div>

              {/* Enhanced Footer */}
              <DialogFooter className="gap-3 pt-6 border-t border-gray-200/50">
                <DialogClose asChild>
                  <Button
                    type="button"
                    variant="outline"
                    disabled={isSubmitting && disableWhenSubmitting}
                    className="flex items-center gap-2 bg-white/80 hover:bg-white border-gray-300 hover:border-gray-400 transition-all duration-200"
                  >
                    <XCircle className="w-4 h-4" />
                    {cancelLabel}
                  </Button>
                </DialogClose>

                {!hideSubmitButton && (
                  <Button
                    type="submit"
                    disabled={isSubmitting && disableWhenSubmitting}
                    className={`flex items-center gap-2 ${currentVariant.submitBg} border-0 shadow-lg hover:shadow-xl transition-all duration-200 font-medium px-6`}
                  >
                    {isSubmitting ? (
                      <>
                        <Loader2 className="w-4 h-4 animate-spin" />
                        <span>Saving...</span>
                        <div className="flex gap-1 ml-1">
                          <div className="w-1 h-1 bg-white/60 rounded-full animate-bounce"></div>
                          <div className="w-1 h-1 bg-white/60 rounded-full animate-bounce" style={{ animationDelay: '0.1s' }}></div>
                          <div className="w-1 h-1 bg-white/60 rounded-full animate-bounce" style={{ animationDelay: '0.2s' }}></div>
                        </div>
                      </>
                    ) : (
                      <>
                        <Save className="w-4 h-4" />
                        {submitLabel}
                      </>
                    )}
                  </Button>
                )}
              </DialogFooter>
            </form>
          </Form>
        </div>

        {/* Loading Overlay */}
        {isSubmitting && disableWhenSubmitting && (
          <div className="absolute inset-0 bg-white/80 backdrop-blur-sm flex items-center justify-center z-50">
            <div className="flex flex-col items-center gap-3 text-center">
              <div className="relative">
                <div className="w-8 h-8 border-2 border-blue-200 rounded-full animate-spin"></div>
                <div className="absolute inset-0 w-8 h-8 border-2 border-transparent border-t-blue-500 rounded-full animate-spin"></div>
              </div>
              <p className="text-sm text-gray-600 font-medium">Processing...</p>
            </div>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
