import { useLocale } from "next-intl";
import { relativeTime } from "@/lib/date";

export function useRelativeTime(date: Date): string {
  const locale = useLocale();
  return relativeTime(date, locale);
}
