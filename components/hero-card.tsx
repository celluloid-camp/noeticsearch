"use client";

import { BookOpen, Globe, Search } from "lucide-react";
import Link from "next/link";
import OurIcon from "@/components/icons/ouricon";
import { PublicSearchesGrid } from "@/components/public-searches-grid";
import { Button } from "@/components/ui/button";
import { useSession } from "@/lib/auth-client";

export function HeroCard() {
  const { data: session } = useSession();
  const isSignedIn = !!session?.user;

  return (
    <div className="mx-auto h-full w-full max-w-4xl border-x py-8">
      {/* Header block */}
      <div className="mb-10 border-border border-b pb-8">
        <div className="px-10">
          <div className="mb-4 flex items-center gap-2">
            <OurIcon />
            <span className="font-mono text-muted-foreground text-xs uppercase tracking-widest">
              noeticsearch
            </span>
          </div>

          <h1 className="font-bold text-3xl tracking-tight sm:text-4xl md:text-5xl">
            Search inside
            <br />
            <span className="text-muted-foreground">any video.</span>
          </h1>

          <p className="mt-4 max-w-lg text-muted-foreground text-sm leading-relaxed sm:text-base">
            Find exact quotes, terms, and references across video transcripts
            with precision.
          </p>

          {/* CTAs */}
          <div className="mt-6 flex flex-wrap items-center gap-3">
            {isSignedIn ? (
              <>
                <Button asChild size="lg">
                  <Link href="/search">
                    <Search className="mr-1.5 size-3.5" />
                    New search
                  </Link>
                </Button>
                <Button asChild size="lg" variant="outline">
                  <Link href="/library/mine">
                    <BookOpen className="mr-1.5 size-3.5" />
                    My library
                  </Link>
                </Button>
              </>
            ) : (
              <>
                <Button asChild size="sm">
                  <Link href="/sign-up">Get started</Link>
                </Button>
                <Button asChild size="sm" variant="outline">
                  <Link href="/sign-in">Sign in</Link>
                </Button>
                <Button asChild size="sm" variant="ghost">
                  <Link href="/library/all">
                    <Globe className="mr-1.5 size-3.5" />
                    Browse public library
                  </Link>
                </Button>
              </>
            )}
          </div>
        </div>
      </div>

      <PublicSearchesGrid />
    </div>
  );
}
