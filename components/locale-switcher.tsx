"use client";

import { useRouter } from "next/navigation";
import { useLocale } from "next-intl";
import { useTransition } from "react";
import type { Locale } from "@/i18n/config";
import { i18nConfig } from "@/i18n/config";
import { setLocaleCookie } from "@/lib/actions/locale";

export function LocaleSwitcher() {
  const locale = useLocale() as Locale;
  const router = useRouter();
  const [isPending, startTransition] = useTransition();

  const handleChange = (nextLocale: Locale) => {
    if (nextLocale === locale) {
      return;
    }
    startTransition(async () => {
      await setLocaleCookie(nextLocale);
      router.refresh();
    });
  };

  return (
    <div className="flex items-center gap-1 rounded-md border border-border p-0.5">
      {i18nConfig.locales.map((loc) => (
        <button
          className={`rounded px-2 py-1 font-medium text-xs transition-colors ${
            locale === loc
              ? "bg-primary text-primary-foreground"
              : "text-muted-foreground hover:bg-muted hover:text-foreground"
          }`}
          disabled={isPending}
          key={loc}
          onClick={() => handleChange(loc)}
          title={loc === "en" ? "English" : "Français"}
          type="button"
        >
          {loc.toUpperCase()}
        </button>
      ))}
    </div>
  );
}
