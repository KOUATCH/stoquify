import React from "react"
import { createRoot } from "react-dom/client"
import { QueryProvider } from "@/lib/providers/query-provider"
import { CloseAssuranceCenter } from "@/components/accounting/CloseAssuranceCenter"
import { dashboard } from "./mocks"

const locale = location.pathname.startsWith("/fr") ? "fr" : "en"
const initial = dashboard()
createRoot(document.getElementById("root")!).render(<QueryProvider>
  <main className="dashboard-landing-theme dark min-h-screen px-4 py-6 text-[var(--dash-text)] sm:px-6">
    <div className="dashboard-landing-content mx-auto max-w-7xl space-y-5">
      <header className="rounded-lg border border-[var(--dash-border)] p-4">
        <h1 className="text-xl font-semibold">{locale === "fr" ? "Contrôle rendu de la clôture — simulation" : "Close assurance rendered fixture"}</h1>
        <p className="mt-2 text-sm">MOCKED AUTH / ACTIONS · STATIC LOOPBACK FIXTURE · NO DATABASE</p>
        <p className="mt-1 text-sm">{locale === "fr" ? "Aucun compte, document client ni opération métier réelle n’est connecté." : "No real account, customer document or business operation is connected."}</p>
      </header>
      <CloseAssuranceCenter initialData={initial as any} locale={locale} />
    </div>
  </main>
</QueryProvider>)
