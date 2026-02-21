"use client";

import { LogOut, Search, Video } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useTranslations } from "next-intl";
import { useState } from "react";
import { signOut, useSession } from "@/lib/auth-client";
import { LocaleSwitcher } from "./locale-switcher";
import { Avatar, AvatarFallback, AvatarImage } from "./ui/avatar";
import { Button } from "./ui/button";

export default function Header() {
	const router = useRouter();
	const t = useTranslations();
	const { data: session, isPending } = useSession();
	const [showMenu, setShowMenu] = useState(false);

	const isLoggedIn = !!session?.user;

	const handleAvatarClick = () => {
		if (isLoggedIn) {
			setShowMenu(!showMenu);
		} else {
			router.push("/sign-in");
		}
	};

	const handleNewSearchClick = () => {
		router.push("/search");
	};

	const handleSignUpClick = () => {
		router.push("/sign-up");
	};

	const handleSignOut = async () => {
		await signOut();
		setShowMenu(false);
		router.push("/");
		router.refresh();
	};

	const getInitials = () => {
		if (session?.user?.name) {
			return session.user.name.charAt(0).toUpperCase();
		}
		if (session?.user?.email) {
			return session.user.email.charAt(0).toUpperCase();
		}
		return "U";
	};

	return (
		<>
			<header className="sticky top-0 z-50 w-full border-b border-border bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
				<div className="flex h-12 items-center justify-between px-6 gap-4">
					{/* Logo */}
					<div className="flex items-center gap-2">
						<div className="w-8 h-8 rounded-lg bg-primary flex items-center justify-center">
							<svg
								className="w-5 h-5 text-primary-foreground"
								fill="none"
								stroke="currentColor"
								viewBox="0 0 24 24"
								aria-hidden="true"
							>
								<path
									strokeLinecap="round"
									strokeLinejoin="round"
									strokeWidth={2}
									d="M15 12a3 3 0 11-6 0 3 3 0 016 0z"
								/>
								<path
									strokeLinecap="round"
									strokeLinejoin="round"
									strokeWidth={2}
									d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z"
								/>
							</svg>
						</div>
						<h1 className="text-xl font-bold text-foreground">VisionSearch</h1>
					</div>

					{/* Right Section */}
					<div className="flex items-center gap-4">
						<LocaleSwitcher />
						{isLoggedIn ? (
							<>
								{/* New Search Button */}
								<Button
									type="button"
									variant="secondary"
									onClick={handleNewSearchClick}
								>
									<Search className="w-4 h-4" />
									New search
								</Button>

								<Link href="/import">
									<Button type="button">
										<Video className="w-4 h-4" />
										{t("video.import")}
									</Button>
								</Link>

								{/* Avatar */}
								<Button
									type="button"
									variant="ghost"
									size="icon-lg"
									className="rounded-full"
									onClick={handleAvatarClick}
								>
									<Avatar className="size-10 border-2 border-border">
										{session?.user?.image ? (
											<AvatarImage
												src={session.user.image}
												alt=""
												className="object-cover"
											/>
										) : null}
										<AvatarFallback className="bg-secondary text-foreground font-semibold text-sm">
											{getInitials()}
										</AvatarFallback>
									</Avatar>
								</Button>
							</>
						) : (
							<Button type="button" onClick={handleSignUpClick}>
								Sign up
							</Button>
						)}
					</div>
				</div>
			</header>
			{showMenu && isLoggedIn && (
				<div className="absolute right-6 top-12 mt-2 w-48 rounded-md border border-border bg-background shadow-lg z-50">
					<div className="p-3 border-b border-border">
						<p className="text-sm font-medium">
							{session?.user?.name || "User"}
						</p>
						<p className="text-xs text-muted-foreground truncate">
							{session?.user?.email}
						</p>
					</div>
					<Button
						type="button"
						variant="ghost"
						className="w-full justify-start gap-2 text-destructive hover:bg-destructive/10 hover:text-destructive"
						onClick={handleSignOut}
					>
						<LogOut className="w-4 h-4" />
						Sign out
					</Button>
				</div>
			)}
		</>
	);
}
