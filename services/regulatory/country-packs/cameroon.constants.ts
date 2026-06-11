export const CAMEROON_COUNTRY_CODE = "CM"

export const CAMEROON_PAYMENT_PROVIDER_CODES = [
  "MTN_MOMO",
  "ORANGE_MONEY",
  "EU_MOBILE",
  "YUP",
  "OTHER",
] as const

export type CameroonPaymentProviderCode = (typeof CAMEROON_PAYMENT_PROVIDER_CODES)[number]

export const CAMEROON_TAX_RATE_PLACEHOLDERS = {
  nameEn: "Statutory output tax",
  nameFr: "Taxe collectee statutaire",
  rate: "",
} as const
