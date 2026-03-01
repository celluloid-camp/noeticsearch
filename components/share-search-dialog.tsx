"use client";

import { IconAlertTriangle, IconCopy, IconShare } from "@tabler/icons-react";
import { useEffect, useState } from "react";
import { toast } from "sonner";
import { useCopyToClipboard } from "usehooks-ts";
import { Alert, AlertDescription } from "@/components/ui/alert";
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
import {
  InputGroup,
  InputGroupAddon,
  InputGroupButton,
  InputGroupInput,
} from "@/components/ui/input-group";

interface ShareSearchDialogProps {
  children: React.ReactNode;
  isPublic?: boolean;
}

export function ShareSearchDialog({
  children,
  isPublic = true,
}: ShareSearchDialogProps) {
  const [open, setOpen] = useState(false);
  const [shareUrl, setShareUrl] = useState("");
  const [, copy] = useCopyToClipboard();

  useEffect(() => {
    if (open && typeof window !== "undefined") {
      setShareUrl(window.location.href);
    }
  }, [open]);

  const handleCopy = () => {
    void copy(shareUrl).then(() => {
      toast.success("Link copied to clipboard");
    });
  };

  return (
    <Dialog onOpenChange={setOpen} open={open}>
      <DialogTrigger asChild>{children}</DialogTrigger>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <IconShare className="size-4" />
            Share search
          </DialogTitle>
          <DialogDescription>
            Share this link to let others view the search results.
          </DialogDescription>
        </DialogHeader>
        {!isPublic && (
          <Alert
            className="border-amber-500/50 bg-amber-500/10 [&>svg]:text-amber-600 dark:[&>svg]:text-amber-500"
            variant="default"
          >
            <IconAlertTriangle className="size-4 shrink-0" />
            <AlertDescription>
              This search is private. Only you can access it. Recipients will
              need to sign in with your account to view the results.
            </AlertDescription>
          </Alert>
        )}
        <InputGroup className="h-9">
          <InputGroupInput
            className="font-mono text-xs"
            disabled
            readOnly
            value={shareUrl}
          />
          <InputGroupAddon align="inline-end">
            <InputGroupButton onClick={handleCopy} size="sm" type="button">
              <IconCopy className="size-4" />
              Copy
            </InputGroupButton>
          </InputGroupAddon>
        </InputGroup>
        <DialogFooter>
          <DialogClose asChild>
            <Button type="button" variant="outline">
              Close
            </Button>
          </DialogClose>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
