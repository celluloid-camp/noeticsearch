import { StaticPageLayout } from "@/components/static-page-layout";

export default async function AboutPage() {
  return (
    <StaticPageLayout>
      {/* Header */}
      <div className="border-b px-10 py-8">
        <h1 className="font-bold text-3xl tracking-tight sm:text-4xl">About</h1>

        <p className="mt-4 max-w-lg text-muted-foreground text-sm leading-relaxed sm:text-base">
          NoeticSearch is a video transcript search platform. Import PeerTube
          videos, query their subtitles with AI, and find exact quotes across
          your library.
        </p>
      </div>
    </StaticPageLayout>
  );
}
