"use client";

import { Globe, PlayCircle, Plus, Search } from "lucide-react";
import Image from "next/image";
import Link from "next/link";
import { useTranslations } from "next-intl";
import ReactPlayer from "react-player";
import OurIcon from "@/components/icons/ouricon";
import { PublicSearchesGrid } from "@/components/public-searches-grid";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  Item,
  ItemContent,
  ItemDescription,
  ItemHeader,
  ItemMedia,
  ItemTitle,
} from "@/components/ui/item";
import { useSession } from "@/lib/auth-client";
import { GridPattern } from "./ui/grid-pattern";

export function HeroCard() {
  const { data: session } = useSession();
  const isSignedIn = !!session?.user;
  const t = useTranslations("hero");
  const tutorialUrl = "https://peertube.example.com/w/tutorial-search";
  const corpusTutorialUrl = "https://peertube.example.com/w/tutorial-corpus";

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
                    <Link href="/import">
                      <Plus className="mr-1.5 size-3.5" />
                      {t("addCorpus")}
                    </Link>
                  </Button>
                  <Button asChild size="lg" variant="outline">
                    <Link href="/library/mine">
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

        {/* Tutorial cards */}
        <div className="mb-10 border-border border-b px-10 pb-10">
          <div className="grid gap-4 md:grid-cols-2">
            {/* Corpus tutorial card */}
            <Dialog>
              <DialogTrigger asChild>
                <button className="w-full text-left" type="button">
                  <Item size="sm" variant="outline">
                    <ItemMedia variant="image">
                      <div className="relative h-16 w-28 overflow-hidden rounded-sm bg-muted">
                        <Image
                          alt={t("corpusTutorialTitle")}
                          className="object-cover transition group-hover:scale-[1.02]"
                          fill
                          sizes="64px"
                          src="/placeholder.svg"
                        />
                        <div className="pointer-events-none absolute inset-0 flex items-center justify-center bg-black/40">
                          <PlayCircle className="size-4 text-background" />
                        </div>
                      </div>
                    </ItemMedia>
                    <ItemContent>
                      <ItemHeader>
                        <ItemTitle>{t("corpusTutorialTitle")}</ItemTitle>
                      </ItemHeader>
                      <ItemDescription>
                        {t("corpusTutorialDescription")}
                      </ItemDescription>
                    </ItemContent>
                  </Item>
                </button>
              </DialogTrigger>
              <DialogContent className="sm:max-w-3xl">
                <DialogHeader>
                  <DialogTitle>{t("corpusTutorialTitle")}</DialogTitle>
                </DialogHeader>
                <div className="relative mt-2 aspect-video w-full overflow-hidden rounded-md bg-black">
                  <ReactPlayer
                    controls
                    height="100%"
                    src={corpusTutorialUrl}
                    width="100%"
                  />
                </div>
              </DialogContent>
            </Dialog>

            {/* Search tutorial card */}
            <Dialog>
              <DialogTrigger asChild>
                <button className="w-full text-left" type="button">
                  <Item size="sm" variant="outline">
                    <ItemMedia variant="image">
                      <div className="relative h-16 w-28 overflow-hidden rounded-sm bg-muted">
                        <Image
                          alt={t("tutorialTitle")}
                          className="object-cover transition group-hover:scale-[1.02]"
                          fill
                          sizes="64px"
                          src="/placeholder.svg"
                        />
                        <div className="pointer-events-none absolute inset-0 flex items-center justify-center bg-black/40">
                          <PlayCircle className="size-4 text-background" />
                        </div>
                      </div>
                    </ItemMedia>
                    <ItemContent>
                      <ItemHeader>
                        <ItemTitle>{t("tutorialTitle")}</ItemTitle>
                      </ItemHeader>
                      <ItemDescription>
                        {t("tutorialDescription")}
                      </ItemDescription>
                    </ItemContent>
                  </Item>
                </button>
              </DialogTrigger>
              <DialogContent className="sm:max-w-3xl">
                <DialogHeader>
                  <DialogTitle>{t("tutorialTitle")}</DialogTitle>
                </DialogHeader>
                <div className="relative mt-2 aspect-video w-full overflow-hidden rounded-md bg-black">
                  <ReactPlayer
                    controls
                    height="100%"
                    src={tutorialUrl}
                    width="100%"
                  />
                </div>
              </DialogContent>
            </Dialog>
          </div>
        </div>

        <PublicSearchesGrid />
      </div>
    </div>
  );
}
