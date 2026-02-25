import { getRequestConfig } from "next-intl/server";
import { i18nConfig } from "./config";

export default getRequestConfig(async ({ requestLocale }) => {
  let locale = await requestLocale;
  if (!(locale && i18nConfig.locales.includes(locale as "en" | "fr"))) {
    locale = i18nConfig.defaultLocale;
  }
  return {
    locale,
    messages: (await import(`../messages/${locale}.json`)).default,
  };
});
