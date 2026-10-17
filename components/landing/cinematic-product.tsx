"use client"

import { useEffect, useRef, useState, type CSSProperties } from "react"
import { useLocale } from "next-intl"
import { Link } from "@/i18n/navigation"
import { landingMessageCopy } from "./landing-message-copy"

const flows = [
  [
    "Sales & daily activity",
    "Ventes et activité quotidienne",
    "Record sales and follow the activity behind your day. Keep the record connected to stock and payments.",
    "Enregistrez les ventes et suivez votre activité. Reliez chaque opération aux stocks et aux paiements.",
  ],
  [
    "Inventory & movements",
    "Stocks et mouvements",
    "See quantities by location and follow the movements behind each change.",
    "Consultez les quantités par emplacement et les mouvements à l’origine de chaque changement.",
  ],
  [
    "Payments & evidence",
    "Paiements et justificatifs",
    "Compare recorded payments with their supporting evidence. Keep outstanding reviews visible.",
    "Comparez les paiements enregistrés à leurs justificatifs. Gardez les vérifications en attente visibles.",
  ],
  [
    "Accounting review",
    "Révision comptable",
    "Follow the path from a business record to accounting review, with the source context at hand.",
    "Suivez le parcours d’une opération jusqu’à la révision comptable, avec son contexte d’origine.",
  ],
] as const

