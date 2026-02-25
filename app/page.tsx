"use client";

import { Suspense } from "react";
import VideoCatalog from "@/components/video-catalog";
import Loading from "./loading";

export default function Home() {
  return (
    <div className="container mx-auto px-4 py-10">
      <Suspense fallback={<Loading />}>
        <VideoCatalog filter="all" />
      </Suspense>
    </div>
  );
}
