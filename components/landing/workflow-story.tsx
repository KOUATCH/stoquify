"use client"

import { useState } from "react"
import { useLocale } from "next-intl"
import { ArrowRight, Building2, FileCheck2, Store } from "lucide-react"
import { BusinessComputerPhoto, PhotoScreenButton } from "./photo-workspace"

const stories = [
  {
    id: "retail", image: "stoquify-courtyard-front", label: ["Retail & locations", "Commerce et sites"],
    alt: ["A laptop running Stoquify on a counter overlooking an open-air shopping courtyard", "Ordinateur portable affichant Stoquify sur un comptoir donnant sur une galerie commerçante à ciel ouvert"],
    title: ["Every location. One connected business.", "Tous vos sites. Une activité connectée."],
    body: ["Follow sales and stock across your locations. The operational trail supports your accounting firm’s review through linked accounting records.", "Suivez ventes et stocks sur vos sites. La trace des opérations étaye la revue du cabinet grâce aux données comptables liées."],
    steps: [
      { label: ["Follow your sales", "Suivre les ventes"], workflow: "sellToCash" },
      { label: ["Connect your stock", "Relier les stocks"], workflow: "stockToSale" },
      { label: ["See daily priorities", "Voir les priorités du jour"], workflow: "ownerDailyControl" },
    ],
  },
  {
    id: "bakery", image: "sme-bakery-aio", label: ["Bakery", "Boulangerie"],
    alt: ["A bakery counter with a Stoquify workstation", "Comptoir de boulangerie avec un poste Stoquify"],
    title: ["The sale is only the beginning.", "La vente n’est que le début."],
    body: ["The sale creates its receipt and payment record. Your accounting firm follows the accounting source links and reconciliation evidence.", "La vente crée son reçu et son paiement enregistré. Votre cabinet suit les liens sources comptables et les justificatifs de rapprochement."],
    steps: [
      { label: ["Record the sale", "Enregistrer la vente"], workflow: "sellToCash" },
      { label: ["Reconcile payments", "Rapprocher les paiements"], workflow: "paymentReconciliation" },
      { label: ["Prepare the close", "Préparer la clôture"], workflow: "accountingCloseAssurance" },
    ],
  },
  {
    id: "pharmacy", image: "sme-pharmacy-aio", label: ["Pharmacy", "Pharmacie"],
    alt: ["A pharmacy team working beside a Stoquify workstation", "Équipe en pharmacie près d’un poste Stoquify"],
    title: ["Know what came in. See what moves.", "Comprenez les entrées. Suivez les mouvements."],
    body: ["Connect orders, accepted deliveries and stock movements. Linked valuation and accounting evidence give your firm the context behind stock figures.", "Reliez commandes, livraisons acceptées et mouvements de stock. Les justificatifs de valorisation et de comptabilisation donnent au cabinet le contexte des chiffres."],
    steps: [
      { label: ["Receive purchases", "Réceptionner les achats"], workflow: "procureToPay" },
      { label: ["Track your stock", "Suivre les stocks"], workflow: "stockToSale" },
      { label: ["Sell with context", "Vendre avec les bonnes données"], workflow: "sellToCash" },
    ],
  },
  {
    id: "materials", image: "sme-materials-aio", label: ["Building supplies", "Matériaux de construction"],
    alt: ["A building-material store with a Stoquify workstation", "Magasin de matériaux de construction avec un poste Stoquify"],
    title: ["Keep commitments and collections connected.", "Reliez engagements et encaissements."],
    body: ["Follow supplier balances, invoices and collections. Your firm reviews the accounting trail using records already held in Stoquify.", "Suivez soldes fournisseurs, factures et encaissements. Votre cabinet examine la trace comptable à partir des données déjà dans Stoquify."],
    steps: [
      { label: ["Review suppliers", "Suivre les fournisseurs"], workflow: "procureToPay" },
      { label: ["Follow client invoices", "Suivre les factures clients"], workflow: "customerToCollection" },
      { label: ["Explain collections", "Justifier les encaissements"], workflow: "paymentReconciliation" },
    ],
  },
  {
    id: "accountingFirm", image: "sme-accounting-firm", label: ["Accounting firm", "Cabinet comptable"],
    alt: ["Illustrative accounting firm reviewing a client’s records together", "Cabinet comptable illustratif examinant ensemble les données d’un client"],
    title: ["Start with the activity already recorded.", "Partez de l’activité déjà enregistrée."],
    body: ["Your client runs the business in Stoquify. Review its posted accounting records, source links and reconciliation evidence with the client’s authorization. Focus follow-up on exceptions.", "Votre client pilote son activité dans Stoquify. Avec son autorisation, examinez ses écritures comptabilisées, liens sources et justificatifs de rapprochement. Concentrez le suivi sur les anomalies."],
    steps: [
      { label: ["Follow sales into accounting", "Relier ventes et comptabilité"], workflow: "sellToCash" },
      { label: ["Review reconciliation evidence", "Examiner les rapprochements"], workflow: "paymentReconciliation" },
      { label: ["Review the period together", "Examiner la période ensemble"], workflow: "accountingCloseAssurance" },
    ],
  },
] as const

