"use client";

import { Suspense } from "react";
import VideoCatalog from "@/components/video-catalog";
import Loading from "../loading";

export default function MineVideosPage() {
  return (
    <Suspense fallback={<Loading />}>
      <VideoCatalog filter="mine" />
    </Suspense>
  );
}
