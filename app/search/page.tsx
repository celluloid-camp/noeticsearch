"use client";

import { useChat } from "@ai-sdk/react";
import { zodResolver } from "@hookform/resolvers/zod";
import { IconCornerDownLeft } from "@tabler/icons-react";
import { useMutation, useQuery } from "@tanstack/react-query";
import { DefaultChatTransport } from "ai";
import { Globe, ListFilter, User, Video } from "lucide-react";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { ProtectedRoute } from "@/components/auth/ProtectedRoute";
import { SelectVideosDialog } from "@/components/select-videos-dialog";
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
import {
  InputGroup,
  InputGroupAddon,
  InputGroupButton,
  InputGroupText,
  InputGroupTextarea,
} from "@/components/ui/input-group";
import { Switch } from "@/components/ui/switch";
import { useTRPC } from "@/lib/trpc/client";

const FILTER_OPTIONS = [
  { value: "all", label: "All videos", icon: Video },
  { value: "public", label: "Public videos", icon: Globe },
  { value: "mine", label: "My videos", icon: User },
  { value: "custom", label: "Custom", icon: ListFilter },
] as const;

const searchSchema = z
  .object({
    query: z.string().min(1, "Search query is required"),
    isPublic: z.boolean(),
    filterType: z.enum(["all", "public", "mine", "custom"]),
    videoIds: z.array(z.number()),
  })
  .refine((data) => data.filterType !== "custom" || data.videoIds.length > 0, {
    message: "Please select at least one video",
    path: ["videoIds"],
  });

type SearchSchema = z.infer<typeof searchSchema>;

export default function SearchPage() {
  const router = useRouter();
  const api = useTRPC();

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
          : undefined,
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
      <div className="flex h-full w-full items-center justify-center">
        <div className="flex w-full max-w-2xl flex-col items-center gap-6">
          <Form {...form}>
            <form
              className="w-full space-y-4"
              onSubmit={form.handleSubmit(onSubmit)}
            >
              {/* Search Input Form */}
              <FormField
                control={form.control}
                name="query"
                render={({ field }) => (
                  <FormItem>
                    <FormControl>
                      <InputGroup>
                        <InputGroupAddon
                          align="block-start"
                          className="border-b"
                        >
                          <InputGroupText className="font-semibold text-md">
                            New search
                          </InputGroupText>
                          <FormField
                            control={form.control}
                            name="isPublic"
                            render={({ field: isPublicField }) => (
                              <div className="ml-auto flex items-center gap-2">
                                <span className="text-[0.7rem] text-muted-foreground">
                                  Public visibility
                                </span>
                                <Switch
                                  checked={isPublicField.value}
                                  onCheckedChange={isPublicField.onChange}
                                />
                              </div>
                            )}
                          />
                        </InputGroupAddon>
                        <InputGroupTextarea
                          className="min-h-[140px] resize-none py-3 text-sm"
                          disabled={isLoading}
                          placeholder="Ask me to find words or phrases in your video subtitles, like 'find videos with philosophy' or 'search for the word philosophy'."
                          {...field}
                        />
                        <InputGroupAddon
                          align="block-end"
                          className="gap-2 border-t"
                        >
                          <InputGroupText className="text-xs">
                            Search in
                          </InputGroupText>
                          <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                              <InputGroupButton
                                aria-label="Change search scope"
                                size="sm"
                                type="button"
                                variant="secondary"
                              >
                                {(() => {
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
                              </InputGroupButton>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align="start">
                              {FILTER_OPTIONS.map((opt) => {
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
                                        Current
                                      </span>
                                    ) : null}
                                  </DropdownMenuItem>
                                );
                              })}
                            </DropdownMenuContent>
                          </DropdownMenu>
                          <InputGroupButton
                            aria-label="Send search"
                            className="ml-auto"
                            disabled={isSubmitDisabled}
                            size="sm"
                            type="submit"
                            variant="default"
                          >
                            Search <IconCornerDownLeft />
                          </InputGroupButton>
                        </InputGroupAddon>
                        {filterType === "custom" && (
                          <InputGroupAddon
                            align="block-end"
                            className="flex-col items-stretch gap-2 border-t"
                          >
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
                          </InputGroupAddon>
                        )}
                      </InputGroup>
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </form>
          </Form>
        </div>
      </div>
    </ProtectedRoute>
  );
}
