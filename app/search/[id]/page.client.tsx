"use client";

import { type UIMessage, useChat } from "@ai-sdk/react";
import { DefaultChatTransport } from "ai";
import { CopyIcon, Loader2, RefreshCcwIcon } from "lucide-react";
import Image from "next/image";
import Link from "next/link";
import { Fragment, useMemo, useState } from "react";
import {
	Conversation,
	ConversationContent,
	ConversationScrollButton,
} from "@/components/ai-elements/conversation";
import {
	Message,
	MessageAction,
	MessageActions,
	MessageContent,
	MessageResponse,
} from "@/components/ai-elements/message";
import {
	PromptInput,
	PromptInputActionAddAttachments,
	PromptInputActionMenu,
	PromptInputActionMenuContent,
	PromptInputActionMenuTrigger,
	PromptInputBody,
	PromptInputFooter,
	type PromptInputMessage,
	PromptInputSubmit,
	PromptInputTextarea,
	PromptInputTools,
} from "@/components/ai-elements/prompt-input";
import {
	Carousel,
	CarouselContent,
	CarouselItem,
	CarouselNext,
	CarouselPrevious,
} from "@/components/ui/carousel";
import { Card, CardContent } from "@/components/ui/card";

type VideoItem = {
	id: number | string;
	title: string;
	url: string;
	thumbnail?: string | null;
	createdAt?: Date | string;
	isPublic?: boolean;
};

