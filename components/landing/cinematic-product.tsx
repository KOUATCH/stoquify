"use client"

import { PreviewLogo } from "./preview-logo"

import { useEffect, useRef, useState } from "react"
import { useLocale } from "next-intl"
import { Link } from "@/i18n/navigation"
import { landingMessageCopy } from "./landing-message-copy"
import { CinematicModuleScene } from "./cinematic-modules"
import { ProductWorkflowDemo, WorkflowDemoPlaceholder } from "./product-workflow-demo"
import { AccountingWorkflowContext } from "./accounting-workflow-context"
import { useLandingWorkflowLibrary } from "./landing-workflow-library"
import { JourneyPreview } from "./journey-preview"
import "./product-workflow.css"
import "./landing-sections.css"

export function CinematicProduct() {
  const locale = useLocale()
  const t = (en: string, fr: string) => (locale === "fr" ? fr : en)
  const library = useLandingWorkflowLibrary()
  const [active, setActive] = useState(0)
  const buttons = useRef<(HTMLButtonElement | null)[]>([])
  const navigation = useRef<HTMLDivElement>(null)
  useEffect(() => {
    const menu = navigation.current
    const button = buttons.current[active]
    if (!menu || !button || !menu.clientHeight) return
    const menuBounds = menu.getBoundingClientRect()
    const buttonBounds = button.getBoundingClientRect()
    if (buttonBounds.top < menuBounds.top) menu.scrollTop += buttonBounds.top - menuBounds.top
    else if (buttonBounds.bottom > menuBounds.bottom) menu.scrollTop += buttonBounds.bottom - menuBounds.bottom
  }, [active])
  useEffect(() => {
    const followHash = () => {
      const match = window.location.hash.match(/^#flow-tab-(\d+)$/)
      if (match && Number(match[1]) < library.length) setActive(Number(match[1]))
    }
    followHash()
    window.addEventListener("hashchange", followHash)
    return () => window.removeEventListener("hashchange", followHash)
  }, [library.length])
  const selected = library[active]
  return (
    <section className="showcase workflow-showcase dark-section section" id="product" aria-labelledby="product-heading">
      <span id="showcase" className="anchor" />
      <div className="showcase-heading reveal">
        <p className="eyebrow">{t("CONNECTED WORKFLOW LIBRARY", "BIBLIOTHÈQUE DES PARCOURS CONNECTÉS")}</p>
        <h2 id="product-heading">{t("Operations, people and accounts. Connected.", "Opérations, équipes et comptes. Reliés.")}</h2>
        <p className="section-lead">{t("Explore the work across your business and accounting firm. Choose a workflow to see the steps, checks and records it brings together.", "Explorez le travail de votre entreprise et de votre cabinet. Choisissez un parcours pour découvrir ses étapes, contrôles et justificatifs.")}</p>
      </div>
      <div className="split showcase-inner reveal">
        <div className="product-copy">
          <label className="workflow-module-select">
            <span>{t("Choose a workflow", "Choisir un parcours")}</span>
            <select value={active} onChange={event => setActive(Number(event.target.value))} aria-controls="module-preview">
              {library.map((workflow, index) => <option key={workflow.id} value={index}>{workflow.label}</option>)}
            </select>
          </label>
          <div className="workflow-library-caption"><span>{library.length} {t("workflows", "parcours")}</span><span>{t("Scroll to explore ↓", "Faire défiler ↓")}</span></div>
          <div ref={navigation} className="accordion workflow-library-nav" role="region" aria-label={t("Choose a connected workflow", "Choisir un parcours connecté")}>
            {library.map((workflow, index) => (
              <div className={"accordion-item" + (active === index ? " active" : "")} key={workflow.id}>
                <h3><button ref={element => { buttons.current[index] = element }} id={"flow-tab-" + index} className="flow-tab"
                  aria-expanded={active === index} aria-controls={"flow-copy-" + index + " module-preview"} onClick={() => setActive(index)}
                  onKeyDown={event => {
                    const next = event.key === "ArrowDown" ? (index + 1) % library.length : event.key === "ArrowUp" ? (index + library.length - 1) % library.length : event.key === "Home" ? 0 : event.key === "End" ? library.length - 1 : null
                    if (next === null) return
                    event.preventDefault(); setActive(next); buttons.current[next]?.focus()
                  }}>
                  <span className="flow-label"><workflow.icon size={18} aria-hidden="true" />{workflow.label}</span>
                  <span className="indicator" aria-hidden="true">{active === index ? "−" : "+"}</span>
                </button></h3>
              </div>
            ))}
          </div>
          <div className="flow-descriptions">{library.map((workflow, index) => <div key={workflow.id} id={"flow-copy-" + index} className="flow-copy" role="region" aria-labelledby={"flow-tab-" + index} aria-hidden={active !== index} inert={active !== index}><p>{workflow.body}</p></div>)}</div>
          <Link className="module-journey" href={selected.href}>{t("Explore this workflow", "Explorer ce parcours")} <span aria-hidden="true">↗︎</span></Link>
        </div>
        <div className="demo-stage">
          <div className="module-preview" id="module-preview" role="region" aria-labelledby={"flow-tab-" + active} data-visual-classification="sample" tabIndex={0}>
            <div className="module-chrome"><PreviewLogo /><span>{selected.module ? t("PRODUCT WALKTHROUGH", "DÉMONSTRATION PRODUIT") : t("GUIDED WORKFLOW", "PARCOURS GUIDÉ")}</span></div>
            <div className="module-preview-body"><div className="module-main">
              <div className="module-headings">{library.map((workflow, index) => <div className="module-heading" key={workflow.id} aria-hidden={active !== index} inert={active !== index}><h3>{workflow.title}</h3></div>)}</div>
              <div className="workflow-preview-stack">
                <WorkflowDemoPlaceholder reserveScene={!selected.module} />
                {selected.module && <ProductWorkflowDemo key={selected.id} module={selected.module} showAccountingContext={false} stableLayout />}
                {library.filter(workflow => !workflow.module).map(workflow => <div className="journey-preview-state" key={workflow.id} aria-hidden={selected.id !== workflow.id} inert={selected.id !== workflow.id}><JourneyPreview workflow={workflow} active={selected.id === workflow.id} /></div>)}
              </div>
            </div></div>
            <p className="module-disclosure">{t("Illustrative example · Fictional records · Not live data", "Exemple illustratif · Données fictives · Aucune donnée réelle")}</p>
          </div>
        </div>
        <div className="showcase-context">{library.map((workflow, index) => <div key={workflow.id} className="showcase-context-state" aria-hidden={active !== index} inert={active !== index}>
          {workflow.module ? <AccountingWorkflowContext module={workflow.module} /> : <div className="accounting-workflow-context">
            <div className="accounting-context-label">{t("A SHARED RECORD. CLEAR RESPONSIBILITIES.", "DES DONNÉES COMMUNES. DES RESPONSABILITÉS CLAIRES.")}</div>
            <dl><div><dt>{t("Records carried forward", "Justificatifs conservés")}</dt><dd>{workflow.evidence.join(" · ")}</dd></div><div><dt>{t("The handoff and review", "Le relais et la revue")}</dt><dd>{workflow.review}</dd></div></dl>
          </div>}
        </div>)}</div>
      </div>
      <p className="conditions">{landingMessageCopy[locale === "fr" ? "fr" : "en"].conditions}</p>
    </section>
  )
}

const stories = [
  [
    "Record the sale. Retain the detail.",
    "Enregistrez la vente. Conservez le détail.",
    "Keep the items, receipt and recorded payment together so operations and finance can follow the same transaction.",
    "Conservez articles, reçu et paiement enregistré pour que les équipes terrain et financières suivent la même opération.",
    "Sale recorded",
    "Vente enregistrée",
    "SALE-104 · 2 items",
    "SALE-104 · 2 articles",
  ],
  [
    "Follow the stock behind the sale.",
    "Suivez le stock derrière chaque vente.",
    "Keep receipts, transfers and stock movements visible by location. Know where a quantity came from and what needs replenishing.",
    "Retrouvez réceptions, transferts et mouvements de stock par site. Identifiez l’origine des quantités et les besoins de réapprovisionnement.",
    "Stock movements",
    "Mouvements de stock",
    "SKU-024",
    "SKU-024",
  ],
  [
    "Invoice the customer. Follow the balance.",
    "Facturez le client. Suivez son solde.",
    "Bring customer invoices, due dates and collections into one view. Keep partial payments and outstanding amounts visible for follow-up.",
    "Réunissez factures clients, échéances et encaissements. Gardez les paiements partiels et les montants restant à recevoir visibles pour les relances.",
    "Clients and invoicing",
    "Clients et facturation",
    "INV-104",
    "INV-104",
  ],
  [
    "Connect supplier bills to what you received.",
    "Reliez les factures fournisseurs aux réceptions.",
    "Follow supplier orders, goods receipts and invoices together. Review the payable and its supporting documents before preparing a payment.",
    "Suivez ensemble commandes fournisseurs, réceptions et factures. Vérifiez la dette et ses justificatifs avant de préparer un règlement.",
    "Suppliers and payables",
    "Fournisseurs et dettes",
    "BILL-028",
    "BILL-028",
  ],
  [
    "Reconcile what was recorded.",
    "Rapprochez les paiements enregistrés.",
    "Compare payment records with statements or supported provider evidence. Keep differences visible until they are reviewed.",
    "Comparez les paiements aux relevés ou aux justificatifs des prestataires pris en charge. Gardez les écarts visibles jusqu’à leur examen.",
    "Payment reconciliation",
    "Rapprochement des paiements",
    "Main shop · Quantity −2",
    "Boutique principale · Quantité −2",
  ],
  [
    "Prepare the period-end close.",
    "Préparez la clôture de période.",
    "Your accounting firm starts with the journals, source links and reconciliation evidence already in Stoquify. Review the period’s records and resolve the remaining exceptions together.",
    "Votre cabinet comptable part des écritures, liens sources et justificatifs de rapprochement déjà dans Stoquify. Examinez ensemble les données de la période et traitez les anomalies restantes.",
    "Accounting firm and close",
    "Cabinet comptable et clôture",
    "Evidence available · Review pending",
    "Justificatif disponible · Vérification en attente",
  ],
] as const

const storyModules = ["pos", "inventory", "receivables", "payables", "finance", "accounting"] as const

export function CinematicStory() {
  const locale = useLocale()
  const t = (en: string, fr: string) => (locale === "fr" ? fr : en)
  const [active, setActive] = useState(0)
  const tabs = useRef<(HTMLButtonElement | null)[]>([])
  return (
    <section className="audience dark-section section" id="problem">
      <div className="narrow center reveal">
        <h2 className="display">
          {t(
            "A sale is the beginning of the record.",
            "Une vente ouvre un parcours comptable.",
          )}
        </h2>
        <p className="story-accounting-intro">
          {t(
            "Your team records the activity. Stoquify keeps the operational trail. Your accounting firm reviews the linked accounting records, with access authorized by each client.",
            "Vos équipes enregistrent l’activité. Stoquify en conserve la trace. Votre cabinet examine les données comptables liées, avec un accès autorisé par chaque client.",
          )}
        </p>
      </div>
      <div className="audience-strip">
        {[
          ["Sales", "Ventes"],
          ["Stock", "Stocks"],
          ["Client invoices", "Factures clients"],
          ["Supplier bills", "Factures fournisseurs"],
          ["Reconciliation", "Rapprochement"],
          ["OHADA records", "Comptes OHADA"],
          ["Accounting firm", "Cabinet comptable"],
          ["Close", "Clôture"],
        ].map(([en, fr]) => (
          <span key={en}>{t(en, fr)}</span>
        ))}
      </div>
      <div className="story reveal" id="workflow">
        <div className="story-copy">
          <p className="eyebrow">
            {t("ONE CONNECTED WORKFLOW", "UN PARCOURS CONNECTÉ")}
          </p>
          <div className="story-copy-panels">
            {stories.map((story, index) => (
              <div
                key={storyModules[index]}
                className="story-state"
                aria-hidden={active !== index}
                inert={active !== index}
              >
                <h2>{t(story[0], story[1])}</h2>
                <p>{t(story[2], story[3])}</p>
              </div>
            ))}
          </div>
          <div
            className="story-tabs"
            role="tablist"
            aria-label={t("Workflow steps", "Étapes du parcours")}
          >
            {stories.map((story, index) => (
              <button
                key={index}
                ref={(element) => {
                  tabs.current[index] = element
                }}
                role="tab"
                id={`story-tab-${index}`}
                aria-controls={`story-panel-${index}`}
                aria-selected={active === index}
                tabIndex={active === index ? 0 : -1}
                aria-label={`${String(index + 1).padStart(2, "0")}. ${t(story[4], story[5])}`}
                onClick={() => setActive(index)}
                onKeyDown={(event) => {
                  const next =
                    event.key === "ArrowRight"
                      ? (index + 1) % stories.length
                      : event.key === "ArrowLeft"
                        ? (index + stories.length - 1) % stories.length
                        : event.key === "Home"
                          ? 0
                          : event.key === "End"
                            ? stories.length - 1
                            : null
                  if (next === null) return
                  event.preventDefault()
                  setActive(next)
                  tabs.current[next]?.focus()
                }}
              >
                0{index + 1}
              </button>
            ))}
          </div>
        </div>
        <div className="story-art" data-visual-classification="sample">
          {storyModules.map((module, index) => (
            <div
              className="story-workspace story-state"
              key={module}
              id={`story-panel-${index}`}
              role="tabpanel"
              tabIndex={active === index ? 0 : -1}
              aria-labelledby={`story-tab-${index}`}
              aria-hidden={active !== index}
              inert={active !== index}
            >
              <p className="scene-topline">
                {t(
                  "ILLUSTRATIVE WORKFLOW · FICTIONAL RECORDS",
                  "PARCOURS ILLUSTRATIF · DONNÉES FICTIVES",
                )}
              </p>
              <CinematicModuleScene module={module} />
            </div>
          ))}
        </div>
        <div className="story-details">
          {storyModules.map((module, index) => (
            <div key={module} className="story-state" aria-hidden={active !== index} inert={active !== index}>
              <AccountingWorkflowContext module={module} />
            </div>
          ))}
        </div>
      </div>
    </section>
  )
}
