"use client"

import { useLocale } from "next-intl"
import { Skeleton } from "@/components/ui/skeleton"

export default function SalesLoading() {
  const french = useLocale() === "fr"
  return (
    <div className="space-y-4 p-6 motion-reduce:[&_.animate-pulse]:animate-none">
      <p role="status" aria-live="polite">{french ? "Chargement des ventes…" : "Loading sales…"}</p>
      <Skeleton className="h-8 w-36" />
      <Skeleton className="h-12 w-full" />
      <Skeleton className="h-80 rounded-xl" />
    </div>
  )
}
