import {
  pgTable,
  text,
  timestamp,
  boolean,
  integer,
  index,
  uniqueIndex,
} from "drizzle-orm/pg-core";

/**
 * users
 * ─────
 * Core user record. On first run it is created by POST /api/auth/register;
 * legacy rows may have been seeded by the old webhook (user.created).
 * Onboarding fields are populated via PUT /api/user/onboarding once the
 * user walks through the in-app setup flow after first sign-in.
 *
 * Integrity constraints:
 *  • isOnboarded  – notNull + default false; set to true only after the
 *                   full setup flow completes successfully.
 *  • phoneNumber  – unique; one account per phone number (E.164).
 *  • role         – 'poster' | 'tasker'; set during setup, null until then.
 *  • categories   – stored as a comma-separated text value; empty string
 *                   until the user picks at least one category.
 */
export const users = pgTable("users", {
// ── Identity ──────────────────────────────────────────────────────────────
  id:          text("id").primaryKey(),
  // External id retired with the legacy auth migration — kept nullable for
  // old rows that still carry a legacy id until they are back-filled / dropped.
  email:       text("email").unique(),
  passwordHash: text("password_hash"),
  firstName:   text("first_name"),
  lastName:    text("last_name"),
  imageUrl:    text("image_url"),

  // ── Onboarding state ──────────────────────────────────────────────────────
  isOnboarded: boolean("is_onboarded").default(false).notNull(),

  // ── Role ─────────────────────────────────────────────────────────────────
  // 'poster' = Task Poster | 'tasker' = Tasker
  role:        text("role"),

  // ── Contact ───────────────────────────────────────────────────────────────
  // Clerk-synced field (may be null from Clerk)
  phone:       text("phone"),
  // App-collected E.164 phone – unique across all users
  phoneNumber: text("phone_number").unique(),

  // ── Profile ───────────────────────────────────────────────────────────────
  location:    text("location"),

  // ── Interests / Categories ────────────────────────────────────────────────
  // Comma-separated list e.g. "cleaning,webdesign,tutoring"
  // Empty string = not yet set.
  categories:  text("categories").default("").notNull(),

  // ── Preferences ────────────────────────────────────────────────────────
  availableForWork: boolean("available_for_work").default(true).notNull(),
  taskAlerts:       boolean("task_alerts").default(true).notNull(),
  bidNotifications: boolean("bid_notifications").default(true).notNull(),
  smsReceipts:      boolean("sms_receipts").default(true).notNull(),

  // ── Push ────────────────────────────────────────────────────────────────
  // Expo push token from the mobile device used to deliver chat & alert
  // notifications when the user is not on an active WebSocket connection.
  expoPushToken: text("expo_push_token"),

  // ── Timestamps ────────────────────────────────────────────────────────────
  createdAt:   timestamp("created_at").defaultNow().notNull(),
  updatedAt:   timestamp("updated_at").defaultNow().notNull(),
});

/**
 * posts
 * ─────
 * A task/job posted by a Task Poster. Photos are stored as a JSON array of
 * Cloudinary secure URLs in the `photos` text column (Postgres `text`, JSON
 * encoded). The poster's verified status is resolved from the users table.
 */
export const posts = pgTable("posts", {
  id:            text("id").primaryKey(),
  posterId:      text("poster_id").notNull(),            // users.id
  title:         text("title").notNull(),
  category:      text("category").notNull(),
  description:   text("description").notNull(),
  location:      text("location").notNull(),
  budgetAmount:  text("budget_amount").notNull(),
  paymentType:   text("payment_type").notNull(),         // fixed | hourly | negotiable
  dateNeeded:    text("date_needed").notNull(),
  timeNeeded:    text("time_needed"),
  isUrgent:      boolean("is_urgent").default(false).notNull(),
  duration:      text("duration"),
  skills:        text("skills"),
  photos:        text("photos").default("[]").notNull(),  // JSON array of URLs
  doerCount:     integer("doer_count").default(1).notNull(),
  status:        text("status").default("open").notNull(), // open | in_progress | completed | cancelled
  acceptedBy:    text("accepted_by"),                        // users.id of the doer who accepted (null while open)
  createdAt:     timestamp("created_at").defaultNow().notNull(),
  updatedAt:     timestamp("updated_at").defaultNow().notNull(),
});

/**
 * search_terms
 * ────────────
 * Tracks completed search terms so the app can surface "most searched" pills
 * and offer autocomplete suggestions. Full, normalized words are stored (not
 * partial keystrokes), with a usage counter for ranking.
 */
export const searchTerms = pgTable("search_terms", {
  id:             text("id").primaryKey(),
  term:           text("term").notNull().unique(),
  count:          integer("count").default(1).notNull(),
  lastSearchedAt: timestamp("last_searched_at").defaultNow().notNull(),
  createdAt:      timestamp("created_at").defaultNow().notNull(),
});

