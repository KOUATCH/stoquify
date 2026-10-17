import type { ProofTrailNode, ProofTrailResult } from "@/services/evidence/evidence-contracts"
import { presentSnapshotBlocker } from "@/lib/dashboard/snapshot-blocker-presentation"

// Only canonical application prose is translated. Record identifiers, custom
// descriptions, financial metadata and authority remain the server's values.
const french: Record<string, string> = {
  "Close certification is missing its certified export evidence.": "La certification de clôture ne dispose pas de sa preuve d’export certifié.",
  "Close certification evidence is stale": "Les preuves de certification de clôture sont périmées",
  "A recorded source change invalidated this close evidence. Retained exports do not certify the current close.": "Une modification enregistrée de la source a invalidé ces preuves de clôture. Les exports conservés ne certifient pas la clôture actuelle.",
  "Run a new close assessment and resolve its controls before requesting certification.": "Lancez une nouvelle évaluation de clôture et résolvez ses contrôles avant de demander la certification.",
  "Certified close export is missing": "L’export certifié de clôture est manquant",
  "The certified status has no retained certified export evidence.": "Le statut certifié ne dispose d’aucune preuve d’export certifié conservée.",
  "Close checklist has failed or unavailable controls": "Des contrôles de clôture ont échoué ou sont indisponibles",
  "Invalidated close pack export": "Export du dossier de clôture invalidé",
  "Retains invalidated close evidence": "Conserve les preuves de clôture invalidées",
  "Retained certified close pack export": "Export certifié du dossier de clôture conservé",
  "Retains recorded close certification": "Conserve la certification de clôture enregistrée",
  "Journal entry has unresolved proof blockers.": "L’écriture comptable présente des blocages de preuve non résolus.",
  "Journal entry is posted and linked to a posted ledger batch.": "L’écriture est comptabilisée et reliée à un lot comptable comptabilisé.",
  "Journal entry is posted but source trace is partial.": "L’écriture est comptabilisée, mais sa traçabilité à la source est partielle.",
  "Journal entry exists but is not posted.": "L’écriture existe, mais elle n’est pas comptabilisée.",
  "Reconciliation run has unresolved exceptions, suspense, or failed state.": "Le rapprochement présente des anomalies, des suspens non résolus ou un état d’échec.",
  "Reconciliation run is signed and has certificate evidence.": "Le rapprochement est signé et dispose d’une preuve de certificat.",
  "Reconciliation run is signed.": "Le rapprochement est signé.",
  "Reconciliation run is ready for sign-off with no blocking exceptions.": "Le rapprochement est prêt à être signé, sans anomalie bloquante.",
  "Reconciliation run exists but still needs review.": "Le rapprochement existe, mais nécessite encore une revue.",
  "Reconciliation run has not reached review or sign-off.": "Le rapprochement n’a pas encore atteint la revue ou la signature.",
  "Close run has unresolved blockers or unavailable evidence.": "La clôture présente des blocages non résolus ou des preuves indisponibles.",
  "Close run has explicit certification or certified close-pack export evidence.": "La clôture dispose d’une certification explicite ou d’un export certifié du dossier de clôture.",
  "Close run is ready but is not certified.": "La clôture est prête, mais n’est pas certifiée.",
  "Close run exists but is not ready for certification.": "La clôture existe, mais n’est pas prête pour la certification.",
  "Payment transaction has unresolved proof blockers.": "La transaction de paiement présente des blocages de preuve non résolus.",
  "Payment transaction is matched against provider or statement evidence.": "La transaction de paiement est rapprochée des preuves du prestataire ou du relevé.",
  "Payment transaction has a posted ledger batch.": "La transaction de paiement est reliée à un lot comptable comptabilisé.",
  "Payment transaction is confirmed but not yet reconciled.": "La transaction de paiement est confirmée, mais pas encore rapprochée.",
  "Payment transaction exists but has not reached confirmation or reconciliation.": "La transaction de paiement existe, mais n’est pas encore confirmée ou rapprochée.",
  "Business event failed": "Échec d’un événement métier",
  "Additional business events failed": "Autres événements métier en échec",
  "Review the failed business event before trusting this record.": "Examinez l’événement métier en échec avant de vous fier à ce document.",
  "Review the failed business events before trusting this record.": "Examinez les événements métier en échec avant de vous fier à ce document.",
  "Journal entry is voided": "L’écriture comptable est annulée",
  "Voided journal entries cannot be used as trusted accounting proof.": "Les écritures annulées ne peuvent pas servir de preuve comptable fiable.",
  "Accounting source link is missing": "Le lien vers la source comptable est absent",
  "Posted journal entries need source-link evidence before they can support cross-module proof.": "Une écriture comptabilisée doit être reliée à sa source pour étayer une preuve entre modules.",
  "Attach or backfill the accounting source link for this journal entry.": "Rattachez ou reconstituez le lien vers la source comptable de cette écriture.",
  "Posting batch failed": "Échec du lot comptable",
  "The linked ledger posting batch failed.": "Le lot comptable associé a échoué.",
  "Reconciliation run is failed or voided": "Le rapprochement a échoué ou est annulé",
  "Open payment exceptions remain": "Des anomalies de paiement restent ouvertes",
  "Resolve payment exceptions before relying on this reconciliation.": "Résolvez les anomalies de paiement avant de vous fier à ce rapprochement.",
  "Open suspense remains": "Des suspens restent ouverts",
  "Resolve or post suspense before sign-off.": "Résolvez ou comptabilisez les suspens avant la signature.",
  "Signed reconciliation timestamp is missing": "L’horodatage de signature du rapprochement est absent",
  "The run is signed but does not carry signed-at evidence.": "Le rapprochement est signé, mais sa date de signature n’est pas documentée.",
  "Payment transaction failed or was cancelled": "La transaction de paiement a échoué ou a été annulée",
  "Review the payment transaction before relying on this proof.": "Examinez la transaction de paiement avant de vous fier à cette preuve.",
  "Payment transaction needs reconciliation review": "La transaction de paiement nécessite une revue du rapprochement",
  "Resolve the dispute or suspense state in payment reconciliation.": "Résolvez le litige ou le suspens dans le rapprochement des paiements.",
  "Payment posting batch failed": "Échec du lot comptable du paiement",
  "The linked payment ledger posting batch failed.": "Le lot comptable associé au paiement a échoué.",
  "Resolve payment exceptions before trusting this transaction as reconciled.": "Résolvez les anomalies de paiement avant de considérer cette transaction comme rapprochée.",
  "Resolve or post suspense before relying on this transaction proof.": "Résolvez ou comptabilisez les suspens avant de vous fier à cette preuve de transaction.",
  "Close run is blocked or voided": "La clôture est bloquée ou annulée",
  "Close findings remain open": "Des constats de clôture restent ouverts",
  "Resolve or waive open close findings before certification.": "Résolvez les constats de clôture ou obtenez une dérogation avant la certification.",
  "Close checklist has failed controls": "Des contrôles de clôture ont échoué",
  "Close evidence is unavailable": "Des preuves de clôture sont indisponibles",
  "Regenerate or attach the missing close evidence.": "Régénérez ou joignez les preuves de clôture manquantes.",
  "Provider account internals are masked in the proof trail by default.": "Les informations internes du compte prestataire sont masquées par défaut dans la piste de preuve.",
  "Provider account internals are masked in payment transaction proof trails.": "Les informations internes du compte prestataire sont masquées dans les preuves de paiement.",
  "Provider references are protected by payment provider reference redaction policy.": "Les références du prestataire sont protégées par la politique de masquage des références de paiement.",
  "Close-pack watermark/export internals are hidden unless export permission and fresh auth pass.": "Les informations internes de l’export et du filigrane sont masquées sans autorisation d’export et authentification récente.",
  "Redacted evidence": "Preuve masquée", "Provider reference": "Référence du prestataire",
  "Open suspense item": "Suspens ouvert", "Open payment exception": "Anomalie de paiement ouverte",
  "Certified close pack export": "Export certifié du dossier de clôture", "Draft close pack export": "Export provisoire du dossier de clôture",
  "Posts journal entry": "Comptabilise l’écriture", "Explains source": "Documente la source",
  "Blocks trust": "Bloque la fiabilité", "Supports operational event": "Étaye l’événement opérationnel",
  "Records control event": "Consigne l’événement de contrôle", "Provides settlement evidence": "Fournit la preuve du règlement",
  "Supports reconciliation result": "Étaye le résultat du rapprochement", "Blocks reconciliation trust": "Bloque la fiabilité du rapprochement",
  "Resolved suspense": "Suspens résolu", "Resolved exception": "Anomalie résolue",
  "Provides payment rail context": "Précise le circuit de paiement", "Identifies provider-side transaction": "Identifie la transaction chez le prestataire",
  "Blocks posting proof": "Bloque la preuve de comptabilisation", "Posts payment transaction": "Comptabilise la transaction de paiement",
  "Blocks payment reconciliation": "Bloque le rapprochement du paiement", "Matches payment transaction": "Rapproche la transaction de paiement",
  "Blocks payment trust": "Bloque la fiabilité du paiement", "Blocks payment transaction trust": "Bloque la fiabilité de la transaction de paiement",
  "Supports payment transaction event": "Étaye l’événement de paiement", "Blocks close trust": "Bloque la fiabilité de la clôture",
  "Supports close readiness": "Étaye la préparation de la clôture", "Finding resolved or waived": "Constat résolu ou couvert par une dérogation",
  "Supports close evidence": "Étaye la preuve de clôture", "Evidence unavailable": "Preuve indisponible",
  "Certifies close evidence": "Certifie la preuve de clôture", "Exports close pack": "Exporte le dossier de clôture",
}

