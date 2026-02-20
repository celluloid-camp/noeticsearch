import { ilike } from "drizzle-orm";
import { videoTable } from "@/db/schema";
import { db } from "../db";

export async function findRelevantVideos(question: string) {
	const videos = await db.query.videoTable.findMany({
		where: ilike(videoTable.title, `%${question}%`),
	});
	console.log(videos);
	return videos;
}
