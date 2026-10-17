import type { SnapshotBlocker } from "@/services/snapshots/snapshot-contracts"

type Copy = Pick<SnapshotBlocker, "title" | "detail" | "nextAction">
type Translation = {
  gate: string
  en: Partial<Copy>
  fr: Partial<Copy>
  detail?: { pattern: RegExp; render: (match: RegExpExecArray) => string }
}

// Match source identity and exact canonical wording; never translate custom evidence.
const sourceCopy: Record<string, Translation> = {
  "close-assessment-not-current": {
    gate: "close_readiness",
    en: { title: "Close assessment is historical", detail: "This assessment is not the latest assessment for its accounting period.", nextAction: "Open the latest close assessment before relying on certification." },
    fr: { title: "L’évaluation de clôture est historique", detail: "Cette évaluation n’est pas la dernière évaluation de sa période comptable.", nextAction: "Ouvrez la dernière évaluation de clôture avant de vous fier à la certification." },
  },
  "close-assessment-voided": {
    gate: "close_readiness",
    en: { title: "Close assessment is voided", detail: "This assessment has been voided and cannot establish current certification.", nextAction: "Run a new close assessment and resolve its controls before requesting certification." },
    fr: { title: "L’évaluation de clôture est annulée", detail: "Cette évaluation a été annulée et ne peut pas établir la certification actuelle.", nextAction: "Lancez une nouvelle évaluation de clôture et résolvez ses contrôles avant de demander la certification." },
  },
  "close-assessment-order-ambiguous": {
    gate: "close_readiness",
    en: { title: "Current close assessment is ambiguous", nextAction: "Review the competing assessments and run Close Assurance again before relying on certification." },
    fr: { title: "L’évaluation de clôture actuelle est ambiguë", nextAction: "Examinez les évaluations concurrentes et relancez les contrôles de clôture avant de vous fier à la certification." },
    detail: { pattern: /^(\d+) accounting period\(s\) have multiple latest assessments with the same creation time\.$/, render: m => `${m[1]} période(s) comptable(s) ont plusieurs dernières évaluations créées au même instant.` },
  },
  "close-evidence-stale": {
    gate: "close_readiness",
    en: { title: "Close evidence has been invalidated", nextAction: "Reevaluate Close Assurance and obtain current certification evidence." },
    fr: { title: "Les preuves de clôture ont été invalidées", nextAction: "Réévaluez la clôture et obtenez des preuves de certification à jour." },
    detail: { pattern: /^(\d+) close run\(s\) require fresh evidence after a source change\.$/, render: m => `${m[1]} clôture(s) nécessitent des preuves à jour après une modification des sources.` },
  },
  "close-certified-export-missing": {
    gate: "close_readiness",
    en: { title: "Close certification evidence is missing", nextAction: "Review and retain a current certified close pack before relying on certification." },
    fr: { title: "Les preuves de certification de clôture sont absentes", nextAction: "Examinez et conservez un dossier de clôture certifié à jour avant de vous fier à la certification." },
    detail: { pattern: /^(\d+) certified close run\(s\) lack a current certified export\.$/, render: m => `${m[1]} clôture(s) marquées certifiées ne disposent pas d’un export certifié à jour.` },
  },
  "close-findings-open": {
    gate: "close_readiness",
    en: { title: "Close findings remain open", nextAction: "Resolve or formally waive close findings through Close Assurance." },
    fr: { title: "Des constats de clôture restent ouverts", nextAction: "Résolvez les constats ou faites approuver leur dérogation dans le centre de clôture." },
    detail: { pattern: /^(\d+) finding\(s\) remain unresolved in the selected close runs\.$/, render: m => `${m[1]} constat(s) restent non résolus dans les clôtures sélectionnées.` },
  },
  "close-checklist-incomplete": {
    gate: "close_readiness",
    en: { title: "Close controls failed or are unavailable", nextAction: "Review failed controls and restore their evidence before certification." },
    fr: { title: "Des contrôles de clôture ont échoué ou sont indisponibles", nextAction: "Examinez les contrôles en échec et rétablissez leurs preuves avant la certification." },
    detail: { pattern: /^(\d+) checklist control\(s\) failed or are unavailable in the selected close runs\.$/, render: m => `${m[1]} contrôle(s) ont échoué ou sont indisponibles dans les clôtures sélectionnées.` },
  },
  "close-evidence-unavailable": {
    gate: "close_readiness",
    en: { title: "Close evidence is unavailable", nextAction: "Regenerate or attach the missing close evidence." },
    fr: { title: "Des preuves de clôture sont indisponibles", nextAction: "Régénérez ou joignez les preuves de clôture manquantes." },
    detail: { pattern: /^(\d+) close evidence item\(s\) are unavailable for this organization\.$/, render: m => `${m[1]} élément(s) de preuve de clôture sont indisponibles pour cette organisation.` },
  },
  "close-periods-unreviewed": {
    gate: "close_readiness",
    en: { title: "Accounting periods need close review", nextAction: "Run Close Assurance for each uncovered accounting period." },
    fr: { title: "Des périodes comptables nécessitent un examen de clôture", nextAction: "Lancez les contrôles de clôture pour chaque période comptable non couverte." },
    detail: { pattern: /^(\d+) accounting period\(s\) have no close run in the selected scope\.$/, render: m => `${m[1]} période(s) comptable(s) ne disposent d’aucune clôture dans le périmètre sélectionné.` },
  },
  "payment-location-scope-unsupported": {
    gate: "payment_truth_scope",
    en: { title: "Location-scoped payment truth is unavailable", detail: "Payment Truth currently reconciles tenant-wide provider evidence and cannot safely claim location-level results.", nextAction: "Use tenant-wide Payment Truth or a location-aware branch snapshot until payment allocation evidence supports location scope." },
    fr: { title: "La vue des paiements par site est indisponible", detail: "Le rapprochement des preuves des prestataires couvre actuellement toute l’organisation et ne permet pas d’établir des résultats fiables par site.", nextAction: "Utilisez la vue des paiements de l’organisation ou un instantané d’agence adapté jusqu’à ce que les preuves de répartition permettent une vue par site." },
  },
  "close-location-scope-unsupported": {
    gate: "close_readiness_scope",
    en: { title: "Location-scoped close readiness is unavailable", detail: "Close Readiness currently certifies tenant-wide accounting and evidence controls and cannot safely claim location-level results.", nextAction: "Use tenant-wide Close Readiness until accounting and close evidence can be allocated and certified by location." },
    fr: { title: "La préparation à la clôture par site est indisponible", detail: "Les contrôles comptables et les preuves de préparation à la clôture couvrent actuellement toute l’organisation ; ils ne permettent pas d’établir des résultats fiables par site.", nextAction: "Utilisez la préparation à la clôture de l’organisation jusqu’à ce que les preuves comptables et de clôture puissent être réparties et certifiées par site." },
  },
  "tenant-operating-location-scope-unsupported": {
    gate: "tenant_operating_scope",
    en: { title: "Location-scoped tenant operating truth is unavailable", detail: "Tenant operating sources cannot yet prove a complete location allocation, so no tenant-wide values are returned for this location.", nextAction: "Use branch operating truth until every tenant operating source supports location allocation." },
    fr: { title: "La vue opérationnelle complète par site est indisponible", detail: "Les sources opérationnelles ne prouvent pas encore une répartition complète par site ; aucune valeur globale de l’organisation n’est donc présentée comme une valeur de ce site.", nextAction: "Utilisez la vue opérationnelle de l’agence jusqu’à ce que toutes les sources prennent en charge une répartition par site." },
  },
  "tenant-payroll-employee-balance-open": {
    gate: "payroll_employee_balance",
    en: { title: "Employee balance recovery cases are open", nextAction: "Open payroll payments and settle, refund, or review employee balance recovery cases." },
    fr: { title: "Des dossiers de recouvrement de soldes salariés restent ouverts", nextAction: "Ouvrez les paiements de paie pour examiner les dossiers de recouvrement, les règlements ou les remboursements selon vos autorisations." },
    detail: { pattern: /^(\d+) active employee balance case\(s\) (?:have (-?\d+\.\d{2})(?: ([A-Z]{3}))? outstanding\.|remain open; a combined currency total is unavailable\.)$/, render: m => m[2]
      ? `${m[1]} ${m[1] === "1" ? "dossier actif de solde salarié présente" : "dossiers actifs de soldes salariés présentent"} un montant restant de ${m[2]}${m[3] ? ` ${m[3]}` : ""}.`
      : `${m[1]} ${m[1] === "1" ? "dossier actif de solde salarié reste ouvert" : "dossiers actifs de soldes salariés restent ouverts"} ; le total combiné des devises est indisponible.` },
  },
  "inventory-negative-stock": {
    gate: "inventory_cash",
    en: { title: "Negative stock exists", nextAction: "Review stock movements, count variances, and POS oversell controls." },
    fr: { title: "Des stocks négatifs sont présents", nextAction: "Examinez les mouvements, les écarts de comptage et les contrôles de vente au-delà du stock disponible en caisse." },
    detail: { pattern: /^(\d+) inventory level\(s\) are below zero and can distort stock-to-cash truth\.$/, render: m => `${m[1]} niveau(x) de stock sont négatifs et peuvent fausser la lecture des stocks et de la trésorerie.` },
  },
  "inventory-levels-missing": {
    gate: "inventory_cash",
    en: { title: "Tracked items have no stock levels", detail: "Items are configured for stock tracking, but no inventory level rows are available for the selected scope.", nextAction: "Initialize stock levels for tracked items and locations." },
    fr: { title: "Les articles suivis n’ont pas de niveaux de stock", detail: "Des articles sont configurés pour le suivi des stocks, mais aucun niveau de stock n’est disponible dans le périmètre sélectionné.", nextAction: "Initialisez les niveaux de stock des articles et des sites concernés." },
  },
  "payment-critical-exceptions-open": {
    gate: "payment_truth",
    en: { title: "Critical payment exceptions are open", nextAction: "Resolve or formally dismiss critical payment exceptions." },
    fr: { title: "Des anomalies critiques de paiement restent ouvertes", nextAction: "Résolvez les anomalies critiques de paiement ou clôturez-les formellement selon la procédure autorisée." },
    detail: { pattern: /^(\d+) critical payment exception\(s\) must be resolved before cash truth can be trusted\.$/, render: m => `${m[1]} anomalie(s) critique(s) de paiement doivent être résolues avant de pouvoir se fier à la trésorerie affichée.` },
  },
  "close-critical-findings-open": {
    gate: "close_readiness",
    en: { title: "Critical close findings are open", nextAction: "Resolve, assign, or formally waive critical close findings." },
    fr: { title: "Des constats critiques de clôture restent ouverts", nextAction: "Résolvez ou attribuez les constats critiques de clôture, ou soumettez-les à une dérogation formelle autorisée." },
    detail: { pattern: /^(\d+) critical close finding\(s\) block certification-grade readiness\.$/, render: m => `${m[1]} constat(s) critique(s) de clôture empêchent la préparation à la certification.` },
  },
  "tenant-ledger-source-link-gap": {
    gate: "ledger_evidence",
    en: { title: "Posted ledger activity lacks source links", detail: "Posted entries exist in the period, but source-link evidence coverage is zero.", nextAction: "Backfill or repair accounting source links for posted entries." },
    fr: { title: "Des écritures comptabilisées n’ont pas de liens sources", detail: "Des écritures comptabilisées existent sur la période, mais aucune n’est couverte par des preuves de liens sources.", nextAction: "Complétez ou corrigez les liens sources comptables des écritures comptabilisées." },
  },
  "tenant-ledger-trust-assurance-incidents": {
    gate: "workflow_assurance",
    en: { title: "Ledger assurance incidents are open", nextAction: "Open Manager Action Center and resolve the blocking assurance incidents before relying on BI snapshots." },
    fr: { title: "Des incidents de contrôle comptable restent ouverts", nextAction: "Ouvrez le centre d’actions du responsable et résolvez les incidents bloquants avant de vous fier aux instantanés d’analyse." },
    detail: { pattern: /^(\d+) unresolved ledger, business-event, or compliance assurance incident\(s\) are blocking trusted operating intelligence\.$/, render: m => `${m[1]} incident(s) non résolu(s) de contrôle comptable, d’événements métier ou de conformité empêchent une analyse opérationnelle fiable.` },
  },
  "inventory-loss-source-truncated": {
    gate: "inventory_loss_source",
    en: { title: "Inventory loss source is truncated", detail: "The source line cap was reached, so recorded loss totals are incomplete.", nextAction: "Narrow the reporting period or location scope before using the totals." },
    fr: { title: "La source des pertes de stock est tronquée", detail: "La limite de lignes sources a été atteinte ; les totaux des pertes enregistrées sont donc incomplets.", nextAction: "Réduisez la période ou le périmètre des sites avant d’utiliser les totaux." },
  },
  "inventory-loss-evidence-missing": {
    gate: "inventory_loss_evidence",
    en: { title: "Inventory loss evidence is incomplete", nextAction: "Attach or verify the missing adjustment evidence." },
    fr: { title: "Les preuves des pertes de stock sont incomplètes", nextAction: "Joignez ou vérifiez les preuves d’ajustement manquantes." },
    detail: { pattern: /^(\d+) recorded loss line\(s\) lack source evidence\. This gap does not establish causation\.$/, render: m => `${m[1]} ligne(s) de pertes enregistrées n’ont pas de preuve source. Cette lacune ne permet pas d’établir la cause de la perte.` },
  },
  "inventory-loss-valuation-missing": {
    gate: "inventory_loss_valuation",
    en: { title: "Inventory loss valuation is incomplete", nextAction: "Review recorded unit cost and total cost evidence." },
    fr: { title: "La valorisation des pertes de stock est incomplète", nextAction: "Examinez les preuves du coût unitaire et du coût total enregistrés." },
    detail: { pattern: /^(\d+) recorded loss line\(s\) lack valuation evidence\.$/, render: m => `${m[1]} ligne(s) de pertes enregistrées n’ont pas de preuve de valorisation.` },
  },
  "inventory-loss-approval-attribution-missing": {
    gate: "inventory_loss_approval",
    en: { title: "Inventory loss approval attribution is incomplete", nextAction: "Review the adjustment approval trail." },
    fr: { title: "L’attribution des approbations des pertes de stock est incomplète", nextAction: "Examinez l’historique d’approbation des ajustements." },
    detail: { pattern: /^(\d+) recorded loss line\(s\) lack an approving actor\. Approval records authorization, not causation\.$/, render: m => `${m[1]} ligne(s) de pertes enregistrées n’identifient pas d’approbateur. L’approbation atteste l’autorisation, pas la cause de la perte.` },
  },
}

