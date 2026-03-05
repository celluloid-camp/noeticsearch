"use client";

import { IconLink, IconSearch, IconUpload } from "@tabler/icons-react";
import { usePathname, useRouter } from "next/navigation";
import { useTranslations } from "next-intl";
import type { ReactNode } from "react";
import { ProtectedRoute } from "@/components/auth/ProtectedRoute";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";

const importOptions = [
  {
    href: "/import/link",
    label: "importFromLink",
    icon: IconLink,
    disabled: false,
  },
  {
    href: "/import/search",
    label: "searchPeertube",
    icon: IconSearch,
    disabled: false,
  },
  {
    href: "/import/upload",
    label: "uploadVideo",
    icon: IconUpload,
    disabled: true,
  },
] as const;

export default function ImportLayout({ children }: { children: ReactNode }) {
  const pathname = usePathname();
  const router = useRouter();
  const t = useTranslations("import");

  const currentTab =
    importOptions.find(({ href, disabled }) => {
      if (disabled) {
        return false;
      }
      if (pathname === "/import") {
        return href === "/import/link";
      }
      return pathname.startsWith(href);
    })?.href ?? "/import/link";

  return (
    <ProtectedRoute>
      <div className="flex min-h-screen w-full justify-center">
        <Card className="w-full ring-0">
          <CardHeader>
            <CardTitle className="font-mono">{t("importVideo")}</CardTitle>
            <CardDescription>{t("importDescription")}</CardDescription>
          </CardHeader>
          <CardContent className="flex h-full flex-col gap-6 border-t p-0 md:flex-row md:items-stretch">
            <aside className="w-full md:w-64 md:self-stretch md:border-border md:border-r">
              <Tabs
                className="w-full"
                onValueChange={(value) => {
                  const opt = importOptions.find(
                    (o) => o.href === value && !o.disabled
                  );
                  if (!opt) {
                    return;
                  }
                  router.push(opt.href);
                }}
                orientation="vertical"
                value={currentTab}
              >
                <TabsList
                  className="flex w-full flex-col items-stretch gap-1 pt-1"
                  variant="line"
                >
                  {importOptions.map(
                    ({ href, icon: Icon, label, disabled }) => {
                      if (disabled) {
                        return (
                          <TabsTrigger
                            className="mt-2 justify-start border-border border-t border-dashed pt-2 text-sm opacity-60"
                            disabled
                            key={href}
                            value={href}
                          >
                            <Icon className="size-4 shrink-0" />
                            <span>{t(label)}</span>
                          </TabsTrigger>
                        );
                      }

                      return (
                        <TabsTrigger
                          className="justify-start gap-2 text-sm"
                          key={href}
                          value={href}
                        >
                          <Icon className="size-4 shrink-0" />
                          <span>{t(label)}</span>
                        </TabsTrigger>
                      );
                    }
                  )}
                </TabsList>
              </Tabs>
            </aside>
            <main className="flex-1">{children}</main>
          </CardContent>
        </Card>
      </div>
    </ProtectedRoute>
  );
}
