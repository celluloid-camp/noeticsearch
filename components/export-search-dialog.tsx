"use client";

import { IconDownload } from "@tabler/icons-react";
import { useState } from "react";
import { toast } from "sonner";
import * as XLSX from "xlsx";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import {
  NativeSelect,
  NativeSelectOption,
} from "@/components/ui/native-select";
import { useTranslations } from "next-intl";

type ExportFormat = "csv" | "ods";

interface CaptionResult {
  captions: Array<{
    id: string;
    thumbnail: string | null;
    text: string;
    headline: string;
    startTime: number;
    endTime: number;
    language: string;
    rank: number;
    accuracy: number;
  }>;
  videoId: string;
  videoThumbnail: string | null;
  videoTitle: string;
  videoUrl: string;
}

interface ExportSearchDialogProps {
  captionResults: CaptionResult[];
  children: React.ReactNode;
  searchId: string;
  searchTitle: string | null;
}

function formatTimestamp(seconds: number) {
  if (!Number.isFinite(seconds)) {
    return "00:00";
  }
  const total = Math.max(0, Math.floor(seconds));
  const m = Math.floor(total / 60);
  const s = total % 60;
  return `${m.toString().padStart(2, "0")}:${s.toString().padStart(2, "0")}`;
}

function escapeCsv(value: string): string {
  if (/[",\n\r]/.test(value)) {
    return `"${value.replace(/"/g, '""')}"`;
  }
  return value;
}

const EXPORT_HEADERS = [
  "Video Title",
  "Video URL",
  "Start",
  "End",
  "Text",
  "Language",
  "Accuracy",
] as const;

type ExportRow = Record<(typeof EXPORT_HEADERS)[number], string>;

function buildExportRows(captionResults: CaptionResult[]): ExportRow[] {
  const rows: ExportRow[] = [];

  const sorted = [...captionResults].sort((a, b) =>
    (a.videoTitle || "Untitled").localeCompare(b.videoTitle || "Untitled")
  );

  for (const video of sorted) {
    const sortedCaptions = [...(video.captions ?? [])].sort(
      (a, b) => a.startTime - b.startTime
    );
    for (const caption of sortedCaptions) {
      const text =
        typeof caption.headline === "string" ? caption.headline : caption.text;
      const plainText = text.replace(/<[^>]*>/g, "");
      rows.push({
        "Video Title": video.videoTitle || "Untitled",
        "Video URL": video.videoUrl ?? "",
        Start: formatTimestamp(caption.startTime),
        End: formatTimestamp(caption.endTime),
        Text: plainText,
        Language: caption.language ?? "",
        Accuracy: String(caption.accuracy ?? ""),
      });
    }
  }

  return rows;
}

export function ExportSearchDialog({
  children,
  captionResults,
  searchId,
  searchTitle,
}: ExportSearchDialogProps) {
  const t = useTranslations();
  const [open, setOpen] = useState(false);
  const [format, setFormat] = useState<ExportFormat>("csv");
  const [isPending, setIsPending] = useState(false);

  const baseName = `search-${(searchTitle ?? searchId).replace(/[^a-zA-Z0-9-_]/g, "-")}-${new Date().toISOString().slice(0, 10)}`;
  const hasResults = captionResults.length > 0;

  const handleExport = () => {
    const rows = buildExportRows(captionResults);
    if (rows.length === 0) {
      toast.error(t("search.exportNoData"));
      return;
    }

    setIsPending(true);
    try {
      if (format === "csv") {
        const BOM = "\uFEFF";
        const headerLine = EXPORT_HEADERS.map(escapeCsv).join(",");
        const dataLines = rows.map((row) =>
          EXPORT_HEADERS.map((k) => escapeCsv(row[k] ?? "")).join(",")
        );
        const csv = BOM + [headerLine, ...dataLines].join("\n");
        const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
        downloadBlob(blob, `${baseName}.csv`);
      } else {
        const ws = XLSX.utils.json_to_sheet(rows, {
          header: [...EXPORT_HEADERS],
        });
        const wb = XLSX.utils.book_new();
        XLSX.utils.book_append_sheet(wb, ws, "Search Results");
        XLSX.writeFile(wb, `${baseName}.ods`, { bookType: "ods" });
      }

      toast.success(t("search.exportSuccess"));
      setOpen(false);
    } catch {
      toast.error(t("search.exportFailed"));
    } finally {
      setIsPending(false);
    }
  };

  return (
    <Dialog onOpenChange={setOpen} open={open}>
      <DialogTrigger asChild>{children}</DialogTrigger>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <IconDownload className="size-4" />
            {t("search.exportTitle")}
          </DialogTitle>
          <DialogDescription>{t("search.exportDescription")}</DialogDescription>
        </DialogHeader>
        <div className="flex flex-wrap items-center gap-2">
          <Label className="shrink-0" htmlFor="export-format">
            {t("search.exportFormatLabel")}
          </Label>
          <NativeSelect
            id="export-format"
            onChange={(e) => setFormat(e.target.value as ExportFormat)}
            value={format}
          >
            <NativeSelectOption value="csv">CSV</NativeSelectOption>
            <NativeSelectOption value="ods">ODS</NativeSelectOption>
          </NativeSelect>
        </div>
        <DialogFooter>
          <DialogClose asChild>
            <Button type="button" variant="outline">
              {t("search.exportClose")}
            </Button>
          </DialogClose>
          <Button
            aria-busy={isPending}
            disabled={!hasResults || isPending}
            onClick={handleExport}
            type="button"
          >
            {isPending ? (
              <IconDownload aria-hidden className="size-4 animate-pulse" />
            ) : null}
            {isPending ? t("common.loading") : t("search.exportAction")}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function downloadBlob(blob: Blob, filename: string) {
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}