export function SearchChat({
	id,
	initialMessages,
}: {
	id: string;
	initialMessages: UIMessage[];
}) {
	const [input, setInput] = useState("");
	const { messages, sendMessage, status, regenerate } = useChat({
		id,
		messages: initialMessages,
		resume: true,
		transport: new DefaultChatTransport({
			api: "/api/chat",
			// only send the last message to the server:
			prepareSendMessagesRequest({ messages, id }) {
				return { body: { message: messages[messages.length - 1], id } };
			},
		}),
	});

	// Extract found videos from the last tool-findVideos result only
	const foundVideos = useMemo(() => {
		let lastOutput: VideoItem[] = [];
		for (let i = messages.length - 1; i >= 0; i--) {
			const message = messages[i];
			for (let j = message.parts.length - 1; j >= 0; j--) {
				const part = message.parts[j];
				if (
					part.type === "tool-findVideos" &&
					part.state === "output-available"
				) {
					lastOutput = Array.isArray(part.output) ? (part.output as VideoItem[]) : [];
					return lastOutput;
				}
			}
		}
		return lastOutput;
	}, [messages]);

	const handleSubmit = (message: PromptInputMessage) => {
		const hasText = Boolean(message.text);

		if (!hasText) {
			return;
		}

		sendMessage({ text: message.text });
		setInput("");
	};

	return (
		<div className="flex h-full gap-4 p-4 overflow-hidden">
			{/* Central Video Grid */}
			<div className="flex-1 flex flex-col min-w-0 overflow-hidden">
				<div className="flex-1 overflow-auto">
					{foundVideos.length > 0 ? (
						<div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4 p-4">
							{foundVideos.map((video) => {
								const videoId = video.id?.toString() || "";
								const thumbnail = video.thumbnail || "/placeholder.svg";
								const title = video.title || "Untitled";
								const createdAt = video.createdAt
									? new Date(video.createdAt).toLocaleDateString()
									: "";

								return (
									<Link key={videoId} href={`/video/${videoId}`}>
										<Card className="overflow-hidden cursor-pointer hover:shadow-lg transition-shadow">
											<div className="relative aspect-video w-full bg-muted">
												{thumbnail && thumbnail !== "/placeholder.svg" ? (
													<Image
														src={thumbnail}
														alt={title}
														fill
														className="object-cover"
														sizes="(max-width: 640px) 100vw, (max-width: 768px) 50vw, (max-width: 1024px) 33vw, 25vw"
													/>
												) : (
													<div className="flex items-center justify-center h-full text-muted-foreground">
														<Loader2 className="w-8 h-8 animate-spin" />
													</div>
												)}
											</div>
											<CardContent className="p-4">
												<h3 className="font-semibold text-sm line-clamp-2 mb-1">
													{title}
												</h3>
												{createdAt && (
													<p className="text-xs text-muted-foreground">
														{createdAt}
													</p>
												)}
											</CardContent>
										</Card>
									</Link>
								);
							})}
						</div>
					) : (
						<div className="flex items-center justify-center h-full">
							<p className="text-muted-foreground">
								Search for videos to see results here
							</p>
						</div>
					)}
				</div>
			</div>

			{/* Right Side Chat */}
			<div className="w-96 shrink-0 flex flex-col border rounded-lg overflow-hidden h-full">
				<Conversation>
					<ConversationContent>
						{messages.map((message, messageIndex) => (
							<Fragment key={message.id}>
								{message.parts.map((part, i) => {
									switch (part.type) {
										case "tool-findVideos":
											switch (part.state) {
												case "input-available":
													return (
														<div
															key={`${message.id}-${i}`}
															className="text-sm text-muted-foreground"
														>
															Searching for videos...
														</div>
													);
												case "output-available": {
													const videoArray = (Array.isArray(part.output)
														? part.output
														: []) as VideoItem[];
													return (
														<div
															key={`${message.id}-${i}`}
															className="w-full -mx-2"
														>
															<Carousel
																opts={{
																	align: "start",
																	loop: false,
																	dragFree: true,
																}}
																className="w-full"
															>
																<CarouselContent className="-ml-2">
																	{videoArray.map((video) => {
																		const videoId = video.id?.toString() || "";
																		const thumbnail =
																			video.thumbnail || "/placeholder.svg";
																		const title = video.title || "Untitled";
																		return (
																			<CarouselItem
																				key={videoId}
																				className="pl-2 basis-[85%] sm:basis-[70%] md:basis-[55%]"
																			>
																				<Link href={`/video/${videoId}`}>
																					<Card className="overflow-hidden border transition-shadow hover:shadow-md">
																						<div className="relative aspect-video w-full bg-muted">
																							{thumbnail &&
																							thumbnail !== "/placeholder.svg" ? (
																								<Image
																									src={thumbnail}
																									alt={title}
																									fill
																									className="object-cover"
																									sizes="(max-width: 640px) 85vw, 70vw, 55vw"
																								/>
																							) : (
																								<div className="flex items-center justify-center h-full text-muted-foreground">
																									<Loader2 className="w-6 h-6 animate-spin" />
																								</div>
																							)}
																						</div>
																						<CardContent className="p-2">
																							<p className="font-medium text-xs line-clamp-2">
																								{title}
																							</p>
																						</CardContent>
																					</Card>
																				</Link>
																			</CarouselItem>
																		);
																	})}
																</CarouselContent>
																{videoArray.length > 1 && (
																	<>
																		<CarouselPrevious className="-left-2 size-6" />
																		<CarouselNext className="-right-2 size-6" />
																	</>
																)}
															</Carousel>
														</div>
													);
												}
												case "output-error":
													return (
														<div
															key={`${message.id}-${i}`}
															className="text-sm text-destructive"
														>
															Error: {part.errorText}
														</div>
													);
												default:
													return null;
											}
										case "text": {
											const isLastMessage =
												messageIndex === messages.length - 1;

											return (
												<Fragment key={`${message.id}-${i}`}>
													<Message from={message.role}>
														<MessageContent>
															<MessageResponse>{part.text}</MessageResponse>
														</MessageContent>
													</Message>
													{message.role === "assistant" && isLastMessage && (
														<MessageActions>
															<MessageAction
																onClick={() => regenerate()}
																label="Retry"
															>
																<RefreshCcwIcon className="size-3" />
															</MessageAction>
															<MessageAction
																onClick={() =>
																	navigator.clipboard.writeText(part.text)
																}
																label="Copy"
															>
																<CopyIcon className="size-3" />
															</MessageAction>
														</MessageActions>
													)}
												</Fragment>
											);
										}
										default:
											return null;
									}
								})}
							</Fragment>
						))}
					</ConversationContent>
					<ConversationScrollButton />
				</Conversation>

				<PromptInput
					onSubmit={handleSubmit}
					className="mt-4 border-t"
					globalDrop
					multiple
				>
					<PromptInputBody>
						<PromptInputTextarea
							onChange={(e) => setInput(e.target.value)}
							value={input}
						/>
					</PromptInputBody>
					<PromptInputFooter>
						<PromptInputTools>
							<PromptInputActionMenu>
								<PromptInputActionMenuTrigger />
								<PromptInputActionMenuContent>
									<PromptInputActionAddAttachments />
								</PromptInputActionMenuContent>
							</PromptInputActionMenu>
						</PromptInputTools>
						<PromptInputSubmit disabled={!input && !status} status={status} />
					</PromptInputFooter>
				</PromptInput>
			</div>
		</div>
	);
}
