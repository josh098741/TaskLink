import {
  pgTable,
  text,
  timestamp,
  boolean,
} from "drizzle-orm/pg-core";

/**
 * users
 * ─────
 * Core user record created by the Clerk webhook (user.created).
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
  clerkId:     text("clerk_id").notNull().unique(),
  email:       text("email").unique(),
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

  // ── Timestamps ────────────────────────────────────────────────────────────
  createdAt:   timestamp("created_at").defaultNow().notNull(),
  updatedAt:   timestamp("updated_at").defaultNow().notNull(),
});
