"use client";

import Image from "next/image";

export interface VideoPreviewCardPreview {
  baseUrl: string;
  captions: Array<{ language: string; fileUrl: string }>;
  description: string;
  thumbnail: string;
  title: string;
  videoId: string;
}

interface VideoPreviewCardProps {
  preview: VideoPreviewCardPreview | null;
}

export function VideoPreviewCard({ preview }: VideoPreviewCardProps) {
  if (!preview) {
    return (
      <div className="rounded-lg border border-dashed bg-muted/40 p-3 text-muted-foreground text-xs">
        Video information will appear here after you enter a valid PeerTube URL.
      </div>
    );
  }

  return (
    <div className="space-y-3 rounded-lg border bg-muted/50 p-3">
      <div className="flex gap-3">
        {preview.thumbnail && (
          <div className="relative h-28 w-48 shrink-0">
            <Image
              alt={preview.title}
              className="rounded object-cover"
              fill
              src={preview.thumbnail}
              unoptimized
            />
          </div>
        )}
        <div className="min-w-0 flex-1">
          <p className="line-clamp-2 font-medium text-foreground text-sm">
            {preview.title}
          </p>
          {preview.description && (
            <p className="mt-1 line-clamp-2 text-muted-foreground text-xs">
              {preview.description}
            </p>
          )}
        </div>
      </div>
      {preview.captions.length > 0 && (
        <div className="border-t pt-2">
          <p className="mb-2 font-medium text-foreground text-xs">
            Available Captions ({preview.captions.length}):
          </p>
          <div className="flex flex-wrap gap-2">
            {preview.captions.map((caption, index) => (
              <div
                className="inline-flex items-center gap-1.5 rounded-md border bg-background px-2 py-1 text-foreground text-xs"
                // eslint-disable-next-line react/no-array-index-key
                key={index}
              >
                <span className="font-medium">
                  {caption.language.toUpperCase()}
                </span>
              </div>
            ))}
          </div>
        </div>
      )}
      {preview.captions.length === 0 && (
        <div className="border-t pt-2">
          <p className="font-medium text-destructive text-xs">
            ⚠️ No captions available for this video. Videos with captions are
            required for import.
          </p>
        </div>
      )}
    </div>
  );
}
