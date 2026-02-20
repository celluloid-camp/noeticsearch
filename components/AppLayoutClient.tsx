"use client";

import { Globe, User, Video } from "lucide-react";
import { usePathname, useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { Card } from "@/components/ui/card";
import {
	Sidebar,
	SidebarContent,
	SidebarGroup,
	SidebarGroupLabel,
	SidebarHeader,
	SidebarMenu,
	SidebarMenuButton,
	SidebarMenuItem,
	SidebarProvider,
	SidebarTrigger,
} from "@/components/ui/sidebar";

interface AppLayoutClientProps {
	children: React.ReactNode;
}

export default function AppLayoutClient({ children }: AppLayoutClientProps) {
	const router = useRouter();
	const pathname = usePathname();
	const [filterTab, setFilterTab] = useState<"all" | "public" | "my">("all");

	const handleFilterTabClick = (tab: "all" | "public" | "my") => {
		setFilterTab(tab);
		localStorage.setItem("filterTab", tab);
		// Dispatch event to notify other components
		window.dispatchEvent(new CustomEvent("filterTabChanged"));
		// Navigate to home page if not already there
		if (pathname !== "/") {
			router.push("/");
		}
	};

	// Load filterTab from localStorage on mount
	useEffect(() => {
		const stored = localStorage.getItem("filterTab");
		if (
			stored &&
			(stored === "all" || stored === "public" || stored === "my")
		) {
			setFilterTab(stored as "all" | "public" | "my");
		}
	}, []);

	return (
		<div className="flex h-full w-full gap-4 p-4 overflow-hidden bg-background">
			<div className="shrink-0 relative" style={{ width: "auto" }}>
				<SidebarProvider
					className="flex h-full"
					style={
						{
							minHeight: 0,
							width: "auto",
							maxWidth: "none",
							"--sidebar-width": "16rem",
						} as React.CSSProperties
					}
				>
					{/* Left Sidebar - Menu */}
					<Sidebar side="left" collapsible="icon" variant="floating">
						<Card className="h-full flex flex-col overflow-hidden p-0 border-0 shadow-none bg-card">
							<SidebarHeader>
								<div className="flex items-center justify-between group-data-[collapsible=icon]:justify-center">
									<p className="text-xs font-semibold text-sidebar-foreground/70 px-1 group-data-[collapsible=icon]:hidden">
										Library
									</p>
									<SidebarTrigger />
								</div>
							</SidebarHeader>
							<SidebarContent className="p-0 flex flex-col h-full">
								{/* Video Filters */}
								<SidebarMenu>
									<SidebarMenuItem>
										<SidebarMenuButton
											isActive={filterTab === "all"}
											onClick={() => handleFilterTabClick("all")}
											tooltip="All Videos"
										>
											<Video className="size-4" />
											<span>All Videos</span>
										</SidebarMenuButton>
									</SidebarMenuItem>
									<SidebarMenuItem>
										<SidebarMenuButton
											isActive={filterTab === "public"}
											onClick={() => handleFilterTabClick("public")}
											tooltip="Public Videos"
										>
											<Globe className="size-4" />
											<span>Public Videos</span>
										</SidebarMenuButton>
									</SidebarMenuItem>
									<SidebarMenuItem>
										<SidebarMenuButton
											isActive={filterTab === "my"}
											onClick={() => handleFilterTabClick("my")}
											tooltip="My Videos"
										>
											<User className="size-4" />
											<span>My Videos</span>
										</SidebarMenuButton>
									</SidebarMenuItem>
								</SidebarMenu>
							</SidebarContent>
						</Card>
					</Sidebar>
				</SidebarProvider>
			</div>

			{/* Central Content */}
			<div
				className="flex-1 flex flex-col min-w-0 overflow-hidden bg-background"
				style={{ flexBasis: 0 }}
			>
				<Card className="h-full w-full flex flex-col overflow-hidden bg-white">
					<div className="flex-1 overflow-auto p-4 w-full">{children}</div>
				</Card>
			</div>
		</div>
	);
}
