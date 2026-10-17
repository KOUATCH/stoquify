import type { SnapshotBlocker } from "@/services/snapshots/snapshot-contracts"
import { presentSourceBlocker } from "./snapshot-source-blocker-presentation"

type Copy = Pick<SnapshotBlocker, "title" | "detail" | "nextAction">
// Verified static messages from payment-truth, close-readiness and tenant-operating snapshots.
// Match both semantic identity and original copy so later/custom source text is never overwritten.
const setupCopy: Record<string, { gate: string; en: Copy; fr: Copy }> = {
  "payment-provider-account-missing": {
    gate: "payment_truth",
    en: { title: "No active provider account", detail: "Payment truth is partial until at least one bank, cash, or mobile-money provider account is active.", nextAction: "Activate a provider account and connect statement/provider evidence." },
    fr: { title: "Aucun compte de prestataire actif", detail: "La vue des paiements reste partielle tant qu’aucun compte bancaire, de caisse ou de mobile money n’est actif.", nextAction: "Activez un compte de prestataire et associez les relevés ou les justificatifs du prestataire." },
  },
  "payment-reconciliation-run-missing": {
    gate: "payment_truth",
    en: { title: "No reconciliation run in period", detail: "Provider accounts exist, but this period has no reconciliation run yet.", nextAction: "Run payment reconciliation for the selected period." },
    fr: { title: "Aucun rapprochement sur la période", detail: "Des comptes de prestataires existent, mais aucun rapprochement n’a encore été effectué pour cette période.", nextAction: "Lancez le rapprochement des paiements pour la période sélectionnée." },
  },
  "close-periods-missing": {
    gate: "close_readiness",
    en: { title: "No accounting period covers this snapshot", detail: "Close readiness is partial until accounting periods exist for the selected date range.", nextAction: "Create fiscal year and accounting periods." },
    fr: { title: "Aucune période comptable ne couvre cet instantané", detail: "La préparation à la clôture reste partielle tant qu’aucune période comptable ne couvre les dates sélectionnées.", nextAction: "Créez l’exercice et les périodes comptables." },
  },
  "tenant-active-location-missing": {
    gate: "tenant_operating_snapshot",
    en: { title: "No active location is configured", detail: "Tenant operating truth is partial until at least one active branch or warehouse exists.", nextAction: "Create or reactivate a location." },
    fr: { title: "Aucun site actif n’est configuré", detail: "La vue opérationnelle de l’organisation reste partielle tant qu’aucune agence ou aucun entrepôt n’est actif.", nextAction: "Créez ou réactivez un site." },
  },
}

