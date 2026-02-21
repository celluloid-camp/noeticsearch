import { Analytics } from "@vercel/analytics/next";
import type { Metadata } from "next";
import { Geist, Geist_Mono, Public_Sans } from "next/font/google";
import { NextIntlClientProvider } from "next-intl";
import { getLocale, getMessages } from "next-intl/server";
import AppLayoutClient from "@/components/app-layout-client";
import Header from "@/components/header";
import { TooltipProvider } from "@/components/ui/tooltip";
import "./globals.css";
import { Agentation } from "agentation";
import { TRPCProvider } from "@/lib/trpc/provider";

const publicSans = Public_Sans({ subsets: ["latin"], variable: "--font-sans" });

const geistSans = Geist({
	variable: "--font-geist-sans",
	subsets: ["latin"],
});

const geistMono = Geist_Mono({
	variable: "--font-geist-mono",
	subsets: ["latin"],
});

export const metadata: Metadata = {
	title: "VisionSearch - Video Subtitle Search Platform",
	description:
		"Search for text in video subtitles. Add PeerTube videos and search their content with AI assistance.",
	generator: "v0.app",
	icons: {
		icon: [
			{
				url: "/icon-light-32x32.png",
				media: "(prefers-color-scheme: light)",
			},
			{
				url: "/icon-dark-32x32.png",
				media: "(prefers-color-scheme: dark)",
			},
			{
				url: "/icon.svg",
				type: "image/svg+xml",
			},
		],
		apple: "/apple-icon.png",
	},
};

export default async function RootLayout({
	children,
}: Readonly<{
	children: React.ReactNode;
}>) {
	const locale = await getLocale();
	const messages = await getMessages();

	return (
		<html lang={locale} className={publicSans.variable}>
			<body
				className={`${geistSans.variable} ${geistMono.variable} antialiased`}
			>
				<NextIntlClientProvider locale={locale} messages={messages}>
					<TRPCProvider>
						<TooltipProvider>
							<div className="flex flex-col h-screen bg-background">
								<Header />
								<div className="flex-1 overflow-hidden relative">
									<AppLayoutClient>{children}</AppLayoutClient>
								</div>
							</div>
						</TooltipProvider>
					</TRPCProvider>
				</NextIntlClientProvider>
				<Analytics />
				{process.env.NODE_ENV === "development" && <Agentation />}
			</body>
		</html>
	);
}
