CREATE TABLE "peertube_instance_auth" (
	"id" text PRIMARY KEY NOT NULL,
	"user_id" text NOT NULL,
	"instance_host" text NOT NULL,
	"username_or_email" text NOT NULL,
	"access_token_encrypted" text,
	"refresh_token_encrypted" text,
	"access_token_expires_at" timestamp,
	"scopes" text,
	"status" text DEFAULT 'failed' NOT NULL,
	"last_error" text,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	"last_used_at" timestamp
);
--> statement-breakpoint
ALTER TABLE "peertube_instance_auth" ADD CONSTRAINT "peertube_instance_auth_user_id_user_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."user"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE UNIQUE INDEX "peertube_instance_auth_user_host_idx" ON "peertube_instance_auth" USING btree ("user_id","instance_host");--> statement-breakpoint
CREATE INDEX "peertube_instance_auth_user_id_idx" ON "peertube_instance_auth" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "peertube_instance_auth_host_idx" ON "peertube_instance_auth" USING btree ("instance_host");
