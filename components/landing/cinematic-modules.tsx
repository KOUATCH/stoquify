"use client"

import { useLocale } from "next-intl"
import {
  Banknote,
  BookOpen,
  Boxes,
  Check,
  ClipboardList,
  Package,
  ReceiptText,
  ScanLine,
  Users,
  ArrowUpRight,
  FileCheck2,
} from "lucide-react"

// Append modules to preserve the existing public deep-link indices.
export const cinematicModules = [
  {
    id: "pos",
    label: ["POS & sales", "Caisse et ventes"],
    title: ["Keep every sale in view.", "Gardez le fil de chaque vente."],
    body: [
      "Serve customers, record the sale and keep its receipt, payment and stock movement connected.",
      "Servez vos clients et retrouvez le reçu, le paiement et le mouvement de stock liés à chaque vente.",
    ],
    workflow: "customerToCollection",
    icon: ScanLine,
  },
  {
    id: "inventory",
    label: ["Inventory & locations", "Stocks et sites"],
    title: [
      "Know what is available. And where.",
      "Sachez ce qui est disponible. Et où.",
    ],
    body: [
      "Follow receipts, transfers and stock counts by location. Trace each quantity change to its source.",
      "Suivez réceptions, transferts et inventaires par site. Retrouvez l’origine de chaque variation de stock.",
    ],
    workflow: "stockToSale",
    icon: Boxes,
  },
  {
    id: "finance",
    label: ["Finance & reconciliation", "Finance et rapprochement"],
    title: [
      "Give every payment an explanation.",
      "Expliquez chaque mouvement d’argent.",
    ],
    body: [
      "Reconcile recorded payments with imported statements or supported provider evidence. Investigate unmatched items and retain the review behind each resolution.",
      "Rapprochez les paiements des relevés importés ou des justificatifs des prestataires pris en charge. Examinez les écarts et conservez les décisions de résolution.",
    ],
    workflow: "paymentReconciliation",
    icon: Banknote,
  },
  {
    id: "accounting",
    label: ["OHADA accounting & close", "Comptabilité OHADA et clôture"],
    title: [
      "Keep the records. Prepare the close.",
      "Tenez les comptes. Préparez la clôture.",
    ],
    body: [
      "Work with SYSCOHADA account references, source-linked journals and period-end checks. Review reconciliation differences and missing evidence before closing.",
      "Travaillez avec les références SYSCOHADA, les écritures liées aux pièces et les contrôles de fin de période. Examinez écarts et justificatifs manquants avant la clôture.",
    ],
    workflow: "accountingCloseAssurance",
    icon: BookOpen,
  },
  {
    id: "hris",
    label: ["HRIS & people", "SIRH et personnel"],
    title: [
      "Keep your people records together.",
      "Réunissez vos dossiers du personnel.",
    ],
    body: [
      "Bring employee records, contracts and time information into HRIS. Prepare payroll inputs from people records your team can review.",
      "Réunissez dossiers salariés, contrats et temps de travail dans le SIRH. Préparez les données de paie à partir de dossiers que votre équipe peut vérifier.",
    ],
    workflow: "peopleToPay",
    icon: Users,
  },
  {
    id: "payroll",
    label: ["Payroll & review", "Paie et contrôles"],
    title: [
      "Prepare payroll with a clear checklist.",
      "Préparez la paie avec des contrôles clairs.",
    ],
    body: [
      "Review people and time inputs, payroll runs and payslips. Country rules and payment evidence retain their own checks.",
      "Vérifiez les données du personnel, les temps, les calculs et les bulletins. Les règles du pays et les paiements gardent leurs contrôles.",
    ],
    workflow: "peopleToPay",
    icon: ClipboardList,
  },
  {
    id: "payables",
    label: ["AP & suppliers", "Fournisseurs et comptes à payer"],
    title: [
      "From supplier bill to payment review.",
      "De la facture fournisseur au règlement.",
    ],
    body: [
      "Connect suppliers, purchase orders, goods received and supplier invoices. Review amounts due and supporting documents before preparing payment.",
      "Reliez fournisseurs, commandes, réceptions et factures d’achat. Vérifiez les échéances et les justificatifs avant de préparer le règlement.",
    ],
    workflow: "procureToPay",
    icon: Package,
  },
  {
    id: "receivables",
    label: ["AR, clients & invoicing", "Clients, facturation et créances"],
    title: [
      "Keep each invoice and collection connected.",
      "Reliez chaque facture à son encaissement.",
    ],
    body: [
      "Follow customer invoices, due dates and outstanding balances. Link collections to the customer record and keep unpaid amounts visible for follow-up.",
      "Suivez les factures clients, les échéances et les soldes à recevoir. Reliez les encaissements au dossier client et gardez les impayés visibles pour les relances.",
    ],
    workflow: "customerToCollection",
    icon: ReceiptText,
  },
] as const

