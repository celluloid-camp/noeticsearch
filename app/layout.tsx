import { Analytics } from "@vercel/analytics/next";
import type { Metadata } from "next";
import { Geist, Geist_Mono, Public_Sans } from "next/font/google";
import { NextIntlClientProvider } from "next-intl";
import { getLocale, getMessages } from "next-intl/server";
import AppLayoutClient from "@/components/app-layout-client";
import { AuthProvider } from "@/components/auth-provider";
import { ThemeProvider } from "@/components/theme-provider";
import { TooltipProvider } from "@/components/ui/tooltip";
import "./globals.css";
import { NuqsAdapter } from "nuqs/adapters/next/app";
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
    <html className={publicSans.variable} lang={locale}>
      <body
        className={`${geistSans.variable} ${geistMono.variable} antialiased`}
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
        {/* {process.env.NODE_ENV === "development" && <Agentation />} */}
      </body>
    </html>
  );
}
