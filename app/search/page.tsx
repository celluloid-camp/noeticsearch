"use client";

import { useChat } from "@ai-sdk/react";
import { zodResolver } from "@hookform/resolvers/zod";
import { IconCornerDownLeft, IconSearch } from "@tabler/icons-react";
import { useMutation, useQuery } from "@tanstack/react-query";
import { DefaultChatTransport } from "ai";
import { Globe, ListFilter, User, Video } from "lucide-react";
import { useRouter } from "next/navigation";
import { useTranslations } from "next-intl";
import { useState } from "react";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { ProtectedRoute } from "@/components/auth/ProtectedRoute";
import { SelectVideosDialog } from "@/components/select-videos-dialog";
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormMessage,
} from "@/components/ui/form";
import { GridPattern } from "@/components/ui/grid-pattern";
import { InputGroup, InputGroupTextarea } from "@/components/ui/input-group";
import { Switch } from "@/components/ui/switch";
import { useTRPC } from "@/lib/trpc/client";

const searchSchema = z
  .object({
    query: z.string().min(1),
    isPublic: z.boolean(),
    filterType: z.enum(["all", "public", "mine", "custom"]),
    videoIds: z.array(z.string()),
  })
  .refine((data) => data.filterType !== "custom" || data.videoIds.length > 0, {
    message: "selectVideo",
    path: ["videoIds"],
  });

type SearchSchema = z.infer<typeof searchSchema>;