export type CinematicModuleId = (typeof cinematicModules)[number]["id"]

export function CinematicModuleScene({
  module,
}: {
  module: CinematicModuleId
}) {
  const fr = useLocale() === "fr"
  const t = (en: string, french: string) => (fr ? french : en)
  const row = (
    name: string,
    value: string,
    state?: string,
    checked = false,
  ) => (
    <div className="module-row" key={name}>
      <span>{name}</span>
      <b>{value}</b>
      {state && (
        <em className={checked ? "checked" : "pending"}>
          {checked && <Check size={12} aria-hidden="true" />}
          {state}
        </em>
      )}
    </div>
  )
  return (
    <div className={`module-scene scene-${module}`} data-module={module}>
      {module === "pos" && (
        <>
          <div className="scene-topline">
            <span>{t("Main shop · Register 01", "Boutique · Caisse 01")}</span>
            <span>SALE-104</span>
          </div>
          <div className="checkout-layout">
            <div className="product-shelf">
              {[
                ["Coffee", "Café"],
                ["Tea", "Thé"],
                ["Cocoa", "Cacao"],
                ["Basket", "Panier"],
              ].map(([en, french], i) => (
                <div className="shelf-item" key={en}>
                  <Package aria-hidden="true" />
                  <span>{t(en, french)}</span>
                  <small>
                    {[2500, 1500, 3000, 4500][i].toLocaleString(
                      fr ? "fr-FR" : "en-GB",
                    )}{" "}
                    XAF
                  </small>
                </div>
              ))}
            </div>
            <div className="receipt-sheet">
              <ReceiptText size={22} aria-hidden="true" />
              <strong>{t("Sale receipt", "Reçu de vente")}</strong>
              {row(t("Coffee × 1", "Café × 1"), "2 500")}
              {row(t("Tea × 1", "Thé × 1"), "1 500")}
              <div className="receipt-total">
                <span>Total</span>
                <b>4 000 XAF</b>
              </div>
              <span className="scene-stamp">
                <Check size={14} aria-hidden="true" />
                {t("Sale recorded", "Vente enregistrée")}
              </span>
            </div>
          </div>
          <div className="scene-caption">
            <Boxes size={17} aria-hidden="true" />
            {t(
              "2 items · stock movement linked",
              "2 articles · mouvement de stock relié",
            )}
          </div>
        </>
      )}
      {module === "inventory" && (
        <>
          <div className="scene-topline">
            <span>{t("Location stock", "Stock par site")}</span>
            <span>SKU-024</span>
          </div>
          <div className="location-map">
            <div>
              <Boxes aria-hidden="true" />
              <strong>120</strong>
              <small>{t("Warehouse", "Entrepôt")}</small>
            </div>
            <div className="transfer-track">
              <span>24 {t("units", "unités")}</span>
              <i />
              <ArrowUpRight aria-hidden="true" />
            </div>
            <div>
              <Package aria-hidden="true" />
              <strong>48</strong>
              <small>{t("Main shop", "Boutique")}</small>
            </div>
          </div>
          <div className="scene-table">
            {row(
              t("Goods received", "Réception"),
              "+120",
              t("Recorded", "Enregistrée"),
              true,
            )}
            {row(
              t("Transfer to shop", "Transfert en boutique"),
              "24",
              t("Recorded", "Enregistré"),
              true,
            )}
            {row(
              t("Stock count", "Inventaire"),
              "SKU-024",
              t("To review", "À vérifier"),
            )}
          </div>
          <div className="scene-caption">
            <FileCheck2 size={17} aria-hidden="true" />
            {t(
              "Quantity · location · source document",
              "Quantité · site · pièce d’origine",
            )}
          </div>
        </>
      )}
      {module === "finance" && (
        <>
          <div className="scene-topline">
            <span>{t("Payment review", "Vérification des paiements")}</span>
            <span>XAF</span>
          </div>
          <div className="finance-pair">
            <div>
              <small>{t("Recorded payment", "Paiement enregistré")}</small>
              <strong>4 000</strong>
              <span>SALE-104</span>
            </div>
            <div>
              <small>{t("Supporting evidence", "Justificatif")}</small>
              <strong>4 000</strong>
              <span>REF-104</span>
            </div>
          </div>
          <div className="matching-line">
            <i />
            <FileCheck2 aria-hidden="true" />
            <i />
          </div>
          <div className="scene-table">
            {row(
              t("Source record", "Pièce d’origine"),
              "SALE-104",
              t("Available", "Disponible"),
              true,
            )}
            {row(t("Difference", "Écart"), "0 XAF")}
            {row(
              t("Reconciliation", "Rapprochement"),
              "",
              t("Review pending", "À vérifier"),
            )}
          </div>
          <div className="scene-caption">
            {t(
              "Matching amounts still require review.",
              "Des montants identiques restent à vérifier.",
            )}
          </div>
        </>
      )}
      {module === "payables" && (
        <>
          <div className="scene-topline">
            <span>
              {t("Supplier account · October", "Compte fournisseur · Octobre")}
            </span>
            <span>XAF</span>
          </div>
          <div className="finance-pair">
            <div>
              <small>{t("Supplier invoice", "Facture fournisseur")}</small>
              <strong>120 000</strong>
              <span>BILL-028</span>
            </div>
            <div>
              <small>{t("Amount due", "Montant à payer")}</small>
              <strong>120 000</strong>
              <span>{t("Due 31 Oct", "Échéance 31 oct.")}</span>
            </div>
          </div>
          <div className="scene-table">
            {row(
              t("Purchase order", "Commande"),
              "PO-028",
              t("Available", "Disponible"),
              true,
            )}
            {row(
              t("Goods receipt", "Bon de réception"),
              "GR-028",
              t("Available", "Disponible"),
              true,
            )}
            {row(
              t("Invoice review", "Contrôle de facture"),
              "BILL-028",
              t("Pending", "En attente"),
            )}
          </div>
          <div className="scene-caption">
            <FileCheck2 size={17} aria-hidden="true" />
            {t(
              "Order → receipt → invoice → payment review",
              "Commande → réception → facture → contrôle du règlement",
            )}
          </div>
        </>
      )}
      {module === "receivables" && (
        <>
          <div className="scene-topline">
            <span>
              {t("Customer account · October", "Compte client · Octobre")}
            </span>
            <span>CLIENT-012</span>
          </div>
          <div className="journal-summary">
            <ReceiptText aria-hidden="true" />
            <div>
              <small>{t("Customer invoice", "Facture client")}</small>
              <strong>INV-104 · 60 000 XAF</strong>
            </div>
            <span className="pending">
              {t("Part paid", "Paiement partiel")}
            </span>
          </div>
          <div className="scene-table">
            {row(t("Invoice date", "Date de facture"), "15/10")}
            {row(
              t("Collection recorded", "Encaissement enregistré"),
              "40 000 XAF",
              t("Recorded", "Enregistré"),
              true,
            )}
            {row(t("Outstanding", "Reste à recevoir"), "20 000 XAF")}
            {row(
              t("Due date", "Échéance"),
              "31/10",
              t("Follow-up", "À suivre"),
            )}
          </div>
          <div className="scene-caption">
            <Users size={17} aria-hidden="true" />
            {t(
              "Customer → invoice → collection → balance",
              "Client → facture → encaissement → solde",
            )}
          </div>
        </>
      )}
      {module === "accounting" && (
        <>
          <div className="scene-topline">
            <span>{t("Journal review", "Révision du journal")}</span>
            <span>{t("October · XAF", "Octobre · XAF")}</span>
          </div>
          <div className="journal-summary">
            <BookOpen aria-hidden="true" />
            <div>
              <small>{t("Source document", "Pièce d’origine")}</small>
              <strong>SALE-104</strong>
            </div>
            <span className="pending">{t("To review", "À vérifier")}</span>
          </div>
          <div className="journal-table">
            <div>
              <span>{t("Entry", "Écriture")}</span>
              <span>{t("Debit", "Débit")}</span>
              <span>{t("Credit", "Crédit")}</span>
            </div>
            <div>
              <span>{t("Cash", "Caisse")}</span>
              <b>4 000</b>
              <b>—</b>
            </div>
            <div>
              <span>{t("Sales", "Ventes")}</span>
              <b>—</b>
              <b>4 000</b>
            </div>
            <div>
              <span>Total</span>
              <b>4 000</b>
              <b>4 000</b>
            </div>
          </div>
          <div className="scene-caption">
            <FileCheck2 size={17} aria-hidden="true" />
            {t(
              "Simplified example · posting rules need review",
              "Exemple simplifié · règles comptables à vérifier",
            )}
          </div>
        </>
      )}
      {module === "hris" && (
        <>
          <div className="scene-topline">
            <span>{t("Employee directory", "Dossiers du personnel")}</span>
            <span>{t("Sample team", "Équipe fictive")}</span>
          </div>
          <div className="people-cards">
            {["AM", "JK", "SN"].map((initials, i) => (
              <div key={initials}>
                <span className="person-avatar">
                  <Users aria-hidden="true" />
                </span>
                <strong>{initials}</strong>
                <small>
                  {
                    [
                      t("Operations", "Opérations"),
                      t("Sales", "Ventes"),
                      t("Finance", "Finance"),
                    ][i]
                  }
                </small>
              </div>
            ))}
          </div>
          <div className="scene-table">
            {row(
              t("Employee record", "Dossier salarié"),
              "EMP-024",
              t("Available", "Disponible"),
              true,
            )}
            {row(
              t("Contract", "Contrat"),
              "DOC-024",
              t("Available", "Disponible"),
              true,
            )}
            {row(
              t("Time inputs", "Temps de travail"),
              t("October", "Octobre"),
              t("To review", "À vérifier"),
            )}
          </div>
          <div className="scene-caption">
            <Users size={17} aria-hidden="true" />
            {t(
              "People · contracts · time records",
              "Personnel · contrats · temps de travail",
            )}
          </div>
        </>
      )}
      {module === "payroll" && (
        <>
          <div className="scene-topline">
            <span>{t("Payroll preparation", "Préparation de la paie")}</span>
            <span>{t("October · sample", "Octobre · exemple")}</span>
          </div>
          <div className="payroll-layout">
            <div className="payroll-checks">
              {row(
                t("People records", "Dossiers salariés"),
                "",
                t("Reviewed", "Vérifiés"),
                true,
              )}
              {row(
                t("Time inputs", "Temps de travail"),
                "",
                t("Reviewed", "Vérifiés"),
                true,
              )}
              {row(
                t("Country rules", "Règles du pays"),
                "",
                t("To review", "À vérifier"),
              )}
            </div>
            <div className="payslip-sheet">
              <ClipboardList aria-hidden="true" />
              <strong>{t("Payslip", "Bulletin")}</strong>
              <small>EMP-024</small>
              <i />
              <i />
              <i />
              <span className="pending">{t("Draft", "Brouillon")}</span>
            </div>
          </div>
          <div className="scene-caption">
            {t(
              "Review inputs before approving a payroll run.",
              "Vérifiez les données avant d’approuver la paie.",
            )}
          </div>
        </>
      )}
    </div>
  )
}

export function CinematicModuleArt({ module }: { module: CinematicModuleId }) {
  return (
    <div className={`art module-art module-art-${module}`} aria-hidden="true">
      <div className="art-workspace">
        <CinematicModuleScene module={module} />
      </div>
    </div>
  )
}