function translate(text: string) { return Object.hasOwn(french, text) ? french[text] : text }

function detail(text: string) {
  const fixed = translate(text)
  if (fixed !== text) return fixed
  const patterns: Array<[RegExp, (value: string) => string]> = [
    [/^(\d+) payment exception remains open or in review\.$/, n => `${n} anomalie(s) de paiement restent ouvertes ou en cours de revue.`],
    [/^(\d+) suspense item remains open or unresolved\.$/, n => `${n} suspens restent ouverts ou non résolus.`],
    [/^(\d+) exception\(s\) remain open for this transaction\.$/, n => `${n} anomalie(s) restent ouvertes pour cette transaction.`],
    [/^(\d+) suspense item\(s\) remain open for this transaction\.$/, n => `${n} suspens restent ouverts pour cette transaction.`],
    [/^(\d+) close assurance finding remains unresolved\.$/, n => `${n} constat(s) de clôture restent non résolus.`],
    [/^(\d+) checklist item failed or is unavailable\.$/, n => `${n} contrôle(s) ont échoué ou sont indisponibles.`],
    [/^(\d+) checklist item failed\.$/, n => `${n} contrôle(s) ont échoué.`],
    [/^(\d+) close evidence item is unavailable\.$/, n => `${n} élément(s) de preuve de clôture sont indisponibles.`],
    [/^(\d+) failed or rejected business event\(s\) are outside the displayed evidence sample\.$/, n => `${n} événement(s) métier en échec ou rejetés ne figurent pas dans l’échantillon de preuves affiché.`],
    [/^Run status is ([A-Z_]+)\.$/, status => `État du rapprochement : ${status}.`],
    [/^Close run status is ([A-Z_]+)\.$/, status => `État de la clôture : ${status}.`],
    [/^Payment transaction state is ([A-Z_]+)\.$/, status => `État de la transaction de paiement : ${status}.`],
    [/^Business event (\S+) did not apply successfully\.$/, id => `L’événement métier ${id} n’a pas été appliqué avec succès.`],
  ]
  for (const [pattern, render] of patterns) { const match = text.match(pattern); if (match) return render(match[1]) }
  return text
}

