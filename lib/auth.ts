import { betterAuth } from "better-auth";
import { drizzleAdapter } from "better-auth/adapters/drizzle";
import { nextCookies } from "better-auth/next-js";
import { admin } from "better-auth/plugins";
import { localization } from "better-auth-localization";
import { env } from "@/env";
import { db } from "./db";

export const auth = betterAuth({
  baseURL:
    process.env.NODE_ENV === "production"
      ? "https://noeticsearch.huma-num.fr"
      : "http://localhost:3000",
  database: drizzleAdapter(db, {
    provider: "pg",
  }),
  emailAndPassword: {
    enabled: true,
    requireEmailVerification: false,
  },
  socialProviders: {
    github: {
      clientId: env.GITHUB_CLIENT_ID || "",
      clientSecret: env.GITHUB_CLIENT_SECRET || "",
    },
  },
  plugins: [
    nextCookies(),
    admin(),
    localization({
      defaultLocale: "fr-FR",
      fallbackLocale: "default",
    }),
  ],
  trustedOrigins: ["http://localhost:3000", "https://noeticsearch.huma-num.fr"],
  session: {
    cookieCache: {
      enabled: true,
      maxAge: 60 * 60 * 24 * 30, // 30 days
    },
  },
  telemetry: {
    enabled: false,
  },
  // experimental: { joins: true },
});
export type Session = typeof auth.$Infer.Session;
