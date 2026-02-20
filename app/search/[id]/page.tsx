"use client";

import { useChat } from "@ai-sdk/react";
import { CopyIcon, RefreshCcwIcon } from "lucide-react";
import { Fragment, useState } from "react";
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
	type FindVideosUIToolOutput,
	SearchVideo,
	type SearchVideoProps,
} from "@/components/search";

export default function SearchPage() {
	const [input, setInput] = useState("");
	const { messages, sendMessage, status, regenerate } = useChat();

	const handleSubmit = (message: PromptInputMessage) => {
		const hasText = Boolean(message.text);

		if (!hasText) {
			return;
		}

		sendMessage({ text: message.text });
		setInput("");
	};

	return (
		<div className="max-w-4xl mx-auto p-6 relative size-full rounded-lg border h-[600px]">
			<div className="flex flex-col h-full">
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
														<div key={`${message.id}-${i}`}>
															Searching for videos...
														</div>
													);
												case "output-available":
													return (
														<div key={`${message.id}-${i}`}>
															<SearchVideo
																videos={part.output as FindVideosUIToolOutput}
															/>
														</div>
													);
												case "output-error":
													return (
														<div key={`${message.id}-${i}`}>
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
					className="mt-4"
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
