"use client";

import { Suspense } from "react";
import VideoCatalog from "@/components/video-catalog";
import Loading from "../loading";

export default function AllVideosPage() {
  return (
    <Suspense fallback={<Loading />}>
      <VideoCatalog filter="all" title="All Videos" />
    </Suspense>
  );
}
