import { Analytics } from "@vercel/analytics/next";
import type { Metadata } from "next";
import { Geist, IBM_Plex_Mono } from "next/font/google";
import { NextIntlClientProvider } from "next-intl";
import { getLocale, getMessages } from "next-intl/server";
import AppLayoutClient from "@/components/app-layout-client";
import { AuthProvider } from "@/components/auth-provider";
import { ThemeProvider } from "@/components/theme-provider";
import { TooltipProvider } from "@/components/ui/tooltip";
import "./globals.css";
import { Agentation } from "agentation";
import { NuqsAdapter } from "nuqs/adapters/next/app";
import { TRPCProvider } from "@/lib/trpc/provider";

const geistSans = Geist({
  variable: "--font-sans",
  subsets: ["latin"],
});

const ibmPlexMono = IBM_Plex_Mono({
  variable: "--font-mono",
  subsets: ["latin"],
  weight: ["400", "500", "600"],
});

export const metadata: Metadata = {
  title: "NoeticSearch - Video Subtitle Search Platform",
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
    <html lang={locale}>
      <body
        className={`${geistSans.variable} ${ibmPlexMono.variable} antialiased`}
      >
        <NextIntlClientProvider locale={locale} messages={messages}>
          <TRPCProvider>
            <NuqsAdapter>
              <ThemeProvider
                attribute="class"
                defaultTheme="system"
                disableTransitionOnChange
              >
                <AuthProvider>
                  <TooltipProvider>
                    <AppLayoutClient>{children}</AppLayoutClient>
                  </TooltipProvider>
                </AuthProvider>
              </ThemeProvider>
            </NuqsAdapter>
          </TRPCProvider>
        </NextIntlClientProvider>
        <Analytics />
        {process.env.NODE_ENV === "development" && <Agentation />}
      </body>
    </html>
  );
}
