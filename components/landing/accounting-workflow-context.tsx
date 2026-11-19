"use client"

import { Building2 } from "lucide-react"
import { useLocale } from "next-intl"
import type { CinematicModuleId } from "./cinematic-modules"

// Operational records feed accounting review through configured postings and
// source links. A client grant does not grant access to every operational module.
const context: Record<CinematicModuleId, { records: readonly [string, string]; review: readonly [string, string] }> = {
  pos: {
    records: ["Sale, receipt, payment record and stock movement.", "Vente, reçu, paiement enregistré et mouvement de stock."],
    review: ["Your firm follows the sale’s accounting source links instead of rebuilding the transaction from separate files.", "Votre cabinet suit les liens sources comptables de la vente, sans reconstituer l’opération à partir de fichiers séparés."],
  },
  inventory: {
    records: ["Receipts, transfers, stock movements and valuation records.", "Réceptions, transferts, mouvements de stock et données de valorisation."],
    review: ["Your firm uses linked valuation and accounting evidence to understand the stock behind the figures.", "Votre cabinet s’appuie sur les justificatifs de valorisation et de comptabilisation liés pour comprendre les stocks derrière les chiffres."],
  },
  receivables: {
    records: ["Customer invoices, due dates, collections and outstanding balances.", "Factures clients, échéances, encaissements et soldes ouverts."],
    review: ["Your firm reviews the accounting trail behind receivables, with the invoice and collection context already recorded.", "Votre cabinet examine la trace comptable des créances, avec le contexte des factures et encaissements déjà enregistré."],
  },
  payables: {
    records: ["Purchase orders, goods receipts and recorded supplier bills.", "Commandes d’achat, réceptions et factures fournisseurs enregistrées."],
    review: ["Your firm reviews payable balances and their source links. Supplier-issued documents remain external evidence where required.", "Votre cabinet examine les dettes et leurs liens sources. Les documents émis par les fournisseurs restent des justificatifs externes lorsqu’ils sont nécessaires."],
  },
  finance: {
    records: ["Internal payment references, reconciliation decisions and unresolved differences.", "Références des paiements internes, décisions de rapprochement et écarts non résolus."],
    review: ["Your firm can assess the reconciliation evidence. Bank statements or provider evidence still establish the external side of the match.", "Votre cabinet peut examiner les justificatifs de rapprochement. Les relevés bancaires ou preuves du prestataire restent nécessaires pour établir la contrepartie externe."],
  },
  hris: {
    records: ["Employee, contract and time records used to prepare payroll inputs.", "Dossiers salariés, contrats et temps utilisés pour préparer les données de paie."],
    review: ["Reviewed inputs support the payroll accounting trail. Accountant access does not automatically expose personnel files.", "Les données vérifiées étayent la trace comptable de la paie. L’accès comptable n’ouvre pas automatiquement les dossiers du personnel."],
  },
  payroll: {
    records: ["Calculated payroll runs, issued payslips and payroll posting references.", "Paies calculées, bulletins émis et références de comptabilisation de la paie."],
    review: ["Your firm follows payroll posting and payment evidence in the accounting review, with country rules and approvals kept distinct.", "Votre cabinet suit les justificatifs de comptabilisation et de paiement de la paie lors de la revue, avec les règles du pays et les approbations propres à chaque étape."],
  },
  accounting: {
    records: ["Posted journals, ledger balances, source links and period checks.", "Écritures comptabilisées, soldes du grand livre, liens sources et contrôles de période."],
    review: ["Your firm reviews existing records, explains exceptions and retains conclusions for close preparation. Missing evidence is a follow-up, not the starting point.", "Votre cabinet examine les données existantes, explique les anomalies et conserve ses conclusions pour préparer la clôture. Les pièces manquantes font l’objet d’un suivi, pas d’un point de départ."],
  },
}

export function AccountingWorkflowContext({ module }: { module: CinematicModuleId }) {
  const fr = useLocale() === "fr"
  const copy = context[module]
  return (
    <div className="accounting-workflow-context" role="group" data-accounting-context={module} aria-label={fr ? "Le rôle du cabinet comptable" : "The accounting firm’s role"}>
      <div className="accounting-context-label"><Building2 size={18} aria-hidden="true" />{fr ? "CABINET COMPTABLE · LE FIL DES OPÉRATIONS" : "ACCOUNTING FIRM · CONNECTED TO THE RECORD"}</div>
      <dl>
        <div><dt>{fr ? "Déjà dans Stoquify" : "Already in Stoquify"}</dt><dd>{copy.records[fr ? 1 : 0]}</dd></div>
        <div><dt>{fr ? "Pour la revue du cabinet" : "For your firm’s review"}</dt><dd>{copy.review[fr ? 1 : 0]}</dd></div>
      </dl>
    </div>
  )
}