export function CinematicProduct() {
  const locale = useLocale()
  const t = (en: string, fr: string) => (locale === "fr" ? fr : en)
  const [active, setActive] = useState(0)
  useEffect(() => {
    const followHash = () => {
      const match = window.location.hash.match(/^#flow-tab-([0-3])$/)
      if (match) setActive(Number(match[1]))
    }
    followHash()
    window.addEventListener("hashchange", followHash)
    return () => window.removeEventListener("hashchange", followHash)
  }, [])
  const row = (label: string, value: string, status?: string, good = false) => (
    <div className="demo-row">
      <span>{label}</span>
      <b>{value}</b>
      {status && <em className={`status${good ? " good" : ""}`}>{status}</em>}
    </div>
  )
  const names = [
    ["Sales overview", "Vue des ventes"],
    ["Inventory movements", "Mouvements de stock"],
    ["Payment review", "Vérification du paiement"],
    ["Accounting review", "Révision comptable"],
  ]
  return (
    <section className="showcase dark-section section" id="product">
      <span id="showcase" className="anchor" />
      <div className="split showcase-inner">
        <div className="product-copy reveal">
          <h2>
            {t(
              "Everything you do in your business. All in one place.",
              "Toutes vos opérations. Dans un seul espace.",
            )}
          </h2>
          <div className="accordion">
            {flows.map(([en, fr, enBody, frBody], index) => (
              <div
                className={`accordion-item${active === index ? " active" : ""}`}
                key={en}
              >
                <h3>
                  <button
                    id={`flow-tab-${index}`}
                    className="flow-tab"
                    aria-expanded={active === index}
                    aria-controls={`flow-copy-${index}`}
                    onClick={() => setActive(index)}
                  >
                    {t(en, fr)}
                    <span className="indicator" aria-hidden="true">
                      +
                    </span>
                  </button>
                </h3>
                <div
                  id={`flow-copy-${index}`}
                  className="flow-copy"
                  role="region"
                  aria-labelledby={`flow-tab-${index}`}
                  hidden={active !== index}
                >
                  <p>{t(enBody, frBody)}</p>
                </div>
              </div>
            ))}
          </div>
          <Link className="text-link" href="/#workflow">
            {t("Follow one sale", "Suivre une vente")}
            <span aria-hidden="true">↗︎</span>
          </Link>
        </div>
        <div
          className="demo-stage"
          role="region"
          aria-label={t(
            "Illustrative product preview",
            "Aperçu produit illustratif",
          )}
          data-visual-classification="sample"
        >
          <div className="demo-frame">
            <div className="demo-top">
              <span>stoquify</span>
              <small>{t("SAMPLE RECORDS", "DONNÉES D’EXEMPLE")}</small>
            </div>
            <div className="demo-content-enter" key={active}>
              <h3 className="demo-title">
                {t(names[active][0], names[active][1])}
              </h3>
              <p className="demo-sub">
                {t(
                  "Main shop · Sample business records",
                  "Boutique principale · Données d’exemple",
                )}
              </p>
              {active === 0 && (
                <>
                  <div className="demo-kpi">
                    24{" "}
                    <small>{t("sales records", "ventes enregistrées")}</small>
                  </div>
                  <svg
                    className="demo-chart"
                    viewBox="0 0 400 130"
                    aria-label={t(
                      "Illustrative activity chart",
                      "Graphique d’activité illustratif",
                    )}
                    role="img"
                  >
                    <defs>
                      <linearGradient id="cinematic-chart-fill" x2="0" y2="1">
                        <stop stopColor="#5796ff" stopOpacity=".3" />
                        <stop offset="1" stopColor="#5796ff" stopOpacity="0" />
                      </linearGradient>
                    </defs>
                    <path
                      d="M0 110L40 94L78 102L115 66L155 77L198 39L238 57L279 26L320 41L360 13L400 23V130H0Z"
                      fill="url(#cinematic-chart-fill)"
                    />
                    <path
                      className="line"
                      d="M0 110L40 94L78 102L115 66L155 77L198 39L238 57L279 26L320 41L360 13L400 23"
                      fill="none"
                      stroke="#76aaff"
                      strokeWidth="3"
                    />
                  </svg>
                  {row(
                    "SALE-104",
                    t("2 items", "2 articles"),
                    t("Recorded", "Enregistrée"),
                    true,
                  )}
                  {row(
                    "SALE-103",
                    t("3 items", "3 articles"),
                    t("Recorded", "Enregistrée"),
                    true,
                  )}
                </>
              )}
              {active === 1 && (
                <>
                  <div className="stock-bars">
                    {[
                      ["Shop", "Boutique", "70%"],
                      ["Warehouse", "Entrepôt", "93%"],
                      ["In transit", "En transit", "42%"],
                    ].map(([en, fr, height]) => (
                      <div
                        key={en}
                        style={{ "--height": height } as CSSProperties}
                      >
                        <small>{t(en, fr)}</small>
                      </div>
                    ))}
                  </div>
                  {row(
                    t("Stock movement", "Mouvement de stock"),
                    "−2",
                    t("Linked", "Relié"),
                    true,
                  )}
                  {row(t("Source record", "Pièce d’origine"), "SALE-104")}
                  {row(
                    t("Location", "Emplacement"),
                    t("Main shop", "Boutique principale"),
                  )}
                </>
              )}
              {active >= 2 && (
                <>
                  <div className="audit-path">
                    {(active === 2
                      ? [
                          ["Payment recorded", "Paiement enregistré"],
                          [
                            "Supporting evidence available",
                            "Justificatif disponible",
                          ],
                          ["Comparison pending", "Comparaison en attente"],
                        ]
                      : [
                          [
                            "Find the source record",
                            "Retrouver la pièce d’origine",
                          ],
                          [
                            "Check the linked evidence",
                            "Vérifier les justificatifs liés",
                          ],
                          [
                            "Continue accounting review",
                            "Poursuivre la révision comptable",
                          ],
                        ]
                    ).map(([en, fr], i) => (
                      <div key={en}>
                        <i>0{i + 1}</i>
                        <span>{t(en, fr)}</span>
                      </div>
                    ))}
                  </div>
                  {row(
                    "SALE-104",
                    active === 2
                      ? t("Payment", "Paiement")
                      : t("Source available", "Origine disponible"),
                    t("To review", "À vérifier"),
                  )}
                </>
              )}
            </div>
            <div className="demo-foot">
              {t(
                "Main shop · Illustrative example · Not live data",
                "Boutique principale · Exemple illustratif · Données non réelles",
              )}
            </div>
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
    "Make the sale. Keep the story.",
    "Vendez. Gardez le fil.",
    "A sale is the beginning of a connected record. Keep its items and context available for the steps that follow.",
    "Une vente est le début d’un dossier connecté. Conservez ses articles et son contexte pour les étapes suivantes.",
    "Sale recorded",
    "Vente enregistrée",
    "SALE-104 · 2 items",
    "SALE-104 · 2 articles",
  ],
  [
    "Follow every movement.",
    "Suivez chaque mouvement.",
    "Trace the quantity change back to its source and location. Keep the sale and the stock movement in the same story.",
    "Retrouvez l’origine et l’emplacement du changement de quantité. Gardez la vente et le mouvement de stock dans le même parcours.",
    "Stock movement",
    "Mouvement de stock",
    "Main shop · Quantity −2",
    "Boutique principale · Quantité −2",
  ],
  [
    "Bring the evidence together.",
    "Rassemblez les justificatifs.",
    "Compare the recorded payment with its supporting evidence before completing the review.",
    "Comparez le paiement enregistré à ses justificatifs avant de terminer la vérification.",
    "Payment to review",
    "Paiement à vérifier",
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
            "Built around the way your business works.",
            "Pensé pour le quotidien de votre entreprise.",
          )}
        </h2>
      </div>
      <div className="audience-strip">
        {[
          ["Retail", "Commerce"],
          ["Distribution", "Distribution"],
          ["Storefront", "Boutique"],
          ["Warehouse", "Entrepôt"],
          ["Sales", "Ventes"],
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
          <div className="story-orbit" />
          <div className="story-record">
            <span className="eyebrow">SALE-104 · {t("SAMPLE", "EXEMPLE")}</span>
            <strong>{t(s[4], s[5])}</strong>
            <div className="record-line" aria-hidden="true">
              <i />
              <i />
            </div>
            <div className="record-line" aria-hidden="true">
              <i />
              <i />
            </div>
            <span className="record-status">{t(s[6], s[7])}</span>
          </div>
        </div>
      </div>
    </section>
  )
}
