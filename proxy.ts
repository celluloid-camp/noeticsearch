import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { i18nConfig } from "@/i18n/config";

const HEADER_LOCALE_NAME = "X-NEXT-INTL-LOCALE";

function resolveLocale(request: NextRequest): (typeof i18nConfig.locales)[number] {
	const cookie = request.cookies.get(i18nConfig.localeCookieName)?.value;
	if (cookie && i18nConfig.locales.includes(cookie as "en" | "fr")) {
		return cookie as "en" | "fr";
	}
	const acceptLanguage = request.headers.get("accept-language");
	if (acceptLanguage?.toLowerCase().includes("fr")) return "fr";
	return i18nConfig.defaultLocale;
}

export function proxy(request: NextRequest) {
	const locale = resolveLocale(request);
	const requestHeaders = new Headers(request.headers);
	requestHeaders.set(HEADER_LOCALE_NAME, locale);
	return NextResponse.next({
		request: { headers: requestHeaders },
	});
}

export const config = {
	matcher: ["/((?!api|_next/static|_next/image|favicon.ico|.*\\..*).*)"],
};
