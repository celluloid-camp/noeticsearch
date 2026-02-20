"use client";

import { Search, Send } from "lucide-react";
import React, { useRef, useState } from "react";
import { ProtectedRoute } from "@/components/auth/ProtectedRoute";

export default function SearchPage() {
	const [query, setQuery] = useState("");
	const inputRef = useRef<HTMLInputElement>(null);

	const handleSearch = () => {
		if (query.trim()) {
			// TODO: Implement search functionality
			console.log("Search query:", query.trim());
		}
	};

	return (
		<ProtectedRoute>
			<div className="flex h-full w-full items-center justify-center p-4">
				<div className="flex flex-col items-center gap-6 w-full max-w-2xl">
					<h1 className="text-3xl font-semibold text-foreground">
						Search Assistant
					</h1>

					{/* Search Input Form */}
					<div className="w-full">
						<div className="relative">
							<Search className="absolute left-4 top-1/2 transform -translate-y-1/2 h-5 w-5 text-muted-foreground" />
							<input
								ref={inputRef}
								type="text"
								value={query}
								onChange={(e) => setQuery(e.target.value)}
								onKeyDown={(e) => {
									if (e.key === "Enter") {
										handleSearch();
									}
								}}
								placeholder="Search in video subtitles..."
								className="w-full pl-12 pr-14 py-4 text-base bg-background border border-border rounded-xl focus:outline-none focus:ring-2 focus:ring-primary shadow-sm"
							/>
							<button
								type="button"
								onClick={handleSearch}
								disabled={!query.trim()}
								className="absolute right-2 top-1/2 transform -translate-y-1/2 p-2 bg-primary text-primary-foreground rounded-lg hover:bg-primary/90 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
								aria-label="Send search"
							>
								<Send className="h-5 w-5" />
							</button>
						</div>
					</div>

					{/* Helper Text */}
					<p className="text-sm text-muted-foreground text-center max-w-md">
						Ask me to find words or phrases in your video subtitles, like
						"find videos with javascript" or "search for the word tutorial".
					</p>
				</div>
			</div>
		</ProtectedRoute>
	);
}
