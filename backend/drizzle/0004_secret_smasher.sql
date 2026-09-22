CREATE TABLE "service_offerings" (
	"id" text PRIMARY KEY NOT NULL,
	"provider_id" text NOT NULL,
	"title" text NOT NULL,
	"category" text NOT NULL,
	"description" text NOT NULL,
	"location" text NOT NULL,
	"service_mode" text NOT NULL,
	"price_amount" integer,
	"currency" text DEFAULT 'KES' NOT NULL,
	"price_type" text DEFAULT 'fixed' NOT NULL,
	"duration_minutes" integer,
	"buffer_minutes" integer DEFAULT 0 NOT NULL,
	"booking_enabled" boolean DEFAULT true NOT NULL,
	"booking_mode" text DEFAULT 'request' NOT NULL,
	"min_notice_minutes" integer DEFAULT 60 NOT NULL,
	"max_advance_booking_days" integer DEFAULT 90 NOT NULL,
	"max_concurrent_bookings" integer DEFAULT 1 NOT NULL,
	"status" text DEFAULT 'draft' NOT NULL,
	"photos" text DEFAULT '[]' NOT NULL,
	"skills" text DEFAULT '[]' NOT NULL,
	"published_at" timestamp,
	"deleted_at" timestamp,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "service_availabilities" (
	"id" text PRIMARY KEY NOT NULL,
	"service_id" text NOT NULL,
	"day_of_week" integer NOT NULL,
	"start_time" text NOT NULL,
	"end_time" text NOT NULL,
	"timezone" text DEFAULT 'Africa/Nairobi' NOT NULL,
	"is_active" boolean DEFAULT true NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "appointments" (
	"id" text PRIMARY KEY NOT NULL,
	"service_id" text NOT NULL,
	"provider_id" text NOT NULL,
	"client_id" text NOT NULL,
	"starts_at" timestamp with time zone NOT NULL,
	"ends_at" timestamp with time zone NOT NULL,
	"timezone" text DEFAULT 'Africa/Nairobi' NOT NULL,
	"status" text DEFAULT 'pending' NOT NULL,
	"meeting_type" text DEFAULT 'on_site' NOT NULL,
	"location" text NOT NULL,
	"meeting_details" text,
	"notes" text,
	"provider_notes" text,
	"price_amount" integer,
	"currency" text DEFAULT 'KES' NOT NULL,
	"payment_status" text DEFAULT 'unpaid' NOT NULL,
	"cancellation_reason" text,
	"reschedule_reason" text,
	"proposed_starts_at" timestamp with time zone,
	"proposed_ends_at" timestamp with time zone,
	"reschedule_requested_by" text,
	"idempotency_key" text,
	"version" integer DEFAULT 1 NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	"confirmed_at" timestamp with time zone,
	"cancelled_at" timestamp with time zone,
	"completed_at" timestamp with time zone,
	"no_show_at" timestamp with time zone
);
--> statement-breakpoint
CREATE INDEX "service_offerings_provider_status_idx" ON "service_offerings" USING btree ("provider_id","status","deleted_at");--> statement-breakpoint
CREATE INDEX "service_offerings_category_status_idx" ON "service_offerings" USING btree ("category","status","deleted_at");--> statement-breakpoint
CREATE INDEX "service_offerings_location_status_idx" ON "service_offerings" USING btree ("location","status","deleted_at");--> statement-breakpoint
CREATE INDEX "service_availabilities_service_weekday_idx" ON "service_availabilities" USING btree ("service_id","day_of_week","is_active");--> statement-breakpoint
CREATE INDEX "appointments_service_start_idx" ON "appointments" USING btree ("service_id","starts_at","status");--> statement-breakpoint
CREATE INDEX "appointments_provider_start_idx" ON "appointments" USING btree ("provider_id","starts_at","status");--> statement-breakpoint
CREATE INDEX "appointments_client_start_idx" ON "appointments" USING btree ("client_id","starts_at","status");--> statement-breakpoint
CREATE INDEX "appointments_status_start_idx" ON "appointments" USING btree ("status","starts_at");--> statement-breakpoint
CREATE UNIQUE INDEX "appointments_client_idempotency_idx" ON "appointments" USING btree ("client_id","idempotency_key");