function nodeLabel(node: ProofTrailNode) {
  if (node.redacted) return translate(node.label)
  // These labels come from records, not from the application vocabulary.
  if (["accounting.source_link", "business.event", "ledger.audit_event", "close.checklist_item", "close.finding", "close.evidence_item"].includes(node.nodeType)) return node.label
  const prefixes: Record<string, [string, string]> = {
    "journal.entry": ["Journal entry ", "Écriture comptable "], "ledger.posting.batch": ["Posting batch ", "Lot comptable "],
    "reconciliation.run": ["Reconciliation ", "Rapprochement "], "payment.transaction": ["Payment transaction ", "Transaction de paiement "],
    "close.run": ["Close run ", "Clôture "], "reconciliation.match": ["Match ", "Rapprochement "],
    "reconciliation.suspense": ["Suspense ", "Suspens "], "payment.exception": ["Payment exception ", "Anomalie de paiement "],
  }
  const prefix = Object.hasOwn(prefixes, node.nodeType) ? prefixes[node.nodeType] : undefined
  if (prefix && node.label.startsWith(prefix[0])) return prefix[1] + node.label.slice(prefix[0].length)
  return translate(node.label)
}

export function presentProofTrail(proof: ProofTrailResult, locale: "en" | "fr"): ProofTrailResult {
  if (locale === "en") return proof
  return {
    ...proof, reason: translate(proof.reason),
    nodes: proof.nodes.map(node => ({ ...node, label: nodeLabel(node) })),
    edges: proof.edges.map(edge => ({ ...edge, label: translate(edge.label) })),
    blockers: proof.blockers.map(blocker =>
      ["close-assessment-order-ambiguous", "close-assessment-not-current", "close-assessment-voided"].includes(blocker.id)
        ? presentSnapshotBlocker(blocker, locale)
        : ({ ...blocker, title: translate(blocker.title), detail: detail(blocker.detail),
          ...(blocker.nextAction ? { nextAction: translate(blocker.nextAction) } : {}),
        })),
    redactions: proof.redactions.map(redaction => ({ ...redaction, reason: translate(redaction.reason) })),
  }
}

