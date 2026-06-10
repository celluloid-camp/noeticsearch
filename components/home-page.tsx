"use client";

import ReactPlayer from "@celluloid/react-player";
import { PlayCircle } from "lucide-react";
import Image from "next/image";
import { useTranslations } from "next-intl";
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
      <div className="relative z-10 mx-auto min-h-full w-full max-w-4xl border-x bg-background pt-12 pb-8">
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
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
            <a
              className="flex items-center justify-center rounded-md bg-background px-4 py-3 transition-colors hover:bg-muted/40"
              href="https://eur-artec.fr/"
              rel="noreferrer"
              target="_blank"
            >
              <Image
                alt="EUR ArTeC"
                className="h-12 w-auto max-w-full object-contain dark:brightness-0 dark:invert"
                height={48}
                src="/loog-artec.png"
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
                className="h-12 w-auto max-w-full object-contain"
                height={48}
                src="/logo-msh-paris-nord.png"
                width={200}
              />
            </a>
            <a
              className="flex items-center justify-center rounded-md bg-background px-4 py-3 transition-colors hover:bg-muted/40"
              href="https://oscars-project.eu/"
              rel="noreferrer"
              target="_blank"
            >
              <Image
                alt="OSCARS"
                className="h-12 w-auto max-w-full rounded object-contain dark:bg-white dark:p-0.5"
                height={48}
                src="/logo-oscars.jpg"
                width={200}
              />
            </a>
            <a
              className="flex items-center justify-center rounded-md bg-background px-4 py-3 transition-colors hover:bg-muted/40"
              href="https://www.univ-paris8.fr/"
              rel="noreferrer"
              target="_blank"
            >
              <Image
                alt="Université Paris 8"
                className="h-12 w-auto max-w-full object-contain dark:brightness-0 dark:invert"
                height={48}
                src="/logo-paris8.png"
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
                className="h-12 w-auto max-w-full object-contain dark:brightness-0 dark:invert"
                height={48}
                src="/logo-icp.png"
                width={200}
              />
            </a>
            <a
              className="flex items-center justify-center rounded-md bg-background px-4 py-3 transition-colors hover:bg-muted/40"
              href="https://www.univ-lorraine.fr/"
              rel="noreferrer"
              target="_blank"
            >
              <Image
                alt="Université de Lorraine"
                className="h-12 w-auto max-w-full rounded object-contain dark:bg-white/90 dark:p-0.5"
                height={48}
                src="/Logo-ul.png"
                width={200}
              />
            </a>
            <a
              className="flex items-center justify-center rounded-md px-4 py-3 transition-colors hover:bg-muted/40"
              href="https://organoesis.org/"
              rel="noreferrer"
              target="_blank"
            >
              <Image
                alt="Organoesis"
                className="h-12 w-auto max-w-full rounded object-contain dark:bg-white dark:p-0.5"
                height={48}
                src="/logo-organoesis.png"
                width={200}
              />
            </a>
          </div>
          <div className="mt-3 flex justify-center rounded-md bg-background px-4 py-3">
            <Image
              alt="Funded by the European Union"
              className="h-14 w-auto max-w-full object-contain"
              height={56}
              src="/logo-eu_funded_en.png"
              width={300}
            />
          </div>
        </div>
      </div>
    </div>
  );
}
