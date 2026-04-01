"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Loader2, PlugIcon, PlugZapIcon } from "lucide-react";
import { useTranslations } from "next-intl";
import { useState } from "react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";
import { useTRPC } from "@/lib/trpc/client";

interface ConnectInstanceDialogProps {
  host: string;
  instanceTitle?: string;
  onStatusChange?: () => void;
}

export function ConnectInstanceDialog({
  host,
  instanceTitle,
  onStatusChange,
}: ConnectInstanceDialogProps) {
  const [open, setOpen] = useState(false);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const t = useTranslations("peertubeAuth");
  const tCommon = useTranslations("common");
  const { toast } = useToast();
  const api = useTRPC();
  const queryClient = useQueryClient();

  const { data: authStatus } = useQuery({
    ...api.peertubeInstance.authStatus.queryOptions({ host }),
    enabled: !!host,
  });

  const connectMutation = useMutation(
    api.peertubeInstance.connect.mutationOptions({
      onSuccess: () => {
        toast({ title: t("connectSuccess") });
        setEmail("");
        setPassword("");
        setOpen(false);
        queryClient.invalidateQueries({ queryKey: [["peertubeInstance"]] });
        onStatusChange?.();
      },
      onError: (err) => {
        const isInvalidCreds = err.message.includes("invalid_credentials");
        toast({
          title: tCommon("error"),
          description: isInvalidCreds
            ? t("errorInvalidCredentials")
            : t("errorConnectionFailed"),
          variant: "destructive",
        });
      },
    })
  );

  const disconnectMutation = useMutation(
    api.peertubeInstance.disconnect.mutationOptions({
      onSuccess: () => {
        toast({ title: t("disconnectSuccess") });
        queryClient.invalidateQueries({ queryKey: [["peertubeInstance"]] });
        onStatusChange?.();
      },
      onError: () => {
        toast({
          title: tCommon("error"),
          description: t("errorConnectionFailed"),
          variant: "destructive",
        });
      },
    })
  );

  const handleConnect = () => {
    if (!email.trim() || !password) return;
    connectMutation.mutate({ host, email: email.trim(), password });
  };

  const handleDisconnect = () => {
    disconnectMutation.mutate({ host });
  };

  const isConnected = authStatus?.status === "connected";
  const isExpired = authStatus?.status === "expired";

  return (
    <Dialog
      onOpenChange={(next) => {
        setOpen(next);
        if (!next) {
          setEmail("");
          setPassword("");
        }
      }}
      open={open}
    >
      <DialogTrigger asChild>
        <Button size="sm" type="button" variant="outline">
          {isConnected ? (
            <PlugZapIcon className="size-3.5" />
          ) : (
            <PlugIcon className="size-3.5" />
          )}
          {isConnected ? t("reconnect") : t("connect")}
        </Button>
      </DialogTrigger>

      <DialogContent className="sm:max-w-sm">
        <DialogHeader>
          <DialogTitle>
            {isConnected || isExpired ? t("reconnectTitle") : t("connectTitle")}
          </DialogTitle>
          <DialogDescription>
            {instanceTitle
              ? t("connectDescriptionWithTitle", { title: instanceTitle })
              : t("connectDescription")}
          </DialogDescription>
        </DialogHeader>

        <div className="flex flex-col gap-4">
          {/* Current status badge */}
          {authStatus?.status && (
            <div className="flex items-center gap-2">
              <span className="text-muted-foreground text-sm">
                {t("currentStatus")}:
              </span>
              <ConnectionStatusBadge status={authStatus.status} />
            </div>
          )}

          <div className="flex flex-col gap-2">
            <Label htmlFor="pt-email">{t("emailLabel")}</Label>
            <Input
              autoComplete="username"
              id="pt-email"
              onChange={(e) => setEmail(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter") handleConnect();
              }}
              placeholder={t("emailPlaceholder")}
              type="email"
              value={email}
            />
          </div>

          <div className="flex flex-col gap-2">
            <Label htmlFor="pt-password">{t("passwordLabel")}</Label>
            <Input
              autoComplete="current-password"
              id="pt-password"
              onChange={(e) => setPassword(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter") handleConnect();
              }}
              placeholder={t("passwordPlaceholder")}
              type="password"
              value={password}
            />
          </div>
        </div>

        <DialogFooter className="flex-col gap-2 sm:flex-row sm:justify-between">
          {isConnected && (
            <Button
              disabled={disconnectMutation.isPending}
              onClick={handleDisconnect}
              size="sm"
              type="button"
              variant="ghost"
            >
              {disconnectMutation.isPending ? (
                <Loader2 className="size-4 animate-spin" />
              ) : null}
              {t("disconnect")}
            </Button>
          )}
          <div className="flex gap-2">
            <Button
              onClick={() => setOpen(false)}
              size="sm"
              type="button"
              variant="outline"
            >
              {tCommon("cancel")}
            </Button>
            <Button
              disabled={
                !email.trim() || !password || connectMutation.isPending
              }
              onClick={handleConnect}
              size="sm"
              type="button"
            >
              {connectMutation.isPending ? (
                <Loader2 className="size-4 animate-spin" />
              ) : null}
              {isConnected || isExpired ? t("reconnect") : t("connect")}
            </Button>
          </div>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

interface ConnectionStatusBadgeProps {
  status: string | null;
}

export function ConnectionStatusBadge({ status }: ConnectionStatusBadgeProps) {
  const t = useTranslations("peertubeAuth");

  if (!status) return null;

  if (status === "connected") {
    return (
      <Badge className="bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200" variant="outline">
        {t("statusConnected")}
      </Badge>
    );
  }

  if (status === "expired") {
    return (
      <Badge className="bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200" variant="outline">
        {t("statusExpired")}
      </Badge>
    );
  }

  return (
    <Badge variant="outline" className="bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200">
      {t("statusFailed")}
    </Badge>
  );
}
