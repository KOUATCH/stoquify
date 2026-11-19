import React, { useEffect } from "react"
import { createRoot } from "react-dom/client"
import { NextIntlClientProvider } from "next-intl"
import { useQueryClient } from "@tanstack/react-query"
import { QueryProvider } from "@/lib/providers/query-provider"
import PaymentReconciliationWorkbench from "@/components/finance/PaymentReconciliationWorkbench"
import en from "@/messages/en.json"
import fr from "@/messages/fr.json"
import { fixture } from "./mocks"

const locale = location.pathname.startsWith("/fr") ? "fr" : "en"
function BindClient() { const client = useQueryClient(); useEffect(() => fixture.bind(client), [client]); return null }
createRoot(document.getElementById("root")!).render(<NextIntlClientProvider locale={locale} messages={locale === "fr" ? fr : en} timeZone="UTC" now={new Date("2026-11-09T12:00:00Z")}>
  <QueryProvider><BindClient />
    <main className="dashboard-landing-theme dark min-h-screen px-4 py-6 text-[var(--dash-text)] sm:px-6">
      <div className="dashboard-landing-content mx-auto max-w-7xl space-y-5">
        <header className="rounded-lg border border-[var(--dash-border)] p-4">
          <h2 className="text-xl font-semibold">{locale === "fr" ? "Contrôle rendu du rapprochement mensuel — simulation" : "Monthly reconciliation rendered fixture"}</h2>
          <p className="mt-2 text-sm">MOCKED AUTH / ACTIONS · STATIC LOOPBACK FIXTURE · NO DATABASE</p>
          <p className="mt-1 text-sm">{locale === "fr" ? "Aucun compte, relevé ni opération métier réelle n’est connecté." : "No real account, statement or business operation is connected."}</p>
        </header>
        <PaymentReconciliationWorkbench />
      </div>
    </main>
  </QueryProvider>
</NextIntlClientProvider>)
