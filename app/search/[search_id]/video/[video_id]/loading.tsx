import {
  Card,
  CardContent,
  CardFooter,
  CardHeader,
} from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";

function VideoPlayerSkeleton() {
  return (
    <div className="flex h-full flex-1 flex-col gap-2">
      {/* Video area */}
      <Skeleton className="aspect-video w-full rounded-none" />
      {/* Progress bar */}
      <Skeleton className="mx-2 h-1.5 rounded-full" />
      {/* Controls */}
      <div className="flex items-center gap-3 px-3 pb-2">
        <Skeleton className="size-8 rounded-full" />
        <Skeleton className="size-8 rounded-full" />
        <Skeleton className="h-3 w-20" />
        <div className="ml-auto flex items-center gap-2">
          <Skeleton className="size-8 rounded-full" />
          <Skeleton className="size-8 rounded-full" />
        </div>
      </div>
    </div>
  );
}

function SearchInfoPanelSkeleton() {
  return (
    <Card className="shrink-0">
      <CardHeader className="flex flex-row items-center justify-between gap-2 py-3">
        <Skeleton className="h-8 w-40 rounded-md" />
        <Skeleton className="size-8 rounded-md" />
      </CardHeader>
      <CardContent>
        <div className="flex gap-2">
          {Array.from({ length: 3 }).map((_, i) => (
            <div
              className="flex w-36 shrink-0 flex-col gap-1 overflow-hidden rounded-md border"
              key={i}
            >
              <Skeleton className="aspect-video w-full rounded-none" />
              <Skeleton className="mx-1.5 mb-1.5 h-3 w-3/4" />
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}

function CaptionsPanelSkeleton() {
  return (
    <Card className="flex h-full flex-col gap-0 py-0">
      {/* Header */}
      <CardHeader className="border-b px-4 py-4">
        <Skeleton className="h-4 w-24" />
      </CardHeader>
      {/* Search toolbar */}
      <div className="flex items-center gap-2 border-b px-2 py-1.5">
        <Skeleton className="h-8 flex-1 rounded-md" />
        <Skeleton className="h-8 w-14 rounded-md" />
        <Skeleton className="h-8 w-14 rounded-md" />
      </div>
      {/* Caption rows */}
      <div className="flex-1 space-y-0 overflow-hidden p-2">
        {Array.from({ length: 12 }).map((_, i) => (
          <div className="flex items-start gap-2 px-2 py-1.5" key={i}>
            <Skeleton className="mt-0.5 h-3 w-10 shrink-0" />
            <Skeleton className={`h-3 ${i % 3 === 2 ? "w-3/5" : "w-full"}`} />
          </div>
        ))}
      </div>
      {/* Footer */}
      <CardFooter className="flex items-center justify-end border-t px-4 py-3">
        <div className="flex items-center gap-2">
          <Skeleton className="h-3 w-16" />
          <Skeleton className="h-5 w-9 rounded-full" />
        </div>
      </CardFooter>
    </Card>
  );
}

export default function SearchVideoPageLoading() {
  return (
    <div className="mt-2 flex h-full overflow-hidden">
      {/* Left: video player */}
      <VideoPlayerSkeleton />

      {/* Right: info panel + transcript */}
      <div className="mx-4 my-4 flex w-96 shrink-0 flex-col space-y-4">
        <SearchInfoPanelSkeleton />
        <CaptionsPanelSkeleton />
      </div>
    </div>
  );
}
