import { mistral } from "@ai-sdk/mistral";
import {
	convertToModelMessages,
	stepCountIs,
	streamText,
	type UIMessage,
} from "ai";
import { tools } from "@/lib/ai/tools";

export async function POST(req: Request) {
	const { messages }: { messages: UIMessage[] } = await req.json();

	const result = streamText({
		model: mistral("mistral-small"),
		messages: await convertToModelMessages(messages),
		stopWhen: stepCountIs(5),
		system: `You are a helpful assistant. Check your knowledge base before answering any questions.
    Only respond to questions using information from tool calls.
    if no relevant information is found in the tool calls, respond, "Sorry, I don't know."`,
		tools,
	});

	return result.toUIMessageStreamResponse();
}
