export const CAMEROON_COUNTRY_CODE = "CM"
export const CAMEROON_DGI_E_SERVICES_CHANNEL = "CM_DGI_E_SERVICES_PORTAL"
export const CAMEROON_DGI_SANDBOX_ADAPTER_CODE = "CM_DGI_SANDBOX"

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
