"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useTranslations } from "next-intl";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { signUp } from "@/lib/auth-client";

export default function SignUpPage() {
  const t = useTranslations("auth");
  const router = useRouter();
  const [email, setEmail] = useState<string>("");
  const [name, setName] = useState<string>("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setLoading(true);

    try {
      const result = await signUp.email({
        email,
        password,
        name,
      });

      if (result.error) {
        setError(result.error.message || t("signUpFailed"));
      } else {
        router.push("/");
        router.refresh();
      }
    } catch {
      setError(t("unexpectedError"));
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex min-h-screen items-center justify-center bg-background p-4">
      <Card className="w-full max-w-md">
        <CardHeader className="space-y-1">
          <CardTitle className="font-bold text-2xl">
            {t("signUpTitle")}
          </CardTitle>
          <CardDescription>{t("signUpDescription")}</CardDescription>
        </CardHeader>
        <CardContent>
          <form className="space-y-4" onSubmit={handleSubmit}>
            {error && (
              <div className="rounded-md border border-red-200 bg-red-10 p-3 text-red-500 text-sm">
                {error}
              </div>
            )}
            <div className="space-y-2">
              <label className="font-medium text-sm" htmlFor="name">
                {t("name")}
              </label>
              <Input
                id="name"
                onChange={(e) => setName(e.target.value || "")}
                placeholder="John Doe"
                required
                type="text"
                value={name}
              />
            </div>
            <div className="space-y-2">
              <label className="font-medium text-sm" htmlFor="email">
                {t("email")}
              </label>
              <Input
                id="email"
                onChange={(e) => setEmail(e.target.value || "")}
                placeholder="you@example.com"
                required
                type="email"
                value={email}
              />
            </div>
            <div className="space-y-2">
              <label className="font-medium text-sm" htmlFor="password">
                {t("password")}
              </label>
              <Input
                id="password"
                minLength={8}
                onChange={(e) => setPassword(e.target.value)}
                required
                type="password"
                value={password}
              />
              <p className="text-muted-foreground text-xs">
                {t("passwordMinLength")}
              </p>
            </div>
            <Button className="w-full" disabled={loading} type="submit">
              {loading ? t("creatingAccountButton") : t("signUpButton")}
            </Button>
          </form>

          <p className="mt-4 text-center text-muted-foreground text-sm">
            {t("hasAccount")}{" "}
            <Link className="text-primary hover:underline" href="/sign-in">
              {t("signIn")}
            </Link>
          </p>
        </CardContent>
      </Card>
    </div>
  );
}
