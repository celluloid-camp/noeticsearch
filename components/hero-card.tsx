"use client";

import { BookOpen, Globe, Search } from "lucide-react";
import Link from "next/link";
import { useTranslations } from "next-intl";
import OurIcon from "@/components/icons/ouricon";
import { PublicSearchesGrid } from "@/components/public-searches-grid";
import { Button } from "@/components/ui/button";
import { useSession } from "@/lib/auth-client";
import { GridPattern } from "./ui/grid-pattern";

export function HeroCard() {
  const { data: session } = useSession();
  const isSignedIn = !!session?.user;
  const t = useTranslations("hero");

  return (
    <div className="relative h-full">
      <GridPattern
        className="stroke-border/50"
        height={50}
        strokeDasharray="4 2"
        width={35}
        x={-1}
        y={-1}
      />
      <div className="relative z-10 mx-auto h-full w-full max-w-4xl border-x bg-background py-8">
        {/* Header block */}
        <div className="mb-10 border-border border-b pb-8">
          <div className="px-10">
            <div className="mb-4 flex items-center gap-2">
              <OurIcon />
              <span className="font-mono text-muted-foreground text-xs uppercase tracking-widest">
                {t("brand")}
              </span>
            </div>

            <h1 className="font-bold text-3xl tracking-tight sm:text-4xl md:text-5xl">
              {t("title")}
              <br />
              <span className="text-muted-foreground">{t("subtitle")}</span>
            </h1>

            <p className="mt-4 max-w-lg text-muted-foreground text-sm leading-relaxed sm:text-base">
              {t("description")}
            </p>

            {/* CTAs */}
            <div className="mt-6 flex flex-wrap items-center gap-3">
              {isSignedIn ? (
                <>
                  <Button asChild size="lg">
                    <Link href="/search">
                      <Search className="mr-1.5 size-3.5" />
                      {t("newSearch")}
                    </Link>
                  </Button>
                  <Button asChild size="lg" variant="outline">
                    <Link href="/library/mine">
                      <BookOpen className="mr-1.5 size-3.5" />
                      {t("myLibrary")}
                    </Link>
                  </Button>
                </>
              ) : (
                <>
                  <Button asChild size="sm">
                    <Link href="/sign-up">{t("getStarted")}</Link>
                  </Button>
                  <Button asChild size="sm" variant="outline">
                    <Link href="/sign-in">{t("signIn")}</Link>
                  </Button>
                  <Button asChild size="sm" variant="ghost">
                    <Link href="/library/all">
                      <Globe className="mr-1.5 size-3.5" />
                      {t("browsePublicLibrary")}
                    </Link>
                  </Button>
                </>
              )}
            </div>
          </div>
        </div>

        <PublicSearchesGrid />
      </div>
    </div>
  );
}
