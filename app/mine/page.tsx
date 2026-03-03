"use client";

import { Suspense } from "react";
import VideoCatalog from "@/components/video-catalog";
import Loading from "../loading";

export default function MineVideosPage() {
  return (
    <div className="container mx-auto px-4">
      <Suspense fallback={<Loading />}>
        <VideoCatalog filter="mine" />
      </Suspense>
    </div>
  );
}
