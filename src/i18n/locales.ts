export const locales = ["zh", "en", "es", "ko", "ja", "fr", "ar"] as const;
export type Locale = (typeof locales)[number];

export const defaultLocale: Locale = "en";

