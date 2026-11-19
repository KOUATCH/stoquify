"use client"
import { useParams } from "next/navigation"
import { DashboardRouteState } from "@/components/dashboard/DashboardRouteState"
import { localizePath, pickLocale } from "@/i18n/routing"
export default function PeopleLoading() {
  const locale = pickLocale(String(useParams().locale ?? "en"))
  return <DashboardRouteState kind="loading" locale={locale} primaryHref={localizePath("/dashboard",locale)} />
}
