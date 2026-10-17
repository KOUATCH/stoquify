import type { SVGProps } from "react"
jest.mock("lucide-react", () => {
  const createIcon = (name: string) => {
    const Icon = (props: SVGProps<SVGSVGElement>) => <svg data-testid={`icon-${name}`} {...props} />
    return Icon
  }

  return new Proxy(
    { __esModule: true },
    {
      get(target, prop: string) {
        if (prop in target) return target[prop as keyof typeof target]
        return createIcon(prop)
      },
    },
  )
})

import { render, screen } from "@testing-library/react"
import { ProofTrailDrawer } from "../ProofTrailDrawer"
import type { ProofTrailResult } from "@/services/evidence/evidence-contracts"
import { presentProofTrail, proofTypeLabel } from "../proof-trail-presentation"

const proof: ProofTrailResult = {
  organizationId: "org-1", subjectType: "payment.transaction", subjectId: "payment-1", moduleSlug: "payment_reconciliation",
  evidenceGrade: "raw", reason: "Source is pending confirmation", freshness: "unknown", generatedAt: "2026-09-28T00:00:00Z",
  sourceModules: ["payments"], nodes: [], edges: [], blockers: [], redactions: [], nextActions: [], audit: { accessLogged: true, sensitiveAccess: true },
}

