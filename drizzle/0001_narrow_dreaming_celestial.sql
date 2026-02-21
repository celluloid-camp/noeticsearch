ALTER TABLE "search_history" ADD COLUMN "messages" jsonb;--> statement-breakpoint
ALTER TABLE "search_history" DROP COLUMN "query";