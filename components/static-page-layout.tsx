import { GridPattern } from "@/components/ui/grid-pattern";

export function StaticPageLayout({ children }: { children: React.ReactNode }) {
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
      <div className="relative z-10 mx-auto min-h-full w-full max-w-4xl border-x bg-background">
        {children}
      </div>
    </div>
  );
}
