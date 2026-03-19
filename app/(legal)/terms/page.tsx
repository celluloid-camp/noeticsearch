import { StaticPageLayout } from "@/components/static-page-layout";

export default async function TermsPage() {
  return (
    <StaticPageLayout>
      {/* Header */}
      <div className="border-b px-10 py-8">
        <h1 className="font-bold text-3xl tracking-tight sm:text-4xl">
          Terms of Service
        </h1>

        <p className="mt-4 max-w-lg text-muted-foreground text-sm leading-relaxed sm:text-base">
          This privacy policy explains how we collect, use, and protect your
          personal information when you use our video transcript search
          platform.
        </p>
      </div>
    </StaticPageLayout>
  );
}
