import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";

function VideoCardSkeleton() {
  return (
    <Card className="flex h-[420px] min-w-0 flex-col gap-0 overflow-hidden py-0">
      {/* thumbnail */}
      <Skeleton className="h-40 w-full shrink-0 rounded-none" />
      <CardContent className="flex min-h-0 flex-1 flex-col gap-2 overflow-hidden p-3">
        {/* title */}
        <Skeleton className="h-4 w-3/4 shrink-0" />
        {/* caption list */}
        <div className="flex min-h-0 flex-1 flex-col gap-1.5 rounded-md border p-2">
          {Array.from({ length: 6 }).map((_, i) => (
            <div className="flex items-center gap-2 px-2 py-1.5" key={i}>
              <Skeleton className="h-3 w-8 shrink-0" />
              <Skeleton className="h-3 w-full" />
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}

function ChatMessageSkeleton({
  from,
  lines = 2,
}: {
  from: "user" | "assistant";
  lines?: number;
}) {
  return (
    <div
      className={`flex flex-col gap-1 ${from === "user" ? "items-end" : "items-start"}`}
    >
      <div
        className={`flex max-w-[80%] flex-col gap-1.5 rounded-lg px-3 py-2 ${
          from === "user" ? "bg-primary/10" : "bg-muted"
        }`}
      >
        {Array.from({ length: lines }).map((_, i) => (
          <Skeleton
            className={`h-3 ${i === lines - 1 ? "w-3/4" : "w-full"}`}
            key={i}
          />
        ))}
      </div>
    </div>
  );
}

export default function SearchPageLoading() {
  return (
    <div className="flex h-full flex-col overflow-hidden">
      {/* Header */}
      <header className="flex shrink-0 items-center justify-between border-b px-4 py-3">
        <div className="flex items-center gap-2">
          <Skeleton className="size-4 rounded" />
          <Skeleton className="h-5 w-40" />
        </div>
        <div className="flex items-center gap-1">
          <Skeleton className="h-8 w-16 rounded-md" />
          <Skeleton className="h-8 w-16 rounded-md" />
          <Skeleton className="h-8 w-16 rounded-md" />
        </div>
      </header>

      <div className="flex h-full min-h-0 flex-1 flex-row gap-4 px-4 py-4">
        {/* Central video grid */}
        <div className="flex min-w-0 flex-1 flex-col overflow-hidden">
          <div className="grid grid-cols-1 items-start gap-4 sm:grid-cols-2 lg:grid-cols-3">
            <VideoCardSkeleton />
            <VideoCardSkeleton />
            <VideoCardSkeleton />
          </div>
        </div>

        {/* Right chat panel */}
        <Card className="flex h-full min-h-0 w-96 shrink-0 flex-col p-0">
          <CardHeader className="border-b py-3">
            <CardTitle>Assistant</CardTitle>
          </CardHeader>

          {/* Messages */}
          <div className="flex min-h-0 flex-1 flex-col gap-3 overflow-hidden p-3">
            <ChatMessageSkeleton from="user" lines={1} />
            <ChatMessageSkeleton from="assistant" lines={3} />
            <ChatMessageSkeleton from="user" lines={1} />
            <ChatMessageSkeleton from="assistant" lines={2} />
          </div>

          {/* Prompt input */}
          <div className="border-t p-3">
            <Skeleton className="mb-2 h-16 w-full rounded-md" />
            <div className="flex items-center justify-between">
              <Skeleton className="h-8 w-28 rounded-md" />
              <Skeleton className="h-8 w-8 rounded-md" />
            </div>
          </div>
        </Card>
      </div>
    </div>
  );
}