export function presentSnapshotBlocker<T extends SnapshotBlocker>(blocker: T, locale: "en" | "fr"): T {
  if (locale === "fr" && blocker.gate === "payroll_finance_forecast" && blocker.id === "tenant-payroll-finance-forecast-payroll-forecast-currency-mismatch") {
    const match = /^Forecast source currencies: ([A-Z]{3}(?:; [A-Z]{3})*)\. No conversion evidence establishes a total in ([A-Z]{3})\.$/.exec(blocker.detail ?? "")
    return {
      ...blocker,
      title: blocker.title === "Payroll forecast currencies cannot be combined" ? "Les devises des prévisions de paie ne peuvent pas être additionnées" : blocker.title,
      detail: match ? `Devises des sources de prévision : ${match[1]}. Aucune preuve de conversion ne permet d’établir un total en ${match[2]}.` : blocker.detail,
      nextAction: blocker.nextAction === "Review payment batches and declarations by currency before relying on a combined cash forecast."
        ? "Examinez les lots de paiement et les déclarations par devise avant de vous fier à une prévision de trésorerie combinée." : blocker.nextAction,
    }
  }
  const source = presentSourceBlocker(blocker, locale)
  if (source) return source
  if (locale === "fr" && blocker.gate === "payroll_employee_balance" && ["tenant-payroll-balance-currency-mismatch", "tenant-payroll-settlement-currency-mismatch"].includes(blocker.id)) {
    const match = /^Amounts by currency: ((?:-?\d+\.\d{2} [A-Z]{3})(?:; -?\d+\.\d{2} [A-Z]{3})*)\. No conversion evidence establishes a total in ([A-Z]{3})\.$/.exec(blocker.detail ?? "")
    return {
      ...blocker,
      title: blocker.title === "Employee balance currencies cannot be combined" ? "Les soldes salariés de devises différentes ne peuvent pas être additionnés"
        : blocker.title === "Employee settlement currencies cannot be combined" ? "Les règlements salariés de devises différentes ne peuvent pas être additionnés" : blocker.title,
      detail: match ? `Montants par devise : ${match[1]}. Aucune preuve de conversion ne permet d’établir un total en ${match[2]}.` : blocker.detail,
      nextAction: blocker.nextAction === "Review payroll balances and settlements by currency; do not treat them as one converted total."
        ? "Examinez les soldes et règlements de paie par devise ; ces montants ne constituent pas un total converti." : blocker.nextAction,
    }
  }
  if (locale === "fr" && blocker.gate === "payment_truth" && blocker.id === "payment-suspense-currency-mismatch") {
    const match = /^Open suspense by currency: ((?:-?\d+\.\d{2} [A-Z]{3})(?:; -?\d+\.\d{2} [A-Z]{3})*)\. No conversion evidence establishes a total in ([A-Z]{3})\.$/.exec(blocker.detail ?? "")
    return {
      ...blocker,
      title: blocker.title === "Suspense currencies cannot be combined" ? "Les suspens de devises différentes ne peuvent pas être additionnés" : blocker.title,
      detail: match ? `Suspens ouverts par devise : ${match[1]}. Aucune preuve de conversion ne permet d’établir un total en ${match[2]}.` : blocker.detail,
      nextAction: blocker.nextAction === "Review suspense by currency in reconciliation; do not treat these amounts as one converted total."
        ? "Examinez les suspens par devise dans le rapprochement ; ces montants ne constituent pas un total converti." : blocker.nextAction,
    }
  }
  if (locale === "fr" && blocker.gate === "payment_truth" && blocker.id === "payment-suspense-open") {
    const match = /^(\d+) suspense item\(s\) remain open(?: with (-?\d+\.\d{2}) ([A-Z]{3}) in unresolved value\.|; a combined currency total is unavailable\.)$/.exec(blocker.detail ?? "")
    return {
      ...blocker,
      title: blocker.title === "Payment suspense queue is not empty" ? "Des suspens de paiement restent ouverts" : blocker.title,
      detail: match ? `${match[1]} suspens de paiement restent ouverts${match[2] ? ` pour ${match[2]} ${match[3]}` : " ; le total combiné des devises est indisponible"}.` : blocker.detail,
      nextAction: blocker.nextAction === "Classify, match, post, or resolve suspense items." ? "Classez, rapprochez, comptabilisez ou résolvez les suspens." : blocker.nextAction,
    }
  }
  if (locale === "fr" && blocker.gate === "close_readiness" && blocker.id === "close-runs-blocked") {
    const match = /^(\d+) close run\(s\) are blocked in the selected period\.$/.exec(blocker.detail ?? "")
    const count = match ? Number(match[1]) : null
    return {
      ...blocker,
      title: blocker.title === "Close runs are blocked" ? "Clôtures bloquées" : blocker.title,
      detail: count !== null && Number.isSafeInteger(count) && count > 0
        ? count === 1 ? "1 exécution de clôture est bloquée sur la période sélectionnée."
          : `${count} exécutions de clôture sont bloquées sur la période sélectionnée.`
        : blocker.detail,
      nextAction: blocker.nextAction === "Use Close Assurance to clear blockers before certification."
        ? "Examinez les blocages dans le centre de clôture avant toute certification." : blocker.nextAction,
    }
  }
  const copy = setupCopy[blocker.id]
  if (locale !== "fr" || !copy || copy.gate !== blocker.gate) return blocker
  return {
    ...blocker,
    title: blocker.title === copy.en.title ? copy.fr.title : blocker.title,
    detail: blocker.detail === copy.en.detail ? copy.fr.detail : blocker.detail,
    nextAction: blocker.nextAction === copy.en.nextAction ? copy.fr.nextAction : blocker.nextAction,
  }
}