/** An illustrative story, not a tenant's live operating status. */
export function WorkflowStory() {
  const fr = useLocale() === "fr"
  const text = (copy: readonly [string, string]) => copy[fr ? 1 : 0]
  const [selected, setSelected] = useState(0)
  const story = stories[selected]
  return <div className="workflow-story">
    <div className="workflow-story-choices" role="group" aria-label={fr ? "Choisir un exemple métier" : "Choose a business example"}>
      {stories.map((item, index) => <button key={item.id} type="button" aria-pressed={selected === index} aria-controls="workflow-story-panel" onClick={() => setSelected(index)}>
        {text(item.label)}
      </button>)}
    </div>
    <div id="workflow-story-panel" className="workflow-story-panel">
      <figure className="workflow-story-photo">
        {stories.map((item, index) => <WorkflowScene key={item.id} story={item} active={selected === index} />)}
        <figcaption>{story.id === "accountingFirm" ? <Building2 size={15} aria-hidden="true" /> : <Store size={15} aria-hidden="true" />}{fr ? "Scène illustrative · Stoquify au quotidien" : "Illustrative scene · Stoquify at work"}</figcaption>
      </figure>
      <div className="workflow-story-record">
        <PhotoScreenButton key={story.id} scene={story.id} />
        <div className="workflow-story-records">
        {stories.map((item, itemIndex) => <div key={item.id} className="workflow-story-record-panel" aria-hidden={selected !== itemIndex} inert={selected !== itemIndex}>
        <div className="workflow-story-caption">
          <FileCheck2 size={22} aria-hidden="true" /><div className="workflow-story-copy"><h2>{text(item.title)}</h2><p>{text(item.body)}</p></div>
        </div>
        <ol className="workflow-story-steps">
          {item.steps.map((step, index) => <li key={step.workflow}>
            <a href={`#workflow-${step.workflow}`}><span className="workflow-step-number">0{index + 1}</span><span>{text(step.label)}</span><ArrowRight size={16} aria-hidden="true" /></a>
          </li>)}
        </ol>
        </div>)}
        </div>
        <span className="sr-only" role="status" aria-live="polite" aria-atomic="true">{text(story.title)}</span>
      </div>
    </div>
  </div>
}


function WorkflowScene({ story, active }: { story: typeof stories[number]; active: boolean }) {
  const fr = useLocale() === "fr"
  return <div className="workflow-scene-media" data-active={active} aria-hidden={!active}>
    <BusinessComputerPhoto scene={story.id} alt={story.alt[fr ? 1 : 0]} priority={story.id === "retail"} />
  </div>
}
