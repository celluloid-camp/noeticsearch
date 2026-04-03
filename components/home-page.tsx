"use client";

import { PlayCircle } from "lucide-react";
import Image from "next/image";
import { useTranslations } from "next-intl";
import ReactPlayer from "react-player";
import { PublicSearchesGrid } from "@/components/public-searches-grid";
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
import { HomeHero } from "./home-hero";
import { GridPattern } from "./ui/grid-pattern";

export function HomePage() {
  const t = useTranslations("hero");
  const { data: session } = useSession();
  const isSignedIn = !!session?.user;
  const tutorialUrl = "https://peertube.example.com/w/tutorial-search";
  const corpusTutorialUrl = "https://peertube.example.com/w/tutorial-corpus";

  return (
    <div className="relative h-full overflow-y-auto">
      <GridPattern
        className="stroke-border/50"
        height={50}
        strokeDasharray="4 2"
        width={35}
        x={-1}
        y={-1}
      />
      <div className="relative z-10 mx-auto min-h-full w-full max-w-4xl border-x bg-background py-8">
        <HomeHero />

        <div className="mb-10 border-border border-b px-10 pb-10">
          <div className="mb-6 space-y-2 text-xs leading-relaxed sm:text-sm">
            <h3 className="font-semibold text-foreground text-xs sm:text-sm">
              {t("howToTitle")}
            </h3>
            <ol className="list-decimal space-y-1 pl-5 text-muted-foreground">
              <li>{t("howToStep1")}</li>
              <li>{t("howToStep2")}</li>
              <li>{t("howToStep3")}</li>
              <li>{t("howToStep4")}</li>
            </ol>
          </div>
          <div className="mb-4 space-y-1">
            <h2 className="font-semibold text-foreground text-sm">
              {t("tutorialSectionTitle")}
            </h2>
            <p className="text-muted-foreground text-xs">
              {t("tutorialSectionSubtitle")}
            </p>
          </div>
          <div className="grid gap-4 md:grid-cols-2">
            <Dialog>
              <DialogTrigger asChild>
                <button className="w-full text-left" type="button">
                  <Item className="cursor-pointer" size="sm" variant="outline">
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

            <Dialog>
              <DialogTrigger asChild>
                <button className="w-full text-left" type="button">
                  <Item className="cursor-pointer" size="sm" variant="outline">
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

        {isSignedIn ? <PublicSearchesGrid mode="mine" /> : null}

        <div className="px-10 pb-10">
          <div className="mb-4 border-border border-t pt-6">
            <h2 className="font-semibold text-foreground text-sm">
              {t("usedByTitle")}
            </h2>
          </div>
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
            <a
              className="flex items-center justify-center rounded-md bg-background px-4 py-3 transition-colors hover:bg-muted/40"
              href="https://eur-artec.fr/"
              rel="noreferrer"
              target="_blank"
            >
              <Image
                alt="EUR ArTeC"
                className="h-9 w-full object-contain dark:brightness-0 dark:invert"
                height={36}
                src="https://eur-artec.fr/wp-content/themes/eur-artec/img/logo/main-blue.png"
                unoptimized
                width={200}
              />
            </a>
            <a
              className="flex items-center justify-center rounded-md bg-background px-4 py-3 transition-colors hover:bg-muted/40"
              href="https://www.mshparisnord.fr/"
              rel="noreferrer"
              target="_blank"
            >
              <Image
                alt="MSH Paris Nord"
                className="h-9 w-full object-contain"
                height={36}
                src="https://www.mshparisnord.fr/wp-content/uploads/2025/07/logo-MSH-Paris-Nord-2025.png"
                unoptimized
                width={200}
              />
            </a>
            <a
              className="flex items-center justify-center rounded-md bg-background px-4 py-3 transition-colors hover:bg-muted/40"
              href="https://en.icp.fr/"
              rel="noreferrer"
              target="_blank"
            >
              <Image
                alt="ICP"
                className="h-9 w-full object-contain dark:brightness-0 dark:invert"
                height={36}
                src="https://www.icp.fr/uas/ICP/LOGO_FOOTER/RVB_ICP-Logo-siteicp_500px.png"
                unoptimized
                width={200}
              />
            </a>
          </div>
        </div>
      </div>
    </div>
  );
}