export default function SearchPage() {
  const router = useRouter();
  const api = useTRPC();
  const t = useTranslations("search");

  const form = useForm<SearchSchema>({
    resolver: zodResolver(searchSchema),
    defaultValues: {
      query: "",
      isPublic: false,
      filterType: "all",
      videoIds: [],
    },
  });

  const [customVideoDialogOpen, setCustomVideoDialogOpen] = useState(false);
  const filterType = form.watch("filterType");
  const { data: videosData } = useQuery({
    ...api.video.getAll.queryOptions({ filter: "all" }),
    enabled: filterType === "custom",
  });
  const videos = videosData?.videos ?? [];

  const { mutateAsync: createSearch, isPending: isLoading } = useMutation(
    api.search.create.mutationOptions()
  );

  const { sendMessage, id: chatId } = useChat({
    resume: true,
    transport: new DefaultChatTransport({
      api: "/api/chat",
      // only send the last message to the server:
      prepareSendMessagesRequest({ messages, id }) {
        return { body: { message: messages.at(-1), id } };
      },
    }),
  });

  const onSubmit = async (data: SearchSchema) => {
    const query = data.query.trim();
    if (!query) {
      return;
    }

    const { id } = await createSearch({
      id: chatId,
      isPublic: data.isPublic,
      filterType: data.filterType,
      videoIds:
        data.filterType === "custom" && data.videoIds.length > 0
          ? data.videoIds
          : [],
    });

    sendMessage(
      { text: query },
      {
        body: {
          id,
        },
      }
    );
    router.push(`/search/${id}`);
  };

  const queryValue = form.watch("query");
  const videoIds = form.watch("videoIds");
  const isCustomWithoutVideos =
    filterType === "custom" && videoIds.length === 0;
  const isSubmitDisabled =
    !queryValue.trim() || isLoading || isCustomWithoutVideos;

  return (
    <ProtectedRoute>
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
            <Form {...form}>
              <form
                className="w-full space-y-4"
                onSubmit={form.handleSubmit(onSubmit)}
              >
                <Card className="w-full bg-background">
                  <CardHeader className="border-b pb-4">
                    <CardTitle className="flex items-center gap-2">
                      <IconSearch className="size-4" /> {t("newSearch")}
                    </CardTitle>
                    <CardDescription>{t("hint")}</CardDescription>
                  </CardHeader>
                  <CardContent className="flex flex-col gap-4">
                    {/* Search Input Form */}
                    <FormField
                      control={form.control}
                      name="query"
                      render={({ field }) => (
                        <FormItem>
                          <FormControl>
                            <InputGroup>
                              <InputGroupTextarea
                                className="min-h-[140px] resize-none py-3 text-sm"
                                disabled={isLoading}
                                placeholder={t("hint")}
                                {...field}
                              />
                            </InputGroup>
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </CardContent>
                  <CardFooter className="flex flex-col gap-3 border-t pt-3">
                    <div className="flex w-full items-center justify-between gap-3">
                      <div className="flex items-center gap-2">
                        <span className="text-muted-foreground text-xs">
                          {t("searchIn")}
                        </span>
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <button
                              className="inline-flex items-center gap-2 rounded-md border bg-secondary px-2 py-1 text-xs"
                              type="button"
                            >
                              {(() => {
                                const FILTER_OPTIONS = [
                                  {
                                    value: "all",
                                    label: t("filterAll"),
                                    icon: Video,
                                  },
                                  {
                                    value: "public",
                                    label: t("filterPublic"),
                                    icon: Globe,
                                  },
                                  {
                                    value: "mine",
                                    label: t("filterMine"),
                                    icon: User,
                                  },
                                  {
                                    value: "custom",
                                    label: t("filterCustom"),
                                    icon: ListFilter,
                                  },
                                ] as const;
                                const current =
                                  FILTER_OPTIONS.find(
                                    (opt) => opt.value === filterType
                                  ) ?? FILTER_OPTIONS[0];
                                const Icon = current.icon;
                                return (
                                  <>
                                    <Icon className="size-4 shrink-0" />
                                    <span>{current.label}</span>
                                  </>
                                );
                              })()}
                            </button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="start">
                            {(() => {
                              const FILTER_OPTIONS = [
                                {
                                  value: "all",
                                  label: t("filterAll"),
                                  icon: Video,
                                },
                                {
                                  value: "public",
                                  label: t("filterPublic"),
                                  icon: Globe,
                                },
                                {
                                  value: "mine",
                                  label: t("filterMine"),
                                  icon: User,
                                },
                                {
                                  value: "custom",
                                  label: t("filterCustom"),
                                  icon: ListFilter,
                                },
                              ] as const;
                              return FILTER_OPTIONS.map((opt) => {
                                const Icon = opt.icon;
                                const isActive = filterType === opt.value;
                                return (
                                  <DropdownMenuItem
                                    key={opt.value}
                                    onSelect={() => {
                                      form.setValue("filterType", opt.value);
                                      if (opt.value !== "custom") {
                                        form.setValue("videoIds", []);
                                      }
                                    }}
                                  >
                                    <Icon className="size-4 shrink-0" />
                                    <span>{opt.label}</span>
                                    {isActive ? (
                                      <span className="ml-auto text-muted-foreground text-xs">
                                        {t("filterCurrent")}
                                      </span>
                                    ) : null}
                                  </DropdownMenuItem>
                                );
                              });
                            })()}
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </div>
                      <div className="flex items-center gap-2">
                        <span className="text-[0.7rem] text-muted-foreground">
                          {t("publicField")}
                        </span>
                        <Switch
                          checked={form.watch("isPublic")}
                          onCheckedChange={(value) =>
                            form.setValue("isPublic", value)
                          }
                        />
                        <button
                          aria-label="Send search"
                          className="inline-flex items-center gap-1 rounded-md bg-primary px-3 py-1 font-medium text-primary-foreground text-xs disabled:opacity-50"
                          disabled={isSubmitDisabled}
                          type="submit"
                        >
                          {t("searchButton")}{" "}
                          <IconCornerDownLeft className="size-3.5" />
                        </button>
                      </div>
                    </div>
                    {filterType === "custom" && (
                      <div className="flex w-full flex-col gap-2">
                        <FormField
                          control={form.control}
                          name="videoIds"
                          render={({ field: videosField }) => (
                            <>
                              <SelectVideosDialog
                                onOpenChange={setCustomVideoDialogOpen}
                                onSelectionChange={videosField.onChange}
                                open={customVideoDialogOpen}
                                selectedIds={videosField.value}
                                videos={videos}
                              />
                              <FormMessage />
                            </>
                          )}
                        />
                      </div>
                    )}
                  </CardFooter>
                </Card>
              </form>
            </Form>
          </div>
        </div>
      </div>
    </ProtectedRoute>
  );
}
