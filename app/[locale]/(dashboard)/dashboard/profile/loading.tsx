"use client"
import { useLocale } from "next-intl"
export default function LoadingProfile() {
  const locale = useLocale()
  return <div className="dashboard-landing-theme dark p-6 text-[var(--dash-text)]"><p role="status">{locale === "fr" ? "Chargement de votre profil…" : "Loading your profile…"}</p></div>
}
