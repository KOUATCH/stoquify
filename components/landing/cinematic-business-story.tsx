"use client"

import { useLocale } from "next-intl"
import {
  BookOpen,
  ClipboardCheck,
  ArrowRight,
  Users,
  Store,
  Wallet,
  Building2,
} from "lucide-react"
import { Link } from "@/i18n/navigation"
import { BusinessComputerPhoto, PhotoScreenButton } from "./photo-workspace"
import { CinematicPeoplePayroll } from "./cinematic-people-payroll"
import "./landing-sections.css"

export function CinematicBusinessStory() {
  const fr = useLocale() === "fr"
  const t = (en: string, french: string) => (fr ? french : en)
  return (
    <section
      className="sme-story"
      id="business-story"
      aria-labelledby="business-story-title"
    >
      <div className="section sme-introduction reveal">
        <p className="eyebrow">
          {t(
            "BUILT AROUND THE WORK OF SMEs",
            "PENSÉ POUR LE QUOTIDIEN DES PME",
          )}
        </p>
        <h2 className="display" id="business-story-title">
          {t(
            "Your business keeps moving. Your records should follow.",
            "Votre activité avance. Vos données doivent suivre.",
          )}
        </h2>
        <p>
          {t(
            "From the morning rush to the monthly review, connect your shops, warehouses, finance and people teams with your accounting firm.",
            "Du premier client à la revue mensuelle, reliez vos boutiques, entrepôts, équipes financières et RH à votre cabinet comptable.",
          )}
        </p>
        <small>
          {t(
            "Original illustrative SME scenes. Businesses shown are not customer testimonials.",
            "Scènes de PME originales et illustratives. Les entreprises représentées ne sont pas des témoignages clients.",
          )}
        </small>
        <nav className="business-journey" aria-label={t("Follow the business record", "Suivre le fil des opérations")}>
          {[
            { href: "#business-operations", icon: Store, title: t("Trade & stock", "Ventes et stocks"), body: t("Record the activity", "Enregistrer l’activité") },
            { href: "#business-payments", icon: Wallet, title: t("Money & evidence", "Paiements et preuves"), body: t("Explain the balance", "Expliquer le solde") },
            { href: "#accounting-firm", icon: Building2, title: t("Your accounting firm", "Votre cabinet"), body: t("Review the source", "Examiner les sources") },
            { href: "#people-payroll", icon: Users, title: t("HRIS & payroll", "SIRH et paie"), body: t("Connect the people record", "Relier les dossiers salariés") },
          ].map((item, index) => <a key={item.href} href={item.href}><item.icon size={21} aria-hidden="true" /><span><strong>{item.title}</strong><small>{item.body}</small></span><span className="business-journey-number">0{index + 1}</span></a>)}
        </nav>
      </div>

      <article className="section sme-editorial reveal" id="business-operations">
        <figure className="sme-photo">
          <BusinessComputerPhoto
            scene="pharmacy"
            alt={t(
              "Illustrative pharmacy team serving a customer, with Stoquify sales and stock records on an all-in-one computer",
              "Scène illustrative : une équipe de pharmacie accueille une cliente, avec les ventes et stocks Stoquify sur un ordinateur tout-en-un",
            )}
          />
          <figcaption>
            {t(
              "THE COUNTER. THE STOCKROOM. THE SAME RECORD.",
              "LA CAISSE. LA RÉSERVE. LE MÊME FIL CONDUCTEUR.",
            )}
          </figcaption>
          <PhotoScreenButton scene="pharmacy" />
        </figure>
        <div className="sme-editorial-copy">
          <p className="eyebrow">
            {t("01 / RUN THE BUSINESS", "01 / PILOTEZ L’ACTIVITÉ")}
          </p>
          <h2>
            {t(
              "Keep the sale connected to the stock.",
              "Gardez la vente reliée au stock.",
            )}
          </h2>
          <p>
            {t(
              "At a busy counter, every receipt and quantity matters. Record sales in POS, follow stock movements by location and keep the source behind each change within reach.",
              "Au comptoir, chaque reçu et chaque quantité comptent. Enregistrez les ventes en caisse, suivez les mouvements de stock par site et retrouvez l’origine de chaque changement.",
            )}
          </p>
          <ol
            className="sme-record-chain"
            aria-label={t(
              "Sales and stock workflow",
              "Parcours de vente et de stock",
            )}
          >
            {[
              t("Sale & receipt", "Vente et reçu"),
              t("Stock movement", "Mouvement de stock"),
              t("Source record", "Pièce d’origine"),
            ].map((label) => (
              <li key={label}>
                {label}
                <ArrowRight size={15} aria-hidden="true" />
              </li>
            ))}
          </ol>
          <Link className="sme-link" href="/workflows#workflow-stockToSale">
            {t("Explore sales and stock", "Explorer les ventes et les stocks")}{" "}
            <ArrowRight size={16} aria-hidden="true" />
          </Link>
        </div>
      </article>

      <article className="section sme-editorial sme-editorial-reverse reveal" id="business-payments">
        <figure className="sme-photo">
          <BusinessComputerPhoto
            scene="materials"
            alt={t(
              "Illustrative building-materials merchant reviewing a delivery with a customer, beside an all-in-one computer displaying Stoquify reconciliation",
              "Scène illustrative : une négociante en matériaux examine une livraison avec un client, à côté d’un ordinateur tout-en-un affichant le rapprochement Stoquify",
            )}
          />
          <figcaption>
            {t(
              "FROM TRADE ACTIVITY TO PAYMENT EVIDENCE.",
              "DES OPÉRATIONS AUX JUSTIFICATIFS DE PAIEMENT.",
            )}
          </figcaption>
          <PhotoScreenButton scene="materials" />
        </figure>
        <div className="sme-editorial-copy">
          <p className="eyebrow">
            {t("02 / RECONCILE THE MONEY", "02 / RAPPROCHEZ LES PAIEMENTS")}
          </p>
          <h2>
            {t(
              "Know what was paid. Explain the difference.",
              "Sachez ce qui a été payé. Expliquez les écarts.",
            )}
          </h2>
          <p>
            {t(
              "A recorded payment is only part of the picture. Compare it with imported statements or supported provider evidence, investigate unmatched items and retain the decision behind each resolution.",
              "Un paiement enregistré ne suffit pas à lui seul. Comparez-le aux relevés importés ou aux justificatifs des prestataires pris en charge, examinez les éléments non rapprochés et conservez chaque décision.",
            )}
          </p>
          <div className="sme-reconciliation-note">
            <span>{t("Recorded payment", "Paiement enregistré")}</span>
            <span aria-hidden="true">↔</span>
            <span>{t("Supporting evidence", "Justificatif")}</span>
            <small>
              {t(
                "Differences stay visible until reviewed.",
                "Les écarts restent visibles jusqu’à leur examen.",
              )}
            </small>
          </div>
          <Link
            className="sme-link"
            href="/workflows#workflow-paymentReconciliation"
          >
            {t("Explore reconciliation", "Explorer le rapprochement")}{" "}
            <ArrowRight size={16} aria-hidden="true" />
          </Link>
        </div>
      </article>

      <article className="section sme-editorial sme-firm-editorial reveal" id="accounting-firm" aria-labelledby="accounting-firm-title">
        <figure className="sme-photo">
          <BusinessComputerPhoto scene="accountingFirm" alt={t(
            "Illustrative accounting firm reviewing client records on a large, front-facing Stoquify laptop screen",
            "Cabinet comptable illustratif examinant les données clients sur un grand écran Stoquify tourné vers le visiteur",
          )} />
          <figcaption>{t("YOUR BUSINESS. YOUR ACCOUNTING FIRM. A SHARED REVIEW.", "VOTRE ENTREPRISE. VOTRE CABINET. UNE REVUE PARTAGÉE.")}</figcaption>
          <PhotoScreenButton scene="accountingFirm" />
        </figure>
        <div className="sme-editorial-copy">
          <p className="eyebrow">{t("WORK WITH YOUR ACCOUNTING FIRM", "COLLABOREZ AVEC VOTRE CABINET COMPTABLE")}</p>
          <h2 id="accounting-firm-title">
            {t("Your accounting firm starts with the records already here.", "Votre cabinet part des données déjà présentes.")}
          </h2>
          <p>
            {t(
              "Sales, customer invoices, stock movements and payroll runs build a record of your activity in Stoquify. With configured postings and source links, your authorized accounting firm can review the ledger and the evidence behind its figures.",
              "Ventes, factures clients, mouvements de stock et calculs de paie constituent une trace de votre activité dans Stoquify. Grâce aux comptabilisations configurées et aux liens sources, votre cabinet autorisé peut examiner le grand livre et les justificatifs derrière ses chiffres.",
            )}
          </p>
          <details className="business-detail">
            <summary>{t("How the shared review helps both teams", "Une revue utile à l’entreprise et au cabinet")}</summary>
            <p>{t(
              "For your business, less rebuilding of information already recorded. For your firm, client periods, accounting evidence and review priorities in context. External statements and missing supporting documents are handled where the review requires them.",
              "Pour votre entreprise, moins d’informations déjà enregistrées à reconstituer. Pour votre cabinet, les périodes clients, justificatifs comptables et priorités de revue dans leur contexte. Les relevés externes et pièces manquantes sont traités lorsque la revue le nécessite.",
            )}</p>
          </details>
          <Link className="sme-link" href="/workflows#workflow-accountingCloseAssurance">
            {t("Explore the accounting review workflow", "Explorer le parcours de revue comptable")}{" "}
            <ArrowRight size={16} aria-hidden="true" />
          </Link>
          <p className="firm-access-note">
            {t(
              "Start together: an authorized user in the client’s workspace can invite an accountant. Invitations for new accountants include a registration link; existing users can receive scoped access. Each client controls its own access grant.",
              "Pour collaborer, un utilisateur autorisé de l’espace client peut inviter un comptable. L’invitation des nouveaux comptables comprend un lien d’inscription ; les utilisateurs existants peuvent recevoir un accès délimité. Chaque client contrôle l’accès à ses données.",
            )}
          </p>
        </div>
        <div className="firm-workflow" role="group" aria-label={t("Accounting firm workflow", "Parcours du cabinet comptable")}>
          {[
            [t("01 / Client mandate", "01 / Mandat client"), t("Invite, accept and define access", "Inviter, accepter et délimiter l’accès"), t("Each client grants its own scope, with expiry and revocation controls.", "Chaque client définit son périmètre, avec expiration et révocation.")],
            [t("02 / Client portfolio", "02 / Portefeuille clients"), t("Select the client and period", "Choisir le client et la période"), t("See authorized clients and open the relevant review context.", "Retrouvez les clients autorisés et le contexte de revue pertinent.")],
            [t("03 / Review work desk", "03 / Dossier de revue"), t("Inspect, follow up and retain conclusions", "Examiner, suivre et conserver les conclusions"), t("Trace journals to evidence, handle exceptions and review eligible exports.", "Reliez écritures et pièces, traitez les anomalies et vérifiez les exports autorisés.")],
          ].map(([label, title, body]) => <article key={label}><small>{label}</small><h3>{title}</h3><p>{body}</p></article>)}
        </div>
      </article>

      <div className="section sme-accounting reveal" id="accounting-close">
        <div className="sme-accounting-heading">
          <p className="eyebrow">
            {t(
              "03 / MAINTAIN THE RECORDS. 04 / PREPARE THE CLOSE.",
              "03 / TENEZ LES COMPTES. 04 / PRÉPAREZ LA CLÔTURE.",
            )}
          </p>
          <h2 className="display">
            {t(
              "OHADA accounting. A clearer path to close.",
              "Comptabilité OHADA. Une clôture mieux préparée.",
            )}
          </h2>
          <p>
            {t(
              "Your firm reviews the period using posted journals, source links and checks already available in Stoquify.",
              "Votre cabinet examine la période à partir des écritures comptabilisées, liens sources et contrôles déjà disponibles dans Stoquify.",
            )}
          </p>
        </div>
        <ol className="accounting-close-path" aria-label={t("From operations to the close decision", "Des opérations à la décision de clôture")}>
          {[
            [t("Source records", "Pièces d’origine"), t("Operations teams", "Équipes terrain")],
            [t("Journals & balances", "Écritures et soldes"), t("Configured accounting", "Comptabilité configurée")],
            [t("Evidence & exceptions", "Pièces et anomalies"), t("Finance and your firm", "Finance et cabinet")],
            [t("Close review", "Revue de clôture"), t("Authorized reviewers", "Responsables autorisés")],
          ].map(([title, owner], index) => <li key={title}><span>0{index + 1}</span><strong>{title}</strong><small>{owner}</small></li>)}
        </ol>
        <div className="sme-accounting-grid">
          <article>
            <BookOpen size={28} aria-hidden="true" />
            <h3>
              {t(
                "Keep structured accounting records.",
                "Tenez des comptes structurés.",
              )}
            </h3>
            <p>
              {t(
                "Use SYSCOHADA account references, configured posting rules, journals and the general ledger. Follow an entry back to the operation and supporting evidence behind it.",
                "Utilisez les références SYSCOHADA, les règles de comptabilisation configurées, les journaux et le grand livre. Remontez d’une écriture à l’opération et aux justificatifs qui l’expliquent.",
              )}
            </p>
            <details className="business-detail"><summary>{t("Explore the accounting records", "Découvrir les données comptables")}</summary><ul>
              {[
                t(
                  "Chart of accounts & SYSCOHADA references",
                  "Plan comptable et références SYSCOHADA",
                ),
                t(
                  "Source-linked journals",
                  "Écritures liées aux pièces d’origine",
                ),
                t(
                  "General ledger & period context",
                  "Grand livre et contexte de période",
                ),
              ].map((label) => (
                <li key={label}>{label}</li>
              ))}
            </ul></details>
          </article>
          <article>
            <ClipboardCheck size={28} aria-hidden="true" />
            <h3>
              {t(
                "See what stands between you and close.",
                "Identifiez ce qui reste à traiter avant la clôture.",
              )}
            </h3>
            <p>
              {t(
                "Review reconciliation differences, missing evidence and close findings. Keep responsibilities and accountant review visible before deciding the period is ready.",
                "Examinez les écarts de rapprochement, les justificatifs manquants et les points de clôture. Gardez les responsabilités et la revue du comptable visibles avant de déclarer la période prête.",
              )}
            </p>
            <details className="business-detail"><summary>{t("Explore the close checks", "Découvrir les contrôles de clôture")}</summary><ul>
              {[
                t(
                  "Reconciliation & unresolved differences",
                  "Rapprochement et écarts non résolus",
                ),
                t(
                  "Evidence & outstanding checks",
                  "Justificatifs et contrôles en attente",
                ),
                t(
                  "Accountant review & close readiness",
                  "Revue comptable et préparation de la clôture",
                ),
              ].map((label) => (
                <li key={label}>{label}</li>
              ))}
            </ul></details>
          </article>
        </div>
        <div className="sme-accounting-footer">
          <Link
            className="sme-link"
            href="/workflows#workflow-accountingCloseAssurance"
          >
            {t(
              "Explore accounting and close",
              "Explorer la comptabilité et la clôture",
            )}{" "}
            <ArrowRight size={16} aria-hidden="true" />
          </Link>
          <p>
            {t(
              "Accounting depends on reviewed settings and source data. Internal reports are not certified statutory filings.",
              "La comptabilité dépend des paramètres et données d’origine vérifiés. Les rapports internes ne constituent pas des états réglementaires certifiés.",
            )}
          </p>
        </div>
      </div>

      <CinematicPeoplePayroll />
    </section>
  )
}
