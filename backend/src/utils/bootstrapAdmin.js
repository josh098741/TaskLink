/**
 * bootstrapAdmin.js
 * ─────────────────
 * Makes first-run admin setup painless: promotes any user whose email is
 * listed in the ADMIN_EMAILS environment variable (comma-separated) to
 * is_admin = true. Idempotent and fail-silent.
 *
 * Examples:
 *   ADMIN_EMAILS="you@gmail.com"
 *   ADMIN_EMAILS="a@gmail.com,b@gmail.com"
 *
 * Without it, promote manually (anyone can run this on the shared DB):
 *   UPDATE users SET is_admin = true WHERE email = 'you@gmail.com';
 *
 * This is raw copywrite-free plumbing that never touches auth: it only sets
 * the analytics flag and cannot invalidate tokens or sessions.
 */

import { inArray } from "drizzle-orm";
import { db } from "../db/index.js";
import { users } from "../db/schema.js";

/**
 * bootstrapAdmins
 * @returns {Promise<number>} number of users promoted in this call.
 */
export async function bootstrapAdmins() {
  const raw = process.env.ADMIN_EMAILS;
  if (!raw || !raw.trim()) return 0;

  try {
    const emails = raw
      .split(",")
      .map((email) => email.trim().toLowerCase())
      .filter(Boolean);

    if (emails.length === 0) return 0;

    const promoted = await db
      .update(users)
      .set({ isAdmin: true })
      .where(inArray(users.email, emails))
      .returning({ id: users.id, email: users.email });

    if (promoted.length > 0) {
      console.log(`[bootstrapAdmins] promoted ${promoted.length} user(s) to admin.`);
    }
    return promoted.length;
  } catch (error) {
    // Never crash the server over analytics plumbing.
    console.error("[bootstrapAdmins] failed:", error.message);
    return 0;
  }
}