CREATE TABLE "chat_messages" (
	"id" text PRIMARY KEY NOT NULL,
	"appointment_id" text NOT NULL,
	"sender_id" text NOT NULL,
	"body" text NOT NULL,
	"delivered_at" timestamp with time zone,
	"read_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "users" ADD COLUMN "expo_push_token" text;--> statement-breakpoint
CREATE INDEX "chat_messages_appointment_created_idx" ON "chat_messages" USING btree ("appointment_id","created_at");