"use client";

import { Card, CardContent, CardFooter, CardHeader } from "@/components/ui/card";
import { GridPattern } from "@/components/ui/grid-pattern";
import { Skeleton } from "@/components/ui/skeleton";

export default function SearchLoading() {
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
      <div className="relative z-10 flex h-full w-full items-center justify-center">
        <div className="flex w-full max-w-2xl flex-col gap-6">
          <Card className="w-full bg-background">
            <CardHeader className="space-y-2 border-b pb-4">
              <Skeleton className="h-6 w-40" />
              <Skeleton className="h-4 w-80 max-w-full" />
            </CardHeader>
            <CardContent className="flex flex-col gap-4">
              <Skeleton className="min-h-[140px] w-full" />
            </CardContent>
            <CardFooter className="flex flex-col gap-3 border-t pt-3">
              <div className="flex w-full items-center justify-between gap-3">
                <div className="flex items-center gap-2">
                  <Skeleton className="h-4 w-16" />
                  <Skeleton className="h-7 w-28" />
                </div>
                <div className="flex items-center gap-2">
                  <Skeleton className="h-4 w-20" />
                  <Skeleton className="h-5 w-9 rounded-full" />
                  <Skeleton className="h-7 w-24" />
                </div>
              </div>
            </CardFooter>
          </Card>
        </div>
      </div>
    </div>
  );
}
