import createActionTaxRate from "@/actions/taxRate/createActionTaxRate"
import { ModernTaxRateForm } from "@/components/tax-rates/ModernTaxRateForm"
import { Button } from "@/components/ui/button"
import { getAuthenticatedUser } from "@/config/useAuth"
import { localizedRedirect } from "@/i18n/server-routing"
import { ArrowLeft, Percent } from "lucide-react"
import { revalidatePath } from "next/cache"

async function handleCreateTaxRate(formData: FormData) {
  "use server"

  const user = await getAuthenticatedUser()
  if (!user?.organizationId) {
    throw new Error("Organization is required")
  }

  const nameEn = String(formData.get("taxRateName") ?? formData.get("nameEn") ?? "").trim()
  const nameFrRaw = String(formData.get("nameFr") ?? "").trim()
  const rate = parseFloat(String(formData.get("rate") ?? "0"))

  const result = await createActionTaxRate({
    organizationId: user.organizationId,
    nameEn,
    nameFr: nameFrRaw.length > 0 ? nameFrRaw : null,
    rate,
  })

  if (result.success) {
    revalidatePath("/dashboard/settings/tax-rates")
    await localizedRedirect("/dashboard/settings/tax-rates")
  } else {
    const message = typeof result.error === "string" ? result.error : "Failed to create tax rate"
    throw new Error(message)
  }
}

export default async function CreateTaxRatePage() {
  const user = await getAuthenticatedUser()

  if (!user?.organizationId) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-50 via-violet-50/30 to-purple-50/50 dark:from-slate-950 dark:via-slate-900 dark:to-slate-800">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 py-4 sm:py-8">
          <div className="max-w-md mx-auto text-center py-16">
            <div className="w-20 h-20 bg-slate-100 dark:bg-slate-800 rounded-full flex items-center justify-center mx-auto mb-6">
              <Percent className="w-10 h-10 text-slate-400" />
            </div>
            <h3 className="text-xl font-semibold text-slate-900 dark:text-white mb-3">
              Organization Required
            </h3>
            <p className="text-slate-600 dark:text-slate-400 mb-6">
              No organization found for the current user.
            </p>
            <form action={async () => {
              "use server"
              await localizedRedirect("/dashboard/settings/tax-rates")
            }}>
              <Button type="submit" variant="outline">
                <ArrowLeft className="me-2 h-4 w-4" />
                Back to Tax Rates
              </Button>
            </form>
          </div>
        </div>
      </div>
    )
  }

  return (
    <ModernTaxRateForm
      action={handleCreateTaxRate}
      isLoading={false}
      organizationId={user.organizationId}
    />
  )
}
