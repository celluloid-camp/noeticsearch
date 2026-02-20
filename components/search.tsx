"use client";

import { Loader2 } from "lucide-react";
import Image from "next/image";
import Link from "next/link";
import { Card, CardContent } from "@/components/ui/card";
import { ScrollArea, ScrollBar } from "@/components/ui/scroll-area";
import type { FindVideosUITool } from "@/lib/ai/tools";

export type FindVideosUIToolOutput = FindVideosUITool["output"];

type VideoItem = {
	id: number | string;
	title: string;
	url: string;
	thumbnail?: string | null;
	createdAt?: Date | string;
	isPublic?: boolean;
};
export const SearchVideo = ({ videos }: { videos: FindVideosUIToolOutput }) => {
	// Handle case where videos might be undefined or not an array
	const videoArray = Array.isArray(videos) ? videos : [];

	if (videoArray.length === 0) {
		return (
			<div className="py-4">
				<p className="text-sm text-muted-foreground">No videos found</p>
			</div>
		);
	}

	return (
		<div className="w-full py-4">
			<ScrollArea className="w-full">
				<div className="flex gap-4 pb-4" style={{ width: "max-content" }}>
					{videoArray.map((video: VideoItem) => {
						const videoId = video.id?.toString() || "";
						const thumbnail = video.thumbnail || "/placeholder.svg";
						const title = video.title || "Untitled";
						const createdAt = video.createdAt
							? new Date(video.createdAt).toLocaleDateString()
							: "";

						return (
							<Link
								key={videoId}
								href={`/video/${videoId}`}
								className="inline-block shrink-0"
							>
								<Card className="w-64 overflow-hidden cursor-pointer hover:shadow-lg transition-shadow">
									<div className="relative aspect-video w-full bg-muted">
										{thumbnail && thumbnail !== "/placeholder.svg" ? (
											<Image
												src={thumbnail}
												alt={title}
												fill
												className="object-cover"
												sizes="256px"
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
				<ScrollBar orientation="horizontal" />
			</ScrollArea>
		</div>
	);
};
