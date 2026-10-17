"use client"

import Link from "next/link"
import { useLocale } from "next-intl"
import type { OpeningReadiness, OpeningMasterStage } from "@/services/onboarding/opening-readiness"

const copy = {
  en: {
    title: "Opening positions: review still required",
    intro: "Imported masters are identities and catalogue records. They do not establish opening stock, customer or supplier balances, or a posted opening ledger.",
    masters: "Master-data progress", remaining: "Remaining opening-position steps",
    targets: { CUSTOMER: "Customers", SUPPLIER: "Suppliers", ITEM: "Items" },
    stages: { NOT_STARTED: "Not started", PROPOSED: "Proposed — validate and approve", REVIEWED: "Reviewed — import still required", IMPORTED: "Imported masters only", BLOCKED: "Blocked — inspect issues or recover the original batch", IN_PROGRESS: "Import in progress — recover the same batch", WAIVED: "Waived — not proof of import completion" } satisfies Record<OpeningMasterStage, string>,
    statuses: { NOT_VERIFIED: "Not verified here", UNSUPPORTED: "External opening import unsupported" },
    requirements: {
      STOCK: ["Opening stock", "Review quantities and values by item and location at the agreed start date. Stock movement evidence does not establish a posted opening ledger. Do not enter the same stock twice.", "Review stock movements"],
      AR: ["Customer opening balances", "Retain original unpaid invoices, amounts already settled and outstanding balances. The receivables view covers existing operations; it does not import external opening invoices. Agree the supported path with your accountant before proceeding.", "View receivables"],
      AP: ["Supplier opening balances", "Retain original supplier documents and outstanding amounts. The payables view covers purchasing; it does not import external opening obligations. Do not create purchases merely to reproduce old balances.", "View payables"],
      LEDGER: ["Opening ledger", "Confirm accounts, start date and a balanced opening journal with an authorized reviewer. Proposed, reviewed and posted are separate stages. A draft or accounting setup marked ready does not prove posting or reconciliation.", "Review journals"],
      TIE_OUT: ["Reconciliation and approval", "Reconcile stock, customer and supplier balances to the opening ledger and retained source totals. Resolve differences and obtain independent approval. This view cannot certify cutover readiness.", ""],
    },
    evidence: "Import references", latest: "Latest batch", retained: "Retained master evidence", source: "Source file", hash: "Source fingerprint",
    scope: "Only masters you may read are shown. Latest batch details cover the 12 most recent permitted batches; retained master evidence can be older. Workflow links keep their own access checks.",
    refresh: "Refresh evidence", refreshing: "Refreshing evidence…", recovery: "If the last operation had an uncertain result, refresh and inspect the original batch before retrying. Do not upload a new file to bypass recovery.",
  },
  fr: {
    title: "Positions d’ouverture : revue encore requise",
    intro: "Les données de base importées décrivent les tiers et le catalogue. Elles ne prouvent ni le stock initial, ni les soldes clients ou fournisseurs, ni la comptabilisation des écritures d’ouverture.",
    masters: "Avancement des données de base", remaining: "Étapes d’ouverture restantes",
    targets: { CUSTOMER: "Clients", SUPPLIER: "Fournisseurs", ITEM: "Articles" },
    stages: { NOT_STARTED: "Non commencé", PROPOSED: "Proposé — valider et approuver", REVIEWED: "Revu — import encore requis", IMPORTED: "Données de base importées uniquement", BLOCKED: "Bloqué — examiner les erreurs ou reprendre le lot d’origine", IN_PROGRESS: "Import en cours — reprendre le même lot", WAIVED: "Dispensé — ne prouve pas la fin de l’import" } satisfies Record<OpeningMasterStage, string>,
    statuses: { NOT_VERIFIED: "Non vérifié ici", UNSUPPORTED: "Import d’ouverture externe non pris en charge" },
    requirements: {
      STOCK: ["Stock initial", "Vérifiez les quantités et valeurs par article et site à la date de départ convenue. Les mouvements de stock ne prouvent pas la comptabilisation du journal d’ouverture. Ne saisissez pas le même stock deux fois.", "Consulter les mouvements"],
      AR: ["Soldes clients à l’ouverture", "Conservez les factures d’origine non réglées, les montants déjà payés et les soldes restants. La vue des créances couvre les opérations existantes ; elle n’importe pas les factures d’ouverture externes. Convenez du parcours pris en charge avec votre comptable.", "Consulter les créances"],
      AP: ["Soldes fournisseurs à l’ouverture", "Conservez les pièces fournisseurs d’origine et les montants restant dus. La vue des dettes couvre les achats ; elle n’importe pas les dettes d’ouverture externes. Ne créez pas d’achats pour reproduire d’anciens soldes.", "Consulter les dettes"],
      LEDGER: ["Journal d’ouverture", "Confirmez les comptes, la date de départ et l’équilibre du journal avec un réviseur habilité. Proposition, revue et comptabilisation sont des étapes distinctes. Un brouillon ou un paramétrage prêt ne prouve ni comptabilisation ni rapprochement.", "Consulter les journaux"],
      TIE_OUT: ["Rapprochement et approbation", "Rapprochez le stock et les soldes clients et fournisseurs avec le journal d’ouverture et les totaux sources conservés. Résolvez les écarts et obtenez une approbation indépendante. Cette vue ne certifie pas la préparation au démarrage.", ""],
    },
    evidence: "Références d’import", latest: "Dernier lot", retained: "Preuve des données de base", source: "Fichier source", hash: "Empreinte source",
    scope: "Seules les données de base que vous pouvez lire sont affichées. Les détails couvrent les 12 derniers lots autorisés ; une preuve conservée peut être plus ancienne. Chaque parcours conserve ses contrôles d’accès.",
    refresh: "Actualiser les preuves", refreshing: "Actualisation des preuves…", recovery: "Si le résultat de la dernière opération est incertain, actualisez et examinez le lot d’origine avant de réessayer. N’importez pas un nouveau fichier pour contourner la reprise.",
  },
}

