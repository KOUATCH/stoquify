import { AlertTriangle, ArrowLeft } from "lucide-react"
import Link from "next/link"

import { ModernBrandForm } from "@/components/brands/ModernBrandForm"
import { Button } from "@/components/ui/button"
import { getAuthenticatedUser } from "@/config/useAuth"

type CreateBrandPageProps = {
  params: Promise<{ locale: string }>
}

export default async function CreateBrandPage({ params }: CreateBrandPageProps) {
  const { locale } = await params
  const user = await getAuthenticatedUser()
  const returnHref = `/${locale}/dashboard/inventory/brands`

  if (!user?.organizationId) {
    return (
      <div className="min-h-screen bg-background">
        <div className="mx-auto max-w-md px-4 py-16 text-center">
          <div className="mx-auto mb-6 flex h-14 w-14 items-center justify-center rounded-full bg-muted">
            <AlertTriangle className="h-7 w-7 text-muted-foreground" />
          </div>
          <h1 className="mb-2 text-xl font-semibold text-foreground">Organization Required</h1>
          <p className="mb-6 text-sm text-muted-foreground">No organization found for the current user.</p>
          <Button asChild variant="outline">
            <Link href={returnHref}>
              <ArrowLeft className="mr-2 h-4 w-4" />
              Back to Brands
            </Link>
          </Button>
        </div>
      </div>
    )
  }

  return <ModernBrandForm organizationId={user.organizationId} returnHref={returnHref} />
}
