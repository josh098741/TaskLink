CREATE TABLE "search_terms" (
	"id" text PRIMARY KEY NOT NULL,
	"term" text NOT NULL,
	"count" integer DEFAULT 1 NOT NULL,
	"last_searched_at" timestamp DEFAULT now() NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "search_terms_term_unique" UNIQUE("term")
);
--> statement-breakpoint
ALTER TABLE "posts" ADD COLUMN "accepted_by" text;--> statement-breakpoint
ALTER TABLE "users" ADD COLUMN "available_for_work" boolean DEFAULT true NOT NULL;--> statement-breakpoint
ALTER TABLE "users" ADD COLUMN "task_alerts" boolean DEFAULT true NOT NULL;--> statement-breakpoint
ALTER TABLE "users" ADD COLUMN "bid_notifications" boolean DEFAULT true NOT NULL;--> statement-breakpoint
ALTER TABLE "users" ADD COLUMN "sms_receipts" boolean DEFAULT true NOT NULL;