export const serviceOfferings = pgTable(
  "service_offerings",
  {
    id: text("id").primaryKey(),
    providerId: text("provider_id").notNull(),
    title: text("title").notNull(),
    category: text("category").notNull(),
    description: text("description").notNull(),
    location: text("location").notNull(),
    serviceMode: text("service_mode").notNull(),
    priceAmount: integer("price_amount"),
    currency: text("currency").default("KES").notNull(),
    priceType: text("price_type").default("fixed").notNull(),
    durationMinutes: integer("duration_minutes"),
    bufferMinutes: integer("buffer_minutes").default(0).notNull(),
    bookingEnabled: boolean("booking_enabled").default(true).notNull(),
    bookingMode: text("booking_mode").default("request").notNull(),
    minNoticeMinutes: integer("min_notice_minutes").default(60).notNull(),
    maxAdvanceBookingDays: integer("max_advance_booking_days").default(90).notNull(),
    maxConcurrentBookings: integer("max_concurrent_bookings").default(1).notNull(),
    status: text("status").default("draft").notNull(),
    photos: text("photos").default("[]").notNull(),
    skills: text("skills").default("[]").notNull(),
    publishedAt: timestamp("published_at"),
    deletedAt: timestamp("deleted_at"),
    createdAt: timestamp("created_at").defaultNow().notNull(),
    updatedAt: timestamp("updated_at").defaultNow().notNull(),
  },
  (table) => [
    index("service_offerings_provider_status_idx").on(table.providerId, table.status, table.deletedAt),
    index("service_offerings_category_status_idx").on(table.category, table.status, table.deletedAt),
    index("service_offerings_location_status_idx").on(table.location, table.status, table.deletedAt),
  ]
);

export const serviceAvailabilities = pgTable(
  "service_availabilities",
  {
    id: text("id").primaryKey(),
    serviceId: text("service_id").notNull(),
    dayOfWeek: integer("day_of_week").notNull(),
    startTime: text("start_time").notNull(),
    endTime: text("end_time").notNull(),
    timezone: text("timezone").default("Africa/Nairobi").notNull(),
    isActive: boolean("is_active").default(true).notNull(),
    createdAt: timestamp("created_at").defaultNow().notNull(),
    updatedAt: timestamp("updated_at").defaultNow().notNull(),
  },
  (table) => [
    index("service_availabilities_service_weekday_idx").on(table.serviceId, table.dayOfWeek, table.isActive),
  ]
);

export const appointments = pgTable(
  "appointments",
  {
    id: text("id").primaryKey(),
    serviceId: text("service_id").notNull(),
    providerId: text("provider_id").notNull(),
    clientId: text("client_id").notNull(),
    startsAt: timestamp("starts_at", { mode: "date", withTimezone: true }).notNull(),
    endsAt: timestamp("ends_at", { mode: "date", withTimezone: true }).notNull(),
    timezone: text("timezone").default("Africa/Nairobi").notNull(),
    status: text("status").default("pending").notNull(),
    meetingType: text("meeting_type").default("on_site").notNull(),
    location: text("location").notNull(),
    meetingDetails: text("meeting_details"),
    notes: text("notes"),
    providerNotes: text("provider_notes"),
    priceAmount: integer("price_amount"),
    currency: text("currency").default("KES").notNull(),
    paymentStatus: text("payment_status").default("unpaid").notNull(),
    cancellationReason: text("cancellation_reason"),
    rescheduleReason: text("reschedule_reason"),
    proposedStartsAt: timestamp("proposed_starts_at", { mode: "date", withTimezone: true }),
    proposedEndsAt: timestamp("proposed_ends_at", { mode: "date", withTimezone: true }),
    rescheduleRequestedBy: text("reschedule_requested_by"),
    idempotencyKey: text("idempotency_key"),
    version: integer("version").default(1).notNull(),
    createdAt: timestamp("created_at", { mode: "date", withTimezone: true }).defaultNow().notNull(),
    updatedAt: timestamp("updated_at", { mode: "date", withTimezone: true }).defaultNow().notNull(),
    confirmedAt: timestamp("confirmed_at", { mode: "date", withTimezone: true }),
    cancelledAt: timestamp("cancelled_at", { mode: "date", withTimezone: true }),
    completedAt: timestamp("completed_at", { mode: "date", withTimezone: true }),
    noShowAt: timestamp("no_show_at", { mode: "date", withTimezone: true }),
  },
  (table) => [
    index("appointments_service_start_idx").on(table.serviceId, table.startsAt, table.status),
    index("appointments_provider_start_idx").on(table.providerId, table.startsAt, table.status),
    index("appointments_client_start_idx").on(table.clientId, table.startsAt, table.status),
    index("appointments_status_start_idx").on(table.status, table.startsAt),
    uniqueIndex("appointments_client_idempotency_idx").on(table.clientId, table.idempotencyKey),
  ]
);

/**
 * chatMessages
 * ────────────
 * One row per chat message. A chat is scoped to an appointment — the
 * appointment *is* the conversation, with exactly two participants
 * (providerId and clientId on the appointment). This keeps membership
 * checks cheap and prevents arbitrary user-to-user messaging.
 *
 * Delivery model:
 *   • deliveredAt — set when a recipient loads the thread (interaction).
 *   • readAt      — set when the recipient explicitly marks the thread read
 *                   (opening the chat screen, or the mark-read endpoint).
 */
export const chatMessages = pgTable(
  "chat_messages",
  {
    id: text("id").primaryKey(),
    appointmentId: text("appointment_id").notNull(),    // appointments.id
    senderId: text("sender_id").notNull(),              // users.id
    body: text("body").notNull(),
    deliveredAt: timestamp("delivered_at", { mode: "date", withTimezone: true }),
    readAt: timestamp("read_at", { mode: "date", withTimezone: true }),
    createdAt: timestamp("created_at", { mode: "date", withTimezone: true }).defaultNow().notNull(),
    updatedAt: timestamp("updated_at", { mode: "date", withTimezone: true }).defaultNow().notNull(),
  },
  (table) => [
    index("chat_messages_appointment_created_idx").on(table.appointmentId, table.createdAt),
  ]
);

