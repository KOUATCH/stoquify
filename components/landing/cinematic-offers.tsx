"use client"

import { LandingModuleCatalog } from "./landing-module-catalog"
import { LandingDecisionGuide } from "./landing-decision-guide"
import "./landing-sections.css"

import { useState } from "react"
import { useLocale } from "next-intl"
import {
  ArrowRight,
  BookOpen,
  Boxes,
  Check,
  ChevronDown,
  Layers3,
  SlidersHorizontal,
  Users,
} from "lucide-react"
import { Link } from "@/i18n/navigation"
import {
  offerComparison,
  offerPaths,
  type OfferCopy,
  type OfferPath,
} from "./cinematic-offers-data"

const pathIcons = { operations: Boxes, finance: BookOpen, people: Users }

export function CinematicOffers({ standalone = false }: { standalone?: boolean }) {
  const fr = useLocale() === "fr"
  const t = (en: string, french: string) => (fr ? french : en)
  const text = (copy: OfferCopy) => copy[fr ? 1 : 0]
  const [pathId, setPathId] = useState<OfferPath>("operations")
  const selected = offerPaths.find((path) => path.id === pathId)!

  return (
    <>
      {!standalone && <LandingModuleCatalog onChoosePath={setPathId} />}

      <section
        id="pricing"
        className="section offer-pricing"
        aria-labelledby="pricing-title"
      >
        {/* Retain the previous availability and adoption bookmarks. */}
        {[
          "people-to-pay",
          "daily-control",
          "automation",
          "trust",
          "use-cases",
          "adoption-options",
        ].map((id) => (
          <span id={id} key={id} className="anchor" />
        ))}
        <div className="offer-pricing-heading reveal">
          <p className="eyebrow">{t("OFFERS & PRICING", "OFFRES ET TARIFS")}</p>
          <h2 className="display" id="pricing-title">
            {t(
              "A clear starting point. Room to grow.",
              "Un point de départ adapté. Évoluez à votre rythme.",
            )}
          </h2>
          <p>
            {t(
              "Three paths you can combine. A shared foundation in every rollout. A tailored quote for the scope you agree.",
              "Trois parcours à combiner. Un socle commun à chaque déploiement. Un devis adapté au périmètre convenu.",
            )}
          </p>
        </div>
        <fieldset className="offer-fit reveal">
          <legend>
            <SlidersHorizontal size={18} aria-hidden="true" />
            {t(
              "What would you like to organize first?",
              "Que souhaitez-vous organiser en premier ?",
            )}
          </legend>
          <div className="offer-fit-options">
            {offerPaths.map((path) => {
              const Icon = pathIcons[path.id]
              return (
                <label
                  key={path.id}
                  className={pathId === path.id ? "selected" : ""}
                >
                  <input
                    type="radio"
                    name="offer-fit"
                    value={path.id}
                    checked={pathId === path.id}
                    onChange={() => setPathId(path.id)}
                  />
                  <Icon size={19} aria-hidden="true" />
                  <span>{text(path.fit)}</span>
                </label>
              )
            })}
          </div>
        </fieldset>
        <div className="offer-cards reveal">
          {offerPaths.map((path, index) => {
            const Icon = pathIcons[path.id]
            const active = pathId === path.id
            return (
              <article
                key={path.id}
                className={`offer-card${active ? " selected" : ""}`}
                data-offer={path.id}
                aria-labelledby={`offer-name-${path.id}`}
              >
                <div className="offer-card-top">
                  <Icon size={25} aria-hidden="true" />
                  <span>
                    {active
                      ? t("YOUR STARTING POINT", "VOTRE POINT DE DÉPART")
                      : `0${index + 1}`}
                  </span>
                </div>
                <h3 id={`offer-name-${path.id}`}>{text(path.name)}</h3>
                <p className="offer-card-verb">{text(path.verb)}</p>
                <p className="offer-audience">{text(path.audience)}</p>
                <div className="offer-price">
                  <strong>{t("Tailored quote", "Sur devis")}</strong>
                  <span>
                    {t(
                      "Scope and terms agreed before rollout",
                      "Périmètre et conditions convenus avant déploiement",
                    )}
                  </span>
                </div>
                <p className="offer-scope-label">
                  {t("SCOPE TO PLAN TOGETHER", "PÉRIMÈTRE À DÉFINIR ENSEMBLE")}
                </p>
                <ul>
                  {path.points.map((point) => (
                    <li key={point[0]}>
                      <Check size={16} aria-hidden="true" />
                      <span>{text(point)}</span>
                    </li>
                  ))}
                </ul>
                <p className="offer-scope-note">{text(path.scope)}</p>
                <button
                  type="button"
                  aria-pressed={active}
                  onClick={() => setPathId(path.id)}
                  className="offer-select"
                >
                  {t(
                    "Choose this starting point",
                    "Choisir ce point de départ",
                  )}
                  <ArrowRight size={17} aria-hidden="true" />
                </button>
              </article>
            )
          })}
        </div>
        <div className="offer-shared reveal">
          <div>
            <Layers3 size={24} aria-hidden="true" />
            <strong>
              {t(
                "The foundation comes with every path.",
                "Le socle accompagne chaque parcours.",
              )}
            </strong>
          </div>
          <ul>
            {[
              ["Dashboard and settings", "Tableau de bord et paramètres"],
              [
                "Roles and organization scope",
                "Rôles et périmètre organisationnel",
              ],
              [
                "Baseline security and audit controls",
                "Sécurité et contrôles d’audit de base",
              ],
            ].map(([en, french]) => (
              <li key={en}>
                <Check size={15} aria-hidden="true" />
                {t(en, french)}
              </li>
            ))}
          </ul>
        </div>

        <div className="offer-next reveal" id="offer-next-step">
          <div className="offer-next-copy">
            <p className="eyebrow">
              {t("YOUR NEXT STEP", "VOTRE PROCHAINE ÉTAPE")}
            </p>
            <div
              className="offer-selection"
              aria-live="polite"
              aria-atomic="true"
            >
              {offerPaths.map((path) => {
                const Icon = pathIcons[path.id]
                const active = path.id === pathId
                return <div key={path.id} className="offer-selection-panel" aria-hidden={!active} inert={!active}>
                  <h3><Icon size={25} aria-hidden="true" />{text(path.name)}</h3>
                  <p>{text(path.reason)}</p>
                  <p className="offer-discuss"><strong>{t("Prepare to discuss: ", "À préciser : ")}</strong>{text(path.discuss)}</p>
                </div>
              })}
            </div>
          </div>
          <div className="offer-next-actions">
            <Link href={`/contact?interest=${selected.id}`} className="button primary">
              {t("Plan this rollout", "Préparer ce déploiement")}
              <ArrowRight size={17} aria-hidden="true" />
            </Link>
            <Link
              href={`/offers/${selected.id}`}
              className="offer-workflow-link"
            >
              {t("Review this offer in detail", "Voir le détail de cette offre")}
              <ArrowRight size={16} aria-hidden="true" />
            </Link>
            <p>
              {t(
                "Carry this starting point into your enquiry brief. Confirm scope and cost before any commitment.",
                "Retrouvez ce point de départ dans votre projet. Confirmez le périmètre et le coût avant tout engagement.",
              )}
            </p>
          </div>
        </div>

        <details className="offer-comparison reveal">
          <summary>
            <span>
              {t(
                "Compare the scope, side by side",
                "Comparez les périmètres côte à côte",
              )}
            </span>
            <ChevronDown size={21} aria-hidden="true" />
          </summary>
          <div className="offer-comparison-content">
            <p id="offer-comparison-help">
              {t(
                "These are connected adoption paths, not fixed entitlement bundles. Confirm the final modules, dependencies and country scope in your quote. On smaller screens, scroll the table horizontally.",
                "Ces parcours sont connectés ; ce ne sont pas des forfaits d’accès fixes. Confirmez modules, dépendances et périmètre pays dans le devis. Sur petit écran, faites défiler le tableau horizontalement.",
              )}
            </p>
            <div
              className="offer-table-scroll"
              role="region"
              aria-label={t(
                "Adoption path comparison",
                "Comparaison des parcours d’adoption",
              )}
              aria-describedby="offer-comparison-help"
              tabIndex={0}
            >
              <table>
                <caption className="sr-only">
                  {t(
                    "Scope by adoption path",
                    "Périmètre par parcours d’adoption",
                  )}
                </caption>
                <thead>
                  <tr>
                    <th scope="col">{t("Business need", "Besoin métier")}</th>
                    {offerPaths.map((path) => (
                      <th
                        scope="col"
                        key={path.id}
                        className={pathId === path.id ? "selected" : ""}
                      >
                        {text(path.name)}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {offerComparison.map((row) => (
                    <tr key={row.label[0]}>
                      <th scope="row">{text(row.label)}</th>
                      {row.cells.map((cell, index) => (
                        <td
                          key={offerPaths[index].id}
                          className={
                            pathId === offerPaths[index].id ? "selected" : ""
                          }
                        >
                          {text(cell)}
                        </td>
                      ))}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </details>

        <LandingDecisionGuide />
      </section>
      {standalone && <LandingModuleCatalog onChoosePath={setPathId} />}
    </>
  )
}
