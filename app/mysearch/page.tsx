"use client";

import { Suspense } from "react";
import { ProtectedRoute } from "@/components/auth/ProtectedRoute";
import { MySearchesCatalog } from "@/components/my-searches-catalog";
import Loading from "./loading";

export default function MySearchPage() {
  return (
    <ProtectedRoute>
      <Suspense fallback={<Loading />}>
        <MySearchesCatalog />
      </Suspense>
    </ProtectedRoute>
  );
}
