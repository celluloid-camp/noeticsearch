"use client";

import { AuthQueryProvider } from "@daveyplate/better-auth-tanstack";
import type { ReactNode } from "react";

export function AuthProvider({ children }: { children: ReactNode }) {
  return (
    <AuthQueryProvider optimistic={true} refetchOnMutate={true}>
      {children}
    </AuthQueryProvider>
  );
}
