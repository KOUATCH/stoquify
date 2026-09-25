"use client"

import Link from "next/link"
import { useRouter } from "next/navigation"
import { useLocale, useTranslations } from "next-intl"
import { ArrowLeft } from "lucide-react"
import { Button } from "@/components/ui/button"
import { localizePath, pickLocale } from "@/i18n/routing"
import { CreateTransferForm } from "./CreateTransferModal"

export function CreateTransferPage({ organizationId }: { organizationId: string }) {
  const router = useRouter()
  const locale = pickLocale(useLocale())
  const t = useTranslations("inventoryTransferCreate")
  const transfersHref = localizePath("/dashboard/inventory/transfers", locale)

  return (
    <div className="dashboard-landing-theme min-h-screen">
      <div className="dashboard-landing-content mx-auto flex w-full min-w-0 max-w-[88rem] flex-col gap-6 px-4 py-6 sm:px-6 sm:py-8">
        <nav aria-label={t("navigation")}>
          <Button asChild variant="outline" className="dashboard-button-secondary">
            <Link href={transfersHref}><ArrowLeft className="h-4 w-4" />{t("back")}</Link>
          </Button>
        </nav>
        <CreateTransferForm organizationId={organizationId} onCancel={() => router.push(transfersHref)} onSuccess={(id) => router.push(id ? `${transfersHref}/${id}` : transfersHref)} />
      </div>
    </div>
  )
}
