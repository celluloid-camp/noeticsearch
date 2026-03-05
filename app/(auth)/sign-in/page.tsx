"use client";

import { Eye, EyeOff } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useTranslations } from "next-intl";
import { type ChangeEvent, useState } from "react";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import {
  InputGroup,
  InputGroupAddon,
  InputGroupInput,
} from "@/components/ui/input-group";
import { signIn } from "@/lib/auth-client";

export default function SignInPage() {
  const t = useTranslations("auth");
  const router = useRouter();
  const [email, setEmail] = useState<string>("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setLoading(true);

    try {
      const result = await signIn.email({
        email,
        password,
      });

      if (result.error) {
        setError(result.error.message || t("signInFailed"));
      } else {
        router.push("/");
        router.refresh();
      }
    } catch (_err) {
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
            {t("signInTitle")}
          </CardTitle>
          <CardDescription>{t("signInDescription")}</CardDescription>
        </CardHeader>
        <CardContent>
          <form className="space-y-4" onSubmit={handleSubmit}>
            {error && (
              <div className="rounded-md border border-red-200 bg-red-10 p-3 text-red-500 text-sm">
                {error}
              </div>
            )}
            <div className="space-y-2">
              <label className="font-medium text-sm" htmlFor="email">
                {t("email")}
              </label>
              <Input
                id="email"
                onChange={(e: ChangeEvent<HTMLInputElement>) =>
                  setEmail(e.target.value)
                }
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
              <InputGroup>
                <InputGroupInput
                  id="password"
                  onChange={(e: ChangeEvent<HTMLInputElement>) =>
                    setPassword(e.target.value)
                  }
                  required
                  type={showPassword ? "text" : "password"}
                  value={password}
                />
                <InputGroupAddon align="inline-end">
                  <button
                    aria-label={
                      showPassword ? t("hidePassword") : t("showPassword")
                    }
                    className="rounded-sm p-1 text-muted-foreground hover:text-foreground"
                    onClick={() => setShowPassword((prev) => !prev)}
                    type="button"
                  >
                    {showPassword ? (
                      <EyeOff className="size-4" />
                    ) : (
                      <Eye className="size-4" />
                    )}
                  </button>
                </InputGroupAddon>
              </InputGroup>
            </div>
            <Button
              className="w-full"
              disabled={loading}
              size="lg"
              type="submit"
            >
              {loading ? t("signingInButton") : t("signInButton")}
            </Button>
          </form>

          <p className="mt-4 text-center text-muted-foreground text-sm">
            {t("noAccount")}{" "}
            <Link className="text-primary hover:underline" href="/sign-up">
              {t("signUp")}
            </Link>
          </p>
        </CardContent>
      </Card>
    </div>
  );
}
