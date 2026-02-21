"use server";

import { cookies } from "next/headers";
import { i18nConfig, type Locale } from "@/i18n/config";

export async function setLocaleCookie(locale: Locale) {
	if (!i18nConfig.locales.includes(locale)) return;
	const cookieStore = await cookies();
	cookieStore.set(i18nConfig.localeCookieName, locale, {
		path: "/",
		maxAge: i18nConfig.localeCookieMaxAge,
		sameSite: "lax",
	});
}