describe("ProofTrailDrawer", () => {
  it.each(["en", "fr"] as const)("localizes portal controls and announces loading and failures in %s", locale => {
    const { rerender } = render(<ProofTrailDrawer open onOpenChange={jest.fn()} proofTrail={null} isLoading locale={locale} />)
    expect(screen.getByRole("dialog", { name: locale === "fr" ? "Piste de preuve" : "Proof Trail" })).toBeVisible()
    expect(screen.getByRole("button", { name: locale === "fr" ? "Fermer la preuve" : "Close proof" })).toBeVisible()
    expect(screen.getByRole("status")).toHaveTextContent(locale === "fr" ? "Chargement" : "Loading")
    rerender(<ProofTrailDrawer open onOpenChange={jest.fn()} proofTrail={proof} error="Retry the selected proof" locale={locale} />)
    expect(screen.getByRole("alert")).toHaveTextContent("Retry the selected proof")
    expect(screen.queryByText(proof.reason)).not.toBeInTheDocument()
    rerender(<ProofTrailDrawer open onOpenChange={jest.fn()} proofTrail={null} locale={locale} />)
    expect(screen.getByText(locale === "fr" ? /Sélectionnez un document/ : /Select a supported record/)).toBeVisible()
  })

  it.each(["en", "fr"] as const)("preserves authoritative proof content and its non-assurance meaning in %s", locale => {
    render(<ProofTrailDrawer open onOpenChange={jest.fn()} proofTrail={proof} locale={locale} />)
    expect(screen.getByText(proof.reason)).toBeVisible()
    expect(screen.getByRole("heading", { name: locale === "fr" ? "Éléments de preuve" : "Evidence Nodes" })).toBeVisible()
    expect(screen.getByText(locale === "fr" ? "Inconnue" : "Unknown")).toBeVisible()
    expect(screen.getByText(locale === "fr" ? /Aucun blocage de preuve n’a été renvoyé/ : /No proof blockers were returned/)).toBeVisible()
    expect(screen.getByText(locale === "fr" ? "L’accès aux preuves sensibles a été journalisé." : "Sensitive proof access was audited.")).toBeVisible()
  })

  it.each([
    ["Journal entry exists but is not posted.", "L’écriture existe, mais elle n’est pas comptabilisée."],
    ["Reconciliation run has unresolved exceptions, suspense, or failed state.", "Le rapprochement présente des anomalies, des suspens non résolus ou un état d’échec."],
    ["Close run has unresolved blockers or unavailable evidence.", "La clôture présente des blocages non résolus ou des preuves indisponibles."],
    ["Payment transaction has unresolved proof blockers.", "La transaction de paiement présente des blocages de preuve non résolus."],
  ])("translates the canonical reason %s", (reason, translated) => {
    render(<ProofTrailDrawer open onOpenChange={jest.fn()} proofTrail={{ ...proof, reason }} locale="fr" />)
    expect(screen.getByText(translated)).toBeVisible()
    expect(screen.queryByText(reason)).not.toBeInTheDocument()
  })

  it("translates generated display prose without changing source identity, metadata, grades or custom record text", () => {
    const source: ProofTrailResult = { ...proof, evidenceGrade: "blocked", freshness: "blocked",
      reason: "Payment transaction has unresolved proof blockers.",
      nodes: [
        { id: "payment", nodeType: "payment.transaction", nodeId: "payment-1", label: "Payment transaction payment-1", moduleSlug: "payments", evidenceGrade: "blocked", available: true, redacted: false, metadata: { amount: "123.00", status: "FAILED" } },
        { id: "custom", nodeType: "close.finding", nodeId: "finding-1", label: "Open payment exception", moduleSlug: "close", evidenceGrade: "blocked", available: true, redacted: false },
        { id: "provider", nodeType: "payment.provider_reference", nodeId: "redacted", label: "Redacted evidence", moduleSlug: "payments", evidenceGrade: "raw", available: true, redacted: true },
      ],
      edges: [{ fromNodeId: "custom", toNodeId: "payment", edgeType: "blocks", label: "Blocks payment trust", evidenceGrade: "blocked" }],
      blockers: [{ id: "payment-transaction-open-exceptions", severity: "high", gate: "payments.reconciliation.exceptions", title: "Open payment exceptions remain", detail: "15 exception(s) remain open for this transaction.", sourceTables: ["payment_exceptions"], nextAction: "Resolve payment exceptions before trusting this transaction as reconciled." }],
      redactions: [{ id: "protected", field: "nodes.provider", reason: "Provider references are protected by payment provider reference redaction policy.", policy: "private" }],
    }
    const before = JSON.stringify(source),translated = presentProofTrail(source, "fr")
    expect(presentProofTrail(source, "en")).toBe(source)
    expect(JSON.stringify(source)).toBe(before)
    expect(translated.nodes[0].label).toBe("Transaction de paiement payment-1")
    expect(translated.nodes[1]).toEqual(source.nodes[1])
    expect(translated.nodes[2].label).toBe("Preuve masquée")
    expect(translated.blockers[0].detail).toBe("15 anomalie(s) restent ouvertes pour cette transaction.")
    const restoreDisplay = { ...translated, reason: source.reason,
      nodes: translated.nodes.map((node,i) => ({ ...node, label: source.nodes[i].label })),
      edges: translated.edges.map((edge,i) => ({ ...edge, label: source.edges[i].label })),
      blockers: translated.blockers.map((blocker,i) => ({ ...blocker, title: source.blockers[i].title, detail: source.blockers[i].detail, nextAction: source.blockers[i].nextAction })),
      redactions: translated.redactions.map((redaction,i) => ({ ...redaction, reason: source.redactions[i].reason })),
    }
    expect(restoreDisplay).toEqual(source)
    render(<ProofTrailDrawer open onOpenChange={jest.fn()} proofTrail={source} locale="fr" />)
    expect(screen.getByText("Open payment exception vers Transaction de paiement payment-1")).toBeVisible()
    expect(screen.getByText("Des anomalies de paiement restent ouvertes")).toBeVisible()
  })

  it("preserves unknown prose, custom errors, unknown types and prototype-property names", () => {
    const source = { ...proof, reason: "constructor", blockers: [{ id: "custom", severity: "high" as const, gate: "custom", title: "Custom instruction", detail: "Source-specific failure 17", sourceTables: ["custom"] }] }
    expect(presentProofTrail(source, "fr")).toEqual(source)
    expect(proofTypeLabel("constructor", "fr")).toBe("constructor")
  })
})
