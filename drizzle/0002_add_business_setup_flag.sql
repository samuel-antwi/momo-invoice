ALTER TABLE "businesses"
ADD COLUMN IF NOT EXISTS "setup_completed" boolean DEFAULT false NOT NULL;
