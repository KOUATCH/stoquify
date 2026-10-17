import { localizePath } from "@/i18n/routing"
import type { BIActionLink, BIDrillThrough } from "@/services/bi/bi-contracts"
import type { AuthorizedCashCommandData } from "./cash-command-contracts"

// Read permissions of the destination page and its workbench queries. These do
// not replace the independent permissions for viewing a Cash Command aggregate.
export const CASH_DESTINATION_PERMISSIONS: Record<string, readonly string[]> = {
  "/dashboard/inventory/items": ["inventory.items.read"],
  "/dashboard/payroll/payments": ["payments.reconciliation.read", "payroll.command.read", "payroll.payments.reconcile"],
  "/dashboard/payroll/declarations": ["payroll.command.read", "payroll.declarations.manage"],
}

export const CASH_DESTINATION_DENIED = "This indicator is available, but your current access does not permit its source workspace. Ask your administrator to review destination access."

/** Localize only navigation fields; source identity, hashes and evidence stay intact. */
export function localizeCashCommandNavigation(data: AuthorizedCashCommandData, locale: "en" | "fr"): AuthorizedCashCommandData {
  const reason = (value: string | null) => locale === "fr" && value === CASH_DESTINATION_DENIED
    ? "Cet indicateur est disponible, mais vos droits actuels ne permettent pas d’ouvrir son espace source. Demandez à votre administrateur de vérifier cet accès."
    : value
  const action = (link: BIActionLink | null): BIActionLink | null => link
    ? { ...link, href: localizePath(link.href, locale), disabledReason: reason(link.disabledReason) }
    : null
  const drill = (link: BIDrillThrough | null): BIDrillThrough | null => !link ? null : link.available
    ? { ...link, ...(link.href ? { href: localizePath(link.href, locale) } : {}) }
    : { ...link, unavailableReason: reason(link.unavailableReason)! }
  return {
    ...data,
    commandBrief: { ...data.commandBrief, primaryAction: action(data.commandBrief.primaryAction), drillThrough: drill(data.commandBrief.drillThrough) },
    cards: data.cards.map(card => ({ ...card, actionLink: action(card.actionLink), drillThrough: drill(card.drillThrough)! })),
    changes: data.changes.map(change => ({ ...change, actionLink: action(change.actionLink), drillThrough: drill(change.drillThrough)! })),
    risks: data.risks.map(risk => ({ ...risk, actionLink: action(risk.actionLink), drillThrough: drill(risk.drillThrough)! })),
    actionsToday: data.actionsToday.map(item => ({ ...item, actionLink: action(item.actionLink)! })),
  }
}
