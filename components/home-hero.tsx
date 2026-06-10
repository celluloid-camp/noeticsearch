"use client";

import { Globe, Plus, Search } from "lucide-react";
import Link from "next/link";
import { useTranslations } from "next-intl";
import OurIcon from "@/components/icons/ouricon";
import { Button } from "@/components/ui/button";
import { useSession } from "@/lib/auth-client";

export function HomeHero() {
  const { data: session } = useSession();
  const isSignedIn = !!session?.user;
  const t = useTranslations("hero");
  const subtitle = t("subtitle");

  return (
    <div className="mb-10 border-border border-b pb-8">
      <div className="border-border border-t px-10 pt-14">
        <div className="mb-4 flex items-center gap-2">
          <OurIcon />
          <span className="font-mono text-muted-foreground text-xs uppercase tracking-widest">
            {t("brand")}
          </span>
        </div>

        <h1 className="font-bold text-3xl tracking-tight sm:text-4xl md:text-5xl">
          {t("title")}
          {subtitle ? (
            <>
              <br />
              <span className="text-muted-foreground">{subtitle}</span>
            </>
          ) : null}
        </h1>

        <div className="mt-5 max-w-3xl space-y-4 pt-2 text-sm leading-relaxed sm:text-base">
          <div>
            <h2 className="font-semibold text-foreground text-sm sm:text-base">
              {t("whatIsTitle")}
            </h2>
            <p className="text-muted-foreground">{t("whatIsDescription")}</p>
          </div>
        </div>

        <div className="mt-6 flex flex-wrap items-center gap-3">
          {isSignedIn ? (
            <>
              <Button asChild size="lg">
                <Link href="/import">
                  <Plus className="mr-1.5 size-3.5" />
                  {t("addCorpus")}
                </Link>
              </Button>
              <Button asChild size="lg">
                <Link href="/search">
                  <Search className="mr-1.5 size-3.5" />
                  {t("advancedSearch")}
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
  );
}
