import { format, formatDistanceToNow } from "date-fns";
import { enUS, fr, type Locale } from "date-fns/locale";

export const DATE_FNS_LOCALES: Record<string, Locale> = { en: enUS, fr };

export function getDateLocale(locale: string): Locale {
  return DATE_FNS_LOCALES[locale] ?? enUS;
}

export function relativeTime(date: Date, locale: string): string {
  return formatDistanceToNow(date, {
    addSuffix: true,
    locale: getDateLocale(locale),
  });
}

export function formatDate(
  date: Date,
  dateFormat: string,
  locale: string
): string {
  return format(date, dateFormat, { locale: getDateLocale(locale) });
}
