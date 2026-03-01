"use client";

import { Check, Languages } from "lucide-react";
import { useRouter } from "next/navigation";
import { useLocale } from "next-intl";
import { useTransition } from "react";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
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

  const getLocaleLabel = (loc: Locale) => {
    return loc === "en" ? "English" : "Français";
  };

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button className="shrink-0" size="icon" variant="ghost">
          <Languages className="h-[1.2rem] w-[1.2rem]" />
          <span className="sr-only">Switch language</span>
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end">
        {i18nConfig.locales.map((loc) => (
          <DropdownMenuItem
            disabled={isPending}
            key={loc}
            onClick={() => handleChange(loc)}
          >
            <span className="flex flex-1 items-center">
              {getLocaleLabel(loc)}
            </span>
            {locale === loc && <Check className="h-4 w-4" />}
          </DropdownMenuItem>
        ))}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
