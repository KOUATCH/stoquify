import { Suspense } from "react"
import Link from "next/link"
import { AlertTriangle, Award, Package, Plus } from "lucide-react"

import { getOrgBrands } from "@/actions/brands/getBrandsAction"
import EnhancedBrandsManagement from "@/components/inventory/EnhancedBrandsManagement"
import { Button } from "@/components/ui/button"
import { checkPermission, getAuthenticatedUser } from "@/config/useAuth"
import { pickLocale } from "@/i18n/routing"
import { PERMISSIONS } from "@/lib/permissions"

type BrandsPageProps = {
  params: Promise<{ locale: string }>
}

export default async function BrandsPage({ params }: BrandsPageProps) {
  await checkPermission(PERMISSIONS.BRANDS_READ)

  const { locale: rawLocale } = await params
  const locale = pickLocale(rawLocale)
  const user = await getAuthenticatedUser()
  const organizationId = user?.organizationId
  const basePath = `/${locale}/dashboard/inventory/brands`

  if (!organizationId) {
    return (
      <div className="dashboard-landing-theme dark min-h-screen overflow-x-hidden">
        <div className="dashboard-landing-content mx-auto w-full max-w-[88rem] min-w-0 px-4 py-8 sm:px-6">
          <div className="dashboard-glass-panel mx-auto max-w-md rounded-lg px-6 py-14 text-center">
            <div className="mx-auto mb-6 flex h-16 w-16 items-center justify-center rounded-lg border border-[var(--dash-border-subtle)] bg-[var(--dash-danger-soft)]">
              <AlertTriangle className="h-8 w-8 text-[var(--dash-danger)]" />
            </div>
            <h1 className="mb-3 text-xl font-semibold text-[var(--dash-text)]">Organization Required</h1>
            <p className="text-sm text-[var(--dash-text-soft)]">No organization found for the current user.</p>
          </div>
        </div>
      </div>
    )
  }

  const initialBrands = await getOrgBrands(organizationId)
  const initialBrandData = initialBrands.data ?? []

  return (
    <div className="dashboard-landing-theme dark min-h-screen overflow-x-hidden">
      <div className="dashboard-landing-content mx-auto w-full max-w-[88rem] min-w-0 px-4 py-6 sm:px-6 sm:py-8">
        <div className="mb-6 flex min-w-0 flex-col gap-5 sm:mb-8 xl:flex-row xl:items-end xl:justify-between">
          <div className="min-w-0 max-w-3xl">
            <div className="dashboard-eyebrow mb-4">
              <span className="dashboard-live-dot" />
              Inventory brands
            </div>
            <div className="flex min-w-0 items-start gap-4">
              <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-lg border border-[var(--dash-border-subtle)] bg-[var(--dash-brand-soft)] shadow-[0_16px_34px_rgba(47,125,246,0.18)]">
                <Award className="h-6 w-6 text-[var(--dash-brand-strong)]" />
              </div>
              <div className="min-w-0">
                <h1 className="text-3xl font-semibold tracking-tight text-[var(--dash-text)] sm:text-4xl">
                  Brand Catalog
                </h1>
                <p className="mt-2 max-w-2xl text-sm leading-6 text-[var(--dash-text-soft)] sm:text-base">
                  Manage bilingual brand records and item assignments from one focused workspace.
                </p>
              </div>
            </div>
          </div>
          <div className="flex w-full shrink-0 flex-col gap-2 sm:w-auto sm:flex-row sm:items-center">
            <Button asChild variant="outline" size="sm" className="dashboard-button-secondary h-10 w-full rounded-lg sm:w-auto">
              <Link href={`/${locale}/dashboard/inventory/items`}>
                <Package className="h-4 w-4" />
                <span>View Items</span>
              </Link>
            </Button>
            <Button asChild size="sm" className="dashboard-button-create h-10 w-full rounded-lg px-4 sm:w-auto">
              <Link href={`${basePath}/create`}>
                <Plus className="h-4 w-4" />
                <span>Add Brand</span>
              </Link>
            </Button>
          </div>
        </div>

        <Suspense fallback={<div className="dashboard-glass-panel rounded-lg p-8 text-sm text-[var(--dash-text-soft)]">Loading brands...</div>}>
          <EnhancedBrandsManagement data={initialBrandData} organizationId={organizationId} basePath={basePath} />
        </Suspense>
      </div>
    </div>
  )
}
