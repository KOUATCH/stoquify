export type OrganizationMoneyContext = Readonly<{
  organizationId: string
  locale: string
  currency: string | null | undefined
}>

export class OrganizationCurrencyUnavailableError extends Error {
  readonly code = "ORGANIZATION_CURRENCY_UNAVAILABLE"
  readonly organizationId: string

  constructor(organizationId: string) {
    super("Organization currency is unavailable for organization " + organizationId + ".")
    this.name = "OrganizationCurrencyUnavailableError"
    this.organizationId = organizationId
  }
}

export function currencyFractionDigits(currency: string): number {
  return new Intl.NumberFormat("en", {
    style: "currency",
    currency: currency.trim().toUpperCase(),
  }).resolvedOptions().maximumFractionDigits ?? 2
}

export function createOrganizationMoneyFormatter(
  context: OrganizationMoneyContext,
): Intl.NumberFormat {
  const currency = context.currency?.trim().toUpperCase()

  if (!currency) {
    throw new OrganizationCurrencyUnavailableError(context.organizationId)
  }

  return new Intl.NumberFormat(context.locale, {
    style: "currency",
    currency,
  })
}
