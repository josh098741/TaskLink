ALTER TABLE "users" ADD COLUMN "password_hash" text;
ALTER TABLE "users" DROP COLUMN "clerk_id";
--> statement-breakpoint