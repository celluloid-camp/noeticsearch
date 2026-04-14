import Link from "next/link";
import { getTranslations } from "next-intl/server";
import { StaticPageLayout } from "@/components/static-page-layout";

export default async function AboutPage() {
  const t = await getTranslations("aboutLegal");

  return (
    <StaticPageLayout>
      {/* Header */}
      <div className="border-b px-10 py-8">
        <h1 className="font-bold text-3xl tracking-tight sm:text-4xl">
          {t("title")}
        </h1>
      </div>
      <div className="px-10 py-8">
        <p>
          {t.rich("paragraph1", {
            artec: (chunks) => (
              <Link
                className="underline"
                href="https://www.univ-paris8.fr/eur-artec"
                rel="noreferrer"
                target="_blank"
              >
                {chunks}
              </Link>
            ),
            oasis: (chunks) => (
              <Link
                className="underline"
                href="https://oscars-project.eu/projects/oasis-open-audiovisual-science-innovation-scheme"
                rel="noreferrer"
                target="_blank"
              >
                {chunks}
              </Link>
            ),
          })}
        </p>
        <br />
        <p>
          {t.rich("paragraph2", {
            younes: (chunks) => (
              <Link
                className="underline"
                href="https://www.linkedin.com/in/younes0x53/"
                rel="noreferrer"
                target="_blank"
              >
                {chunks}
              </Link>
            ),
            github: (chunks) => (
              <Link
                className="underline"
                href="https://github.com/celluloid-camp/"
                rel="noreferrer"
                target="_blank"
              >
                {chunks}
              </Link>
            ),
          })}
        </p>

        <p>{t("paragraph3")}</p>
      </div>
    </StaticPageLayout>
  );
}
