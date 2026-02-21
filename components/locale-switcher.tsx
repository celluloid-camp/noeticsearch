"use client";

import { useLocale } from "next-intl";
import { useRouter } from "next/navigation";
import { useTransition } from "react";
import { setLocaleCookie } from "@/lib/actions/locale";
import { i18nConfig } from "@/i18n/config";
import type { Locale } from "@/i18n/config";

export function LocaleSwitcher() {
	const locale = useLocale() as Locale;
	const router = useRouter();
	const [isPending, startTransition] = useTransition();

	const handleChange = (nextLocale: Locale) => {
		if (nextLocale === locale) return;
		startTransition(async () => {
			await setLocaleCookie(nextLocale);
			router.refresh();
		});
	};

	return (
		<div className="flex items-center gap-1 rounded-md border border-border p-0.5">
			{i18nConfig.locales.map((loc) => (
				<button
					key={loc}
					type="button"
					onClick={() => handleChange(loc)}
					disabled={isPending}
					className={`rounded px-2 py-1 text-xs font-medium transition-colors ${
						locale === loc
							? "bg-primary text-primary-foreground"
							: "text-muted-foreground hover:text-foreground hover:bg-muted"
					}`}
					title={loc === "en" ? "English" : "Français"}
				>
					{loc.toUpperCase()}
				</button>
			))}
		</div>
	);
}
