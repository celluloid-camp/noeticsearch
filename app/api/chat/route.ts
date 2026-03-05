import { mistral } from "@ai-sdk/mistral";
import {
  createAgentUIStreamResponse,
  createIdGenerator,
  generateId,
  ToolLoopAgent,
  type UIMessage,
  validateUIMessages,
} from "ai";
import { after } from "next/server";
import { createResumableStreamContext } from "resumable-stream";
import { z } from "zod";
import { searchPrompt } from "@/lib/ai/prompts";
import { loadSearchHistory, saveSearchHistory } from "@/lib/ai/search";
import { saveChat } from "@/lib/ai/store";
import { searchVideoTool, setSearchTitle } from "@/lib/ai/tools";
import { auth } from "@/lib/auth";

export async function POST(req: Request) {
  const {
    message,
    id,
  }: {
    message: UIMessage;
    id: string;
  } = await req.json();

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

  const {
    messages: previousMessages,
    title,
    filterType,
    videoIds,
  } = await loadSearchHistory(id);

  const validatedMessages = await validateUIMessages({
    // append the new message to the previous messages:
    messages: [...previousMessages, message],
  });

  await saveChat(id, { activeStreamId: null });

  const searchAgent = new ToolLoopAgent({
    model: mistral("mistral-small"),
    callOptionsSchema: z.object({
      userId: z.string(),
      searchId: z.string(),
      title: z.string().nullable().optional(),
      language: z.string().default("fr"),
      filter: z.enum(["public", "mine", "custom"]),
      videoIds: z.array(z.string()).default([]),
    }),
    instructions: searchPrompt,
    tools: {
      search_video: searchVideoTool({
        filter: filterType,
        videoIds,
        userId,
      }),
      setSearchTitle,
    },
    prepareCall: ({ options, ...settings }) => ({
      ...settings,
      instructions:
        settings.instructions +
        `\nContexte utilisateur :
	- User ID: ${options.userId}
	- Search ID: ${options.searchId}
	- Langue de réponse : français (obligatoire)
  - Titre de la recherche : ${options.title ?? "null"}

    Important : Si le titre de la recherche est null, utilise l'outil setSearchTitle pour le suggérer.
`,
    }),
  });

  return createAgentUIStreamResponse({
    agent: searchAgent,
    uiMessages: validatedMessages,
    options: {
      userId,
      searchId: id,
      title,
      language: "fr",
      filter: "public",
      videoIds: [],
    },
    generateMessageId: createIdGenerator({
      prefix: "msg",
      size: 16,
    }),
    onFinish: async ({ messages }) => {
      await saveSearchHistory({ id, messages });
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
