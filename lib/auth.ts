import { betterAuth } from "better-auth";
import { drizzleAdapter } from "better-auth/adapters/drizzle";
import { nextCookies } from "better-auth/next-js";
import { admin } from "better-auth/plugins";
import { env } from "@/env";
import { db } from "./db";
export const auth = betterAuth({
	baseURL: env.BASE_URL,
	database: drizzleAdapter(db, {
		provider: "pg",
	}),
	user: {
		modelName: "userTable",
	},
	account: {
		modelName: "accountTable",
	},
	verification: {
		modelName: "verificationTable",
	},
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
	plugins: [nextCookies(), admin()],
	trustedOrigins: ["http://localhost:3000", "https://localhost:3000"],
	session: {
		modelName: "sessionTable",
		cookieCache: {
			enabled: true,
			maxAge: 60 * 60 * 24 * 30, // 30 days
		},
	},
	advanced: {
		cookies: {
			session_token: {
				name: "vsearch_auth_session",
			},
		},
	},
});
export type Session = typeof auth.$Infer.Session;
