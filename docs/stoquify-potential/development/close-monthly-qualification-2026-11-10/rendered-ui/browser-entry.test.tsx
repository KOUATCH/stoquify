import React from "react"
import { createRoot } from "react-dom/client"
import { CustomerSettlementControls } from "@/components/finance/CustomerSettlementControls"
import { useFixture } from "./mocks.test"

function Fixture() {
  const state = useFixture(), locale = location.pathname.startsWith("/fr") ? "fr" : "en"
  const scope = state.ready && state.allowRead ? { userId: state.actorId, organizationId: state.organizationId,
    permissions: ["finance.receivables.read", ...(state.allowCollect ? ["finance.receivables.collect"] : [])] } : null
  return <main className="dashboard-landing-theme dark min-h-screen px-4 py-6 text-[var(--dash-text)] sm:px-6">
    <div className="dashboard-landing-content mx-auto max-w-3xl space-y-5">
      <header className="rounded-lg border border-[var(--dash-border)] p-4">
        <h1 className="text-xl font-semibold">{locale === "fr" ? "Paiement client — contrôle rendu simulé" : "Customer payment rendered fixture"}</h1>
        <p className="mt-2 text-sm">MOCKED AUTH / ACTIONS · STATIC LOOPBACK FIXTURE · NO DATABASE</p>
        <p className="mt-1 text-sm">{locale === "fr" ? "Aucun compte, encaissement ou prestataire réel n’est connecté." : "No real account, collection or provider is connected."}</p>
      </header>
      <h2 className="sr-only">{locale === "fr" ? "Espace de paiement simulé" : "Mocked payment workspace"}</h2>
      {state.mounted ? <CustomerSettlementControls customerId={state.customerId} referenceId={state.referenceId} locale={locale} scope={scope} onChanged={() => {}} /> : <p role="status">Fixture unmounted</p>}
    </div>
  </main>
}

createRoot(document.getElementById("root")!).render(<Fixture />)
