"use client";

import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";

export default function ImportLoading() {
  return (
    <div className="flex min-h-full w-full justify-center">
      <div className="grid w-full max-w-5xl gap-6 md:grid-cols-2">
        <Card className="border-none bg-transparent shadow-none ring-0">
          <CardHeader className="space-y-2">
            <Skeleton className="h-6 w-56" />
            <Skeleton className="h-4 w-80 max-w-full" />
          </CardHeader>
          <CardContent className="space-y-3">
            <Skeleton className="h-4 w-24" />
            <Skeleton className="h-28 w-full" />
            <Skeleton className="h-3 w-96 max-w-full" />
          </CardContent>
        </Card>

        <Card className="hidden border-l shadow-none ring-0 md:flex">
          <CardHeader className="space-y-2">
            <Skeleton className="h-6 w-52" />
            <Skeleton className="h-4 w-80 max-w-full" />
          </CardHeader>
          <CardContent className="space-y-2">
            <Skeleton className="h-4 w-full" />
            <Skeleton className="h-4 w-11/12" />
            <Skeleton className="h-4 w-10/12" />
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
