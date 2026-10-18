"use client"

import { useEffect, useRef, useState } from "react"
import { useLocale } from "next-intl"
import { Link } from "@/i18n/navigation"
import { landingMessageCopy } from "./landing-message-copy"
import { cinematicModules, CinematicModuleScene } from "./cinematic-modules"

export function CinematicProduct() {
  const locale = useLocale()
  const t = (en: string, fr: string) => (locale === "fr" ? fr : en)
  const [active, setActive] = useState(0)
  const buttons = useRef<(HTMLButtonElement | null)[]>([])
  useEffect(() => {
    const followHash = () => {
      const match = window.location.hash.match(/^#flow-tab-([0-5])$/)
      if (match) setActive(Number(match[1]))
    }
    followHash()
    window.addEventListener("hashchange", followHash)
    return () => window.removeEventListener("hashchange", followHash)
  }, [])
  const selected = cinematicModules[active]
  return (
    <section className="showcase dark-section section" id="product">
      <span id="showcase" className="anchor" />
      <div className="split showcase-inner">
        <div className="product-copy reveal">
          <p className="eyebrow">
            {t("SIX CONNECTED WORKFLOWS", "SIX PARCOURS CONNECTÉS")}
          </p>
          <h2>
            {t(
              "Operations, people and accounts. Connected.",
              "Opérations, équipes et comptes. Reliés.",
            )}
          </h2>
          <div className="accordion">
            {cinematicModules.map((module, index) => (
              <div
                className={
                  "accordion-item" + (active === index ? " active" : "")
                }
                key={module.id}
              >
                <h3>
                  <button
                    ref={(element) => {
                      buttons.current[index] = element
                    }}
                    id={"flow-tab-" + index}
                    className="flow-tab"
                    aria-expanded={active === index}
                    aria-controls={"flow-copy-" + index + " module-preview"}
                    onClick={() => setActive(index)}
                    onKeyDown={(event) => {
                      const next =
                        event.key === "ArrowDown"
                          ? (index + 1) % 6
                          : event.key === "ArrowUp"
                            ? (index + 5) % 6
                            : event.key === "Home"
                              ? 0
                              : event.key === "End"
                                ? 5
                                : null
                      if (next === null) return
                      event.preventDefault()
                      setActive(next)
                      buttons.current[next]?.focus()
                    }}
                  >
                    <span className="flow-label">
                      <module.icon size={18} aria-hidden="true" />
                      {t(module.label[0], module.label[1])}
                    </span>
                    <span className="indicator" aria-hidden="true">
                      +
                    </span>
                  </button>
                </h3>
                <div
                  id={"flow-copy-" + index}
                  className="flow-copy"
                  role="region"
                  aria-labelledby={"flow-tab-" + index}
                  hidden={active !== index}
                >
                  <p>{t(module.body[0], module.body[1])}</p>
                </div>
              </div>
            ))}
          </div>
          <Link
            className="module-journey"
            href={"/workflows#workflow-" + selected.workflow}
          >
            {t("Explore this workflow", "Explorer ce parcours")}{" "}
            <span aria-hidden="true">↗︎</span>
          </Link>
        </div>
        <div className="demo-stage reveal">
          <div
            className="module-preview"
            id="module-preview"
            role="region"
            aria-labelledby={"flow-tab-" + active}
            data-visual-classification="sample"
            tabIndex={0}
          >
            <div className="module-chrome">
              <span className="workspace-mark">S</span>
              <strong>Stoquify</strong>
              <span>{t("DEMONSTRATION", "DÉMONSTRATION")}</span>
            </div>
            <div className="module-preview-body">
              <aside aria-hidden="true">
                {cinematicModules.map((module, index) => (
                  <span
                    key={module.id}
                    className={active === index ? "selected" : ""}
                  >
                    <module.icon size={18} />
                  </span>
                ))}
              </aside>
              <div className="module-main" key={selected.id}>
                <div className="module-heading">
                  <span className="eyebrow">
                    {t(selected.label[0], selected.label[1])}
                  </span>
                  <h3>{t(selected.title[0], selected.title[1])}</h3>
                </div>
                <CinematicModuleScene module={selected.id} />
              </div>
            </div>
            <p className="module-disclosure">
              {t(
                "Illustrative example · Fictional records · Not live data",
                "Exemple illustratif · Données fictives · Aucune donnée réelle",
              )}
            </p>
          </div>
        </div>
      </div>
      <p className="conditions">
        {landingMessageCopy[locale === "fr" ? "fr" : "en"].conditions}
      </p>
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
    "Review source-linked journals, reconciliation differences and outstanding evidence. Give your accountant a clear view of what still needs attention.",
    "Examinez les écritures liées aux pièces, les écarts et les justificatifs en attente. Donnez à votre comptable une vue claire des points à traiter.",
    "Accounting and close",
    "Comptabilité et clôture",
    "Evidence available · Review pending",
    "Justificatif disponible · Vérification en attente",
  ],
] as const

export function CinematicStory() {
  const locale = useLocale()
  const t = (en: string, fr: string) => (locale === "fr" ? fr : en)
  const [active, setActive] = useState(0)
  const tabs = useRef<(HTMLButtonElement | null)[]>([])
  const s = stories[active]
  return (
    <section className="audience dark-section section" id="problem">
      <div className="narrow center reveal">
        <h2 className="display">
          {t(
            "A sale is the beginning of the record.",
            "Une vente ouvre un parcours comptable.",
          )}
        </h2>
      </div>
      <div className="audience-strip">
        {[
          ["Sales", "Ventes"],
          ["Stock", "Stocks"],
          ["Reconciliation", "Rapprochement"],
          ["OHADA records", "Comptes OHADA"],
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
          <h2>{t(s[0], s[1])}</h2>
          <p>{t(s[2], s[3])}</p>
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
                aria-controls="story-panel"
                aria-selected={active === index}
                tabIndex={active === index ? 0 : -1}
                aria-label={`${index + 1}. ${t(story[4], story[5])}`}
                onClick={() => setActive(index)}
                onKeyDown={(event) => {
                  const next =
                    event.key === "ArrowRight"
                      ? (index + 1) % 3
                      : event.key === "ArrowLeft"
                        ? (index + 2) % 3
                        : event.key === "Home"
                          ? 0
                          : event.key === "End"
                            ? 2
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
        <div
          id="story-panel"
          role="tabpanel"
          tabIndex={0}
          aria-labelledby={`story-tab-${active}`}
          className="story-art"
          data-visual-classification="sample"
        >
          <div className="story-workspace" key={active}>
            <p className="scene-topline">
              {t(
                "ILLUSTRATIVE WORKFLOW · FICTIONAL RECORDS",
                "PARCOURS ILLUSTRATIF · DONNÉES FICTIVES",
              )}
            </p>
            <CinematicModuleScene
              module={(["pos", "finance", "accounting"] as const)[active]}
            />
          </div>
        </div>
      </div>
    </section>
  )
}
