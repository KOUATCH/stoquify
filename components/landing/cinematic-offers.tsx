"use client"

import { useRef, useState } from "react"
import { useLocale } from "next-intl"
import {
  ArrowDown,
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
import { cinematicModules } from "./cinematic-modules"
import {
  moduleOffers,
  offerComparison,
  offerFaqs,
  offerPaths,
  type OfferCopy,
  type OfferPath,
} from "./cinematic-offers-data"

const pathIcons = { operations: Boxes, finance: BookOpen, people: Users }

export function CinematicOffers() {
  const fr = useLocale() === "fr"
  const t = (en: string, french: string) => (fr ? french : en)
  const text = (copy: OfferCopy) => copy[fr ? 1 : 0]
  const [moduleIndex, setModuleIndex] = useState(0)
  const [pathId, setPathId] = useState<OfferPath>("operations")
  const tabs = useRef<(HTMLButtonElement | null)[]>([])
  const selectedModule = cinematicModules[moduleIndex]
  const moduleOffer = moduleOffers[selectedModule.id]
  const related = offerPaths.find((path) => path.id === moduleOffer.path)!
  const selected = offerPaths.find((path) => path.id === pathId)!
  const SelectedIcon = pathIcons[pathId]
  const ModuleIcon = selectedModule.icon

  return (
    <>
      <section
        id="offers"
        className="section offer-introduction"
        aria-labelledby="offers-title"
      >
        <div className="offer-heading reveal">
          <div>
            <p className="eyebrow">
              {t(
                "YOUR MODULES. ONE CONNECTED WORKSPACE.",
                "VOS MODULES. UN ESPACE CONNECTÉ.",
              )}
            </p>
            <h2 className="display" id="offers-title">
              {t(
                "Start with the work. Build your workspace around it.",
                "Partez de votre métier. Composez votre espace.",
              )}
            </h2>
          </div>
          <p>
            {t(
              "From the pharmacy counter to a busy bakery or a materials warehouse: choose the capabilities that connect your day, then find the right adoption path.",
              "Du comptoir d’une pharmacie à une boulangerie animée ou un dépôt de matériaux : découvrez les fonctions qui relient votre quotidien, puis choisissez votre parcours.",
            )}
          </p>
        </div>
        <div className="offer-explorer reveal">
          <div
            className="offer-module-tabs"
            role="tablist"
            aria-label={t(
              "Explore module offers",
              "Découvrir les offres de modules",
            )}
          >
            {cinematicModules.map((item, index) => (
              <button
                key={item.id}
                id={`offer-tab-${item.id}`}
                role="tab"
                type="button"
                ref={(element) => {
                  tabs.current[index] = element
                }}
                aria-selected={index === moduleIndex}
                aria-controls="offer-module-panel"
                tabIndex={index === moduleIndex ? 0 : -1}
                onClick={() => setModuleIndex(index)}
                onKeyDown={(event) => {
                  const next =
                    event.key === "ArrowRight"
                      ? (index + 1) % cinematicModules.length
                      : event.key === "ArrowLeft"
                        ? (index + cinematicModules.length - 1) %
                          cinematicModules.length
                        : event.key === "Home"
                          ? 0
                          : event.key === "End"
                            ? cinematicModules.length - 1
                            : null
                  if (next === null) return
                  event.preventDefault()
                  setModuleIndex(next)
                  tabs.current[next]?.focus()
                }}
              >
                <item.icon size={18} aria-hidden="true" />
                <span>{text(item.label)}</span>
              </button>
            ))}
          </div>
          <div
            id="offer-module-panel"
            role="tabpanel"
            tabIndex={0}
            aria-labelledby={`offer-tab-${selectedModule.id}`}
          >
            <div className="offer-module-stage" key={selectedModule.id}>
              <div className="offer-module-copy">
                <p className="offer-tag">
                  <span aria-hidden="true" />
                  {text(moduleOffer.relation)}
                </p>
                <h3>{text(selectedModule.title)}</h3>
                <p>{text(selectedModule.body)}</p>
                <p className="offer-dependency">{text(moduleOffer.note)}</p>
                <div className="offer-links">
                  <a
                    href="#pricing"
                    onClick={() => setPathId(moduleOffer.path)}
                  >
                    {t("See the related offer", "Voir l’offre associée")}
                    <ArrowDown size={16} aria-hidden="true" />
                  </a>
                  <a href={`#flow-tab-${moduleIndex}`}>
                    {t(
                      "Try the visual preview",
                      "Explorer l’aperçu interactif",
                    )}
                    <ArrowRight size={16} aria-hidden="true" />
                  </a>
                </div>
              </div>
              <div className="offer-blueprint" aria-hidden="true">
                <div className="offer-blueprint-top">
                  <span className="workspace-mark">S</span>
                  <strong>Stoquify</strong>
                  <span>{t("WORKSPACE MAP", "PLAN DE L’ESPACE")}</span>
                </div>
                <div className="offer-blueprint-body">
                  <div className="offer-foundation-node">
                    <Layers3 size={22} />
                    <div>
                      <small>{t("SHARED FOUNDATION", "SOCLE COMMUN")}</small>
                      <strong>
                        {t(
                          "Roles · locations · controls",
                          "Rôles · sites · contrôles",
                        )}
                      </strong>
                    </div>
                  </div>
                  <div className="offer-connector">
                    <i />
                    <i />
                    <i />
                  </div>
                  <div className="offer-module-node">
                    <ModuleIcon size={30} />
                    <div>
                      <small>{text(moduleOffer.relation)}</small>
                      <strong>{text(selectedModule.label)}</strong>
                    </div>
                    <Check size={20} />
                  </div>
                  <div className="offer-connector offer-connector-short">
                    <i />
                    <i />
                    <i />
                  </div>
                  <div className="offer-path-node">
                    <span>
                      {t("RELATED ADOPTION PATH", "PARCOURS ASSOCIÉ")}
                    </span>
                    <strong>{text(related.name)}</strong>
                  </div>
                </div>
                <div className="offer-blueprint-foot">
                  {t(
                    "An illustration of how the scope connects",
                    "Une illustration des liens entre les périmètres",
                  )}
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

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
              "Un point de départ clair. La place pour grandir.",
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
              <h3>
                <SelectedIcon size={25} aria-hidden="true" />
                {text(selected.name)}
              </h3>
              <p>{text(selected.reason)}</p>
            </div>
            <p className="offer-discuss">
              <strong>{t("Prepare to discuss: ", "À préciser : ")}</strong>
              {text(selected.discuss)}
            </p>
          </div>
          <div className="offer-next-actions">
            <Link href="/register" className="button primary">
              {t("Create your account", "Créer votre compte")}
              <ArrowRight size={17} aria-hidden="true" />
            </Link>
            <Link
              href={`/workflows#workflow-${selected.workflow}`}
              className="offer-workflow-link"
            >
              {t("Explore this workflow first", "Explorer d’abord ce parcours")}
              <ArrowRight size={16} aria-hidden="true" />
            </Link>
            <p>
              {t(
                "Opens registration. Your selection stays on this page; no order or subscription is created.",
                "Ouvre l’inscription. Votre sélection reste sur cette page ; aucune commande ni aucun abonnement n’est créé.",
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

        <div className="offer-services reveal">
          <div>
            <p className="eyebrow">
              {t("MAKE THE WHOLE COST CLEAR", "CLARIFIEZ LE COÛT GLOBAL")}
            </p>
            <h3>
              {t(
                "Software is one part of the rollout.",
                "Le logiciel est une partie du déploiement.",
              )}
            </h3>
            <p>
              {t(
                "Agree the services and external costs alongside the modules. Each has its own scope.",
                "Définissez les services et les coûts externes avec les modules. Chacun possède son périmètre.",
              )}
            </p>
          </div>
          <div className="offer-service-list">
            {[
              [
                "01",
                "Onboarding & migration",
                "Démarrage et migration",
                "Data mapping, opening records, configuration and training.",
                "Correspondance des données, reprise, paramétrage et formation.",
              ],
              [
                "02",
                "Country & provider setup",
                "Paramétrage pays et prestataires",
                "Country rules, validated adapters, devices and payment costs.",
                "Règles pays, adaptateurs validés, équipements et frais de paiement.",
              ],
              [
                "03",
                "Assurance & support",
                "Assurance et assistance",
                "Review routines, assistance and response commitments to agree.",
                "Routines de contrôle, assistance et engagements de réponse à convenir.",
              ],
            ].map(([number, en, french, body, bodyFr]) => (
              <article key={number}>
                <span>{number}</span>
                <div>
                  <h4>{t(en, french)}</h4>
                  <p>{t(body, bodyFr)}</p>
                </div>
              </article>
            ))}
          </div>
        </div>
        <div className="offer-faq reveal">
          <div>
            <p className="eyebrow">
              {t("BEFORE YOU CHOOSE", "AVANT DE CHOISIR")}
            </p>
            <h3>
              {t(
                "Clear answers. A considered choice.",
                "Des réponses claires. Un choix éclairé.",
              )}
            </h3>
          </div>
          <div>
            {offerFaqs.map((faq) => (
              <details key={faq.question[0]}>
                <summary>
                  {text(faq.question)}
                  <ChevronDown size={18} aria-hidden="true" />
                </summary>
                <p>{text(faq.answer)}</p>
              </details>
            ))}
          </div>
        </div>
      </section>
    </>
  )
}