const forecastCopy: Record<string, Omit<Translation, "gate">> = {
  PAYROLL_FORECAST_SETTLEMENT_BALANCE_UNVERIFIED: {
    en: { title: "Remaining payroll payment balance is unverified", detail: "A partially settled payroll batch has no verified remaining balance. Its original amount cannot be used as upcoming cash.", nextAction: "Review payroll settlement evidence and establish the remaining obligation before relying on this forecast." },
    fr: { title: "Le solde restant du paiement de paie n’est pas vérifié", detail: "Un lot de paie partiellement réglé ne dispose pas d’un solde restant vérifié. Son montant initial ne peut pas servir de prévision de trésorerie.", nextAction: "Examinez les preuves de règlement de la paie et établissez l’obligation restante avant de vous fier à cette prévision." },
  },
  PAYROLL_FORECAST_PROVIDER_PROOF_MISSING: {
    en: { title: "Payroll provider proof is missing", detail: "Upcoming payroll net-pay is withheld until an active payment provider evidence path is visible.", nextAction: "Open payment provider evidence and payroll payment batches before relying on payroll cash forecasts." },
    fr: { title: "Les preuves du prestataire de paiement de paie sont manquantes", detail: "Le salaire net prévisionnel n’est pas présenté tant que les preuves d’un prestataire de paiement actif ne sont pas disponibles.", nextAction: "Examinez les preuves du prestataire et les lots de paiement de paie avant de vous fier aux prévisions de trésorerie." },
  },
  PAYROLL_FORECAST_DECLARATION_PROOF_MISSING: {
    en: { title: "Payroll declaration proof is missing", detail: "Upcoming statutory liability is withheld until declaration payload, due date, country-pack, and lifecycle evidence are complete.", nextAction: "Open payroll declarations and attach source-register-backed declaration evidence." },
    fr: { title: "Les preuves des déclarations de paie sont manquantes", detail: "Les obligations légales prévisionnelles ne sont pas présentées tant que le contenu des déclarations, les échéances, le paramétrage pays et les preuves de leur traitement ne sont pas complets.", nextAction: "Ouvrez les déclarations de paie et joignez les preuves rattachées au registre source." },
  },
  PAYROLL_FORECAST_LEDGER_PROOF_MISSING: {
    en: { title: "Payroll ledger proof is missing", detail: "Payroll forecast amounts are withheld until payroll run and payment source links point to posted ledger batches.", nextAction: "Repair payroll posting and accounting source links before using the cash forecast." },
    fr: { title: "Les preuves comptables de la paie sont manquantes", detail: "Les montants prévisionnels de paie ne sont pas présentés tant que les liens sources des calculs et paiements de paie ne renvoient pas à des lots comptabilisés.", nextAction: "Corrigez la comptabilisation de la paie et les liens sources comptables avant d’utiliser la prévision de trésorerie." },
  },
  PAYROLL_FORECAST_CERTIFIED_HRIS_INPUT_PROOF_MISSING: {
    en: { title: "Certified HRIS payroll input proof is missing", detail: "Payroll forecast amounts are withheld until every included run is bound to certified HRIS readiness and payroll engine input hashes.", nextAction: "Recalculate and post payroll from a certified HRIS readiness export before relying on finance or close assurance." },
    fr: { title: "Les preuves des données RH certifiées pour la paie sont manquantes", detail: "Les montants prévisionnels de paie ne sont pas présentés tant que chaque calcul inclus n’est pas lié à la préparation RH certifiée et aux empreintes des données d’entrée du moteur de paie.", nextAction: "Recalculez et comptabilisez la paie depuis un export RH certifié avant de vous fier aux contrôles financiers ou de clôture." },
  },
  PAYROLL_FORECAST_REGISTER_LEDGER_TIEOUT_MISSING: {
    en: { title: "Payroll register-to-ledger tie-out is incomplete", detail: "Payroll forecast amounts are withheld until matched component-register proof is linked to a posted payroll ledger source.", nextAction: "Repair payroll component-register proof and posted accounting source links before close." },
    fr: { title: "Le rapprochement du registre de paie avec la comptabilité est incomplet", detail: "Les montants prévisionnels de paie ne sont pas présentés tant que les preuves rapprochées du registre des composantes ne sont pas liées à une source de paie comptabilisée.", nextAction: "Corrigez les preuves du registre des composantes de paie et les liens sources comptabilisés avant la clôture." },
  },
  PAYROLL_FORECAST_PAYMENT_EVIDENCE_MISSING: {
    en: { title: "Payroll payment proof is missing", detail: "Upcoming net-pay forecast is withheld until released payment batches include immutable payment and ledger evidence.", nextAction: "Open payroll payments and complete payment release evidence." },
    fr: { title: "Les preuves de paiement de paie sont manquantes", detail: "La prévision du salaire net n’est pas présentée tant que les lots de paiement libérés ne comportent pas de preuves immuables de paiement et de comptabilisation.", nextAction: "Ouvrez les paiements de paie et complétez les preuves de libération des paiements." },
  },
}

