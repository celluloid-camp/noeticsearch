"use client";

import { Suspense } from "react";
import VideoCatalog from "@/components/video-catalog";
import Loading from "../loading";

export default function PublicVideosPage() {
  return (
    <div className="container mx-auto px-4">
      <Suspense fallback={<Loading />}>
        <VideoCatalog filter="public" />
      </Suspense>
    </div>
  );
}
