import Redis from "ioredis";
import { env } from "@/env";

const CHAT_KEY_PREFIX = "search:chat:";
const CHAT_TTL_SECONDS = 60 * 60 * 24 * 7; // 7 days

let redisClient: Redis | null = null;

function getRedis(): Redis | null {
	if (!env.REDIS_URL) return null;
	if (!redisClient) {
		redisClient = new Redis(env.REDIS_URL, {
			maxRetriesPerRequest: 3,
			enableReadyCheck: true,
			lazyConnect: true,
		});
	}
	return redisClient;
}

export type ChatState = {
	activeStreamId: string | null;
};

/**
 * Read activeStreamId for a search history id from Redis.
 * Key: search:chat:{id}. Returns null if Redis is not configured or key doesn't exist.
 */
export async function readChat(id: string): Promise<ChatState> {
	const redis = getRedis();
	if (!redis) return { activeStreamId: null };
	const key = `${CHAT_KEY_PREFIX}${id}`;
	const raw = await redis.get(key);
	if (raw == null) {
		return { activeStreamId: null };
	}
	try {
		const data = JSON.parse(raw) as ChatState;
		return {
			activeStreamId: data.activeStreamId ?? null,
		};
	} catch {
		return { activeStreamId: null };
	}
}

/**
 * Save activeStreamId for a search history id to Redis.
 * Key: search:chat:{id}. Only stores activeStreamId. No-op if Redis is not configured.
 */
export async function saveChat(
	id: string,
	state: { activeStreamId: string | null },
): Promise<void> {
	const redis = getRedis();
	if (!redis) return;
	const key = `${CHAT_KEY_PREFIX}${id}`;
	await redis.set(key, JSON.stringify(state), "EX", CHAT_TTL_SECONDS);
}