export function presentSourceBlocker<T extends SnapshotBlocker>(blocker: T, locale: "en" | "fr"): T | null {
  if (locale !== "fr") return null
  let copy = sourceCopy[blocker.id]
  const prefix = "tenant-payroll-finance-forecast-"
  if (blocker.gate === "payroll_finance_forecast" && blocker.id.startsWith(prefix)) {
    const code = blocker.id.slice(prefix.length).toUpperCase().replace(/-/g, "_")
    const canonical = code === "PAYROLL_FORECAST_DECLARATION_MISSING" ? "PAYROLL_FORECAST_DECLARATION_PROOF_MISSING"
      : code === "PAYROLL_FORECAST_PAYMENT_BATCH_MISSING" ? "PAYROLL_FORECAST_PAYMENT_EVIDENCE_MISSING" : code
    const forecast = forecastCopy[canonical]
    if (forecast) copy = { ...forecast, gate: blocker.gate }
    else if (/^PAYROLL_FORECAST_[A-Z0-9_]+$/.test(code)) copy = {
      gate: blocker.gate,
      en: { title: "Payroll finance forecast is blocked", detail: `Payroll forecast proof failed closed with blocker ${code}.`, nextAction: "Open payroll finance evidence and clear the forecast blocker." },
      fr: { title: "La prévision financière de paie est bloquée", detail: `Les preuves de prévision de paie sont insuffisantes ; le blocage ${code} reste actif.`, nextAction: "Examinez les preuves financières de paie et traitez le blocage de prévision." },
    }
  }
  if (!copy || copy.gate !== blocker.gate) return null
  const match = copy.detail?.pattern.exec(blocker.detail)
  return {
    ...blocker,
    title: blocker.title === copy.en.title ? copy.fr.title ?? blocker.title : blocker.title,
    detail: match && copy.detail ? copy.detail.render(match) : blocker.detail === copy.en.detail ? copy.fr.detail ?? blocker.detail : blocker.detail,
    nextAction: blocker.nextAction === copy.en.nextAction ? copy.fr.nextAction ?? blocker.nextAction : blocker.nextAction,
  }
}
