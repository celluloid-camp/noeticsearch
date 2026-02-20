"use client";

import { Suspense } from "react";
import VideoCatalog from "@/components/video-catalog";
import Loading from "./loading";

export default function Home() {
	return (
		<div className="flex flex-col gap-4 min-w-0 h-full overflow-hidden">
			<Suspense fallback={<Loading />}>
				<VideoCatalog filter="all" />
			</Suspense>
		</div>
	);
}
