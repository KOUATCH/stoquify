"use client"
import { useLocale } from "next-intl"
import { Button } from "@/components/ui/button"
export default function ProfileError({ reset }: { reset: () => void }) {
  const locale = useLocale()
  return <div className="dashboard-landing-theme dark space-y-4 p-6 text-[var(--dash-text)]"><p role="alert">{locale === "fr" ? "Le profil n’a pas pu être chargé. Vous pouvez réessayer." : "Your profile could not be loaded. You can try again."}</p><Button type="button" variant="outline" className="dashboard-button-secondary" onClick={reset}>{locale === "fr" ? "Réessayer" : "Try again"}</Button></div>
}