export function OpeningReadinessPanel({ data, refreshing, onRefresh }: {
  data: OpeningReadiness
  refreshing: boolean
  onRefresh: () => void
}) {
  const locale = useLocale() === "fr" ? "fr" : "en"
  const t = copy[locale]
  return (
    <section aria-labelledby="opening-readiness-title" className="dashboard-glass-panel space-y-4 rounded-lg p-5">
      <h2 id="opening-readiness-title" className="text-lg font-semibold">{t.title}</h2>
      <p className="text-sm text-[var(--dash-text-soft)]">{t.intro}</p>
      <h3 className="font-semibold">{t.masters}</h3>
      <ul className="grid gap-3 md:grid-cols-3">
        {data.masters.map((master) => (
          <li key={master.target} className="min-w-0 rounded-lg border border-[var(--dash-border-subtle)] p-3">
            <h4 className="font-semibold">{t.targets[master.target]}</h4>
            <p className="text-sm text-[var(--dash-info)]">{t.stages[master.stage]}</p>
            {master.latestBatchId || master.evidenceBatchId ? <details className="mt-2 text-xs">
              <summary className="cursor-pointer rounded focus-visible:outline focus-visible:outline-2 focus-visible:outline-[var(--dash-brand)]">{t.evidence}</summary>
              <dl className="mt-2 space-y-1 break-all">
                {master.latestBatchId ? <div><dt>{t.latest}</dt><dd>{master.latestBatchId}{master.latestBatchStage ? ` · ${t.stages[master.latestBatchStage]}` : ""}</dd></div> : null}
                {master.evidenceBatchId ? <div><dt>{t.retained}</dt><dd>{master.evidenceBatchId}</dd></div> : null}
                {master.sourceFilename ? <div><dt>{t.source}</dt><dd>{master.sourceFilename}</dd></div> : null}
                {master.contentHash ? <div><dt>{t.hash}</dt><dd>{master.contentHash}</dd></div> : null}
              </dl>
            </details> : null}
          </li>
        ))}
      </ul>
      <h3 className="font-semibold">{t.remaining}</h3>
      <ol className="space-y-3">
        {data.requirements.map((step) => (
          <li key={step.key} className="rounded-lg border border-[var(--dash-border-subtle)] p-3">
            <h4 className="font-semibold">{t.requirements[step.key][0]}</h4>
            <p className="text-sm text-[var(--dash-warning)]">{t.statuses[step.state]}</p>
            <p className="mt-1 text-sm text-[var(--dash-text-soft)]">{t.requirements[step.key][1]}</p>
            {step.href ? <Link prefetch={false} className="mt-2 inline-flex min-h-10 items-center rounded text-sm text-[var(--dash-brand-strong)] underline focus-visible:outline focus-visible:outline-2 focus-visible:outline-[var(--dash-brand-strong)]" href={`/${locale}${step.href}`}>{t.requirements[step.key][2]}</Link> : null}
          </li>
        ))}
      </ol>
      <p className="text-xs text-[var(--dash-text-soft)]">{t.scope}</p>
      <p className="text-sm text-[var(--dash-text-soft)]">{t.recovery}</p>
      <button type="button" onClick={onRefresh} disabled={refreshing} className="dashboard-button-secondary min-h-10 rounded-lg px-3 py-2 text-sm disabled:opacity-50">{refreshing ? t.refreshing : t.refresh}</button>
    </section>
  )
}
