/**
 * next-intl config: supported locales and default.
 * localePrefix: "never" = no /en or /fr in URLs; locale from cookie/header only.
 * Passed to proxy so it can resolve locale from cookie/Accept-Language (not for URL routing).
 */
export const i18nConfig = {
  locales: ["en", "fr"] as const,
  defaultLocale: "en" as const,
  localePrefix: "never" as const,
  /** Cookie name used by next-intl when localePrefix is "never" */
  localeCookieName: "NEXT_LOCALE" as const,
  localeCookieMaxAge: 365 * 24 * 60 * 60, // 1 year
};

export type Locale = (typeof i18nConfig.locales)[number];
