CREATE EXTENSION IF NOT EXISTS unaccent;

CREATE TABLE "account" (
	"id" text PRIMARY KEY NOT NULL,
	"account_id" text NOT NULL,
	"provider_id" text NOT NULL,
	"user_id" text NOT NULL,
	"access_token" text,
	"refresh_token" text,
	"id_token" text,
	"access_token_expires_at" timestamp,
	"refresh_token_expires_at" timestamp,
	"scope" text,
	"password" text,
	"created_at" timestamp NOT NULL,
	"updated_at" timestamp NOT NULL
);
--> statement-breakpoint
CREATE TABLE "session" (
	"id" text PRIMARY KEY NOT NULL,
	"expires_at" timestamp,
	"token" text NOT NULL,
	"created_at" timestamp,
	"updated_at" timestamp,
	"ip_address" text,
	"user_agent" text,
	"impersonated_by" text,
	"user_id" text NOT NULL,
	CONSTRAINT "session_token_unique" UNIQUE("token")
);
--> statement-breakpoint
CREATE TABLE "user" (
	"id" text PRIMARY KEY NOT NULL,
	"name" text NOT NULL,
	"email" text NOT NULL,
	"email_verified" boolean NOT NULL,
	"image" text,
	"role" text DEFAULT 'user' NOT NULL,
	"banExpires" timestamp(3),
	"banReason" text,
	"banned" boolean,
	"created_at" timestamp NOT NULL,
	"updated_at" timestamp NOT NULL,
	CONSTRAINT "user_email_unique" UNIQUE("email")
);
--> statement-breakpoint
CREATE TABLE "verification" (
	"id" text PRIMARY KEY NOT NULL,
	"identifier" text NOT NULL,
	"value" text NOT NULL,
	"expires_at" timestamp NOT NULL,
	"created_at" timestamp,
	"updated_at" timestamp
);
--> statement-breakpoint
CREATE TABLE "captions" (
	"id" text PRIMARY KEY NOT NULL,
	"video_id" text NOT NULL,
	"language" text DEFAULT 'fr' NOT NULL,
	"text" text NOT NULL,
	"start_time" real NOT NULL,
	"end_time" real NOT NULL,
	"raw" jsonb NOT NULL,
	"thumbnail" text,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "chapters" (
	"id" text PRIMARY KEY NOT NULL,
	"video_id" text NOT NULL,
	"language" text DEFAULT 'fr' NOT NULL,
	"title" text NOT NULL,
	"timecode" real NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "peertube_instances" (
	"id" text PRIMARY KEY NOT NULL,
	"user_id" text NOT NULL,
	"host" text NOT NULL,
	"title" text NOT NULL,
	"description" text,
	"thumbnail" text NOT NULL,
	"is_public" boolean DEFAULT false NOT NULL
);
--> statement-breakpoint
CREATE TABLE "search_history" (
	"id" text PRIMARY KEY NOT NULL,
	"title" text,
	"is_public" boolean DEFAULT false NOT NULL,
	"filter_type" text DEFAULT 'all',
	"video_ids" jsonb DEFAULT '[]'::jsonb,
	"user_id" text NOT NULL,
	"messages" jsonb,
	"results" jsonb,
	"keywords" jsonb,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "search_result" (
	"id" text PRIMARY KEY NOT NULL,
	"search_id" text NOT NULL,
	"video_id" text NOT NULL,
	"caption_id" text NOT NULL,
	"accuracy" real DEFAULT 0 NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "videos" (
	"id" text PRIMARY KEY NOT NULL,
	"user_id" text NOT NULL,
	"external_id" text NOT NULL,
	"title" text NOT NULL,
	"description" text,
	"url" text NOT NULL,
	"base_url" text NOT NULL,
	"thumbnail" text,
	"is_public" boolean DEFAULT false NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"video_details" jsonb NOT NULL,
	"caption_list" jsonb,
	"storyboard" jsonb,
	"is_password_protected" boolean DEFAULT false NOT NULL,
	"video_password" text
);
--> statement-breakpoint
ALTER TABLE "account" ADD CONSTRAINT "account_user_id_user_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."user"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "session" ADD CONSTRAINT "session_user_id_user_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."user"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "captions" ADD CONSTRAINT "captions_video_id_videos_id_fk" FOREIGN KEY ("video_id") REFERENCES "public"."videos"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "chapters" ADD CONSTRAINT "chapters_video_id_videos_id_fk" FOREIGN KEY ("video_id") REFERENCES "public"."videos"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "peertube_instances" ADD CONSTRAINT "peertube_instances_user_id_user_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."user"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "search_history" ADD CONSTRAINT "search_history_user_id_user_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."user"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "search_result" ADD CONSTRAINT "search_result_search_id_search_history_id_fk" FOREIGN KEY ("search_id") REFERENCES "public"."search_history"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "search_result" ADD CONSTRAINT "search_result_video_id_videos_id_fk" FOREIGN KEY ("video_id") REFERENCES "public"."videos"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "search_result" ADD CONSTRAINT "search_result_caption_id_captions_id_fk" FOREIGN KEY ("caption_id") REFERENCES "public"."captions"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "videos" ADD CONSTRAINT "videos_user_id_user_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."user"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "captions_search_index" ON "captions" USING gin ((
			setweight(
				to_tsvector(
					CASE "language"
						WHEN 'fr' THEN 'french'::regconfig
						WHEN 'en' THEN 'english'::regconfig
						ELSE 'simple'::regconfig
					END,
					"text"
				),
				'A'
			)
		));--> statement-breakpoint
CREATE INDEX "chapters_search_index" ON "chapters" USING gin ((
			setweight(
				to_tsvector(
					CASE "language"
						WHEN 'fr' THEN 'french'::regconfig
						WHEN 'en' THEN 'english'::regconfig
						ELSE 'simple'::regconfig
					END,
					"title"
				),
				'A'
			)
		));--> statement-breakpoint
CREATE INDEX "search_result_search_id_idx" ON "search_result" USING btree ("search_id");--> statement-breakpoint
CREATE INDEX "search_result_video_id_idx" ON "search_result" USING btree ("video_id");--> statement-breakpoint
CREATE INDEX "search_result_caption_id_idx" ON "search_result" USING btree ("caption_id");--> statement-breakpoint
CREATE UNIQUE INDEX "search_result_search_caption_unique" ON "search_result" USING btree ("search_id","caption_id");--> statement-breakpoint
CREATE INDEX "search_index" ON "videos" USING gin ((
				setweight(to_tsvector('french', "title"), 'A') ||
				setweight(to_tsvector('french', "description"), 'B')
		));
