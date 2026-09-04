CREATE TABLE "search_terms" (
	"id" text PRIMARY KEY NOT NULL,
	"term" text NOT NULL,
	"count" integer DEFAULT 1 NOT NULL,
	"last_searched_at" timestamp DEFAULT now() NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "search_terms_term_unique" UNIQUE("term")
);
--> statement-breakpoint
