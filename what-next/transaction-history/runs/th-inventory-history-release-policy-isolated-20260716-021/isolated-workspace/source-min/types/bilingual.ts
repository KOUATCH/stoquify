// Utility type for bilingual text support
export const SUPPORTED_LOCALES = ["en", "fr"] as const;
export const DEFAULT_LOCALE = "en" as const;

export type Locale = (typeof SUPPORTED_LOCALES)[number];

export type BilingualText = {
  en: string;
  fr?: string;
};

// Helper function to get text in preferred locale
export function getBilingualText(
  enText: string | null | undefined,
  frText: string | null | undefined,
  locale: 'en' | 'fr' = 'en'
): string {
  if (locale === 'fr' && frText) {
    return frText;
  }
  return enText || frText || '';
}

// Helper function to format bilingual field names for queries
export function getBilingualFieldName(fieldName: string, locale: 'en' | 'fr' = 'en'): string {
  return locale === 'fr' ? `${fieldName}Fr` : `${fieldName}En`;
}
