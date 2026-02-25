CREATE TABLE "search_result" (
	"id" serial PRIMARY KEY NOT NULL,
	"search_id" text NOT NULL,
	"video_id" integer NOT NULL,
	"caption_id" integer NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "search_result" ADD CONSTRAINT "search_result_search_id_search_history_id_fk" FOREIGN KEY ("search_id") REFERENCES "public"."search_history"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "search_result" ADD CONSTRAINT "search_result_video_id_videos_id_fk" FOREIGN KEY ("video_id") REFERENCES "public"."videos"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "search_result" ADD CONSTRAINT "search_result_caption_id_captions_id_fk" FOREIGN KEY ("caption_id") REFERENCES "public"."captions"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "search_result_search_id_idx" ON "search_result" USING btree ("search_id");--> statement-breakpoint
CREATE INDEX "search_result_video_id_idx" ON "search_result" USING btree ("video_id");--> statement-breakpoint
CREATE INDEX "search_result_caption_id_idx" ON "search_result" USING btree ("caption_id");--> statement-breakpoint
CREATE UNIQUE INDEX "search_result_search_caption_unique" ON "search_result" USING btree ("search_id","caption_id");