"use client";

import { Suspense } from "react";
import VideoCatalog from "@/components/video-catalog";
import Loading from "../loading";

export default function PublicVideosPage() {
  return (
    <Suspense fallback={<Loading />}>
      <VideoCatalog filter="public" title="Public Videos" />
    </Suspense>
  );
}
