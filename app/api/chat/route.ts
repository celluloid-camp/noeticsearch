import { mistral } from "@ai-sdk/mistral";
import {
	convertToModelMessages,
	createIdGenerator,
	generateId,
	stepCountIs,
	streamText,
	type UIMessage,
	validateUIMessages,
} from "ai";
import { after } from "next/server";
import { createResumableStreamContext } from "resumable-stream";
import { loadSearchHistory, saveSearchHistory } from "@/lib/ai/search";
import { saveChat } from "@/lib/ai/store";
import { tools } from "@/lib/ai/tools";
import { auth } from "@/lib/auth";

export async function POST(req: Request) {
	const { message, id }: { message: UIMessage; id: string } = await req.json();

	console.log("chatId", id);
	const session = await auth.api.getSession({
		headers: req.headers,
	});
	const userId = session?.user?.id;
	if (!userId) {
		return new Response("Unauthorized", { status: 401 });
	}
	if (!id) {
		return new Response("No search ID provided", { status: 400 });
	}

	const { messages: previousMessages } = await loadSearchHistory(id);

	const validatedMessages = await validateUIMessages({
		// append the new message to the previous messages:
		messages: [...previousMessages, message],
	});

	await saveChat(id, { activeStreamId: null });

	const result = streamText({
		model: mistral("mistral-small"),
		messages: await convertToModelMessages(validatedMessages),
		stopWhen: stepCountIs(5),
		system: `You are a helpful assistant. Check your knowledge base before answering any questions.
    Only respond to questions using information from tool calls.

    CRITICAL: When you call tools that return results (like findVideos), the results are automatically displayed in the UI.
    Do NOT repeat, summarize, list, or create links to these results in your text response.
    The tool output is already visible to the user. Your text response should only:
    - Briefly acknowledge that you found results
    - Provide additional context or guidance if relevant
    - Answer follow-up questions

		Always combine the previous tool results with the new tool results unless requested to do otherwise.

    Never duplicate information that is already shown in the tool UI output.`,
		tools,
	});

	return result.toUIMessageStreamResponse({
		originalMessages: validatedMessages,
		generateMessageId: createIdGenerator({
			prefix: "msg",
			size: 16,
		}),
		onFinish: async ({ messages }) => {
			console.log("onFinish", id, messages);
			await saveSearchHistory({ id: id, messages });
			await saveChat(id, { activeStreamId: null });
		},
		async consumeSseStream({ stream }) {
			const streamId = generateId();

			// Create a resumable stream from the SSE stream
			const streamContext = createResumableStreamContext({ waitUntil: after });
			await streamContext.createNewResumableStream(streamId, () => stream);

			await saveChat(id, { activeStreamId: streamId });
		},
	});
}