const types: Record<string, [string, string]> = {
  "journal.entry": ["Journal entry", "Écriture comptable"], "ledger.posting.batch": ["Posting batch", "Lot comptable"],
  "accounting.source_link": ["Accounting source", "Source comptable"], "business.event": ["Business event", "Événement métier"],
  "ledger.audit_event": ["Audit event", "Événement d’audit"], "reconciliation.run": ["Reconciliation", "Rapprochement"],
  "payment.provider_account": ["Provider account", "Compte prestataire"], "reconciliation.match": ["Match", "Rapprochement"],
  "reconciliation.suspense": ["Suspense item", "Suspens"], "payment.exception": ["Payment exception", "Anomalie de paiement"],
  "payment.transaction": ["Payment transaction", "Transaction de paiement"], "payment.provider_reference": ["Provider reference", "Référence du prestataire"],
  "close.run": ["Close run", "Clôture"], "close.checklist_item": ["Close control", "Contrôle de clôture"],
  "close.finding": ["Close finding", "Constat de clôture"], "close.evidence_item": ["Close evidence", "Preuve de clôture"],
  "close.pack_export": ["Close pack export", "Export du dossier de clôture"],
  accounting: ["Accounting", "Comptabilité"], payments: ["Payments", "Paiements"], reconciliation: ["Reconciliation", "Rapprochement"],
  controls: ["Controls", "Contrôles"], close: ["Close", "Clôture"], close_assurance: ["Close assurance", "Assurance de clôture"],
}

export function proofTypeLabel(value: string, locale: "en" | "fr") {
  return Object.hasOwn(types, value) ? types[value][locale === "fr" ? 1 : 0] : value
}
