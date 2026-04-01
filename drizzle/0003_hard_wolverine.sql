ALTER TABLE "videos" ADD COLUMN "import_status" text DEFAULT 'completed' NOT NULL;
--> statement-breakpoint
UPDATE "videos" v
SET "import_status" = 'failed'
WHERE NOT EXISTS (
  SELECT 1
  FROM "captions" c
  WHERE c."video_id" = v."id"
);